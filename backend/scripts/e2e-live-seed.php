<?php

declare(strict_types=1);

/**
 * Après test-db-bootstrap.php : donne un mot de passe aux fixtures pour les e2e « live »
 * (frontend réel + API PHP réelle + MySQL jetable). Refuse toute base qui ne finit pas par "_test".
 * Réseau labo / préleveur : un 2e labo, et les deux labos couvrent Marseille sans délai minimum.
 */

require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../tests/fixtures/TestFixtures.php';

$env = static fn (string $k, string $d = ''): string => (string) (getenv($k) !== false ? getenv($k) : $d);

$name = $env('DB_NAME', 'oneandlab_test');
if (!preg_match('/^[a-z0-9_]+_test$/', $name)) {
    fwrite(STDERR, "Refus : DB_NAME doit finir par _test (reçu: $name)\n");
    exit(1);
}
$password = $env('E2E_LIVE_PASSWORD');
if ($password === '') {
    fwrite(STDERR, "E2E_LIVE_PASSWORD manquant\n");
    exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $env('DB_HOST', '127.0.0.1'), $env('DB_PORT', '3306'), $name),
    $env('DB_USER', 'root'),
    $env('DB_PASS', ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

const E2E_LAB_B = '00000000-0000-4000-8000-00000000c101';
const E2E_LAB_B_EMAIL = 'labo-b@test.invalid';
const E2E_MARSEILLE_LAT = 43.2965;
const E2E_MARSEILLE_LNG = 5.3698;

$crypto = new Crypto();
$labBEmail = $crypto->encryptField(E2E_LAB_B_EMAIL);
$labBFirst = $crypto->encryptField('Labo');
$labBLast = $crypto->encryptField('Second');
$pdo->prepare('
    INSERT IGNORE INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek,
        last_name_encrypted, last_name_dek)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
')->execute([
    E2E_LAB_B, 'lab', $labBEmail['encrypted'], $labBEmail['dek'], hash('sha256', E2E_LAB_B_EMAIL),
    $labBFirst['encrypted'], $labBFirst['dek'], $labBLast['encrypted'], $labBLast['dek'],
]);

$update = $pdo->prepare('UPDATE profiles SET password_hash = ?, password_set_at = NOW(), must_change_password = 0 WHERE id = ?');
$accounts = [
    TestFixtures::PATIENT_A => TestFixtures::profiles()[TestFixtures::PATIENT_A]['email'],
    TestFixtures::LAB => TestFixtures::profiles()[TestFixtures::LAB]['email'],
    TestFixtures::NURSE => TestFixtures::profiles()[TestFixtures::NURSE]['email'],
    TestFixtures::PRO => TestFixtures::profiles()[TestFixtures::PRO]['email'],
    TestFixtures::PRELEVEUR => TestFixtures::profiles()[TestFixtures::PRELEVEUR]['email'],
    TestFixtures::ADMIN => TestFixtures::profiles()[TestFixtures::ADMIN]['email'],
    E2E_LAB_B => E2E_LAB_B_EMAIL,
];
foreach ($accounts as $profileId => $email) {
    $update->execute([password_hash($password, PASSWORD_BCRYPT), $profileId]);
    echo 'Mot de passe e2e défini pour ' . $email . "\n";
}

$labSettings = $pdo->prepare('UPDATE profiles SET is_accepting_appointments = 1, min_booking_lead_time_hours = 0 WHERE id = ?');
$zone = $pdo->prepare('
    INSERT INTO coverage_zones (id, owner_id, role, zone_type, center_lat, center_lng, radius_km, is_active)
    VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)
');
foreach ([TestFixtures::LAB, E2E_LAB_B] as $labId) {
    $labSettings->execute([$labId]);
    $pdo->prepare('DELETE FROM coverage_zones WHERE owner_id = ?')->execute([$labId]);
    $zone->execute([$labId, 'lab', 'circle', E2E_MARSEILLE_LAT, E2E_MARSEILLE_LNG, 20]);
}
echo "Zones labo Marseille prêtes (labo@test.invalid, " . E2E_LAB_B_EMAIL . ")\n";
