<?php
/**
 * Test d'upload direct en simulant $_FILES et $_POST
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Not found']);
    exit;
}

// Charger les variables d'environnement
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

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/lib/Logger.php';

echo "=== TEST UPLOAD DIRECT (simulation complète) ===\n\n";

// 1. Créer un fichier de test
$testFile = __DIR__ . '/uploads/test-carte-vitale.txt';
$testDir = dirname($testFile);
if (!is_dir($testDir)) {
    mkdir($testDir, 0755, true);
}
file_put_contents($testFile, "Ceci est un fichier de test pour la carte vitale\nContenu de test ligne 2");
echo "✅ Fichier de test créé: $testFile\n";
echo "   Taille: " . filesize($testFile) . " bytes\n\n";

// 2. Connexion à la base de données pour obtenir un patient de test
try {
    $config = require __DIR__ . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    
    // Chercher un patient
    $stmt = $db->prepare("SELECT id FROM profiles WHERE role = 'patient' LIMIT 1");
    $stmt->execute();
    $patient = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$patient) {
        die("❌ ERREUR: Aucun patient trouvé en base. Exécutez d'abord: php setup-database.php\n");
    }
    
    $patientId = $patient['id'];
    echo "✅ Patient de test trouvé: $patientId\n\n";
    
} catch (Exception $e) {
    die("❌ ERREUR DB: " . $e->getMessage() . "\n");
}

// 3. Simuler l'environnement d'upload
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_ORIGIN'] = 'http://localhost:3000';

// Simuler $_FILES
$_FILES['file'] = [
    'name' => 'test-carte-vitale.txt',
    'type' => 'text/plain',
    'tmp_name' => $testFile,
    'error' => UPLOAD_ERR_OK,
    'size' => filesize($testFile)
];

// Simuler $_POST
$_POST['document_type'] = 'carte_vitale';

// Simuler l'utilisateur authentifié (normalement fait par AuthMiddleware)
$mockUser = [
    'user_id' => $patientId,
    'role' => 'patient'
];

// Créer un token CSRF mockup (normalement vérifié par CSRFMiddleware)
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'test-token';

echo "📝 Simulation de l'upload:\n";
echo "   - Fichier: " . $_FILES['file']['name'] . "\n";
echo "   - Type: " . $_POST['document_type'] . "\n";
echo "   - Patient: $patientId\n\n";

// 4. Exécuter le code d'upload (sans les middlewares)
try {
    $crypto = new Crypto();
    $logger = new Logger();
    
    // Reprendre le code d'upload.php
    $file = $_FILES['file'];
    $documentType = $_POST['document_type'];
    
    // Lire le fichier
    $fileContent = file_get_contents($file['tmp_name']);
    echo "✅ Fichier lu: " . strlen($fileContent) . " bytes\n";
    
    // Chiffrer
    $encryptedData = $crypto->encryptFile($fileContent);
    echo "✅ Fichier chiffré: " . strlen($encryptedData['encrypted']) . " bytes (base64)\n";
    
    // Créer les dossiers
    $uploadDir = __DIR__ . '/uploads/medical/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Générer UUID
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    
    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $fileName = $safeFileName . '.' . $fileExtension;
    
    // Créer le dossier du document
    $documentDir = $uploadDir . $id . '/';
    if (!is_dir($documentDir)) {
        mkdir($documentDir, 0755, true);
    }
    
    // Sauvegarder le fichier chiffré
    $filePath = $documentDir . $fileName . '.encrypted';
    $encryptedBinary = base64_decode($encryptedData['encrypted'], true);
    $bytesWritten = file_put_contents($filePath, $encryptedBinary);
    
    echo "✅ Fichier sauvegardé: $filePath ($bytesWritten bytes)\n\n";
    
    // Créer appointment draft
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    $draftAppointmentId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    
    // Vérifier si un appointment draft existe déjà
    $checkAppointmentStmt = $db->prepare('
        SELECT id FROM appointments 
        WHERE patient_id = ? AND status = ? AND type = ?
        LIMIT 1
    ');
    $checkAppointmentStmt->execute([$patientId, 'expired', 'blood_test']);
    $existingAppointment = $checkAppointmentStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingAppointment) {
        $draftAppointmentId = $existingAppointment['id'];
        echo "✅ Appointment draft existant réutilisé: $draftAppointmentId\n";
    } else {
        // Créer un nouvel appointment
        $defaultAddress = 'Document de profil';
        $addressData = $crypto->encryptField($defaultAddress);
        
        $stmt = $db->prepare('
            INSERT INTO appointments (
                id, type, status, patient_id, created_by, created_by_role,
                form_type, location_lat, location_lng, address_encrypted, address_dek,
                scheduled_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), NOW())
        ');
        
        $result = $stmt->execute([
            $draftAppointmentId,
            'blood_test',
            'expired',
            $patientId,
            $patientId,
            'patient',
            'blood_test', // form_type doit être 'blood_test' ou 'nursing'
            0.0,
            0.0,
            $addressData['encrypted'],
            $addressData['dek'],
        ]);
        
        if ($result) {
            echo "✅ Appointment draft créé: $draftAppointmentId\n";
        } else {
            throw new Exception('Erreur création appointment: ' . implode(', ', $stmt->errorInfo()));
        }
    }
    
    // Insérer dans medical_documents
    $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';
    $stmt = $db->prepare('
        INSERT INTO medical_documents (
            id, appointment_id, uploaded_by, file_name, file_path,
            file_size, mime_type, encrypted, file_dek, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    $result = $stmt->execute([
        $id,
        $draftAppointmentId,
        $patientId,
        $fileName,
        $relativePath,
        $file['size'],
        'text/plain',
        1,
        $encryptedData['dek'],
    ]);
    
    if ($result) {
        echo "✅ Document médical enregistré: $id\n";
    } else {
        throw new Exception('Erreur medical_documents: ' . implode(', ', $stmt->errorInfo()));
    }
    
    // Insérer ou mettre à jour patient_documents
    $checkStmt = $db->prepare('
        SELECT id FROM patient_documents 
        WHERE patient_id = ? AND document_type = ?
    ');
    $checkStmt->execute([$patientId, $documentType]);
    $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingDoc) {
        // Mettre à jour
        $updateStmt = $db->prepare('
            UPDATE patient_documents 
            SET medical_document_id = ?, updated_at = NOW()
            WHERE id = ?
        ');
        $updateStmt->execute([$id, $existingDoc['id']]);
        echo "✅ patient_documents mis à jour: " . $existingDoc['id'] . "\n";
    } else {
        // Créer
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        $patientDocId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        
        $insertStmt = $db->prepare('
            INSERT INTO patient_documents (
                id, patient_id, document_type, medical_document_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NOW(), NOW())
        ');
        $insertResult = $insertStmt->execute([
            $patientDocId,
            $patientId,
            $documentType,
            $id
        ]);
        
        if ($insertResult) {
            echo "✅ patient_documents créé: $patientDocId\n";
        } else {
            throw new Exception('Erreur patient_documents: ' . implode(', ', $insertStmt->errorInfo()));
        }
    }
    
    echo "\n📊 RÉSULTAT FINAL:\n";
    echo "   ✅ Upload réussi!\n";
    echo "   → ID medical_document: $id\n";
    echo "   → Fichier: $filePath\n";
    echo "   → Taille sur disque: " . filesize($filePath) . " bytes\n\n";
    
    // Vérifier la récupération
    echo "📥 Test de récupération...\n";
    $stmt = $db->prepare('
        SELECT 
            pd.id,
            pd.document_type,
            pd.created_at,
            pd.updated_at,
            md.id as medical_document_id,
            md.file_name,
            md.file_size,
            md.mime_type,
            md.created_at as uploaded_at
        FROM patient_documents pd
        LEFT JOIN medical_documents md ON pd.medical_document_id = md.id
        WHERE pd.patient_id = ?
        ORDER BY pd.document_type
    ');
    $stmt->execute([$patientId]);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Documents trouvés: " . count($documents) . "\n";
    foreach ($documents as $doc) {
        echo "   - " . $doc['document_type'] . ": " . ($doc['medical_document_id'] ? "✅ Lié" : "❌ Non lié") . "\n";
    }
    
    echo "\n=== TEST TERMINÉ AVEC SUCCÈS ===\n";
    
} catch (Exception $e) {
    echo "\n❌ ERREUR: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}

// Nettoyer
if (file_exists($testFile)) {
    unlink($testFile);
}

