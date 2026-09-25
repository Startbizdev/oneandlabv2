<?php

declare(strict_types=1);

/** Smoke HTTP public prod — à lancer sur le serveur ou en local contre cary.bio. */
$base = $argv[1] ?? 'https://cary.bio';

$paths = [
    '/',
    '/laboratoires',
    '/api/public/labs',
    '/api/app/version',
];

$results = [];
foreach ($paths as $path) {
    $url = rtrim($base, '/') . $path;
    $ctx = stream_context_create(['http' => ['timeout' => 20, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    $results[] = [
        'path' => $path,
        'http' => $code,
        'bytes' => $body !== false ? strlen($body) : 0,
        'ok' => $code >= 200 && $code < 400 && $body !== false,
    ];
}

echo json_encode(['base' => $base, 'checks' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
