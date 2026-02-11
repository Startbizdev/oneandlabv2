<?php

/**
 * Script pour créer un faux rendez-vous pansement avec géolocalisation
 * Usage: php create-fake-appointment.php
 */

// Charger .env
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

echo "=== CRÉATION D'UN FAUX RENDEZ-VOUS PANSEMENT ===\n\n";

// 1. Trouver la catégorie "Pansement"
echo "1. Recherche de la catégorie 'Pansement'...\n";
$stmt = $pdo->prepare("SELECT id FROM care_categories WHERE name = 'Pansement' AND type = 'nursing' LIMIT 1");
$stmt->execute();
$category = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$category) {
    echo "❌ Catégorie 'Pansement' non trouvée. Création...\n";
    $categoryId = bin2hex(random_bytes(16));
    $uuid = sprintf(
        '%08s-%04s-%04s-%04s-%012s',
        substr($categoryId, 0, 8),
        substr($categoryId, 8, 4),
        substr($categoryId, 12, 4),
        substr($categoryId, 16, 4),
        substr($categoryId, 20, 12)
    );
    $stmt = $pdo->prepare("INSERT INTO care_categories (id, name, description, type, is_active) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$uuid, 'Pansement', 'Pansements simples et complexes', 'nursing', 1]);
    $categoryId = $uuid;
    echo "   ✓ Catégorie créée: $categoryId\n";
} else {
    $categoryId = $category['id'];
    echo "   ✓ Catégorie trouvée: $categoryId\n";
}

// 2. Créer ou trouver un patient fictif
echo "\n2. Création d'un patient fictif...\n";
$patientEmail = 'patient.test@oneandlab.fr';
$patientEmailHash = hash('sha256', strtolower($patientEmail));

$stmt = $pdo->prepare('SELECT id FROM profiles WHERE email_hash = ?');
$stmt->execute([$patientEmailHash]);
$existingPatient = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingPatient) {
    $patientId = $existingPatient['id'];
    echo "   ✓ Patient existant trouvé: $patientId\n";
} else {
    // Créer un patient fictif
    $patientId = bin2hex(random_bytes(16));
    $patientUuid = sprintf(
        '%08s-%04s-%04s-%04s-%012s',
        substr($patientId, 0, 8),
        substr($patientId, 8, 4),
        substr($patientId, 12, 4),
        substr($patientId, 16, 4),
        substr($patientId, 20, 12)
    );
    
    $emailData = $crypto->encryptField($patientEmail);
    $firstNameData = $crypto->encryptField('Jean');
    $lastNameData = $crypto->encryptField('Dupont');
    $phoneData = $crypto->encryptField('0612345678');
    
    $stmt = $pdo->prepare('INSERT INTO profiles (
        id, role, email_encrypted, email_dek, email_hash,
        first_name_encrypted, first_name_dek,
        last_name_encrypted, last_name_dek,
        phone_encrypted, phone_dek,
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
    
    $stmt->execute([
        $patientUuid,
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
    
    $patientId = $patientUuid;
    echo "   ✓ Patient créé: $patientId\n";
}

// 3. Coordonnées GPS de "40 rue Endoume, 13007 Marseille"
// Coordonnées approximatives (rue Endoume, Marseille)
$address = [
    'label' => '40 rue Endoume, 13007 Marseille',
    'lat' => 43.2800,
    'lng' => 5.3600,
    'postal_code' => '13007',
    'city' => 'Marseille',
    'country' => 'France'
];

echo "\n3. Adresse: {$address['label']}\n";
echo "   Coordonnées GPS: {$address['lat']}, {$address['lng']}\n";

// 4. Créer le rendez-vous
echo "\n4. Création du rendez-vous...\n";

// Date/heure du rendez-vous (demain à 14h00)
$scheduledAt = date('Y-m-d H:i:s', strtotime('+1 day 14:00'));

$appointmentData = [
    'type' => 'nursing',
    'form_type' => 'nursing',
    'category_id' => $categoryId,
    'patient_id' => $patientId,
    'address' => $address,
    'form_data' => [
        'first_name' => 'Jean',
        'last_name' => 'Dupont',
        'phone' => '0612345678',
        'email' => $patientEmail,
        'address' => $address,
        'birth_date' => '1980-01-15',
        'gender' => 'male',
        'reason' => 'Pansement suite à une intervention chirurgicale',
        'urgency' => 'normal',
        'notes' => 'Pansement à renouveler tous les 2 jours. Patient autonome.'
    ],
    'scheduled_at' => $scheduledAt,
];

// ID de l'infirmier actuel (celui qui crée le RDV)
$nurseId = 'df44d812-a55f-68cb-fc46-e5204690b7e3'; // ID de l'infirmier recréé

try {
    $appointmentId = $appointmentModel->create($appointmentData, $nurseId, 'nurse');
    
    echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "✅ Rendez-vous créé avec succès !\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    echo "📋 ID du rendez-vous: $appointmentId\n";
    echo "👤 Patient: Jean Dupont ($patientEmail)\n";
    echo "🏥 Type: Pansement (nursing)\n";
    echo "📍 Adresse: {$address['label']}\n";
    echo "🗺️  Coordonnées: {$address['lat']}, {$address['lng']}\n";
    echo "📅 Date/heure: $scheduledAt\n";
    echo "🎭 Statut: pending\n\n";
    echo "💡 Le rendez-vous sera automatiquement dispatché aux infirmiers\n";
    echo "   disponibles dans la zone géographique.\n";
    
} catch (Exception $e) {
    echo "\n❌ Erreur lors de la création: " . $e->getMessage() . "\n";
    echo "   Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}


