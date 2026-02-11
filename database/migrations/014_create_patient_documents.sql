-- Migration 014 : Création de la table patient_documents
-- Documents médicaux stockés dans le profil patient (carte vitale, mutuelle, assurance)
-- L'ordonnance n'est PAS stockée ici car elle change à chaque rendez-vous

CREATE TABLE IF NOT EXISTS patient_documents (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    document_type ENUM('carte_vitale', 'carte_mutuelle', 'autres_assurances') NOT NULL,
    medical_document_id CHAR(36) NOT NULL, -- Référence vers medical_documents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_patient_document_type (patient_id, document_type),
    INDEX idx_patient_id (patient_id),
    INDEX idx_document_type (document_type),
    INDEX idx_medical_document_id (medical_document_id),
    
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




