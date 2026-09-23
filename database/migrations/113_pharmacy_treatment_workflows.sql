-- Migration 113 : parcours traitement patient, date souhaitée et disponibilités pharmacie

ALTER TABLE pharmacy_orders
    MODIFY requester_role VARCHAR(32) NOT NULL,
    ADD COLUMN desired_fulfillment_date DATE NULL DEFAULT NULL AFTER delivery_postal_code,
    ADD INDEX idx_pharmacy_orders_patient_status (patient_id, status, created_at),
    ADD INDEX idx_pharmacy_orders_desired_date (pharmacy_id, desired_fulfillment_date);

ALTER TABLE profiles
    ADD COLUMN pharmacy_click_collect_days_json JSON NULL DEFAULT NULL
        COMMENT 'Jours disponibles 1=lundi..7=dimanche' AFTER pharmacy_orders_enabled,
    ADD COLUMN pharmacy_home_delivery_days_json JSON NULL DEFAULT NULL
        COMMENT 'Jours de livraison 1=lundi..7=dimanche' AFTER pharmacy_click_collect_days_json;

UPDATE profiles
SET pharmacy_click_collect_days_json = JSON_ARRAY(1, 2, 3, 4, 5, 6),
    pharmacy_home_delivery_days_json = JSON_ARRAY(1, 2, 3, 4, 5, 6)
WHERE role = 'pro'
  AND LOWER(TRIM(emploi)) = LOWER('Pharmacien')
  AND pharmacy_click_collect_days_json IS NULL
  AND pharmacy_home_delivery_days_json IS NULL;
