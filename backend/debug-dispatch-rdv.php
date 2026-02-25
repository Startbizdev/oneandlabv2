#!/usr/bin/env php
<?php
/**
 * Diagnostic : pourquoi aucun lab n'a reçu ce RDV ?
 * Usage: php debug-dispatch-rdv.php <appointment_id>
 * Ex:    php debug-dispatch-rdv.php 874b3143-e062-4230-abde-f744b2b4a9fa
 */

$appointmentId = $argv[1] ?? null;
if (!$appointmentId) {
    echo "Usage: php debug-dispatch-rdv.php <appointment_id>\n";
    exit(1);
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

// 1. Charger le RDV
$stmt = $db->prepare('SELECT id, type, location_lat, location_lng, scheduled_at, status, assigned_lab_id FROM appointments WHERE id = ?');
$stmt->execute([$appointmentId]);
$apt = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$apt) {
    echo "RDV introuvable: {$appointmentId}\n";
    exit(1);
}

$type = $apt['type'] ?? '';
$lat = isset($apt['location_lat']) ? (float) $apt['location_lat'] : null;
$lng = isset($apt['location_lng']) ? (float) $apt['location_lng'] : null;
$scheduledAt = $apt['scheduled_at'] ?? null;

echo "=== RDV {$appointmentId} ===\n";
echo "Type: {$type}\n";
echo "Scheduled: {$scheduledAt}\n";
echo "Location: lat={$lat}, lng={$lng}\n";
echo "Assigned lab: " . ($apt['assigned_lab_id'] ?? 'null') . "\n\n";

if ($type !== 'blood_test') {
    echo "Ce RDV n'est pas une prise de sang. Le dispatch lab ne concerne que blood_test.\n";
    exit(0);
}

if ($lat === null || $lng === null || ($lat == 0 && $lng == 0)) {
    echo "ATTENTION: Pas de coordonnées (lat/lng) sur ce RDV. Le dispatch géographique ne peut pas calculer les distances.\n";
    echo "Vérifiez que l'adresse du RDV a bien été envoyée avec lat/lng à la création.\n";
    exit(1);
}

// 2. Zones lab/subaccount (même requête que dispatchGeographic)
$sql = "
    SELECT cz.id as zone_id, cz.owner_id, cz.radius_km, cz.center_lat, cz.center_lng,
           p.id as profile_id, p.role,
           p.address_encrypted, p.address_dek,
           p.is_accepting_appointments,
           COALESCE(p.min_booking_lead_time_hours, 48) as min_booking_lead_time_hours,
           COALESCE(p.accept_rdv_saturday, 1) as accept_rdv_saturday,
           COALESCE(p.accept_rdv_sunday, 1) as accept_rdv_sunday
    FROM coverage_zones cz
    INNER JOIN profiles p ON cz.owner_id = p.id
    WHERE cz.role IN ('lab', 'subaccount')
    AND cz.is_active = TRUE
    AND cz.radius_km IS NOT NULL
";
$stmt = $db->prepare($sql);
$stmt->execute();
$zones = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== Zones de couverture (lab/subaccount) ===\n";
echo "Nombre de zones actives (tous lab/subaccount): " . count($zones) . "\n";

// Requête SANS la condition address pour voir combien de labs ont une zone mais pas d'adresse
$sqlNoAddr = "
    SELECT cz.owner_id, p.id, p.role,
           (p.address_encrypted IS NOT NULL AND p.address_dek IS NOT NULL) as has_address
    FROM coverage_zones cz
    INNER JOIN profiles p ON cz.owner_id = p.id
    WHERE cz.role IN ('lab', 'subaccount')
    AND cz.is_active = TRUE
    AND cz.radius_km IS NOT NULL
";
$stmt2 = $db->prepare($sqlNoAddr);
$stmt2->execute();
$allZones = $stmt2->fetchAll(PDO::FETCH_ASSOC);
$withAddress = count(array_filter($allZones, fn($z) => !empty($z['has_address'])));
$withoutAddress = count($allZones) - $withAddress;
if ($withoutAddress > 0) {
    echo "ATTENTION: {$withoutAddress} zone(s) ont un lab/sous-compte SANS adresse dans le profil (ils sont exclus du dispatch actuel).\n";
}
echo "\n";

