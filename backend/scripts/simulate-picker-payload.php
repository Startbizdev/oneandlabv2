<?php
/**
 * Simule la taille JSON des listes users (scope full vs picker).
 * Usage : cd backend && php scripts/simulate-picker-payload.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../models/User.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$stmt = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at ASC LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row || empty($row['id'])) {
    echo "SKIP: aucun super_admin en base\n";
    exit(0);
}
$adminId = (string) $row['id'];

$userModel = new User();
$full = $userModel->getAll(
    ['role' => 'nurse', 'status' => 'active', 'scope' => 'full'],
    1,
    100,
    $adminId,
    'super_admin'
);
$picker = $userModel->getAll(
    ['role' => 'nurse', 'status' => 'active', 'scope' => 'picker'],
    1,
    100,
    $adminId,
    'super_admin'
);

$fullJson = json_encode($full['data'] ?? [], JSON_UNESCAPED_UNICODE);
$pickerJson = json_encode($picker['data'] ?? [], JSON_UNESCAPED_UNICODE);
$fullLen = is_string($fullJson) ? strlen($fullJson) : 0;
$pickerLen = is_string($pickerJson) ? strlen($pickerJson) : 0;

echo "Nurses page 1/100 — full: {$fullLen} bytes, picker: {$pickerLen} bytes\n";
if ($fullLen > 0) {
    $ratio = round(100 * (1 - $pickerLen / $fullLen), 1);
    echo "Réduction picker: ~{$ratio}%\n";
}
if ($pickerLen > 500_000) {
    echo "WARN: picker encore > 500 Ko — vérifier les champs renvoyés.\n";
    exit(1);
}
echo "OK simulate-picker-payload\n";
