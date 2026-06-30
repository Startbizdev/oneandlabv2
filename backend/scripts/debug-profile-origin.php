#!/usr/bin/env php
<?php
/** Usage: php scripts/debug-profile-origin.php <profile_id> */
$id = $argv[1] ?? '';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$stmt = $db->prepare('SELECT * FROM profiles WHERE id = ?');
$stmt->execute([$id]);
$p = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$p) {
    echo "Profil introuvable\n";
    exit(1);
}
$email = $crypto->decryptField($p['email_encrypted'], $p['email_dek']);
$fn = $crypto->decryptField($p['first_name_encrypted'], $p['first_name_dek']);
$ln = $crypto->decryptField($p['last_name_encrypted'], $p['last_name_dek']);
echo "Profil: {$fn} {$ln} | {$email} | role={$p['role']} | created={$p['created_at']}\n\n";

$map = $db->prepare('SELECT legacy_collection, legacy_object_id FROM legacy_id_mapping WHERE target_uuid = ?');
$map->execute([$id]);
$legacy = $map->fetchAll(PDO::FETCH_ASSOC);
echo "Legacy mapping: " . (count($legacy) ? json_encode($legacy) : 'aucun (pas migration legacy)') . "\n\n";

$hash = $p['email_hash'];
$reqs = $db->prepare('SELECT id, status, role, created_at FROM registration_requests WHERE email_hash = ? ORDER BY created_at');
$reqs->execute([$hash]);
$allReqs = $reqs->fetchAll(PDO::FETCH_ASSOC);
echo "Demandes inscription avec même email:\n";
foreach ($allReqs as $r) {
    echo "  - {$r['id']} | {$r['status']} | {$r['role']} | {$r['created_at']}\n";
}
