-- Migration 135 : index de recherche des personnes (patients et proches) aux noms chiffrés.
-- Chaque ligne = empreinte HMAC-SHA256 (clé dérivée de la KEK) d'un début de mot du nom, du prénom
-- ou du téléphone. La base retrouve une personne par empreinte sans jamais stocker le nom en clair.
-- Idempotente, sans modification des données existantes.

CREATE TABLE IF NOT EXISTS person_search_tokens (
    subject_type ENUM('profile', 'relative') NOT NULL,
    subject_id CHAR(36) NOT NULL,
    token CHAR(64) NOT NULL,
    PRIMARY KEY (subject_type, subject_id, token),
    INDEX idx_person_search_token (token, subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
