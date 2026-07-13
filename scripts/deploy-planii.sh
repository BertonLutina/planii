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
sleep 3
curl -fsS http://localhost:4000/api/health
echo ""
docker ps --filter name=planii-
log "Terminé ✓"
