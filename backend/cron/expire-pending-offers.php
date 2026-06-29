<?php

/**
 * Expire les RDV pending non acceptés après N h depuis la création (défaut 2).
 * Variable : PENDING_OFFER_EXPIRY_HOURS
 *
 * Déploiement : toutes les 10 min (aligné polling dashboard).
 * Voir backend/cron/setup-server-cron.sh
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/PendingOfferExpiry.php';
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

$hours = PendingOfferExpiry::ttlHours();
$note = "Expiré automatiquement : aucun professionnel disponible sous {$hours} h";

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
            'script' => 'expire-pending-offers',
            'message' => 'Aucun super_admin : expiration pending impossible.',
        ]);
        exit(1);
    }
    $actorId = (string) $rowActor['id'];
}

$readySql = PendingOfferExpiry::sqlReadyToExpire('a');
$sel = $db->query(
    "SELECT id, type, assigned_nurse_id, assigned_lab_id, created_at
     FROM appointments a
     WHERE a.status = 'pending'
     AND (
         (a.type = 'nursing' AND (a.assigned_nurse_id IS NULL OR TRIM(a.assigned_nurse_id) = ''))
         OR
         (a.type = 'blood_test' AND (a.assigned_lab_id IS NULL OR TRIM(a.assigned_lab_id) = ''))
     )
     AND {$readySql}"
);

$expired = 0;
while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
    $id = isset($row['id']) ? (string) $row['id'] : '';
    if ($id === '' || !PendingOfferExpiry::isUnassignedPendingRow($row)) {
        continue;
    }
    try {
        $appointmentModel->updateStatus($id, 'expired', $actorId, 'super_admin', $note);
        $expired++;
    } catch (Throwable $e) {
        $logger->log(null, null, 'error', 'appointment', $id, [
            'script' => 'expire-pending-offers',
            'message' => $e->getMessage(),
        ]);
    }
}

if ($expired > 0) {
    $logger->log($actorId, 'super_admin', 'cron_expire_pending', 'appointment', null, [
        'script' => 'expire-pending-offers',
        'count' => $expired,
        'ttl_hours' => $hours,
    ]);
}

exit(0);
