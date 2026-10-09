-- Migration 127 : binôme infirmier — un infirmier titulaire partage un RDV, une série de passages ou une plage
-- de sa tournée avec un confrère (sans acceptation). Seule source de vérité : rien n'est recopié sur les RDV.
-- Un RDV est partagé tant qu'une ligne non révoquée le couvre et que le titulaire en reste l'infirmier assigné.
CREATE TABLE IF NOT EXISTS nurse_collaborations (
    id CHAR(36) PRIMARY KEY,
    owner_nurse_id CHAR(36) NOT NULL,
    co_nurse_id CHAR(36) NOT NULL,
    scope ENUM('appointment', 'series', 'range') NOT NULL,
    appointment_id CHAR(36) NULL,
    passage_series_id CHAR(36) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    KEY idx_nurse_collaborations_co (co_nurse_id, revoked_at),
    KEY idx_nurse_collaborations_owner (owner_nurse_id),
    KEY idx_nurse_collaborations_appointment (appointment_id),
    KEY idx_nurse_collaborations_series (passage_series_id),
    CONSTRAINT fk_nurse_collaborations_owner FOREIGN KEY (owner_nurse_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_nurse_collaborations_co FOREIGN KEY (co_nurse_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_nurse_collaborations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_nurse_collaborations_series FOREIGN KEY (passage_series_id) REFERENCES nurse_passage_series(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
