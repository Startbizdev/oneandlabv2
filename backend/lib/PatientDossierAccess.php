<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/MedicalDocumentAccess.php';
require_once __DIR__ . '/RelativeProfile.php';

/**
 * Accès au dossier patient (documents, historique) — délègue à MedicalDocumentAccess.
 * Un patient accède à son dossier et à celui de ses proches (RelativeProfile).
 */
final class PatientDossierAccess
{
    public static function canAccess(PDO $db, User $userModel, array $user, string $patientId): bool
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }

        if ($role === 'patient') {
            return $userId === $patientId || RelativeProfile::isOwner($db, $userId, $patientId);
        }

        $checkStmt = $db->prepare('SELECT id, role FROM profiles WHERE id = ? LIMIT 1');
        $checkStmt->execute([$patientId]);
        $profile = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$profile || ($profile['role'] ?? '') !== 'patient') {
            return false;
        }

        return MedicalDocumentAccess::userHasProfileDocumentAccess($db, $user, $patientId);
    }

    /** Titulaire consultant le dossier d'un de ses proches (lecture des constantes, journal d'accès). */
    public static function isRelativeOwner(PDO $db, array $user, string $patientId): bool
    {
        return ($user['role'] ?? '') === 'patient'
            && RelativeProfile::isOwner($db, (string) ($user['user_id'] ?? ''), $patientId);
    }

    /**
     * Documents de profil d'un dossier : ceux d'un proche restent stockés sous (titulaire, relative_id).
     * Accepte l'id du dossier d'un proche, ou l'id du titulaire avec relative_id. Accès refusé → null.
     *
     * @return array{patient_id: string, relative_id: ?string}|null
     */
    public static function resolveProfileDocumentsTarget(
        PDO $db,
        User $userModel,
        array $user,
        string $targetId,
        ?string $relativeId,
    ): ?array {
        $relative = RelativeProfile::resolve($db, $targetId);
        if ($relative !== null) {
            if ($relativeId !== null && $relativeId !== $relative['relative_id']) {
                return null;
            }

            return self::canAccess($db, $userModel, $user, $targetId)
                ? ['patient_id' => $relative['owner_id'], 'relative_id' => $relative['relative_id']]
                : null;
        }

        if ($relativeId === null) {
            return self::canAccess($db, $userModel, $user, $targetId)
                ? ['patient_id' => $targetId, 'relative_id' => null]
                : null;
        }

        $owned = $db->prepare('SELECT 1 FROM patient_relatives WHERE id = ? AND patient_id = ? LIMIT 1');
        $owned->execute([$relativeId, $targetId]);
        if (!$owned->fetchColumn()) {
            return null;
        }
        $role = (string) ($user['role'] ?? '');
        if ($role === 'super_admin' || ($role === 'patient' && (string) ($user['user_id'] ?? '') === $targetId)) {
            return ['patient_id' => $targetId, 'relative_id' => $relativeId];
        }
        $relativeProfileId = RelativeProfile::profileIdForRelative($db, $relativeId);

        return $relativeProfileId !== null && self::canAccess($db, $userModel, $user, $relativeProfileId)
            ? ['patient_id' => $targetId, 'relative_id' => $relativeId]
            : null;
    }
}
