-- Purge PROD : tous les RDV + notifications uniquement.
-- Conserve : profiles (patient, pro, nurse, preleveur, lab, subaccount, admin),
--            proches, catégories, zones, documents profil (medical_documents sans RDV), etc.
--
-- À exécuter via database/scripts/purge-prod-appointments-and-notifications.sh

SET SESSION foreign_key_checks = 0;

-- Notifications (indépendantes des RDV)
TRUNCATE TABLE notifications;

-- Brouillons de réservation patient
TRUNCATE TABLE patient_booking_drafts;

-- Commentaires photos de soins (avant suppression docs liés RDV)
DELETE c FROM appointment_care_photo_comments c
INNER JOIN medical_documents m ON m.id = c.medical_document_id
WHERE m.appointment_id IS NOT NULL;

-- Documents médicaux rattachés à un RDV (garde ceux du profil : appointment_id IS NULL)
DELETE FROM medical_documents WHERE appointment_id IS NOT NULL;

-- Tables enfants RDV
TRUNCATE TABLE appointment_offers;
TRUNCATE TABLE appointment_blood_test_items;
TRUNCATE TABLE appointment_nursing_items;
TRUNCATE TABLE appointment_status_updates;
TRUNCATE TABLE appointment_share_tokens;
TRUNCATE TABLE reviews;

-- Accès pro-patient liés à un RDV
UPDATE patient_professional_access SET appointment_id = NULL WHERE appointment_id IS NOT NULL;

-- Mapping legacy Mongo → RDV
DELETE FROM legacy_id_mapping WHERE target_table = 'appointments';

-- Logs d'accès sur ressource appointment (optionnel mais cohérent)
DELETE FROM access_logs WHERE resource_type = 'appointment';

-- RDV (self-ref merged_into_appointment_id : OK avec FK checks off)
TRUNCATE TABLE appointments;

SET SESSION foreign_key_checks = 1;

-- Vérification rapide
SELECT 'appointments' AS tbl, COUNT(*) AS cnt FROM appointments
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'medical_documents_rdv', COUNT(*) FROM medical_documents WHERE appointment_id IS NOT NULL
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles;
