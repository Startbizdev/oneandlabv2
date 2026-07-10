<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/AiBookingService.php';
require_once __DIR__ . '/../lib/ai/AiVoiceDraftReconciler.php';
require_once __DIR__ . '/../lib/ai/AiVoiceMessageSignals.php';
require_once __DIR__ . '/../lib/ai/UnifiedRdvValidator.php';
require_once __DIR__ . '/../lib/ai/AiBookingPayloadBuilder.php';
require_once __DIR__ . '/../lib/ai/AiDraftPayloadEnricher.php';

$emailSearch = $argv[1] ?? 'chloeidel8@gmail.com';
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);

$hash = hash('sha256', strtolower(trim($emailSearch)));
$stmt = $pdo->prepare('SELECT id, role FROM profiles WHERE email_hash = ? LIMIT 1');
$stmt->execute([$hash]);
$nurse = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$nurse) {
    fwrite(STDERR, "Nurse not found\n");
    exit(1);
}
$user = ['user_id' => (string) $nurse['id'], 'role' => (string) $nurse['role']];

echo "=== NURSE {$user['user_id']} role={$user['role']} ===\n\n";

echo "=== RECENT DRAFTS (nurse/pro) ===\n";
$drafts = $pdo->query("
    SELECT id, status, missing_fields_json, appointment_id, updated_at, LEFT(payload_json, 900) AS p
    FROM ai_appointment_drafts
    WHERE created_by_role IN ('nurse','pro')
    ORDER BY updated_at DESC
    LIMIT 10
");
foreach ($drafts->fetchAll(PDO::FETCH_ASSOC) as $d) {
    echo "{$d['updated_at']} id={$d['id']} status={$d['status']} apt={$d['appointment_id']}\n";
    echo "missing={$d['missing_fields_json']}\n";
    $p = json_decode((string) $d['p'], true);
    if (is_array($p)) {
        echo 'patient_mode=' . ($p['patient_mode'] ?? '?')
            . ' use_staff_email=' . (!empty($p['use_staff_contact_email']) ? '1' : '0')
            . ' email=' . ($p['email'] ?? $p['form_data']['email'] ?? '(empty)')
            . ' fn=' . ($p['first_name'] ?? $p['form_data']['first_name'] ?? '')
            . ' ln=' . ($p['last_name'] ?? $p['form_data']['last_name'] ?? '')
            . ' step=' . ($p['booking_step'] ?? '')
            . ' ord=' . ($p['ordonnance_status'] ?? '')
            . "\n";
    }
    echo "---\n";
}

echo "\n=== RECENT ai_booking_audits confirm failures ===\n";
$audits = $pdo->query("
    SELECT a.action, a.created_at, d.status, LEFT(d.payload_json, 400) p
    FROM ai_booking_audits a
    JOIN ai_appointment_drafts d ON d.id = a.draft_id
    WHERE a.action IN ('confirm','patch','create')
    ORDER BY a.created_at DESC
    LIMIT 15
");
foreach ($audits->fetchAll(PDO::FETCH_ASSOC) as $a) {
    echo "[{$a['created_at']}] {$a['action']} draft_status={$a['status']}\n";
}

echo "\n=== SIMULATION: patch sans email + pas de mail ===\n";
$booking = new AiBookingService($pdo);
$enricher = new AiDraftPayloadEnricher($pdo);

$basePayload = [
    'patient_mode' => 'new',
    'first_name' => 'Test',
    'last_name' => 'SansEmail',
    'type' => 'nursing',
    'category_id' => '8cd3ac87-1a34-11f1-af39-0eb6988ed0bd',
    'category_name' => 'Pansement-plaie',
    'booking_step' => 'recap',
    'ordonnance_status' => 'declined',
    'scheduled_at' => '2026-07-10 14:00:00',
    'form_data' => [
        'first_name' => 'Test',
        'last_name' => 'SansEmail',
        'availability' => '{"type":"custom","range":[14,15]}',
        'scheduled_at' => '2026-07-10 14:00:00',
    ],
    'address' => [
        'label' => '10 Rue de Rome, 13006 Marseille, France',
        'lat' => 43.294876,
        'lng' => 5.3784915,
        'city' => 'Marseille',
        'postal_code' => '13006',
    ],
];

// Cas A: sans flag staff contact
$payloadA = $enricher->enrich($basePayload, $user, 'pas de mail');
$valA = UnifiedRdvValidator::validateDraft($payloadA, $user['role'], true);
echo "Cas A (pas de mail, sans flag): valid=" . ($valA['valid'] ? 'yes' : 'no')
    . ' missing=' . json_encode($valA['missing'])
    . ' email=' . ($payloadA['email'] ?? $payloadA['form_data']['email'] ?? '(empty)') . "\n";

// Cas B: avec flag use_staff_contact_email
$payloadB = $enricher->enrich(array_merge($basePayload, ['use_staff_contact_email' => true, 'use_staff_contact_phone' => true]), $user, 'pas de mail');
$valB = UnifiedRdvValidator::validateDraft($payloadB, $user['role'], true);
echo "Cas B (use_staff_contact_email): valid=" . ($valB['valid'] ? 'yes' : 'no')
    . ' missing=' . json_encode($valB['missing'])
    . ' email=' . ($payloadB['email'] ?? $payloadB['form_data']['email'] ?? '(empty)') . "\n";

$signals = AiVoiceMessageSignals::buildDraftPatch('pas de mail pas de tel', $user, null);
echo "Cas C (voice signals): " . json_encode($signals) . "\n";

echo "\n=== SIMULATION confirmDraft SANS email ni flag (nouveau patient) ===\n";
try {
    $payloadNew = $basePayload;
    $payloadNew['first_name'] = 'Jean';
    $payloadNew['last_name'] = 'DupontSansMail';
    $payloadNew['form_data']['first_name'] = 'Jean';
    $payloadNew['form_data']['last_name'] = 'DupontSansMail';
    unset($payloadNew['email'], $payloadNew['form_data']['email']);
    $payloadNew['scheduled_at'] = '2026-07-10 16:00:00';
    $payloadNew['form_data']['scheduled_at'] = '2026-07-10 16:00:00';
    $payloadNew['form_data']['availability'] = '{"type":"custom","range":[16,17]}';

    $draftNew = $booking->createDraft($user, ['conversation_id' => null, 'payload' => $payloadNew]);
    echo "Draft new patient id={$draftNew['id']} status={$draftNew['status']}\n";
    if (($draftNew['status'] ?? '') === 'ready') {
        $confirmedNew = $booking->confirmDraft((string) $draftNew['id'], $user);
        echo 'SUCCESS apt=' . ($confirmedNew['appointment_id'] ?? '') . ' email=' . ($confirmedNew['draft']['payload']['email'] ?? '') . "\n";
    }
} catch (Throwable $e) {
    echo 'NEW PATIENT NO EMAIL FAILED: ' . $e->getMessage() . "\n";
}

echo "\n=== BUG voice: pas de mail parse identite ===\n";
$bugPatch = AiVoiceMessageSignals::buildDraftPatch('pas de mail pas de tel', $user, null);
echo json_encode($bugPatch, JSON_UNESCAPED_UNICODE) . "\n";
