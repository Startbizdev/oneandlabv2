<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/TourOrderEngine.php';
require_once __DIR__ . '/TourProximity.php';
require_once __DIR__ . '/PatientAbsenceService.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../AppointmentListPayload.php';
require_once __DIR__ . '/../DbSchemaCache.php';

final class NurseTourService
{
    private PDO $db;
    private Appointment $appointments;
    private TourOrderEngine $orderEngine;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_tour_db();
        $this->appointments = new Appointment();
        $this->orderEngine = new TourOrderEngine();
    }

    /**
     * @param array{lat?: float, lng?: float}|null $origin
     * @return array<string, mixed>
     */
    public function getTour(string $nurseId, string $tourDate, ?array $origin = null): array
    {
        $appointments = $this->loadAppointmentsForDate($nurseId, $tourDate);
        $plan = $this->ensurePlan($nurseId, $tourDate);
        $this->syncStops((string) $plan['id'], $appointments);
        $this->syncCompletedVisitStatus((string) $plan['id'], $appointments);

        $orderIds = $this->orderEngine->orderIds($appointments, $plan, $origin);
        $stops = $this->buildStopsResponse((string) $plan['id'], $appointments, $orderIds, $origin, $nurseId, $tourDate);

        $absent = 0;
        $done = 0;
        foreach ($stops as $stop) {
            if (!empty($stop['is_patient_absent_today'])) {
                $absent++;
                continue;
            }
            $visit = (string) ($stop['visit_status'] ?? '');
            $aptStatus = (string) ($stop['status'] ?? '');
            if ($visit === 'done' || $visit === 'skipped' || $aptStatus === 'completed') {
                $done++;
            }
        }

        return [
            'date' => $tourDate,
            'plan' => [
                'id' => $plan['id'],
                'sort_mode' => $plan['sort_mode'],
                'manual_order_locked' => (bool) $plan['manual_order_locked'],
                'nav_app_pref' => $plan['nav_app_pref'],
                'optimized_at' => $plan['optimized_at'],
            ],
            'summary' => [
                'total_stops' => count($stops),
                'done_stops' => $done,
                'absent_stops' => $absent,
                'estimated_km' => round(array_sum(array_column($stops, 'distance_km_from_prev')), 1),
            ],
            'stops' => $stops,
            'next_stop_id' => $this->resolveNextStopId($stops),
        ];
    }

    /**
     * @return array<string, int>
     */
    public function getSummaryRange(string $nurseId, string $fromDate, string $toDate): array
    {
        $stmt = $this->db->prepare("
            SELECT DATE(CONVERT_TZ(a.scheduled_at, '+00:00', 'Europe/Paris')) AS tour_day,
                   COUNT(*) AS cnt
            FROM appointments a
            WHERE a.type = 'nursing'
              AND a.assigned_nurse_id = ?
              AND a.status IN ('confirmed', 'inProgress', 'planned', 'completed')
              AND a.scheduled_at IS NOT NULL
              AND DATE(CONVERT_TZ(a.scheduled_at, '+00:00', 'Europe/Paris')) BETWEEN ? AND ?
            GROUP BY tour_day
        ");
        $stmt->execute([$nurseId, $fromDate, $toDate]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $day = (string) ($row['tour_day'] ?? '');
            if ($day !== '') {
                $out[$day] = (int) ($row['cnt'] ?? 0);
            }
        }

        return $out;
    }

    /**
     * @param list<string> $appointmentIds
     * @return array<string, mixed>
     */
    public function saveManualOrder(string $nurseId, string $tourDate, array $appointmentIds): array
    {
        $appointments = $this->loadAppointmentsForDate($nurseId, $tourDate);
        $validIds = array_flip(array_map(static fn (array $a): string => (string) ($a['id'] ?? ''), $appointments));
        $filtered = [];
        foreach ($appointmentIds as $id) {
            $id = trim($id);
            if ($id !== '' && isset($validIds[$id])) {
                $filtered[] = $id;
            }
        }
        foreach ($appointments as $apt) {
            $id = (string) ($apt['id'] ?? '');
            if ($id !== '' && !in_array($id, $filtered, true)) {
                $filtered[] = $id;
            }
        }

        $plan = $this->ensurePlan($nurseId, $tourDate);
        $upd = $this->db->prepare("
            UPDATE nurse_tour_plans
            SET appointment_order_json = ?, manual_order_locked = 1, sort_mode = 'manual', updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([json_encode($filtered), $plan['id']]);

        return $this->getTour($nurseId, $tourDate);
    }

    /**
     * @param array{lat?: float, lng?: float}|null $origin
     * @return array<string, mixed>
     */
    public function optimize(string $nurseId, string $tourDate, string $mode, bool $force, ?array $origin = null): array
    {
        $plan = $this->ensurePlan($nurseId, $tourDate);
        if ((bool) ($plan['manual_order_locked'] ?? false) && !$force) {
            throw new RuntimeException('Ordre manuel verrouillé — confirmez force=true pour remplacer');
        }

        $appointments = $this->loadAppointmentsForDate($nurseId, $tourDate);

        if ($mode === 'manual') {
            $orderIds = $this->orderEngine->orderIds($appointments, $plan, $origin);
            $upd = $this->db->prepare("
                UPDATE nurse_tour_plans
                SET appointment_order_json = ?, manual_order_locked = 1, sort_mode = 'manual', updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([json_encode($orderIds), $plan['id']]);

            return $this->getTour($nurseId, $tourDate, $origin);
        }

        $plan['sort_mode'] = in_array($mode, ['smart', 'schedule', 'nearest'], true) ? $mode : 'smart';
        $plan['manual_order_locked'] = false;
        $orderIds = $this->orderEngine->orderIds($appointments, $plan, $origin);

        $upd = $this->db->prepare("
            UPDATE nurse_tour_plans
            SET appointment_order_json = ?, manual_order_locked = 0, sort_mode = ?, optimized_at = NOW(), updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([json_encode($orderIds), $plan['sort_mode'], $plan['id']]);

        return $this->getTour($nurseId, $tourDate, $origin);
    }

    public function resetOrder(string $nurseId, string $tourDate, ?array $origin = null): array
    {
        $plan = $this->ensurePlan($nurseId, $tourDate);
        $this->db->prepare("
            UPDATE nurse_tour_plans
            SET appointment_order_json = NULL, manual_order_locked = 0, sort_mode = 'smart', optimized_at = NOW(), updated_at = NOW()
            WHERE id = ?
        ")->execute([$plan['id']]);

        return $this->getTour($nurseId, $tourDate, $origin);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadAppointmentsForDate(string $nurseId, string $tourDate): array
    {
        $tz = new DateTimeZone('Europe/Paris');
        $start = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $tourDate . ' 00:00:00', $tz);
        $end = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $tourDate . ' 23:59:59', $tz);
        if (!$start || !$end) {
            return [];
        }
        $startUtc = $start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $endUtc = $end->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            SELECT a.*, c.name AS category_name, c.icon AS category_icon, c.image_url AS category_image_url
            FROM appointments a
            LEFT JOIN care_categories c ON c.id = a.category_id
            WHERE a.type = 'nursing'
              AND a.assigned_nurse_id = ?
              AND a.status IN ('confirmed', 'inProgress', 'planned', 'completed')
              AND a.scheduled_at IS NOT NULL
              AND a.scheduled_at >= ?
              AND a.scheduled_at <= ?
            ORDER BY a.scheduled_at ASC
        ");
        $stmt->execute([$nurseId, $startUtc, $endUtc]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $hasMergedColumn = DbSchemaCache::tableHasColumn($this->db, 'appointments', 'merged_into_appointment_id');
        $decoded = AppointmentListPayload::decryptRowsForList($this->appointments, $rows, $nurseId, 'nurse');

        return AppointmentListPayload::enrichForListCards($this->db, $this->appointments, $decoded, $hasMergedColumn);
    }

    /**
     * @return array<string, mixed>
     */
    private function ensurePlan(string $nurseId, string $tourDate): array
    {
        $sel = $this->db->prepare('SELECT * FROM nurse_tour_plans WHERE nurse_id = ? AND tour_date = ? LIMIT 1');
        $sel->execute([$nurseId, $tourDate]);
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
        $id = nurse_tour_uuid();
        $ins = $this->db->prepare("
            INSERT INTO nurse_tour_plans (id, nurse_id, tour_date, sort_mode, nav_app_pref)
            VALUES (?, ?, ?, 'smart', 'waze')
        ");
        $ins->execute([$id, $nurseId, $tourDate]);
        $sel->execute([$nurseId, $tourDate]);

        return $sel->fetch(PDO::FETCH_ASSOC) ?: ['id' => $id, 'nurse_id' => $nurseId, 'tour_date' => $tourDate];
    }

    /**
     * @param list<array<string, mixed>> $appointments
     */
    private function syncStops(string $planId, array $appointments): void
    {
        $existing = $this->db->prepare('SELECT id, appointment_id FROM nurse_tour_stops WHERE tour_plan_id = ?');
        $existing->execute([$planId]);
        $byApt = [];
        foreach ($existing->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $byApt[(string) $row['appointment_id']] = (string) $row['id'];
        }

        $seen = [];
        foreach ($appointments as $apt) {
            $aptId = (string) ($apt['id'] ?? '');
            if ($aptId === '') {
                continue;
            }
            $seen[$aptId] = true;
            if (!isset($byApt[$aptId])) {
                $stopId = nurse_tour_uuid();
                $this->db->prepare('
                    INSERT INTO nurse_tour_stops (id, tour_plan_id, appointment_id, visit_status)
                    VALUES (?, ?, ?, \'todo\')
                ')->execute([$stopId, $planId, $aptId]);
            }
        }

        foreach ($byApt as $aptId => $stopId) {
            if (!isset($seen[$aptId])) {
                $this->db->prepare('DELETE FROM nurse_tour_stops WHERE id = ?')->execute([$stopId]);
            }
        }
    }

    /**
     * Aligne visit_status quand le RDV est déjà terminé (ex. finalisation depuis le détail passage).
     *
     * @param list<array<string, mixed>> $appointments
     */
    private function syncCompletedVisitStatus(string $planId, array $appointments): void
    {
        $byId = [];
        foreach ($appointments as $apt) {
            $id = (string) ($apt['id'] ?? '');
            if ($id !== '') {
                $byId[$id] = $apt;
            }
        }

        $stmt = $this->db->prepare('
            SELECT id, appointment_id, visit_status
            FROM nurse_tour_stops
            WHERE tour_plan_id = ?
        ');
        $stmt->execute([$planId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $aptId = (string) ($row['appointment_id'] ?? '');
            $visit = (string) ($row['visit_status'] ?? '');
            if ($visit === 'done' || $visit === 'skipped' || $aptId === '') {
                continue;
            }
            $aptStatus = (string) (($byId[$aptId]['status'] ?? ''));
            if ($aptStatus !== 'completed') {
                continue;
            }
            $this->db->prepare('
                UPDATE nurse_tour_stops
                SET visit_status = ?, visited_at = COALESCE(visited_at, NOW()), updated_at = NOW()
                WHERE id = ?
            ')->execute(['done', (string) $row['id']]);
        }
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @param list<string> $orderIds
     * @return list<array<string, mixed>>
     */
    private function buildStopsResponse(
        string $planId,
        array $appointments,
        array $orderIds,
        ?array $origin,
        string $nurseId,
        string $tourDate,
    ): array {
        $byId = [];
        foreach ($appointments as $apt) {
            $byId[(string) ($apt['id'] ?? '')] = $apt;
        }

        $stopRows = $this->db->prepare('
            SELECT id, appointment_id, visit_status, visited_at, skip_reason
            FROM nurse_tour_stops WHERE tour_plan_id = ?
        ');
        $stopRows->execute([$planId]);
        $stopMeta = [];
        foreach ($stopRows->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $stopMeta[(string) $row['appointment_id']] = $row;
        }

        $patientIds = [];
        foreach ($orderIds as $aptId) {
            if (!isset($byId[$aptId])) {
                continue;
            }
            $pid = $byId[$aptId]['patient_id'] ?? null;
            if ($pid) {
                $patientIds[] = (string) $pid;
            }
        }
        $absenceMap = [];
        try {
            $absenceMap = (new PatientAbsenceService($this->db))->activeMapForDate($nurseId, $patientIds, $tourDate);
        } catch (Throwable $e) {
            error_log('[nurse-tour] patient absences: ' . $e->getMessage());
        }

        $cursor = $origin;
        $position = 0;
        $stops = [];
        $batchSiblingCountCache = [];
        foreach ($orderIds as $aptId) {
            if (!isset($byId[$aptId])) {
                continue;
            }
            $apt = $byId[$aptId];
            $meta = $stopMeta[$aptId] ?? [];
            $coords = TourProximity::coordsFromAppointment($apt);
            $distanceKm = 0.0;
            if ($cursor !== null && $coords !== null) {
                $distanceKm = TourProximity::haversineKm(
                    (float) $cursor['lat'],
                    (float) $cursor['lng'],
                    (float) $coords['lat'],
                    (float) $coords['lng'],
                );
            } elseif ($cursor === null && $coords !== null) {
                $cursor = $coords;
            }

            $fd = is_array($apt['form_data'] ?? null) ? $apt['form_data'] : [];
            $patientName = trim(((string) ($fd['first_name'] ?? '')) . ' ' . ((string) ($fd['last_name'] ?? '')));
            if ($patientName === '') {
                $patientName = 'Patient';
            }

            $addressComplement = '';
            if (is_string($fd['address_complement'] ?? null) && trim($fd['address_complement']) !== '') {
                $addressComplement = trim($fd['address_complement']);
            } elseif (is_array($fd['address'] ?? null) && !empty($fd['address']['complement'])) {
                $addressComplement = trim((string) $fd['address']['complement']);
            }

            $batchSiblingCount = $this->resolveBatchSiblingCount($apt, $batchSiblingCountCache);
            $careOptions = is_array($fd['care_options'] ?? null) ? $fd['care_options'] : null;
            $nursingItems = is_array($apt['nursing_items'] ?? null) ? $apt['nursing_items'] : [];
            $nursingItemsDisplay = is_array($apt['nursing_items_display'] ?? null)
                ? $apt['nursing_items_display']
                : $nursingItems;
            $patientId = !empty($apt['patient_id']) ? (string) $apt['patient_id'] : null;
            $patientAbsence = ($patientId && isset($absenceMap[$patientId])) ? $absenceMap[$patientId] : null;

            $stops[] = [
                'stop_id' => (string) ($meta['id'] ?? ''),
                'appointment_id' => $aptId,
                'position' => $position + 1,
                'visit_status' => (string) ($meta['visit_status'] ?? 'todo'),
                'visited_at' => $meta['visited_at'] ?? null,
                'skip_reason' => $meta['skip_reason'] ?? null,
                'patient_name' => $patientName,
                'patient_id' => $patientId,
                'is_patient_absent_today' => $patientAbsence !== null,
                'patient_absence' => $patientAbsence,
                'patient_gender' => $apt['beneficiary_gender'] ?? null,
                'profile_image_url' => $apt['beneficiary_profile_image_url'] ?? null,
                'type' => (string) ($apt['type'] ?? 'nursing'),
                'category_id' => $apt['category_id'] ?? null,
                'category_name' => (string) ($apt['category_name'] ?? ''),
                'category_icon' => $apt['category_icon'] ?? null,
                'category_image_url' => $apt['category_image_url'] ?? null,
                'creation_batch_id' => $apt['creation_batch_id'] ?? null,
                'batch_sibling_count' => $batchSiblingCount,
                'care_options' => $careOptions,
                'nursing_items' => $nursingItems,
                'nursing_items_display' => $nursingItemsDisplay,
                'status' => (string) ($apt['status'] ?? ''),
                'scheduled_at' => $apt['scheduled_at'] ?? null,
                'availability' => $fd['availability'] ?? null,
                'passage_time_slot' => $fd['passage_time_slot'] ?? null,
                'passage_custom_time' => $fd['custom_time'] ?? null,
                'passage_duration_minutes' => isset($fd['passage_duration_minutes'])
                    ? (int) $fd['passage_duration_minutes']
                    : null,
                'passage_series_id' => $apt['passage_series_id'] ?? null,
                'address_line' => is_array($fd['address'] ?? null)
                    ? (string) (($fd['address']['label'] ?? '') ?: '')
                    : (string) ($apt['address'] ?? ''),
                'address_complement' => $addressComplement,
                'lat' => $coords['lat'] ?? null,
                'lng' => $coords['lng'] ?? null,
                'distance_km_from_prev' => round($distanceKm, 2),
                'drive_min_from_prev' => TourProximity::estimateDriveMin($distanceKm),
                'phone' => (string) ($fd['phone'] ?? ''),
            ];
            $position++;
            if ($coords !== null) {
                $cursor = $coords;
            }
        }

        return $stops;
    }

    /**
     * @param array<string, int> $cache
     */
    private function resolveBatchSiblingCount(array $apt, array &$cache): int
    {
        $batchId = $apt['creation_batch_id'] ?? null;
        $patientId = $apt['patient_id'] ?? null;
        if (empty($batchId) || empty($patientId)) {
            return 0;
        }
        $cacheKey = (string) $batchId . '|' . (string) $patientId;
        if (array_key_exists($cacheKey, $cache)) {
            return $cache[$cacheKey];
        }

        $hasMergedColumn = DbSchemaCache::tableHasColumn($this->db, 'appointments', 'merged_into_appointment_id');
        $mergedFilter = $hasMergedColumn ? ' AND merged_into_appointment_id IS NULL' : '';
        $stmt = $this->db->prepare('
            SELECT COUNT(*) AS cnt FROM appointments
            WHERE creation_batch_id = ?
              AND patient_id = ?
              AND type = \'nursing\'
              ' . $mergedFilter . '
        ');
        $stmt->execute([(string) $batchId, (string) $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = (int) ($row['cnt'] ?? 0);
        $cache[$cacheKey] = $count;

        return $count;
    }

    /**
     * @param list<array<string, mixed>> $stops
     */
    private function resolveNextStopId(array $stops): ?string
    {
        foreach ($stops as $stop) {
            if (!empty($stop['is_patient_absent_today'])) {
                continue;
            }
            $status = (string) ($stop['visit_status'] ?? '');
            if (!in_array($status, ['done', 'skipped'], true)) {
                return (string) ($stop['stop_id'] ?? '');
            }
        }

        return null;
    }
}
