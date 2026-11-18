/* Journal des versions de Planii — source unique de la page « Notes de version » ET du numéro de version affiché.

   RÈGLE : à chaque mise à jour, ajouter une entrée EN TÊTE de RELEASES, avec un nouveau numéro de version,
   puis aligner `version` dans planii-vite/package.json et planii-mobile/package.json + app.json.
   Une entrée = ce qui a été ajouté (added), modifié (changed) et corrigé (fixed).
   Ce fichier est dupliqué à l'identique dans planii-mobile/src/lib/releases.ts : le garder synchronisé.
   Langues : fr et en sont rédigées ; les autres langues affichent l'anglais. */

export type ReleaseKind = 'added' | 'changed' | 'fixed'
/** Sur quelle appli la modification s'applique ; absent = web et mobile. */
export type ReleaseTarget = 'web' | 'mobile'
export type ReleaseLang = 'fr' | 'en'
export type Localized = Record<ReleaseLang, string>
export type ReleaseItem = { kind: ReleaseKind; text: Localized; on?: ReleaseTarget }
export type Release = { version: string; date: string; title: Localized; items: ReleaseItem[] }

const a = (fr: string, en: string, on?: ReleaseTarget): ReleaseItem => ({ kind: 'added', text: { fr, en }, on })
const c = (fr: string, en: string, on?: ReleaseTarget): ReleaseItem => ({ kind: 'changed', text: { fr, en }, on })
const f = (fr: string, en: string, on?: ReleaseTarget): ReleaseItem => ({ kind: 'fixed', text: { fr, en }, on })

