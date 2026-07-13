# Planii — backend : déploiement sur ton VPS Hostinger (avec PostgreSQL)

Backend **TypeScript + Express + PostgreSQL**. Architecture modulaire (`src/`), migrations SQL versionnées, tests Vitest.

VPS repéré : `srv1797721.hstgr.cloud` (`31.97.53.228`) · domaine `planii.app`.

## Architecture MVC

```
src/
  models/        M — accès données (SQL, types)
  views/         V — sérialisation JSON (réponses API)
  controllers/   C — couche HTTP fine (req → service → res)
  services/      logique métier (règles, orchestration)
  routes/        câblage Express uniquement
  middleware/    auth, rate limit, erreurs
  core/          HttpError
```

## Ce que fait le backend

- Comptes (inscription / connexion, mot de passe haché + jeton JWT)
- 3 types de projet : `solo` (1 prestataire + 1 client), `team` (1 client + plusieurs prestataires avec un leader), `group` (communauté, famille, amis…)
- Liens d'invitation avec rôle intégré + expiration (lien « client » à usage unique, lien « collègue/membre » réutilisable)
- Tâches, tâches « à prendre », règle : seul le responsable d'une tâche peut la cocher
- Sondages / votes, fil d'activité

---

## 1. Préparer la base PostgreSQL

Sur le VPS, crée une base et un utilisateur dédiés (si Postgres tourne en Docker, entre d'abord dans le conteneur ou utilise son `psql`) :

```sql
CREATE DATABASE planii;
CREATE USER planii WITH PASSWORD 'un-mot-de-passe-solide';
GRANT ALL PRIVILEGES ON DATABASE planii TO planii;
```

Note la chaîne de connexion : `postgres://planii:un-mot-de-passe-solide@localhost:5432/planii`.
Les migrations s'appliquent automatiquement au démarrage (`npm run migrate` ou `npm start`).

## 2. Installer Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x
```

## 3. Envoyer et installer le backend

### Option A — Docker + Traefik (recommandé sur ton VPS)

Le `docker-compose.yml` expose l’API sur `https://api.planii.app` via Traefik.

```bash
# Depuis ton Mac, envoie le dossier backend
scp -r ./planii-backend root@31.97.53.228:/opt/planii-backend

# Sur le VPS
cd /opt/planii-backend
cp .env.example .env && nano .env   # DATABASE_URL, JWT_SECRET, SMTP_PASS…
docker compose build --no-cache
docker compose up -d
docker logs planii-api --tail 50
curl http://localhost:4000/api/health   # {"ok":true,"db":"postgres"}
```

Les migrations SQL (`migrations/`) s’appliquent **automatiquement** au démarrage du conteneur.

### Option B — Node.js + PM2 (sans Docker)

Depuis ton ordinateur (dossier `planii-backend`) :

```bash
scp -r ./planii-backend root@31.97.53.228:/opt/planii-backend
```

Sur le VPS :

```bash
cd /opt/planii-backend
npm ci
npm run build
```

En production, seules les dépendances runtime sont nécessaires après build :

```bash
npm ci --omit=dev
npm run build
```

## 4. Configurer

```bash
cp .env.example .env
nano .env
```

- `DATABASE_URL` : la chaîne de connexion de l'étape 1.
- `PGSSL` : `false` si Postgres est sur le même VPS ; `true` si base distante/managée.
- `JWT_SECRET` : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `APP_URL` : `https://planii.app` (sert aux liens d'invitation).
- `CORS_ORIGINS` : `https://planii.app` (ou plusieurs origines séparées par des virgules).

## 5. Lancer en continu (PM2)

```bash
sudo npm install -g pm2
npm run build
pm2 start npm --name planii -- start
pm2 save && pm2 startup
curl http://localhost:4000/api/health   # {"ok":true,"db":"postgres"}
```

Développement local :

```bash
npm run dev          # rechargement auto (tsx)
npm test             # tests (PostgreSQL planii_test requis)
npm run migrate      # migrations seules
```

## 6. Exposer en HTTPS (Nginx + Certbot)

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/planii
```

```nginx
server {
    server_name api.planii.app;
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/planii /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.planii.app
```

Crée un enregistrement DNS `A` pour `api.planii.app` → `31.97.53.228`.

---

## Sauvegardes

```bash
pg_dump -U planii planii > sauvegarde-planii-$(date +%F).sql
```

## Commandes utiles

```bash
pm2 logs planii      # logs
pm2 restart planii   # après mise à jour
```

## Étape suivante

Une fois l'API en ligne (`https://api.planii.app`), le front Planii s'y connecte automatiquement.

---

## Déploiement via GitHub (recommandé)

### Script serveur : `/root/deploy-planii.sh`

Sur le VPS, le déploiement se fait avec :

```bash
bash /root/deploy-planii.sh
```

Le script versionné se trouve dans le dépôt : `scripts/deploy-planii.sh`.
Installez-le une fois sur le serveur :

```bash
cp /opt/planii/scripts/deploy-planii.sh /root/deploy-planii.sh
chmod +x /root/deploy-planii.sh
```

Ou faites pointer votre script existant vers le dépôt :

```bash
cat > /root/deploy-planii.sh <<'EOF'
#!/usr/bin/env bash
exec bash /opt/planii/scripts/deploy-planii.sh
EOF
chmod +x /root/deploy-planii.sh
```

### Déploiement manuel

```bash
git push origin main          # depuis votre Mac
ssh root@31.97.53.228
bash /root/deploy-planii.sh
```

### Déploiement automatique (GitHub Actions)

Le workflow `.github/workflows/deploy.yml` exécute `bash /root/deploy-planii.sh` sur le VPS
à chaque push sur `main`.

#### Secrets GitHub (Settings → Secrets → Actions)

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `31.97.53.228` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | clé privée SSH |

```bash
ssh-keygen -t ed25519 -C "github-deploy-planii" -f ~/.ssh/planii_deploy -N ""
ssh-copy-id -i ~/.ssh/planii_deploy.pub root@31.97.53.228
# Contenu de ~/.ssh/planii_deploy → secret VPS_SSH_KEY
```

#### Première installation sur le VPS

```bash
ssh root@31.97.53.228
cd /opt
git clone https://github.com/BertonLutina/planii.git planii
cd planii/planii-backend && cp .env.example .env && nano .env
cp ../scripts/deploy-planii.sh /root/deploy-planii.sh && chmod +x /root/deploy-planii.sh
bash /root/deploy-planii.sh
```

Vérification :

```bash
curl https://api.planii.app/api/health
```
