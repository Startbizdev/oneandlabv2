#!/usr/bin/env php
<?php
/** Accepte une demande d'inscription par id. Usage: php scripts/accept-registration-cli.php <request_id> */
$requestId = $argv[1] ?? '';
if ($requestId === '') {
    fwrite(STDERR, "Usage: php scripts/accept-registration-cli.php <request_id>\n");
    exit(1);
}
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/RegistrationRequest.php';
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$admin = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$admin) {
    fwrite(STDERR, "Aucun super_admin\n");
    exit(1);
}
$actorId = (string) $admin['id'];
$model = new RegistrationRequest();
try {
    $result = $model->accept($requestId, $actorId);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'FAIL: ' . $e->getMessage() . "\n");
    exit(1);
}
