<?php

// Définir le Content-Type AVANT toute sortie
header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../models/Review.php';

// CORS
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

// Slug : priorité au paramètre injecté par le routeur, sinon extraction depuis l'URL
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
    
    // Colonnes de base + adresse + ville si présentes
    $selectFields = 'id, role, public_slug, profile_image_url, cover_image_url, biography, faq, is_public_profile_enabled, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek';
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'address_encrypted'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', address_encrypted, address_dek';
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', city_plain';
    }
    foreach (['website_url', 'years_experience', 'nurse_qualifications', 'social_links', 'is_accepting_appointments'] as $col) {
        $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE '{$col}'");
        if ($stmt && $stmt->rowCount() > 0) {
            $selectFields .= ', ' . $col;
        }
    }
    $stmt = $db->prepare("SELECT {$selectFields} FROM profiles WHERE public_slug = ? AND role = 'nurse' AND (is_public_profile_enabled = 1 OR is_public_profile_enabled = TRUE)");
    $stmt->execute([$slug]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Profil introuvable']);
        exit;
    }
    
    // Déchiffrer le nom (nécessaire pour l'affichage public)
    $crypto = new Crypto();
    $firstName = $crypto->decryptField($profile['first_name_encrypted'], $profile['first_name_dek']);
    $lastName = $crypto->decryptField($profile['last_name_encrypted'], $profile['last_name_dek']);
    
    // Récupérer les spécialisations (catégories activées, avec icône)
    $stmt = $db->query("SHOW COLUMNS FROM care_categories LIKE 'icon'");
    $iconCol = $stmt && $stmt->rowCount() > 0 ? ', cc.icon' : '';
    $stmt = $db->prepare("
        SELECT cc.id, cc.name, cc.description, cc.type{$iconCol}
        FROM care_categories cc
        LEFT JOIN nurse_category_preferences ncp
            ON cc.id = ncp.category_id AND ncp.nurse_id = ?
        WHERE cc.is_active = TRUE
        AND cc.type = 'nursing'
        AND (ncp.id IS NULL OR ncp.is_enabled = TRUE)
        ORDER BY cc.type, cc.name
    ");
    $stmt->execute([$profile['id']]);
    $specializations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer les statistiques des avis
    $reviewModel = new Review();
    $reviewStats = $reviewModel->getStats($profile['id']);
    
    // Récupérer les avis publics (visibles)
    $stmt = $db->prepare('
        SELECT 
            r.id,
            r.rating,
            r.comment,
            r.response,
            r.created_at,
            p.first_name_encrypted,
            p.first_name_dek,
            p.last_name_encrypted,
            p.last_name_dek
        FROM reviews r
        JOIN profiles p ON r.patient_id = p.id
        WHERE r.reviewee_id = ?
        AND r.reviewee_type = "nurse"
        AND r.is_visible = TRUE
        ORDER BY r.created_at DESC
        LIMIT 10
    ');
    $stmt->execute([$profile['id']]);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Déchiffrer les noms des patients dans les avis
    foreach ($reviews as &$review) {
        if ($review['first_name_encrypted'] && $review['first_name_dek']) {
            $review['patient_first_name'] = $crypto->decryptField(
                $review['first_name_encrypted'], 
                $review['first_name_dek']
            );
        }
        if ($review['last_name_encrypted'] && $review['last_name_dek']) {
            $review['patient_last_name'] = $crypto->decryptField(
                $review['last_name_encrypted'], 
                $review['last_name_dek']
            );
        }
        // Masquer le nom complet pour la vie privée (garder seulement initiale)
        if (isset($review['patient_first_name'])) {
            $review['patient_name'] = substr($review['patient_first_name'], 0, 1) . '.';
            if (isset($review['patient_last_name'])) {
                $review['patient_name'] .= ' ' . substr($review['patient_last_name'], 0, 1) . '.';
            }
        } else {
            $review['patient_name'] = 'Patient';
        }
        unset($review['first_name_encrypted'], $review['first_name_dek']);
        unset($review['last_name_encrypted'], $review['last_name_dek']);
    }
    
    // Parser la FAQ si c'est une chaîne JSON
    $faq = null;
    if ($profile['faq']) {
        $faq = is_string($profile['faq']) ? json_decode($profile['faq'], true) : $profile['faq'];
    }

    // Adresse publique : pour l'infirmier on n'affiche que arrondissement + ville (pas l'adresse complète)
    $addressLabel = null;
    $addressDisplay = null; // arrondissement + ville uniquement
    $mapCenter = null;
    $addressLat = null;
    $addressLng = null;
    if (!empty($profile['address_encrypted'] ?? '') && !empty($profile['address_dek'] ?? '')) {
        $addressJson = $crypto->decryptField($profile['address_encrypted'], $profile['address_dek']);
        $addressData = is_string($addressJson) ? json_decode($addressJson, true) : $addressJson;
        if (is_array($addressData)) {
            if (!empty($addressData['label'])) {
                $addressLabel = trim((string) $addressData['label']);
                // Affichage public : seulement la dernière partie (ex. "13001 Marseille")
                $parts = array_map('trim', explode(',', $addressLabel));
                $addressDisplay = count($parts) > 1 ? end($parts) : $addressLabel;
            }
            if (isset($addressData['lat'], $addressData['lng'])) {
                $addressLat = (float) $addressData['lat'];
                $addressLng = (float) $addressData['lng'];
            }
        } elseif (is_string($addressJson) && trim($addressJson) !== '') {
            $addressLabel = trim($addressJson);
            $addressDisplay = $addressLabel;
        }
    }
    if ($addressDisplay === null && !empty($profile['city_plain'])) {
        $addressDisplay = trim((string) $profile['city_plain']);
    }

    // Zone de couverture (centre + rayon) pour la carte avec cercle
    $radiusKm = null;
    $stmt = $db->query("SHOW COLUMNS FROM coverage_zones LIKE 'center_lat'");
    if ($stmt && $stmt->rowCount() > 0) {
        $stmt = $db->prepare('SELECT center_lat, center_lng, radius_km FROM coverage_zones WHERE owner_id = ? AND role = ? AND is_active = TRUE LIMIT 1');
        $stmt->execute([$profile['id'], 'nurse']);
        $zone = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($zone && isset($zone['center_lat'], $zone['center_lng'])) {
            $mapCenter = ['lat' => (float) $zone['center_lat'], 'lng' => (float) $zone['center_lng']];
            if (isset($zone['radius_km']) && $zone['radius_km'] !== null && $zone['radius_km'] !== '') {
                $radiusKm = (float) $zone['radius_km'];
            }
        }
    }
    if ($mapCenter === null && $addressLat !== null && $addressLng !== null) {
        $mapCenter = ['lat' => $addressLat, 'lng' => $addressLng];
    }
    $websiteUrl = $profile['website_url'] ?? null;
    $yearsExperience = $profile['years_experience'] ?? null;
    $nurseQualificationsRaw = $profile['nurse_qualifications'] ?? null;
    if (is_string($nurseQualificationsRaw) && $nurseQualificationsRaw !== '') {
        $nurseQualificationsRaw = json_decode($nurseQualificationsRaw, true);
    }
    $qualificationsList = [];
    if (is_array($nurseQualificationsRaw) && !empty($nurseQualificationsRaw)) {
        $qualLabels = require __DIR__ . '/../../../config/nurse_qualifications.php';
        foreach ($nurseQualificationsRaw as $code) {
            if (is_string($code) && strpos($code, 'AUTRE:') === 0) {
                $qualificationsList[] = ['code' => 'AUTRE', 'label' => substr($code, 6)];
            } elseif (is_string($code)) {
                $qualificationsList[] = ['code' => $code, 'label' => $qualLabels[$code] ?? $code];
            }
        }
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
            'profile_image_url' => $profile['profile_image_url'],
            'cover_image_url' => $profile['cover_image_url'],
            'biography' => $profile['biography'],
            'faq' => $faq,
            'address' => $addressDisplay,
            'city_plain' => $profile['city_plain'] ?? null,
            'map_center' => $mapCenter,
            'radius_km' => $radiusKm,
            'website_url' => $websiteUrl,
            'years_experience' => $yearsExperience,
            'qualifications' => $qualificationsList,
            'social_links' => is_array($socialLinks) ? $socialLinks : null,
            'is_accepting_appointments' => isset($profile['is_accepting_appointments']) ? (bool) $profile['is_accepting_appointments'] : true,
            'specializations' => $specializations,
            'reviews' => [
                'stats' => $reviewStats,
                'items' => $reviews,
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


