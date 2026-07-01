-- Migration 091 : nudges carnet et actions care gaps

CREATE TABLE IF NOT EXISTS health_record_nudges (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    nudge_key VARCHAR(64) NOT NULL,
    channel ENUM('push', 'in_app') NOT NULL DEFAULT 'push',
    sent_at DATETIME NOT NULL,
    metadata_json JSON NULL,
    KEY idx_health_record_nudges_patient (patient_id, nudge_key, sent_at),
    CONSTRAINT fk_health_record_nudges_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_gap_actions (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    gap_key VARCHAR(64) NOT NULL,
    action_key VARCHAR(64) NOT NULL,
    status ENUM('shown', 'clicked', 'converted', 'dismissed') NOT NULL DEFAULT 'shown',
    draft_id CHAR(36) NULL,
    appointment_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_care_gap_actions_patient (patient_id, gap_key, status),
    CONSTRAINT fk_care_gap_actions_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
