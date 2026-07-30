-- Migration 101 : marques labo (choix patient prélèvement) + préférence RDV

CREATE TABLE IF NOT EXISTS lab_brands (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    logo_url VARCHAR(512) NULL,
    website_url VARCHAR(512) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lab_brands_slug (slug),
    INDEX idx_lab_brands_active_sort (is_active, sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
    ADD COLUMN lab_preference_mode ENUM('platform_match', 'brand_choice') NULL DEFAULT NULL
        AFTER dispatch_mode,
    ADD COLUMN preferred_lab_brand_id CHAR(36) NULL DEFAULT NULL
        AFTER lab_preference_mode;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_preferred_lab_brand
        FOREIGN KEY (preferred_lab_brand_id) REFERENCES lab_brands(id) ON DELETE SET NULL;

CREATE INDEX idx_appointments_lab_preference ON appointments (lab_preference_mode, preferred_lab_brand_id, status);

ALTER TABLE appointments
    MODIFY COLUMN dispatch_mode ENUM(
        'zone',
        'external_invite',
        'direct_assign',
        'manual',
        'patient_brand_choice'
    ) NULL DEFAULT NULL;

-- Seed marques (logos via favicon officiel des sites)
INSERT INTO lab_brands (id, name, slug, logo_url, website_url, sort_order, is_active) VALUES
('a1000001-0001-4001-8001-000000000017', 'Labio', 'labio', 'https://cary.bio/api/public/lab-brands/logo?name=labio.png', 'https://www.labio.fr', 1, 1),
('a1000001-0001-4001-8001-000000000018', 'Labo Sud', 'labo-sud', 'https://cary.bio/api/public/lab-brands/logo?name=labo-sud.png', 'https://inovie.fr/laboratoires/inovie-labosud/', 2, 1),
('a1000001-0001-4001-8001-000000000001', 'Biogroup', 'biogroup', 'https://www.google.com/s2/favicons?domain=biogroup.fr&sz=128', 'https://biogroup.fr', 3, 1),
('a1000001-0001-4001-8001-000000000002', 'Cerballiance', 'cerballiance', 'https://cary.bio/api/public/lab-brands/logo?name=cerballiance.jpg', 'https://www.cerballiance.fr', 4, 1),
('a1000001-0001-4001-8001-000000000003', 'Inovie', 'inovie', 'https://www.google.com/s2/favicons?domain=inovie.fr&sz=128', 'https://inovie.fr', 5, 1),
('a1000001-0001-4001-8001-000000000004', 'SYNLAB', 'synlab', 'https://www.google.com/s2/favicons?domain=synlab.fr&sz=128', 'https://www.synlab.fr', 6, 1),
('a1000001-0001-4001-8001-000000000005', 'Unilabs', 'unilabs', 'https://cary.bio/api/public/lab-brands/logo?name=unilabs.jpg', 'https://unilabs.fr', 7, 1),
('a1000001-0001-4001-8001-000000000006', 'Eurofins', 'eurofins', 'https://www.google.com/s2/favicons?domain=eurofins.fr&sz=128', 'https://www.eurofins.fr', 8, 1),
('a1000001-0001-4001-8001-000000000008', 'Ouest Biologie', 'ouest-biologie', 'https://www.google.com/s2/favicons?domain=ouest-biologie.com&sz=128', 'https://www.ouest-biologie.com', 9, 1),
('a1000001-0001-4001-8001-000000000009', 'OuiLab', 'ouilab', 'https://www.google.com/s2/favicons?domain=ouilab.com&sz=128', 'https://ouilab.com', 10, 1),
('a1000001-0001-4001-8001-000000000010', 'MLab', 'mlab', 'https://www.google.com/s2/favicons?domain=mlab-groupe.fr&sz=128', 'https://mlab-groupe.fr', 11, 1),
('a1000001-0001-4001-8001-000000000011', 'B2A', 'b2a', 'https://cary.bio/api/public/lab-brands/logo?name=b2a.jpg', 'https://b2a.fr', 12, 1),
('a1000001-0001-4001-8001-000000000012', 'Bioémeraude', 'bioemeraude', 'https://www.google.com/s2/favicons?domain=ouest-biologie.com&sz=128', 'https://www.ouest-biologie.com', 13, 1),
('a1000001-0001-4001-8001-000000000013', 'Biodin', 'biodin', 'https://www.google.com/s2/favicons?domain=ouest-biologie.com&sz=128', 'https://www.ouest-biologie.com', 14, 1),
('a1000001-0001-4001-8001-000000000014', 'Biolor', 'biolor', 'https://www.google.com/s2/favicons?domain=ouest-biologie.com&sz=128', 'https://www.ouest-biologie.com', 15, 1),
('a1000001-0001-4001-8001-000000000015', 'Biopole', 'biopole', 'https://www.google.com/s2/favicons?domain=ouest-biologie.com&sz=128', 'https://www.ouest-biologie.com', 16, 1),
('a1000001-0001-4001-8001-000000000016', 'Technipath', 'technipath', 'https://www.google.com/s2/favicons?domain=synlab.fr&sz=128', 'https://www.synlab.fr', 17, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    logo_url = VALUES(logo_url),
    website_url = VALUES(website_url),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
