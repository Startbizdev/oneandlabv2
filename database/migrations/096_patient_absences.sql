-- Migration 096 : absences patient planifiées (tournée infirmier)

CREATE TABLE IF NOT EXISTS patient_absences (
    id CHAR(36) NOT NULL PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    nurse_id CHAR(36) NOT NULL,
    absence_type ENUM('hospitalization', 'leave', 'other') NOT NULL,
    note TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_patient_absences_lookup (nurse_id, patient_id, start_date, end_date),
    KEY idx_patient_absences_date (nurse_id, start_date, end_date),
    CONSTRAINT fk_patient_absences_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_absences_nurse FOREIGN KEY (nurse_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_absences_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
