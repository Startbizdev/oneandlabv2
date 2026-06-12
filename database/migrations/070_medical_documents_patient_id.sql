-- Migration 070 : patient_id sur medical_documents (ordonnances sans rendez-vous)

ALTER TABLE medical_documents
    ADD COLUMN patient_id CHAR(36) NULL COMMENT 'Patient lorsque appointment_id est NULL (ex. ordonnance standalone)' AFTER appointment_id;

CREATE INDEX idx_medical_documents_patient_id ON medical_documents (patient_id);
