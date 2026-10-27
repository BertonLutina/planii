# Veille quotidienne Planii — 22 septembre 2026

**Périmètre.** Application collaborative de planification : mobile Expo/React Native, web React/Vite/PWA et API Express/PostgreSQL. Cette note s'appuie exclusivement sur des sources primaires (éditeurs, standards et organismes officiels). Elle ne constitue pas un avis juridique.

**Méthode.** Lecture préalable des rapports de veille des 19, 20 et 21 septembre, du rapport déjà présent pour le 22 septembre, du backlog `docs/backlog/cursor-backlog.md`, puis inspection de Git et de l'architecture. Les changements de pile, calendrier, collaboration, accessibilité, RGPD/IA et automatisation ont été recherchés contre ces sources. Un élément n'est retenu que s'il est nouveau depuis le rapport du 19 septembre et utile à Planii.

**Fenêtre différentielle.** Le contrôle le plus récent couvre `2026-09-22T14:07:08.666Z`–`2026-09-22T16:59:53Z` (18:59 CEST), après le dernier run déclaré à `2026-09-22T15:08:09.795Z`. Les constats antérieurs du jour sont conservés ci-dessous pour garder une seule note quotidienne cumulative.

## Résumé exécutif

- Depuis la dernière exécution, aucun commit ni fichier projet n'a changé. `HEAD` local et `origin/main` restent sur `a717cfe`; les travaux locaux et les statuts du backlog restent inchangés. GitHub confirme toujours 0 issue ouverte, 0 PR ouverte, 0 déploiement et 0 secret Actions; le dernier run Hostinger reste en échec et couvert par PLANI-026.
- La veille officielle élargie trouve huit avis npm publiés et un avis modifié. Deux avis `9router` sont postérieurs au dernier run; les autres concernent `@aborruso/ckan-mcp-server`, `@sync-in/server`, `@roomi-fields/notebooklm-mcp` et `expr-eval`. Aucun de ces paquets n'est déclaré par Planii. Les avis `9router` conduisent néanmoins à renforcer dans PLANI-017 et PLANI-026 les preuves anti-usurpation `X-Forwarded-*` de la limitation de débit Express derrière Traefik.
- La documentation officielle Jitsi précise que `meet.jit.si` sert à tester une intégration et ne convient pas à une application de production. PLANI-030 conserve les preuves d'intégration navigateur, PLANI-031 doit choisir JaaS ou un auto-hébergement avant la validation de production, et PLANI-026 est désormais bloqué sur PLANI-031 plutôt que directement sur PLANI-030. Aucun nouveau ticket n'est créé.
- Mobile: l'audit a d'abord observé un état intermédiaire Expo 56 avec typecheck rouge, puis Cursor a poursuivi le même chantier jusqu'à Expo 57.0.24, React Native 0.86.3, Reanimated 4.5.1 et Worklets 0.10.1. L'import fautif passe désormais par Expo Router; `npm run typecheck`, `expo-doctor` 21/21 et les 3 tests unitaires du lien de reset sont verts. PLANI-024 reste ouvert pour les development builds, appareils, deep links, permissions, OTA et profil mémoire; aucun nouveau ticket n'est nécessaire.
- Web: le build PWA passe. La suite Playwright complète passe 35/35 avec trois workers, y compris cache PWA, accessibilité claire/sombre et six scénarios Jitsi. Le bundle principal reste à 1 001,82 kB minifié; PLANI-007 couvre déjà cette dette.
- Backend: le build TypeScript passe. Vitest rapporte 10 tests réussis et 12 ignorés faute de PostgreSQL disponible; PLANI-001 reste le premier ticket backend à prendre.
- La première tentative Playwright a été bloquée par l'interdiction sandbox d'ouvrir le port local; la relance autorisée hors sandbox a fourni la preuve 35/35. Aucun échec produit n'est attribué à cette première tentative.

## État observé du produit

