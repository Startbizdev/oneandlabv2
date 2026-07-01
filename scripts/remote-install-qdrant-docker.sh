#!/usr/bin/env bash
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io
  sudo systemctl enable --now docker
fi
docker --version
QDRANT_DATA_DIR="${QDRANT_DATA_DIR:-/var/lib/qdrant}"
CONTAINER_NAME="${CONTAINER_NAME:-cary-qdrant}"
sudo mkdir -p "$QDRANT_DATA_DIR"
if sudo docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  sudo docker restart "$CONTAINER_NAME"
else
  sudo docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p 127.0.0.1:6333:6333 \
    -v "${QDRANT_DATA_DIR}:/qdrant/storage" \
    qdrant/qdrant:latest
fi
sleep 2
curl -sf http://127.0.0.1:6333/collections && echo " Qdrant OK"
ENV_FILE="/var/www/oneandlab/.env"
for kv in "QDRANT_URL=http://127.0.0.1:6333" "QDRANT_COLLECTION=cary_patient_rag" "XAI_EMBEDDING_MODEL=text-embedding-3-large" "EMBEDDING_VECTOR_SIZE=1536"; do
  key="${kv%%=*}"
  val="${kv#*=}"
  if ! sudo grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "${key}=${val}" | sudo tee -a "$ENV_FILE" >/dev/null
  fi
done
echo "Done."
