<?php
/**
 * Script de test pour vérifier l'upload de documents patients
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Not found']);
    exit;
}

// Charger les variables d'environnement si .env existe
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
        echo "✅ Variables d'environnement chargées depuis .env\n";
        echo "   → BACKEND_KEK_HEX: " . (isset($_ENV['BACKEND_KEK_HEX']) ? substr($_ENV['BACKEND_KEK_HEX'], 0, 16) . "..." : "NON DÉFINI") . "\n\n";
    } else {
        echo "⚠️  Erreur lors de la lecture du fichier .env\n\n";
    }
} else {
    echo "⚠️  Fichier .env non trouvé ou non lisible\n\n";
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/lib/Logger.php';

echo "=== TEST UPLOAD DOCUMENTS PATIENT ===\n\n";

// Configuration
$uploadDir = __DIR__ . '/uploads/medical/';
$testPatientId = 'test-patient-id-12345'; // ID de test

// 1. Vérifier/Créer le dossier
echo "1. Vérification du dossier d'upload...\n";
echo "   Chemin: $uploadDir\n";

if (!is_dir($uploadDir)) {
    echo "   → Création du dossier...\n";
    if (!mkdir($uploadDir, 0755, true)) {
        die("   ❌ ERREUR: Impossible de créer le dossier!\n");
    }
    echo "   ✅ Dossier créé\n";
} else {
    echo "   ✅ Dossier existe\n";
}

// Vérifier les permissions
if (!is_writable($uploadDir)) {
    die("   ❌ ERREUR: Le dossier n'est pas accessible en écriture!\n");
}
echo "   ✅ Dossier accessible en écriture\n\n";

// 2. Test de chiffrement
echo "2. Test de chiffrement...\n";
try {
    $crypto = new Crypto();
    $testContent = "Contenu de test pour vérifier le chiffrement";
    $encryptedData = $crypto->encryptFile($testContent);
    echo "   ✅ Chiffrement réussi\n";
    echo "   → Taille originale: " . strlen($testContent) . " bytes\n";
    echo "   → Taille chiffrée (base64): " . strlen($encryptedData['encrypted']) . " bytes\n";
    echo "   → DEK chiffrée: " . substr($encryptedData['dek'], 0, 50) . "...\n\n";
} catch (Exception $e) {
    die("   ❌ ERREUR chiffrement: " . $e->getMessage() . "\n");
}

// 3. Test de sauvegarde de fichier
echo "3. Test de sauvegarde de fichier...\n";
$testId = 'test-' . bin2hex(random_bytes(8));
$testFileName = 'test-document.pdf';
$documentDir = $uploadDir . $testId . '/';

echo "   → ID document: $testId\n";
echo "   → Dossier document: $documentDir\n";

// Créer le dossier du document
if (!is_dir($documentDir)) {
    if (!mkdir($documentDir, 0755, true)) {
        die("   ❌ ERREUR: Impossible de créer le dossier du document!\n");
    }
    echo "   ✅ Dossier document créé\n";
}

// Sauvegarder le fichier
$filePath = $documentDir . $testFileName . '.encrypted';
$encryptedBinary = base64_decode($encryptedData['encrypted'], true);

if ($encryptedBinary === false) {
    die("   ❌ ERREUR: Décodage base64 échoué!\n");
}

$bytesWritten = file_put_contents($filePath, $encryptedBinary);

if ($bytesWritten === false) {
    die("   ❌ ERREUR: Impossible d'écrire le fichier!\n");
}

echo "   ✅ Fichier écrit: $bytesWritten bytes\n";

// Vérifier que le fichier existe
if (!file_exists($filePath)) {
    die("   ❌ ERREUR: Le fichier n'existe pas après écriture!\n");
}

$fileSize = filesize($filePath);
if ($fileSize === 0) {
    die("   ❌ ERREUR: Le fichier est vide!\n");
}

echo "   ✅ Fichier vérifié: $fileSize bytes sur disque\n";
echo "   → Chemin complet: $filePath\n\n";

// 4. Test de déchiffrement
echo "4. Test de déchiffrement...\n";
try {
    $decryptedContent = $crypto->decryptFile(
        base64_encode(file_get_contents($filePath)),
        $encryptedData['dek']
    );
    
    if ($decryptedContent === $testContent) {
        echo "   ✅ Déchiffrement réussi - Contenu identique\n\n";
    } else {
        echo "   ⚠️  Déchiffrement réussi mais contenu différent\n";
        echo "   → Original: $testContent\n";
        echo "   → Déchiffré: $decryptedContent\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ ERREUR déchiffrement: " . $e->getMessage() . "\n\n";
}

// 5. Vérifier la structure des dossiers
echo "5. Structure des dossiers créés:\n";
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($uploadDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $item) {
    if ($item->isDir()) {
        echo "   📁 " . str_replace($uploadDir, '', $item->getPathname()) . "/\n";
    } else {
        echo "   📄 " . str_replace($uploadDir, '', $item->getPathname()) . " (" . filesize($item->getPathname()) . " bytes)\n";
    }
}

echo "\n=== TEST TERMINÉ ===\n";
echo "✅ Si vous voyez ce message, l'upload devrait fonctionner!\n";
echo "❌ Si vous voyez des erreurs, corrigez-les avant de tester l'upload réel.\n";

