# Planii Vague 1 - Vers 9/10

Date: 2026-07-10

## Objectif

Faire passer Planii d'une application riche en fonctionnalites a une plateforme plus professionnelle, claire et fiable. Cette vague doit ameliorer ce que l'utilisateur voit tous les jours, renforcer la collaboration autour des taches, et proteger les donnees clients dans l'espace administrateur.

La vague couvre quatre blocs:

- Dashboard Aujourd'hui
- Commentaires par tache
- Historique clair par tache
- Confidentialite admin avec donnees anonymisees

## Principes Produit

1. L'utilisateur doit ouvrir Planii et comprendre immediatement quoi faire.
2. Une tache doit devenir un espace de travail, pas seulement une ligne dans une liste.
3. Chaque action importante doit etre tracable.
4. L'administrateur pilote la plateforme sans lire les donnees privees des clients.
5. L'interface doit rester simple: les details avances vivent dans les panneaux ou vues secondaires.

## Dashboard Aujourd'hui

### But

Remplacer l'accueil trop general par une vue quotidienne forte. Elle doit donner une priorite claire a l'utilisateur.

### Sections

- A faire aujourd'hui: taches assignees a l'utilisateur avec echeance aujourd'hui.
- En retard: taches non terminees dont l'echeance est depassee.
- Priorites fortes: taches P1/P2 encore ouvertes.
- Transferees: taches transferees vers ou depuis l'utilisateur.
- A valider / en revue: taches dans le statut `review` ou equivalent.
- Discussions actives: projets ou meetings avec activite recente.

### Carte de tache compacte

Chaque carte doit afficher:

- titre de la tache
- projet
- priorite
- statut
- echeance
- responsable
- indicateur transfert si necessaire

La carte ouvre le projet et, si possible, la tache ciblee.

### Comportement mobile

Sur mobile, les sections deviennent des blocs empiles. Les cartes restent compactes, avec une seule action principale: ouvrir la tache.

## Commentaires Par Tache

### But

Permettre une vraie conversation autour d'une tache sans melanger cela avec le chat meeting.

### Fonctionnalites

- Ajouter un commentaire sur une tache.
- Voir la liste des commentaires avec auteur, date et contenu.
- Supprimer son propre commentaire si besoin.
- Les chefs de projet peuvent moderer les commentaires.
- Le responsable et le createur de la tache recoivent une notification quand un commentaire est ajoute par quelqu'un d'autre.

### Placement UI

Les commentaires doivent etre dans le detail de tache ou la modale de tache, pas directement dans la liste principale. La liste principale garde seulement un compteur de commentaires.

### Donnees

Nouvelle table `task_comments`:

- id
- task_id
- project_id
- user_id
- body
- created_at
- deleted_at nullable

## Historique Clair Par Tache

### But

Donner une timeline lisible de tout ce qui s'est passe sur une tache.

### Evenements a tracer

- creation de tache
- changement de titre, description, type, echeance ou priorite
- assignation ou changement de responsable
- changement de statut
- transfert de tache
- relance envoyee
- commentaire ajoute
- tache terminee
- tache rouverte
- suppression logique si elle existe plus tard

### Placement UI

Dans le detail de tache, ajouter un onglet ou une section `Historique`. Le format doit etre une timeline compacte:

- icone ou pastille
- action
- auteur
- date
- detail court

### Donnees

Nouvelle table `task_events`:

- id
- task_id
- project_id
- actor_id
- type
- payload JSON
- created_at

Les anciens logs `activity` restent utiles pour le projet, mais `task_events` devient la source precise pour l'historique d'une tache.

## Confidentialite Admin

### But

L'administrateur doit pouvoir surveiller la plateforme sans lire les donnees clients.

### Regle Generale

Les routes admin ne doivent jamais retourner de contenu sensible brut, sauf route explicitement super-admin technique et justifiee. Par defaut, l'admin voit des donnees anonymisees.

### Donnees masquees

- Nom projet: `Projet #1042`
- Titre de tache: `Tache anonymisee`
- Description/commentaire/message: `[masque]`
- Nom utilisateur: `Utilisateur #58`
- Email: masque partiel, par exemple `b***@gmail.com`
- Pieces jointes futures: nom et contenu masques

### Donnees visibles

- compteurs
- dates
- statuts
- roles generiques
- volumes d'activite
- etat du systeme
- statistiques globales

### Routes concernees

- `GET /api/admin/projects`
- `GET /api/admin/tasks`
- futures routes admin de commentaires, fichiers, meetings ou activites

### UI Admin

Les cartes admin affichent des donnees anonymisees par defaut. Un petit badge `Donnees anonymisees` doit rendre la regle explicite.

## Permissions

### Dashboard Aujourd'hui

Un utilisateur voit seulement les projets dont il est membre et les taches accessibles selon son role.

### Commentaires

Tout membre du projet peut commenter une tache visible.
Le createur du commentaire peut supprimer son commentaire.
Le chef/proprietaire peut moderer.

### Historique

Tout membre du projet peut voir l'historique des taches du projet.
Les clients pourront etre limites plus tard avec le mode client.

### Admin

Admin normal: donnees anonymisees.
Super-admin: garde les droits techniques existants, mais les nouvelles vues produit restent anonymisees par defaut.

## Notifications

Ajouter notifications internes pour:

- commentaire ajoute sur une tache dont je suis responsable
- commentaire ajoute sur une tache que j'ai creee
- tache transferee
- tache relancee

Les mails ne doivent etre ajoutes que pour les evenements importants afin d'eviter trop de bruit. Pour cette vague, les commentaires peuvent commencer par notification interne uniquement.

## API Proposee

### Dashboard

`GET /api/today`

Retourne:

- dueToday
- overdue
- highPriority
- transferred
- review
- activeDiscussions

### Commentaires

`GET /api/tasks/:id/comments`

`POST /api/tasks/:id/comments`

`DELETE /api/task-comments/:id`

### Historique

`GET /api/tasks/:id/events`

Les mutations de tache creent des evenements via une fonction serveur commune.

## Frontend Propose

Composants nouveaux ou ajustes:

- `TodayDashboard`
- `TaskComments`
- `TaskTimeline`
- extension de `TaskDrawer` ou de la modale de tache existante
- ajustement de `Home`
- ajustement de `Admin`

Le dashboard doit reutiliser les cartes et styles actuels, mais avec une hierarchie plus nette.

## Tests Et Verification

### Backend

- verifier que `/api/today` ne retourne que les donnees de l'utilisateur connecte
- verifier creation/suppression commentaires
- verifier creation d'evenements lors des mutations principales
- verifier anonymisation admin

### Frontend

- build TypeScript
- affichage desktop
- affichage mobile
- etats vides
- commentaires longs
- taches sans responsable

### Verification manuelle

- creer une tache
- commenter
- changer le statut
- transferer
- relancer
- verifier timeline
- verifier dashboard
- verifier admin anonymise

## Hors Scope De Cette Vague

- pieces jointes
- templates de projet
- recherche globale avancee
- mode client complet
- analytics projet detaillees
- permissions fines completes
- refonte mobile/PWA complete

Ces sujets appartiennent aux vagues suivantes.

## Definition De Termine

La vague est terminee quand:

- le dashboard Aujourd'hui est utilisable sur desktop et mobile
- les commentaires de tache fonctionnent
- l'historique de tache affiche les actions principales
- les routes admin ne montrent plus les donnees sensibles brutes
- le build frontend passe
- le backend passe une verification syntaxique
- les etats vides sont propres
