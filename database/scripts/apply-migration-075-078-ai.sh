#!/usr/bin/env bash
# Migrations 075–078 — IA Cary (tables + seed Grok + disclaimer)
# Met aussi à jour XAI_API_KEY / ACTIVE_AI_PROVIDER / XAI_MODEL dans .env prod.
#
# Usage :
#   ./database/scripts/apply-migration-075-078-ai.sh
#   ./database/scripts/apply-migration-075-078-ai.sh --remote-only
#   XAI_API_KEY=... ./database/scripts/apply-migration-075-078-ai.sh --remote-only
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"

MIGRATIONS=(
  "075_ai_task_routing.sql"
  "076_ai_conversations.sql"
  "077_ai_audits.sql"
  "078_ai_appointment_drafts.sql"
)

XAI_API_KEY="${XAI_API_KEY:-}"
XAI_MODEL="${XAI_MODEL:-grok-3}"
ACTIVE_AI_PROVIDER="${ACTIVE_AI_PROVIDER:-grok}"

DO_LOCAL=1
DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
  esac
done

load_xai_from_local_env() {
  if [[ -z "$XAI_API_KEY" && -f "$LOCAL_ENV" ]]; then
    # shellcheck disable=SC1090
    set -a && source "$LOCAL_ENV" && set +a
    XAI_API_KEY="${XAI_API_KEY:-}"
    XAI_MODEL="${XAI_MODEL:-grok-3}"
    ACTIVE_AI_PROVIDER="${ACTIVE_AI_PROVIDER:-grok}"
  fi
}

apply_sql_files() {
  local host="$1" port="$2" user="$3" db="$4"
  export MYSQL_PWD="${DB_PASS:-}"
  for file in "${MIGRATIONS[@]}"; do
    local path="$REPO_ROOT/database/migrations/$file"
    if [[ ! -f "$path" ]]; then
      echo "Fichier SQL introuvable: $path" >&2
      exit 1
    fi
    echo "==> Application $file ..."
    mysql --default-character-set=utf8mb4 -h"$host" -P"$port" -u"$user" "$db" <"$path"
  done
}

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$LOCAL_ENV"
    set +a
  fi
  if mysql --default-character-set=utf8mb4 \
    -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" \
    -e "SHOW TABLES LIKE 'ai_conversations';" 2>/dev/null | grep -q ai_conversations; then
    echo "==> Migrations 075–078 déjà appliquées (local)."
    return 0
  fi
  apply_sql_files "${DB_HOST}" "${DB_PORT:-3306}" "$DB_USER" "$DB_NAME"
  echo "==> OK local — migrations IA 075–078."
}

set_remote_xai_env() {
  local env_file="$1"
  set_kv() {
    local key="$1" val="$2"
    if sudo grep -q "^${key}=" "$env_file" 2>/dev/null; then
      sudo sed -i "s|^${key}=.*|${key}=${val}|" "$env_file"
    else
      echo "${key}=${val}" | sudo tee -a "$env_file" >/dev/null
    fi
  }
  if [[ -n "$XAI_API_KEY" ]]; then
    set_kv XAI_API_KEY "$XAI_API_KEY"
  fi
  set_kv ACTIVE_AI_PROVIDER "$ACTIVE_AI_PROVIDER"
  set_kv XAI_MODEL "$XAI_MODEL"
  if ! sudo grep -q '^QDRANT_URL=' "$env_file" 2>/dev/null; then
    echo 'QDRANT_URL=http://127.0.0.1:6333' | sudo tee -a "$env_file" >/dev/null
  fi
  echo "==> Variables IA dans $env_file :"
  sudo grep -E '^(XAI_API_KEY|ACTIVE_AI_PROVIDER|XAI_MODEL|QDRANT_URL)=' "$env_file" | sed 's/^XAI_API_KEY=.*/XAI_API_KEY=***/' || true
}

apply_remote() {
  load_xai_from_local_env
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi

  REMOTE_TMP="/tmp/oneandlab-ai-migrations-$$.$RANDOM.sql"
  {
    for file in "${MIGRATIONS[@]}"; do
      echo "-- $file"
      cat "$REPO_ROOT/database/migrations/$file"
      echo
    done
  } >"$REMOTE_TMP"

  echo "==> Copie SQL combiné vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$REMOTE_TMP" "$SSH_HOST:/tmp/oneandlab-ai-migrations.sql"
  rm -f "$REMOTE_TMP"

  echo "==> Application migrations 075–078 sur MySQL prod..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_ENV='$REMOTE_ENV'
XAI_API_KEY='$XAI_API_KEY'
XAI_MODEL='$XAI_MODEL'
ACTIVE_AI_PROVIDER='$ACTIVE_AI_PROVIDER'
set -a
# shellcheck source=/dev/null
source "\$REMOTE_ENV"
set +a
export MYSQL_PWD="\$DB_PASS"
H="\${DB_HOST:-127.0.0.1}"
P="\${DB_PORT:-3306}"
U="\$DB_USER"
D="\$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" \\
  -e "SHOW TABLES LIKE 'ai_conversations';" 2>/dev/null | grep -q ai_conversations; then
  echo "Migrations 075–078 déjà appliquées (ai_conversations existe)."
else
  mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" </tmp/oneandlab-ai-migrations.sql
  echo "Migrations 075–078 appliquées."
fi
rm -f /tmp/oneandlab-ai-migrations.sql

set_kv() {
  local key="\$1" val="\$2"
  if sudo grep -q "^\${key}=" "\$REMOTE_ENV" 2>/dev/null; then
    sudo sed -i "s|^\${key}=.*|\${key}=\${val}|" "\$REMOTE_ENV"
  else
    echo "\${key}=\${val}" | sudo tee -a "\$REMOTE_ENV" >/dev/null
  fi
}
if [[ -n "\$XAI_API_KEY" ]]; then set_kv XAI_API_KEY "\$XAI_API_KEY"; fi
set_kv ACTIVE_AI_PROVIDER "\$ACTIVE_AI_PROVIDER"
set_kv XAI_MODEL "\$XAI_MODEL"
if ! sudo grep -q '^QDRANT_URL=' "\$REMOTE_ENV" 2>/dev/null; then
  echo 'QDRANT_URL=http://127.0.0.1:6333' | sudo tee -a "\$REMOTE_ENV" >/dev/null
fi
echo "==> Variables IA prod :"
sudo grep -E '^(XAI_API_KEY|ACTIVE_AI_PROVIDER|XAI_MODEL|QDRANT_URL)=' "\$REMOTE_ENV" | sed 's/^XAI_API_KEY=.*/XAI_API_KEY=***/' || true
REMOTE_EOF

  echo "==> OK distant — migrations IA + .env xAI."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then apply_local; fi
if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
