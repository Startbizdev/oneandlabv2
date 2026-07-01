#!/usr/bin/env bash
# Exécute la suite PHPUnit complète (plans Cary IA + carnet santé).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v php >/dev/null 2>&1; then
  echo "❌ PHP CLI introuvable. Installez PHP 8.2+ ou exécutez sur le serveur."
  exit 1
fi

if [[ ! -f vendor/bin/phpunit ]]; then
  echo "==> composer install (dev)..."
  if command -v composer >/dev/null 2>&1; then
    composer install --no-interaction --prefer-dist
  else
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php --quiet
    php composer.phar install --no-interaction --prefer-dist
    rm -f composer-setup.php composer.phar
  fi
fi

SUITE="${1:-All}"
echo "==> PHPUnit testsuite: $SUITE"
php vendor/bin/phpunit --testsuite "$SUITE" --colors=always
