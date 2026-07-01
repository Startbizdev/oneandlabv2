#!/usr/bin/env bash
# Installe Qdrant sur l'EC2 Cary (Docker, bind 127.0.0.1:6333).
# Usage (sur le serveur) : sudo bash scripts/install-qdrant-ec2.sh
# Depuis la machine locale :
#   SSH_HOST=ubuntu@15.236.73.7 ./scripts/install-qdrant-ec2.sh --remote
set -euo pipefail

QDRANT_DATA_DIR="${QDRANT_DATA_DIR:-/var/lib/qdrant}"
QDRANT_IMAGE="${QDRANT_IMAGE:-qdrant/qdrant:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-cary-qdrant}"
BIND_HOST="${BIND_HOST:-127.0.0.1}"
BIND_PORT="${BIND_PORT:-6333}"

install_local() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker requis. Installez Docker puis relancez." >&2
    exit 1
  fi
  sudo mkdir -p "$QDRANT_DATA_DIR"
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Conteneur $CONTAINER_NAME existe — redémarrage..."
    docker restart "$CONTAINER_NAME" >/dev/null
  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      -p "${BIND_HOST}:${BIND_PORT}:6333" \
      -v "${QDRANT_DATA_DIR}:/qdrant/storage" \
      "$QDRANT_IMAGE"
  fi
  echo "Qdrant OK : http://${BIND_HOST}:${BIND_PORT}"
  curl -sf "http://${BIND_HOST}:${BIND_PORT}/collections" >/dev/null && echo "Health check OK"
}

install_remote() {
  SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
  if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
    SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
  fi
  SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
    "$SCRIPT_DIR/install-qdrant-ec2.sh" "$SSH_HOST:/tmp/install-qdrant-ec2.sh"
  ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" \
    "sudo bash /tmp/install-qdrant-ec2.sh && rm -f /tmp/install-qdrant-ec2.sh"
  ENV_FILE="${REMOTE_ENV:-/var/www/oneandlab/.env}"
  ssh -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
ENV='$ENV_FILE'
if [[ -f "\$ENV" ]] && ! grep -q '^QDRANT_URL=' "\$ENV"; then
  echo '' >> "\$ENV"
  echo 'QDRANT_URL=http://127.0.0.1:6333' >> "\$ENV"
  echo 'QDRANT_API_KEY=' >> "\$ENV"
  echo 'QDRANT_COLLECTION=cary_patient_rag' >> "\$ENV"
fi
REMOTE
  echo "==> QDRANT_URL ajouté dans .env si absent."
}

case "${1:-}" in
  --remote) install_remote ;;
  *) install_local ;;
esac
