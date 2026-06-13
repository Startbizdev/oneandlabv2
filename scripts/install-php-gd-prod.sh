#!/bin/bash
set -euo pipefail
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

echo "==> Installation PHP GD sur prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php8.2-gd && sudo systemctl restart php8.2-fpm && php -m | grep -i gd"

echo "✅ PHP GD installé."
