<?php

declare(strict_types=1);

/**
 * Curl GET /api/appointments avec JWT (diagnostic prod).
 * Usage : php backend/scripts/test-appointments-http.php [role] [query_string]
 */
$roleFilter = $argv[1] ?? 'patient';
$query = $argv[2] ?? 'limit=20';

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Auth.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $db->prepare('SELECT id, role FROM profiles WHERE role = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute([$roleFilter]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    fwrite(STDERR, "No profile role={$roleFilter}\n");
    exit(1);
}

$auth = new Auth();
$token = $auth->generateJWT((string) $row['id'], (string) $row['role']);

$url = 'https://cary.bio/api/appointments?' . $query;
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ],
    CURLOPT_TIMEOUT => 120,
]);
$body = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

echo "role={$row['role']} user={$row['id']}\n";
echo "GET {$url}\n";
echo "HTTP {$code}\n";
if ($err) {
    echo "curl error: {$err}\n";
}
if ($body === false || $body === '') {
    echo "empty body\n";
    exit($code >= 400 ? 1 : 0);
}
$len = strlen($body);
echo "body_bytes={$len}\n";
$preview = substr($body, 0, 500);
echo $preview . ($len > 500 ? '...' : '') . "\n";
if ($code >= 400) {
    exit(1);
}
