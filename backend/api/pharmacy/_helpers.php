<?php

declare(strict_types=1);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/pharmacy/bootstrap.php';

/** @param array<string, mixed> $user */
function pharmacyEnrichUserProfile(PDO $db, array $user): array
{
    $uid = (string) ($user['user_id'] ?? '');
    if ($uid === '') {
        return $user;
    }
    try {
        $stmt = $db->prepare('
            SELECT emploi, pharmacy_accepts_click_collect, pharmacy_accepts_home_delivery,
                   pharmacy_orders_paused, pharmacy_orders_enabled
            FROM profiles WHERE id = ? LIMIT 1
        ');
        $stmt->execute([$uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $user['emploi'] = $row['emploi'] !== null ? trim((string) $row['emploi']) : null;
            $user['pharmacy_orders_enabled'] = (int) ($row['pharmacy_orders_enabled'] ?? 1);
            $user['pharmacy_orders_paused'] = (int) ($row['pharmacy_orders_paused'] ?? 0);
            $user['pharmacy_accepts_click_collect'] = (int) ($row['pharmacy_accepts_click_collect'] ?? 1);
            $user['pharmacy_accepts_home_delivery'] = (int) ($row['pharmacy_accepts_home_delivery'] ?? 1);
        }
    } catch (PDOException) {
        // Colonnes absentes avant migration 110
    }

    return $user;
}

function pharmacyApiBootstrap(array $methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']): array
{
    header('Content-Type: application/json; charset=utf-8');
    $corsConfig = require __DIR__ . '/../../config/cors.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $corsConfig['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $auth = new AuthMiddleware();
    $user = $auth->handle();

    $config = require __DIR__ . '/../../config/database.php';
    $db = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
        $config['username'],
        $config['password'],
        $config['options'] ?? []
    );
    $user = pharmacyEnrichUserProfile($db, $user);

    $moduleConfig = new PharmacyModuleConfig($db);
    $orderService = new PharmacyOrderService($db, $moduleConfig);
    $catalogService = new PharmacyCatalogService($db, new Crypto(), $moduleConfig);
    $favoriteService = new PharmacyFavoriteService($db);
    $statsService = new PharmacyOrderStatsService($db);

    return [$user, $db, $moduleConfig, $orderService, $catalogService, $favoriteService, $statsService];
}
