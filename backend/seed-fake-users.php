<?php
/**
 * Met à jour les utilisateurs existants en BDD avec des noms et prénoms factices
 * pour prévisualiser le tableau admin (sans toucher aux emails pour garder la connexion).
 *
 * Usage : php seed-fake-users.php
 */

require_once __DIR__ . '/config/database.php';
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

// Récupérer tous les profils (id, role)
$stmt = $pdo->query('SELECT id, role FROM profiles ORDER BY created_at ASC');
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($profiles)) {
    echo "Aucun profil en base.\n";
    exit(0);
}

// Acteur pour le log : premier admin ou super_admin, sinon premier profil
$actorId = null;
$actorRole = 'super_admin';
foreach ($profiles as $p) {
    if ($p['role'] === 'super_admin') {
        $actorId = $p['id'];
        $actorRole = $p['role'];
        break;
    }
}
if (!$actorId) {
    $actorId = $profiles[0]['id'];
    $actorRole = $profiles[0]['role'];
}

$userModel = new User();

$firstNames = [
    'Marie', 'Jean', 'Sophie', 'Pierre', 'Isabelle', 'Nicolas', 'Julie', 'Thomas',
    'Camille', 'Lucas', 'Léa', 'Hugo', 'Manon', 'Louis', 'Chloé', 'Gabriel',
    'Emma', 'Raphaël', 'Laura', 'Arthur', 'Sarah', 'Jules', 'Pauline', 'Alexandre',
    'Claire', 'Antoine', 'Charlotte', 'Maxime', 'Marine', 'David',
];

$lastNames = [
    'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
    'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
    'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier',
    'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand',
];

$count = count($profiles);
$updated = 0;

foreach ($profiles as $i => $p) {
    $firstName = $firstNames[$i % count($firstNames)];
    $lastName = $lastNames[$i % count($lastNames)];

    try {
        $ok = $userModel->update($p['id'], [
            'first_name' => $firstName,
            'last_name' => $lastName,
        ], $actorId, $actorRole);

        if ($ok) {
            $updated++;
            echo sprintf("  [%d/%d] %s %s (id: %s, rôle: %s)\n", $i + 1, $count, $firstName, $lastName, substr($p['id'], 0, 8) . '…', $p['role']);
        }
    } catch (Throwable $e) {
        echo sprintf("  ERREUR id %s : %s\n", $p['id'], $e->getMessage());
    }
}

echo "\nTerminé : $updated / $count profils mis à jour avec un nom et prénom factices.\n";
echo "Les emails n'ont pas été modifiés (connexion inchangée).\n";
