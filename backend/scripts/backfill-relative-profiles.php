<?php

declare(strict_types=1);

/**
 * Dossiers patient des proches existants (après la migration 126).
 *
 *   php scripts/backfill-relative-profiles.php            # simulation (par défaut) : affiche les compteurs
 *   php scripts/backfill-relative-profiles.php --apply    # crée les dossiers, ramène sous le titulaire (+ relative_id)
 *                                                         # les RDV saisis sur le dossier d'un proche, puis crée les liens
 *                                                         # soignant ↔ dossier du proche
 *
 * Idempotent. Les liens titulaire hérités des RDV de proches sont seulement comptés (overgranted_owner_links).
 */

require_once __DIR__ . '/../lib/RelativeProfileBackfill.php';

$apply = in_array('--apply', $argv, true);
if ($apply && in_array('--dry-run', $argv, true)) {
    fwrite(STDERR, "--apply et --dry-run sont incompatibles\n");
    exit(1);
}

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    ),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

try {
    $counts = RelativeProfileBackfill::run($pdo, $apply);
} catch (Throwable $e) {
    fwrite(STDERR, 'Backfill dossiers proches interrompu : ' . $e->getMessage() . "\n");
    exit(1);
}

echo json_encode(['mode' => $apply ? 'apply' : 'dry-run'] + $counts, JSON_PRETTY_PRINT) . "\n";
