# Planii — backend : déploiement sur ton VPS Hostinger (avec PostgreSQL)

Backend Node.js + Express, connecté à **PostgreSQL**. Le pilote `pg` est 100 % JavaScript : aucune compilation native. Les tables se créent automatiquement au premier démarrage.

VPS repéré : `srv1797721.hstgr.cloud` (`31.97.53.228`) · domaine `planii.app`.

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
Les tables seront créées automatiquement au démarrage du serveur.

## 2. Installer Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x
```

## 3. Envoyer et installer le backend

Depuis ton ordinateur (dossier `planii-backend`) :

```bash
scp -r ./planii-backend root@31.97.53.228:/opt/planii-backend
```

Sur le VPS :

```bash
cd /opt/planii-backend
npm install --omit=dev
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

## 5. Lancer en continu (PM2)

```bash
sudo npm install -g pm2
pm2 start server.js --name planii
pm2 save && pm2 startup
curl http://localhost:4000/api/health   # {"ok":true,"db":"postgres"}
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

Une fois l'API en ligne (`https://api.planii.app`), je branche l'application front Planii dessus (connexion, projets, invitations en temps réel).
