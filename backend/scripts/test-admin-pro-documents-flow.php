#!/usr/bin/env php
<?php

/**
 * Test flux admin et pro santé : création RDV avec documents → persistance dans patient_documents
 *
 * Admin : crée RDV pour Charle Barth, uploade docs, vérifie GET patient-documents?user_id=...
 * Pro   : crée patient, crée RDV, uploade docs, vérifie GET patient-documents?user_id=...
 *
 * Usage: BASE_URL=https://app.oneandlab.fr/api php scripts/test-admin-pro-documents-flow.php
 */

$baseUrl = getenv('BASE_URL') ?: 'http://127.0.0.1:8888/api';
$baseUrl = rtrim($baseUrl, '/');

$backendDir = dirname(__DIR__);
$testFile = sys_get_temp_dir() . '/test-admin-pro-doc.png';
$cookieFile = sys_get_temp_dir() . '/test-admin-pro-cookies.txt';

$pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAFBQIAX8jx0gAAAABJRU5ErkJggg==');
file_put_contents($testFile, $pngContent);

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 5,
    ];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true) ?: [];
    if ($response && empty($decoded['token']) && ($idx = strpos($response, '"}}{')) !== false) {
        $tail = substr($response, $idx + 3);
        $second = json_decode($tail, true);
        if (is_array($second) && !empty($second['token'])) {
            $decoded = $second;
        }
    }
    return ['code' => $code, 'body' => $decoded];
}

function curlMultipart(string $url, array $headers, array $postFields, string $filePath, ?string $cookieFile = null): array
{
    $postFields['file'] = new CURLFile($filePath, 'image/png', 'test-doc.png');
    $ch = curl_init($url);
    $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $postFields, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 30];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($response ?: '{}', true) ?: []];
}

function runFlow(string $role, string $email, ?string $patientId, callable $getPatientId, string $baseUrl, string $backendDir, string $testFile, string $cookieFile): bool
{
    @unlink($cookieFile);
    echo "\n=== Test flux $role ($email) ===\n\n";

    $otpOutput = [];
    exec("cd $backendDir && php get-last-otp.php " . escapeshellarg($email) . " 2>&1", $otpOutput);
    $out = implode("\n", $otpOutput);
    if (!preg_match('/User ID:\s*(\S+)/', $out, $m) || !preg_match('/Code OTP:\s*(\d{6})/', $out, $m2)) {
        echo "❌ OTP impossible pour $email\n";
        return false;
    }
    $userId = trim($m[1]);
    $otp = $m2[1];
    $sessionId = preg_match('/Session ID:\s*(\S+)/', $out, $ms) ? trim($ms[1]) : '';

    ob_start();
    $csrf = curlJson($baseUrl . '/auth/csrf-token', [], null, 'GET', $cookieFile);
    $csrfCapture = ob_get_clean();
    $csrfToken = $csrf['body']['data']['csrf_token'] ?? null;
    if (!$csrfToken) {
        echo "❌ CSRF impossible\n";
        return false;
    }

    ob_start();
    $verify = curlJson($baseUrl . '/auth/verify-otp', [], json_encode(['user_id' => $userId, 'otp' => $otp, 'session_id' => $sessionId]), 'POST', $cookieFile);
    $verifyCapture = ob_get_clean();
    $token = $verify['body']['token'] ?? null;
    if (empty($token)) {
        foreach ([$verifyCapture ?? '', $csrfCapture ?? ''] as $src) {
            if (empty($src)) continue;
            $p = json_decode(trim($src), true);
            if (is_array($p) && !empty($p['token'])) { $token = trim($p['token']); break; }
            if (($idx = strpos($src, '"}}{')) !== false) {
                $s = json_decode(substr($src, $idx + 3), true);
                if (!empty($s['token'])) { $token = trim($s['token']); break; }
            }
        }
    }
    if (($verify['code'] ?? 0) !== 200 || empty($token)) {
        echo "❌ Verify OTP failed: " . json_encode($verify['body']) . "\n";
        return false;
    }
    $authHeader = 'Authorization: Bearer ' . $token;

    $targetPatientId = $patientId ?? $getPatientId($baseUrl, $authHeader, $csrfToken, $cookieFile);
    if (!$targetPatientId) {
        echo "❌ Impossible d'obtenir le patient_id\n";
        return false;
    }

    $catResp = curlJson($baseUrl . '/categories?type=blood_test', [$authHeader], null, 'GET', $cookieFile);
    $cats = $catResp['body']['data'] ?? [];
    $categoryId = isset($cats[0]['id']) ? $cats[0]['id'] : null;

    $address = ['label' => '10 rue de la Paix, Paris', 'lat' => 48.8698, 'lng' => 2.3318, 'postal_code' => '75002', 'city' => 'Paris', 'country' => 'France'];
    $payload = [
        'type' => 'blood_test',
        'form_type' => 'blood_test',
        'patient_id' => $targetPatientId,
        'category_id' => $categoryId,
        'address' => $address,
        'scheduled_at' => date('Y-m-d H:i:s', strtotime('+3 days 10:00')),
        'form_data' => ['first_name' => 'Test', 'last_name' => 'Patient', 'email' => 'test@test.fr', 'phone' => '0612345678', 'address' => $address, 'birth_date' => '1990-01-15', 'gender' => 'male', 'blood_test_type' => 'single', 'availability' => 'all_day'],
    ];

    $create = curlJson($baseUrl . '/appointments', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode($payload), 'POST', $cookieFile);
    if (($create['code'] ?? 0) !== 200 || empty($create['body']['data']['id'])) {
        echo "❌ Création RDV: " . json_encode($create['body']) . "\n";
        return false;
    }
    $aptId = $create['body']['data']['id'];
    echo "   ✅ RDV créé: $aptId\n";

    $uploaded = 0;
    foreach (['carte_vitale', 'carte_mutuelle'] as $dt) {
        $up = curlMultipart($baseUrl . '/medical-documents', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], ['appointment_id' => $aptId, 'document_type' => $dt], $testFile, $cookieFile);
        if (($up['code'] ?? 0) === 200 && !empty($up['body']['success'])) {
            $uploaded++;
        }
    }
    if ($uploaded === 0) {
        echo "❌ Aucun document uploadé\n";
        return false;
    }
    echo "   ✅ $uploaded document(s) uploadé(s)\n";

    $pdUrl = $baseUrl . '/patient-documents';
    if ($role === 'admin') {
        $pdUrl .= '?user_id=' . $targetPatientId;
    } else {
        $pdUrl .= '?user_id=' . $targetPatientId;
    }
    $pd = curlJson($pdUrl, [$authHeader], null, 'GET', $cookieFile);
    $docs = $pd['body']['data'] ?? [];
    $count = is_array($docs) ? count($docs) : 0;

    if ($count < $uploaded) {
        echo "❌ BUG: $count doc(s) dans le profil, attendu >= $uploaded\n";
        return false;
    }
    echo "   ✅ Documents persistés dans le profil patient: $count\n";

    // Vérifier aussi le détail du RDV (medical-documents)
    $medResp = curlJson($baseUrl . '/medical-documents?appointment_id=' . $aptId, [$authHeader], null, 'GET', $cookieFile);
    $medDocs = $medResp['body']['data'] ?? [];
    $medCount = is_array($medDocs) ? count($medDocs) : 0;
    if ($medCount < $uploaded) {
        echo "❌ BUG: $medCount doc(s) dans le détail RDV, attendu >= $uploaded\n";
        return false;
    }
    echo "   ✅ Documents visibles dans le détail RDV: $medCount\n";
    return true;
}

