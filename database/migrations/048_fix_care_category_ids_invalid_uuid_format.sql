-- Deux catégories « nursing » ont un id stocké comme 36 caractères hexadécimaux SANS tirets.
-- Ce n’est pas un UUID au format attendu par Validation::uuid() (8-4-4-4-12), d’où l’erreur
-- « ID de catégorie invalide (format UUID requis) » quand le patient choisit ce soin sur /rendez-vous/nouveau.
--
-- IDs concernés (prod vérifié 2026-03) :
--   57231bd0b02f69facd2a19f406d8034baf88 — « Autre » (1 option + 1 préférence infirmier)
--   070ef3d46e61ee15ee587c6db9ff68752244 — « Mon bilan prévention » (aucune référence fille)

START TRANSACTION;

-- --- Autre : doublon avec nouvel UUID puis réassignation des FK, suppression de l’ancienne ligne ---
SET @old_autre := '57231bd0b02f69facd2a19f406d8034baf88';
SET @new_autre := UUID();

INSERT INTO care_categories (id, name, description, type, icon, is_active, created_at, updated_at)
SELECT @new_autre, name, description, type, icon, is_active, created_at, updated_at
FROM care_categories WHERE id = @old_autre;

UPDATE care_category_options SET care_category_id = @new_autre WHERE care_category_id = @old_autre;
UPDATE nurse_category_preferences SET category_id = @new_autre WHERE category_id = @old_autre;
UPDATE lab_category_preferences SET category_id = @new_autre WHERE category_id = @old_autre;

DELETE FROM care_categories WHERE id = @old_autre;

-- --- Mon bilan prévention : aucune FK, simple remplacement d’id ---
SET @old_bilan := '070ef3d46e61ee15ee587c6db9ff68752244';
SET @new_bilan := UUID();

UPDATE care_categories SET id = @new_bilan WHERE id = @old_bilan;

COMMIT;
