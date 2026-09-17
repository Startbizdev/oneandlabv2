<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/LabTeamAccess.php';

/**
 * Fil de conversation patient ↔ staff par rendez-vous.
 */
final class AppointmentConversation
{
    private static function db(): PDO
    {
        static $pdo = null;
        if ($pdo instanceof PDO) {
            return $pdo;
        }
        $config = require __DIR__ . '/../config/database.php';
        $pdo = new PDO(
            sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
            $config['username'],
            $config['password'],
            $config['options'] ?? []
        );

        return $pdo;
    }

    public static function newUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function canAccess(array $user, array $appointment): bool
    {
        $role = (string) ($user['role'] ?? '');
        $uid = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }

        if ($role === 'patient' && (string) ($appointment['patient_id'] ?? '') === $uid) {
            return true;
        }

        if ($role === 'pro') {
            if ((string) ($appointment['created_by'] ?? '') === $uid) {
                return true;
            }
            $userModel = new User();

            return $userModel->hasProfessionalAccessToPatient($uid, (string) ($appointment['patient_id'] ?? ''));
        }

        if ($role === 'nurse') {
            if ((string) ($appointment['assigned_nurse_id'] ?? '') === $uid) {
                return true;
            }
            // Un infirmier qui crée un RDV reste l'interlocuteur du patient,
            // y compris lorsqu'une prise de sang est ensuite attribuée à un labo.
            if ((string) ($appointment['created_by'] ?? '') === $uid) {
                return true;
            }
        }

        if (in_array($role, ['lab', 'subaccount', 'preleveur'], true)) {
            $assignedLabId = (string) ($appointment['assigned_lab_id'] ?? '');
            if ($assignedLabId === '') {
                return false;
            }
            if ($role === 'preleveur' && (string) ($appointment['assigned_to'] ?? '') === $uid) {
                return true;
            }
            $teamIds = LabTeamAccess::teamMemberIds(self::db(), $uid, $role);
            if (in_array($assignedLabId, $teamIds, true)) {
                return true;
            }
        }

        return false;
    }

    public static function canPost(array $user, array $appointment): bool
    {
        if (!self::canAccess($user, $appointment)) {
            return false;
        }
        $status = (string) ($appointment['status'] ?? '');

        return !in_array($status, ['canceled', 'cancelled', 'refused', 'expired'], true);
    }
}
