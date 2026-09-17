<?php

declare(strict_types=1);

final class AppointmentCancellationPolicy
{
    public static function canStaffCancel(array $user, array $appointment): bool
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        if ($role === 'super_admin') {
            return true;
        }
        if ($userId === '' || !in_array($role, ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
            return false;
        }

        $isCreator = (string) ($appointment['created_by'] ?? '') === $userId
            && in_array($role, ['pro', 'nurse', 'lab', 'subaccount'], true);
        $isAssigned = (string) ($appointment['assigned_nurse_id'] ?? '') === $userId
            || (string) ($appointment['assigned_lab_id'] ?? '') === $userId
            || (string) ($appointment['assigned_to'] ?? '') === $userId;

        return $isCreator || $isAssigned;
    }
}
