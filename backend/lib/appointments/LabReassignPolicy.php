<?php

declare(strict_types=1);

require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../LabTeamAccess.php';

/**
 * Réassignation d'une prise de sang par un laboratoire / sous-compte : uniquement un RDV déjà
 * attribué à son équipe. Un RDV sans laboratoire passe par les offres (acceptation), jamais par ici.
 */
final class LabReassignPolicy
{
    private const TEAM_ROLES = ['lab', 'subaccount'];

    /**
     * @param array<string, mixed> $user        session (user_id, role)
     * @param array<string, mixed> $appointment type, assigned_lab_id
     */
    public static function assertCanReassign(PDO $db, array $user, array $appointment, ?string $assignedTo): void
    {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, self::TEAM_ROLES, true)) {
            return;
        }
        if (($appointment['type'] ?? '') !== 'blood_test') {
            throw HttpStatusException::forbidden('Seuls les rendez-vous prise de sang peuvent être réassignés depuis cet espace.');
        }
        $teamIds = LabTeamAccess::teamMemberIds($db, (string) $user['user_id'], $role);
        if (!self::isTeamLab($appointment['assigned_lab_id'] ?? null, $teamIds)) {
            throw new HttpStatusException(
                'Ce rendez-vous n’est pas attribué à votre laboratoire : acceptez d’abord l’offre.',
                403,
                'NOT_ASSIGNED_TO_TEAM'
            );
        }
        if ($assignedTo !== null && !LabTeamAccess::isPreleveurOfTeam($db, (string) $user['user_id'], $role, $assignedTo)) {
            throw HttpStatusException::forbidden('Ce préleveur ne fait pas partie de votre laboratoire.');
        }
    }

    /**
     * RDV du même lot : réassignés avec le RDV principal seulement s'ils sont déjà dans l'équipe.
     *
     * @param array<string, mixed> $user
     */
    public static function canReassignSibling(PDO $db, array $user, mixed $siblingLabId): bool
    {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, self::TEAM_ROLES, true)) {
            return true;
        }

        return self::isTeamLab($siblingLabId, LabTeamAccess::teamMemberIds($db, (string) $user['user_id'], $role));
    }

    /** @param list<string> $teamIds */
    private static function isTeamLab(mixed $labId, array $teamIds): bool
    {
        $labId = trim((string) ($labId ?? ''));

        return $labId !== '' && in_array($labId, $teamIds, true);
    }
}
