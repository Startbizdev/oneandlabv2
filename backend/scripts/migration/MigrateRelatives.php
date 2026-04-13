<?php

/**
 * Migration des patient_relatives
 * Legacy Relative → patient_relatives
 */

require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/../../lib/Crypto.php';

class MigrateRelatives
{
    private PDO $db;
    private Crypto $crypto;
    private string $legacyKey;
    private bool $dryRun;

    private const RELATIONSHIP_MAP = [
        'parent' => 'parent',
        'enfant' => 'child',
        'conjoint' => 'spouse',
        'frere' => 'sibling',
        'soeur' => 'sibling',
        'autre' => 'other',
    ];

    public function __construct(PDO $db, string $legacyEncryptionKey, bool $dryRun = false)
    {
        $this->db = $db;
        $this->crypto = new Crypto();
        $this->legacyKey = $legacyEncryptionKey;
        $this->dryRun = $dryRun;
    }

    private function decryptLegacy(?string $value): string
    {
        if ($value === null || $value === '') return '';
        if (LegacyCrypto::isEncrypted($value)) {
            return LegacyCrypto::decrypt($value, $this->legacyKey);
        }
        return $value;
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function mapRelationship(string $rel): string
    {
        $k = strtolower(trim($rel));
        return self::RELATIONSHIP_MAP[$k] ?? 'other';
    }

    private function getMappedUuid(string $collection, string $legacyId): ?string
    {
        $stmt = $this->db->prepare('SELECT target_uuid FROM legacy_id_mapping WHERE legacy_collection = ? AND legacy_object_id = ?');
        $stmt->execute([$collection, $legacyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['target_uuid'] : null;
    }

    public function migrate(array $relative, array $patientMapping): ?string
    {
        $legacyId = $relative['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('relatives', $legacyId);
        if ($existing) return $existing;

        $patientLegacyId = $relative['patientId'] ?? '';
        $patientUuid = $patientMapping[$patientLegacyId] ?? null;
        if (!$patientUuid) return null;

        $firstName = $this->decryptLegacy($relative['firstName'] ?? '');
        $lastName = $this->decryptLegacy($relative['lastName'] ?? '');
        $email = $this->decryptLegacy($relative['email'] ?? '');
        $phone = $this->decryptLegacy($relative['phone'] ?? '');
        $address = $this->decryptLegacy($relative['address'] ?? '');
        $gender = $this->decryptLegacy($relative['gender'] ?? '');
        $dob = $relative['dateOfBirth'] ?? null;
        $rel = $this->mapRelationship($relative['relationship'] ?? 'autre');

        $dobStr = null;
        if ($dob) {
            if (is_string($dob)) $dobStr = substr($dob, 0, 10);
            elseif ($dob instanceof DateTimeInterface) $dobStr = $dob->format('Y-m-d');
        }

        $uuid = $this->uuid();
        $eFirst = $this->crypto->encryptField($firstName ?: 'Proche');
        $eLast = $this->crypto->encryptField($lastName ?: '');
        $eEmail = $email ? $this->crypto->encryptField($email) : ['encrypted' => null, 'dek' => null];
        $ePhone = $phone ? $this->crypto->encryptField($phone) : ['encrypted' => null, 'dek' => null];
        $eAddr = $address ? $this->crypto->encryptField($address) : ['encrypted' => null, 'dek' => null];
        $eGender = $gender ? $this->crypto->encryptField($gender) : ['encrypted' => null, 'dek' => null];
        $eDob = $dobStr ? $this->crypto->encryptField($dobStr) : ['encrypted' => null, 'dek' => null];

        $emailHash = $email ? hash('sha256', strtolower(trim($email))) : null;

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO patient_relatives (id, patient_id, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                    relationship_type, email_encrypted, email_dek, email_hash, phone_encrypted, phone_dek, address_encrypted, address_dek,
                    gender_encrypted, gender_dek, birth_date_encrypted, birth_date_dek)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $uuid, $patientUuid,
                $eFirst['encrypted'], $eFirst['dek'], $eLast['encrypted'], $eLast['dek'],
                $rel,
                $eEmail['encrypted'] ?? null, $eEmail['dek'] ?? null, $emailHash,
                $ePhone['encrypted'] ?? null, $ePhone['dek'] ?? null,
                $eAddr['encrypted'] ?? null, $eAddr['dek'] ?? null,
                $eGender['encrypted'] ?? null, $eGender['dek'] ?? null,
                $eDob['encrypted'] ?? null, $eDob['dek'] ?? null,
            ]);
        }

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('INSERT INTO legacy_id_mapping (legacy_collection, legacy_object_id, target_table, target_uuid) VALUES (?, ?, ?, ?)');
            $stmt->execute(['relatives', $legacyId, 'patient_relatives', $uuid]);
        }
        return $uuid;
    }
}
