#!/usr/bin/env php
<?php
/**
 * Cron (ex. toutes les 1–5 min) : envoie les notifications cloche patient
 * « préleveur en route » et « préleveur arrivé » pour les RDV prise de sang avec préleveur assigné.
 *
 * Usage: php backend/scripts/send-preleveur-patient-notifications.php
 */
$backendDir = dirname(__DIR__);
chdir($backendDir);

require_once $backendDir . '/lib/NotificationService.php';

try {
    $svc = new NotificationService();
    $r = $svc->processPreleveurPatientNotifications();
    fwrite(STDOUT, json_encode($r, JSON_UNESCAPED_UNICODE) . PHP_EOL);
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
exit(0);
