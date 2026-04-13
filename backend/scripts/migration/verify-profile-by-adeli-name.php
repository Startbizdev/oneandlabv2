<?php

/**
 * Usage: php verify-profile-by-adeli-name.php --adeli=136475977
 *        php verify-profile-by-adeli-name.php --name=ETTEDGUI
 * Cherche dans profiles (pro/nurse) par N° Adeli ou fragment de nom (déchiffrement).
 */

$opts = getopt('', ['adeli:', 'name:']);
$adeliNeedle = isset($opts['adeli']) ? trim((string) $opts['adeli']) : '';
$nameNeedle = isset($opts['name']) ? trim((string) $opts['name']) : '';

if ($adeliNeedle === '' && $nameNeedle === '') {
    fwrite(STDERR, "Usage: php verify-profile-by-adeli-name.php --adeli=... | --name=...\n");
    exit(1);
}

require_once __DIR__ . '/../../lib/Crypto.php';

$dbConf = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $dbConf['host'],
    (int) $dbConf['port'],
    $dbConf['database'],
    $dbConf['charset'] ?? 'utf8mb4'
);
$pdo = new PDO($dsn, $dbConf['username'], $dbConf['password'], $dbConf['options'] ?? []);
$crypto = new Crypto();

$stmt = $pdo->query(
    "SELECT id, role, emploi, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, adeli_encrypted, adeli_dek
     FROM profiles WHERE role IN ('nurse', 'pro')"
);

$found = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $fn = !empty($row['first_name_dek']) ? $crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek']) : '';
    $ln = !empty($row['last_name_dek']) ? $crypto->decryptField($row['last_name_encrypted'], $row['last_name_dek']) : '';
    $ad = !empty($row['adeli_dek']) ? $crypto->decryptField($row['adeli_encrypted'], $row['adeli_dek']) : '';
    $full = trim($fn . ' ' . $ln);

    $match = false;
    if ($adeliNeedle !== '' && strpos($ad, $adeliNeedle) !== false) {
        $match = true;
    }
    if ($nameNeedle !== '' && (stripos($full, $nameNeedle) !== false || stripos($fn, $nameNeedle) !== false || stripos($ln, $nameNeedle) !== false)) {
        $match = true;
    }

    if (!$match) {
        continue;
    }
    $found++;
    echo json_encode([
        'id' => $row['id'],
        'role' => $row['role'],
        'emploi' => $row['emploi'],
        'nom_complet' => $full,
        'adeli' => $ad,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
}

if ($found === 0) {
    fwrite(STDERR, "Aucun profil trouvé.\n");
    exit(2);
}
