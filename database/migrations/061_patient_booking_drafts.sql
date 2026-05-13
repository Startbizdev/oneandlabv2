-- Brouillon RDV patient + paiement Stripe « urgence prise de sang » (parcours public)
CREATE TABLE IF NOT EXISTS patient_booking_drafts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  payload_json LONGTEXT NOT NULL COMMENT 'JSON: tableau des corps POST /appointments (sans clé files natives)',
  files_manifest_json LONGTEXT NULL COMMENT 'JSON: liste des fichiers déposés sur disque dans storage_subdir',
  storage_subdir VARCHAR(64) NOT NULL COMMENT 'Sous-répertoire sécurisé sous storage/patient-booking-drafts/',
  stripe_checkout_session_id VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment' COMMENT 'pending_payment,paid_processing,completed,failed,expired',
  amount_cents INT NOT NULL DEFAULT 890,
  created_appointment_ids_json LONGTEXT NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_booking_drafts_stripe_session (stripe_checkout_session_id),
  KEY idx_patient_booking_drafts_user_status (user_id, status),
  KEY idx_patient_booking_drafts_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
