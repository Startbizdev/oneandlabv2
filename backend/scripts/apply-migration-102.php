<?php
/**
 * Applique migration 102 (Labio + Labo Sud en tête) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-102.php
 */
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

function tableExists(PDO $db, string $table): bool
{
    $check = $db->query('SHOW TABLES LIKE ' . $db->quote($table));
    return $check && $check->rowCount() > 0;
}

function ensureLabBrandLogos(): void
{
    $dir = realpath(__DIR__ . '/../uploads/lab-brands');
    if ($dir === false) {
        $dir = __DIR__ . '/../uploads/lab-brands';
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            fwrite(STDERR, "WARN: impossible de créer $dir\n");
            return;
        }
    }

    $targets = [
        'labio.png' => [
            'https://www.labio.fr/templates/captain/img/interface/logo.png',
        ],
        'labo-sud.png' => [
            'https://labosud.mesresultats.fr/images/logo.png',
            'https://www.google.com/s2/favicons?domain=labosud.fr&sz=128',
        ],
    ];

    foreach ($targets as $filename => $urls) {
        $path = $dir . DIRECTORY_SEPARATOR . $filename;
        if (is_file($path) && filesize($path) > 500) {
            echo "SKIP logo: $filename déjà présent.\n";
            continue;
        }
        $saved = false;
        foreach ($urls as $url) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 20, 'follow_location' => 1],
                'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
            ]);
            $data = @file_get_contents($url, false, $ctx);
            if ($data !== false && strlen($data) > 200) {
                $tmp = $path . '.tmp';
                if (@file_put_contents($tmp, $data) === false) {
                    continue;
                }
                if (!@rename($tmp, $path)) {
                    @unlink($tmp);
                    continue;
                }
                @chmod($path, 0664);
                echo "OK logo: $filename <- $url\n";
                $saved = true;
                break;
            }
        }
        if (!$saved) {
            fwrite(STDERR, "WARN: logo $filename non téléchargé.\n");
        }
    }
}

if (!tableExists($db, 'lab_brands')) {
    fwrite(STDERR, "lab_brands absente — exécuter d'abord apply-migration-101.php\n");
    exit(1);
}

ensureLabBrandLogos();

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/102_lab_brands_labio_labo_sud.sql';
if (!is_file($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

$sql = file_get_contents($sqlFile);
try {
    $db->exec($sql);
} catch (PDOException $e) {
    fwrite(STDERR, 'ERR migration 102: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

$count = (int) $db->query("SELECT COUNT(*) FROM lab_brands WHERE slug IN ('labio', 'labo-sud')")->fetchColumn();
echo "OK: migration 102 ($count marques Labio/Labo Sud).\n";

$rows = $db->query("SELECT name, slug, sort_order FROM lab_brands WHERE is_active = 1 ORDER BY sort_order ASC, name ASC LIMIT 5")
    ->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    echo '  - #' . $row['sort_order'] . ' ' . $row['name'] . ' (' . $row['slug'] . ')' . PHP_EOL;
}

echo "Migration 102 terminée.\n";
