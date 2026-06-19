#!/usr/bin/env php
<?php

/**
 * E2E récap RDV Cary IA — reproduit le parcours patient mobile.
 *
 * Usage :
 *   BASE_URL=https://cary.bio/api php backend/scripts/test-ai-booking-recap-e2e.php [email_patient]
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/ai/AiChatHelper.php';

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$baseUrl = rtrim(getenv('BASE_URL') ?: 'https://cary.bio/api', '/');
$backendDir = dirname(__DIR__);
$cookieFile = sys_get_temp_dir() . '/test-ai-recap-e2e-cookies.txt';

function fail(string $msg, array $ctx = []): void
{
    fwrite(STDERR, "FAIL: {$msg}\n");
    if ($ctx !== []) {
        fwrite(STDERR, json_encode($ctx, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
    }
    exit(1);
}

function ok(string $msg): void
{
    echo "OK: {$msg}\n";
}

function info(string $label, mixed $value): void
{
    if (is_array($value)) {
        echo "  {$label}: " . json_encode($value, JSON_UNESCAPED_UNICODE) . "\n";
        return;
    }
    echo "  {$label}: {$value}\n";
}

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
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
    curl_close($ch);
    $decoded = json_decode($response ?: '{}', true);

    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : [], 'raw' => $response];
}

function chat(array $postHeaders, string $cookieFile, string $conversationId, string $message, ?string $draftId = null): array
{
    global $baseUrl;
    $payload = [
        'conversation_id' => $conversationId,
        'message' => $message,
    ];
    if ($draftId) {
        $payload['draft_id'] = $draftId;
    }
    $res = curlJson("{$baseUrl}/ai/chat", $postHeaders, json_encode($payload), 'POST', $cookieFile);
    if (($res['code'] ?? 0) !== 200 || empty($res['body']['success'])) {
        fail('POST /ai/chat', ['http' => $res['code'], 'body' => $res['body']]);
    }

    return $res['body']['data'] ?? [];
}

function draftSummary(?array $draft): array
{
    if (!$draft) {
        return ['present' => false];
    }
    $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];

    return [
        'present' => true,
        'id' => $draft['id'] ?? null,
        'status' => $draft['status'] ?? null,
        'booking_step' => $payload['booking_step'] ?? null,
        'ordonnance_status' => $payload['ordonnance_status'] ?? null,
        'category' => $payload['category_name'] ?? $payload['category_id'] ?? null,
        'scheduled_at' => $payload['scheduled_at'] ?? null,
        'use_profile_address' => $payload['use_profile_address'] ?? null,
        'has_address' => is_array($payload['address'] ?? null) && !empty($payload['address']['label']),
        'care_options' => $payload['form_data']['care_options'] ?? null,
        'recap_services' => $draft['recap']['services'] ?? null,
        'care_option_lines' => $draft['recap']['care_option_lines'] ?? null,
    ];
}

function assertRecapReady(?array $draft, string $assistantText): void
{
    $summary = draftSummary($draft);
    info('Draft', $summary);
    info('Assistant (200)', mb_substr($assistantText, 0, 200));

    if (!$draft) {
        fail('Aucun brouillon retourné — le récap mobile ne peut pas s\'afficher');
    }

    $signalsRecap = AiChatHelper::assistantSignalsRecap($assistantText);
    info('assistantSignalsRecap', $signalsRecap ? 'yes' : 'no');

    if (!$signalsRecap) {
        fail('Cary n\'annonce pas le récap dans le texte assistant');
    }

    $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
    $ord = (string) ($payload['ordonnance_status'] ?? '');
    if ($ord === 'pending') {
        fail('ordonnance_status encore pending — récap bloqué côté app', $summary);
    }

    if (empty($payload['category_id']) && empty($payload['category_name'])) {
        fail('category manquante dans le brouillon', $summary);
    }

    if (empty($payload['scheduled_at'])) {
        fail('scheduled_at manquant', $summary);
    }

    $hasAddress = !empty($payload['use_profile_address'])
        || (is_array($payload['address'] ?? null) && trim((string) ($payload['address']['label'] ?? '')) !== '');
    if (!$hasAddress) {
        fail('adresse manquante (ni use_profile_address ni address.label)', $summary);
    }

    ok('Brouillon récap exploitable par l\'app mobile');
}

echo "=== E2E Récap RDV Cary IA ===\n";
echo "API: {$baseUrl}\n";
echo "Patient: {$email}\n\n";

@unlink($cookieFile);

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
    fail("OTP introuvable pour {$email}");
}

$csrf = curlJson("{$baseUrl}/auth/csrf-token", [], null, 'GET', $cookieFile);
$verify = curlJson("{$baseUrl}/auth/verify-otp", [], json_encode([
    'user_id' => $userId,
    'otp' => $otp,
    'session_id' => $sessionId ?? '',
]), 'POST', $cookieFile);
$token = $verify['body']['token'] ?? null;
if (!$token) {
    fail('verify-otp');
}
ok('Auth patient');

$auth = ['Authorization: Bearer ' . $token];
$csrfToken = $csrf['body']['data']['csrf_token'] ?? null;
$postHeaders = $auth;
if ($csrfToken) {
    $postHeaders[] = 'X-CSRF-Token: ' . $csrfToken;
}

$create = curlJson("{$baseUrl}/ai/conversations", $postHeaders, json_encode([
    'conversation_type' => 'general',
    'custom_title' => 'E2E récap ' . date('Y-m-d H:i'),
]), 'POST', $cookieFile);
$conversationId = (string) ($create['body']['data']['id'] ?? '');
if ($conversationId === '') {
    fail('conversation_id manquant');
}
ok("Conversation {$conversationId}");

// Parcours type utilisateur mobile
$bookingMessage = 'Pour moi même pansement plaie au pied demain à 14h chez moi j\'ai pas ordonnance';
echo "\n--- Tour 1 : demande complète ---\n";
$data1 = chat($postHeaders, $cookieFile, $conversationId, $bookingMessage);
$draft1 = $data1['draft'] ?? ($data1['message']['metadata']['draft'] ?? null);
$text1 = (string) ($data1['message']['content'] ?? '');
$summary1 = draftSummary($draft1);
info('Tour 1 draft', $summary1);

$draftId = is_array($draft1) ? (string) ($draft1['id'] ?? '') : '';
$finalData = $data1;
$finalText = $text1;
$finalDraft = $draft1;

if (!AiChatHelper::assistantSignalsRecap($text1)) {
    echo "\n--- Tour 2 : confirmation sans ordonnance ---\n";
    $data2 = chat($postHeaders, $cookieFile, $conversationId, 'Non je n\'ai pas d\'ordonnance', $draftId ?: null);
    $draft2 = $data2['draft'] ?? ($data2['message']['metadata']['draft'] ?? null);
    $text2 = (string) ($data2['message']['content'] ?? '');
    info('Tour 2 draft', draftSummary($draft2));
    $finalData = $data2;
    $finalText = $text2;
    $finalDraft = $draft2;
    $draftId = is_array($draft2) ? (string) ($draft2['id'] ?? '') : $draftId;
}

if (!AiChatHelper::assistantSignalsRecap($finalText) && $draftId !== '') {
    echo "\n--- Tour 3 : demande récap explicite ---\n";
    $data3 = chat($postHeaders, $cookieFile, $conversationId, 'Montre moi le récap pour valider', $draftId);
    $draft3 = $data3['draft'] ?? ($data3['message']['metadata']['draft'] ?? null);
    $text3 = (string) ($data3['message']['content'] ?? '');
    info('Tour 3 draft', draftSummary($draft3));
    $finalData = $data3;
    $finalText = $text3;
    $finalDraft = $draft3;
}

echo "\n--- Vérification GET conversation + draft ---\n";
$detail = curlJson("{$baseUrl}/ai/conversations/{$conversationId}", $auth);
$detailDraft = $detail['body']['data']['draft'] ?? null;
info('GET /conversations draft', draftSummary($detailDraft));
if (!$detailDraft && $finalDraft) {
    fail('GET conversation ne renvoie pas draft alors que chat oui');
}
ok('GET conversation inclut le brouillon');

echo "\n--- Assertions récap mobile ---\n";
assertRecapReady($finalDraft, $finalText);

if (($finalDraft['status'] ?? '') === 'ready') {
    $confirmId = (string) ($finalDraft['id'] ?? '');
    $formBefore = is_array($finalDraft['payload']['form_data'] ?? null) ? $finalDraft['payload']['form_data'] : [];
    info('Draft form_data identité', [
        'first_name' => $formBefore['first_name'] ?? null,
        'last_name' => $formBefore['last_name'] ?? null,
    ]);
    if (empty($formBefore['first_name']) || empty($formBefore['last_name'])) {
        fail('Prénom/nom absents du brouillon avant confirmation');
    }

    $confirm = curlJson("{$baseUrl}/ai/booking/drafts/{$confirmId}/confirm", $postHeaders, '{}', 'POST', $cookieFile);
    if (($confirm['code'] ?? 0) !== 200 || empty($confirm['body']['success'])) {
        fail('POST confirm', ['http' => $confirm['code'], 'body' => $confirm['body']]);
    }
    ok('Confirmation RDV (status ready)');

    $appointmentId = (string) ($confirm['body']['data']['appointment_id'] ?? '');
    if ($appointmentId !== '') {
        $apt = curlJson("{$baseUrl}/appointments/{$appointmentId}", $auth);
        if (($apt['code'] ?? 0) !== 200 || empty($apt['body']['success'])) {
            fail('GET appointment après confirm', ['http' => $apt['code'], 'body' => $apt['body']]);
        }
        $fd = is_array($apt['body']['data']['form_data'] ?? null) ? $apt['body']['data']['form_data'] : [];
        info('RDV form_data identité', [
            'first_name' => $fd['first_name'] ?? null,
            'last_name' => $fd['last_name'] ?? null,
        ]);
        if (empty($fd['first_name']) || empty($fd['last_name'])) {
            fail('Prénom/nom absents du RDV créé');
        }
        ok('RDV contient prénom et nom du patient');
    }
} else {
    echo "WARN: status={$finalDraft['status']} — confirm non testé (missing: " . json_encode($finalDraft['missing_fields'] ?? []) . ")\n";
}

@unlink($cookieFile);
echo "\n=== E2E RÉCAP PASS ===\n";
