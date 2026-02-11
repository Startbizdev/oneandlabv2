-- Migration 011 : Création de la table medical_documents
-- Documents médicaux chiffrés (cartes vitales, ordonnances, etc.)

CREATE TABLE IF NOT EXISTS medical_documents (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    uploaded_by CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Chemin sur le serveur
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    encrypted BOOLEAN DEFAULT TRUE,
    file_dek TEXT NULL, -- Clé de chiffrement du fichier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_uploaded_by (uploaded_by),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




