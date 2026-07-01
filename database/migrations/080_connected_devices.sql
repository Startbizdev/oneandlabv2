-- Migration 080 : objets connectés (Phase 2 IA)

CREATE TABLE IF NOT EXISTS connected_devices (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    vendor ENUM(
        'apple_watch', 'garmin', 'fitbit', 'oura', 'withings', 'samsung_watch',
        'connected_scale', 'bp_monitor', 'glucometer', 'apple_health', 'health_connect', 'other'
    ) NOT NULL DEFAULT 'other',
    model VARCHAR(128) NULL,
    external_device_id VARCHAR(191) NOT NULL,
    health_source_id CHAR(36) NULL,
    paired_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_connected_device_ext (patient_id, external_device_id),
    KEY idx_connected_device_patient (patient_id, revoked_at),
    CONSTRAINT fk_connected_device_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_connected_device_source FOREIGN KEY (health_source_id) REFERENCES health_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE health_metrics
    ADD CONSTRAINT fk_health_metric_device
    FOREIGN KEY (connected_device_id) REFERENCES connected_devices(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS device_syncs (
    id CHAR(36) PRIMARY KEY,
    device_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    error_message TEXT NULL,
    metrics_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_device_sync_device (device_id, started_at),
    KEY idx_device_sync_patient (patient_id, started_at),
    CONSTRAINT fk_device_sync_device FOREIGN KEY (device_id) REFERENCES connected_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_device_sync_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
