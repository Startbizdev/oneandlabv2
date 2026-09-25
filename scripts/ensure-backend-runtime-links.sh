#!/usr/bin/env bash
# Recreate backend → persistent symlinks after rsync deploy (uploads, logs, etc.).
set -euo pipefail

BASE="${1:-/var/www/oneandlab}"
BACKEND="$BASE/backend"
PERSIST="$BASE/persistent"

mkdir -p "$PERSIST/storage/patient-booking-drafts" "$PERSIST/uploads/medical" 2>/dev/null || true

for name in uploads logs storage keys tmp vendor; do
  target="$PERSIST/$name"
  link="$BACKEND/$name"
  if [[ "$name" == "storage" || "$name" == "uploads" ]]; then
    mkdir -p "$target/patient-booking-drafts" "$target/medical" 2>/dev/null || sudo mkdir -p "$target/patient-booking-drafts" "$target/medical"
  fi
  if [[ ! -d "$target" && ! -f "$target" ]]; then
    if [[ "$name" == "storage" || "$name" == "uploads" ]]; then
      sudo mkdir -p "$target"
    else
      continue
    fi
  fi
  if [[ -L "$link" ]]; then
    current="$(readlink -f "$link" || true)"
    if [[ "$current" == "$(readlink -f "$target")" ]]; then
      continue
    fi
  fi
  if [[ -e "$link" && ! -L "$link" ]]; then
    echo "WARN: $link exists and is not a symlink — skip"
    continue
  fi
  sudo ln -sfn "$target" "$link"
  echo "Linked $link -> $target"
done

if [[ -f "$BASE/.env" ]]; then
  sudo ln -sfn "$BASE/.env" "$BACKEND/.env"
  echo "Linked $BACKEND/.env -> $BASE/.env"
elif [[ -f "$PERSIST/.env" ]]; then
  sudo ln -sfn "$PERSIST/.env" "$BACKEND/.env"
  echo "Linked $BACKEND/.env -> $PERSIST/.env"
fi

# persistent/ est www-data:www-data 750 : le déploiement (ubuntu) doit pouvoir
# traverser le dossier et lire Composer, sans ouvrir .env ni les clés.
if [[ -d "$PERSIST" ]]; then
  sudo chmod 751 "$PERSIST"
fi
if [[ -d "$PERSIST/vendor" ]]; then
  sudo find "$PERSIST/vendor" -type d -exec chmod 755 {} \;
  sudo find "$PERSIST/vendor" -type f -exec chmod 644 {} \;
fi
if [[ -d "$PERSIST/tmp" ]]; then
  sudo chmod 1777 "$PERSIST/tmp"
fi

# Brouillons RDV patient (IAP urgence lab) — écriture PHP-FPM obligatoire
if [[ -d "$PERSIST/storage" || -L "$BACKEND/storage" ]]; then
  sudo mkdir -p "$PERSIST/storage/patient-booking-drafts"
  sudo chown -R www-data:www-data "$PERSIST/storage"
  sudo chmod -R 775 "$PERSIST/storage"
fi
if [[ -e "$BACKEND/storage" && ! -L "$BACKEND/storage" ]]; then
  if [[ -d "$BACKEND/storage/patient-booking-drafts" ]]; then
    sudo mkdir -p "$PERSIST/storage/patient-booking-drafts"
    sudo rsync -a "$BACKEND/storage/" "$PERSIST/storage/" 2>/dev/null || true
  fi
  sudo rm -rf "$BACKEND/storage"
  sudo ln -sfn "$PERSIST/storage" "$BACKEND/storage"
  echo "Linked $BACKEND/storage -> $PERSIST/storage"
fi

if sudo -u www-data test -w "$BACKEND/storage/patient-booking-drafts" 2>/dev/null; then
  echo "OK: www-data can write patient-booking-drafts"
else
  echo "ERROR: www-data cannot write storage/patient-booking-drafts" >&2
  exit 1
fi

if sudo -u www-data test -w "$BACKEND/uploads/medical" 2>/dev/null; then
  echo "OK: www-data can write $BACKEND/uploads/medical"
else
  echo "ERROR: www-data cannot write uploads/medical" >&2
  exit 1
fi

if [[ ! -r "$BACKEND/vendor/autoload.php" ]]; then
  echo "ERROR: deploy user cannot read $BACKEND/vendor/autoload.php" >&2
  exit 1
fi
echo "OK: vendor/autoload.php is readable"
