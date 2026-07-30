<?php
/**
 * GET logo marque labo (public, sans auth).
 * Query: ?name=unilabs.jpg
 */

$backendRoot = realpath(__DIR__ . '/../../..');
if ($backendRoot === false) {
    $backendRoot = __DIR__ . '/../../..';
}

require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method Not Allowed';
    exit;
}

$name = isset($_GET['name']) ? (string) $_GET['name'] : '';
if ($name === '' || !preg_match('/^[a-z0-9-]+\.(jpe?g|png|webp|gif|svg)$/i', $name)) {
    http_response_code(400);
    exit;
}

$basename = basename($name);
$dir = rtrim($backendRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'lab-brands';
$path = $dir . DIRECTORY_SEPARATOR . $basename;

$realDir = realpath($dir);
$realFile = realpath($path);
if ($realDir === false || $realFile === false || strpos($realFile, $realDir) !== 0 || !is_file($realFile)) {
    http_response_code(404);
    exit;
}

$ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
$mimes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'svg' => 'image/svg+xml',
];
$mime = $mimes[$ext] ?? 'application/octet-stream';

header('Content-Type: ' . $mime);
header('Cache-Control: public, max-age=604800');
readfile($realFile);
