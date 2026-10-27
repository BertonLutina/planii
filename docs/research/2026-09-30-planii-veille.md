# Veille produit Planii — 30 septembre 2026

## Résumé exécutif

La fenêtre différentielle va du `2026-09-29T19:17:23.652Z` au `2026-09-30T10:41:10Z`. Aucun commit, ticket GitHub, pull request, déploiement ni fichier applicatif nouveau n'est apparu. `HEAD` local et `origin/main` restent alignés sur `a717cfe`; le déploiement Hostinger `35592811607` reste en échec et couvert par PLANI-026.

Le changement significatif du jour est sécurité: 16 avis npm ont été publiés après la coupure. Six s'appliquent à des versions résolues dans les arbres Planii: un avis haut Nodemailer et deux avis modérés `ip-address` côté backend, ainsi que deux avis hauts et un modéré `brace-expansion` dans l'outillage Expo mobile. Les audits runtime restent à 1 haute web et 10 alertes backend, tandis que l'audit Yarn mobile monte à 79 hautes et 28 modérées. Les tickets PLANI-027, PLANI-028 et PLANI-029 couvrent déjà la remédiation; ils sont enrichis sans créer de doublon.

Aucune nouveauté stable et datée dans la fenêtre ne justifie une fonction produit supplémentaire. La recommandation est de prendre PLANI-027 en premier côté backend, puis de reprendre le plan existant sans chevauchement de lockfiles ou de fichiers clients.

## État observé du produit

### Dépôt, incidents et livraison

