-- Moment où le RDV soins est repassé en pending « partage lien confrère » (sans diffusion zone).
-- Utilisé par le cron pour relancer dispatchGeographic après N minutes si toujours pending non assigné.

ALTER TABLE appointments
    ADD COLUMN nurse_share_released_at DATETIME NULL DEFAULT NULL
    COMMENT 'Repend partage WhatsApp ; NULL = pas en attente redispatch zone'
    AFTER updated_at;

CREATE INDEX idx_appointments_nurse_share_released
    ON appointments (type, status, nurse_share_released_at);
