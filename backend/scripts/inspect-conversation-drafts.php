<?php

declare(strict_types=1);

require __DIR__ . '/../config/database.php';

$convId = $argv[1] ?? 'dc3a778b-d3f5-4690-85d0-4d2ab93ba869';
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);

$stmt = $pdo->prepare('SELECT id, status, missing_fields_json, payload_json, created_at, updated_at FROM ai_appointment_drafts WHERE conversation_id = ? ORDER BY updated_at DESC');
$stmt->execute([$convId]);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo "DRAFT {$r['id']} status={$r['status']} updated={$r['updated_at']}\n";
    echo "missing={$r['missing_fields_json']}\n";
    echo "payload={$r['payload_json']}\n\n";
}
