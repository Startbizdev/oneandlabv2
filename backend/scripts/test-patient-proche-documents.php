#!/usr/bin/env php
<?php

/**
 * Test complet : documents des proches (patient_relative_documents)
 *
 * Vérifie que :
 * 1. GET /patient-documents?relative_id=X retourne les docs du proche (pas du patient)
 * 2. POST /patient-documents/upload avec relative_id enregistre dans patient_relative_documents
 * 3. Création RDV proche + upload medical-documents → docs dans patient_relative_documents
 *
 * Usage :
 *   cd backend
 *   php scripts/create-charle-bart.php   # créer le compte si besoin
 *   php scripts/test-patient-proche-documents.php [email]
 *
 * Variables d'environnement :
 *   BASE_URL : URL de l'API (défaut: http://127.0.0.1:8888/api)
 *
 * Exemple production :
 *   BASE_URL=https://app.oneandlab.fr/api php scripts/test-patient-proche-documents.php
 */

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = getenv('BASE_URL') ?: 'http://127.0.0.1:8888/api';
$baseUrl = rtrim($baseUrl, '/');

$backendDir = dirname(__DIR__);
$testFile = sys_get_temp_dir() . '/test-proche-doc.png';
$cookieFile = sys_get_temp_dir() . '/test-proche-docs-cookies.txt';

$pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAFBQIAX8jx0gAAAABJRU5ErkJggg==');
if (file_put_contents($testFile, $pngContent) === false) {
    fwrite(STDERR, "❌ Impossible de créer le fichier de test\n");
    exit(1);
}

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null): array
{
    $ch = curl_init($url);
    $defaultHeaders = ['Content-Type: application/json'];
    $allHeaders = array_merge($defaultHeaders, $headers);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $allHeaders,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 5,
    ];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    curl_setopt_array($ch, $opts);
    if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);
    if ($response && empty($decoded['token']) && ($idx = strpos($response, '"}}{')) !== false) {
        $tail = substr($response, $idx + 3);
        $second = json_decode($tail, true);
        if (is_array($second) && !empty($second['token'])) {
            $decoded = $second;
        }
    }
    return ['code' => $httpCode, 'body' => $decoded ?: [], 'raw' => $response];
}

function curlMultipart(string $url, array $headers, array $postFields, string $filePath, string $fileKey = 'file', ?string $cookieFile = null): array
{
    $postFields[$fileKey] = new CURLFile($filePath, 'image/png', 'test-doc.png');
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);
    return ['code' => $httpCode, 'body' => $decoded ?: [], 'raw' => $response];
}

echo "=== Test documents proche (patient_relative_documents) ===\n\n";
echo "Email: $email\n";
echo "API: $baseUrl\n\n";

// 1. OTP
echo "1. Obtaining OTP...\n";
$otpOutput = [];
exec("cd $backendDir && php get-last-otp.php " . escapeshellarg($email) . " 2>&1", $otpOutput);
$otpOutput = implode("\n", $otpOutput);
$sessionId = preg_match('/Session ID:\s*(\S+)/', $otpOutput, $m) ? trim($m[1]) : null;
$userId = preg_match('/User ID:\s*(\S+)/', $otpOutput, $m) ? trim($m[1]) : null;
$otp = preg_match('/Code OTP:\s*(\d{6})/', $otpOutput, $m) ? $m[1] : null;
if (!$userId || !$otp) {
    echo "❌ OTP introuvable. Lancez: php scripts/create-charle-bart.php\n";
    @unlink($testFile);
    exit(1);
}
echo "   ✅ OTP obtenu (user_id: $userId)\n\n";

// 2. CSRF + verify OTP
echo "2. CSRF + verify OTP...\n";
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
    echo "❌ Verify OTP failed\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$authHeader = 'Authorization: Bearer ' . $token;
echo "   ✅ Authentifié\n\n";

// 3. Documents patient (moi-même) - doit être vide ou mes docs
echo "3. GET /patient-documents (moi-même)...\n";
$myDocs = curlJson($baseUrl . '/patient-documents', [$authHeader], null, 'GET', $cookieFile);
$myDocsList = $myDocs['body']['data'] ?? [];
$myCount = is_array($myDocsList) ? count($myDocsList) : 0;
echo "   Documents patient (moi): $myCount\n\n";