// S'assurer que Charle Barth existe (pour admin)
exec("cd $backendDir && php scripts/create-charle-bart.php 2>/dev/null");

// Patient Charle Barth pour admin
$charleOtpHack = [];
exec("cd $backendDir && php get-last-otp.php charle.barth@test.oneandlab.fr 2>&1", $charleOtpHack);
$charleOut = implode("\n", $charleOtpHack);
$charlePatientId = null;
if (preg_match('/User ID:\s*(\S+)/', $charleOut, $cm)) {
    $charlePatientId = trim($cm[1]);
}

$okAdmin = runFlow('admin', 'admin@oneandlab.fr', $charlePatientId, function () { return null; }, $baseUrl, $backendDir, $testFile, $cookieFile . '.admin');

$getProPatient = function (string $baseUrl, string $authHeader, string $csrfToken, string $cookieFile) {
    $createPatient = curlJson($baseUrl . '/patients', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode([
        'email' => 'marie.dupont.test.' . time() . '@test.oneandlab.fr',
        'first_name' => 'Marie',
        'last_name' => 'Dupont',
        'phone' => '0698765432',
    ]), 'POST', $cookieFile);
    if (($createPatient['code'] ?? 0) !== 200 || empty($createPatient['body']['data']['id'])) {
        return null;
    }
    return $createPatient['body']['data']['id'];
};

$okPro = runFlow('pro', 'pro@oneandlab.fr', null, $getProPatient, $baseUrl, $backendDir, $testFile, $cookieFile . '.pro');

@unlink($testFile);
@unlink($cookieFile . '.admin');
@unlink($cookieFile . '.pro');

echo "\n=== Résultat ===\n";
echo "Admin: " . ($okAdmin ? "✅ OK" : "❌ ÉCHEC") . "\n";
echo "Pro:   " . ($okPro ? "✅ OK" : "❌ ÉCHEC") . "\n";

exit(($okAdmin && $okPro) ? 0 : 1);
