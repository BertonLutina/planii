# Veille produit Planii — 21 septembre 2026

**Fenêtre différentielle consolidée :** du `2026-09-20T23:15:49.711Z` au `2026-09-21T11:07:00Z` (21 septembre 2026, 01:15:49–13:07:00 CEST). Le dernier passage couvre strictement `2026-09-21T10:12:00.794Z`–`2026-09-21T11:07:00Z`; les périodes antérieures sont conservées ci-dessous pour la continuité quotidienne.

## Résumé exécutif

Deux commits applicatifs significatifs ont été publiés depuis la dernière exécution. [`82a5797`](https://github.com/BertonLutina/planii/commit/82a5797b1988292aedc07360092872357f604da9) clôt techniquement PLANI-002 et fait progresser PLANI-013 avec le cache PWA privé supprimé, des contrôles WCAG automatisés et des alternatives clavier. [`368ecf6`](https://github.com/BertonLutina/planii/commit/368ecf6e24c5002e8c7635bc953ef70ab4abef09) ajoute la demande et le changement de mot de passe sur l'API, le web et le mobile. `HEAD` local et distant vaut désormais `368ecf6`.

Le reset n'est pas livrable comme fonctionnalité sécurisée complète : le jeton est haché, expire après une heure et résiste au rejeu séquentiel, mais sa lecture, la modification du mot de passe et son marquage restent trois opérations distinctes. Il manque encore la consommation transactionnelle concurrente, l'invalidation des JWT et WebSockets existants, la limitation par compte, la purge, les tests PostgreSQL actifs et le deep link mobile réel. PLANI-017 reste donc `IN_PROGRESS`; PLANI-018 et PLANI-019 restent `BLOCKED` sur leurs dépendances, même si une première implémentation est maintenant commitée.

La CI backend du nouveau `HEAD` est verte, mais le dernier contrôle local montre encore 10 tests passés et 12 tests PostgreSQL ignorés; cette CI ne clôt pas PLANI-001 ni PLANI-017. Depuis la dernière exécution, Claude Code a poursuivi PLANI-013 dans l'arbre local : couverture axe étendue, contrastes et libellés de modales internationalisés. Le build Vite/PWA et **28/28 tests Playwright** passent. PLANI-013 reste `IN_PROGRESS`, car les revues manuelles VoiceOver/NVDA exigées par ses critères ne sont pas réalisées. Aucun code applicatif n'a été modifié par cette automatisation.

Deux nouveaux runs de déploiement Hostinger ont échoué après les commits. Les logs officiels confirment toujours `missing server host`, des entrées SSH vides et l'option supprimée `script_stop`. PLANI-026 couvre déjà exactement cet incident et demeure bloqué sur PLANI-030; aucun doublon n'est créé.

La veille officielle primaire ne révèle aucun signal net-nouveau dans la dernière fenêtre : aucune release de la stack, aucun avis npm publié ou modifié et aucune publication produit, accessibilité, RGPD/AI Act ou coût précisément datée après la borne. Un communiqué EDPB porte la métadonnée officielle `2026-09-21T12:00:00Z`, postérieure à la clôture de ce passage; il est donc exclu et devra être recontrôlé au prochain passage. Aucun nouveau ticket n'est justifié.

## État observé du produit

### Dépôt et changements récents

- `HEAD` local et `origin/main` sont alignés sur `368ecf6e24c5002e8c7635bc953ef70ab4abef09`; 55 fichiers applicatifs ou d'outillage ont changé depuis `772c136`, pour 3 553 insertions et 187 suppressions.
- [`82a5797`](https://github.com/BertonLutina/planii/commit/82a5797b1988292aedc07360092872357f604da9), publié à `2026-09-20T23:40:29Z`, supprime le cache runtime API, ajoute la purge et les tests PWA, puis apporte le socle automatisé WCAG 2.2 AA. PLANI-002 reste `DONE`; PLANI-013 reste `IN_PROGRESS` jusqu'aux revues VoiceOver/NVDA et aux écarts manuels documentés.
- [`368ecf6`](https://github.com/BertonLutina/planii/commit/368ecf6e24c5002e8c7635bc953ef70ab4abef09), publié à `2026-09-20T23:57:09Z`, ajoute la migration `password_reset_tokens`, les routes API et les interfaces web/mobile. Le commit traverse les trois surfaces, mais le backlog conserve le parent partagé PLANI-017 et les sous-tickets clients séparés PLANI-018/019 afin qu'aucun agent ne reprenne les mêmes fichiers.
- Depuis `2026-09-21T10:12:00.794Z`, l'arbre local porte le chantier web non commité de PLANI-013 : 70 insertions et 8 suppressions applicatives dans `planii-vite/`, plus la checklist associée. Les changements couvrent des tests axe supplémentaires, les libellés i18n de `Modal`/`TaskDrawer` et deux corrections de contraste. L'automatisation les a seulement audités et n'a modifié aucun fichier applicatif.

### Vérifications fraîches

- Web : `npm run test:e2e` réussi le 21 septembre à 13:06 CEST, build Vite/PWA compris; **28/28 tests Playwright passent**. Le bundle d'entrée atteint 998,44 kB minifié, dette déjà couverte par PLANI-007. Le premier lancement en bac à sable a échoué uniquement sur l'ouverture locale de `::1:4173`; la relance autorisée hors bac à sable est entièrement verte.
- API : `npm run build` réussi; `npm test` rapporte **10 tests passés et 12 ignorés**. Les cinq tests d'authentification dépendant de PostgreSQL, dont le reset, sont ignorés sans base; la réussite locale et la [CI backend](https://github.com/BertonLutina/planii/actions/runs/35546125508) ne prouvent donc ni atomicité ni concurrence.
- Mobile : `npm run typecheck` réussi. Aucun development build iOS/Android, deep link froid/chaud ou essai VoiceOver/TalkBack n'a été exécuté.
- Les artefacts de build et de test sont ignorés par Git; aucun code applicatif n'a été écrit par cette automatisation.

### Incidents, dettes et tickets ouverts

- Les runs Hostinger [`35545347622`](https://github.com/BertonLutina/planii/actions/runs/35545347622) et [`35546125659`](https://github.com/BertonLutina/planii/actions/runs/35546125659) échouent respectivement après les deux commits. Le second confirme des entrées `host`, `username`, `key` et `fingerprint` vides, `missing server host` et l'option inattendue `script_stop`. GitHub expose toujours 0 déploiement, 0 issue ouverte, 0 PR ouverte et aucun nom de secret Actions au niveau du dépôt.
- PLANI-017 reste `IN_PROGRESS` : `findValid`, `setPasswordHash` puis `markUsed` sont séparés; un double appel concurrent peut franchir la lecture avant consommation. Les JWT de 30 jours ne portent aucune version de session et le middleware ne peut pas les révoquer après reset.
- PLANI-018 reste `BLOCKED` sur PLANI-017 : le web retire le jeton de l'URL au chargement et fournit le formulaire, mais aucun scénario Playwright de demande, expiration, rejeu, purge de session et changement de compte n'existe.
- PLANI-019 reste `BLOCKED` sur PLANI-017 et PLANI-024 : l'écran Expo existe et le schéma `planii` est déclaré, mais l'e-mail backend pointe uniquement vers l'URL web; aucun Universal Link/App Link, repli validé, purge de `SecureStore` ou essai appareil ne prouve le parcours mobile.
- PLANI-026 reste `BLOCKED` sur PLANI-030. Réparer seulement les secrets SSH sans les gates, la CSP/Jitsi, l'empreinte serveur et le rollback ne satisferait pas ses critères.
- Les audits npm ont été rafraîchis à 13:03 CEST : **9 alertes web** (7 hautes), **30 mobiles** (13 hautes) et **14 backend** (8 hautes), aucune critique. Les comptes sont inchangés et restent couverts par PLANI-024 et PLANI-027 à PLANI-029; aucun doublon n'est créé.

## Recherches et sources officielles

| Domaine | Source primaire officielle, datée et liée | Conclusion différentielle |
|---|---|---|
| Commits Planii | [`82a5797`](https://github.com/BertonLutina/planii/commit/82a5797b1988292aedc07360092872357f604da9), 20 septembre 2026 à 23:40:29Z; [`368ecf6`](https://github.com/BertonLutina/planii/commit/368ecf6e24c5002e8c7635bc953ef70ab4abef09), 23:57:09Z | Deux changements applicatifs réels à réconcilier, sans nouveau ticket. |
| CI et déploiement | [Backend CI réussie](https://github.com/BertonLutina/planii/actions/runs/35546125508), 20 septembre 2026; [déploiement 1](https://github.com/BertonLutina/planii/actions/runs/35545347622) et [déploiement 2](https://github.com/BertonLutina/planii/actions/runs/35546125659), tous deux en échec | L'incident Hostinger se répète; PLANI-026 reste nécessaire. |
| Releases de stack | Releases officielles de [React](https://github.com/facebook/react/releases), [Vite](https://github.com/vitejs/vite/releases), [Expo](https://expo.dev/changelog), [React Native](https://github.com/facebook/react-native/releases), [Express](https://github.com/expressjs/express/releases), [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa/releases), [Playwright](https://github.com/microsoft/playwright/releases), [TypeScript](https://github.com/microsoft/TypeScript/releases) et [Vitest](https://github.com/vitest-dev/vitest/releases), contrôlées à 11:06Z | Aucune release dans `2026-09-21T10:12:00.794Z`–`2026-09-21T11:07:00Z`; Expo SDK 58 reste bêta et React Native 0.88 reste RC. |
| Dépendances npm | [Registre npm officiel](https://registry.npmjs.org/), audits des trois lockfiles à 11:03Z | Comptes inchangés : web 9, mobile 30, backend 14, aucune critique. PLANI-024 et PLANI-027–029 couvrent déjà les corrections. |
| Avis de sécurité | [GitHub Advisory Database, npm, publiés dans la fenêtre](https://api.github.com/advisories?ecosystem=npm&published=2026-09-21T10%3A12%3A00Z..2026-09-21T11%3A07%3A00Z&per_page=100) et [avis modifiés dans la fenêtre](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-21T10%3A12%3A00Z..2026-09-21T11%3A07%3A00Z&per_page=100), contrôlés à 11:06Z | Les deux requêtes officielles renvoient `[]`; aucun avis npm net-nouveau. |
| PostgreSQL | [Releases PostgreSQL](https://www.postgresql.org/docs/release/) et [annonces officielles](https://www.postgresql.org/about/press/) | Aucune annonce nouvelle; PLANI-025 reste suffisant. |
| Collaboration | [Google Workspace Updates](https://workspaceupdates.googleblog.com/2026/), [Microsoft Planner Blog](https://techcommunity.microsoft.com/category/planner/blog/plannerblog), [Notion Releases](https://www.notion.com/releases), [Jira Launch Notes](https://jirareleases.atlassian.com/) et [Asana Announcements](https://forum.asana.com/c/forum-en/news/18) | Les dernières publications visibles sont antérieures à la borne; aucune opportunité nouvelle. |
| RGPD / AI Act | [EDPB News](https://www.edpb.europa.eu/news_en) et [Commission européenne — Digital Strategy News](https://digital-strategy.ec.europa.eu/en/news) | Dernières entrées visibles les 11 et 18 septembre 2026; aucun changement dans la fenêtre. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | Dernière entrée visible le 10 septembre 2026; PLANI-013/016 restent la cible. |
| Coûts | [Expo Pricing](https://expo.dev/pricing) et [Hostinger Pricing](https://www.hostinger.com/pricing), contrôlés le 21 septembre 2026 | Pages sans historique horodaté; aucune variation ne peut être attestée. |
| RGPD — candidat hors fenêtre | [EDPB — harmonisation de la méthodologie d'amende et lignes directrices DSA/RGPD](https://www.edpb.europa.eu/news/edpb-harmonises-fining-methodology-and-adopts-final-dsa-gdpr-guidelines_en), métadonnée officielle du 21 septembre 2026 à 12:00Z | Publication postérieure à la clôture 11:07Z; exclue de la décision du jour et à recontrôler au prochain passage. |

Les pages sans historique daté ont seulement servi de contrôle; leur date de consultation n'est pas assimilée à une date de publication.

### Signaux récents hors fenêtre, toujours pertinents mais non actionnables aujourd'hui

- [Google Calendar — interopérabilité Teams, Zoom et Webex](https://workspaceupdates.googleblog.com/2026/08/improving-google-calendars-interoperability-with-third-party-video-conferencing-solutions.html), 27 août 2026 : piste crédible pour des liens de réunion structurés, mais elle doit d'abord être validée et dédupliquée de PLANI-009.
- [Microsoft Planner — modèles réutilisables](https://techcommunity.microsoft.com/blog/plannerblog/create-reusable-plans-faster-with-custom-templates-in-planner/4520207), 14 juillet 2026 : intérêt potentiel pour les projets récurrents, sans preuve utilisateur Planii suffisante pour un ticket.
- [Google Workspace — planification inter-app avec aperçu et confirmation](https://workspaceupdates.googleblog.com/2026/09/create-content-schedule-events-and-coordinate-tasks-across-Workspace-regardless-of-what-app-you-are-in.html), 9 septembre 2026 : confirme la direction de PLANI-014/022/023, sans doublon.
- [Expo SDK 58 Beta](https://expo.dev/changelog/sdk-58-beta), 15 septembre 2026 : React Native 0.88 reste RC; PLANI-024 doit cibler Expo SDK 57 stable.
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3), 9 septembre 2026 : Trusted Types mérite une future vérification, mais ne doit pas être ajouté opportunistement à PLANI-013/030.
- [W3C WAI — WCAG 3 Introduction](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/), septembre 2026 : le brouillon reste exploratoire; PLANI-013/016 demeurent ciblés sur WCAG 2.2 AA.

## Opportunités évaluées

| Opportunité | Valeur | Faisabilité dans Planii | Risques / coût | Décision |
|---|---|---|---|---|
| Considérer le reset comme livré | Récupération de compte visible sur les trois surfaces | Les écrans et routes existent déjà | Double consommation concurrente, JWT encore valides, lien mobile non prouvé, faux vert CI | Rejeté; terminer PLANI-001 puis PLANI-017, 018 et 019. |
| Réparer rapidement le déploiement avec trois secrets | Rétablir un chemin vers la production | Techniquement simple à court terme | Déploiement sans gates, action non épinglée, absence d'empreinte/rollback et Jitsi incompatible avec le durcissement | Rejeté; exécuter PLANI-026 après PLANI-030. |
| Créer un ticket pour les deux échecs Hostinger | Visibilité de l'incident | PLANI-026 couvre déjà cause, sécurité, tests et rollback | Doublon et priorités divergentes | Aucun ticket; actualiser les preuves de PLANI-026. |
| Créer un ticket issu de la veille web | Aucun signal net-nouveau | Les opportunités récentes sont déjà couvertes ou en découverte | Dispersion et effets de mode | Aucun ticket. |
| Clôturer PLANI-013 grâce aux 28 tests | Automatisation robuste et couverture axe élargie | Le socle web compile et les tests passent | VoiceOver/NVDA restent non exécutés; l'iframe Jitsi tierce est simulée | Conserver `IN_PROGRESS`; ne pas débloquer PLANI-030 avant la revue manuelle exigée. |

## Faisabilité, risques et recommandation

- **Web React/Vite/PWA :** la base est stable (build et 28/28), mais l'automatisation axe ne remplace pas VoiceOver/NVDA. PLANI-018 doit attendre le contrat sécurisé PLANI-017 et ajouter ses scénarios Playwright. Claude Code doit finir PLANI-013 avant PLANI-030 pour éviter un conflit sur `Meeting.tsx`.
- **Mobile Expo/React Native :** PLANI-024 reste la première action Cursor AI. PLANI-019 devra ensuite utiliser `.cursor/rules/planii-mobile.mdc`, charger `expo:expo-overview` en premier, puis les skills Expo et design imposés; le schéma personnalisé seul ne vaut pas Universal Link/App Link testé.
- **API Express/PostgreSQL :** PLANI-001 devient le premier ticket backend prêt, car les 12 skips rendent les nouvelles garanties de reset invérifiables. PLANI-017 doit enchaîner avec une transaction, une révocation de session commune à l'API/WebSocket, une limite par compte/IP et des tests de concurrence.
- **Sécurité et RGPD :** les URLs complètes de reset ne doivent apparaître ni dans les logs, ni la télémétrie, ni les referrers. Les journaux de sécurité doivent rester minimaux et sans adresse complète, token ou contenu métier.
- **Accessibilité :** les preuves axe et clavier sont utiles mais ne remplacent pas VoiceOver/NVDA ni, sur mobile, VoiceOver/TalkBack sur appareils réels.
- **Coût et dépendances :** aucun coût nouveau n'est établi. Les audits npm frais sont inchangés et PLANI-024/027/028/029 restent le chemin unique de remédiation.

**Recommandation :** ne créer aucun ticket et ne déclarer aucun ticket supplémentaire `DONE`. Conserver les 30 tickets, réordonner le travail backend pour rendre les tests PostgreSQL obligatoires avant de sécuriser le reset déjà fusionné, puis reprendre l'assainissement des dépendances. Les sous-tickets web et mobile de reset restent bloqués jusqu'à la fermeture de leur parent et de leurs dépendances.

## Plan du jour

### Cursor AI - mobile

1. **Prêt à prendre : PLANI-024** — monter Expo SDK 54 vers 57 stable, sans adopter SDK 58 bêta.
2. **Bloqué : PLANI-019** — finaliser et tester le reset mobile après PLANI-017 et PLANI-024; ne pas reprendre le backend ou le web.
3. **Bloqué : PLANI-029** — sécuriser l'import tableur après PLANI-027 et PLANI-024.
4. **Bloqués : PLANI-016, PLANI-021 et PLANI-023** — attendre leurs dépendances existantes.

### Claude Code - web

1. **En cours : PLANI-013** — exécuter et documenter VoiceOver/NVDA sur Auth, Projets, Agenda, Tâche et Import; les libellés restants sont corrigés et les 28 tests automatisés sont verts.
2. **Prêt ensuite : PLANI-030** — rendre Jitsi compatible CSP/Permissions-Policy dès que PLANI-013 libère `Meeting.tsx`.
3. **Bloqué : PLANI-018** — finaliser et tester le reset web après PLANI-017; ne pas modifier les fichiers backend ou mobile.
4. **Bloqués : PLANI-028 et PLANI-007** — attendre respectivement PLANI-027 et PLANI-004.

### Partagé/backend

1. **Prêt à prendre : PLANI-001** — rendre PostgreSQL de test obligatoire et supprimer les faux verts à 12 tests ignorés.
2. **En cours, à reprendre immédiatement après PLANI-001 : PLANI-017** — rendre le reset atomique, révoquer API/WebSocket, limiter, purger et tester concurrence/expiration/rejeu.
3. **Prêt ensuite : PLANI-027** — assainir les dépendances API et fixer le contrat partagé d'import; éviter un travail parallèle sur le lockfile/CI backend.
4. **Prêt à prendre sans chevauchement : PLANI-025** — vérifier PostgreSQL de production et sa restauration.
5. **Bloqué : PLANI-026** — attendre PLANI-030, puis rétablir le déploiement avec secrets, empreinte, gates et rollback.
6. **Puis : PLANI-009** — unifier l'agenda et fournir le flux ICS privé après PLANI-001 et PLANI-002.
