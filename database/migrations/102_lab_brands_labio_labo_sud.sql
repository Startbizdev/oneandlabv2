-- Migration 102 : Labio + Labo Sud en tête de la liste marques labo

INSERT INTO lab_brands (id, name, slug, logo_url, website_url, sort_order, is_active) VALUES
('a1000001-0001-4001-8001-000000000017', 'Labio', 'labio', 'https://cary.bio/api/public/lab-brands/logo?name=labio.png', 'https://www.labio.fr', 1, 1),
('a1000001-0001-4001-8001-000000000018', 'Labo Sud', 'labo-sud', 'https://cary.bio/api/public/lab-brands/logo?name=labo-sud.png', 'https://inovie.fr/laboratoires/inovie-labosud/', 2, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    logo_url = VALUES(logo_url),
    website_url = VALUES(website_url),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;

UPDATE lab_brands SET sort_order = CASE slug
    WHEN 'labio' THEN 1
    WHEN 'labo-sud' THEN 2
    WHEN 'biogroup' THEN 3
    WHEN 'cerballiance' THEN 4
    WHEN 'inovie' THEN 5
    WHEN 'synlab' THEN 6
    WHEN 'unilabs' THEN 7
    WHEN 'eurofins' THEN 8
    WHEN 'ouest-biologie' THEN 9
    WHEN 'ouilab' THEN 10
    WHEN 'mlab' THEN 11
    WHEN 'b2a' THEN 12
    WHEN 'bioemeraude' THEN 13
    WHEN 'biodin' THEN 14
    WHEN 'biolor' THEN 15
    WHEN 'biopole' THEN 16
    WHEN 'technipath' THEN 17
    ELSE sort_order
END;
