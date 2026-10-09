-- Migration 120 : soin coché individuellement pendant la tournée (date de réalisation)

ALTER TABLE appointment_nursing_items
    ADD COLUMN done_at DATETIME NULL AFTER sort_order;
