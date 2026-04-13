#!/usr/bin/env php
<?php

/**
 * Test : création d'un proche ne doit PAS écraser le profil patient
 *
 * Vérifie que birth_date, first_name, last_name, etc. du patient (profiles)
 * restent inchangés après création/mise à jour d'un proche (patient_relatives).
 *
 * Usage :
 *   cd backend
 *   php scripts/create-charle-bart.php
 *   php scripts/test-relative-no-profile-overwrite.php [email]
 *
 * Variables : BASE_URL (défaut http://127.0.0.1:8888/api)
 */

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = getenv('BASE_URL') ?: 'http://127.0.0.1:8888/api';
$baseUrl = rtrim($baseUrl, '/');

$backendDir = dirname(__DIR__);
$cookieFile = sys_get_temp_dir() . '/test-relative-no-overwrite-cookies.txt';

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null): array
{
    $ch = curl_init($url);
    $allHeaders = array_merge(['Content-Type: application/json'], $headers);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $allHeaders,
        CURLOPT_TIMEOUT => 30,
    ];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);
    // Si réponse contient plusieurs JSON concaténés (ex: csrf+verify), prendre le 2e objet
    if ($response && empty($decoded['token'])) {
        $sep = '"}}{'; // fin 1er JSON: "...}}  début 2e: {"
        $idx = strpos($response, $sep);
        if ($idx !== false) {
            $tail = substr($response, $idx + 3);
            $second = json_decode($tail, true);
            if (is_array($second) && !empty($second['token'])) {
                $decoded = $second;
            }
        }
    }
    return ['code' => $httpCode, 'body' => is_array($decoded) ? $decoded : []];
}

echo "=== Test : proche ne doit pas écraser profil patient ===\n\n";
echo "Email: $email\n";
echo "API: $baseUrl\n\n";

