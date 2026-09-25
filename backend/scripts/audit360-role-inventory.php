<?php

declare(strict_types=1);

/** Inventaire rôles prod — lecture seule. php scripts/audit360-role-inventory.php */
require_once __DIR__ . '/../config/database.php';

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

$roles = ['patient', 'pro', 'nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'];
$out = ['by_role' => [], 'audit360_email_pattern' => []];

$stmt = $pdo->query('SELECT role, COUNT(*) AS n FROM profiles GROUP BY role ORDER BY role');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $out['by_role'][(string) $row['role']] = (int) $row['n'];
}

$placeholders = implode(',', array_fill(0, count($roles), '?'));
$countStmt = $pdo->prepare("SELECT role, COUNT(*) AS n FROM profiles WHERE role IN ($placeholders) GROUP BY role");
$countStmt->execute($roles);
while ($row = $countStmt->fetch(PDO::FETCH_ASSOC)) {
    $out['target_roles'][(string) $row['role']] = (int) $row['n'];
}

$auditStmt = $pdo->query("SELECT id, role, created_at FROM profiles WHERE role IN ('patient','pro','nurse','lab','subaccount','preleveur','super_admin') ORDER BY created_at DESC LIMIT 8");
$out['recent_sample'] = $auditStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
