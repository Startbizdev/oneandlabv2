-- Migration 042 : Ajouter 'resultats' au type document_type de medical_documents
-- Permet d'uploader des résultats d'analyses (lab) ou comptes-rendus (nurse)

ALTER TABLE medical_documents
MODIFY COLUMN document_type ENUM('carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances', 'resultats', 'other') DEFAULT 'other';