$crypto = new Crypto();
$professionals = [];
foreach ($zones as $zone) {
    $isInZone = false;
    $distance = null;
    $usedCenter = false;
    $error = null;

    if (!empty($zone['address_encrypted']) && !empty($zone['address_dek'])) {
        try {
            $addressJson = $crypto->decryptField($zone['address_encrypted'], $zone['address_dek']);
            $address = json_decode($addressJson, true);
            if ($address && isset($address['lat'], $address['lng'], $zone['radius_km'])) {
                $profLat = (float) $address['lat'];
                $profLng = (float) $address['lng'];
                $radiusKm = (float) $zone['radius_km'];
                $distance = 6371 * acos(
                    cos(deg2rad($lat)) * cos(deg2rad($profLat)) *
                    cos(deg2rad($profLng) - deg2rad($lng)) +
                    sin(deg2rad($lat)) * sin(deg2rad($profLat))
                );
                $isInZone = $distance <= $radiusKm;
            }
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    } else {
        if (isset($zone['center_lat'], $zone['center_lng'], $zone['radius_km'])) {
            $usedCenter = true;
            $distance = 6371 * acos(
                cos(deg2rad($lat)) * cos(deg2rad($zone['center_lat'])) *
                cos(deg2rad($zone['center_lng']) - deg2rad($lng)) +
                sin(deg2rad($lat)) * sin(deg2rad($zone['center_lat']))
            );
            $isInZone = $distance <= (float) $zone['radius_km'];
        }
    }

    $rawAccept = $zone['is_accepting_appointments'] ?? null;
    $rawSat = $zone['accept_rdv_saturday'] ?? null;
    $rawSun = $zone['accept_rdv_sunday'] ?? null;
    echo "  Lab/Sub profile_id={$zone['profile_id']} role={$zone['role']} radius_km={$zone['radius_km']}";
    echo " [en base: is_accepting_appointments=" . json_encode($rawAccept) . " accept_rdv_saturday=" . json_encode($rawSat) . " accept_rdv_sunday=" . json_encode($rawSun) . "]";
    if ($error) {
        echo " ERREUR déchiffrement: {$error}";
    } else {
        echo " distance=" . ($distance !== null ? round($distance, 2) . ' km' : '?') . ($usedCenter ? ' (centre zone)' : '') . " " . ($isInZone ? 'DANS ZONE' : 'hors zone');
    }
    echo "\n";

    if ($isInZone) {
        $professionals[] = [
            'id' => $zone['profile_id'],
            'role' => $zone['role'],
            'is_accepting_appointments' => (bool) ($zone['is_accepting_appointments'] ?? false),
            'min_booking_lead_time_hours' => (int) ($zone['min_booking_lead_time_hours'] ?? 48),
            'accept_rdv_saturday' => (bool) ($zone['accept_rdv_saturday'] ?? true),
            'accept_rdv_sunday' => (bool) ($zone['accept_rdv_sunday'] ?? true),
        ];
    }
}

echo "\n=== Après filtre distance ===\n";
echo "Professionnels dans la zone: " . count($professionals) . "\n";

if (count($professionals) === 0) {
    echo "\nAucun lab/sous-compte n'a une zone qui couvre les coordonnées de ce RDV.\n";
    echo "Causes possibles:\n";
    echo "  - Aucune zone de couverture créée pour les labs (table coverage_zones)\n";
    echo "  - Les labs n'ont pas d'adresse dans leur profil (requis actuellement pour le calcul de distance)\n";
    echo "  - Le rayon (radius_km) des zones est trop petit par rapport à la distance RDV ↔ lab\n";
    exit(0);
}

// 3. Filtre blood_test (délai min, samedi/dimanche, is_accepting)
if ($scheduledAt !== null && $scheduledAt !== '') {
    $scheduledTs = strtotime($scheduledAt);
    $dayOfWeek = (int) date('w', $scheduledTs);
    $dayName = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][$dayOfWeek];
    $now = time();
    echo "\n=== Filtre blood_test (date RDV: {$scheduledAt}, {$dayName}) ===\n";
    $before = count($professionals);
    $professionals = array_filter($professionals, function ($p) use ($scheduledTs, $now, $dayOfWeek) {
        if (empty($p['is_accepting_appointments'])) return false;
        if ($dayOfWeek === 0 && empty($p['accept_rdv_sunday'])) return false;
        if ($dayOfWeek === 6 && empty($p['accept_rdv_saturday'])) return false;
        $minHours = (int) ($p['min_booking_lead_time_hours'] ?? 48);
        if ($minHours > 0) {
            $minAllowedTs = $now + ($minHours * 3600);
            if ($scheduledTs < $minAllowedTs) return false;
        }
        return true;
    });
    echo "Exclus par filtre (acceptation, délai min, samedi/dimanche): " . ($before - count($professionals)) . "\n";
    echo "Restants qui auraient dû recevoir la notif: " . count($professionals) . "\n";
} else {
    echo "\nPas de scheduled_at sur le RDV: le filtre délai/samedi/dimanche n'est pas appliqué.\n";
}

if (count($professionals) === 0) {
    echo "\nTous les labs dans la zone ont été exclus par le filtre (n'acceptent pas les RDV, ou délai min non respecté, ou jour non accepté).\n";
    echo "Rappel: le filtre utilise le profil du propriétaire de la zone (profile_id ci-dessus). Si la zone appartient à un sous-compte, ce sont les réglages de ce sous-compte (Profil public, Je prends des rendez-vous, RDV samedi/dimanche) qui comptent. Vérifier ces valeurs en base ci-dessus et dans l’interface profil du bon compte.\n";
}

echo "\n=== Résumé ===\n";
echo "Nombre de labs/sous-comptes qui auraient dû recevoir ce RDV: " . count($professionals) . "\n";
if (count($professionals) > 0) {
    foreach ($professionals as $p) {
        echo "  - profile_id={$p['id']} role={$p['role']}\n";
    }
}
