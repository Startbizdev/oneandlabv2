#!/usr/bin/env bash
# Configure Apple IAP sur prod (/var/www/oneandlab/.env).
# Prérequis : clé .p8 App Store Connect copiée sur le serveur.
#
# Exemple (depuis votre machine, après avoir la clé AuthKey_XXXX.p8) :
#   scp AuthKey_XXXX.p8 ubuntu@HOST:/var/www/oneandlab/backend/keys/apple-iap.p8
#   ssh ubuntu@HOST 'APPLE_IAP_ISSUER_ID=... APPLE_IAP_KEY_ID=XXXX bash /var/www/oneandlab/database/scripts/apply-apple-iap-env-prod.sh'
#
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"
KEYS_DIR="/var/www/oneandlab/backend/keys"
KEY_PATH="${APPLE_IAP_PRIVATE_KEY_PATH:-${KEYS_DIR}/apple-iap.p8}"

IAP_NURSE_PRO_PRODUCT_ID="${IAP_NURSE_PRO_PRODUCT_ID:-cary.pro.monthly}"
APPLE_IAP_ISSUER_ID="${APPLE_IAP_ISSUER_ID:-}"
APPLE_IAP_KEY_ID="${APPLE_IAP_KEY_ID:-}"
APPLE_IAP_BUNDLE_ID="${APPLE_IAP_BUNDLE_ID:-com.carybioapp.app}"
APPLE_IAP_ENVIRONMENT="${APPLE_IAP_ENVIRONMENT:-production}"

set_kv() {
  local key="$1"
  local val="$2"
  if sudo grep -q "^${key}=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV" >/dev/null
  fi
}

sudo mkdir -p "$KEYS_DIR"
sudo chown root:www-data "$KEYS_DIR"
sudo chmod 750 "$KEYS_DIR"

set_kv IAP_NURSE_PRO_PRODUCT_ID "$IAP_NURSE_PRO_PRODUCT_ID"
set_kv IAP_ALLOW_UNVERIFIED "false"
set_kv APPLE_IAP_ISSUER_ID "$APPLE_IAP_ISSUER_ID"
set_kv APPLE_IAP_KEY_ID "$APPLE_IAP_KEY_ID"
set_kv APPLE_IAP_PRIVATE_KEY_PATH "$KEY_PATH"
set_kv APPLE_IAP_BUNDLE_ID "$APPLE_IAP_BUNDLE_ID"
set_kv APPLE_IAP_ENVIRONMENT "$APPLE_IAP_ENVIRONMENT"

echo "==> Apple IAP vars in $ENV:"
sudo grep -E '^(IAP_|APPLE_IAP_)' "$ENV" || true

if [[ ! -f "$KEY_PATH" ]]; then
  echo "ATTENTION: clé privée absente ($KEY_PATH). Copiez le fichier .p8 App Store Connect."
  exit 1
fi

sudo chmod 640 "$KEY_PATH"
sudo chown root:www-data "$KEY_PATH"
echo "==> Vérification config PHP:"
sudo -u www-data php /var/www/oneandlab/backend/scripts/check-iap-config.php

echo "==> Webhook App Store Server Notifications V2:"
echo "    https://cary.bio/api/iap/apple/notifications"
echo "==> Resync abonnements Apple:"
echo "    php /var/www/oneandlab/backend/scripts/resync-apple-subscriptions.php --dry-run"