- Contrôle différentiel à 19:08 CEST: aucun fichier applicatif n'est postérieur au dernier run `2026-09-22T15:08:09.795Z`, aucun commit n'a été ajouté et l'empreinte du diff applicatif local préexistant reste `f304d1d8…`. Aucun test applicatif n'est rejoué en l'absence de changement source; les preuves 35/35 web, 21/21 Expo Doctor, typecheck mobile et 10 tests backend réussis avec 12 ignorés restent les dernières preuves disponibles.
- `HEAD` local et `origin/main` restent alignés sur `a717cfe`; aucun commit, ticket GitHub, pull request ou déploiement nouveau. Le run Hostinger `35592811607` reste en échec et aucun secret Actions n'est déclaré; PLANI-026 couvre l'incident.
- L'arbre de travail contient des changements applicatifs locaux produits par d'autres agents. Cette automatisation les a uniquement audités et n'a modifié aucun code applicatif.
- Mobile: le manifeste vise Expo `^57.0.17` et l'installation résout Expo `57.0.24`, React Native `0.86.3`, Reanimated `4.5.1` et Worklets `0.10.1`. Le lockfile npm est supprimé au profit de Yarn. PLANI-024 reste `IN_PROGRESS` jusqu'aux preuves natives/EAS.
- Web: build PWA et Playwright 35/35 sont verts. PLANI-013 reste `IN_PROGRESS` uniquement pour la revue manuelle VoiceOver/Safari et NVDA/Firefox; PLANI-030 reste `IN_PROGRESS` pour les preuves réelles Nginx, média, en-têtes publics, juridique et coût.
- Backend: build vert, mais 12 tests PostgreSQL restent ignorés; PLANI-001 est le premier ticket partagé prêt à prendre.

## Recherches et sources

