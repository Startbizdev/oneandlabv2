-- Migration 089 : réponses carnet de santé par patient

CREATE TABLE IF NOT EXISTS health_record_answers (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    question_key VARCHAR(64) NOT NULL,
    value_json JSON NOT NULL,
    source ENUM('patient', 'import', 'staff') NOT NULL DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_health_record_answer (patient_id, question_key),
    KEY idx_health_record_answers_patient (patient_id),
    CONSTRAINT fk_health_record_answers_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
