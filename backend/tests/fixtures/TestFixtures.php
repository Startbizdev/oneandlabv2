<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/Crypto.php';

/** Identifiants et insertion des profils de test (base Docker jetable). */
final class TestFixtures
{
    public const PATIENT_A = '00000000-0000-4000-8000-00000000a001';
    public const PATIENT_B = '00000000-0000-4000-8000-00000000a002';
    public const NURSE = '00000000-0000-4000-8000-00000000b001';
    public const LAB = '00000000-0000-4000-8000-00000000c001';
    public const SUBACCOUNT = '00000000-0000-4000-8000-00000000c002';
    public const PRELEVEUR = '00000000-0000-4000-8000-00000000c003';
    public const PRO = '00000000-0000-4000-8000-00000000d001';
    public const ADMIN = '00000000-0000-4000-8000-00000000e001';

    /** Migrations qui échouent sur base vide même après rewrite USE. */
    public const KNOWN_NON_REPLAYABLE_MIGRATIONS = [];

    /** @return array<string, array{role: string, first: string, last: string, email: string}> */
    public static function profiles(): array
    {
        return [
            self::PATIENT_A => ['role' => 'patient', 'first' => 'Alice', 'last' => 'Patiente', 'email' => 'alice.patient@test.invalid'],
            self::PATIENT_B => ['role' => 'patient', 'first' => 'Bruno', 'last' => 'Patient', 'email' => 'bruno.patient@test.invalid'],
            self::NURSE => ['role' => 'nurse', 'first' => 'Nina', 'last' => 'Infirmiere', 'email' => 'nina.nurse@test.invalid'],
            self::LAB => ['role' => 'lab', 'first' => 'Labo', 'last' => 'Central', 'email' => 'labo@test.invalid'],
            self::SUBACCOUNT => ['role' => 'subaccount', 'first' => 'Sous', 'last' => 'Compte', 'email' => 'sub@test.invalid'],
            self::PRELEVEUR => ['role' => 'preleveur', 'first' => 'Paul', 'last' => 'Preleveur', 'email' => 'preleveur@test.invalid'],
            self::PRO => ['role' => 'pro', 'first' => 'Pierre', 'last' => 'Medecin', 'email' => 'pro@test.invalid'],
            self::ADMIN => ['role' => 'super_admin', 'first' => 'Ada', 'last' => 'Admin', 'email' => 'admin@test.invalid'],
        ];
    }

    public static function seedProfiles(PDO $pdo, Crypto $crypto): void
    {
        $cols = array_flip($pdo->query('SHOW COLUMNS FROM profiles')->fetchAll(PDO::FETCH_COLUMN));
        foreach (self::profiles() as $id => $p) {
            $email = $crypto->encryptField($p['email']);
            $first = $crypto->encryptField($p['first']);
            $last = $crypto->encryptField($p['last']);
            $row = [
                'id' => $id,
                'role' => $p['role'],
                'email_encrypted' => $email['encrypted'],
                'email_dek' => $email['dek'],
                'email_hash' => hash('sha256', strtolower($p['email'])),
                'first_name_encrypted' => $first['encrypted'],
                'first_name_dek' => $first['dek'],
                'last_name_encrypted' => $last['encrypted'],
                'last_name_dek' => $last['dek'],
            ];
            if (isset($cols['created_by']) && in_array($p['role'], ['subaccount', 'preleveur'], true)) {
                $row['created_by'] = self::LAB;
            }
            if (isset($cols['lab_id']) && in_array($p['role'], ['subaccount', 'preleveur'], true)) {
                $row['lab_id'] = self::LAB;
            }
            $names = array_keys($row);
            $sql = 'INSERT INTO profiles (' . implode(',', $names) . ') VALUES (' . implode(',', array_fill(0, count($names), '?')) . ')';
            $pdo->prepare($sql)->execute(array_values($row));
        }
    }

    /** Profil jetable (identité chiffrée) ; l'appelant le supprime en tearDown. */
    public static function insertProfile(PDO $pdo, string $role, ?string $labId = null): string
    {
        $crypto = new Crypto();
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
        $email = $role . '-' . $id . '@test.invalid';
        $emailEnc = $crypto->encryptField($email);
        $first = $crypto->encryptField('Profil');
        $last = $crypto->encryptField('Test');
        $pdo->prepare('
            INSERT INTO profiles (id, role, lab_id, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek,
                last_name_encrypted, last_name_dek)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, $role, $labId, $emailEnc['encrypted'], $emailEnc['dek'], hash('sha256', $email),
            $first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'],
        ]);

        return $id;
    }
}
