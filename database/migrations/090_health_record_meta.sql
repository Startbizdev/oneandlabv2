-- Migration 090 : complétion, audit accès, care gaps

CREATE TABLE IF NOT EXISTS health_record_completion (
    patient_id CHAR(36) PRIMARY KEY,
    percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
    missing_sections_json JSON NOT NULL,
    computed_at DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_health_record_completion_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS health_record_access_log (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    viewer_id CHAR(36) NOT NULL,
    viewer_role VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45) NULL,
    accessed_at DATETIME NOT NULL,
    KEY idx_health_record_access_patient (patient_id, accessed_at),
    KEY idx_health_record_access_viewer (viewer_id, accessed_at),
    CONSTRAINT fk_health_record_access_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_gaps (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    gap_key VARCHAR(64) NOT NULL,
    status ENUM('open', 'dismissed', 'converted') NOT NULL DEFAULT 'open',
    metadata_json JSON NULL,
    detected_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_care_gap_patient_key (patient_id, gap_key),
    KEY idx_care_gaps_patient_status (patient_id, status),
    CONSTRAINT fk_care_gaps_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
