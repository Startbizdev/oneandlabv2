<?php

declare(strict_types=1);

require_once __DIR__ . '/EmailQueue.php';

/**
 * Notifications groupées admins / assignés (extrait de NotificationService).
 */
final class NotificationRecipientNotifier
{
    public function __construct(
        private PDO $db,
        /** @var callable(string,string,string,string,?array): string */
        private $createNotification
    ) {
    }

    public function notifyAllAdmins(string $type, string $title, string $message, ?array $data = null): void
    {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE role = ? AND id IS NOT NULL');
            $stmt->execute(['super_admin']);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($admins as $admin) {
                try {
                    ($this->createNotification)($admin['id'], $type, $title, $message, $data);
                } catch (Exception $e) {
                    error_log("Erreur notification admin {$admin['id']}: " . $e->getMessage());
                }
            }

            $appointmentId = (string) ($data['appointment_id'] ?? '');
            if ($appointmentId === '') {
                return;
            }

            try {
                require_once __DIR__ . '/AdminEmailNotifier.php';
                if ($type === 'appointment_canceled_by_pro') {
                    AdminEmailNotifier::appointmentCanceledByPro(
                        $appointmentId,
                        $message,
                        isset($data['scheduled_at']) ? (string) $data['scheduled_at'] : null,
                        is_array($data['form_data'] ?? null) ? $data['form_data'] : null
                    );
                } elseif ($type === 'appointment_completed_by_pro') {
                    AdminEmailNotifier::appointmentCompletedByPro($appointmentId, $message);
                } elseif ($type === 'appointment_canceled_by_patient') {
                    AdminEmailNotifier::appointmentCanceledByPatient(
                        $appointmentId,
                        $message,
                        isset($data['scheduled_at']) ? (string) $data['scheduled_at'] : null,
                        is_array($data['form_data'] ?? null) ? $data['form_data'] : null
                    );
                }
            } catch (Throwable $e) {
                error_log('notifyAllAdmins admin email: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            error_log('Erreur récupération admins pour notification: ' . $e->getMessage());
        }
    }

    public function notifyAssignees(
        ?string $assignedLabId,
        ?string $assignedTo,
        ?string $assignedNurseId,
        string $type,
        string $title,
        string $message,
        ?array $data = null
    ): void {
        $seen = [];
        foreach ([$assignedLabId, $assignedTo, $assignedNurseId] as $userId) {
            if (empty($userId) || isset($seen[$userId])) {
                continue;
            }
            $seen[$userId] = true;
            try {
                ($this->createNotification)($userId, $type, $title, $message, $data);
            } catch (Exception $e) {
                error_log("Erreur notification assigné {$userId}: " . $e->getMessage());
            }
        }
    }
}
