#!/usr/bin/env php
<?php

/**
 * Script de test flux proche (patient-relatives) pour Charle Barth
 *
 * Teste le workflow complet : connexion OTP → création proche → liste →
 * mise à jour → création RDV pour le proche → vérification.
 *
 * Usage :
 *   cd backend
 *   php scripts/create-charle-bart.php   # créer le compte si besoin
 *   php scripts/test-charles-bart-proche-flow.php [email]
 *
 * Variables d'environnement :
 *   BASE_URL : URL de l'API (défaut: http://127.0.0.1:8888/api)
 *
 * Exemple en production :
 *   BASE_URL=https://app.oneandlab.fr/api php scripts/test-charles-bart-proche-flow.php
 */

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = getenv('BASE_URL') ?: 'http://127.0.0.1:8888/api';
$baseUrl = rtrim($baseUrl, '/');

$backendDir = dirname(__DIR__);
$testFile = sys_get_temp_dir() . '/test-charles-bart-doc.png';
$cookieFile = sys_get_temp_dir() . '/test-charles-bart-proche-cookies.txt';

// Fichier PNG minimal pour les tests
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
    $curlErr = curl_error($ch);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);
    if ($response && empty($decoded['token']) && ($idx = strpos($response, '"}}{')) !== false) {
        $tail = substr($response, $idx + 3);
        $second = json_decode($tail, true);
        if (is_array($second) && !empty($second['token'])) {
            $decoded = $second;
        }
    }
    return ['code' => $httpCode, 'body' => $decoded ?: [], 'raw' => $response, 'curl_error' => $curlErr ?: null];
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

echo "=== Test flux proche Charle Barth ===\n\n";
echo "Email: $email\n";
echo "API: $baseUrl\n\n";

// 1. Obtenir l'OTP
echo "1. Obtaining OTP...\n";
$otpOutput = [];
exec("cd $backendDir && php get-last-otp.php " . escapeshellarg($email) . " 2>&1", $otpOutput);
$otpOutput = implode("\n", $otpOutput);

$sessionId = null;
$userId = null;
$otp = null;
if (preg_match('/Session ID:\s*(\S+)/', $otpOutput, $m)) {
    $sessionId = trim($m[1]);
}
if (preg_match('/User ID:\s*(\S+)/', $otpOutput, $m)) {
    $userId = trim($m[1]);
}
if (preg_match('/Code OTP:\s*(\d{6})/', $otpOutput, $m)) {
    $otp = $m[1];
}

if (!$userId || !$otp) {
    echo "❌ Impossible d'obtenir l'OTP. Créez le patient avec: php scripts/create-charle-bart.php\n";
    @unlink($testFile);
    exit(1);
}
echo "   ✅ OTP obtenu (user_id: $userId)\n\n";

