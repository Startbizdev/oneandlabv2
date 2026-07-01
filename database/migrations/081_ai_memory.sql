-- Migration 081 : mémoire IA utilisateur et médicale (Phase 3)

CREATE TABLE IF NOT EXISTS ai_user_memory (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    memory_key VARCHAR(64) NOT NULL,
    value_encrypted TEXT NOT NULL,
    dek VARCHAR(512) NOT NULL,
    category ENUM('preference', 'locale', 'habit', 'other_non_medical') NOT NULL DEFAULT 'other_non_medical',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_ai_user_memory (user_id, memory_key),
    KEY idx_ai_user_memory_user (user_id, category),
    CONSTRAINT fk_ai_user_memory_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_medical_memory (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    snapshot_type ENUM(
        'dossier', 'appointments_recent', 'lab_results_index',
        'documents_index', 'health_metrics_summary'
    ) NOT NULL,
    content_json JSON NOT NULL,
    content_hash CHAR(64) NOT NULL,
    refreshed_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_ai_medical_memory (patient_id, snapshot_type),
    KEY idx_ai_medical_memory_patient (patient_id, refreshed_at),
    CONSTRAINT fk_ai_medical_memory_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
