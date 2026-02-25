<?php

/**
 * API publique - Liste des infirmiers (profil public activé)
 * GET: Liste paginée pour pages SEO "Explorer les infirmiers"
 * Paramètres: page, limit, city (optionnel, si colonne city_plain existe)
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 24)));
$offset = ($page - 1) * $limit;
$city = isset($_GET['city']) ? trim($_GET['city']) : '';

try {
    $config = require __DIR__ . '/../../../config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    $crypto = new Crypto();

    $where = "role = 'nurse' AND is_public_profile_enabled = TRUE AND public_slug IS NOT NULL AND public_slug != ''";
    $params = [];
    if ($city !== '') {
        $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
        if ($stmt->rowCount() > 0) {
            $where .= " AND LOWER(TRIM(city_plain)) = LOWER(TRIM(?))";
            $params[] = $city;
        }
    }

    $countSql = "SELECT COUNT(*) FROM profiles WHERE $where";
    $stmt = $db->prepare($countSql);
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();

    $selectFields = "id, public_slug, profile_image_url, biography, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek";
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
    if ($stmt->rowCount() > 0) {
        $selectFields .= ", city_plain";
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'address_encrypted'");
    if ($stmt->rowCount() > 0) {
        $selectFields .= ", address_encrypted, address_dek";
    }
    $sql = "SELECT $selectFields FROM profiles WHERE $where ORDER BY public_slug ASC LIMIT $limit OFFSET $offset";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reviewStats = [];
    if (count($rows) > 0) {
        $ids = array_column($rows, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("SELECT reviewee_id, COUNT(*) as total_reviews, AVG(rating) as average_rating FROM reviews WHERE reviewee_id IN ($placeholders) AND reviewee_type = 'nurse' AND is_visible = TRUE GROUP BY reviewee_id");
        $stmt->execute($ids);
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $reviewStats[$r['reviewee_id']] = ['total_reviews' => (int) $r['total_reviews'], 'average_rating' => round((float) $r['average_rating'], 1)];
        }
    }

    $data = [];
    $maxPresentationLen = 120;
    foreach ($rows as $row) {
        $firstName = $crypto->decryptField($row['first_name_encrypted'] ?? '', $row['first_name_dek'] ?? '');
        $lastName = $crypto->decryptField($row['last_name_encrypted'] ?? '', $row['last_name_dek'] ?? '');
        $bio = isset($row['biography']) ? trim((string) $row['biography']) : '';
        $presentation = $bio !== '' ? (mb_strlen($bio) > $maxPresentationLen ? mb_substr($bio, 0, $maxPresentationLen) . '…' : $bio) : '';
        $item = [
            'id' => $row['id'],
            'slug' => $row['public_slug'],
            'name' => trim($firstName . ' ' . $lastName) ?: 'Infirmier',
            'profile_image_url' => $row['profile_image_url'],
            'presentation' => $presentation,
        ];
        $location = null;
        if (!empty($row['address_encrypted'] ?? '') && !empty($row['address_dek'] ?? '')) {
            $addressJson = $crypto->decryptField($row['address_encrypted'], $row['address_dek']);
            $addressData = is_string($addressJson) ? json_decode($addressJson, true) : $addressJson;
            if (is_array($addressData) && !empty($addressData['label'])) {
                $parts = array_map('trim', explode(',', trim((string) $addressData['label'])));
                $location = count($parts) > 1 ? end($parts) : trim((string) $addressData['label']);
            } elseif (is_string($addressJson) && trim($addressJson) !== '') {
                $location = trim($addressJson);
            }
        }
        if ($location === null && isset($row['city_plain']) && trim((string) $row['city_plain']) !== '') {
            $location = trim((string) $row['city_plain']);
        }
        $item['city'] = $location;
        $stats = $reviewStats[$row['id']] ?? null;
        $item['reviews_count'] = $stats ? (int) $stats['total_reviews'] : 0;
        $item['average_rating'] = $stats ? (float) $stats['average_rating'] : 0;
        $data[] = $item;
    }

    echo json_encode([
        'success' => true,
        'data' => $data,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => $limit > 0 ? (int) ceil($total / $limit) : 0,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
