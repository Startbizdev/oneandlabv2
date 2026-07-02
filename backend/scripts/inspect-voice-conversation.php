<?php

declare(strict_types=1);

require __DIR__ . '/../config/database.php';

$emailSearch = $argv[1] ?? 'chloeidel8@gmail.com';
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);

$hash = hash('sha256', strtolower(trim($emailSearch)));
$stmt = $pdo->prepare('SELECT id, role, email_hash, created_at, updated_at FROM profiles WHERE email_hash = ? LIMIT 1');
$stmt->execute([$hash]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    echo "User not found for email hash of: $emailSearch\n";
    exit(1);
}
$userId = (string) $user['id'];
echo "USER id=$userId role={$user['role']}\n\n";

$sessions = $pdo->prepare('
    SELECT vs.id, vs.ai_conversation_id, vs.started_at, vs.ended_at
    FROM voice_sessions vs
    WHERE vs.user_id = ?
    ORDER BY vs.started_at DESC
    LIMIT 3
');
$sessions->execute([$userId]);
$sessionRows = $sessions->fetchAll(PDO::FETCH_ASSOC);
foreach ($sessionRows as $s) {
    echo "=== VOICE SESSION {$s['id']} conv={$s['ai_conversation_id']} started={$s['started_at']} ===\n";
    $convId = $s['ai_conversation_id'];
    $msgs = $pdo->prepare('
        SELECT role, LEFT(content, 500) AS content, metadata_json, created_at
        FROM ai_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    ');
    $msgs->execute([$convId]);
    foreach ($msgs->fetchAll(PDO::FETCH_ASSOC) as $m) {
        echo "[{$m['created_at']}] {$m['role']}: {$m['content']}\n";
        if (!empty($m['metadata_json'])) {
            $meta = json_decode((string) $m['metadata_json'], true);
            if (is_array($meta['draft'] ?? null)) {
                $p = $meta['draft']['payload'] ?? [];
                echo "  DRAFT status={$meta['draft']['status']} step=" . ($p['booking_step'] ?? '?')
                    . " mode=" . ($p['patient_mode'] ?? '?')
                    . " missing=" . json_encode($meta['draft']['missing_fields'] ?? []) . "\n";
                echo "  payload identity: fn=" . ($p['first_name'] ?? $p['form_data']['first_name'] ?? '')
                    . " ln=" . ($p['last_name'] ?? $p['form_data']['last_name'] ?? '')
                    . " email=" . ($p['email'] ?? $p['form_data']['email'] ?? '') . "\n";
            }
        }
        echo "\n";
    }

    $vt = $pdo->prepare('
        SELECT vm.role, vt.text, vm.created_at
        FROM voice_messages vm
        JOIN voice_transcriptions vt ON vt.voice_message_id = vm.id
        WHERE vm.session_id = ?
        ORDER BY vm.created_at ASC
    ');
    $vt->execute([$s['id']]);
    echo "--- voice_transcriptions ---\n";
    foreach ($vt->fetchAll(PDO::FETCH_ASSOC) as $t) {
        echo "[{$t['created_at']}] {$t['role']}: {$t['text']}\n";
    }
    echo "\n";
}

$drafts = $pdo->prepare('
    SELECT id, status, missing_fields_json, LEFT(payload_json, 800) AS payload_preview, updated_at
    FROM ai_appointment_drafts
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT 5
');
$drafts->execute([$userId]);
echo "=== RECENT DRAFTS ===\n";
foreach ($drafts->fetchAll(PDO::FETCH_ASSOC) as $d) {
    echo "{$d['updated_at']} id={$d['id']} status={$d['status']} missing={$d['missing_fields_json']}\n";
    echo "  payload: {$d['payload_preview']}\n\n";
}
