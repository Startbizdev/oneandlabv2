<?php

/**
 * Script : attribuer le préleveur Jean à un labo, créer le patient Thomas et des RDV de prise de sang assignés au préleveur.
 * Usage: php setup-preleveur-and-rdv.php
 */

$envFile = __DIR__ . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/Appointment.php';
require_once __DIR__ . '/models/User.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$crypto = new Crypto();
$appointmentModel = new Appointment();
$userModel = new User();

echo "=== Attribution préleveur → labo + patient Thomas + RDV prise de sang ===\n\n";

// 1. Récupérer un labo
$stmt = $pdo->query("SELECT id FROM profiles WHERE role = 'lab' LIMIT 1");
$lab = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$lab) {
    echo "❌ Aucun laboratoire en base. Créez d'abord un compte lab.\n";
    exit(1);
}
$labId = $lab['id'];
echo "1. Labo trouvé: $labId\n";

// 2. Récupérer le préleveur (celui sans lab_id)
$preleveurId = '483aea9d-bf75-3c27-9f9c-6c8768c191c0';
$stmt = $pdo->prepare("SELECT id, lab_id FROM profiles WHERE id = ? AND role = 'preleveur'");
$stmt->execute([$preleveurId]);
$preleveur = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$preleveur) {
    // Essayer sans tirets (format BDD)
    $preleveurIdAlt = str_replace('-', '', $preleveurId);
    $stmt->execute([$preleveurIdAlt]);
    $preleveur = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($preleveur) {
        $preleveurId = $preleveur['id'];
    }
}
if (!$preleveur) {
    $stmt = $pdo->query("SELECT id FROM profiles WHERE role = 'preleveur' AND lab_id IS NULL LIMIT 1");
    $preleveur = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($preleveur) {
        $preleveurId = $preleveur['id'];
    }
}
if (!$preleveur) {
    echo "❌ Aucun préleveur trouvé (sans lab_id ou id 483aea9d-...).\n";
    exit(1);
}

$stmt = $pdo->prepare("UPDATE profiles SET lab_id = ? WHERE id = ?");
$stmt->execute([$labId, $preleveurId]);
echo "2. Préleveur $preleveurId rattaché au labo $labId\n";

// 3. Créer ou trouver le patient Thomas
$patientEmail = 'thomas.patient@oneandlab.fr';
$patientEmailHash = hash('sha256', strtolower($patientEmail));
$stmt = $pdo->prepare('SELECT id FROM profiles WHERE email_hash = ?');
$stmt->execute([$patientEmailHash]);
$existingPatient = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingPatient) {
    $patientId = $existingPatient['id'];
    echo "3. Patient Thomas existant: $patientId\n";
} else {
    $patientId = sprintf(
        '%08s-%04s-%04s-%04s-%012s',
        bin2hex(random_bytes(4)),
        bin2hex(random_bytes(2)),
        bin2hex(random_bytes(2)),
        bin2hex(random_bytes(2)),
        bin2hex(random_bytes(6))
    );
    $emailData = $crypto->encryptField($patientEmail);
    $firstNameData = $crypto->encryptField('Thomas');
    $lastNameData = $crypto->encryptField('Patient');
    $phoneData = $crypto->encryptField('0611223344');
    $stmt = $pdo->prepare('INSERT INTO profiles (
        id, role, email_encrypted, email_dek, email_hash,
        first_name_encrypted, first_name_dek,
        last_name_encrypted, last_name_dek,
        phone_encrypted, phone_dek,
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
    $stmt->execute([
        $patientId,
        'patient',
        $emailData['encrypted'],
        $emailData['dek'],
        $patientEmailHash,
        $firstNameData['encrypted'],
        $firstNameData['dek'],
        $lastNameData['encrypted'],
        $lastNameData['dek'],
        $phoneData['encrypted'],
        $phoneData['dek'],
    ]);
    echo "3. Patient Thomas créé: $patientId ($patientEmail)\n";
}

// 4. Catégorie prise de sang
$stmt = $pdo->query("SELECT id FROM care_categories WHERE type = 'blood_test' AND is_active = 1 LIMIT 1");
$category = $stmt->fetch(PDO::FETCH_ASSOC);
$categoryId = $category ? $category['id'] : null;

$address = [
    'label' => '10 rue Paradis, 13006 Marseille',
    'lat' => 43.2900,
    'lng' => 5.3750,
    'postal_code' => '13006',
    'city' => 'Marseille',
    'country' => 'France',
];

// 5. Créer 3 RDV prise de sang assignés au labo puis au préleveur
$schedules = [
    date('Y-m-d H:i:s', strtotime('+2 days 09:00')),
    date('Y-m-d H:i:s', strtotime('+3 days 14:00')),
    date('Y-m-d H:i:s', strtotime('+5 days 10:30')),
];

$createdIds = [];
foreach ($schedules as $scheduledAt) {
    $appointmentData = [
        'type' => 'blood_test',
        'form_type' => 'blood_test',
        'category_id' => $categoryId,
        'patient_id' => $patientId,
        'address' => $address,
        'assigned_lab_id' => $labId,
        'form_data' => [
            'first_name' => 'Thomas',
            'last_name' => 'Patient',
            'phone' => '0611223344',
            'email' => $patientEmail,
            'address' => $address,
            'birth_date' => '1990-05-20',
            'blood_test_type' => 'single',
        ],
        'scheduled_at' => $scheduledAt,
    ];
    try {
        $aptId = $appointmentModel->create($appointmentData, $labId, 'lab');
        $createdIds[] = $aptId;
        // Assigner au préleveur (assigned_to)
        $pdo->prepare("UPDATE appointments SET assigned_to = ? WHERE id = ?")->execute([$preleveurId, $aptId]);
        echo "   RDV créé: $aptId → $scheduledAt (assigné au préleveur)\n";
    } catch (Exception $e) {
        echo "   ⚠ Erreur RDV $scheduledAt: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Terminé.\n";
echo "   - Préleveur: $preleveurId → labo $labId\n";
echo "   - Patient Thomas: $patientId\n";
echo "   - RDV créés: " . count($createdIds) . " (assignés au préleveur pour tes tests)\n";
