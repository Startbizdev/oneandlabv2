-- Migration 088 : schéma questionnaire carnet de santé (versionné)

CREATE TABLE IF NOT EXISTS health_record_schema (
    id CHAR(36) PRIMARY KEY,
    version VARCHAR(16) NOT NULL,
    sections_json JSON NOT NULL,
    active_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_health_record_schema_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
