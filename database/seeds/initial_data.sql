-- Seed initial : Données de base

-- Catégories de soins infirmiers
INSERT INTO care_categories (id, name, description, type, is_active) VALUES
(UUID(), 'Pansement', 'Pansements simples et complexes', 'nursing', TRUE),
(UUID(), 'Injection', 'Injections intramusculaires, sous-cutanées', 'nursing', TRUE),
(UUID(), 'Prélèvement', 'Prélèvements sanguins, urinaires', 'nursing', TRUE),
(UUID(), 'Perfusion', 'Pose et surveillance de perfusions', 'nursing', TRUE),
(UUID(), 'Soins de plaies', 'Soins de plaies chroniques ou aiguës', 'nursing', TRUE);

-- Catégories de prises de sang
INSERT INTO care_categories (id, name, description, type, is_active) VALUES
(UUID(), 'Bilan complet', 'Bilan sanguin complet', 'blood_test', TRUE),
(UUID(), 'Glycémie', 'Dosage de la glycémie', 'blood_test', TRUE),
(UUID(), 'Cholestérol', 'Dosage du cholestérol', 'blood_test', TRUE),
(UUID(), 'Vitamines', 'Dosage des vitamines', 'blood_test', TRUE),
(UUID(), 'Hormones', 'Dosage hormonal', 'blood_test', TRUE);

-- Note : Le compte super_admin sera créé via un script séparé avec chiffrement approprié




