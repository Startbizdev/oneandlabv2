-- Migration 110 : module commandes pharmacie

CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id CHAR(36) PRIMARY KEY,
    requester_id CHAR(36) NOT NULL,
    requester_role ENUM('nurse', 'pro', 'super_admin') NOT NULL,
    pharmacy_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    relative_id CHAR(36) NULL DEFAULT NULL,
    fulfillment_mode ENUM('click_collect', 'home_delivery') NOT NULL,
    delivery_address_json TEXT NULL DEFAULT NULL,
    delivery_postal_code VARCHAR(12) NULL DEFAULT NULL,
    status ENUM(
        'en_attente',
        'acceptee',
        'en_cours',
        'terminee',
        'refusee',
        'complement_demande',
        'annulee'
    ) NOT NULL DEFAULT 'en_attente',
    requester_comment TEXT NULL DEFAULT NULL,
    pharmacy_note TEXT NULL DEFAULT NULL,
    rejection_reason TEXT NULL DEFAULT NULL,
    prescription_document_ids JSON NULL DEFAULT NULL,
    created_by_admin_id CHAR(36) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_pharmacy_orders_requester (requester_id, created_at),
    INDEX idx_pharmacy_orders_pharmacy (pharmacy_id, status, created_at),
    INDEX idx_pharmacy_orders_patient (patient_id, created_at),
    INDEX idx_pharmacy_orders_status (status, created_at),

    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (pharmacy_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (relative_id) REFERENCES patient_relatives(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_admin_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pharmacy_order_events (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    actor_id CHAR(36) NULL DEFAULT NULL,
    event_type VARCHAR(64) NOT NULL,
    from_status VARCHAR(32) NULL DEFAULT NULL,
    to_status VARCHAR(32) NULL DEFAULT NULL,
    payload_json TEXT NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_pharmacy_order_events_order (order_id, created_at),

    FOREIGN KEY (order_id) REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pharmacy_order_messages (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    medical_document_id CHAR(36) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_pharmacy_order_messages_order (order_id, created_at),
    INDEX idx_pharmacy_order_messages_author (author_id),

    FOREIGN KEY (order_id) REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'profiles'
       AND COLUMN_NAME = 'pharmacy_accepts_click_collect') > 0,
    'SELECT 1',
    'ALTER TABLE profiles
        ADD COLUMN pharmacy_accepts_click_collect TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''Pharmacien : accepte click and collect'' AFTER prescription_generation_enabled,
        ADD COLUMN pharmacy_accepts_home_delivery TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''Pharmacien : accepte livraison'' AFTER pharmacy_accepts_click_collect,
        ADD COLUMN pharmacy_orders_paused TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Pharmacien : pause commandes'' AFTER pharmacy_accepts_home_delivery,
        ADD COLUMN pharmacy_orders_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''Pharmacien : module commandes actif'' AFTER pharmacy_orders_paused'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('pharmacy_module_config', '{"module_enabled":true,"ordering_enabled_for_nurse":true,"ordering_enabled_emplois":["Médecin généraliste","Médecin spécialiste","Sage-femme"],"ordering_allow_custom_emploi":false,"pharmacy_receiver_emplois":["Pharmacien"]}')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
