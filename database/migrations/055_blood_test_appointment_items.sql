-- Modèle unifié prise de sang : un rendez-vous blood_test porte plusieurs actes/items.
-- Les anciens rendez-vous blood_test fusionnés restent en base et pointent vers le RDV canonique.
-- Prérequis : 052_appointments_creation_batch_id.sql (colonne creation_batch_id + index).

ALTER TABLE appointments
  ADD COLUMN merged_into_appointment_id CHAR(36) NULL DEFAULT NULL
  COMMENT 'RDV canonique lorsque cette ligne blood_test legacy a été fusionnée'
  AFTER creation_batch_id,
  ADD INDEX idx_appointments_merged_into (merged_into_appointment_id),
  ADD CONSTRAINT fk_appointments_merged_into
    FOREIGN KEY (merged_into_appointment_id) REFERENCES appointments(id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS appointment_blood_test_items (
  id CHAR(36) PRIMARY KEY,
  appointment_id CHAR(36) NOT NULL,
  category_id CHAR(36) NULL,
  label VARCHAR(255) NULL,
  care_options JSON NULL,
  source_appointment_id CHAR(36) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_abti_appointment_id (appointment_id),
  INDEX idx_abti_category_id (category_id),
  INDEX idx_abti_source_appointment_id (source_appointment_id),
  CONSTRAINT fk_abti_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_abti_category
    FOREIGN KEY (category_id) REFERENCES care_categories(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_abti_source_appointment
    FOREIGN KEY (source_appointment_id) REFERENCES appointments(id)
    ON DELETE SET NULL
);
