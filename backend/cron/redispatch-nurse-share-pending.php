<?php

/**
 * Rediffusion zone (dispatchGeographic) pour les RDV nursing repassés en pending via partage lien confrère,
 * après N minutes sans prise en charge (défaut 30). Variable : NURSE_SHARE_REDISPATCH_MINUTES.
 *
 * Déploiement : ex. toutes les 5 minutes (crontab : cinq étoiles avec pas de 5 minutes, utilisateur www-data).
 * Voir backend/cron/setup-server-cron.sh
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

$minutesRaw = $_ENV['NURSE_SHARE_REDISPATCH_MINUTES'] ?? getenv('NURSE_SHARE_REDISPATCH_MINUTES');
$minutes = is_string($minutesRaw) ? (int) trim($minutesRaw) : (int) $minutesRaw;
if ($minutes < 1) {
    $minutes = 30;
}

$envActor = $_ENV['CRON_AUTO_COMPLETE_ACTOR_ID'] ?? getenv('CRON_AUTO_COMPLETE_ACTOR_ID');
$actorId = is_string($envActor) ? trim($envActor) : '';
if ($actorId !== '') {
    $chk = $db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
    $chk->execute([$actorId, 'super_admin']);
    if (!$chk->fetch()) {
        $actorId = '';
    }
}
if ($actorId === '') {
    $stmt = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1");
    $rowActor = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rowActor || empty($rowActor['id'])) {
        $logger->log(null, null, 'error', 'cron', null, [
            'script' => 'redispatch-nurse-share-pending',
            'message' => 'Aucun super_admin : historique dispatch partage impossible.',
        ]);
        exit(1);
    }
    $actorId = (string) $rowActor['id'];
}

$sql = "
    SELECT id FROM appointments
    WHERE type = 'nursing'
    AND status = 'pending'
    AND (assigned_nurse_id IS NULL OR assigned_nurse_id = '' OR TRIM(assigned_nurse_id) = '')
    AND nurse_share_released_at IS NOT NULL
    AND nurse_share_released_at <= DATE_SUB(NOW(), INTERVAL " . (int) $minutes . " MINUTE)
";
$sel = $db->query($sql);

while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
    $id = isset($row['id']) ? (string) $row['id'] : '';
    if ($id === '') {
        continue;
    }
    try {
        $appointmentModel->redispatchNursingShareReleasedToZone($id, $actorId);
    } catch (Throwable $e) {
        $logger->log(null, null, 'error', 'appointment', $id, [
            'script' => 'redispatch-nurse-share-pending',
            'message' => $e->getMessage(),
        ]);
    }
}

exit(0);
