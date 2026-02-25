#!/bin/bash
# Déploiement complet sur ECS : MySQL, migrations, .env, backend, frontend, Nginx, SSL
# À exécuter SUR LE SERVEUR (dans /var/www/oneandlab après rsync du code)
# Usage: bash docs/deploy-ecs-full.sh [email pour Let's Encrypt]
set -e
CERTBOT_EMAIL="${1:-admin@oneandlab.fr}"
cd /var/www/oneandlab

echo "==> Vérification backend + frontend..."
test -d backend || { echo "Erreur: pas de backend/"; exit 1; }
test -d frontend || { echo "Erreur: pas de frontend/"; exit 1; }
test -d database/migrations || { echo "Erreur: pas de database/migrations/"; exit 1; }

# --- MySQL : créer base + utilisateur ---
echo "==> MySQL : création base et utilisateur oneandlab..."
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS oneandlab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'oneandlab'@'localhost' IDENTIFIED BY '${DB_PASS}';
  GRANT ALL PRIVILEGES ON oneandlab.* TO 'oneandlab'@'localhost';
  FLUSH PRIVILEGES;
" 2>/dev/null || {
  echo "Si erreur MySQL, exécutez manuellement: sudo mysql -e \"CREATE DATABASE oneandlab; CREATE USER 'oneandlab'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE'; GRANT ALL ON oneandlab.* TO 'oneandlab'@'localhost'; FLUSH PRIVILEGES;\""
  exit 1
}

# --- Générer secrets et créer .env ---
echo "==> Génération des secrets et fichier .env..."
BACKEND_KEK_HEX=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -base64 48)

if [ -f .env.example ]; then
  cp .env.example .env
else
  echo "Fichier .env.example manquant. Créez .env manuellement."
  exit 1
fi

sed -i "s|^DB_PASS=.*|DB_PASS=${DB_PASS}|" .env
sed -i "s|^DB_USER=.*|DB_USER=oneandlab|" .env
sed -i "s|^BACKEND_KEK_HEX=.*|BACKEND_KEK_HEX=${BACKEND_KEK_HEX}|" .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://app.oneandlab.fr,http://app.oneandlab.fr|" .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://app.oneandlab.fr|" .env
sed -i "s|^API_URL=.*|API_URL=https://app.oneandlab.fr|" .env
sed -i "s|^NUXT_PUBLIC_API_BASE=.*|NUXT_PUBLIC_API_BASE=https://app.oneandlab.fr/api|" .env
sed -i "s|^NUXT_PUBLIC_SITE_URL=.*|NUXT_PUBLIC_SITE_URL=https://app.oneandlab.fr|" .env
sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env

# --- Migrations PHP ---
echo "==> Exécution des migrations (setup-database.php)..."
cd /var/www/oneandlab/backend
php setup-database.php || { echo "Échec migrations. Vérifiez .env et MySQL."; exit 1; }
cd /var/www/oneandlab

# --- Backend : Composer ---
echo "==> Backend: composer install..."
cd backend && composer install --no-dev --optimize-autoloader 2>/dev/null || composer install --optimize-autoloader
cd /var/www/oneandlab

# --- Frontend : build ---
echo "==> Frontend: npm ci et build..."
cd frontend
export NUXT_PUBLIC_API_BASE="https://app.oneandlab.fr/api"
export NUXT_PUBLIC_SITE_URL="https://app.oneandlab.fr"
npm ci
npm run build
cd /var/www/oneandlab

# --- PM2 ---
echo "==> PM2 : démarrage Nuxt..."
pm2 delete oneandlab-frontend 2>/dev/null || true
cd /var/www/oneandlab/frontend
pm2 start .output/server/index.mjs --name oneandlab-frontend
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
cd /var/www/oneandlab

# --- Nginx ---
echo "==> Nginx : configuration..."
sudo cp -f docs/nginx-oneandlab.conf /etc/nginx/sites-available/oneandlab
sudo ln -sf /etc/nginx/sites-available/oneandlab /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx

# --- SSL (Certbot) ---
echo "==> SSL : installation Certbot et certificat pour app.oneandlab.fr..."
if ! command -v certbot &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq certbot python3-certbot-nginx
fi
sudo certbot --nginx -d app.oneandlab.fr --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect || true

echo ""
echo "=== Déploiement terminé ==="
echo "  Site: https://app.oneandlab.fr"
echo "  API:  https://app.oneandlab.fr/api"
echo "  MySQL: base oneandlab, user oneandlab (mot de passe dans .env)"
echo "  Comptes de test créés par setup-database.php (admin@oneandlab.fr, lab@, patient@, etc.)"
echo "  Pensez à éditer .env pour SMTP (SMTP_USER, SMTP_PASS) si vous voulez envoyer des emails."
