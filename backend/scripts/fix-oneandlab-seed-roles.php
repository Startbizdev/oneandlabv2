<?php

/**
 * Répare les rôles des comptes de test @oneandlab.fr en base (local / dev).
 *
 * Cas typique : inscription patient avec admin@oneandlab.fr avant le seed → l’INSERT super_admin
 * échoue (email_hash unique) et le compte reste « patient ».
 *
 * Usage : php backend/scripts/fix-oneandlab-seed-roles.php
 */

require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$seed = [
    ['role' => 'super_admin', 'email' => 'admin@oneandlab.fr'],
    ['role' => 'lab', 'email' => 'lab@oneandlab.fr'],
    ['role' => 'subaccount', 'email' => 'subaccount@oneandlab.fr'],
    ['role' => 'preleveur', 'email' => 'preleveur@oneandlab.fr'],
    ['role' => 'nurse', 'email' => 'infirmier@oneandlab.fr'],
    ['role' => 'pro', 'email' => 'pro@oneandlab.fr'],
    ['role' => 'patient', 'email' => 'patient@oneandlab.fr'],
];

$fixed = 0;
foreach ($seed as $row) {
    $hash = hash('sha256', strtolower($row['email']));
    $stmt = $pdo->prepare('UPDATE profiles SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email_hash = ? AND role <> ?');
    $stmt->execute([$row['role'], $hash, $row['role']]);
    $n = $stmt->rowCount();
    if ($n > 0) {
        echo "OK {$row['email']} → {$row['role']}\n";
        $fixed += $n;
    }
}

echo $fixed > 0 ? "Terminé : {$fixed} profil(s) mis à jour.\n" : "Rien à corriger (rôles déjà alignés ou emails absents).\n";
