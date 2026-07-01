#!/usr/bin/env php
<?php

/**
 * Test 360° Cary IA — phases 1 à 4 (chat, docs, santé, RAG, tendances, pièges).
 *
 * Usage :
 *   php backend/scripts/test-cary-360.php [email_patient] [--local-only] [--skip-chat] [--phase=1,2,3,4]
 *
 * Variables :
 *   BASE_URL=https://cary.bio/api
 *
 * Exemples :
 *   php backend/scripts/test-cary-360.php --local-only
 *   BASE_URL=https://cary.bio/api php backend/scripts/test-cary-360.php charle.barth@test.oneandlab.fr
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/ai/Cary360Assertions.php';
require_once __DIR__ . '/../lib/ai/Cary360ScenarioCatalog.php';
require_once __DIR__ . '/../lib/ai/CaryContextFocus.php';
require_once __DIR__ . '/../lib/ai/AiDocumentIntent.php';
require_once __DIR__ . '/../lib/ai/AiChatHelper.php';

$backendDir = dirname(__DIR__);
$args = array_slice($argv, 1);
$email = 'charle.barth@test.oneandlab.fr';
$localOnly = false;
$skipChat = false;
$phaseFilter = null;

foreach ($args as $arg) {
    if ($arg === '--local-only') {
        $localOnly = true;
    } elseif ($arg === '--skip-chat') {
        $skipChat = true;
    } elseif (str_starts_with($arg, '--phase=')) {
        $phaseFilter = array_map('intval', array_filter(explode(',', substr($arg, 8)), static fn ($p) => $p > 0));
    } elseif (!str_starts_with($arg, '--')) {
        $email = $arg;
    }
}

$baseUrl = rtrim(getenv('BASE_URL') ?: 'https://cary.bio/api', '/');
$cookieFile = sys_get_temp_dir() . '/test-cary-360-cookies.txt';
$reportPath = sys_get_temp_dir() . '/cary-360-report-' . date('Y-m-d-His') . '.json';

/** @var list<array<string, mixed>> */
$results = [];
$counts = ['pass' => 0, 'fail' => 0, 'skip' => 0, 'warn' => 0];

function record(array &$results, array &$counts, string $id, string $section, string $status, string $detail = '', array $extra = []): void
{
    $entry = array_merge([
        'id' => $id,
        'section' => $section,
        'status' => $status,
        'detail' => $detail,
        'at' => date('c'),
    ], $extra);
    $results[] = $entry;
    if (isset($counts[$status])) {
        $counts[$status]++;
    }
    $icon = match ($status) {
        'pass' => '✔',
        'fail' => '✘',
        'skip' => '○',
        'warn' => '⚠',
        default => '?',
    };
    echo sprintf("  %s [%s] %s%s\n", $icon, $id, $detail !== '' ? $detail : $status, isset($extra['preview']) ? ' — ' . mb_substr((string) $extra['preview'], 0, 120) : '');
}

function phaseAllowed(?array $phaseFilter, int $phase): bool
{
    return $phaseFilter === null || in_array($phase, $phaseFilter, true);
}

function curlJson(string $url, array $headers = [], ?string $body = null, string $method = 'GET', ?string $cookieFile = null, int $timeout = 120): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => $timeout,
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

echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║  Cary IA — Test 360° (phases 1–4)                        ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n";
echo "API: {$baseUrl}\n";
echo "Patient: {$email}\n";
if ($localOnly) {
    echo "Mode: local-only\n";
}
if ($phaseFilter) {
    echo 'Phases: ' . implode(',', $phaseFilter) . "\n";
}
echo "\n";

// ─── Section A : validations locales (déterministes) ───
echo "── A. Validations locales (focus, pièges, garde-fous) ──\n";

foreach (Cary360Assertions::localFocusScenarios() as $scenario) {
    $got = Cary360Assertions::resolveFocus(
        $scenario['message'],
        $scenario['has_attachment'],
        $scenario['draft'],
        $scenario['has_docs'],
    );
    if ($got === $scenario['expect']) {
        record($results, $counts, $scenario['id'], 'local_focus', 'pass');
    } else {
        record($results, $counts, $scenario['id'], 'local_focus', 'fail', "attendu {$scenario['expect']}, obtenu {$got}");
    }
}

