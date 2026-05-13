-- Actes multiples sur un même RDV nursing (parité fonctionnelle avec appointment_blood_test_items).

CREATE TABLE IF NOT EXISTS appointment_nursing_items (
  id CHAR(36) PRIMARY KEY,
  appointment_id CHAR(36) NOT NULL,
  category_id CHAR(36) NULL,
  label VARCHAR(255) NULL,
  care_options JSON NULL,
  source_appointment_id CHAR(36) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ani_appointment_id (appointment_id),
  INDEX idx_ani_category_id (category_id),
  INDEX idx_ani_source_appointment_id (source_appointment_id),
  CONSTRAINT fk_ani_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ani_category
    FOREIGN KEY (category_id) REFERENCES care_categories(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_ani_source_appointment
    FOREIGN KEY (source_appointment_id) REFERENCES appointments(id)
    ON DELETE SET NULL
);
