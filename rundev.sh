#!/usr/bin/env bash
# Tunnel SSH MySQL + Nuxt dev — mêmes réglages par défaut que buildlocaloneandlab.sh
# Usage :
#   ./rundev.sh --from-server-env
#   ./rundev.sh <endpoint vu depuis l’EC2, ex. RDS>
#   ./rundev.sh --tunnel-only --from-server-env   (tunnel seul, sans npm)
#
# Variables optionnelles : SSH_KEY, SSH_HOST, REMOTE_ENV, LOCAL_PORT, REMOTE_MYSQL_PORT,
#   SSH_TUNNEL_COMPRESS (1 = activer -C SSH, liaison lente ; 0 = désactiver)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"
LOCAL_PORT="${LOCAL_PORT:-3307}"
REMOTE_MYSQL_PORT="${REMOTE_MYSQL_PORT:-3306}"
SSH_TUNNEL_COMPRESS="${SSH_TUNNEL_COMPRESS:-1}"

TUNNEL_ONLY=false
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--tunnel-only" ]]; then
    TUNNEL_ONLY=true
  else
    ARGS+=("$arg")
  fi
done
set -- "${ARGS[@]}"

SSH_USER="${SSH_HOST%@*}"
SSH_HOSTNAME="${SSH_HOST#*@}"
if [[ "$SSH_USER" == "$SSH_HOSTNAME" ]]; then
  SSH_USER="ubuntu"
fi
SSH_TARGET="$SSH_USER@$SSH_HOSTNAME"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -i "$SSH_KEY")

# Options tunnel : compression SSH si activée (gain possible sur gros résultats ; latence inchangée par requête simple)
TUNNEL_SSH_OPTS=("${SSH_OPTS[@]}")
if [[ "$SSH_TUNNEL_COMPRESS" != "0" ]]; then
  TUNNEL_SSH_OPTS=(-C "${SSH_OPTS[@]}")
fi

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

usage() {
  cat <<EOF
Usage:
  $0 --from-server-env
  $0 <hôte-mysql-depuis-ec2>
  $0 --tunnel-only --from-server-env

Ensuite .env racine : DB_HOST=127.0.0.1  DB_PORT=$LOCAL_PORT (+ DB_NAME / USER / PASS serveur)
Sans --tunnel-only : lance aussi npm run dev dans frontend/
Ctrl+C arrête Nuxt et ferme le tunnel.
EOF
}

fetch_rds_host_from_server() {
  ensure_ssh_target || exit 1
  local line host port
  line="$(ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "sudo grep -E '^DB_HOST=' '$REMOTE_ENV' 2>/dev/null | head -1 || true")"
  if [[ -z "$line" ]]; then
    echo "❌ Impossible de lire DB_HOST dans $REMOTE_ENV sur le serveur." >&2
    exit 1
  fi
  host="${line#DB_HOST=}"
  host="$(echo "$host" | tr -d '\r' | tr -d '[:space:]')"
  line="$(ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "sudo grep -E '^DB_PORT=' '$REMOTE_ENV' 2>/dev/null | head -1 || true")"
  if [[ -n "$line" ]]; then
    port="${line#DB_PORT=}"
    REMOTE_MYSQL_PORT="$(echo "$port" | tr -d '\r' | tr -d '[:space:]')"
  fi
  if [[ -z "$host" ]]; then
    echo "❌ DB_HOST vide dans $REMOTE_ENV." >&2
    exit 1
  fi
  if [[ "$host" == "localhost" || "$host" == "127.0.0.1" ]]; then
    echo "==> (serveur) DB_HOST=localhost → tunnel vers 127.0.0.1 sur $SSH_TARGET" >&2
    host="127.0.0.1"
  fi
  echo "$host"
}

wait_local_mysql_port() {
  if ! command -v nc >/dev/null 2>&1; then
    echo "⚠️ nc introuvable, attente 2s pour le tunnel..." >&2
    sleep 2
    return 0
  fi
  local i=0
  while [[ $i -lt 50 ]]; do
    if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
      return 0
    fi
    sleep 0.15
    i=$((i + 1))
  done
  echo "❌ Port local $LOCAL_PORT inaccessible (tunnel SSH ?)." >&2
  return 1
}

cleanup_tunnel() {
  if [[ -n "${TUNNEL_PID:-}" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
}

if [[ $# -lt 1 ]]; then
  usage
  exit 0
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

RDS_HOST=""
if [[ "$1" == "--from-server-env" ]]; then
  echo "==> Lecture DB_HOST / DB_PORT sur le serveur ($REMOTE_ENV)..."
  RDS_HOST="$(fetch_rds_host_from_server)"
  echo "==> Hôte MySQL distant : $RDS_HOST (port $REMOTE_MYSQL_PORT)" >&2
else
  RDS_HOST="$1"
  ensure_ssh_target || exit 1
fi

if [[ "$RDS_HOST" == "localhost" ]]; then
  RDS_HOST="127.0.0.1"
fi

echo "==> Tunnel local 127.0.0.1:$LOCAL_PORT -> $RDS_HOST:$REMOTE_MYSQL_PORT (via $SSH_TARGET)"
echo "    .env : DB_HOST=127.0.0.1  DB_PORT=$LOCAL_PORT"

trap cleanup_tunnel EXIT INT TERM

ssh -N "${TUNNEL_SSH_OPTS[@]}" -L "${LOCAL_PORT}:${RDS_HOST}:${REMOTE_MYSQL_PORT}" "$SSH_TARGET" &
TUNNEL_PID=$!

sleep 0.5
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
  echo "❌ Le tunnel SSH s’est arrêté tout de suite." >&2
  exit 1
fi

wait_local_mysql_port || exit 1
echo "✅ Tunnel prêt sur 127.0.0.1:$LOCAL_PORT"

if [[ "$TUNNEL_ONLY" == true ]]; then
  echo "==> Mode tunnel seul (Ctrl+C pour quitter)"
  wait "$TUNNEL_PID"
  exit 0
fi

cd "$FRONTEND_DIR"
echo "==> npm run dev ($FRONTEND_DIR)"
npm run dev
