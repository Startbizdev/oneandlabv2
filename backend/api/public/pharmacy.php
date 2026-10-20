<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyModuleConfig.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyCatalogService.php';

// Arrivée publique du QR pharmacie : choix rendez-vous / commande, sans authentification.
header('Content-Type: application/json; charset=utf-8');
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$id = strtolower(trim((string) ($_GET['id'] ?? '')));
if (!Validation::uuid($id)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Pharmacie introuvable']);
    exit;
}

try {
    $config = require __DIR__ . '/../../config/database.php';
    $db = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
        $config['username'],
        $config['password'],
        $config['options'] ?? []
    );
    $catalog = new PharmacyCatalogService($db, new Crypto(), new PharmacyModuleConfig($db));
    $summary = $catalog->qrLandingSummary($id);
    if ($summary === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Pharmacie introuvable']);
        exit;
    }

    echo json_encode(['success' => true, 'data' => $summary]);
} catch (Throwable $e) {
    ApiServerError::respond('pharmacie publique ' . $id, $e, 'Erreur serveur');
}
