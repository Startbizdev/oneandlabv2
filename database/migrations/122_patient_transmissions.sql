-- Migration 122 : transmissions ciblées de l'équipe soignante (fil daté par patient, texte chiffré comme les autres données de santé)
-- care_item_ids : soins cochés, liste JSON de {"kind": "nursing_item" | "category", "id": "<uuid>", "label": "<libellé calculé côté serveur>"}
CREATE TABLE IF NOT EXISTS patient_transmissions (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    author_id CHAR(36) NULL,
    author_role ENUM('nurse', 'pro') NOT NULL,
    occurred_on DATE NOT NULL,
    body_encrypted TEXT NOT NULL,
    body_dek TEXT NOT NULL,
    care_item_ids JSON NULL,
    appointment_id CHAR(36) NULL,
    for_doctor TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL DEFAULT NULL,
    KEY idx_patient_transmissions_feed (patient_id, occurred_on, created_at),
    KEY idx_patient_transmissions_appointment (appointment_id),
    CONSTRAINT fk_patient_transmissions_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_transmissions_author FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_patient_transmissions_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
