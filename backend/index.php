<?php

/**
 * Routeur principal pour l'API OneAndLab V2
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

// Fonction pour normaliser le chemin
function normalizePath($path) {
    return trim($path, '/');
}

// Fonction pour trouver le fichier de route correspondant
function findRouteFile($requestPath, $apiDir) {
    // Normaliser le chemin
    $path = normalizePath($requestPath);
    
    // Retirer le préfixe /api si présent
    if (strpos($path, 'api/') === 0) {
        $path = substr($path, 4);
    } elseif ($path === 'api') {
        $path = '';
    }
    $path = normalizePath($path);
    
    // Si le chemin est vide, chercher api/index.php
    if (empty($path)) {
        $rootIndexFile = $apiDir . '/index.php';
        if (file_exists($rootIndexFile)) {
            return [
                'file' => $rootIndexFile,
                'params' => []
            ];
        }
        return null;
    }
    
    $pathParts = explode('/', $path);
    $basePath = $apiDir;
    
    // Stratégie 1: Chercher le fichier exact (ex: auth/request-otp.php)
    $exactFile = $basePath . '/' . $path . '.php';
    // #region agent log
    // #endregion
    if (file_exists($exactFile)) {
        return [
            'file' => $exactFile,
            'params' => []
        ];
    }
    
    // Stratégie 2: Chercher avec index.php à la fin (ex: availability-settings/index.php)
    $indexFile = $basePath . '/' . $path . '/index.php';
    if (file_exists($indexFile)) {
        return [
            'file' => $indexFile,
            'params' => []
        ];
    }
    
    // Stratégie 3: Chercher avec un segment dynamique [id] ou [slug] à la fin
    // Ex: /appointments/123 -> appointments/[id].php
    // Ex: /public/nurse/joopix-studio -> public/nurse/[slug].php
    if (count($pathParts) >= 2) {
        $lastSegment = array_pop($pathParts);
        $basePathWithId = $basePath . '/' . implode('/', $pathParts) . '/[id]';
        $basePathWithSlug = $basePath . '/' . implode('/', $pathParts) . '/[slug]';
        
        // Vérifier si [id].php existe
        $idFile = $basePathWithId . '.php';
        // Vérifier si [slug].php existe
        $slugFile = $basePathWithSlug . '.php';
        
        // #region agent log - FIX: Check both [id] and [slug]
        // #endregion
        
        if (file_exists($idFile)) {
            return [
                'file' => $idFile,
                'params' => ['id' => $lastSegment]
            ];
        }
        
        // Vérifier si [slug].php existe
        if (file_exists($slugFile)) {
            return [
                'file' => $slugFile,
                'params' => ['slug' => $lastSegment]
            ];
        }
        
        // Vérifier si [id]/index.php existe
        $idIndexFile = $basePathWithId . '/index.php';
        if (file_exists($idIndexFile)) {
            return [
                'file' => $idIndexFile,
                'params' => ['id' => $lastSegment]
            ];
        }
        
        // Vérifier si [slug]/index.php existe
        $slugIndexFile = $basePathWithSlug . '/index.php';
        if (file_exists($slugIndexFile)) {
            return [
                'file' => $slugIndexFile,
                'params' => ['slug' => $lastSegment]
            ];
        }
        
        // Remettre le dernier segment pour les stratégies suivantes
        array_push($pathParts, $lastSegment);
    }
    
    // Stratégie 4: Chercher avec [id] au milieu et une action à la fin
    // Ex: /users/123/incidents -> users/[id]/incidents.php
    // Ex: /medical-documents/123/download -> medical-documents/[id]/download.php
    if (count($pathParts) >= 3) {
        $action = array_pop($pathParts); // dernier segment (incidents, download, etc.)
        $idValue = array_pop($pathParts); // avant-dernier segment (l'ID)
        $basePathWithId = $basePath . '/' . implode('/', $pathParts) . '/[id]';
        
        // #region agent log - HYPOTHESIS 1, 3, 4: Strategy 4 path resolution
        $idActionFile = $basePathWithId . '/' . $action . '.php';
        $idActionIndexFile = $basePathWithId . '/' . $action . '/index.php';
        // #endregion
        
        // Vérifier [id]/[action].php
        if (file_exists($idActionFile)) {
            return [
                'file' => $idActionFile,
                'params' => ['id' => $idValue]
            ];
        }
        
        // Vérifier [id]/[action]/index.php
        if (file_exists($idActionIndexFile)) {
            return [
                'file' => $idActionIndexFile,
                'params' => ['id' => $idValue]
            ];
        }
    }
    
    return null;
}

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

// Trouver le fichier de route
$route = findRouteFile($requestPath, $apiDir);

// #region agent log
// #endregion

// Si aucune route trouvée, retourner 404
if (!$route) {
    // #region agent log - HYPOTHESIS 1, 3, 4: Route not found - check path resolution
    $normalizedPath = normalizePath(str_replace('/api/', '', $requestPath));
    $exactFile = $apiDir . '/' . $normalizedPath . '.php';
    $pathParts = explode('/', $normalizedPath);
    $checkDownloadPath = '';
    if (count($pathParts) >= 3) {
        $action = array_pop($pathParts);
        $idValue = array_pop($pathParts);
        $basePathWithId = $apiDir . '/' . implode('/', $pathParts) . '/[id]';
        $checkDownloadPath = $basePathWithId . '/' . $action . '.php';
    }
    // #endregion
    
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Route non trouvée',
        'path' => $requestPath
    ]);
    exit;
}

// #region agent log - HYPOTHESIS 2, 5: Route found - check params injection
// #endregion

// Injecter les paramètres dynamiques dans $_GET
foreach ($route['params'] as $key => $value) {
    $_GET[$key] = $value;
}

// #region agent log - HYPOTHESIS 2, 5: After params injection
// #endregion

// Charger le fichier de route trouvé
require $route['file'];

