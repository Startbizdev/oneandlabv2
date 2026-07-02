<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/PassageMaterializer.php';
require_once __DIR__ . '/PassageDateExpander.php';
require_once __DIR__ . '/../DbSchemaCache.php';

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
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(string $nurseId, array $input): array
    {
        $this->assertTableExists();
        $normalized = $this->normalizeInput($input);
        $id = nurse_passage_uuid();
        $stmt = $this->db->prepare('
            INSERT INTO nurse_passage_series (
                id, nurse_id, patient_id, planning_type, planning_config,
                time_slot, custom_time, duration_minutes, at_home, nursing_items, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
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

        $series = $this->getById($id, $nurseId);
        if (!$series) {
            throw new RuntimeException('Série introuvable après création');
        }
        $materialized = $this->materializer->materializeSeries($series, $nurseId);

        return [
            'series_id' => $id,
            'created_appointments' => $materialized['created'],
            'appointment_ids' => $materialized['appointment_ids'],
            'first_date' => $materialized['first_date'],
            'last_date' => $materialized['last_date'],
            'series' => $this->enrichSeries($series),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getById(string $id, string $nurseId): ?array
    {
        $this->assertTableExists();
        $stmt = $this->db->prepare('SELECT * FROM nurse_passage_series WHERE id = ? AND nurse_id = ? LIMIT 1');
        $stmt->execute([$id, $nurseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->enrichSeries($row) : null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(string $id, string $nurseId, array $input): array
    {
        $existing = $this->getById($id, $nurseId);
        if (!$existing) {
            throw new RuntimeException('Série introuvable');
        }
        $normalized = $this->normalizeInput(array_merge($existing, $input));
        $upd = $this->db->prepare('
            UPDATE nurse_passage_series
            SET planning_type = ?, planning_config = ?, time_slot = ?, custom_time = ?,
                duration_minutes = ?, at_home = ?, nursing_items = ?, notes = ?, updated_at = NOW()
            WHERE id = ? AND nurse_id = ?
        ');
        $upd->execute([
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

        $series = $this->getById($id, $nurseId);
        if (!$series) {
            throw new RuntimeException('Série introuvable');
        }
        $this->cancelFutureAppointments($id, $nurseId);
        $materialized = $this->materializer->materializeSeries($series, $nurseId);

        return [
            'series_id' => $id,
            'created_appointments' => $materialized['created'],
            'appointment_ids' => $materialized['appointment_ids'],
            'first_date' => $materialized['first_date'],
            'last_date' => $materialized['last_date'],
            'series' => $series,
        ];
    }

    public function delete(string $id, string $nurseId): void
    {
        $existing = $this->getById($id, $nurseId);
        if (!$existing) {
            throw new RuntimeException('Série introuvable');
        }
        $this->cancelFutureAppointments($id, $nurseId);
        $this->db->prepare('DELETE FROM nurse_passage_series WHERE id = ? AND nurse_id = ?')->execute([$id, $nurseId]);
    }

    /**
     * @return array<string, mixed>
     */
    public function materialize(string $id, string $nurseId): array
    {
        $series = $this->getById($id, $nurseId);
        if (!$series) {
            throw new RuntimeException('Série introuvable');
        }
        $materialized = $this->materializer->materializeSeries($series, $nurseId);

        return [
            'series_id' => $id,
            'created_appointments' => $materialized['created'],
            'appointment_ids' => $materialized['appointment_ids'],
            'first_date' => $materialized['first_date'],
            'last_date' => $materialized['last_date'],
        ];
    }

    private function cancelFutureAppointments(string $seriesId, string $nurseId): void
    {
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            return;
        }
        $this->db->prepare("
            UPDATE appointments
            SET status = 'canceled', updated_at = NOW()
            WHERE passage_series_id = ?
              AND assigned_nurse_id = ?
              AND status IN ('confirmed', 'planned')
              AND scheduled_at >= NOW()
        ")->execute([$seriesId, $nurseId]);
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
        PassageDateExpander::expand($planningType, $config);

        $timeSlot = trim((string) ($input['time_slot'] ?? 'morning'));
        if (!in_array($timeSlot, self::VALID_SLOTS, true)) {
            throw new InvalidArgumentException('time_slot invalide');
        }
        $customTime = null;
        if ($timeSlot === 'custom') {
            $customTime = trim((string) ($input['custom_time'] ?? ''));
            if ($customTime === '') {
                throw new InvalidArgumentException('custom_time requis pour créneau personnalisé');
            }
        }

        $items = $input['nursing_items'] ?? [];
        if (!is_array($items) || $items === []) {
            throw new InvalidArgumentException('nursing_items requis');
        }
        $normalizedItems = [];
        foreach ($items as $it) {
            if (!is_array($it)) {
                continue;
            }
            $catId = trim((string) ($it['category_id'] ?? ''));
            if ($catId === '') {
                continue;
            }
            $normalizedItems[] = [
                'category_id' => $catId,
                'label' => isset($it['label']) ? (string) $it['label'] : null,
                'care_options' => is_array($it['care_options'] ?? null) ? $it['care_options'] : [],
            ];
        }
        if ($normalizedItems === []) {
            throw new InvalidArgumentException('nursing_items invalides');
        }

        if (isset($input['time_range']) && is_array($input['time_range']) && count($input['time_range']) >= 2) {
            $config['time_range'] = [(int) $input['time_range'][0], (int) $input['time_range'][1]];
        } elseif ($timeSlot === 'all_day') {
            unset($config['time_range']);
        }

        return [
            'patient_id' => $patientId,
            'planning_type' => $planningType,
            'planning_config' => $config,
            'time_slot' => $timeSlot,
            'custom_time' => $customTime,
            'duration_minutes' => max(5, min(240, (int) ($input['duration_minutes'] ?? 30))),
            'at_home' => ($input['at_home'] ?? true) !== false,
            'nursing_items' => $normalizedItems,
            'notes' => isset($input['notes']) ? trim((string) $input['notes']) : null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function enrichSeries(array $row): array
    {
        $row['planning_config'] = is_string($row['planning_config'] ?? null)
            ? (json_decode((string) $row['planning_config'], true) ?: [])
            : ($row['planning_config'] ?? []);
        $row['nursing_items'] = is_string($row['nursing_items'] ?? null)
            ? (json_decode((string) $row['nursing_items'], true) ?: [])
            : ($row['nursing_items'] ?? []);
        $row['at_home'] = (bool) ($row['at_home'] ?? true);

        if (DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) AS cnt,
                       MIN(DATE(CONVERT_TZ(scheduled_at, \'+00:00\', \'Europe/Paris\'))) AS first_date,
                       MAX(DATE(CONVERT_TZ(scheduled_at, \'+00:00\', \'Europe/Paris\'))) AS last_date
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
