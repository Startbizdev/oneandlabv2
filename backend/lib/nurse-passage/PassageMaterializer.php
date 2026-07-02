<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/PassageDateExpander.php';
require_once __DIR__ . '/PassageSlotResolver.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../DbSchemaCache.php';

final class PassageMaterializer
{
    private PDO $db;
    private Appointment $appointments;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_passage_db();
        $this->appointments = new Appointment();
    }

    /**
     * @param array<string, mixed> $series
     * @return array{created: int, appointment_ids: list<string>, first_date: ?string, last_date: ?string}
     */
    public function materializeSeries(array $series, string $nurseId, string $nurseRole = 'nurse'): array
    {
        $seriesId = (string) ($series['id'] ?? '');
        $planningType = (string) ($series['planning_type'] ?? '');
        $config = is_string($series['planning_config'] ?? null)
            ? (json_decode((string) $series['planning_config'], true) ?: [])
            : (is_array($series['planning_config'] ?? null) ? $series['planning_config'] : []);
        $nursingItems = is_string($series['nursing_items'] ?? null)
            ? (json_decode((string) $series['nursing_items'], true) ?: [])
            : (is_array($series['nursing_items'] ?? null) ? $series['nursing_items'] : []);

        if ($nursingItems === []) {
            throw new InvalidArgumentException('Au moins un soin requis');
        }

        $dates = PassageDateExpander::expand($planningType, $config);
        $patientId = (string) ($series['patient_id'] ?? '');
        $atHome = (bool) ($series['at_home'] ?? true);
        $patientCtx = $this->loadPatientIdentity($patientId, $nurseId, $nurseRole);
        $address = $atHome
            ? $this->resolvePatientAddress($patientId, $nurseId, $nurseRole)
            : $this->resolveNurseOfficeAddress($nurseId, $nurseRole);
        $timeSlot = (string) ($series['time_slot'] ?? 'morning');
        $customTime = isset($series['custom_time']) ? (string) $series['custom_time'] : null;
        $timeRange = null;
        if (isset($config['time_range']) && is_array($config['time_range']) && count($config['time_range']) >= 2) {
            $timeRange = [(int) $config['time_range'][0], (int) $config['time_range'][1]];
        }
        $durationMinutes = max(5, min(240, (int) ($series['duration_minutes'] ?? 30)));
        $batchId = nurse_passage_uuid();

        $createdIds = [];
        foreach ($dates as $dateYmd) {
            $scheduledAt = PassageSlotResolver::effectiveScheduledAtForNursePassage(
                $dateYmd,
                $timeSlot,
                $customTime,
            );
            if ($scheduledAt === null) {
                continue;
            }
            if ($this->appointmentExistsForDate($seriesId, $scheduledAt)) {
                continue;
            }
            $availability = PassageSlotResolver::availabilityJson($timeSlot, $customTime, $timeRange);

            $formData = [
                'first_name' => $patientCtx['first_name'],
                'last_name' => $patientCtx['last_name'],
                'phone' => $patientCtx['phone'] ?? '',
                'email' => $patientCtx['email'] ?? '',
                'address' => $address,
                'passage_time_slot' => $timeSlot,
                'passage_duration_minutes' => $durationMinutes,
                'at_home' => $atHome,
                'passage_source' => 'nurse_passage',
                'custom_time' => $timeSlot === 'custom' ? $customTime : null,
                'availability' => $availability,
                'availability_type' => 'custom',
                'consent' => true,
                'nursing_items' => self::normalizeNursingItemsForForm($nursingItems),
            ];

            $payload = [
                'type' => 'nursing',
                'form_type' => 'nursing',
                'patient_id' => $patientId,
                'category_id' => $nursingItems[0]['category_id'] ?? null,
                'scheduled_at' => $scheduledAt,
                'status' => 'confirmed',
                'assigned_nurse_id' => $nurseId,
                'creation_batch_id' => $batchId,
                'passage_series_id' => $seriesId,
                'passage_source' => 'nurse_passage',
                'address' => $address,
                'form_data' => $formData,
                'nursing_items' => $nursingItems,
            ];

            $aptId = $this->appointments->create($payload, $nurseId, 'nurse');
            $this->linkPassageColumns($aptId, $seriesId);
            $createdIds[] = $aptId;
        }

        if ($dates !== [] && $createdIds === []) {
            throw new InvalidArgumentException(
                'Aucun passage planifiable : les dates sélectionnées sont dans le passé',
            );
        }

        sort($dates);

        return [
            'created' => count($createdIds),
            'appointment_ids' => $createdIds,
            'first_date' => $dates[0] ?? null,
            'last_date' => $dates !== [] ? $dates[count($dates) - 1] : null,
        ];
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

    private function appointmentExistsForDate(
        string $seriesId,
        string $scheduledAt,
    ): bool {
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            return false;
        }
        $stmt = $this->db->prepare('
            SELECT id FROM appointments
            WHERE passage_series_id = ?
              AND scheduled_at = ?
              AND status NOT IN (\'canceled\', \'refused\', \'expired\')
            LIMIT 1
        ');
        $stmt->execute([$seriesId, $scheduledAt]);

        return (bool) $stmt->fetchColumn();
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
            throw new RuntimeException('Accès patient refusé');
        }
        $patient = $userModel->getById($patientId, $nurseId, $role, 'full');
        if (!$patient) {
            throw new RuntimeException('Patient introuvable');
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
            throw new RuntimeException('Patient introuvable');
        }
        $address = $patient['address'] ?? null;
        if (!is_array($address) || empty($address['label'])) {
            throw new InvalidArgumentException('Adresse patient requise pour un passage à domicile');
        }
        $lat = isset($address['lat']) ? (float) $address['lat'] : 0.0;
        $lng = isset($address['lng']) ? (float) $address['lng'] : 0.0;
        if ($lat === 0.0 && $lng === 0.0) {
            throw new InvalidArgumentException('Coordonnées patient invalides');
        }

        return [
            'label' => trim((string) $address['label']),
            'lat' => $lat,
            'lng' => $lng,
        ];
    }

    /**
     * @return array{label: string, lat: float, lng: float}
     */
    private function resolveNurseOfficeAddress(string $nurseId, string $role): array
    {
        $userModel = new User();
        $nurse = $userModel->getById($nurseId, $nurseId, $role, 'full');
        if (!$nurse) {
            throw new RuntimeException('Profil infirmier introuvable');
        }
        $address = $nurse['address'] ?? null;
        if (!is_array($address) || empty($address['label'])) {
            throw new InvalidArgumentException(
                'Adresse cabinet requise — renseignez votre adresse professionnelle dans votre profil',
            );
        }
        $lat = isset($address['lat']) ? (float) $address['lat'] : 0.0;
        $lng = isset($address['lng']) ? (float) $address['lng'] : 0.0;
        if ($lat === 0.0 && $lng === 0.0) {
            throw new InvalidArgumentException('Coordonnées cabinet invalides — vérifiez votre adresse pro');
        }

        return [
            'label' => trim((string) $address['label']),
            'lat' => $lat,
            'lng' => $lng,
        ];
    }
}
