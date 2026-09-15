-- Audit agrégé uniquement, sans identité ni contenu médical.
-- Prérequis : migrations 052, 055, 060 et tables patient_booking_drafts.
-- À exécuter avec un compte SELECT uniquement ; aucune migration dans ce fichier.
START TRANSACTION READ ONLY;

SELECT table_name, column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('appointments', 'appointment_blood_test_items', 'appointment_nursing_items', 'patient_booking_drafts')
ORDER BY table_name, ordinal_position;

SELECT type, status, COUNT(*) AS appointment_count
FROM appointments
GROUP BY type, status;

SELECT COUNT(*) AS multi_appointment_batches
FROM (
  SELECT creation_batch_id
  FROM appointments
  WHERE creation_batch_id IS NOT NULL
  GROUP BY creation_batch_id
  HAVING COUNT(*) > 1
) AS batches;

SELECT COUNT(*) AS batches_with_multiple_patients
FROM (
  SELECT creation_batch_id
  FROM appointments
  WHERE creation_batch_id IS NOT NULL
  GROUP BY creation_batch_id
  HAVING COUNT(DISTINCT patient_id) > 1
) AS batches;

SELECT COUNT(*) AS orphan_blood_test_items
FROM appointment_blood_test_items item
LEFT JOIN appointments appointment ON appointment.id = item.appointment_id
WHERE appointment.id IS NULL;

SELECT COUNT(*) AS orphan_nursing_items
FROM appointment_nursing_items item
LEFT JOIN appointments appointment ON appointment.id = item.appointment_id
WHERE appointment.id IS NULL;

SELECT COUNT(*) AS merged_rows_with_missing_parent
FROM appointments legacy
LEFT JOIN appointments canonical ON canonical.id = legacy.merged_into_appointment_id
WHERE legacy.merged_into_appointment_id IS NOT NULL AND canonical.id IS NULL;

SELECT status, COUNT(*) AS draft_count
FROM patient_booking_drafts
GROUP BY status;

SELECT COUNT(*) AS payment_references_with_multiple_completed_drafts
FROM (
  SELECT payment_provider, stripe_checkout_session_id
  FROM patient_booking_drafts
  WHERE status = 'completed'
    AND stripe_checkout_session_id IS NOT NULL
    AND stripe_checkout_session_id <> ''
  GROUP BY payment_provider, stripe_checkout_session_id
  HAVING COUNT(*) > 1
) AS repeated_payments;

COMMIT;
