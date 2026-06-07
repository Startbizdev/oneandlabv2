#!/bin/bash
# Sync local → remote : rsync si dispo, sinon tar|ssh (Git Bash Windows sans rsync).

deploy_sync_dir() {
  local src="$1"
  local dest="$2"
  shift 2
  local excludes=("$@")

  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --partial "${excludes[@]}" "$src" "$dest"
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

  ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "mkdir -p '$remote_path'"
  tar -C "${src%/}" -czf - "${tar_ex[@]}" . | ssh "${DEPLOY_SSH_OPTS[@]}" "$remote" "tar -xzf - -C '$remote_path'"
}

deploy_sync_menuswipe() {
  local local_dir="$1"
  local dest="$2"
  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --partial "$local_dir/" "$dest/"
  else
    echo "==> rsync absent — fallback scp vers ${dest#*:}"
    ssh "${DEPLOY_SSH_OPTS[@]}" "${dest%%:*}" "mkdir -p '${dest#*:}'"
    scp "${DEPLOY_SSH_OPTS[@]}" -r "$local_dir/." "$dest/"
  fi
}
