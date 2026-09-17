<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/RepairCollisions.php';

function usage(): void
{
    $text = <<<'TXT'
Usage:
  php backend/scripts/repair-collisions.php
  php backend/scripts/repair-collisions.php --audit
  php backend/scripts/repair-collisions.php --dry-run --manifest=<path>
  php backend/scripts/repair-collisions.php --apply --manifest=<path> --confirm=APPLY-<sha256>

Audit est le mode read-only par défaut.
Apply exige en plus REPAIR_COLLISIONS_APPLY=YES-<sha256>.
Le SHA-256 porte sur les octets exacts du fichier manifeste.
TXT;
    fwrite(STDERR, $text . PHP_EOL);
}

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, json_encode([
        'ok' => false,
        'error' => $message,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit($code);
}

$options = getopt('', ['audit', 'dry-run', 'apply', 'manifest:', 'confirm:', 'backup-dir:', 'help']);
if (isset($options['help'])) {
    usage();
    exit(0);
}

$modeFlags = array_filter([
    'audit' => isset($options['audit']),
    'dry-run' => isset($options['dry-run']),
    'apply' => isset($options['apply']),
]);
if (count($modeFlags) > 1) {
    fail('Choisir un seul mode parmi --audit, --dry-run et --apply.', 2);
}
$mode = array_key_first($modeFlags) ?? 'audit';

$manifest = null;
$manifestRaw = null;
$manifestHash = null;
if ($mode !== 'audit') {
    $manifestPath = $options['manifest'] ?? null;
    if (!is_string($manifestPath) || $manifestPath === '' || !is_file($manifestPath) || !is_readable($manifestPath)) {
        fail('Un fichier lisible --manifest est requis.', 2);
    }
    $manifestRaw = file_get_contents($manifestPath);
    if ($manifestRaw === false) {
        fail('Lecture du manifeste impossible.', 2);
    }
    try {
        $manifest = json_decode($manifestRaw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        fail('Le manifeste n’est pas un JSON valide.', 2);
    }
    if (!is_array($manifest)) {
        fail('Le manifeste doit être un objet JSON.', 2);
    }
    $manifestHash = RepairCollisions::manifestHash($manifestRaw);
    $validationErrors = RepairCollisions::validateManifest($manifest);
    if ($validationErrors !== []) {
        fail('Manifeste refusé: ' . implode('; ', $validationErrors), 2);
    }
}

if ($mode === 'apply') {
    $confirmationErrors = RepairCollisions::confirmationErrors(
        (string) $manifestHash,
        is_string($options['confirm'] ?? null) ? $options['confirm'] : null,
        getenv('REPAIR_COLLISIONS_APPLY') !== false ? getenv('REPAIR_COLLISIONS_APPLY') : null
    );
    if ($confirmationErrors !== []) {
        fail(
            'Apply refusé. Utiliser --confirm=APPLY-<sha256> et REPAIR_COLLISIONS_APPLY=YES-<sha256>.',
            3
        );
    }
}

try {
    $config = require __DIR__ . '/../config/database.php';
    $db = new PDO(
        sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        ),
        $config['username'],
        $config['password'],
        $config['options']
    );
    $service = new RepairCollisions(
        $db,
        new Crypto(),
        is_string($options['backup-dir'] ?? null) ? $options['backup-dir'] : null
    );

    if ($mode === 'audit') {
        $result = $service->audit();
    } elseif ($mode === 'dry-run') {
        $result = $service->dryRun($manifest);
        $result['manifest_hash'] = $manifestHash;
        $result['apply_flag_required'] = 'APPLY-' . $manifestHash;
        $result['apply_env_required'] = 'YES-' . $manifestHash;
    } else {
        $result = $service->apply(
            $manifest,
            (string) $manifestHash,
            is_string($options['confirm'] ?? null) ? $options['confirm'] : null,
            getenv('REPAIR_COLLISIONS_APPLY') !== false ? getenv('REPAIR_COLLISIONS_APPLY') : null
        );
    }
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $error) {
    // Ne jamais inclure données déchiffrées, paramètres SQL ou contenu du manifeste dans les erreurs CLI.
    fail(get_class($error) . ': ' . $error->getMessage(), 1);
}
