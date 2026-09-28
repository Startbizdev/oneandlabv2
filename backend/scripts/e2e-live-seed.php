<?php

declare(strict_types=1);

/**
 * Après test-db-bootstrap.php : donne un mot de passe au patient et au labo fixtures pour les e2e « live »
 * (frontend réel + API PHP réelle + MySQL jetable). Refuse toute base qui ne finit pas par "_test".
 */

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

$update = $pdo->prepare('UPDATE profiles SET password_hash = ?, password_set_at = NOW(), must_change_password = 0 WHERE id = ?');
foreach ([TestFixtures::PATIENT_A, TestFixtures::LAB] as $profileId) {
    $update->execute([password_hash($password, PASSWORD_BCRYPT), $profileId]);
    echo 'Mot de passe e2e défini pour ' . TestFixtures::profiles()[$profileId]['email'] . "\n";
}
