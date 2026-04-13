<?php
/**
 * Exécute la migration 050 (galerie photos de soins : care_photo + appointment_care_photo_comments)
 * Usage: depuis backend/: php scripts/run-migration-050.php
 * Sur le serveur: cd /var/www/oneandlab/backend && php scripts/run-migration-050.php
 */

$baseDir = dirname(__DIR__);
chdir($baseDir);

$envFile = $baseDir . '/../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($value);
            }
        }
    }
}

$config = require $baseDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

function executeSqlFile(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    $sql = preg_replace('/--.*$/m', '', $sql);
    $statements = array_filter(array_map('trim', explode(';', $sql)), fn ($s) => !empty($s));
    foreach ($statements as $stmt) {
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (
                strpos($msg, 'already exists') !== false
                || strpos($msg, 'Duplicate') !== false
            ) {
                continue;
            }
            throw $e;
        }
    }
}

$migrationsDir = $baseDir . '/../database/migrations';
$path = $migrationsDir . '/050_care_photo_gallery.sql';
if (!file_exists($path)) {
    die("Fichier introuvable: $path\n");
}
echo "→ 050_care_photo_gallery.sql\n";
executeSqlFile($pdo, $path);
echo "✓ Migration 050 exécutée.\n";
