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
        'message' => 'API Cary V2',
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

require_once __DIR__ . '/../lib/ApiRouteResolver.php';

$route = ApiRouteResolver::resolve($path, __DIR__);
if ($route !== null) {
    foreach ($route['params'] as $key => $value) {
        $_GET[$key] = $value;
    }
    require $route['file'];
    exit;
}

http_response_code(404);
echo json_encode([
    'success' => false,
    'error' => 'Route not found',
    'path' => "/$path"
]);
exit;

