<?php
/**
 * Remplit les adresses (Marseille) et les zones de couverture pour tous les infirmiers,
 * laboratoires et sous-comptes. À exécuter une fois pour voir des données dans /admin/coverage.
 *
 * Usage : php seed-coverage-marseille.php
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/lib/Logger.php';
require_once __DIR__ . '/models/User.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$userModel = new User();
$logger = new Logger();

// Acteur : premier super_admin
$stmt = $pdo->query("SELECT id, role FROM profiles WHERE role = 'super_admin' LIMIT 1");
$actor = $stmt->fetch(PDO::FETCH_ASSOC);
$actorId = $actor['id'] ?? null;
$actorRole = $actor['role'] ?? 'super_admin';
if (!$actorId) {
    $stmt = $pdo->query("SELECT id, role FROM profiles LIMIT 1");
    $actor = $stmt->fetch(PDO::FETCH_ASSOC);
    $actorId = $actor['id'];
    $actorRole = $actor['role'];
}

// Adresses à Marseille (variées)
$marseilleAddresses = [
    ['label' => '1 Quai du Port, 13002 Marseille', 'lat' => 43.2965, 'lng' => 5.3698],
    ['label' => '15 La Canebière, 13001 Marseille', 'lat' => 43.3020, 'lng' => 5.3745],
    ['label' => '50 Rue Paradis, 13006 Marseille', 'lat' => 43.2728, 'lng' => 5.3872],
    ['label' => '8 Boulevard de la Libération, 13001 Marseille', 'lat' => 43.2980, 'lng' => 5.3820],
    ['label' => '22 Rue de la République, 13002 Marseille', 'lat' => 43.2945, 'lng' => 5.3710],
    ['label' => '100 Avenue du Prado, 13008 Marseille', 'lat' => 43.2580, 'lng' => 5.3920],
];

$radiusOptions = [10, 15, 20, 25, 30];

$labNames = ['Labo Marseille Nord', 'Labo La Timone', 'Labo Sainte-Marguerite', 'Labo Analyses Prado', 'Labo République', 'Labo Vieux-Port'];
$subaccountNames = ['Sous-compte Labo Marseille Nord', 'Sous-compte Labo La Timone', 'Sous-compte Analyses Prado', 'Sous-compte Prélèvements Sud', 'Sous-compte Labo République'];

$stmt = $pdo->query("SELECT id, role FROM profiles WHERE role IN ('nurse', 'lab', 'subaccount') ORDER BY role, id");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($profiles)) {
    echo "Aucun profil infirmier / lab / sous-compte en base.\n";
    exit(0);
}

echo "Acteur: $actorId ($actorRole)\n";
echo count($profiles) . " profil(s) à traiter (nurse, lab, subaccount).\n\n";

$labIndex = 0;
$subIndex = 0;
$i = 0;
foreach ($profiles as $p) {
    $addr = $marseilleAddresses[$i % count($marseilleAddresses)];
    $radius = $radiusOptions[$i % count($radiusOptions)];
    $i++;

    if (in_array($p['role'], ['lab', 'subaccount'], true)) {
        $companyName = $p['role'] === 'lab'
            ? $labNames[$labIndex++ % count($labNames)]
            : $subaccountNames[$subIndex++ % count($subaccountNames)];
        try {
            $userModel->update($p['id'], ['company_name' => $companyName], $actorId, $actorRole);
            echo "  [OK] Nom d'entité pour {$p['id']} ({$p['role']}): {$companyName}\n";
        } catch (Throwable $e) {
            echo "  [ERREUR] company_name pour {$p['id']}: " . $e->getMessage() . "\n";
        }
    }

    try {
        $userModel->update($p['id'], ['address' => $addr], $actorId, $actorRole);
        echo "  [OK] Adresse mise à jour pour {$p['id']} ({$p['role']}): {$addr['label']}\n";
    } catch (Throwable $e) {
        echo "  [ERREUR] Adresse pour {$p['id']}: " . $e->getMessage() . "\n";
        continue;
    }

    $stmt = $pdo->prepare("SELECT id FROM coverage_zones WHERE owner_id = ? AND role = ? LIMIT 1");
    $stmt->execute([$p['id'], $p['role']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    try {
        if ($existing) {
            $stmt = $pdo->prepare("UPDATE coverage_zones SET center_lat = ?, center_lng = ?, radius_km = ?, is_active = 1, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$addr['lat'], $addr['lng'], $radius, $existing['id']]);
            echo "  [OK] Zone mise à jour: rayon {$radius} km\n";
        } else {
            $zoneId = bin2hex(random_bytes(16));
            $stmt = $pdo->prepare("
                INSERT INTO coverage_zones (id, owner_id, role, center_lat, center_lng, radius_km, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $stmt->execute([$zoneId, $p['id'], $p['role'], $addr['lat'], $addr['lng'], $radius]);
            echo "  [OK] Zone créée: rayon {$radius} km\n";
        }
    } catch (Throwable $e) {
        echo "  [ERREUR] Zone pour {$p['id']}: " . $e->getMessage() . "\n";
    }

    echo "\n";
}

echo "Terminé. Rechargez /admin/coverage pour voir la liste.\n";
