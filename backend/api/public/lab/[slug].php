<?php

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

// Récupérer le slug depuis l'URL
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));
$slug = end($segments);

if (empty($slug)) {
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
    
    // Colonnes de base + optionnelles (city_plain, company_name, adresse, site, horaires, réseaux)
    $selectFields = 'id, role, public_slug, profile_image_url, cover_image_url, biography, faq, is_public_profile_enabled, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek';
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', city_plain';
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'company_name_encrypted'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', company_name_encrypted, company_name_dek';
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'address_encrypted'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', address_encrypted, address_dek';
    }
    // Site web + horaires + réseaux (migration 030 : website_url, opening_hours, social_links)
    foreach (['website_url', 'opening_hours', 'social_links'] as $col) {
        $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE " . $db->quote($col));
        if ($stmt && $stmt->rowCount() > 0) {
            $selectFields .= ', ' . $col;
        }
    }
    $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'min_booking_lead_time_hours'");
    if ($stmt && $stmt->rowCount() > 0) {
        $selectFields .= ', min_booking_lead_time_hours';
    }
    foreach (['accept_rdv_saturday', 'accept_rdv_sunday'] as $col) {
        $stmt = $db->query("SHOW COLUMNS FROM profiles LIKE " . $db->quote($col));
        if ($stmt && $stmt->rowCount() > 0) {
            $selectFields .= ', ' . $col;
        }
    }
    $stmt = $db->prepare("SELECT {$selectFields} FROM profiles WHERE public_slug = ? AND role IN ('lab', 'subaccount') AND is_public_profile_enabled = TRUE");
    $stmt->execute([$slug]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        // Redirection 301 : ancien slug enregistré -> renvoyer le nouveau slug pour que le front fasse 301
        $stmt = $db->query("SHOW TABLES LIKE 'slug_redirects'");
        if ($stmt->rowCount() > 0) {
            $stmt = $db->prepare('SELECT r.profile_id, p.public_slug FROM slug_redirects r JOIN profiles p ON p.id = r.profile_id WHERE r.old_slug = ? AND p.role IN (\'lab\', \'subaccount\') AND p.is_public_profile_enabled = TRUE');
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

    // Clés toujours présentes dans la réponse (null si colonnes absentes)
    $profile['website_url'] = $profile['website_url'] ?? null;
    $profile['social_links'] = $profile['social_links'] ?? null;
    $profile['opening_hours'] = $profile['opening_hours'] ?? null;

    $crypto = new Crypto();
    $name = trim($crypto->decryptField($profile['first_name_encrypted'] ?? '', $profile['first_name_dek'] ?? '') . ' ' . $crypto->decryptField($profile['last_name_encrypted'] ?? '', $profile['last_name_dek'] ?? ''));
    if (!empty($profile['company_name_encrypted'] ?? '') && !empty($profile['company_name_dek'] ?? '')) {
        $companyName = trim((string) $crypto->decryptField($profile['company_name_encrypted'], $profile['company_name_dek']));
        if ($companyName !== '') {
            $name = $companyName;
        }
    }
    $firstName = $crypto->decryptField($profile['first_name_encrypted'], $profile['first_name_dek']);
    $lastName = $crypto->decryptField($profile['last_name_encrypted'], $profile['last_name_dek']);
    
    // Pour les labs : catégories de prélèvements (avec icône)
    $stmt = $db->query("SHOW COLUMNS FROM care_categories LIKE 'icon'");
    $iconCol = $stmt && $stmt->rowCount() > 0 ? ', icon' : '';
    $stmt = $db->prepare("SELECT id, name, description, type{$iconCol} FROM care_categories WHERE type = 'blood_test' AND is_active = TRUE ORDER BY name");
    $stmt->execute();
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
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
        AND r.reviewee_type = "subaccount"
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
    
    // Adresse publique : affichage (texte) + centre carte (coordonnées pour ne pas afficher l'adresse dans l'iframe)
    $addressLabel = null;
    $mapCenter = null;
    if (!empty($profile['address_encrypted'] ?? '') && !empty($profile['address_dek'] ?? '')) {
        $addressJson = $crypto->decryptField($profile['address_encrypted'], $profile['address_dek']);
        $addressData = is_string($addressJson) ? json_decode($addressJson, true) : $addressJson;
        if (is_array($addressData)) {
            if (!empty($addressData['label'])) {
                $addressLabel = trim((string) $addressData['label']);
            }
            if (isset($addressData['lat'], $addressData['lng'])) {
                $mapCenter = ['lat' => (float) $addressData['lat'], 'lng' => (float) $addressData['lng']];
            }
        } elseif (is_string($addressJson) && trim($addressJson) !== '') {
            $addressLabel = trim($addressJson);
        }
    }

    $openingHours = $profile['opening_hours'] ?? null;
    if (is_string($openingHours) && $openingHours !== '') {
        $openingHours = json_decode($openingHours, true);
    }
    $socialLinks = $profile['social_links'] ?? null;
    if (is_string($socialLinks) && $socialLinks !== '') {
        $socialLinks = json_decode($socialLinks, true);
    }
    $data = [
            'id' => $profile['id'],
            'slug' => $profile['public_slug'],
            'name' => $name,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'profile_image_url' => $profile['profile_image_url'],
            'cover_image_url' => $profile['cover_image_url'],
            'biography' => $profile['biography'],
            'faq' => $faq,
            'address' => $addressLabel,
            'map_center' => $mapCenter,
            'website_url' => !empty($profile['website_url']) ? $profile['website_url'] : null,
            'opening_hours' => is_array($openingHours) ? $openingHours : null,
            'social_links' => is_array($socialLinks) ? $socialLinks : null,
            'min_booking_lead_time_hours' => isset($profile['min_booking_lead_time_hours']) ? (int) $profile['min_booking_lead_time_hours'] : 48,
            'accept_rdv_saturday' => isset($profile['accept_rdv_saturday']) ? (bool) $profile['accept_rdv_saturday'] : true,
            'accept_rdv_sunday' => isset($profile['accept_rdv_sunday']) ? (bool) $profile['accept_rdv_sunday'] : true,
            'services' => $services,
            'reviews' => [
                'stats' => $reviewStats,
                'items' => $reviews,
            ],
        ];
    if (!empty($profile['city_plain'])) {
        $data['city_plain'] = $profile['city_plain'];
    }
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage(),
    ]);
}


