<?php

declare(strict_types=1);

require_once __DIR__ . '/LabTeamAccess.php';

/**
 * Réponses GET /appointments/:id quand l'utilisateur n'a pas accès au détail.
 * « Déjà pris par un confrère » uniquement si assigné à un autre pro (pas pending, pas annulé).
 */
final class AppointmentDetailGate
{
    /** @return 'canceled'|'refused'|'expired'|null */
    public static function unavailableReason(?string $status): ?string
    {
        $s = strtolower(trim((string) $status));
        if (in_array($s, ['canceled', 'cancelled'], true)) {
            return 'canceled';
        }
        if ($s === 'refused') {
            return 'refused';
        }
        if ($s === 'expired') {
            return 'expired';
        }

        return null;
    }

    public static function respondUnavailable(string $reason): void
    {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'appointmentUnavailable' => true,
            'reason' => $reason,
        ]);
        exit;
    }

    public static function respondAlreadyAccepted(): void
    {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'alreadyAccepted' => true,
        ]);
        exit;
    }

    /**
     * @param array<string, mixed> $appointment
     */
    public static function respondWhenForbidden(PDO $db, array $appointment, string $userId, string $role): void
    {
        $unavailable = self::unavailableReason($appointment['status'] ?? null);
        if ($unavailable !== null) {
            self::respondUnavailable($unavailable);
        }

        if ($role === 'nurse' && ($appointment['type'] ?? '') === 'nursing') {
            if (self::isTakenByColleagueNurse($appointment, $userId)) {
                self::respondAlreadyAccepted();
            }
        }

        if (in_array($role, ['lab', 'subaccount'], true) && ($appointment['type'] ?? '') === 'blood_test') {
            if (self::isTakenByColleagueLab($db, $appointment, $userId, $role)) {
                self::respondAlreadyAccepted();
            }
        }

        if ($role === 'preleveur' && ($appointment['type'] ?? '') === 'blood_test') {
            if (self::isTakenByColleaguePreleveur($appointment, $userId)) {
                self::respondAlreadyAccepted();
            }
        }
    }

    /** @param array<string, mixed> $appointment */
    private static function isTakenByColleagueNurse(array $appointment, string $userId): bool
    {
        if (($appointment['status'] ?? '') === 'pending') {
            return false;
        }
        $assigned = (string) ($appointment['assigned_nurse_id'] ?? '');

        return $assigned !== '' && $assigned !== (string) $userId;
    }

    /** @param array<string, mixed> $appointment */
    private static function isTakenByColleagueLab(PDO $db, array $appointment, string $userId, string $role): bool
    {
        if (($appointment['status'] ?? '') === 'pending') {
            return false;
        }
        $assignedLab = (string) ($appointment['assigned_lab_id'] ?? '');
        if ($assignedLab === '') {
            return false;
        }
        $teamIds = LabTeamAccess::teamMemberIds($db, $userId, $role);

        return !in_array($assignedLab, $teamIds, true);
    }

    /** @param array<string, mixed> $appointment */
    private static function isTakenByColleaguePreleveur(array $appointment, string $userId): bool
    {
        if (($appointment['status'] ?? '') === 'pending') {
            return false;
        }
        $assigned = (string) ($appointment['assigned_to'] ?? '');

        return $assigned !== '' && $assigned !== (string) $userId;
    }
}
