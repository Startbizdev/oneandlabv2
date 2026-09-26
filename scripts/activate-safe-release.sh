#!/usr/bin/env bash
# Remote activation: all old code and persistent directories remain available.
set -euo pipefail
RELEASE="${1:?}"; BACKUP="${2:?}"; SHA="${3:?}"
[[ "$RELEASE" =~ ^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$ ]] || exit 1
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ "$BACKUP" =~ ^/home/ubuntu/deploy-backups/[a-zA-Z0-9_-]+$ ]] || exit 1
BASE=/var/www/oneandlab
STAGE="/var/lib/oneandlab-releases/$RELEASE"
[[ "$(readlink -f "$STAGE")" == "$STAGE" ]] || exit 1
[[ -f "$STAGE/frontend/.output/server/index.mjs" && -f "$STAGE/backend/index.php" ]] || exit 1
[[ -d "$BASE/backend" && -d "$BASE/frontend" && -d "$BASE/database" ]] || exit 1
gzip -t "$BACKUP/database.sql.gz"
(cd "$BACKUP" && sha256sum -c database.sha256)
CHECKS="$(php "$BASE/backend/scripts/verify-migrations-prod-status.php")"
if printf '%s\n' "$CHECKS" | grep -Eq '^(MISS|ERR)'; then
  echo 'Existing schema incomplete; stopped before activation'; exit 1
fi
find "$STAGE/backend" -type f -name '*.php' -print0 | xargs -0 -n1 php -l > "$STAGE/php-lint.log"
php "$STAGE/scripts/deploy-database-safety.php" migrate "$BACKUP"
PERSIST="$BASE/persistent"
sudo mkdir -p "$PERSIST"/{uploads,logs,storage,keys,tmp,vendor} 2>/dev/null || true
# Clinical/runtime data live outside release folders (see scripts/migrate-persistent-runtime.sh).
for name in uploads storage keys logs tmp vendor; do
  [[ ! -e "$STAGE/backend/$name" ]] || { echo "Unexpected tracked runtime directory: $name"; exit 1; }
  if [[ -e "$PERSIST/$name" ]]; then
    ln -s "$PERSIST/$name" "$STAGE/backend/$name"
  elif [[ -e "$BASE/backend/$name" ]]; then
    ln -s "$STAGE/previous-backend/$name" "$STAGE/backend/$name"
  fi
done
shopt -s nullglob
for source in "$BASE/backend"/.env "$BASE/backend"/.env.*; do
  name="$(basename "$source")"
  [[ "$name" == .env.example ]] && continue
  [[ ! -e "$STAGE/backend/$name" ]] || exit 1
  if [[ "$name" == .env && -f "$PERSIST/.env" ]]; then
    ln -s "$PERSIST/.env" "$STAGE/backend/.env"
  else
    ln -s "$STAGE/previous-backend/$name" "$STAGE/backend/$name"
  fi
done
# Keep hashed chunks for browsers still running the preceding application.
if [[ -d "$BASE/frontend/.output/public/_nuxt" ]]; then
  cp -an "$BASE/frontend/.output/public/_nuxt/." "$STAGE/frontend/.output/public/_nuxt/"
fi
activated=()
rollback() {
  trap - ERR
  echo 'Activation failed; restoring previous application code.' >&2
  for ((i=${#activated[@]}-1; i>=0; i--)); do
    name="${activated[$i]}"
    if [[ -e "$BASE/$name" ]]; then sudo mv "$BASE/$name" "$STAGE/failed-$name"; fi
    sudo mv "$STAGE/previous-$name" "$BASE/$name"
  done
  sudo systemctl reload php8.2-fpm || true
  pm2 restart oneandlab-frontend --update-env || true
  exit 1
}
trap rollback ERR
for name in backend frontend database; do
  sudo mv "$BASE/$name" "$STAGE/previous-$name"
  activated+=("$name")
  sudo mv "$STAGE/$name" "$BASE/$name"
done
if [[ -f "$STAGE/scripts/ensure-backend-runtime-links.sh" ]]; then
  sudo bash "$STAGE/scripts/ensure-backend-runtime-links.sh" "$BASE"
elif [[ -f "$BASE/scripts/ensure-backend-runtime-links.sh" ]]; then
  sudo bash "$BASE/scripts/ensure-backend-runtime-links.sh" "$BASE"
fi
sudo systemctl reload php8.2-fpm
NODE_ENV=production NUXT_PUBLIC_API_BASE=/api NUXT_API_INTERNAL_BASE=https://cary.bio/api pm2 restart oneandlab-frontend --update-env
curl --fail --silent --show-error --retry 8 --retry-connrefused --retry-delay 2 http://127.0.0.1:3000/ -o "$STAGE/home-check.html"
curl --fail --silent --show-error 'https://cary.bio/api/public/labs?limit=1' | php -r '$j=json_decode(stream_get_contents(STDIN),true); if (empty($j["success"])) exit(1); echo "Public API healthy\n";'
php "$STAGE/scripts/deploy-database-safety.php" verify "$BACKUP"
pm2 save
printf '%s\n' "$SHA" > "$STAGE/deployed-commit.txt"
trap - ERR
echo "Release active: $RELEASE"
