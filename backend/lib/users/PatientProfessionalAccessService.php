<?php

declare(strict_types=1);

require_once __DIR__ . '/../DbSchemaCache.php';

/** Liens patient ↔ professionnel (PPA) et règles d’accès staff aux dossiers patients. */
final class PatientProfessionalAccessService
{
    /** Doit rester inclus dans l'ENUM patient_professional_access.source (qr_origin est posé par QrCodeService). */
    public const LINK_SOURCES = ['created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'lab_assignment'];

    public function __construct(private PDO $db)
    {
    }

    /**
     * Liens patient_professional_access après création d'un RDV (session staff ou admin + assignations).
     */
    public function linkPatientAccessAfterAppointmentCreate(
        string $patientId,
        string $appointmentId,
        array $sessionUser,
        string $createUserId,
        string $createUserRole,
        array $appointmentInput
    ): void {
        if (!$this->hasPatientProfessionalAccessTable() || $patientId === '') {
            return;
        }

        $staffRoles = User::patientListStaffRoles();
        $linkIds = [];

        $sessionRole = (string) ($sessionUser['role'] ?? '');
        $sessionId = (string) ($sessionUser['user_id'] ?? '');
        if (in_array($sessionRole, array_merge($staffRoles, ['preleveur']), true) && $sessionId !== '') {
            if (in_array($sessionRole, $staffRoles, true)) {
                $linkIds[] = $sessionId;
            }
        }

        if ($sessionRole === 'super_admin') {
            if (in_array($createUserRole, $staffRoles, true) && $createUserId !== '') {
                $linkIds[] = $createUserId;
            }
            foreach (['assigned_pro_id', 'assigned_nurse_id', 'assigned_lab_id'] as $key) {
                $assignedId = trim((string) ($appointmentInput[$key] ?? ''));
                if ($assignedId !== '') {
                    $linkIds[] = $assignedId;
                }
            }
        }

        $linkIds = array_values(array_unique(array_filter($linkIds)));
        foreach ($linkIds as $profId) {
            try {
                $this->linkPatientProfessional($patientId, $profId, $appointmentId, 'appointment_linked');
            } catch (Throwable $e) {
                error_log('linkPatientAccessAfterAppointmentCreate: ' . $e->getMessage());
            }
        }
    }

    /**
     * Lien patient ↔ professionnel (liste « Mes patients » au-delà de created_by).
     */
    public function linkPatientProfessional(
        string $patientId,
        string $professionalId,
        ?string $appointmentId,
        string $source,
        bool $strict = false
    ): void {
        if (!$this->hasPatientProfessionalAccessTable()) {
            if ($strict) {
                throw new RuntimeException('Table patient_professional_access absente');
            }
            return;
        }
        if (!in_array($source, self::LINK_SOURCES, true)) {
            $source = 'created';
        }
        $linkId = $this->generateUUID();
        try {
            $ins = $this->db->prepare('
                INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ');
            $ins->execute([$linkId, $patientId, $professionalId, $source, $appointmentId]);
        } catch (PDOException $e) {
            if ($strict) {
                throw $e;
            }
            error_log('linkPatientProfessional: ' . $e->getMessage());
            return;
        }
        // INSERT IGNORE convertit une violation de clé étrangère en simple avertissement.
        if ($strict && $ins->rowCount() === 0 && !$this->hasProfessionalAccessToPatient($professionalId, $patientId)) {
            throw new RuntimeException('Lien patient ↔ professionnel impossible (profil introuvable)');
        }
    }

    /**
     * Patients assignés par un labo à l'un de ses préleveurs (lien PPA `lab_assignment`).
     *
     * @return list<array{patient_id: string, source: string, created_at: string}>
     */
    public function listPreleveurAssignments(string $preleveurId): array
    {
        if (!$this->hasPatientProfessionalAccessTable()) {
            return [];
        }
        $stmt = $this->db->prepare('
            SELECT patient_id, source, created_at FROM patient_professional_access
            WHERE professional_id = ? AND source = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$preleveurId, 'lab_assignment']);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** Retire une assignation labo → préleveur ; le patient reste visible s'il a été créé par ce préleveur. */
    public function removePreleveurAssignment(string $preleveurId, string $patientId): bool
    {
        if (!$this->hasPatientProfessionalAccessTable()) {
            return false;
        }
        $del = $this->db->prepare('
            DELETE FROM patient_professional_access
            WHERE professional_id = ? AND patient_id = ? AND source = ?
        ');
        $del->execute([$preleveurId, $patientId, 'lab_assignment']);

        return $del->rowCount() > 0;
    }

    /**
     * Adoption d’un dossier trouvé par lookup : lien PPA durable (liste + ordonnance).
     * Sans lien préalable (dossier créé, lien d'accès, RDV commun), le professionnel doit rejouer
     * la recherche exacte (e-mail ou téléphone du patient) et confirmer le consentement du patient.
     *
     * @return array{ok: bool, http?: int, error?: string, code?: string, consent_recorded?: bool}
     */
    public function adoptPatientForStaff(
        string $requesterId,
        string $requesterRole,
        string $patientId,
        string $lookupEmail = '',
        string $lookupPhone = '',
        bool $consentGiven = false,
    ): array {
        if ($requesterId === '' || $patientId === '') {
            return ['ok' => false, 'http' => 400, 'error' => 'Identifiants requis'];
        }
        $allowed = array_merge(User::patientListStaffRoles(), ['super_admin']);
        if (!in_array($requesterRole, $allowed, true)) {
            return ['ok' => false, 'http' => 403, 'error' => 'Accès refusé'];
        }
        if ($this->getRoleById($patientId) !== 'patient') {
            return ['ok' => false, 'http' => 403, 'error' => 'Dossier patient introuvable'];
        }
        if ($requesterRole === 'super_admin') {
            return ['ok' => true];
        }
        if ($this->canStaffEditPatientProfile($requesterId, $requesterRole, $patientId)) {
            $this->linkPatientProfessional($patientId, $requesterId, null, 'manual_link');

            return ['ok' => true];
        }

        if ((trim($lookupEmail) === '') === (trim($lookupPhone) === '')) {
            return [
                'ok' => false,
                'http' => 403,
                'error' => 'Recherchez d’abord le patient par son e-mail ou son téléphone.',
                'code' => 'PATIENT_LOOKUP_MISMATCH',
            ];
        }
        require_once __DIR__ . '/UserIdentityLookup.php';
        if ((new UserIdentityLookup($this->db))->findPatientIdByContact($lookupEmail, $lookupPhone) !== $patientId) {
            return [
                'ok' => false,
                'http' => 403,
                'error' => 'Ce dossier ne correspond pas au contact recherché.',
                'code' => 'PATIENT_LOOKUP_MISMATCH',
            ];
        }
        if (!$consentGiven) {
            return [
                'ok' => false,
                'http' => 400,
                'error' => 'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.',
                'code' => 'PATIENT_BOOKING_CONSENT_REQUIRED',
            ];
        }
        $this->linkPatientProfessional($patientId, $requesterId, null, 'manual_link', true);

        return ['ok' => true, 'consent_recorded' => true];
    }

    public function hasProfessionalAccessToPatient(string $requesterId, string $patientId): bool
    {
        if (!$this->hasPatientProfessionalAccessTable()) {
            return false;
        }
        $stmt = $this->db->prepare('
            SELECT 1 FROM patient_professional_access
            WHERE patient_id = ? AND professional_id = ?
            LIMIT 1
        ');
        $stmt->execute([$patientId, $requesterId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Même périmètre que GET /patients (liste « Mes patients ») pour un patient donné.
     */
    public function isPatientVisibleInStaffList(string $requesterId, string $requesterRole, string $patientId): bool
    {
        if ($patientId === '' || $requesterId === '') {
            return false;
        }
        if ($requesterRole === 'super_admin') {
            return $this->getRoleById($patientId) === 'patient';
        }
        if (!in_array($requesterRole, ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
            return false;
        }

        $roleStmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
        $roleStmt->execute([$patientId]);
        if ((string) ($roleStmt->fetchColumn() ?: '') !== 'patient') {
            return false;
        }

        $filters = ['role' => 'patient'];
        if (in_array($requesterRole, ['pro', 'nurse'], true)) {
            $filters['created_by'] = $requesterId;
        } elseif ($requesterRole === 'lab') {
            $filters['for_lab_owner_id'] = $requesterId;
        } else {
            $filters['created_by'] = $requesterId;
        }

        $sql = 'SELECT 1 FROM profiles WHERE id = ? AND role = ?';
        $params = [$patientId, 'patient'];
        $this->appendPatientListScopeSql($sql, $params, $filters);
        $sql .= ' LIMIT 1';
        $check = $this->db->prepare($sql);
        $check->execute($params);

        return (bool) $check->fetchColumn();
    }

    /**
     * Un professionnel peut-il modifier la fiche d'un patient depuis le wizard RDV ?
     * Aligné sur la liste patients + liens RDV historiques (pro / infirmier).
     */
    public function canStaffEditPatientProfile(string $requesterId, string $requesterRole, string $patientId): bool
    {
        if ($patientId === '' || $requesterId === '') {
            return false;
        }
        if ($requesterRole === 'super_admin') {
            return $this->getRoleById($patientId) === 'patient';
        }
        if ($this->isPatientVisibleInStaffList($requesterId, $requesterRole, $patientId)) {
            return true;
        }
        if ($requesterRole === 'pro') {
            require_once __DIR__ . '/../MedicalDocumentAccess.php';

            return MedicalDocumentAccess::userHasAppointmentAsCreatorWithPatient($this->db, $requesterId, $patientId);
        }
        if ($requesterRole === 'nurse') {
            require_once __DIR__ . '/../MedicalDocumentAccess.php';

            return MedicalDocumentAccess::userHasNurseAppointmentWithPatient($this->db, $requesterId, $patientId);
        }

        return false;
    }

    /**
     * Après redispatch : retire le patient de « Mes patients » s’il n’a été lié que via l’acceptation du RDV.
     * Les infirmiers conservent le patient (lien PPA créé à l’acceptation).
     */
    public function revokePatientProfessionalAccessAfterRedispatch(
        string $patientId,
        string $professionalId,
        string $professionalRole
    ): void {
        if ($professionalRole === 'nurse') {
            return;
        }
        if (!$this->hasPatientProfessionalAccessTable() || $patientId === '' || $professionalId === '') {
            return;
        }
        if ($this->hasCreatedByColumn()) {
            $stmt = $this->db->prepare('SELECT created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$patientId, 'patient']);
            $createdBy = (string) ($stmt->fetchColumn() ?: '');
            if ($createdBy === $professionalId) {
                return;
            }
        }
        if ($this->professionalHasActiveCareWithPatient($patientId, $professionalId, $professionalRole)) {
            return;
        }
        try {
            $del = $this->db->prepare(
                'DELETE FROM patient_professional_access WHERE patient_id = ? AND professional_id = ?'
            );
            $del->execute([$patientId, $professionalId]);
        } catch (PDOException $e) {
            error_log('revokePatientProfessionalAccessAfterRedispatch: ' . $e->getMessage());
        }
    }

    /**
     * Ajoute le filtre « mes patients » : created_by OU lien patient_professional_access.
     */
    public function appendPatientListScopeSql(string &$sql, array &$params, array $filters): void
    {
        if (!$this->hasCreatedByColumn()) {
            return;
        }
        $usePpa = $this->hasPatientProfessionalAccessTable();
        if (!empty($filters['for_lab_owner_id']) && $this->hasLabIdColumn()) {
            $labOwnerId = $filters['for_lab_owner_id'];
            if ($usePpa) {
                $sql .= ' AND (
                    (created_by = ? OR created_by IN (SELECT id FROM profiles WHERE lab_id = ? AND role = ?))
                    OR EXISTS (
                        SELECT 1 FROM patient_professional_access ppa
                        WHERE ppa.patient_id = profiles.id
                        AND (
                            ppa.professional_id = ?
                            OR ppa.professional_id IN (SELECT id FROM profiles WHERE lab_id = ? AND role = ?)
                        )
                    )
                )';
                $params[] = $labOwnerId;
                $params[] = $labOwnerId;
                $params[] = 'subaccount';
                $params[] = $labOwnerId;
                $params[] = $labOwnerId;
                $params[] = 'subaccount';
            } else {
                $sql .= ' AND (created_by = ? OR created_by IN (SELECT id FROM profiles WHERE lab_id = ? AND role = ?))';
                $params[] = $labOwnerId;
                $params[] = $labOwnerId;
                $params[] = 'subaccount';
            }
        } elseif (!empty($filters['created_by'])) {
            $cb = $filters['created_by'];
            if ($usePpa) {
                $sql .= ' AND (created_by = ? OR EXISTS (SELECT 1 FROM patient_professional_access ppa WHERE ppa.patient_id = profiles.id AND ppa.professional_id = ?))';
                $params[] = $cb;
                $params[] = $cb;
            } else {
                $sql .= ' AND created_by = ?';
                $params[] = $cb;
            }
        }
    }

    private function professionalHasActiveCareWithPatient(
        string $patientId,
        string $professionalId,
        string $professionalRole
    ): bool {
        if ($professionalRole === 'nurse') {
            $stmt = $this->db->prepare(
                'SELECT 1 FROM appointments
                 WHERE patient_id = ? AND assigned_nurse_id = ?
                 AND status IN (\'confirmed\', \'planned\', \'inProgress\')
                 LIMIT 1'
            );
            $stmt->execute([$patientId, $professionalId]);

            return (bool) $stmt->fetchColumn();
        }
        if (in_array($professionalRole, ['lab', 'subaccount'], true)) {
            $stmt = $this->db->prepare(
                'SELECT 1 FROM appointments
                 WHERE patient_id = ? AND assigned_lab_id = ?
                 AND status IN (\'confirmed\', \'planned\', \'inProgress\')
                 LIMIT 1'
            );
            $stmt->execute([$patientId, $professionalId]);

            return (bool) $stmt->fetchColumn();
        }

        return false;
    }

    private function getRoleById(string $id): ?string
    {
        $stmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row && isset($row['role']) ? (string) $row['role'] : null;
    }

    private function hasLabIdColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'lab_id');
    }

    private function hasCreatedByColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'created_by');
    }

    private function hasPatientProfessionalAccessTable(): bool
    {
        return DbSchemaCache::tableExists($this->db, 'patient_professional_access');
    }

    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
