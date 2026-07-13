#!/usr/bin/env bash
# Déploiement Planii sur VPS Hostinger (Docker + Traefik)
# Usage : bash /root/deploy-planii.sh
# Variables optionnelles : PLANII_REPO=/root/planii

set -euo pipefail

REPO="${PLANII_REPO:-/root/planii}"
BACKEND="${REPO}/planii-backend"
FRONTEND="${REPO}/planii-vite"

log() { echo "==> $*"; }

if [ ! -d "${REPO}/.git" ]; then
  log "ERREUR : dépôt introuvable dans ${REPO}"
  exit 1
fi

log "Mise à jour du code…"
cd "${REPO}"
git fetch origin main
git reset --hard origin/main

log "Backend…"
cd "${BACKEND}"
docker compose build --no-cache --pull
docker compose up -d --force-recreate

log "Frontend…"
cd "${FRONTEND}"
docker compose build --no-cache --pull
docker compose up -d --force-recreate

log "Vérification backend…"
sleep 5
if ! curl -fsS http://localhost:4000/api/health; then
  log "ERREUR backend"
  docker logs planii-api --tail 80 || true
  exit 1
fi
echo ""

log "Vérification frontend…"
if ! docker ps --filter name=planii-web --filter status=running -q | grep -q .; then
  log "ERREUR : planii-web n'est pas démarré"
  docker logs planii-web --tail 80 || true
  exit 1
fi
if ! docker exec planii-web wget -qO- http://localhost:80/ | grep -q "<html"; then
  log "ERREUR : nginx ne sert pas le front"
  docker logs planii-web --tail 80 || true
  exit 1
fi

docker ps --filter name=planii-
log "DONE"
log "Tests publics :"
log "  curl -I https://planii.app"
log "  curl https://api.planii.app/api/health"
