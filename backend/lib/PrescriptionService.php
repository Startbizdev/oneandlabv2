<?php

require_once __DIR__ . '/PrescriptionPdf.php';

class PrescriptionService
{
    public const KIND_MEDICAL = 'medical';
    public const KIND_NURSING = 'nursing';

    /** Mots-clés médicaments interdits en prescription infirmière (actes only). */
    private const NURSING_FORBIDDEN_PATTERNS = [
        '/\b(mg|ml|cp|comprim[eé]|gélule|sirop|antibiotique|doliprane|paracétamol|ibuprofène|amoxicilline)\b/ui',
    ];

    public static function resolveKindForRole(string $role, ?string $requestedKind): string
    {
        if ($role === 'nurse') {
            return self::KIND_NURSING;
        }
        if ($role === 'pro' || $role === 'super_admin') {
            return $requestedKind === self::KIND_NURSING ? self::KIND_NURSING : self::KIND_MEDICAL;
        }

        throw new InvalidArgumentException('Rôle non autorisé pour la génération d\'ordonnance');
    }

    public static function validatePrescriberCredentials(string $role, array $prescriber): ?string
    {
        if ($role === 'nurse') {
            $adeli = trim((string) ($prescriber['adeli'] ?? ''));
            if ($adeli === '') {
                return 'Numéro ADELI requis pour générer une prescription d\'actes infirmiers.';
            }

            return null;
        }

        if (in_array($role, ['pro', 'super_admin'], true)) {
            $rpps = trim((string) ($prescriber['rpps'] ?? ''));
            if ($rpps === '') {
                return 'Numéro RPPS requis pour générer une ordonnance médicale.';
            }

            return null;
        }

        return 'Rôle non autorisé';
    }

