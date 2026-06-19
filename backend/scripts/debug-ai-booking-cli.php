#!/usr/bin/env php
<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/AiBookingService.php';

$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$db = ai_db();

// Resolve patient user id via OTP helper output
$backendDir = dirname(__DIR__);
exec('cd ' . escapeshellarg($backendDir) . ' && php get-last-otp.php ' . escapeshellarg($email) . ' 2>&1', $o);
$t = implode("\n", $o);
preg_match('/User ID:\s*(\S+)/', $t, $m);
$userId = trim($m[1] ?? '');
if ($userId === '') {
    fwrite(STDERR, "User ID not found for $email\n");
    exit(1);
}

$user = ['user_id' => $userId, 'role' => 'patient'];

try {
    $service = new AiBookingService();
    $draft = $service->createDraft($user, [
        'payload' => [
            'type' => 'blood_test',
            'form_type' => 'blood_test',
            'patient_mode' => 'self',
            'patient_id' => $userId,
        ],
    ]);
    echo json_encode(['success' => true, 'draft' => $draft], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n");
    fwrite(STDERR, $e->getTraceAsString() . "\n");
    exit(1);
}
