<?php

/**
 * Configuration CORS
 */

$rawOrigins = $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:3000';
$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $rawOrigins))));

return [
    'allowed_origins' => $allowedOrigins,
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    'max_age' => 3600,
];




