<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

/**
 * Galerie photos de soins : RDV nursing créés par un professionnel de santé (pro).
 */
final class CarePhotoGallery
{
    public static function isEligibleContext(array $appointment): bool
    {
        $type = $appointment['type'] ?? '';
        $role = $appointment['created_by_role'] ?? '';

        return $type === 'nursing' && $role === 'pro';
    }

    public static function canView(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') === 'super_admin') {
            return true;
        }
        if (!self::isEligibleContext($appointment)) {
            return false;
        }

        $uid = $user['user_id'] ?? '';
        if ($appointment['assigned_nurse_id'] === $uid) {
            return true;
        }
        if (($appointment['created_by'] ?? '') === $uid && ($user['role'] ?? '') === 'pro') {
            return true;
        }
        if (($user['role'] ?? '') === 'pro') {
            $userModel = new User();

            return $userModel->hasProfessionalAccessToPatient(
                (string) $uid,
                (string) ($appointment['patient_id'] ?? '')
            );
        }

        return false;
    }

    public static function canUpload(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') !== 'nurse') {
            return false;
        }
        if (!self::isEligibleContext($appointment)) {
            return false;
        }
        if (($appointment['assigned_nurse_id'] ?? '') !== ($user['user_id'] ?? '')) {
            return false;
        }

        $st = $appointment['status'] ?? '';

        return in_array($st, ['confirmed', 'planned', 'inProgress', 'completed'], true);
    }

    public static function canComment(array $user, array $appointment): bool
    {
        if (!self::isEligibleContext($appointment)) {
            return false;
        }
        $userId = $user['user_id'] ?? '';

        if (($user['role'] ?? '') === 'nurse' && ($appointment['assigned_nurse_id'] ?? '') === $userId) {
            return true;
        }
        if (($user['role'] ?? '') === 'pro' && ($appointment['created_by'] ?? '') === $userId) {
            return true;
        }

        return false;
    }

    public static function newUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
