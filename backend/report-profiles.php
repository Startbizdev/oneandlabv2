<?php

/**
 * Rapport de la table profiles (données réelles en BDD, avec déchiffrement).
 *
 * Usage : php report-profiles.php
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';

$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$crypto = new Crypto();

$stmt = $pdo->query('
    SELECT id, role, lab_id, created_at, updated_at, banned_until, incident_count, last_incident_at,
           email_encrypted, email_dek,
           first_name_encrypted, first_name_dek,
           last_name_encrypted, last_name_dek
    FROM profiles
    ORDER BY created_at DESC
');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

function decryptOr($crypto, $encrypted, $dek, $fallback = '') {
    if (empty($encrypted) || empty($dek)) return $fallback;
    try {
        return $crypto->decryptField($encrypted, $dek) ?: $fallback;
    } catch (Throwable $e) {
        return '[erreur]';
    }
}

function shortId($id, $len = 8) {
    return $id ? substr($id, 0, $len) . '…' : '—';
}

echo "\n";
echo "=== RAPPORT TABLE PROFILES ===\n";
echo "Base : " . $config['database'] . " | " . count($rows) . " profil(s)\n";
echo "\n";

$sep = str_repeat('-', 140);
echo sprintf(
    "%-10s %-12s %-10s %-12s %-14s %-20s %-12s %-10s %-10s\n",
    'id', 'role', 'lab_id', 'created_at', 'first_name', 'last_name', 'email', 'incidents', 'banned_until'
);
echo $sep . "\n";

foreach ($rows as $r) {
    $firstName = decryptOr($crypto, $r['first_name_encrypted'] ?? '', $r['first_name_dek'] ?? '', '');
    $lastName  = decryptOr($crypto, $r['last_name_encrypted'] ?? '', $r['last_name_dek'] ?? '', '');
    $email     = decryptOr($crypto, $r['email_encrypted'] ?? '', $r['email_dek'] ?? '', '');

    $emailShort = mb_strlen($email) > 18 ? mb_substr($email, 0, 15) . '…' : $email;
    $firstShort = mb_strlen($firstName) > 12 ? mb_substr($firstName, 0, 10) . '…' : $firstName;
    $lastShort  = mb_strlen($lastName) > 12 ? mb_substr($lastName, 0, 10) . '…' : $lastName;

    echo sprintf(
        "%-10s %-12s %-10s %-12s %-14s %-20s %-12s %-10s %-10s\n",
        shortId($r['id']),
        $r['role'],
        shortId($r['lab_id'] ?? ''),
        substr($r['created_at'], 0, 10),
        $firstShort ?: '—',
        $lastShort ?: '—',
        $emailShort ?: '—',
        $r['incident_count'] ?? 0,
        !empty($r['banned_until']) ? substr($r['banned_until'], 0, 10) : '—'
    );
}

echo $sep . "\n";
echo "\nFin du rapport.\n";
