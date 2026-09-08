<?php
/**
 * Audit Apple IAP credentials (local or prod) — n'affiche pas les secrets.
 * Usage local : php backend/scripts/audit-apple-iap-credentials.php
 * Usage prod  : php /tmp/audit-apple-iap-credentials.php
 */
declare(strict_types=1);

function mask(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '(vide)';
    }
    $len = strlen($value);
    if ($len <= 8) {
        return str_repeat('*', $len);
    }

    return substr($value, 0, 4) . '…' . substr($value, -4) . " ($len chars)";
}

function fileInfo(?string $path): array
{
    if (!$path || !file_exists($path)) {
        return ['exists' => false, 'path' => $path];
    }

    return [
        'exists' => true,
        'path' => $path,
        'size' => filesize($path),
        'readable' => is_readable($path),
    ];
}

$root = dirname(__DIR__, 2);
$envFile = $root . '/.env';
if (!file_exists($envFile)) {
    $envFile = '/var/www/oneandlab/.env';
}

$envVars = [];
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        if (str_starts_with($k, 'APPLE_IAP') || str_starts_with($k, 'IAP_')) {
            $envVars[$k] = trim($v);
        }
    }
}

$keyPath = $envVars['APPLE_IAP_PRIVATE_KEY_PATH'] ?? '';
$keyInline = $envVars['APPLE_IAP_PRIVATE_KEY'] ?? '';

$searchRoots = array_unique(array_filter([
    $root,
    $root . '/backend/keys',
    dirname($root),
    is_dir('/var/www/oneandlab') ? '/var/www/oneandlab' : null,
    is_dir('/var/www/oneandlab/backend/keys') ? '/var/www/oneandlab/backend/keys' : null,
]));

$p8Files = [];
foreach ($searchRoots as $dir) {
    if (!is_dir($dir)) {
        continue;
    }
    try {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $name = $file->getFilename();
            if (str_ends_with(strtolower($name), '.p8') || stripos($name, 'AuthKey') !== false) {
                $p8Files[] = $file->getPathname();
            }
        }
    } catch (Throwable $e) {
        // skip unreadable trees
    }
}
$p8Files = array_values(array_unique($p8Files));

$report = [
    'env_file' => $envFile,
    'env_file_exists' => file_exists($envFile),
    'iap_env' => [],
    'key_path_info' => fileInfo($keyPath !== '' ? $keyPath : null),
    'inline_key_set' => $keyInline !== '',
    'inline_key_length' => $keyInline !== '' ? strlen($keyInline) : 0,
    'p8_files_found' => array_map(fn ($p) => [
        'path' => $p,
        'size' => @filesize($p),
        'readable' => is_readable($p),
    ], $p8Files),
];

foreach ($envVars as $k => $v) {
    if ($k === 'APPLE_IAP_PRIVATE_KEY') {
        $report['iap_env'][$k] = $v !== '' ? '(défini, ' . strlen($v) . ' chars)' : '(vide)';
        continue;
    }
    $report['iap_env'][$k] = mask($v);
}

// Test chargement config PHP
try {
    $iap = require dirname(__DIR__) . '/config/iap.php';
    $report['php_config'] = [
        'issuer_id_set' => !empty($iap['apple']['issuer_id']),
        'key_id_set' => !empty($iap['apple']['key_id']),
        'private_key_set' => !empty($iap['apple']['private_key']),
        'bundle_id' => $iap['apple']['bundle_id'] ?? null,
        'environment' => $iap['apple']['environment'] ?? null,
        'allow_unverified' => $iap['allow_unverified'] ?? null,
    ];
} catch (Throwable $e) {
    $report['php_config_error'] = $e->getMessage();
}

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
