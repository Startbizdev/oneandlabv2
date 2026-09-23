<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/PharmacyModuleConfig.php';

/**
 * ACL commandes pharmacie.
 */
final class PharmacyOrderAccess
{
    public static function canAccess(array $user, array $order, ?PharmacyModuleConfig $configService = null): bool
    {
        $role = (string) ($user['role'] ?? '');
        $uid = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }

        if ((string) ($order['requester_id'] ?? '') === $uid) {
            return true;
        }

        if ((string) ($order['pharmacy_id'] ?? '') === $uid) {
            return true;
        }
        if ($role === 'patient' && (string) ($order['patient_id'] ?? '') === $uid) {
            return true;
        }

        if ($role === 'pro' || $role === 'nurse') {
            $userModel = new User();
            if ($userModel->hasProfessionalAccessToPatient($uid, (string) ($order['patient_id'] ?? ''))) {
                return (string) ($order['requester_id'] ?? '') === $uid;
            }
        }

        return false;
    }

    public static function canView(array $user, array $order): bool
    {
        $role = (string) ($user['role'] ?? '');
        $uid = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }
        if ((string) ($order['requester_id'] ?? '') === $uid) {
            return true;
        }
        if ((string) ($order['pharmacy_id'] ?? '') === $uid) {
            return true;
        }
        if ($role === 'patient' && (string) ($order['patient_id'] ?? '') === $uid) {
            return true;
        }

        return false;
    }

    public static function canPostMessage(array $user, array $order): bool
    {
        if (!self::canView($user, $order)) {
            return false;
        }
        $status = (string) ($order['status'] ?? '');

        return !in_array($status, ['annulee', 'refusee', 'terminee'], true);
    }

    public static function canTransitionPharmacy(array $user, array $order): bool
    {
        if ((string) ($user['role'] ?? '') === 'super_admin') {
            return true;
        }

        return (string) ($order['pharmacy_id'] ?? '') === (string) ($user['user_id'] ?? '');
    }

    public static function canTransitionRequester(array $user, array $order): bool
    {
        if ((string) ($user['role'] ?? '') === 'super_admin') {
            return true;
        }

        return (string) ($order['requester_id'] ?? '') === (string) ($user['user_id'] ?? '');
    }
}
