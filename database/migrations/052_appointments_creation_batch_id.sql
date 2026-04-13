-- Regroupement logique de plusieurs RDV créés dans le même lot (multi-soins pro).
ALTER TABLE appointments
  ADD COLUMN creation_batch_id CHAR(36) NULL DEFAULT NULL COMMENT 'UUID partagé par un lot de créations' AFTER id;

CREATE INDEX idx_appointments_creation_batch_id ON appointments (creation_batch_id);
