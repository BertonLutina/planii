# Planii — veille produit et technique du 19 septembre 2026

**Périmètre :** application collaborative de planification, projets, tâches, calendrier et réunions ; web React/Vite/PWA, mobile Expo/React Native, API Express/PostgreSQL.
**Méthode :** comparaison avec `docs/research/2026-09-19-planii-opportunites-produit.md`, `docs/research/2026-09-19-planii-veille-sources.md` et `docs/backlog/cursor-backlog.md`, puis consultation de sources primaires officielles uniquement. Cette note ne constitue pas un avis juridique.

## Résumé exécutif

La veille ne justifie **aucune nouvelle fonctionnalité autonome** au-delà des opportunités déjà identifiées. L'audit différentiel, l'état GitHub et les sources officielles imposent toutefois cinq changements significatifs dans le backlog, désormais normalisé jusqu'à PLANI-026 :

1. **Le mobile doit sortir d’Expo SDK 54 vers la dernière version stable, SDK 57, avant de lancer de nouveaux chantiers natifs.** Expo indique que SDK 54 ne reçoit les correctifs critiques que jusqu’à la prochaine version, attendue en septembre ou octobre 2026 ; SDK 58 est encore en bêta depuis le 15 septembre. Le dépôt utilise en outre `react-native-reanimated` et `react-native-worklets`, précisément concernés par une régression mémoire corrigée dans SDK 57 / React Native 0.86.3. Cible prudente : `expo >= 57.0.17`, en passant et testant chaque SDK successivement, sans adopter SDK 58 bêta. Sources : [Expo SDK 57, 30 juin et mise à jour du 27 août 2026](https://expo.dev/changelog/sdk-57) ; [guide officiel de montée de version Expo, consulté le 19 septembre 2026](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) ; [Expo SDK 58 bêta, 15 septembre 2026](https://expo.dev/changelog/sdk-58-beta).
2. **Le reset de mot de passe en cours ne doit pas être livré avant PLANI-017.** Le jeton est actuellement lu puis marqué comme utilisé dans des requêtes séparées, donc deux appels concurrents peuvent passer avant la consommation. Le changement de mot de passe ne révoque pas non plus les JWT existants, valables 30 jours. PLANI-017 porte le correctif backend partagé; PLANI-018 et PLANI-019 séparent strictement les finitions web et mobile.
3. **PLANI-014 doit intégrer explicitement la transparence AI Act.** Les lignes directrices de la Commission du 20 juillet 2026 précisent les obligations de transparence applicables depuis le 2 août 2026. Pour un assistant de saisie ou de réunion, l’utilisateur doit savoir clairement qu’il interagit avec une IA, au plus tard lors de la première interaction, dans un format accessible. La qualification exacte de Planii comme fournisseur ou déployeur et les exceptions applicables doivent être validées juridiquement. Sources : [Commission européenne, lignes directrices Article 50, 20 juillet 2026](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems) ; [Règlement (UE) 2024/1689, Article 50, version consolidée au 27 juillet 2026](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng).
4. **La version PostgreSQL de production doit être vérifiée et corrigée avant de rester implicite.** Le dépôt connecte l'API à un réseau PostgreSQL externe sans pinner ni afficher la version serveur. La publication officielle du 13 août 2026 corrige 28 vulnérabilités dans les versions maintenues; PostgreSQL 14 sort du support le 12 novembre 2026. PLANI-025 porte l'inventaire, la restauration testée et la mise à jour sans supposer que la production est vulnérable. Source : [PostgreSQL, versions 18.6, 17.11, 16.15, 15.19 et 14.24, 13 août 2026](https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/).
5. **Le déploiement Hostinger est actuellement inopérant et insuffisamment sécurisé.** Le dernier run du 17 août 2026 échoue avant toute connexion avec `missing server host`; la liste des secrets du dépôt est vide, ce qui concorde avec le comportement documenté de GitHub lorsqu'un secret référencé n'existe pas. Le workflow utilise aussi `script_stop`, supprimé de `appleboy/ssh-action`, référence l'action par tag mutable, part sans attendre les contrôles web/backend et peut terminer en succès malgré un endpoint public non-200. PLANI-026 porte la restauration et le durcissement du chemin de livraison. Sources : [run GitHub Actions 32055215709, 17 août 2026](https://github.com/BertonLutina/planii/actions/runs/32055215709) ; [GitHub, utilisation des secrets dans Actions, consulté le 19 septembre 2026](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) ; [GitHub, usage sécurisé des actions tierces, consulté le 19 septembre 2026](https://docs.github.com/en/actions/reference/security/secure-use) ; [appleboy/ssh-action, documentation officielle consultée le 19 septembre 2026](https://github.com/appleboy/ssh-action).

Trois autres signaux sont utiles mais ne méritent pas de nouveau ticket aujourd’hui : l’API calendrier Expo devenue stable peut compléter PLANI-009 côté mobile ; EAS Observe peut constituer la brique mobile de PLANI-008 après la montée de SDK ; React 19.3/Vite 8.3 justifient un chantier de maintenance web contrôlé, non une promesse produit. Les App Intents Siri d’Expo SDK 58 restent en alpha dans une bêta et sont écartés.

## État observé et contrôle des doublons

- Le dernier passage automatisé datait du 19 septembre 2026 à 16:00:56 UTC. Depuis ce point, `git log` ne montre aucun commit et la recherche par date de modification ne montre aucun fichier applicatif nouveau; seuls les documents de veille/backlog du passage précédent ont changé. Les builds déjà verts et les tests déjà constatés à 10 réussis / 12 ignorés n'ont donc pas été relancés.
- L'arbre reste sale avec 552 insertions et 135 suppressions suivies, plus des fichiers non suivis, principalement pour une réinitialisation de mot de passe backend/web/mobile. Ces modifications appartiennent au chantier utilisateur et n'ont pas été touchées.
- Le reset stocke bien un jeton haché et renvoie une réponse générique, mais sa consommation n'est pas atomique; les JWT signés ne portent qu'un `sub` et restent valides 30 jours après le changement de mot de passe. L'API fabrique en outre uniquement une URL web, alors que des écrans mobiles de reset sont déjà présents sans association de domaine testée.
- `planii-mobile/package.json` fixe Expo `~54.0.37`, React Native `0.81.5`, React `19.1.0`, Reanimated `~4.1.1` et Worklets `0.5.1`. `expo-calendar`, `expo-notifications`, `expo-observe` et `expo-sqlite` sont absents. L’application utilise déjà EAS, `expo-dev-client`, `expo-updates` et une `runtimeVersion` liée à la version applicative.
- `planii-vite/package.json` utilise React `18.3.1`, Vite `5.4.3` et `vite-plugin-pwa`. La CSP nginx existe mais n’impose pas encore Trusted Types. Le cache PWA privé reste déjà traité par PLANI-002.
- `planii-backend/package.json` utilise Express 4, PostgreSQL via `pg`, `ws`, Zod, JWT et OAuth. Les tickets existants couvrent déjà tests d’intégration, contrats, observabilité, agenda/ICS, idempotence, authentification et IA assistée. Les anciens tickets transversaux PLANI-004 et PLANI-014 ont été séparés en prérequis partagés et sous-tickets web/mobile, sans propriétaire concurrent sur un même fichier.
- Le guide de déploiement raccorde l'API à un PostgreSQL externe sur le VPS mais ne fixe pas la version serveur. Les migrations ne déclarent ni extension ni index GIN, `btree_gist` ou `ltree`; l'inventaire de production reste néanmoins indispensable avant d'exclure les étapes spéciales de mise à jour.
- La vue priorisée du backlog était correcte, mais les détails de PLANI-018, PLANI-020 et PLANI-022 ajoutaient par erreur une dépendance à PLANI-024, chantier mobile Expo. Cette dépendance croisée a été supprimée afin que les tickets web restent indépendants du runtime mobile.
- GitHub ne contient aucun ticket ouvert. Les vingt derniers runs montrent en revanche des échecs répétés du workflow `Deploy to Hostinger VPS`; le dernier run du 17 août échoue parce que l'hôte SSH est vide et aucun secret de dépôt n'est configuré. Le workflow n'attend pas la réussite de la CI backend, n'exécute aucun build web préalable et le script de déploiement ne renvoie pas d'échec lorsque le contrôle public reste différent de 200.
- Les sujets passkeys/OAuth, push, WCAG 2.2, permissions mobiles, agenda externe, hors-ligne, IA de saisie et compte rendu sont déjà documentés et/ou ticketés. Ils ne sont pas recréés ici.

## Recherches et sources officielles

### 1. Expo SDK 57 est la cible stable ; SDK 58 reste une bêta

Expo SDK 57, publié le 30 juin 2026, embarque React Native 0.86. Expo précise qu’Expo SDK 54, publié en septembre 2025 et utilisé par Planii, reçoit des correctifs critiques jusqu’à la version SDK suivante prévue en septembre ou octobre 2026. La mise à jour `expo@57.0.17` inclut React Native 0.86.3 et corrige une forte hausse de mémoire liée à Hermes V1 dans les applications qui importent Reanimated ou Worklets ainsi qu’une régression de démarrage en développement. [Expo SDK 57, 30 juin et mise à jour du 27 août 2026](https://expo.dev/changelog/sdk-57).

Expo recommande de mettre à niveau les SDK **un par un**, de réaligner les dépendances avec `expo install --fix`, d’exécuter `expo-doctor` et de reconstruire le development build. [Expo, guide de mise à niveau, consulté le 19 septembre 2026](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

Le premier saut impose aussi deux corrections de configuration concrètes : SDK 55 supprime le champ `newArchEnabled` encore présent dans `app.json`, et `eas update` exige désormais un `--environment` explicite alors que les scripts `update:preview` et `update:prod` du dépôt n'en fournissent pas. Ces points sont intégrés aux critères de PLANI-024. [Expo SDK 55, 25 février 2026](https://expo.dev/changelog/sdk-55).

SDK 58 n’est pas une cible de production raisonnable pour Planii aujourd’hui : sa bêta a commencé le 15 septembre pour trois à quatre semaines et utilise encore React Native 0.88 Release Candidate. [Expo SDK 58 bêta, 15 septembre 2026](https://expo.dev/changelog/sdk-58-beta).

### 2. Le calendrier natif Expo offre maintenant un chemin à permissions minimales

Expo a promu la nouvelle API `expo-calendar` au statut stable dans SDK 56. [Expo SDK 56, 21 mai 2026](https://expo.dev/changelog/sdk-56). La documentation actuelle permet d’ouvrir l’interface calendrier système Android sans demander de permission ; sur iOS, une application peut demander un accès en écriture seule pour créer un événement sans lire les calendriers ou événements existants. La lecture ou l’écriture directe sur Android exige en revanche `READ_CALENDAR` et `WRITE_CALENDAR`. [Expo Calendar, documentation officielle, consultée le 19 septembre 2026](https://docs.expo.dev/versions/latest/sdk/calendar/).

Cela rend réaliste un bouton mobile « Ajouter à mon calendrier » après PLANI-009, en privilégiant l’interface système et en évitant la lecture des événements personnels. Cette capacité ne remplace ni l’agenda Planii canonique ni le flux ICS révocable.

### 3. EAS Observe est devenu disponible en production, avec un coût mesurable

EAS Observe est généralement disponible depuis le 20 août 2026. Expo annonce 90 jours de rétention sur tous les plans, 100 000 événements par mois sur le plan gratuit, 500 000 sur les plans Starter et supérieurs, puis 5 USD par million d’événements supplémentaires. [Expo, annonce de disponibilité générale et tarification, 20 juillet 2026](https://expo.dev/changelog/eas-observe-moves-to-general-availability-on-august-20).

Le service mesure démarrage, rendu, navigation, mises à jour EAS, erreurs JavaScript et crashs natifs selon version. Les erreurs JavaScript et crashs natifs requièrent SDK 57 ; les crashs natifs nécessitent `expo-observe` 57.0.21 ou ultérieur. Expo utilise un identifiant aléatoire lié à l’installation, stable entre mises à jour et réinitialisé à la réinstallation ; il faut néanmoins le traiter comme une donnée pseudonyme dans l’analyse RGPD, surtout s’il est corrélé au backend. [Expo, introduction à EAS Observe, consultée le 19 septembre 2026](https://docs.expo.dev/eas/observe/introduction/) ; [Expo, identifiant client EAS, consulté le 19 septembre 2026](https://docs.expo.dev/eas/observe/reference/client-id/).

EAS Observe ne couvre ni le web ni l’API Express/PostgreSQL. Il peut donc être un candidat pour le volet mobile de PLANI-008, pas la solution d’observabilité transverse complète.

### 4. Les obligations de transparence AI Act sont désormais applicables

La Commission européenne a publié le 20 juillet 2026 ses lignes directrices sur l’Article 50 ; les obligations visées s’appliquent depuis le 2 août 2026. [Commission européenne, lignes directrices sur les obligations de transparence, 20 juillet 2026](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems).

L’Article 50 exige notamment qu’une personne soit informée qu’elle interagit avec un système d’IA lorsque ce n’est pas évident, au plus tard à la première interaction, de façon claire, distincte et conforme aux exigences d’accessibilité. Les règles de marquage des contenus synthétiques et les exceptions dépendent du rôle et de l’usage ; le brouillon privé d’une tâche n’équivaut pas automatiquement à un contenu publié d’intérêt public. [Règlement (UE) 2024/1689, Article 50, version consolidée au 27 juillet 2026](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng).

Pour PLANI-014, le point nouveau n’est donc pas d’ajouter une fonction IA, déjà envisagée, mais d’ajouter un contrôle juridique et des critères vérifiables : signalement explicite de l’IA, information accessible, rôle fournisseur/déployeur documenté et traçabilité de la version du système utilisée.

### 5. React 19.3 et Vite 8.3 : sécurité et maintenance, pas opportunité produit

React 19.3 est sorti le 9 septembre 2026. Il stabilise les View Transitions et ajoute la compatibilité Trusted Types : avec une CSP `require-trusted-types-for 'script'`, le navigateur exige des objets créés par des politiques de confiance pour les points d’injection DOM. [React 19.3, 9 septembre 2026](https://react.dev/blog/2026/09/09/react-19-3). Planii est encore sur React 18 ; ce mécanisme ne doit donc pas être ajouté à la CSP sans inventaire préalable des dépendances et des points d’injection.

Vite 8, publié le 12 mars 2026, remplace la chaîne Rollup/esbuild par Rolldown/Oxc et exige Node 20.19+ ou 22.12+. L’équipe Vite recommande une migration graduelle pour les projets complexes. [Vite 8, 12 mars 2026](https://vite.dev/blog/announcing-vite8). La version 8.3.0, publiée le 10 septembre 2026, apporte surtout des correctifs et optimisations de build/proxy; elle ne change pas la décision produit, mais devient la référence actuelle pour une future migration depuis Vite 5. [Vite 8.3.0, 10 septembre 2026](https://github.com/vitejs/vite/releases/tag/v8.3.0).

Le projet a une PWA, un plugin React et une configuration Workbox : le passage de Vite 5 à 8 doit rester un chantier maintenance isolé, avec test du service worker, du build, du bundle et des navigateurs supportés. Ni View Transitions ni le mode groupé expérimental ne justifient un ticket produit.

### 6. App Intents Siri : signal intéressant, maturité insuffisante

La bêta SDK 58 expose `expo-app-intents` pour Siri, Shortcuts, Spotlight et Apple Intelligence et montre comme exemple la complétion d’une tâche sans ouvrir l’application. Expo indique toutefois que la bibliothèque est **alpha**, avec documentation et exemples encore à venir. [Expo SDK 58 bêta, 15 septembre 2026](https://expo.dev/changelog/sdk-58-beta).

Cette piste est écartée : elle est iOS uniquement, nécessite du Swift inline, élargit la surface d’autorisation pour une mutation de tâche et arrive avant les prérequis d’idempotence, de conflits et d’audit de PLANI-011. Elle doit rester en veille jusqu’à une version stable, une parité ou stratégie Android et la mesure d’un besoin utilisateur réel.

### 7. PostgreSQL : correctif de sécurité à vérifier en production

Le projet PostgreSQL a publié le 13 août 2026 les versions 18.6, 17.11, 16.15, 15.19 et 14.24. L'annonce indique 28 vulnérabilités corrigées et plus de 110 anomalies, avec plusieurs problèmes notés jusqu'à 8,8; elle rappelle aussi la fin de support de PostgreSQL 14 au 12 novembre 2026. Les versions mineures sont cumulatives et la mise à jour ne requiert normalement ni `pg_upgrade` ni export/import, mais certains index ou extensions exigent des contrôles après mise à jour. [PostgreSQL Global Development Group, 13 août 2026](https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/).

Le dépôt Planii ne révèle pas la version serveur de production : il ne serait donc pas fondé d'affirmer qu'elle est vulnérable ou déjà corrigée. PLANI-025 demande d'abord l'inventaire, puis une sauvegarde restaurée en environnement isolé, la mise à jour vers le correctif maintenu de la majeure réellement utilisée et, si nécessaire, une sortie de PostgreSQL 14 avant sa fin de support. PostgreSQL 19 Beta 3 est explicitement exclu.

### 8. Le chemin de déploiement est cassé avant la connexion SSH

Le workflow public `Deploy to Hostinger VPS` a échoué à répétition; son dernier run, daté du 17 août 2026, transmet des valeurs vides pour l'hôte, l'utilisateur et la clé puis s'arrête avec `Error: missing server host`. La commande GitHub en lecture seule confirme qu'aucun secret de dépôt n'est actuellement déclaré. [Run GitHub Actions 32055215709, 17 août 2026](https://github.com/BertonLutina/planii/actions/runs/32055215709).

GitHub documente qu'une référence à un secret absent est évaluée comme une chaîne vide. Restaurer `VPS_HOST`, `VPS_USER` et `VPS_SSH_KEY` dans un environnement protégé explique et corrige le blocage immédiat, mais ne suffit pas à garantir une livraison sûre. [GitHub, utilisation des secrets dans Actions, consulté le 19 septembre 2026](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

Le même run avertit que `script_stop` n'est plus une entrée valide; la documentation officielle de l'action recommande `set -e` dans le script, déjà renforcé localement par `set -euo pipefail`. Le workflow doit aussi pinner l'action tierce au SHA complet : GitHub précise que c'est le seul référencement immuable d'une action. Enfin, la livraison doit attendre les builds/tests web et backend, échouer si le contrôle public n'atteint pas 200 et disposer d'un retour arrière testé. [appleboy/ssh-action, documentation officielle consultée le 19 septembre 2026](https://github.com/appleboy/ssh-action) ; [GitHub, usage sécurisé des actions tierces, consulté le 19 septembre 2026](https://docs.github.com/en/actions/reference/security/secure-use).

## Opportunités évaluées

| Opportunité | Valeur | Faisabilité Planii | Risques / coût | Décision |
|---|---|---|---|---|
| Monter Expo SDK 54 vers 57 stable | Sécurité, support, fiabilité native ; débloque les bibliothèques récentes | Élevée mais à faire SDK par SDK ; nouveaux builds iOS/Android obligatoires | Régressions natives, OTA incompatible si la `runtimeVersion` n’est pas gérée ; coût EAS de builds et QA | **Maintenant, ticket maintenance mobile Cursor AI** |
| Ajouter un événement Planii au calendrier de l’appareil | Continuité immédiate depuis un rendez-vous Planii | Bonne après SDK 57 et PLANI-009 ; interface système Android, écriture seule iOS | Permission, duplication, fuseaux, révocation impossible d’une copie locale ; pas de coût fournisseur | **Après PLANI-009, sous-ticket mobile éventuel, pas maintenant** |
| Utiliser EAS Observe pour le mobile | Complète PLANI-008 avec métriques réelles et crashs reliés aux builds/OTA | Bonne après SDK 57 ; EAS et `expo-updates` sont déjà présents | Identifiant d’installation pseudonyme, transfert/sous-traitance à documenter ; gratuit jusqu’à 100 000 événements/mois puis coût variable | **Pilote borné dans PLANI-008, pas de ticket séparé** |
| Mettre PLANI-014 en conformité de transparence IA | Réduit le risque légal et évite une interaction ambiguë | Élevée : UI, texte d’information, journal d’audit et documentation du rôle | Revue juridique et accessibilité ; coût faible hors conseil | **Ajouter aux critères de PLANI-014 avant développement** |
| Migrer React 18/Vite 5 vers React 19.3/Vite 8 | Réduit la dette et ouvre Trusted Types | Faisable, mais exige tests PWA, plugins, bundle et CSP | Régression build/service worker ; QA navigateurs ; aucun coût licence | **Maintenance planifiée, isolée des fonctionnalités** |
| App Intents / Siri pour modifier une tâche | Interaction mains libres | Faible aujourd’hui : SDK bêta, bibliothèque alpha, iOS seulement | Mutation hors app, permissions/audit, parité Android, coût QA natif | **Rejeté pour le moment** |
| Vérifier et corriger PostgreSQL de production | Réduit un risque de compromission ou d'indisponibilité de toutes les données collaboratives | Faisable sur le VPS, mais version et extensions à inventorier avant action | Fenêtre de maintenance, sauvegarde/restauration, éventuelle reindexation ; pas de coût licence | **Maintenant, ticket partagé PLANI-025** |
| Rétablir et durcir le déploiement Hostinger | Rend les correctifs web/API réellement livrables et observables | Bonne : secrets, workflow et script existent, mais le chemin complet n'a pas réussi depuis juillet | Rotation de secrets, clé SSH au moindre privilège, indisponibilité et rollback ; coût GitHub/Hostinger existant | **Maintenant, ticket partagé PLANI-026** |

## Faisabilité transversale

### Sécurité

- La montée Expo doit viser SDK 57 corrigé (`expo >= 57.0.17`) et non SDK 56, dont la régression Hermes affecte directement la combinaison Reanimated/Worklets présente dans le dépôt.
- Toute création de calendrier appareil doit partir d’un objet Planii déjà autorisé et ne jamais transférer de jeton Google/Microsoft au client. Le chemin minimal est l’interface système ou l’écriture seule, sans lecture de l’agenda personnel.
- EAS Observe ne doit recevoir ni titre de tâche, ni e-mail, ni identifiant de compte. Les événements personnalisés doivent être limités à des noms techniques et attributs non sensibles.
- Trusted Types peut renforcer la défense contre les XSS DOM après migration React, mais seulement après un inventaire en mode rapport et des tests de la PWA ; l’activer brutalement peut casser l’application.
- La version PostgreSQL de production ne doit pas être déduite du client `pg`. Avant toute mise à jour, il faut inventorier serveur et extensions, restaurer une sauvegarde, appliquer le correctif de la majeure supportée et exécuter les contrôles post-mise à jour officiels pertinents.
- Le déploiement doit utiliser un environnement GitHub protégé, une clé dédiée au moindre privilège et l'empreinte SSH du serveur, sans journaliser les secrets. L'action tierce doit être figée sur un SHA vérifié et le run doit être bloqué tant que les builds/tests web et backend ne sont pas verts.

### RGPD et AI Act

- Pour EAS Observe, documenter Expo comme sous-traitant potentiel, finalité, région/transferts, DPA, rétention, échantillonnage et procédure d’effacement. Un identifiant stable d’installation reste à traiter comme pseudonyme même si l’éditeur le présente comme non personnel.
- Pour le calendrier appareil, demander l’accès seulement au clic, expliquer la finalité et préférer l’absence de lecture. Une copie créée dans un fournisseur de calendrier sort du contrôle de rétention de Planii ; l’utilisateur doit en être averti.
- Pour PLANI-014, combiner les exigences AI Act avec les mesures RGPD déjà prévues : contexte minimal, opt-in, rétention courte, validation humaine et absence d’action autonome.

### Accessibilité

- Le message de transparence IA doit être annoncé par les lecteurs d’écran, ne pas reposer sur une icône seule et rester disponible après la première interaction.
- Le bouton calendrier doit avoir une alternative textuelle, un état de succès/échec annoncé et ne pas dépendre uniquement d’une boîte système non testée sous VoiceOver/TalkBack.
- Les View Transitions React, si elles sont utilisées plus tard, doivent respecter `prefers-reduced-motion` ; leur disponibilité ne justifie aucune animation par défaut.

### Dépendances et coût

- Expo 57 entraîne une mise à niveau coordonnée de React Native, React, Router, Reanimated, Worklets et autres modules SDK, ainsi qu’un nouveau development build. Les lockfiles doivent rester déterministes.
- Le passage par Expo SDK 55 oblige à retirer `newArchEnabled` et à ajouter un `--environment` explicite aux commandes EAS Update; cela ne crée pas de coût fournisseur supplémentaire, mais exige un test sur canal non productif.
- `expo-calendar` et React/Vite sont open source et n’ajoutent pas de coût de service ; la dépense est principalement la QA multi-appareil et les builds.
- EAS Observe dispose d’un palier gratuit de 100 000 événements/mois, puis d’une tarification mesurable. Commencer avec un échantillonnage faible et un plafond d’usage.
- La mise à jour mineure PostgreSQL n'exige normalement pas de migration de schéma, mais son coût opérationnel inclut sauvegarde restaurée, maintenance, contrôle des extensions et smoke tests des deux clients.
- PLANI-026 ne requiert pas de nouveau fournisseur : son coût principal est opérationnel (rotation/recréation des secrets, validation du VPS, tests de rollback et éventuelle courte fenêtre de maintenance).

## Recommandation

1. **Prendre PLANI-026 côté partagé/backend**, rétablir les secrets dans un environnement protégé, pinner l'action SSH, supprimer l'entrée obsolète, faire dépendre la livraison des contrôles web/backend et prouver échec, succès et rollback.
2. **Prendre PLANI-025 côté partagé/backend**, inventorier PostgreSQL de production, prouver une restauration puis appliquer le correctif maintenu de la majeure réelle; planifier une sortie rapide si la base est encore en PostgreSQL 14.
3. **Prendre PLANI-001 puis PLANI-017 avant de livrer le reset.** Les tests PostgreSQL doivent devenir obligatoires, puis la consommation du jeton, la mise à jour du mot de passe et l'invalidation des sessions doivent être vérifiées en concurrence; PLANI-018 et PLANI-019 restent bloqués jusque-là.
4. **Prendre PLANI-024 en tête de la file mobile Cursor AI pour Expo SDK 54 → 55 → 56 → 57**, cible `expo >= 57.0.17`, avec retrait de `newArchEnabled`, environnements EAS explicites, `expo-doctor`, typecheck, builds de développement iOS/Android, tests Auth/Projets/Agenda/Tâche, deep links, permissions, EAS Update et mesure mémoire Reanimated. Charger d’abord `expo:expo-overview`, puis `expo:expo-upgrade`, `expo:expo-dev-client` et les skills design imposés par les règles mobiles du dépôt.
5. **Amender PLANI-014** afin que la première interaction indique clairement et de manière accessible l’usage d’une IA, que les rôles AI Act soient documentés et que la revue juridique ait lieu avant le pilote.
6. **Évaluer EAS Observe dans l’ADR PLANI-008**, uniquement comme composant mobile après Expo 57, avec DPA, rétention, échantillonnage, budget et interdiction des attributs métier sensibles.
7. **Ne pas créer de ticket calendrier appareil maintenant.** Après PLANI-009, tester un petit sous-ticket Cursor AI « Ajouter au calendrier de l’appareil » utilisant l’interface système Android et l’écriture seule iOS ; ne jamais lire les calendriers par défaut.
8. **Garder React 19.3 / Vite 8.3 comme maintenance web future**, après les tests critiques PLANI-004. Trusted Types reste en évaluation jusqu’à l’inventaire CSP.
9. **Ne pas adopter Expo SDK 58 bêta, `expo-app-intents`, le mode groupé expérimental de Vite ni les View Transitions comme fonctions produit.** Réévaluer seulement après stabilisation et preuve d’un besoin utilisateur.

## Ce qui est réellement nouveau aujourd’hui

- **Nouveau et actionnable :** fin imminente de la fenêtre de correctifs Expo SDK 54 ; cible stable SDK 57 corrigée à prioriser.
- **Nouveau et obligatoire à instruire :** application depuis le 2 août 2026 des règles de transparence AI Act pertinentes pour le pilote PLANI-014.
- **Nouveau mais absorbable par le backlog :** disponibilité générale et tarification d’EAS Observe pour le volet mobile de PLANI-008 ; API calendrier Expo stable et plus parcimonieuse pour un futur complément de PLANI-009.
- **Nouveau mais non actionnable :** SDK 58 bêta et App Intents alpha ; aucune nouvelle fonctionnalité à ouvrir.
- **Mise à jour technique :** React 19.3 et Vite 8.3 remplacent les versions précédemment citées comme horizon de maintenance, sans modifier la priorité des tickets produit.
- **Mise à jour de sécurité :** la version PostgreSQL de production est inconnue dans le dépôt alors que le correctif du 13 août clôt 28 vulnérabilités; PLANI-025 est créé pour vérifier et corriger, sans conclure à tort que le serveur est vulnérable.
- **Mise à jour différentielle de 18 h :** aucune publication officielle pertinente n'est apparue après 15:00:26Z; le contrôle croisé a toutefois précisé PLANI-024 (`newArchEnabled`, `--environment`) et supprimé les dépendances mobiles erronées de PLANI-018, PLANI-020 et PLANI-022.
- **Mise à jour différentielle de 19 h :** aucun changement applicatif ni publication officielle nouvelle depuis 16:00:56Z, mais l'audit GitHub révèle zéro ticket ouvert et des déploiements Hostinger en échec répété. PLANI-026 est créé pour restaurer puis durcir ce chemin critique.
