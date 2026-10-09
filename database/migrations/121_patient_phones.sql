-- Migration 121 : numéros supplémentaires d'un patient (mobile, fixe, aidant, autre), chiffrés comme profiles.phone
CREATE TABLE IF NOT EXISTS patient_phones (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    label ENUM('mobile', 'fixe', 'aidant', 'autre') NOT NULL,
    phone_encrypted TEXT NOT NULL,
    phone_dek TEXT NOT NULL,
    created_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_patient_phones_patient (patient_id, created_at),
    CONSTRAINT fk_patient_phones_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_phones_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
