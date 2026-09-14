<?php

/**
 * Audit fichiers care_photo / conversation_attachment manquants sur disque.
 * Usage: php audit-care-photo-files.php
 */

require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

$backendDir = realpath(dirname(__DIR__)) ?: dirname(__DIR__);
$missing = 0;
$total = 0;

$stmt = $pdo->query("
    SELECT id, file_path, mime_type, document_type, appointment_id
    FROM medical_documents
    WHERE document_type IN ('care_photo', 'conversation_attachment')
      AND mime_type NOT IN ('application/vnd.cary.exchange-thread')
    ORDER BY created_at DESC
    LIMIT 500
");

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $total++;
    $rel = ltrim((string) ($row['file_path'] ?? ''), '/');
    $abs = $backendDir . '/' . str_replace('/uploads/medical/', 'uploads/medical/', $rel);
    if (!is_file($abs)) {
        $missing++;
        echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    }
}

echo "Audit terminé: {$missing} manquants / {$total} vérifiés.\n";
