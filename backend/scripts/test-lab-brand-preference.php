<?php
/**
 * Vérifie migration 101 + modèle LabBrand + skip dispatch brand_choice.
 * Usage: cd backend && php scripts/test-lab-brand-preference.php
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/LabBrand.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

function ok(string $msg): void { echo "OK: $msg\n"; }
function fail(string $msg): void { echo "FAIL: $msg\n"; exit(1); }

$tables = $db->query("SHOW TABLES LIKE 'lab_brands'")->fetchColumn();
if (!$tables) {
    fail('Table lab_brands absente — exécutez php scripts/apply-migration-101.php');
}
ok('table lab_brands');

$cols = $db->query("SHOW COLUMNS FROM appointments LIKE 'lab_preference_mode'")->fetch();
if (!$cols) {
    fail('Colonne lab_preference_mode absente');
}
ok('colonne lab_preference_mode');

$brandCount = (int) $db->query('SELECT COUNT(*) FROM lab_brands WHERE is_active = 1')->fetchColumn();
if ($brandCount < 1) {
    fail('Aucune marque active en base');
}
ok("$brandCount marque(s) active(s)");

$model = new LabBrand($db);
$public = $model->listPublic();
if (count($public) !== $brandCount) {
    fail('listPublic() incohérent avec COUNT active');
}
ok('API modèle listPublic()');

$enum = $db->query("SHOW COLUMNS FROM appointments LIKE 'dispatch_mode'")->fetch(PDO::FETCH_ASSOC);
if ($enum && strpos((string) $enum['Type'], 'patient_brand_choice') === false) {
    fail('ENUM dispatch_mode sans patient_brand_choice');
}
ok('dispatch_mode patient_brand_choice');

$sampleBrand = $public[0]['id'] ?? null;
if (!$sampleBrand) {
    fail('Pas de marque pour test');
}

$stmt = $db->prepare('SELECT COUNT(*) FROM appointments WHERE lab_preference_mode = ? AND preferred_lab_brand_id = ?');
$stmt->execute(['brand_choice', $sampleBrand]);
$existing = (int) $stmt->fetchColumn();
ok("RDV brand_choice existants: $existing");

echo "\nMigration et modèle lab brands OK.\n";
