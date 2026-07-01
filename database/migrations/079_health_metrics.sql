-- Migration 079 : sources santé, syncs, métriques, permissions (Phase 2 IA)

CREATE TABLE IF NOT EXISTS health_sources (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    source_kind ENUM('apple_health', 'health_connect', 'device') NOT NULL DEFAULT 'apple_health',
    external_source_id VARCHAR(128) NOT NULL,
    display_name VARCHAR(255) NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_health_source_ext (patient_id, platform, external_source_id),
    KEY idx_health_source_patient (patient_id, revoked_at),
    CONSTRAINT fk_health_source_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS health_syncs (
    id CHAR(36) PRIMARY KEY,
    source_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    error_message TEXT NULL,
    metrics_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_health_sync_source (source_id, started_at),
    KEY idx_health_sync_patient (patient_id, started_at),
    CONSTRAINT fk_health_sync_source FOREIGN KEY (source_id) REFERENCES health_sources(id) ON DELETE CASCADE,
    CONSTRAINT fk_health_sync_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS health_permissions (
    id CHAR(36) PRIMARY KEY,
    source_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    permissions_json JSON NOT NULL,
    recorded_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_health_perm_source (source_id, recorded_at),
    CONSTRAINT fk_health_perm_source FOREIGN KEY (source_id) REFERENCES health_sources(id) ON DELETE CASCADE,
    CONSTRAINT fk_health_perm_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS health_metrics (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    source_id CHAR(36) NULL,
    connected_device_id CHAR(36) NULL,
    metric_type ENUM(
        'weight', 'height', 'heart_rate', 'steps', 'active_energy',
        'distance', 'activity_minutes', 'sleep_hours'
    ) NOT NULL,
    value DECIMAL(14, 4) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    recorded_at DATETIME NOT NULL,
    external_id VARCHAR(191) NOT NULL,
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_health_metric_ext (patient_id, external_id),
    KEY idx_health_metric_patient_type_time (patient_id, metric_type, recorded_at),
    KEY idx_health_metric_source (source_id),
    CONSTRAINT fk_health_metric_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_health_metric_source FOREIGN KEY (source_id) REFERENCES health_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
