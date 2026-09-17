<?php

declare(strict_types=1);

require_once __DIR__ . '/Crypto.php';

final class RepairCollisions
{
    public const MANIFEST_VERSION = 1;
    public const REVIEW_PHRASE = 'REVIEWED_REPAIR_COLLISIONS_MANIFEST';

    private PDO $db;
    private Crypto $crypto;
    private string $backupDir;

    public function __construct(PDO $db, Crypto $crypto, ?string $backupDir = null)
    {
        $this->db = $db;
        $this->crypto = $crypto;
        $this->backupDir = $backupDir ?? dirname(__DIR__) . '/var/repair-collisions';
    }

    public static function manifestHash(string $raw): string
    {
        return hash('sha256', $raw);
    }

    /**
     * @return list<string>
     */
    public static function validateManifest(array $manifest): array
    {
        $errors = [];
        if (($manifest['version'] ?? null) !== self::MANIFEST_VERSION) {
            $errors[] = 'version doit être 1';
        }
        if (($manifest['reviewed'] ?? null) !== true) {
            $errors[] = 'reviewed doit être true';
        }
        if (($manifest['review_phrase'] ?? null) !== self::REVIEW_PHRASE) {
            $errors[] = 'review_phrase invalide';
        }
        if (!self::isUuid($manifest['manifest_id'] ?? null)) {
            $errors[] = 'manifest_id doit être un UUID';
        }
        if (!is_array($manifest['operations'] ?? null) || $manifest['operations'] === []) {
            $errors[] = 'operations doit être une liste non vide';
            return $errors;
        }

        $operationIds = [];
        $allAppointmentIds = [];
        foreach ($manifest['operations'] as $index => $operation) {
            $path = "operations[$index]";
            if (!is_array($operation)) {
                $errors[] = "$path doit être un objet";
                continue;
            }
            $operationId = $operation['operation_id'] ?? null;
            if (!self::isUuid($operationId)) {
                $errors[] = "$path.operation_id doit être un UUID";
            } elseif (isset($operationIds[$operationId])) {
                $errors[] = "$path.operation_id est dupliqué";
            } else {
                $operationIds[$operationId] = true;
            }
            if (!self::isUuid($operation['patient_id'] ?? null)) {
                $errors[] = "$path.patient_id doit être un UUID";
            }

            $restore = $operation['holder_restore'] ?? null;
            if (!is_array($restore) || $restore === []) {
                $errors[] = "$path.holder_restore doit contenir les valeurs explicites à restaurer";
            } else {
                self::validateIdentityPatch($restore, "$path.holder_restore", $errors, true);
                if (array_key_exists('relationship_type', $restore)) {
                    $errors[] = "$path.holder_restore.relationship_type n'est pas autorisé";
                }
            }

            $relative = $operation['relative'] ?? null;
            if (!is_array($relative)) {
                $errors[] = "$path.relative doit être un objet";
            } else {
                $action = $relative['action'] ?? null;
                if (!in_array($action, ['create', 'update'], true)) {
                    $errors[] = "$path.relative.action doit valoir create ou update";
                }
                if ($action === 'create' && !self::isUuid($relative['id'] ?? null)) {
                    $errors[] = "$path.relative.id doit être un UUID choisi explicitement";
                }
                if ($action === 'update' && !self::isUuid($relative['id'] ?? null)) {
                    $errors[] = "$path.relative.id doit désigner précisément le proche";
                }
                if (!is_array($relative['data'] ?? null) || ($relative['data'] ?? []) === []) {
                    $errors[] = "$path.relative.data doit être non vide";
                } else {
                    self::validateIdentityPatch($relative['data'], "$path.relative.data", $errors, $action === 'create');
                    if ($action === 'create' && !isset($relative['data']['relationship_type'])) {
                        $errors[] = "$path.relative.data.relationship_type est requis pour create";
                    }
                }
            }

            $appointmentIds = $operation['appointment_ids'] ?? null;
            if (!is_array($appointmentIds) || $appointmentIds === []) {
                $errors[] = "$path.appointment_ids doit être une liste non vide";
            } else {
                $local = [];
                foreach ($appointmentIds as $appointmentIndex => $appointmentId) {
                    if (!self::isUuid($appointmentId)) {
                        $errors[] = "$path.appointment_ids[$appointmentIndex] doit être un UUID";
                    } elseif (isset($local[$appointmentId]) || isset($allAppointmentIds[$appointmentId])) {
                        $errors[] = "$path.appointment_ids[$appointmentIndex] est dupliqué";
                    } else {
                        $local[$appointmentId] = true;
                        $allAppointmentIds[$appointmentId] = true;
                    }
                }
            }

            $allowed = ['operation_id', 'patient_id', 'holder_restore', 'relative', 'appointment_ids'];
            foreach (array_keys($operation) as $key) {
                if (!in_array($key, $allowed, true)) {
                    $errors[] = "$path.$key n'est pas autorisé";
                }
            }
        }
        return $errors;
    }

