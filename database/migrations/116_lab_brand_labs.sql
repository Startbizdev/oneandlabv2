-- Migration 116 : comptes labo rattachés à une marque (réception des RDV « réseau choisi »)

CREATE TABLE IF NOT EXISTS lab_brand_labs (
    brand_id CHAR(36) NOT NULL,
    lab_profile_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (brand_id, lab_profile_id),
    INDEX idx_lab_brand_labs_lab (lab_profile_id),
    CONSTRAINT fk_lab_brand_labs_brand FOREIGN KEY (brand_id) REFERENCES lab_brands(id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_brand_labs_lab FOREIGN KEY (lab_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
