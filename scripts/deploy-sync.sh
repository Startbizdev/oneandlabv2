#!/bin/bash
# Sync local → remote : rsync si dispo, sinon tar|ssh (Git Bash Windows sans rsync).

deploy_sync_dir() {
  local src="$1"
  local dest="$2"
  shift 2
  local rsync_delete=()
  if [[ "${1:-}" == "--delete" ]]; then
    rsync_delete=(--delete)
    shift
  fi
  local excludes=("$@")

  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --partial "${rsync_delete[@]}" "${excludes[@]}" "$src" "$dest"
    return
  fi

  echo "==> rsync absent — fallback tar+ssh vers ${dest#*:}"
  local remote="${dest%%:*}"
  local remote_path="${dest#*:}"
  local tar_ex=()
  for ex in "${excludes[@]}"; do
    if [[ "$ex" == --exclude=* ]]; then
      tar_ex+=(--exclude="${ex#--exclude=}")
    fi
  done

  if [[ ${#rsync_delete[@]} -gt 0 ]]; then
    ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "sudo rm -rf '$remote_path' && sudo mkdir -p '$remote_path'"
  else
    ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "sudo mkdir -p '$remote_path'"
  fi
  tar -C "${src%/}" -h -czf - "${tar_ex[@]}" . | ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "sudo tar -xzf - -C '$remote_path' --no-same-owner --no-same-permissions"
}

deploy_sync_menuswipe() {
  local local_dir="$1"
  local dest="$2"
  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --partial "$local_dir/" "$dest/"
  else
    echo "==> rsync absent — fallback tar+ssh vers ${dest#*:}"
    local remote="${dest%%:*}"
    local remote_path="${dest#*:}"
    ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "sudo mkdir -p '$remote_path'"
    tar -C "${local_dir%/}" -h -czf - . | ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "sudo tar -xzf - -C '$remote_path' --no-same-owner --no-same-permissions"
  fi
}
