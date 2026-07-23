#!/usr/bin/env php
<?php
/**
 * Envoie un SMS test via Brevo (ou Twilio si Brevo absent).
 * Usage: php scripts/test-sms-send.php +33644661748 "Message test"
 */
if ($argc < 2) {
    fwrite(STDERR, "Usage: php scripts/test-sms-send.php <numéro> [message]\n");
    exit(1);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/SmsSender.php';

$to = (string) $argv[1];
$message = (string) ($argv[2] ?? 'Test Cary — SMS Brevo OK');

$sms = SmsSender::tryCreate();
if ($sms === null) {
    fwrite(STDERR, "SMS FAIL: aucun provider configuré\n");
    exit(1);
}

try {
    $result = $sms->sendSMS($to, $message);
    $provider = SmsSender::activeProviderLabel();
    $refId = $result['messageId'] ?? $result['sid'] ?? 'ok';
    echo "SMS envoyé via {$provider} — ref={$refId}\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'SMS FAIL: ' . $e->getMessage() . "\n");
    exit(1);
}