foreach (Cary360Assertions::documentFollowUpTraps() as $trap) {
    $got = CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($trap['message']));
    $ok = $got === $trap['expect'];
    record($results, $counts, $trap['id'], 'local_followup_trap', $ok ? 'pass' : 'fail', $ok ? '' : ($trap['expect'] ? 'devrait matcher' : 'ne devrait pas matcher'));
}

$intentTraps = [
    ['id' => 'intent_bilan_pdf', 'doc' => ['document_type' => 'resultats', 'file_name' => 'bilan.pdf', 'mime_type' => 'application/pdf'], 'ocr' => 'ALAT 58 UI/L', 'expect' => 'medical'],
    ['id' => 'intent_facture', 'doc' => ['document_type' => 'other', 'file_name' => 'facture_edf.pdf', 'mime_type' => 'application/pdf'], 'ocr' => 'Facture TTC 120 EUR', 'expect' => 'non_medical'],
    ['id' => 'intent_ordonnance_jpg', 'doc' => ['document_type' => 'other', 'file_name' => 'ordo.jpg', 'mime_type' => 'image/jpeg'], 'ocr' => 'Prescription Amoxicilline 1g', 'expect' => 'medical'],
];
foreach ($intentTraps as $trap) {
    $intent = AiDocumentIntent::classify($trap['doc'], $trap['ocr']);
    $ok = ($intent['category'] ?? '') === $trap['expect'];
    record($results, $counts, $trap['id'], 'local_intent', $ok ? 'pass' : 'fail', $ok ? '' : 'cat=' . ($intent['category'] ?? '?'));
}

$gatewaySource = @file_get_contents($backendDir . '/lib/ai/AIGateway.php');
if (is_string($gatewaySource)) {
    $rules = ["n'établis jamais de diagnostic", 'Personnalité (humain, pas robot)', 'PAS de markdown', 'document_followup', 'chat_attachments'];
    foreach ($rules as $i => $rule) {
        $id = 'prompt_rule_' . ($i + 1);
        record($results, $counts, $id, 'local_prompt', str_contains($gatewaySource, $rule) ? 'pass' : 'fail', $rule);
    }
} else {
    record($results, $counts, 'prompt_rules', 'local_prompt', 'fail', 'AIGateway.php illisible');
}

$apiFileMap = [
    'api_hub' => 'api/ai/hub.php',
    'api_suggestions' => 'api/ai/quick-suggestions.php',
    'api_health_sources' => 'api/health/sources/index.php',
    'api_trends' => 'api/ai/trends/index.php',
    'api_search' => 'api/ai/search/index.php',
    'api_export' => 'api/ai/export/index.php',
    'api_signals' => 'api/ai/signals/index.php',
    'api_patient_docs' => 'api/patient-documents/index.php',
];
foreach (Cary360ScenarioCatalog::apiProbeEndpoints() as $probe) {
    if (!phaseAllowed($phaseFilter, (int) $probe['phase'])) {
        continue;
    }
    $rel = $apiFileMap[$probe['id']] ?? null;
    $file = $rel !== null ? $backendDir . '/' . str_replace('/', DIRECTORY_SEPARATOR, $rel) : '';
    record($results, $counts, 'file_' . $probe['id'], 'local_files', ($file !== '' && is_file($file)) ? 'pass' : 'fail', $rel ?? '?');
}

if ($localOnly) {
    goto finish;
}

// ─── Section B : auth + probes API ───
echo "\n── B. Auth + endpoints API (sans LLM) ──\n";

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
    record($results, $counts, 'auth', 'api', 'fail', "OTP introuvable pour {$email}");
    goto finish;
}

$csrf = curlJson("{$baseUrl}/auth/csrf-token", [], null, 'GET', $cookieFile);
$verify = curlJson("{$baseUrl}/auth/verify-otp", [], json_encode([
    'user_id' => $userId,
    'otp' => $otp,
    'session_id' => $sessionId ?? '',
]), 'POST', $cookieFile);
$token = $verify['body']['token'] ?? null;
if (!$token) {
    record($results, $counts, 'auth', 'api', 'fail', 'verify-otp échoué');
    goto finish;
}
record($results, $counts, 'auth', 'api', 'pass');

