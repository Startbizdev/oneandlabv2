<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/DbSchemaCache.php';
require_once __DIR__ . '/../lib/users/bootstrap.php';

/**
 * Modèle User (profiles)
 */

class User
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;
    private ?UserBatchLookup $batchLookup = null;
    private ?UserIdentityLookup $identityLookup = null;
    private ?PatientProfessionalAccessService $patientAccess = null;
    private ?UserDirectoryQuery $directoryQuery = null;

    // Rôles autorisés (doit correspondre à l'ENUM de la base de données)
    private const ALLOWED_ROLES = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];

    // Réglages d'officine modifiables uniquement par la pharmacie elle-même (ou un super admin)
    private const PHARMACY_OPERATION_FIELDS = [
        'pharmacy_accepts_click_collect',
        'pharmacy_accepts_home_delivery',
        'pharmacy_orders_paused',
        'pharmacy_click_collect_days_json',
        'pharmacy_home_delivery_days_json',
    ];

    public function __construct(?PDO $db = null)
    {
        $config = require __DIR__ . '/../config/database.php';
        
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        
        $this->db = $db ?? new PDO($dsn, $config['username'], $config['password'], $config['options']);
        $this->crypto = new Crypto();
        $this->logger = new Logger();
    }

    private function batchLookup(): UserBatchLookup
    {
        if ($this->batchLookup === null) {
            $this->batchLookup = new UserBatchLookup($this->db, $this->crypto);
        }
        return $this->batchLookup;
    }

    private function identityLookup(): UserIdentityLookup
    {
        if ($this->identityLookup === null) {
            $this->identityLookup = new UserIdentityLookup($this->db);
        }
        return $this->identityLookup;
    }

    private function patientAccess(): PatientProfessionalAccessService
    {
        if ($this->patientAccess === null) {
            $this->patientAccess = new PatientProfessionalAccessService($this->db);
        }
        return $this->patientAccess;
    }

    private function directoryQuery(): UserDirectoryQuery
    {
        if ($this->directoryQuery === null) {
            $this->directoryQuery = new UserDirectoryQuery(
                $this->db,
                $this->crypto,
                $this->logger,
                $this->patientAccess()
            );
        }
        return $this->directoryQuery;
    }

    /**
     * Crée un nouvel utilisateur
     */
    public function create(array $data, string $actorId, string $actorRole): string
    {
        $id = $this->generateUUID();
        $role = $data['role'] ?? 'patient';
        
        // Valider et normaliser le rôle pour correspondre à l'ENUM
        $role = trim((string)$role); // Nettoyer et caster en string

        // Valeur par défaut si le rôle est vide ou invalide
        if (empty($role) || !in_array($role, self::ALLOWED_ROLES, true)) {
            $role = 'patient'; // Valeur par défaut sécurisée
        }

        // Vérification finale
        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            throw new Exception('Rôle invalide: ' . $role . '. Rôles autorisés: ' . implode(', ', self::ALLOWED_ROLES));
        }

        // Pro / infirmier / lab / sous-compte / préleveur / admin : email patient optionnel → email technique stable
        if ($role === 'patient' && in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'], true)) {
            $emailRaw = isset($data['email']) ? trim((string) $data['email']) : '';
            if ($emailRaw === '') {
                $data['email'] = $this->buildStableDelegatedPatientEmail($actorId, $data);
                $dupHash = hash('sha256', strtolower($data['email']));
                $existingId = $this->findPatientIdByEmailHash($dupHash);
                if ($existingId !== null && $this->patientDelegatedProfileMatchesProfessional($existingId, $actorId)) {
                    return $existingId;
                }
            } else {
                $dupHash = hash('sha256', strtolower($emailRaw));
                $existingPatientId = $this->findPatientIdByEmailHash($dupHash);
                if ($existingPatientId !== null && $this->patientDelegatedProfileMatchesProfessional($existingPatientId, $actorId)) {
                    return $existingPatientId;
                }
                $existingProfile = $this->findProfileByEmailHash($dupHash);
                if ($existingProfile !== null) {
                    // Email déjà pris (compte staff ou patient d'un autre pro) → email technique déterministe
                    $data['email'] = $this->buildStableDelegatedPatientEmail($actorId, $data);
                    $dupHash = hash('sha256', strtolower($data['email']));
                    $existingId = $this->findPatientIdByEmailHash($dupHash);
                    if ($existingId !== null && $this->patientDelegatedProfileMatchesProfessional($existingId, $actorId)) {
                        return $existingId;
                    }
                }
            }
        }
        
        // Chiffrer les champs PII
        $emailEncrypted = $this->crypto->encryptField($data['email']);
        $firstNameEncrypted = $this->crypto->encryptField($data['first_name']);
        $lastNameEncrypted = $this->crypto->encryptField($data['last_name']);
        
        $phoneEncrypted = null;
        $phoneDek = null;
        if (!empty($data['phone'])) {
            $phoneData = $this->crypto->encryptField($data['phone']);
            $phoneEncrypted = $phoneData['encrypted'];
            $phoneDek = $phoneData['dek'];
        }

        $phoneDigitsHashInsert = null;
        if (
            $this->hasPhoneDigitsHashColumn()
            && $role === 'patient'
            && !empty($data['phone'])
        ) {
            $normDigits = self::normalizeFrenchPatientPhoneDigits((string) $data['phone']);
            $phoneDigitsHashInsert = $normDigits !== null ? self::patientPhoneDigitsHash($normDigits) : null;
        }
        
        $emailHash = hash('sha256', strtolower($data['email']));
        
        $labId = null;
        if (in_array($role, ['subaccount', 'preleveur'], true) && !empty($data['lab_id'])) {
            $labId = $data['lab_id'];
        }
        
        $hasLabId = $this->hasLabIdColumn();
        $hasCompanyName = $this->hasCompanyNameColumn();
        $companyName = null;
        if (in_array($role, ['lab', 'subaccount'], true) && !empty(trim((string)($data['company_name'] ?? '')))) {
            $companyName = trim((string)$data['company_name']);
        }
        $insertFields = 'id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, phone_encrypted, phone_dek, created_at, updated_at';
        $insertPlaceholders = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()';
        $insertParams = [$id, $role, $emailEncrypted['encrypted'], $emailEncrypted['dek'], $emailHash, $firstNameEncrypted['encrypted'], $firstNameEncrypted['dek'], $lastNameEncrypted['encrypted'], $lastNameEncrypted['dek'], $phoneEncrypted, $phoneDek];

        if ($this->hasPhoneDigitsHashColumn()) {
            $insertFields .= ', phone_digits_hash';
            $insertPlaceholders .= ', ?';
            $insertParams[] = $phoneDigitsHashInsert;
        }

        // Patient créé par un pro, nurse ou super_admin : lien created_by
        $createdBy = null;
        if (($role === 'patient') && !empty($data['created_by']) && in_array($actorRole, ['pro', 'nurse', 'super_admin', 'lab', 'subaccount', 'preleveur'], true)) {
            $createdBy = $data['created_by'];
        }
        if ($this->hasCreatedByColumn() && $createdBy) {
            $insertFields .= ', created_by';
            $insertPlaceholders .= ', ?';
            $insertParams[] = $createdBy;
        }
        
        if ($hasLabId && $labId) {
            $insertFields .= ', lab_id';
            $insertPlaceholders .= ', ?';
            $insertParams[] = $labId;
        }
        if ($hasCompanyName && $companyName !== null) {
            $companyEnc = $this->crypto->encryptField($companyName);
            $insertFields .= ', company_name_encrypted, company_name_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $companyEnc['encrypted'];
            $insertParams[] = $companyEnc['dek'];
        }
        // Patient : date de naissance, genre, adresse (inscription complète)
        if ($role === 'patient' && !empty(trim((string)($data['birth_date'] ?? '')))) {
            $birthDateEnc = $this->crypto->encryptField(trim((string)$data['birth_date']));
            $insertFields .= ', birth_date_encrypted, birth_date_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $birthDateEnc['encrypted'];
            $insertParams[] = $birthDateEnc['dek'];
        }
        if ($role === 'patient' && $this->hasNirColumn() && !empty(trim((string)($data['nir'] ?? '')))) {
            $nirEnc = $this->crypto->encryptField(trim((string) $data['nir']));
            $insertFields .= ', nir_encrypted, nir_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $nirEnc['encrypted'];
            $insertParams[] = $nirEnc['dek'];
        }
        if ($role === 'patient' && !empty(trim((string)($data['gender'] ?? '')))) {
            $genderEnc = $this->crypto->encryptField(trim((string)$data['gender']));
            $insertFields .= ', gender_encrypted, gender_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $genderEnc['encrypted'];
            $insertParams[] = $genderEnc['dek'];
        }
        // Infirmier : genre pour le dispatch (préférence patient femme/homme)
        if ($role === 'nurse' && !empty(trim((string)($data['gender'] ?? '')))) {
            $g = strtolower(trim((string)$data['gender']));
            if (in_array($g, ['male', 'female', 'other'], true)) {
                $genderEnc = $this->crypto->encryptField($g);
                $insertFields .= ', gender_encrypted, gender_dek';
                $insertPlaceholders .= ', ?, ?';
                $insertParams[] = $genderEnc['encrypted'];
                $insertParams[] = $genderEnc['dek'];
            }
        }
        $rolesWithAddress = ['patient', 'nurse', 'lab', 'subaccount'];
        if (in_array($role, $rolesWithAddress, true) && !empty($data['address']) && is_array($data['address'])) {
            $addressJson = json_encode($data['address']);
            $addressEnc = $this->crypto->encryptField($addressJson);
            $insertFields .= ', address_encrypted, address_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $addressEnc['encrypted'];
            $insertParams[] = $addressEnc['dek'];
            if ($this->hasCityPlainColumn()) {
                $city = $this->extractCityFromAddress($data['address']);
                if ($city !== null) {
                    $insertFields .= ', city_plain';
                    $insertPlaceholders .= ', ?';
                    $insertParams[] = $city;
                }
            }
        }
        // Pro : RPPS, Adeli (IPA) et emploi (lors de la création depuis une demande d'inscription)
        if ($role === 'pro') {
            require_once __DIR__ . '/../lib/ProfessionalId.php';
            $rawId = ProfessionalId::fromRequestBody($data);
            if ($rawId !== '') {
                $split = ProfessionalId::split($rawId);
                if (!empty($split['rpps'])) {
                    $rppsEnc = $this->crypto->encryptField($split['rpps']);
                    $insertFields .= ', rpps_encrypted, rpps_dek';
                    $insertPlaceholders .= ', ?, ?';
                    $insertParams[] = $rppsEnc['encrypted'];
                    $insertParams[] = $rppsEnc['dek'];
                }
                if ($this->hasAdeliColumn() && !empty($split['adeli'])) {
                    $adeliEnc = $this->crypto->encryptField($split['adeli']);
                    $insertFields .= ', adeli_encrypted, adeli_dek';
                    $insertPlaceholders .= ', ?, ?';
                    $insertParams[] = $adeliEnc['encrypted'];
                    $insertParams[] = $adeliEnc['dek'];
                }
            } elseif ($this->hasAdeliColumn() && !empty(trim((string)($data['adeli'] ?? '')))) {
                $adeliEnc = $this->crypto->encryptField(trim((string)$data['adeli']));
                $insertFields .= ', adeli_encrypted, adeli_dek';
                $insertPlaceholders .= ', ?, ?';
                $insertParams[] = $adeliEnc['encrypted'];
                $insertParams[] = $adeliEnc['dek'];
            }
        }
        if ($role === 'pro' && $this->hasEmploiColumn() && !empty(trim((string)($data['emploi'] ?? '')))) {
            $emploiVal = trim((string)$data['emploi']);
            if (strlen($emploiVal) > 120) $emploiVal = substr($emploiVal, 0, 120);
            $insertFields .= ', emploi';
            $insertPlaceholders .= ', ?';
            $insertParams[] = $emploiVal;
        }
        // Infirmier : RPPS ou Adeli (un seul identifiant)
        if ($role === 'nurse') {
            require_once __DIR__ . '/../lib/ProfessionalId.php';
            $rawId = ProfessionalId::fromRequestBody($data);
            if ($rawId !== '') {
                $split = ProfessionalId::split($rawId);
                if (!empty($split['rpps'])) {
                    $rppsEnc = $this->crypto->encryptField($split['rpps']);
                    $insertFields .= ', rpps_encrypted, rpps_dek';
                    $insertPlaceholders .= ', ?, ?';
                    $insertParams[] = $rppsEnc['encrypted'];
                    $insertParams[] = $rppsEnc['dek'];
                }
                if ($this->hasAdeliColumn() && !empty($split['adeli'])) {
                    $adeliEnc = $this->crypto->encryptField($split['adeli']);
                    $insertFields .= ', adeli_encrypted, adeli_dek';
                    $insertPlaceholders .= ', ?, ?';
                    $insertParams[] = $adeliEnc['encrypted'];
                    $insertParams[] = $adeliEnc['dek'];
                }
            }
        }
        
        $stmt = $this->db->prepare("INSERT INTO profiles ($insertFields) VALUES ($insertPlaceholders)");
        
        try {
            $stmt->execute($insertParams);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062 && str_contains((string) ($e->errorInfo[2] ?? ''), 'uq_profiles_email_hash')) {
                throw new EmailAlreadyUsed($e);
            }
            throw $e;
        }

        if ($role === 'patient' && $this->hasPatientProfessionalAccessTable() && in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
            try {
                $this->patientAccess()->linkPatientProfessional($id, $actorId, null, 'created');
            } catch (Throwable $e) {
                error_log('PatientProfessionalAccess (created): ' . $e->getMessage());
            }
        }
        
        // Logger la création
        $this->logger->log(
            $actorId,
            $actorRole,
            'create',
            'profile',
            $id,
            ['role' => $role]
        );

        if (in_array($role, ['nurse', 'lab', 'subaccount', 'pro'], true)) {
            try {
                require_once __DIR__ . '/../lib/QrCodeService.php';
                (new QrCodeService())->ensureForProfile($id);
            } catch (Throwable $e) {
                error_log('QrCodeService ensureForProfile: ' . $e->getMessage());
            }
        }

        if (
            $role === 'patient'
            && $actorId === 'system'
            && $actorRole === 'system'
            && !str_ends_with(strtolower((string) ($data['email'] ?? '')), '@patients.internal.local')
        ) {
            try {
                require_once __DIR__ . '/../lib/AdminEmailNotifier.php';
                AdminEmailNotifier::patientRegistered($id, $data);
            } catch (Throwable $e) {
                error_log('User create admin email (patient): ' . $e->getMessage());
            }
        } elseif ($actorRole === 'super_admin' && $actorId !== 'system') {
            try {
                require_once __DIR__ . '/../lib/AdminEmailNotifier.php';
                AdminEmailNotifier::userCreatedByAdmin($id, $role, $data);
            } catch (Throwable $e) {
                error_log('User create admin email (admin): ' . $e->getMessage());
            }
        }
        
        return $id;
    }

    /**
     * Récupère un utilisateur par ID (avec déchiffrement)
     */
    /**
     * Rôle actuel en base (le JWT ne reflète pas un changement de rôle tant que l’utilisateur ne se reconnecte pas).
     */
    public function getRoleById(string $id): ?string
    {
        $stmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row && isset($row['role']) ? (string) $row['role'] : null;
    }

    /**
     * @param 'full'|'mobile' $scope mobile = champs session / liste (sans RPPS, SIRET, ADELI, etc.)
     */
    public function getById(string $id, string $requesterId, string $requesterRole, string $scope = 'full'): ?array
    {
        $lightScope = $scope === 'mobile';
        $stmt = $this->db->prepare('SELECT * FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        
        if (!$user) {
            return null;
        }
        
        // Déchiffrer les champs
        $decryptedFields = [];
        
        try {
            // Vérifier que les champs obligatoires existent et ne sont pas vides
            if (empty($user['email_encrypted']) || empty($user['email_dek'])) {
                throw new Exception('Champ email manquant ou invalide');
            }
            $user['email'] = $this->crypto->decryptField($user['email_encrypted'], $user['email_dek']);
            $decryptedFields[] = 'email';
            
            if (empty($user['first_name_encrypted']) || empty($user['first_name_dek'])) {
                $user['first_name'] = '';
            } else {
                $user['first_name'] = $this->crypto->decryptField($user['first_name_encrypted'], $user['first_name_dek']);
            }
            $decryptedFields[] = 'first_name';
            
            if (empty($user['last_name_encrypted']) || empty($user['last_name_dek'])) {
                $user['last_name'] = '';
            } else {
                $user['last_name'] = $this->crypto->decryptField($user['last_name_encrypted'], $user['last_name_dek']);
            }
            $decryptedFields[] = 'last_name';
            
            if ($user['phone_encrypted']) {
                $user['phone'] = $this->crypto->decryptField($user['phone_encrypted'], $user['phone_dek']);
                $decryptedFields[] = 'phone';
            } else {
                $user['phone'] = null;
            }
            
            if ($user['address_encrypted']) {
                $addressJson = $this->crypto->decryptField($user['address_encrypted'], $user['address_dek']);
                $decoded = json_decode($addressJson, true);
                // Données migrées : adresse stockée en string, pas en JSON → convertir en {label: string}
                if ($decoded === null && is_string($addressJson) && trim($addressJson) !== '') {
                    $user['address'] = ['label' => trim($addressJson)];
                } else {
                    $user['address'] = $decoded;
                }
                $decryptedFields[] = 'address';
            } else {
                $user['address'] = null;
            }
            
            if ($user['gender_encrypted']) {
                $user['gender'] = $this->crypto->decryptField($user['gender_encrypted'], $user['gender_dek']);
                $decryptedFields[] = 'gender';
            } else {
                $user['gender'] = null;
            }
            
            if ($user['birth_date_encrypted']) {
                $user['birth_date'] = $this->crypto->decryptField($user['birth_date_encrypted'], $user['birth_date_dek']);
                $decryptedFields[] = 'birth_date';
            } else {
                $user['birth_date'] = null;
            }

            if ($this->hasNirColumn() && !empty($user['nir_encrypted'] ?? '') && !empty($user['nir_dek'] ?? '')) {
                $user['nir'] = $this->crypto->decryptField($user['nir_encrypted'], $user['nir_dek']);
                $decryptedFields[] = 'nir';
            } else {
                $user['nir'] = null;
            }
            
            if (!$lightScope) {
                if ($user['rpps_encrypted']) {
                    $user['rpps'] = $this->crypto->decryptField($user['rpps_encrypted'], $user['rpps_dek']);
                    $decryptedFields[] = 'rpps';
                }

                if ($this->hasCompanyNameColumn() && !empty($user['company_name_encrypted'] ?? '') && !empty($user['company_name_dek'] ?? '')) {
                    $user['company_name'] = $this->crypto->decryptField($user['company_name_encrypted'], $user['company_name_dek']);
                    $decryptedFields[] = 'company_name';
                } else {
                    $user['company_name'] = null;
                }

                if ($this->hasSiretColumn() && !empty($user['siret_encrypted'] ?? '') && !empty($user['siret_dek'] ?? '')) {
                    $user['siret'] = $this->crypto->decryptField($user['siret_encrypted'], $user['siret_dek']);
                    $decryptedFields[] = 'siret';
                } else {
                    $user['siret'] = null;
                }

                if ($this->hasAdeliColumn() && !empty($user['adeli_encrypted'] ?? '') && !empty($user['adeli_dek'] ?? '')) {
                    $user['adeli'] = $this->crypto->decryptField($user['adeli_encrypted'], $user['adeli_dek']);
                    $decryptedFields[] = 'adeli';
                } else {
                    $user['adeli'] = null;
                }
                if ($this->hasEmploiColumn() && array_key_exists('emploi', $user)) {
                    $user['emploi'] = $user['emploi'] !== null ? trim((string) $user['emploi']) : null;
                } else {
                    $user['emploi'] = null;
                }
            } else {
                $user['rpps'] = null;
                $user['company_name'] = null;
                $user['siret'] = null;
                $user['adeli'] = null;
                $user['emploi'] = null;
            }

            if (
                $this->hasPrescriptionSignatureColumn()
                && $requesterId === $id
                && in_array($user['role'] ?? '', ['pro', 'nurse'], true)
            ) {
                if (!empty($user['prescription_signature_encrypted']) && !empty($user['prescription_signature_dek'])) {
                    require_once __DIR__ . '/../lib/PrescriptionSignature.php';
                    $user['prescription_signature_png'] = PrescriptionSignature::normalizePngBase64(
                        (string) $this->crypto->decryptField(
                            (string) $user['prescription_signature_encrypted'],
                            (string) $user['prescription_signature_dek']
                        )
                    );
                } else {
                    $user['prescription_signature_png'] = null;
                }
            }
            
            // Logger le déchiffrement (obligatoire HDS)
            $this->logger->logDecrypt(
                $requesterId,
                $requesterRole,
                'profile',
                $id,
                array_fill_keys($decryptedFields, true)
            );
        } catch (Exception $e) {
            error_log('Erreur déchiffrement User::getById: ' . $e->getMessage());
            error_log('User ID: ' . $id);
            error_log('Champs déchiffrés: ' . implode(', ', $decryptedFields));
            throw new Exception('Erreur lors du déchiffrement des données: ' . $e->getMessage());
        }
        
        // Nettoyer les champs chiffrés de la réponse
        unset($user['email_encrypted'], $user['email_dek']);
        unset($user['first_name_encrypted'], $user['first_name_dek']);
        unset($user['last_name_encrypted'], $user['last_name_dek']);
        unset($user['phone_encrypted'], $user['phone_dek']);
        unset($user['address_encrypted'], $user['address_dek']);
        unset($user['gender_encrypted'], $user['gender_dek']);
        unset($user['birth_date_encrypted'], $user['birth_date_dek']);
        if (array_key_exists('nir_encrypted', $user)) {
            unset($user['nir_encrypted'], $user['nir_dek']);
        }
        unset($user['rpps_encrypted'], $user['rpps_dek']);
        unset($user['prescription_signature_encrypted'], $user['prescription_signature_dek']);
        unset($user['email_hash']);
        if ($this->hasPasswordColumn()) {
            $flags = $this->getPasswordFlagsForUser($id);
            $user['has_password'] = $flags['has_password'];
            $user['must_change_password'] = $flags['must_change_password'];
        } else {
            $user['has_password'] = false;
            $user['must_change_password'] = false;
        }
        if (array_key_exists('password_hash', $user)) {
            unset($user['password_hash']);
        }
        if (array_key_exists('password_set_at', $user)) {
            unset($user['password_set_at']);
        }
        if (array_key_exists('company_name_encrypted', $user)) {
            unset($user['company_name_encrypted'], $user['company_name_dek']);
        }
        if (array_key_exists('siret_encrypted', $user)) {
            unset($user['siret_encrypted'], $user['siret_dek']);
        }
        if (array_key_exists('adeli_encrypted', $user)) {
            unset($user['adeli_encrypted'], $user['adeli_dek']);
        }
        
        // Les champs du profil public sont déjà en clair, pas besoin de déchiffrement
        // public_slug, profile_image_url, cover_image_url, biography, faq, is_public_profile_enabled
        // Décoder les colonnes JSON pour la réponse API
        foreach ([
            'opening_hours',
            'social_links',
            'nurse_qualifications',
            'pharmacy_click_collect_days_json',
            'pharmacy_home_delivery_days_json',
        ] as $jsonCol) {
            if (isset($user[$jsonCol]) && is_string($user[$jsonCol]) && $user[$jsonCol] !== '') {
                $decoded = json_decode($user[$jsonCol], true);
                $user[$jsonCol] = $decoded !== null ? $decoded : $user[$jsonCol];
            }
        }

        // Normaliser les booléens lab/subaccount pour que le front reçoive toujours true/false (évite 0/1)
        foreach ([
            'is_accepting_appointments',
            'accept_rdv_saturday',
            'accept_rdv_sunday',
            'prescription_generation_enabled',
            'pharmacy_accepts_click_collect',
            'pharmacy_accepts_home_delivery',
            'pharmacy_orders_paused',
            'pharmacy_orders_enabled',
        ] as $boolCol) {
            if (array_key_exists($boolCol, $user)) {
                $user[$boolCol] = (bool) ($user[$boolCol] ?? false);
            }
        }

        $this->appendDelegatedPatientEmailDisplay($user);
        
        return $user;
    }

    /**
     * Trouve un utilisateur par email hash (pour authentification).
     * Priorité si doublons résiduels (avant contrainte UNIQUE) : staff avant patient.
     */
    public function findByEmailHash(string $emailHash): ?array
    {
        return $this->identityLookup()->findByEmailHash($emailHash);
    }

    /**
     * Vérifie si un compte est banni
     */
    public function isBanned(string $id): bool
    {
        $stmt = $this->db->prepare('SELECT banned_until FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        
        if (!$user || !$user['banned_until']) {
            return false;
        }
        
        $bannedUntil = new DateTime($user['banned_until']);
        return $bannedUntil > new DateTime();
    }

    /**
     * Incrémente le compteur d'incidents
     */
    public function addIncident(string $id, string $actorId, string $actorRole): void
    {
        $stmt = $this->db->prepare('
            UPDATE profiles 
            SET incident_count = incident_count + 1,
                last_incident_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$id]);
        
        // Récupérer le nouveau count
        $stmt = $this->db->prepare('SELECT incident_count FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        $incidentCount = $user['incident_count'];
        
        // Logger l'incident
        $this->logger->log(
            $actorId,
            $actorRole,
            'incident',
            'profile',
            $id,
            ['incident_count' => $incidentCount]
        );
        
        // Appliquer les sanctions automatiques
        if ($incidentCount === 1) {
            // Email d'avertissement (sera envoyé par le système de notifications)
        } elseif ($incidentCount === 3) {
            // Suspension 7 jours
            $bannedUntil = date('Y-m-d H:i:s', strtotime('+7 days'));
            $stmt = $this->db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
            $stmt->execute([$bannedUntil, $id]);
        } elseif ($incidentCount >= 6) {
            // Bannissement définitif
            $stmt = $this->db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
            $stmt->execute(['9999-12-31 23:59:59', $id]);
        }
    }

    /**
     * Met à jour un utilisateur
     */
    public function update(string $id, array $data, string $actorId, string $actorRole): bool
    {
        $data = $this->stripUnauthorizedPrivilegeFields($id, $data, $actorId, $actorRole);
        $updates = [];
        $params = [];

        if (
            array_key_exists('rpps', $data)
            || array_key_exists('adeli', $data)
            || array_key_exists('professional_id', $data)
        ) {
            require_once __DIR__ . '/../lib/ProfessionalId.php';
            $rawId = ProfessionalId::fromRequestBody($data);
            $targetRole = $this->getRoleById($id);
            $targetEmploi = null;
            if ($targetRole === 'pro' && $this->hasEmploiColumn()) {
                $emploiStmt = $this->db->prepare('SELECT emploi FROM profiles WHERE id = ? LIMIT 1');
                $emploiStmt->execute([$id]);
                $emploiRow = $emploiStmt->fetch(PDO::FETCH_ASSOC);
                $targetEmploi = isset($emploiRow['emploi']) ? trim((string) $emploiRow['emploi']) : null;
                if (array_key_exists('emploi', $data) && trim((string) ($data['emploi'] ?? '')) !== '') {
                    $targetEmploi = trim((string) $data['emploi']);
                }
            }
            if ($rawId !== '' && $targetRole === 'nurse') {
                $profErr = ProfessionalId::validate($rawId);
                if ($profErr !== null) {
                    throw new InvalidArgumentException($profErr);
                }
            }
            if ($rawId !== '' && $targetRole === 'pro' && ProfessionalId::isProIpaEmploi($targetEmploi)) {
                $profErr = ProfessionalId::validate($rawId);
                if ($profErr !== null) {
                    throw new InvalidArgumentException($profErr);
                }
            }
            if ($rawId !== '') {
                $split = ProfessionalId::split($rawId);
                $data['rpps'] = $split['rpps'];
                $data['adeli'] = $split['adeli'];
            }
        }
        
        // Mettre à jour les champs autorisés
        if (isset($data['first_name'])) {
            $firstNameEncrypted = $this->crypto->encryptField($data['first_name']);
            $updates[] = 'first_name_encrypted = ?, first_name_dek = ?';
            $params[] = $firstNameEncrypted['encrypted'];
            $params[] = $firstNameEncrypted['dek'];
        }
        
        if (isset($data['last_name'])) {
            $lastNameEncrypted = $this->crypto->encryptField($data['last_name']);
            $updates[] = 'last_name_encrypted = ?, last_name_dek = ?';
            $params[] = $lastNameEncrypted['encrypted'];
            $params[] = $lastNameEncrypted['dek'];
        }
        
        if (array_key_exists('phone', $data)) {
            if (!empty($data['phone'])) {
                $phoneEncrypted = $this->crypto->encryptField($data['phone']);
                $updates[] = 'phone_encrypted = ?, phone_dek = ?';
                $params[] = $phoneEncrypted['encrypted'];
                $params[] = $phoneEncrypted['dek'];
            } else {
                $updates[] = 'phone_encrypted = NULL, phone_dek = NULL';
            }
            if ($this->hasPhoneDigitsHashColumn()) {
                $roleNow = $this->getRoleById($id);
                if ($roleNow === 'patient') {
                    if (!empty($data['phone'])) {
                        $normDigits = self::normalizeFrenchPatientPhoneDigits((string) $data['phone']);
                        $updates[] = 'phone_digits_hash = ?';
                        $params[] = $normDigits !== null ? self::patientPhoneDigitsHash($normDigits) : null;
                    } else {
                        $updates[] = 'phone_digits_hash = NULL';
                    }
                }
            }
        }
        
        if (array_key_exists('address', $data)) {
            if (!empty($data['address'])) {
                $addressJson = json_encode($data['address']);
                $addressEncrypted = $this->crypto->encryptField($addressJson);
                $updates[] = 'address_encrypted = ?, address_dek = ?';
                $params[] = $addressEncrypted['encrypted'];
                $params[] = $addressEncrypted['dek'];
                if ($this->hasCityPlainColumn()) {
                    $city = $this->extractCityFromAddress($data['address']);
                    if ($city !== null) {
                        $updates[] = 'city_plain = ?';
                        $params[] = $city;
                    }
                }
            } else {
                $updates[] = 'address_encrypted = NULL, address_dek = NULL';
                if ($this->hasCityPlainColumn()) {
                    $updates[] = 'city_plain = NULL';
                }
            }
        }
        
        if (array_key_exists('gender', $data)) {
            if (!empty($data['gender'])) {
                $genderEncrypted = $this->crypto->encryptField($data['gender']);
                $updates[] = 'gender_encrypted = ?, gender_dek = ?';
                $params[] = $genderEncrypted['encrypted'];
                $params[] = $genderEncrypted['dek'];
            } else {
                $updates[] = 'gender_encrypted = NULL, gender_dek = NULL';
            }
        }
        
        if (array_key_exists('birth_date', $data)) {
            if (!empty($data['birth_date'])) {
                $birthDateEncrypted = $this->crypto->encryptField($data['birth_date']);
                $updates[] = 'birth_date_encrypted = ?, birth_date_dek = ?';
                $params[] = $birthDateEncrypted['encrypted'];
                $params[] = $birthDateEncrypted['dek'];
            } else {
                $updates[] = 'birth_date_encrypted = NULL, birth_date_dek = NULL';
            }
        }

        if ($this->hasNirColumn() && array_key_exists('nir', $data)) {
            $nirVal = trim((string) ($data['nir'] ?? ''));
            if ($nirVal !== '') {
                $nirEncrypted = $this->crypto->encryptField($nirVal);
                $updates[] = 'nir_encrypted = ?, nir_dek = ?';
                $params[] = $nirEncrypted['encrypted'];
                $params[] = $nirEncrypted['dek'];
            } else {
                $updates[] = 'nir_encrypted = NULL, nir_dek = NULL';
            }
        }
        
        if (array_key_exists('rpps', $data)) {
            if (!empty($data['rpps'])) {
                $rppsEncrypted = $this->crypto->encryptField($data['rpps']);
                $updates[] = 'rpps_encrypted = ?, rpps_dek = ?';
                $params[] = $rppsEncrypted['encrypted'];
                $params[] = $rppsEncrypted['dek'];
            } else {
                $updates[] = 'rpps_encrypted = NULL, rpps_dek = NULL';
            }
        }
        
        if ($this->hasCompanyNameColumn() && array_key_exists('company_name', $data)) {
            if (!empty(trim((string)$data['company_name']))) {
                $companyEncrypted = $this->crypto->encryptField(trim((string)$data['company_name']));
                $updates[] = 'company_name_encrypted = ?, company_name_dek = ?';
                $params[] = $companyEncrypted['encrypted'];
                $params[] = $companyEncrypted['dek'];
            } else {
                $updates[] = 'company_name_encrypted = NULL, company_name_dek = NULL';
            }
        }
        
        if ($this->hasSiretColumn() && array_key_exists('siret', $data)) {
            if (!empty(trim((string)$data['siret']))) {
                $siretEncrypted = $this->crypto->encryptField(trim((string)$data['siret']));
                $updates[] = 'siret_encrypted = ?, siret_dek = ?';
                $params[] = $siretEncrypted['encrypted'];
                $params[] = $siretEncrypted['dek'];
            } else {
                $updates[] = 'siret_encrypted = NULL, siret_dek = NULL';
            }
        }
        
        if ($this->hasAdeliColumn() && array_key_exists('adeli', $data)) {
            if (!empty(trim((string)$data['adeli']))) {
                $adeliEncrypted = $this->crypto->encryptField(trim((string)$data['adeli']));
                $updates[] = 'adeli_encrypted = ?, adeli_dek = ?';
                $params[] = $adeliEncrypted['encrypted'];
                $params[] = $adeliEncrypted['dek'];
            } else {
                $updates[] = 'adeli_encrypted = NULL, adeli_dek = NULL';
            }
        }
        if ($this->hasEmploiColumn() && array_key_exists('emploi', $data)) {
            $emploiVal = trim((string)$data['emploi']);
            if (strlen($emploiVal) > 120) $emploiVal = substr($emploiVal, 0, 120);
            $updates[] = 'emploi = ?';
            $params[] = $emploiVal !== '' ? $emploiVal : null;
        }

        if (
            $this->hasPrescriptionSignatureColumn()
            && array_key_exists('prescription_signature_png', $data)
            && $actorId === $id
        ) {
            $targetRole = $this->getRoleById($id);
            if (!in_array($targetRole, ['pro', 'nurse'], true)) {
                throw new InvalidArgumentException('Seuls les professionnels de santé peuvent enregistrer une signature d\'ordonnance.');
            }
            require_once __DIR__ . '/../lib/PrescriptionSignature.php';
            if ($data['prescription_signature_png'] === null || trim((string) $data['prescription_signature_png']) === '') {
                $updates[] = 'prescription_signature_encrypted = NULL, prescription_signature_dek = NULL';
            } else {
                $sigError = PrescriptionSignature::validateForStorage((string) $data['prescription_signature_png']);
                if ($sigError !== null) {
                    throw new InvalidArgumentException($sigError);
                }
                $normalized = PrescriptionSignature::normalizePngBase64((string) $data['prescription_signature_png']);
                $sigEncrypted = $this->crypto->encryptField($normalized ?? '');
                $updates[] = 'prescription_signature_encrypted = ?, prescription_signature_dek = ?';
                $params[] = $sigEncrypted['encrypted'];
                $params[] = $sigEncrypted['dek'];
            }
        } elseif (array_key_exists('prescription_signature_png', $data)) {
            throw new InvalidArgumentException(
                'La signature ordonnance n\'est pas disponible sur ce serveur (migration base de données requise).'
            );
        }
        
        if ($this->hasLabIdColumn() && array_key_exists('lab_id', $data)) {
            $updates[] = 'lab_id = ?';
            $params[] = !empty(trim((string)$data['lab_id'])) ? trim((string)$data['lab_id']) : null;
        }
        
        // Champs du profil public
        if (isset($data['public_slug'])) {
            $updates[] = 'public_slug = ?';
            $params[] = $data['public_slug'] ?: null;
        }
        
        // array_key_exists : une valeur null doit effacer la photo (suppression depuis le profil)
        if (array_key_exists('profile_image_url', $data)) {
            $updates[] = 'profile_image_url = ?';
            $params[] = $data['profile_image_url'] ?: null;
        }
        
        if (array_key_exists('cover_image_url', $data)) {
            $updates[] = 'cover_image_url = ?';
            $params[] = $data['cover_image_url'] ?: null;
        }
        
        if (isset($data['biography'])) {
            $updates[] = 'biography = ?';
            $params[] = $data['biography'] ?: null;
        }
        
        if (isset($data['faq'])) {
            $updates[] = 'faq = ?';
            $params[] = is_array($data['faq']) ? json_encode($data['faq']) : ($data['faq'] ?: null);
        }
        
        if (isset($data['is_public_profile_enabled'])) {
            $updates[] = 'is_public_profile_enabled = ?';
            $params[] = $data['is_public_profile_enabled'] ? 1 : 0;
        }
        if (array_key_exists('website_url', $data)) {
            $updates[] = 'website_url = ?';
            $params[] = !empty(trim((string)$data['website_url'])) ? trim((string)$data['website_url']) : null;
        }
        if (array_key_exists('opening_hours', $data)) {
            $updates[] = 'opening_hours = ?';
            $params[] = is_array($data['opening_hours']) ? json_encode($data['opening_hours']) : ($data['opening_hours'] ?: null);
        }
        if (array_key_exists('social_links', $data)) {
            $updates[] = 'social_links = ?';
            $params[] = is_array($data['social_links']) ? json_encode($data['social_links']) : ($data['social_links'] ?: null);
        }
        if (array_key_exists('years_experience', $data)) {
            $updates[] = 'years_experience = ?';
            $params[] = $data['years_experience'] ?: null;
        }
        if (array_key_exists('nurse_qualifications', $data)) {
            $updates[] = 'nurse_qualifications = ?';
            $params[] = is_array($data['nurse_qualifications']) ? json_encode($data['nurse_qualifications']) : ($data['nurse_qualifications'] ?: null);
        }
        if (array_key_exists('is_accepting_appointments', $data)) {
            $updates[] = 'is_accepting_appointments = ?';
            $params[] = $data['is_accepting_appointments'] ? 1 : 0;
        }
        if (array_key_exists('min_booking_lead_time_hours', $data)) {
            $hours = (int) $data['min_booking_lead_time_hours'];
            if (in_array($hours, [0, 24, 48, 72], true)) {
                $updates[] = 'min_booking_lead_time_hours = ?';
                $params[] = $hours;
            }
        }
        if (array_key_exists('accept_rdv_saturday', $data)) {
            $updates[] = 'accept_rdv_saturday = ?';
            $params[] = $data['accept_rdv_saturday'] ? 1 : 0;
        }
        if (array_key_exists('accept_rdv_sunday', $data)) {
            $updates[] = 'accept_rdv_sunday = ?';
            $params[] = $data['accept_rdv_sunday'] ? 1 : 0;
        }
        if ($this->hasPrescriptionGenerationEnabledColumn() && array_key_exists('prescription_generation_enabled', $data)) {
            $updates[] = 'prescription_generation_enabled = ?';
            $params[] = $data['prescription_generation_enabled'] ? 1 : 0;
        }
        if ($this->hasPharmacyOrderProfileColumns()) {
            foreach ([
                'pharmacy_accepts_click_collect',
                'pharmacy_accepts_home_delivery',
                'pharmacy_orders_paused',
                'pharmacy_orders_enabled',
            ] as $pharmacyCol) {
                if (array_key_exists($pharmacyCol, $data)) {
                    $updates[] = $pharmacyCol . ' = ?';
                    $params[] = $data[$pharmacyCol] ? 1 : 0;
                }
            }
            foreach ([
                'pharmacy_click_collect_days_json',
                'pharmacy_home_delivery_days_json',
            ] as $daysCol) {
                if (array_key_exists($daysCol, $data)) {
                    $days = is_array($data[$daysCol]) ? $data[$daysCol] : [];
                    $days = array_values(array_unique(array_filter(
                        array_map('intval', $days),
                        static fn (int $day): bool => $day >= 1 && $day <= 7
                    )));
                    sort($days);
                    $updates[] = $daysCol . ' = ?';
                    $params[] = json_encode($days, JSON_UNESCAPED_UNICODE);
                }
            }
        }

        if (empty($updates)) {
            return false;
        }
        
        // Redirection 301 : enregistrer l’ancien slug quand public_slug change (lab/subaccount)
        if (isset($data['public_slug'])) {
            $newSlug = trim((string) ($data['public_slug'] ?? ''));
            $stmtCurrent = $this->db->prepare('SELECT public_slug FROM profiles WHERE id = ?');
            $stmtCurrent->execute([$id]);
            $row = $stmtCurrent->fetch(PDO::FETCH_ASSOC);
            $oldSlug = $row ? trim((string) ($row['public_slug'] ?? '')) : '';
            if ($oldSlug !== '' && $oldSlug !== $newSlug && $this->hasSlugRedirectsTable()) {
                try {
                    $ins = $this->db->prepare('INSERT INTO slug_redirects (old_slug, profile_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE profile_id = VALUES(profile_id)');
                    $ins->execute([$oldSlug, $id]);
                } catch (Exception $e) {
                    // ignorer si table absente ou erreur
                }
            }
        }
        
        $updates[] = 'updated_at = NOW()';
        $params[] = $id;
        
        $sql = 'UPDATE profiles SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute($params);
        
        // Logger la modification
        $this->logger->log(
            $actorId,
            $actorRole,
            'update',
            'profile',
            $id,
            ['updated_fields' => array_keys($data)]
        );
        
        return $result;
    }

    /**
     * Vérifie si la colonne lab_id existe (rétrocompatibilité)
     */
    private function hasLabIdColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'lab_id');
    }

    private function hasCompanyNameColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'company_name_encrypted');
    }

    private function hasCreatedByColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'created_by');
    }

    private function hasPhoneDigitsHashColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'phone_digits_hash');
    }

    private function hasPasswordColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'password_hash');
    }

    /** @return array{has_password: bool, must_change_password: bool} */
    public function getPasswordFlagsForUser(string $userId): array
    {
        if (!$this->hasPasswordColumn()) {
            return ['has_password' => false, 'must_change_password' => false];
        }
        $stmt = $this->db->prepare('SELECT password_hash, must_change_password FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['has_password' => false, 'must_change_password' => false];
        }
        return [
            'has_password' => !empty($row['password_hash']),
            'must_change_password' => (bool) ($row['must_change_password'] ?? false),
        ];
    }

    public function getDecryptedEmail(string $userId): ?string
    {
        $stmt = $this->db->prepare('SELECT email_encrypted, email_dek FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['email_encrypted']) || empty($row['email_dek'])) {
            return null;
        }
        return $this->crypto->decryptField($row['email_encrypted'], $row['email_dek']);
    }

    private function hasSiretColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'siret_encrypted');
    }

    private function hasSlugRedirectsTable(): bool
    {
        return DbSchemaCache::tableExists($this->db, 'slug_redirects');
    }

    private function hasAdeliColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'adeli_encrypted');
    }

    private function hasEmploiColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'emploi');
    }

    private function hasPrescriptionGenerationEnabledColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'prescription_generation_enabled');
    }

    private function hasPharmacyOrderProfileColumns(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'pharmacy_orders_enabled');
    }

    private function hasPrescriptionSignatureColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'prescription_signature_encrypted');
    }

    private function hasNirColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'nir_encrypted');
    }

    private function hasCityPlainColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'city_plain');
    }

    private function hasPatientProfessionalAccessTable(): bool
    {
        return DbSchemaCache::tableExists($this->db, 'patient_professional_access');
    }

    /**
     * Email technique déterministe : même pro + même identité (nom, téléphone, date de naissance) → un seul compte patient.
     * On n’utilise pas l’email du pro comme email_hash (OTP / connexion patient resteraient ambigus).
     */
    private function buildStableDelegatedPatientEmail(string $professionalId, array $data): string
    {
        $fn = strtolower(preg_replace('/\s+/u', ' ', trim((string) ($data['first_name'] ?? ''))));
        $ln = strtolower(preg_replace('/\s+/u', ' ', trim((string) ($data['last_name'] ?? ''))));
        $phone = preg_replace('/\D+/', '', (string) ($data['phone'] ?? ''));
        $birth = '';
        $birthRaw = trim((string) ($data['birth_date'] ?? ''));
        if ($birthRaw !== '') {
            try {
                $birth = (new DateTime($birthRaw))->format('Y-m-d');
            } catch (Exception $e) {
                $birth = strtolower($birthRaw);
            }
        }
        $fingerprint = strtolower($professionalId) . '|' . $fn . '|' . $ln . '|' . $phone . '|' . $birth;
        $h = substr(hash('sha256', $fingerprint), 0, 40);

        return 'delegated-' . $h . '@patients.internal.local';
    }

    private function patientDelegatedProfileMatchesProfessional(string $patientId, string $professionalId): bool
    {
        if ($this->hasCreatedByColumn()) {
            $stmt = $this->db->prepare('SELECT created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$patientId, 'patient']);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && (string) ($row['created_by'] ?? '') === (string) $professionalId) {
                return true;
            }
        }

        return $this->patientAccess()->hasProfessionalAccessToPatient($professionalId, $patientId);
    }

    private function appendDelegatedPatientEmailDisplay(array &$user): void
    {
        $role = (string) ($user['role'] ?? '');
        if ($role !== 'patient') {
            return;
        }
        $email = (string) ($user['email'] ?? '');
        if ($email === '' || !str_ends_with($email, '@patients.internal.local')) {
            return;
        }
        $creatorId = null;
        if (!empty($user['created_by'])) {
            $creatorId = (string) $user['created_by'];
        } else {
            if (!$this->hasCreatedByColumn()) {
                return;
            }
            try {
                $stmt = $this->db->prepare('SELECT created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
                $stmt->execute([(string) ($user['id'] ?? ''), 'patient']);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $creatorId = !empty($row['created_by']) ? (string) $row['created_by'] : null;
            } catch (Exception $e) {
                return;
            }
        }
        if ($creatorId === null || $creatorId === '') {
            $user['email_display'] = 'Patient sans email renseigné';

            return;
        }
        try {
            $stmt = $this->db->prepare('SELECT email_encrypted, email_dek FROM profiles WHERE id = ? LIMIT 1');
            $stmt->execute([$creatorId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row['email_encrypted']) || empty($row['email_dek'])) {
                $user['email_display'] = 'Patient sans email (créé par un professionnel)';

                return;
            }
            $proEmail = $this->crypto->decryptField($row['email_encrypted'], $row['email_dek']);
            $user['email_display'] = 'Sans email patient — notifications / contact professionnel : ' . $proEmail;
        } catch (Exception $e) {
            $user['email_display'] = 'Patient sans email renseigné';
        }
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws DomainException champ pharmacie envoyé sans droit
     */
    private function stripUnauthorizedPrivilegeFields(string $id, array $data, string $actorId, string $actorRole): array
    {
        $isAdmin = $actorRole === 'super_admin';
        if (!$isAdmin) {
            if (array_key_exists('pharmacy_orders_enabled', $data)) {
                throw new DomainException('Seul un administrateur peut activer ou désactiver le module de commandes pharmacie.');
            }
            if (array_key_exists('emploi', $data)) {
                $currentEmploi = '';
                if ($this->hasEmploiColumn()) {
                    $stmt = $this->db->prepare('SELECT emploi FROM profiles WHERE id = ? LIMIT 1');
                    $stmt->execute([$id]);
                    $currentEmploi = trim((string) ($stmt->fetchColumn() ?: ''));
                }
                if (trim((string) ($data['emploi'] ?? '')) !== $currentEmploi) {
                    unset($data['emploi']);
                }
            }
        }

        $sentPharmacyFields = array_intersect(self::PHARMACY_OPERATION_FIELDS, array_keys($data));
        if ($sentPharmacyFields !== [] && !$isAdmin && !$this->actorMayManagePharmacyOperations($id, $actorId, $actorRole)) {
            throw new DomainException('Seule l’officine elle-même peut modifier ses réglages de commandes pharmacie.');
        }

        return $data;
    }

    private function actorMayManagePharmacyOperations(string $id, string $actorId, string $actorRole): bool
    {
        if ($actorRole === 'super_admin') {
            return true;
        }
        if ($actorId !== $id || !$this->hasEmploiColumn()) {
            return false;
        }
        $stmt = $this->db->prepare('SELECT role, emploi FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || (string) ($row['role'] ?? '') !== 'pro') {
            return false;
        }
        $emploi = trim((string) ($row['emploi'] ?? ''));
        foreach ($this->pharmacyReceiverEmplois() as $receiver) {
            if (strcasecmp($emploi, $receiver) === 0) {
                return true;
            }
        }

        return false;
    }

    /** @return list<string> */
    private function pharmacyReceiverEmplois(): array
    {
        try {
            $stmt = $this->db->prepare(
                'SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1'
            );
            $stmt->execute(['pharmacy_module_config']);
            $raw = $stmt->fetchColumn();
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded) && isset($decoded['pharmacy_receiver_emplois']) && is_array($decoded['pharmacy_receiver_emplois'])) {
                    $list = array_values(array_filter(array_map(
                        static fn ($value): string => trim((string) $value),
                        $decoded['pharmacy_receiver_emplois']
                    )));
                    if ($list !== []) {
                        return $list;
                    }
                }
            }
        } catch (Throwable $e) {
            error_log('[User] pharmacy_module_config illisible, repli sur « Pharmacien » : ' . $e->getMessage());
        }

        return ['Pharmacien'];
    }

    /** Rôles staff avec liste « Mes patients » (pro, infirmier, labo, sous-compte). */
    public static function patientListStaffRoles(): array
    {
        return ['pro', 'nurse', 'lab', 'subaccount'];
    }

    public static function canListPatients(string $role): bool
    {
        return $role === 'super_admin'
            || $role === 'preleveur'
            || in_array($role, self::patientListStaffRoles(), true);
    }

    /**
     * Patient créé par un préleveur : visible par lui (created_by) et rattaché à son labo (PPA lab_assignment).
     * Les deux écritures sont atomiques.
     */
    public function createPatientForPreleveur(array $patientData, string $preleveurId, string $labId): string
    {
        require_once __DIR__ . '/../lib/DatabaseTransaction.php';

        $patientData['role'] = 'patient';
        $patientData['created_by'] = $preleveurId;

        return DatabaseTransaction::run($this->db, function () use ($patientData, $preleveurId, $labId): string {
            $patientId = (string) $this->create($patientData, $preleveurId, 'preleveur');
            $this->patientAccess()->linkPatientProfessional($patientId, $labId, null, 'lab_assignment', true);

            return $patientId;
        });
    }

    public function getPreleveurLabId(string $preleveurId): ?string
    {
        $stmt = $this->db->prepare('SELECT lab_id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
        $stmt->execute([$preleveurId, 'preleveur']);
        $labId = trim((string) ($stmt->fetchColumn() ?: ''));

        return $labId !== '' ? $labId : null;
    }

    /** @return list<array{patient_id: string, source: string, created_at: string}> */
    public function listPreleveurAssignments(string $preleveurId): array
    {
        return $this->patientAccess()->listPreleveurAssignments($preleveurId);
    }

    public function assignPatientToPreleveur(string $patientId, string $preleveurId): void
    {
        $this->patientAccess()->linkPatientProfessional($patientId, $preleveurId, null, 'lab_assignment', true);
    }

    public function removePreleveurAssignment(string $preleveurId, string $patientId): bool
    {
        return $this->patientAccess()->removePreleveurAssignment($preleveurId, $patientId);
    }

    /**
     * Profil staff cible quand un super_admin agit « au nom de » (création patient ou RDV).
     *
     * @return array{id: string, role: string}
     */
    public function resolveAdminOnBehalfStaffProfile(string $onBehalfId): array
    {
        require_once __DIR__ . '/../lib/Validation.php';
        $onBehalfId = trim($onBehalfId);
        if ($onBehalfId === '' || !Validation::uuid($onBehalfId)) {
            throw new InvalidArgumentException('Identifiant créateur invalide');
        }
        $stmt = $this->db->prepare('SELECT id, role, banned_until FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$onBehalfId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !in_array($row['role'] ?? '', self::patientListStaffRoles(), true)) {
            throw new DomainException('Le créateur doit être un professionnel, infirmier ou laboratoire actif');
        }
        if (!empty($row['banned_until']) && strtotime((string) $row['banned_until']) > time()) {
            throw new DomainException('Le profil sélectionné est suspendu ou banni');
        }

        return [
            'id' => (string) $row['id'],
            'role' => (string) $row['role'],
        ];
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
        $this->patientAccess()->linkPatientAccessAfterAppointmentCreate(
            $patientId,
            $appointmentId,
            $sessionUser,
            $createUserId,
            $createUserRole,
            $appointmentInput
        );
    }

    public function linkPatientProfessional(
        string $patientId,
        string $professionalId,
        ?string $appointmentId,
        string $source
    ): void {
        $this->patientAccess()->linkPatientProfessional($patientId, $professionalId, $appointmentId, $source);
    }

    /** @return array{ok: bool, http?: int, error?: string, code?: string, consent_recorded?: bool} */
    public function adoptPatientForStaff(
        string $requesterId,
        string $requesterRole,
        string $patientId,
        string $lookupEmail = '',
        string $lookupPhone = '',
        bool $consentGiven = false,
    ): array {
        return $this->patientAccess()->adoptPatientForStaff(
            $requesterId,
            $requesterRole,
            $patientId,
            $lookupEmail,
            $lookupPhone,
            $consentGiven
        );
    }

    public function findNurseIdByPhone(string $phoneRaw): ?string
    {
        return $this->identityLookup()->findNurseIdByPhone($phoneRaw);
    }

    public function hasProfessionalAccessToPatient(string $requesterId, string $patientId): bool
    {
        return $this->patientAccess()->hasProfessionalAccessToPatient($requesterId, $patientId);
    }

    public function isPatientVisibleInStaffList(string $requesterId, string $requesterRole, string $patientId): bool
    {
        return $this->patientAccess()->isPatientVisibleInStaffList($requesterId, $requesterRole, $patientId);
    }

    public function canStaffEditPatientProfile(string $requesterId, string $requesterRole, string $patientId): bool
    {
        return $this->patientAccess()->canStaffEditPatientProfile($requesterId, $requesterRole, $patientId);
    }

    public function revokePatientProfessionalAccessAfterRedispatch(
        string $patientId,
        string $professionalId,
        string $professionalRole
    ): void {
        $this->patientAccess()->revokePatientProfessionalAccessAfterRedispatch($patientId, $professionalId, $professionalRole);
    }

    public function findPatientIdByEmailHash(string $emailHash): ?string
    {
        return $this->identityLookup()->findPatientIdByEmailHash($emailHash);
    }

    /** @return array{id: string, role: string}|null */
    public function findProfileByEmailHash(string $emailHash): ?array
    {
        return $this->identityLookup()->findProfileByEmailHash($emailHash);
    }

    public static function normalizeFrenchPatientPhoneDigits(string $phone): ?string
    {
        return UserIdentityLookup::normalizeFrenchPatientPhoneDigits($phone);
    }

    public static function patientPhoneDigitsHash(string $digits10): ?string
    {
        return UserIdentityLookup::patientPhoneDigitsHash($digits10);
    }

    public function findPatientIdByPhoneDigitsHash(string $phoneHash): ?string
    {
        return $this->identityLookup()->findPatientIdByPhoneDigitsHash($phoneHash);
    }

    /**
     * Met à jour l’email en clair (chiffrement + hash) — migration / correction interne.
     */
    private function setEmailPlainInternal(string $id, string $plainEmail): void
    {
        $emailEncrypted = $this->crypto->encryptField($plainEmail);
        $emailHash = hash('sha256', strtolower($plainEmail));
        $stmt = $this->db->prepare('
            UPDATE profiles SET email_encrypted = ?, email_dek = ?, email_hash = ?, updated_at = NOW() WHERE id = ?
        ');
        $stmt->execute([
            $emailEncrypted['encrypted'],
            $emailEncrypted['dek'],
            $emailHash,
            $id,
        ]);
    }

    /**
     * Corrige les patients qui partagent un email_hash avec un autre profil (migration 051).
     * Réattribue un email technique delegated-{uuid}@patients.internal.local à chaque patient concerné.
     */
    public function migrateDuplicateEmailHashesForPatients(): int
    {
        $stmt = $this->db->query('
            SELECT email_hash
            FROM profiles
            GROUP BY email_hash
            HAVING COUNT(*) > 1
        ');
        $dupHashes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $totalFixed = 0;

        foreach ($dupHashes as $hash) {
            $q = $this->db->prepare('SELECT id, role FROM profiles WHERE email_hash = ?');
            $q->execute([$hash]);
            $rows = $q->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) < 2) {
                continue;
            }
            foreach ($rows as $row) {
                if ($row['role'] !== 'patient') {
                    continue;
                }
                $newEmail = 'delegated-' . strtolower($row['id']) . '@patients.internal.local';
                $this->setEmailPlainInternal((string) $row['id'], $newEmail);
                $totalFixed++;
            }
        }

        return $totalFixed;
    }

    /**
     * Corrige les doublons email_hash entre comptes staff (migration 051).
     * Conserve le rôle le plus prioritaire ; les autres reçoivent un email technique interne.
     */
    public function migrateDuplicateEmailHashesForStaff(): int
    {
        $rolePriority = [
            'super_admin' => 0,
            'lab' => 1,
            'subaccount' => 2,
            'preleveur' => 3,
            'nurse' => 4,
            'pro' => 5,
        ];

        $stmt = $this->db->query('
            SELECT email_hash
            FROM profiles
            WHERE role <> \'patient\'
            GROUP BY email_hash
            HAVING COUNT(*) > 1
        ');
        $dupHashes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $totalFixed = 0;

        foreach ($dupHashes as $hash) {
            $q = $this->db->prepare('
                SELECT id, role FROM profiles
                WHERE email_hash = ? AND role <> ?
                ORDER BY created_at ASC
            ');
            $q->execute([$hash, 'patient']);
            $rows = $q->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) < 2) {
                continue;
            }

            usort($rows, static function (array $a, array $b) use ($rolePriority): int {
                $pa = $rolePriority[$a['role']] ?? 99;
                $pb = $rolePriority[$b['role']] ?? 99;
                if ($pa !== $pb) {
                    return $pa <=> $pb;
                }
                return strcmp((string) $a['id'], (string) $b['id']);
            });

            array_shift($rows);
            foreach ($rows as $row) {
                $newEmail = 'delegated-' . strtolower((string) $row['id']) . '@profiles.internal.local';
                $this->setEmailPlainInternal((string) $row['id'], $newEmail);
                $totalFixed++;
            }
        }

        return $totalFixed;
    }

    /**
     * Nombre de email_hash encore dupliqués (doit être 0 avant contrainte UNIQUE).
     */
    public function countDuplicateEmailHashes(): int
    {
        $stmt = $this->db->query('
            SELECT COUNT(*) FROM (
                SELECT email_hash FROM profiles GROUP BY email_hash HAVING COUNT(*) > 1
            ) t
        ');
        return (int) $stmt->fetchColumn();
    }

    /**
     * Extrait la ville du label d'adresse (format: "rue, code postal ville" ou "rue, ville")
     */
    private function extractCityFromAddress($address): ?string
    {
        if (empty($address)) {
            return null;
        }
        $label = null;
        if (is_array($address) && !empty($address['label'])) {
            $label = trim((string) $address['label']);
        } elseif (is_string($address)) {
            $decoded = json_decode($address, true);
            $label = is_array($decoded) && !empty($decoded['label']) ? trim((string) $decoded['label']) : trim($address);
        }
        if (empty($label)) {
            return null;
        }
        $parts = array_map('trim', explode(',', $label));
        $parts = array_filter($parts);
        if (empty($parts)) {
            return null;
        }
        $last = end($parts);
        if (preg_match('/^(?:France|FR)$/i', $last) && count($parts) > 1) {
            $last = $parts[array_key_last($parts) - 1];
        }
        if (preg_match('/^\d{5}\s+(.+)$/', $last, $m)) {
            return trim($m[1]);
        }
        return $last;
    }

    /**
     * Récupère les noms d'affichage pour une liste d'IDs (batch, une seule requête).
     * Retourne id => display_name (company_name pour lab/subaccount, sinon first_name + last_name).
     */
    public function getDisplayNamesByIds(array $ids): array
    {
        return $this->batchLookup()->displayNamesByIds($ids);
    }

    /**
     * Photos de profil pour une liste d'IDs (liste RDV — évite N+1 sur getById).
     *
     * @return array<string, string|null> id => profile_image_url
     */
    public function getProfileImageUrlsByIds(array $ids): array
    {
        return $this->batchLookup()->profileImageUrlsByIds($ids);
    }

    /**
     * Genres déchiffrés pour une liste d'IDs (cartes RDV — avatars Personas).
     *
     * @return array<string, string|null> id => male|female|other|null
     */
    public function getGendersByIds(array $ids): array
    {
        return $this->batchLookup()->gendersByIds($ids);
    }

    /**
     * Recherche admin (nom, prénom, email, société, téléphone) sur profils déchiffrés.
     */
    private function profileMatchesAdminSearch(array $user, string $search): bool
    {
        return UserDirectoryHelpers::profileMatchesAdminSearch($user, $search);
    }

    /**
     * Récupère la liste des utilisateurs avec pagination et filtres
     */
    public function getAll(array $filters = [], int $page = 1, int $limit = 20, string $requesterId = '', string $requesterRole = ''): array
    {
        return $this->directoryQuery()->getAll($filters, $page, $limit, $requesterId, $requesterRole);
    }

    /**
     * Reset les incidents après 90 jours
     */
    public function resetIncidentsIfNeeded(): void
    {
        $stmt = $this->db->prepare('
            UPDATE profiles 
            SET incident_count = 0
            WHERE incident_count > 0 
            AND last_incident_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ');
        $stmt->execute();
    }

    /**
     * Récupère le lab_id d'un utilisateur (subaccount/preleveur)
     */
    public function getLabId(string $id): ?string
    {
        if (!$this->hasLabIdColumn()) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT lab_id FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? ($row['lab_id'] ?? null) : null;
    }

    /**
     * Supprimer un utilisateur.
     * Réattribue les FK RESTRICT (actor_id, created_by, etc.) à l'admin qui supprime avant le DELETE.
     */
    public function delete(string $id, string $actorId, string $actorRole): bool
    {
        // super_admin peut tout supprimer
        // lab peut supprimer ses subaccounts et preleveurs
        if ($actorRole !== 'super_admin') {
            if ($actorRole === 'lab') {
                $targetLabId = $this->getLabId($id);
                if ($targetLabId !== $actorId) {
                    throw new DomainException('Accès refusé : vous ne pouvez supprimer que les membres de votre laboratoire');
                }
            } else {
                throw new DomainException('Accès refusé');
            }
        }

        // Réattribuer les lignes qui référencent ce profil (FK ON DELETE RESTRICT) à l'admin qui supprime
        ProfileReferences::reassign($this->db, $id, $actorId);

        $this->logger->log($actorId, $actorRole, 'delete', 'profile', $id, []);

        $stmt = $this->db->prepare('DELETE FROM profiles WHERE id = ?');
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Supprime un patient créé par le professionnel (pro, nurse, lab, subaccount) ou super_admin.
     * Refuse si des rendez-vous sont encore en attente / confirmés / en cours.
     *
     * @throws PatientDeletionDenied refus métier (statut HTTP et code d'erreur portés par l'exception)
     */
    public function deletePatientCreatedBy(string $patientId, string $actorId, string $actorRole): bool
    {
        if (!in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true)) {
            throw new PatientDeletionDenied('Accès refusé', 403, 'FORBIDDEN');
        }
        $stmt = $this->db->prepare('SELECT id, role, created_by FROM profiles WHERE id = ?');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new PatientDeletionDenied('Patient introuvable', 404, 'NOT_FOUND');
        }
        if (($row['role'] ?? '') !== 'patient') {
            throw new PatientDeletionDenied('Ce compte n’est pas un patient', 400, 'NOT_A_PATIENT');
        }
        if ($actorRole !== 'super_admin') {
            if (($row['created_by'] ?? '') !== $actorId) {
                throw new PatientDeletionDenied('Vous ne pouvez supprimer que les patients que vous avez créés', 403, 'FORBIDDEN');
            }
        }
        if (ProfileReferences::countActiveAppointments($this->db, $patientId) > 0) {
            throw new PatientDeletionDenied(
                'Impossible de supprimer : rendez-vous en attente ou en cours pour ce patient',
                409,
                'PATIENT_HAS_ACTIVE_APPOINTMENTS'
            );
        }

        ProfileReferences::reassign($this->db, $patientId, $actorId);

        $this->logger->log($actorId, $actorRole, 'delete', 'profile', $patientId, ['scope' => 'patient_created_by']);

        $del = $this->db->prepare('DELETE FROM profiles WHERE id = ?');
        $del->execute([$patientId]);

        return $del->rowCount() > 0;
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

    /** La pharmacie a déjà une commande avec ce patient ou ce demandeur. */
    public function pharmacyHasOrderWithUser(string $pharmacyId, string $targetId): bool
    {
        if ($pharmacyId === '' || $targetId === '') {
            return false;
        }
        try {
            $stmt = $this->db->prepare('
                SELECT 1 FROM pharmacy_orders
                WHERE pharmacy_id = ?
                  AND (patient_id = ? OR requester_id = ?)
                LIMIT 1
            ');
            $stmt->execute([$pharmacyId, $targetId, $targetId]);
            return (bool) $stmt->fetchColumn();
        } catch (PDOException) {
            return false;
        }
    }

    /**
     * @param list<string> $ids
     * @return array<string, array{phone: ?string, email: ?string, emploi: ?string, public_slug: ?string, role: ?string}>
     */
    public function getContactCardsByIds(array $ids): array
    {
        return $this->batchLookup()->contactCardsByIds($ids);
    }
}
