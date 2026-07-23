#!/usr/bin/env php
<?php
/**
 * Vérifie la config SMS (Brevo prioritaire).
 * Usage: php scripts/test-sms-config.php
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/SmsSender.php';

if (BrevoSms::hasSmtpOnlyKey()) {
    fwrite(STDERR, "SMS INFO: SMTP_PASS est une clé SMTP Brevo (xsmtpsib), pas la clé API REST.\n");
    fwrite(STDERR, "Brevo → SMTP & API → onglet « API keys » → générer une clé (xkeysib-…) → BREVO_API_KEY dans .env\n");
}

$sms = SmsSender::tryCreate();
if ($sms === null) {
    fwrite(STDERR, "SMS FAIL: aucun provider configuré (BREVO_API_KEY ou Twilio)\n");
    exit(1);
}

$provider = SmsSender::activeProviderLabel();
if ($sms instanceof BrevoSms) {
    echo "SMS OK — provider=brevo sender={$sms->getSender()} brand=" . BrevoSms::resolveSenderId() . "\n";
    exit(0);
}

echo "SMS OK — provider={$provider} (repli Twilio)\n";
exit(0);
