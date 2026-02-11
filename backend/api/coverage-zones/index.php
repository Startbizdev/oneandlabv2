<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/User.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// En développement, autoriser toutes les origines localhost
if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else if (!$origin) {
    // Si pas d'origine spécifiée, autoriser localhost:3000 par défaut
    header('Access-Control-Allow-Origin: http://localhost:3000');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$isAdmin = $user['role'] === 'super_admin';
$listAll = isset($_GET['list']) && $_GET['list'] === 'all';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($isAdmin && $listAll) {
        // Admin : liste toutes les zones avec infos propriétaire (nom, prénom, adresse)
        $roleFilter = $_GET['role'] ?? null;
        $sql = 'SELECT * FROM coverage_zones WHERE 1=1';
        $params = [];
        if ($roleFilter && in_array($roleFilter, ['nurse', 'lab', 'subaccount'], true)) {
            $sql .= ' AND role = ?';
            $params[] = $roleFilter;
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $userModel = new User();
        foreach ($zones as &$z) {
            if (isset($z['zone_metadata']) && $z['zone_metadata']) {
                $z['zone_metadata'] = json_decode($z['zone_metadata'], true);
            }
            $owner = $userModel->getById($z['owner_id'], $user['user_id'], $user['role']);
            $z['owner_first_name'] = $owner['first_name'] ?? '';
            $z['owner_last_name'] = $owner['last_name'] ?? '';
            $addr = $owner['address'] ?? null;
            $z['owner_address_label'] = is_array($addr) && isset($addr['label']) ? $addr['label'] : (is_string($addr) ? $addr : '');
            // Pour lab / sous-compte : nom d'entité (company_name) ; pour infirmier : prénom + nom
            if (in_array($z['role'], ['lab', 'subaccount'], true)) {
                $entityName = trim((string) ($owner['company_name'] ?? ''));
                if ($entityName === '') {
                    $entityName = trim((string) ($owner['last_name'] ?? ''));
                }
                $z['owner_entity_name'] = $entityName !== '' ? $entityName : ($z['role'] === 'lab' ? 'Laboratoire' : 'Sous-compte');
            } else {
                $z['owner_entity_name'] = trim(($owner['first_name'] ?? '') . ' ' . ($owner['last_name'] ?? ''));
                if ($z['owner_entity_name'] === '') {
                    $z['owner_entity_name'] = $owner['email'] ?? $z['owner_id'];
                }
            }
        }
        unset($z);
        echo json_encode(['success' => true, 'data' => $zones]);
        exit;
    }

    // Liste des zones de couverture (une seule zone par owner_id + role)
    $ownerId = $_GET['owner_id'] ?? $user['user_id'];
    $role = $_GET['role'] ?? null;

    $sql = 'SELECT * FROM coverage_zones WHERE owner_id = ?';
    $params = [$ownerId];

    if ($role) {
        $sql .= ' AND role = ?';
        $params[] = $role;
    }

    $sql .= ' ORDER BY created_at DESC LIMIT 1';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $zone = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($zone) {
        if (isset($zone['zone_metadata']) && $zone['zone_metadata']) {
            $zone['zone_metadata'] = json_decode($zone['zone_metadata'], true);
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $zone ? [$zone] : [],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Log pour debug
    error_log('coverage-zones: Début traitement POST/PUT');
    
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Création ou mise à jour d'une zone de couverture (CERCLES UNIQUEMENT)
    $input = json_decode(file_get_contents('php://input'), true);
    error_log('coverage-zones: Input reçu: ' . json_encode($input));
    
    $role = $input['role'] ?? $user['role'];
    $ownerId = $user['user_id'];
    if ($isAdmin && !empty($input['owner_id'])) {
        $ownerId = $input['owner_id'];
    }

    // Validation pour les cercles uniquement
    if (!isset($input['center_lat'], $input['center_lng'], $input['radius_km'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'center_lat, center_lng et radius_km requis pour une zone circulaire',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }

    $centerLat = (float) $input['center_lat'];
    $centerLng = (float) $input['center_lng'];
    $radiusKm = (float) $input['radius_km'];
    $isActive = !array_key_exists('is_active', $input) || $input['is_active'];

    // Vérifier si une zone existe déjà pour cet owner_id + role
    $stmt = $db->prepare('SELECT id FROM coverage_zones WHERE owner_id = ? AND role = ? LIMIT 1');
    $stmt->execute([$ownerId, $role]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    try {
        if ($existing) {
            $stmt = $db->prepare('
                UPDATE coverage_zones 
                SET center_lat = ?, center_lng = ?, radius_km = ?, zone_metadata = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ');
            $stmt->execute([
                $centerLat,
                $centerLng,
                $radiusKm,
                isset($input['zone_metadata']) ? json_encode($input['zone_metadata']) : null,
                $isActive ? 1 : 0,
                $existing['id'],
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $existing['id']]]);
        } else {
            $id = bin2hex(random_bytes(16));
            $stmt = $db->prepare('
                INSERT INTO coverage_zones 
                (id, owner_id, role, center_lat, center_lng, radius_km, zone_metadata, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ');
            $stmt->execute([
                $id,
                $ownerId,
                $role,
                $centerLat,
                $centerLng,
                $radiusKm,
                isset($input['zone_metadata']) ? json_encode($input['zone_metadata']) : null,
                $isActive ? 1 : 0,
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $id]]);
        }
    } catch (PDOException $e) {
        // Erreur SQL
        error_log('coverage-zones: Erreur PDO: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erreur lors de la sauvegarde de la zone de couverture: ' . $e->getMessage(),
            'code' => 'DATABASE_ERROR',
        ]);
        exit;
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

