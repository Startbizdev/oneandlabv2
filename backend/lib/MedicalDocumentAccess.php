<?php

require_once __DIR__ . '/LabTeamAccess.php';
require_once __DIR__ . '/MedicalDocumentSubject.php';
require_once __DIR__ . '/pharmacy/PharmacyOrderAccess.php';
require_once __DIR__ . '/RelativeProfile.php';
require_once __DIR__ . '/nurse-collaboration/NurseCollaboration.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Contrôle d'accès unifié aux documents médicaux (RDV + profil patient).
 */
class MedicalDocumentAccess
{
    /**
     * Une copie vers un RDV ne doit être possible que pour l'infirmier qui
     * l'a créé ou auquel il est effectivement assigné.
     */
    public static function nurseCanManageAppointment(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') !== 'nurse' || empty($user['user_id'])) {
            return false;
        }
        $userId = (string) $user['user_id'];

        return (string) ($appointment['created_by'] ?? '') === $userId
            || (string) ($appointment['assigned_nurse_id'] ?? '') === $userId;
    }

    /**
     * Copie d'un document vers un RDV : même patient, même proche, et
     * infirmier créateur ou assigné avec accès au dossier.
     */
    public static function nurseCanCopyDocumentToAppointment(
        PDO $db,
        array $user,
        array $appointment,
        ?string $sourcePatientId,
        ?string $sourceRelativeId,
        ?string $appointmentPatientId,
        ?string $appointmentRelativeId,
    ): bool {
        if (!self::nurseCanManageAppointment($user, $appointment)) {
            return false;
        }
        if (!MedicalDocumentSubject::matches(
            $sourcePatientId,
            $sourceRelativeId,
            $appointmentPatientId,
            $appointmentRelativeId
        )) {
            return false;
        }
        $dossierId = self::subjectDossierId($db, (string) $appointmentPatientId, $appointmentRelativeId);

        return $dossierId !== null && self::userHasProfileDocumentAccess($db, $user, $dossierId);
    }

    /**
     * Dossier patient d'un sujet (titulaire, proche éventuel) : celui du proche s'il est concerné.
     * Null si le proche n'a pas encore de dossier (aucun accès soignant ne peut alors en découler).
     */
    public static function subjectDossierId(PDO $db, string $patientId, ?string $relativeId): ?string
    {
        if ($relativeId === null || $relativeId === '') {
            return $patientId !== '' ? $patientId : null;
        }

        return RelativeProfile::profileIdForRelative($db, $relativeId);
    }

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

    /**
     * Document et colonnes du RDV lues par userCanAccess (LEFT JOIN : un document de profil n'a pas de RDV).
     *
     * @return array<string, mixed>|null
     */
    public static function loadForAccess(PDO $db, string $documentId): ?array
    {
        $stmt = $db->prepare('
            SELECT md.*,
                   a.patient_id AS apt_patient_id,
                   a.relative_id AS apt_relative_id,
                   a.assigned_to,
                   a.assigned_nurse_id,
                   a.assigned_lab_id,
                   a.assigned_pro_id,
                   a.created_by AS apt_created_by
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            WHERE md.id = ?
            LIMIT 1
        ');
        $stmt->execute([$documentId]);
        $document = $stmt->fetch(PDO::FETCH_ASSOC);

        return $document ?: null;
    }

    public static function userCanAccess(PDO $db, array $user, array $document): bool
    {
        if ($user['role'] === 'super_admin') {
            return true;
        }
        if (($document['uploaded_by'] ?? '') === $user['user_id']) {
            return true;
        }
        $documentId = (string) ($document['id'] ?? '');
        if (!empty($document['appointment_id'])) {
            return self::userHasAppointmentDocumentAccess($db, $user, $document)
                || self::userCanViewViaPharmacyOrder($db, $user, $documentId);
        }

        $owner = self::resolveProfileDocumentOwner($db, $documentId);
        if ($owner !== null && self::userCanAccessProfileDocumentOwner($db, $user, $owner)) {
            return true;
        }

        return self::userCanViewViaPharmacyOrder($db, $user, $documentId);
    }

    /**
     * Document de profil d'un proche : le titulaire, ou un soignant ayant accès au dossier du proche
     * (un accès au seul dossier du titulaire ne suffit pas).
     *
     * @param array{patient_id: string, relative_id: string|null} $owner
     */
    private static function userCanAccessProfileDocumentOwner(PDO $db, array $user, array $owner): bool
    {
        if ($owner['relative_id'] === null) {
            return self::userHasProfileDocumentAccess($db, $user, $owner['patient_id']);
        }
        if ($owner['patient_id'] === ($user['user_id'] ?? '')) {
            return true;
        }
        $dossierId = self::subjectDossierId($db, $owner['patient_id'], $owner['relative_id']);

        return $dossierId !== null && self::userHasProfileDocumentAccess($db, $user, $dossierId);
    }

    /** Ordonnance jointe à une commande pharmacie que l'utilisateur peut consulter (officine destinataire, patient). */
    public static function userCanViewViaPharmacyOrder(PDO $db, array $user, string $documentId): bool
    {
        $userId = (string) ($user['user_id'] ?? '');
        if ($documentId === '' || $userId === '') {
            return false;
        }

        $stmt = $db->prepare('
            SELECT requester_id, pharmacy_id, patient_id
            FROM pharmacy_orders
            WHERE (pharmacy_id = ? OR patient_id = ? OR requester_id = ?)
              AND JSON_CONTAINS(prescription_document_ids, JSON_QUOTE(?))
        ');
        $stmt->execute([$userId, $userId, $userId, $documentId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $order) {
            if (PharmacyOrderAccess::canView($user, $order)) {
                return true;
            }
        }

        return false;
    }

    public static function userHasAppointmentDocumentAccess(PDO $db, array $user, array $document): bool
    {
        $hasAccess = (
            ($document['apt_patient_id'] ?? '') === $user['user_id']
            || ($document['assigned_nurse_id'] ?? '') === $user['user_id']
            || ($document['assigned_lab_id'] ?? '') === $user['user_id']
            || ($document['assigned_pro_id'] ?? '') === $user['user_id']
            || (!empty($document['assigned_to']) && $document['assigned_to'] === $user['user_id'])
            || ($document['apt_created_by'] ?? '') === $user['user_id']
        );

        if (!$hasAccess && ($user['role'] ?? '') === 'nurse') {
            $hasAccess = NurseCollaboration::isAppointmentSharedWith(
                $db,
                (string) ($document['appointment_id'] ?? ''),
                (string) $user['user_id'],
            );
        }

        if (!$hasAccess && in_array($user['role'], ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIdsDirect = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (in_array($document['assigned_lab_id'] ?? '', $teamIdsDirect, true)
                || (!empty($document['assigned_to']) && in_array($document['assigned_to'], $teamIdsDirect, true))) {
                $hasAccess = true;
            }
        }

        if ($hasAccess || empty($document['apt_patient_id'])) {
            return $hasAccess;
        }
        // RDV d'un proche : le périmètre dossier est celui du proche, pas celui du titulaire.
        $dossierId = self::subjectDossierId(
            $db,
            (string) $document['apt_patient_id'],
            isset($document['apt_relative_id']) ? (string) $document['apt_relative_id'] : null,
        );
        if ($dossierId === null) {
            return false;
        }

        if (in_array($user['role'], ['lab', 'subaccount', 'preleveur', 'nurse'], true)
            && self::userHasAssignedAppointmentWithPatient($db, $user, $dossierId)) {
            return true;
        }

        if (in_array($user['role'], ['pro', 'subaccount'], true)
            && self::userHasProfessionalPatientAccess($db, $user, $dossierId)) {
            return true;
        }

        if ($user['role'] === 'pro'
            && self::userHasAppointmentAsCreatorWithPatient($db, (string) $user['user_id'], $dossierId)) {
            return true;
        }

        // Aligné avec LabResultsListing : infirmier/pro avec accès dossier patient
        // peut télécharger un résultat labo même sans être assigné au RDV prélèvement.
        return self::userHasProfileDocumentAccess($db, $user, $dossierId);
    }

    /**
     * Dossier patient (GET /patient-documents) — même périmètre que la vue documents d'un RDV.
     */
    public static function userHasProfileDocumentAccess(PDO $db, array $user, string $docPatientId): bool
    {
        if ($docPatientId === ($user['user_id'] ?? '')) {
            return true;
        }

        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');

        if (in_array($role, ['pro', 'subaccount', 'nurse', 'preleveur'], true)) {
            if (self::userHasProfessionalPatientAccess($db, $user, $docPatientId)) {
                return true;
            }
        }

        if ($role === 'pro' && self::userHasAppointmentAsCreatorWithPatient($db, $userId, $docPatientId)) {
            return true;
        }

        if ($role === 'nurse' && self::userHasNurseAppointmentWithPatient($db, $userId, $docPatientId)) {
            return true;
        }

        if ($role === 'lab' && self::userHasLabPatientDossierAccess($db, $userId, $docPatientId)) {
            return true;
        }

        if (in_array($role, ['subaccount', 'preleveur'], true)) {
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

    /** Pro : au moins un RDV créé pour ce patient (sans PPA obligatoire). */
    public static function userHasAppointmentAsCreatorWithPatient(
        PDO $db,
        string $userId,
        string $patientId,
    ): bool {
        [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($db, 'a', $patientId);
        $chk = $db->prepare("SELECT 1 FROM appointments a WHERE $subjectSql AND a.created_by = ? LIMIT 1");
        $chk->execute([...$subjectParams, $userId]);

        return (bool) $chk->fetchColumn();
    }

    /** Infirmier : assignée, créatrice ou invitée en binôme sur au moins un RDV du patient. */
    public static function userHasNurseAppointmentWithPatient(
        PDO $db,
        string $userId,
        string $patientId,
    ): bool {
        [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($db, 'a', $patientId);
        [$sharedSql, $sharedParams] = NurseCollaboration::sharedWithNurseSql('a', $userId);
        $chk = $db->prepare("
            SELECT 1 FROM appointments a
            WHERE $subjectSql
              AND (a.assigned_nurse_id = ? OR a.created_by = ? OR $sharedSql)
            LIMIT 1
        ");
        $chk->execute([...$subjectParams, $userId, $userId, ...$sharedParams]);

        return (bool) $chk->fetchColumn();
    }

    /** Lab : créateur du patient, lab parent du créateur, PPA, ou RDV équipe. */
    public static function userHasLabPatientDossierAccess(
        PDO $db,
        string $userId,
        string $patientId,
    ): bool {
        $userModel = new User();
        if ($userModel->hasProfessionalAccessToPatient($userId, $patientId)) {
            return true;
        }

        $createdStmt = $db->prepare('SELECT created_by FROM profiles WHERE id = ? LIMIT 1');
        $createdStmt->execute([$patientId]);
        $prof = $createdStmt->fetch(PDO::FETCH_ASSOC);
        $createdBy = (string) ($prof['created_by'] ?? '');

        if ($createdBy === $userId) {
            return true;
        }

        $creatorLabId = $userModel->getLabId($createdBy);
        if ($creatorLabId === $userId) {
            return true;
        }

        return self::userHasAssignedAppointmentWithPatient(
            $db,
            ['user_id' => $userId, 'role' => 'lab'],
            $patientId,
        );
    }

    public static function userHasAssignedAppointmentWithPatient(PDO $db, array $user, string $docPatientId): bool
    {
        if ($user['role'] === 'nurse') {
            return self::userHasNurseAppointmentWithPatient($db, (string) $user['user_id'], $docPatientId);
        }

        if (in_array($user['role'], ['lab', 'subaccount', 'preleveur'], true)) {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if ($teamIds === []) {
                return false;
            }
            $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
            [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($db, 'a', $docPatientId);
            $chk = $db->prepare(
                "SELECT 1 FROM appointments a WHERE $subjectSql AND (a.assigned_lab_id IN ($placeholders) OR a.assigned_to IN ($placeholders)) LIMIT 1"
            );
            $chk->execute(array_merge($subjectParams, $teamIds, $teamIds));

            return (bool) $chk->fetchColumn();
        }

        return false;
    }
}
