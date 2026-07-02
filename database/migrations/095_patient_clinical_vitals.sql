-- Migration 095 : constantes médicales saisies par staff (infirmier / pro)

CREATE TABLE IF NOT EXISTS patient_clinical_vitals (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    recorded_by CHAR(36) NOT NULL,
    vital_type VARCHAR(32) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    value_secondary DECIMAL(10, 2) NULL,
    unit VARCHAR(16) NOT NULL,
    notes VARCHAR(500) NULL,
    recorded_at DATETIME NOT NULL,
    context_type VARCHAR(32) NULL,
    context_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_clinical_vitals_patient_recorded (patient_id, recorded_at DESC),
    KEY idx_clinical_vitals_patient_type (patient_id, vital_type, recorded_at DESC),
    KEY idx_clinical_vitals_context (context_type, context_id),
    CONSTRAINT fk_clinical_vitals_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_clinical_vitals_recorded_by FOREIGN KEY (recorded_by) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
