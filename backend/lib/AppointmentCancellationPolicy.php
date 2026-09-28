<?php

declare(strict_types=1);

/**
 * Droit d'annuler un RDV. Miroir de packages/shared-utils/src/appointment-cancellation.ts.
 * Infirmier, pro et patient : uniquement les RDV qu'ils ont créés (un RDV envoyé par la plateforme
 * ou un pro se redispatche ou se partage, il ne s'annule pas).
 */
final class AppointmentCancellationPolicy
{
    public static function canCancel(array $user, array $appointment): bool
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        if ($role === 'super_admin') {
            return true;
        }
        if ($userId === '') {
            return false;
        }

        $isCreator = (string) ($appointment['created_by'] ?? '') === $userId;
        $isAssigned = (string) ($appointment['assigned_nurse_id'] ?? '') === $userId
            || (string) ($appointment['assigned_lab_id'] ?? '') === $userId
            || (string) ($appointment['assigned_to'] ?? '') === $userId;

        return match ($role) {
            'nurse', 'pro', 'patient' => $isCreator,
            'lab', 'subaccount' => $isCreator || $isAssigned,
            'preleveur' => $isAssigned,
            default => false,
        };
    }
}
