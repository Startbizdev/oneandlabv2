<?php

declare(strict_types=1);

/**
 * Crée la base de test depuis zéro : migrations database/migrations/*.sql (ordre lexical),
 * seeds database/seeds/*.sql, puis profils fixtures par rôle.
 *
 * Refuse de tourner hors d'une base dont le nom finit par "_test".
 * Usage (conteneur php-test) : php scripts/test-db-bootstrap.php
 */

require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../tests/fixtures/TestFixtures.php';

$env = static fn (string $k, string $d = ''): string => (string) (getenv($k) !== false ? getenv($k) : ($_ENV[$k] ?? $d));

$host = $env('DB_HOST', '127.0.0.1');
$port = $env('DB_PORT', '3306');
$name = $env('DB_NAME', 'oneandlab_test');
$user = $env('DB_USER', 'root');
$pass = $env('DB_PASS', '');

if (!preg_match('/^[a-z0-9_]+_test$/', $name)) {
    fwrite(STDERR, "Refus : DB_NAME doit finir par _test (reçu: $name)\n");
    exit(1);
}

$root = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$root->exec("DROP DATABASE IF EXISTS `$name`");
$root->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

$repo = dirname(__DIR__, 2);
$files = glob($repo . '/database/migrations/*.sql') ?: [];
sort($files, SORT_STRING);
$seeds = glob($repo . '/database/seeds/*.sql') ?: [];
sort($seeds, SORT_STRING);

$tmpDir = sys_get_temp_dir() . '/oneandlab-test-migrations-' . getmypid();
@mkdir($tmpDir, 0777, true);

$mysqlArgs = sprintf(
    'mysql --protocol=TCP -h %s -P %s -u %s %s --default-character-set=utf8mb4 %s',
    escapeshellarg($host),
    escapeshellarg($port),
    escapeshellarg($user),
    $pass !== '' ? '-p' . escapeshellarg($pass) : '',
    escapeshellarg($name)
);

$failed = [];
foreach (array_merge($files, $seeds) as $file) {
    $base = basename($file);
    $sql = (string) file_get_contents($file);
    // Remplace USE oneandlab hardcodé par la base de test
    $sql = preg_replace('/USE\s+[`\']?oneandlab[`\']?\s*;/i', "USE `$name`;", $sql) ?? $sql;
    $tmpFile = $tmpDir . '/' . $base;
    file_put_contents($tmpFile, $sql);
    $cmd = $mysqlArgs . ' < ' . escapeshellarg($tmpFile) . ' 2>&1';
    exec($cmd, $out, $code);
    if ($code !== 0) {
        $failed[$base] = trim(implode("\n", array_slice($out, -4)));
    }
    $out = [];
}

@array_map('unlink', glob($tmpDir . '/*') ?: []);
@rmdir($tmpDir);

$known = TestFixtures::KNOWN_NON_REPLAYABLE_MIGRATIONS;
$unexpected = array_diff_key($failed, array_flip($known));
foreach ($failed as $file => $msg) {
    $tag = in_array($file, $known, true) ? 'KNOWN' : 'FAIL ';
    echo "$tag $file — $msg\n";
}
echo sprintf(
    "Migrations+seeds appliqués : %d fichiers, %d échecs (%d inattendus)\n",
    count($files) + count($seeds),
    count($failed),
    count($unexpected)
);

$pdo = new PDO(
    "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",
    $user,
    $pass,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Colonnes critiques si migrations 020/037 ont échoué pour une autre raison
$cols = array_flip($pdo->query('SHOW COLUMNS FROM profiles')->fetchAll(PDO::FETCH_COLUMN));
if (!isset($cols['lab_id'])) {
    $pdo->exec('ALTER TABLE profiles ADD COLUMN lab_id CHAR(36) NULL AFTER role');
    echo "Patched profiles.lab_id\n";
}
if (!isset($cols['created_by'])) {
    $pdo->exec('ALTER TABLE profiles ADD COLUMN created_by CHAR(36) NULL');
    echo "Patched profiles.created_by\n";
}

TestFixtures::seedProfiles($pdo, new Crypto());
echo "Profils fixtures insérés\n";
echo "TEST_PATIENT_ID=" . TestFixtures::PATIENT_A . "\n";
echo "TEST_PATIENT_B_ID=" . TestFixtures::PATIENT_B . "\n";

exit($unexpected === [] ? 0 : 1);
