#!/usr/bin/env bash
# Met à jour ADMIN_NOTIFY_EMAIL dans /var/www/oneandlab/.env (prod).
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"
ADMIN_NOTIFY_EMAIL="${ADMIN_NOTIFY_EMAIL:-contact@cary.bio}"

set_kv() {
  local key="$1"
  local val="$2"
  if sudo grep -q "^${key}=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV" >/dev/null
  fi
}

set_kv ADMIN_NOTIFY_EMAIL "$ADMIN_NOTIFY_EMAIL"

echo "==> Admin notify in $ENV:"
sudo grep -E '^ADMIN_NOTIFY_EMAIL=' "$ENV"
