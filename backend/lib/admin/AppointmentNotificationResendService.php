<?php

declare(strict_types=1);

require_once __DIR__ . '/../EmailQueue.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Renvoi bulk d'emails RDV (admin) — réutilise les templates EmailQueue existants.
 */
final class AppointmentNotificationResendService
{
    /** @var list<string> */
    public const ALLOWED_TYPES = [
        'appointment_created',
        'appointment_confirmation',
        'appointment_canceled_patient',
        'new_appointment_pro',
        'assigned_to_preleveur',
        'review_invitation',
        'results_ready',
    ];

    private PDO $db;
    private Appointment $appointments;
    private User $users;
    private Logger $logger;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->appointments = new Appointment();
        $this->users = new User();
        $this->logger = new Logger();
    }

    /**
     * @param list<string> $appointmentIds
     * @param list<string>|null $recipientProfileIds
     * @return array{sent: int, skipped: list<array<string, string>>, preview_count: int}
     */
    public function resendBulk(
        array $appointmentIds,
        string $notificationType,
        string $adminId,
        ?array $recipientProfileIds = null
    ): array {
        $type = trim($notificationType);
        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            throw new InvalidArgumentException('Type de notification invalide');
        }

        $appointmentIds = array_values(array_unique(array_filter(array_map('strval', $appointmentIds))));
        if ($appointmentIds === []) {
            throw new InvalidArgumentException('Sélectionnez au moins un rendez-vous');
        }

        $sent = 0;
        $skipped = [];

        foreach ($appointmentIds as $appointmentId) {
            $apt = $this->appointments->getById($appointmentId, $adminId, 'super_admin');
            if (!$apt) {
                $skipped[] = ['appointment_id' => $appointmentId, 'reason' => 'not_found'];
                continue;
            }

            $targets = $this->resolveTargets($type, $apt, $recipientProfileIds);
            if ($targets === []) {
                $skipped[] = ['appointment_id' => $appointmentId, 'reason' => 'no_targets'];
                continue;
            }

            foreach ($targets as $target) {
                $profileId = $target['profile_id'] ?? null;
                $email = $target['email'] ?? null;
                if ($this->wasRecentlySent($appointmentId, $type, $profileId, $email)) {
                    $skipped[] = [
                        'appointment_id' => $appointmentId,
                        'profile_id' => $profileId ?? '',
                        'reason' => 'rate_limited',
                    ];
                    continue;
                }

                $payload = $this->buildPayload($type, $apt, $target);
                EmailQueue::add($type, $email, $payload, $profileId);
                $sent++;

                $this->logger->log($adminId, 'super_admin', 'resend_notification', 'appointment', $appointmentId, [
                    'action' => 'resend_notification',
                    'notification_type' => $type,
                    'to_profile_id' => $profileId,
                    'to_email' => $email,
                ]);
            }
        }

        EmailQueue::flush();

        return [
            'sent' => $sent,
            'skipped' => $skipped,
            'preview_count' => $sent,
        ];
    }

    /**
     * @param array<string, mixed> $apt
     * @param list<string>|null $recipientProfileIds
     * @return list<array{profile_id: ?string, email: ?string, role?: string}>
     */
    private function resolveTargets(string $type, array $apt, ?array $recipientProfileIds): array
    {
        $filterIds = $recipientProfileIds !== null
            ? array_flip(array_map('strval', $recipientProfileIds))
            : null;

        if (in_array($type, ['appointment_created', 'appointment_confirmation', 'appointment_canceled_patient', 'review_invitation', 'results_ready'], true)) {
            $email = isset($apt['patient_email']) ? trim((string) $apt['patient_email']) : '';
            if ($email === '' && !empty($apt['form_data']['email'])) {
                $email = trim((string) $apt['form_data']['email']);
            }
            $pid = isset($apt['patient_id']) ? (string) $apt['patient_id'] : null;
            if ($email === '' && $pid) {
                $p = $this->users->getById($pid, 'system', 'super_admin');
                $email = isset($p['email']) ? trim((string) $p['email']) : '';
            }
            if ($email === '') {
                return [];
            }
            if ($filterIds !== null && $pid && !isset($filterIds[$pid])) {
                return [];
            }
            return [['profile_id' => $pid, 'email' => $email]];
        }

        if ($type === 'assigned_to_preleveur') {
            $preleveurId = isset($apt['assigned_to']) ? trim((string) $apt['assigned_to']) : '';
            if ($preleveurId === '') {
                return [];
            }
            if ($filterIds !== null && !isset($filterIds[$preleveurId])) {
                return [];
            }
            return [['profile_id' => $preleveurId, 'email' => null, 'role' => 'preleveur']];
        }

        // new_appointment_pro
        $targets = [];
        $seen = [];

        $candidates = [];
        foreach (['assigned_nurse_id', 'assigned_lab_id', 'assigned_to'] as $col) {
            if (!empty($apt[$col])) {
                $candidates[] = (string) $apt[$col];
            }
        }

        $stmt = $this->db->prepare(
            'SELECT DISTINCT profile_id FROM appointment_offers WHERE appointment_id = ? AND status != ?'
        );
        $stmt->execute([(string) $apt['id'], 'expired']);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['profile_id'])) {
                $candidates[] = (string) $row['profile_id'];
            }
        }

        foreach ($candidates as $cid) {
            if ($cid === '' || isset($seen[$cid])) {
                continue;
            }
            if ($filterIds !== null && !isset($filterIds[$cid])) {
                continue;
            }
            $seen[$cid] = true;
            $prof = $this->users->getById($cid, 'system', 'super_admin');
            if (!$prof || !in_array($prof['role'] ?? '', ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
                continue;
            }
            $targets[] = [
                'profile_id' => $cid,
                'email' => null,
                'role' => (string) ($prof['role'] ?? ''),
            ];
        }

        return $targets;
    }

    /**
     * @param array<string, mixed> $apt
     * @param array{profile_id?: ?string, email?: ?string, role?: string} $target
     * @return array<string, mixed>
     */
    private function buildPayload(string $type, array $apt, array $target): array
    {
        $base = [
            'appointment_id' => (string) ($apt['id'] ?? ''),
            'type' => $apt['type'] ?? 'blood_test',
            'scheduled_at' => $apt['scheduled_at'] ?? null,
            'form_data' => $apt['form_data'] ?? null,
        ];

        if ($type === 'new_appointment_pro') {
            $role = $target['role'] ?? '';
            if ($role === 'nurse') {
                $emailRole = 'nurse';
            } elseif ($role === 'pro') {
                $emailRole = 'pro';
            } else {
                $emailRole = ($apt['type'] ?? '') === 'nursing' ? 'nurse' : 'lab';
            }
            return [
                'appointment_id' => (string) ($apt['id'] ?? ''),
                'scheduled_at' => $apt['scheduled_at'] ?? date('Y-m-d H:i:s'),
                'role' => $emailRole,
                'form_data' => $apt['form_data'] ?? null,
            ];
        }

        if ($type === 'assigned_to_preleveur') {
            return [
                'appointment_id' => (string) ($apt['id'] ?? ''),
                'scheduled_at' => $apt['scheduled_at'] ?? null,
            ];
        }

        if ($type === 'review_invitation') {
            return array_merge($base, [
                'patient_id' => $apt['patient_id'] ?? null,
            ]);
        }

        if ($type === 'results_ready') {
            return ['appointment_id' => (string) ($apt['id'] ?? '')];
        }

        return $base;
    }

    private function wasRecentlySent(
        string $appointmentId,
        string $type,
        ?string $profileId,
        ?string $email
    ): bool {
        $since = (new DateTimeImmutable('-5 minutes'))->format('Y-m-d H:i:s');
        $stmt = $this->db->prepare(
            "SELECT id FROM access_logs
             WHERE action = 'resend_notification'
             AND resource_type = 'appointment'
             AND resource_id = ?
             AND created_at >= ?
             AND details LIKE ?
             LIMIT 1"
        );
        // json_encode() insère un espace après « : » — matcher les deux formats.
        $needle = '%"notification_type": "' . addslashes($type) . '"%';
        $stmt->execute([$appointmentId, $since, $needle]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            return true;
        }

        return false;
    }
}
