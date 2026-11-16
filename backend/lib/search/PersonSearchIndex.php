<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../users/UserIdentityLookup.php';

/**
 * Recherche des patients et proches par nom / téléphone alors que ces champs sont chiffrés en base.
 *
 * Index « aveugle » : pour chaque début de mot (2 caractères ou plus) du prénom, du nom et du téléphone,
 * on stocke une empreinte HMAC-SHA256 (clé dérivée de la KEK). La recherche calcule les mêmes empreintes
 * pour les mots saisis : la base retrouve les personnes sans jamais voir un nom en clair.
 * Correspondance par début de mot (« allou » trouve Allouche), sans tolérance aux fautes.
 */
final class PersonSearchIndex
{
    public const TABLE = 'person_search_tokens';
    private const MIN_PREFIX = 2;
    private const MAX_PREFIX = 24;
    private const MIN_PHONE_PREFIX = 4;
    private const MAX_SUBJECTS = 500;

    private PDO $db;
    private Crypto $crypto;
    private string $key;

    public function __construct(PDO $db, ?Crypto $crypto = null)
    {
        $this->db = $db;
        $this->crypto = $crypto ?? new Crypto();
        $this->key = $this->crypto->searchIndexKey();
    }

    public static function available(PDO $db): bool
    {
        return DbSchemaCache::tableExists($db, self::TABLE);
    }

    /** Minuscules sans accents, mots alphanumériques. @return list<string> */
    public static function words(string $text): array
    {
        $text = mb_strtolower(trim($text), 'UTF-8');
        if (function_exists('transliterator_transliterate')) {
            $ascii = transliterator_transliterate('Any-Latin; Latin-ASCII', $text);
            if (is_string($ascii)) {
                $text = $ascii;
            }
        } else {
            $text = strtr($text, [
                'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
                'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
                'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ì' => 'i', 'ñ' => 'n',
                'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ò' => 'o', 'õ' => 'o',
                'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u', 'ÿ' => 'y', 'æ' => 'ae', 'œ' => 'oe',
            ]);
        }
        $text = (string) preg_replace('/[^a-z0-9]+/', ' ', strtolower($text));

        return array_values(array_filter(explode(' ', $text), static fn (string $w): bool => $w !== ''));
    }

    /** Téléphone FR ramené à 0XXXXXXXXX, sinon chiffres bruts (6 chiffres minimum). */
    public static function phoneDigits(string $phone): ?string
    {
        $normalized = UserIdentityLookup::normalizeFrenchPatientPhoneDigits($phone);
        if ($normalized !== null) {
            return $normalized;
        }
        $digits = (string) preg_replace('/\D+/', '', $phone);
        if (str_starts_with($digits, '33') && strlen($digits) === 11) {
            $digits = '0' . substr($digits, 2);
        }

        return strlen($digits) >= 6 ? $digits : null;
    }

    private function token(string $namespace, string $value): string
    {
        return hash_hmac('sha256', $namespace . '|' . $value, $this->key);
    }

    /**
     * Empreintes d'une personne : débuts de mots du prénom et du nom, débuts du numéro de téléphone.
     *
     * @return list<string>
     */
    public function tokensFor(string $firstName, string $lastName, ?string $phone): array
    {
        $tokens = [];
        foreach (self::words($firstName . ' ' . $lastName) as $word) {
            $max = min(strlen($word), self::MAX_PREFIX);
            for ($len = self::MIN_PREFIX; $len <= $max; $len++) {
                $tokens[$this->token('n', substr($word, 0, $len))] = true;
            }
        }
        $digits = $phone !== null ? self::phoneDigits($phone) : null;
        if ($digits !== null) {
            for ($len = self::MIN_PHONE_PREFIX; $len <= strlen($digits); $len++) {
                $tokens[$this->token('t', substr($digits, 0, $len))] = true;
            }
        }

        return array_keys($tokens);
    }

    /**
     * Empreintes à chercher : une par mot saisi (toutes doivent correspondre).
     *
     * @return list<string>
     */
    public function queryTokens(string $query): array
    {
        $tokens = [];
        $compactDigits = (string) preg_replace('/[\s.\-]+/', '', trim($query));
        // « 06 12 34 » ou « +33 6 12 » : un seul numéro, pas plusieurs mots.
        if ($compactDigits !== '' && preg_match('/^\+?\d+$/', $compactDigits)) {
            $digits = ltrim($compactDigits, '+');
            if (str_starts_with($digits, '33') && strlen($digits) > 2) {
                $digits = '0' . substr($digits, 2);
            }
            if (strlen($digits) >= self::MIN_PHONE_PREFIX) {
                return [$this->token('t', $digits)];
            }

            return [];
        }
        foreach (self::words($query) as $word) {
            if (strlen($word) < self::MIN_PREFIX) {
                continue;
            }
            $tokens[$this->token('n', substr($word, 0, self::MAX_PREFIX))] = true;
        }

        return array_keys($tokens);
    }

