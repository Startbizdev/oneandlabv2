<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/AvailabilityTimeLabel.php';

/** Cron notifications patient préleveur en route / arrivé. */
final class NotificationPreleveurPatientCron
{
    public function __construct(
        private PDO $db,
        private ?Crypto $crypto,
        /** @var callable(string,string,string,string,?array): string */
        private $createNotification
    ) {
    }

    /** @return array{en_route: int, arrive: int} */
    public function run(): array
    {
        $tz = new DateTimeZone('Europe/Paris');
        $now = new DateTime('now', $tz);
        $todayYmd = $now->format('Y-m-d');
        $nowMinutes = ((int) $now->format('H')) * 60 + (int) $now->format('i');
        $sentEnRoute = 0;
        $sentArrive = 0;

        $stmt = $this->db->query("
            SELECT id, patient_id, scheduled_at, assigned_to, status, form_data_encrypted, form_data_dek,
                   notif_preleveur_en_route_sent_at, notif_preleveur_arrive_sent_at
            FROM appointments
            WHERE type = 'blood_test'
            AND assigned_to IS NOT NULL AND assigned_to != ''
            AND patient_id IS NOT NULL
            AND status NOT IN ('completed', 'canceled', 'cancelled', 'expired', 'refused')
            AND scheduled_at >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
            AND scheduled_at <= DATE_ADD(NOW(), INTERVAL 2 DAY)
        ");
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        if (!$rows) {
            return ['en_route' => 0, 'arrive' => 0];
        }

        $userModel = new User();
        $updEnRoute = $this->db->prepare('
            UPDATE appointments
            SET notif_preleveur_en_route_sent_at = NOW()
            WHERE id = ?
            AND notif_preleveur_en_route_sent_at IS NULL
            AND status NOT IN (\'completed\', \'canceled\', \'cancelled\', \'expired\', \'refused\')
        ');
        $updArrive = $this->db->prepare('
            UPDATE appointments
            SET notif_preleveur_arrive_sent_at = NOW()
            WHERE id = ?
            AND notif_preleveur_arrive_sent_at IS NULL
            AND status NOT IN (\'completed\', \'canceled\', \'cancelled\', \'expired\', \'refused\')
        ');

        foreach ($rows as $row) {
            $patientId = $row['patient_id'] ?? null;
            $assignedTo = $row['assigned_to'] ?? null;
            if (!$patientId || !$assignedTo) {
                continue;
            }

            try {
                $sched = new DateTime((string) $row['scheduled_at'], $tz);
            } catch (Exception $e) {
                continue;
            }

            if ($sched->format('Y-m-d') !== $todayYmd) {
                continue;
            }

            $slot = $this->appointmentSlotMinutes($row, $sched);
            if ($slot === null) {
                continue;
            }
            [$slotStartMinutes, $slotEndMinutes] = $slot;
            $slotLabel = $this->formatSlotLabel($slotStartMinutes, $slotEndMinutes);

            $preleveur = $userModel->getById((string) $assignedTo, 'system', 'system');
            $first = $preleveur ? trim((string) ($preleveur['first_name'] ?? '')) : '';
            $last = $preleveur ? trim((string) ($preleveur['last_name'] ?? '')) : '';
            $fullName = trim($first . ' ' . $last);
            if ($fullName === '') {
                $fullName = 'Votre préleveur';
            }

            $aptId = (string) $row['id'];
            $data = [
                'appointment_id' => $aptId,
                'assigned_to' => (string) $assignedTo,
                'slot_label' => $slotLabel,
            ];

            $enRouteStartsAt = max(0, $slotStartMinutes - 30);

            if (
                empty($row['notif_preleveur_en_route_sent_at'])
                && $nowMinutes >= $enRouteStartsAt
                && $nowMinutes < $slotStartMinutes
            ) {
                $updEnRoute->execute([$aptId]);
                if ($updEnRoute->rowCount() > 0) {
                    $title = 'Votre préleveur est en route';
                    $message = $fullName . ' est en route vers votre domicile. Arrivée prévue dans la fenêtre ' . $slotLabel . '.';
                    try {
                        ($this->createNotification)($patientId, 'preleveur_en_route', $title, $message, $data);
                        $sentEnRoute++;
                    } catch (Exception $e) {
                        error_log('preleveur_en_route notification: ' . $e->getMessage());
                    }
                }
            }

            if (empty($row['notif_preleveur_arrive_sent_at']) && $nowMinutes >= $slotStartMinutes) {
                $updArrive->execute([$aptId]);
                if ($updArrive->rowCount() > 0) {
                    $title = 'Votre préleveur est arrivé';
                    $message = $fullName !== 'Votre préleveur'
                        ? ($fullName . ' est arrivé sur le créneau ' . $slotLabel . '.')
                        : ('Votre préleveur est arrivé sur le créneau ' . $slotLabel . '.');
                    try {
                        ($this->createNotification)($patientId, 'preleveur_arrive', $title, $message, $data);
                        $sentArrive++;
                    } catch (Exception $e) {
                        error_log('preleveur_arrive notification: ' . $e->getMessage());
                    }
                }
            }
        }

        return ['en_route' => $sentEnRoute, 'arrive' => $sentArrive];
    }

    /** @return array{0:int,1:int}|null */
    private function appointmentSlotMinutes(array $row, DateTime $scheduledAt): ?array
    {
        $formData = $this->decryptAppointmentFormData($row);
        $availability = $formData['availability'] ?? null;
        if (is_string($availability) && trim($availability) !== '') {
            $decoded = json_decode($availability, true);
            if (is_array($decoded)) {
                $availability = $decoded;
            }
        }

        if (is_array($availability) && ($availability['type'] ?? '') === 'custom' && isset($availability['range']) && is_array($availability['range'])) {
            $start = isset($availability['range'][0]) ? (float) $availability['range'][0] : null;
            $end = isset($availability['range'][1]) ? (float) $availability['range'][1] : null;
            if ($start !== null && $end !== null && is_finite($start) && is_finite($end) && $end > $start) {
                return [(int) round($start * 60), (int) round($end * 60)];
            }
        }

        if (is_array($availability) && ($availability['type'] ?? '') === 'all_day') {
            return [9 * 60, 17 * 60];
        }

        $start = ((int) $scheduledAt->format('H')) * 60 + (int) $scheduledAt->format('i');

        return [$start, $start + 60];
    }

    /** @return array<string, mixed> */
    private function decryptAppointmentFormData(array $row): array
    {
        if (!$this->crypto || empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) {
            return [];
        }
        try {
            $json = $this->crypto->decryptField((string) $row['form_data_encrypted'], (string) $row['form_data_dek']);
            $data = json_decode($json, true);

            return is_array($data) ? $data : [];
        } catch (Throwable $e) {
            error_log('preleveur_patient_notification form_data decrypt: ' . $e->getMessage());

            return [];
        }
    }

    private function formatSlotLabel(int $startMinutes, int $endMinutes): string
    {
        return AvailabilityTimeLabel::minutes($startMinutes) . ' - ' . AvailabilityTimeLabel::minutes($endMinutes);
    }
}