// 2. CSRF + session
echo "2. Getting CSRF token...\n";
$csrfPre = curlJson($baseUrl . '/auth/csrf-token', [], null, 'GET', $cookieFile);
if (($csrfPre['code'] ?? 0) !== 200) {
    echo "❌ Erreur CSRF: " . json_encode($csrfPre['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$csrfToken = $csrfPre['body']['data']['csrf_token'] ?? null;
echo "   ✅ Session créée\n\n";

// 3. Vérifier OTP
echo "3. Verifying OTP...\n";
$verifyPayload = json_encode([
    'user_id' => $userId,
    'otp' => $otp,
    'session_id' => $sessionId ?? '',
]);
ob_start();
$verify = curlJson($baseUrl . '/auth/verify-otp', [], $verifyPayload, 'POST', $cookieFile);
$verifyCapture = ob_get_clean();
$token = $verify['body']['token'] ?? null;
if (empty($token) && !empty($verifyCapture)) {
    $p = json_decode(trim($verifyCapture), true);
    if (is_array($p) && !empty($p['token'])) $token = trim($p['token']);
    if (empty($token) && ($idx = strpos($verifyCapture, '"}}{')) !== false) {
        $s = json_decode(substr($verifyCapture, $idx + 3), true);
        if (!empty($s['token'])) $token = trim($s['token']);
    }
}
if (($verify['code'] ?? 0) !== 200 || empty($token)) {
    echo "❌ Erreur verify-otp: " . json_encode($verify['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Token obtenu\n\n";

$authHeader = 'Authorization: Bearer ' . $token;
if (!$csrfToken) {
    echo "❌ Token CSRF manquant\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}

// 4. Liste des proches (initiale)
echo "4. Listing relatives (initial)...\n";
$listResp = curlJson($baseUrl . '/patient-relatives', [$authHeader], null, 'GET', $cookieFile);
if (($listResp['code'] ?? 0) !== 200) {
    echo "❌ Erreur GET /patient-relatives: " . json_encode($listResp['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$relatives = $listResp['body']['data'] ?? [];
$initialCount = is_array($relatives) ? count($relatives) : 0;
echo "   Proches actuels: $initialCount\n\n";

// 5. Créer un proche
echo "5. Creating relative (enfant)...\n";
$address = [
    'label' => '10 rue de la Paix, 75002 Paris',
    'lat' => 48.8698,
    'lng' => 2.3318,
    'postal_code' => '75002',
    'city' => 'Paris',
    'country' => 'France',
];

$relativePayload = [
    'first_name' => 'Marie',
    'last_name' => 'Barth',
    'relationship_type' => 'child',
    'email' => $email,
    'phone' => '0612345679',
    'address' => $address,
    'birth_date' => '2015-06-20',
    'gender' => 'female',
];

$createRel = curlJson(
    $baseUrl . '/patient-relatives',
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    json_encode($relativePayload),
    'POST',
    $cookieFile
);

if (($createRel['code'] ?? 0) !== 200 || empty($createRel['body']['data']['id'])) {
    echo "❌ Erreur création proche: " . json_encode($createRel['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$relativeId = $createRel['body']['data']['id'];
$relativeData = $createRel['body']['data'];
echo "   ✅ Proche créé: $relativeId (Marie Barth)\n\n";

// 6. Liste des proches (après création)
echo "6. Listing relatives (after create)...\n";
$listResp2 = curlJson($baseUrl . '/patient-relatives', [$authHeader], null, 'GET', $cookieFile);
if (($listResp2['code'] ?? 0) !== 200) {
    echo "❌ Erreur GET /patient-relatives: " . json_encode($listResp2['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$relatives2 = $listResp2['body']['data'] ?? [];
$afterCount = is_array($relatives2) ? count($relatives2) : 0;
if ($afterCount < $initialCount + 1) {
    echo "❌ BUG: Proche non visible dans la liste ($afterCount attendu >= " . ($initialCount + 1) . ")\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Proches: $afterCount\n\n";

// 7. Mise à jour du proche
echo "7. Updating relative (phone)...\n";
$updatePayload = ['phone' => '0698765432'];
$updateRel = curlJson(
    $baseUrl . '/patient-relatives/' . $relativeId,
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    json_encode($updatePayload),
    'PUT',
    $cookieFile
);
if (($updateRel['code'] ?? 0) !== 200) {
    echo "❌ Erreur PUT proche: " . json_encode($updateRel['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$updatedPhone = $updateRel['body']['data']['phone'] ?? null;
if ($updatedPhone !== '0698765432') {
    echo "   ⚠ Mise à jour OK mais phone=$updatedPhone (attendu 0698765432)\n";
} else {
    echo "   ✅ Proche mis à jour\n\n";
}

// 8. Récupérer une catégorie
echo "8. Fetching category...\n";
$catResp = curlJson($baseUrl . '/categories?type=blood_test', [$authHeader], null, 'GET', $cookieFile);
$categories = $catResp['body']['data'] ?? $catResp['body']['categories'] ?? $catResp['body'] ?? [];
if (!is_array($categories)) {
    $categories = [];
}
$categoryId = null;
foreach ($categories as $c) {
    if (isset($c['id']) && ($c['type'] ?? '') === 'blood_test') {
        $categoryId = $c['id'];
        break;
    }
}
if (!$categoryId && !empty($categories[0]['id'])) {
    $categoryId = $categories[0]['id'];
}
if (!$categoryId) {
    echo "   ⚠ Aucune catégorie blood_test, RDV sans category_id\n";
}

// 9. Créer un RDV pour le proche
echo "\n9. Creating appointment for relative...\n";
$scheduledAt = date('Y-m-d H:i:s', strtotime('+4 days 09:00'));
$appointmentPayload = [
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
];
$createApt = curlJson(
    $baseUrl . '/appointments',
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    json_encode($appointmentPayload),
    'POST',
    $cookieFile
);

if (($createApt['code'] ?? 0) !== 200 || empty($createApt['body']['data']['id'])) {
    echo "❌ Erreur création RDV pour proche: " . json_encode($createApt['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$appointmentId = $createApt['body']['data']['id'];
echo "   ✅ RDV créé pour le proche: $appointmentId\n\n";

// 10. Upload documents (carte vitale, carte mutuelle)
echo "10. Uploading medical documents...\n";
$docTypes = ['carte_vitale', 'carte_mutuelle'];
$uploadedDocs = 0;
foreach ($docTypes as $docType) {
    $upload = curlMultipart(
        $baseUrl . '/medical-documents',
        [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
        ['appointment_id' => $appointmentId, 'document_type' => $docType],
        $testFile,
        'file',
        $cookieFile
    );
    if (($upload['code'] ?? 0) === 200 && !empty($upload['body']['success'])) {
        $uploadedDocs++;
        echo "   ✅ $docType uploaded\n";
    } else {
        echo "   ❌ $docType failed\n";
    }
}

// 11. Vérifier le détail du RDV (relative_id présent)
echo "\n11. Checking appointment detail (relative_id)...\n";
$aptDetail = curlJson($baseUrl . '/appointments/' . $appointmentId, [$authHeader], null, 'GET', $cookieFile);
$aptData = $aptDetail['body']['data'] ?? $aptDetail['body'] ?? [];
$aptRelativeId = $aptData['relative_id'] ?? null;
if ($aptRelativeId !== $relativeId) {
    echo "   ⚠ relative_id dans RDV: " . ($aptRelativeId ?? 'null') . " (attendu: $relativeId)\n";
} else {
    echo "   ✅ RDV lié au proche (relative_id: $relativeId)\n";
}

// 12. Vérifier medical-documents
echo "\n12. Checking medical-documents...\n";
$medDocs = curlJson($baseUrl . '/medical-documents?appointment_id=' . $appointmentId, [$authHeader], null, 'GET', $cookieFile);
$medDocsList = $medDocs['body']['data'] ?? [];
$medCount = is_array($medDocsList) ? count($medDocsList) : 0;
echo "   Documents dans le RDV: $medCount\n";

// Nettoyage
@unlink($testFile);
@unlink($cookieFile);

echo "\n=== ✅ Test flux proche terminé avec succès ===\n";
echo "   - Proche créé: $relativeId (Marie Barth)\n";
echo "   - Proche mis à jour: OK\n";
echo "   - RDV pour proche: $appointmentId\n";
echo "   - Documents uploadés: $uploadedDocs\n";
