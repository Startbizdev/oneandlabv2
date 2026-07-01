-- Migration 086 : tendances santé descriptives (Phase 4)

CREATE TABLE IF NOT EXISTS ai_trends (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    metric_type VARCHAR(32) NULL,
    trend_key VARCHAR(64) NOT NULL,
    observation_fr VARCHAR(512) NOT NULL,
    observation_en VARCHAR(512) NULL,
    window_days INT UNSIGNED NOT NULL DEFAULT 30,
    data_points_count INT UNSIGNED NOT NULL DEFAULT 0,
    computed_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_ai_trend (patient_id, trend_key, window_days),
    KEY idx_ai_trend_patient (patient_id, computed_at),
    CONSTRAINT fk_ai_trend_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
