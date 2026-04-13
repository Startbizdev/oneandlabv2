#!/usr/bin/env php
<?php

/**
 * Script de test flux patient Charle Barth
 *
 * Teste le flux complet : connexion OTP → création RDV avec documents →
 * vérification dans patient-documents → reprise RDV (documents pré-remplis).
 *
 * Usage (en root sur le serveur) :
 *   cd /chemin/vers/onev2/backend
 *   php scripts/create-charle-bart.php   # créer le compte si besoin
 *   php scripts/test-charles-bart-flow.php [email]
 *
 * Prérequis : API backend accessible (php -S, nginx, etc.)
 *
 * Variables d'environnement :
 *   BASE_URL  : URL de l'API (défaut: http://127.0.0.1:8888/api)
 *
 * Exemple en production :
 *   BASE_URL=https://api.example.com/api php scripts/test-charles-bart-flow.php charle.barth@test.oneandlab.fr
 */

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = getenv('BASE_URL') ?: 'http://127.0.0.1:8888/api';
$baseUrl = rtrim($baseUrl, '/');

$backendDir = dirname(__DIR__);
$testFile = sys_get_temp_dir() . '/test-charles-bart-doc.png';
$cookieFile = sys_get_temp_dir() . '/test-charles-bart-cookies.txt';

// Créer un fichier PNG minimal pour les tests (1x1 pixel)
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

echo "=== Test flux patient Charle Barth ===\n\n";
echo "Email: $email\n";
echo "API: $baseUrl\n\n";

// 1. Obtenir l'OTP via get-last-otp.php (CLI)
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
    echo "❌ Impossible d'obtenir l'OTP. Vérifiez que le compte existe.\n";
    echo "   Créez le patient avec : php backend/setup-database.php ou équivalent\n";
    @unlink($testFile);
    exit(1);
}
echo "   ✅ OTP obtenu (user_id: $userId)\n\n";

