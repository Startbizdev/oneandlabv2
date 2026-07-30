<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../../models/LabBrand.php';
require_once __DIR__ . '/../../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '' || !preg_match('/^[a-f0-9-]{36}$/i', $id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Identifiant invalide']);
    exit;
}

$model = new LabBrand();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $row = $model->getById($id);
    if ($row === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Marque introuvable']);
        exit;
    }
    echo json_encode(['success' => true, 'data' => $row]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $row = $model->update($id, $input);
        if ($row === null) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Marque introuvable']);
            exit;
        }
        echo json_encode(['success' => true, 'data' => $row]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    } catch (Throwable $e) {
        error_log('admin/lab-brands PUT: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        if (!$model->delete($id)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Marque introuvable']);
            exit;
        }
        echo json_encode(['success' => true]);
    } catch (Throwable $e) {
        error_log('admin/lab-brands DELETE: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
