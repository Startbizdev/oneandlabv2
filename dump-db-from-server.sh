#!/usr/bin/env bash
# Dump MySQL sur l’EC2 (même SSH que rundev.sh) → fichier local dans data/mysql-dumps/
# Lit DB_NAME / DB_USER / DB_PASS depuis la racine du repo : .env (aligné serveur)
#
# Usage :
#   ./dump-db-from-server.sh
#   OUT=./autre.sql ./dump-db-from-server.sh
#
# Import local (exemple) :
#   mysql -h 127.0.0.1 -u root -p -e "CREATE DATABASE IF NOT EXISTS oneandlab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
#   mysql -h 127.0.0.1 -u root -p oneandlab < data/mysql-dumps/oneandlab-....sql
#
# Variables optionnelles : SSH_KEY, SSH_HOST, REMOTE_MYSQL_HOST (défaut 127.0.0.1 sur l’EC2), REMOTE_MYSQL_PORT (défaut 3306)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_MYSQL_HOST="${REMOTE_MYSQL_HOST:-127.0.0.1}"
REMOTE_MYSQL_PORT="${REMOTE_MYSQL_PORT:-3306}"

SSH_USER="${SSH_HOST%@*}"
SSH_HOSTNAME="${SSH_HOST#*@}"
if [[ "$SSH_USER" == "$SSH_HOSTNAME" ]]; then
  SSH_USER="ubuntu"
fi
SSH_TARGET="$SSH_USER@$SSH_HOSTNAME"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -i "$SSH_KEY")

resolve_ipv4() {
  local host="$1"
  dig +short "$host" 2>/dev/null | awk 'NF { print; exit }'
}

ensure_ssh_target() {
  if ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "echo connected" >/dev/null 2>&1; then
    return 0
  fi
  local ip=""
  ip="$(resolve_ipv4 "$SSH_HOSTNAME" || true)"
  if [[ -z "$ip" ]]; then
    echo "❌ DNS: impossible de résoudre $SSH_HOSTNAME" >&2
    return 1
  fi
  SSH_TARGET="$SSH_USER@$ip"
  if ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "echo connected" >/dev/null 2>&1; then
    echo "✅ SSH OK via IP $ip" >&2
    return 0
  fi
  echo "❌ Connexion SSH impossible." >&2
  return 1
}

load_db_creds_from_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Fichier introuvable : $ENV_FILE" >&2
    exit 1
  fi
  DB_NAME=""
  DB_USER=""
  DB_PASS=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    [[ "$line" != *=* ]] && continue
    local k="${line%%=*}"
    local v="${line#*=}"
    k="$(echo "$k" | sed 's/[[:space:]]*$//')"
    v="$(echo "$v" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    case "$k" in
      DB_NAME) DB_NAME="$v" ;;
      DB_USER) DB_USER="$v" ;;
      DB_PASS) DB_PASS="$v" ;;
    esac
  done < "$ENV_FILE"
  if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    echo "❌ DB_NAME et DB_USER requis dans $ENV_FILE" >&2
    exit 1
  fi
}

load_db_creds_from_env

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-$REPO_ROOT/data/mysql-dumps/${DB_NAME}-${STAMP}.sql}"
mkdir -p "$(dirname "$OUT")"

echo "==> SSH $SSH_TARGET"
ensure_ssh_target

# Fichier client MySQL encodé en base64 (évite les mots de passe bizarres dans la ligne de commande)
INI_B64="$(printf '[client]\nuser=%s\npassword=%s\nhost=%s\nport=%s\n' "$DB_USER" "$DB_PASS" "$REMOTE_MYSQL_HOST" "$REMOTE_MYSQL_PORT" | base64 | tr -d '\n')"

echo "==> mysqldump sur le serveur → $OUT"
set +e
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s -- "$INI_B64" "$DB_NAME" <<'REMOTE' >"$OUT"
set -euo pipefail
INI_B64="$1"
DB_NAME="$2"
if ! command -v mysqldump >/dev/null 2>&1; then
  echo "❌ mysqldump introuvable sur le serveur (apt install mysql-client ou mariadb-client ?)" >&2
  exit 2
fi
CNF="$(mktemp /tmp/oneandlab-mysqldump.XXXXXX.cnf)"
cleanup() { rm -f "$CNF"; }
trap cleanup EXIT
echo "$INI_B64" | base64 -d > "$CNF"
chmod 600 "$CNF"
exec mysqldump \
  --defaults-extra-file="$CNF" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  "$DB_NAME"
REMOTE
EC=$?
set -e

if [[ "$EC" -ne 0 ]]; then
  echo "❌ mysqldump a échoué (code $EC). Fichier partiel supprimé." >&2
  rm -f "$OUT"
  exit "$EC"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✅ Dump OK — $OUT ($SIZE)"
echo "    Import local : mysql -u root -p $DB_NAME < \"$OUT\""
