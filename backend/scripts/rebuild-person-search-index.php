<?php

declare(strict_types=1);

/**
 * Crée la table d'index (migration 135, idempotente) puis (ré)indexe tous les comptes et proches.
 * Usage : php scripts/rebuild-person-search-index.php
 * À relancer après une rotation de KEK (les empreintes dépendent d'une clé dérivée de la KEK).
 */

require_once __DIR__ . '/../lib/search/PersonSearchIndex.php';

$config = require __DIR__ . '/../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$migration = dirname(__DIR__, 2) . '/database/migrations/135_person_search_tokens.sql';
$sql = file_get_contents($migration);
if ($sql === false) {
    fwrite(STDERR, "Migration 135 introuvable\n");
    exit(1);
}
$db->exec($sql);

$index = new PersonSearchIndex($db);
$started = microtime(true);
$profiles = 0;
$relatives = 0;
$errors = 0;

foreach ($db->query('SELECT id FROM profiles')->fetchAll(PDO::FETCH_COLUMN) as $id) {
    try {
        $index->reindexProfile((string) $id);
        $profiles++;
    } catch (Throwable $e) {
        $errors++;
        fwrite(STDERR, "profil {$id}: {$e->getMessage()}\n");
    }
}
foreach ($db->query('SELECT id FROM patient_relatives')->fetchAll(PDO::FETCH_COLUMN) as $id) {
    try {
        $index->reindexRelative((string) $id);
        $relatives++;
    } catch (Throwable $e) {
        $errors++;
        fwrite(STDERR, "proche {$id}: {$e->getMessage()}\n");
    }
}
// Profils ou proches supprimés : retirés de l'index.
$db->exec("DELETE t FROM person_search_tokens t LEFT JOIN profiles p ON p.id = t.subject_id
           WHERE t.subject_type = 'profile' AND p.id IS NULL");
$db->exec("DELETE t FROM person_search_tokens t LEFT JOIN patient_relatives r ON r.id = t.subject_id
           WHERE t.subject_type = 'relative' AND r.id IS NULL");

$tokens = (int) $db->query('SELECT COUNT(*) FROM person_search_tokens')->fetchColumn();
printf(
    "Index recherche : %d comptes, %d proches, %d empreintes, %d erreurs, %.1fs\n",
    $profiles,
    $relatives,
    $tokens,
    $errors,
    microtime(true) - $started
);
exit($errors > 0 ? 1 : 0);
