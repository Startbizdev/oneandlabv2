#!/usr/bin/env bash
# Recreate backend → persistent symlinks after rsync deploy (uploads, logs, etc.).
set -euo pipefail

BASE="${1:-/var/www/oneandlab}"
BACKEND="$BASE/backend"
PERSIST="$BASE/persistent"

for name in uploads logs storage keys tmp vendor; do
  target="$PERSIST/$name"
  link="$BACKEND/$name"
  if [[ ! -d "$target" && ! -f "$target" ]]; then
    continue
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
