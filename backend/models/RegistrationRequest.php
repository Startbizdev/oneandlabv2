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

        $sql = 'INSERT INTO registration_requests (
            id, role, status, email_hash, email_encrypted, email_dek,
            first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek, address_encrypted, address_dek,
            siret_encrypted, siret_dek, adeli_encrypted, adeli_dek, rpps_encrypted, rpps_dek,
            company_name_encrypted, company_name_dek, emploi, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $id, $role, 'pending', $emailHash,
            $emailEnc['encrypted'], $emailEnc['dek'],
            $firstEnc['encrypted'], $firstEnc['dek'],
            $lastEnc['encrypted'], $lastEnc['dek'],
            $phoneEnc, $phoneDek, $addrEnc, $addrDek,
            $siretEnc, $siretDek, $adeliEnc, $adeliDek, $rppsEnc, $rppsDek,
            $companyEnc, $companyDek, $emploi,
        ]);
        return $id;
    }

    /** Liste pour admin (déchiffrée). */
    public function getAll(string $status = '', string $role = ''): array
    {
        $sql = 'SELECT id, role, status, email_hash, created_at, reviewed_at, reviewed_by,
            email_encrypted, email_dek, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek, address_encrypted, address_dek,
            siret_encrypted, siret_dek, adeli_encrypted, adeli_dek, rpps_encrypted, rpps_dek,
            company_name_encrypted, company_name_dek, emploi
            FROM registration_requests WHERE 1=1';
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
            'phone' => $dec($r['phone_encrypted'] ?? '', $r['phone_dek'] ?? ''),
            'address' => $dec($r['address_encrypted'] ?? '', $r['address_dek'] ?? ''),
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
            if (!empty(trim((string)($req['adeli'] ?? '')))) {
                $createData['adeli'] = trim((string)$req['adeli']);
            }
            if (!empty(trim((string)($req['emploi'] ?? '')))) {
                $createData['emploi'] = trim((string)$req['emploi']);
                if (strlen($createData['emploi']) > 120) $createData['emploi'] = substr($createData['emploi'], 0, 120);
            }
        }
        $userId = $userModel->create($createData, $actorId, 'super_admin');
        $this->db->prepare('UPDATE registration_requests SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?')
            ->execute(['accepted', $actorId, $id]);
        return ['user_id' => $userId];
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
