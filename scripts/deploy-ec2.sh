#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "docker-compose.yml" ]; then
  echo "Run this from the project root (docker-compose.yml not found)."
  exit 1
fi

SUDO=""
if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  $SUDO apt-get update
  $SUDO apt-get install -y docker.io docker-compose-plugin
  $SUDO systemctl enable --now docker

  if [ -n "$SUDO" ]; then
    $SUDO usermod -aG docker "$USER" || true
  fi
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not available."
  exit 1
fi

echo "Building and starting containers..."
$SUDO docker compose up -d --build

PUBLIC_IP=""
if command -v curl >/dev/null 2>&1; then
  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || true)
fi

echo "Deployment complete."
if [ -n "$PUBLIC_IP" ]; then
  echo "Open: http://$PUBLIC_IP"
fi
