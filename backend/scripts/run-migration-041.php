#!/usr/bin/env php
<?php

/**
 * Exécute la migration 041 (patient_relative_documents)
 * Usage: php run-migration-041.php
 * Depuis backend/ : php scripts/run-migration-041.php
 * Sur le serveur : cd /var/www/oneandlab/backend && php scripts/run-migration-041.php
 */

$baseDir = dirname(__DIR__);

// Charger la config DB
$envFile = $baseDir . '/../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../../.env';
}
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

$config = [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'port' => $_ENV['DB_PORT'] ?? 3306,
    'database' => $_ENV['DB_NAME'] ?? 'oneandlab',
    'username' => $_ENV['DB_USER'] ?? 'root',
    'password' => $_ENV['DB_PASS'] ?? '',
];

echo "=== Migration 041 : patient_relative_documents ===\n";
echo "DB: {$config['database']}@{$config['host']}\n";

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        (int) $config['port'],
        $config['database']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $migrationFile = $baseDir . '/../database/migrations/041_create_patient_relative_documents.sql';
    if (!file_exists($migrationFile)) {
        $migrationFile = __DIR__ . '/../../database/migrations/041_create_patient_relative_documents.sql';
    }
    if (file_exists($migrationFile)) {
        $sql = file_get_contents($migrationFile);
    } else {
        // SQL embarqué si fichier absent (déploiement)
        $sql = "CREATE TABLE IF NOT EXISTS patient_relative_documents (
            id CHAR(36) PRIMARY KEY,
            patient_id CHAR(36) NOT NULL,
            relative_id CHAR(36) NOT NULL,
            document_type ENUM('carte_vitale', 'carte_mutuelle', 'autres_assurances') NOT NULL,
            medical_document_id CHAR(36) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_relative_document_type (patient_id, relative_id, document_type),
            INDEX idx_patient_id (patient_id),
            INDEX idx_relative_id (relative_id),
            INDEX idx_document_type (document_type),
            INDEX idx_medical_document_id (medical_document_id),
            FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (relative_id) REFERENCES patient_relatives(id) ON DELETE CASCADE,
            FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    }
    $pdo->exec($sql);
    echo "✅ Migration 041 exécutée avec succès.\n";
    exit(0);
} catch (PDOException $e) {
    fwrite(STDERR, "❌ Erreur: " . $e->getMessage() . "\n");
    exit(1);
}
