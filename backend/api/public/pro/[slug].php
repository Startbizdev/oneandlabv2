<?php

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
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$slug = isset($_GET['slug']) ? trim((string) $_GET['slug']) : null;
if ($slug === '') {
    $slug = null;
}
if ($slug === null) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $path = $uri !== null ? trim($uri, '/') : '';
    $segments = $path !== '' ? explode('/', $path) : [];
    $last = end($segments);
    if ($last !== false && $last !== '') {
        $slug = $last;
    }
}

if ($slug === null || $slug === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Slug requis']);
    exit;
}

try {
    $config = require __DIR__ . '/../../../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    $selectFields = 'id, role, public_slug, profile_image_url, cover_image_url, biography, is_public_profile_enabled, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek';
    foreach (['city_plain', 'website_url', 'social_links', 'emploi'] as $col) {
        $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE " . $db->quote($col));
        if ($stmt && $stmt->rowCount() > 0) {
            $selectFields .= ', ' . $col;
        }
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'address_encrypted'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', address_encrypted, address_dek';
    }

    $stmt = $db->prepare(
        "SELECT {$selectFields} FROM profiles WHERE public_slug = ? AND role = 'pro' AND is_public_profile_enabled = TRUE"
    );
    $stmt->execute([$slug]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        $stmt = $db->query("SHOW TABLES LIKE 'slug_redirects'");
        if ($stmt && $stmt->rowCount() > 0) {
            $stmt = $db->prepare(
                'SELECT r.profile_id, p.public_slug FROM slug_redirects r
                 JOIN profiles p ON p.id = r.profile_id
                 WHERE r.old_slug = ? AND p.role = \'pro\' AND p.is_public_profile_enabled = TRUE'
            );
            $stmt->execute([$slug]);
            $redirect = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($redirect && !empty($redirect['public_slug'])) {
                echo json_encode([
                    'success' => true,
                    'redirect' => true,
                    'new_slug' => $redirect['public_slug'],
                ]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Profil introuvable']);
        exit;
    }

    $crypto = new Crypto();
    $firstName = $crypto->decryptField($profile['first_name_encrypted'], $profile['first_name_dek']);
    $lastName = $crypto->decryptField($profile['last_name_encrypted'], $profile['last_name_dek']);

    $addressDisplay = null;
    if (!empty($profile['address_encrypted'] ?? '') && !empty($profile['address_dek'] ?? '')) {
        $addressJson = $crypto->decryptField($profile['address_encrypted'], $profile['address_dek']);
        $addressData = is_string($addressJson) ? json_decode($addressJson, true) : $addressJson;
        if (is_array($addressData) && !empty($addressData['label'])) {
            $parts = array_map('trim', explode(',', (string) $addressData['label']));
            $addressDisplay = count($parts) > 1 ? end($parts) : trim((string) $addressData['label']);
        }
    }
    if ($addressDisplay === null && !empty($profile['city_plain'])) {
        $addressDisplay = trim((string) $profile['city_plain']);
    }

    $socialLinks = $profile['social_links'] ?? null;
    if (is_string($socialLinks) && $socialLinks !== '') {
        $socialLinks = json_decode($socialLinks, true);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $profile['id'],
            'slug' => $profile['public_slug'],
            'name' => trim($firstName . ' ' . $lastName),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'emploi' => $profile['emploi'] ?? null,
            'profile_image_url' => $profile['profile_image_url'],
            'cover_image_url' => $profile['cover_image_url'] ?? null,
            'biography' => $profile['biography'],
            'address' => $addressDisplay,
            'city_plain' => $profile['city_plain'] ?? null,
            'website_url' => $profile['website_url'] ?? null,
            'social_links' => is_array($socialLinks) ? $socialLinks : null,
            'is_accepting_appointments' => true,
            'reviews' => [
                'stats' => ['average' => 0, 'count' => 0],
                'items' => [],
            ],
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage(),
    ]);
}
