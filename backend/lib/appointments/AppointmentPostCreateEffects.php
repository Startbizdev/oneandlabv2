<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../StaffPatientConsent.php';
require_once __DIR__ . '/../QrCodeService.php';
require_once __DIR__ . '/../NurseInviteService.php';
require_once __DIR__ . '/../AppointmentProfileUpdates.php';
require_once __DIR__ . '/../admin/AdminDispatchEventLogger.php';

final class AppointmentPostCreateEffects
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     * @return array{createUserId: string, createUserRole: string, notifyCreatorRole: string}
     */
    public function resolveCreateActor(array $user, array $input): array
    {
        $createUserId = (string) $user['user_id'];
        $createUserRole = (string) ($user['role'] ?? '');
        $notifyCreatorRole = $createUserRole;

        if (($user['role'] ?? '') === 'super_admin' && !empty($input['on_behalf_of_user_id'])) {
            $onBehalfUserModel = new User();
            $obProfile = $onBehalfUserModel->resolveAdminOnBehalfStaffProfile((string) $input['on_behalf_of_user_id']);
            $createUserId = $obProfile['id'];
            $createUserRole = $obProfile['role'];
            $notifyCreatorRole = $createUserRole;
        }

        return [
            'createUserId' => $createUserId,
            'createUserRole' => $createUserRole,
            'notifyCreatorRole' => $notifyCreatorRole,
        ];
    }

    /**
     * @param array<string, mixed> $inputForCreate
     */
    public function resolveAttributionQrFromUtm(array &$inputForCreate): void
    {
        if (!empty($inputForCreate['utm_qr']) && empty($inputForCreate['attribution_qr_id'])) {
            $qrResolve = new QrCodeService();
            $resolvedQrId = $qrResolve->resolveAttributionQrId((string) $inputForCreate['utm_qr']);
            if ($resolvedQrId !== null) {
                $inputForCreate['attribution_qr_id'] = $resolvedQrId;
            }
        }
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     * @param array<string, mixed> $inputForCreate
     * @param array<string, mixed>|null $externalNurseInvite
     */
    public function runAfterCreate(
        string $appointmentId,
        array $user,
        array $input,
        array &$inputForCreate,
        string $createUserId,
        string $createUserRole,
        ?array $externalNurseInvite,
    ): void {
        $dispatchLogger = new AdminDispatchEventLogger($this->db);
        $dispatchMode = $this->resolveDispatchMode($user, $inputForCreate, $createUserRole, $externalNurseInvite);
        $dispatchLogger->setDispatchMode($appointmentId, $dispatchMode);
        $dispatchLogger->log(
            $appointmentId,
            'created',
            $user['user_id'],
            $user['role'],
            null,
            [
                'dispatch_mode' => $dispatchMode,
                'type' => $inputForCreate['type'] ?? null,
                'assigned_pro_id' => $inputForCreate['assigned_pro_id'] ?? null,
                'created_as_user_id' => $createUserId,
                'created_as_role' => $createUserRole,
            ]
        );

        if ($externalNurseInvite !== null && ($inputForCreate['type'] ?? '') === 'nursing') {
            $inviteResult = NurseInviteService::inviteExternalForAppointment(
                $this->db,
                $appointmentId,
                $externalNurseInvite,
                $user['user_id']
            );
            $inputForCreate['skip_zone_dispatch'] = true;
            $inputForCreate['external_nurse_invite_sent'] = true;
            if (!empty($inviteResult['resolved_nurse_id'])) {
                $inputForCreate['assigned_nurse_id'] = (string) $inviteResult['resolved_nurse_id'];
            }
            $dispatchLogger->setDispatchMode($appointmentId, 'external_invite');
        }

        if (StaffPatientConsent::requiresConsent((string) ($user['role'] ?? ''))) {
            $consentPatientId = isset($input['patient_id']) ? (string) $input['patient_id'] : null;
            StaffPatientConsent::logRecorded($user, $consentPatientId, 'appointment_create');
        }

        if (!empty($inputForCreate['attribution_qr_id'])) {
            $qrService = new QrCodeService();
            try {
                $qrService->recordConversion((string) $inputForCreate['attribution_qr_id'], $appointmentId);
            } catch (Throwable $e) {
                error_log('qr_conversion: ' . $e->getMessage());
            }
        }

        if (!empty($input['patient_id'])) {
            $userModel = new User();
            $qrBooking = !empty($inputForCreate['attribution_qr_id']) || !empty($inputForCreate['utm_qr']);
            $assignedProfId = $inputForCreate['assigned_pro_id']
                ?? $inputForCreate['assigned_nurse_id']
                ?? $inputForCreate['assigned_lab_id']
                ?? null;
            if ($qrBooking && $assignedProfId) {
                try {
                    $userModel->linkPatientProfessional(
                        (string) $input['patient_id'],
                        (string) $assignedProfId,
                        $appointmentId,
                        'qr_booking'
                    );
                } catch (Throwable $e) {
                    error_log('PatientProfessionalAccess (qr_booking): ' . $e->getMessage());
                }
            }
            try {
                $userModel->linkPatientAccessAfterAppointmentCreate(
                    (string) $input['patient_id'],
                    $appointmentId,
                    $user,
                    $createUserId,
                    $createUserRole,
                    $inputForCreate
                );
            } catch (Throwable $e) {
                error_log('PatientProfessionalAccess (appointment_linked): ' . $e->getMessage());
            }

            $profileUpdates = AppointmentProfileUpdates::forAccountHolder($inputForCreate);
            if (!empty($profileUpdates)) {
                try {
                    $userModel->update($input['patient_id'], $profileUpdates, $user['user_id'], $user['role']);
                } catch (Exception $e) {
                    error_log('Erreur lors de la synchronisation du profil: ' . $e->getMessage());
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $inputForCreate
     * @param array<string, mixed>|null $externalNurseInvite
     */
    private function resolveDispatchMode(
        array $user,
        array $inputForCreate,
        string $createUserRole,
        ?array $externalNurseInvite,
    ): string {
        $dispatchMode = 'zone';
        if ($externalNurseInvite !== null && ($inputForCreate['type'] ?? '') === 'nursing') {
            return 'external_invite';
        }
        if (!empty($inputForCreate['assigned_nurse_id']) || !empty($inputForCreate['assigned_lab_id'])) {
            $dispatchMode = 'direct_assign';
        } elseif (($user['role'] ?? '') === 'nurse' && ($inputForCreate['type'] ?? '') === 'nursing') {
            $dispatchMode = 'direct_assign';
        } elseif (in_array($user['role'] ?? '', ['lab', 'subaccount'], true) && ($inputForCreate['type'] ?? '') === 'blood_test') {
            $dispatchMode = 'direct_assign';
        } elseif (!empty($inputForCreate['skip_zone_dispatch'])) {
            $dispatchMode = 'direct_assign';
        } elseif (
            ($inputForCreate['type'] ?? '') === 'blood_test'
            && ($inputForCreate['lab_preference_mode'] ?? '') === 'brand_choice'
        ) {
            $dispatchMode = 'patient_brand_choice';
        } elseif (($user['role'] ?? '') === 'super_admin' && $createUserRole === 'super_admin') {
            $dispatchMode = 'manual';
        }

        return $dispatchMode;
    }
}
