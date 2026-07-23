#!/usr/bin/env bash
# Variables Brevo SMS sur prod (sans écraser BREVO_API_KEY si déjà défini).
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV"
  else
    echo "${key}=${value}" >> "$ENV"
  fi
}

set_kv "BREVO_SMS_SENDER" "CARYBIO"
set_kv "BREVO_SMS_BRAND" "CARYBIO"

echo "OK — BREVO_SMS_SENDER/CARYBIO appliqués."
echo "Ajoutez BREVO_API_KEY=xkeysib-… (onglet API keys Brevo, pas la clé SMTP xsmtpsib)."
