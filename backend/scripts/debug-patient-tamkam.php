<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

echo "==> Recherche patient TAMKAM\n";

$config = require __DIR__ . '/../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$crypto = new Crypto();

$needle = strtoupper($argv[1] ?? 'TAMKAM');
$stmt = $db->query("SELECT id, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, role FROM profiles WHERE role = 'patient'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$matches = [];

foreach ($rows as $r) {
    $fn = '';
    $ln = '';
    try {
        if (!empty($r['first_name_encrypted'])) {
            $fn = $crypto->decryptField($r['first_name_encrypted'], $r['first_name_dek']);
        }
        if (!empty($r['last_name_encrypted'])) {
            $ln = $crypto->decryptField($r['last_name_encrypted'], $r['last_name_dek']);
        }
    } catch (Throwable $e) {
        continue;
    }
    $full = strtoupper(trim($fn . ' ' . $ln));
    if (str_contains($full, $needle) || str_contains(strtoupper($fn), $needle) || str_contains(strtoupper($ln), $needle)) {
        $matches[] = ['id' => $r['id'], 'name' => trim($fn . ' ' . $ln)];
    }
}

if ($matches === []) {
    echo "Aucun patient trouvé pour {$needle}\n";
    exit(0);
}

foreach ($matches as $m) {
    echo "Patient: {$m['name']} ({$m['id']})\n";
    $apt = $db->prepare("
        SELECT id, scheduled_at, status, created_at, created_by, created_by_role, type
        FROM appointments
        WHERE patient_id = ?
        ORDER BY created_at DESC
        LIMIT 30
    ");
    $apt->execute([$m['id']]);
    $apts = $apt->fetchAll(PDO::FETCH_ASSOC);
    echo '  RDV récents: ' . count($apts) . "\n";
    $groups = [];
    foreach ($apts as $a) {
        $key = ($a['scheduled_at'] ?? '') . '|' . ($a['type'] ?? '') . '|' . ($a['created_by'] ?? '');
        $groups[$key][] = $a;
    }
    foreach ($groups as $key => $list) {
        if (count($list) > 1) {
            echo "  DOUBLON potentiel (x" . count($list) . ") key={$key}\n";
            foreach ($list as $a) {
                echo "    - {$a['id']} {$a['scheduled_at']} {$a['status']} créé {$a['created_at']} par {$a['created_by_role']}\n";
            }
        }
    }
}
