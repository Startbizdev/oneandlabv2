<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require_once __DIR__ . '/config/database.php';
    
    $config = require __DIR__ . '/config/database.php';
    
    echo "Connexion à la base de données...\n";
    echo "Host: {$config['host']}, Port: {$config['port']}, Database: {$config['database']}, User: {$config['username']}\n\n";
    
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    // Essayer avec le mot de passe configuré, sinon essayer 'root' (MAMP par défaut)
    $password = $config['password'] ?: 'root';
    $db = new PDO($dsn, $config['username'], $password, $config['options']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✓ Connexion réussie\n\n";
} catch (Exception $e) {
    echo "✗ Erreur de connexion: " . $e->getMessage() . "\n";
    exit(1);
}

$nurseId = 'a12ef4c2-f141-4b67-9624-b080b6e723a8';

echo "=== TEST APPOINTMENTS ZONE ===\n\n";

// 1. Vérifier la zone de couverture
echo "1. Zone de couverture:\n";
$coverageSql = 'SELECT center_lat, center_lng, radius_km FROM coverage_zones WHERE owner_id = ? AND role = ? AND is_active = TRUE LIMIT 1';
$stmt = $db->prepare($coverageSql);
$stmt->execute([$nurseId, 'nurse']);
$coverageZone = $stmt->fetch(PDO::FETCH_ASSOC);
if ($coverageZone) {
    echo "   ✓ Zone trouvée: lat={$coverageZone['center_lat']}, lng={$coverageZone['center_lng']}, radius={$coverageZone['radius_km']}km\n\n";
    $centerLat = floatval($coverageZone['center_lat']);
    $centerLng = floatval($coverageZone['center_lng']);
    $radiusKm = floatval($coverageZone['radius_km']);
} else {
    echo "   ✗ AUCUNE ZONE DE COUVERTURE TROUVÉE\n\n";
    exit;
}

// 2. Tous les rendez-vous pending
echo "2. Tous les rendez-vous pending:\n";
$allPendingSql = "SELECT id, status, assigned_nurse_id, location_lat, location_lng, category_id, type FROM appointments WHERE status = 'pending'";
$stmt = $db->prepare($allPendingSql);
$stmt->execute();
$allPending = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "   Total: " . count($allPending) . "\n";
foreach ($allPending as $apt) {
    echo "   - ID: {$apt['id']}\n";
    echo "     assigned_nurse_id: " . ($apt['assigned_nurse_id'] ?? 'NULL') . "\n";
    echo "     location_lat: " . ($apt['location_lat'] ?? 'NULL') . "\n";
    echo "     location_lng: " . ($apt['location_lng'] ?? 'NULL') . "\n";
    echo "     category_id: " . ($apt['category_id'] ?? 'NULL') . "\n";
    echo "     type: " . ($apt['type'] ?? 'NULL') . "\n";
}
echo "\n";

// 3. Rendez-vous pending non assignés avec coordonnées
echo "3. Rendez-vous pending non assignés avec coordonnées:\n";
$pendingWithCoordsSql = "SELECT id, location_lat, location_lng FROM appointments WHERE status = 'pending' AND assigned_nurse_id IS NULL AND location_lat IS NOT NULL AND location_lng IS NOT NULL";
$stmt = $db->prepare($pendingWithCoordsSql);
$stmt->execute();
$pendingWithCoords = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "   Total: " . count($pendingWithCoords) . "\n";
foreach ($pendingWithCoords as $apt) {
    $aptLat = floatval($apt['location_lat']);
    $aptLng = floatval($apt['location_lng']);
    
    // Calculer la distance
    $distance = 6371 * acos(
        cos(deg2rad($centerLat)) * cos(deg2rad($aptLat)) *
        cos(deg2rad($aptLng) - deg2rad($centerLng)) +
        sin(deg2rad($centerLat)) * sin(deg2rad($aptLat))
    );
    
    $inZone = $distance <= $radiusKm;
    echo "   - ID: {$apt['id']}\n";
    echo "     lat: {$aptLat}, lng: {$aptLng}\n";
    echo "     distance: " . round($distance, 2) . "km\n";
    echo "     inZone: " . ($inZone ? '✓ YES' : '✗ NO') . "\n";
}
echo "\n";

// 4. Préférences de catégories
echo "4. Préférences de catégories:\n";
$prefsSql = "SELECT category_id, is_enabled FROM nurse_category_preferences WHERE nurse_id = ?";
$stmt = $db->prepare($prefsSql);
$stmt->execute([$nurseId]);
$prefs = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (count($prefs) > 0) {
    echo "   Préférences trouvées:\n";
    foreach ($prefs as $pref) {
        echo "   - category_id: {$pref['category_id']}, enabled: " . ($pref['is_enabled'] ? 'YES' : 'NO') . "\n";
    }
} else {
    echo "   Aucune préférence (toutes les catégories acceptées)\n";
}
echo "\n";

// 5. Test de la requête complète
echo "5. Test de la requête complète:\n";
$testSql = "
    SELECT a.*
    FROM appointments a
    WHERE 1=1
    AND (
        a.assigned_nurse_id = ? OR 
        (a.assigned_to = ? AND a.type = 'nursing') OR
        (
            a.status = 'pending' 
            AND a.assigned_nurse_id IS NULL 
            AND a.location_lat IS NOT NULL 
            AND a.location_lng IS NOT NULL
            AND (
                6371 * acos(
                    cos(? * PI() / 180) * cos(a.location_lat * PI() / 180) *
                    cos(a.location_lng * PI() / 180 - ? * PI() / 180) +
                    sin(? * PI() / 180) * sin(a.location_lat * PI() / 180)
                )
            ) <= ?
        )
    )
    AND (
        a.category_id IS NULL OR
        a.category_id IN (
            SELECT category_id
            FROM nurse_category_preferences
            WHERE nurse_id = ? AND is_enabled = TRUE
        )
    )
    LIMIT 10
";

$stmt = $db->prepare($testSql);
$stmt->execute([
    $nurseId,
    $nurseId,
    $centerLat,
    $centerLng,
    $centerLat,
    $radiusKm,
    $nurseId
]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "   Résultats: " . count($results) . "\n";
foreach ($results as $result) {
    echo "   - ID: {$result['id']}\n";
    echo "     status: {$result['status']}\n";
    echo "     assigned_nurse_id: " . ($result['assigned_nurse_id'] ?? 'NULL') . "\n";
    echo "     location_lat: " . ($result['location_lat'] ?? 'NULL') . "\n";
    echo "     location_lng: " . ($result['location_lng'] ?? 'NULL') . "\n";
    echo "     category_id: " . ($result['category_id'] ?? 'NULL') . "\n";
}

echo "\n=== FIN TEST ===\n";

