<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/NurseTourService.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/NotificationService.php';

final class TourVisitService
{
    private PDO $db;
    private Appointment $appointments;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_tour_db();
        $this->appointments = new Appointment();
    }

    /**
     * @return array<string, mixed>
     */
    public function updateStopStatus(string $nurseId, string $stopId, string $status, ?string $skipReason = null): array
    {
        $allowed = ['todo', 'en_route', 'on_site', 'done', 'skipped'];
        if (!in_array($status, $allowed, true)) {
            throw new InvalidArgumentException('Statut invalide');
        }

        $row = $this->loadStopForNurse($nurseId, $stopId);
        $visitedAt = in_array($status, ['done', 'on_site'], true) ? date('Y-m-d H:i:s') : null;

        $upd = $this->db->prepare('
            UPDATE nurse_tour_stops
            SET visit_status = ?, visited_at = ?, skip_reason = ?, updated_at = NOW()
            WHERE id = ?
        ');
        $upd->execute([$status, $visitedAt, $skipReason, $stopId]);

        $aptId = (string) ($row['appointment_id'] ?? '');
        if ($status === 'on_site') {
            $this->appointments->updateStatus($aptId, 'inProgress', $nurseId, 'nurse', 'Tournée — sur place');
        } elseif ($status === 'done') {
            $this->appointments->updateStatus($aptId, 'completed', $nurseId, 'nurse', 'Tournée — soin terminé');
        }

        $tourDate = (string) ($row['tour_date'] ?? nurse_tour_parse_date(null));
        $service = new NurseTourService($this->db);

        return $service->getTour($nurseId, $tourDate);
    }

    /**
     * @param array<string, mixed>|string|null $availabilityPayload
     * @return array<string, mixed>
     */
    public function rescheduleStop(
        string $nurseId,
        string $stopId,
        string $scheduledAt,
        array|string|null $availabilityPayload = null,
    ): array {
        $row = $this->loadStopForNurse($nurseId, $stopId);
        $aptId = (string) ($row['appointment_id'] ?? '');

        $stmt = $this->db->prepare("
            SELECT a.*
            FROM appointments a
            WHERE a.id = ? AND a.type = 'nursing' AND a.assigned_nurse_id = ?
              AND a.status IN ('confirmed','inProgress','planned')
            LIMIT 1
        ");
        $stmt->execute([$aptId, $nurseId]);
        $aptRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$aptRow) {
            throw new RuntimeException('RDV introuvable ou non assigné');
        }

        $decoded = $this->appointments->decryptRowForList($aptRow, $nurseId, 'nurse');
        $formData = is_array($decoded['form_data'] ?? null) ? $decoded['form_data'] : [];
        $availability = $this->parseAvailabilityPayload($availabilityPayload ?? ($formData['availability'] ?? null));

        if ($availability !== null) {
            $formData['availability'] = json_encode($availability, JSON_UNESCAPED_UNICODE);
        }

        $utc = $this->scheduledAtParisToUtc($scheduledAt, $availability);

        $this->appointments->update($aptId, [
            'scheduled_at' => $utc,
            'form_data' => $formData,
        ], $nurseId, 'nurse');

        try {
            (new NotificationService())->notifyAppointmentRescheduled($aptId, $nurseId);
        } catch (Throwable $e) {
            error_log('[TourVisitService::rescheduleStop] notify: ' . $e->getMessage());
        }

        $tourDate = (string) ($row['tour_date'] ?? '');
        if ($tourDate === '') {
            $tourDate = (new DateTimeImmutable($utc, new DateTimeZone('UTC')))
                ->setTimezone(new DateTimeZone('Europe/Paris'))
                ->format('Y-m-d');
        }

        $service = new NurseTourService($this->db);

        return $service->getTour($nurseId, $tourDate);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseAvailabilityPayload(mixed $raw): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw)) {
            return null;
        }
        try {
            $parsed = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return is_array($parsed) ? $parsed : null;
    }

    /**
     * @param array<string, mixed>|null $availability
     */
    private function scheduledAtParisToUtc(string $scheduledAt, ?array $availability): string
    {
        $tzParis = new DateTimeZone('Europe/Paris');
        $raw = trim($scheduledAt);
        if ($raw === '') {
            throw new InvalidArgumentException('Date/heure invalide');
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            $hour = 9;
            $minute = 0;
            $type = (string) ($availability['type'] ?? '');
            if ($type === 'all_day') {
                $hour = 0;
            } elseif ($type === 'custom' && is_array($availability['range'] ?? null) && count($availability['range']) === 2) {
                $hour = (int) floor((float) $availability['range'][0]);
            }
            $raw = sprintf('%s %02d:%02d:00', $raw, max(0, min(23, $hour)), $minute);
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $raw, $tzParis)
            ?: DateTimeImmutable::createFromFormat('Y-m-d H:i', substr($raw, 0, 16), $tzParis);
        if (!$dt) {
            throw new InvalidArgumentException('Date/heure invalide');
        }

        return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }

    /**
     * @return array<string, mixed>
     */
    private function loadStopForNurse(string $nurseId, string $stopId): array
    {
        $stmt = $this->db->prepare('
            SELECT s.*, p.nurse_id, p.tour_date
            FROM nurse_tour_stops s
            INNER JOIN nurse_tour_plans p ON p.id = s.tour_plan_id
            WHERE s.id = ? AND p.nurse_id = ?
            LIMIT 1
        ');
        $stmt->execute([$stopId, $nurseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Stop introuvable');
        }

        return $row;
    }
}
