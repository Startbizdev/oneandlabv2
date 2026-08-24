<?php

/**
 * Purge des access_logs HDS au-delà de la durée de rétention (défaut 12 mois).
 *
 * Variable : ACCESS_LOG_RETENTION_MONTHS (entier ≥ 6, défaut 12)
 * Déploiement : 1er de chaque mois 03:15 Europe/Paris — voir setup-server-cron.sh
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$retentionMonths = (int) ($_ENV['ACCESS_LOG_RETENTION_MONTHS'] ?? getenv('ACCESS_LOG_RETENTION_MONTHS') ?: 12);
if ($retentionMonths < 6) {
    $retentionMonths = 12;
}

$config = require __DIR__ . '/../config/database.php';

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$countStmt = $db->prepare(
    'SELECT COUNT(*) FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? MONTH)'
);
$countStmt->execute([$retentionMonths]);
$toPurge = (int) $countStmt->fetchColumn();

$totalStmt = $db->query('SELECT COUNT(*) FROM access_logs');
$totalBefore = (int) $totalStmt->fetchColumn();

if ($toPurge === 0) {
    error_log(sprintf(
        '[purge-access-logs] rien à purger (rétention %d mois, %d lignes en base)',
        $retentionMonths,
        $totalBefore
    ));
    exit(0);
}

$deleteStmt = $db->prepare(
    'DELETE FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? MONTH)'
);
$deleteStmt->execute([$retentionMonths]);
$deleted = $deleteStmt->rowCount();

$db->exec('OPTIMIZE TABLE access_logs');

$totalAfter = (int) $db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn();

error_log(sprintf(
    '[purge-access-logs] rétention %d mois — supprimé %d lignes (%d → %d)',
    $retentionMonths,
    $deleted,
    $totalBefore,
    $totalAfter
));

exit(0);
