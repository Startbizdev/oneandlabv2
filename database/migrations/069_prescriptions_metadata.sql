-- Migration 069 : métadonnées ordonnances générées sur medical_documents

ALTER TABLE medical_documents
    ADD COLUMN prescription_kind VARCHAR(16) NULL COMMENT 'medical | nursing | NULL=scan upload' AFTER document_type,
    ADD COLUMN prescription_text TEXT NULL AFTER prescription_kind,
    ADD COLUMN prescription_number VARCHAR(32) NULL AFTER prescription_text,
    ADD COLUMN generated_at DATETIME NULL AFTER prescription_number;

CREATE INDEX idx_medical_documents_prescription_kind ON medical_documents (prescription_kind);
CREATE INDEX idx_medical_documents_prescription_number ON medical_documents (prescription_number);
