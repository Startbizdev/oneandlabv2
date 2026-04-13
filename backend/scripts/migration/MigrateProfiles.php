<?php

/**
 * Migration des profiles (labs, préleveurs, pros, nurses, patients)
 * Legacy MongoDB → MySQL profiles
 */

require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/../../lib/Crypto.php';

class MigrateProfiles
{
    private PDO $db;
    private Crypto $crypto;
    private string $legacyKey;
    private array $emailHashCache = [];
    private bool $dryRun;
    private ?bool $emploiColumnCache = null;

    public function __construct(PDO $db, string $legacyEncryptionKey, bool $dryRun = false)
    {
        $this->db = $db;
        $this->crypto = new Crypto();
        $this->legacyKey = $legacyEncryptionKey;
        $this->dryRun = $dryRun;
    }

    private function hasEmploiColumn(): bool
    {
        if ($this->emploiColumnCache === null) {
            $this->emploiColumnCache = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'emploi'")->rowCount() > 0;
        }
        return $this->emploiColumnCache;
    }

    /**
     * Détection nurse vs pro sur la spécialité déchiffrée (le champ legacy est souvent chiffré : le test sur la chaîne brute échouait).
     */
    private function legacySpecialtyIsNurse(string $plain): bool
    {
        $s = mb_strtolower(trim($plain), 'UTF-8');
        if ($s === '') {
            return false;
        }
        foreach (['infirmier', 'infirmière', 'ipa', 'ide'] as $kw) {
            if (mb_strpos($s, $kw) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Libellé métier pour profiles.emploi (VARCHAR 120), aligné sur les valeurs legacy observées dans legacy-export.json.
     */
    private function mapLegacySpecialtyToEmploi(string $plain): ?string
    {
        $t = trim($plain);
        if ($t === '') {
            return null;
        }
        $norm = mb_strtolower(preg_replace('/\s+/u', ' ', $t), 'UTF-8');

        $slugMap = [
            'medecin' => 'Médecin',
            'médecin généraliste' => 'Médecin généraliste',
            'pharmacien' => 'Pharmacien',
            'pharmacie' => 'Pharmacie',
            'centre dentaire' => 'Centre dentaire',
            'infirmier(e)' => 'Infirmier(e)',
            'infirmier(e)ipa' => 'Infirmier(e) IPA',
            'infirmier(e) ipa' => 'Infirmier(e) IPA',
            'biologiste' => 'Biologiste',
            'psychiatre' => 'Psychiatre',
            'technicienne de labo' => 'Technicienne de labo',
        ];
        if (isset($slugMap[$norm])) {
            return mb_substr($slugMap[$norm], 0, 120, 'UTF-8');
        }

        // Libellés déjà corrects ou variantes (ex. « Pharmacien », « PHARMACIEN »)
        if (mb_strlen($t, 'UTF-8') <= 120 && preg_match('/^[\p{L}\d\s\(\)\.\-\'°]+$/u', $t)) {
            if ($norm === 'pharmacien') {
                return 'Pharmacien';
            }
            if ($norm === 'pharmacie') {
                return 'Pharmacie';
            }
            return mb_substr($t, 0, 120, 'UTF-8');
        }

        return null;
    }

    private function decryptLegacy(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        if (LegacyCrypto::isEncrypted($value)) {
            try {
                return LegacyCrypto::decrypt($value, $this->legacyKey);
            } catch (Exception $e) {
                return '';
            }
        }
        return $value;
    }

    private function encryptField(string $plain): array
    {
        return $this->crypto->encryptField($plain);
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function emailHash(string $email): string
    {
        $normalized = strtolower(trim($email));
        if (!isset($this->emailHashCache[$normalized])) {
            $this->emailHashCache[$normalized] = hash('sha256', $normalized);
        }
        return $this->emailHashCache[$normalized];
    }

    private function insertMapping(string $collection, string $legacyId, string $table, string $uuid): void
    {
        if ($this->dryRun) return;
        $stmt = $this->db->prepare('INSERT INTO legacy_id_mapping (legacy_collection, legacy_object_id, target_table, target_uuid) VALUES (?, ?, ?, ?)');
        $stmt->execute([$collection, $legacyId, $table, $uuid]);
    }

    private function getMappedUuid(string $collection, string $legacyId): ?string
    {
        $stmt = $this->db->prepare('SELECT target_uuid FROM legacy_id_mapping WHERE legacy_collection = ? AND legacy_object_id = ?');
        $stmt->execute([$collection, $legacyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['target_uuid'] : null;
    }

    private function profileExistsByEmailHash(string $hash): ?string
    {
        $stmt = $this->db->prepare('SELECT id FROM profiles WHERE email_hash = ? LIMIT 1');
        $stmt->execute([$hash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['id'] : null;
    }

    public function migrateLab(array $lab): ?string
    {
        $legacyId = $lab['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('laboratories', $legacyId);
        if ($existing) return $existing;

        $name = $this->decryptLegacy($lab['name'] ?? '');
        $email = $this->decryptLegacy($lab['email'] ?? '');
        $phone = $this->decryptLegacy($lab['phone'] ?? '');
        $address = $this->decryptLegacy($lab['address'] ?? '');
        $city = $this->decryptLegacy($lab['city'] ?? '');
        $siret = $this->decryptLegacy($lab['siretNumber'] ?? '');

        if (empty($email)) $email = 'lab-' . $legacyId . '@migration.local';

        $emailHash = $this->emailHash($email);
        $dup = $this->profileExistsByEmailHash($emailHash);
        if ($dup) {
            $this->insertMapping('laboratories', $legacyId, 'profiles', $dup);
            return $dup;
        }

        $uuid = $this->uuid();
        $eEmail = $this->encryptField($email);
        $eFirst = $this->encryptField($name ?: 'Laboratoire');
        $eLast = $this->encryptField('');
        $ePhone = $phone ? $this->encryptField($phone) : ['encrypted' => '', 'dek' => ''];
        $eAddr = $address ? $this->encryptField($address) : ['encrypted' => '', 'dek' => ''];
        $eSiret = $siret ? $this->encryptField($siret) : ['encrypted' => '', 'dek' => ''];
        $eCompany = $name ? $this->encryptField($name) : ['encrypted' => '', 'dek' => ''];

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                    phone_encrypted, phone_dek, address_encrypted, address_dek, siret_encrypted, siret_dek, company_name_encrypted, company_name_dek, city_plain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $uuid, 'lab',
                $eEmail['encrypted'], $eEmail['dek'], $emailHash,
                $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                $ePhone['encrypted'] ?: null, $ePhone['dek'] ?: null,
                $eAddr['encrypted'] ?: null, $eAddr['dek'] ?: null,
                $eSiret['encrypted'] ?: null, $eSiret['dek'] ?: null,
                $eCompany['encrypted'] ?: null, $eCompany['dek'] ?: null,
                $city ?: null,
            ]);
        }
        $this->insertMapping('laboratories', $legacyId, 'profiles', $uuid);
        return $uuid;
    }

    public function migratePhlebotomist(array $phleb, array $labMapping): ?string
    {
        $legacyId = $phleb['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('phlebotomists', $legacyId);
        if ($existing) return $existing;

        $name = $this->decryptLegacy($phleb['name'] ?? '');
        $email = $this->decryptLegacy($phleb['email'] ?? '');
        $phone = $this->decryptLegacy($phleb['phone'] ?? '');
        $address = $this->decryptLegacy($phleb['address'] ?? '');

        if (empty($email)) $email = 'phleb-' . $legacyId . '@migration.local';

        $parts = preg_split('/\s+/', trim($name), 2);
        $firstName = $parts[0] ?? 'Préleveur';
        $lastName = $parts[1] ?? '';

        $emailHash = $this->emailHash($email);
        $dup = $this->profileExistsByEmailHash($emailHash);
        if ($dup) {
            $this->insertMapping('phlebotomists', $legacyId, 'profiles', $dup);
            return $dup;
        }

        $labId = $phleb['labId'] ?? null;
        $labUuid = $labId && isset($labMapping[$labId]) ? $labMapping[$labId] : null;

        $uuid = $this->uuid();
        $eEmail = $this->encryptField($email);
        $eFirst = $this->encryptField($firstName);
        $eLast = $this->encryptField($lastName);
        $ePhone = $phone ? $this->encryptField($phone) : ['encrypted' => '', 'dek' => ''];
        $eAddr = $address ? $this->encryptField($address) : ['encrypted' => '', 'dek' => ''];

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO profiles (id, role, lab_id, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                    phone_encrypted, phone_dek, address_encrypted, address_dek)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $uuid, 'preleveur', $labUuid,
                $eEmail['encrypted'], $eEmail['dek'], $emailHash,
                $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                $ePhone['encrypted'] ?: null, $ePhone['dek'] ?: null,
                $eAddr['encrypted'] ?: null, $eAddr['dek'] ?: null,
            ]);
        }
        $this->insertMapping('phlebotomists', $legacyId, 'profiles', $uuid);
        return $uuid;
    }

    public function migrateProfessional(array $prof): ?string
    {
        $legacyId = $prof['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('professionals', $legacyId);
        if ($existing) return $existing;

        $specialtyPlain = $this->decryptLegacy($prof['specialty'] ?? '');
        $isNurse = $this->legacySpecialtyIsNurse($specialtyPlain);

        $name = $this->decryptLegacy($prof['name'] ?? '');
        $centerName = $this->decryptLegacy($prof['centerName'] ?? '');
        $email = $this->decryptLegacy($prof['email'] ?? '');
        $phone = $this->decryptLegacy($prof['phone'] ?? '');
        $address = $this->decryptLegacy($prof['address'] ?? '');
        $adeli = $this->decryptLegacy($prof['adeliNumber'] ?? '');
        $siret = $this->decryptLegacy($prof['siretNumber'] ?? '');

        if (empty($email)) $email = 'pro-' . $legacyId . '@migration.local';

        $role = $isNurse ? 'nurse' : 'pro';
        $firstName = $name ?: ($centerName ?: 'Professionnel');
        $lastName = $prof['type'] === 'medical_center' ? $centerName : '';

        $emailHash = $this->emailHash($email);
        $dup = $this->profileExistsByEmailHash($emailHash);
        if ($dup) {
            $this->insertMapping('professionals', $legacyId, 'profiles', $dup);
            return $dup;
        }

        $uuid = $this->uuid();
        $eEmail = $this->encryptField($email);
        $eFirst = $this->encryptField($firstName);
        $eLast = $this->encryptField($lastName);
        $ePhone = $phone ? $this->encryptField($phone) : ['encrypted' => '', 'dek' => ''];
        $eAddr = $address ? $this->encryptField($address) : ['encrypted' => '', 'dek' => ''];
        $eAdeli = $adeli ? $this->encryptField($adeli) : ['encrypted' => '', 'dek' => ''];
        $eSiret = $siret ? $this->encryptField($siret) : ['encrypted' => '', 'dek' => ''];
        $eCompany = $centerName ? $this->encryptField($centerName) : ['encrypted' => '', 'dek' => ''];

        $emploiVal = $this->mapLegacySpecialtyToEmploi($specialtyPlain);
        if ($emploiVal !== null && mb_strlen($emploiVal, 'UTF-8') > 120) {
            $emploiVal = mb_substr($emploiVal, 0, 120, 'UTF-8');
        }
        $withEmploi = $this->hasEmploiColumn() && $emploiVal !== null && $emploiVal !== '';

        if (!$this->dryRun) {
            if ($withEmploi) {
                $stmt = $this->db->prepare('
                    INSERT INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                        phone_encrypted, phone_dek, address_encrypted, address_dek, adeli_encrypted, adeli_dek, siret_encrypted, siret_dek, company_name_encrypted, company_name_dek, emploi)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $uuid, $role,
                    $eEmail['encrypted'], $eEmail['dek'], $emailHash,
                    $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                    $ePhone['encrypted'] ?: null, $ePhone['dek'] ?: null,
                    $eAddr['encrypted'] ?: null, $eAddr['dek'] ?: null,
                    $eAdeli['encrypted'] ?: null, $eAdeli['dek'] ?: null,
                    $eSiret['encrypted'] ?: null, $eSiret['dek'] ?: null,
                    $eCompany['encrypted'] ?: null, $eCompany['dek'] ?: null,
                    $emploiVal,
                ]);
            } else {
                $stmt = $this->db->prepare('
                    INSERT INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                        phone_encrypted, phone_dek, address_encrypted, address_dek, adeli_encrypted, adeli_dek, siret_encrypted, siret_dek, company_name_encrypted, company_name_dek)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $uuid, $role,
                    $eEmail['encrypted'], $eEmail['dek'], $emailHash,
                    $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                    $ePhone['encrypted'] ?: null, $ePhone['dek'] ?: null,
                    $eAddr['encrypted'] ?: null, $eAddr['dek'] ?: null,
                    $eAdeli['encrypted'] ?: null, $eAdeli['dek'] ?: null,
                    $eSiret['encrypted'] ?: null, $eSiret['dek'] ?: null,
                    $eCompany['encrypted'] ?: null, $eCompany['dek'] ?: null,
                ]);
            }
        }
        $this->insertMapping('professionals', $legacyId, 'profiles', $uuid);
        return $uuid;
    }

    public function migratePatient(array $patient, ?string $createdByUuid): ?string
    {
        $legacyId = $patient['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('patients', $legacyId);
        if ($existing) return $existing;

        $firstName = $this->decryptLegacy($patient['firstName'] ?? '');
        $lastName = $this->decryptLegacy($patient['lastName'] ?? '');
        $email = $this->decryptLegacy($patient['email'] ?? '');
        $phone = $this->decryptLegacy($patient['phone'] ?? '');
        $address = $this->decryptLegacy($patient['address'] ?? '');
        $dob = $patient['dateOfBirth'] ?? null;
        $gender = $this->decryptLegacy($patient['gender'] ?? '');

        if (empty($email)) $email = 'patient-' . $legacyId . '@migration.local';
        if (empty($firstName) && empty($lastName)) $firstName = 'Patient';

        $emailHash = $this->emailHash($email);
        $dup = $this->profileExistsByEmailHash($emailHash);
        if ($dup) {
            $this->insertMapping('patients', $legacyId, 'profiles', $dup);
            // Si le profil existant n'a pas de created_by et qu'on a un pro/infirmier créateur, le mettre à jour
            if ($createdByUuid && !$this->dryRun) {
                $stmt = $this->db->prepare('UPDATE profiles SET created_by = ? WHERE id = ? AND (created_by IS NULL OR created_by = "")');
                $stmt->execute([$createdByUuid, $dup]);
            }
            return $dup;
        }

        $dobStr = null;
        if ($dob) {
            if (is_string($dob)) $dobStr = substr($dob, 0, 10);
            elseif ($dob instanceof DateTimeInterface) $dobStr = $dob->format('Y-m-d');
        }

        $uuid = $this->uuid();
        $eEmail = $this->encryptField($email);
        $eFirst = $this->encryptField($firstName ?: '');
        $eLast = $this->encryptField($lastName ?: '');
        $ePhone = $phone ? $this->encryptField($phone) : ['encrypted' => '', 'dek' => ''];
        $eAddr = $address ? $this->encryptField($address) : ['encrypted' => '', 'dek' => ''];
        $eGender = $gender ? $this->encryptField($gender) : ['encrypted' => '', 'dek' => ''];
        $eDob = $dobStr ? $this->encryptField($dobStr) : ['encrypted' => '', 'dek' => ''];

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO profiles (id, role, created_by, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                    phone_encrypted, phone_dek, address_encrypted, address_dek, gender_encrypted, gender_dek, birth_date_encrypted, birth_date_dek)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $uuid, 'patient', $createdByUuid,
                $eEmail['encrypted'], $eEmail['dek'], $emailHash,
                $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                $ePhone['encrypted'] ?: null, $ePhone['dek'] ?: null,
                $eAddr['encrypted'] ?: null, $eAddr['dek'] ?: null,
                $eGender['encrypted'] ?: null, $eGender['dek'] ?: null,
                $eDob['encrypted'] ?: null, $eDob['dek'] ?: null,
            ]);
        }
        $this->insertMapping('patients', $legacyId, 'profiles', $uuid);
        return $uuid;
    }

    /**
     * Met à jour profiles.emploi et optionnellement le rôle (pro/nurse) pour les professionnels déjà migrés
     * (même déchiffrement / mapping que migrateProfessional).
     *
     * @return array{updated_emploi: int, updated_roles: int, unchanged: int, missing_mapping: int, orphan_profile: int}
     */
    public function backfillProfessionalsFromLegacy(
        array $professionals,
        bool $dryRunBackfill = false,
        bool $forceEmploi = false,
        bool $fixRoles = true
    ): array {
        $stats = [
            'updated_emploi' => 0,
            'updated_roles' => 0,
            'unchanged' => 0,
            'missing_mapping' => 0,
            'orphan_profile' => 0,
        ];
        $canEmploi = $this->hasEmploiColumn();

        foreach ($professionals as $prof) {
            $legacyId = $prof['_id'] ?? '';
            if ($legacyId === '') {
                continue;
            }

            $uuid = $this->getMappedUuid('professionals', $legacyId);
            if (!$uuid) {
                $stats['missing_mapping']++;
                continue;
            }

            $stmt = $this->db->prepare('SELECT role, emploi FROM profiles WHERE id = ?');
            $stmt->execute([$uuid]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $stats['orphan_profile']++;
                continue;
            }

            $specialtyPlain = $this->decryptLegacy($prof['specialty'] ?? '');
            $emploiCurrent = trim((string) ($row['emploi'] ?? ''));
            // Rôle : priorité au specialty legacy ; si vide (échec déchiffrement), se fier à emploi déjà en base
            $isNurseFromSpecialty = $this->legacySpecialtyIsNurse($specialtyPlain);
            $isNurseFromEmploi = $specialtyPlain === '' && $emploiCurrent !== ''
                ? $this->legacySpecialtyIsNurse($emploiCurrent)
                : false;
            $expectedRole = ($isNurseFromSpecialty || $isNurseFromEmploi) ? 'nurse' : 'pro';
            $emploiNew = $this->mapLegacySpecialtyToEmploi($specialtyPlain);
            if ($emploiNew !== null && mb_strlen($emploiNew, 'UTF-8') > 120) {
                $emploiNew = mb_substr($emploiNew, 0, 120, 'UTF-8');
            }

            $needsEmploi = false;
            if ($canEmploi && $emploiNew !== null && $emploiNew !== '') {
                if ($forceEmploi) {
                    $needsEmploi = ($emploiCurrent !== $emploiNew);
                } else {
                    $needsEmploi = ($emploiCurrent === '');
                }
            }

            $needsRole = false;
            if ($fixRoles && in_array($row['role'], ['pro', 'nurse'], true) && $row['role'] !== $expectedRole) {
                $needsRole = true;
            }

            if (!$needsEmploi && !$needsRole) {
                $stats['unchanged']++;
                continue;
            }

            if (!$dryRunBackfill) {
                $sets = [];
                $params = [];
                if ($needsEmploi) {
                    $sets[] = 'emploi = ?';
                    $params[] = $emploiNew;
                }
                if ($needsRole) {
                    $sets[] = 'role = ?';
                    $params[] = $expectedRole;
                }
                if ($sets !== []) {
                    $params[] = $uuid;
                    $sql = 'UPDATE profiles SET ' . implode(', ', $sets) . ' WHERE id = ?';
                    $upd = $this->db->prepare($sql);
                    $upd->execute($params);
                }
            }

            if ($needsEmploi) {
                $stats['updated_emploi']++;
            }
            if ($needsRole) {
                $stats['updated_roles']++;
            }
        }

        return $stats;
    }
}
