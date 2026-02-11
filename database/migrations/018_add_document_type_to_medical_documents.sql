-- Migration 018 : Ajouter document_type à medical_documents
-- Permet de classifier les documents (carte vitale, mutuelle, ordonnance, autre)

ALTER TABLE medical_documents 
ADD COLUMN document_type ENUM('carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances', 'other') 
DEFAULT 'other' 
AFTER mime_type;

-- Créer un index pour faciliter les recherches par type
CREATE INDEX idx_document_type ON medical_documents(document_type);



