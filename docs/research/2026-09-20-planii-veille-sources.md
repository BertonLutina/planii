# Veille officielle Planii — delta du 20 septembre 2026

**Fenêtre contrôlée :** du `2026-09-19T21:01:27.620Z` au `2026-09-19T22:04:55Z` (du 19 septembre 23:01 au 20 septembre 00:04, Europe/Brussels).

**Périmètre :** application collaborative de planification, projets, tâches, calendrier et réunions ; web React/Vite/PWA, mobile Expo/React Native, API Express/PostgreSQL ; intégrations et signaux Google Workspace, Microsoft 365/Graph, Slack, Linear, Notion et Atlassian ; sécurité, dépendances, RGPD, accessibilité et coûts.

**Méthode :** consultation de canaux primaires officiels uniquement. Pour GitHub, les dates de publication sont celles des releases officielles et les avis npm ont été interrogés via l'[API officielle GitHub Advisory Database](https://api.github.com/advisories?ecosystem=npm&published=2026-09-19T21%3A01%3A27Z..2026-09-19T22%3A04%3A55Z&per_page=100). Une page qui n'affiche qu'un mois, une date sans heure, ou aucun historique de modification ne peut pas prouver qu'un changement appartient à cette fenêtre d'environ 63 minutes.

## Verdict

**Aucun signal significatif, nouveau et datable dans la fenêtre.** Aucun ticket produit, technique, sécurité, conformité, accessibilité ou coût n'est justifié par cette veille différentielle. Les signaux déjà documentés avant `2026-09-19T21:01:27.620Z` restent valides mais ne sont pas recréés.

## Stack technique et dépendances

