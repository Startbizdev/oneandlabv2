-- Migration 021 : Ajout de la colonne icon aux catégories de soins (nom d'icône Lucide)

ALTER TABLE care_categories
ADD COLUMN icon VARCHAR(120) NULL DEFAULT NULL AFTER type;
