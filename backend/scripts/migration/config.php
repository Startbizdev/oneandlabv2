<?php

/**
 * Configuration pour la migration legacy
 * Charge .env et expose les chemins et clés nécessaires
 */

$baseDir = dirname(__DIR__, 2);

$envFiles = [
    $baseDir . '/../.env',
    $baseDir . '/../../.env',
    getenv('HOME') . '/.env.migration',
];

foreach ($envFiles as $f) {
    if (file_exists($f)) {
        $lines = @file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') === false) continue;
                list($name, $value) = explode('=', $line, 2);
                $key = trim($name);
                $val = trim($value);
                $_ENV[$key] = $val;
                putenv("$key=$val");
            }
        }
        break;
    }
}

return [
    'db' => [
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'port' => (int) ($_ENV['DB_PORT'] ?? 3306),
        'database' => $_ENV['DB_NAME'] ?? 'oneandlab',
        'username' => $_ENV['DB_USER'] ?? 'root',
        'password' => $_ENV['DB_PASS'] ?? '',
    ],
    'legacy_encryption_key' => $_ENV['LEGACY_ENCRYPTION_KEY'] ?? $_ENV['ENCRYPTION_KEY'] ?? '',
    'backend_kek_hex' => $_ENV['BACKEND_KEK_HEX'] ?? '',
    'uploads_path' => $baseDir . '/uploads/medical/',
];
