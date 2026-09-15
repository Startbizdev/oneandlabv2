#!/usr/bin/env bash
# Voix Cary (Grok STT/TTS xAI) â€” variables prod dans /var/www/oneandlab/.env
set -euo pipefail

ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"
XAI_TTS_VOICE_ID="${XAI_TTS_VOICE_ID:-ara}"
XAI_REALTIME_MODEL="${XAI_REALTIME_MODEL:-grok-voice-latest}"
AI_VOICE_REALTIME_ENABLED="${AI_VOICE_REALTIME_ENABLED:-0}"
AI_VOICE_REALTIME_ALLOWLIST="${AI_VOICE_REALTIME_ALLOWLIST:-}"
AI_VOICE_REALTIME_TOKEN_TTL_SECONDS="${AI_VOICE_REALTIME_TOKEN_TTL_SECONDS:-300}"

set_kv() {
  local key="$1"
  local val="$2"
  if sudo grep -q "^${key}=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV" >/dev/null
  fi
}

set_kv XAI_TTS_VOICE_ID "$XAI_TTS_VOICE_ID"
set_kv XAI_REALTIME_MODEL "$XAI_REALTIME_MODEL"
set_kv AI_VOICE_REALTIME_ENABLED "$AI_VOICE_REALTIME_ENABLED"
set_kv AI_VOICE_REALTIME_ALLOWLIST "$AI_VOICE_REALTIME_ALLOWLIST"
set_kv AI_VOICE_REALTIME_TOKEN_TTL_SECONDS "$AI_VOICE_REALTIME_TOKEN_TTL_SECONDS"

echo "==> Voix Grok (prod) dans $ENV:"
sudo grep -E '^(XAI_TTS_VOICE_ID|XAI_REALTIME_MODEL|AI_VOICE_REALTIME_)=' "$ENV" || true
if sudo grep -q '^XAI_API_KEY=' "$ENV" 2>/dev/null; then
  echo "XAI_API_KEY=*** (prÃ©sente)"
else
  echo "âš ï¸ XAI_API_KEY absente â€” mode vocal indisponible cÃ´tÃ© serveur"
fi
