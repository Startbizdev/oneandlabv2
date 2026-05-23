-- Option catalogue : masquer l'étape « Ordonnance / Autre prescription » (parcours patient, wizard dashboard).
-- À appliquer sur toutes les BDD où admin modifie les catégories.

ALTER TABLE care_categories
  ADD COLUMN skip_prescription_documents BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'Masque ordonnance + autre prescription (RDV nouveau, wizard, formulaires pro)'
    AFTER is_active;