$auth = ['Authorization: Bearer ' . $token];
$csrfToken = $csrf['body']['data']['csrf_token'] ?? null;
$postHeaders = $auth;
if ($csrfToken) {
    $postHeaders[] = 'X-CSRF-Token: ' . $csrfToken;
}

foreach (Cary360ScenarioCatalog::apiProbeEndpoints() as $probe) {
    if (!phaseAllowed($phaseFilter, (int) $probe['phase'])) {
        continue;
    }
    $res = curlJson("{$baseUrl}{$probe['path']}", $auth, null, $probe['method'], $cookieFile, 60);
    $ok = ($res['code'] ?? 0) === $probe['expect_http'] && !empty($res['body']['success']);
    record($results, $counts, $probe['id'], 'api_probe', $ok ? 'pass' : 'fail', 'HTTP ' . ($res['code'] ?? 0));
}

$voice = curlJson("{$baseUrl}/ai/voice/sessions", $postHeaders, json_encode([
    'locale' => 'fr-FR',
    'mode' => 'patient_assistant',
]), 'POST', $cookieFile);
record($results, $counts, 'api_voice_session', 'api_probe', phaseAllowed($phaseFilter, 4) ? (($voice['code'] ?? 0) === 201 && !empty($voice['body']['success']) ? 'pass' : 'fail') : 'skip', 'HTTP ' . ($voice['code'] ?? 0));

$ensure = curlJson("{$baseUrl}/ai/conversations/ensure-system", $postHeaders, json_encode(['system_key' => 'assistant_health']), 'POST', $cookieFile);
record($results, $counts, 'api_ensure_system', 'api_probe', ($ensure['code'] ?? 0) === 200 ? 'pass' : 'fail');

if ($skipChat) {
    goto finish;
}

// ─── Section C : chat E2E ───
echo "\n── C. Scénarios chat Grok (pièges inclus) ──\n";

$createGeneral = curlJson("{$baseUrl}/ai/conversations", $postHeaders, json_encode([
    'conversation_type' => 'general',
    'custom_title' => '360 general ' . date('Y-m-d H:i'),
]), 'POST', $cookieFile);
$convGeneral = (string) ($createGeneral['body']['data']['id'] ?? '');
if ($convGeneral === '') {
    record($results, $counts, 'conv_general', 'chat', 'fail', 'conversation non créée');
    goto doc_section;
}

$chatFn = static function (array $postHeaders, string $cookieFile, string $conversationId, string $message, ?array $extra = null) use ($baseUrl): array {
    $payload = ['conversation_id' => $conversationId, 'message' => $message];
    if ($extra) {
        $payload = array_merge($payload, $extra);
    }
    $timeout = (int) ($extra['__timeout'] ?? 120);
    unset($payload['__timeout']);
    $res = curlJson("{$baseUrl}/ai/chat", $postHeaders, json_encode($payload), 'POST', $cookieFile, $timeout);
    if (($res['code'] ?? 0) !== 200 || empty($res['body']['success'])) {
        return ['error' => true, 'http' => $res['code'] ?? 0, 'body' => $res['body'] ?? []];
    }

    return ['error' => false, 'data' => $res['body']['data'] ?? []];
};

