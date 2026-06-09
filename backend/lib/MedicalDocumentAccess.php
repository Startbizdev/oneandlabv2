<?php

require_once __DIR__ . '/LabTeamAccess.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Contrôle d'accès unifié aux documents médicaux (RDV + profil patient).
 */
class MedicalDocumentAccess
{
    /**
     * @return array{patient_id: string, relative_id: string|null}|null
     */
    public static function resolveProfileDocumentOwner(PDO $db, string $medicalDocumentId): ?array
    {
        $patStmt = $db->prepare('SELECT patient_id FROM patient_documents WHERE medical_document_id = ? LIMIT 1');
        $patStmt->execute([$medicalDocumentId]);
        $pd = $patStmt->fetch(PDO::FETCH_ASSOC);
        if ($pd && !empty($pd['patient_id'])) {
            return ['patient_id' => (string) $pd['patient_id'], 'relative_id' => null];
        }

        $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
        if ($tableExists) {
            $prdStmt = $db->prepare(
                'SELECT patient_id, relative_id FROM patient_relative_documents WHERE medical_document_id = ? LIMIT 1'
            );
            $prdStmt->execute([$medicalDocumentId]);
            $prd = $prdStmt->fetch(PDO::FETCH_ASSOC);
            if ($prd && !empty($prd['patient_id'])) {
                return [
                    'patient_id' => (string) $prd['patient_id'],
                    'relative_id' => !empty($prd['relative_id']) ? (string) $prd['relative_id'] : null,
                ];
            }
        }

        return null;
    }

    public static function userCanAccess(PDO $db, array $user, array $document): bool
    {
        if ($user['role'] === 'super_admin') {
            return true;
        }
        if (($document['uploaded_by'] ?? '') === $user['user_id']) {
            return true;
        }
        if (!empty($document['appointment_id'])) {
            return self::userHasAppointmentDocumentAccess($db, $user, $document);
        }

        $owner = self::resolveProfileDocumentOwner($db, (string) ($document['id'] ?? ''));
        if ($owner === null) {
            return false;
        }

        return self::userHasProfileDocumentAccess($db, $user, $owner['patient_id']);
    }

    public static function userHasAppointmentDocumentAccess(PDO $db, array $user, array $document): bool
    {
        $hasAccess = (
            ($document['apt_patient_id'] ?? '') === $user['user_id']
            || ($document['assigned_nurse_id'] ?? '') === $user['user_id']
            || ($document['assigned_lab_id'] ?? '') === $user['user_id']
            || (!empty($document['assigned_to']) && $document['assigned_to'] === $user['user_id'])
            || ($document['apt_created_by'] ?? '') === $user['user_id']
        );

        if (!$hasAccess && in_array($user['role'], ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIdsDirect = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (in_array($document['assigned_lab_id'] ?? '', $teamIdsDirect, true)
                || (!empty($document['assigned_to']) && in_array($document['assigned_to'], $teamIdsDirect, true))) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && !empty($document['apt_patient_id']) && in_array($user['role'], ['lab', 'subaccount', 'preleveur', 'nurse'], true)) {
            $hasAccess = self::userHasAssignedAppointmentWithPatient(
                $db,
                $user,
                (string) $document['apt_patient_id'],
            );
        }

        if (!$hasAccess && !empty($document['apt_patient_id']) && in_array($user['role'], ['pro', 'subaccount'], true)) {
            $hasAccess = self::userHasProfessionalPatientAccess($db, $user, (string) $document['apt_patient_id']);
        }

        return $hasAccess;
    }

    public static function userHasProfileDocumentAccess(PDO $db, array $user, string $docPatientId): bool
    {
        if ($docPatientId === $user['user_id']) {
            return true;
        }

        if (in_array($user['role'], ['pro', 'subaccount'], true)) {
            if (self::userHasProfessionalPatientAccess($db, $user, $docPatientId)) {
                return true;
            }
        }

        if (in_array($user['role'], ['lab', 'subaccount', 'preleveur', 'nurse'], true)) {
            return self::userHasAssignedAppointmentWithPatient($db, $user, $docPatientId);
        }

        return false;
    }

    public static function userHasProfessionalPatientAccess(PDO $db, array $user, string $patientId): bool
    {
        $userModel = new User();
        if ($userModel->hasProfessionalAccessToPatient($user['user_id'], $patientId)) {
            return true;
        }

        $createdStmt = $db->prepare('SELECT created_by FROM profiles WHERE id = ? LIMIT 1');
        $createdStmt->execute([$patientId]);
        $prof = $createdStmt->fetch(PDO::FETCH_ASSOC);

        return $prof && ($prof['created_by'] ?? '') === $user['user_id'];
    }

    public static function userHasAssignedAppointmentWithPatient(PDO $db, array $user, string $docPatientId): bool
    {
        if ($user['role'] === 'nurse') {
            $chk = $db->prepare('SELECT 1 FROM appointments WHERE patient_id = ? AND assigned_nurse_id = ? LIMIT 1');
            $chk->execute([$docPatientId, $user['user_id']]);

            return (bool) $chk->fetch();
        }

        if (in_array($user['role'], ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (empty($teamIds)) {
                return false;
            }
            $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
            $chk = $db->prepare(
                "SELECT 1 FROM appointments WHERE patient_id = ? AND (assigned_lab_id IN ($placeholders) OR assigned_to IN ($placeholders)) LIMIT 1"
            );
            $chk->execute(array_merge([$docPatientId], $teamIds, $teamIds));

            return (bool) $chk->fetch();
        }

        return false;
    }
}
