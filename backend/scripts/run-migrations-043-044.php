<?php
/**
 * Exécute les migrations 043 et 044 (care_category_options)
 * Usage: php run-migrations-043-044.php
 * Depuis backend/: php scripts/run-migrations-043-044.php
 * Sur le serveur: cd /var/www/oneandlab/backend && php scripts/run-migrations-043-044.php
 */

$baseDir = dirname(__DIR__);
chdir($baseDir);

// Charger .env
$envFile = $baseDir . '/../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($value);
            }
        }
    }
}

$config = require $baseDir . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

function executeSqlFile(PDO $pdo, string $path): void {
    $sql = file_get_contents($path);
    $sql = preg_replace('/--.*$/m', '', $sql);
    $statements = array_filter(array_map('trim', explode(';', $sql)), fn($s) => !empty($s));
    foreach ($statements as $stmt) {
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'already exists') === false && strpos($e->getMessage(), 'Duplicate') === false) {
                throw $e;
            }
        }
    }
}

$migrationsDir = $baseDir . '/../database/migrations';
$files = ['043_create_care_category_options.sql', '044_seed_care_category_options.sql'];
foreach ($files as $f) {
    $path = $migrationsDir . '/' . $f;
    if (!file_exists($path)) {
        die("Fichier introuvable: $path\n");
    }
    echo "→ $f\n";
    executeSqlFile($pdo, $path);
}
echo "✓ Migrations 043 et 044 exécutées.\n";
