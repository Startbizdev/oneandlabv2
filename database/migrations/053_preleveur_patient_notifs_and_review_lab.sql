-- Notifications trajet préleveur (idempotence) + type d'avis "lab"
ALTER TABLE appointments
    ADD COLUMN notif_preleveur_en_route_sent_at DATETIME NULL,
    ADD COLUMN notif_preleveur_arrive_sent_at DATETIME NULL;

ALTER TABLE reviews
    MODIFY COLUMN reviewee_type ENUM('nurse', 'subaccount', 'lab') NOT NULL;
