<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../AppointmentListPayload.php';
require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

/** Enrichissement réponse GET /appointments/:id (lot batch + médias profil). */
final class AppointmentDetailGetPayload
{
    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>|null
     */
    public static function loadWithOptionalBatch(
        PDO $db,
        Appointment $appointmentModel,
        array $user,
        string $id,
        string $include
    ): ?array {
        $appointment = $appointmentModel->getById($id, $user['user_id'], $user['role']);
        if (!$appointment) {
            return null;
        }

        if (str_contains($include, 'batch')) {
            $siblings = $appointment['batch_siblings'] ?? [];
            $batchAppointments = [];
            if (is_array($siblings) && count($siblings) > 0) {
                foreach ($siblings as $sib) {
                    $sibId = is_array($sib) ? ($sib['id'] ?? null) : null;
                    if (!$sibId || (string) $sibId === (string) $id) {
                        continue;
                    }
                    $sibFull = $appointmentModel->getById((string) $sibId, $user['user_id'], $user['role']);
                    if ($sibFull) {
                        $batchAppointments[] = $sibFull;
                    }
                }
            }
            $appointment['batch_appointments'] = $batchAppointments;
        }

        $appointment = AppointmentListPayload::enrichProfileMediaForDetail($appointment);
        $batchAppointments = [];
        if (!empty($appointment['batch_appointments']) && is_array($appointment['batch_appointments'])) {
            foreach ($appointment['batch_appointments'] as $batchApt) {
                if (is_array($batchApt)) {
                    $batchAppointments[] = AppointmentListPayload::enrichProfileMediaForDetail($batchApt);
                }
            }
        }

        $viewerId = (string) $user['user_id'];
        $withCollaboration = NurseCollaboration::withCoNurses($db, [$appointment, ...$batchAppointments], $viewerId);
        $appointment = array_shift($withCollaboration);
        if ($batchAppointments !== []) {
            $appointment['batch_appointments'] = $withCollaboration;
        }

        return $appointment;
    }
}
