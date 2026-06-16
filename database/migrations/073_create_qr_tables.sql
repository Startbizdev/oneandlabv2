-- QR codes professionnels + analytics + attribution RDV

CREATE TABLE IF NOT EXISTS qr_codes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    profile_id CHAR(36) NOT NULL,
    user_role ENUM('nurse', 'lab', 'subaccount', 'pro') NOT NULL,
    token VARCHAR(12) NOT NULL,
    redirect_url VARCHAR(512) NOT NULL,
    marketing_tagline VARCHAR(120) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_qr_codes_profile (profile_id),
    UNIQUE KEY uq_qr_codes_token (token),
    KEY idx_qr_codes_role (user_role),
    CONSTRAINT fk_qr_codes_profile FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_scans (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(512) NULL,
    ip_hash CHAR(64) NULL,
    referrer VARCHAR(512) NULL,
    KEY idx_qr_scans_code (qr_code_id),
    KEY idx_qr_scans_at (scanned_at),
    CONSTRAINT fk_qr_scans_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_visits (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    scan_id CHAR(36) NULL,
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(64) NULL,
    KEY idx_qr_visits_code (qr_code_id),
    KEY idx_qr_visits_at (visited_at),
    CONSTRAINT fk_qr_visits_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_visits_scan FOREIGN KEY (scan_id) REFERENCES qr_scans (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_conversions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    visit_id CHAR(36) NULL,
    appointment_id CHAR(36) NOT NULL,
    converted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_qr_conv_appointment (appointment_id),
    KEY idx_qr_conv_code (qr_code_id),
    CONSTRAINT fk_qr_conv_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_conv_visit FOREIGN KEY (visit_id) REFERENCES qr_visits (id) ON DELETE SET NULL,
    CONSTRAINT fk_qr_conv_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
    ADD COLUMN attribution_qr_id CHAR(36) NULL AFTER assigned_to,
    ADD COLUMN assigned_pro_id CHAR(36) NULL AFTER attribution_qr_id,
    ADD KEY idx_appointments_attribution_qr (attribution_qr_id),
    ADD KEY idx_appointments_assigned_pro (assigned_pro_id),
    ADD CONSTRAINT fk_appointments_attribution_qr FOREIGN KEY (attribution_qr_id) REFERENCES qr_codes (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_appointments_assigned_pro FOREIGN KEY (assigned_pro_id) REFERENCES profiles (id) ON DELETE SET NULL;

ALTER TABLE patient_professional_access
    MODIFY COLUMN source ENUM('created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'qr_booking') NOT NULL DEFAULT 'created';
