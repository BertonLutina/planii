# Veille produit Planii — 26 septembre 2026

## Résumé exécutif

La fenêtre différentielle contrôlée va du `2026-09-25T11:49:54.430Z` au `2026-09-26T08:22:52Z`. Aucun changement applicatif, commit, ticket GitHub, pull request ou déploiement n'est apparu. Le dernier workflow public reste le déploiement Hostinger en échec du 21 septembre, déjà couvert par PLANI-026.

Quatre signaux officiels sont pertinents mais ne justifient pas de nouveau ticket: trois fuseaux horaires comme benchmark pour PLANI-009; vues personnelles et relations entre tâches comme candidat P2 conditionnel; déduplication et provenance à examiner dans PLANI-014; clarification WCAG 3 à surveiller sans quitter la cible WCAG 2.2 AA de PLANI-013/016. La recommandation est donc de protéger la capacité de livraison et de terminer les P0/P1 existants avant toute extension produit.

Les audits runtime frais changent seulement le chiffrage documentaire: web 1 alerte haute, backend 10 alertes dont 6 hautes, mobile 92 alertes dont 69 hautes. PLANI-027/028/029 couvrent déjà ces dettes; aucun doublon n'est créé.

## État observé du produit

### Dépôt et livraison

- `HEAD` local et public: `a717cfeae0eb6480366e762e17908a4162cb6449`, dernier commit du 21 septembre 2026 ([commit public](https://github.com/BertonLutina/planii/commit/a717cfeae0eb6480366e762e17908a4162cb6449)). Aucun commit ni fichier applicatif n'est postérieur à la coupure du 25 septembre.
- L'arbre reste volontairement non nettoyé: travaux locaux antérieurs sur Expo 57, accessibilité web/mobile, reset et Jitsi. L'empreinte SHA-256 du diff applicatif observé est `c8a35c63a3ffb2fe9751731d20ecde4caa0afedbae2cfaa83094f8dc759cc9dc`. Cette automatisation n'a modifié aucun code applicatif.
- GitHub public affiche 0 issue ouverte, 0 PR ouverte et 0 déploiement ([issues](https://github.com/BertonLutina/planii/issues), [pull requests](https://github.com/BertonLutina/planii/pulls), [API déploiements](https://api.github.com/repos/BertonLutina/planii/deployments)).
- Le dernier run reste `Deploy to Hostinger VPS` `35592811607`, terminé en échec le 21 septembre 2026 à 11:12:24Z ([run officiel](https://github.com/BertonLutina/planii/actions/runs/35592811607)). PLANI-026 reste la réponse; l'état des secrets Actions n'est pas vérifiable publiquement et le jeton local `gh` est invalide.

### Backlog et dette

- Le backlog conserve 31 tickets, dont 8 mobiles Cursor AI. Les 8 fiches mobiles conservent `.cursor/rules/planii-mobile.mdc`, `expo:expo-overview` en premier et les skills Expo/design/21st requis.
- P0/P1 actifs: PLANI-024 et PLANI-016 côté mobile; PLANI-013 et PLANI-030 côté web; PLANI-017 côté backend. PLANI-001, PLANI-025 et PLANI-027 sont les tickets backend réellement prêts, sous réserve de ne pas faire modifier les mêmes fichiers en parallèle.
- `npm audit --omit=dev` du 26 septembre: web 1 haute, `xlsx@0.18.5`, sans correctif npm ([pollution de prototype](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)); backend 6 hautes et 4 modérées, notamment `multer@2.2.0`, `mailparser@3.9.14` et `nodemailer@6.10.1` ([DoS Multer](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm), [DoS Nodemailer](https://github.com/advisories/GHSA-2x7j-588g-ccc2)).
- `yarn audit --groups dependencies` du 26 septembre: mobile 69 hautes et 23 modérées. Le chiffre reste inchangé et PLANI-029 exige déjà le triage après PLANI-027/024.

### Limite de continuité

Aucun rapport `docs/research` daté du 25 septembre n'est présent dans ce checkout, et la mémoire de l'automatisation s'arrête au 22 septembre alors que le journal du backlog va jusqu'au 25. La déduplication de cette exécution s'appuie donc sur le backlog courant, le journal du 25, les manifests et lockfiles, puis les sources officielles publiées après la coupure.

## Recherches et sources officielles

| Signal officiel | Date/heure de source | Constat applicable à Planii | Décision |
|---|---|---|---|
| [Google Calendar — jusqu'à trois fuseaux horaires](https://workspaceupdates.googleblog.com/2026/09/view-up-to-three-time-zones-in-google-Calendar-on-the-web.html) | 25 septembre 2026, flux officiel à 16:37:17Z | Bon benchmark pour une équipe distribuée et pour `Find a Time`; dépend d'un contrat de dates/fuseaux robuste. | Rattacher à PLANI-009, sans nouveau ticket. |
| [GitHub Issues — vues personnelles et relation `Relates to`](https://github.blog/changelog/2026-09-25-personal-saved-views-for-repository-issues-and-more) | 25 septembre 2026, 19:05:03Z | Les vues privées réduisent la reconfiguration; les relations explicites facilitent la navigation entre tâches sans imposer une hiérarchie. | Candidat P2 seulement après preuve d'usage. |
| [Copilot dans Slack et Teams — contexte, doublons et provenance](https://github.blog/changelog/2026-09-25-updates-to-github-copilot-for-slack-and-microsoft-teams) | 25 septembre 2026, 16:33:42Z | Le pattern utile est l'aperçu de doublon avant création et le lien vers la source; l'ingestion de conversations crée des risques RGPD, permissions et rétention. | Évaluer ces deux garde-fous dans PLANI-014; aucun connecteur. |
| [W3C — orientation de WCAG 3](https://www.w3.org/blog/2026/crafting-wcag-3-for-more-accessible-user-experiences/) | 25 septembre 2026, 12:50:00Z | Le W3C décrit un projet basé sur le socle WCAG 2.2 A/AA, pas une Recommendation publiée. | Maintenir WCAG 2.2 AA pour PLANI-013/016; simple veille. |
| [GitHub Advisory — `knowns`](https://github.com/advisories/GHSA-9gfj-28hw-jchp) et [OpenZeppelin Confidential Contracts](https://github.com/advisories/GHSA-29h2-jr22-frmh) | 25 septembre 2026, 19:32:05Z et 19:31:08Z | Deux avis npm publiés dans la fenêtre; les paquets sont absents des 88 paquets déclarés et des lockfiles Planii. | Aucun ticket; conserver la politique d'audit de PLANI-027. |
| [Archives PostgreSQL](https://www.postgresql.org/about/newsarchive/) | contrôlées le 26 septembre 2026 | La dernière publication visible, PostgreSQL 19 Beta 4, date du 24 septembre et reste hors cible de production. | PLANI-025 inchangé; aucune adoption bêta. |
| [EDPB — actualités](https://www.edpb.europa.eu/news_en), [Commission européenne — numérique](https://digital-strategy.ec.europa.eu/en/news), [Expo — changelog](https://expo.dev/changelog) | contrôlés le 26 septembre 2026 | Aucun texte RGPD/AI Act, changement Expo ou coût officiel postérieur à la coupure et applicable à Planii. | Aucun ticket ni requalification. |

Le registre npm officiel a également été contrôlé pour les 88 paquets uniques déclarés: aucune version n'a été publiée après la borne. Aucun signal net nouveau n'a été trouvé pour React, Vite, vite-plugin-pwa, Expo, React Native, Express ou `pg`.

## Opportunités évaluées

### 1. Comparaison multi-fuseaux dans l'agenda

- Valeur: élevée pour les équipes distribuées et la préparation de réunions.
- Faisabilité: élevée sur le web après normalisation des fuseaux; plus délicate sur mobile à cause de l'espace disponible. Effort S web, M si partagé.
- Risques: surcharge visuelle, erreurs DST, libellés ambigus et lecture d'écran.
- Coût: aucun coût de licence; coût interne faible à moyen.
- Verdict: benchmark intégré à PLANI-009, pas de troisième zone par défaut sans signal utilisateur.

### 2. Vues personnelles sauvegardées et relations entre tâches

- Valeur: moyenne à élevée pour les utilisateurs qui reconstruisent souvent leurs filtres ou gèrent des dépendances souples.
- Faisabilité: moyenne; nécessite filtre versionné par utilisateur, permissions, index, contrat de relation et deux interfaces distinctes web/mobile.
- Risques: fuite de métadonnées via recherche, vues périmées, complexité de synchronisation et duplication avec statuts/sous-tâches.
- Coût: M/L, sans licence externe.
- Verdict: ne pas créer de ticket. Déclencheur: au moins trois demandes convergentes ou une métrique montrant une reconfiguration répétée. Le cas échéant, créer un parent P2, un backend partagé préalable, puis deux sous-tickets client séparés.

### 3. Déduplication et provenance pour la saisie assistée

- Valeur: éviter les doublons et rendre une proposition traçable avant confirmation.
- Faisabilité: moyenne dans PLANI-014 pour une saisie Planii; faible à court terme pour Slack/Teams faute de socle OAuth, permissions, contrat, idempotence et observabilité.
- Risques: exposition de conversations, conservation excessive, hallucination de doublon et coût fournisseur.
- Coût: faible pour les critères de contrat; M/L et licences possibles pour un connecteur.
- Verdict: affiner PLANI-014 uniquement; ne pas ajouter de connecteur.

### 4. Anticipation WCAG 3

- Valeur immédiate: faible, car le texte n'est pas normatif.
- Faisabilité: veille gratuite; une migration maintenant créerait du travail jetable.
- Risques: détourner les équipes des revues VoiceOver/NVDA/TalkBack encore ouvertes.
- Verdict: rester sur WCAG 2.2 AA et les tests utilisateurs.

## Faisabilité dans la stack Planii

- React/Vite/PWA: les vues multi-fuseaux et filtres sauvegardés sont techniquement compatibles, mais doivent attendre PLANI-013 et le socle de contrats PLANI-005/006. Le bundle et l'import XLSX restent plus urgents.
- Expo/React Native: aucune nouvelle fonction ne doit rejoindre le chantier SDK tant que PLANI-024/016 n'a pas produit les preuves appareils, deep links, permissions, OTA et mémoire. Toute future UI doit suivre `.cursor/rules/planii-mobile.mdc` et traduire l'inspiration 21st en composants natifs.
- Express/PostgreSQL: les vues sauvegardées ou relations entre tâches exigeraient permissions serveur, index et contrat partagé. L'intégration IA exige en plus idempotence, audit minimisé et rétention courte. PLANI-001/003/005/008 restent des prérequis.
- Sécurité/RGPD: aucune conversation tierce ne doit être ingérée sans base légale, minimisation, DPA, contrôle des permissions et suppression. Les alertes runtime existantes restent prioritaires via PLANI-027/028/029.
- Accessibilité: fuseaux, filtres et suggestions de doublon doivent exposer noms, états, erreurs et ordre de lecture; le futur WCAG 3 ne remplace pas les tests manuels actuels.

## Recommandation

Ne créer aucun ticket aujourd'hui. Mettre à jour les références et chiffrages des tickets existants, puis exécuter le plan suivant sans chevauchement de fichiers.

### Cursor AI - mobile

1. En cours: PLANI-024 — terminer smoke appareils, deep links, permissions, OTA non productif et profil mémoire.
2. En cours ensuite: PLANI-016 — revue VoiceOver/TalkBack sur les development builds.
3. Prêt à prendre: aucun nouveau ticket mobile; PLANI-019/029/021/010/011/023 restent bloqués par leurs dépendances.

### Claude Code - web

1. En cours: PLANI-013 — terminer VoiceOver/Safari et NVDA/Firefox.
2. En cours ensuite: PLANI-030 — preuves Docker/Nginx, média réel, en-têtes publics, revue juridique/coût.
3. Prêt à prendre: aucun ticket web tant que PLANI-013/030 et les dépendances de PLANI-007/018/028 ne sont pas levées.

### Partagé/backend

1. Prêt à prendre: PLANI-001 — rendre PostgreSQL de test obligatoire.
2. Reprendre ensuite: PLANI-017 — reset atomique, révocation, limites, purge et tests.
3. Prêt après séparation claire des fichiers/CI: PLANI-027, puis PLANI-025.
4. PLANI-026 reste bloqué sur PLANI-031; PLANI-009 attend PLANI-001 malgré le nouveau benchmark multi-fuseaux.