foreach (Cary360ScenarioCatalog::chatScenarios() as $scenario) {
    if (!phaseAllowed($phaseFilter, (int) $scenario['phase'])) {
        continue;
    }
    $id = (string) $scenario['id'];
    $msg = (string) $scenario['message'];
    $focus = Cary360Assertions::resolveFocus($msg, false, null, (bool) ($scenario['resolve_has_docs'] ?? false));
    $expectedFocus = (string) ($scenario['expect_focus'] ?? CaryContextFocus::GENERAL);
    if ($focus !== $expectedFocus) {
        record($results, $counts, $id . '_focus', 'chat_preflight', 'fail', "focus {$focus} ≠ {$expectedFocus}");
    } else {
        record($results, $counts, $id . '_focus', 'chat_preflight', 'pass');
    }

    $chatRes = $chatFn($postHeaders, $cookieFile, $convGeneral, $msg);
    if ($chatRes['error'] ?? true) {
        record($results, $counts, $id, 'chat', 'fail', 'HTTP chat ' . ($chatRes['http'] ?? '?'));
        continue;
    }
    $text = AiChatHelper::formatReadableChatText(
        AiChatHelper::sanitizeVisibleAssistantText((string) ($chatRes['data']['message']['content'] ?? '')),
    );
    $errors = Cary360Assertions::validateAssistantText(
        $text,
        (int) ($scenario['min_length'] ?? 8),
        $scenario['forbidden'] ?? [],
    );
    $readWarnings = AiChatHelper::readabilityWarnings($text);
    if ($errors !== []) {
        record($results, $counts, $id, 'chat', 'fail', implode('; ', $errors), ['preview' => $text]);
        continue;
    }
    if ($readWarnings !== []) {
        record($results, $counts, $id, 'chat', 'warn', implode('; ', $readWarnings), ['preview' => $text]);
        continue;
    }
    $soft = $scenario['soft_contains'] ?? [];
    if ($soft !== []) {
        $norm = mb_strtolower($text);
        $hit = false;
        foreach ($soft as $needle) {
            if (mb_strpos($norm, mb_strtolower($needle)) !== false) {
                $hit = true;
                break;
            }
        }
        if (!$hit && !empty($scenario['warn_if_no_contains'])) {
            record($results, $counts, $id, 'chat', 'warn', 'soft_contains manquant (données patient ?)', ['preview' => $text]);
            continue;
        }
        if (!$hit && empty($scenario['warn_if_no_contains'])) {
            record($results, $counts, $id, 'chat', 'warn', 'soft_contains manquant', ['preview' => $text]);
            continue;
        }
    }
    if (!empty($scenario['expect_draft'])) {
        $draft = $chatRes['data']['draft'] ?? ($chatRes['data']['message']['metadata']['draft'] ?? null);
        if (!$draft) {
            record($results, $counts, $id, 'chat', 'warn', 'pas de brouillon RDV (LLM variable)', ['preview' => $text]);
            continue;
        }
    }
    record($results, $counts, $id, 'chat', 'pass', '', ['preview' => $text]);
    usleep(400000);
}

// Pin / archive (phase 4 UX)
if (phaseAllowed($phaseFilter, 4)) {
    $patch = curlJson("{$baseUrl}/ai/conversations/{$convGeneral}", $postHeaders, json_encode([
        'is_pinned' => true,
        'is_archived' => false,
    ]), 'PATCH', $cookieFile);
    record($results, $counts, 'p4_pin_conversation', 'api_ux', ($patch['code'] ?? 0) === 200 ? 'pass' : 'fail');
}

doc_section:
// ─── Section D : documents PDF/image ───
echo "\n── D. Scénarios document (PDF + suivi + pièges) ──\n";

if ($skipChat || !phaseAllowed($phaseFilter, 3)) {
    record($results, $counts, 'doc_section', 'document', 'skip', 'phase 3 filtrée ou skip-chat');
    goto finish;
}

$docsRes = curlJson("{$baseUrl}/patient-documents", $auth);
$docList = $docsRes['body']['data'] ?? $docsRes['body']['documents'] ?? [];
if (!is_array($docList)) {
    $docList = [];
}
$medicalDocId = null;
$preferred = ['resultats', 'lab_results', 'ordonnance', 'other'];
usort($docList, static function ($a, $b) use ($preferred) {
    $ta = array_search($a['document_type'] ?? 'other', $preferred, true);
    $tb = array_search($b['document_type'] ?? 'other', $preferred, true);
    $ta = $ta === false ? 99 : $ta;
    $tb = $tb === false ? 99 : $tb;

    return $ta <=> $tb;
});
foreach ($docList as $doc) {
    if (!is_array($doc)) {
        continue;
    }
    $mime = (string) ($doc['mime_type'] ?? '');
    $name = (string) ($doc['file_name'] ?? '');
    if (str_contains($mime, 'pdf') || str_contains($mime, 'image') || preg_match('/\.(pdf|jpg|jpeg|png)$/i', $name)) {
        $medicalDocId = (string) ($doc['id'] ?? '');
        if ($medicalDocId !== '') {
            break;
        }
    }
}

