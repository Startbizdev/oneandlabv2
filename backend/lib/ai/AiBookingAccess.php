<?php

declare(strict_types=1);

require_once __DIR__ . '/../HttpStatusException.php';

/**
 * Rôles autorisés à préparer et confirmer un rendez-vous via Cary (brouillons IA).
 * Le préleveur en est exclu : sa création de RDV passe par PreleveurLabRequestPolicy
 * (prise de sang uniquement, consentement patient, labo rattaché), absente du parcours IA.
 */
final class AiBookingAccess
{
    public const ROLES = ['patient', 'pro', 'nurse'];

    public const DENIED_MESSAGE = 'La prise de rendez-vous avec Cary n’est pas disponible pour votre profil.';

    /** @param array<string, mixed> $user */
    public static function allows(array $user): bool
    {
        return in_array((string) ($user['role'] ?? ''), self::ROLES, true);
    }

    /** @param array<string, mixed> $user */
    public static function assertAllowed(array $user): void
    {
        if (!self::allows($user)) {
            throw HttpStatusException::forbidden(self::DENIED_MESSAGE);
        }
    }
}