Le contrôle officiel élargi relève [huit avis npm publiés entre 14:43:26Z et 16:34:18Z](https://api.github.com/advisories?ecosystem=npm&published=2026-09-22T14%3A07%3A08Z..2026-09-22T16%3A59%3A53Z&per_page=100) et [un avis `expr-eval` modifié](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-22T14%3A07%3A08Z..2026-09-22T16%3A59%3A53Z&per_page=100). Après le dernier run, les deux seuls nouveaux avis sont [`GHSA-5mj8-gf6m-fhw8`](https://github.com/advisories/GHSA-5mj8-gf6m-fhw8), publié le **22 septembre 2026 à 16:34:06Z**, et [`GHSA-32gc-64m7-hj7v`](https://github.com/advisories/GHSA-32gc-64m7-hj7v), publié à **16:34:18Z**; tous deux visent `9router`, absent de Planii. Les six autres avis publiés visent `@aborruso/ckan-mcp-server`, `@sync-in/server` et `@roomi-fields/notebooklm-mcp`, également absents. La [release React Native 0.88.0-rc.2](https://github.com/facebook/react-native/releases/tag/v0.88.0-rc.2), publiée à **08:52:19Z**, précède la fenêtre et reste une préversion incompatible avec la cible Expo 57 / React Native 0.86.3.

L'analogie sécurité est toutefois applicable à la stack réelle. Planii configure `app.set('trust proxy', 1)` et `express-rate-limit` derrière Traefik. Le [guide officiel Express sur les reverse proxies](https://expressjs.com/en/guide/behind-proxies/) avertit qu'un nombre de sauts fixe devient falsifiable si plusieurs chemins de longueurs différentes atteignent l'application, et que le dernier proxy de confiance doit supprimer ou écraser `X-Forwarded-For`, `X-Forwarded-Host` et `X-Forwarded-Proto`. La faisabilité est bornée: PLANI-017 doit tester les limites par compte/IP avec `X-Forwarded-For` et `X-Real-IP` forgés; PLANI-026 doit prouver que l'API n'est joignable que via Traefik et que Traefik normalise ces en-têtes. Cela évite un ticket supplémentaire tout en traitant le risque dans les deux chantiers qui en dépendent.

La contrainte fournisseur Jitsi est également officielle: la [page d'intégration Jitsi](https://jitsi.org/api/) indique que `meet.jit.si` est destiné aux tests d'intégration, pas aux applications de production, et renvoie vers JaaS ou un déploiement propre. La [page JaaS](https://jitsi.org/jaas/) confirme l'offre d'embarquement et ses capacités, mais son tarif et ses conditions doivent encore être évalués. PLANI-030 peut donc vérifier CSP, permissions et accessibilité sur le service public en environnement de test; PLANI-031 doit comparer JaaS et auto-hébergement, puis fournir la cible de production et son contrôle d'accès. Ce choix conditionne désormais le smoke de production de PLANI-026.

Le contrôle officiel additionnel relève [`react-native@0.89.0-nightly-20260922-f03f6c2b8`](https://www.npmjs.com/package/react-native/v/0.89.0-nightly-20260922-f03f6c2b8), publiée le **22 septembre 2026 à 04:39:26Z**. Il s'agit d'une nightly hors de la ligne stable utilisée par Expo 57; elle ne constitue ni une mise à jour compatible ni un correctif qualifié pour Planii. Les requêtes GitHub officielles renvoient [0 avis npm publié](https://api.github.com/advisories?ecosystem=npm&published=2026-09-22T04%3A05%3A07Z..2026-09-22T05%3A38%3A38Z&per_page=100), [0 avis npm modifié](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-22T04%3A05%3A07Z..2026-09-22T05%3A38%3A38Z&per_page=100) et [0 commit Advisory Database](https://api.github.com/repos/github/advisory-database/commits?since=2026-09-22T04%3A05%3A07Z&until=2026-09-22T05%3A38%3A38Z&per_page=100). Les canaux officiels React, Vite, Expo, Express, PostgreSQL, Google Workspace, Microsoft Teams, W3C WAI, EDPB et Commission européenne ne publient dans cette fenêtre aucun élément daté imposant un changement Planii.

La veille officielle résiduelle relève seulement deux versions npm mobiles `nightly`, publiées le 21 septembre à 23:34Z: [`react-native-gesture-handler@3.4.0-nightly`](https://www.npmjs.com/package/react-native-gesture-handler/v/3.4.0-nightly-20260921-e26231e9d) et [`react-native-screens@4.29.0-nightly`](https://www.npmjs.com/package/react-native-screens/v/4.29.0-nightly-20260921-e6db3c57e). Elles sont hors des plages Expo 57 déclarées et ne sont pas actionnables. Les requêtes officielles GitHub Advisory Database retournent [0 avis npm publié](https://api.github.com/advisories?ecosystem=npm&published=2026-09-21T23%3A25%3A00Z..2026-09-22T00%3A23%3A43Z&per_page=100), [0 avis modifié](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-21T23%3A25%3A00Z..2026-09-22T00%3A23%3A43Z&per_page=100) et [0 commit de base](https://api.github.com/repos/github/advisory-database/commits?since=2026-09-21T23%3A25%3A00Z&until=2026-09-22T00%3A23%3A43Z&per_page=100). Aucun autre signal stable, accessibilité, RGPD/AI Act ou coût ne qualifie la fenêtre.

## Opportunités évaluées

Une seule évolution mérite d'être conservée : la disponibilité pour les utilisateurs de Google Workspace Studio des déclencheurs personnalisés, étapes personnalisées et webhooks, déployée à partir du 21 septembre. Elle peut offrir à Planii une automatisation **initiée et configurée par l'utilisateur**, par exemple « lorsqu'une tâche qui m'est assignée devient en retard, lancer mon flux Workspace ». Elle ne justifie pas encore un ticket : le produit ne dispose ni d'une demande confirmée d'organisations Google Workspace, ni du socle de sessions, contrats, idempotence et observabilité nécessaire.

Il n'y a donc **aucun nouveau ticket à créer aujourd'hui**. PLANI-017, PLANI-026, PLANI-030 et PLANI-031 sont précisés avec les contraintes proxy/Jitsi; PLANI-024 et PLANI-013 conservent leurs preuves fraîches. Le candidat Workspace Studio décrit à la fin est volontairement non créé.

### Déduplication avec le produit et le backlog

- Les rapports existants couvrent déjà : Expo SDK 57 et EAS Observe, calendrier/ICS, push, hors-ligne et conflits, PWA privée, passkeys/OAuth, WCAG 2.2 AA, saisie IA confirmée, import tableur, PostgreSQL, observabilité et réunions Jitsi. Les tickets PLANI-001 à PLANI-031 couvrent ces sujets ; aucun doublon n'est proposé.
- Le dernier commit est `a717cfe` (21 septembre), consacré à l'accessibilité web. Aucun commit plus récent n'est présent. L'arbre est déjà modifié et a été préservé : le mobile porte une montée locale vers Expo SDK 57, et le web des travaux d'accessibilité/Jitsi non committés.
- Le mobile utilise actuellement Expo 57.0.24 et React Native 0.86.3, avec un lockfile Yarn unique, et conserve `xlsx@0.18.5`. PLANI-024 requiert encore des preuves sur appareils réels; aucun nouveau signal Expo ne change cette décision.
- Le web reste React 18.3, Vite 5.4 et PWA ; le backend est Express 4/PostgreSQL. L'authentification Google actuelle sert seulement à la connexion : `passport.ts` ignore le refresh token. Elle ne permet donc pas de notifier Workspace Studio des heures ou jours après l'autorisation.
- Les données métier utiles à une future automatisation existent déjà côté API (tâches, activité, événements de tâche), mais il n'existe ni contrat d'événement versionné, ni outbox/idempotence transverse, ni coffre de jetons OAuth tiers. Ces manques sont respectivement voisins de PLANI-005, PLANI-011, PLANI-003 et PLANI-008 ; ils excluent une implémentation opportuniste.

### Workspace Studio : automatisations déclenchées par Planii, sous contrôle utilisateur

**Sources primaires et dates.**

- [Google Workspace Updates — custom starters, steps, intégrations et webhooks](https://workspaceupdates.googleblog.com/2026/09/automate-workflows-with-custom-starters-and-steps-third-party-integrations-and-webhooks-in-Workspace-Studio.html), annonce du **17 septembre 2026** ; visibilité utilisateur en déploiement rapide à partir du **21 septembre 2026**. Google indique que les capacités sont désactivées par défaut, administrables, soumises à des approbations humaines et, pour les webhooks sur certaines éditions, à une liste d'URL autorisées.
- [Notes de version Google Workspace Developer](https://developers.google.com/workspace/release-notes), **21 septembre 2026** : les extensions Workspace Studio et son API deviennent disponibles ; une application tierce peut notifier Studio et déclencher un flux configuré par l'utilisateur.
- [Documentation officielle "Build a starter"](https://developers.google.com/workspace/add-ons/studio/build-a-starter), mise à jour le **21 septembre 2026** : le déclenchement asynchrone requiert le scope OAuth `workspace.studio.trigger`, un refresh token hors-ligne, un `triggerId`/`notifyUri` géré au cycle de vie, un `requestId` idempotent, la suppression à la désactivation (404) et le respect du quota de 100 requêtes/minute/utilisateur.

**Problème utilisateur.** Une équipe qui travaille déjà dans Google Workspace doit aujourd'hui recopier des changements Planii vers ses routines opérationnelles (notifier une équipe, créer un suivi, demander une validation). Une automatisation opaque ou globale serait inadaptée : elle pourrait transmettre des détails de projet ou agir sans confirmation.

**Valeur.** La capacité nouvelle offre un chemin officiellement contrôlé par l'administrateur et l'utilisateur : Planii émet un fait limité, puis le propriétaire du flux décide dans Workspace Studio de ses étapes et de toute éventuelle IA. Elle peut réduire les tâches de coordination sans donner à Planii le droit de lire l'agenda, les e-mails ou les documents Google. Elle complète, sans remplacer, PLANI-009 (ICS) et PLANI-014/022/023 (saisie IA confirmée).

**Faisabilité précise dans Planii.** Faisable, mais seulement comme chantier transversal ultérieur :

1. `Partage/backend` définirait un contrat d'événements versionné et minimal (`task.assigned`, `task.due`, `task.completed`), avec identifiant immuable, type, date et identifiant de projet pseudonymisé ; pas de titre, commentaire, participant ni description par défaut.
2. Il ajouterait une table de souscription liée au compte, au projet et au `triggerId`, une outbox transactionnelle, un worker avec limite par utilisateur, `requestId` stable, backoff borné et arrêt/purge sur 404, révocation OAuth, retrait de projet ou déconnexion.
3. Il créerait une autorisation Google distincte de l'authentification de connexion, en accès hors-ligne et moindre privilège. Le refresh token serait chiffré au repos, inaccessible aux journaux, révocable et jamais livré aux clients.
4. `Claude Code` réaliserait ensuite le seul parcours web nécessaire : connecter/disconnecter Workspace, choisir explicitement les événements et projets, afficher le statut, la dernière tentative et les erreurs. Il doit dépendre de PLANI-003, PLANI-005, PLANI-008 et du contrat backend. Aucun travail mobile n'est requis au premier incrément.

**Risques sécurité, RGPD et accessibilité.**

- Le refresh token et l'URL de notification sont des secrets opérationnels ; un vol permettrait de lancer des flux configurés par l'utilisateur. Chiffrement au repos, rotation/révocation, contrôle d'appartenance à chaque émission, journal sans payload, contrôle CSRF/OAuth et suppression idempotente sont indispensables.
- Les sorties peuvent apparaître dans les journaux d'activité Workspace et alimenter des étapes tierces ou IA choisies par l'utilisateur. La minimisation stricte, une information au moment du branchement, la sélection positive des projets, la possibilité de désactiver et l'analyse DPA/transferts sont nécessaires. La base légale et le rôle responsable/sous-traitant doivent être validés, non présumés.
- Google impose une authentification hors-ligne et des quotas ; une boucle d'automatisation ou une réémission peut déclencher des opérations répétées. L'outbox, les clés d'idempotence, une limite de débit et une protection contre les boucles (origine et profondeur) sont requis.
- Le paramétrage web doit être intégralement clavier/lecteur d'écran, localisé, avec des libellés qui expliquent les données envoyées et l'effet de chaque case. Il doit s'inscrire dans PLANI-013, sans déclarer la conformité sur les seuls tests automatisés.

**Effort.** L pour une expérimentation interne sécurisée ; XL si publication Marketplace, support multi-tenant, gouvernance administrateur, revue OAuth Google et exploitation complète sont inclus. Coût non établi : les quotas Studio sont documentés, mais l'offre Workspace, les contrôles disponibles et une éventuelle validation Marketplace dépendent du client et de l'édition.

**Recommandation.** Ne pas démarrer ni créer de ticket maintenant. N'envisager une ADR et un pilote que lorsqu'un client Google Workspace demande explicitement ce scénario, après PLANI-003, PLANI-005, PLANI-008 et le socle d'idempotence de PLANI-011. Le pilote doit n'émettre qu'un événement non sensible, à la demande explicite d'un administrateur, sans étape IA préconfigurée par Planii.

## Sources contrôlées mais non retenues

| Domaine | Source primaire | Dernier élément observé | Décision différentielle |
|---|---|---|---|
| Expo / React Native | [Expo changelog](https://expo.dev/changelog) ; [React Native releases](https://github.com/react/react-native/releases) | SDK 58 bêta le 15 septembre ; React Native 0.88.0-rc.1 le 16 septembre | Aucun stable nouveau depuis le 19 ; poursuivre PLANI-024 vers SDK 57, sans bêta. |
| Web React / PWA | [React releases](https://github.com/facebook/react/releases) ; [Vite releases](https://github.com/vitejs/vite/releases) | React 19.3 le 9 septembre ; Vite 8.3 le 10 septembre | Antérieurs et déjà analysés ; aucune migration quotidienne. |
| Calendrier et réunions | [Google Calendar API release notes](https://developers.google.com/workspace/calendar/release-notes) ; [Google Meet API release notes](https://developers.google.com/workspace/meet/release-notes) | Calendar : 14 juillet ; Meet `spaces.members` : 11 septembre | Antérieurs au rapport ; PLANI-009 et PLANI-031 restent les voies uniques. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | Brouillon WCAG 3 du 10 septembre | Ce n'est pas une norme de conformité ; finir WCAG 2.2 AA et les essais manuels PLANI-013/016. |
| RGPD / IA | [EDPB News](https://www.edpb.europa.eu/news_en) | Publication EDPB du 21 septembre sur méthode d'amende et lignes DSA-GDPR | Pas d'exigence technique nouvelle propre à Planii ; aucun ticket conformité. |
| Sécurité API/base | [Express releases](https://github.com/expressjs/express/releases) ; [PostgreSQL security archive](https://www.postgresql.org/about/newsarchive/security/) | Aucun correctif récent qualifié après le rapport du 19 | Conserver PLANI-001, PLANI-017, PLANI-025 et PLANI-027. |

La vérification officielle résiduelle confirme 0 avis npm publié ou modifié et 0 commit dans GitHub Advisory Database. Les vulnérabilités déjà identifiées restent regroupées dans PLANI-024 et PLANI-027 à PLANI-029.

## Faisabilité et recommandation

| Candidat | Propriétaire et dépendances | Effort | Recommandation |
|---|---|---:|---|
| `PLANI-candidat — Evaluer une automatisation Workspace Studio à événements minimaux` | `Partage/backend` pour ADR, OAuth distinct, contrat/outbox ; sous-ticket `Claude Code` pour le parcours web. Dépend de PLANI-003, PLANI-005, PLANI-008 et du socle PLANI-011. | L/XL | **Ne pas créer maintenant.** Le créer seulement après demande client confirmée et validation sécurité/RGPD/coût. |

**Décision finale : aucun nouveau ticket créé et aucun statut modifié.** Les critères de PLANI-017/026 intègrent la chaîne proxy et les en-têtes forgés; PLANI-030/031 actent que `meet.jit.si` n'est qu'une cible de test. PLANI-026 dépend désormais de PLANI-031 pour disposer d'une cible réunion de production. Les priorités restent les chantiers P0/P1 actifs : tests PostgreSQL et reset sécurisé (backend), QA native Expo 57 (Cursor AI), accessibilité et Jitsi (Claude Code).

## Plan du jour

### Cursor AI - mobile

1. **En cours: PLANI-024** — dépendances Expo 57, lockfile Yarn, typecheck et Expo Doctor sont verts; restent development builds iOS/Android, appareils, deep links, permissions, OTA hors production et profil mémoire.
2. **En cours: PLANI-016** — réaliser la QA VoiceOver/TalkBack sur les development builds SDK 57.
3. **Bloqués: PLANI-019 et PLANI-029** — attendre respectivement PLANI-017 et PLANI-027, en plus de la clôture native PLANI-024.

### Claude Code - web

1. **En cours: PLANI-013** — automatisation 35/35; remplir la revue VoiceOver/Safari et NVDA/Firefox.
2. **En cours: PLANI-030** — produire les preuves Docker/Nginx, média réel, en-têtes publics, revue juridique/coût et smoke public.
3. **Recherche après PLANI-030: PLANI-031** — ADR public/JaaS/auto-hébergé et contrôle d'accès; non prenable avant sa dépendance.

### Partagé/backend

1. **Prêt à prendre: PLANI-001** — rendre PostgreSQL de test obligatoire et supprimer les 12 tests ignorés.
2. **En cours après PLANI-001: PLANI-017** — atomicité, révocation API/WebSocket, limites, purge et tests du reset.
3. **Prêts à prendre sans chevauchement: PLANI-027 puis PLANI-025** — dépendances/contrat d'import, puis PostgreSQL de production et restauration.
4. **Bloqué: PLANI-026** — attendre PLANI-031, puis valider le déploiement, l'ingress Traefik et les preuves publiques sur la cible réunion de production choisie.
