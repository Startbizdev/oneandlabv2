<?php

/**
 * Clôture automatique des rendez-vous au jour calendaire suivant la date prévue (fuseau Europe/Paris).
 *
 * Déploiement : exécuter 1× par jour après minuit Paris (ex. crontab sur le serveur ou scheduler ECS).
 * Exemple crontab (serveur en Europe/Paris) : 5 0 * * * php /var/www/oneandlab/backend/cron/auto-complete-appointments.php
 * Si le serveur est en UTC, viser ~00:05 ou 00:10 UTC pour rester après minuit Paris toute l’année, ou fixer TZ=Europe/Paris pour ce job.
 *
 * Règle : chaque ligne `appointments` avec status confirmed / inProgress / planned dont la date (scheduled_at,
 * interprétée comme dans le reste du backend puis convertie en Europe/Paris) est strictement avant « aujourd’hui »
 * à Paris est passée en completed via Appointment::updateStatus (historique, notifications, comme un admin).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../models/Appointment.php';

$config = require __DIR__ . '/../config/database.php';

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$logger = new Logger();
$appointmentModel = new Appointment();

$tzParis = new DateTimeZone('Europe/Paris');
$todayParis = new DateTimeImmutable('today', $tzParis);
$todayYmd = $todayParis->format('Y-m-d');

$envActor = $_ENV['CRON_AUTO_COMPLETE_ACTOR_ID'] ?? getenv('CRON_AUTO_COMPLETE_ACTOR_ID');
$actorId = is_string($envActor) ? trim($envActor) : '';
if ($actorId !== '') {
    $chk = $db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
    $chk->execute([$actorId, 'super_admin']);
    if (!$chk->fetch()) {
        $logger->log(null, null, 'error', 'cron', null, [
            'script' => 'auto-complete-appointments',
            'message' => 'CRON_AUTO_COMPLETE_ACTOR_ID invalide ou profil non super_admin — utilisation du premier super_admin en base.',
        ]);
        $actorId = '';
    }
}

if ($actorId === '') {
    $stmt = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1");
    $rowActor = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rowActor || empty($rowActor['id'])) {
        $logger->log(null, null, 'error', 'cron', null, [
            'script' => 'auto-complete-appointments',
            'message' => 'Aucun profil super_admin : clôture automatique annulée.',
        ]);
        exit(1);
    }
    $actorId = (string) $rowActor['id'];
}

$note = 'Clôture automatique (jour suivant la date du rendez-vous)';

$sel = $db->query(
    "SELECT id, scheduled_at FROM appointments
     WHERE status IN ('confirmed', 'inProgress', 'planned')
     AND scheduled_at IS NOT NULL"
);

while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
    $id = isset($row['id']) ? (string) $row['id'] : '';
    if ($id === '' || empty($row['scheduled_at'])) {
        continue;
    }
    try {
        $sched = new DateTimeImmutable($row['scheduled_at']);
        $schedParis = $sched->setTimezone($tzParis);
    } catch (Throwable $e) {
        $logger->log(null, null, 'error', 'appointment', $id, [
            'script' => 'auto-complete-appointments',
            'message' => 'scheduled_at illisible : ' . $e->getMessage(),
        ]);
        continue;
    }
    if ($schedParis->format('Y-m-d') >= $todayYmd) {
        continue;
    }
    try {
        $appointmentModel->updateStatus($id, 'completed', $actorId, 'super_admin', $note);
    } catch (Throwable $e) {
        $logger->log(null, null, 'error', 'appointment', $id, [
            'script' => 'auto-complete-appointments',
            'message' => $e->getMessage(),
        ]);
    }
}

exit(0);
