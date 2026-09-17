<?php

declare(strict_types=1);

/**
 * ACL génération d'ordonnance (standalone + liée à un RDV).
 * Les accès persistants (PPA, liste staff) sont évalués en amont.
 */
final class PrescriptionGenerationPolicy
{
    public static function nurseCanGenerateStandalone(
        bool $hasPpa,
        bool $isProfileCreator,
        bool $visibleInStaffList,
        bool $hasNurseAppointment,
    ): bool {
        return $hasPpa || $isProfileCreator || $visibleInStaffList || $hasNurseAppointment;
    }

    public static function nurseCanGenerateForAppointment(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') !== 'nurse') {
            return false;
        }
        $userId = (string) ($user['user_id'] ?? '');
        if ($userId === '') {
            return false;
        }

        return (string) ($appointment['created_by'] ?? '') === $userId
            || (string) ($appointment['assigned_nurse_id'] ?? '') === $userId;
    }
}
