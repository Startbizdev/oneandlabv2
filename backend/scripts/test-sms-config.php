#!/usr/bin/env php
<?php
/**
 * Vérifie la config SMS (Brevo prioritaire).
 * Usage: php scripts/test-sms-config.php
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/SmsSender.php';

$smtpPass = trim((string) ($_ENV['SMTP_PASS'] ?? ''));
if (BrevoSms::resolveApiKey() === null && preg_match('/^xsmtpsib-/i', $smtpPass)) {
    fwrite(STDERR, "SMS INFO: SMTP_PASS est une clé SMTP (xsmtpsib), pas REST.\n");
    fwrite(STDERR, "Ajoutez BREVO_API_KEY=xkeysib-… dans .env (Brevo → SMTP & API → Clés API).\n");
}

$sms = SmsSender::tryCreate();
if ($sms === null) {
    fwrite(STDERR, "SMS FAIL: aucun provider configuré (BREVO_API_KEY ou Twilio)\n");
    exit(1);
}

$provider = SmsSender::activeProviderLabel();
if ($sms instanceof BrevoSms) {
    echo "SMS OK — provider=brevo sender={$sms->getSender()}\n";
    exit(0);
}

echo "SMS OK — provider={$provider} (repli Twilio — ajoutez BREVO_API_KEY pour Brevo)\n";
exit(0);