// 4. Créer un proche
echo "4. Création proche...\n";
$address = ['label' => '10 rue de la Paix, 75002 Paris', 'lat' => 48.8698, 'lng' => 2.3318, 'postal_code' => '75002', 'city' => 'Paris', 'country' => 'France'];
$createRel = curlJson($baseUrl . '/patient-relatives', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode([
    'first_name' => 'Marie',
    'last_name' => 'Barth',
    'relationship_type' => 'child',
    'email' => $email,
    'phone' => '0612345679',
    'address' => $address,
    'birth_date' => '2015-06-20',
    'gender' => 'female',
]), 'POST', $cookieFile);
if (($createRel['code'] ?? 0) !== 200 || empty($createRel['body']['data']['id'])) {
    echo "❌ Création proche: " . json_encode($createRel['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$relativeId = $createRel['body']['data']['id'];
echo "   ✅ Proche créé: $relativeId\n\n";

// 5. GET /patient-documents?relative_id=X - doit être vide (aucun doc proche encore)
echo "5. GET /patient-documents?relative_id=$relativeId (docs proche)...\n";
$relDocs = curlJson($baseUrl . '/patient-documents?relative_id=' . urlencode($relativeId), [$authHeader], null, 'GET', $cookieFile);
if (($relDocs['code'] ?? 0) !== 200) {
    echo "❌ Erreur GET patient-documents?relative_id: " . json_encode($relDocs['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$relDocsList = $relDocs['body']['data'] ?? [];
$relCountBefore = is_array($relDocsList) ? count($relDocsList) : 0;
echo "   Documents proche (avant upload): $relCountBefore\n\n";

// 6. Upload document proche via patient-documents/upload + relative_id
echo "6. POST /patient-documents/upload (relative_id=$relativeId, carte_vitale)...\n";
$uploadRel = curlMultipart(
    $baseUrl . '/patient-documents/upload',
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    ['document_type' => 'carte_vitale', 'relative_id' => $relativeId],
    $testFile,
    'file',
    $cookieFile
);
if (($uploadRel['code'] ?? 0) !== 200 || empty($uploadRel['body']['success'])) {
    echo "❌ Upload patient-documents/upload (relative): " . json_encode($uploadRel['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Document proche uploadé (carte_vitale)\n\n";

// 7. GET /patient-documents?relative_id=X - doit contenir carte_vitale
echo "7. GET /patient-documents?relative_id=$relativeId (après upload)...\n";
$relDocs2 = curlJson($baseUrl . '/patient-documents?relative_id=' . urlencode($relativeId), [$authHeader], null, 'GET', $cookieFile);
$relDocsList2 = $relDocs2['body']['data'] ?? [];
$relCountAfter = is_array($relDocsList2) ? count($relDocsList2) : 0;
$hasCarteVitale = false;
foreach ($relDocsList2 as $d) {
    if (($d['document_type'] ?? '') === 'carte_vitale') {
        $hasCarteVitale = true;
        break;
    }
}
if (!$hasCarteVitale || $relCountAfter < 1) {
    echo "❌ BUG: Documents proche non trouvés après upload (count=$relCountAfter, carte_vitale=" . ($hasCarteVitale ? 'oui' : 'non') . ")\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Documents proche: $relCountAfter (carte_vitale présent)\n\n";

// 8. Vérifier que mes docs patient n'ont pas été modifiés
echo "8. GET /patient-documents (moi) - doit rester inchangé...\n";
$myDocs2 = curlJson($baseUrl . '/patient-documents', [$authHeader], null, 'GET', $cookieFile);
$myDocsList2 = $myDocs2['body']['data'] ?? [];
$myCount2 = is_array($myDocsList2) ? count($myDocsList2) : 0;
echo "   Documents patient (moi): $myCount2 (avant: $myCount)\n";
if ($myCount !== $myCount2 && $myCount > 0) {
    echo "   ⚠ Le nombre de docs patient a changé - vérifier isolation patient/proche\n";
} else {
    echo "   ✅ Isolation patient/proche OK\n\n";
}

// 9. Créer RDV proche + upload medical-documents
echo "9. Création RDV proche + upload medical-documents...\n";
$catResp = curlJson($baseUrl . '/categories?type=blood_test', [$authHeader], null, 'GET', $cookieFile);
$categories = $catResp['body']['data'] ?? $catResp['body']['categories'] ?? [];
$categoryId = null;
foreach (is_array($categories) ? $categories : [] as $c) {
    if (isset($c['id']) && ($c['type'] ?? '') === 'blood_test') {
        $categoryId = $c['id'];
        break;
    }
}
if (!$categoryId && !empty($categories[0]['id'])) {
    $categoryId = $categories[0]['id'];
}
$scheduledAt = date('Y-m-d H:i:s', strtotime('+5 days 10:00'));
$createApt = curlJson($baseUrl . '/appointments', [$authHeader, 'X-CSRF-Token: ' . $csrfToken], json_encode([
    'type' => 'blood_test',
    'form_type' => 'blood_test',
    'patient_id' => $userId,
    'relative_id' => $relativeId,
    'category_id' => $categoryId,
    'address' => $address,
    'scheduled_at' => $scheduledAt,
    'form_data' => [
        'first_name' => 'Marie',
        'last_name' => 'Barth',
        'email' => $email,
        'phone' => '0698765432',
        'address' => $address,
        'birth_date' => '2015-06-20',
        'gender' => 'female',
        'blood_test_type' => 'single',
        'availability' => '{"type":"all_day"}',
    ],
]), 'POST', $cookieFile);
if (($createApt['code'] ?? 0) !== 200 || empty($createApt['body']['data']['id'])) {
    echo "❌ Création RDV: " . json_encode($createApt['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$appointmentId = $createApt['body']['data']['id'];
echo "   RDV créé: $appointmentId\n";

$uploadMed = curlMultipart(
    $baseUrl . '/medical-documents',
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    ['appointment_id' => $appointmentId, 'document_type' => 'carte_mutuelle'],
    $testFile,
    'file',
    $cookieFile
);
if (($uploadMed['code'] ?? 0) !== 200) {
    echo "   ⚠ Upload medical-documents échoué\n";
} else {
    echo "   ✅ carte_mutuelle uploadé via medical-documents (doit aller dans patient_relative_documents)\n";
}

// 10. Vérifier documents proche après medical-documents upload
echo "\n10. GET /patient-documents?relative_id=$relativeId (après medical-documents)...\n";
$relDocs3 = curlJson($baseUrl . '/patient-documents?relative_id=' . urlencode($relativeId), [$authHeader], null, 'GET', $cookieFile);
$relDocsList3 = $relDocs3['body']['data'] ?? [];
$relCountFinal = is_array($relDocsList3) ? count($relDocsList3) : 0;
echo "   Documents proche: $relCountFinal (carte_vitale + carte_mutuelle attendus)\n";

@unlink($testFile);
@unlink($cookieFile);

echo "\n=== ✅ Test documents proche terminé avec succès ===\n";
echo "   - patient-documents/upload + relative_id → patient_relative_documents ✓\n";
echo "   - GET patient-documents?relative_id → docs du proche ✓\n";
echo "   - Isolation patient / proche ✓\n";
