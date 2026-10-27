# Planii — opportunités produit 2025-2026

**Date de recherche :** 19 septembre 2026  
**Périmètre :** web React/Vite, mobile Expo, API Express/PostgreSQL de Planii.  
**Méthode :** lecture du dépôt puis consultation de sources primaires uniquement : documentation officielle, annonces éditeur, standards W3C/IETF et autorités européennes. Les dates indiquées sont celles de publication quand la source les affiche ; sinon « consulté le 19 septembre 2026 » est explicite. Ce document ne constitue pas un avis juridique.

## Synthèse décisionnelle

| Rang | Opportunité | Effort | Décision | Pourquoi maintenant |
|---:|---|:---:|---|---|
| 1 | Saisie naturelle guidée, avec aperçu et confirmation | M | **Maintenant, pilote borné** | Le produit dispose déjà des actions métier et de la dictée ; il manque une étape de traduction fiable de l’intention vers ces actions. |
| 2 | Agenda Planii unifié + export iCalendar privé | S | **Maintenant** | Le rendez-vous existe mais le flux `/calendar` ne renvoie actuellement que tâches et échéances ; les utilisateurs n’ont pas de continuité hors de Planii. |
| 3 | Notifications push mobiles avec politique d’attention | M | **Maintenant** | L’app possède notifications in-app, e-mails et rappels, mais pas de push natif alors que l’infrastructure Expo le permet. |
| 4 | File d’actions hors-ligne et conflits explicites | M/L | **Maintenant, par étapes** | La PWA ne fait qu’un cache réseau court et le mobile ne persiste pas les données métier ; la collaboration réelle devient fragile en mobilité. |
| 5 | Passkeys et durcissement OAuth | M | **Maintenant** | Les mots de passe et OAuth sont en place ; WebAuthn Level 3 est une recommandation W3C de 2026 et l’IETF a publié le BCP OAuth actualisé en 2025. |
| — | Accessibilité WCAG 2.2 AA | M | **Socle transversal immédiat** | C’est à traiter dans tous les chantiers ci-dessus, avec revue juridique de l’applicabilité de l’EAA. |
| — | Connexions Google/Microsoft en lecture puis disponibilité | L | **Plus tard, après agenda unifié** | Les API sont prêtes, mais les consentements, jetons durables et conflits de calendriers accroissent fortement la surface produit et RGPD. |
| — | MCP Calendrier et agent autonome | L | **Non pour le moment** | Google le présente encore comme une Developer Preview et le protocole évolue rapidement ; ce n’est pas un socle de production pour les écritures. |

## 1. Ce que Planii fait aujourd’hui

### Web React/Vite

Le web est une application React 18/TypeScript avec Vite et une PWA (`vite-plugin-pwa`). Elle couvre notamment :

- authentification par mot de passe et connexion sociale ;
- projets solo, équipe ou groupe, rôles, membres, invitations et libellés ;
- tâches avec sous-tâches, statuts configurables, priorité, estimation/temps passé, affectation, transferts, commentaires, historique et import de tableur ;
- page « Aujourd’hui », calendrier, échéances, rendez-vous de projet, sondages, activité et classement ;
- espace de réunion Jitsi et fil de réunion qui peut être transformé en tâche ;
- commande rapide, dictée/lecture vocale et préférences d’e-mails ;
- notifications in-app, e-mails transactionnels et rafraîchissement en temps réel par WebSocket.

Le service worker utilise actuellement une stratégie `NetworkFirst` pour l’API avec un cache au plus cinq minutes. Il améliore la consultation lors d’une coupure, mais il ne met pas les écritures en file, ne résout pas les conflits et ne rend pas les données métier réellement hors ligne.

### Mobile Expo

L’application Expo SDK 54 / React Native 0.81 partage les types, importateurs et logique de dictée avec le web. Elle fournit les onglets Accueil, Projets, Agenda, Classement, Profil et Administration selon le rôle, les flux d’invitation et de réinitialisation, un stockage de session sécurisé, des contrôles natifs et de nombreuses étiquettes d’accessibilité.

La reconnaissance vocale est native et demande l’autorisation au premier usage. Les notifications mobiles actuelles sont une cloche in-app qui interroge l’API toutes les minutes quand l’application est active, complétée par les WebSockets. `expo-notifications` et `expo-sqlite` ne figurent pas dans les dépendances actuelles : il n’y a donc ni push APNs/FCM ni base locale métier persistante.

### Backend Express/PostgreSQL

L’API Express/PostgreSQL gère les utilisateurs, projets, memberships et permissions, tâches et opérations groupées, invitations, rendez-vous et participants, sondages, fil de réunion, notifications, e-mails, rappels, page Aujourd’hui, audit admin et fichiers. Le serveur `ws` notifie les membres concernés ; les clients rechargent ensuite leurs données.

L’authentification est aujourd’hui JWT + mots de passe hachés, avec OAuth Google, Microsoft, LinkedIn et Yahoo. Les scopes Google (`profile`, `email`) et Microsoft (`user.read`, `openid`, `profile`, `email`) sont seulement identitaires : le schéma ne stocke pas de jeton de calendrier, et les tables d’identités ne retiennent que fournisseur, sujet et e-mail. Le chemin `GET /calendar` compose tâches datées et échéances projet, mais pas les rendez-vous pourtant stockés dans `appointments`.