| Domaine | Dernière publication officielle visible | Contrôle de la fenêtre | Verdict Planii |
|---|---:|---|---|
| React | [React 19.3.0](https://github.com/facebook/react/releases/tag/v19.3.0), **9 septembre 2026 à 18:01 UTC** | Aucune release postérieure à la coupure. | Aucun nouveau chantier web ; la migration déjà identifiée reste un sujet de maintenance, pas un nouveau ticket. |
| Vite | [Vite 8.3.0](https://github.com/vitejs/vite/releases/tag/v8.3.0), **10 septembre 2026 à 11:25 UTC** | Aucune release postérieure à la coupure. | Aucun nouveau risque de build ou de PWA à instruire aujourd'hui. |
| PWA | [vite-plugin-pwa 1.3.0](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v1.3.0), **5 mai 2026 à 15:03 UTC** | Aucune release postérieure à la coupure. | Aucun nouveau changement Workbox/service worker à planifier. |
| Expo | [Changelog Expo](https://expo.dev/changelog), dernière entrée **15 septembre 2026** (`Expo SDK 58 Beta`) | Aucune entrée nouvelle ; SDK 58 reste explicitement une bêta de trois à quatre semaines dans l'[annonce officielle](https://expo.dev/changelog/sdk-58-beta). | Aucun motif nouveau pour modifier la cible mobile stable déjà retenue. |
| React Native | [React Native 0.88.0-rc.1](https://github.com/react/react-native/releases/tag/v0.88.0-rc.1), **16 septembre 2026 à 09:35 UTC** | Aucune release postérieure à la coupure ; la dernière reste une préversion. | Aucun changement de faisabilité mobile. |
| Express | [Express 4.22.2](https://github.com/expressjs/express/releases/tag/v4.22.2), **11 mai 2026 à 18:54 UTC** | Aucune release postérieure à la coupure. | Aucun nouveau travail API à ouvrir. |
| Node.js | [Flux officiel des releases Node.js](https://nodejs.org/en/blog/release), dernière entrée **16 septembre 2026** (`26.9.0`, Current) | Aucun billet de release ou de vulnérabilité daté dans la fenêtre. | Aucun changement de runtime ou de dépendance à lancer sur ce delta. |
| PostgreSQL | [Archive officielle](https://www.postgresql.org/about/newsarchive/), dernière release du cœur **13 août 2026** (`18.6/17.11/16.15/15.19/14.24` et `19 Beta 3`) | L'[archive sécurité officielle](https://www.postgresql.org/about/newsarchive/security/) ne contient aucune annonce postérieure au 13 août 2026. | La vérification de version de production déjà identifiée reste nécessaire ; aucun nouvel avis ne la modifie. |

### Sécurité des dépendances

La requête officielle GitHub Advisory Database limitée à l'écosystème `npm` et à la fenêtre exacte a renvoyé une liste vide : [requête reproductible](https://api.github.com/advisories?ecosystem=npm&published=2026-09-19T21%3A01%3A27Z..2026-09-19T22%3A04%3A55Z&per_page=100), contrôlée le **20 septembre 2026 à 00:04 CEST**. Le [registre de sécurité PostgreSQL](https://www.postgresql.org/support/security/) expose toujours comme correctifs les versions publiées le **13 août 2026**. Ces deux contrôles ne remplacent pas un audit des lockfiles du dépôt ; ils établissent seulement qu'aucune nouvelle publication officielle dans la fenêtre ne justifie un ticket additionnel.

## Produit, collaboration, calendrier et réunions

| Éditeur / canal officiel | Dernière publication visible | Conclusion différentielle |
|---|---:|---|
| Google Workspace | [Flux officiel Workspace Updates](https://workspaceupdates.googleblog.com/), dernière entrée **18 septembre 2026** (`Weekly Recap`) | Aucun billet nouveau après la coupure ; aucun changement Calendar, Tasks ou Meet à évaluer. |
| Microsoft Graph / Microsoft 365 | [What's new in Microsoft Graph](https://learn.microsoft.com/en-us/graph/whats-new-overview), rubrique **septembre 2026** ; [AI at Work Roadmap](https://www.microsoft.com/en-us/microsoft-365/roadmap) | Les pages ne publient pas d'heure exploitable pour leurs éléments mensuels et aucune annonce datée dans la fenêtre n'a été trouvée. Aucun delta confirmé pour calendriers, réunions, tâches ou plans. |
| Slack | [Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes), rubrique **septembre 2026** | La rubrique mensuelle n'affiche ni jour ni heure. Ses filtres d'activité et statistiques Slackbot/MCP ne peuvent pas être attribués à cette fenêtre stricte et ne justifient pas un ticket Planii. |
| Linear | [Changelog Linear](https://linear.app/changelog), dernière release **14 septembre 2026** (`Loops for product management`) | Aucune release postérieure à la coupure. La communication de marque datée du 19 septembre déjà observée n'est pas une livraison produit et reste hors delta. |
| Notion | [Nouveautés Notion](https://www.notion.com/releases), dernière release **15 septembre 2026** (`Notion 3.7`) | Aucune publication postérieure à la coupure. |
| Atlassian / Jira | [Jira Launch Notes](https://jirareleases.atlassian.com/), dernière entrée datée **16 septembre 2026** (`BearQ for Jira`) ; `Jira Planner: Early Access` est daté du **4 septembre 2026** | Aucune publication postérieure à la coupure ; aucun signal nouveau sur planification, tickets ou réunions. |

## Accessibilité, RGPD et cadre européen

- La [W3C Web Accessibility Initiative](https://www.w3.org/WAI/news/) affiche comme dernière actualité le brouillon WCAG 3 du **10 septembre 2026** ; le [flux général W3C](https://www.w3.org/news/) affiche comme dernière publication le brouillon SHACL 1.2 du **17 septembre 2026**. Aucun standard, erratum ou guide d'accessibilité n'a été publié dans la fenêtre.
- Le [fil d'actualité officiel de la Commission sur l'IA](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) affiche comme actualité la plus récente la neuvième réunion de l'AI Board du **18 septembre 2026**. Les [lignes directrices de transparence de l'AI Act](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-guidelines-transparency-obligations-providers-and-deployers-certain-ai-systems) restent datées du **20 juillet 2026** et applicables depuis le 2 août 2026 ; aucun texte nouveau dans la fenêtre ne change l'analyse Planii déjà consignée.
- Le [123e plénum de l'EDPB](https://www.edpb.europa.eu/meetings/123rd-plenary-meeting_en) est daté du **17 septembre 2026** et mentionne seulement des lignes directrices encore en discussion sur l'articulation AI Act/RGPD. Aucun document adopté et publié dans la fenêtre n'a été identifié.

## Coûts et conditions commerciales

Les pages tarifaires officielles d'[Expo EAS](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing) et [Slack](https://slack.com/pricing) ont été relues le **20 septembre 2026**. Elles n'exposent pas d'horodatage de changement ni de journal tarifaire permettant d'établir une modification après `2026-09-19T21:01:27.620Z`. En conséquence, aucun surcoût fournisseur nouveau ne peut être attribué à cette fenêtre et aucun arbitrage budgétaire supplémentaire n'est proposé.

## Pourquoi aucun ticket n'est justifié

1. Aucun framework ou composant de la stack réelle n'a publié de release dans la fenêtre.
2. Aucun avis npm ni avis PostgreSQL officiel nouveau n'a été publié dans la fenêtre.
3. Aucun éditeur de planification, calendrier, réunion ou collaboration contrôlé n'a livré une nouveauté datable dans la fenêtre.
4. Aucun standard W3C, texte européen, décision EDPB/EDPS ou changement tarifaire datable n'a été publié dans la fenêtre.
5. Les éléments sans heure ou sans historique de modification ne sont pas promus artificiellement en « nouveauté » ; cela évite les doublons, les effets de mode et les tickets sans preuve.

## Recommandation

**Ne pas modifier le backlog à partir de cette veille.** Conserver les priorités existantes et refaire le contrôle au prochain run, en comparant le contenu des pages mensuelles ou non horodatées plutôt qu'en supposant qu'une date de crawl constitue une date de publication.

---

## Exécution du 20 septembre 2026 à 01:02 CEST

**Fenêtre contrôlée :** du `2026-09-19T22:01:27.841Z` au `2026-09-19T23:02:20Z` (du 20 septembre 00:01:27 au 20 septembre 01:02:20, Europe/Brussels).

### Verdict différentiel

**Aucun signal significatif, nouveau et datable dans cette fenêtre d'environ 61 minutes.** Cette exécution ne justifie ni nouvelle opportunité produit, ni ticket de sécurité, conformité, accessibilité, dépendance ou coût. Les résultats utiles de l'exécution précédente sont conservés ci-dessus ; ils ne sont pas dupliqués comme nouveautés.

### Sources officielles contrôlées

| Domaine | Dernier signal officiel visible au moment du contrôle | Conclusion pour la fenêtre |
|---|---|---|
| Sécurité npm | La requête de l'[API officielle GitHub Advisory Database](https://api.github.com/advisories?ecosystem=npm&published=2026-09-19T22%3A01%3A27Z..2026-09-19T23%3A02%3A20Z&per_page=100), bornée aux dates de **publication** de la fenêtre, a renvoyé une liste vide le **20 septembre 2026 à 01:02 CEST**. | Aucun avis npm publié dans la fenêtre. Ce contrôle de publications ne remplace pas l'analyse des lockfiles du dépôt. |
| React / Vite / PWA / Express / React Native | Les dernières releases officielles visibles restent [React 19.3.0](https://github.com/react/react/releases/tag/v19.3.0), publiée le **9 septembre 2026 à 18:01 UTC** ; [Vite 8.3.0](https://github.com/vitejs/vite/releases/tag/v8.3.0), publiée le **10 septembre 2026 à 11:25 UTC** ; [vite-plugin-pwa 1.3.0](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v1.3.0), publiée le **5 mai 2026 à 15:03 UTC** ; [Express 5.2.1](https://github.com/expressjs/express/releases/tag/v5.2.1), hors fenêtre ; et [React Native 0.88.0-rc.1](https://github.com/facebook/react-native/releases/tag/v0.88.0-rc.1), publiée le **16 septembre 2026 à 09:35 UTC**. | Aucune release attribuable à la fenêtre ; aucune modification de faisabilité pour React/Vite/PWA, Express ou Expo/React Native. Les préversions ne sont pas promues en cible de production. |
| Expo / Node.js / PostgreSQL | Le [changelog Expo](https://expo.dev/changelog) s'arrête à **Expo SDK 58 Beta, publié le 15 septembre 2026** ; le [flux Node.js](https://nodejs.org/en/blog/release) à **Node.js 26.9.0, publié le 16 septembre 2026** ; l'[archive PostgreSQL](https://www.postgresql.org/about/newsarchive/) n'affiche aucune publication du projet cœur après le **13 août 2026**, et l'[archive sécurité PostgreSQL](https://www.postgresql.org/about/newsarchive/security/) conserve cette même date comme dernière publication du projet. | Aucun changement runtime, mobile, base de données ou sécurité dans la fenêtre. |
| Google Workspace | Le [flux officiel Workspace Updates](https://workspaceupdates.googleblog.com/) conserve comme dernière publication le **Weekly Recap du 18 septembre 2026**. Les annonces récapitulées décrivent des événements de déploiement antérieurs ou futurs ; leur **date d'événement** ne doit pas être confondue avec une nouvelle **date de publication** dans cette fenêtre. | Aucun nouveau signal Calendar, Tasks, Meet ou collaboration publié dans la fenêtre. |
| Linear / Notion / Jira | Les derniers changelogs restent [Linear, « Loops for product management »](https://linear.app/changelog), publié le **14 septembre 2026** ; [Notion 3.7](https://www.notion.com/releases), publié le **15 septembre 2026** ; et [Jira Launch Notes](https://jirareleases.atlassian.com/), dernière entrée publiée le **16 septembre 2026**. | Aucun nouveau signal de planification, projet, tâche ou réunion publié dans la fenêtre. |
| Slack / Microsoft 365 | [Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes) présente une rubrique **septembre 2026** sans jour ni heure de publication. [Microsoft Graph — What's new](https://learn.microsoft.com/en-us/graph/whats-new-overview) et l'[AI at Work Roadmap Microsoft 365](https://www.microsoft.com/en-us/microsoft-365/roadmap) ne fournissent pas d'horodatage fin permettant d'attribuer un ajout à cette fenêtre. | Aucun élément non horodaté n'est qualifié artificiellement de nouveauté ; aucun ticket d'intégration n'est justifié. |
| Accessibilité | La dernière actualité [W3C WAI](https://www.w3.org/WAI/news/) reste le brouillon WCAG 3 publié le **10 septembre 2026**. | Aucun standard, note ou erratum d'accessibilité publié dans la fenêtre. |
| RGPD / AI Act | La page officielle de la Commission sur l'[intelligence artificielle](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) affiche comme dernière actualité la réunion de l'AI Board du **18 septembre 2026**. Le [fil EDPB](https://www.edpb.europa.eu/news_en) ne montre aucune actualité EDPB ni autorité nationale publiée dans la fenêtre. La date d'une réunion est une **date d'événement** ; elle n'établit pas une nouvelle règle publiée pendant la fenêtre. | Aucun texte, ligne directrice ou décision nouvelle modifiant l'analyse RGPD/AI Act de Planii. |
| Coûts | Les pages officielles [Expo EAS](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing) et [Slack](https://slack.com/pricing) n'exposent pas de journal public horodaté à la minute. | Aucun changement tarifaire vérifiable ne peut être attribué à la fenêtre ; aucun arbitrage de coût supplémentaire. |

### Recommandation de cette exécution

**Ne pas modifier le backlog sur la base de cette veille.** Reprendre au prochain passage la comparaison différentielle des pages mensuelles ou non horodatées, et réserver la création de tickets aux changements publiés officiellement, précisément datés, applicables à la stack réelle et non déjà couverts.

---

## Exécution du 20 septembre 2026 à 09:28 CEST

**Fenêtre contrôlée :** du `2026-09-20T02:07:43.769Z` (dernière exécution déclarée) au `2026-09-20T07:28:02Z`.

### Verdict différentiel

**Aucun signal significatif, nouveau et datable n'a été identifié dans cette fenêtre.** Aucun changement de backlog, de dépendance, de conformité ou de coût n'est justifié par les contrôles ci-dessous. Les éléments publiés avant la coupure restent hors delta, même lorsqu'ils apparaissent encore en tête de leur flux.

### Sources officielles vérifiées

| Domaine | Contrôle primaire horodaté | Conclusion pour Planii |
|---|---|---|
| Sécurité npm | La [GitHub Advisory Database — requête npm](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T02%3A07%3A43Z..2026-09-20T07%3A28%3A02Z&per_page=100), bornée aux dates de publication de la fenêtre, renvoie une liste vide, contrôlée le **20 septembre 2026 à 09:28 CEST**. | Aucun avis npm nouvellement publié ; ce résultat ne remplace pas l'audit des lockfiles. |
| React | La [release officielle React 19.3.0](https://github.com/react/react/releases/tag/v19.3.0) reste la plus récente visible, publiée le **9 septembre 2026 à 18:01 UTC**. | Aucune release React dans le delta ; aucun chantier web supplémentaire. |
| Vite / Express | Les releases officielles les plus récentes visibles restent [Vite 8.3.0](https://github.com/vitejs/vite/releases/tag/v8.3.0), publiée le **10 septembre 2026 à 11:25 UTC**, et [Express 4.22.2](https://github.com/expressjs/express/releases/tag/v4.22.2), publiée le **11 mai 2026 à 18:54 UTC**. | Aucune release de build, PWA ou API dans le delta. |
| Expo / React Native | Le [changelog Expo](https://expo.dev/changelog) conserve **Expo SDK 58 Beta** du **15 septembre 2026** comme dernière entrée ; aucune entrée postérieure n'est affichée. | Aucun changement mobile datable ; une bêta ne devient pas une cible de production. |
| Calendrier, réunions et collaboration | Le [flux officiel Google Workspace](https://workspaceupdates.googleblog.com/) conserve comme dernière publication le **Weekly Recap du 18 septembre 2026**. Il récapitule notamment des annonces antérieures ; aucune publication datée après la coupure n'est affichée. | Aucun nouveau signal vérifiable pour Calendar, Tasks, Meet ou intégrations collaboratives. |
| Accessibilité et RGPD | Les fils officiels [W3C WAI](https://www.w3.org/WAI/news/) et [EDPB](https://www.edpb.europa.eu/news_en) ne présentent aucune publication nouvelle, précisément datée dans la fenêtre. | Aucun changement de cible WCAG 2.2 AA ni de cadre RGPD/AI Act à appliquer. |

### Décision

**Ne pas modifier le backlog sur ce delta.** Reprendre la même coupure UTC au prochain passage et ne retenir qu'une publication officielle dont la date appartient réellement à la nouvelle fenêtre.

---

## Contrôle de relance du 20 septembre 2026 à 09:36 CEST

**Fenêtre contrôlée :** du `2026-09-20T01:34:54.795Z` au `2026-09-20T07:32:47Z`. La requête plus large de la [GitHub Advisory Database pour npm](https://api.github.com/advisories?ecosystem=npm&published=2026-09-19T23%3A06%3A09Z..2026-09-20T07%3A32%3A47Z&per_page=100) a renvoyé une liste vide. Les canaux officiels React, Vite, Expo, React Native, PostgreSQL, Google Workspace, Microsoft Graph, Slack, Linear, Notion, Jira, W3C WAI, EDPB et Commission européenne n'affichent aucune publication nouvelle, datée et applicable à Planii dans cette fenêtre.

La relecture de la source primaire Jira a permis de corriger l'attribution ci-dessus : `BearQ for Jira` est l'entrée du 16 septembre et `Jira Planner: Early Access` celle du 4 septembre. Cette correction documentaire ne constitue pas une nouveauté produit et ne change aucune recommandation ni aucun ticket.

---

## Exécution du 20 septembre 2026 à 15:05 CEST

**Fenêtre contrôlée :** du `2026-09-20T12:01:10.035Z` au `2026-09-20T13:05:00Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, daté et actionnable n'a été établi dans la fenêtre.** Aucun ticket produit, technique, sécurité, conformité, accessibilité ou coût n'est créé. Les contrôles de dépôt ont en revanche justifié la mise à jour des statuts de PLANI-002, PLANI-013 et PLANI-017 dans le backlog.

### Sources officielles contrôlées

| Domaine | Source primaire | Résultat |
|---|---|---|
| Sécurité npm | [GitHub Advisory Database — npm, fenêtre exacte](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T12%3A01%3A10Z..2026-09-20T13%3A02%3A57Z&per_page=100) | Réponse `[]` obtenue via l'API officielle à 15:05 CEST. Ce contrôle de publications ne remplace pas l'audit des lockfiles. |
| Stack web/API | [React releases](https://github.com/facebook/react/releases), [Vite releases](https://github.com/vitejs/vite/releases), [Express releases](https://github.com/expressjs/express/releases) | Aucune release appartenant à la fenêtre. |
| Mobile | [Expo changelog](https://expo.dev/changelog), [Expo SDK 58 Beta](https://expo.dev/changelog/sdk-58-beta), [React Native releases](https://github.com/react/react-native/releases) | Aucun signal stable nouveau ; ne pas substituer une bêta à la cible stable de PLANI-024. |
| PostgreSQL | [Archive sécurité](https://www.postgresql.org/about/newsarchive/security/), [politique de versions](https://www.postgresql.org/support/versioning/) | Aucun avis dans la fenêtre ; la version de production reste à vérifier dans PLANI-025. |
| Collaboration | [Google Workspace Updates](https://workspaceupdates.googleblog.com/), [Linear](https://linear.app/changelog), [Notion](https://www.notion.com/releases), [Jira](https://jirareleases.atlassian.com/) | Aucun élément daté dans la fenêtre ne franchit le seuil d'un nouveau ticket. |
| Accessibilité / RGPD / IA | [W3C WAI](https://www.w3.org/WAI/news/), [EDPB](https://www.edpb.europa.eu/news_en), [Commission européenne — IA](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) | Aucun texte daté dans la fenêtre ne change les exigences actuelles. |
| Coûts | [Expo](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing), [Slack](https://slack.com/pricing) | Aucun changement tarifaire daté et attribuable à la fenêtre. |

### Limites

Les pages mensuelles ou sans historique horodaté ne permettent pas d'attribuer un changement à cette fenêtre courte. Elles ont été contrôlées sans convertir une date de consultation en date de publication.

---

## Exécution du 20 septembre 2026 à 16:02 CEST

**Fenêtre contrôlée :** du `2026-09-20T13:01:10.275Z` au `2026-09-20T14:02:27Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, daté et actionnable n'a été identifié.** Aucun ticket n'est justifié par cette veille.

| Domaine | Source primaire officielle | Conclusion |
|---|---|---|
| Sécurité npm | [GitHub Advisory Database — requête npm sur la fenêtre exacte](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T13%3A01%3A10Z..2026-09-20T14%3A02%3A27Z&per_page=100), réponse `[]` contrôlée à `14:02:27Z` | Aucun avis npm publié; ce contrôle ne remplace pas l'audit des lockfiles. |
| React / Vite / PWA / Express | [React releases](https://github.com/react/react/releases), [Vite releases](https://github.com/vitejs/vite/releases), [vite-plugin-pwa releases](https://github.com/vite-pwa/vite-plugin-pwa/releases), [Express releases](https://github.com/expressjs/express/releases) | Aucune release dans la fenêtre; aucun changement de faisabilité pour la stack réelle. |
| Expo / React Native | [Expo changelog](https://expo.dev/changelog), [React Native releases](https://github.com/react/react-native/releases) | Aucun signal stable nouveau; les dernières entrées restent une bêta Expo et une préversion React Native, incompatibles avec la cible stable actuelle. |
| PostgreSQL | [Archive sécurité PostgreSQL](https://www.postgresql.org/about/newsarchive/security/) | Aucun avis dans la fenêtre; PLANI-025 couvre déjà la version de production inconnue. |
| Collaboration | [Google Workspace Updates](https://workspaceupdates.googleblog.com/), [Linear](https://linear.app/changelog), [Notion](https://www.notion.com/releases), [Jira](https://jirareleases.atlassian.com/) | Aucune publication précisément datée dans la fenêtre; aucune intégration supplémentaire justifiée. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | Dernière publication visible le 10 septembre 2026; cible WCAG 2.2 AA inchangée. |
| RGPD / AI Act | [EDPB News](https://www.edpb.europa.eu/news_en), [Commission européenne — IA](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) | Aucun texte nouveau dans la fenêtre; conserver minimisation, sécurité et transparence. |
| Coûts | [Expo](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing), [Slack](https://slack.com/pricing) | Aucun changement tarifaire publiquement horodaté dans la fenêtre; aucun surcoût démontré. |

### Décision

Ne pas créer de ticket à partir de ce delta. Reprendre le prochain contrôle à `2026-09-20T14:02:27Z` et ne qualifier une nouveauté que si sa date de publication officielle appartient réellement à la nouvelle fenêtre.

---

## Exécution du 20 septembre 2026 à 17:03 CEST

**Fenêtre contrôlée :** du `2026-09-20T14:01:10.374Z` au `2026-09-20T15:03:52Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, précisément daté et significatif n'a été publié ou modifié dans la fenêtre. Aucun ticket n'est justifié.** La borne de la requête npm est arrondie vers le bas à la seconde, car l'API refuse les fractions ; cela ne peut créer qu'un faux positif, pas masquer un avis.

| Domaine | Source primaire officielle | Conclusion |
|---|---|---|
| Sécurité npm | [GitHub Advisory Database — requête bornée](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T14%3A01%3A10Z..2026-09-20T15%3A03%3A52Z&per_page=100), réponse officielle `[]` contrôlée à `15:03:52Z` | Aucun avis npm publié dans la fenêtre ; ce contrôle ne remplace pas l'audit des lockfiles ni la recherche d'avis modifiés après publication. |
| React / Vite / PWA / Express / Node.js | [React releases](https://github.com/facebook/react/releases), [Vite releases](https://github.com/vitejs/vite/releases), [vite-plugin-pwa releases](https://github.com/vite-pwa/vite-plugin-pwa/releases), [Express releases](https://github.com/expressjs/express/releases), [Node.js releases](https://nodejs.org/en/blog/release) | Aucune release dans la fenêtre ; les dernières publications visibles sont antérieures à la coupure et déjà couvertes. |
| Expo / React Native | [Expo changelog](https://expo.dev/changelog), [Expo SDK 58 Beta](https://expo.dev/changelog/sdk-58-beta), [React Native releases](https://github.com/facebook/react-native/releases) | Aucun signal stable nouveau ; une bêta/RC ne remplace pas la cible stable de PLANI-024. |
| PostgreSQL | [Archive PostgreSQL](https://www.postgresql.org/about/newsarchive/), [archive sécurité](https://www.postgresql.org/about/newsarchive/security/) | Aucun avis du cœur dans la fenêtre ; PLANI-025 couvre déjà la version de production inconnue. |
| Collaboration, calendrier et réunions | [Google Workspace Updates](https://workspaceupdates.googleblog.com/2026/09/weekly-recap-09-18-2026.html), [Linear](https://linear.app/changelog/2026-09-14-loops-for-product-management), [Notion](https://www.notion.com/en-gb/releases/2026-09-15), [Jira](https://jirareleases.atlassian.com/) | Les dernières publications visibles datent du 14 au 18 septembre ; aucune intégration supplémentaire n'est justifiée. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | Dernière actualité visible le 10 septembre 2026 ; cible WCAG 2.2 AA inchangée. |
| RGPD / AI Act | [EDPB News](https://www.edpb.europa.eu/news_en), [Commission européenne — neuvième AI Board](https://digital-strategy.ec.europa.eu/en/news/ai-board-holds-its-ninth-meeting) | Aucun texte, guide ou décision publié dans la fenêtre ; les obligations existantes restent inchangées. |
| Coûts | [Expo](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing), [Slack](https://slack.com/pricing) | Aucun historique horodaté ne permet d'attribuer un changement tarifaire à la fenêtre ; aucun surcoût nouveau n'est démontré. |

### Décision

Ne créer ni modifier aucun ticket à partir de cette veille. Reprendre le contrôle suivant à partir de `2026-09-20T15:03:52Z` et continuer à exclure les simples dates de crawl, rubriques mensuelles ou activités de dépôt sans release.

---

## Exécution du 20 septembre 2026 à 18:06 CEST

**Fenêtre officielle contrôlée :** du `2026-09-20T15:03:52Z` au `2026-09-20T16:03:39Z`. **Audit du dépôt et des lockfiles :** jusqu'au `2026-09-20T16:06:29Z`.

### Verdict différentiel

Aucune source officielle n'a publié ou modifié un avis dans la fenêtre : les requêtes GitHub Advisory Database npm `published` et `modified` renvoient toutes deux `[]`. Un audit frais des lockfiles révèle toutefois une dette antérieure, non suivie et applicable aux chemins réels de Planii. Cette preuve locale justifie PLANI-027, PLANI-028 et PLANI-029 sans présenter les avis comme de nouvelles publications.

### Sources officielles et preuves

| Axe | Source primaire officielle ou preuve du dépôt | Résultat et décision |
|---|---|---|
| Delta npm publié | [GitHub Advisory Database — `published`](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T15%3A03%3A52Z..2026-09-20T16%3A03%3A39Z&per_page=100) | Réponse `[]`. |
| Delta npm modifié | [GitHub Advisory Database — `modified`](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T15%3A03%3A52Z..2026-09-20T16%3A03%3A39Z&per_page=100) | Réponse `[]`. |
| Lockfile backend | `npm audit --package-lock-only --json` sur `planii-backend/package-lock.json` | 14 avis : 8 hauts, 6 modérés, 0 critique. Directs signalés : `multer`, `mailparser`, `nodemailer`, `express`, `imapflow`, `vitest`. |
| Lockfile web | `npm audit --package-lock-only --json` sur `planii-vite/package-lock.json` | 9 avis : 7 hauts, 2 modérés, 0 critique. Directs hauts : `xlsx`, `vite`, `postcss`. |
| Lockfile mobile | `npm audit --package-lock-only --json` sur `planii-mobile/package-lock.json` | 30 avis : 13 hauts, 17 modérés, 0 critique. Directs hauts : `xlsx` et la chaîne `expo`; les correctifs Expo proposés convergent vers SDK 57 déjà couvert par PLANI-024. |
| Multer champs multipart | [GHSA-wc9g-mqfw-jrwm](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm), publié le 28 août 2026, corrigé en 2.3.0 | `multer@2.2.0` de Planii est dans la plage ; `memoryStorage` n'empêche pas l'arrêt via noms de champs forgés. |
| Multer index de tableau | [GHSA-535w-7cp7-47q4](https://github.com/advisories/GHSA-535w-7cp7-47q4), publié le 28 août 2026, corrigé en 2.3.0 | Un seul corps multipart peut bloquer la boucle Node ; la source recommande aussi une limite d'index explicite. |
| Multer upload interrompu | [GHSA-qfvm-cv95-jqjf](https://github.com/advisories/GHSA-qfvm-cv95-jqjf), publié le 28 août 2026, corrigé en 2.3.0 | L'impact décrit vise `diskStorage`; Planii utilise `memoryStorage`. Cet avis précis est donc non applicable, à documenter plutôt qu'à compter comme exposition réelle. |
| Nodemailer | [GHSA-2x7j-588g-ccc2](https://github.com/advisories/GHSA-2x7j-588g-ccc2), publié le 1er septembre 2026, corrigé en 9.1.0 | `nodemailer@6.10.1` est dans la plage. Les chemins SMTP/IMAP doivent être bornés et testés avant montée majeure. |
| SheetJS / `xlsx` | [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) et [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | `xlsx@0.18.5` lit des fichiers utilisateurs dans les deux clients et est affecté par pollution de prototype et ReDoS. GitHub n'indique aucune version npm corrigée ; provenance, licence et intégrité doivent être décidées avant remplacement. |
| Usage réel | `planii-backend/src/services/upload.service.ts`, `planii-backend/src/services/imap.service.ts`, `planii-vite/src/lib/taskImportParse.ts`, `planii-mobile/src/lib/taskImportParse.ts` | Les dépendances vulnérables sont appelées sur des entrées réseau ou fichiers utilisateurs ; un ticket est donc justifié par l'audit, pas par le seul score. |

### Autres canaux contrôlés

React, Vite, vite-plugin-pwa, Express, Node.js, Expo, React Native, PostgreSQL, Google Workspace, Linear, Notion, Jira, Asana, ClickUp, Calendly, W3C WAI, EDPB, Commission européenne, Render, Neon, Vercel et les tarifs Expo/Linear/Notion/Slack ne présentent aucune publication nouvelle, précisément datée dans la fenêtre.

### Décision

Créer un parent partagé/backend PLANI-027 puis deux sous-tickets distincts PLANI-028 (web) et PLANI-029 (mobile). Conserver PLANI-024 comme préalable mobile. Ne pas utiliser `npm audit fix --force` et ne pas choisir de source SheetJS hors registre sans revue de licence, intégrité et maintenance.

---

## Exécution du 20 septembre 2026 à 19:07 CEST

**Fenêtre officielle contrôlée :** du `2026-09-20T16:03:39Z` au `2026-09-20T17:04:58Z`. **Audit différentiel du dépôt :** du `2026-09-20T16:00:40.942Z` au `2026-09-20T17:07:05Z`.

### Verdict différentiel

Aucune publication officielle nouvelle et actionnable n'est établie dans la fenêtre : les requêtes npm `published` et `modified` renvoient `[]`. Le dépôt révèle toutefois un conflit existant entre l'intégration Jitsi, les politiques navigateur versionnées et le chemin Docker/Nginx de production. Cette preuve locale justifie PLANI-030 et bloque la validation de production de PLANI-026.

### Sources officielles et preuves

| Axe | Source primaire officielle ou preuve du dépôt | Résultat et décision |
|---|---|---|
| Delta npm publié | [GitHub Advisory Database — `published`](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T16%3A03%3A39Z..2026-09-20T17%3A04%3A58Z&per_page=100) | Réponse `[]` au 20 septembre 2026 à 17:04:58Z. |
| Delta npm modifié | [GitHub Advisory Database — `modified`](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T16%3A03%3A39Z..2026-09-20T17%3A04%3A58Z&per_page=100) | Réponse `[]` ; PLANI-027 à 029 couvrent les avis antérieurs détectés dans les lockfiles. |
| Jitsi IFrame API | [Documentation officielle](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/), mise à jour le **15 septembre 2026** | L'intégration charge `https://meet.jit.si/external_api.js` et instancie `JitsiMeetExternalAPI`, comme `planii-vite/src/components/Meeting.tsx`. |
| Content Security Policy | [W3C CSP Level 3](https://www.w3.org/TR/CSP3/#directives), Working Draft du **16 septembre 2026** | `script-src` et `frame-src` contrôlent les ressources utilisées par Jitsi. `planii-vite/nginx.conf` ne permet ni le script ni le cadre distant. |
| Permissions Policy | [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy-1/#examples), Working Draft du **18 juin 2026** | Caméra et micro sont désactivés par défaut dans les cadres cross-origin sans délégation. La politique Planii `camera=(), microphone=(self)` interdit cette délégation à Jitsi. |
| Point d'entrée public | [https://planii.app/](https://planii.app/), en-têtes observés le **20 septembre 2026 à 17:05:53Z** | Réponse 200, `server: nginx/1.31.3`, sans CSP ni Permissions-Policy. Le durcissement versionné n'est donc pas observable au point d'entrée public actuel. |
| Chemin de livraison | `planii-vite/Dockerfile`, `planii-vite/nginx.conf`, `scripts/deploy-planii.sh` | Le Dockerfile copie la politique et le script de déploiement reconstruit l'image ; le conflit doit être résolu avant la validation de PLANI-026. |
| Preuve web | `npm run test:e2e` dans `planii-vite` le **20 septembre 2026 à 19:05 CEST** | Build Vite/PWA réussi et 23/23 tests Playwright verts. PLANI-013 reste ouvert pour la revue manuelle lecteur d'écran. |

### Autres canaux contrôlés

React, Vite, Express, vite-plugin-pwa, Expo, React Native, PostgreSQL, Google Workspace, Linear, Notion, Jira, W3C WAI, EDPB, Commission européenne et les pages de prix Expo/Linear/Notion/Slack ne présentent aucune publication nouvelle, précisément datée et applicable dans la fenêtre. Les pages sans historique horodaté fin sont traitées comme limites de preuve, jamais comme preuve absolue d'absence.

### Décision

Créer PLANI-030 pour Claude Code, bloqué sur PLANI-013 afin d'éviter une modification concurrente de `Meeting.tsx`. Faire dépendre la validation de production de PLANI-026 de PLANI-030. Ne pas élargir la CSP par joker et ne pas présumer la base légale RGPD : documenter le fournisseur, la région, la sous-traitance, la conservation, les conditions et le coût, puis faire valider l'analyse juridique.

---

## Exécution du 20 septembre 2026 à 20:05 CEST

**Fenêtre officielle contrôlée :** du `2026-09-20T17:04:58Z` au `2026-09-20T18:05:00Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, précisément daté et actionnable n'a été identifié.** Aucun ticket ni changement de priorité n'est justifié.

| Domaine | Source primaire officielle | Conclusion |
|---|---|---|
| Sécurité npm | [Avis publiés](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T17%3A04%3A58Z..2026-09-20T18%3A05%3A00Z&per_page=100) et [avis modifiés](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T17%3A04%3A58Z..2026-09-20T18%3A05%3A00Z&per_page=100) dans GitHub Advisory Database | Les deux réponses sont `[]`; PLANI-027 à 029 couvrent déjà les dettes antérieures prouvées par les lockfiles. |
| Stack web et mobile | [React](https://github.com/react/react/releases), [Vite](https://github.com/vitejs/vite/releases), [Expo](https://expo.dev/changelog), [React Native](https://github.com/react/react-native/releases) | Aucune release dans la fenêtre; Expo SDK 58 reste une bêta et ne remplace pas la cible stable de PLANI-024. |
| Base de données | [PostgreSQL — archive sécurité](https://www.postgresql.org/about/newsarchive/security/) | Aucun avis nouveau; PLANI-025 couvre toujours l'inventaire et la mise à niveau de production. |
| Collaboration et réunions | [Google Workspace Updates](https://workspaceupdates.googleblog.com/) | La dernière publication visible reste le récapitulatif du 18 septembre 2026; aucun nouveau signal Calendar, Tasks ou Meet. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | La dernière actualité reste le brouillon WCAG 3 du 10 septembre 2026; la cible WCAG 2.2 AA de PLANI-013 ne change pas. |
| RGPD | [EDPB News](https://www.edpb.europa.eu/news_en) | Aucun texte ou décision applicable publié dans la fenêtre. |
| Coûts | [Expo](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing), [Slack](https://slack.com/pricing) | Aucun historique horodaté ne permet d'établir un changement de prix dans cette fenêtre; aucun surcoût nouveau n'est retenu. |

### Décision

Conserver le backlog à 30 tickets et le plan du jour à l'identique. Reprendre la prochaine veille à `2026-09-20T18:05:00Z`.

---

## Exécution du 20 septembre 2026 à 21:02 CEST

**Fenêtre officielle contrôlée :** du `2026-09-20T18:05:00Z` au `2026-09-20T19:02:12Z`. **Audit différentiel du dépôt :** depuis la coupure fournie `2026-09-20T18:00:42.379Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, précisément daté et actionnable n'a été identifié.** Aucun ticket, statut, propriétaire, dépendance ou ordre de prise n'est modifié.

| Domaine | Source primaire officielle | Conclusion |
|---|---|---|
| Sécurité npm | [Avis publiés](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T18%3A05%3A00Z..2026-09-20T19%3A02%3A12Z&per_page=100) et [avis modifiés](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T18%3A05%3A00Z..2026-09-20T19%3A02%3A12Z&per_page=100) dans GitHub Advisory Database | Les deux réponses sont `[]`; PLANI-027 à 029 couvrent déjà les dettes antérieures prouvées par les lockfiles. |
| Stack web/API | [React](https://github.com/react/react/releases), [Vite](https://github.com/vitejs/vite/releases), [Express](https://github.com/expressjs/express/releases) | Les dernières releases visibles sont antérieures à la fenêtre ; aucun changement de cible n'est justifié. |
| Stack mobile | [Expo](https://expo.dev/changelog), [React Native](https://github.com/react/react-native/releases) | Aucune publication stable dans la fenêtre ; PLANI-024 reste ciblé sur Expo SDK 57 stable. |
| Base de données | [PostgreSQL — archive sécurité](https://www.postgresql.org/about/newsarchive/security/) | Aucun avis dans la fenêtre ; PLANI-025 reste suffisant. |
| Collaboration et réunions | [Google Workspace Updates](https://workspaceupdates.googleblog.com/), [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/) | Aucune annonce datée dans la fenêtre ; PLANI-030 couvre déjà Jitsi et les politiques navigateur. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/) | Aucun texte nouveau dans la fenêtre ; PLANI-013 conserve la cible WCAG 2.2 AA et ses revues manuelles. |
| RGPD et AI Act | [EDPB News](https://www.edpb.europa.eu/news_en), [Commission européenne — intelligence artificielle](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) | Aucun texte daté dans la fenêtre ne modifie l'analyse de Planii. |
| Coûts | [Expo](https://expo.dev/pricing), [Linear](https://linear.app/pricing), [Notion](https://www.notion.com/pricing), [Slack](https://slack.com/pricing) | Ces pages ne fournissent pas d'historique horodaté à la minute ; aucun changement de prix n'est inféré de la seule date de consultation. |

### Décision

Conserver le backlog à 30 tickets et le plan du jour à l'identique. Reprendre la prochaine veille à `2026-09-20T19:02:12Z`.

---

## Exécution du 20 septembre 2026 à 22:04 CEST

**Fenêtre officielle contrôlée :** du `2026-09-20T19:02:12Z` au `2026-09-20T20:04:22Z`. **Audit différentiel du dépôt :** depuis la coupure fournie `2026-09-20T19:00:38.526Z`.

### Verdict différentiel

**Aucun signal officiel nouveau, précisément daté et actionnable n'a été identifié.** Aucun ticket, statut, propriétaire, dépendance ou ordre de prise n'est modifié.

| Domaine | Source primaire officielle | Conclusion |
|---|---|---|
| Sécurité npm | [Avis publiés](https://api.github.com/advisories?ecosystem=npm&published=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100) et [avis modifiés](https://api.github.com/advisories?ecosystem=npm&modified=2026-09-20T19%3A02%3A12Z..2026-09-20T20%3A04%3A22Z&per_page=100) dans GitHub Advisory Database | Les deux réponses sont `[]`; PLANI-027 à 029 couvrent déjà les dettes antérieures prouvées par les lockfiles. |
| Stack web/API | [React 19.3.0](https://github.com/react/react/releases/tag/v19.3.0), [Vite 8.3.0](https://github.com/vitejs/vite/releases/tag/v8.3.0), [Express 4.22.2](https://github.com/expressjs/express/releases/tag/v4.22.2) | Les dernières versions stables visibles datent respectivement des 9 septembre, 10 septembre et 11 mai 2026, avant la fenêtre. |
| Stack mobile | [Expo changelog](https://expo.dev/changelog), [Expo SDK 58 Beta](https://expo.dev/changelog/sdk-58-beta), [React Native 0.87.1](https://github.com/facebook/react-native/releases/tag/v0.87.1) | Aucune publication stable dans la fenêtre; l'annonce Expo la plus récente reste la bêta SDK 58 du 15 septembre et PLANI-024 conserve la cible SDK 57 stable. |
| Base de données | [PostgreSQL — archive sécurité](https://www.postgresql.org/about/newsarchive/security/) | La dernière publication sécurité reste celle du 13 août 2026; PLANI-025 la couvre déjà. |
| Collaboration et réunions | [Google Workspace Updates](https://workspaceupdates.googleblog.com/), [Microsoft Graph — nouveautés](https://learn.microsoft.com/en-us/graph/whats-new-overview) | Aucune annonce pertinente datée dans la fenêtre; PLANI-009, PLANI-010, PLANI-014 et PLANI-030 couvrent les besoins existants. |
| Accessibilité | [W3C WAI News](https://www.w3.org/WAI/news/), [WCAG 3 Working Draft](https://www.w3.org/WAI/news/2026-09-10/wcag3/) | La dernière actualité WAI reste le brouillon WCAG 3 du 10 septembre; PLANI-013 et PLANI-016 ne changent pas. |
| RGPD et AI Act | [EDPB News](https://www.edpb.europa.eu/feed/news_en), [Commission européenne — intelligence artificielle](https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence) | Aucune entrée, décision ou échéance nouvelle datée dans la fenêtre. Les changements techniques de page ne sont pas assimilés à une publication. |
| Coûts | [Plans Expo](https://docs.expo.dev/billing/plans/), [tarification Expo à l'usage](https://docs.expo.dev/billing/usage-based-pricing/) | Aucun journal de changement tarifaire horodaté dans la fenêtre; aucun surcoût nouveau n'est inféré. |

### Décision

Conserver le backlog à 30 tickets et le plan du jour à l'identique. Reprendre la prochaine veille strictement après `2026-09-20T20:04:22Z`.
