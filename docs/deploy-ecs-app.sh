#!/bin/bash
# À exécuter SUR LE SERVEUR dans /var/www/oneandlab après que le code soit présent
# Crée .env, composer install, npm build, configure Nginx et PM2
set -e
cd /var/www/oneandlab

echo "==> Vérification présence backend et frontend..."
test -d backend || { echo "Erreur: pas de dossier backend. Déployez le code d'abord."; exit 1; }
test -d frontend || { echo "Erreur: pas de dossier frontend. Déployez le code d'abord."; exit 1; }

echo "==> Backend: composer install..."
cd /var/www/oneandlab/backend && composer install --no-dev --optimize-autoloader 2>/dev/null || composer install --optimize-autoloader

echo "==> Backend: .env (ne pas écraser si déjà présent)..."
cd /var/www/oneandlab
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Fichier .env créé depuis .env.example. À éditer: DB_PASS, SMTP, etc."
  else
    echo "Créez /var/www/oneandlab/.env (voir .env.example à la racine du dépôt) avec DB_*, BACKEND_KEK_HEX, JWT_SECRET, CORS_ALLOWED_ORIGINS, FRONTEND_URL, API_URL, SMTP_*, etc."
    exit 1
  fi
fi

echo "==> Frontend: npm ci et build..."
cd /var/www/oneandlab/frontend
# Valeurs pour app.oneandlab.fr (éditables dans .env à la racine du projet)
export NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-https://app.oneandlab.fr/api}"
export NUXT_PUBLIC_SITE_URL="${NUXT_PUBLIC_SITE_URL:-https://app.oneandlab.fr}"
npm ci
npm run build

echo "==> PM2: démarrage de l'app Nuxt..."
pm2 delete oneandlab-frontend 2>/dev/null || true
cd /var/www/oneandlab/frontend
pm2 start .output/server/index.mjs --name oneandlab-frontend
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo "==> Application déployée. Configurez Nginx (voir docs/nginx-oneandlab.conf) puis: sudo systemctl reload nginx"
echo "Pensez à: créer la base MySQL, importer les migrations, éditer .env avec les vrais secrets."
