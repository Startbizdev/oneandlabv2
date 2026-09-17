#!/usr/bin/env bash
# One-time prod migration: runtime data out of release folders into /var/www/oneandlab/persistent
# Uses mv (not copy) to avoid doubling disk usage on a full volume.
set -euo pipefail

BASE=/var/www/oneandlab
PERSIST="$BASE/persistent"
BACKEND="$BASE/backend"

if [[ "$(id -un)" != "ubuntu" ]]; then
  echo "Run as ubuntu on the production host." >&2
  exit 1
fi

sudo mkdir -p "$PERSIST"/{uploads,logs,storage,keys,tmp}
sudo chown ubuntu:www-data "$PERSIST"
sudo chmod 750 "$PERSIST"

migrate_dir() {
  local name="$1"
  local target="$PERSIST/$name"
  local link="$BACKEND/$name"

  if [[ ! -L "$link" && ! -d "$link" ]]; then
    echo "Skip $name: nothing at $link"
    return 0
  fi

  local src
  src="$(readlink -f "$link")"
  if [[ "$src" == "$target" ]]; then
    echo "Skip $name: already on persistent"
    return 0
  fi
  if [[ ! -d "$src" ]]; then
    echo "Skip $name: source missing ($src)" >&2
    return 1
  fi

  if [[ -e "$target" ]] && [[ "$(ls -A "$target" 2>/dev/null | wc -l)" -gt 0 ]]; then
    echo "Refusing $name: $target already populated" >&2
    return 1
  fi

  echo "Moving $name: $src -> $target"
  sudo rm -rf "$target"
  sudo mv "$src" "$target"
  sudo rm -f "$link"
  sudo ln -s "$target" "$link"
  echo "OK $name"
}

migrate_file() {
  local name="$1"
  local target="$PERSIST/$name"
  local link="$BACKEND/$name"

  if [[ ! -e "$link" ]]; then
    echo "Skip $name: missing"
    return 0
  fi

  local src
  src="$(readlink -f "$link")"
  if [[ "$src" == "$target" ]]; then
    echo "Skip $name: already on persistent"
    return 0
  fi

  echo "Moving $name: $src -> $target"
  sudo cp -a "$src" "$target"
  sudo chmod 600 "$target"
  sudo rm -f "$link"
  sudo ln -s "$target" "$link"
  echo "OK $name"
}

migrate_dir uploads
migrate_dir logs
migrate_dir storage
migrate_dir keys
migrate_dir tmp
migrate_file .env

# vendor stays release-local; only move if still inside an old release tree.
if [[ -L "$BACKEND/vendor" ]]; then
  vendor_src="$(readlink -f "$BACKEND/vendor")"
  if [[ "$vendor_src" == /var/lib/oneandlab-releases/* ]]; then
    echo "Moving vendor: $vendor_src -> $PERSIST/vendor"
    sudo rm -rf "$PERSIST/vendor"
    sudo mv "$vendor_src" "$PERSIST/vendor"
    sudo rm -f "$BACKEND/vendor"
    sudo ln -s "$PERSIST/vendor" "$BACKEND/vendor"
    echo "OK vendor"
  fi
fi

sudo chown -R www-data:www-data "$PERSIST"
sudo find "$PERSIST" -type d -exec chmod 750 {} \;
sudo find "$PERSIST/uploads" "$PERSIST/logs" "$PERSIST/storage" -type f -exec chmod 640 {} \; 2>/dev/null || true
sudo chmod 700 "$PERSIST/keys" 2>/dev/null || true
sudo chmod 600 "$PERSIST/.env" 2>/dev/null || true

echo "=== Verification ==="
for p in uploads logs storage keys vendor tmp .env; do
  printf '%s -> %s\n' "$p" "$(sudo readlink -f "$BACKEND/$p" 2>/dev/null || echo MISSING)"
done
sudo test -d "$PERSIST/uploads/medical" && echo "uploads/medical OK"
curl --fail --silent 'https://cary.bio/api/public/labs?limit=1' | php -r '$j=json_decode(stream_get_contents(STDIN),true); if(empty($j["success"])) exit(1); echo "API OK\n";'

df -h /
