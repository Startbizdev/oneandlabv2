<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Vérifier que l'utilisateur a un rôle autorisé
// Les infirmiers libéraux (nurse) n'ont pas d'horaires fixes
$allowedRoles = ['lab', 'subaccount'];
if (!in_array($user['role'], $allowedRoles, true)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Accès refusé. Rôle non autorisé.',
        'code' => 'FORBIDDEN',
    ]);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Récupérer les horaires de disponibilité
    $ownerId = $_GET['owner_id'] ?? $user['user_id'];
    $role = $_GET['role'] ?? $user['role'];
    
    // Vérifier que l'utilisateur peut accéder à ces horaires
    if ($ownerId !== $user['user_id'] && $user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Accès refusé',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }
    
    $stmt = $db->prepare('
        SELECT * FROM availability_settings 
        WHERE owner_id = ? AND role = ?
        ORDER BY created_at DESC
        LIMIT 1
    ');
    $stmt->execute([$ownerId, $role]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($settings) {
        // Décoder les JSON
        $settings['weekly_schedule'] = json_decode($settings['weekly_schedule'], true);
        $settings['exceptions'] = $settings['exceptions'] ? json_decode($settings['exceptions'], true) : null;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $settings,
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Créer ou mettre à jour les horaires de disponibilité
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['weekly_schedule'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'weekly_schedule requis',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }
    
    // Valider le format de weekly_schedule
    if (!is_array($input['weekly_schedule'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'weekly_schedule doit être un objet JSON',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }
    
    $ownerId = $input['owner_id'] ?? $user['user_id'];
    $role = $input['role'] ?? $user['role'];
    
    // Vérifier que l'utilisateur peut modifier ces horaires
    if ($ownerId !== $user['user_id'] && $user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Accès refusé',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }
    
    // Vérifier si des horaires existent déjà
    $stmt = $db->prepare('
        SELECT id FROM availability_settings 
        WHERE owner_id = ? AND role = ?
        LIMIT 1
    ');
    $stmt->execute([$ownerId, $role]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $weeklyScheduleJson = json_encode($input['weekly_schedule']);
    $exceptionsJson = isset($input['exceptions']) ? json_encode($input['exceptions']) : null;
    
    if ($existing) {
        // Mise à jour
        $stmt = $db->prepare('
            UPDATE availability_settings 
            SET weekly_schedule = ?, 
                exceptions = ?,
                updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([
            $weeklyScheduleJson,
            $exceptionsJson,
            $existing['id'],
        ]);
        
        echo json_encode([
            'success' => true,
            'data' => ['id' => $existing['id']],
        ]);
    } else {
        // Création
        $id = bin2hex(random_bytes(16));
        $stmt = $db->prepare('
            INSERT INTO availability_settings 
            (id, owner_id, role, weekly_schedule, exceptions, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ');
        $stmt->execute([
            $id,
            $ownerId,
            $role,
            $weeklyScheduleJson,
            $exceptionsJson,
        ]);
        
        echo json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

