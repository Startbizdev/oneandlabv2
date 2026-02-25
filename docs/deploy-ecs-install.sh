#!/bin/bash
# À exécuter sur le serveur ECS (ubuntu@35.180.230.108)
# Usage: curl -s ... | bash   OU   scp ce fichier + ssh 'bash deploy-ecs-install.sh'
set -e
export DEBIAN_FRONTEND=noninteractive

echo "==> Mise à jour des paquets..."
sudo apt-get update -qq

echo "==> Installation PHP 8.2, FPM, extensions..."
sudo apt-get install -y -qq software-properties-common
sudo add-apt-repository -y ppa:ondrej/php 2>/dev/null || true
sudo apt-get update -qq
sudo apt-get install -y -qq php8.2-cli php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip unzip

echo "==> Installation Composer..."
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

echo "==> Installation Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y -qq nodejs

echo "==> Installation Nginx..."
sudo apt-get install -y -qq nginx

echo "==> Installation MySQL..."
sudo apt-get install -y -qq mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

echo "==> Installation PM2 (process manager pour Nuxt)..."
sudo npm install -g pm2

echo "==> Création du répertoire applicatif..."
sudo mkdir -p /var/www/oneandlab
sudo chown ubuntu:ubuntu /var/www/oneandlab

echo "==> Stack installée. PHP: $(php -v), Node: $(node -v), Nginx et MySQL prêts."
echo "Prochaine étape: déployer le code (rsync ou git clone) puis lancer docs/deploy-ecs-app.sh"
