<?php

declare(strict_types=1);

require_once __DIR__ . '/HttpStatusException.php';
require_once __DIR__ . '/CoverageZoneGeo.php';
require_once __DIR__ . '/SubscriptionService.php';

/**
 * Écriture d'une zone de couverture : propriétaire et rôle de zone déterminés côté serveur,
 * rayon plafonné par l'abonnement du propriétaire.
 */
final class CoverageZoneWritePolicy
{
    private const ZONE_ROLES = ['nurse', 'lab', 'subaccount'];

    /**
     * @param array<string, mixed> $user  session (user_id, role)
     * @param array<string, mixed> $input corps de la requête (le champ role est ignoré)
     * @return array{owner_id: string, role: string}
     */
    public static function resolveOwnerAndRole(PDO $db, array $user, array $input): array
    {
        $sessionRole = (string) ($user['role'] ?? '');
        $sessionId = (string) ($user['user_id'] ?? '');
        if ($sessionId === '' || !in_array($sessionRole, [...self::ZONE_ROLES, 'super_admin'], true)) {
            throw HttpStatusException::forbidden('Zone de couverture non autorisée pour ce rôle.');
        }

        $ownerId = self::authorizedOwnerId($db, $sessionId, $sessionRole, $input['owner_id'] ?? null);

        $ownerRole = self::profileRole($db, $ownerId);
        if (!in_array($ownerRole, self::ZONE_ROLES, true)) {
            throw HttpStatusException::forbidden('Ce compte ne peut pas avoir de zone de couverture.');
        }

        return ['owner_id' => $ownerId, 'role' => $ownerRole];
    }

    /**
     * Lecture d'une zone (GET ?owner_id=) : mêmes droits que l'écriture — sa propre zone,
     * un laboratoire pour les comptes rattachés, l'admin pour tous.
     *
     * @param array<string, mixed> $user session (user_id, role)
     */
    public static function resolveReadableOwnerId(PDO $db, array $user, mixed $requestedOwnerId): string
    {
        $sessionId = (string) ($user['user_id'] ?? '');
        if ($sessionId === '') {
            throw HttpStatusException::forbidden('Zone de couverture non autorisée.');
        }

        return self::authorizedOwnerId($db, $sessionId, (string) ($user['role'] ?? ''), $requestedOwnerId);
    }

    private static function authorizedOwnerId(PDO $db, string $sessionId, string $sessionRole, mixed $requestedOwnerId): string
    {
        $ownerId = is_string($requestedOwnerId) ? trim($requestedOwnerId) : '';
        if ($ownerId === '' || $ownerId === $sessionId) {
            return $sessionId;
        }
        if ($sessionRole === 'super_admin') {
            return $ownerId;
        }
        if ($sessionRole === 'lab') {
            if (self::profileLabId($db, $ownerId) !== $sessionId) {
                throw HttpStatusException::forbidden('Ce compte ne fait pas partie de votre laboratoire.');
            }

            return $ownerId;
        }

        throw HttpStatusException::forbidden('Vous ne pouvez accéder qu\'à votre propre zone.');
    }

    /** Demi-côté maximal (km) : offre infirmier active, sinon plafond laboratoire. */
    public static function maxHalfSideKm(PDO $db, string $role, string $ownerId): float
    {
        if ($role !== 'nurse') {
            return CoverageZoneGeo::MAX_HALF_SIDE_KM_LAB;
        }
        $planSlug = (new SubscriptionService($db))->getActiveNursePlan($ownerId);
        $limits = require __DIR__ . '/../config/plan-limits.php';
        $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];

        return (float) ($nurseLimits['max_radius_km'] ?? 20);
    }

    private static function profileRole(PDO $db, string $profileId): string
    {
        $stmt = $db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$profileId]);

        return (string) ($stmt->fetchColumn() ?: '');
    }

    private static function profileLabId(PDO $db, string $profileId): string
    {
        $stmt = $db->prepare('SELECT lab_id FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$profileId]);

        return (string) ($stmt->fetchColumn() ?: '');
    }
}
