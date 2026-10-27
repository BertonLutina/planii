# Veille produit Planii — 20 septembre 2026

**Fenêtre différentielle de cette exécution :** du `2026-09-20T19:00:38.526Z` au `2026-09-20T20:04:22Z` (21:00:38–22:04:22 CEST). La veille officielle reprend à `2026-09-20T19:02:12Z`, dernière borne déjà couverte ; le chevauchement initial garantit que la coupure fournie n'est pas perdue.

## Résumé exécutif

Le dépôt applicatif n'a pas changé après la coupure : `HEAD` reste `772c136` et le diff suivi reste à 784 insertions et 187 suppressions. Aucun fichier source applicatif n'est plus récent que la coupure ; les seuls changements de cette exécution concernent les documents de veille. Les preuves applicatives du contrôle précédent restent donc valides sans être rejouées. Aucun code applicatif n'a été modifié par cette automatisation.

GitHub confirme toujours 0 issue ouverte, 0 PR ouverte, 0 déploiement et aucun secret Actions déclaré. Le dernier workflow `Deploy to Hostinger VPS` reste l'échec du 17 août 2026. Les requêtes officielles GitHub Advisory Database npm `published` et `modified`, bornées à `2026-09-20T19:02:12Z`–`2026-09-20T20:04:22Z`, renvoient `[]`; aucun signal stack, collaboration, accessibilité, RGPD/AI Act ou coût ne justifie un nouveau ticket.

Le backlog demeure à 30 tickets. PLANI-030, créé au passage précédent pour le conflit Jitsi/CSP/Permissions-Policy, reste justifié et bloque PLANI-026. Les priorités restent : PLANI-024 pour Cursor AI, PLANI-013 pour Claude Code et PLANI-027 pour le backend partagé.

## État observé du produit

### Dépôt, changements et preuves

- `HEAD` reste `772c13642595c561a47ddeefe23cc1a20187d95a`, sans commit depuis le 18 août 2026.
- Aucun fichier source applicatif n'a changé après la coupure de 21:00:38 CEST ; le diff suivi reste à 784 insertions et 187 suppressions.
- Le dernier contrôle web reste celui de 19:05 CEST : build Vite/PWA réussi, 2 135 modules, 25 entrées précachées et 23/23 tests Playwright verts. Il n'est pas rejoué en l'absence de changement source.
- PLANI-013 reste `IN_PROGRESS` : VoiceOver + Safari et NVDA + Firefox ne sont pas documentés ; Admin, invitation/jonction, mentions légales, rendez-vous/voix, sondages et équipe restent partiellement ou totalement hors axe ; trois libellés de modale restent codés en français.
- PLANI-002 reste `DONE`, PLANI-017 reste `IN_PROGRESS`, PLANI-024 reste le premier ticket mobile prêt et PLANI-027 le premier ticket partagé/backend prêt.

### Incidents, tickets et dette

