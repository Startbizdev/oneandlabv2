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
    
    // Récupérer le profil public du sous-lab
    $stmt = $db->prepare('
        SELECT 
            id,
            role,
            public_slug,
            profile_image_url,
            cover_image_url,
            biography,
            faq,
            is_public_profile_enabled,
            first_name_encrypted,
            first_name_dek,
            last_name_encrypted,
            last_name_dek
        FROM profiles
        WHERE public_slug = ? 
        AND role = "subaccount"
        AND is_public_profile_enabled = TRUE
    ');
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
    
    // Pour les labs, on peut récupérer les catégories de prélèvements disponibles
    // (toutes les catégories actives de type 'blood_test')
    $stmt = $db->prepare('
        SELECT 
            id,
            name,
            description,
            type
        FROM care_categories
        WHERE type = "blood_test"
        AND is_active = TRUE
        ORDER BY name
    ');
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
            'services' => $services,
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


