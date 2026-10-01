<?php

declare(strict_types=1);

require_once __DIR__ . '/../DbSchemaCache.php';

/** Recherche profils par email hash / téléphone indexé (sans déchiffrement PII). */
final class UserIdentityLookup
{
    public function __construct(private PDO $db)
    {
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
     * Réponse de GET /patients/lookup : uniquement ce qu'il faut pour proposer le rattachement
     * (identifiant pour l'adoption, nom et date de naissance pour confirmer l'identité).
     * Le dossier complet n'est lisible qu'après adoption, via GET /users/{id}.
     *
     * @param array<string, mixed>|null $profile profil déchiffré
     * @return array{id: string, first_name: string, last_name: string, birth_date: ?string}|null
     */
    public static function patientLookupMatch(?array $profile): ?array
    {
        if ($profile === null || ($profile['role'] ?? '') !== 'patient' || (string) ($profile['id'] ?? '') === '') {
            return null;
        }
        $birthDate = trim((string) ($profile['birth_date'] ?? ''));

        return [
            'id' => (string) $profile['id'],
            'first_name' => (string) ($profile['first_name'] ?? ''),
            'last_name' => (string) ($profile['last_name'] ?? ''),
            'birth_date' => $birthDate !== '' ? $birthDate : null,
        ];
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

    public function findNurseIdByPhone(string $phoneRaw): ?string
    {
        if (!$this->hasPhoneDigitsHashColumn()) {
            return null;
        }
        $normDigits = self::normalizeFrenchPatientPhoneDigits($phoneRaw);
        if ($normDigits === null) {
            return null;
        }
        $hash = self::patientPhoneDigitsHash($normDigits);
        if ($hash === null) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT id FROM profiles WHERE phone_digits_hash = ? AND role = ? LIMIT 1');
        $stmt->execute([$hash, 'nurse']);
        $id = $stmt->fetchColumn();

        return $id ? (string) $id : null;
    }

    /** Recherche exacte du formulaire RDV (GET /patients/lookup) : e-mail, sinon téléphone français. */
    public function findPatientIdByContact(string $email, string $phoneRaw): ?string
    {
        $email = strtolower(trim($email));
        if ($email !== '') {
            return filter_var($email, FILTER_VALIDATE_EMAIL) ? $this->findPatientIdByEmailHash(hash('sha256', $email)) : null;
        }
        $digits = self::normalizeFrenchPatientPhoneDigits($phoneRaw);
        $hash = $digits !== null ? self::patientPhoneDigitsHash($digits) : null;

        return $hash !== null ? $this->findPatientIdByPhoneDigitsHash($hash) : null;
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

    private function hasPhoneDigitsHashColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'phone_digits_hash');
    }
}