- GitHub confirme 0 issue, 0 PR, 0 déploiement et aucun secret Actions. Le dernier workflow [`Deploy to Hostinger VPS`](https://github.com/BertonLutina/planii/actions/runs/32055215709) reste en échec depuis le 17 août 2026.
- `Meeting.tsx` injecte `https://meet.jit.si/external_api.js` puis un iframe Jitsi. La documentation Jitsi, mise à jour le **15 septembre 2026**, décrit précisément ce chargement et la création de `JitsiMeetExternalAPI`.
- La configuration Nginx versionnée ne permet ni le script ni l'iframe distants ; sa Permissions-Policy interdit la caméra et ne délègue pas le micro à l'iframe. Le Dockerfile copie cette configuration, donc le défaut est sur le chemin de déploiement réel.
- Le site public répond 200 mais sans les en-têtes de sécurité versionnés. Cette observation ne prouve pas que Jitsi fonctionne de bout en bout ; elle prouve que la production actuelle n'applique pas la politique attendue au point d'entrée public.
- Les dettes de dépendances détectées au passage précédent restent suivies par PLANI-027 à PLANI-029 ; aucun nouvel avis n'est apparu dans la fenêtre.

## Recherches et sources officielles

| Domaine | Source primaire officielle, datée et liée | Conclusion différentielle |
|---|---|---|
| Avis npm publiés | [GitHub Advisory Database — `published`](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100), contrôlée le 20 septembre 2026 à 20:04:22Z | Réponse `[]` ; aucun avis npm publié dans la fenêtre. |
| Avis npm modifiés | [GitHub Advisory Database — `modified`](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100), même contrôle | Réponse `[]` ; aucun avis révisé. |
| Intégration Jitsi | [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/), mise à jour le **15 septembre 2026** | L'intégration officielle charge `external_api.js` depuis le domaine Jitsi puis crée un iframe via `JitsiMeetExternalAPI`, comme Planii. |
| CSP | [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/#directives), Working Draft du **16 septembre 2026** | `script-src` et `frame-src` gouvernent les scripts et cadres autorisés ; la politique Planii versionnée ne permet pas `meet.jit.si`. |
| Caméra et microphone | [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy-1/#examples), Working Draft du **18 juin 2026** | Caméra et micro sont désactivés par défaut dans les cadres cross-origin sauf délégation ; `camera=()` et `microphone=(self)` empêchent cette délégation à Jitsi. |
| Stack, collaboration, accessibilité, RGPD/IA et coûts | [React](https://github.com/facebook/react/releases), [Vite](https://github.com/vitejs/vite/releases), [Express](https://github.com/expressjs/express/releases), [Expo](https://expo.dev/changelog), [React Native](https://github.com/facebook/react-native/releases), [PostgreSQL](https://www.postgresql.org/about/newsarchive/security/), [Google Workspace](https://workspaceupdates.googleblog.com/), [W3C WAI](https://www.w3.org/WAI/news/), [EDPB](https://www.edpb.europa.eu/news_en), [Commission européenne](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence), pages contrôlées le **20 septembre 2026** | Aucun signal nouveau précisément daté dans la fenêtre ; aucune modification de cible, d'obligation ou de coût démontrée. |

Les pages de prix et certains changelogs n'offrent pas d'historique horodaté à la minute. La date de consultation n'est pas assimilée à une date de publication.

## Opportunités évaluées

| Opportunité | Valeur | Faisabilité dans Planii | Risques / coût | Décision |
|---|---|---|---|---|
| Rendre Jitsi compatible avec la CSP et la Permissions-Policy | Préserve les réunions au prochain déploiement tout en rétablissant des en-têtes restrictifs | Changement web circonscrit à `nginx.conf`, au chargement Jitsi et aux tests de production simulée | Autoriser trop de domaines, fuite vers un tiers, média non fonctionnel, dépendance au service public | **Créer PLANI-030, P0/M, bloqué sur PLANI-013** |
| Clore PLANI-013 sur les seuls tests axe | Réduit artificiellement le travail restant | 23 tests sont verts | Faux sentiment de conformité sans lecteur d'écran manuel | Rejeté ; conserver `IN_PROGRESS` |
| Ajouter une nouveauté calendrier/réunion | Aucun signal officiel nouveau | Besoins existants déjà couverts | OAuth, RGPD et coût fournisseur | Aucun ticket |
| Relancer toutes les dépendances automatiquement | Gain apparent | Techniquement possible | Ruptures majeures et exceptions non analysées | Rejeté ; garder PLANI-027 à 029 |

## Faisabilité, sécurité, RGPD, accessibilité, dépendances et coût

- **Web React/Vite/PWA :** PLANI-030 est faisable sans backend. Il doit conserver une CSP restrictive, éviter les jokers et les scripts inline supplémentaires, charger le tiers uniquement lors de l'ouverture d'une réunion et fournir un échec accessible si Jitsi est indisponible. Il attend PLANI-013 afin que Claude Code ne modifie pas simultanément `Meeting.tsx`.
- **Mobile Expo/React Native :** aucun changement dans cette exécution. PLANI-024 reste prêt ; PLANI-029 attend toujours PLANI-027 et PLANI-024 avec les skills imposés.
- **API Express/PostgreSQL :** aucune source API n'a changé après la coupure. PLANI-017 reste non livrable tant que PLANI-001 n'active pas les tests PostgreSQL.
- **Sécurité :** une CSP compatible ne signifie pas large. Les origines Jitsi nécessaires doivent être mesurées dans une build servie par Nginx, puis ajoutées directive par directive ; le test doit échouer sur toute violation inattendue.
- **RGPD :** avant le chargement du tiers, l'utilisateur doit comprendre que la réunion utilise Jitsi ; finalités, catégories de données, rôle du fournisseur, région, sous-traitance et conservation doivent être documentés. Une revue juridique décide si consentement ou autre base légale est approprié ; le ticket ne présume pas cette conclusion.
- **Accessibilité :** l'iframe nouvellement titrée améliore le nom accessible, mais un parcours clavier/lecteur d'écran complet et un message d'erreur annoncé restent requis. Les 23 tests axe ne suffisent pas à déclarer la conformité.
- **Dépendances et coût :** aucun abonnement nouveau n'est décidé. PLANI-030 doit confirmer les conditions et limites du service Jitsi retenu ou chiffrer une alternative avant tout engagement.

## Contrôle différentiel à 22:04 CEST

- [GitHub Advisory Database — avis npm publiés](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100) et [avis npm modifiés](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100) : réponses `[]` contrôlées le 20 septembre 2026 à 22:04 CEST.
- [React releases](https://github.com/react/react/releases), [Vite releases](https://github.com/vitejs/vite/releases), [Expo changelog](https://expo.dev/changelog), [React Native releases](https://github.com/react/react-native/releases) et [PostgreSQL security archive](https://www.postgresql.org/about/newsarchive/security/) : aucune publication appartenant à la fenêtre ; les dernières entrées restent antérieures à la coupure.
- [Google Workspace Updates](https://workspaceupdates.googleblog.com/) reste au récapitulatif du 18 septembre 2026, [W3C WAI News](https://www.w3.org/WAI/news/) au brouillon WCAG 3 du 10 septembre 2026 et [EDPB News](https://www.edpb.europa.eu/news_en) sans texte nouveau applicable dans la fenêtre.
- Les pages sans historique fin de publication ou de prix ont été relues sans transformer leur date de consultation en preuve d'un changement.

**Décision :** ne créer, supprimer, requalifier ni réordonner aucun ticket. Conserver PLANI-030 et les dépendances établies au passage précédent.

## Recommandation

Terminer d'abord la revue manuelle de PLANI-013, puis prendre PLANI-030 avant de valider PLANI-026 en production. Garder PLANI-027 en tête de la file partagée/backend et PLANI-024 en tête de la file mobile. Ne pas clore PLANI-013 sur la seule réussite automatisée et ne pas déployer la configuration Nginx actuelle sans test de réunion sous les en-têtes réels.

## Plan du jour

### Cursor AI - mobile

1. **Prêt à prendre : PLANI-024** — monter Expo SDK 54 vers 57 stable.
2. **Bloqué : PLANI-029** — sécuriser l'import tableur après PLANI-027 et PLANI-024.
3. **Bloqués : PLANI-016 et PLANI-019** — attendre leurs dépendances existantes.

### Claude Code - web

1. **En cours : PLANI-013** — réaliser et consigner VoiceOver/NVDA, finir les écrans non couverts et internationaliser les libellés de modale.
2. **Prêt ensuite : PLANI-030** — corriger et tester l'intégration Jitsi sous CSP/Permissions-Policy dès la clôture de PLANI-013.
3. **Bloqués : PLANI-028 et PLANI-018** — attendre respectivement PLANI-027 et PLANI-017.

### Partagé/backend

1. **Prêt à prendre : PLANI-027** — remédier les dépendances API exposées et fixer le contrat partagé d'import sécurisé.
2. **Prêts à prendre : PLANI-025 et PLANI-001** — vérifier PostgreSQL de production et rendre PostgreSQL de test obligatoire.
3. **Bloqué pour validation de production : PLANI-026** — attendre PLANI-030 avant de déployer le web ; le travail préparatoire workflow peut être étudié sans toucher aux fichiers web.
4. **En cours : PLANI-017** — terminer atomicité, invalidation de session, rate limit et tests après PLANI-001.
