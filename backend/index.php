<?php

/**
 * Routeur principal pour l'API Cary V2
 * 
 * Ce fichier sert d'entrée unique pour toutes les requêtes API.
 * Il route automatiquement les requêtes vers les fichiers appropriés dans /api/
 * 
 * IMPORTANT: Pour démarrer le serveur, utilisez:
 *   cd backend
 *   php -S localhost:8000 index.php
 * 
 * NE PAS utiliser: php -S localhost:8000 -t .
 * Car cela empêche le routeur de fonctionner.
 */

// Charger les variables d'environnement (racine du projet)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

require_once __DIR__ . '/lib/ApiRouteResolver.php';

// Obtenir le chemin de la requête
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = parse_url($requestUri, PHP_URL_PATH);

// Retirer les query parameters pour le routage
$queryString = parse_url($requestUri, PHP_URL_QUERY);
if ($queryString) {
    parse_str($queryString, $queryParams);
    $_GET = array_merge($_GET ?? [], $queryParams);
}

// Chemin vers le dossier API
$apiDir = __DIR__ . '/api';

// Retirer le préfixe /api si présent
$path = trim((string) $requestPath, '/');
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
} elseif ($path === 'api') {
    $path = '';
}
$path = trim($path, '/');

// Chemin vide : accueil api/index.php ; sinon même résolution que api/index.php (prod)
$route = $path === ''
    ? ['file' => $apiDir . '/index.php', 'params' => []]
    : ApiRouteResolver::resolve($path, $apiDir);

if (!$route) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Route non trouvée',
        'path' => $requestPath
    ]);
    exit;
}

// Injecter les paramètres dynamiques dans $_GET
foreach ($route['params'] as $key => $value) {
    $_GET[$key] = $value;
}

// Charger le fichier de route trouvé
require $route['file'];
