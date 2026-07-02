-- Migration 094 : suivi notification patient « infirmier en route »

ALTER TABLE nurse_tour_stops
    ADD COLUMN notif_nurse_en_route_sent_at DATETIME NULL AFTER skip_reason;
