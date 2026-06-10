#!/usr/bin/env bash
# Insère un avis test pour chloeidel8@gmail.com sur un RDV terminé sans avis (prod).
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
PATIENT_EMAIL="${PATIENT_EMAIL:-chloeidel8@gmail.com}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Cle SSH introuvable: $SSH_KEY" >&2
  exit 1
fi

EMAIL_HASH="$(printf '%s' "$PATIENT_EMAIL" | tr '[:upper:]' '[:lower:]' | openssl dgst -sha256 | awk '{print $2}')"

ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="\$DB_PASS"
H="\${DB_HOST:-127.0.0.1}"
P="\${DB_PORT:-3306}"
EMAIL_HASH='$EMAIL_HASH'

mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$DB_USER" "\$DB_NAME" <<SQL
SET @patient_id := (SELECT id FROM profiles WHERE email_hash = '\$EMAIL_HASH' AND role = 'patient' LIMIT 1);
SELECT @patient_id AS patient_id;

SET @apt_id := (
  SELECT a.id
  FROM appointments a
  LEFT JOIN reviews r ON r.appointment_id = a.id
  WHERE a.patient_id = @patient_id
    AND a.status = 'completed'
    AND r.id IS NULL
    AND (
      (a.type IN ('nursing','nurse') AND a.assigned_nurse_id IS NOT NULL)
      OR (a.type = 'blood_test' AND (a.assigned_lab_id IS NOT NULL OR a.assigned_to IS NOT NULL))
    )
  ORDER BY a.scheduled_at DESC
  LIMIT 1
);
SELECT @apt_id AS appointment_id;

SET @reviewee_id := NULL;
SET @reviewee_type := NULL;

SELECT
  @reviewee_id := CASE
    WHEN a.type IN ('nursing','nurse') AND a.assigned_nurse_id IS NOT NULL THEN a.assigned_nurse_id
    WHEN a.type = 'blood_test' AND a.assigned_lab_id IS NOT NULL THEN a.assigned_lab_id
    WHEN a.type = 'blood_test' AND a.assigned_to IS NOT NULL THEN a.assigned_to
    ELSE NULL
  END,
  @reviewee_type := CASE
    WHEN a.type IN ('nursing','nurse') AND a.assigned_nurse_id IS NOT NULL THEN 'nurse'
    WHEN a.type = 'blood_test' AND a.assigned_lab_id IS NOT NULL THEN 'lab'
    WHEN a.type = 'blood_test' AND a.assigned_to IS NOT NULL THEN 'subaccount'
    ELSE NULL
  END
FROM appointments a
WHERE a.id = @apt_id;

SELECT @reviewee_id AS reviewee_id, @reviewee_type AS reviewee_type;

INSERT INTO reviews (
  id, appointment_id, patient_id, reviewee_id, reviewee_type,
  rating, comment, is_visible, created_at, updated_at
)
SELECT
  UUID(),
  @apt_id,
  @patient_id,
  @reviewee_id,
  @reviewee_type,
  5,
  'Simulation avis Cary — merci pour votre accompagnement.',
  TRUE,
  NOW(),
  NOW()
WHERE @patient_id IS NOT NULL
  AND @apt_id IS NOT NULL
  AND @reviewee_id IS NOT NULL
  AND @reviewee_type IS NOT NULL;

SELECT r.id, r.appointment_id, r.reviewee_type, r.rating, r.comment, r.created_at
FROM reviews r
WHERE r.appointment_id = @apt_id
ORDER BY r.created_at DESC
LIMIT 1;

SELECT CASE
  WHEN @patient_id IS NULL THEN 'ERREUR: patient introuvable pour cet email.'
  WHEN @apt_id IS NULL THEN 'INFO: aucun RDV terminé sans avis pour ce patient — impossible de simuler un avis.'
  ELSE 'OK: avis inséré.'
END AS simulation_status;
SQL
REMOTE

echo "==> Simulation terminée pour $PATIENT_EMAIL"
