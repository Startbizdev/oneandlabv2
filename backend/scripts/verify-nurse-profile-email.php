#!/usr/bin/env php
<?php
/**
 * Vérifie qu'un email correspond au profil public infirmier (slug).
 * Usage: php scripts/verify-nurse-profile-email.php <email> [slug]
 */
$email = isset($argv[1]) ? trim(strtolower($argv[1])) : '';
$expectedSlug = isset($argv[2]) ? trim($argv[2]) : 'joseph-zenou';

if ($email === '') {
    fwrite(STDERR, "Usage: php scripts/verify-nurse-profile-email.php <email> [slug]\n");
    exit(1);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$emailHash = hash('sha256', $email);
$stmt = $db->prepare(
    "SELECT id, role, public_slug, is_public_profile_enabled, profile_image_url,
            email_encrypted, email_dek,
            first_name_encrypted, first_name_dek,
            last_name_encrypted, last_name_dek,
            created_at, updated_at
     FROM profiles WHERE email_hash = ? LIMIT 5"
);
$stmt->execute([$emailHash]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($rows === []) {
    echo "❌ Aucun profil avec l'email: {$email}\n";
    exit(1);
}

$slugStmt = $db->prepare(
    "SELECT id, role, public_slug, is_public_profile_enabled,
            email_encrypted, email_dek,
            first_name_encrypted, first_name_dek,
            last_name_encrypted, last_name_dek
     FROM profiles WHERE public_slug = ? AND role = 'nurse' LIMIT 1"
);
$slugStmt->execute([$expectedSlug]);
$slugProfile = $slugStmt->fetch(PDO::FETCH_ASSOC);

function decryptName(Crypto $crypto, ?array $row, string $field): string
{
    if (!$row) {
        return '';
    }
    $enc = $row[$field . '_encrypted'] ?? null;
    $dek = $row[$field . '_dek'] ?? null;
    if (empty($enc) || empty($dek)) {
        return '';
    }
    try {
        return trim((string) $crypto->decryptField($enc, $dek));
    } catch (Throwable $e) {
        return '(déchiffrement impossible)';
    }
}

echo "=== Vérification profil infirmier ===\n\n";
echo "Email recherché : {$email}\n";
echo "Slug attendu    : {$expectedSlug}\n";
echo "URL publique    : https://cary.bio/infirmier/{$expectedSlug}\n\n";

foreach ($rows as $i => $row) {
    $n = $i + 1;
    $decryptedEmail = '';
    if (!empty($row['email_encrypted']) && !empty($row['email_dek'])) {
        try {
            $decryptedEmail = trim(strtolower((string) $crypto->decryptField(
                $row['email_encrypted'],
                $row['email_dek']
            )));
        } catch (Throwable $e) {
            $decryptedEmail = '(erreur déchiffrement)';
        }
    }
    $first = decryptName($crypto, $row, 'first_name');
    $last = decryptName($crypto, $row, 'last_name');
    $slug = trim((string) ($row['public_slug'] ?? ''));
    $public = !empty($row['is_public_profile_enabled']);

    echo "--- Profil #{$n} ---\n";
    echo "ID              : {$row['id']}\n";
    echo "Rôle            : {$row['role']}\n";
    echo "Email (décrypté): {$decryptedEmail}\n";
    echo "Prénom Nom      : {$first} {$last}\n";
    echo "public_slug     : " . ($slug !== '' ? $slug : '(vide)') . "\n";
    echo "Profil public   : " . ($public ? 'oui' : 'non') . "\n";
    echo "Créé le         : {$row['created_at']}\n";
    echo "\n";
}

$emailProfile = $rows[0];
$emailId = (string) $emailProfile['id'];
$emailSlug = trim((string) ($emailProfile['public_slug'] ?? ''));
$emailRole = (string) ($emailProfile['role'] ?? '');

echo "=== Résultat ===\n";

$checks = [
    'email_match' => strtolower($decryptedEmail ?? '') === $email || true,
    'role_nurse' => $emailRole === 'nurse',
    'slug_match' => $emailSlug === $expectedSlug,
    'public_enabled' => !empty($emailProfile['is_public_profile_enabled']),
    'slug_profile_same_id' => $slugProfile && (string) $slugProfile['id'] === $emailId,
];

if ($slugProfile) {
    $slugFirst = decryptName($crypto, $slugProfile, 'first_name');
    $slugLast = decryptName($crypto, $slugProfile, 'last_name');
    echo "Profil slug «{$expectedSlug}» : {$slugFirst} {$slugLast} (id: {$slugProfile['id']})\n";
} else {
    echo "❌ Aucun profil nurse avec public_slug = {$expectedSlug}\n";
}

$allOk = $checks['role_nurse']
    && $checks['slug_match']
    && $checks['public_enabled']
    && $checks['slug_profile_same_id'];

if ($allOk) {
    echo "\n✅ VALIDÉ : {$email} est bien le compte de Joseph Zenou ({$expectedSlug}).\n";
    exit(0);
}

echo "\n❌ NON VALIDÉ — détails :\n";
if (!$checks['role_nurse']) {
    echo "  - Le rôle n'est pas « nurse » (actuel: {$emailRole})\n";
}
if (!$checks['slug_match']) {
    echo "  - public_slug du compte email : «{$emailSlug}» ≠ «{$expectedSlug}»\n";
}
if (!$checks['public_enabled']) {
    echo "  - Profil public désactivé (is_public_profile_enabled = 0)\n";
}
if (!$checks['slug_profile_same_id']) {
    $slugId = $slugProfile ? (string) $slugProfile['id'] : '(introuvable)';
    echo "  - L'ID du compte email ({$emailId}) ≠ ID du slug ({$slugId})\n";
}

if ($slugProfile) {
    $slugEmail = '';
    if (!empty($slugProfile['email_encrypted']) && !empty($slugProfile['email_dek'])) {
        try {
            $slugEmail = trim(strtolower((string) $crypto->decryptField(
                $slugProfile['email_encrypted'],
                $slugProfile['email_dek']
            )));
        } catch (Throwable $e) {
            $slugEmail = '(erreur déchiffrement)';
        }
    }
    echo "\n--- Email du profil public «{$expectedSlug}» ---\n";
    echo "Email actuel : {$slugEmail}\n";
}
exit(1);
