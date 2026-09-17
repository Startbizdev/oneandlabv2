<?php

declare(strict_types=1);

/**
 * Audit uploads prod : permissions, chiffrement, endpoints HTTP.
 * Usage: php scripts/audit-uploads-prod.php [base_url]
 */

$baseUrl = rtrim(getenv('BASE_URL') ?: ($argv[1] ?? 'https://cary.bio/api'), '/');
$rootEnv = dirname(__DIR__, 2) . '/.env';
if (is_readable($rootEnv)) {
    foreach (file($rootEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $key = trim($k);
        $val = trim($v);
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

$backendDir = dirname(__DIR__);
$uploadLink = $backendDir . '/uploads';
$medicalDir = $backendDir . '/uploads/medical';

echo "=== AUDIT UPLOADS ===\n";
echo "Base URL: $baseUrl\n\n";

$ok = true;

if (!is_link($uploadLink) && !is_dir($uploadLink)) {
    echo "FAIL: backend/uploads missing\n";
    $ok = false;
} else {
    $resolved = realpath($uploadLink) ?: $uploadLink;
    echo "OK: uploads -> $resolved\n";
}

if (!is_dir($medicalDir)) {
    echo "FAIL: medical dir missing\n";
    $ok = false;
} elseif (!is_writable($medicalDir)) {
    echo "FAIL: medical dir not writable by " . (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : get_current_user()) . "\n";
    $ok = false;
} else {
    echo "OK: medical writable\n";
}

try {
    require_once $backendDir . '/lib/Crypto.php';
    new Crypto();
    echo "OK: Crypto / KEK\n";
} catch (Throwable $e) {
    echo "FAIL: Crypto — " . $e->getMessage() . "\n";
    $ok = false;
}

$config = require $backendDir . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$col = $db->query("SHOW COLUMNS FROM care_categories LIKE 'image_url'")->fetch();
echo ($col ? "OK" : "FAIL") . ": care_categories.image_url\n";
if (!$col) {
    $ok = false;
}

$roles = [
    'admin' => 'admin@oneandlab.fr',
    'pro' => 'pro@oneandlab.fr',
    'nurse' => 'nurse@oneandlab.fr',
];

$testFile = sys_get_temp_dir() . '/audit-upload.png';
file_put_contents($testFile, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='));

function httpJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookie = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 45,
    ];
    if ($cookie) {
        $opts[CURLOPT_COOKIEJAR] = $opts[CURLOPT_COOKIEFILE] = $cookie;
    }
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($resp ?: '{}', true) ?: []];
}

function otpLogin(string $email, string $baseUrl, string $backendDir, string $cookie): ?array
{
    exec('cd ' . escapeshellarg($backendDir) . ' && php get-last-otp.php ' . escapeshellarg($email) . ' 2>&1', $out);
    $text = implode("\n", $out);
    if (!preg_match('/User ID:\s*(\S+)/', $text, $m) || !preg_match('/Code OTP:\s*(\d{6})/', $text, $m2)) {
        return null;
    }
    $csrf = httpJson($baseUrl . '/auth/csrf-token', [], null, 'GET', $cookie);
    $token = $csrf['body']['data']['csrf_token'] ?? null;
    if (!$token) {
        return null;
    }
    $sessionId = preg_match('/Session ID:\s*(\S+)/', $text, $ms) ? trim($ms[1]) : '';
    $verify = httpJson(
        $baseUrl . '/auth/verify-otp',
        ['Content-Type: application/json'],
        json_encode(['user_id' => trim($m[1]), 'otp' => $m2[1], 'session_id' => $sessionId]),
        'POST',
        $cookie
    );
    $jwt = $verify['body']['token'] ?? null;
    if (!$jwt) {
        return null;
    }
    return ['token' => $jwt, 'csrf' => $token, 'user_id' => trim($m[1])];
}

foreach ($roles as $label => $email) {
    $cookie = sys_get_temp_dir() . '/audit-upload-' . $label . '.txt';
    @unlink($cookie);
    $auth = otpLogin($email, $baseUrl, $backendDir, $cookie);
    if (!$auth) {
        echo "SKIP: $label OTP login failed\n";
        continue;
    }
    $h = ['Authorization: Bearer ' . $auth['token'], 'X-CSRF-Token: ' . $auth['csrf']];
    $aptResp = httpJson($baseUrl . '/appointments?limit=1', $h, null, 'GET', $cookie);
    $aptId = $aptResp['body']['data'][0]['id'] ?? null;
    if (!$aptId) {
        echo "SKIP: $label no appointment\n";
        continue;
    }
    $post = [
        'appointment_id' => $aptId,
        'document_type' => 'other',
        'file' => new CURLFile($testFile, 'image/png', 'audit.png'),
    ];
    $ch = curl_init($baseUrl . '/medical-documents');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_COOKIEJAR => $cookie,
        CURLOPT_COOKIEFILE => $cookie,
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode($resp ?: '{}', true) ?: [];
    if ($code === 200 && !empty($body['success'])) {
        echo "OK: $label medical-documents upload (RDV $aptId)\n";
    } else {
        echo "FAIL: $label upload HTTP $code — " . ($body['error'] ?? $resp) . "\n";
        $ok = false;
    }
}

if ($label === 'admin' && isset($auth)) {
    $h = ['Authorization: Bearer ' . $auth['token'], 'X-CSRF-Token: ' . $auth['csrf']];
    $cats = httpJson($baseUrl . '/categories?type=nursing', $h, null, 'GET', $cookie);
    $catId = $cats['body']['data'][0]['id'] ?? null;
    if ($catId) {
        $post = ['category_id' => $catId, 'file' => new CURLFile($testFile, 'image/png', 'cat.png')];
        $ch = curl_init($baseUrl . '/categories/upload-image');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $post,
            CURLOPT_HTTPHEADER => $h,
            CURLOPT_COOKIEJAR => $cookie,
            CURLOPT_COOKIEFILE => $cookie,
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $body = json_decode($resp ?: '{}', true) ?: [];
        echo ($code === 200 && !empty($body['success']) ? 'OK' : 'FAIL') . ": admin category image — HTTP $code " . ($body['error'] ?? '') . "\n";
        if ($code !== 200) {
            $ok = false;
        }
    }
}

@unlink($testFile);
echo "\n=== " . ($ok ? 'AUDIT PASSED' : 'AUDIT FAILED') . " ===\n";
exit($ok ? 0 : 1);
