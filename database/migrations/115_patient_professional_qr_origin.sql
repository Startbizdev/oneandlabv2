-- Migration 115 : origine QR durable et contrôle d’affichage par le patient

ALTER TABLE patient_professional_access
    MODIFY source ENUM(
        'created',
        'appointment_accepted',
        'appointment_linked',
        'manual_link',
        'qr_origin'
    ) NOT NULL DEFAULT 'created',
    ADD COLUMN origin_qr_code_id CHAR(36) NULL DEFAULT NULL AFTER appointment_id,
    ADD COLUMN hidden_by_patient TINYINT(1) NOT NULL DEFAULT 0 AFTER origin_qr_code_id,
    ADD INDEX idx_ppa_origin_qr (origin_qr_code_id),
    ADD CONSTRAINT fk_ppa_origin_qr
        FOREIGN KEY (origin_qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL;
