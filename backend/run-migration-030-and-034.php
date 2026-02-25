<?php
/**
 * Exécute les migrations 030 (site web, horaires, réseaux) et 034 (redirections slug).
 *
 * Usage : php run-migration-030-and-034.php
 */

$config = require __DIR__ . '/config/database.php';

// Charger .env depuis la racine du projet
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
        }
    }
}

$host = $config['host'];
$port = $config['port'];
$database = $config['database'];
$username = $config['username'];
$password = $config['password'] ?? '';

$migrationsDir = __DIR__ . '/../database/migrations';

echo "Migrations 030 (site web, réseaux, horaires) et 034 (redirections slug)\n\n";

// --- Migration 034 : slug_redirects (une seule requête) ---
$sql034 = file_get_contents($migrationsDir . '/034_slug_redirects.sql');
if ($sql034 === false) {
    die("  [ERREUR] Fichier 034_slug_redirects.sql introuvable.\n");
}

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $host,
        $port,
        $database,
        $config['charset']
    );
    $pdo = new PDO($dsn, $username, $password, $config['options'] ?? []);
} catch (PDOException $e) {
    die("  [ERREUR] Connexion base : " . $e->getMessage() . "\n");
}

$pdo->exec($sql034);
echo "  [OK] Migration 034 : table slug_redirects créée.\n";

// --- Migration 030 : website_url, opening_hours, social_links, etc. (requêtes multiples) ---
$sql030 = file_get_contents($migrationsDir . '/030_public_profile_extra_fields.sql');
if ($sql030 === false) {
    die("  [ERREUR] Fichier 030_public_profile_extra_fields.sql introuvable.\n");
}

// La migration 030 utilise PREPARE/EXECUTE : il faut multi_query (mysqli) ou exécuter le fichier via CLI
if (function_exists('mysqli_connect')) {
    $mysqli = @new mysqli($host, $username, $password, $database, (int) $port);
    if ($mysqli->connect_error) {
        die("  [ERREUR] Connexion mysqli : " . $mysqli->connect_error . "\n");
    }
    $mysqli->set_charset($config['charset']);
    if ($mysqli->multi_query($sql030)) {
        do {
            if ($result = $mysqli->store_result()) {
                $result->free();
            }
        } while ($mysqli->next_result());
        if ($mysqli->errno) {
            // Colonne déjà existante = pas grave
            if (strpos($mysqli->error, 'Duplicate column') !== false) {
                echo "  [OK] Migration 030 : colonnes déjà présentes (site web, réseaux, horaires).\n";
            } else {
                echo "  [ATTENTION] Migration 030 : " . $mysqli->error . "\n";
            }
        } else {
            echo "  [OK] Migration 030 : colonnes site web, réseaux, horaires, etc. mises à jour.\n";
        }
    } else {
        echo "  [ERREUR] Migration 030 : " . $mysqli->error . "\n";
    }
    $mysqli->close();
} else {
    // Fallback : exécuter chaque ALTER possible (équivalent idempotent)
    $columns = [
        'website_url'   => "ALTER TABLE profiles ADD COLUMN website_url VARCHAR(500) NULL AFTER is_public_profile_enabled",
        'opening_hours'  => "ALTER TABLE profiles ADD COLUMN opening_hours JSON NULL AFTER website_url",
        'social_links'  => "ALTER TABLE profiles ADD COLUMN social_links JSON NULL AFTER opening_hours",
        'years_experience' => "ALTER TABLE profiles ADD COLUMN years_experience VARCHAR(20) NULL AFTER social_links",
        'nurse_qualifications' => "ALTER TABLE profiles ADD COLUMN nurse_qualifications JSON NULL AFTER years_experience",
    ];
    foreach ($columns as $col => $alter) {
        try {
            $pdo->exec($alter);
            echo "  [OK] Colonne {$col} ajoutée.\n";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate column') !== false) {
                echo "  [OK] Colonne {$col} déjà existante.\n";
            } else {
                echo "  [ERREUR] {$col} : " . $e->getMessage() . "\n";
            }
        }
    }
}

echo "\nTerminé.\n";
