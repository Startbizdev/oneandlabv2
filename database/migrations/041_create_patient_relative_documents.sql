-- Migration 041 : Documents par proche
-- Chaque proche a ses propres documents (carte vitale, mutuelle)
-- patient_documents = documents du patient (pour moi-même)
-- patient_relative_documents = documents des proches

CREATE TABLE IF NOT EXISTS patient_relative_documents (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