    /**
     * @return list<string>
     */
    public static function confirmationErrors(string $manifestHash, ?string $flag, ?string $env): array
    {
        $errors = [];
        $expectedFlag = 'APPLY-' . $manifestHash;
        $expectedEnv = 'YES-' . $manifestHash;
        if (!hash_equals($expectedFlag, (string) $flag)) {
            $errors[] = 'flag --confirm invalide';
        }
        if (!hash_equals($expectedEnv, (string) $env)) {
            $errors[] = 'REPAIR_COLLISIONS_APPLY invalide';
        }
        return $errors;
    }

    public function audit(): array
    {
        $profiles = $this->db->query(
            "SELECT id, email_hash, email_encrypted, email_dek, first_name_encrypted, first_name_dek,
                    last_name_encrypted, last_name_dek, phone_encrypted, phone_dek,
                    birth_date_encrypted, birth_date_dek
             FROM profiles WHERE role = 'patient'"
        )->fetchAll(PDO::FETCH_ASSOC);

        $appointmentStmt = $this->db->prepare(
            'SELECT id, relative_id, form_data_encrypted, form_data_dek
             FROM appointments
             WHERE patient_id = ? AND form_data_encrypted IS NOT NULL AND form_data_dek IS NOT NULL
             ORDER BY created_at ASC, id ASC'
        );

        $candidates = [];
        $counts = [
            'profiles_scanned' => count($profiles),
            'appointments_scanned' => 0,
            'forms_decrypted' => 0,
            'forms_unreadable' => 0,
            'potential_collisions' => 0,
        ];

        foreach ($profiles as $profile) {
            $appointmentStmt->execute([(string) $profile['id']]);
            $rows = $appointmentStmt->fetchAll(PDO::FETCH_ASSOC);
            $counts['appointments_scanned'] += count($rows);
            $current = $this->decryptIdentity($profile);
            $holderContactHashes = array_filter([
                'email' => self::fingerprint($current['email'] ?? ''),
                'phone' => self::fingerprint(self::normalizePhone($current['phone'] ?? '')),
            ]);
            $snapshots = [];
            foreach ($rows as $row) {
                try {
                    $form = json_decode(
                        $this->crypto->decryptField((string) $row['form_data_encrypted'], (string) $row['form_data_dek']),
                        true,
                        512,
                        JSON_THROW_ON_ERROR
                    );
                    if (!is_array($form)) {
                        throw new RuntimeException('form_data non objet');
                    }
                    $counts['forms_decrypted']++;
                } catch (Throwable) {
                    $counts['forms_unreadable']++;
                    continue;
                }

                $snapshot = self::extractFormSnapshot($form);
                $reasons = [];
                $holderIdentityHash = self::identityFingerprint($snapshot['holder']);
                $beneficiaryIdentityHash = self::identityFingerprint($snapshot['beneficiary']);
                $currentIdentityHash = self::identityFingerprint($current);
                $contactMatches = [];
                foreach (['email', 'phone'] as $contact) {
                    $value = $snapshot['holder'][$contact] ?? '';
                    if ($contact === 'phone') {
                        $value = self::normalizePhone($value);
                    }
                    $hash = self::fingerprint($value);
                    if ($hash !== null && isset($holderContactHashes[$contact]) && hash_equals($holderContactHashes[$contact], $hash)) {
                        $contactMatches[] = $contact;
                    }
                }
                if ($holderIdentityHash && $beneficiaryIdentityHash && !hash_equals($holderIdentityHash, $beneficiaryIdentityHash)) {
                    $reasons[] = 'holder_beneficiary_identity_mismatch';
                }
                if ($beneficiaryIdentityHash && $currentIdentityHash && hash_equals($beneficiaryIdentityHash, $currentIdentityHash)
                    && $holderIdentityHash && !hash_equals($holderIdentityHash, $currentIdentityHash)) {
                    $reasons[] = 'current_profile_matches_beneficiary_not_holder';
                }
                if ($contactMatches !== [] && $holderIdentityHash && $currentIdentityHash && !hash_equals($holderIdentityHash, $currentIdentityHash)) {
                    $reasons[] = 'same_holder_contact_with_identity_change';
                }
                if ($row['relative_id'] === null && in_array('holder_beneficiary_identity_mismatch', $reasons, true)) {
                    $reasons[] = 'beneficiary_mismatch_without_relative_link';
                }
                if ($holderIdentityHash) {
                    $snapshots[$holderIdentityHash][] = (string) $row['id'];
                }
                if (count($reasons) >= 2) {
                    $candidates[] = [
                        'patient_id' => (string) $profile['id'],
                        'appointment_id' => (string) $row['id'],
                        'relative_id' => $row['relative_id'] ?: null,
                        'identity_hashes' => [
                            'current' => self::truncateHash($currentIdentityHash),
                            'holder_snapshot' => self::truncateHash($holderIdentityHash),
                            'beneficiary_snapshot' => self::truncateHash($beneficiaryIdentityHash),
                        ],
                        'contact_hashes' => array_map(
                            static fn(string $hash): string => self::truncateHash($hash),
                            array_intersect_key($holderContactHashes, array_flip($contactMatches))
                        ),
                        'reasons' => array_values(array_unique($reasons)),
                    ];
                }
            }
            if (count($snapshots) > 1) {
                $candidates[] = [
                    'patient_id' => (string) $profile['id'],
                    'appointment_ids' => array_values(array_unique(array_merge(...array_values($snapshots)))),
                    'identity_hashes' => array_map([self::class, 'truncateHash'], array_keys($snapshots)),
                    'reasons' => ['multiple_holder_identities_across_appointments'],
                ];
            }
        }
        $counts['potential_collisions'] = count($candidates);
        return ['mode' => 'audit', 'read_only' => true, 'counts' => $counts, 'candidates' => $candidates];
    }

