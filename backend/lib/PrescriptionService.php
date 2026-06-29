<?php

require_once __DIR__ . '/PrescriptionPdf.php';
require_once __DIR__ . '/AppTimezone.php';
require_once __DIR__ . '/PrescriptionSignature.php';

class PrescriptionService
{
    public const KIND_MEDICAL = 'medical';
    public const KIND_NURSING = 'nursing';

    public const LABEL_ALD = "Prescriptions relatives au traitement de l'ALD";
    public const LABEL_HORS_ALD = "Prescriptions sans rapport avec l'ALD";

    /** Titres officiels affichés sur le PDF uniquement (formulaire = LABEL_ALD / LABEL_HORS_ALD). */
    public const LABEL_ALD_PDF = "Prescription relatives au traitement de l'affection de longue durée reconnue (liste ou hors liste) (AFFECTION EXONERANTE)";
    public const LABEL_HORS_ALD_PDF = "Prescription sans rapport avec l'affection de longue durée (MALADIES INTERCURRENTES)";

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
            $rpps = trim((string) ($prescriber['rpps'] ?? ''));
            if ($adeli === '' && $rpps === '') {
                return 'Numéro RPPS ou Adeli requis pour générer une prescription d\'actes infirmiers.';
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

    /**
     * @param array<string, mixed> $input
     * @return array{text: string, sections: list<array{title: string, body: string}>}
     */
    public static function resolvePrescriptionInput(array $input, string $kind): array
    {
        $ald = trim((string) ($input['ald_prescription'] ?? ''));
        $horsAld = trim((string) ($input['hors_ald_prescription'] ?? ''));

        if ($ald === '' && $horsAld === '') {
            $text = trim((string) ($input['prescription_text'] ?? $input['prescription'] ?? ''));
            $parsed = self::parseMedicalPrescriptionText($text);

            return [
                'text' => self::composeMedicalPrescriptionText($parsed['ald'], $parsed['hors_ald']),
                'sections' => self::buildMedicalPrescriptionSections($parsed['ald'], $parsed['hors_ald']),
            ];
        }

        return [
            'text' => self::composeMedicalPrescriptionText($ald, $horsAld),
            'sections' => self::buildMedicalPrescriptionSections($ald, $horsAld),
        ];
    }

    /**
     * @return array{ald: string, hors_ald: string}
     */
    public static function parseMedicalPrescriptionText(string $text): array
    {
        $raw = trim($text);
        if ($raw === '') {
            return ['ald' => '', 'hors_ald' => ''];
        }

        $aldLabel = self::LABEL_ALD;
        $horsLabel = self::LABEL_HORS_ALD;
        $aldIdx = strpos($raw, $aldLabel);
        $horsIdx = strpos($raw, $horsLabel);
        if ($aldIdx === false) {
            $aldLabel = self::LABEL_ALD_PDF;
            $aldIdx = strpos($raw, $aldLabel);
        }
        if ($horsIdx === false) {
            $horsLabel = self::LABEL_HORS_ALD_PDF;
            $horsIdx = strpos($raw, $horsLabel);
        }

        if ($aldIdx === false && $horsIdx === false) {
            return ['ald' => $raw, 'hors_ald' => ''];
        }

        $extract = static function (string $label, int $start, int $end) use ($raw): string {
            $bodyStart = $start + strlen($label);
            $chunk = substr($raw, $bodyStart, max(0, $end - $bodyStart));

            return trim(ltrim($chunk, "\r\n"));
        };

        $ald = '';
        $horsAld = '';

        if ($aldIdx !== false) {
            $end = ($horsIdx !== false && $horsIdx > $aldIdx) ? $horsIdx : strlen($raw);
            $ald = $extract($aldLabel, (int) $aldIdx, $end);
        }
        if ($horsIdx !== false) {
            $horsAld = $extract($horsLabel, (int) $horsIdx, strlen($raw));
        }

        return ['ald' => $ald, 'hors_ald' => $horsAld];
    }

    public static function composeMedicalPrescriptionText(string $ald, string $horsAld): string
    {
        $parts = [];
        $ald = trim($ald);
        $horsAld = trim($horsAld);
        if ($ald !== '') {
            $parts[] = self::LABEL_ALD . "\n" . $ald;
        }
        if ($horsAld !== '') {
            $parts[] = self::LABEL_HORS_ALD . "\n" . $horsAld;
        }

        return implode("\n\n", $parts);
    }

    /**
     * @return list<array{title: string, body: string}>
     */
    public static function buildMedicalPrescriptionSections(string $ald, string $horsAld): array
    {
        $sections = [];
        $ald = trim($ald);
        $horsAld = trim($horsAld);
        if ($ald !== '') {
            $sections[] = ['title' => self::LABEL_ALD_PDF, 'body' => $ald];
        }
        if ($horsAld !== '') {
            $sections[] = ['title' => self::LABEL_HORS_ALD_PDF, 'body' => $horsAld];
        }

        return $sections;
    }

    public static function generatePrescriptionNumber(): string
    {
        return 'RX-' . AppTimezone::format('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    /**
     * @param array<string, mixed> $pdfOptions prescription_date, include_handwritten_signature
     * @return array{pdf_base64: string, file_name: string, prescription_number: string, prescription_kind: string}
     */
    public static function generatePdf(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        ?string $prescriptionNumber = null,
        array $pdfOptions = []
    ): array {
        $number = $prescriptionNumber ?: self::generatePrescriptionNumber();
        $options = array_merge([
            'kind' => $kind,
            'prescription_number' => $number,
            'signed_at' => AppTimezone::now(),
        ], $pdfOptions);

        if (!empty($options['include_handwritten_signature'])) {
            $png = PrescriptionSignature::normalizePngBase64($prescriber['prescription_signature_png'] ?? null);
            if ($png !== null) {
                $options['handwritten_signature_png'] = $png;
            }
        }

        $pdfContent = PrescriptionPdf::generate($prescriber, $patient, $prescriptionText, $options);

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
        ?string $appointmentId = null,
        ?string $prescriptionDate = null,
        bool $includeHandwrittenSignature = false,
        array $prescriptionSections = []
    ): array {
        $role = $user['role'] ?? '';

        if ($role === 'pro' && !self::isPrescriptionGenerationEnabled($db, (string) ($user['user_id'] ?? ''))) {
            return [
                'success' => false,
                'http' => 403,
                'error' => 'La génération d\'ordonnances est désactivée pour votre compte. Contactez l\'administration.',
            ];
        }

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

        if ($prescriptionDate !== null && $prescriptionDate !== '') {
            if (AppTimezone::parseDateYmd($prescriptionDate) === null) {
                return ['success' => false, 'http' => 400, 'error' => 'Date de prescription invalide (format YYYY-MM-DD attendu).'];
            }
        }

        if ($includeHandwrittenSignature) {
            $sig = PrescriptionSignature::normalizePngBase64($prescriber['prescription_signature_png'] ?? null);
            if ($sig === null) {
                return [
                    'success' => false,
                    'http' => 400,
                    'error' => 'Aucune signature manuscrite enregistrée. Signez votre ordonnance depuis votre profil ou la fenêtre de signature.',
                ];
            }
        }

        try {
            $pdfOpts = [
                'include_handwritten_signature' => $includeHandwrittenSignature,
            ];
            if ($prescriptionDate !== null && $prescriptionDate !== '') {
                $pdfOpts['prescription_date'] = $prescriptionDate;
            }
            if ($prescriptionSections !== []) {
                $pdfOpts['prescription_sections'] = $prescriptionSections;
            }
            $result = self::generatePdf($prescriber, $patient, $prescriptionText, $prescriptionKind, null, $pdfOpts);
        } catch (Throwable $e) {
            error_log('PrescriptionPdf error: ' . $e->getMessage());
            $msg = $e->getMessage();
            if (stripos($msg, 'GD') !== false || stripos($msg, 'imagecreatefromstring') !== false) {
                return [
                    'success' => false,
                    'http' => 500,
                    'error' => 'Signature PDF indisponible : extension PHP GD requise sur le serveur.',
                ];
            }

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
        $fields = self::prescriberSelectFields($db);
        $stmt = $db->prepare("SELECT {$fields} FROM profiles WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $signaturePng = '';
        if (array_key_exists('prescription_signature_encrypted', $row)
            && !empty($row['prescription_signature_encrypted'])
            && !empty($row['prescription_signature_dek'])) {
            try {
                $signaturePng = (string) $crypto->decryptField(
                    (string) $row['prescription_signature_encrypted'],
                    (string) $row['prescription_signature_dek']
                );
            } catch (Throwable $e) {
                $signaturePng = '';
            }
        }

        return [
            'first_name' => self::safeDecrypt($crypto, $row['first_name_encrypted'] ?? null, $row['first_name_dek'] ?? null),
            'last_name' => self::safeDecrypt($crypto, $row['last_name_encrypted'] ?? null, $row['last_name_dek'] ?? null),
            'title' => self::prescriberPdfTitle(
                $role,
                isset($row['emploi']) ? trim((string) $row['emploi']) : '',
            ),
            'emploi' => isset($row['emploi']) ? trim((string) $row['emploi']) : '',
            'address' => self::safeDecrypt($crypto, $row['address_encrypted'] ?? null, $row['address_dek'] ?? null) ?: null,
            'rpps' => self::safeDecrypt($crypto, $row['rpps_encrypted'] ?? null, $row['rpps_dek'] ?? null),
            'adeli' => self::safeDecrypt($crypto, $row['adeli_encrypted'] ?? null, $row['adeli_dek'] ?? null),
            'prescription_signature_png' => PrescriptionSignature::normalizePngBase64($signaturePng),
        ];
    }

    /**
     * @return array{first_name: string, last_name: string, birth_date: string, address: mixed, nir: string}
     */
    public static function loadPatient(PDO $db, Crypto $crypto, string $patientId): array
    {
        $nirSelect = '';
        try {
            $colCheck = $db->query("SHOW COLUMNS FROM profiles LIKE 'nir_encrypted'");
            if ($colCheck && $colCheck->rowCount() > 0) {
                $nirSelect = ', nir_encrypted, nir_dek';
            }
        } catch (Throwable $e) {
            $nirSelect = '';
        }

        $stmt = $db->prepare(
            'SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, birth_date_encrypted, birth_date_dek, address_encrypted, address_dek'
            . $nirSelect
            . ' FROM profiles WHERE id = ?',
        );
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $nir = '';
        if ($nirSelect !== '' && !empty($row['nir_encrypted'] ?? '') && !empty($row['nir_dek'] ?? '')) {
            $nir = trim((string) self::safeDecrypt($crypto, $row['nir_encrypted'], $row['nir_dek']));
        }

        return [
            'first_name' => self::safeDecrypt($crypto, $row['first_name_encrypted'] ?? null, $row['first_name_dek'] ?? null),
            'last_name' => self::safeDecrypt($crypto, $row['last_name_encrypted'] ?? null, $row['last_name_dek'] ?? null),
            'birth_date' => self::safeDecrypt($crypto, $row['birth_date_encrypted'] ?? null, $row['birth_date_dek'] ?? null),
            'address' => self::safeDecrypt($crypto, $row['address_encrypted'] ?? null, $row['address_dek'] ?? null) ?: null,
            'nir' => $nir,
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
     * Actes affichables pour l'historique ordonnances (lots fusionnés comme liste RDV).
     *
     * @param list<array<string, mixed>> $rows
     */
    private static function enrichPrescriptionAppointmentCareItems(PDO $db, array &$rows): void
    {
        if (empty($rows)) {
            return;
        }

        require_once __DIR__ . '/../models/Appointment.php';
        $appointmentModel = new Appointment();

        $bloodBatchStmt = $db->prepare('
            SELECT id FROM appointments
            WHERE creation_batch_id = ?
              AND patient_id = ?
              AND type = \'blood_test\'
            ORDER BY scheduled_at ASC, created_at ASC, id ASC
        ');
        $nursingBatchStmt = $db->prepare('
            SELECT id FROM appointments
            WHERE creation_batch_id = ?
              AND patient_id = ?
              AND type = \'nursing\'
            ORDER BY scheduled_at ASC, created_at ASC, id ASC
        ');
        $bloodBatchCache = [];
        $nursingBatchCache = [];

        foreach ($rows as &$row) {
            $aptId = (string) ($row['appointment_id'] ?? '');
            if ($aptId === '') {
                $row['appointment_care_items'] = [];
                continue;
            }

            $type = (string) ($row['appointment_type'] ?? '');
            $patientId = (string) ($row['patient_id'] ?? '');
            $batchId = $row['appointment_creation_batch_id'] ?? null;
            $batchCount = (int) ($row['appointment_batch_count'] ?? 0);
            $items = [];

            try {
                if ($type === 'blood_test') {
                    $pre = $appointmentModel->loadBloodTestItemsForAppointments([$aptId]);
                    $preRows = $pre[$aptId] ?? [];
                    $slices = $appointmentModel->loadBloodTestResolveSlicesById([$aptId]);
                    $slice = $slices[$aptId] ?? null;
                    if ($slice) {
                        $items = $appointmentModel->resolveBloodTestItemsForAppointment($slice, $preRows);
                    }
                    if ($batchId && $batchCount > 1 && $patientId !== '') {
                        $cacheKey = (string) $batchId . '|' . $patientId;
                        if (!array_key_exists($cacheKey, $bloodBatchCache)) {
                            $bloodBatchStmt->execute([(string) $batchId, $patientId]);
                            $bloodBatchCache[$cacheKey] = array_column(
                                $bloodBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                                'id'
                            );
                        }
                        $batchIds = $bloodBatchCache[$cacheKey];
                        if (count($batchIds) > 1) {
                            $merged = $appointmentModel->mergeBloodTestItemsAcrossBatchAppointmentIds($batchIds);
                            if (!empty($merged)) {
                                $items = $merged;
                            }
                        }
                    }
                } elseif ($type === 'nursing') {
                    $pre = $appointmentModel->loadNursingItemsForAppointments([$aptId]);
                    $preRows = $pre[$aptId] ?? [];
                    $slices = $appointmentModel->loadNursingResolveSlicesById([$aptId]);
                    $slice = $slices[$aptId] ?? null;
                    if ($slice) {
                        $items = $appointmentModel->resolveNursingItemsForAppointment($slice, $preRows);
                    }
                    if ($batchId && $batchCount > 1 && $patientId !== '') {
                        $cacheKey = (string) $batchId . '|' . $patientId;
                        if (!array_key_exists($cacheKey, $nursingBatchCache)) {
                            $nursingBatchStmt->execute([(string) $batchId, $patientId]);
                            $nursingBatchCache[$cacheKey] = array_column(
                                $nursingBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                                'id'
                            );
                        }
                        $batchIds = $nursingBatchCache[$cacheKey];
                        if (count($batchIds) > 1) {
                            $merged = $appointmentModel->mergeNursingItemsAcrossBatchAppointmentIds($batchIds);
                            if (!empty($merged)) {
                                $items = $merged;
                            }
                        }
                    }
                }
            } catch (Throwable $e) {
                error_log('prescription appointment_care_items: ' . $e->getMessage());
                $items = [];
            }

            $row['appointment_care_items'] = $items;
        }
        unset($row);
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
                a.creation_batch_id AS appointment_creation_batch_id,
                (
                    SELECT COUNT(*)
                    FROM appointments ab
                    WHERE ab.creation_batch_id = a.creation_batch_id
                      AND a.creation_batch_id IS NOT NULL
                      AND ab.creation_batch_id IS NOT NULL
                ) AS appointment_batch_count,
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

        self::enrichPrescriptionAppointmentCareItems($db, $out);

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

    /** Titre affiché devant le nom sur l'ordonnance PDF (ex. Dr pour les médecins). */
    public static function prescriberPdfTitle(string $role, ?string $emploi): string
    {
        if ($role === 'nurse') {
            return 'Infirmier(ère)';
        }

        $e = trim((string) $emploi);
        if ($e === '') {
            return 'Dr';
        }

        $lower = mb_strtolower($e, 'UTF-8');
        if (str_starts_with($lower, 'médecin') || str_starts_with($lower, 'medecin')) {
            return 'Dr';
        }

        return $e;
    }

    /** Pro : génération d'ordonnances activée (défaut oui si colonne absente). */
    public static function isPrescriptionGenerationEnabled(PDO $db, string $userId): bool
    {
        if ($userId === '') {
            return true;
        }

        try {
            $colCheck = $db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_generation_enabled'");
            if (!$colCheck || $colCheck->rowCount() === 0) {
                return true;
            }
        } catch (Throwable $e) {
            return true;
        }

        $stmt = $db->prepare('SELECT prescription_generation_enabled, role FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($row['role'] ?? '') !== 'pro') {
            return true;
        }

        return (bool) ($row['prescription_generation_enabled'] ?? true);
    }

    private static function prescriberSelectFields(PDO $db): string
    {
        $base = 'first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, address_encrypted, address_dek, rpps_encrypted, rpps_dek, adeli_encrypted, adeli_dek, emploi';
        static $withSignature = null;
        if ($withSignature === null) {
            $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_signature_encrypted'");
            $withSignature = $stmt && $stmt->rowCount() > 0;
        }

        return $withSignature
            ? $base . ', prescription_signature_encrypted, prescription_signature_dek'
            : $base;
    }
}
