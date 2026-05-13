-- Image personnalisée pour une catégorie de soin (remplace l’affichage de l’icône Lucide côté UI si renseignée).
ALTER TABLE care_categories
ADD COLUMN image_url VARCHAR(768) NULL DEFAULT NULL AFTER icon;
