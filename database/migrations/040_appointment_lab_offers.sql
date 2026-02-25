-- Migration 040 : Offres de RDV (labs/sous-comptes + infirmiers)
-- Qui a reçu le RDV au dispatch : affichage dans la liste + popup accepter/refuser.
-- Premier qui accepte = assigné, disparaît des autres tableaux.

CREATE TABLE IF NOT EXISTS appointment_offers (
    appointment_id CHAR(36) NOT NULL,
    profile_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (appointment_id, profile_id),
    INDEX idx_profile_id (profile_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
