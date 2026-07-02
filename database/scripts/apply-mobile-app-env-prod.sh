#!/usr/bin/env bash
# Met à jour les variables MOBILE_* dans /var/www/oneandlab/.env (prod).
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

MOBILE_IOS_MIN_VERSION="${MOBILE_IOS_MIN_VERSION:-1.0.0}"
MOBILE_IOS_LATEST_VERSION="${MOBILE_IOS_LATEST_VERSION:-1.7.0}"
MOBILE_IOS_APP_STORE_ID="${MOBILE_IOS_APP_STORE_ID:-6778805884}"
MOBILE_ANDROID_MIN_VERSION="${MOBILE_ANDROID_MIN_VERSION:-1.0.0}"
MOBILE_ANDROID_LATEST_VERSION="${MOBILE_ANDROID_LATEST_VERSION:-1.7.0}"
MOBILE_ANDROID_MIN_VERSION_CODE="${MOBILE_ANDROID_MIN_VERSION_CODE:-7}"

set_kv() {
  local key="$1"
  local val="$2"
  if sudo grep -q "^${key}=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV" >/dev/null
  fi
}

set_kv MOBILE_IOS_MIN_VERSION "$MOBILE_IOS_MIN_VERSION"
set_kv MOBILE_IOS_LATEST_VERSION "$MOBILE_IOS_LATEST_VERSION"
set_kv MOBILE_IOS_APP_STORE_ID "$MOBILE_IOS_APP_STORE_ID"
set_kv MOBILE_ANDROID_MIN_VERSION "$MOBILE_ANDROID_MIN_VERSION"
set_kv MOBILE_ANDROID_LATEST_VERSION "$MOBILE_ANDROID_LATEST_VERSION"
set_kv MOBILE_ANDROID_MIN_VERSION_CODE "$MOBILE_ANDROID_MIN_VERSION_CODE"

echo "==> Mobile app version vars in $ENV:"
sudo grep -E '^MOBILE_' "$ENV"
