<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

/**
 * Demandes d'inscription (lab, pro, nurse) — création, liste, accept/reject.
 */
class RegistrationRequest
{
    private PDO $db;
    private Crypto $crypto;

    /** @var list<string>|null cache SHOW COLUMNS registration_requests */
    private ?array $registrationRequestColumns = null;

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
    }

    /** Noms de colonnes réels (prod peut être en retard sur les migrations, ex. 049 gender chiffré). */
    private function registrationRequestColumnNames(): array
    {
        if ($this->registrationRequestColumns !== null) {
            return $this->registrationRequestColumns;
        }
        $stmt = $this->db->query('SHOW COLUMNS FROM registration_requests');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->registrationRequestColumns = array_column($rows, 'Field');
        return $this->registrationRequestColumns;
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /** Créer une demande (champs chiffrés). */
    public function create(array $data): string
    {
        $id = $this->uuid();
        $role = $data['role'] ?? '';
        if (!in_array($role, ['lab', 'pro', 'nurse'], true)) {
            throw new Exception('Rôle invalide. Attendu: lab, pro ou nurse.');
        }
        $email = trim((string)($data['email'] ?? ''));
        $first_name = trim((string)($data['first_name'] ?? ''));
        $last_name = trim((string)($data['last_name'] ?? ''));
        if ($email === '' || $first_name === '' || $last_name === '') {
            throw new Exception('Email, prénom et nom sont requis.');
        }

        $emailHash = hash('sha256', strtolower($email));

        // Email déjà utilisé par un compte actif → pas de nouvelle demande
        $existingProfile = $this->db->prepare('SELECT id, role FROM profiles WHERE email_hash = ? LIMIT 1');
        $existingProfile->execute([$emailHash]);
        $profileRow = $existingProfile->fetch(PDO::FETCH_ASSOC);
        if ($profileRow) {
            $existingRole = (string) ($profileRow['role'] ?? '');
            if ($existingRole === $role) {
                throw new Exception(
                    'Un compte ' . $role . ' existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ».'
                );
            }
            throw new Exception(
                'Cet email est déjà utilisé par un compte Cary (rôle « ' . $existingRole . ' »).'
            );
        }

        // Demande déjà en attente pour cet email
        $pendingReq = $this->db->prepare(
            "SELECT id FROM registration_requests WHERE email_hash = ? AND status = 'pending' LIMIT 1"
        );
        $pendingReq->execute([$emailHash]);
        if ($pendingReq->fetch(PDO::FETCH_ASSOC)) {
            throw new Exception('Une demande d\'inscription est déjà en cours de validation pour cet email.');
        }

        $emailEnc = $this->crypto->encryptField($email);
        $firstEnc = $this->crypto->encryptField($first_name);
        $lastEnc = $this->crypto->encryptField($last_name);

        $phoneEnc = $phoneDek = null;
        $phoneVal = isset($data['phone']) ? trim((string) $data['phone']) : '';
        if ($phoneVal !== '') {
            $p = $this->crypto->encryptField($phoneVal);
            $phoneEnc = $p['encrypted'];
            $phoneDek = $p['dek'];
        }
        $addrEnc = $addrDek = null;
        if (!empty($data['address'])) {
            $addr = is_string($data['address']) ? $data['address'] : json_encode($data['address']);
            $a = $this->crypto->encryptField($addr);
            $addrEnc = $a['encrypted'];
            $addrDek = $a['dek'];
        }
        $siretEnc = $siretDek = $adeliEnc = $adeliDek = $rppsEnc = $rppsDek = $companyEnc = $companyDek = null;
        if (!empty(trim((string)($data['siret'] ?? '')))) {
            $s = $this->crypto->encryptField(trim((string)$data['siret']));
            $siretEnc = $s['encrypted'];
            $siretDek = $s['dek'];
        }
        if (!empty(trim((string)($data['adeli'] ?? '')))) {
            $ad = $this->crypto->encryptField(trim((string)$data['adeli']));
            $adeliEnc = $ad['encrypted'];
            $adeliDek = $ad['dek'];
        }
        if (!empty(trim((string)($data['rpps'] ?? '')))) {
            $r = $this->crypto->encryptField(trim((string)$data['rpps']));
            $rppsEnc = $r['encrypted'];
            $rppsDek = $r['dek'];
        }
        if (!empty(trim((string)($data['company_name'] ?? '')))) {
            $c = $this->crypto->encryptField(trim((string)$data['company_name']));
            $companyEnc = $c['encrypted'];
            $companyDek = $c['dek'];
        }
        $emploi = null;
        if ($role === 'pro' && !empty(trim((string)($data['emploi'] ?? '')))) {
            $emploi = trim((string)$data['emploi']);
            if (strlen($emploi) > 120) $emploi = substr($emploi, 0, 120);
        }

        $cols = $this->registrationRequestColumnNames();
        $hasGenderEnc = in_array('gender_encrypted', $cols, true) && in_array('gender_dek', $cols, true);
        $hasGenderPlain = in_array('gender', $cols, true);

        $genderEnc = $genderDek = null;
        $genderPlain = null;
        if ($role === 'nurse' && !empty(trim((string)($data['gender'] ?? '')))) {
            $g = strtolower(trim((string)$data['gender']));
            if (in_array($g, ['male', 'female', 'other'], true)) {
                if ($hasGenderEnc) {
                    $ge = $this->crypto->encryptField($g);
                    $genderEnc = $ge['encrypted'];
                    $genderDek = $ge['dek'];
                } elseif ($hasGenderPlain) {
                    $genderPlain = $g;
                }
            }
        }

        $fields = [
            'id', 'role', 'status', 'email_hash', 'email_encrypted', 'email_dek',
            'first_name_encrypted', 'first_name_dek', 'last_name_encrypted', 'last_name_dek',
        ];
        $placeholders = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
        $params = [
            $id, $role, 'pending', $emailHash,
            $emailEnc['encrypted'], $emailEnc['dek'],
            $firstEnc['encrypted'], $firstEnc['dek'],
            $lastEnc['encrypted'], $lastEnc['dek'],
        ];
        if ($hasGenderEnc) {
            $fields[] = 'gender_encrypted';
            $fields[] = 'gender_dek';
            $placeholders[] = '?';
            $placeholders[] = '?';
            $params[] = $genderEnc;
            $params[] = $genderDek;
        } elseif ($hasGenderPlain) {
            $fields[] = 'gender';
            $placeholders[] = '?';
            $params[] = $genderPlain;
        }

        $fields = array_merge($fields, [
            'phone_encrypted', 'phone_dek', 'address_encrypted', 'address_dek',
            'siret_encrypted', 'siret_dek', 'adeli_encrypted', 'adeli_dek', 'rpps_encrypted', 'rpps_dek',
            'company_name_encrypted', 'company_name_dek', 'emploi', 'created_at',
        ]);
        $placeholders = array_merge($placeholders, ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', 'NOW()']);
        $params = array_merge($params, [
            $phoneEnc, $phoneDek, $addrEnc, $addrDek,
            $siretEnc, $siretDek, $adeliEnc, $adeliDek, $rppsEnc, $rppsDek,
            $companyEnc, $companyDek, $emploi,
        ]);

        $sql = 'INSERT INTO registration_requests (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        try {
            require_once __DIR__ . '/../lib/AdminEmailNotifier.php';
            AdminEmailNotifier::registrationRequestSubmitted($id, $role, $data);
        } catch (Throwable $e) {
            error_log('RegistrationRequest admin email: ' . $e->getMessage());
        }

        return $id;
    }

    /** Liste pour admin (déchiffrée). SELECT * : compatible si la migration 049 (gender chiffré) n’est pas appliquée. */
    public function getAll(string $status = '', string $role = ''): array
    {
        $sql = 'SELECT * FROM registration_requests WHERE 1=1';
        $params = [];
        if ($status !== '' && in_array($status, ['pending', 'accepted', 'rejected'], true)) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        if ($role !== '' && in_array($role, ['lab', 'pro', 'nurse'], true)) {
            $sql .= ' AND role = ?';
            $params[] = $role;
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = $this->decryptRow($r);
        }
        return $out;
    }

    private function decryptRow(array $r): array
    {
        $crypto = $this->crypto;
        $dec = function ($enc, $dek) use ($crypto) {
            if (empty($enc) || empty($dek)) return '';
            try {
                return $crypto->decryptField($enc, $dek);
            } catch (Throwable $e) {
                return '';
            }
        };
        return [
            'id' => $r['id'],
            'role' => $r['role'],
            'status' => $r['status'],
            'email' => $dec($r['email_encrypted'] ?? '', $r['email_dek'] ?? ''),
            'first_name' => $dec($r['first_name_encrypted'] ?? '', $r['first_name_dek'] ?? ''),
            'last_name' => $dec($r['last_name_encrypted'] ?? '', $r['last_name_dek'] ?? ''),
            'gender' => $this->genderFromRow($r, $dec),
            'phone' => $dec($r['phone_encrypted'] ?? '', $r['phone_dek'] ?? ''),
            'address' => $this->parseAddressFromDecrypted($dec($r['address_encrypted'] ?? '', $r['address_dek'] ?? '')),
            'siret' => $dec($r['siret_encrypted'] ?? '', $r['siret_dek'] ?? ''),
            'adeli' => $dec($r['adeli_encrypted'] ?? '', $r['adeli_dek'] ?? ''),
            'rpps' => $dec($r['rpps_encrypted'] ?? '', $r['rpps_dek'] ?? ''),
            'company_name' => $dec($r['company_name_encrypted'] ?? '', $r['company_name_dek'] ?? ''),
            'emploi' => isset($r['emploi']) ? trim((string)$r['emploi']) : '',
            'created_at' => $r['created_at'],
            'reviewed_at' => $r['reviewed_at'],
            'reviewed_by' => $r['reviewed_by'],
        ];
    }

    /**
     * Genre infirmier : chiffré (049) ou colonne en clair si ajoutée manuellement sur l’ancien schéma.
     *
     * @param callable(string, string): string $dec
     */
    private function genderFromRow(array $r, callable $dec): string
    {
        $enc = $r['gender_encrypted'] ?? null;
        $dek = $r['gender_dek'] ?? null;
        if ($enc !== null && $enc !== '' && $dek !== null && $dek !== '') {
            return $dec($enc, $dek);
        }
        if (isset($r['gender']) && $r['gender'] !== null && $r['gender'] !== '') {
            $g = strtolower(trim((string) $r['gender']));
            if (in_array($g, ['male', 'female', 'other'], true)) {
                return $g;
            }
            return trim((string) $r['gender']);
        }
        return '';
    }

    /** Libellé lisible pour adresse stockée en JSON ({label,lat,lng}) ou texte libre. */
    private function normalizeAddressLabel(string $raw): string
    {
        $parsed = $this->parseAddressFromDecrypted($raw);
        if (is_array($parsed) && !empty($parsed['label'])) {
            return (string) $parsed['label'];
        }

        return trim($raw);
    }

    /**
     * Conserve label + coordonnées depuis le JSON chiffré d'inscription.
     *
     * @return array{label: string, lat?: float, lng?: float}|null
     */
    private function parseAddressFromDecrypted(string $raw): ?array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if ($raw[0] === '{') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $label = trim((string) ($decoded['label'] ?? ''));
                if ($label === '') {
                    return null;
                }
                $out = ['label' => $label];
                if (isset($decoded['lat']) && is_numeric($decoded['lat'])) {
                    $out['lat'] = (float) $decoded['lat'];
                }
                if (isset($decoded['lng']) && is_numeric($decoded['lng'])) {
                    $out['lng'] = (float) $decoded['lng'];
                }

                return $out;
            }
        }

        return ['label' => $raw];
    }

    /**
     * Géocode l'adresse d'inscription si lat/lng absents (fallback Google).
     *
     * @param array<string, mixed>|string|null $rawAddress
     * @return array{label: string, lat: float, lng: float}|null
     */
    private function resolveAddressWithGeocode($rawAddress): ?array
    {
        $addr = null;
        if (is_array($rawAddress)) {
            $addr = $rawAddress;
        } elseif (is_string($rawAddress) && $rawAddress !== '') {
            $addr = $this->parseAddressFromDecrypted($rawAddress);
        }
        if (!$addr || empty($addr['label'])) {
            return null;
        }

        $label = trim((string) $addr['label']);
        $lat = isset($addr['lat']) && is_numeric($addr['lat']) ? (float) $addr['lat'] : null;
        $lng = isset($addr['lng']) && is_numeric($addr['lng']) ? (float) $addr['lng'] : null;
        if ($lat !== null && $lng !== null && !($lat === 0.0 && $lng === 0.0)) {
            return ['label' => $label, 'lat' => $lat, 'lng' => $lng];
        }

        try {
            require_once __DIR__ . '/../lib/GoogleAddressSearch.php';
            $hits = (new GoogleAddressSearch())->search($label, 1);
            $hit = $hits[0] ?? null;
            if (is_array($hit) && isset($hit['lat'], $hit['lng']) && is_numeric($hit['lat']) && is_numeric($hit['lng'])) {
                return [
                    'label' => trim((string) ($hit['label'] ?? $label)),
                    'lat' => (float) $hit['lat'],
                    'lng' => (float) $hit['lng'],
                ];
            }
        } catch (Throwable $e) {
            error_log('resolveAddressWithGeocode: ' . $e->getMessage());
        }

        return null;
    }

    /** Fiche publique activée par défaut à l'acceptation (visible sur le site une fois le compte créé). */
    private function enableDefaultPublicProfile(string $userId, string $role): void
    {
        if (!in_array($role, ['nurse', 'pro', 'lab', 'subaccount'], true)) {
            return;
        }
        $slug = 'profil-' . substr(str_replace('-', '', $userId), 0, 12);
        $this->db->prepare(
            'UPDATE profiles SET
                is_public_profile_enabled = 1,
                public_slug = CASE
                    WHEN public_slug IS NULL OR TRIM(public_slug) = \'\' THEN ?
                    ELSE public_slug
                END
             WHERE id = ?'
        )->execute([$slug, $userId]);
    }

    public function getById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM registration_requests WHERE id = ?');
        $stmt->execute([$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->decryptRow($r) : null;
    }

    /** Accepter : créer le profil puis marquer accepté. */
    public function accept(string $id, string $actorId): array
    {
        $req = $this->getById($id);
        if (!$req || $req['status'] !== 'pending') {
            throw new Exception('Demande introuvable ou déjà traitée.');
        }
        require_once __DIR__ . '/User.php';
        $userModel = new User();
        $createData = [
            'email' => $req['email'],
            'first_name' => $req['first_name'],
            'last_name' => $req['last_name'],
            'role' => $req['role'],
            'phone' => $req['phone'] ?: '',
        ];
        if ($req['role'] === 'lab' && !empty(trim((string)($req['company_name'] ?? '')))) {
            $createData['company_name'] = trim((string)$req['company_name']);
        }
        if ($req['role'] === 'pro') {
            require_once __DIR__ . '/../lib/ProfessionalId.php';
            $rawId = ProfessionalId::fromRequestBody([
                'rpps' => $req['rpps'] ?? '',
                'adeli' => $req['adeli'] ?? '',
            ]);
            if ($rawId !== '') {
                $split = ProfessionalId::split($rawId);
                if (!empty($split['rpps'])) {
                    $createData['rpps'] = $split['rpps'];
                } else {
                    unset($createData['rpps']);
                }
                if (!empty($split['adeli'])) {
                    $createData['adeli'] = $split['adeli'];
                } else {
                    unset($createData['adeli']);
                }
            }
            if (!empty(trim((string)($req['emploi'] ?? '')))) {
                $createData['emploi'] = trim((string)$req['emploi']);
                if (strlen($createData['emploi']) > 120) $createData['emploi'] = substr($createData['emploi'], 0, 120);
            }
        }
        if (in_array($req['role'], ['lab', 'nurse'], true)) {
            $resolvedAddress = $this->resolveAddressWithGeocode($req['address'] ?? null);
            if ($resolvedAddress) {
                $createData['address'] = $resolvedAddress;
            }
        }
        if ($req['role'] === 'nurse' && !empty(trim((string)($req['gender'] ?? '')))) {
            $g = strtolower(trim((string)$req['gender']));
            if (in_array($g, ['male', 'female', 'other'], true)) {
                $createData['gender'] = $g;
            }
        }
        if ($req['role'] === 'nurse') {
            require_once __DIR__ . '/../lib/ProfessionalId.php';
            $rawId = ProfessionalId::display($req['rpps'] ?? null, $req['adeli'] ?? null);
            if ($rawId !== '') {
                $split = ProfessionalId::split($rawId);
                if (!empty($split['rpps'])) {
                    $createData['rpps'] = $split['rpps'];
                }
                if (!empty($split['adeli'])) {
                    $createData['adeli'] = $split['adeli'];
                }
            }
        }

        $emailHash = hash('sha256', strtolower(trim((string) $req['email'])));
        $existingStmt = $this->db->prepare('SELECT id, role FROM profiles WHERE email_hash = ? LIMIT 1');
        $existingStmt->execute([$emailHash]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
        $linkedExisting = false;

        if ($existing) {
            if (($existing['role'] ?? '') !== $req['role']) {
                throw new Exception(
                    'Un compte existe déjà avec cet email (rôle « ' . ($existing['role'] ?? '?') . ' »). '
                    . 'Impossible d\'accepter cette demande « ' . $req['role'] . ' ».'
                );
            }
            $userId = (string) $existing['id'];
            $linkedExisting = true;
            unset($createData['email'], $createData['role']);
            $userModel->update($userId, $createData, $actorId, 'super_admin');
        } else {
            $userId = $userModel->create($createData, $actorId, 'super_admin');
        }

        $this->db->prepare('UPDATE registration_requests SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?')
            ->execute(['accepted', $actorId, $id]);

        // Activer toutes les catégories de soins selon le rôle
        try {
            $this->enableAllCategories($userId, $req['role']);
        } catch (Throwable $e) {
            error_log('RegistrationRequest accept enableAllCategories: ' . $e->getMessage());
        }

        // Créer la zone de couverture à partir de l'adresse d'inscription
        try {
            $resolvedForZone = $this->resolveAddressWithGeocode($req['address'] ?? null);
            $this->createCoverageZoneFromAddress($userId, $req['role'], $resolvedForZone);
        } catch (Throwable $e) {
            error_log('RegistrationRequest accept createCoverageZone: ' . $e->getMessage());
        }

        try {
            $this->enableDefaultPublicProfile($userId, $req['role']);
        } catch (Throwable $e) {
            error_log('RegistrationRequest accept enableDefaultPublicProfile: ' . $e->getMessage());
        }

        try {
            require_once __DIR__ . '/Notification.php';
            $notificationModel = new Notification();
            if (!$notificationModel->hasWelcomeNotification($userId)) {
                $notificationModel->createWelcomeNotification($userId, $req['role']);
            }
        } catch (Throwable $e) {
            error_log('RegistrationRequest accept welcome notification: ' . $e->getMessage());
        }

        // Email de confirmation à l'utilisateur
        try {
            require_once __DIR__ . '/../lib/Email.php';
            $emailLib = new Email();
            $emailLib->sendRegistrationAccepted((string)$req['email'], [
                'first_name' => (string)($req['first_name'] ?? ''),
                'role'       => (string)$req['role'],
            ]);
        } catch (Throwable $e) {
            error_log('RegistrationRequest accept email: ' . $e->getMessage());
        }

        // SMS si numéro disponible
        if (!empty(trim((string)($req['phone'] ?? '')))) {
            try {
                require_once __DIR__ . '/../lib/SmsSender.php';
                $sms = SmsSender::tryCreate();
                if ($sms === null) {
                    throw new RuntimeException('SMS non configuré');
                }
                $firstName = trim((string)($req['first_name'] ?? ''));
                $greeting = $firstName !== '' ? "Bonjour {$firstName}," : 'Bonjour,';
                $baseUrl = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
                $roleLabel = $req['role'] === 'nurse' ? 'infirmier(e)' : 'professionnel de santé';
                $sms->sendSMS(
                    trim((string)$req['phone']),
                    "{$greeting} votre compte Cary en tant que {$roleLabel} a été approuvé ! Connectez-vous dès maintenant : {$baseUrl}"
                );
            } catch (Throwable $e) {
                if (stripos($e->getMessage(), 'Authenticate') === false) {
                    error_log('RegistrationRequest accept SMS: ' . $e->getMessage());
                }
            }
        }

        return [
            'user_id' => $userId,
            'linked_existing' => $linkedExisting,
        ];
    }

    /**
     * Crée automatiquement une zone de couverture depuis l'adresse d'inscription.
     * Si une zone existe déjà pour cet utilisateur, elle n'est pas écrasée.
     */
    private function createCoverageZoneFromAddress(string $userId, string $role, $rawAddress): void
    {
        if (!in_array($role, ['nurse', 'lab', 'subaccount'], true)) return;

        $addr = null;
        if (is_array($rawAddress)) {
            $addr = $rawAddress;
        } elseif (is_string($rawAddress) && $rawAddress !== '') {
            $addr = $this->parseAddressFromDecrypted($rawAddress);
        }

        if (!$addr || empty($addr['lat']) || empty($addr['lng'])) {
            $addr = $this->resolveAddressWithGeocode($rawAddress);
        }

        if (!$addr || empty($addr['lat']) || empty($addr['lng'])) {
            error_log("createCoverageZoneFromAddress: pas de lat/lng pour user {$userId}");
            return;
        }

        $lat = (float) $addr['lat'];
        $lng = (float) $addr['lng'];

        // Rayon par défaut : 10 km pour infirmier (plan discovery), 25 km pour labo
        $radiusKm = $role === 'nurse' ? 10.0 : 25.0;

        // Ne pas écraser une zone existante
        $check = $this->db->prepare('SELECT id FROM coverage_zones WHERE owner_id = ? AND role = ? LIMIT 1');
        $check->execute([$userId, $role]);
        if ($check->fetch()) return;

        $id = bin2hex(random_bytes(16));
        $this->db->prepare(
            'INSERT INTO coverage_zones (id, owner_id, role, center_lat, center_lng, radius_km, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())'
        )->execute([$id, $userId, $role, $lat, $lng, $radiusKm]);
    }

    /**
     * Active toutes les catégories de soins pour un infirmier ou un laboratoire.
     * Nurse  → care_categories.type = 'nursing'  → nurse_category_preferences
     * Lab    → care_categories.type = 'blood_test' → lab_category_preferences
     */
    private function enableAllCategories(string $userId, string $role): void
    {
        if ($role === 'nurse') {
            $cats = $this->db->prepare(
                "SELECT id FROM care_categories WHERE is_active = TRUE AND type = 'nursing'"
            );
            $cats->execute();
            $insert = $this->db->prepare(
                'INSERT INTO nurse_category_preferences (id, nurse_id, category_id, is_enabled)
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE is_enabled = 1'
            );
            foreach ($cats->fetchAll(PDO::FETCH_COLUMN) as $catId) {
                $insert->execute([bin2hex(random_bytes(18)), $userId, $catId]);
            }
        } elseif (in_array($role, ['lab', 'subaccount'], true)) {
            $tableCheck = $this->db->query("SHOW TABLES LIKE 'lab_category_preferences'");
            if ($tableCheck->rowCount() === 0) return;
            $cats = $this->db->prepare(
                "SELECT id FROM care_categories WHERE is_active = TRUE AND type = 'blood_test'"
            );
            $cats->execute();
            $insert = $this->db->prepare(
                'INSERT INTO lab_category_preferences (id, lab_id, category_id, is_enabled)
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE is_enabled = 1'
            );
            foreach ($cats->fetchAll(PDO::FETCH_COLUMN) as $catId) {
                $insert->execute([bin2hex(random_bytes(18)), $userId, $catId]);
            }
        }
    }

    /** Refuser. */
    public function reject(string $id, string $actorId): void
    {
        $stmt = $this->db->prepare('SELECT id, status FROM registration_requests WHERE id = ?');
        $stmt->execute([$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r || $r['status'] !== 'pending') {
            throw new Exception('Demande introuvable ou déjà traitée.');
        }
        $this->db->prepare('UPDATE registration_requests SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?')
            ->execute(['rejected', $actorId, $id]);
    }
}
