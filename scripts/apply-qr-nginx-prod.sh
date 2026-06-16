#!/bin/bash
# Ajoute la redirection /qr/{token} → /api/qr/{token} dans Nginx cary.bio (prod).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Patch Nginx /qr/ sur $SSH_HOST..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
CONF=""
for f in /etc/nginx/sites-enabled/cary.bio /etc/nginx/sites-enabled/cary /etc/nginx/sites-enabled/default; do
  if [[ -f "$f" ]]; then CONF="$f"; break; fi
done
if [[ -z "$CONF" ]]; then
  echo "❌ Config Nginx introuvable"
  exit 1
fi
echo "Config: $CONF"
if grep -q 'location ~ \^/qr/' "$CONF"; then
  echo "✅ Bloc /qr/ deja present"
else
  sudo sed -i '/location \/api {/i\
    location ~ ^/qr/([A-Za-z0-9_-]+)/?$ {\
        return 302 /api/qr/$1;\
    }\
' "$CONF"
  echo "✅ Bloc /qr/ ajoute"
fi
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx recharge"
REMOTE

echo "✅ Redirection QR active sur cary.bio"
