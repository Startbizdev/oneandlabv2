#!/usr/bin/env bash
# Configure nginx + .env sur le serveur pour cary.bio, puis HTTPS (certbot).
# Usage: ./scripts/setup-cary-bio-domain.sh
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_CONF="$REPO_ROOT/docs/nginx-cary.conf"
REMOTE_ENV="/var/www/oneandlab/.env"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY")

echo "==> Copie config nginx..."
scp -q "${SSH_OPTS[@]}" "$NGINX_CONF" "$SSH_HOST:/tmp/nginx-cary.conf"

echo "==> Installation nginx + mise à jour .env..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
sudo cp /tmp/nginx-cary.conf /etc/nginx/sites-available/cary.bio
sudo ln -sf /etc/nginx/sites-available/cary.bio /etc/nginx/sites-enabled/cary.bio
# Désactive l’ancien vhost si présent
sudo rm -f /etc/nginx/sites-enabled/oneandlab /etc/nginx/sites-enabled/app.oneandlab.fr /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx

if [[ -f /var/www/oneandlab/.env ]]; then
  sudo sed -i \
    -e 's|https://app\.oneandlab\.fr|https://cary.bio|g' \
    -e 's|http://app\.oneandlab\.fr|http://cary.bio|g' \
    /var/www/oneandlab/.env
  if ! grep -q 'www.cary.bio' /var/www/oneandlab/.env 2>/dev/null; then
    sudo sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://cary.bio,https://www.cary.bio,http://cary.bio,http://www.cary.bio|' /var/www/oneandlab/.env || true
  fi
  grep -E '^(FRONTEND_URL|API_URL|CORS_ALLOWED_ORIGINS|NUXT_PUBLIC_)=' /var/www/oneandlab/.env | head -10
fi
REMOTE

echo "==> Certificat HTTPS (certbot)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
if command -v certbot >/dev/null 2>&1; then
  sudo certbot --nginx -d cary.bio -d www.cary.bio --non-interactive --agree-tos -m joopixstudio@gmail.com --redirect || \
    sudo certbot --nginx -d cary.bio -d www.cary.bio
else
  echo "⚠️ certbot absent — installer: sudo apt install certbot python3-certbot-nginx"
fi
REMOTE

echo "✅ Nginx + .env serveur OK. Lance ./buildlocaloneandlab.sh pour rebuild frontend avec cary.bio."
