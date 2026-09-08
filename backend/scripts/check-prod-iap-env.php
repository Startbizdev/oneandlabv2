<?php
declare(strict_types=1);

$envPath = '/var/www/oneandlab/.env';
$vars = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k] = explode('=', $line, 2);
        if (str_starts_with($k, 'APPLE_IAP') || str_starts_with($k, 'IAP_')) {
            $vars[] = trim($k);
        }
    }
}

$p8 = [];
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator('/var/www/oneandlab', FilesystemIterator::SKIP_DOTS)
);
foreach ($it as $file) {
    if ($file->isFile() && str_ends_with($file->getFilename(), '.p8')) {
        $p8[] = $file->getPathname();
    }
}

echo json_encode([
    'iap_env_keys' => $vars,
    'p8_files' => $p8,
    'keys_dir_exists' => is_dir('/var/www/oneandlab/backend/keys'),
], JSON_PRETTY_PRINT) . "\n";
