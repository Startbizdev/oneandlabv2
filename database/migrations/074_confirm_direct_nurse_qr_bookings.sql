-- RDV soins réservés par un patient directement chez un infirmier (QR / fiche publique)
-- étaient en pending + assigned_nurse_id → confirmés sans acceptation manuelle.
UPDATE appointments
SET status = 'confirmed', updated_at = NOW()
WHERE type = 'nursing'
  AND status = 'pending'
  AND assigned_nurse_id IS NOT NULL
  AND TRIM(assigned_nurse_id) <> ''
  AND (created_by IS NULL OR created_by <> assigned_nurse_id);
