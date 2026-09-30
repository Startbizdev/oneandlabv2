<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';

final class ProfileLabAssignmentDenied extends RuntimeException
{
    public function __construct(string $message, public readonly int $httpStatus, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}

/**
 * Rattachement labo (profiles.lab_id) d'un préleveur ou d'un sous-compte : il détermine l'équipe
 * et donc l'accès aux patients et RDV du labo. Seuls l'admin et le labo propriétaire le modifient.
 */
final class ProfileLabAssignmentPolicy
{
    public static function assertCanAssign(User $users, string $requesterId, string $requesterRole, string $targetId, ?string $newLabId): void
    {
        if (!in_array($requesterRole, ['super_admin', 'lab'], true)) {
            throw new ProfileLabAssignmentDenied('Vous ne pouvez pas modifier le laboratoire de rattachement.', 403, 'FORBIDDEN');
        }
        $targetRole = $users->getRoleById($targetId);
        if (!in_array($targetRole, ['subaccount', 'preleveur'], true)) {
            throw new ProfileLabAssignmentDenied('Seuls les préleveurs et sous-comptes ont un laboratoire de rattachement.', 400, 'INVALID_LAB_ID');
        }
        if ($newLabId === null) {
            return;
        }

        $newLabRole = $users->getRoleById($newLabId);
        $isOwnLab = $newLabRole === 'lab' && ($requesterRole === 'super_admin' || $newLabId === $requesterId);
        $isOwnSubaccount = $targetRole === 'preleveur'
            && $newLabRole === 'subaccount'
            && ($requesterRole === 'super_admin' || $users->getLabId($newLabId) === $requesterId);
        if (!$isOwnLab && !$isOwnSubaccount) {
            throw new ProfileLabAssignmentDenied(
                $requesterRole === 'lab'
                    ? 'Le laboratoire assigné doit être le vôtre ou un de vos sous-comptes.'
                    : 'Le laboratoire assigné est introuvable ou invalide pour ce profil.',
                400,
                'INVALID_LAB_ID'
            );
        }
    }
}
