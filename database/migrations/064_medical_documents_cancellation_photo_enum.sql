-- Erreur MySQL « Data truncated for column document_type » : cancellation_photo accepté en POST
-- mais absent de l'ENUM medical_documents (migrations 018 / 042 / 050).

ALTER TABLE medical_documents
MODIFY COLUMN document_type ENUM(
    'carte_vitale',
    'carte_mutuelle',
    'ordonnance',
    'autres_assurances',
    'resultats',
    'care_photo',
    'cancellation_photo',
    'other'
) DEFAULT 'other';
