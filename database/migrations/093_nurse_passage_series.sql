-- Migration 093 : séries de passages infirmier + lien appointments

CREATE TABLE IF NOT EXISTS nurse_passage_series (
    id CHAR(36) PRIMARY KEY,
    nurse_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    planning_type ENUM('single_day', 'interval', 'weekdays', 'custom_dates', 'manual') NOT NULL DEFAULT 'single_day',
    planning_config JSON NOT NULL,
    time_slot ENUM('morning', 'noon', 'afternoon', 'evening', 'night', 'custom') NOT NULL DEFAULT 'morning',
    custom_time TIME NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    at_home TINYINT(1) NOT NULL DEFAULT 1,
    nursing_items JSON NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_passage_series_nurse (nurse_id),
    INDEX idx_passage_series_patient (patient_id),
    INDEX idx_passage_series_nurse_patient (nurse_id, patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
    ADD COLUMN passage_series_id CHAR(36) NULL AFTER creation_batch_id,
    ADD COLUMN passage_source ENUM('nurse_passage', 'booking', 'staff_wizard') NULL AFTER passage_series_id;

ALTER TABLE appointments
    ADD INDEX idx_appointments_passage_series (passage_series_id);
