-- Migration 106 : conversation patient ↔ staff par RDV

CREATE TABLE IF NOT EXISTS appointment_conversation_messages (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    medical_document_id CHAR(36) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_conversation_appointment (appointment_id, created_at),
    INDEX idx_conversation_author (author_id),

    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'medical_documents'
       AND COLUMN_NAME = 'document_type'
       AND COLUMN_TYPE LIKE '%conversation_attachment%') > 0,
    'SELECT 1',
    'ALTER TABLE medical_documents MODIFY COLUMN document_type ENUM(
        ''carte_vitale'',
        ''carte_mutuelle'',
        ''ordonnance'',
        ''autres_assurances'',
        ''resultats'',
        ''care_photo'',
        ''cancellation_photo'',
        ''conversation_attachment'',
        ''other''
    ) DEFAULT ''other'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
