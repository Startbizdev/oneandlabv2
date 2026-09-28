<?php

declare(strict_types=1);

require_once __DIR__ . '/../LabTeamAccess.php';
require_once __DIR__ . '/../../models/User.php';

/** ACL liste / upload documents médicaux liés à un RDV. */
final class MedicalDocumentAppointmentAccess
{
    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $appointment
     */
    public static function userCanAccessAppointment(array $user, array $appointment, PDO $db): bool
    {
        $hasAccess = (
            ($appointment['patient_id'] ?? null) === $user['user_id']
            || ($appointment['assigned_nurse_id'] ?? null) === $user['user_id']
            || ($appointment['assigned_lab_id'] ?? null) === $user['user_id']
            || (!empty($appointment['assigned_to']) && $appointment['assigned_to'] === $user['user_id'])
            || ($appointment['created_by'] ?? null) === $user['user_id']
            || ($user['role'] ?? '') === 'super_admin'
        );

        if (!$hasAccess && in_array($user['role'] ?? '', ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (
                in_array($appointment['assigned_lab_id'] ?? '', $teamIds, true)
                || (!empty($appointment['assigned_to']) && in_array($appointment['assigned_to'], $teamIds, true))
            ) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'pro') {
            $userModel = new User();
            if ($userModel->hasProfessionalAccessToPatient($user['user_id'], (string) ($appointment['patient_id'] ?? ''))) {
                $hasAccess = true;
            }
        }

        return $hasAccess;
    }

    /**
     * POST upload : created_by peut être vide — même règle que l’API historique.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $appointment
     */
    public static function userCanUploadOnAppointment(array $user, array $appointment, PDO $db): bool
    {
        $hasAccess = (
            ($appointment['patient_id'] ?? null) === $user['user_id']
            || ($appointment['assigned_nurse_id'] ?? null) === $user['user_id']
            || ($appointment['assigned_lab_id'] ?? null) === $user['user_id']
            || (!empty($appointment['assigned_to']) && $appointment['assigned_to'] === $user['user_id'])
            || (!empty($appointment['created_by']) && $appointment['created_by'] === $user['user_id'])
            || ($user['role'] ?? '') === 'super_admin'
        );

        if (!$hasAccess && in_array($user['role'] ?? '', ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (
                in_array($appointment['assigned_lab_id'] ?? '', $teamIds, true)
                || (!empty($appointment['assigned_to']) && in_array($appointment['assigned_to'], $teamIds, true))
            ) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'pro') {
            $userModel = new User();
            if ($userModel->hasProfessionalAccessToPatient($user['user_id'], (string) ($appointment['patient_id'] ?? ''))) {
                $hasAccess = true;
            }
        }

        return $hasAccess;
    }
}