- `HEAD` local et public: `a717cfeae0eb6480366e762e17908a4162cb6449`, dernier commit du 21 septembre 2026 ([commit officiel](https://github.com/BertonLutina/planii/commit/a717cfeae0eb6480366e762e17908a4162cb6449)). Aucun fichier hors note temporaire de veille n'est postérieur à la coupure.
- Le diff applicatif local préexistant conserve 1 278 insertions et 12 460 suppressions suivies; son empreinte SHA-256 observée est `830aa254e9c10eb7eb09ae092ddca61961788c7a12dfde3167c4890c2107df01`. Cette automatisation ne l'a pas modifié.
- Les API publiques GitHub renvoient 0 issue ouverte, 0 PR ouverte et 0 déploiement. Le dernier workflow reste [Deploy to Hostinger VPS 35592811607](https://github.com/BertonLutina/planii/actions/runs/35592811607), en échec depuis le 21 septembre.
- Le backlog conserve 31 tickets, dont 8 Cursor AI avec les skills mobiles obligatoires. Les statuts et dépendances applicatives restent inchangés.

### Dette de dépendances vérifiée

- Web: `npm audit --omit=dev` remonte 1 haute directe, `xlsx@0.18.5`, sans correctif npm. La chaîne de build Vite/PWA contient aussi `fast-uri@3.1.3` et `brace-expansion@5.0.7`; les avis nouveaux concernent l'outillage de build, pas le bundle runtime audité. PLANI-028 exige déjà leur triage.
- Backend: `npm audit --omit=dev` remonte 10 paquets, dont 6 hauts et 4 modérés. `nodemailer@6.10.1` est direct; `nodemailer@9.0.3` arrive aussi par `imapflow` et `mailparser`. `ip-address@10.2.0` arrive par `imapflow > socks`.
- Mobile: `yarn audit --groups dependencies` remonte 79 hautes et 28 modérées sur 654 dépendances. `brace-expansion@5.0.9` arrive par `expo > @expo/fingerprint > minimatch`; il est donc surtout exposé dans les opérations de fingerprint/build/update, ce qui doit être prouvé plutôt que supposé absent du binaire.

## Recherches et sources officielles

| Signal officiel | Date/heure UTC | Applicabilité à Planii | Décision |
|---|---:|---|---|
| [Nodemailer — backtracking quadratique de l'address parser](https://github.com/advisories/GHSA-v53p-9fqp-m79j) | 29 septembre, 23:43:36 | Sévérité haute; la plage `<=10.0.5` inclut les versions 6.10.1 et 9.0.3 résolues. Le correctif minimal annoncé est 10.0.6, mais l'audit cumulé recommande une version 10 plus récente. | Rattacher à PLANI-027; migration majeure, tests SMTP/IMAP et entrées forgées obligatoires. |
| [Nodemailer — destinataire malformé](https://github.com/advisories/GHSA-g57g-f23g-4646) | 29 septembre, 23:44:04 | La plage `>=9.1.0, <10.0.9` n'inclut ni 6.10.1 ni 9.0.3. | Aucune action sur les versions actuelles; vérifier lors de la migration. |
| [`ip-address` — familles mélangées dans `isInSubnet`](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) et [diagnostic non borné](https://github.com/advisories/GHSA-h3mg-xc3c-68pw) | 29 septembre, 23:46:52 et 23:46:39 | `ip-address@10.2.0` est affecté; 10.7.1 corrige. Le chemin réel est la connexion IMAP via `socks`, pas une validation d'autorisation écrite par Planii. | Rattacher à PLANI-027; mettre à jour la transitive et tester proxy/IMAP avec entrées longues et familles IP. |
| [`brace-expansion` — récursion `parseCommaParts`](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), [groupes imbriqués](https://github.com/advisories/GHSA-qhr7-859c-m2p7) et [temps quadratique](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | 29 septembre, 23:44:58–23:45:39 | `brace-expansion@5.0.9` mobile est affecté; 5.0.12 ferme les trois avis. Le chemin passe par `@expo/fingerprint`. | Rattacher à PLANI-029 après PLANI-024; tester fingerprint/build/update et verrouiller au moins 5.0.12. |
| [GitHub Advisory Database — avis npm](https://api.github.com/advisories?ecosystem=npm&published=2026-09-29T19:17:23Z..2026-09-30T10:41:10Z&per_page=100) | fenêtre stricte | 16 avis publiés. Les autres paquets visés sont absents, hors runtime ou non applicables aux versions résolues. | Aucun ticket supplémentaire. |

Les canaux officiels React, Vite, Expo, React Native, Express, Node.js, PostgreSQL, W3C WAI, EDPB et Commission européenne ont aussi été contrôlés. Aucun release stable, norme, exigence RGPD/AI Act, changement de licence ou de tarif postérieur à la coupure n'est applicable. Expo SDK 58 reste bêta et ne modifie pas la cible SDK 57 de PLANI-024.

## Opportunités évaluées

### 1. Remédiation consolidée de la chaîne e-mail et IMAP

- Valeur: élevée, car un en-tête d'adresse forgé peut bloquer l'event loop backend.
- Faisabilité: moyenne. La sortie de Nodemailer 6 vers 10 est un saut majeur et `mailparser`/`imapflow` embarquent leurs propres versions; une simple résolution forcée serait risquée.
- Sécurité/RGPD: les fixtures doivent rester synthétiques et les tests ne doivent journaliser ni contenu de message ni adresse complète.
- Coût: pas de licence supplémentaire; effort interne M déjà estimé dans PLANI-027.
- Verdict: prioriser PLANI-027, sans nouveau ticket.

### 2. Mise à jour de l'outillage Expo fingerprint

- Valeur: moyenne pour la fiabilité des builds et updates; faible pour l'utilisateur si le paquet n'entre pas dans le binaire final.
- Faisabilité: moyenne après PLANI-024, car le lockfile mobile est réservé au chantier SDK 57 et une résolution isolée doit rester compatible avec Expo.
- Risques: casser les fingerprints/runtimeVersion, produire une OTA incompatible ou croire à tort que l'avis est runtime.
- Coût: pas de licence; effort S de triage dans PLANI-029, inclus dans son estimation M.
- Verdict: documenter le chemin et viser `brace-expansion >=5.0.12` dans PLANI-029, après clôture de PLANI-024.

### 3. Nouvelles fonctions de collaboration

Aucun signal post-coupure ne présente aujourd'hui un rapport valeur/risque supérieur aux P0/P1 ouverts. Les candidats précédents — fuseaux multiples, vues personnelles, déduplication/provenance — restent rattachés à PLANI-009/014 ou conditionnels. Verdict: aucune extension du backlog.

## Faisabilité dans la stack Planii

- React/Vite/PWA: le runtime ne change pas; PLANI-028 conserve `xlsx` comme risque direct et doit aussi actualiser les dépendances de build sans compromettre Workbox/PWA.
- Expo/React Native: la correction `brace-expansion` doit passer par une résolution compatible Expo et des commandes `expo-doctor`, fingerprint, development build et EAS Update. Cursor AI doit respecter `.cursor/rules/planii-mobile.mdc` et les skills obligatoires de PLANI-029.
- Express/PostgreSQL: PLANI-027 peut mettre à jour les bibliothèques e-mail/IMAP et ajouter des limites sans migration de données. Les tests PostgreSQL obligatoires de PLANI-001 restent nécessaires pour éviter un faux vert lors des régressions d'intégration.
- Sécurité/RGPD: borner profondeur, taille et durée; ne pas conserver les entrées forgées réelles; masquer adresses et contenu dans les logs; dater toute exception d'audit.
- Accessibilité: aucune incidence UI directe aujourd'hui. Les erreurs d'import web/mobile restent soumises aux critères PLANI-028/029 et aux socles PLANI-013/016.
- Coût: toutes les corrections identifiées sont open source; le coût est du temps de migration, de test et de build EAS, sans nouvel abonnement recommandé.

## Recommandation

Ne créer aucun ticket. Enrichir PLANI-027, PLANI-028 et PLANI-029 avec les preuves du jour et prendre PLANI-027 en premier, car il contient un chemin backend exposé à des entrées e-mail non fiables.

### Cursor AI - mobile

1. **En cours: PLANI-024** — terminer smoke appareils, deep links, permissions, OTA hors production et mémoire; aucun autre agent ne touche au lockfile mobile.
2. **En cours ensuite: PLANI-016** — revue VoiceOver/TalkBack sur les development builds.
3. **Bloqué, à préparer seulement: PLANI-029** — intégrer le triage `brace-expansion >=5.0.12` après PLANI-024 et PLANI-027.
4. **Prêt à prendre: aucun nouveau ticket mobile.**

### Claude Code - web

1. **En cours: PLANI-013** — terminer VoiceOver/Safari et NVDA/Firefox.
2. **En cours ensuite: PLANI-030** — preuves Docker/Nginx, média, en-têtes publics, revue juridique et coût.
3. **Bloqué: PLANI-028** — attendre PLANI-027; inclure le triage des transitives de build Vite/PWA.
4. **Prêt à prendre: aucun ticket web sans dépendance levée.**

### Partagé/backend

1. **Prêt à prendre en premier: PLANI-027** — corriger Nodemailer/IMAP/IP et fixer le contrat d'import partagé.
2. **Prêt ensuite: PLANI-001** — rendre PostgreSQL de test obligatoire.
3. **En cours, à reprendre après PLANI-001: PLANI-017** — atomicité, révocation, limites, purge et tests.
4. **Prêt sans chevauchement: PLANI-025** — vérifier PostgreSQL de production et la restauration.
5. **Bloqué: PLANI-026** — attendre PLANI-031 avant le rétablissement du déploiement.
