#!/usr/bin/env php
<?php

/**
 * Tests API Phase 1 IA Cary (prod / local).
 *
 * Usage :
 *   BASE_URL=https://cary.bio/api php backend/scripts/test-ai-phase1-api.php [email_patient]
 *
 * Prérequis serveur : migrations 075–078, backend déployé, XAI_API_KEY configurée.
 */

declare(strict_types=1);

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = rtrim(getenv('BASE_URL') ?: 'https://cary.bio/api', '/');
$backendDir = dirname(__DIR__);
$cookieFile = sys_get_temp_dir() . '/test-ai-phase1-cookies.txt';

function fail(string $msg): void
{
    fwrite(STDERR, "FAIL: {$msg}\n");
    exit(1);
}

function ok(string $msg): void
{
    echo "OK: {$msg}\n";
}

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ];
    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }
    curl_setopt_array($ch, $opts);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);

    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : [], 'raw' => $response, 'error' => $err];
}

echo "=== Test API IA Cary Phase 1 ===\n";
echo "API: {$baseUrl}\n";
echo "Patient: {$email}\n\n";

@unlink($cookieFile);

// Auth OTP (CLI get-last-otp)
$otpOutput = [];
exec('cd ' . escapeshellarg($backendDir) . ' && php get-last-otp.php ' . escapeshellarg($email) . ' 2>&1', $otpOutput);
$otpText = implode("\n", $otpOutput);
$userId = null;
$otp = null;
$sessionId = null;
if (preg_match('/User ID:\s*(\S+)/', $otpText, $m)) {
    $userId = trim($m[1]);
}
if (preg_match('/Code OTP:\s*(\d{6})/', $otpText, $m)) {
    $otp = $m[1];
}
if (preg_match('/Session ID:\s*(\S+)/', $otpText, $m)) {
    $sessionId = trim($m[1]);
}
if (!$userId || !$otp) {
    fail("OTP introuvable pour {$email} — créez le compte test ou lancez depuis le serveur.");
}

$csrf = curlJson("{$baseUrl}/auth/csrf-token", [], null, 'GET', $cookieFile);
if (($csrf['code'] ?? 0) !== 200) {
    fail('CSRF token: HTTP ' . ($csrf['code'] ?? 0));
}

$verify = curlJson("{$baseUrl}/auth/verify-otp", [], json_encode([
    'user_id' => $userId,
    'otp' => $otp,
    'session_id' => $sessionId ?? '',
]), 'POST', $cookieFile);
$token = $verify['body']['token'] ?? null;
if (($verify['code'] ?? 0) !== 200 || !$token) {
    fail('verify-otp: ' . json_encode($verify['body'], JSON_UNESCAPED_UNICODE));
}
ok('Authentification patient');

$auth = ['Authorization: Bearer ' . $token];
$csrfToken = $csrf['body']['data']['csrf_token'] ?? null;
$postHeaders = $auth;
if ($csrfToken) {
    $postHeaders[] = 'X-CSRF-Token: ' . $csrfToken;
}

$hub = curlJson("{$baseUrl}/ai/hub", $auth);
if (($hub['code'] ?? 0) !== 200 || empty($hub['body']['success'])) {
    fail('GET /ai/hub: ' . json_encode($hub['body'], JSON_UNESCAPED_UNICODE));
}
if (empty($hub['body']['data']['disclaimer'])) {
    fail('GET /ai/hub sans disclaimer');
}
if (!is_array($hub['body']['data']['quick_suggestions'] ?? null)) {
    fail('GET /ai/hub sans quick_suggestions');
}
ok('GET /ai/hub + disclaimer + suggestions');

$suggestions = curlJson("{$baseUrl}/ai/quick-suggestions", $auth);
if (($suggestions['code'] ?? 0) !== 200 || empty($suggestions['body']['success'])) {
    fail('GET /ai/quick-suggestions');
}
ok('GET /ai/quick-suggestions dynamique');

$ensure = curlJson("{$baseUrl}/ai/conversations/ensure-system", $postHeaders, json_encode([
    'system_key' => 'assistant_health',
]), 'POST', $cookieFile);
if (($ensure['code'] ?? 0) !== 200 || empty($ensure['body']['data']['id'])) {
    fail('POST /ai/conversations/ensure-system');
}
$conversationId = (string) $ensure['body']['data']['id'];
ok('POST ensure-system (idempotent)');

$create = curlJson("{$baseUrl}/ai/conversations", $postHeaders, json_encode([
    'conversation_type' => 'general',
    'custom_title' => 'Test IA Phase 1',
]), 'POST', $cookieFile);
if (($create['code'] ?? 0) !== 200 && ($create['code'] ?? 0) !== 201) {
    fail('POST /ai/conversations');
}
ok('POST /ai/conversations');

$chat = curlJson("{$baseUrl}/ai/chat", $postHeaders, json_encode([
    'conversation_id' => $conversationId,
    'message' => 'Quand est mon prochain rendez-vous ? Réponds en une phrase courte.',
]), 'POST', $cookieFile);
if (($chat['code'] ?? 0) !== 200 || empty($chat['body']['data']['message']['content'])) {
    fail('POST /ai/chat: ' . json_encode($chat['body'] ?? [], JSON_UNESCAPED_UNICODE));
}
$content = (string) $chat['body']['data']['message']['content'];
if (strlen(trim($content)) < 5) {
    fail('Réponse chat trop courte');
}
ok('POST /ai/chat contextuel (Grok) — réponse reçue');

$draftCreate = curlJson("{$baseUrl}/ai/booking/drafts", $postHeaders, json_encode([
    'conversation_id' => $conversationId,
    'payload' => [
        'type' => 'blood_test',
        'form_type' => 'blood_test',
        'patient_mode' => 'self',
        'patient_id' => $userId,
    ],
]), 'POST', $cookieFile);
if (($draftCreate['code'] ?? 0) !== 200 && ($draftCreate['code'] ?? 0) !== 201) {
    $errDetail = json_encode($draftCreate['body'] ?? [], JSON_UNESCAPED_UNICODE);
    fail('POST /ai/booking/drafts (HTTP ' . ($draftCreate['code'] ?? 0) . '): ' . $errDetail);
}
$draftId = $draftCreate['body']['data']['id'] ?? null;
if (!$draftId) {
    fail('draft_id manquant');
}
ok('POST /ai/booking/drafts');

$draftPatch = curlJson("{$baseUrl}/ai/booking/drafts/{$draftId}", $postHeaders, json_encode([
    'payload' => [
        'scheduled_at' => '2026-07-15 10:00:00',
        'address' => ['label' => 'Paris Test IA', 'lat' => 48.8566, 'lng' => 2.3522],
    ],
]), 'PATCH', $cookieFile);
if (($draftPatch['code'] ?? 0) !== 200) {
    fail('PATCH /ai/booking/drafts');
}
ok('PATCH /ai/booking/drafts');

@unlink($cookieFile);

echo "\n=== Tous les scénarios API Phase 1 IA sont PASS ===\n";