### Lecture produit

Planii n’a pas besoin de répliquer un outil généraliste de gestion de projets. Sa différenciation réaliste est d’être le lieu où une équipe transforme rapidement une intention, une discussion ou une disponibilité en engagement compréhensible : tâche assignée, créneau vérifié, rappel proportionné et historique partageable.

## 2. Principes de priorisation

1. **Conserver Planii comme source d’autorité de ses objets.** Une intégration calendrier doit référencer une tâche ou un rendez-vous Planii, pas créer deux vérités impossibles à réconcilier.
2. **Proposer avant d’écrire.** Toute IA peut préparer un plan structuré ; l’utilisateur confirme chaque création, mise à jour, affectation ou message externe.
3. **Privilégier le minimum de données.** Pour trouver un créneau, demander « occupé/libre » plutôt que titres, participants et contenu des événements externes.
4. **Rendre les erreurs récupérables.** Une modification hors-ligne, une synchronisation expirée ou une ambiguïté de date doit déboucher sur un état visible et réessayable, jamais sur une écriture silencieusement perdue.
5. **Construire les bases transversales une fois.** Version de ressource, identifiants d’idempotence, journal d’audit, préférences de notification, accès clavier/lecteur d’écran et consentement sont des briques réutilisables.

## 3. Opportunités détaillées

### O1 — Saisie naturelle guidée : « crée, propose, puis confirme »

**Problème utilisateur.** Créer plusieurs éléments à partir d’une phrase ou d’une note de réunion oblige aujourd’hui à naviguer entre formulaires. La dictée existante sait déjà capter du texte et interpréter quelques champs, mais elle ne peut pas de façon fiable proposer un ensemble cohérent de tâches, affectations, échéances et rendez-vous.

