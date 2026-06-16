<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/MedicalDocumentAccess.php';

/**
 * Accès au dossier patient (documents, historique) — délègue à MedicalDocumentAccess.
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

        if ($role === 'patient' && $userId === $patientId) {
            return true;
        }

        $checkStmt = $db->prepare('SELECT id, role FROM profiles WHERE id = ? LIMIT 1');
        $checkStmt->execute([$patientId]);
        $profile = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$profile || ($profile['role'] ?? '') !== 'patient') {
            return false;
        }

        return MedicalDocumentAccess::userHasProfileDocumentAccess($db, $user, $patientId);
    }
}
