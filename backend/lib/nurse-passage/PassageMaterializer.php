<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../AppointmentItemsWriter.php';
require_once __DIR__ . '/../AppointmentRequestFingerprint.php';
require_once __DIR__ . '/PassageDateExpander.php';
require_once __DIR__ . '/PassageSlotResolver.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../DbSchemaCache.php';

/**
 * Génère les rendez-vous d'une série de passages.
 * Une occurrence = une date + un créneau quotidien (clé « Y-m-d|slotKey »).
 */
final class PassageMaterializer
{
    /** Fenêtre glissante générée à l'avance ; prolongée à l'ouverture de la tournée. */
    public const HORIZON_DAYS = 60;

    /** Statuts non terminaux qu'une modification de série peut annuler ou mettre à jour. */
    public const ACTIVE_STATUSES = ['pending', 'confirmed', 'planned', 'inProgress'];

    /** Clés de planning_config gérées par le serveur (jamais lues depuis le client). */
    public const SERVER_CONFIG_KEYS = ['excluded_occurrences', 'materialized_until'];

    private PDO $db;
    private Appointment $appointments;
    private Crypto $crypto;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_passage_db();
        $this->appointments = new Appointment($this->db);
        $this->crypto = new Crypto();
    }

    public static function todayParis(?DateTimeImmutable $now = null): DateTimeImmutable
    {
        $tz = new DateTimeZone('Europe/Paris');
        $now = $now !== null ? $now->setTimezone($tz) : new DateTimeImmutable('now', $tz);

        return $now->setTime(0, 0);
    }

    public static function horizonEnd(DateTimeImmutable $from): string
    {
        return $from->modify('+' . (self::HORIZON_DAYS - 1) . ' days')->format('Y-m-d');
    }

    /** @param array<string, mixed> $series */
    public static function decodeConfig(array $series): array
    {
        $raw = $series['planning_config'] ?? [];
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?: [];
        }

        return is_array($raw) ? $raw : [];
    }

    /**
     * @param array<string, mixed> $series
     * @return list<array<string, mixed>>
     */
    public static function decodeItems(array $series): array
    {
        $raw = $series['nursing_items'] ?? [];
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?: [];
        }

        return is_array($raw) ? array_values($raw) : [];
    }

    /**
     * Créneaux quotidiens de la série (planning_config.daily_time_slots ou créneau unique de la série).
     *
     * @param array<string, mixed> $series
     * @return list<array{time_slot: string, custom_time: ?string}>
     */
    public static function dailySlots(array $series): array
    {
        $config = self::decodeConfig($series);
        $slots = [];
        $seen = [];
        if (isset($config['daily_time_slots']) && is_array($config['daily_time_slots'])) {
            foreach ($config['daily_time_slots'] as $row) {
                if (!is_array($row) || empty($row['time_slot'])) {
                    continue;
                }
                $slot = (string) $row['time_slot'];
                $custom = $slot === 'all_day' ? null : PassageSlotResolver::normalizeTime($row['custom_time'] ?? null);
                $key = PassageSlotResolver::slotKey($slot, $custom);
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $slots[] = ['time_slot' => $slot, 'custom_time' => $custom];
            }
        }
        if ($slots === []) {
            $slot = (string) ($series['time_slot'] ?? 'morning');
            $slots[] = [
                'time_slot' => $slot,
                'custom_time' => $slot === 'all_day' ? null : PassageSlotResolver::normalizeTime($series['custom_time'] ?? null),
            ];
        }

        return $slots;
    }

    /**
     * Occurrences attendues entre deux dates incluses, hors occurrences exclues.
     *
     * @param array<string, mixed> $series
     * @return array<string, array{date: string, time_slot: string, custom_time: ?string}>
     */
    public static function targetOccurrences(array $series, string $fromYmd, string $untilYmd): array
    {
        if ($untilYmd < $fromYmd) {
            return [];
        }
        $config = self::decodeConfig($series);
        $excluded = array_flip(array_map('strval', is_array($config['excluded_occurrences'] ?? null)
            ? $config['excluded_occurrences']
            : []));
        $dates = PassageDateExpander::expand((string) ($series['planning_type'] ?? ''), $config, $untilYmd);
        $slots = self::dailySlots($series);
        $out = [];
        foreach ($dates as $date) {
            if ($date < $fromYmd || $date > $untilYmd) {
                continue;
            }
            foreach ($slots as $slot) {
                $key = $date . '|' . PassageSlotResolver::slotKey($slot['time_slot'], $slot['custom_time']);
                if (isset($excluded[$key])) {
                    continue;
                }
                $out[$key] = ['date' => $date] + $slot;
            }
        }

        return $out;
    }

    /** @param array<string, mixed> $series */
    public static function lastPlannedDate(array $series, string $untilYmd): ?string
    {
        $dates = PassageDateExpander::expand(
            (string) ($series['planning_type'] ?? ''),
            self::decodeConfig($series),
            $untilYmd,
        );

        return $dates !== [] ? $dates[count($dates) - 1] : null;
    }

    /**
     * Crée les occurrences manquantes de la fenêtre [from, until].
     *
     * @param array<string, mixed> $series
     * @param array<string, true> $existingKeys occurrences déjà présentes (clé « Y-m-d|slotKey »)
     * @return list<string> identifiants créés
     */
    public function createMissing(
        array $series,
        string $nurseId,
        string $fromYmd,
        string $untilYmd,
        array $existingKeys,
        ?DateTimeImmutable $now = null,
        string $nurseRole = 'nurse',
    ): array {
        $targets = self::targetOccurrences($series, $fromYmd, $untilYmd);
        $missing = array_diff_key($targets, $existingKeys);
        if ($missing === []) {
            return [];
        }

        $nursingItems = self::decodeItems($series);
        if ($nursingItems === []) {
            throw new InvalidArgumentException('Au moins un soin requis');
        }
        $seriesId = (string) ($series['id'] ?? '');
        $patientId = (string) ($series['patient_id'] ?? '');
        $patientCtx = $this->loadPatientIdentity($patientId, $nurseId, $nurseRole);
        $address = $this->resolveAddress($series, $nurseId, $nurseRole);
        $singleSlot = count(self::dailySlots($series)) === 1;

        $createdIds = [];
        foreach ($missing as $occurrence) {
            $scheduledAt = PassageSlotResolver::effectiveScheduledAtForNursePassage(
                $occurrence['date'],
                $occurrence['time_slot'],
                $occurrence['custom_time'],
                $now,
            );
            if ($scheduledAt === null) {
                continue;
            }
            $formData = $this->buildFormData($series, $patientCtx, $address, $occurrence, $singleSlot);
            $aptId = $this->appointments->create([
                'type' => 'nursing',
                'form_type' => 'nursing',
                'patient_id' => $patientId,
                'category_id' => $nursingItems[0]['category_id'] ?? null,
                'scheduled_at' => $scheduledAt,
                'status' => 'confirmed',
                'assigned_nurse_id' => $nurseId,
                'passage_series_id' => $seriesId,
                'passage_source' => 'nurse_passage',
                'address' => $address,
                'form_data' => $formData,
                'nursing_items' => $nursingItems,
            ], $nurseId, 'nurse');
            $this->linkPassageColumns($aptId, $seriesId);
            $createdIds[] = $aptId;
        }

        return $createdIds;
    }

    /**
     * Rendez-vous non terminés de la série à partir d'une date (Paris), hors passages déjà cochés en tournée.
     *
     * @return list<array{id: string, scheduled_at: string, status: string, key: string, form_data: array<string, mixed>}>
     */
    public function loadActiveAppointments(string $seriesId, string $nurseId, string $fromYmd): array
    {
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count(self::ACTIVE_STATUSES), '?'));
        $visitFilter = DbSchemaCache::tableExists($this->db, 'nurse_tour_stops')
            ? "AND NOT EXISTS (
                    SELECT 1 FROM nurse_tour_stops s
                    WHERE s.appointment_id = a.id AND s.visit_status IN ('done', 'skipped')
               )"
            : '';
        $stmt = $this->db->prepare("
            SELECT a.id, a.scheduled_at, a.status, a.form_data_encrypted, a.form_data_dek
            FROM appointments a
            WHERE a.passage_series_id = ?
              AND a.assigned_nurse_id = ?
              AND a.status IN ($placeholders)
              AND a.scheduled_at >= ?
              $visitFilter
            ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
        ");
        $stmt->execute([$seriesId, $nurseId, ...self::ACTIVE_STATUSES, $fromYmd . ' 00:00:00']);

        $rows = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $formData = $this->decryptFormData($row);
            $rows[] = [
                'id' => (string) $row['id'],
                'scheduled_at' => (string) $row['scheduled_at'],
                'status' => (string) $row['status'],
                'key' => self::occurrenceKeyFor((string) $row['scheduled_at'], $formData),
                'form_data' => $formData,
            ];
        }

        return $rows;
    }

    /**
     * @return array{id: string, status: string, key: string}|null
     */
    public function loadSeriesAppointment(string $seriesId, string $nurseId, string $appointmentId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, scheduled_at, status, form_data_encrypted, form_data_dek
            FROM appointments
            WHERE id = ? AND passage_series_id = ? AND assigned_nurse_id = ?
            LIMIT 1
        ');
        $stmt->execute([$appointmentId, $seriesId, $nurseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return [
            'id' => (string) $row['id'],
            'status' => (string) $row['status'],
            'key' => self::occurrenceKeyFor((string) $row['scheduled_at'], $this->decryptFormData($row)),
        ];
    }

    /** @param array<string, mixed> $formData */
    public static function occurrenceKeyFor(string $scheduledAt, array $formData): string
    {
        $slot = trim((string) ($formData['passage_time_slot'] ?? ''));
        $custom = null;
        if ($slot !== 'all_day') {
            try {
                $custom = PassageSlotResolver::normalizeTime($formData['custom_time'] ?? null);
            } catch (InvalidArgumentException $e) {
                error_log('[nurse-passage] custom_time illisible ignoré (' . $scheduledAt . ') : ' . $e->getMessage());
                $custom = null;
            }
        }
        if ($slot === '') {
            $slot = 'custom';
            $custom = substr($scheduledAt, 11, 5);
        }

        return substr($scheduledAt, 0, 10) . '|' . PassageSlotResolver::slotKey($slot, $custom);
    }

    /** @param list<string> $appointmentIds */
    public function cancelAppointments(array $appointmentIds): int
    {
        if ($appointmentIds === []) {
            return 0;
        }
        $statuses = implode(',', array_fill(0, count(self::ACTIVE_STATUSES), '?'));
        $stmt = $this->db->prepare("
            UPDATE appointments
            SET status = 'canceled', updated_at = NOW()
            WHERE id = ? AND status IN ($statuses)
        ");
        $count = 0;
        foreach ($appointmentIds as $id) {
            $stmt->execute([$id, ...self::ACTIVE_STATUSES]);
            $count += $stmt->rowCount();
        }

        return $count;
    }

    /**
     * Met à jour sur place le contenu (soins, durée, note, lieu, plage horaire) d'un rendez-vous de la série.
     *
     * @param array<string, mixed> $series
     * @param array{id: string, form_data: array<string, mixed>} $appointment
     * @param array{label: string, lat: float, lng: float}|null $address nouvelle adresse si le lieu a changé
     */
    public function applyContent(array $series, array $appointment, ?array $address): void
    {
        $nursingItems = self::decodeItems($series);
        if ($nursingItems === []) {
            throw new InvalidArgumentException('Au moins un soin requis');
        }
        $formData = $appointment['form_data'];
        unset($formData[AppointmentRequestFingerprint::FIELD]);
        $formData['passage_duration_minutes'] = self::durationMinutes($series);
        $formData['at_home'] = (bool) ($series['at_home'] ?? true);
        $formData['nursing_items'] = self::normalizeNursingItemsForForm($nursingItems);
        $notes = trim((string) ($series['notes'] ?? ''));
        if ($notes !== '') {
            $formData['notes'] = $notes;
        } else {
            unset($formData['notes']);
        }
        $slot = (string) ($formData['passage_time_slot'] ?? '');
        if ($slot !== '' && count(self::dailySlots($series)) === 1) {
            $custom = $slot === 'all_day' ? null : PassageSlotResolver::normalizeTime($formData['custom_time'] ?? null);
            $formData['availability'] = PassageSlotResolver::availabilityJson($slot, $custom, self::timeRange($series));
        }

        if ($address !== null) {
            $formData['address'] = $address;
        }
        $fields = ['form_data_encrypted = ?', 'form_data_dek = ?', 'category_id = ?', 'updated_at = NOW()'];
        $encrypted = $this->crypto->encryptField(json_encode($formData, JSON_THROW_ON_ERROR));
        $params = [$encrypted['encrypted'], $encrypted['dek'], $nursingItems[0]['category_id'] ?? null];
        if ($address !== null) {
            [$addressSql, $addressParams] = AppointmentAddressFields::columns($this->crypto, $address);
            $fields[] = $addressSql;
            array_push($params, ...$addressParams);
        }
        $params[] = $appointment['id'];
        $this->db->prepare('UPDATE appointments SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        if (DbSchemaCache::tableExists($this->db, 'appointment_nursing_items')) {
            AppointmentItemsWriter::replace(
                $this->db,
                'nursing',
                $appointment['id'],
                self::normalizeNursingItemsForForm($nursingItems),
                static fn (): string => nurse_passage_uuid(),
            );
        }
    }

    /**
     * @param array<string, mixed> $series
     * @return array{label: string, lat: float, lng: float}
     */
    public function resolveAddress(array $series, string $nurseId, string $nurseRole = 'nurse'): array
    {
        $patientId = (string) ($series['patient_id'] ?? '');

        return (bool) ($series['at_home'] ?? true)
            ? $this->resolvePatientAddress($patientId, $nurseId, $nurseRole)
            : $this->resolveNurseOfficeAddress($nurseId, $nurseRole);
    }

    /**
     * @param list<array<string, mixed>> $nursingItems
     * @return list<array<string, mixed>>
     */
    public static function normalizeNursingItemsForForm(array $nursingItems): array
    {
        return array_values(array_map(static function ($it, $idx) {
            return [
                'category_id' => $it['category_id'] ?? null,
                'label' => $it['label'] ?? null,
                'care_options' => is_array($it['care_options'] ?? null) ? $it['care_options'] : [],
                'sort_order' => $idx,
            ];
        }, $nursingItems, array_keys($nursingItems)));
    }

    /** @param array<string, mixed> $series */
    private static function durationMinutes(array $series): int
    {
        return max(5, min(240, (int) ($series['duration_minutes'] ?? 30)));
    }

    /**
     * @param array<string, mixed> $series
     * @return array{0: int|float, 1: int|float}|null
     */
    private static function timeRange(array $series): ?array
    {
        $config = self::decodeConfig($series);
        if (isset($config['time_range']) && is_array($config['time_range']) && count($config['time_range']) >= 2) {
            return [
                PassageSlotResolver::quarterHour($config['time_range'][0]),
                PassageSlotResolver::quarterHour($config['time_range'][1]),
            ];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $series
     * @param array{first_name: string, last_name: string, phone?: string, email?: string} $patientCtx
     * @param array{label: string, lat: float, lng: float} $address
     * @param array{date: string, time_slot: string, custom_time: ?string} $occurrence
     * @return array<string, mixed>
     */
    private function buildFormData(array $series, array $patientCtx, array $address, array $occurrence, bool $singleSlot): array
    {
        $slot = $occurrence['time_slot'];
        $custom = $occurrence['custom_time'];
        $formData = [
            'first_name' => $patientCtx['first_name'],
            'last_name' => $patientCtx['last_name'],
            'phone' => $patientCtx['phone'] ?? '',
            'email' => $patientCtx['email'] ?? '',
            'address' => $address,
            'passage_time_slot' => $slot,
            'passage_duration_minutes' => self::durationMinutes($series),
            'at_home' => (bool) ($series['at_home'] ?? true),
            'passage_source' => 'nurse_passage',
            'custom_time' => $custom,
            'availability' => PassageSlotResolver::availabilityJson($slot, $custom, $singleSlot ? self::timeRange($series) : null),
            'availability_type' => $slot === 'all_day' ? 'all_day' : 'custom',
            'consent' => true,
            'nursing_items' => self::normalizeNursingItemsForForm(self::decodeItems($series)),
        ];
        $notes = trim((string) ($series['notes'] ?? ''));
        if ($notes !== '') {
            $formData['notes'] = $notes;
        }

        return $formData;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decryptFormData(array $row): array
    {
        if (empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) {
            return [];
        }
        $decoded = json_decode(
            $this->crypto->decryptField((string) $row['form_data_encrypted'], (string) $row['form_data_dek']),
            true,
        );

        return is_array($decoded) ? $decoded : [];
    }

    private function linkPassageColumns(string $appointmentId, string $seriesId): void
    {
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            return;
        }
        $this->db->prepare('
            UPDATE appointments SET passage_series_id = ?, passage_source = \'nurse_passage\' WHERE id = ?
        ')->execute([$seriesId, $appointmentId]);
    }

    /**
     * @return array{first_name: string, last_name: string, phone?: string, email?: string}
     */
    private function loadPatientIdentity(string $patientId, string $nurseId, string $role): array
    {
        require_once __DIR__ . '/../PatientDossierAccess.php';
        $userModel = new User();
        if (!PatientDossierAccess::canAccess($this->db, $userModel, ['user_id' => $nurseId, 'role' => $role], $patientId)) {
            throw HttpStatusException::forbidden('Accès patient refusé');
        }
        $patient = $userModel->getById($patientId, $nurseId, $role, 'full');
        if (!$patient) {
            throw HttpStatusException::notFound('Patient introuvable');
        }

        return [
            'first_name' => trim((string) ($patient['first_name'] ?? '')),
            'last_name' => trim((string) ($patient['last_name'] ?? '')),
            'phone' => isset($patient['phone']) ? (string) $patient['phone'] : '',
            'email' => isset($patient['email']) ? (string) $patient['email'] : '',
        ];
    }

    /**
     * @return array{label: string, lat: float, lng: float}
     */
    private function resolvePatientAddress(string $patientId, string $nurseId, string $role): array
    {
        require_once __DIR__ . '/../PatientDossierAccess.php';
        $userModel = new User();
        $patient = $userModel->getById($patientId, $nurseId, $role, 'full');
        if (!$patient) {
            throw HttpStatusException::notFound('Patient introuvable');
        }
        $address = $patient['address'] ?? null;
        if (!is_array($address) || empty($address['label'])) {
            throw new InvalidArgumentException('Adresse patient requise pour un passage à domicile');
        }
        $resolved = self::passageAddress($address);
        if ($resolved === null) {
            throw new InvalidArgumentException('Coordonnées patient invalides');
        }

        return $resolved;
    }

    /**
     * Adresse d'un profil (patient ou cabinet) réduite à ce que porte un passage, ou null sans libellé ni coordonnées.
     *
     * @return array{label: string, lat: float, lng: float}|null
     */
    public static function passageAddress(mixed $address): ?array
    {
        if (!is_array($address)) {
            return null;
        }
        $label = trim((string) ($address['label'] ?? ''));
        $lat = isset($address['lat']) ? (float) $address['lat'] : 0.0;
        $lng = isset($address['lng']) ? (float) $address['lng'] : 0.0;
        if ($label === '' || ($lat === 0.0 && $lng === 0.0)) {
            return null;
        }

        return ['label' => $label, 'lat' => $lat, 'lng' => $lng];
    }

    /**
     * @return array{label: string, lat: float, lng: float}
     */
    private function resolveNurseOfficeAddress(string $nurseId, string $role): array
    {
        $userModel = new User();
        $nurse = $userModel->getById($nurseId, $nurseId, $role, 'full');
        if (!$nurse) {
            throw HttpStatusException::notFound('Profil infirmier introuvable');
        }
        $address = $nurse['address'] ?? null;
        if (!is_array($address) || empty($address['label'])) {
            throw new InvalidArgumentException(
                'Adresse cabinet requise — renseignez votre adresse professionnelle dans votre profil',
            );
        }
        $resolved = self::passageAddress($address);
        if ($resolved === null) {
            throw new InvalidArgumentException('Coordonnées cabinet invalides — vérifiez votre adresse pro');
        }

        return $resolved;
    }
}
