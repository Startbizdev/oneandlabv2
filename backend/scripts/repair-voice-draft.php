<?php
declare(strict_types=1);

require __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/AiBookingService.php';
require_once __DIR__ . '/../lib/ai/AiVoiceDraftReconciler.php';

$draftId = $argv[1] ?? '';
$userId = $argv[2] ?? '31578932-0ee7-4bc7-b294-9347d229a311';
if ($draftId === '') {
    fwrite(STDERR, "usage: repair-voice-draft.php <draft_id> [user_id]\n");
    exit(1);
}

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);

$stmt = $pdo->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
$stmt->execute([$userId]);
$role = (string) ($stmt->fetchColumn() ?: 'nurse');
$user = ['user_id' => $userId, 'role' => $role];

$booking = new AiBookingService($pdo);
$draft = $booking->getDraft($draftId, $userId);
if (!$draft) {
    echo "draft not found\n";
    exit(1);
}

$payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
$patch = AiVoiceDraftReconciler::buildPatch($payload, 'Non.', $user);
if ($patch === []) {
    $patch = AiVoiceDraftReconciler::buildPatch($payload, 'alessandro turco', $user);
}
$updated = $booking->patchDraft($draftId, $user, $patch, null);
echo json_encode([
    'id' => $draftId,
    'status' => $updated['status'] ?? null,
    'missing' => $updated['missing_fields'] ?? [],
    'booking_step' => $updated['payload']['booking_step'] ?? null,
    'ordonnance_status' => $updated['payload']['ordonnance_status'] ?? null,
    'first_name' => $updated['payload']['first_name'] ?? null,
    'patient_mode' => $updated['payload']['patient_mode'] ?? null,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
