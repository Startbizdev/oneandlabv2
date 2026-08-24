<?php
require_once __DIR__ . '/../config/database.php';
$config = require __DIR__ . '/../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;dbname=%s', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);
$stmt = $db->query("SELECT id, action, details, created_at FROM access_logs WHERE action='resend_notification' ORDER BY created_at DESC LIMIT 5");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
}
