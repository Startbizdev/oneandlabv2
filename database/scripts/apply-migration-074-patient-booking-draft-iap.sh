#!/usr/bin/env bash
# Migration 074 — IAP Horaire VIP sur patient_booking_drafts + .env prod
# Usage: ./database/scripts/apply-migration-074-patient-booking-draft-iap.sh
#        ./database/scripts/apply-migration-074-patient-booking-draft-iap.sh --remote-only
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.188.11.249}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_ROOT/database/migrations/074_patient_booking_draft_iap.sql"

DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --remote-only) ;;
    --local-only) DO_REMOTE=0 ;;
  esac
done

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fichier SQL introuvable: $SQL_FILE" >&2
  exit 1
fi

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-074-patient-booking-draft-iap.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Migration 074 + .env sur prod..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_TMP='$REMOTE_TMP'
REMOTE_ENV='$REMOTE_ENV'
set -a
# shellcheck source=/dev/null
source "\$REMOTE_ENV"
set +a
export MYSQL_PWD="\$DB_PASS"
H="\${DB_HOST:-127.0.0.1}"
P="\${DB_PORT:-3306}"
U="\$DB_USER"
D="\$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" \\
  -e "SHOW COLUMNS FROM patient_booking_drafts LIKE 'payment_provider';" 2>/dev/null | grep -q payment_provider; then
  echo "Migration 074 deja appliquee (payment_provider existe)."
else
  mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_TMP"
  echo "Migration 074 appliquee."
fi
rm -f "\$REMOTE_TMP"
if grep -q '^IAP_PATIENT_VIP_PRODUCT_ID=' "\$REMOTE_ENV"; then
  sudo sed -i 's|^IAP_PATIENT_VIP_PRODUCT_ID=.*|IAP_PATIENT_VIP_PRODUCT_ID=cary.patient.blood.vip|' "\$REMOTE_ENV"
  echo "IAP_PATIENT_VIP_PRODUCT_ID mis a jour."
else
  printf '\n# IAP — Horaire VIP patient (prise de sang mobile)\nIAP_PATIENT_VIP_PRODUCT_ID=cary.patient.blood.vip\n' | sudo tee -a "\$REMOTE_ENV" >/dev/null
  echo "IAP_PATIENT_VIP_PRODUCT_ID ajoute."
fi
grep '^IAP_PATIENT_VIP_PRODUCT_ID=' "\$REMOTE_ENV" || true
REMOTE_EOF

  echo "==> OK distant — migration 074 + IAP_PATIENT_VIP_PRODUCT_ID."
}

if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
