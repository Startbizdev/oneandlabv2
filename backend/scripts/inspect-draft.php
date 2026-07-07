<?php
declare(strict_types=1);
$config = require __DIR__ . '/../config/database.php';
$id = $argv[1] ?? '';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);
$stmt = $pdo->prepare('SELECT status, missing_fields_json, payload_json FROM ai_appointment_drafts WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) { echo "not found\n"; exit(1); }
echo "status={$row['status']}\n";
echo "missing={$row['missing_fields_json']}\n";
$p = json_decode((string) $row['payload_json'], true);
echo json_encode($p, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
