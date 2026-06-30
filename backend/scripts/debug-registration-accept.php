#!/usr/bin/env php
<?php
/**
 * Diagnostique une demande d'inscription (ex. Jessica Levy) et simule l'acceptation.
 * Usage: php scripts/debug-registration-accept.php [search]
 */
$search = $argv[1] ?? 'levy';

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../models/RegistrationRequest.php';

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
$model = new RegistrationRequest();

$stmt = $db->query('SELECT * FROM registration_requests ORDER BY created_at DESC LIMIT 200');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

function decryptField(Crypto $crypto, ?string $enc, ?string $dek): string
{
    if (empty($enc) || empty($dek)) {
        return '';
    }
    try {
        return trim((string) $crypto->decryptField($enc, $dek));
    } catch (Throwable $e) {
        return '(decrypt error: ' . $e->getMessage() . ')';
    }
}

$needle = strtolower($search);
$matches = [];

foreach ($rows as $row) {
    $fn = decryptField($crypto, $row['first_name_encrypted'] ?? null, $row['first_name_dek'] ?? null);
    $ln = decryptField($crypto, $row['last_name_encrypted'] ?? null, $row['last_name_dek'] ?? null);
    $email = decryptField($crypto, $row['email_encrypted'] ?? null, $row['email_dek'] ?? null);
    $hay = strtolower($fn . ' ' . $ln . ' ' . $email);
    if ($needle === '' || str_contains($hay, $needle)) {
        $matches[] = array_merge($row, [
            '_first_name' => $fn,
            '_last_name' => $ln,
            '_email' => $email,
            '_phone' => decryptField($crypto, $row['phone_encrypted'] ?? null, $row['phone_dek'] ?? null),
            '_adeli' => decryptField($crypto, $row['adeli_encrypted'] ?? null, $row['adeli_dek'] ?? null),
            '_rpps' => decryptField($crypto, $row['rpps_encrypted'] ?? null, $row['rpps_dek'] ?? null),
        ]);
    }
}

if ($matches === []) {
    echo "Aucune demande trouvée pour «{$search}».\n";
    exit(1);
}

foreach ($matches as $m) {
    echo str_repeat('=', 60) . "\n";
    echo "ID       : {$m['id']}\n";
    echo "Statut   : {$m['status']}\n";
    echo "Rôle     : {$m['role']}\n";
    echo "Nom      : {$m['_first_name']} {$m['_last_name']}\n";
    echo "Email    : {$m['_email']}\n";
    echo "Tél      : {$m['_phone']}\n";
    echo "ADELI    : " . ($m['_adeli'] !== '' ? $m['_adeli'] : '(vide)') . "\n";
    echo "RPPS     : " . ($m['_rpps'] !== '' ? $m['_rpps'] : '(vide)') . "\n";
    echo "Créé     : {$m['created_at']}\n";

    $emailHash = hash('sha256', strtolower($m['_email']));
    $dup = $db->prepare('SELECT id, role FROM profiles WHERE email_hash = ?');
    $dup->execute([$emailHash]);
    $existing = $dup->fetchAll(PDO::FETCH_ASSOC);
    if ($existing !== []) {
        echo "\n⚠️  Email déjà utilisé par profil(s) existant(s) :\n";
        foreach ($existing as $ex) {
            echo "   - {$ex['id']} (role: {$ex['role']})\n";
        }
    } else {
        echo "\n✓ Email libre (pas de doublon profiles.email_hash)\n";
    }

    if ($m['status'] !== 'pending') {
        echo "\n→ Demande déjà traitée, pas de simulation accept.\n";
        continue;
    }

    echo "\n--- Simulation accept() ---\n";
    try {
        $result = $model->accept($m['id'], 'system-debug');
        echo "✅ Accept OK — user_id: {$result['user_id']}\n";
    } catch (Throwable $e) {
        echo "❌ Accept FAIL: " . $e->getMessage() . "\n";
        if ($e->getPrevious()) {
            echo "   Cause: " . $e->getPrevious()->getMessage() . "\n";
        }
    }
}
