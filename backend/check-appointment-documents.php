<?php

// Charger les variables d'environnement
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

require_once __DIR__ . '/config/database.php';

$appointmentId = '34e92e68-1a8b-4a5f-bb10-cf18e9b6139c';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

header('Content-Type: text/plain; charset=utf-8');

echo "=== Vérification du rendez-vous ===\n";
$stmt = $db->prepare('SELECT id, patient_id, type, status FROM appointments WHERE id = ?');
$stmt->execute([$appointmentId]);
$appointment = $stmt->fetch(PDO::FETCH_ASSOC);
if ($appointment) {
    echo "Rendez-vous trouvé:\n";
    print_r($appointment);
} else {
    echo "Rendez-vous NON trouvé!\n";
    exit;
}

echo "\n=== Documents médicaux associés (WHERE appointment_id = ?) ===\n";
$stmt = $db->prepare('
    SELECT 
        id,
        appointment_id,
        uploaded_by,
        file_name,
        file_size,
        mime_type,
        document_type,
        encrypted,
        created_at
    FROM medical_documents
    WHERE appointment_id = ?
    ORDER BY created_at DESC
');
$stmt->execute([$appointmentId]);
$documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Nombre de documents: " . count($documents) . "\n";
if (count($documents) > 0) {
    echo "Documents:\n";
    foreach ($documents as $doc) {
        print_r($doc);
        echo "\n";
    }
} else {
    echo "Aucun document trouvé pour ce rendez-vous!\n";
}

echo "\n=== Tous les documents médicaux (pour debug) ===\n";
$stmt = $db->prepare('SELECT id, appointment_id, file_name, document_type, created_at FROM medical_documents ORDER BY created_at DESC LIMIT 10');
$stmt->execute();
$allDocs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Derniers 10 documents créés:\n";
foreach ($allDocs as $doc) {
    print_r($doc);
    echo "\n";
}

echo "\n=== Vérification des documents du patient ===\n";
$patientId = $appointment['patient_id'];
$stmt = $db->prepare('
    SELECT 
        pd.id,
        pd.patient_id,
        pd.document_type,
        pd.medical_document_id,
        md.appointment_id,
        md.file_name,
        md.created_at
    FROM patient_documents pd
    LEFT JOIN medical_documents md ON pd.medical_document_id = md.id
    WHERE pd.patient_id = ?
');
$stmt->execute([$patientId]);
$patientDocs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Nombre de documents du patient: " . count($patientDocs) . "\n";
if (count($patientDocs) > 0) {
    echo "Documents du patient:\n";
    foreach ($patientDocs as $doc) {
        print_r($doc);
        echo "\n";
    }
}

