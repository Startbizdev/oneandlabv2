-- Migration 006 : Création de la table reviews
-- Système d'avis et évaluations

CREATE TABLE IF NOT EXISTS reviews (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    reviewee_id CHAR(36) NOT NULL, -- Professionnel noté
    reviewee_type ENUM('nurse', 'subaccount') NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    response TEXT NULL, -- Réponse du professionnel
    response_at DATETIME NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    moderation_note TEXT NULL,
    moderated_by CHAR(36) NULL,
    moderated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_reviewee_id (reviewee_id),
    INDEX idx_visible (is_visible),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewee_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (moderated_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




