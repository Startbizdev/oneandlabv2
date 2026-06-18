#!/usr/bin/env bash
# Met à jour les variables Stripe dans /var/www/oneandlab/.env (prod).
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

set_kv() {
  local key="$1"
  local val="$2"
  if sudo grep -q "^${key}=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV" >/dev/null
  fi
}

set_kv STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:?}"
set_kv STRIPE_PUBLISHABLE_KEY "${STRIPE_PUBLISHABLE_KEY:-}"
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  set_kv STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
fi
set_kv STRIPE_PRICE_NURSE_PRO "${STRIPE_PRICE_NURSE_PRO:?}"
set_kv STRIPE_PRICE_LAB_STARTER "${STRIPE_PRICE_LAB_STARTER:?}"
set_kv STRIPE_PRICE_LAB_PRO "${STRIPE_PRICE_LAB_PRO:?}"
set_kv STRIPE_PRICE_PATIENT_URGENCY "${STRIPE_PRICE_PATIENT_URGENCY:?}"

echo "==> Stripe vars in $ENV:"
sudo grep -E '^STRIPE_' "$ENV"
