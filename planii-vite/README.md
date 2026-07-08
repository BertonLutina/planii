# Planii — front (Vite + React + TypeScript + TailwindCSS)

Interface de la plateforme Planii, connectée au backend `https://api.planii.app`.

## Stack

- **Vite** (build & dev server)
- **React 18** + **TypeScript**
- **TailwindCSS** (config avec les couleurs Planii dans `tailwind.config.js`)
- **date-fns** (utilisé par le composant `components/ui/github-calendar`)
- Alias d'import `@` → `src/`

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build de production

```bash
npm run build      # typecheck (tsc) + build Vite → dossier dist/
npm run preview    # sert le dist/ localement pour vérifier
```

Le dossier `dist/` (statique) se déploie sur n'importe quel hébergement statique
ou en conteneur derrière Traefik (ex. `planii.app`).

## Configuration

L'URL de l'API est configurable via une variable d'environnement Vite.
Par défaut : `https://api.planii.app/api`.

Créez un fichier `.env` si besoin :

```
VITE_API_URL=https://api.planii.app/api
```

## Structure

```
src/
  main.tsx              point d'entrée
  App.tsx               racine + Shell + Profil
  index.css             Tailwind (base/components/utilities) + tokens & styles Planii
  lib/
    api.ts              client API + gestion du token
    types.ts            types TypeScript (User, Project, Task, Poll…)
    dates.ts            utilitaires de dates + libellés
    ui.tsx              Toaster, Avatar, Modal, helpers
  components/
    Auth.tsx            connexion / inscription
    Projects.tsx        liste, création, rejoindre (invitation)
    ProjectDetail.tsx   tâches, membres, sondages, activité
    Calendar.tsx        vues Mois / Semaine / Agenda / Année
    Meeting.tsx         visio Jitsi
    ui/
      github-calendar.tsx   heatmap type GitHub (Tailwind + date-fns)
```

## Ajouter des composants shadcn/ui (optionnel)

Le projet suit la convention shadcn (`components/ui`, alias `@`). Pour brancher
la CLI shadcn et installer des composants prêts à l'emploi :

```bash
npx shadcn@latest init          # génère components.json
npx shadcn@latest add button    # exemple — atterrit dans src/components/ui
```

C'est important que les composants shadcn aillent dans `src/components/ui` :
c'est le dossier attendu par la CLI et par les imports `@/components/ui/...`.

## PWA & mobile

L'app est une **PWA installable** (via `vite-plugin-pwa`) :

- Manifeste + service worker générés au build (`npm run build`).
- Installable sur **iPhone** (Safari → Partager → « Sur l'écran d'accueil ») et
  **Android** (Chrome → menu → « Installer l'application »).
- Fonctionne hors-ligne pour l'interface ; les données passent par l'API quand
  le réseau est là (stratégie *network-first* avec repli sur cache).

Côté **responsive** : safe-area (encoche iPhone), zones tactiles ≥ 42px,
modales en bas d'écran sur mobile, champs en 16px (pas de zoom auto iOS),
onglets défilables, aucun débordement horizontal.

> Note : le service worker n'est actif qu'en **build de production**
> (`npm run build` puis `npm run preview`), pas en `npm run dev`.
