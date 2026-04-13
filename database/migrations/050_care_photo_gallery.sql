-- Galerie photos de soins (RDV nursing créés par un pro) : documents médicaux type care_photo + commentaires

ALTER TABLE medical_documents
MODIFY COLUMN document_type ENUM(
    'carte_vitale',
    'carte_mutuelle',
    'ordonnance',
    'autres_assurances',
    'resultats',
    'care_photo',
    'other'
) DEFAULT 'other';

CREATE TABLE IF NOT EXISTS appointment_care_photo_comments (
    id CHAR(36) PRIMARY KEY,
    medical_document_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_medical_document_id (medical_document_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
