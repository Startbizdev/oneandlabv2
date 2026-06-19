#!/usr/bin/env php
<?php
/**
 * Vérifie que Twilio est configuré (sans envoyer de SMS).
 * Usage: php scripts/test-twilio-config.php
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Twilio.php';

try {
    $twilio = new Twilio();
    $ref = new ReflectionClass($twilio);
    $fromProp = $ref->getProperty('from');
    $fromProp->setAccessible(true);
    $from = (string) $fromProp->getValue($twilio);
    echo "Twilio OK — expéditeur From={$from}\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Twilio FAIL: ' . $e->getMessage() . "\n");
    exit(1);
}
