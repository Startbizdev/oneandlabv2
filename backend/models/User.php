<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';

/**
 * Modèle User (profiles)
 */

class User
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;
    
    // Rôles autorisés (doit correspondre à l'ENUM de la base de données)
    private const ALLOWED_ROLES = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];

    public function __construct()
    {
        $config = require __DIR__ . '/../config/database.php';
        
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        
        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        $this->crypto = new Crypto();
        $this->logger = new Logger();
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

        // Pro / infirmier / lab / sous-compte / admin : email patient optionnel → email technique stable
        if ($role === 'patient' && in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true)) {
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
        if (($role === 'patient') && !empty($data['created_by']) && in_array($actorRole, ['pro', 'nurse', 'super_admin', 'lab', 'subaccount'], true)) {
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
            throw new Exception('Erreur lors de la création de l\'utilisateur: ' . $e->getMessage());
        }

        if ($role === 'patient' && $this->hasPatientProfessionalAccessTable() && in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)) {
            try {
                $this->linkPatientProfessional($id, $actorId, null, 'created');
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
        foreach (['opening_hours', 'social_links', 'nurse_qualifications'] as $jsonCol) {
            if (isset($user[$jsonCol]) && is_string($user[$jsonCol]) && $user[$jsonCol] !== '') {
                $decoded = json_decode($user[$jsonCol], true);
                $user[$jsonCol] = $decoded !== null ? $decoded : $user[$jsonCol];
            }
        }

        // Normaliser les booléens lab/subaccount pour que le front reçoive toujours true/false (évite 0/1)
        foreach (['is_accepting_appointments', 'accept_rdv_saturday', 'accept_rdv_sunday', 'prescription_generation_enabled'] as $boolCol) {
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
        $stmt = $this->db->prepare('
            SELECT id, role, banned_until FROM profiles WHERE email_hash = ?
            ORDER BY
                CASE WHEN role = \'patient\' THEN 1 ELSE 0 END ASC,
                FIELD(role,
                    \'super_admin\',
                    \'lab\',
                    \'subaccount\',
                    \'preleveur\',
                    \'nurse\',
                    \'pro\',
                    \'patient\'
                ) ASC,
                id ASC
            LIMIT 1
        ');
        $stmt->execute([$emailHash]);
        return $stmt->fetch() ?: null;
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
        
        if (isset($data['phone'])) {
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
        
        if (isset($data['address'])) {
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
        
        if (isset($data['gender'])) {
            if (!empty($data['gender'])) {
                $genderEncrypted = $this->crypto->encryptField($data['gender']);
                $updates[] = 'gender_encrypted = ?, gender_dek = ?';
                $params[] = $genderEncrypted['encrypted'];
                $params[] = $genderEncrypted['dek'];
            } else {
                $updates[] = 'gender_encrypted = NULL, gender_dek = NULL';
            }
        }
        
        if (isset($data['birth_date'])) {
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
        
        if (isset($data['profile_image_url'])) {
            $updates[] = 'profile_image_url = ?';
            $params[] = $data['profile_image_url'] ?: null;
        }
        
        if (isset($data['cover_image_url'])) {
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
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'lab_id'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasCompanyNameColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'company_name_encrypted'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasCreatedByColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'created_by'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasPhoneDigitsHashColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'phone_digits_hash'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasPasswordColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'password_hash'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
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
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'siret_encrypted'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasSlugRedirectsTable(): bool
    {
        static $has = null;
        if ($has === null) {
            $stmt = $this->db->query("SHOW TABLES LIKE 'slug_redirects'");
            $has = $stmt->rowCount() > 0;
        }
        return $has;
    }

    private function hasAdeliColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'adeli_encrypted'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasEmploiColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'emploi'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasPrescriptionGenerationEnabledColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_generation_enabled'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasPrescriptionSignatureColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_signature_encrypted'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasNirColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'nir_encrypted'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasCityPlainColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
            $hasColumn = $stmt->rowCount() > 0;
        }
        return $hasColumn;
    }

    private function hasPatientProfessionalAccessTable(): bool
    {
        static $has = null;
        if ($has === null) {
            $stmt = $this->db->query("SHOW TABLES LIKE 'patient_professional_access'");
            $has = $stmt->rowCount() > 0;
        }
        return $has;
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

        return $this->hasProfessionalAccessToPatient($professionalId, $patientId);
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
     * @return array<string, string|null>
     */
    private function getCreatorEmailsForDisplay(array $creatorIds): array
    {
        $creatorIds = array_values(array_unique(array_filter(array_map('strval', $creatorIds))));
        if ($creatorIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($creatorIds), '?'));
        $stmt = $this->db->prepare("SELECT id, email_encrypted, email_dek FROM profiles WHERE id IN ($placeholders)");
        $stmt->execute($creatorIds);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            try {
                $out[(string) $row['id']] = $this->crypto->decryptField($row['email_encrypted'], $row['email_dek']);
            } catch (Exception $e) {
                $out[(string) $row['id']] = null;
            }
        }

        return $out;
    }

    /**
     * Lien patient ↔ professionnel (liste « Mes patients » au-delà de created_by).
     */
    public function linkPatientProfessional(
        string $patientId,
        string $professionalId,
        ?string $appointmentId,
        string $source
    ): void {
        if (!$this->hasPatientProfessionalAccessTable()) {
            return;
        }
        $allowed = ['created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'qr_booking'];
        if (!in_array($source, $allowed, true)) {
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
            error_log('linkPatientProfessional: ' . $e->getMessage());
        }
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
     * Après redispatch : retire le patient de « Mes patients » s’il n’a été lié que via l’acceptation du RDV.
     */
    public function revokePatientProfessionalAccessAfterRedispatch(
        string $patientId,
        string $professionalId,
        string $professionalRole
    ): void {
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

    /**
     * ID du profil patient pour un hash email (lookup formulaire RDV).
     */
    public function findPatientIdByEmailHash(string $emailHash): ?string
    {
        $stmt = $this->db->prepare('SELECT id FROM profiles WHERE email_hash = ? AND role = ? LIMIT 1');
        $stmt->execute([$emailHash, 'patient']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (string) $row['id'] : null;
    }

    /**
     * Profil quel que soit le rôle (détection collision email_hash avant INSERT).
     *
     * @return array{id: string, role: string}|null
     */
    public function findProfileByEmailHash(string $emailHash): ?array
    {
        $stmt = $this->db->prepare('SELECT id, role FROM profiles WHERE email_hash = ? LIMIT 1');
        $stmt->execute([$emailHash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['id'])) {
            return null;
        }

        return [
            'id' => (string) $row['id'],
            'role' => (string) ($row['role'] ?? ''),
        ];
    }

    /**
     * Normalise un téléphone FR saisi en 10 chiffres (0XXXXXXXXX) pour index / lookup.
     */
    public static function normalizeFrenchPatientPhoneDigits(string $phone): ?string
    {
        $cleaned = preg_replace('/[\s\-\.]/', '', trim($phone));
        if (preg_match('/^\+33([1-9]\d{8})$/', $cleaned, $m)) {
            return '0' . $m[1];
        }
        if (preg_match('/^(0[1-9]\d{8})$/', $cleaned, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Hash stocké en base (colonne phone_digits_hash) pour les patients.
     */
    public static function patientPhoneDigitsHash(string $digits10): ?string
    {
        if (strlen($digits10) !== 10) {
            return null;
        }
        return hash('sha256', 'fr|' . $digits10);
    }

    public function findPatientIdByPhoneDigitsHash(string $phoneHash): ?string
    {
        if (!$this->hasPhoneDigitsHashColumn() || $phoneHash === '') {
            return null;
        }
        $stmt = $this->db->prepare('SELECT id FROM profiles WHERE phone_digits_hash = ? AND role = ? LIMIT 1');
        $stmt->execute([$phoneHash, 'patient']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (string) $row['id'] : null;
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
     * Ajoute le filtre « mes patients » : created_by OU lien patient_professional_access.
     */
    private function appendPatientListScopeSql(string &$sql, array &$params, array $filters): void
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
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = 'SELECT id, role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek';
        if ($this->hasCompanyNameColumn()) {
            $sql .= ', company_name_encrypted, company_name_dek';
        }
        $sql .= ' FROM profiles WHERE id IN (' . $placeholders . ')';
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_values($ids));
        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            $name = null;
            if (in_array($row['role'] ?? '', ['lab', 'subaccount'], true) && $this->hasCompanyNameColumn()
                && !empty($row['company_name_encrypted'] ?? '') && !empty($row['company_name_dek'] ?? '')) {
                try {
                    $name = trim($this->crypto->decryptField($row['company_name_encrypted'], $row['company_name_dek']));
                } catch (Exception $e) {
                    $name = '';
                }
            }
            if (!$name || $name === '') {
                try {
                    $first = !empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])
                        ? trim($this->crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek'])) : '';
                    $last = !empty($row['last_name_encrypted']) && !empty($row['last_name_dek'])
                        ? trim($this->crypto->decryptField($row['last_name_encrypted'], $row['last_name_dek'])) : '';
                    $name = trim($first . ' ' . $last) ?: null;
                } catch (Exception $e) {
                    $name = null;
                }
            }
            $result[$row['id']] = $name;
        }
        return $result;
    }

    /**
     * Photos de profil pour une liste d'IDs (liste RDV — évite N+1 sur getById).
     *
     * @return array<string, string|null> id => profile_image_url
     */
    public function getProfileImageUrlsByIds(array $ids): array
    {
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            'SELECT id, profile_image_url FROM profiles WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute(array_values($ids));
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $url = isset($row['profile_image_url']) ? trim((string) $row['profile_image_url']) : '';
            $result[(string) $row['id']] = $url !== '' ? $url : null;
        }
        return $result;
    }

    /**
     * Genres déchiffrés pour une liste d'IDs (cartes RDV — avatars Personas).
     *
     * @return array<string, string|null> id => male|female|other|null
     */
    public function getGendersByIds(array $ids): array
    {
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            'SELECT id, gender_encrypted, gender_dek FROM profiles WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute(array_values($ids));
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $id = (string) $row['id'];
            if (!empty($row['gender_encrypted']) && !empty($row['gender_dek'])) {
                try {
                    $g = strtolower(trim($this->crypto->decryptField(
                        $row['gender_encrypted'],
                        $row['gender_dek']
                    )));
                    $result[$id] = in_array($g, ['male', 'female', 'other'], true) ? $g : null;
                } catch (Exception $e) {
                    $result[$id] = null;
                }
            } else {
                $result[$id] = null;
            }
        }
        return $result;
    }

    /**
     * Récupère la liste des utilisateurs avec pagination et filtres
     */
    public function getAll(array $filters = [], int $page = 1, int $limit = 20, string $requesterId = '', string $requesterRole = ''): array
    {
        $sql = 'SELECT id, role, created_at, updated_at, banned_until, incident_count, last_incident_at,
            email_encrypted, email_dek, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek, profile_image_url';
        if ($this->hasCompanyNameColumn()) {
            $sql .= ', company_name_encrypted, company_name_dek';
        }
        if ($this->hasLabIdColumn()) {
            $sql .= ', lab_id';
        }
        if (!empty($filters['role']) && $filters['role'] === 'patient') {
            $sql .= ', birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek';
        }
        if ($this->hasCreatedByColumn()) {
            $sql .= ', created_by';
        }
        $sql .= ' FROM profiles WHERE 1=1';
        $params = [];
        
        // Filtrer par rôle
        if (!empty($filters['role'])) {
            $sql .= ' AND role = ?';
            $params[] = $filters['role'];
        }
        
        // Filtrer par lab_id (pour subaccounts et preleveurs)
        if (!empty($filters['lab_id']) && $this->hasLabIdColumn()) {
            $sql .= ' AND lab_id = ?';
            $params[] = $filters['lab_id'];
        }
        $this->appendPatientListScopeSql($sql, $params, $filters);
        // Filtrer par statut (active, suspended, banned)
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'banned') {
                $sql .= " AND banned_until > '9999-12-30'";
            } elseif ($filters['status'] === 'suspended') {
                $sql .= ' AND banned_until > NOW() AND banned_until < \'9999-12-31\'';
            } elseif ($filters['status'] === 'active') {
                $sql .= ' AND (banned_until IS NULL OR banned_until < NOW())';
            }
        }

        // Compter le total
        $countSql = 'SELECT COUNT(*) as total FROM profiles WHERE 1=1';
        $countParams = [];
        if (!empty($filters['role'])) {
            $countSql .= ' AND role = ?';
            $countParams[] = $filters['role'];
        }
        if (!empty($filters['lab_id']) && $this->hasLabIdColumn()) {
            $countSql .= ' AND lab_id = ?';
            $countParams[] = $filters['lab_id'];
        }
        $this->appendPatientListScopeSql($countSql, $countParams, $filters);
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'banned') {
                $countSql .= " AND banned_until > '9999-12-30'";
            } elseif ($filters['status'] === 'suspended') {
                $countSql .= ' AND banned_until > NOW() AND banned_until < \'9999-12-31\'';
            } elseif ($filters['status'] === 'active') {
                $countSql .= ' AND (banned_until IS NULL OR banned_until < NOW())';
            }
        }

        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($countParams);
        $total = (int) $countStmt->fetch()['total'];
        
        // Pagination
        $offset = ($page - 1) * $limit;
        $sql .= ' ORDER BY created_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();
        
        // Déchiffrer en place (éviter N+1 getById)
        $decryptedUsers = [];
        foreach ($users as $u) {
            try {
                $u['email'] = !empty($u['email_encrypted']) && !empty($u['email_dek'])
                    ? $this->crypto->decryptField($u['email_encrypted'], $u['email_dek']) : '';
                $u['first_name'] = !empty($u['first_name_encrypted']) && !empty($u['first_name_dek'])
                    ? $this->crypto->decryptField($u['first_name_encrypted'], $u['first_name_dek']) : '';
                $u['last_name'] = !empty($u['last_name_encrypted']) && !empty($u['last_name_dek'])
                    ? $this->crypto->decryptField($u['last_name_encrypted'], $u['last_name_dek']) : '';
                $u['phone'] = !empty($u['phone_encrypted']) && !empty($u['phone_dek'])
                    ? $this->crypto->decryptField($u['phone_encrypted'], $u['phone_dek']) : null;
                $u['company_name'] = null;
                if ($this->hasCompanyNameColumn() && !empty($u['company_name_encrypted'] ?? '') && !empty($u['company_name_dek'] ?? '')) {
                    $u['company_name'] = $this->crypto->decryptField($u['company_name_encrypted'], $u['company_name_dek']);
                }
                $u['gender'] = null;
                $u['birth_date'] = null;
                if (!empty($u['gender_encrypted']) && !empty($u['gender_dek'])) {
                    $u['gender'] = $this->crypto->decryptField($u['gender_encrypted'], $u['gender_dek']);
                }
                if (!empty($u['birth_date_encrypted']) && !empty($u['birth_date_dek'])) {
                    $u['birth_date'] = $this->crypto->decryptField($u['birth_date_encrypted'], $u['birth_date_dek']);
                }
                unset($u['email_encrypted'], $u['email_dek'], $u['first_name_encrypted'], $u['first_name_dek'],
                    $u['last_name_encrypted'], $u['last_name_dek'], $u['phone_encrypted'], $u['phone_dek']);
                if (isset($u['company_name_encrypted'])) unset($u['company_name_encrypted'], $u['company_name_dek']);
                unset($u['gender_encrypted'], $u['gender_dek'], $u['birth_date_encrypted'], $u['birth_date_dek']);
                $logFields = ['email', 'first_name', 'last_name', 'phone', 'company_name'];
                if ($u['gender'] !== null) {
                    $logFields[] = 'gender';
                }
                if ($u['birth_date'] !== null) {
                    $logFields[] = 'birth_date';
                }
                if (array_key_exists('profile_image_url', $u)) {
                    $url = trim((string) ($u['profile_image_url'] ?? ''));
                    $u['profile_image_url'] = $url !== '' ? $url : null;
                }
                $this->logger->logDecrypt($requesterId, $requesterRole, 'profile', $u['id'], array_fill_keys($logFields, true));
                $decryptedUsers[] = $u;
            } catch (Exception $e) {
                $decryptedUsers[] = [
                    'id' => $u['id'],
                    'role' => $u['role'],
                    'first_name' => '',
                    'last_name' => '',
                    'email' => '',
                    'company_name' => null,
                    'created_at' => $u['created_at'],
                    'updated_at' => $u['updated_at'],
                    'banned_until' => $u['banned_until'],
                    'incident_count' => $u['incident_count'] ?? 0,
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }

        $creatorIdsForDisplay = [];
        foreach ($decryptedUsers as $u) {
            if (($u['role'] ?? '') !== 'patient' || empty($u['created_by'])) {
                continue;
            }
            $em = (string) ($u['email'] ?? '');
            if ($em !== '' && str_ends_with($em, '@patients.internal.local')) {
                $creatorIdsForDisplay[] = (string) $u['created_by'];
            }
        }
        $creatorEmailsMap = $this->getCreatorEmailsForDisplay($creatorIdsForDisplay);
        foreach ($decryptedUsers as &$u) {
            if (($u['role'] ?? '') !== 'patient') {
                continue;
            }
            $em = (string) ($u['email'] ?? '');
            if ($em === '' || !str_ends_with($em, '@patients.internal.local') || empty($u['created_by'])) {
                continue;
            }
            $proEmail = $creatorEmailsMap[(string) $u['created_by']] ?? null;
            if ($proEmail) {
                $u['email_display'] = 'Sans email patient — notifications / contact professionnel : ' . $proEmail;
            } else {
                $u['email_display'] = 'Patient sans email (créé par un professionnel)';
            }
        }
        unset($u);
        
        return [
            'data' => $decryptedUsers,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit),
        ];
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
                    throw new Exception('Accès refusé : vous ne pouvez supprimer que les membres de votre laboratoire');
                }
            } else {
                throw new Exception('Accès refusé');
            }
        }

        // Réattribuer les lignes qui référencent ce profil (FK ON DELETE RESTRICT) à l'admin qui supprime
        $updates = [
            ['appointment_status_updates', 'actor_id'],
            ['appointments', 'created_by'],
            ['medical_documents', 'uploaded_by'],
            ['reviews', 'patient_id'],
            ['reviews', 'reviewee_id'],
        ];
        foreach ($updates as [$table, $column]) {
            try {
                $stmt = $this->db->prepare("UPDATE {$table} SET {$column} = ? WHERE {$column} = ?");
                $stmt->execute([$actorId, $id]);
            } catch (\Throwable $e) {
                // Table ou colonne absente (migrations partielles)
            }
        }

        $this->logger->log($actorId, $actorRole, 'delete', 'profile', $id, []);

        $stmt = $this->db->prepare('DELETE FROM profiles WHERE id = ?');
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Supprime un patient créé par le professionnel (pro, nurse, lab, subaccount) ou super_admin.
     * Refuse si des rendez-vous sont encore en attente / confirmés / en cours.
     */
    public function deletePatientCreatedBy(string $patientId, string $actorId, string $actorRole): bool
    {
        if (!in_array($actorRole, ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true)) {
            throw new Exception('Accès refusé');
        }
        $stmt = $this->db->prepare('SELECT id, role, created_by FROM profiles WHERE id = ?');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Patient introuvable');
        }
        if (($row['role'] ?? '') !== 'patient') {
            throw new Exception('Ce compte n’est pas un patient');
        }
        if ($actorRole !== 'super_admin') {
            if (($row['created_by'] ?? '') !== $actorId) {
                throw new Exception('Vous ne pouvez supprimer que les patients que vous avez créés');
            }
        }
        $cntStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status IN ('pending','confirmed','planned','inProgress')"
        );
        $cntStmt->execute([$patientId]);
        $active = (int) $cntStmt->fetchColumn();
        if ($active > 0) {
            throw new Exception('Impossible de supprimer : rendez-vous en attente ou en cours pour ce patient');
        }

        $updates = [
            ['appointment_status_updates', 'actor_id'],
            ['appointments', 'created_by'],
            ['medical_documents', 'uploaded_by'],
            ['reviews', 'patient_id'],
            ['reviews', 'reviewee_id'],
        ];
        foreach ($updates as [$table, $column]) {
            try {
                $u = $this->db->prepare("UPDATE {$table} SET {$column} = ? WHERE {$column} = ?");
                $u->execute([$actorId, $patientId]);
            } catch (\Throwable $e) {
            }
        }

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
}

