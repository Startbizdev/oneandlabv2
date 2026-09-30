<?php

declare(strict_types=1);

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    ),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);
$column = $pdo->query("SHOW COLUMNS FROM patient_professional_access LIKE 'source'")->fetch(PDO::FETCH_ASSOC);
$type = (string) ($column['Type'] ?? '');
if (str_contains($type, "'lab_assignment'")) {
    echo "Migration 117 déjà appliquée.\n";
    exit(0);
}
foreach (['created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'qr_origin'] as $expected) {
    if (!str_contains($type, "'{$expected}'")) {
        fwrite(STDERR, "ENUM source inattendu ({$type}) : migration 117 annulée pour ne perdre aucune valeur.\n");
        exit(1);
    }
}
if (preg_match_all("/'([^']+)'/", $type, $m) && count($m[1]) !== 5) {
    fwrite(STDERR, "ENUM source contient des valeurs non prévues ({$type}) : migration 117 annulée.\n");
    exit(1);
}
$file = dirname(__DIR__, 2) . '/database/migrations/117_ppa_lab_assignment.sql';
$sql = is_readable($file) ? file_get_contents($file) : false;
if ($sql === false) {
    fwrite(STDERR, "Migration 117 introuvable ou illisible.\n");
    exit(1);
}
$pdo->exec($sql);
echo "Migration 117 (origine lab_assignment) terminée.\n";