    public function dryRun(array $manifest): array
    {
        $errors = self::validateManifest($manifest);
        if ($errors !== []) {
            throw new InvalidArgumentException(implode('; ', $errors));
        }
        $this->assertDatabaseTargets($manifest, false);
        return [
            'mode' => 'dry-run',
            'writes_performed' => 0,
            'operations' => count($manifest['operations']),
            'appointments' => array_sum(array_map(
                static fn(array $operation): int => count($operation['appointment_ids']),
                $manifest['operations']
            )),
        ];
    }

    public function apply(array $manifest, string $manifestHash, ?string $flag, ?string $env): array
    {
        $errors = self::validateManifest($manifest);
        $errors = array_merge($errors, self::confirmationErrors($manifestHash, $flag, $env));
        if ($errors !== []) {
            throw new InvalidArgumentException(implode('; ', $errors));
        }

        $this->db->beginTransaction();
        try {
            $this->assertDatabaseTargets($manifest, true);
            $before = $this->captureLogicalBackup($manifest);
            $beforePath = $this->writeBackup($manifest, 'before', $manifestHash, $before);
            $appointmentCount = 0;
            foreach ($manifest['operations'] as $operation) {
                $this->restoreHolder((string) $operation['patient_id'], $operation['holder_restore']);
                $relativeId = (string) $operation['relative']['id'];
                $this->writeRelative((string) $operation['patient_id'], $relativeId, $operation['relative']);
                $this->attachAppointments(
                    (string) $operation['patient_id'],
                    $relativeId,
                    $operation['appointment_ids']
                );
                $appointmentCount += count($operation['appointment_ids']);
            }
            $after = $this->captureLogicalBackup($manifest);
            $afterPath = $this->writeBackup($manifest, 'after', $manifestHash, $after);
            $this->writeAuditLog($manifest, $manifestHash, $beforePath, $afterPath, $appointmentCount);
            $this->db->commit();
            return [
                'mode' => 'apply',
                'committed' => true,
                'operations' => count($manifest['operations']),
                'appointments' => $appointmentCount,
                'manifest_hash' => self::truncateHash($manifestHash),
                'backup_before' => $beforePath,
                'backup_after' => $afterPath,
            ];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }

    private static function validateIdentityPatch(array $patch, string $path, array &$errors, bool $requireNames): void
    {
        $allowed = ['first_name', 'last_name', 'email', 'phone', 'birth_date', 'gender', 'address', 'relationship_type'];
        foreach ($patch as $key => $value) {
            if (!in_array($key, $allowed, true)) {
                $errors[] = "$path.$key n'est pas autorisé";
                continue;
            }
            if ($key === 'address' && !is_string($value) && !is_array($value) && $value !== null) {
                $errors[] = "$path.address doit être chaîne, objet ou null";
            } elseif ($key !== 'address' && $value !== null && !is_string($value)) {
                $errors[] = "$path.$key doit être une chaîne ou null";
            }
        }
        if ($requireNames) {
            foreach (['first_name', 'last_name'] as $key) {
                if (!is_string($patch[$key] ?? null) || trim($patch[$key]) === '') {
                    $errors[] = "$path.$key est requis";
                }
            }
        }
        if (isset($patch['birth_date']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $patch['birth_date'])) {
            $errors[] = "$path.birth_date doit être au format YYYY-MM-DD";
        }
        if (isset($patch['relationship_type']) && !in_array($patch['relationship_type'], [
            'child', 'parent', 'spouse', 'sibling', 'grandparent', 'grandchild', 'other',
        ], true)) {
            $errors[] = "$path.relationship_type invalide";
        }
    }

    private static function isUuid(mixed $value): bool
    {
        return is_string($value)
            && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
    }

    private static function fingerprint(mixed $value): ?string
    {
        $normalized = mb_strtolower(trim((string) $value));
        return $normalized === '' ? null : hash('sha256', $normalized);
    }

    private static function normalizePhone(mixed $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }

    private static function identityFingerprint(array $identity): ?string
    {
        $parts = [];
        foreach (['first_name', 'last_name', 'birth_date'] as $key) {
            $parts[] = mb_strtolower(trim((string) ($identity[$key] ?? '')));
        }
        return trim(implode('|', $parts), '|') === '' ? null : hash('sha256', implode('|', $parts));
    }

    private static function truncateHash(?string $hash): ?string
    {
        return $hash === null ? null : substr($hash, 0, 12);
    }

    private static function extractFormSnapshot(array $form): array
    {
        $get = static function (array $keys) use ($form): string {
            foreach ($keys as $key) {
                if (isset($form[$key]) && is_scalar($form[$key])) {
                    return trim((string) $form[$key]);
                }
            }
            return '';
        };
        return [
            'holder' => [
                'first_name' => $get([
                    'account_holder_first_name', 'booking_contact_first_name', 'holder_first_name', 'patient_first_name',
                ]),
                'last_name' => $get([
                    'account_holder_last_name', 'booking_contact_last_name', 'holder_last_name', 'patient_last_name',
                ]),
                'birth_date' => $get(['account_holder_birth_date', 'booking_contact_birth_date', 'holder_birth_date']),
                'email' => $get(['account_holder_email', 'booking_contact_email', 'holder_email', 'email']),
                'phone' => $get(['account_holder_phone', 'booking_contact_phone', 'holder_phone', 'phone']),
            ],
            'beneficiary' => [
                'first_name' => $get(['beneficiary_first_name', 'first_name']),
                'last_name' => $get(['beneficiary_last_name', 'last_name']),
                'birth_date' => $get(['beneficiary_birth_date', 'birth_date']),
            ],
        ];
    }

    private function decryptIdentity(array $row): array
    {
        $result = [];
        foreach (['email', 'first_name', 'last_name', 'phone', 'birth_date'] as $field) {
            $encrypted = $row[$field . '_encrypted'] ?? null;
            $dek = $row[$field . '_dek'] ?? null;
            if ($encrypted && $dek) {
                try {
                    $result[$field] = $this->crypto->decryptField((string) $encrypted, (string) $dek);
                } catch (Throwable) {
                    $result[$field] = '';
                }
            }
        }
        return $result;
    }

    private function assertDatabaseTargets(array $manifest, bool $forUpdate): void
    {
        $suffix = $forUpdate ? ' FOR UPDATE' : '';
        $profile = $this->db->prepare("SELECT id FROM profiles WHERE id = ? AND role = 'patient'$suffix");
        $relative = $this->db->prepare("SELECT patient_id FROM patient_relatives WHERE id = ?$suffix");
        $appointment = $this->db->prepare("SELECT patient_id, relative_id FROM appointments WHERE id = ?$suffix");
        foreach ($manifest['operations'] as $operation) {
            $patientId = (string) $operation['patient_id'];
            $profile->execute([$patientId]);
            if (!$profile->fetchColumn()) {
                throw new RuntimeException('Titulaire patient introuvable: ' . $patientId);
            }
            $relativeId = (string) $operation['relative']['id'];
            $relative->execute([$relativeId]);
            $owner = $relative->fetchColumn();
            if ($operation['relative']['action'] === 'create' && $owner !== false) {
                throw new RuntimeException('Le relative.id à créer existe déjà: ' . $relativeId);
            }
            if ($operation['relative']['action'] === 'update' && $owner !== $patientId) {
                throw new RuntimeException('Le proche à mettre à jour est absent ou appartient à un autre titulaire: ' . $relativeId);
            }
            foreach ($operation['appointment_ids'] as $appointmentId) {
                $appointment->execute([$appointmentId]);
                $row = $appointment->fetch(PDO::FETCH_ASSOC);
                if (!$row || (string) $row['patient_id'] !== $patientId) {
                    throw new RuntimeException('RDV absent ou titulaire incohérent: ' . $appointmentId);
                }
                if (!empty($row['relative_id']) && (string) $row['relative_id'] !== $relativeId) {
                    throw new RuntimeException('RDV déjà rattaché à un autre proche: ' . $appointmentId);
                }
            }
        }
    }

    private function restoreHolder(string $patientId, array $patch): void
    {
        $sets = [];
        $params = [];
        foreach ($patch as $field => $value) {
            if ($field === 'relationship_type') {
                continue;
            }
            $serialized = $field === 'address' && is_array($value)
                ? json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
                : $value;
            if ($serialized === null || $serialized === '') {
                if (in_array($field, ['email', 'first_name', 'last_name'], true)) {
                    throw new RuntimeException("Le champ titulaire obligatoire $field ne peut être vidé");
                }
                $sets[] = "{$field}_encrypted = NULL";
                $sets[] = "{$field}_dek = NULL";
            } else {
                $encrypted = $this->crypto->encryptField((string) $serialized);
                $sets[] = "{$field}_encrypted = ?";
                $sets[] = "{$field}_dek = ?";
                $params[] = $encrypted['encrypted'];
                $params[] = $encrypted['dek'];
            }
            if ($field === 'email') {
                $sets[] = 'email_hash = ?';
                $params[] = hash('sha256', mb_strtolower((string) $serialized));
            }
        }
        $params[] = $patientId;
        $stmt = $this->db->prepare('UPDATE profiles SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = ?');
        $stmt->execute($params);
        if ($stmt->rowCount() !== 1) {
            throw new RuntimeException('Échec de restauration du titulaire: ' . $patientId);
        }
    }

    private function writeRelative(string $patientId, string $relativeId, array $relative): void
    {
        $data = $relative['data'];
        if ($relative['action'] === 'create') {
            $columns = ['id', 'patient_id'];
            $values = ['?', '?'];
            $params = [$relativeId, $patientId];
            foreach ($data as $field => $value) {
                if ($field === 'relationship_type') {
                    $columns[] = $field;
                    $values[] = '?';
                    $params[] = $value;
                    continue;
                }
                $this->appendEncryptedValue($columns, $values, $params, $field, $value);
            }
            if (array_key_exists('email', $data)) {
                $columns[] = 'email_hash';
                $values[] = '?';
                $params[] = empty($data['email']) ? null : hash('sha256', mb_strtolower((string) $data['email']));
            }
            $stmt = $this->db->prepare(
                'INSERT INTO patient_relatives (' . implode(', ', $columns) . ', created_at, updated_at)
                 VALUES (' . implode(', ', $values) . ', NOW(), NOW())'
            );
            $stmt->execute($params);
            return;
        }

        $sets = [];
        $params = [];
        foreach ($data as $field => $value) {
            if ($field === 'relationship_type') {
                $sets[] = 'relationship_type = ?';
                $params[] = $value;
                continue;
            }
            $columns = [];
            $values = [];
            $local = [];
            $this->appendEncryptedValue($columns, $values, $local, $field, $value);
            foreach ($columns as $index => $column) {
                $sets[] = "$column = {$values[$index]}";
            }
            array_push($params, ...$local);
            if ($field === 'email') {
                $sets[] = 'email_hash = ?';
                $params[] = empty($value) ? null : hash('sha256', mb_strtolower((string) $value));
            }
        }
        $params[] = $relativeId;
        $params[] = $patientId;
        $stmt = $this->db->prepare(
            'UPDATE patient_relatives SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = ? AND patient_id = ?'
        );
        $stmt->execute($params);
    }

    private function appendEncryptedValue(array &$columns, array &$values, array &$params, string $field, mixed $value): void
    {
        $columns[] = $field . '_encrypted';
        $columns[] = $field . '_dek';
        if ($value === null || $value === '') {
            $values[] = 'NULL';
            $values[] = 'NULL';
            return;
        }
        $serialized = $field === 'address' && is_array($value)
            ? json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
            : (string) $value;
        $encrypted = $this->crypto->encryptField($serialized);
        $values[] = '?';
        $values[] = '?';
        $params[] = $encrypted['encrypted'];
        $params[] = $encrypted['dek'];
    }

    private function attachAppointments(string $patientId, string $relativeId, array $appointmentIds): void
    {
        $stmt = $this->db->prepare(
            'UPDATE appointments SET relative_id = ?, updated_at = NOW()
             WHERE id = ? AND patient_id = ? AND (relative_id IS NULL OR relative_id = ?)'
        );
        foreach ($appointmentIds as $appointmentId) {
            $stmt->execute([$relativeId, $appointmentId, $patientId, $relativeId]);
            if ($stmt->rowCount() > 1) {
                throw new RuntimeException('Rattachement ambigu du RDV: ' . $appointmentId);
            }
        }
    }

    private function captureLogicalBackup(array $manifest): array
    {
        $result = ['profiles' => [], 'relatives' => [], 'appointments' => []];
        $profileStmt = $this->db->prepare(
            'SELECT id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek,
                    last_name_encrypted, last_name_dek, phone_encrypted, phone_dek, address_encrypted, address_dek,
                    gender_encrypted, gender_dek, birth_date_encrypted, birth_date_dek, updated_at
             FROM profiles WHERE id = ?'
        );
        $relativeStmt = $this->db->prepare('SELECT * FROM patient_relatives WHERE id = ?');
        $appointmentStmt = $this->db->prepare(
            'SELECT id, patient_id, relative_id, updated_at FROM appointments WHERE id = ?'
        );
        foreach ($manifest['operations'] as $operation) {
            $profileStmt->execute([$operation['patient_id']]);
            $result['profiles'][] = $profileStmt->fetch(PDO::FETCH_ASSOC);
            $relativeStmt->execute([$operation['relative']['id']]);
            $relative = $relativeStmt->fetch(PDO::FETCH_ASSOC);
            $result['relatives'][] = $relative === false
                ? ['id' => $operation['relative']['id'], '_absent' => true]
                : $relative;
            foreach ($operation['appointment_ids'] as $appointmentId) {
                $appointmentStmt->execute([$appointmentId]);
                $result['appointments'][] = $appointmentStmt->fetch(PDO::FETCH_ASSOC);
            }
        }
        return $result;
    }

    private function writeBackup(array $manifest, string $phase, string $manifestHash, array $data): string
    {
        if (!is_dir($this->backupDir) && !mkdir($this->backupDir, 0700, true) && !is_dir($this->backupDir)) {
            throw new RuntimeException('Impossible de créer le répertoire de backup');
        }
        $path = $this->backupDir . '/' . gmdate('Ymd-His') . '-' . substr($manifestHash, 0, 12) . "-$phase.json";
        $payload = [
            'format' => 'repair-collisions-logical-backup-v1',
            'phase' => $phase,
            'created_at_utc' => gmdate(DATE_ATOM),
            'manifest_id' => $manifest['manifest_id'],
            'manifest_hash' => $manifestHash,
            'encrypted_database_rows' => $data,
        ];
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (file_put_contents($path, $json . PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException('Écriture du backup impossible');
        }
        @chmod($path, 0600);
        return $path;
    }

    private function writeAuditLog(
        array $manifest,
        string $manifestHash,
        string $beforePath,
        string $afterPath,
        int $appointments
    ): void {
        $path = $this->backupDir . '/apply.log';
        $entry = [
            'at_utc' => gmdate(DATE_ATOM),
            'manifest_id' => $manifest['manifest_id'],
            'manifest_hash' => $manifestHash,
            'operation_ids' => array_column($manifest['operations'], 'operation_id'),
            'patient_ids' => array_column($manifest['operations'], 'patient_id'),
            'appointment_count' => $appointments,
            'before_backup' => basename($beforePath),
            'after_backup' => basename($afterPath),
        ];
        if (file_put_contents($path, json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Écriture du journal impossible');
        }
        @chmod($path, 0600);
    }
}
