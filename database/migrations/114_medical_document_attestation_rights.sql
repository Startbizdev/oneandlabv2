-- Migration 114 : attestation de droits / AME comme type documentaire distinct

ALTER TABLE medical_documents
    MODIFY document_type ENUM(
        'carte_vitale',
        'carte_mutuelle',
        'attestation_droits_ame',
        'ordonnance',
        'autres_assurances',
        'resultats',
        'care_photo',
        'cancellation_photo',
        'conversation_attachment',
        'other'
    ) DEFAULT 'other';

ALTER TABLE patient_documents
    MODIFY document_type ENUM(
        'carte_vitale',
        'carte_mutuelle',
        'attestation_droits_ame',
        'autres_assurances'
    ) NOT NULL;

ALTER TABLE patient_relative_documents
    MODIFY document_type ENUM(
        'carte_vitale',
        'carte_mutuelle',
        'attestation_droits_ame',
        'autres_assurances'
    ) NOT NULL;