    public static function validatePrescriptionText(string $kind, string $text): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return 'Le contenu de la prescription est requis';
        }
        if (strlen($text) > 10000) {
            return 'La prescription ne doit pas dépasser 10 000 caractères';
        }

        if ($kind === self::KIND_NURSING) {
            foreach (self::NURSING_FORBIDDEN_PATTERNS as $pattern) {
                if (preg_match($pattern, $text)) {
                    return 'Les prescriptions infirmières ne peuvent porter que sur des actes de soins (pas de médicaments).';
                }
            }
        }

        return null;
    }

    public static function generatePrescriptionNumber(): string
    {
        return 'RX-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    /**
     * @return array{pdf_base64: string, file_name: string, prescription_number: string, prescription_kind: string}
     */
    public static function generatePdf(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        ?string $prescriptionNumber = null
    ): array {
        $number = $prescriptionNumber ?: self::generatePrescriptionNumber();
        $pdfContent = PrescriptionPdf::generate($prescriber, $patient, $prescriptionText, [
            'kind' => $kind,
            'prescription_number' => $number,
        ]);

        return [
            'pdf_base64' => base64_encode($pdfContent),
            'file_name' => 'ordonnance-' . $number . '.pdf',
            'prescription_number' => $number,
            'prescription_kind' => $kind,
        ];
    }

    /**
     * Génération PDF : patient obligatoire, rendez-vous optionnel.
     *
     * @return array{success: bool, error?: string, http?: int, data?: array<string, mixed>}
     */
    public static function generatePrescriptionRequest(
        PDO $db,
        Crypto $crypto,
        array $user,
        string $prescriptionText,
        string $prescriptionKind,
        string $patientId,
        ?string $appointmentId = null
    ): array {
        $role = $user['role'] ?? '';

        if ($patientId === '') {
            return ['success' => false, 'http' => 400, 'error' => 'patient_id requis'];
        }

        $patientProfileStmt = $db->prepare('SELECT id, role FROM profiles WHERE id = ? LIMIT 1');
        $patientProfileStmt->execute([$patientId]);
        $patientProfile = $patientProfileStmt->fetch(PDO::FETCH_ASSOC);
        if (!$patientProfile || ($patientProfile['role'] ?? '') !== 'patient') {
            return ['success' => false, 'http' => 404, 'error' => 'Patient introuvable'];
        }

        $appointment = null;
        if ($appointmentId !== null && $appointmentId !== '') {
            $stmt = $db->prepare('
                SELECT id, patient_id, type, status, assigned_nurse_id, assigned_lab_id, assigned_to, created_by,
                       form_data_encrypted, form_data_dek, address_encrypted, address_dek
                FROM appointments WHERE id = ?
            ');
            $stmt->execute([$appointmentId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$appointment) {
                return ['success' => false, 'http' => 404, 'error' => 'Rendez-vous introuvable'];
            }
            if (($appointment['status'] ?? '') === 'canceled') {
                return ['success' => false, 'http' => 400, 'error' => 'Impossible de créer une ordonnance pour un rendez-vous annulé'];
            }
            if (($appointment['patient_id'] ?? '') !== $patientId) {
                return ['success' => false, 'http' => 400, 'error' => 'Le rendez-vous ne correspond pas au patient sélectionné'];
            }
            if ($prescriptionKind === self::KIND_NURSING && ($appointment['type'] ?? '') !== 'nursing') {
                return ['success' => false, 'http' => 400, 'error' => 'Les prescriptions infirmières ne peuvent être générées que pour des rendez-vous de soins infirmiers'];
            }
            if (!self::canGenerateForAppointment($user, $appointment, $db)) {
                return ['success' => false, 'http' => 403, 'error' => 'Accès refusé à ce rendez-vous'];
            }
        } elseif (!self::canGenerateForPatient($user, $patientId, $db)) {
            return ['success' => false, 'http' => 403, 'error' => 'Accès refusé à ce patient'];
        }

        $prescriber = self::loadPrescriber($db, $crypto, (string) $user['user_id'], $role);
        $credentialError = self::validatePrescriberCredentials($role, $prescriber);
        if ($credentialError !== null) {
            return ['success' => false, 'http' => 400, 'error' => $credentialError];
        }

        $patient = self::loadPatient($db, $crypto, $patientId);
        if ($appointment !== null) {
            $patient = self::mergePatientFromAppointmentForm($crypto, $patient, $appointment);
        }

        if (trim($patient['first_name'] . $patient['last_name']) === '') {
            return ['success' => false, 'http' => 400, 'error' => 'Identité patient indisponible pour l\'ordonnance'];
        }

        try {
            $result = self::generatePdf($prescriber, $patient, $prescriptionText, $prescriptionKind);
        } catch (Throwable $e) {
            error_log('PrescriptionPdf error: ' . $e->getMessage());

            return ['success' => false, 'http' => 500, 'error' => 'Erreur lors de la génération du PDF.'];
        }

        return [
            'success' => true,
            'data' => array_merge($result, [
                'prescription_text' => $prescriptionText,
                'patient_id' => $patientId,
                'appointment_id' => $appointmentId ?: null,
            ]),
        ];
    }

    public static function canGenerateForPatient(array $user, string $patientId, PDO $db): bool
    {
        if (($user['role'] ?? '') === 'super_admin') {
            return true;
        }

        $role = $user['role'] ?? '';
        $userId = $user['user_id'] ?? '';

        if (!in_array($role, ['pro', 'nurse'], true)) {
            return false;
        }

        require_once __DIR__ . '/../models/User.php';
        $userModel = new User();
        if ($userModel->hasProfessionalAccessToPatient($userId, $patientId)) {
            return true;
        }

        $createdStmt = $db->prepare('SELECT created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
        $createdStmt->execute([$patientId, 'patient']);
        $createdBy = $createdStmt->fetchColumn();
        if ($createdBy && (string) $createdBy === $userId) {
            return true;
        }

        if ($role === 'pro') {
            $aptStmt = $db->prepare('
                SELECT 1 FROM appointments
                WHERE patient_id = ? AND (created_by = ? OR assigned_to = ?)
                LIMIT 1
            ');
            $aptStmt->execute([$patientId, $userId, $userId]);

            return (bool) $aptStmt->fetchColumn();
        }

        $nurseStmt = $db->prepare('
            SELECT 1 FROM appointments
            WHERE patient_id = ? AND assigned_nurse_id = ? AND type = ?
            LIMIT 1
        ');
        $nurseStmt->execute([$patientId, $userId, 'nursing']);

        return (bool) $nurseStmt->fetchColumn();
    }

    /**
     * @return array{first_name: string, last_name: string, title: string, address: mixed, rpps: string, adeli: string}
     */
    public static function loadPrescriber(PDO $db, Crypto $crypto, string $userId, string $role): array
    {
        $stmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, address_encrypted, address_dek, rpps_encrypted, rpps_dek, adeli_encrypted, adeli_dek, emploi FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'first_name' => self::safeDecrypt($crypto, $row['first_name_encrypted'] ?? null, $row['first_name_dek'] ?? null),
            'last_name' => self::safeDecrypt($crypto, $row['last_name_encrypted'] ?? null, $row['last_name_dek'] ?? null),
            'title' => (isset($row['emploi']) && trim((string) $row['emploi']) !== '') ? trim((string) $row['emploi']) : ($role === 'nurse' ? 'Infirmier(ère)' : 'Dr'),
            'address' => self::safeDecrypt($crypto, $row['address_encrypted'] ?? null, $row['address_dek'] ?? null) ?: null,
            'rpps' => self::safeDecrypt($crypto, $row['rpps_encrypted'] ?? null, $row['rpps_dek'] ?? null),
            'adeli' => self::safeDecrypt($crypto, $row['adeli_encrypted'] ?? null, $row['adeli_dek'] ?? null),
        ];
    }

    /**
     * @return array{first_name: string, last_name: string, birth_date: string, address: mixed, nir: string}
     */
    public static function loadPatient(PDO $db, Crypto $crypto, string $patientId): array
    {
        $stmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, birth_date_encrypted, birth_date_dek, address_encrypted, address_dek FROM profiles WHERE id = ?');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'first_name' => self::safeDecrypt($crypto, $row['first_name_encrypted'] ?? null, $row['first_name_dek'] ?? null),
            'last_name' => self::safeDecrypt($crypto, $row['last_name_encrypted'] ?? null, $row['last_name_dek'] ?? null),
            'birth_date' => self::safeDecrypt($crypto, $row['birth_date_encrypted'] ?? null, $row['birth_date_dek'] ?? null),
            'address' => self::safeDecrypt($crypto, $row['address_encrypted'] ?? null, $row['address_dek'] ?? null) ?: null,
            'nir' => '',
        ];
    }

    /**
     * @param array<string, mixed> $patient
     * @param array<string, mixed> $appointment
     * @return array<string, mixed>
     */
    public static function mergePatientFromAppointmentForm(Crypto $crypto, array $patient, array $appointment): array
    {
        $formData = [];
        if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
            try {
                $fd = $crypto->decryptField($appointment['form_data_encrypted'], $appointment['form_data_dek']);
                $formData = is_string($fd) ? json_decode($fd, true) ?? [] : (is_array($fd) ? $fd : []);
            } catch (Exception $e) {
                $formData = [];
            }
        }
        if (empty($patient['first_name']) && !empty($formData['first_name'])) {
            $patient['first_name'] = (string) $formData['first_name'];
        }
        if (empty($patient['last_name']) && !empty($formData['last_name'])) {
            $patient['last_name'] = (string) $formData['last_name'];
        }
        if (empty($patient['birth_date']) && !empty($formData['birth_date'])) {
            $patient['birth_date'] = (string) $formData['birth_date'];
        }

        return $patient;
    }

    private static function safeDecrypt(Crypto $crypto, $encrypted, $dek): string
    {
        if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') {
            return '';
        }
        try {
            return (string) $crypto->decryptField((string) $encrypted, (string) $dek);
        } catch (Throwable $e) {
            return '';
        }
    }

    /** Extrait availability depuis form_data chiffré (liste ordonnances). */
    private static function extractAppointmentAvailability(Crypto $crypto, $encrypted, $dek)
    {
        if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') {
            return null;
        }
        try {
            $json = $crypto->decryptField((string) $encrypted, (string) $dek);
            $fd = json_decode($json, true);
            if (!is_array($fd)) {
                return null;
            }
            $availability = $fd['availability'] ?? null;
            if ($availability !== null && $availability !== '') {
                return $availability;
            }
            $typ = strtolower(trim((string) ($fd['availability_type'] ?? '')));
            if (in_array($typ, ['all_day', 'fullday', 'full_day'], true)) {
                return ['type' => 'all_day'];
            }
            if ($typ === 'custom') {
                $start = $fd['availability_start'] ?? $fd['availabilityStart'] ?? null;
                $end = $fd['availability_end'] ?? $fd['availabilityEnd'] ?? null;
                if ($start !== null && $end !== null) {
                    return ['type' => 'custom', 'range' => [(int) $start, (int) $end]];
                }
            }

            return null;
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    public static function listPrescriptions(
        PDO $db,
        Crypto $crypto,
        string $profileId,
        string $role,
        int $page,
        int $limit,
        ?string $patientId = null
    ): array {
        $page = max(1, $page);
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }
        $offset = ($page - 1) * $limit;

        $where = 'md.uploaded_by = ? AND md.document_type = \'ordonnance\'';
        $params = [$profileId];

        if ($role === 'nurse') {
            $where .= ' AND (md.prescription_kind = \'nursing\' OR md.prescription_kind IS NULL)';
        } elseif ($role === 'pro') {
            $where .= ' AND (md.prescription_kind IS NULL OR md.prescription_kind IN (\'medical\', \'nursing\'))';
        }

        if ($patientId) {
            $where .= ' AND (a.patient_id = ? OR md.patient_id = ?)';
            $params[] = $patientId;
            $params[] = $patientId;
        }

        $countStmt = $db->prepare("SELECT COUNT(*) AS total FROM medical_documents md LEFT JOIN appointments a ON a.id = md.appointment_id WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        $pages = $total > 0 ? (int) ceil($total / $limit) : 1;

        $sql = "
            SELECT
                md.id,
                md.appointment_id,
                md.patient_id AS md_patient_id,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.prescription_kind,
                md.prescription_number,
                md.generated_at,
                md.created_at,
                a.scheduled_at AS appointment_scheduled_at,
                a.status AS appointment_status,
                a.type AS appointment_type,
                cc.name AS appointment_category_name,
                a.form_data_encrypted AS appointment_form_data_enc,
                a.form_data_dek AS appointment_form_data_dek,
                COALESCE(a.patient_id, md.patient_id) AS patient_id,
                p.first_name_encrypted AS patient_fn_enc,
                p.first_name_dek AS patient_fn_dek,
                p.last_name_encrypted AS patient_ln_enc,
                p.last_name_dek AS patient_ln_dek
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            LEFT JOIN profiles p ON p.id = COALESCE(a.patient_id, md.patient_id)
            WHERE {$where}
            ORDER BY COALESCE(md.generated_at, md.created_at) DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $db->prepare($sql);
        $bindIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($bindIndex++, $param, PDO::PARAM_STR);
        }
        $stmt->bindValue($bindIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $row) {
            $row['patient_first_name'] = self::safeDecrypt($crypto, $row['patient_fn_enc'] ?? null, $row['patient_fn_dek'] ?? null);
            $row['patient_last_name'] = self::safeDecrypt($crypto, $row['patient_ln_enc'] ?? null, $row['patient_ln_dek'] ?? null);
            unset($row['patient_fn_enc'], $row['patient_fn_dek'], $row['patient_ln_enc'], $row['patient_ln_dek'], $row['md_patient_id']);
            $row['appointment_availability'] = self::extractAppointmentAvailability(
                $crypto,
                $row['appointment_form_data_enc'] ?? null,
                $row['appointment_form_data_dek'] ?? null
            );
            unset($row['appointment_form_data_enc'], $row['appointment_form_data_dek']);
            $out[] = $row;
        }

        return [
            'data' => $out,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $pages,
            ],
        ];
    }

    public static function canGenerateForAppointment(array $user, array $appointment, PDO $db): bool
    {
        $hasAccess = (
            ($appointment['assigned_nurse_id'] ?? '') === ($user['user_id'] ?? '') ||
            ($appointment['created_by'] ?? '') === ($user['user_id'] ?? '') ||
            ($user['role'] ?? '') === 'super_admin'
        );

        if (!$hasAccess && ($appointment['type'] ?? '') === 'blood_test') {
            require_once __DIR__ . '/LabTeamAccess.php';
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role'] ?? '');
            if (in_array($appointment['assigned_lab_id'] ?? '', $teamIds, true)
                || (!empty($appointment['assigned_to']) && in_array($appointment['assigned_to'], $teamIds, true))) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'pro') {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            if (
                ($appointment['created_by'] ?? '') === ($user['user_id'] ?? '')
                || $userModel->hasProfessionalAccessToPatient($user['user_id'], (string) ($appointment['patient_id'] ?? ''))
            ) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'nurse') {
            $hasAccess = ($appointment['assigned_nurse_id'] ?? '') === ($user['user_id'] ?? '')
                && ($appointment['type'] ?? '') === 'nursing';
        }

        return $hasAccess;
    }
}
