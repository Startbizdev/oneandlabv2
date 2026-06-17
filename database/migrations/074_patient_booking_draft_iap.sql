-- Paiement IAP Horaire VIP (Apple / Google) sur brouillons RDV patient
ALTER TABLE patient_booking_drafts
  ADD COLUMN payment_provider VARCHAR(16) NULL COMMENT 'stripe, apple, google' AFTER stripe_checkout_session_id,
  ADD COLUMN iap_product_id VARCHAR(128) NULL AFTER payment_provider;
