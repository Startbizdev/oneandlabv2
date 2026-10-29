<?php

/**
 * Durées de conservation RGPD (registre des traitements) : conversations de l'assistant après 1 an,
 * comptes sans soin inactifs depuis 3 ans (avertis 30 jours avant), dossiers de soins archivés après 5 ans
 * sans activité puis supprimés après 20 ans.
 *
 * Usage : php data-retention.php            → simulation, affiche ce qui serait fait
 *         php data-retention.php --apply    → applique
 * Déploiement : le 3 de chaque mois, 05:00 Europe/Paris (scripts/maintenance/install-cary-maintenance.sh).
 */

declare(strict_types=1);

$config = require __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/users/DataRetentionService.php';

$apply = in_array('--apply', $argv, true);
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

$service = new DataRetentionService(
    $db,
    new User($db),
    new Email(),
    new AccountDeletionService($db, new User($db), new Logger($db), new Email(), (require __DIR__ . '/../config/app.php')['contact_email']),
);
$result = $service->run(new DateTimeImmutable('now', new DateTimeZone('Europe/Paris')), $apply);

printf(
    "[data-retention] %s %s — conversations assistant : %d ; comptes sans soin avertis : %d (échecs d'envoi : %d), supprimés : %d ; dossiers archivés : %d, réactivés : %d, supprimés après 20 ans : %d ; suppressions reportées : %d\n",
    date('c'),
    $apply ? 'APPLIQUÉ' : 'SIMULATION',
    $result['assistant_conversations'],
    $result['warned'],
    $result['warn_failed'],
    $result['deleted_accounts'],
    $result['archived'],
    $result['restored'],
    $result['purged_dossiers'],
    $result['deletion_skipped']
);
