#!/usr/bin/env bash
# Déploiement Planii sur VPS Hostinger (Docker + Traefik)
# Usage : bash /root/deploy-planii.sh
# Variables optionnelles : PLANII_REPO=/opt/planii

set -euo pipefail

REPO="${PLANII_REPO:-/opt/planii}"
BACKEND="${REPO}/planii-backend"
FRONTEND="${REPO}/planii-vite"

log() { echo "[deploy-planii] $*"; }

if [ ! -d "${REPO}/.git" ]; then
  log "ERREUR : dépôt introuvable dans ${REPO}"
  log "Clonez d'abord : git clone https://github.com/BertonLutina/planii.git ${REPO}"
  exit 1
fi

log "Mise à jour du code…"
cd "${REPO}"
git fetch origin main
git reset --hard origin/main

log "Backend…"
cd "${BACKEND}"
docker compose build --pull
docker compose up -d

log "Frontend…"
cd "${FRONTEND}"
docker compose build --pull
docker compose up -d

log "Vérification…"
sleep 5
if ! curl -fsS http://localhost:4000/api/health; then
  log "ERREUR : le backend ne répond pas sur le port 4000"
  docker logs planii-api --tail 80 || true
  exit 1
fi
echo ""
docker ps --filter name=planii-
if ! docker ps --filter name=planii-api --filter status=running -q | grep -q .; then
  log "ERREUR : le conteneur planii-api n'est pas démarré"
  docker logs planii-api --tail 80 || true
  exit 1
fi
log "Terminé ✓"
log "Test public : curl https://api.planii.app/api/health"