export const RELEASES: Release[] = [
  {
    version: '1.10.0', date: '2026-11-18',
    title: { fr: 'Connexion et inscription repensées', en: 'Redesigned sign in and sign up' },
    items: [
      c('Nouvelle page de connexion et d’inscription, dans l’univers de la page d’accueil : un discours à gauche, le formulaire à droite, onglets « Se connecter » / « Créer un compte », clair et sombre.', 'New sign in and sign up page, in the look of the home page: the pitch on the left, the form on the right, “Sign in” / “Sign up” tabs, light and dark.', 'web'),
      a('Œil pour afficher ou masquer le mot de passe, et jauge de solidité à l’inscription.', 'Eye button to show or hide the password, and a strength meter when signing up.', 'web'),
      c('Les quatre fournisseurs (Google, Microsoft, LinkedIn, Yahoo) s’affichent avec leur nom.', 'The four providers (Google, Microsoft, LinkedIn, Yahoo) now show their name.', 'web'),
    ],
  },
  {
    version: '1.9.1', date: '2026-11-18',
    title: { fr: 'Équipes visibles sans attendre le serveur', en: 'Teams visible without waiting for the server' },
    items: [
      f('Les cartes de projet affichent les avatars de l’équipe (initiales, trois au plus, puis « +N ») même quand le serveur n’envoie pas encore les photos : l’appli lit alors les membres de chaque projet.', 'Project cards show the team avatars (initials, three at most, then “+N”) even when the server does not send the photos yet: the app then reads each project’s members.', 'mobile'),
    ],
  },
  {
    version: '1.9.0', date: '2026-11-18',
    title: { fr: 'Accueil mobile repensé', en: 'Redesigned mobile Home' },
    items: [
      c('Accueil plus simple, comme sur le web : « Ta journée » avec ta prochaine tâche et un anneau de progression, la semaine, et des tuiles qui filtrent une seule liste de tâches.', 'Simpler Home, like the web: “Your day” with your next task and a progress ring, the week, and tiles that filter a single task list.', 'mobile'),
      c('Le statut d’une tâche se change depuis le menu « … » de sa ligne.', 'A task’s status is changed from the “…” menu on its row.', 'mobile'),
      a('« Mes projets » : l’avancement de chaque projet actif, à un appui de son ouverture.', '“My projects”: the progress of each active project, one tap from opening it.', 'mobile'),
      c('Couleurs et polices de la page projet, en clair et en sombre ; le score et les vues Tableau et Agenda restent disponibles.', 'Colours and fonts of the project page, in light and dark; the score and the Board and Agenda views are still there.', 'mobile'),
    ],
  },
  {
    version: '1.8.0', date: '2026-11-18',
    title: { fr: 'Écran Projets mobile repensé', en: 'Redesigned mobile Projects screen' },
    items: [
      c('Écran Projets plus simple, comme sur le web : recherche, onglets Actifs / Terminés, puces de libellés qui filtrent la liste et tri en un bouton.', 'Simpler Projects screen, like the web: search, Active / Done tabs, label chips that filter the list and a one-button sort.', 'mobile'),
      c('Nouvelles cartes de projet : icône teintée par le libellé, avancement en grand, échéance, pastille rouge quand la livraison est dépassée.', 'New project cards: label-tinted icon, large progress, due date, red badge when delivery is overdue.', 'mobile'),
      a('L’équipe apparaît en photos (ou initiales), trois au plus, puis une pastille « +N » qui compte les autres.', 'The team shows as photos (or initials), three at most, then a “+N” badge counting the others.', 'mobile'),
      a('Recherche d’un projet par son nom.', 'Search a project by name.', 'mobile'),
    ],
  },
  {
    version: '1.7.0', date: '2026-11-18',
    title: { fr: 'Équipes visibles sur les projets', en: 'Teams visible on projects' },
    items: [
      c('Les cartes de projet montrent les photos des membres (ou leurs initiales), trois au plus, puis une pastille « +N » qui compte les autres.', 'Project cards show member photos (or initials), three at most, then a “+N” badge counting the others.', 'web'),
    ],
  },
  {
    version: '1.6.0', date: '2026-11-18',
    title: { fr: 'Accueil repensé', en: 'Redesigned Home' },
    items: [
      c('Accueil plus simple : « Ta journée » avec ta prochaine tâche et un anneau de progression, une bande de la semaine, et des tuiles qui filtrent une seule liste de tâches.', 'Simpler Home: “Your day” with your next task and a progress ring, a week strip, and tiles that filter a single task list.', 'web'),
      c('Le statut d’une tâche se change depuis sa ligne (menu sur la pastille de statut), à la place de l’appui long avec glisser-déposer.', 'A task’s status is changed from its row (menu on the status pill), instead of long-press and drag.', 'web'),
      a('« Mes projets » : l’avancement de chaque projet actif, à un clic de son ouverture.', '“My projects”: the progress of each active project, one click from opening it.', 'web'),
      c('Les vues Tableau et Agenda de l’accueil et le score restent disponibles, avec les couleurs et les polices de la page projet, en clair et en sombre.', 'The Board and Agenda views of Home and the score are still there, with the colours and fonts of the project page, in light and dark.', 'web'),
    ],
  },
  {
    version: '1.5.0', date: '2026-11-18',
    title: { fr: 'Page Projets repensée', en: 'Redesigned Projects page' },
    items: [
      c('Page Projets plus simple : recherche, onglets Actifs / Terminés, puces de libellés qui filtrent la liste, tri et bascule cartes / tableau sur une seule barre.', 'Simpler Projects page: search, Active / Done tabs, label chips that filter the list, sort and cards / table switch on a single bar.', 'web'),
      c('Nouvelles cartes de projet : icône teintée par le libellé, avancement en grand, échéance, et une pastille rouge quand la livraison est dépassée.', 'New project cards: label-tinted icon, large progress, due date, and a red badge when delivery is overdue.', 'web'),
      a('Recherche d’un projet par son nom.', 'Search a project by name.', 'web'),
      c('Vue tableau remise au même style, clair et sombre.', 'Table view restyled to match, light and dark.', 'web'),
    ],
  },
  {
    version: '1.4.0', date: '2026-11-17',
    title: { fr: 'Écran projet mobile redessiné', en: 'Redesigned mobile project screen' },
    items: [
      c('Écran projet redessiné comme sur le web : en-tête compact avec barre de progression et pastille de retard, pastilles de statut et de personnes qui défilent, tâches groupées par statut (statuts vides masqués).', 'Project screen redesigned like the web: compact header with progress bar and late badge, scrolling status and people pills, tasks grouped by status (empty statuses hidden).', 'mobile'),
      c('Nouvelles cartes de tâche : pastille de statut, priorité, titre, échéance, avatar du responsable, et recherche, filtre de statut et tri en haut de la liste.', 'New task cards: status pill, priority, title, due date, assignee avatar, with search, status filter and sort above the list.', 'mobile'),
      a('Un trombone avec le nombre de fichiers apparaît sur les tâches qui en contiennent.', 'A paperclip with the file count shows on tasks that have files.', 'mobile'),
      a('Bouton flottant « + » avec le micro et l’import au-dessus, et barre d’onglets du projet en bas de l’écran.', 'Floating “+” button with the microphone and import above it, and a project tab bar at the bottom of the screen.', 'mobile'),
      a('« Nouvelle tâche » s’ouvre en feuille du bas : titre, description, photos et fichiers, responsable, statut, priorité, type, échéance et heures.', '“New task” opens as a bottom sheet: title, description, photos and files, assignee, status, priority, type, due date and hours.', 'mobile'),
      f('Thème sombre : les champs de formulaire suivent la couleur du thème au lieu d’être plus foncés que leur feuille.', 'Dark theme: form fields now follow the theme colour instead of being darker than their sheet.', 'mobile'),
    ],
  },
  {
    version: '1.3.0', date: '2026-11-17',
    title: { fr: 'Page projet redessinée', en: 'Redesigned project page' },
    items: [
      a('« Nouvelle tâche » s’ouvre dans une fenêtre, avec l’ajout de photos et de fichiers par glisser-déposer.', '“New task” opens in a dialog, with photo and file upload by drag and drop.', 'web'),
      a('Un trombone avec le nombre de fichiers apparaît sur les tâches qui en contiennent (tableau, grille, colonnes).', 'A paperclip with the file count shows on tasks that have files (table, grid, columns).', 'web'),
      a('Nouvelle vue « Tableau » : tâches groupées par statut, statuts vides masqués, avec recherche, filtre par statut et tri.', 'New “Table” view: tasks grouped by status, empty statuses hidden, with search, status filter and sort.', 'web'),
      c('Page projet redessinée : en-tête compact avec anneau de progression, filtres par personne en pastilles, colonnes vides repliées. Sur téléphone : barre d’onglets en bas et boutons flottants.', 'Redesigned project page: compact header with a progress ring, people filters as pills, empty columns collapsed. On phones: bottom tab bar and floating buttons.', 'web'),
      c('Un clic sur une tâche ouvre « Modifier la tâche » (fichiers, commentaires, historique).', 'Clicking a task opens “Edit the task” (files, comments, history).', 'web'),
      f('Thème sombre : les champs de formulaire suivent la couleur du thème au lieu d’être plus foncés que leur fenêtre.', 'Dark theme: form fields now follow the theme colour instead of being darker than their dialog.', 'web'),
    ],
  },
  {
    version: '1.2.0', date: '2026-11-17',
    title: { fr: 'Connecteur IA, pièces jointes et notes de version', en: 'AI connector, attachments and release notes' },
    items: [
      a('Connecteur MCP : pilotez vos projets, tâches et rendez-vous depuis Claude, ChatGPT ou Gemini, avec un accès que vous autorisez et pouvez révoquer.', 'MCP connector: drive your projects, tasks and appointments from Claude, ChatGPT or Gemini, with access you grant and can revoke.'),
      a('Pièces jointes sur les tâches.', 'File attachments on tasks.'),
      a('Verrouillage biométrique (Face ID / empreinte) pour ouvrir l’application.', 'Biometric lock (Face ID / fingerprint) to open the app.', 'mobile'),
      a('Page « Notes de version » avec le numéro de version et un bouton de vérification des mises à jour.', '“Release notes” page with the version number and an update check button.'),
    ],
  },
  {
    version: '1.1.0', date: '2026-11-13',
    title: { fr: 'Appels vidéo de projet', en: 'Project video calls' },
    items: [
      a('Visioconférence de projet (LiveKit) avec caméra et micro.', 'Project video calls (LiveKit) with camera and microphone.'),
      c('Depuis l’accueil du mobile, ouvrez directement une tâche.', 'From the mobile home, open a task directly.', 'mobile'),
    ],
  },
  {
    version: '1.0.4', date: '2026-10-24',
    title: { fr: 'Réinitialisation du mot de passe renforcée', en: 'Hardened password reset' },
    items: [
      c('Réinitialisation du mot de passe plus sûre : délai d’attente par compte et alerte e-mail lors d’un changement.', 'Safer password reset: per-account cooldown and an email alert when the password changes.'),
      f('Les e-mails de réinitialisation sont envoyés en arrière-plan, sans ralentir la page.', 'Reset emails are now sent in the background without slowing the page.'),
    ],
  },
  {
    version: '1.0.3', date: '2026-09-21',
    title: { fr: 'Mot de passe oublié et accessibilité', en: 'Forgot password and accessibility' },
    items: [
      a('« Mot de passe oublié » par e-mail, sur le web et sur mobile.', '“Forgot password” by email, on web and mobile.'),
      c('Accessibilité web (WCAG 2.2 AA) : libellés des fenêtres traduits, contrastes corrigés.', 'Web accessibility (WCAG 2.2 AA): translated dialog labels, contrast fixes.', 'web'),
      f('L’application web ne garde plus de données privées de l’API en cache.', 'The web app no longer caches private API data.', 'web'),
    ],
  },
  {
    version: '1.0.2', date: '2026-08-17',
    title: { fr: 'L’application mobile arrive', en: 'The mobile app arrives' },
    items: [
      a('Application mobile Planii (iOS et Android) : accueil, projets, agenda, classement et profil.', 'Planii mobile app (iOS and Android): home, projects, agenda, leaderboard and profile.', 'mobile'),
    ],
  },
  {
    version: '1.0.1', date: '2026-07-26',
    title: { fr: 'Connexion sociale, photos et import', en: 'Social sign-in, photos and import' },
    items: [
      a('Connexion avec Google, Microsoft, LinkedIn et Yahoo.', 'Sign in with Google, Microsoft, LinkedIn and Yahoo.'),
      a('Photos de profil pour les utilisateurs et les projets.', 'Profile pictures for users and projects.'),
      a('Import de tâches depuis un tableur, avec création en masse.', 'Spreadsheet task import with bulk creation.'),
      a('Préférences de notifications e-mail par type, dans le profil.', 'Per-type email notification preferences in the profile.'),
      c('Nouvel écran de connexion : fond flou, panneau « verre » et thème clair/sombre selon l’heure.', 'New sign-in screen: blurred background, glass panel and a light/dark theme by time of day.'),
      c('La dictée et la lecture vocale utilisent la langue de l’application.', 'Speech recognition and read-aloud use the app language.'),
    ],
  },
  {
    version: '1.0.0', date: '2026-07-20',
    title: { fr: 'Planii en 9 langues', en: 'Planii in 9 languages' },
    items: [
      a('Application traduite en 9 langues : français, anglais, néerlandais, espagnol, portugais, italien, grec, russe et swahili.', 'App translated into 9 languages: French, English, Dutch, Spanish, Portuguese, Italian, Greek, Russian and Swahili.'),
      a('E-mails envoyés dans la langue de chaque destinataire.', 'Emails sent in each recipient’s language.'),
      a('Bouton agrandir/réduire sur toutes les fenêtres.', 'Expand/collapse button on every dialog.', 'web'),
      c('Le bouton « + Nouveau » de l’accueil crée désormais un projet.', 'The home “+ New” button now creates a project.', 'web'),
      f('Fenêtre agrandie : elle s’élargit enfin vraiment.', 'Expanded dialog: it now really gets wider.', 'web'),
      f('Plantage de l’accueil corrigé (erreur React #310).', 'Fixed a crash on the home screen (React error #310).', 'web'),
    ],
  },
  {
    version: '0.9.0', date: '2026-07-16',
    title: { fr: 'Refonte 2026 et sécurité', en: '2026 redesign and security' },
    items: [
      c('Refonte visuelle : palette indigo-violet, icônes unifiées, mode clair retravaillé, système de design.', 'Visual redesign: indigo-violet palette, unified icons, refined light mode, design system.'),
      c('Projets : nouvelles cartes et vue Tableau.', 'Projects: new cards and a Table view.'),
      a('Guide contextuel : bouton d’aide par page et visite interactive.', 'Contextual guide: a help button on each page and an interactive tour.'),
      a('Bouton « + » du mobile adapté à la page (projet, rendez-vous ou tâche).', 'Mobile “+” button adapted to the page (project, appointment or task).', 'mobile'),
      a('Page publique Politique de confidentialité (RGPD).', 'Public Privacy Policy page (GDPR).'),
      c('Profil : informations en lecture seule avec un bouton « Modifier ».', 'Profile: read-only details with an “Edit” button.'),
      c('Sécurité renforcée : en-têtes de protection, accès restreints aux domaines Planii, validation systématique des données.', 'Stronger security: protective headers, access limited to Planii domains, systematic input validation.'),
      f('L’application ne se fige plus en usage normal (limite de requêtes mieux réglée).', 'The app no longer freezes in normal use (request limit tuned).'),
      f('Double cloche sur mobile corrigée.', 'Fixed the duplicated bell on mobile.', 'web'),
    ],
  },
  {
    version: '0.8.0', date: '2026-07-13',
    title: { fr: 'Rendez-vous', en: 'Appointments' },
    items: [
      a('Rendez-vous dans l’agenda.', 'Appointments in the agenda.'),
      f('Erreur 500 sur les projets, l’agenda et l’administration (comparaison de dates) corrigée.', 'Fixed a 500 error on projects, agenda and admin (date comparison).'),
    ],
  },
  {
    version: '0.5.0', date: '2026-07-09',
    title: { fr: 'Les fondations', en: 'The foundations' },
    items: [
      a('Espace administrateur : statistiques, utilisateurs, projets, tâches, journal d’audit et rôles.', 'Admin area: statistics, users, projects, tasks, audit log and roles.'),
      a('Rôles de projet, types de tâches personnalisables et bibliothèque de rôles.', 'Project roles, customizable task types and a role library.'),
      a('Dictée vocale dans tous les champs et assistant vocal de création de tâche.', 'Voice dictation in every field and a guided voice assistant to create tasks.'),
      a('Notifications par e-mail et en temps réel.', 'Email and real-time notifications.'),
      a('Tri, regroupement par personne et glisser-déposer persistant.', 'Sorting, grouping by person and persistent drag-and-drop.'),
      a('Agenda : vue Année et mois plus lisible.', 'Agenda: Year view and a clearer month view.'),
      f('Message d’erreur de suppression de tâche corrigé.', 'Fixed the task deletion error message.'),
    ],
  },
]

export const APP_VERSION = RELEASES[0].version

/** Texte dans la langue demandée ; repli sur l’anglais pour les langues non rédigées. */
export function pick(text: Localized, lang: string): string {
  return (text as Record<string, string>)[lang] ?? text.en
}
