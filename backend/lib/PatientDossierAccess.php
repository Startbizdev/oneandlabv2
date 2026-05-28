<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/LabTeamAccess.php';

/**
 * Accès au dossier patient (documents, historique) pour staff et patient.
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

        $checkStmt = $db->prepare('SELECT id, role, created_by FROM profiles WHERE id = ? LIMIT 1');
        $checkStmt->execute([$patientId]);
        $profile = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$profile || ($profile['role'] ?? '') !== 'patient') {
            return false;
        }

        $createdBy = (string) ($profile['created_by'] ?? '');

        if ($role === 'pro' || $role === 'subaccount') {
            if ($createdBy === $userId) {
                return true;
            }

            return $userModel->hasProfessionalAccessToPatient($userId, $patientId);
        }

        if ($role === 'nurse') {
            if ($createdBy === $userId) {
                return true;
            }
            if ($userModel->hasProfessionalAccessToPatient($userId, $patientId)) {
                return true;
            }
            $stmt = $db->prepare('
                SELECT 1 FROM appointments
                WHERE patient_id = ?
                  AND (assigned_nurse_id = ? OR created_by = ?)
                LIMIT 1
            ');
            $stmt->execute([$patientId, $userId, $userId]);

            return (bool) $stmt->fetchColumn();
        }

        if ($role === 'lab') {
            if ($createdBy === $userId) {
                return true;
            }
            $creatorLabId = $userModel->getLabId($createdBy);
            if ($creatorLabId === $userId) {
                return true;
            }

            return $userModel->hasProfessionalAccessToPatient($userId, $patientId);
        }

        if ($role === 'preleveur') {
            $stmt = $db->prepare('
                SELECT 1 FROM appointments
                WHERE patient_id = ? AND type = ? AND assigned_to = ?
                LIMIT 1
            ');
            $stmt->execute([$patientId, 'blood_test', $userId]);

            return (bool) $stmt->fetchColumn();
        }

        return false;
    }
}