if ($medicalDocId === null) {
    record($results, $counts, 'doc_no_file', 'document', 'skip', 'aucun PDF/image patient — uploader un bilan test');
    goto finish;
}

$createDoc = curlJson("{$baseUrl}/ai/conversations", $postHeaders, json_encode([
    'conversation_type' => 'lab_results',
    'custom_title' => '360 doc ' . date('Y-m-d H:i'),
]), 'POST', $cookieFile);
$convDoc = (string) ($createDoc['body']['data']['id'] ?? '');
if ($convDoc === '') {
    record($results, $counts, 'conv_doc', 'document', 'fail', 'conversation doc non créée');
    goto finish;
}

record($results, $counts, 'doc_selected', 'document', 'pass', "medical_document_id={$medicalDocId}");

foreach (Cary360ScenarioCatalog::documentScenarios() as $scenario) {
    $id = (string) $scenario['id'];
    $msg = (string) $scenario['message'];
    $extra = null;
    if (!empty($scenario['with_attachment'])) {
        $extra = ['medical_document_ids' => [$medicalDocId], '__timeout' => (int) ($scenario['timeout_extra'] ?? 120)];
    }
    $focus = Cary360Assertions::resolveFocus($msg, !empty($scenario['with_attachment']), null, true);
    $expectedFocus = (string) ($scenario['expect_focus'] ?? '');
    if ($focus !== $expectedFocus) {
        record($results, $counts, $id . '_focus', 'doc_preflight', 'fail', "focus {$focus} ≠ {$expectedFocus}");
    } else {
        record($results, $counts, $id . '_focus', 'doc_preflight', 'pass');
    }

    $chatRes = $chatFn($postHeaders, $cookieFile, $convDoc, $msg, $extra);
    if ($chatRes['error'] ?? true) {
        record($results, $counts, $id, 'document', 'fail', 'HTTP chat ' . ($chatRes['http'] ?? '?'));
        continue;
    }
    $text = AiChatHelper::formatReadableChatText(
        AiChatHelper::sanitizeVisibleAssistantText((string) ($chatRes['data']['message']['content'] ?? '')),
    );
    $errors = Cary360Assertions::validateAssistantText($text, (int) ($scenario['min_length'] ?? 8), $scenario['forbidden'] ?? []);
    if ($errors !== []) {
        record($results, $counts, $id, 'document', 'fail', implode('; ', $errors), ['preview' => $text]);
        continue;
    }
    $readWarnings = AiChatHelper::readabilityWarnings($text);
    if ($readWarnings !== []) {
        record($results, $counts, $id, 'document', 'warn', implode('; ', $readWarnings), ['preview' => $text]);
        continue;
    }
    $soft = $scenario['soft_contains'] ?? [];
    if ($soft !== []) {
        $norm = mb_strtolower($text);
        $hit = false;
        foreach ($soft as $needle) {
            if (mb_strpos($norm, mb_strtolower($needle)) !== false) {
                $hit = true;
                break;
            }
        }
        if (!$hit) {
            record($results, $counts, $id, 'document', !empty($scenario['warn_if_no_contains']) ? 'warn' : 'warn', 'soft_contains manquant', ['preview' => $text]);
            continue;
        }
    }
    record($results, $counts, $id, 'document', 'pass', '', ['preview' => $text]);
    usleep(500000);
}

finish:
@unlink($cookieFile);

echo "\n── Résumé ──\n";
echo sprintf("  PASS: %d | FAIL: %d | WARN: %d | SKIP: %d\n", $counts['pass'], $counts['fail'], $counts['warn'], $counts['skip']);

$summary = [
    'generated_at' => date('c'),
    'base_url' => $baseUrl,
    'patient_email' => $email,
    'counts' => $counts,
    'results' => $results,
];
file_put_contents($reportPath, json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Rapport JSON : {$reportPath}\n";

if ($counts['fail'] > 0) {
    echo "\n✘ ÉCHEC — corriger les scénarios FAIL ci-dessus.\n";
    exit(1);
}

if ($counts['warn'] > 0) {
    echo "\n⚠ SUCCÈS PARTIEL — des WARN (souvent données patient absentes ou LLM variable).\n";
    exit(0);
}

echo "\n✔ Test 360° Cary terminé avec succès.\n";
exit(0);
