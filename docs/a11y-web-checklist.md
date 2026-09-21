# Checklist accessibilité web (WCAG 2.2 AA) — PLANI-013

À reprendre dans **chaque ticket UI web**. Les tests automatisés (`npm run test:e2e` dans `planii-vite`) ne remplacent pas la revue manuelle : ils détectent une partie seulement des défauts. Ce document ne vaut pas déclaration de conformité (un audit indépendant et un avis juridique EAA restent nécessaires).

## Automatisé (`planii-vite/e2e/a11y.spec.ts`)
- axe-core (tags `wcag2a/aa`, `wcag21a/aa`, `wcag22aa`) sur : accueil/auth, Accueil, Projets, Agenda, Classement, Profil (clair **et** sombre), détail projet, menu d'actions d'une tâche, tiroir de tâche, palette de commandes, dialogue « Nouveau projet ».
- Garde anti-faux-positif : un écran qui plante (erreur JS) ou reste vide fait échouer le scan.
- Dialogues : focus déplacé à l'ouverture, Tab / Maj+Tab piégés (25 tours), Échap ferme, focus rendu à l'élément d'origine.
- `prefers-reduced-motion` : transitions/animations neutralisées.

## Règles de code
- **Contraste texte ≥ 4,5:1** : sur fond teinté, utiliser `--accent-on`, `--warn-on`, `--ok-on`, `--blue-on`, `--danger-on` (jamais `--accent`/`--warn`/`--ok` pour du texte). `--hint`/`--muted` ne servent qu'au texte secondaire lisible (≥ 4,5:1 vérifié en clair et sombre).
- **Ne pas atténuer du texte avec `opacity`** (préférer un jeton de couleur conforme).
- **Modale / tiroir / palette** : utiliser `Modal` (`lib/ui.tsx`) ou le hook `useDialog` (`lib/useDialog.ts`) + `role="dialog"`, `aria-modal="true"`, nom accessible.
- **Champs** : `<label htmlFor>` explicite pour les nouveaux formulaires. Le modèle historique `.field > label + contrôle` est relié automatiquement par `lib/a11yFields.ts` (solution transitoire ; cible : un composant `Field`).
- **Statuts et priorités** : toujours un intitulé texte (ex. « À faire », « P1 ») ; la couleur ne fait que renforcer.
- **Glisser-déposer** : prévoir une alternative sans glisser. Tâche vers un autre statut : action « Déplacer vers … » du menu ⋯ (et vue Grille). Cartes projet (tri manuel) : boutons monter/descendre.
- **Superpositions** : `Modal` passe par un portail (`document.body`) pour ne pas rester piégé dans le contexte d'empilement d'un parent collant (barre d'app, nav basse).
- **Iframes tierces** (Jitsi) : toujours leur donner un `title`.
- **Zones défilantes** (ex. tuiles « Aujourd'hui » sur mobile) : `tabIndex={0}` + nom accessible.
- **Messages d'état** : passer par `toast()` / `toastErr()` (région `aria-live` toujours montée) ; ne pas créer d'autre toast visuel sans annonce.
- **Voix (micro)** : optionnelle ; la saisie clavier reste toujours disponible.
- **Focus visible** : `:focus-visible` global (2px, `--accent`) ; `scroll-padding` évite qu'un élément focalisé passe sous une barre fixe.
- **Mouvement** : respecter `prefers-reduced-motion` (règle globale dans `index.css`).
- **Cibles** : ≥ 24×24 px (critère 2.5.8) ; ≥ 44 px sur écrans tactiles (déjà en place).

## Revue manuelle à consigner avant livraison
Pour chaque parcours ci-dessous, clavier seul puis lecteur d'écran (VoiceOver + Safari, NVDA + Firefox) :
1. **Auth** : accéder à la connexion, saisir e-mail/mot de passe, soumettre, lire l'erreur ; parcours « mot de passe oublié ».
2. **Projets** : ouvrir la liste, créer un projet (dialogue), ouvrir un projet, revenir.
3. **Agenda** : naviguer dans le calendrier, ouvrir un événement, créer un rendez-vous.
4. **Tâche** : créer, ouvrir le tiroir, cocher, changer le statut via ⋯, commenter.
5. **Import** : assistant d'import de tâches, du choix du fichier à la confirmation.
Vérifier : ordre de tabulation logique, focus jamais masqué, annonces des changements (toasts, erreurs), nom/rôle/état de chaque contrôle, zoom 200 %, mouvement réduit.

## Écarts connus (à traiter)
- **Revue manuelle lecteur d'écran** non réalisée à ce jour (voir liste ci-dessus).
- Écrans non couverts par axe : assistant de rendez-vous, création de sondage, écran de reset de mot de passe (chantier en cours), guide/visite.
- Contenu de l'iframe Jitsi (tiers) : hors périmètre de nos tests (l'iframe est simulée) ; seul son `title` est vérifié.
