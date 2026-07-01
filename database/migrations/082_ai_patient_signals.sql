-- Migration 082 : signaux agent suivi patient (Phase 3)

CREATE TABLE IF NOT EXISTS ai_patient_signals (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    signal_type ENUM(
        'lab_overdue', 'new_lab_result', 'appointment_no_show',
        'prescription_expiring', 'document_missing', 'profile_incomplete'
    ) NOT NULL,
    severity ENUM('informational', 'low', 'medium') NOT NULL DEFAULT 'informational',
    payload_json JSON NULL,
    detected_at DATETIME NOT NULL,
    dismissed_at DATETIME NULL,
    acted_at DATETIME NULL,
    draft_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_signal_patient (patient_id, detected_at),
    KEY idx_ai_signal_active (patient_id, dismissed_at, acted_at),
    CONSTRAINT fk_ai_signal_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_signal_draft FOREIGN KEY (draft_id) REFERENCES ai_appointment_drafts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_agent_runs (
    id CHAR(36) PRIMARY KEY,
    job_name VARCHAR(64) NOT NULL,
    patients_scanned INT UNSIGNED NOT NULL DEFAULT 0,
    signals_created INT UNSIGNED NOT NULL DEFAULT 0,
    error_message VARCHAR(512) NULL,
    run_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_agent_runs_job (job_name, run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
