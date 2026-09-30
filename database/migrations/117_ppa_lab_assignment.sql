-- Migration 117 : origine « lab_assignment » (patient assigné à un préleveur ou rattaché au labo du préleveur)

ALTER TABLE patient_professional_access
    MODIFY source ENUM(
        'created',
        'appointment_accepted',
        'appointment_linked',
        'manual_link',
        'qr_origin',
        'lab_assignment'
    ) NOT NULL DEFAULT 'created';