    /**
     * Personnes dont chaque mot saisi correspond à un début de mot (nom, prénom ou téléphone).
     *
     * @return array{profile_ids: list<string>, relative_ids: list<string>, searchable: bool}
     */
    public function find(string $query): array
    {
        $tokens = $this->queryTokens($query);
        if ($tokens === []) {
            return ['profile_ids' => [], 'relative_ids' => [], 'searchable' => false];
        }
        $placeholders = implode(',', array_fill(0, count($tokens), '?'));
        $stmt = $this->db->prepare(
            'SELECT subject_type, subject_id FROM ' . self::TABLE . "
             WHERE token IN ($placeholders)
             GROUP BY subject_type, subject_id
             HAVING COUNT(DISTINCT token) = ?
             LIMIT " . self::MAX_SUBJECTS
        );
        $stmt->execute([...$tokens, count($tokens)]);
        $profileIds = [];
        $relativeIds = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if ($row['subject_type'] === 'relative') {
                $relativeIds[] = (string) $row['subject_id'];
            } else {
                $profileIds[] = (string) $row['subject_id'];
            }
        }

        return ['profile_ids' => $profileIds, 'relative_ids' => $relativeIds, 'searchable' => true];
    }

    /** Patient (role=patient) : (ré)indexe ; autre rôle ou profil supprimé : retire de l'index. */
    public function reindexProfile(string $profileId): void
    {
        $stmt = $this->db->prepare(
            'SELECT role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, phone_encrypted, phone_dek
             FROM profiles WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$profileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $tokens = $row && ($row['role'] ?? '') === 'patient' ? $this->tokensForRow($row) : [];
        $this->replace('profile', $profileId, $tokens);
    }

    public function reindexRelative(string $relativeId): void
    {
        $stmt = $this->db->prepare(
            'SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, phone_encrypted, phone_dek
             FROM patient_relatives WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$relativeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->replace('relative', $relativeId, $row ? $this->tokensForRow($row) : []);
    }

    /** @param array<string, mixed> $row */
    private function tokensForRow(array $row): array
    {
        return $this->tokensFor(
            $this->decryptOrEmpty($row, 'first_name'),
            $this->decryptOrEmpty($row, 'last_name'),
            $this->decryptOrEmpty($row, 'phone') ?: null
        );
    }

    /** @param array<string, mixed> $row */
    private function decryptOrEmpty(array $row, string $field): string
    {
        $enc = (string) ($row[$field . '_encrypted'] ?? '');
        $dek = (string) ($row[$field . '_dek'] ?? '');
        if ($enc === '' || $dek === '') {
            return '';
        }
        try {
            return $this->crypto->decryptField($enc, $dek);
        } catch (Throwable $e) {
            error_log('PersonSearchIndex déchiffrement ' . $field . ': ' . $e->getMessage());

            return '';
        }
    }

    /** @param list<string> $tokens */
    private function replace(string $type, string $subjectId, array $tokens): void
    {
        $this->db->prepare('DELETE FROM ' . self::TABLE . ' WHERE subject_type = ? AND subject_id = ?')
            ->execute([$type, $subjectId]);
        foreach (array_chunk($tokens, 200) as $chunk) {
            $values = implode(',', array_fill(0, count($chunk), '(?, ?, ?)'));
            $params = [];
            foreach ($chunk as $token) {
                array_push($params, $type, $subjectId, $token);
            }
            $this->db->prepare('INSERT IGNORE INTO ' . self::TABLE . " (subject_type, subject_id, token) VALUES $values")
                ->execute($params);
        }
    }

    /**
     * Après une écriture de nom/téléphone : ne doit jamais faire échouer l'enregistrement.
     */
    public static function safeReindex(PDO $db, string $type, string $subjectId): void
    {
        try {
            if ($subjectId === '' || !self::available($db)) {
                return;
            }
            $index = new self($db);
            $type === 'relative' ? $index->reindexRelative($subjectId) : $index->reindexProfile($subjectId);
        } catch (Throwable $e) {
            error_log('PersonSearchIndex reindex ' . $type . ' ' . $subjectId . ': ' . $e->getMessage());
        }
    }

    /** Profil modifié : lui + la fiche proche qui y est rattachée (identité synchronisée). */
    public static function safeReindexPerson(PDO $db, string $profileId): void
    {
        self::safeReindex($db, 'profile', $profileId);
        foreach (self::relativeIdsForProfile($db, $profileId) as $relativeId) {
            self::safeReindex($db, 'relative', $relativeId);
        }
    }

    /** Proche modifié : sa fiche + son dossier patient (identité synchronisée). */
    public static function safeReindexRelative(PDO $db, string $relativeId): void
    {
        self::safeReindex($db, 'relative', $relativeId);
        try {
            if (!DbSchemaCache::tableHasColumn($db, 'patient_relatives', 'profile_id')) {
                return;
            }
            $stmt = $db->prepare('SELECT profile_id FROM patient_relatives WHERE id = ? LIMIT 1');
            $stmt->execute([$relativeId]);
            $profileId = (string) ($stmt->fetchColumn() ?: '');
            if ($profileId !== '') {
                self::safeReindex($db, 'profile', $profileId);
            }
        } catch (Throwable $e) {
            error_log('PersonSearchIndex proche ' . $relativeId . ': ' . $e->getMessage());
        }
    }

    /** @return list<string> */
    private static function relativeIdsForProfile(PDO $db, string $profileId): array
    {
        try {
            if (!DbSchemaCache::tableHasColumn($db, 'patient_relatives', 'profile_id')) {
                return [];
            }
            $stmt = $db->prepare('SELECT id FROM patient_relatives WHERE profile_id = ?');
            $stmt->execute([$profileId]);

            return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        } catch (Throwable $e) {
            error_log('PersonSearchIndex profil ' . $profileId . ': ' . $e->getMessage());

            return [];
        }
    }
}
