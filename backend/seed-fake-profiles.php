<?php
/**
 * Remplit les profils factices (nurse, lab, subaccount, preleveur) avec toutes les infos
 * d'inscription : RPPS, Adeli, SIRET, adresse, téléphone, genre, date de naissance, etc.
 *
 * Usage : php seed-fake-profiles.php
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

$marseilleAddresses = [
    ['label' => '1 Quai du Port, 13002 Marseille', 'lat' => 43.2965, 'lng' => 5.3698],
    ['label' => '15 La Canebière, 13001 Marseille', 'lat' => 43.3020, 'lng' => 5.3745],
    ['label' => '50 Rue Paradis, 13006 Marseille', 'lat' => 43.2728, 'lng' => 5.3872],
    ['label' => '8 Boulevard de la Libération, 13001 Marseille', 'lat' => 43.2980, 'lng' => 5.3820],
    ['label' => '22 Rue de la République, 13002 Marseille', 'lat' => 43.2945, 'lng' => 5.3710],
    ['label' => '100 Avenue du Prado, 13008 Marseille', 'lat' => 43.2580, 'lng' => 5.3920],
];

$labNames = ['Labo Marseille Nord', 'Labo La Timone', 'Labo Sainte-Marguerite', 'Labo Analyses Prado', 'Labo République', 'Labo Vieux-Port'];
$subaccountNames = ['Sous-compte Labo Marseille Nord', 'Sous-compte Labo La Timone', 'Sous-compte Analyses Prado', 'Sous-compte Prélèvements Sud', 'Sous-compte Labo République'];

// RPPS 11 chiffres, Adeli 9 chiffres, SIRET 14 chiffres (factices)
$rppsList = ['10001234567', '10009876543', '10005551234'];
$adeliList = ['139012345', '139098765', '139055512'];
$siretList = ['12345678901234', '98765432109876', '55555555000012'];
$phones = ['06 12 34 56 78', '06 98 76 54 32', '07 11 22 33 44'];
$genders = ['M', 'F'];
$birthDates = ['1985-01-15', '1990-06-20', '1982-11-08'];

echo "Remplissage des profils factices (nurse, lab, subaccount, preleveur)\n\n";

$stmt = $pdo->query("SELECT id, role FROM profiles WHERE role IN ('nurse', 'lab', 'subaccount', 'preleveur') ORDER BY role, id");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($profiles)) {
    echo "Aucun profil nurse / lab / subaccount / preleveur en base.\n";
    exit(0);
}

$nurseIndex = $labIndex = $subIndex = $preleveurIndex = 0;
$addrIndex = 0;

foreach ($profiles as $p) {
    $updates = [];
    $addr = $marseilleAddresses[$addrIndex % count($marseilleAddresses)];
    $addrIndex++;

    switch ($p['role']) {
        case 'nurse':
            $updates = [
                'address' => $addr,
                'phone' => $phones[$nurseIndex % count($phones)],
                'gender' => $genders[$nurseIndex % count($genders)],
                'birth_date' => $birthDates[$nurseIndex % count($birthDates)],
                'rpps' => $rppsList[$nurseIndex % count($rppsList)],
                'adeli' => $adeliList[$nurseIndex % count($adeliList)],
            ];
            $nurseIndex++;
            break;
        case 'lab':
            $updates = [
                'address' => $addr,
                'phone' => $phones[$labIndex % count($phones)],
                'siret' => $siretList[$labIndex % count($siretList)],
                'company_name' => $labNames[$labIndex % count($labNames)],
            ];
            $labIndex++;
            break;
        case 'subaccount':
            $updates = [
                'address' => $addr,
                'phone' => $phones[$subIndex % count($phones)],
                'company_name' => $subaccountNames[$subIndex % count($subaccountNames)],
            ];
            $subIndex++;
            break;
        case 'preleveur':
            $updates = [
                'address' => $addr,
                'phone' => $phones[$preleveurIndex % count($phones)],
            ];
            $preleveurIndex++;
            break;
    }

    if (empty($updates)) {
        continue;
    }

    try {
        $userModel->update($p['id'], $updates, $actorId, $actorRole);
        $summary = [];
        foreach ($updates as $k => $v) {
            if ($k === 'address' && is_array($v)) {
                $summary[] = 'adresse=' . ($v['label'] ?? 'ok');
            } elseif ($k !== 'address') {
                $summary[] = $k . '=' . (is_scalar($v) ? $v : 'ok');
            }
        }
        echo "  [OK] {$p['id']} ({$p['role']}) → " . implode(', ', $summary) . "\n";
    } catch (Throwable $e) {
        echo "  [ERREUR] {$p['id']} ({$p['role']}): " . $e->getMessage() . "\n";
    }
}

echo "\nTerminé. Rechargez /admin/users et ouvrez le détail d'un utilisateur pour voir toutes les infos.\n";