// 2. Obtenir le token CSRF (créer la session PHP pour les requêtes POST)
echo "2. Getting CSRF token (session)...\n";
$csrfPre = curlJson($baseUrl . '/auth/csrf-token', [], null, 'GET', $cookieFile);
if (($csrfPre['code'] ?? 0) !== 200) {
    echo "❌ Erreur CSRF préalable: " . json_encode($csrfPre['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$csrfToken = $csrfPre['body']['data']['csrf_token'] ?? null;
echo "   ✅ Session créée\n\n";

// 3. Vérifier l'OTP et obtenir le token JWT
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
    echo "❌ Erreur verify-otp (HTTP " . ($verify['code'] ?? '?') . "): ";
    if (!empty($verify['curl_error'])) {
        echo "Connexion impossible: " . $verify['curl_error'] . "\n";
    } else {
        echo json_encode($verify['body'] ?: ['raw' => substr($verify['raw'] ?? '', 0, 500)], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    }
    if (empty($verify['code']) || $verify['code'] === 0 || !empty($verify['curl_error'])) {
        echo "   Vérifiez que l'API est démarrée (cd backend && ./start-server.sh 8888)\n";
    }
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Token obtenu\n\n";

$authHeader = 'Authorization: Bearer ' . $token;

if (!$csrfToken) {
    echo "❌ Token CSRF manquant (session)\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}

// 4. Récupérer une catégorie blood_test
echo "4. Fetching category...\n";
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
    echo "   ⚠ Aucune catégorie blood_test trouvée, RDV sans category_id\n";
}

$address = [
    'label' => '10 rue de la Paix, 75002 Paris',
    'lat' => 48.8698,
    'lng' => 2.3318,
    'postal_code' => '75002',
    'city' => 'Paris',
    'country' => 'France',
];

$scheduledAt = date('Y-m-d H:i:s', strtotime('+3 days 10:00'));

// 5. Créer le RDV
echo "5. Creating appointment...\n";
$appointmentPayload = [
    'type' => 'blood_test',
    'form_type' => 'blood_test',
    'patient_id' => $userId,
    'category_id' => $categoryId,
    'address' => $address,
    'scheduled_at' => $scheduledAt,
    'form_data' => [
        'first_name' => 'Charle',
        'last_name' => 'Barth',
        'email' => $email,
        'phone' => '0612345678',
        'address' => $address,
        'birth_date' => '1990-01-15',
        'gender' => 'male',
        'blood_test_type' => 'single',
        'availability' => 'all_day',
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
    echo "❌ Erreur création RDV: " . json_encode($createApt['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$appointmentId = $createApt['body']['data']['id'];
echo "   ✅ RDV créé: $appointmentId\n\n";

// 6. Uploader les documents (carte vitale, carte mutuelle)
echo "6. Uploading medical documents...\n";
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
        echo "   ❌ $docType failed: " . json_encode($upload['body'], JSON_PRETTY_PRINT) . "\n";
    }
}

if ($uploadedDocs === 0) {
    echo "\n❌ Aucun document uploadé. Arrêt.\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}

// 6b. Vérifier que les documents apparaissent dans le détail du RDV
echo "\n6b. Checking medical-documents (appointment detail)...\n";
$medDocs = curlJson($baseUrl . '/medical-documents?appointment_id=' . $appointmentId, [$authHeader], null, 'GET', $cookieFile);
$medDocsList = $medDocs['body']['data'] ?? [];
$medCount = is_array($medDocsList) ? count($medDocsList) : 0;
if ($medCount < $uploadedDocs) {
    echo "❌ BUG: Documents absents du détail RDV ($medCount/$uploadedDocs)\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Documents visibles dans le détail RDV: $medCount\n\n";

// 7. Vérifier patient-documents (profil patient)
echo "\n7. Checking patient-documents (profile)...\n";
$patientDocs = curlJson($baseUrl . '/patient-documents', [$authHeader], null, 'GET', $cookieFile);
$docs = $patientDocs['body']['data'] ?? $patientDocs['body']['documents'] ?? [];
if (!is_array($docs)) {
    $docs = [];
}

$profileDocCount = count($docs);
echo "   Documents dans le profil: $profileDocCount\n";

if ($profileDocCount === 0) {
    echo "\n❌ BUG: Les documents ne sont pas dans le profil patient!\n";
    echo "   Attendu: au moins $uploadedDocs document(s) (carte_vitale, carte_mutuelle)\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Documents présents dans le profil\n\n";

// 8. Créer un 2e RDV (reprise) et vérifier que les docs sont disponibles
echo "8. Creating second appointment (reprise RDV)...\n";
$scheduledAt2 = date('Y-m-d H:i:s', strtotime('+5 days 14:00'));
$appointmentPayload2 = [
    'type' => 'blood_test',
    'form_type' => 'blood_test',
    'patient_id' => $userId,
    'category_id' => $categoryId,
    'address' => $address,
    'scheduled_at' => $scheduledAt2,
    'form_data' => [
        'first_name' => 'Charle',
        'last_name' => 'Barth',
        'email' => $email,
        'phone' => '0612345678',
        'address' => $address,
        'birth_date' => '1990-01-15',
        'gender' => 'male',
        'blood_test_type' => 'single',
        'availability' => 'all_day',
    ],
];
$createApt2 = curlJson(
    $baseUrl . '/appointments',
    [$authHeader, 'X-CSRF-Token: ' . $csrfToken],
    json_encode($appointmentPayload2),
    'POST',
    $cookieFile
);

if (($createApt2['code'] ?? 0) !== 200 || empty($createApt2['body']['data']['id'])) {
    echo "❌ Erreur création 2e RDV: " . json_encode($createApt2['body'], JSON_PRETTY_PRINT) . "\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
$appointmentId2 = $createApt2['body']['data']['id'];
echo "   ✅ 2e RDV créé: $appointmentId2\n\n";

// 9. Vérifier que les documents du profil sont toujours là (reprise)
echo "9. Verifying profile documents after reprise...\n";
$patientDocs2 = curlJson($baseUrl . '/patient-documents', [$authHeader], null, 'GET', $cookieFile);
$docs2 = $patientDocs2['body']['data'] ?? $patientDocs2['body']['documents'] ?? [];
if (!is_array($docs2)) {
    $docs2 = [];
}
$profileDocCount2 = count($docs2);
echo "   Documents dans le profil: $profileDocCount2\n";

if ($profileDocCount2 < $profileDocCount) {
    echo "\n❌ BUG: Documents perdus après reprise!\n";
    @unlink($testFile);
    @unlink($cookieFile);
    exit(1);
}
echo "   ✅ Documents présents après reprise\n\n";

// Nettoyage
@unlink($testFile);
@unlink($cookieFile);

echo "=== ✅ Test terminé avec succès ===\n";
echo "   - RDV 1: $appointmentId (avec $uploadedDocs docs)\n";
echo "   - RDV 2: $appointmentId2 (reprise)\n";
echo "   - Profil: $profileDocCount2 document(s)\n";
