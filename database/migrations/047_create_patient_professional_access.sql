-- Lien patient ↔ professionnel (liste « Mes patients » au-delà de created_by)

CREATE TABLE IF NOT EXISTS patient_professional_access (
    id CHAR(36) NOT NULL PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    professional_id CHAR(36) NOT NULL,
    source ENUM('created', 'appointment_accepted', 'appointment_linked', 'manual_link') NOT NULL DEFAULT 'created',
    appointment_id CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ppa_patient_professional (patient_id, professional_id),
    KEY idx_ppa_professional (professional_id),
    KEY idx_ppa_patient (patient_id),
    CONSTRAINT fk_ppa_patient FOREIGN KEY (patient_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ppa_professional FOREIGN KEY (professional_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ppa_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
