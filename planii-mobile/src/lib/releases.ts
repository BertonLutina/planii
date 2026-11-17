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