**Preuve et signal 2025.** Le 11 mars 2025, OpenAI a annoncé la Responses API et l’Agents SDK pour les applications qui utilisent des outils et des flux multi-étapes. Le 7 août 2025, OpenAI a annoncé GPT-5 dans l’API avec prise en charge des outils, des sorties structurées et des contrôles de raisonnement. Ces capacités ne prouvent pas à elles seules le besoin utilisateur de Planii ; elles rendent techniquement réaliste une couche d’assistance bornée là où Planii possède déjà des actions métier.  
Sources : [OpenAI, « New tools for building agents », 11 mars 2025](https://openai.com/index/new-tools-for-building-agents/) ; [OpenAI, « Introducing GPT-5 for developers », 7 août 2025](https://openai.com/index/introducing-gpt-5-for-developers/).

**Proposition.** Ajouter un champ « Décrire ce que vous voulez planifier » dans la commande rapide, le projet et le fil de réunion. Une phrase comme « Prépare la démo avec Sarah avant jeudi, puis propose 30 minutes avec l’équipe » renvoie un **brouillon** composé d’objets typés : tâches, responsables candidats, dates interprétées, rendez-vous éventuel et questions d’ambiguïté. Aucune mutation n’a lieu avant validation explicite sur une feuille de confirmation.

**Valeur.** Moins de saisie répétitive, meilleure exploitation de la dictée existante et maintien de la traçabilité : chaque action confirmée conserve son créateur, son historique et ses permissions Planii.

**Faisabilité précise dans Planii.**

- Web et mobile : réutiliser `CommandPalette`, `QuickTask`, `VoiceTaskWizard` et les composants de feuille/modale existants pour afficher le brouillon modifiable.
- Backend : créer un service IA isolé qui reçoit le texte, le fuseau horaire, la langue et un contexte minimal (membres autorisés du projet, statuts, date courante), puis valide une réponse JSON avec Zod.
- Exécuter ensuite les routes déjà présentes pour créer tâche, rendez-vous ou tâche de réunion. Pour l’affectation et les changements, contrôler les permissions côté service métier comme aujourd’hui, jamais dans le prompt.
- Ajouter `ai_actions` ou enrichir l’audit avec : texte minimal, version du prompt, brouillon, confirmation, appels réellement exécutés, utilisateur, durée et statut. Prévoir une rétention courte configurable.
- Commencer par trois intentions seulement : créer une tâche ; proposer plusieurs tâches depuis un texte ; proposer un rendez-vous. Exclure la suppression, les invitations et tout accès aux outils externes du pilote.

**Dépendances, risques et RGPD.** Les contenus de tâches, réunions et noms de collègues sont des données personnelles. L’EDPB rappelle que l’usage d’un modèle d’IA exige une analyse au cas par cas, y compris sur la base légale, les attentes raisonnables, les mesures de réduction et, lorsqu’il y a risque élevé, une AIPD. Il faut documenter finalité, sous-traitant, région de traitement, rétention, mécanisme d’opposition et option de désactivation par organisation. Ne pas envoyer l’historique complet du projet par défaut. Le risque principal n’est pas le JSON invalide, mais une interprétation métier plausible et erronée : l’aperçu modifiable, la confirmation et les validations serveur sont obligatoires.  
Sources : [EDPB, « Opinion on AI models », 18 décembre 2024](https://www.edpb.europa.eu/news/edpb-opinion-on-ai-models-gdpr-principles-support-responsible-ai_en) ; [Commission européenne, obligations RGPD et AIPD, consulté le 19 septembre 2026](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en).

**Effort : M. Recommandation : Maintenant, sous forme de pilote opt-in sans action autonome.**

### O2 — Transformer le fil de réunion en plan d’action révisable

**Problème utilisateur.** Planii sait déjà publier des messages de réunion et les convertir un par un en tâches. Après une réunion, les décisions, blocages et responsables restent néanmoins dispersés dans le fil et demandent une relecture manuelle.

**Preuve et signal 2025.** La Responses API de 2025 cible explicitement l’usage d’outils et de tâches à plusieurs étapes ; GPT-5 expose les sorties structurées et les appels d’outils dans l’API. L’opportunité est justifiée par l’extension d’un flux Planii existant, pas par la copie d’un assistant de prise de notes.  
Sources : [OpenAI, 11 mars 2025](https://openai.com/index/new-tools-for-building-agents/) ; [OpenAI, 7 août 2025](https://openai.com/index/introducing-gpt-5-for-developers/).

**Proposition.** Dans l’onglet Réunion, ajouter « Préparer le plan d’action » : le système extrait des **propositions** de décision, action, responsable cité, échéance explicite et question ouverte depuis les messages sélectionnés. Le résultat cite les messages sources et l’utilisateur choisit les lignes à convertir. Sans enregistrement audio ni transcription distante dans la première version.

**Valeur.** Réduit la perte de décisions après réunion tout en gardant le contexte vérifiable et le contrôle collectif. La proposition est plus spécifique qu’un résumé générique : elle aboutit aux mêmes tâches, délégations et rendez-vous que les utilisateurs manipulent déjà.

**Faisabilité précise dans Planii.** Ajouter une route de prévisualisation qui lit uniquement les `meeting_messages` auxquels le demandeur a accès, puis renvoie `actionItems[]` validés par schéma. L’UI de `MeetingTab` affiche source, titre, responsable possible, échéance et case de sélection. La confirmation appelle `createMeetingTask` ou `createTask` en conservant un lien vers le message source. Les anciennes conversations ne sont analysées que sur demande.

**Dépendances, risques et RGPD.** Même cadre IA que O1, avec une précaution supplémentaire : une phrase attribuée à une personne peut être ambiguë. Ne jamais déduire un responsable sans le présenter comme candidat ; conserver la citation source et permettre son retrait. Si l’audio est ajouté ultérieurement, lancer une analyse juridique et de consentement distincte avant tout enregistrement.

**Effort : M. Recommandation : Plus tard, immédiatement après le pilote O1 et non en parallèle.**

### O3 — Agenda Planii unifié et export iCalendar privé

**Problème utilisateur.** Un rendez-vous de projet est enregistré et notifié, mais il ne remonte pas dans le service actuel `/calendar`, qui ne renvoie que tâches datées et échéances. De plus, un utilisateur ne peut pas consulter son planning Planii depuis son calendrier personnel sans recréer manuellement les événements.

**Preuve et signal 2025-2026.** Google documente la synchronisation incrémentale par `syncToken`, y compris la nécessité de refaire une synchronisation complète après un `410`. Microsoft Graph documente les delta queries pour conserver un magasin local de changements d’événements. Ces primitives établissent un chemin de synchronisation robuste si Planii décide d’ouvrir plus tard une connexion de calendrier. En avril 2026, Google a aussi lancé en Developer Preview un serveur MCP Calendar qui lit et modifie les calendriers pour les agents : c’est un signal d’évolution, mais pas une base de production à adopter aujourd’hui.  
Sources : [Google Calendar API, synchronisation incrémentale, consulté le 19 septembre 2026](https://developers.google.com/workspace/calendar/api/guides/sync) ; [Microsoft Graph, delta query calendar view, consulté le 19 septembre 2026](https://learn.microsoft.com/en-us/graph/delta-query-events) ; [Google Calendar API release notes, 22 avril 2026](https://developers.google.com/workspace/calendar/release-notes).

**Proposition.** Découper le travail en deux livrables :

1. **Agenda Planii canonique (maintenant).** Inclure rendez-vous, tâches datées et échéances dans un même contrat d’événement ; proposer filtres Projet / Tâches / Rendez-vous et des liens vers l’objet source.
2. **Export iCalendar individuel (maintenant).** Générer un flux `.ics` privé, révocable et rotatif, limité aux événements Planii de l’utilisateur. Les événements exportés contiennent un identifiant stable, le lien profond Planii et un champ de version ; aucune donnée sensible inutile.

**Valeur.** L’agenda devient fiable dans Planii dès le premier livrable et reste visible dans l’outil personnel de l’utilisateur sans imposer l’accès réciproque à son calendrier externe. C’est un bénéfice immédiat avec une surface de sécurité bien plus faible qu’une synchronisation bidirectionnelle.

**Faisabilité précise dans Planii.**

- Faire évoluer `calendar.service.ts` pour intégrer `appointments` et normaliser les champs : `kind`, `startsAt`, `endsAt`, `allDay`, `sourceId`, `projectId`, `updatedAt`.
- Ajouter les fuseaux horaires aux rendez-vous : les colonnes actuelles `date`, `time_start`, `time_end` sont des textes et ne suffisent pas pour une sérialisation multi-fuseau fiable. Conserver une migration de données explicite.
- Ajouter une table `calendar_feed_tokens` avec empreinte du secret, utilisateur, créé/révoqué/dernière utilisation. Servir l’ICS derrière un jeton non devinable, sans JWT dans l’URL ; intégrer une commande « régénérer le lien » dans Profil.
- Réutiliser le calendrier web/mobile existant et les WebSockets pour mettre à jour l’interface locale ; l’ICS reste en lecture seule, avec une fréquence de rafraîchissement contrôlée par les clients de calendrier.

**Dépendances, risques et RGPD.** Un lien de flux est un secret partageable : il doit être révocable, expirer sur demande et n’exposer que les événements accessibles à l’utilisateur. Il faut afficher clairement qu’un calendrier abonné peut copier les titres sur un appareil ou chez un fournisseur tiers. Pour une tâche, exporter par défaut un titre minimal et le lien Planii, pas sa description ou ses commentaires. Tester récurrence et fuseaux avant de promettre une compatibilité complète.

**Effort : S pour l’agenda unifié + flux simple ; M si récurrence et préférences fines. Recommandation : Maintenant.**

### O4 — Disponibilités Google/Microsoft avant une synchronisation complète

**Problème utilisateur.** Planifier un rendez-vous de projet oblige les participants à comparer manuellement leurs calendriers externes. Planii dispose d’OAuth identitaire mais ne possède ni scopes calendrier ni jetons durables pour consulter la disponibilité.

**Preuve et signal.** Google Calendar fournit une requête `freeBusy` qui retourne les créneaux occupés et accepte un scope dédié à la disponibilité. Microsoft Graph fournit `findMeetingTimes`, qui propose des créneaux à partir des disponibilités et de contraintes, avec le principe des permissions les moins privilégiées.  
Sources : [Google Calendar `freeBusy.query`, consulté le 19 septembre 2026](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) ; [Microsoft Graph `findMeetingTimes`, consulté le 19 septembre 2026](https://learn.microsoft.com/en-us/graph/api/user-findmeetingtimes?view=graph-rest-1.0).

**Proposition.** Après O3, lancer une connexion séparée et volontaire « Vérifier mes disponibilités Google / Microsoft ». Lors de la création d’un rendez-vous, Planii ne demande que les créneaux libres/occupés, affiche trois créneaux compatibles et laisse chaque participant choisir. Le rendez-vous reste d’abord canonique dans Planii ; l’écriture vers le calendrier externe ne vient qu’après un pilote en lecture.

**Valeur.** Moins d’allers-retours pour les réunions, sans faire de Planii un clone de Google Calendar ou Outlook. L’utilisateur ne donne pas accès au contenu intégral de ses événements pour obtenir un simple créneau.

**Faisabilité précise dans Planii.**

- Ajouter un modèle `calendar_connections` : utilisateur, fournisseur, scopes consentis, jeton chiffré, expiration, état et date de dernière synchronisation. Les jetons ne doivent jamais arriver au mobile après l’autorisation.
- Ajouter des stratégies OAuth calendrier distinctes des stratégies de connexion ; ne pas augmenter silencieusement les scopes de l’authentification actuelle.
- Implémenter deux adaptateurs backend, `GoogleAvailabilityProvider` et `MicrosoftAvailabilityProvider`, derrière un contrat interne unique. Conserver seulement les intervalles occupés, le fuseau et un horodatage de fraîcheur.
- Appliquer un délai court, un cache temporaire et une solution de repli « proposer sans calendrier externe ». Ne pas utiliser MCP pour ce premier flux.

**Dépendances, risques et RGPD.** Consentement granulaire, chiffrement au repos des refresh tokens, journalisation sans secrets, suppression immédiate de la connexion, traitement des révocations et politiques Google/Microsoft sont obligatoires. La disponibilité elle-même révèle potentiellement des habitudes de travail ; minimiser conservation et affichage. La synchronisation bidirectionnelle ajoute les conflits, les suppressions et le risque de doubles invitations : elle n’est pas dans le premier périmètre.

**Effort : L. Recommandation : Plus tard, après O3 ; commencer par Google et disponibilité seule si les données d’usage le justifient.**

### O5 — Notifications push mobiles et politique d’attention

**Problème utilisateur.** Les notifications Planii existent dans l’app et par e-mail, mais un utilisateur mobile ne les voit pas forcément lorsqu’il est hors de l’application. À l’inverse, simplement reproduire chaque événement en push créerait une surcharge et nuirait à l’adoption.

**Preuve et signal 2025.** La documentation Expo mise à jour le 6 juin 2025 indique que le service Expo simplifie l’envoi vers FCM et APNs ; `expo-notifications` sait obtenir les jetons, présenter, programmer, recevoir et traiter les notifications. Expo SDK 54, déjà utilisé par Planii, est sorti le 10 septembre 2025 et demande la configuration moderne via le plugin `expo-notifications`.  
Sources : [Expo, vue d’ensemble des push notifications, mise à jour le 6 juin 2025](https://docs.expo.dev/push-notifications/overview/) ; [Expo SDK 54, 10 septembre 2025](https://expo.dev/changelog/sdk-54) ; [Expo Notifications API, consulté le 19 septembre 2026](https://docs.expo.dev/versions/latest/sdk/notifications/).

**Proposition.** Ajouter les push pour les événements à forte intention : tâche assignée à moi, transfert à accepter, changement d’un rendez-vous auquel je participe, rappel d’échéance configuré et mention explicite. Ajouter une politique simple : priorité par type, heures calmes, fréquence maximale, regroupement par projet et choix push/e-mail/in-app par catégorie.

**Valeur.** Planii devient utile entre deux ouvertures de l’application sans confondre « alerte » et « flux de travail ». Les préférences e-mail déjà structurées donnent un bon point de départ à une matrice de préférences unifiée.

**Faisabilité précise dans Planii.**

- Mobile : installer/configurer `expo-notifications`, demander l’autorisation au bon moment (après bénéfice compris), enregistrer le `ExpoPushToken`, gérer les ouvertures profondes vers projet/tâche/rendez-vous et les changements de jeton.
- PostgreSQL : ajouter `device_push_tokens` (utilisateur, plateforme, token chiffré/traité comme secret, langue, timezone, dernière activité, désactivé). Ajouter une table ou file `notification_deliveries` dédupliquée par événement/type/canal.
- Backend : étendre `notification.service.ts` et le scheduler de rappels avec un worker d’envoi, lots limités, reçus Expo, invalidation des jetons et une clé d’idempotence. L’échec d’un push ne doit pas faire échouer l’action métier.
- UX : partir des clés de préférences e-mail existantes, mais laisser le push désactivé par défaut jusqu’au consentement OS. Fournir un digest quotidien optionnel, et non une évaluation IA opaque.

**Dépendances, risques et RGPD.** Les jetons push sont des données liées à un appareil. Expliquer leur finalité, permettre suppression/désactivation, respecter les règles d’APNs/FCM et éviter d’exposer le texte sensible de la tâche sur écran verrouillé. Les plateformes imposent un développement build : Expo précise que les push ne sont pas disponibles dans Expo Go. Vérifier aussi les plafonds, les reçus et les politiques d’e-mail avant mise en production.  
Source complémentaire : [Expo, comportements des notifications, consulté le 19 septembre 2026](https://docs.expo.dev/push-notifications/what-you-need-to-know/).

**Effort : M. Recommandation : Maintenant, avec cinq types d’événements maximum et des préférences explicites.**

### O6 — Hors-ligne fiable : cache local, outbox et conflits visibles

**Problème utilisateur.** En déplacement ou réseau instable, une consultation web peut tomber sur le cache court, mais une création ou modification n’est pas durablement mise en attente. Sur mobile, la session survit, pas les données métier. Avec deux membres en parallèle, le temps réel déclenche surtout des rechargements complets et ne permet pas de savoir qu’une modification locale écrase une autre.

**Preuve et signal.** La documentation Expo décrit `expo-sqlite` comme une base persistée entre redémarrages et supporte les transactions ; elle offre également SQLCipher sur iOS/Android/macOS dans un build compatible. Pour les modifications concurrentes, Google Calendar documente les `ETag` et `If-Match` précisément pour éviter une modification perdue. L’ETag est un mécanisme HTTP stable, ici utilisé comme inspiration de contrat pour Planii, pas comme promesse d’interopérabilité Google.  
Sources : [Expo SQLite, consulté le 19 septembre 2026](https://docs.expo.dev/versions/latest/sdk/sqlite/) ; [Google Calendar API, versions de ressources, consulté le 19 septembre 2026](https://developers.google.com/calendar/api/guides/version-resources).

**Proposition.** Une stratégie « local-first pour les actions, serveur-authoritatif pour la résolution » : le mobile garde un cache de projets et objets récemment utilisés ; chaque écriture devient une opération idempotente dans une outbox ; le serveur renvoie une version par ressource. Si la version a changé, Planii affiche une comparaison concise et laisse l’utilisateur recharger, réappliquer ou abandonner son changement.

**Valeur.** Les tâches prises en réunion ou dans les transports ne disparaissent pas. La collaboration devient prévisible sans construire prématurément un éditeur CRDT ou de la coédition caractère par caractère, qui ne correspond pas aux objets structurés de Planii.

**Faisabilité précise dans Planii.**

- PostgreSQL : ajouter `updated_at` et `revision` aux tâches, rendez-vous, sondages et commentaires éditables ; définir ce qui est « mergeable » champ par champ et ce qui ne l’est pas.
- API Express : accepter `Idempotency-Key` sur les mutations, conserver la réponse pour une durée limitée, accepter `If-Match` / `expectedRevision`, répondre `409` avec la version actuelle et le diff minimal en cas de conflit.
- Mobile : installer `expo-sqlite`, créer tables cache et `outbox` avec ordre, clé d’idempotence, dépendances, état et erreur ; appliquer une mutation optimiste puis rejouer à la reconnexion/app active. Stocker le jeton de session séparément dans SecureStore comme aujourd’hui.
- Web : commencer par une outbox légère en IndexedDB pour la PWA, et ne pas prétendre au hors-ligne complet tant que les mêmes garanties ne sont pas fournies.
- WebSocket : envoyer aussi `resourceId`, `revision` et type de changement afin d’invalider finement le cache ; conserver le rechargement complet comme repli.

**Dépendances, risques et RGPD.** Une base locale peut contenir titres, échéances et membres sur un appareil perdu. Limiter le cache aux projets récents, purger à la déconnexion, chiffrer le stockage lorsque la plateforme le permet et documenter ce stockage dans la politique de confidentialité. Les opérations non rejouables (suppression, changement d’accès, invitation) doivent demander une confirmation supplémentaire après reconnexion ou rester en ligne uniquement dans la première version.

**Effort : M pour les tâches et rendez-vous ; L pour la couverture complète. Recommandation : Maintenant, par un vertical slice « créer/cocher/modifier une tâche ».**

### O7 — Passkeys, récupération de compte et OAuth conforme aux pratiques 2025

**Problème utilisateur.** Planii demande encore un mot de passe pour les comptes non sociaux. Le projet a ajouté OAuth avec PKCE, mais n’offre pas de connexion résistante au phishing par passkey et devra garder ses flux OAuth alignés avec les recommandations actualisées.

**Preuve et signal 2025-2026.** WebAuthn Level 3 est devenu une recommandation W3C le 25 août 2026 ; la spécification définit des identifiants à clé publique, liés à l’origine, avec consentement utilisateur. L’IETF a publié RFC 9700 (BCP 240) en janvier 2025 : PKCE est obligatoire pour les clients publics, recommandé pour les clients confidentiels, les URI de redirection doivent être comparés exactement, et les flux implicite/mot de passe sont dépréciés.  
Sources : [W3C, WebAuthn Level 3, 25 août 2026](https://www.w3.org/TR/webauthn/) ; [IETF, RFC 9700, janvier 2025](https://www.rfc-editor.org/info/rfc9700/).

**Proposition.** Proposer l’ajout d’une passkey après une connexion réussie et la rendre disponible à la prochaine connexion web ; conserver mot de passe, OAuth et récupération comme voies de secours. En parallèle, auditer les callbacks OAuth sociaux existants contre RFC 9700 avant d’ajouter des scopes de calendrier.

**Valeur.** Connexion plus fluide sur appareils récents et réduction de l’exposition aux attaques par mot de passe/phishing, sans exclure les utilisateurs dont appareil ou environnement ne prend pas en charge les passkeys.

**Faisabilité précise dans Planii.**

- Backend : intégrer une bibliothèque WebAuthn serveur éprouvée ; créer `webauthn_credentials` (user, credential ID, clé publique, compteur, transports, créé/dernière utilisation) et un stockage de challenge à durée de vie très courte.
- Web : `navigator.credentials.create/get`, détection de capacité, bouton « Ajouter une passkey » dans Profil puis « Se connecter avec une passkey » dans Auth.
- Mobile : traiter l’intégration native comme un sous-projet séparé après le web, avec la bibliothèque Expo/React Native compatible au moment de l’exécution ; ne jamais dépendre d’un polyfill navigateur pour simuler la sécurité native.
- OAuth : conserver PKCE déjà visible dans les stratégies ; vérifier l’exactitude de chaque redirect URI, le `state`, la validation d’émetteur lorsque applicable, le chiffrement des secrets et la rotation des clés JWT.

**Dépendances, risques et RGPD.** Prévoir au minimum deux méthodes de récupération (mot de passe réinitialisable et OAuth déjà lié) et un parcours de suppression de passkey. Les données biométriques ne doivent pas transiter vers Planii : seules les preuves cryptographiques du protocole sont traitées. Les identifiants de passkey et informations d’appareil restent néanmoins des données de compte à documenter et sécuriser.

**Effort : M sur le web ; L si le mobile natif est inclus tout de suite. Recommandation : Maintenant sur web et audit OAuth, mobile ensuite.**

### O8 — Accessibilité WCAG 2.2 AA : contrôle, pas seulement étiquettes

**Problème utilisateur.** Le dépôt montre déjà de nombreux rôles et libellés ARIA/accessibility dans les deux clients, ainsi qu’une attention aux zones tactiles. Cela ne garantit pas que les parcours complexes — calendrier, drag-and-drop d’import, modales, commandes, dictée, changements temps réel et contrastes des statuts — soient praticables au clavier, avec lecteur d’écran, loupe ou réduction de mouvement.

**Preuve et signal 2025.** L’European Accessibility Act est entré en application le 28 juin 2025 pour les produits et services dans son périmètre. WCAG 2.2, recommandation W3C dont la révision actuelle est datée du 12 décembre 2024, couvre aussi le mobile et recommande l’usage de la version la plus récente. L’applicabilité juridique exacte à Planii doit être confirmée selon les pays, clients et modèle de commercialisation.  
Sources : [AccessibleEU / Commission européenne, entrée en vigueur de l’EAA, 27 juin 2025](https://accessible-eu-centre.ec.europa.eu/content-corner/news/new-era-inclusion-begins-eaa-enters-force-2025-06-27_en) ; [W3C, WCAG 2.2, 12 décembre 2024](https://www.w3.org/TR/wcag/).

**Proposition.** Traiter WCAG 2.2 AA comme un critère d’acceptation de chaque chantier et réaliser une revue ciblée des écrans existants. Priorités : focus non masqué par les modales/onglets, navigation clavier intégrale du calendrier et de la palette, alternatives non vocales à chaque fonction micro, nom + état textuels des statuts/couleurs, annonces des changements temps réel sans interruption excessive, et alternatives au glisser-déposer de l’import.

**Valeur.** Les flux de planification deviennent utilisables dans davantage de contextes : clavier, mobile, fatigue, bruit, lecteurs d’écran, préférence de mouvement réduit. Le bénéfice n’est pas réservé à un sous-groupe d’utilisateurs.

**Faisabilité précise dans Planii.**

- Web : écrire des tests de parcours clavier, établir un focus manager dans les modales, vérifier la sémantique des boutons icônes et ajouter contrôles « déplacer avant/après » là où le drag-and-drop existe.
- Mobile : compléter les `accessibilityState`, `accessibilityHint` et ordre de lecture, tester VoiceOver/TalkBack sur Auth, Projets, Agenda et tâche ; maintenir les composants natifs déjà employés.
- Design : définir contrastes et représentations textuelles dans les tokens ; les statuts ne doivent jamais reposer uniquement sur la couleur.
- QA : tests automatisés utiles mais non suffisants, puis scénario manuel lecteur d’écran/clavier à chaque release majeure.

**Dépendances, risques et RGPD.** Aucun nouveau traitement de données n’est nécessaire. Le risque est surtout de faire une certification déclarative sans test de personnes concernées ; planifier une revue indépendante et demander un avis juridique sur EAA/localisations avant toute allégation de conformité.

**Effort : M initial, puis continu. Recommandation : Socle immédiat et condition d’acceptation de O1, O3, O5 et O6.**

### O9 — MCP Calendrier : surveiller, ne pas fonder le produit dessus

**Problème utilisateur.** Les utilisateurs voient émerger des assistants qui lisent ou modifient leurs calendriers et pourraient attendre une intégration similaire. Répondre par une adoption précipitée d’un protocole agentique mettrait Planii face à des risques d’autorisation, d’écriture non désirée et de dépendance à une preview.

**Preuve et signal 2025-2026.** La spécification MCP du 18 juin 2025 a ajouté notamment l’autorisation OAuth et de meilleures pratiques de sécurité ; la version de novembre 2025 a poursuivi le travail d’autorisation. Google annonce son serveur Calendar MCP le 22 avril 2026 uniquement comme Developer Preview, avec accès lecture et écriture aux événements. Google indique aussi des limites et une gouvernance spécifiques pour les outils agentiques.  
Sources : [MCP, mise à jour de spécification, 26 septembre 2025](https://blog.modelcontextprotocol.io/posts/2025-09-26-mcp-next-version-update/) ; [Google Calendar MCP, Developer Preview, consulté le 19 septembre 2026](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server) ; [Google Workspace, modèle de sécurité pour outils agentiques, consulté le 19 septembre 2026](https://developers.google.com/workspace/tools-safety).

**Proposition.** Ne pas lancer de connecteur MCP Calendrier utilisateur ni exposer un serveur MCP Planii en écriture cette année. Conserver une veille trimestrielle. Quand O1, O3, O4, O6 et O7 seront stabilisés, évaluer un serveur MCP **lecture seule** pour les tâches et disponibilités explicitement autorisées, avec scopes minimaux, journal complet et confirmation humaine pour toute écriture future.

**Valeur.** Planii reste compatible avec une direction de marché réelle sans convertir une expérimentation externe en dette de sécurité. Les API REST Planii actuelles restent l’interface produit stable.

**Faisabilité précise dans Planii.** Aucun code maintenant. Préparer seulement les fondations réutilisables : OAuth scopes, consentement, audit d’outils, idempotence, versionnement et politiques d’accès par projet. Ces éléments servent également O1/O4/O6/O7.

**Dépendances, risques et RGPD.** Un agent peut transformer du contenu non fiable en instruction et élargir involontairement l’accès à des calendriers. Les risques de fuite à grande échelle et d’actions imprévues sont explicitement pris en compte par les contrôles de gouvernance Google. Toute future expérimentation doit être opt-in, limitée à une organisation de test et accompagnée d’un modèle de menace.

**Effort : L. Recommandation : Non pour le moment ; réévaluer après les fondations.**

## 4. Feuille de route proposée

### 0–8 semaines : fondations à impact direct

1. Corriger le contrat d’agenda : rendez-vous inclus, dates/fuseaux normalisés, liens vers l’objet source.
2. Livrer l’export ICS privé et révocable, avec tests de visibilité par membre et révocation.
3. Démarrer le vertical slice hors-ligne pour une tâche : cache local, outbox, idempotence et conflit `409` visible.
4. Ajouter les push pour affectation, transfert, rendez-vous modifié, rappel et mention ; définir heures calmes et déduplication.
5. Auditer OAuth suivant RFC 9700 et commencer les passkeys web derrière un flag.
6. Établir la checklist WCAG 2.2 AA et la QA clavier/lecteur d’écran pour les écrans touchés.

### 2–4 mois : assistance sous contrôle

1. Pilote O1 opt-in sur création de tâches et proposition de rendez-vous, avec sortie structurée, aperçu, validation et audit.
2. Ajouter O2 pour les messages de réunion sélectionnés, uniquement lorsque les métriques du pilote confirment l’usage et la qualité.
3. Étendre le hors-ligne aux rendez-vous et commentaires après les métriques de conflits et de reprise de l’outbox.

### Après validation usage/sécurité : interopérabilité externe

1. Connexion Google en disponibilité seule avec consentement séparé, puis Microsoft si les segments utilisateurs le demandent.
2. Mesurer le taux de propositions de créneau retenues, les erreurs de jeton et les suppressions de connexion avant d’envisager l’écriture externe.
3. Ne considérer la synchronisation bidirectionnelle ou MCP qu’après une revue de modèle de menace, AIPD si nécessaire et un pilote fermé.

## 5. Mesures de succès et garde-fous

| Chantier | Mesure produit | Garde-fou à suivre |
|---|---|---|
| O1 saisie naturelle | taux de brouillons confirmés, corrections avant confirmation, abandon | aucune action exécutée sans confirmation ; échantillon de qualité sans texte inutilement conservé |
| O3 agenda/ICS | rendez-vous visibles dans l’agenda, abonnements actifs, révocations réussies | test d’accès après retrait d’un membre ; aucune description sensible par défaut |
| O5 push | taux d’opt-in, ouverture utile, désactivations par catégorie | plafond par utilisateur/projet/jour, heures calmes, reçu d’envoi et jeton invalidé |
| O6 hors-ligne | opérations rejouées avec succès, temps de reprise, conflits résolus | pas de suppression/invitation rejouée sans protection ; purge du cache à déconnexion |
| O7 passkeys | connexions passkey réussies, récupération sans support | toujours conserver un parcours de secours et journaliser les changements de méthode |
| O8 accessibilité | scénarios clavier/lecteur d’écran réussis | revue manuelle, pas d’allégation de conformité sans validation indépendante |

## 6. Sources primaires retenues

- OpenAI — [New tools for building agents](https://openai.com/index/new-tools-for-building-agents/), 11 mars 2025.
- OpenAI — [Introducing GPT-5 for developers](https://openai.com/index/introducing-gpt-5-for-developers/), 7 août 2025.
- Google Calendar API — [Synchronize resources efficiently](https://developers.google.com/workspace/calendar/api/guides/sync), consulté le 19 septembre 2026.
- Microsoft Graph — [Get incremental changes to events in a calendar view](https://learn.microsoft.com/en-us/graph/delta-query-events), consulté le 19 septembre 2026.
- Google Calendar API — [Release notes](https://developers.google.com/workspace/calendar/release-notes), 22 avril 2026 pour l’annonce MCP Calendar.
- Google Calendar API — [Freebusy query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), consulté le 19 septembre 2026.
- Microsoft Graph — [findMeetingTimes](https://learn.microsoft.com/en-us/graph/api/user-findmeetingtimes?view=graph-rest-1.0), consulté le 19 septembre 2026.
- Expo — [Push notifications overview](https://docs.expo.dev/push-notifications/overview/), mise à jour le 6 juin 2025.
- Expo — [SDK 54](https://expo.dev/changelog/sdk-54), 10 septembre 2025.
- Expo — [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), consulté le 19 septembre 2026.
- W3C — [WebAuthn Level 3](https://www.w3.org/TR/webauthn/), recommandation du 25 août 2026.
- IETF — [RFC 9700, OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/), janvier 2025.
- W3C — [WCAG 2.2](https://www.w3.org/TR/wcag/), révision du 12 décembre 2024.
- AccessibleEU / Commission européenne — [EAA enters into force](https://accessible-eu-centre.ec.europa.eu/content-corner/news/new-era-inclusion-begins-eaa-enters-force-2025-06-27_en), 27 juin 2025.
- EDPB — [Opinion on AI models](https://www.edpb.europa.eu/news/edpb-opinion-on-ai-models-gdpr-principles-support-responsible-ai_en), 18 décembre 2024.
- Model Context Protocol — [Update on the next MCP protocol release](https://blog.modelcontextprotocol.io/posts/2025-09-26-mcp-next-version-update/), 26 septembre 2025.
- Google Workspace — [Calendar MCP server configuration](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), Developer Preview, consulté le 19 septembre 2026.

## Conclusion

Les cinq meilleures opportunités sont : (1) une saisie naturelle limitée aux brouillons confirmés, (2) un agenda Planii réellement unifié avec export ICS privé, (3) des push mobiles réglés pour l’attention plutôt que le volume, (4) une outbox hors-ligne avec conflits explicites, et (5) les passkeys accompagnées d’un audit OAuth. L’accessibilité WCAG 2.2 AA doit traverser ces cinq chantiers, tandis que la lecture de disponibilités Google/Microsoft vient une fois l’agenda canonique et la gestion de consentement en place. MCP reste une veille, pas un engagement produit immédiat.
