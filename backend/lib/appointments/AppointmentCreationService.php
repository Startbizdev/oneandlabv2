<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../PatientUrgencyGuard.php';
require_once __DIR__ . '/../PendingOfferExpiry.php';
require_once __DIR__ . '/../AppointmentRequestFingerprint.php';
require_once __DIR__ . '/AppointmentCreationValidator.php';
require_once __DIR__ . '/AppointmentItemsResolver.php';

/**
 * Création persistée d'un rendez-vous (transaction déjà ouverte).
 */
final class AppointmentCreationService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private Logger $logger,
        private AppointmentCreationValidator $validator,
        private AppointmentItemsResolver $itemsResolver,
    ) {
    }
    public function createWithinTransaction(array $data, string $createdBy, string $createdByRole, bool $verifiedPatientPayment): string
    {
        // Validation des champs requis
        if (empty($data['type']) || !Validation::appointmentType($data['type'])) {
            throw new Exception('Type de rendez-vous invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['form_type']) || !Validation::appointmentType($data['form_type'])) {
            throw new Exception('Type de formulaire invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['address']) || !is_array($data['address'])) {
            throw new Exception('Adresse requise et doit être un tableau.');
        }

        $addr = $data['address'];
        $addrLabel = isset($addr['label']) ? trim((string) $addr['label']) : '';
        if ($addrLabel === '') {
            throw new Exception('Adresse incomplète. Le libellé est requis.');
        }

        // Ne pas utiliser empty() sur lat/lng : empty(0) est vrai en PHP alors que 0 est une coordonnée valide.
        if (!array_key_exists('lat', $addr) || !array_key_exists('lng', $addr)) {
            throw new Exception('Adresse incomplète. Requis: label, lat, lng.');
        }
        if (!is_numeric($addr['lat']) || !is_numeric($addr['lng'])) {
            throw new Exception('Adresse incomplète. lat et lng doivent être numériques.');
        }

        // Validation des coordonnées géographiques
        $lat = floatval($addr['lat']);
        $lng = floatval($addr['lng']);
        
        if (!Validation::latitude($lat)) {
            throw new Exception('Latitude invalide. Doit être entre -90 et 90.');
        }
        
        if (!Validation::longitude($lng)) {
            throw new Exception('Longitude invalide. Doit être entre -180 et 180.');
        }
        
        if (empty($data['scheduled_at'])) {
            throw new Exception('Date de rendez-vous requise.');
        }
        
        // Fuseau métier : le front envoie des dates « locales France » sans offset (formulaire public /dashboard).
        $tzParis = new DateTimeZone('Europe/Paris');
        
        // Convertir la date au format attendu (Y-m-d H:i:s)
        // Accepter plusieurs formats : ISO, datetime-local, ou format français
        $scheduledDate = null;
        $dateFormats = [
            'Y-m-d H:i:s',      // Format standard
            'Y-m-d\TH:i',       // Format datetime-local HTML5
            'Y-m-d\TH:i:s',     // Format ISO avec secondes
            'Y-m-d H:i',        // Format sans secondes
            'd/m/Y H:i',        // Format français
            'd/m/Y H:i:s',      // Format français avec secondes
        ];
        
        foreach ($dateFormats as $format) {
            $parsed = DateTime::createFromFormat($format, $data['scheduled_at'], $tzParis);
            if ($parsed && $parsed->format($format) === $data['scheduled_at']) {
                $scheduledDate = $parsed;
                break;
            }
        }
        
        // Si aucun format ne correspond : instant explicite (Z / offset) ou sinon heure locale Paris (chaîne sans fuseau)
        if (!$scheduledDate) {
            try {
                $raw = (string) $data['scheduled_at'];
                if (preg_match('/[zZ]|[+-]\d{2}:?\d{2}$/', $raw)) {
                    $scheduledDate = new DateTime($raw);
                    $scheduledDate->setTimezone($tzParis);
                } else {
                    $scheduledDate = new DateTime($raw, $tzParis);
                }
            } catch (Exception $e) {
                throw new Exception('Format de date invalide. Formats acceptés: Y-m-d H:i:s, Y-m-dTH:i, d/m/Y H:i');
            }
        }
        
        // Normaliser la date au format attendu
        $data['scheduled_at'] = $scheduledDate->format('Y-m-d H:i:s');

        $requestFingerprint = AppointmentRequestFingerprint::forInput($data);
        $duplicateId = $this->findRecentStaffDuplicate($createdBy, $data, $createdByRole);
        if ($duplicateId !== null) {
            return $duplicateId;
        }
        
        // Référence « maintenant » en heure de Paris (cohérent avec les chaînes sans fuseau)
        $now = new DateTime('now', $tzParis);
        if ($scheduledDate < $now) {
            // « Toute la journée » : le front envie souvent 00:00:00 (heure Paris) ; ce même jour à 18 h, ce timestamp
            // est techniquement « dans le passé » mais il désigne encore le jour courant → on accepte ce cas uniquement.
            // Un horaire explicite déjà passé (ex. 08:00 alors qu’il est 18:00) reste refusé ci-dessous.
            $isStartOfCalendarDay = $scheduledDate->format('H:i:s') === '00:00:00';
            $sameLocalCalendarDay = $scheduledDate->format('Y-m-d') === $now->format('Y-m-d');
            if (!($isStartOfCalendarDay && $sameLocalCalendarDay)) {
                throw new Exception('La date du rendez-vous ne peut pas être dans le passé.');
            }
        }
        
        // Validation patient_id ou guest_email
        if (empty($data['patient_id']) && empty($data['guest_email'])) {
            throw new Exception('patient_id ou guest_email requis.');
        }
        
        if (!empty($data['guest_email']) && !Validation::email($data['guest_email'])) {
            throw new Exception('Email invité invalide.');
        }

        PatientUrgencyGuard::assertPaidOrNotRequired($data, $createdByRole, $verifiedPatientPayment);
        
        // Validation category_id si présent
        if (!empty($data['category_id']) && !Validation::uuid($data['category_id'])) {
            throw new Exception('ID de catégorie invalide (format UUID requis).');
        }
        
        // Validation relative_id si présent
        if (!empty($data['relative_id']) && !Validation::uuid($data['relative_id'])) {
            throw new Exception('ID de proche invalide (format UUID requis).');
        }
        if (!empty($data['relative_id'])) {
            if (empty($data['patient_id'])) {
                throw new Exception('patient_id requis lorsque relative_id est renseigné.');
            }
            require_once __DIR__ . '/../../models/PatientRelative.php';
            $relativeModel = new PatientRelative();
            $relativeRow = $relativeModel->getById((string) $data['relative_id'], (string) $data['patient_id']);
            if ($relativeRow === null) {
                throw new Exception('Proche introuvable ou non rattaché à ce patient.');
            }
        }
        
        $status = 'pending';
        if (!empty($data['status']) && Validation::appointmentStatus($data['status'])) {
            $status = $data['status'];
        }
        
        $id = $this->generateUUID();
        $bloodTestItems = $this->itemsResolver->normalizeBloodTestItems($data);
        if (($data['type'] ?? '') === 'blood_test') {
            error_log(sprintf(
                '[appointments] blood_test create normalized_items=%d table_appointment_blood_test_items=%s appointment_id=%s',
                count($bloodTestItems),
                $this->hasTable('appointment_blood_test_items') ? '1' : '0',
                $id
            ));
        }
        if (($data['type'] ?? '') === 'blood_test' && empty($data['category_id']) && !empty($bloodTestItems[0]['category_id'])) {
            $data['category_id'] = $bloodTestItems[0]['category_id'];
        }

        $nursingItems = $this->itemsResolver->normalizeNursingItems($data);
        if (($data['type'] ?? '') === 'nursing') {
            error_log(sprintf(
                '[appointments] nursing create normalized_items=%d table_appointment_nursing_items=%s',
                count($nursingItems),
                $this->hasTable('appointment_nursing_items') ? '1' : '0'
            ));
            if (!isset($data['form_data']) || !is_array($data['form_data'])) {
                $data['form_data'] = [];
            }
            if (!empty($nursingItems)) {
                $data['form_data']['nursing_items'] = array_values(array_map(static function ($it) {
                    return [
                        'category_id' => $it['category_id'] ?? null,
                        'label' => $it['label'] ?? null,
                        'care_options' => isset($it['care_options']) && is_array($it['care_options']) ? $it['care_options'] : [],
                        'sort_order' => (int) ($it['sort_order'] ?? 0),
                    ];
                }, $nursingItems));
            }
            if (count($nursingItems) > 1 && isset($data['form_data']['care_options'])) {
                unset($data['form_data']['care_options']);
            }
            if (empty($data['category_id']) && !empty($nursingItems[0]['category_id'])) {
                $data['category_id'] = $nursingItems[0]['category_id'];
            }
        }

        $this->applyBloodTestLabPreference($data, $createdByRole);

        $creationBatchId = null;
        if (!empty($data['creation_batch_id']) && Validation::uuid((string) $data['creation_batch_id'])) {
            $creationBatchId = (string) $data['creation_batch_id'];
        }
        
        // Chiffrer l'adresse
        $addressEncrypted = $this->crypto->encryptField($data['address']['label']);
        
        // Server-owned marker: different relatives, acts, options and batches must never collapse.
        $data['form_data'][AppointmentRequestFingerprint::FIELD] = $requestFingerprint;
        // Chiffrer les données du formulaire (JSON)
        $formDataJson = json_encode($data['form_data'] ?? []);
        $formDataEncrypted = $this->crypto->encryptField($formDataJson);
        
        // Générer token guest si nécessaire
        $guestToken = null;
        $guestEmailEncrypted = null;
        $guestEmailDek = null;
        
        if (empty($data['patient_id']) && !empty($data['guest_email'])) {
            $guestToken = bin2hex(random_bytes(32));
            $guestEmailData = $this->crypto->encryptField($data['guest_email']);
            $guestEmailEncrypted = $guestEmailData['encrypted'];
            $guestEmailDek = $guestEmailData['dek'];
        }
        
        $assignedLabId = null;
        $assignedNurseId = null;
        $assignedTo = null;
        $assignedProId = !empty($data['assigned_pro_id']) ? (string) $data['assigned_pro_id'] : null;
        $attributionQrId = !empty($data['attribution_qr_id']) ? (string) $data['attribution_qr_id'] : null;
        if (!empty($data['type'])) {
            if ($data['type'] === 'blood_test') {
                if (!empty($data['assigned_lab_id'])) {
                    $assignedLabId = $data['assigned_lab_id'];
                }
                if (!empty($data['assigned_to'])) {
                    $assignedTo = $data['assigned_to'];
                }
            }
            if (($data['type'] === 'nursing') && !empty($data['assigned_nurse_id'])) {
                $assignedNurseId = $data['assigned_nurse_id'];
            }
        }

        // Lab / sous-compte sans assigned_lab_id dans le body : assigner au créateur (sinon INSERT NULL + dispatch géo envoie mail à tous les sous-comptes de la zone)
        if (($data['type'] ?? '') === 'blood_test' && in_array($createdByRole, ['lab', 'subaccount'], true) && empty($assignedLabId)) {
            $assignedLabId = $createdBy;
        }
        
        // Nurse crée un RDV nursing : confirmé, assigné à lui-même, pas de dispatch
        if ($createdByRole === 'nurse' && ($data['type'] ?? '') === 'nursing') {
            $status = 'confirmed';
            $assignedNurseId = $createdBy;
        }

        // Patient / invité réserve chez un infirmier identifié (QR, fiche publique) : confirmé directement
        if (
            ($data['type'] ?? '') === 'nursing'
            && !empty($assignedNurseId)
            && $createdByRole !== 'nurse'
        ) {
            $status = 'confirmed';
        }

        // Validation paramètres lab pour RDV prise de sang (création par pro ou assignation à un lab)
        if ($data['type'] === 'blood_test') {
            $effectiveLabId = $assignedLabId;
            if (!$effectiveLabId && in_array($createdByRole, ['lab', 'subaccount'], true)) {
                $effectiveLabId = $createdBy;
            }
            if ($effectiveLabId) {
                $skipLabLeadTime = in_array($createdByRole, ['nurse', 'lab', 'subaccount', 'preleveur', 'pro', 'super_admin'], true);
                $this->validator->validateLabAppointmentParams($effectiveLabId, $data['scheduled_at'], $scheduledDate, $skipLabLeadTime);
            }
        }

        // Lab / sous-compte : prise de sang assignée au créateur → confirmé (pas de file pending / popup dashboard)
        if (
            in_array($createdByRole, ['lab', 'subaccount'], true)
            && ($data['type'] ?? '') === 'blood_test'
            && !empty($assignedLabId)
            && $assignedLabId === $createdBy
        ) {
            $status = 'confirmed';
        }

        $pendingOfferExpiresAt = null;
        if ($this->hasColumn('appointments', 'pending_offer_expires_at')) {
            $expires = PendingOfferExpiry::computeExpiresAtForRow([
                'status' => $status,
                'type' => (string) ($data['type'] ?? ''),
                'assigned_nurse_id' => $assignedNurseId,
                'assigned_lab_id' => $assignedLabId,
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            if ($expires !== null) {
                $pendingOfferExpiresAt = PendingOfferExpiry::formatSqlDateTime($expires);
            }
        }

        $insertFields = '
                id, creation_batch_id, type, status, patient_id, relative_id, created_by, created_by_role,
                category_id, form_type,
                location_lat, location_lng,
                address_encrypted, address_dek,
                form_data_encrypted, form_data_dek,
                guest_token, guest_email_encrypted, guest_email_dek,
                scheduled_at,
                assigned_lab_id, assigned_nurse_id, assigned_to, attribution_qr_id, assigned_pro_id,
                lab_preference_mode, preferred_lab_brand_id';
        $insertParams = [
            $id,
            $creationBatchId,
            $data['type'],
            $status,
            $data['patient_id'] ?? null,
            $data['relative_id'] ?? null,
            $createdBy,
            $createdByRole,
            $data['category_id'] ?? null,
            $data['form_type'],
            $data['address']['lat'],
            $data['address']['lng'],
            $addressEncrypted['encrypted'],
            $addressEncrypted['dek'],
            $formDataEncrypted['encrypted'],
            $formDataEncrypted['dek'],
            $guestToken ? hash('sha256', $guestToken) : null,
            $guestEmailEncrypted,
            $guestEmailDek,
            $data['scheduled_at'],
            $assignedLabId,
            $assignedNurseId,
            $assignedTo,
            $attributionQrId,
            $assignedProId,
            $data['lab_preference_mode'] ?? null,
            $data['preferred_lab_brand_id'] ?? null,
        ];
        if ($pendingOfferExpiresAt !== null) {
            $insertFields .= ', pending_offer_expires_at';
            $insertParams[] = $pendingOfferExpiresAt;
        }
        $insertFields .= ', created_at, updated_at';
        $insertPlaceholders = implode(', ', array_fill(0, count($insertParams), '?')) . ', NOW(), NOW()';

        $stmt = $this->db->prepare('INSERT INTO appointments (' . $insertFields . ') VALUES (' . $insertPlaceholders . ')');
        $stmt->execute($insertParams);

        if (($data['type'] ?? '') === 'blood_test') {
            $this->itemsResolver->insertBloodTestItems($id, $bloodTestItems);
        }
        if (($data['type'] ?? '') === 'nursing') {
            $this->itemsResolver->insertNursingItems($id, $nursingItems);
        }
        
        // Logger la création
        $this->logger->log(
            $createdBy,
            $createdByRole,
            'create',
            'appointment',
            $id,
            ['type' => $data['type'], 'status' => $status]
        );
        
        // Dispatch et notifications sont exécutés après l'envoi de la réponse HTTP (voir API POST /appointments) pour éviter timeout
        return $id;
    }

    /**
     * Reprise staff < 45 s : seules les demandes complètes identiques sont réutilisées.
     */
    public function findRecentStaffDuplicate(string $createdBy, array $data, string $createdByRole): ?string
    {
        if (!in_array($createdByRole, ['pro', 'nurse', 'lab', 'subaccount', 'super_admin', 'preleveur'], true)) {
            return null;
        }
        $patientId = trim((string) ($data['patient_id'] ?? ''));
        $scheduledAt = trim((string) ($data['scheduled_at'] ?? ''));
        $type = trim((string) ($data['type'] ?? ''));
        if ($patientId === '' || $scheduledAt === '' || $type === '') {
            return null;
        }

        $stmt = $this->db->prepare("
            SELECT id, form_data_encrypted, form_data_dek FROM appointments
            WHERE created_by = ?
              AND patient_id = ?
              AND type = ?
              AND scheduled_at = ?
              AND status NOT IN ('canceled', 'refused', 'expired')
              AND created_at >= DATE_SUB(NOW(), INTERVAL 45 SECOND)
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $stmt->execute([$createdBy, $patientId, $type, $scheduledAt]);
        $fingerprint = AppointmentRequestFingerprint::forInput($data);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            try {
                if (empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) continue;
                $json = $this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
                $fields = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
                $stored = is_array($fields) ? ($fields[AppointmentRequestFingerprint::FIELD] ?? null) : null;
                if (is_string($stored) && hash_equals($stored, $fingerprint)) return (string) $row['id'];
            } catch (Throwable $error) {
                // An unreadable historical record cannot prove an identical request.
                continue;
            }
        }
        return null;
    }

    /**
     * Préférence labo patient (prélèvement) : relation Cary ou marque choisie sans dispatch zone.
     *
     * @param array<string, mixed> $data
     */
    private function applyBloodTestLabPreference(array &$data, string $createdByRole): void
    {
        if (($data['type'] ?? '') !== 'blood_test') {
            return;
        }
        if (!empty($data['assigned_lab_id'])) {
            return;
        }
        if (!$this->hasColumn('appointments', 'lab_preference_mode')) {
            return;
        }

        if (!isset($data['form_data']) || !is_array($data['form_data'])) {
            $data['form_data'] = [];
        }

        $mode = $data['lab_preference_mode'] ?? ($data['form_data']['lab_preference_mode'] ?? 'platform_match');
        if (!in_array($mode, ['platform_match', 'brand_choice'], true)) {
            throw new Exception('Mode de préférence laboratoire invalide.');
        }

        $data['lab_preference_mode'] = $mode;
        $data['form_data']['lab_preference_mode'] = $mode;

        if ($mode !== 'brand_choice') {
            $data['preferred_lab_brand_id'] = null;
            unset($data['form_data']['preferred_lab_brand_id'], $data['form_data']['preferred_lab_brand_name']);
            return;
        }

        $brandId = $data['preferred_lab_brand_id'] ?? ($data['form_data']['preferred_lab_brand_id'] ?? null);
        if (empty($brandId) || !Validation::uuid((string) $brandId)) {
            throw new Exception('Veuillez choisir une marque de laboratoire.');
        }

        require_once __DIR__ . '/../../models/LabBrand.php';
        $brand = (new LabBrand($this->db))->getActiveById((string) $brandId);
        if ($brand === null) {
            throw new Exception('Marque de laboratoire invalide ou inactive.');
        }

        $data['preferred_lab_brand_id'] = (string) $brandId;
        $data['form_data']['preferred_lab_brand_id'] = (string) $brandId;
        $data['form_data']['preferred_lab_brand_name'] = (string) ($brand['name'] ?? '');
    }

    /**
     * Métadonnées des options de soin (libellés + map valeur→libellé) pour emails, etc.
     *
     * @return array<string, array{label: string, valueLabels: array<string,string>}>
     */
    public function fetchCareCategoryOptionMeta(?string $categoryId): array
    {
        if ($categoryId === null || $categoryId === '' || !Validation::uuid($categoryId)) {
            return [];
        }
        try {
            $stmt = $this->db->prepare(
                'SELECT option_key, label, options FROM care_category_options WHERE care_category_id = ? ORDER BY sort_order ASC'
            );
            $stmt->execute([$categoryId]);
            $out = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $valueLabels = [];
                if (!empty($row['options'])) {
                    $decoded = json_decode((string) $row['options'], true);
                    if (is_array($decoded)) {
                        foreach ($decoded as $o) {
                            if (is_array($o) && isset($o['value'], $o['label'])) {
                                $valueLabels[(string) $o['value']] = (string) $o['label'];
                            }
                        }
                    }
                }
                $out[(string) $row['option_key']] = [
                    'label' => (string) $row['label'],
                    'valueLabels' => $valueLabels,
                ];
            }
            return $out;
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * Génère un UUID v4
     */
    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }


    private function hasColumn(string $table, string $column): bool
    {
        static $cache = [];
        $key = $table . '.' . $column;
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            ');
            $stmt->execute([$table, $column]);
            $cache[$key] = ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            $cache[$key] = false;
        }
        return $cache[$key];
    }


    private function hasTable(string $table): bool
    {
        static $cache = [];
        if (array_key_exists($table, $cache)) {
            return $cache[$table];
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ');
            $stmt->execute([$table]);
            $cache[$table] = ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            $cache[$table] = false;
        }
        return $cache[$table];
    }

}
