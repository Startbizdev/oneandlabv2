<?php

/**
 * Configuration de la connexion MySQL
 */

// Charger .env depuis la racine du projet si pas déjà fait
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile) && !isset($_ENV['DB_HOST'])) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
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
}

$dbEnv = static function (string $key, $default) {
    if (isset($_ENV[$key])) {
        return $_ENV[$key];
    }
    $value = getenv($key);
    return $value !== false ? $value : $default;
};

return [
    'host' => $dbEnv('DB_HOST', 'localhost'),
    'port' => $dbEnv('DB_PORT', 3306),
    'database' => $dbEnv('DB_NAME', 'oneandlab'),
    'username' => $dbEnv('DB_USER', 'root'),
    'password' => $dbEnv('DB_PASS', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];




