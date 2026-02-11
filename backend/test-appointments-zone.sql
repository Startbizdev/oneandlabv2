-- Script de test pour vérifier les rendez-vous dans la zone de couverture
-- À exécuter dans MAMP/phpMyAdmin

SET @nurse_id = 'a12ef4c2-f141-4b67-9624-b080b6e723a8';
SET @center_lat = 43.29097;
SET @center_lng = 5.366591;
SET @radius_km = 40;

-- 1. Vérifier la zone de couverture
SELECT '1. Zone de couverture' as test;
SELECT center_lat, center_lng, radius_km 
FROM coverage_zones 
WHERE owner_id = @nurse_id AND role = 'nurse' AND is_active = TRUE;

-- 2. Tous les rendez-vous pending
SELECT '2. Tous les rendez-vous pending' as test;
SELECT id, status, assigned_nurse_id, location_lat, location_lng, category_id, type
FROM appointments 
WHERE status = 'pending';

-- 3. Rendez-vous pending non assignés avec coordonnées
SELECT '3. Rendez-vous pending non assignés avec coordonnées' as test;
SELECT 
    id, 
    location_lat, 
    location_lng,
    (6371 * acos(
        cos(@center_lat * PI() / 180) * cos(location_lat * PI() / 180) *
        cos(location_lng * PI() / 180 - @center_lng * PI() / 180) +
        sin(@center_lat * PI() / 180) * sin(location_lat * PI() / 180)
    )) as distance_km,
    CASE 
        WHEN (6371 * acos(
            cos(@center_lat * PI() / 180) * cos(location_lat * PI() / 180) *
            cos(location_lng * PI() / 180 - @center_lng * PI() / 180) +
            sin(@center_lat * PI() / 180) * sin(location_lat * PI() / 180)
        )) <= @radius_km THEN 'YES'
        ELSE 'NO'
    END as in_zone
FROM appointments 
WHERE status = 'pending' 
AND assigned_nurse_id IS NULL 
AND location_lat IS NOT NULL 
AND location_lng IS NOT NULL;

-- 4. Préférences de catégories
SELECT '4. Préférences de catégories' as test;
SELECT category_id, is_enabled 
FROM nurse_category_preferences 
WHERE nurse_id = @nurse_id;

-- 5. Test de la requête complète (simplifiée)
SELECT '5. Requête complète (simplifiée)' as test;
SELECT 
    a.id,
    a.status,
    a.assigned_nurse_id,
    a.location_lat,
    a.location_lng,
    a.category_id,
    (6371 * acos(
        cos(@center_lat * PI() / 180) * cos(a.location_lat * PI() / 180) *
        cos(a.location_lng * PI() / 180 - @center_lng * PI() / 180) +
        sin(@center_lat * PI() / 180) * sin(a.location_lat * PI() / 180)
    )) as distance_km
FROM appointments a
WHERE a.status = 'pending'
AND (
    a.assigned_nurse_id = @nurse_id OR 
    (a.assigned_to = @nurse_id AND a.type = 'nursing') OR
    (
        a.status = 'pending' 
        AND a.assigned_nurse_id IS NULL 
        AND a.location_lat IS NOT NULL 
        AND a.location_lng IS NOT NULL
        AND (
            6371 * acos(
                cos(@center_lat * PI() / 180) * cos(a.location_lat * PI() / 180) *
                cos(a.location_lng * PI() / 180 - @center_lng * PI() / 180) +
                sin(@center_lat * PI() / 180) * sin(a.location_lat * PI() / 180)
            )
        ) <= @radius_km
    )
)
AND (
    a.category_id IS NULL OR
    a.category_id IN (
        SELECT category_id
        FROM nurse_category_preferences
        WHERE nurse_id = @nurse_id AND is_enabled = TRUE
    )
)
LIMIT 10;




