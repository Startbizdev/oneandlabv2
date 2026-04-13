<?php
/**
 * Vide medical_documents pour permettre une re-migration des documents.
 * Usage: php reinit-documents.php
 */
require_once __DIR__ . '/../../config/database.php';
$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'], $config['port'], $config['database']);
$pdo = new PDO($dsn, $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$n = $pdo->exec('DELETE FROM medical_documents');
echo "Supprimé $n entrées de medical_documents\n";