// 1. OTP
echo "1. OTP...\n";
$otpOutput = [];
exec("cd $backendDir && php get-last-otp.php " . escapeshellarg($email) . " 2>&1", $otpOutput);
$otpOutput = implode("\n", $otpOutput);
$sessionId = preg_match('/Session ID:\s*(\S+)/', $otpOutput, $m) ? trim($m[1]) : null;
$userId = preg_match('/User ID:\s*(\S+)/', $otpOutput, $m) ? trim($m[1]) : null;
$otp = preg_match('/Code OTP:\s*(\d{6})/', $otpOutput, $m) ? $m[1] : null;
if (!$userId || !$otp) {
    echo "❌ OTP introuvable. Lancez: php scripts/create-charle-bart.php\n";
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ user_id: $userId\n\n";

// 2. CSRF + verify OTP
echo "2. Auth...\n";
ob_start();
$csrfPre = curlJson($baseUrl . '/auth/csrf-token', [], null, 'GET', $cookieFile);
$csrfCapture = ob_get_clean();
$csrfToken = $csrfPre['body']['data']['csrf_token'] ?? null;
ob_start();
$verify = curlJson($baseUrl . '/auth/verify-otp', [], json_encode([
    'user_id' => $userId,
    'otp' => $otp,
    'session_id' => $sessionId ?? '',
]), 'POST', $cookieFile);
$verifyCapture = ob_get_clean();
$token = $verify['body']['token'] ?? $verify['body']['data']['token'] ?? null;
if (empty($token)) {
    foreach ([$verifyCapture ?? '', $csrfCapture ?? ''] as $src) {
        if (empty($src)) continue;
        $parsed = json_decode(trim($src), true);
        if (is_array($parsed) && !empty($parsed['token'])) {
            $token = trim($parsed['token']);
            break;
        }
        if (($idx = strpos($src, '"}}{')) !== false) {
            $tail = substr($src, $idx + 3);
            $second = json_decode($tail, true);
            if (!empty($second['token'])) {
                $token = trim($second['token']);
                break;
            }
        }
    }
}
if (($verify['code'] ?? 0) !== 200 || empty($token)) {
    echo "❌ Verify OTP failed (code=" . ($verify['code'] ?? '?') . ")\n";
    @unlink($cookieFile);
    exit(1);
}
$authHeader = 'Authorization: Bearer ' . $token;
echo "   ✅ Authentifié\n\n";

// 3. Récupérer le profil patient AVANT (birth_date, first_name, last_name)
echo "3. Profil patient AVANT création proche...\n";
$meBefore = curlJson($baseUrl . '/auth/me', [$authHeader], null, 'GET', $cookieFile);
$profileBefore = $meBefore['body']['data'] ?? [];
$birthDateBefore = $profileBefore['birth_date'] ?? null;
$firstNameBefore = $profileBefore['first_name'] ?? null;
$lastNameBefore = $profileBefore['last_name'] ?? null;
echo "   birth_date: " . ($birthDateBefore ?? 'null') . "\n";
echo "   first_name: $firstNameBefore, last_name: $lastNameBefore\n\n";

// 4. Créer un proche avec une date de naissance DIFFÉRENTE
echo "4. Création proche (birth_date=2015-06-20, différent du patient)...\n";
$relativePayload = [
    'first_name' => 'Marie',
    'last_name' => 'Barth',
    'relationship_type' => 'child',
    'email' => $email,
    'phone' => '0612345679',
    'birth_date' => '2015-06-20',
    'gender' => 'female',
];
$createRel = curlJson($baseUrl . '/patient-relatives', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode($relativePayload), 'POST', $cookieFile);
if (($createRel['code'] ?? 0) !== 200 || empty($createRel['body']['data']['id'])) {
    echo "❌ Création proche: " . json_encode($createRel['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($cookieFile);
    exit(1);
}
$relativeId = $createRel['body']['data']['id'];
echo "   ✅ Proche créé: $relativeId\n\n";

// 5. Vérifier le profil patient APRÈS (ne doit PAS avoir changé)
echo "5. Profil patient APRÈS création proche...\n";
$meAfter = curlJson($baseUrl . '/auth/me', [$authHeader], null, 'GET', $cookieFile);
$profileAfter = $meAfter['body']['data'] ?? [];
$birthDateAfter = $profileAfter['birth_date'] ?? null;
$firstNameAfter = $profileAfter['first_name'] ?? null;
$lastNameAfter = $profileAfter['last_name'] ?? null;
echo "   birth_date: " . ($birthDateAfter ?? 'null') . "\n";
echo "   first_name: $firstNameAfter, last_name: $lastNameAfter\n\n";

// 6. Vérification
$ok = true;
if ($birthDateBefore !== $birthDateAfter) {
    echo "❌ BUG: birth_date patient a changé! avant=$birthDateBefore après=$birthDateAfter\n";
    $ok = false;
}
if ($firstNameBefore !== $firstNameAfter) {
    echo "❌ BUG: first_name patient a changé! avant=$firstNameBefore après=$firstNameAfter\n";
    $ok = false;
}
if ($lastNameBefore !== $lastNameAfter) {
    echo "❌ BUG: last_name patient a changé! avant=$lastNameBefore après=$lastNameAfter\n";
    $ok = false;
}

// 7. Mise à jour du proche (birth_date encore différente)
echo "7. Mise à jour proche (birth_date=2015-06-21)...\n";
$updatePayload = ['birth_date' => '2015-06-21'];
$updateRel = curlJson($baseUrl . '/patient-relatives/' . $relativeId, [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode($updatePayload), 'PUT', $cookieFile);
if (($updateRel['code'] ?? 0) !== 200) {
    echo "   ⚠ Update échoué\n";
} else {
    echo "   ✅ Proche mis à jour\n";
}

// 8. Re-vérifier profil patient
echo "\n8. Profil patient APRÈS mise à jour proche...\n";
$meFinal = curlJson($baseUrl . '/auth/me', [$authHeader], null, 'GET', $cookieFile);
$profileFinal = $meFinal['body']['data'] ?? [];
$birthDateFinal = $profileFinal['birth_date'] ?? null;
if ($birthDateBefore !== $birthDateFinal) {
    echo "❌ BUG: birth_date patient a changé après update proche! avant=$birthDateBefore après=$birthDateFinal\n";
    $ok = false;
} else {
    echo "   ✅ birth_date patient inchangé: $birthDateFinal\n";
}

@unlink($cookieFile);

if ($ok) {
    echo "\n=== ✅ Test réussi : profil patient non écrasé ===\n";
    exit(0);
} else {
    echo "\n=== ❌ Test échoué ===\n";
    exit(1);
}
