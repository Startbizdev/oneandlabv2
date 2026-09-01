<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/CoverageZoneGeo.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else if (!$origin) {
    header('Access-Control-Allow-Origin: http://localhost:3000');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function enrichCoverageZoneRow(array $zone): array
{
    $centerLat = (float) ($zone['center_lat'] ?? 0);
    $centerLng = (float) ($zone['center_lng'] ?? 0);
    $radiusKm = (float) ($zone['radius_km'] ?? CoverageZoneGeo::MIN_HALF_SIDE_KM);
    $zoneType = isset($zone['zone_type']) ? (string) $zone['zone_type'] : 'square';

    $boundsJson = null;
    if (isset($zone['bounds_json']) && is_string($zone['bounds_json']) && $zone['bounds_json'] !== '') {
        $decoded = json_decode($zone['bounds_json'], true);
        $boundsJson = is_array($decoded) ? $decoded : null;
    } elseif (isset($zone['bounds_json']) && is_array($zone['bounds_json'])) {
        $boundsJson = $zone['bounds_json'];
    }

    if ($zoneType !== 'circle') {
        $zoneType = 'square';
        if ($boundsJson === null && $centerLat && $centerLng) {
            $boundsJson = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, $radiusKm);
        }
    }

    $zone['zone_type'] = $zoneType;
    $zone['bounds_json'] = $boundsJson;
    if (isset($zone['zone_metadata']) && is_string($zone['zone_metadata']) && $zone['zone_metadata'] !== '') {
        $zone['zone_metadata'] = json_decode($zone['zone_metadata'], true);
    }
    return $zone;
}

function maxHalfSideKmForRole(string $role, string $ownerId, PDO $db): float
{
    if ($role === 'nurse') {
        require_once __DIR__ . '/../../lib/SubscriptionService.php';
        $subscriptionService = new SubscriptionService($db);
        $planSlug = $subscriptionService->getActiveNursePlan($ownerId);
        $limits = require __DIR__ . '/../../config/plan-limits.php';
        $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];
        return (float) ($nurseLimits['max_radius_km'] ?? 20);
    }
    return CoverageZoneGeo::MAX_HALF_SIDE_KM_LAB;
}

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
            $z = enrichCoverageZoneRow($z);
            $owner = $userModel->getById($z['owner_id'], $user['user_id'], $user['role']);
            $z['owner_first_name'] = $owner['first_name'] ?? '';
            $z['owner_last_name'] = $owner['last_name'] ?? '';
            $addr = $owner['address'] ?? null;
            $z['owner_address_label'] = is_array($addr) && isset($addr['label']) ? $addr['label'] : (is_string($addr) ? $addr : '');
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
        $zone = enrichCoverageZoneRow($zone);
    }

    echo json_encode([
        'success' => true,
        'data' => $zone ? [$zone] : [],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    CSRFMiddleware::handle();

    $input = json_decode(file_get_contents('php://input'), true);

    $role = $input['role'] ?? $user['role'];
    $ownerId = $user['user_id'];
    if (!empty($input['owner_id'])) {
        if ($isAdmin) {
            $ownerId = $input['owner_id'];
        } elseif ($user['role'] === 'lab') {
            $userModel = new User();
            $targetLabId = $userModel->getLabId($input['owner_id']);
            if ($targetLabId === $user['user_id']) {
                $ownerId = $input['owner_id'];
            }
        }
    }

    if (!isset($input['center_lat'], $input['center_lng'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'center_lat et center_lng requis',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }

    $centerLat = (float) $input['center_lat'];
    $centerLng = (float) $input['center_lng'];
    $zoneType = isset($input['zone_type']) ? (string) $input['zone_type'] : 'square';
    if ($zoneType !== 'circle') {
        $zoneType = 'square';
    }
    $isActive = !array_key_exists('is_active', $input) || $input['is_active'];

    $maxHalfSide = maxHalfSideKmForRole($role, $ownerId, $db);
    $boundsJson = null;
    $radiusKm = null;

    if ($zoneType === 'square') {
        $rawBounds = $input['bounds_json'] ?? null;
        if (is_string($rawBounds)) {
            $rawBounds = json_decode($rawBounds, true);
        }
        $boundsJson = CoverageZoneGeo::normalizeBounds(is_array($rawBounds) ? $rawBounds : null);

        if ($boundsJson === null && isset($input['radius_km'])) {
            $half = CoverageZoneGeo::clampHalfSideKm((float) $input['radius_km'], $maxHalfSide);
            $boundsJson = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, $half);
        }

        if ($boundsJson === null) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'bounds_json requis pour une zone carrée',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }

        if (!CoverageZoneGeo::boundsAreSquareConsistent($centerLat, $centerLng, $boundsJson)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Zone carrée invalide (centre ou proportions)',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }

        $radiusKm = CoverageZoneGeo::boundsToHalfSideKm($centerLat, $centerLng, $boundsJson);
        $radiusKm = CoverageZoneGeo::clampHalfSideKm($radiusKm, $maxHalfSide);
        $boundsJson = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, $radiusKm);
    } else {
        if (!isset($input['radius_km'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'radius_km requis pour une zone circulaire',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }
        $radiusKm = CoverageZoneGeo::clampHalfSideKm((float) $input['radius_km'], $maxHalfSide);
    }

    if ($role === 'nurse' && $radiusKm > $maxHalfSide) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => "Votre offre actuelle limite la zone à {$maxHalfSide} km du centre au bord. Passez à l'offre Pro pour étendre jusqu'à 100 km.",
            'code' => 'PLAN_LIMIT',
            'max_radius_km' => (int) $maxHalfSide,
        ]);
        exit;
    }

    $stmt = $db->prepare('SELECT id FROM coverage_zones WHERE owner_id = ? AND role = ? LIMIT 1');
    $stmt->execute([$ownerId, $role]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $boundsEncoded = $boundsJson !== null ? json_encode($boundsJson) : null;

    try {
        if ($existing) {
            $stmt = $db->prepare('
                UPDATE coverage_zones 
                SET center_lat = ?, center_lng = ?, radius_km = ?, zone_type = ?, bounds_json = ?,
                    zone_metadata = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ');
            $stmt->execute([
                $centerLat,
                $centerLng,
                $radiusKm,
                $zoneType,
                $boundsEncoded,
                isset($input['zone_metadata']) ? json_encode($input['zone_metadata']) : null,
                $isActive ? 1 : 0,
                $existing['id'],
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $existing['id']]]);
        } else {
            $id = bin2hex(random_bytes(16));
            $stmt = $db->prepare('
                INSERT INTO coverage_zones 
                (id, owner_id, role, center_lat, center_lng, radius_km, zone_type, bounds_json, zone_metadata, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ');
            $stmt->execute([
                $id,
                $ownerId,
                $role,
                $centerLat,
                $centerLng,
                $radiusKm,
                $zoneType,
                $boundsEncoded,
                isset($input['zone_metadata']) ? json_encode($input['zone_metadata']) : null,
                $isActive ? 1 : 0,
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $id]]);
        }
    } catch (PDOException $e) {
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
