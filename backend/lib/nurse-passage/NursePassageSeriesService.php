<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../AppointmentCreationRequest.php';
require_once __DIR__ . '/PassageMaterializer.php';
require_once __DIR__ . '/PassageDateExpander.php';
require_once __DIR__ . '/PassageSlotResolver.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

final class NursePassageSeriesService
{
    private PDO $db;
    private PassageMaterializer $materializer;

    private const VALID_PLANNING = ['single_day', 'interval', 'weekdays', 'custom_dates', 'manual'];
    private const VALID_SLOTS = ['morning', 'noon', 'afternoon', 'evening', 'night', 'custom', 'all_day'];

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_passage_db();
        $this->materializer = new PassageMaterializer($this->db);
    }

    /**
     * Crée la série et ses passages dans une seule transaction.
     * `client_request_id` rend la création rejouable sans doublon (même clé + même contenu).
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(string $nurseId, array $input, ?DateTimeImmutable $now = null): array
    {
        $this->assertTableExists();
        $requestKey = $input['client_request_id'] ?? null;
        unset($input['client_request_id']);
        $normalized = $this->normalizeInput($input);
        foreach (PassageMaterializer::SERVER_CONFIG_KEYS as $key) {
            unset($normalized['planning_config'][$key]);
        }
        $insert = fn (): string => $this->insertAndMaterialize($nurseId, $normalized, $now);

        if ($requestKey !== null) {
            if (!is_string($requestKey)) {
                throw new InvalidArgumentException('client_request_id invalide');
            }
            $hash = hash('sha256', json_encode([$nurseId, $normalized], JSON_THROW_ON_ERROR));
            $seriesId = AppointmentCreationRequest::run($this->db, $nurseId, $requestKey, $hash, $insert);
        } else {
            $seriesId = DatabaseTransaction::run($this->db, $insert);
        }

        return $this->seriesResult($seriesId, $nurseId);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getById(string $id, string $nurseId): ?array
    {
        $this->assertTableExists();
        $row = $this->loadRow($id, $nurseId, false);
        if ($row === null && NurseCollaboration::isSeriesSharedWith($this->db, $id, $nurseId)) {
            $row = $this->loadRowById($id);
        }

        return $row ? $this->enrichSeries($row) : null;
    }

    /**
     * Note, soins, durée, lieu : mise à jour sur place des passages à venir.
     * Planification ou créneaux : seules les occurrences ajoutées / retirées sont créées / annulées.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(string $id, string $nurseId, array $input, ?DateTimeImmutable $now = null): array
    {
        $this->assertTableExists();
        $outcome = DatabaseTransaction::run($this->db, function () use ($id, $nurseId, $input, $now): array {
            $before = $this->requireRow($id, $nurseId, true);
            $beforeConfig = PassageMaterializer::decodeConfig($before);
            $merged = array_merge($before, $input);
            $inputConfig = is_array($input['planning_config'] ?? null) ? $input['planning_config'] : null;
            $merged['planning_config'] = $inputConfig ?? $beforeConfig;
            if ($inputConfig === null || !array_key_exists('daily_time_slots', $inputConfig)) {
                // Sans créneaux explicites : plusieurs créneaux existants sont conservés ; un créneau unique
                // est porté par time_slot / custom_time (que le client peut avoir modifiés).
                if (count(PassageMaterializer::dailySlots($before)) > 1) {
                    $merged['planning_config']['daily_time_slots'] = $beforeConfig['daily_time_slots'];
                } else {
                    unset($merged['planning_config']['daily_time_slots']);
                }
            }
            $normalized = $this->normalizeInput($merged);
            foreach (PassageMaterializer::SERVER_CONFIG_KEYS as $key) {
                unset($normalized['planning_config'][$key]);
                if (array_key_exists($key, $beforeConfig)) {
                    $normalized['planning_config'][$key] = $beforeConfig[$key];
                }
            }
            $this->writeRow($id, $nurseId, $normalized);
            $after = $this->requireRow($id, $nurseId, false);

            $today = PassageMaterializer::todayParis($now);
            $todayYmd = $today->format('Y-m-d');
            $until = PassageMaterializer::horizonEnd($today);
            $kept = [];
            $toCancel = [];
            $scheduleChanged = $this->scheduleSignature($before) !== $this->scheduleSignature($after);
            $targets = $scheduleChanged ? PassageMaterializer::targetOccurrences($after, $todayYmd, $until) : null;
            foreach ($this->materializer->loadActiveAppointments($id, $nurseId, $todayYmd) as $apt) {
                $isTarget = $targets === null || isset($targets[$apt['key']]);
                if ($isTarget && !isset($kept[$apt['key']])) {
                    $kept[$apt['key']] = $apt;
                } else {
                    $toCancel[] = $apt['id'];
                }
            }
            $canceled = $this->materializer->cancelAppointments($toCancel);

            $createdIds = [];
            if ($scheduleChanged) {
                $createdIds = $this->materializer->createMissing(
                    $after,
                    $nurseId,
                    $todayYmd,
                    $until,
                    array_fill_keys(array_keys($kept), true),
                    $now,
                );
                $this->setMaterializedUntil($id, $until);
            }

            $updated = 0;
            if ($this->contentSignature($before) !== $this->contentSignature($after)) {
                $address = (bool) $before['at_home'] !== (bool) $after['at_home']
                    ? $this->materializer->resolveAddress($after, $nurseId)
                    : null;
                foreach ($kept as $apt) {
                    $this->materializer->applyContent($after, $apt, $address);
                    $updated++;
                }
            }

            return [
                'created_appointments' => count($createdIds),
                'appointment_ids' => $createdIds,
                'updated_appointments' => $updated,
                'canceled_appointments' => $canceled,
            ];
        });

        $series = $this->requireSeries($id, $nurseId);

        return [
            'series_id' => $id,
            'first_date' => $series['first_date'] ?? null,
            'last_date' => $series['last_date'] ?? null,
            'series' => $series,
        ] + $outcome;
    }

    /** Supprime la série et annule tous ses passages non effectués à partir d'aujourd'hui (inclus). */
    public function delete(string $id, string $nurseId, ?DateTimeImmutable $now = null): int
    {
        $this->assertTableExists();

        return DatabaseTransaction::run($this->db, function () use ($id, $nurseId, $now): int {
            $this->requireRow($id, $nurseId, true);
            $todayYmd = PassageMaterializer::todayParis($now)->format('Y-m-d');
            $ids = array_column($this->materializer->loadActiveAppointments($id, $nurseId, $todayYmd), 'id');
            $canceled = $this->materializer->cancelAppointments($ids);
            $this->db->prepare('DELETE FROM nurse_passage_series WHERE id = ? AND nurse_id = ?')->execute([$id, $nurseId]);

            return $canceled;
        });
    }

    /**
     * Supprime un seul passage de la série : il est annulé et mémorisé comme exclu,
     * pour ne jamais être recréé par une régénération ou une prolongation.
     *
     * @return array<string, mixed>
     */
    public function cancelOccurrence(string $id, string $nurseId, string $appointmentId, ?DateTimeImmutable $now = null): array
    {
        $this->assertTableExists();
        DatabaseTransaction::run($this->db, function () use ($id, $nurseId, $appointmentId, $now): void {
            $row = $this->requireRow($id, $nurseId, true);
            $apt = $this->requireSeriesAppointment($id, $nurseId, $appointmentId);
            $config = PassageMaterializer::decodeConfig($row);
            $todayYmd = PassageMaterializer::todayParis($now)->format('Y-m-d');
            $excluded = array_values(array_filter(
                array_map('strval', is_array($config['excluded_occurrences'] ?? null) ? $config['excluded_occurrences'] : []),
                static fn (string $key): bool => substr($key, 0, 10) >= $todayYmd,
            ));
            if (!in_array($apt['key'], $excluded, true)) {
                $excluded[] = $apt['key'];
            }
            $config['excluded_occurrences'] = $excluded;
            $this->writeConfig($id, $config);
            $this->materializer->cancelAppointments([$appointmentId]);
        });

        return ['series_id' => $id, 'appointment_id' => $appointmentId, 'series' => $this->requireSeries($id, $nurseId)];
    }

    /**
     * Retire de la série le créneau quotidien du passage donné et annule ses passages à venir.
     *
     * @return array<string, mixed>
     */
    public function removeSlot(string $id, string $nurseId, string $appointmentId, ?DateTimeImmutable $now = null): array
    {
        $this->assertTableExists();
        $canceled = DatabaseTransaction::run($this->db, function () use ($id, $nurseId, $appointmentId, $now): int {
            $row = $this->requireRow($id, $nurseId, true);
            $apt = $this->requireSeriesAppointment($id, $nurseId, $appointmentId);
            $slotKey = substr($apt['key'], 11);
            $slots = PassageMaterializer::dailySlots($row);
            $remaining = array_values(array_filter(
                $slots,
                static fn (array $s): bool => PassageSlotResolver::slotKey($s['time_slot'], $s['custom_time']) !== $slotKey,
            ));
            if (count($remaining) === count($slots)) {
                throw new InvalidArgumentException('Ce créneau ne fait plus partie de la série');
            }
            if ($remaining === []) {
                throw new InvalidArgumentException('Dernier créneau de la série : supprimez la série');
            }

            $config = PassageMaterializer::decodeConfig($row);
            $config['daily_time_slots'] = $remaining;
            $this->db->prepare('
                UPDATE nurse_passage_series
                SET planning_config = ?, time_slot = ?, custom_time = ?, updated_at = NOW()
                WHERE id = ? AND nurse_id = ?
            ')->execute([
                json_encode($config, JSON_THROW_ON_ERROR),
                $remaining[0]['time_slot'],
                $remaining[0]['custom_time'],
                $id,
                $nurseId,
            ]);

            $todayYmd = PassageMaterializer::todayParis($now)->format('Y-m-d');
            $ids = [];
            foreach ($this->materializer->loadActiveAppointments($id, $nurseId, $todayYmd) as $active) {
                if (substr($active['key'], 11) === $slotKey) {
                    $ids[] = $active['id'];
                }
            }

            return $this->materializer->cancelAppointments($ids);
        });

        return ['series_id' => $id, 'canceled_appointments' => $canceled, 'series' => $this->requireSeries($id, $nurseId)];
    }

    /**
     * Génère les passages manquants (planification manuelle ou rattrapage), sans rien annuler.
     *
     * @return array<string, mixed>
     */
    public function materialize(string $id, string $nurseId, ?DateTimeImmutable $now = null): array
    {
        $this->assertTableExists();
        $createdIds = DatabaseTransaction::run($this->db, function () use ($id, $nurseId, $now): array {
            $row = $this->requireRow($id, $nurseId, true);
            $today = PassageMaterializer::todayParis($now);
            $todayYmd = $today->format('Y-m-d');
            $until = PassageMaterializer::horizonEnd($today);
            $existing = array_fill_keys(
                array_column($this->materializer->loadActiveAppointments($id, $nurseId, $todayYmd), 'key'),
                true,
            );
            $created = $this->materializer->createMissing($row, $nurseId, $todayYmd, $until, $existing, $now);
            $this->setMaterializedUntil($id, $until);

            return $created;
        });
        $series = $this->requireSeries($id, $nurseId);

        return [
            'series_id' => $id,
            'created_appointments' => count($createdIds),
            'appointment_ids' => $createdIds,
            'first_date' => $series['first_date'] ?? null,
            'last_date' => $series['last_date'] ?? null,
        ];
    }

    /**
     * Prolonge la fenêtre glissante des séries de l'infirmier (appelé à l'ouverture de la tournée).
     * Seules les dates au-delà de la fenêtre déjà générée sont créées.
     */
    public function extendHorizon(string $nurseId, ?string $tourDate = null, ?DateTimeImmutable $now = null): int
    {
        if (!DbSchemaCache::tableExists($this->db, 'nurse_passage_series')) {
            return 0;
        }
        $today = PassageMaterializer::todayParis($now);
        $until = PassageMaterializer::horizonEnd($today);
        if ($tourDate !== null && $tourDate > $until) {
            $until = $tourDate;
        }
        $stmt = $this->db->prepare('SELECT id, planning_config FROM nurse_passage_series WHERE nurse_id = ?');
        $stmt->execute([$nurseId]);
        $created = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $candidate) {
            $done = PassageMaterializer::decodeConfig($candidate)['materialized_until'] ?? null;
            if (is_string($done) && $done >= $until) {
                continue;
            }
            try {
                $created += DatabaseTransaction::run(
                    $this->db,
                    fn (): int => $this->extendSeries((string) $candidate['id'], $nurseId, $today, $until, $now),
                );
            } catch (Throwable $e) {
                error_log('[nurse-passage] extension série ' . $candidate['id'] . ' : ' . $e->getMessage());
            }
        }

        return $created;
    }

    private function extendSeries(string $id, string $nurseId, DateTimeImmutable $today, string $until, ?DateTimeImmutable $now): int
    {
        $row = $this->requireRow($id, $nurseId, true);
        $done = PassageMaterializer::decodeConfig($row)['materialized_until'] ?? null;
        if (is_string($done) && $done >= $until) {
            return 0;
        }
        if (!is_string($done)) {
            // Séries créées avant la fenêtre glissante : déjà générées sur toute leur durée.
            $this->setMaterializedUntil($id, $until);
            return 0;
        }
        $last = PassageMaterializer::lastPlannedDate($row, $until);
        $from = (new DateTimeImmutable($done, new DateTimeZone('Europe/Paris')))->modify('+1 day');
        if ($from < $today) {
            $from = $today;
        }
        $fromYmd = $from->format('Y-m-d');
        $createdIds = [];
        if ($last !== null && $last >= $fromYmd) {
            $existing = array_fill_keys(
                array_column($this->materializer->loadActiveAppointments($id, $nurseId, $fromYmd), 'key'),
                true,
            );
            $createdIds = $this->materializer->createMissing($row, $nurseId, $fromYmd, $until, $existing, $now);
        }
        $this->setMaterializedUntil($id, $until);

        return count($createdIds);
    }

    /** @param array<string, mixed> $normalized */
    private function insertAndMaterialize(string $nurseId, array $normalized, ?DateTimeImmutable $now): string
    {
        $id = nurse_passage_uuid();
        $this->db->prepare('
            INSERT INTO nurse_passage_series (
                id, nurse_id, patient_id, planning_type, planning_config,
                time_slot, custom_time, duration_minutes, at_home, nursing_items, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id,
            $nurseId,
            $normalized['patient_id'],
            $normalized['planning_type'],
            json_encode($normalized['planning_config'], JSON_THROW_ON_ERROR),
            $normalized['time_slot'],
            $normalized['custom_time'],
            $normalized['duration_minutes'],
            $normalized['at_home'] ? 1 : 0,
            json_encode($normalized['nursing_items'], JSON_THROW_ON_ERROR),
            $normalized['notes'],
        ]);

        $row = $this->requireRow($id, $nurseId, false);
        $today = PassageMaterializer::todayParis($now);
        $until = PassageMaterializer::horizonEnd($today);
        $created = $this->materializer->createMissing($row, $nurseId, $today->format('Y-m-d'), $until, [], $now);
        if ($created === []) {
            $lastDate = PassageMaterializer::lastPlannedDate($row, $today->modify('+1 year')->format('Y-m-d'));
            if ($lastDate !== null && $lastDate > $until) {
                throw new InvalidArgumentException(sprintf(
                    'Aucun passage dans les %d prochains jours : enregistrez la série plus près de sa date de début',
                    PassageMaterializer::HORIZON_DAYS,
                ));
            }
            throw new InvalidArgumentException('Aucun passage planifiable : les dates sélectionnées sont dans le passé');
        }
        $this->setMaterializedUntil($id, $until);

        return $id;
    }

    /** @return array<string, mixed> */
    private function seriesResult(string $id, string $nurseId): array
    {
        $series = $this->requireSeries($id, $nurseId);
        $stmt = $this->db->prepare("
            SELECT id FROM appointments
            WHERE passage_series_id = ? AND status NOT IN ('canceled', 'refused', 'expired')
            ORDER BY scheduled_at ASC, created_at ASC, id ASC
        ");
        $stmt->execute([$id]);
        $ids = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        return [
            'series_id' => $id,
            'created_appointments' => count($ids),
            'appointment_ids' => $ids,
            'first_date' => $series['first_date'] ?? null,
            'last_date' => $series['last_date'] ?? null,
            'series' => $series,
        ];
    }

    /**
     * @return array{id: string, key: string}
     */
    private function requireSeriesAppointment(string $seriesId, string $nurseId, string $appointmentId): array
    {
        $apt = $this->materializer->loadSeriesAppointment($seriesId, $nurseId, $appointmentId);
        if ($apt === null) {
            throw HttpStatusException::notFound('Passage introuvable dans cette série');
        }
        if (!in_array($apt['status'], PassageMaterializer::ACTIVE_STATUSES, true)) {
            throw HttpStatusException::conflict('Ce passage est déjà effectué ou annulé', 'PASSAGE_NOT_ACTIVE');
        }

        return ['id' => $apt['id'], 'key' => $apt['key']];
    }

    /** @return array<string, mixed>|null */
    private function loadRow(string $id, string $nurseId, bool $forUpdate): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM nurse_passage_series WHERE id = ? AND nurse_id = ? LIMIT 1' . ($forUpdate ? ' FOR UPDATE' : ''),
        );
        $stmt->execute([$id, $nurseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->hydrateRow($row) : null;
    }

    /** Lecture sans filtre titulaire : réservée au confrère déjà autorisé par le binôme. */
    private function loadRowById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM nurse_passage_series WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->hydrateRow($row) : null;
    }

    /** @param array<string, mixed> $row */
    private function hydrateRow(array $row): array
    {
        $row['planning_config'] = PassageMaterializer::decodeConfig($row);
        $row['nursing_items'] = PassageMaterializer::decodeItems($row);
        $row['at_home'] = (bool) ($row['at_home'] ?? true);

        return $row;
    }

    /** @return array<string, mixed> */
    private function requireRow(string $id, string $nurseId, bool $forUpdate): array
    {
        $row = $this->loadRow($id, $nurseId, $forUpdate);
        if (!$row) {
            throw HttpStatusException::notFound('Série introuvable');
        }

        return $row;
    }

    /** @return array<string, mixed> */
    private function requireSeries(string $id, string $nurseId): array
    {
        return $this->enrichSeries($this->requireRow($id, $nurseId, false));
    }

    /** @param array<string, mixed> $normalized */
    private function writeRow(string $id, string $nurseId, array $normalized): void
    {
        $this->db->prepare('
            UPDATE nurse_passage_series
            SET planning_type = ?, planning_config = ?, time_slot = ?, custom_time = ?,
                duration_minutes = ?, at_home = ?, nursing_items = ?, notes = ?, updated_at = NOW()
            WHERE id = ? AND nurse_id = ?
        ')->execute([
            $normalized['planning_type'],
            json_encode($normalized['planning_config'], JSON_THROW_ON_ERROR),
            $normalized['time_slot'],
            $normalized['custom_time'],
            $normalized['duration_minutes'],
            $normalized['at_home'] ? 1 : 0,
            json_encode($normalized['nursing_items'], JSON_THROW_ON_ERROR),
            $normalized['notes'],
            $id,
            $nurseId,
        ]);
    }

    /** @param array<string, mixed> $config */
    private function writeConfig(string $id, array $config): void
    {
        $this->db->prepare('UPDATE nurse_passage_series SET planning_config = ?, updated_at = NOW() WHERE id = ?')
            ->execute([json_encode($config, JSON_THROW_ON_ERROR), $id]);
    }

    private function setMaterializedUntil(string $id, string $until): void
    {
        $this->db->prepare("
            UPDATE nurse_passage_series
            SET planning_config = JSON_SET(planning_config, '$.materialized_until', ?)
            WHERE id = ?
        ")->execute([$until, $id]);
    }

    /** @param array<string, mixed> $row */
    private function scheduleSignature(array $row): string
    {
        $config = PassageMaterializer::decodeConfig($row);
        foreach ([...PassageMaterializer::SERVER_CONFIG_KEYS, 'time_range', 'daily_time_slots'] as $key) {
            unset($config[$key]);
        }
        foreach ($config as $key => $value) {
            if (is_array($value) && array_is_list($value)) {
                $value = array_map('strval', $value);
                sort($value);
                $config[$key] = $value;
            } elseif (is_scalar($value)) {
                $config[$key] = (string) $value;
            }
        }
        ksort($config);
        $slots = array_map(
            static fn (array $s): string => PassageSlotResolver::slotKey($s['time_slot'], $s['custom_time']),
            PassageMaterializer::dailySlots($row),
        );

        return json_encode([(string) $row['planning_type'], $config, $slots], JSON_THROW_ON_ERROR);
    }

    /** @param array<string, mixed> $row */
    private function contentSignature(array $row): string
    {
        $config = PassageMaterializer::decodeConfig($row);

        return json_encode([
            (int) $row['duration_minutes'],
            (bool) $row['at_home'],
            PassageMaterializer::normalizeNursingItemsForForm(PassageMaterializer::decodeItems($row)),
            trim((string) ($row['notes'] ?? '')),
            $config['time_range'] ?? null,
        ], JSON_THROW_ON_ERROR);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeInput(array $input): array
    {
        $patientId = trim((string) ($input['patient_id'] ?? ''));
        if ($patientId === '') {
            throw new InvalidArgumentException('patient_id requis');
        }
        $planningType = trim((string) ($input['planning_type'] ?? 'single_day'));
        if (!in_array($planningType, self::VALID_PLANNING, true)) {
            throw new InvalidArgumentException('planning_type invalide');
        }
        $config = $input['planning_config'] ?? [];
        if (!is_array($config)) {
            throw new InvalidArgumentException('planning_config invalide');
        }

        $timeSlot = trim((string) ($input['time_slot'] ?? 'morning'));
        if (!in_array($timeSlot, self::VALID_SLOTS, true)) {
            throw new InvalidArgumentException('time_slot invalide');
        }
        $customTime = $timeSlot === 'all_day' ? null : PassageSlotResolver::normalizeTime($input['custom_time'] ?? null);
        $rangeStart = null;
        if (isset($input['time_range']) && is_array($input['time_range']) && count($input['time_range']) >= 1) {
            $rangeStart = $input['time_range'][0];
        } elseif (is_array($config['time_range'] ?? null) && count($config['time_range']) >= 1) {
            $rangeStart = $config['time_range'][0];
        }
        if ($timeSlot === 'custom' && $customTime === null && $rangeStart !== null) {
            $hour = (float) PassageSlotResolver::quarterHour($rangeStart);
            $h = (int) floor($hour);
            $customTime = sprintf('%02d:%02d', max(0, min(23, $h)), (int) round(($hour - $h) * 60));
        }
        if ($timeSlot === 'custom' && $customTime === null) {
            throw new InvalidArgumentException('custom_time requis pour créneau personnalisé');
        }

        if (array_key_exists('daily_time_slots', $config)) {
            $daily = $this->normalizeDailySlots($config['daily_time_slots']);
            if ($daily === []) {
                unset($config['daily_time_slots']);
            } else {
                $config['daily_time_slots'] = $daily;
                $timeSlot = $daily[0]['time_slot'];
                $customTime = $daily[0]['custom_time'];
            }
        }

        if (isset($input['time_range']) && is_array($input['time_range']) && count($input['time_range']) >= 2) {
            $config['time_range'] = $this->normalizeTimeRange($input['time_range']);
        } elseif (is_array($config['time_range'] ?? null)) {
            $config['time_range'] = $this->normalizeTimeRange($config['time_range']);
        }
        if ($timeSlot === 'all_day') {
            unset($config['time_range']);
        }
        PassageDateExpander::expand($planningType, $config);

        return [
            'patient_id' => $patientId,
            'planning_type' => $planningType,
            'planning_config' => $config,
            'time_slot' => $timeSlot,
            'custom_time' => $customTime,
            'duration_minutes' => max(5, min(240, (int) ($input['duration_minutes'] ?? 30))),
            'at_home' => ($input['at_home'] ?? true) !== false,
            'nursing_items' => $this->normalizeNursingItems($input['nursing_items'] ?? []),
            'notes' => isset($input['notes']) && trim((string) $input['notes']) !== '' ? trim((string) $input['notes']) : null,
        ];
    }

    /**
     * @return list<array{time_slot: string, custom_time: ?string}>
     */
    private function normalizeDailySlots(mixed $raw): array
    {
        if (!is_array($raw)) {
            throw new InvalidArgumentException('daily_time_slots invalide');
        }
        $slots = [];
        $seen = [];
        foreach ($raw as $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException('daily_time_slots invalide');
            }
            $slot = trim((string) ($row['time_slot'] ?? ''));
            if (!in_array($slot, self::VALID_SLOTS, true)) {
                throw new InvalidArgumentException('Créneau invalide dans daily_time_slots');
            }
            $custom = $slot === 'all_day' ? null : PassageSlotResolver::normalizeTime($row['custom_time'] ?? null);
            if ($slot === 'custom' && $custom === null) {
                throw new InvalidArgumentException('Heure requise pour un créneau personnalisé');
            }
            $key = PassageSlotResolver::slotKey($slot, $custom);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $slots[] = ['time_slot' => $slot, 'custom_time' => $custom];
        }
        if (count($slots) > 1 && isset($seen['all_day'])) {
            throw new InvalidArgumentException('« Toute la journée » ne se combine pas avec d’autres créneaux');
        }

        return $slots;
    }

    /**
     * @param array<int|string, mixed> $raw
     * @return array{0: int|float, 1: int|float}
     */
    private function normalizeTimeRange(array $raw): array
    {
        $values = array_values($raw);
        if (count($values) < 2 || !is_numeric($values[0]) || !is_numeric($values[1])) {
            throw new InvalidArgumentException('time_range invalide');
        }
        $lo = PassageSlotResolver::quarterHour($values[0]);
        $hi = PassageSlotResolver::quarterHour($values[1]);
        if ($hi <= $lo) {
            throw new InvalidArgumentException('time_range invalide');
        }

        return [$lo, $hi];
    }

    /**
     * Un même soin peut figurer plusieurs fois avec des options différentes ; seuls les doublons exacts sont retirés.
     *
     * @return list<array{category_id: string, label: ?string, care_options: array<mixed>}>
     */
    private function normalizeNursingItems(mixed $items): array
    {
        if (!is_array($items) || $items === []) {
            throw new InvalidArgumentException('nursing_items requis');
        }
        $normalized = [];
        $seen = [];
        foreach ($items as $it) {
            if (!is_array($it)) {
                continue;
            }
            $catId = trim((string) ($it['category_id'] ?? ''));
            if ($catId === '') {
                continue;
            }
            $options = is_array($it['care_options'] ?? null) ? $it['care_options'] : [];
            $canonical = $options;
            ksort($canonical);
            $key = $catId . '|' . json_encode($canonical, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $normalized[] = [
                'category_id' => $catId,
                'label' => isset($it['label']) ? (string) $it['label'] : null,
                'care_options' => $options,
            ];
        }
        if ($normalized === []) {
            throw new InvalidArgumentException('nursing_items invalides');
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function enrichSeries(array $row): array
    {
        $row['planning_config'] = PassageMaterializer::decodeConfig($row);
        $row['nursing_items'] = PassageMaterializer::decodeItems($row);
        $row['at_home'] = (bool) ($row['at_home'] ?? true);
        if (isset($row['custom_time']) && is_string($row['custom_time'])) {
            $row['custom_time'] = substr($row['custom_time'], 0, 5);
        }

        if (DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) AS cnt,
                       MIN(DATE(scheduled_at)) AS first_date,
                       MAX(DATE(scheduled_at)) AS last_date
                FROM appointments
                WHERE passage_series_id = ?
                  AND status NOT IN (\'canceled\', \'refused\', \'expired\')
            ');
            $stmt->execute([$row['id']]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $row['appointment_count'] = (int) ($stats['cnt'] ?? 0);
            $row['first_date'] = $stats['first_date'] ?? null;
            $row['last_date'] = $stats['last_date'] ?? null;
        }

        return $row;
    }

    private function assertTableExists(): void
    {
        if (!DbSchemaCache::tableExists($this->db, 'nurse_passage_series')) {
            throw new RuntimeException('Migration 093 requise (nurse_passage_series)');
        }
    }
}
