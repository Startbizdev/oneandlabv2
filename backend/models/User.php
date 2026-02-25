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

        // Patient créé par un pro ou super_admin : lien created_by
        $createdBy = null;
        if (($role === 'patient') && !empty($data['created_by']) && in_array($actorRole, ['pro', 'super_admin'], true)) {
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
        if ($role === 'patient' && !empty(trim((string)($data['gender'] ?? '')))) {
            $genderEnc = $this->crypto->encryptField(trim((string)$data['gender']));
            $insertFields .= ', gender_encrypted, gender_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $genderEnc['encrypted'];
            $insertParams[] = $genderEnc['dek'];
        }
        if ($role === 'patient' && !empty($data['address']) && is_array($data['address'])) {
            $addressJson = json_encode($data['address']);
            $addressEnc = $this->crypto->encryptField($addressJson);
            $insertFields .= ', address_encrypted, address_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $addressEnc['encrypted'];
            $insertParams[] = $addressEnc['dek'];
        }
        // Pro : Adeli et emploi (lors de la création depuis une demande d'inscription)
        if ($role === 'pro' && $this->hasAdeliColumn() && !empty(trim((string)($data['adeli'] ?? '')))) {
            $adeliEnc = $this->crypto->encryptField(trim((string)$data['adeli']));
            $insertFields .= ', adeli_encrypted, adeli_dek';
            $insertPlaceholders .= ', ?, ?';
            $insertParams[] = $adeliEnc['encrypted'];
            $insertParams[] = $adeliEnc['dek'];
        }
        if ($role === 'pro' && $this->hasEmploiColumn() && !empty(trim((string)($data['emploi'] ?? '')))) {
            $emploiVal = trim((string)$data['emploi']);
            if (strlen($emploiVal) > 120) $emploiVal = substr($emploiVal, 0, 120);
            $insertFields .= ', emploi';
            $insertPlaceholders .= ', ?';
            $insertParams[] = $emploiVal;
        }
        
        $stmt = $this->db->prepare("INSERT INTO profiles ($insertFields) VALUES ($insertPlaceholders)");
        
        try {
            $stmt->execute($insertParams);
        } catch (PDOException $e) {
            throw new Exception('Erreur lors de la création de l\'utilisateur: ' . $e->getMessage());
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
        
        return $id;
    }

    /**
     * Récupère un utilisateur par ID (avec déchiffrement)
     */
    public function getById(string $id, string $requesterId, string $requesterRole): ?array
    {
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
                $user['address'] = json_decode($addressJson, true);
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
                $user['emploi'] = $user['emploi'] !== null ? trim((string)$user['emploi']) : null;
            } else {
                $user['emploi'] = null;
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
        unset($user['rpps_encrypted'], $user['rpps_dek']);
        unset($user['email_hash']);
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
        foreach (['is_accepting_appointments', 'accept_rdv_saturday', 'accept_rdv_sunday'] as $boolCol) {
            if (array_key_exists($boolCol, $user)) {
                $user[$boolCol] = (bool) ($user[$boolCol] ?? false);
            }
        }
        
        return $user;
    }

    /**
     * Trouve un utilisateur par email hash (pour authentification)
     */
    public function findByEmailHash(string $emailHash): ?array
    {
        $stmt = $this->db->prepare('SELECT id, role, banned_until FROM profiles WHERE email_hash = ?');
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
        }
        
        if (isset($data['address'])) {
            if (!empty($data['address'])) {
                $addressJson = json_encode($data['address']);
                $addressEncrypted = $this->crypto->encryptField($addressJson);
                $updates[] = 'address_encrypted = ?, address_dek = ?';
                $params[] = $addressEncrypted['encrypted'];
                $params[] = $addressEncrypted['dek'];
            } else {
                $updates[] = 'address_encrypted = NULL, address_dek = NULL';
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
        
        if (isset($data['rpps'])) {
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

    /**
     * Récupère la liste des utilisateurs avec pagination et filtres
     */
    public function getAll(array $filters = [], int $page = 1, int $limit = 20, string $requesterId = '', string $requesterRole = ''): array
    {
        $sql = 'SELECT id, role, created_at, updated_at, banned_until, incident_count, last_incident_at';
        if ($this->hasLabIdColumn()) {
            $sql .= ', lab_id';
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
        // Filtrer par created_by (patients du pro)
        if (!empty($filters['created_by']) && $this->hasCreatedByColumn()) {
            $sql .= ' AND created_by = ?';
            $params[] = $filters['created_by'];
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
        if (!empty($filters['created_by']) && $this->hasCreatedByColumn()) {
            $countSql .= ' AND created_by = ?';
            $countParams[] = $filters['created_by'];
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
        
        // Déchiffrer les données pour chaque utilisateur
        $decryptedUsers = [];
        foreach ($users as $user) {
            try {
                $decrypted = $this->getById($user['id'], $requesterId, $requesterRole);
                if ($decrypted) {
                    $decryptedUsers[] = $decrypted;
                }
            } catch (Exception $e) {
                // En cas d'erreur de déchiffrement, retourner les données de base (clés attendues par le frontend)
                $decryptedUsers[] = [
                    'id' => $user['id'],
                    'role' => $user['role'],
                    'first_name' => '',
                    'last_name' => '',
                    'email' => '',
                    'created_at' => $user['created_at'],
                    'updated_at' => $user['updated_at'],
                    'banned_until' => $user['banned_until'],
                    'incident_count' => $user['incident_count'] ?? 0,
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }
        
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

