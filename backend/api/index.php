<?php

header('Content-Type: application/json');

// Get request path
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$uri = parse_url($uri, PHP_URL_PATH) ?? '/';
$path = trim(str_replace('/api', '', $uri), '/');

// Si le chemin est vide, retourner une réponse d'accueil
if (empty($path)) {
    echo json_encode([
        'success' => true,
        'message' => 'API OneAndLab V2',
        'version' => '2.0',
        'endpoints' => [
            'auth' => '/api/auth',
            'appointments' => '/api/appointments',
            'users' => '/api/users',
            'categories' => '/api/categories',
            'coverage-zones' => '/api/coverage-zones',
            'reviews' => '/api/reviews',
            'notifications' => '/api/notifications',
            'availability-settings' => '/api/availability-settings',
            'medical-documents' => '/api/medical-documents',
            'patient-documents' => '/api/patient-documents',
            'patient-relatives' => '/api/patient-relatives'
        ]
    ]);
    exit;
}

// Base API directory
$apiDir = __DIR__;

// ======================================================
// 1) Try: /path.php
// Example: /auth/request-otp → auth/request-otp.php
// ======================================================
$file = $apiDir . '/' . $path . '.php';
if (file_exists($file)) {
    require $file;
    exit;
}

// ======================================================
// 2) Try index file: /path/index.php
// Example: /coverage-zones → coverage-zones/index.php
// ======================================================
$indexFile = $apiDir . '/' . $path . '/index.php';
if (file_exists($indexFile)) {
    require $indexFile;
    exit;
}

// ======================================================
// 3) Dynamic [slug] route (before [id] to prioritize)
// Example: /public/nurse/mon-slug → public/nurse/[slug].php
// ======================================================
$segments = explode('/', $path);
$last = array_pop($segments);
$basePath = implode('/', $segments);
$dynamicSlugFile = $apiDir . '/' . $basePath . '/[slug].php';

if (file_exists($dynamicSlugFile)) {
    $_GET['slug'] = $last;
    require $dynamicSlugFile;
    exit;
}

// ======================================================
// 4) Dynamic [id] route
// Example: /users/123 → users/[id].php
// ======================================================
$segments = explode('/', $path);
$last = array_pop($segments);

$basePath = implode('/', $segments);
$dynamicFile = $apiDir . '/' . $basePath . '/[id].php';

if (file_exists($dynamicFile)) {
    $_GET['id'] = $last;
    require $dynamicFile;
    exit;
}

// ======================================================
// 5) Dynamic with action
// Example: /users/123/incidents → users/[id]/incidents.php
// ======================================================
$segments = explode('/', $path);
$action = array_pop($segments);
$id = array_pop($segments);
$basePath = implode('/', $segments);

$dynamicActionFile = $apiDir . '/' . $basePath . '/[id]/' . $action . '.php';

if (file_exists($dynamicActionFile)) {
    $_GET['id'] = $id;
    require $dynamicActionFile;
    exit;
}

// ======================================================
// No route found
// ======================================================
http_response_code(404);
echo json_encode([
    'success' => false,
    'error' => 'Route not found',
    'path' => "/$path"
]);
exit;

