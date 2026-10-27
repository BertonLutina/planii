# Backlog agents Planii

Source de verite partagee pour Cursor AI, Claude Code et Codex. Un agent ne prend qu'un ticket au statut `READY`, respecte les dependances et met a jour le journal du jour. Il ne modifie pas les criteres d'acceptation sans consigner la decision.

## Routage obligatoire

- `Cursor AI`: implementation mobile Expo/React Native uniquement; suit obligatoirement `.cursor/rules/planii-mobile.mdc`, le routeur `expo:expo-overview`, les skills Expo pertinents, `frontend-design`, `ui-ux-pro-max` et les skills 21st adaptes.
- `Claude Code`: implementation web React/Vite/PWA uniquement.
- `Partage/backend`: API, base de donnees et contrats communs requis par les deux clients.
- Un chantier transversal possede un ticket backend partage puis deux sous-tickets client distincts. Aucun fichier ne doit etre attribue simultanement aux deux agents.

## Vue priorisee

| ID | Titre | Proprietaire | Priorite | Effort | Statut | Dependances |
|---|---|---|---:|---:|---|---|
| PLANI-001 | Rendre l'integration backend obligatoire | Partage/backend | P0 | M | READY | Aucune |
| PLANI-002 | Exclure les donnees privees du cache PWA | Claude Code | P0 | S | DONE | Aucune |
| PLANI-003 | Durcir la session web | Claude Code | P0 | L | RESEARCH | PLANI-001 |
| PLANI-004 | Preparer le socle partage des parcours critiques | Partage/backend | P1 | L | RESEARCH | PLANI-001 |
| PLANI-005 | Partager les contrats entre les trois applications | Partage/backend | P1 | L | PROPOSED | PLANI-001 |
| PLANI-006 | Decouper les modules projet et tache web | Claude Code | P1 | L | PROPOSED | PLANI-004, PLANI-005 |
| PLANI-007 | Reduire le chargement initial web | Claude Code | P1 | M | READY | PLANI-004 |
| PLANI-008 | Ajouter une observabilite exploitable | Partage/backend | P1 | M | RESEARCH | Aucune |
| PLANI-009 | Unifier l'agenda et fournir un flux ICS prive | Partage/backend | P1 | M | READY | PLANI-001, PLANI-002 |
| PLANI-010 | Ajouter des push mobiles respectueux de l'attention | Cursor AI | P1 | M | PROPOSED | PLANI-008, PLANI-024 |
| PLANI-011 | Livrer un vertical slice hors ligne mobile | Cursor AI | P1 | L | RESEARCH | PLANI-001, PLANI-005, PLANI-024 |
| PLANI-012 | Ajouter les passkeys web et auditer OAuth | Claude Code | P1 | M | RESEARCH | PLANI-001, PLANI-003 |
| PLANI-013 | Etablir le socle WCAG 2.2 AA web | Claude Code | P1 | M | IN_PROGRESS | Aucune |
| PLANI-014 | Fournir le contrat partage de saisie naturelle avec confirmation | Partage/backend | P2 | M | PROPOSED | PLANI-003, PLANI-005, PLANI-008, PLANI-013 |
| PLANI-015 | Ajouter l'outbox hors ligne web | Claude Code | P2 | M | PROPOSED | PLANI-002, PLANI-005, PLANI-011 |
| PLANI-016 | Etablir le socle d'accessibilite mobile | Cursor AI | P1 | M | IN_PROGRESS | PLANI-024 |
| PLANI-017 | Securiser la reinitialisation de mot de passe | Partage/backend | P0 | M | IN_PROGRESS | PLANI-001 |
| PLANI-018 | Finaliser le parcours de reset web | Claude Code | P0 | S | BLOCKED | PLANI-017 |
| PLANI-019 | Finaliser le parcours de reset mobile | Cursor AI | P0 | S | BLOCKED | PLANI-017, PLANI-024 |
| PLANI-020 | Automatiser les parcours critiques web | Claude Code | P1 | M | BLOCKED | PLANI-004 |
| PLANI-021 | Automatiser les parcours critiques mobile | Cursor AI | P1 | M | BLOCKED | PLANI-004, PLANI-024 |
| PLANI-022 | Integrer la saisie naturelle confirmee sur le web | Claude Code | P2 | M | BLOCKED | PLANI-014 |
| PLANI-023 | Integrer la saisie naturelle confirmee sur mobile | Cursor AI | P2 | M | BLOCKED | PLANI-014, PLANI-024 |
| PLANI-024 | Monter Expo SDK 54 vers 57 stable | Cursor AI | P0 | M | IN_PROGRESS | Aucune |
| PLANI-025 | Verifier et mettre a jour PostgreSQL de production | Partage/backend | P0 | M | READY | Aucune |
| PLANI-026 | Retablir et durcir le deploiement Hostinger | Partage/backend | P0 | M | BLOCKED | PLANI-031 |
| PLANI-027 | Assainir les dependances critiques et le contrat d'import | Partage/backend | P0 | M | READY | Aucune |
| PLANI-028 | Securiser les dependances et l'import tableur web | Claude Code | P0 | M | BLOCKED | PLANI-027 |
| PLANI-029 | Securiser les dependances et l'import tableur mobile | Cursor AI | P0 | M | BLOCKED | PLANI-027, PLANI-024 |
| PLANI-030 | Rendre les reunions Jitsi compatibles avec les politiques navigateur | Claude Code | P0 | M | IN_PROGRESS | PLANI-013 |
| PLANI-031 | Securiser l'acces aux salles de reunion Jitsi | Claude Code | P0 | L | RESEARCH | PLANI-030 |

## Tickets

### PLANI-001 - Rendre l'integration backend obligatoire

- Proprietaire: Partage/backend
- Priorite: P0
- Effort: M
- Statut: READY
- Probleme: les tests dependants de PostgreSQL sont ignores lorsque la base de test est absente; une execution verte ne garantit donc pas le fonctionnement des flux metier.
- Resultat utilisateur: moins de regressions sur l'authentification, les permissions et les taches.
- Perimetre: service PostgreSQL de test reproductible; migrations; donnees isolees; echec explicite si la base manque; rapport clair entre tests unitaires et integration.
- Hors perimetre: refonte des services metier; tests de charge.
- Criteres d'acceptation:
  - La commande documentee demarre une base de test propre sans configuration secrete.
  - Aucun test d'integration n'est silencieusement ignore en CI.
  - Les 22 tests actuels s'executent; tout skip restant contient une justification explicite.
  - L'execution repetee ne depend pas de donnees d'un run precedent.
- Contraintes: ne jamais pointer vers la base de production; conserver PostgreSQL comme moteur reel.
- Dependances: Aucune.
- Risques: migrations concurrentes et collision de ports.
- Tests attendus: suite Vitest complete sur base ephemere et test du cas base indisponible.

### PLANI-002 - Exclure les donnees privees du cache PWA

- Proprietaire: Claude Code
- Priorite: P0
- Effort: S
- Statut: DONE
- Probleme: Workbox applique `NetworkFirst` a toutes les reponses 200 de l'API, y compris les donnees authentifiees.
- Resultat utilisateur: aucune ancienne donnee privee ne reapparait apres deconnexion ou changement de compte.
- Perimetre: inventaire des routes publiques; strategie de cache explicite pour ressources publiques seulement; purge des anciens caches; test de deconnexion.
- Hors perimetre: vrai mode hors ligne avec mutations synchronisees.
- Criteres d'acceptation:
  - Aucune reponse contenant projets, taches, profil, notifications ou administration n'est mise en cache par le service worker.
  - Les caches historiques `planii-api` sont supprimes lors de l'activation de la nouvelle version.
  - Une session hors ligne ne montre jamais les donnees du compte precedent.
  - Le shell PWA reste installable et disponible hors ligne.
- Contraintes: conserver le cache des actifs statiques; documenter toute route publique cachee.
- Dependances: Aucune.
- Risques: regression de l'experience hors ligne annoncee.
- Tests attendus: test Playwright avec deux comptes et verification de Cache Storage.
- Preuves de cloture: `npm run test:e2e` reexecute le 20 septembre 2026; 19/19 tests passent, dont les deux scenarios PWA (purge du cache historique, deux comptes, inspection Cache Storage et hors ligne). Le build de production conserve le shell precache sans route runtime API.

### PLANI-003 - Durcir la session web

- Proprietaire: Claude Code
- Priorite: P0
- Effort: L
- Statut: RESEARCH
- Probleme: le jeton JWT persistant est accessible via `localStorage` et n'offre pas de rotation visible.
- Resultat utilisateur: une session web moins exposée au vol de jeton et une deconnexion fiable de tous les contextes.
- Perimetre: ADR comparant cookie `HttpOnly`/session serveur et access token court + refresh token rotatif; CSRF; OAuth; WebSocket; deconnexion; migration progressive.
- Hors perimetre: passkeys, SSO entreprise et gestion de terminaux.
- Criteres d'acceptation:
  - L'ADR decrit les menaces, la solution retenue et le plan de migration web/API/WebSocket.
  - Aucun secret de session longue duree n'est lisible par JavaScript dans la cible retenue.
  - La deconnexion invalide la session et le canal temps reel.
  - Les tests couvrent expiration, rotation, reutilisation et CSRF selon l'architecture choisie.
- Contraintes: ne pas casser les clients mobiles existants; conserver les fournisseurs OAuth.
- Dependances: PLANI-001.
- Risques: migration multi-client et configuration cross-origin.
- Tests attendus: integration API, navigateur et tests de concurrence de refresh.

### PLANI-004 - Preparer le socle partage des parcours critiques

- Proprietaire: Partage/backend
- Priorite: P1
- Effort: L
- Statut: RESEARCH
- Probleme: aucun test UI automatise n'est visible et les deux clients ne disposent pas d'un socle de donnees stable pour exercer les memes parcours.
- Resultat utilisateur: les fonctions principales peuvent etre testees de facon reproductible avant chaque livraison web ou mobile.
- Perimetre: matrice de risques commune; donnees et comptes de test stables; contrats de remise a zero; controle du temps reel; conventions de selecteurs accessibles; artefacts CI communs.
- Hors perimetre: implementation des suites web et mobile, portee respectivement par PLANI-020 et PLANI-021; couverture exhaustive; snapshots visuels de chaque ecran.
- Criteres d'acceptation:
  - Une matrice classe connexion, projet, invitation, tache, calendrier et deconnexion par criticite.
  - Un jeu de donnees reproductible et une commande de remise a zero sont utilisables par les deux clients sans production.
  - Le temps reel, l'horloge et les e-mails peuvent etre controles pendant les tests.
  - Les contrats d'artefacts CI et de selecteurs accessibles sont documentes pour PLANI-020 et PLANI-021.
- Contraintes: aucune dependance aux donnees de production; aucun fichier client modifie dans ce ticket.
- Dependances: PLANI-001.
- Risques: tests instables si le temps reel n'est pas controle.
- Tests attendus: suite critique dans la CI et execution locale reproductible.

### PLANI-005 - Partager les contrats entre les trois applications

- Proprietaire: Partage/backend
- Priorite: P1
- Effort: L
- Statut: PROPOSED
- Probleme: types et regles communes sont dupliques entre web et mobile tandis que l'API possede ses propres schemas.
- Resultat utilisateur: moins d'incoherences entre web, mobile et API.
- Perimetre: inventaire des contrats; paquet partage ou schema genere; versionnement; erreurs API typees; migration incrementale.
- Hors perimetre: monorepo complet ou changement de framework.
- Criteres d'acceptation:
  - Une modification de contrat incompatible echoue au typecheck ou au test de contrat.
  - Les entites principales ont une source de verite unique ou generee.
  - Web et mobile ne dupliquent plus la normalisation d'import et les enums critiques.
  - Le deploiement independant des clients reste possible.
- Contraintes: migration par domaine; pas de gros changement atomique.
- Dependances: PLANI-001.
- Risques: couplage excessif et confusion entre formes DB, API et UI.
- Tests attendus: tests de contrat et typecheck des trois projets.

### PLANI-006 - Decouper les modules projet et tache web

- Proprietaire: Claude Code
- Priorite: P1
- Effort: L
- Statut: PROPOSED
- Probleme: plusieurs modules centraux depassent 500 lignes; la vue projet web atteint 1 413 lignes.
- Resultat utilisateur: evolutions plus rapides avec moins de regressions croisees.
- Perimetre: cartographie des responsabilites; extraction par capacite metier; interfaces stables; conservation du comportement.
- Hors perimetre: redesign UI ou reecriture complete.
- Criteres d'acceptation:
  - Chaque extraction est couverte avant modification.
  - Les responsabilites taches, equipe, reunion et sondages sont separees.
  - Le service projet n'orchestre plus directement toutes les lectures et mutations.
  - Aucun changement fonctionnel involontaire n'apparait dans les parcours critiques.
- Contraintes: petites PR reversibles.
- Dependances: PLANI-004, PLANI-005.
- Risques: refactor trop large et conflits avec les fonctions en cours.
- Tests attendus: caracterisation puis integration.

### PLANI-007 - Reduire le chargement initial web

- Proprietaire: Claude Code
- Priorite: P1
- Effort: M
- Statut: READY
- Probleme: le bundle principal est de 993,62 kB minifie.
- Resultat utilisateur: premier affichage plus rapide, surtout sur mobile et reseau lent.
- Perimetre: mesure de reference; routes/vues chargees a la demande; isolation de XLSX; budget de bundle; etats de chargement accessibles.
- Hors perimetre: changement de framework ou redesign.
- Criteres d'acceptation:
  - Le bundle d'entree minifie passe sous 500 kB ou une exception mesuree est documentee.
  - XLSX, administration et guide ne chargent pas au premier affichage.
  - Aucun decalage de mise en page majeur n'est introduit.
  - Le build echoue si le budget convenu regresse fortement.
- Contraintes: conserver la PWA et les routes actuelles.
- Dependances: PLANI-004.
- Risques: waterfall de chunks et preload mal calibre.
- Tests attendus: build analyse, Lighthouse mobile et parcours Playwright.

### PLANI-008 - Ajouter une observabilite exploitable

- Proprietaire: Partage/backend
- Priorite: P1
- Effort: M
- Statut: RESEARCH
- Probleme: les erreurs serveur sont journalisees mais les parcours multi-client ne sont pas correlables et aucun indicateur de service n'est visible.
- Resultat utilisateur: incidents detectes et resolus plus vite.
- Perimetre: objectifs de service; identifiant de requete; erreurs web/mobile; metriques API/DB/WebSocket/e-mail; confidentialite et retention.
- Hors perimetre: achat d'un fournisseur avant ADR.
- Criteres d'acceptation:
  - Un incident peut etre suivi du client a l'API sans journaliser contenu de tache, jeton ou mot de passe.
  - Des alertes couvrent taux d'erreur, latence, saturation DB et echec de migration/rappels.
  - La retention et le masquage des donnees sont documentes pour le RGPD.
  - Un tableau de bord minimal et un runbook existent.
- Option mobile a evaluer: EAS Observe apres PLANI-024, avec echantillonnage, plafond de cout, DPA/transferts, retention et interdiction d'attributs metier sensibles; cette option ne remplace ni le web ni l'API.
- Contraintes: minimisation des donnees; cout plafonne.
- Dependances: Aucune.
- Risques: collecte excessive ou bruit d'alertes.
- Tests attendus: test de propagation, test de redaction et exercice d'incident.

### PLANI-009 - Unifier l'agenda et fournir un flux ICS prive

- Proprietaire: Partage/backend
- Priorite: P1
- Effort: M
- Statut: READY
- Probleme: `/calendar` omet les rendez-vous Planii et aucun agenda externe ne peut s'abonner aux engagements de l'utilisateur.
- Resultat utilisateur: une vue unique et un abonnement en lecture seule depuis son calendrier habituel.
- Perimetre: contrat d'evenement commun; rendez-vous dans l'agenda; fuseaux horaires; flux ICS individuel, secret, revocable et rotatif; liens profonds vers la source.
- Hors perimetre: synchronisation bidirectionnelle Google/Microsoft, recurrence complete et MCP.
- Criteres d'acceptation:
  - Taches datees, echeances et rendez-vous apparaissent dans le meme agenda avec leur type.
  - Les instants et fuseaux sont non ambigus et testes aux changements d'heure.
  - Le flux ICS ne contient que les objets encore accessibles et aucune description/commentaire sensible par defaut.
  - La regeneration ou revocation du secret invalide l'ancien lien.
- Contraintes: stocker seulement l'empreinte du secret; conserver des UID ICS stables.
- Dependances: PLANI-001, PLANI-002.
- Risques: fuite du lien de flux et migration des dates texte existantes.
- Tests attendus: permissions, revocation, retrait d'un membre, fuseaux et validation ICS.
- Signal veille 2026-09-26: l'affichage optionnel de trois fuseaux horaires annonce par Google Calendar sert de benchmark pour les utilisateurs distribues. Aucun elargissement n'est retenu sans besoin utilisateur; le contrat doit toutefois rester capable d'afficher des zones explicites et testees aux changements d'heure.

### PLANI-010 - Ajouter des push mobiles respectueux de l'attention

- Proprietaire: Cursor AI
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-data-fetching`, `expo:expo-dev-client`, le skill EAS/notifications route par `expo-overview`, `frontend-design`, `ui-ux-pro-max`, `21st-ui-build`.
- Priorite: P1
- Effort: M
- Statut: PROPOSED
- Probleme: les notifications mobiles sont interrogees en foreground; aucune alerte APNs/FCM n'existe lorsque l'app est fermee.
- Resultat utilisateur: recevoir les changements importants sans bruit ni contenu sensible sur l'ecran verrouille.
- Perimetre: consentement OS; enregistrement/revocation des appareils; cinq evenements maximum; preferences par categorie; heures calmes; deduplication; recus Expo.
- Hors perimetre: ciblage IA, campagnes marketing et push web.
- Criteres d'acceptation:
  - Affectation, transfert, rendez-vous modifie, rappel et mention peuvent produire un push idempotent.
  - Le push est desactive avant consentement et chaque categorie peut etre coupee.
  - Les jetons invalides sont retires; l'echec d'envoi ne bloque jamais l'action metier.
  - Le contenu sensible est masque par defaut sur l'ecran verrouille.
- Contraintes: suivre `.cursor/rules/planii-mobile.mdc`; build de developpement reel; retention minimale des jetons appareil; traduire toute inspiration 21st avec les composants Expo/React Native et le design system mobile existant.
- Dependances: PLANI-008, PLANI-024.
- Risques: fatigue de notification, cout et exposition de donnees.
- Tests attendus: appareils iOS/Android, deduplication, heures calmes et jeton expire.

### PLANI-011 - Livrer un vertical slice hors ligne mobile pour les taches

- Proprietaire: Cursor AI
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-data-fetching`, `expo:expo-design-system`, les skills Expo routes pour le stockage local et la securite, `frontend-design`, `ui-ux-pro-max`, `21st-ui-build`.
- Priorite: P1
- Effort: L
- Statut: RESEARCH
- Probleme: aucune ecriture n'est durable hors ligne et les conflits concurrents peuvent ecraser silencieusement une version.
- Resultat utilisateur: creer, cocher et modifier une tache sur reseau instable sans perdre son travail.
- Perimetre: ADR partage; `revision`/`updated_at`; `Idempotency-Key`; precondition de version; conflit 409; cache et outbox mobile SQLite; purge a la deconnexion.
- Hors perimetre: suppressions/invitations hors ligne, CRDT et couverture de tous les objets.
- Criteres d'acceptation:
  - Les trois mutations ciblees survivent a un redemarrage et sont rejouees une seule fois.
  - Un conflit affiche les versions serveur/locale et permet recharger, reappliquer ou abandonner.
  - Le cache local est limite, purgeable et separe du secret de session.
  - Les WebSockets portent identifiant et revision pour une invalidation fine.
- Contraintes: suivre `.cursor/rules/planii-mobile.mdc`; serveur autoritatif; idempotence observable; chiffrement local lorsque disponible; traduire toute inspiration 21st avec les composants Expo/React Native et le design system mobile existant.
- Dependances: PLANI-001, PLANI-005, PLANI-024.
- Risques: ordre des operations, stockage local de donnees personnelles et complexite multi-client.
- Tests attendus: coupure/reprise, double envoi, conflit concurrent, changement de compte et appareil perdu simule.

### PLANI-012 - Ajouter les passkeys web et auditer OAuth

- Proprietaire: Claude Code
- Priorite: P1
- Effort: M
- Statut: RESEARCH
- Probleme: les comptes non sociaux reposent sur un mot de passe et les flux OAuth doivent etre verifies contre le BCP RFC 9700.
- Resultat utilisateur: connexion resistante au phishing avec recuperation de compte preservee.
- Perimetre: modele de menace; audit PKCE/state/redirect URI; bibliotheque WebAuthn eprouvee; ajout, usage et suppression de passkey web; challenges courts; feature flag.
- Hors perimetre: passkeys mobiles natives et suppression immediate des mots de passe.
- Criteres d'acceptation:
  - L'audit OAuth documente chaque fournisseur et corrige tout ecart critique avant le pilote.
  - Une passkey peut etre ajoutee apres authentification forte, utilisee, nommee et retiree.
  - Aucun materiel biometrique ne transite ni n'est stocke par Planii.
  - Deux voies de recuperation restent disponibles et sont testees.
- Contraintes: origin binding, bibliotheque maintenue, compteurs/challenges valides et journal d'audit.
- Dependances: PLANI-001, PLANI-003.
- Risques: verrouillage de compte, support navigateur et mauvaise configuration d'origine.
- Tests attendus: enregistrement/authentification, replay, mauvais origin, credential retire et recuperation.

### PLANI-013 - Etablir le socle WCAG 2.2 AA web

- Proprietaire: Claude Code
- Priorite: P1
- Effort: M
- Statut: IN_PROGRESS
- Probleme: les etiquettes d'accessibilite existantes ne garantissent pas les parcours clavier, lecteur d'ecran, contraste et reduction de mouvement.
- Resultat utilisateur: planifier et collaborer sans dependance a la souris, a la couleur ou a la voix.
- Perimetre: checklist web; tokens de contraste; focus des modales; calendrier/palette/import; alternatives au drag-and-drop et au micro; QA clavier et lecteur d'ecran navigateur.
- Hors perimetre: declaration legale de conformite sans audit independant.
- Criteres d'acceptation:
  - Les parcours critiques web sont realisables au clavier avec focus visible et non masque.
  - Les statuts ont un nom/etat textuel et ne reposent jamais uniquement sur la couleur.
  - Auth, Projets, Agenda et Tache passent les scenarios lecteur d'ecran navigateur documentes.
  - Chaque ticket UI futur reprend la checklist pertinente.
- Contraintes: automatisation plus revue manuelle; avis juridique separe sur l'EAA.
- Dependances: Aucune.
- Risques: faux sentiment de conformite par outil automatique seul.
- Tests attendus: axe/accessibility checks, clavier, lecteur d'ecran et mouvement reduit.
- Avancement observe: le socle automatise, le focus des dialogues, la region live, les alternatives clavier, le portail des modales, les libelles i18n et la checklist sont presents. Le correctif `color-scheme` couvre desormais l'assistant vocal en themes clair et sombre; la suite complete reexecutee le 22 septembre passe 35/35 avec trois workers. Reste la revue manuelle VoiceOver/NVDA des parcours cibles; le contenu de l'iframe Jitsi tierce reste hors portee des tests axe locaux.
- Signal veille 2026-09-26: le billet W3C sur WCAG 3 decrit encore un projet, pas une Recommendation. La cible de livraison reste WCAG 2.2 AA avec revue manuelle; WCAG 3 reste une veille sans critere bloquant.

### PLANI-014 - Fournir le contrat partage de saisie naturelle avec confirmation

- Proprietaire: Partage/backend
- Priorite: P2
- Effort: M
- Statut: PROPOSED
- Probleme: une intention dictee ou ecrite doit encore etre repartie manuellement entre plusieurs formulaires.
- Resultat utilisateur: transformer une phrase en brouillon structure et sur, que chaque client pourra faire corriger puis confirmer avant toute ecriture.
- Perimetre: trois intentions; sortie JSON stricte validee par Zod; contexte minimal; questions d'ambiguite; consentement; audit et retention courte; contrat de previsualisation et de confirmation.
- Hors perimetre: interfaces web et mobile, portees par PLANI-022 et PLANI-023; suppression; invitations; actions externes; autonomie; transcription audio; analyse globale d'un projet.
- Criteres d'acceptation:
  - Aucune mutation n'arrive avant confirmation explicite element par element.
  - Permissions et validations sont appliquees par les services metier, jamais deleguees au modele.
  - Dates, personnes et projets ambigus restent non resolus et demandent confirmation.
  - Le pilote est opt-in, desactivable et mesure confirmations, corrections et abandons sans conserver inutilement le texte.
  - Des la premiere interaction, l'interface indique clairement et de facon accessible que l'utilisateur interagit avec une IA.
  - La revue juridique documente avant pilote le role de Planii et de son prestataire au titre de l'Article 50 de l'AI Act, ainsi que les exceptions eventuelles.
- Contraintes: revue RGPD/AIPD et AI Act selon le traitement; fournisseur, region et role fournisseur/deployeur documentes; budget et delai limites.
- Dependances: PLANI-003, PLANI-005, PLANI-008, PLANI-013.
- Risques: interpretation plausible mais fausse, fuite de contenu et cout variable.
- Tests attendus: schemas invalides, prompt injection, permissions, ambiguite, timezones, panne fournisseur et absence d'action autonome.
- Signal veille 2026-09-26: lors de l'affinage, evaluer un avertissement de doublon avant confirmation et une provenance visible de la saisie, d'apres le pattern officiel Copilot Slack/Teams. Aucun connecteur externe ni ingestion d'historique n'entre dans le perimetre sans demande client, revue RGPD et modele de permissions.

### PLANI-015 - Ajouter l'outbox hors ligne web

- Proprietaire: Claude Code
- Priorite: P2
- Effort: M
- Statut: PROPOSED
- Probleme: le client web ne garantit aucune mutation durable hors ligne.
- Resultat utilisateur: retrouver sur la PWA les garanties du vertical slice mobile sans perdre une saisie lors d'une coupure.
- Perimetre: IndexedDB; outbox pour creer/cocher/modifier une tache; cles d'idempotence; conflit visible; purge a la deconnexion.
- Hors perimetre: suppression, invitation et synchronisation de tous les objets.
- Criteres d'acceptation:
  - Les trois mutations ciblees survivent a un rechargement et sont rejouees une seule fois.
  - Les conflits utilisent le contrat backend valide par PLANI-011.
  - Le changement de compte purge toutes les donnees locales privees.
- Contraintes: reutiliser le contrat partage sans importer de code React Native.
- Dependances: PLANI-002, PLANI-005, PLANI-011.
- Risques: interaction avec le service worker et doublons de mutation.
- Tests attendus: Playwright hors ligne, reprise, conflit et changement de compte.

### PLANI-016 - Etablir le socle d'accessibilite mobile

- Proprietaire: Cursor AI
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-native-ui`, `expo:expo-ui`, `expo:expo-design-system`, les skills Expo routes pour l'accessibilite, `frontend-design`, `ui-ux-pro-max`, `21st-ui-review` et `21st-ui-build`.
- Priorite: P1
- Effort: M
- Statut: IN_PROGRESS
- Probleme: les etiquettes existantes ne garantissent pas les parcours VoiceOver/TalkBack, l'ordre de lecture ou les alternatives au geste et a la voix.
- Resultat utilisateur: utiliser Planii mobile avec lecteur d'ecran, reduction de mouvement et controles alternatifs.
- Perimetre: checklist mobile; `accessibilityState`/`accessibilityHint`; ordre de lecture; Auth, Projets, Agenda et Tache; alternatives au micro et au glisser-deposer.
- Hors perimetre: declaration legale de conformite sans audit independant.
- Criteres d'acceptation:
  - Les quatre parcours cibles sont documentes et passent sous VoiceOver et TalkBack.
  - Chaque controle expose nom, role, etat et action coherents.
  - La couleur, le geste et la voix ont toujours une alternative equivalente.
  - Les constats deviennent des criteres des futurs tickets mobiles.
- Contraintes: suivre `.cursor/rules/planii-mobile.mdc`; privilegier les controles natifs Expo/React Native; traduire toute inspiration 21st avec les composants Expo/React Native et le design system mobile existant.
- Dependances: PLANI-024.
- Risques: ordre de lecture divergent entre iOS et Android.
- Tests attendus: revue manuelle VoiceOver/TalkBack et checks automatises disponibles.
- Signal veille 2026-09-26: WCAG 3 reste un projet W3C non normatif; conserver WCAG 2.2 AA et les tests utilisateurs comme base du ticket, sans migration prematuree.

### PLANI-017 - Securiser la reinitialisation de mot de passe

- Proprietaire: Partage/backend
- Priorite: P0
- Effort: M
- Statut: IN_PROGRESS
- Probleme: le chantier local de reset change le mot de passe puis marque le jeton comme utilise dans des requetes separees; deux appels concurrents peuvent donc consommer le meme jeton, et les JWT existants restent valides jusqu'a 30 jours apres le reset.
- Resultat utilisateur: un lien de recuperation est reellement a usage unique et un changement de mot de passe coupe les sessions anterieures.
- Perimetre: consommation atomique du jeton; mise a jour du mot de passe dans la meme transaction; invalidation des sessions/JWT anterieurs; limitation de debit par compte et IP avec chaine de proxy explicite; journal de securite minimal sans jeton ni mot de passe; contrat de deep link web/mobile; nettoyage des jetons expires.
- Hors perimetre: remplacement global de l'architecture de session traite par PLANI-003; passkeys; redesign des ecrans clients.
- Criteres d'acceptation:
  - Deux requetes concurrentes avec le meme jeton produisent une seule reussite.
  - Tout JWT emis avant le reset est refuse par l'API et le WebSocket apres le changement de mot de passe.
  - La reponse de demande reste identique pour un compte inconnu, local ou social et le temps de reponse est mesure pour limiter l'enumeration.
  - Le lien de reset ouvre une route autorisee et testee sur web, iOS et Android sans exposer le jeton dans les journaux.
  - Les jetons sont stockes haches, expirent, sont purgeables et ne sont jamais reutilisables.
  - Des valeurs `X-Forwarded-For` et `X-Real-IP` forgees ne permettent pas de contourner la limite par IP; la limite par compte reste effective independamment de l'adresse presentee.
- Contraintes: migration retrocompatible; ne pas journaliser l'URL complete; secret aleatoire d'au moins 128 bits; transaction PostgreSQL; ne faire confiance qu'a la chaine Traefik verifiee par PLANI-026.
- Dependances: PLANI-001.
- Risques: verrouillage involontaire, enumeration temporelle, lien intercepte, usurpation d'IP via en-tetes de proxy, conflit avec la future migration de session PLANI-003.
- Tests attendus: integration PostgreSQL avec concurrence, expiration et rejeu; JWT/API/WebSocket avant-apres reset; rate limit par compte/IP avec `X-Forwarded-For` et `X-Real-IP` forges; deep links web/iOS/Android.
- Avancement observe: le commit `368ecf6` publie la migration, les jetons hashes, l'expiration, l'usage unique sequentiel, les routes API et les premieres interfaces clients. Le 12 octobre, la consommation du jeton, le changement de mot de passe et l'increment de `session_epoch` sont dans la meme transaction (`migrations/010_session_epoch.sql`). Un JWT anterieur est refuse par `auth` et par le WebSocket; les sockets deja ouverts de ce compte sont fermes. Restent la limitation par compte, la purge des jetons expires, le contrat de deep link et l'execution des tests de concurrence sur une base PostgreSQL reelle. Le ticket reste `IN_PROGRESS`.

### PLANI-018 - Finaliser le parcours de reset web

- Proprietaire: Claude Code
- Parent: PLANI-017
- Priorite: P0
- Effort: S
- Statut: BLOCKED
- Probleme: l'interface web de reset est commitee sur `main`, mais ne doit pas etre consideree livree avant le contrat de securite partage et ne dispose toujours pas de test navigateur dedie.
- Resultat utilisateur: recuperer son compte sur le web avec des etats clairs, accessibles et sans conserver le jeton dans l'URL.
- Perimetre: demande generique; ouverture du lien; mot de passe et confirmation; nettoyage immediat de l'URL; etats expire/rejete/reussi; retour a la connexion; deconnexion locale de toute session existante.
- Hors perimetre: API, migration SQL et application mobile.
- Criteres d'acceptation:
  - Le jeton disparait de la barre d'adresse avant toute navigation ou telemetrie tierce.
  - Le formulaire est utilisable au clavier et annonce erreurs, chargement et succes.
  - Un jeton absent, expire ou rejoue affiche une action pour demander un nouveau lien.
  - La reussite purge l'ancienne session locale et conduit a une nouvelle connexion.
- Contraintes: modifier uniquement `planii-vite/`; respecter le contrat de PLANI-017 et le socle WCAG de PLANI-013.
- Dependances: PLANI-017.
- Risques: fuite via URL/referrer, historique navigateur et incoherence de traduction.
- Tests attendus: Playwright demande-reset, expiration/rejeu, URL nettoyee, navigation clavier et changement de compte.
- Avancement observe: le commit `368ecf6` ajoute la demande, le formulaire et le nettoyage de `token`/`reset_token` dans l'URL. Le run Playwright du 21 septembre passe 28/28, mais aucun de ces 28 scenarios ne couvre le reset; le ticket reste bloque sur PLANI-017.

### PLANI-019 - Finaliser le parcours de reset mobile

- Proprietaire: Cursor AI
- Parent: PLANI-017
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-router`, `expo:expo-data-fetching`, `expo:expo-native-ui`, `expo:expo-design-system`, `frontend-design`, `ui-ux-pro-max`, `21st-ui-build`.
- Priorite: P0
- Effort: S
- Statut: BLOCKED
- Probleme: les ecrans mobiles de reset sont commites sur `main`, mais l'e-mail pointe actuellement vers le web et aucun contrat de lien universel/deep link n'est valide pour iOS et Android.
- Resultat utilisateur: ouvrir le lien de recuperation sur son appareil, choisir un nouveau mot de passe et revenir a une connexion sure.
- Perimetre: deep link/universal link valide; demande generique; reset; etats expire/rejete/reussi; purge de session `SecureStore`; accessibilite VoiceOver/TalkBack.
- Hors perimetre: API, migration SQL, DOM/CSS web et publication en store.
- Criteres d'acceptation:
  - Le lien ouvre la bonne route sur build iOS et Android, avec repli web documente.
  - Le jeton n'est jamais persiste dans AsyncStorage, SecureStore, logs ou analytics.
  - Une session deja ouverte est invalidee localement et cote serveur apres reussite.
  - Tous les champs et messages exposent nom, role, etat et focus coherents sous VoiceOver/TalkBack.
- Contraintes: modifier uniquement `planii-mobile/`; suivre `.cursor/rules/planii-mobile.mdc`; traduire toute inspiration 21st avec les composants Expo/React Native existants.
- Dependances: PLANI-017, PLANI-024.
- Risques: association de domaine iOS/Android, client e-mail qui ouvre le navigateur, etat de session concurrent.
- Tests attendus: build de developpement sur appareil iOS/Android, deep link froid/chaud, expiration/rejeu, lecteur d'ecran et changement de compte.
- Avancement observe: le commit `368ecf6` ajoute les routes Expo et le formulaire; le typecheck du 21 septembre passe. Aucun development build, Universal Link/App Link, purge de `SecureStore`, deep link froid/chaud ou test VoiceOver/TalkBack ne permet encore de lever PLANI-017 et PLANI-024.

### PLANI-020 - Automatiser les parcours critiques web

- Proprietaire: Claude Code
- Parent: PLANI-004
- Priorite: P1
- Effort: M
- Statut: BLOCKED
- Probleme: les parcours web critiques ne disposent d'aucune couverture navigateur reproductible.
- Resultat utilisateur: les regressions de connexion, projet, invitation, tache, agenda et deconnexion sont detectees avant livraison.
- Perimetre: suite Playwright web sur les parcours P0/P1 de la matrice; traces, captures et video a l'echec; guide local.
- Hors perimetre: mobile, snapshots de toutes les vues et tests de charge.
- Criteres d'acceptation:
  - Les six parcours prioritaires definis par PLANI-004 passent en local et CI.
  - Les tests utilisent des selecteurs accessibles et le jeu de donnees partage.
  - Chaque echec publie une trace et une capture exploitables.
  - Le guide d'execution et de diagnostic figure dans le README web.
- Contraintes: modifier uniquement `planii-vite/` et sa configuration de tests; ne jamais utiliser de donnees de production.
- Dependances: PLANI-004.
- Risques: flakiness du temps reel et temps CI.
- Tests attendus: suite Playwright repetee au moins trois fois sans flake sur le socle partage.

### PLANI-021 - Automatiser les parcours critiques mobile

- Proprietaire: Cursor AI
- Parent: PLANI-004
- Skills obligatoires: `expo:expo-overview` d'abord, puis les skills de test routes par celui-ci, `expo:expo-router`, `expo:expo-data-fetching`, `expo:expo-native-ui`, `frontend-design`, `ui-ux-pro-max`, `21st-cli-use` et `21st-ui-review`.
- Priorite: P1
- Effort: M
- Statut: BLOCKED
- Probleme: la session, la navigation et les mutations de taches mobiles ne disposent d'aucun filet automatise.
- Resultat utilisateur: les parcours mobiles essentiels restent fiables sur iOS et Android a chaque livraison.
- Perimetre: tests de composants/hooks et parcours app pour session, navigation, creation et mise a jour de tache; artefacts d'echec; guide local.
- Hors perimetre: web, couverture exhaustive et redesign.
- Criteres d'acceptation:
  - Les parcours mobiles P0/P1 de PLANI-004 passent sur les plateformes retenues.
  - Les tests utilisent le jeu de donnees partage sans production.
  - Les echecs conservent journaux et captures utiles.
  - Le README mobile documente execution, prerequis et diagnostic.
- Contraintes: modifier uniquement `planii-mobile/`; suivre `.cursor/rules/planii-mobile.mdc`; ne pas importer de code DOM/CSS de 21st.
- Dependances: PLANI-004, PLANI-024.
- Risques: flakiness simulateur/appareil, permissions OS et temps CI.
- Tests attendus: suite repetee iOS/Android selon la strategie retenue, plus typecheck.

### PLANI-022 - Integrer la saisie naturelle confirmee sur le web

- Proprietaire: Claude Code
- Parent: PLANI-014
- Priorite: P2
- Effort: M
- Statut: BLOCKED
- Probleme: le contrat partage ne produit de valeur qu'avec un apercu web modifiable et une confirmation explicite.
- Resultat utilisateur: decrire une intention, corriger le brouillon puis confirmer chaque creation sur le web.
- Perimetre: entree texte; apercu; ambiguite; edition; selection; confirmation; etats d'erreur et d'indisponibilite.
- Hors perimetre: modele IA, API, mobile, suppression et action autonome.
- Criteres d'acceptation:
  - Aucune mutation n'est envoyee avant confirmation explicite.
  - Chaque champ propose peut etre corrige ou retire.
  - Les ambiguities restent visibles et bloquent seulement l'element concerne.
  - Le flux est utilisable au clavier et avec lecteur d'ecran.
- Contraintes: modifier uniquement `planii-vite/`; respecter PLANI-013 et le contrat versionne de PLANI-014.
- Dependances: PLANI-014.
- Risques: surconfiance, confirmation trop dense et etats partiels.
- Tests attendus: composant, Playwright, schemas invalides, ambiguite et panne fournisseur.

### PLANI-023 - Integrer la saisie naturelle confirmee sur mobile

- Proprietaire: Cursor AI
- Parent: PLANI-014
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-data-fetching`, `expo:expo-router`, `expo:expo-native-ui`, `expo:expo-ui`, `expo:expo-design-system`, `frontend-design`, `ui-ux-pro-max`, `21st-ui-build`.
- Priorite: P2
- Effort: M
- Statut: BLOCKED
- Probleme: le contrat partage doit etre traduit en parcours mobile natif, lisible et confirmable sans action autonome.
- Resultat utilisateur: dicter ou ecrire une intention, corriger le brouillon puis confirmer chaque creation sur mobile.
- Perimetre: entree texte/dictee existante; feuille native d'apercu; ambiguite; edition; selection; confirmation; hors ligne explicite.
- Hors perimetre: modele IA, API, DOM/CSS web, transcription distante et action autonome.
- Criteres d'acceptation:
  - Aucune mutation n'est envoyee avant confirmation explicite element par element.
  - Chaque proposition est editable et accessible sous VoiceOver/TalkBack.
  - Une coupure reseau preserve le texte localement sans presenter le brouillon comme confirme.
  - Les ambiguities et erreurs partielles sont recuperables.
- Contraintes: modifier uniquement `planii-mobile/`; suivre `.cursor/rules/planii-mobile.mdc`; traduire l'inspiration 21st avec le design system mobile.
- Dependances: PLANI-014, PLANI-024.
- Risques: ecran trop dense, confusion dictee/confirmation et donnees personnelles locales.
- Tests attendus: composants, appareil iOS/Android, lecteur d'ecran, coupure/reprise et panne fournisseur.

### PLANI-024 - Monter Expo SDK 54 vers 57 stable

- Proprietaire: Cursor AI
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-upgrade`, `expo:expo-dev-client`, les skills Expo routes pour les modules affectes, `frontend-design`, `ui-ux-pro-max`, `21st-cli-use`.
- Priorite: P0
- Effort: M
- Statut: IN_PROGRESS
- Probleme: la migration a atteint Expo 57, mais la cloture exige encore des preuves natives iOS/Android, OTA, deep links, permissions et memoire; un typecheck et un Doctor verts ne prouvent pas ces comportements sur appareil.
- Resultat utilisateur: une application mobile maintenue, plus stable en memoire et prete pour les prochains chantiers natifs.
- Perimetre: quitter l'etat SDK 56 et monter directement vers Expo 57 corrige; alignement des dependances avec Expo; remplacement des imports React Navigation par les entrees Expo Router lorsque prescrit; configuration native; development builds iOS/Android; compatibilite EAS Update/runtimeVersion; validation Auth, Projets, Agenda, Tache, deep links, permissions, Reanimated et demarrage.
- Hors perimetre: Expo SDK 58 beta; nouvelles fonctions; redesign; ajout d'EAS Observe, de push ou de calendrier natif.
- Criteres d'acceptation:
  - Aucun jalon de livraison ne reste sur SDK 56; la migration suit le guide Expo et vise directement SDK 57 corrige.
  - La cible finale utilise `expo >= 57.0.17` avec les versions React Native, React, Router, Reanimated et Worklets compatibles prescrites par Expo.
  - Le champ obsolete `newArchEnabled` est retire lors du passage a SDK 55 et la nouvelle architecture reste effectivement active sur les deux plateformes.
  - Les scripts EAS Update declarent un `--environment` explicite, obligatoire depuis SDK 55, et un envoi de validation reste borne a un canal non productif.
  - `expo install --fix`, `expo-doctor` et le typecheck ne signalent aucune incompatibilite non documentee.
  - Un development build iOS et Android demarre et passe les parcours Auth, Projets, Agenda et Tache, les deep links et les permissions existantes.
  - La compatibilite OTA/runtime est documentee; aucune update destinee a l'ancien runtime n'est envoyee au nouveau binaire.
  - Une mesure avant/apres ne montre pas de croissance memoire anormale sur un parcours Reanimated representatif.
- Contraintes: suivre `.cursor/rules/planii-mobile.mdc`; ne modifier que `planii-mobile/`; ne pas adopter SDK 58 beta; conserver les lockfiles deterministes; traduire toute inspiration 21st avec le design system mobile existant.
- Dependances: Aucune.
- Risques: regressions natives entre SDK, plugins incompatibles, rupture OTA, cout et delai des builds EAS, differences appareil/simulateur.
- Tests attendus: `expo-doctor`, typecheck, development builds iOS/Android, smoke tests appareils, deep links, permissions, EAS Update et profil memoire.
- Avancement observe: Expo 57.0.24 / RN 0.86.3 / Reanimated 4.5.1 / Worklets 0.10.1, lockfile Yarn unique, typecheck et `expo-doctor` 21/21 verts, app `1.1.0`. Development builds EAS `development` (runtimeVersion `1.1.0`): Android `03a3b7f4-6084-4a5c-a341-3efa89105992` FINISHED (APK); premier iOS `2f5930d7-bf32-4911-b5d5-3ecac0ba6d03` ERRORED (`XCODE_BUILD_ERROR`, `expo-speech-recognition@2.1.5` vs `EXPromiseResolveBlock`); correctif `expo-speech-recognition@57.1.0`, relance iOS `e88e883b-9472-4d01-abef-37264044a79a` FINISHED (tar.gz simulateur). Cette machine n'a que les Command Line Tools, pas Xcode.app ni emulateur Android: smoke Auth/Projets/Agenda/Tache, VoiceOver/TalkBack, OTA et memoire restent a faire sur simulateur/appareil. Le ticket reste `IN_PROGRESS`. Aucun autre agent ne doit modifier `planii-mobile/` ou son lockfile pendant ce chantier.

### PLANI-025 - Verifier et mettre a jour PostgreSQL de production

- Proprietaire: Partage/backend
- Priorite: P0
- Effort: M
- Statut: READY
- Probleme: le depot documente une base PostgreSQL externe sur le VPS sans en fixer ni en exposer la version serveur; la publication PostgreSQL du 13 aout 2026 corrige 28 vulnerabilites et PostgreSQL 14 arrive en fin de support le 12 novembre 2026, sans preuve que la production utilise un correctif encore maintenu.
- Resultat utilisateur: les projets, taches, reunions et comptes reposent sur une base maintenue, corrigee et restaurable sans perte de donnees.
- Perimetre: inventaire non secret de la version majeure/mineure et des extensions; sauvegarde et restauration testee; mise a jour au minimum vers 14.24, 15.19, 16.15, 17.11 ou 18.6 selon la majeure; plan de sortie de PostgreSQL 14 avant sa fin de support; controles post-mise a jour, fenetre de maintenance et retour arriere documentes.
- Hors perimetre: PostgreSQL 19 beta; refonte du schema; changement de fournisseur; optimisation generale des requetes.
- Criteres d'acceptation:
  - La version exacte de production et les extensions actives sont consignees sans URL, mot de passe ni autre secret.
  - La production utilise une majeure supportee et un correctif au moins egal a la version de securite du 13 aout 2026 correspondante.
  - Si la production est en PostgreSQL 14, un passage vers une majeure supportee au-dela du 12 novembre 2026 est planifie, teste et date.
  - Une restauration de sauvegarde chiffree reussit dans un environnement isole avant toute intervention de production.
  - Les etapes speciales de la note PostgreSQL sont verifiees contre les extensions et index reels; aucun besoin de reindexation n'est suppose sans inventaire.
  - Apres mise a jour, migrations, healthcheck, authentification, creation de tache et lecture agenda passent sans regression.
- Contraintes: maintenance planifiee; sauvegardes chiffrees et a retention limitee; aucune copie de production sur un poste non autorise; compte de maintenance au moindre privilege; ne pas adopter PostgreSQL 19 beta.
- Dependances: Aucune.
- Risques: indisponibilite, extension incompatible, sauvegarde non restaurable, reindexation longue et divergence entre base de test et production.
- Tests attendus: requete de version/extension; restauration en environnement isole; repetition des migrations; suite backend PostgreSQL; smoke tests API et controle du monitoring de sauvegarde.

### PLANI-026 - Retablir et durcir le deploiement Hostinger

- Proprietaire: Partage/backend
- Priorite: P0
- Effort: M
- Statut: BLOCKED
- Probleme: le workflow `Deploy to Hostinger VPS` echoue a repetition; le dernier run public, `35592811607` du 21 septembre 2026 sur `a717cfe`, est encore rouge. Les diagnostics precedents (`missing server host`, entrees SSH vides et `script_stop` invalide) restent non corriges; l'API publique ne permet pas de confirmer aujourd'hui l'etat des secrets Actions. Le workflow ne depend pas des controles web/backend et peut terminer en succes quand le point d'entree public reste non-200.
- Resultat utilisateur: les correctifs web et API sont livres par un chemin reproductible, auditable et capable de revenir a la derniere version saine.
- Perimetre: environnement GitHub de production protege; restauration ou rotation de `VPS_HOST`, `VPS_USER` et `VPS_SSH_KEY`; compte/cle de deploiement au moindre privilege; empreinte SSH; validation explicite des secrets sans exposition; action SSH pinnee par SHA; retrait de `script_stop`; gates build/test web et backend; deploiement d'une revision immuable; ingress API uniquement via Traefik avec en-tetes `X-Forwarded-*` normalises; healthchecks internes et publics; rollback documente et teste; retention raisonnable des logs.
- Hors perimetre: changement d'hebergeur; refonte applicative; migration de base hors PLANI-025; deploiement mobile EAS; ajout d'un nouvel outil payant.
- Criteres d'acceptation:
  - Un preflight echoue avant SSH avec un message actionnable si un secret requis manque, sans afficher sa valeur.
  - Les secrets vivent dans un environnement `production` protege et la cle SSH est limitee au deploiement Planii; l'empreinte du serveur est verifiee.
  - Les actions tierces sont referencees par SHA complet verifie; `script_stop` est retire et le script versionne conserve `set -euo pipefail`.
  - Aucun deploiement ne demarre tant que les builds/tests requis du web et du backend ne sont pas verts pour la meme revision.
  - La revision deployee est identifiable; un echec interne ou un statut public autre que 200 fait echouer le run et declenche ou documente le rollback vers la derniere revision saine.
  - Un deploiement de validation reussit, puis les healthchecks API, web public, authentification et lecture d'un projet passent sans secret dans les logs.
  - Une simulation controlee d'echec prouve que le run devient rouge et que la version precedemment saine reste accessible.
  - L'API n'est pas joignable directement depuis Internet en contournant Traefik; Traefik supprime ou ecrase les en-tetes `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto` et `X-Real-IP` recus du client avant de joindre Express.
- Contraintes: ne modifier que `.github/workflows/`, `scripts/` et la documentation d'exploitation; ne jamais committer ni journaliser les secrets; separer clairement validation, deploiement, verification et rollback; coordonner toute rotation avec l'acces VPS existant.
- Dependances: PLANI-031.
- Risques: coupure de production, verrouillage SSH, fuite de secret, contournement de l'ingress ou du rate limit par en-tetes forges, deploiement d'une revision differente de celle testee et rollback incomplet.
- Tests attendus: lint/validation du workflow; cas secret absent; build web; CI backend PostgreSQL; validation de l'empreinte SSH; deploiement de validation apres PLANI-031; test d'acces direct au port API refuse; tests `X-Forwarded-*`/`X-Real-IP` forges; healthchecks interne/public, en-tetes publics et smoke test d'une reunion sur la cible de production choisie; exercice de rollback et inspection des logs pour absence de secrets.

### PLANI-027 - Assainir les dependances critiques et le contrat d'import

- Proprietaire: Partage/backend
- Priorite: P0
- Effort: M
- Statut: READY
- Probleme: l'audit runtime du 30 septembre 2026 remonte 10 vulnerabilites backend, dont 6 hautes et 4 moderees. `multer@2.2.0` traite les uploads et est affecte par des DoS; `mailparser@3.9.14` analyse des messages IMAP non fiables; `nodemailer@6.10.1` direct et 9.0.3 transitif sont inclus dans le nouvel avis haut GHSA-v53p-9fqp-m79j; `ip-address@10.2.0`, apporte par `imapflow > socks`, est inclus dans GHSA-j6r3-76f7-8jcv et GHSA-h3mg-xc3c-68pw. Les deux clients utilisent aussi `xlsx@0.18.5`, sans version npm corrigee, mais aucun contrat commun de remplacement ni fixture de securite n'existe.
- Resultat utilisateur: les uploads, les e-mails et les imports de taches ne peuvent plus bloquer le service ou les clients via des entrees forgees connues.
- Perimetre: mettre a jour et verifier `multer`, `mailparser`, `nodemailer`, `imapflow`, `socks`, `ip-address` et leurs dependances applicables; borner champs multipart, adresses et taille/complexite des messages; definir le contrat commun d'import tableur, les limites de taille/lignes/temps et les fixtures forgees reutilisees par les deux clients; ajouter une politique d'audit avec exceptions datees.
- Hors perimetre: modifier `planii-vite/` ou `planii-mobile/`; lancer `npm audit fix --force`; refondre l'e-mail ou les imports; adopter une dependance sans verifier licence, provenance et maintenance.
- Criteres d'acceptation:
  - `multer` est au minimum en 2.3.0, les limites de champs et d'index sont explicites et une requete multipart forgee echoue sans terminer ni bloquer le processus.
  - Les dependances d'envoi et de lecture d'e-mail ne conservent aucun avis haut applicable a leurs chemins reels; si Nodemailer est conserve, toutes ses copies resolues utilisent une version revue qui ferme les avis cumules, et toute exception documente l'inexploitabilite, un proprietaire et une date d'expiration.
  - `ip-address` est au minimum en 10.7.1 dans le chemin IMAP/proxy, ou une exception demontre que les fonctions et entrees affectees sont inatteignables; les adresses trop longues et familles IP melangees echouent de facon bornee.
  - Les envois SMTP et lectures IMAP existants passent avec des limites de taille et de complexite testees, sans journaliser le contenu ou les adresses completes.
  - Un contrat partage de parser tableur fixe formats, limites, erreurs, budget memoire/temps et fixtures malveillantes sans imposer de code client commun.
  - La CI produit un rapport d'audit reproductible et echoue sur toute nouvelle vulnerabilite critique ou haute runtime non acceptee explicitement.
- Contraintes: modifier uniquement `planii-backend/`, la configuration CI partagee et la documentation; conserver les lockfiles deterministes; utiliser des fixtures sans donnees personnelles; migrations de versions reversibles; aucune donnee ou secret de production.
- Dependances: Aucune.
- Risques: ruptures majeures Nodemailer/mailparser, faux positifs npm, e-mail entrant volumineux, regression upload et choix de parser tableur insuffisamment maintenu.
- Tests attendus: Supertest multipart forge/trop volumineux, regression avatar/image projet, SMTP de test, IMAP/message/adresse forges, proxy avec entree IP longue et familles melangees, audit npm borne aux dependances runtime, validation du contrat et des fixtures partagees.

### PLANI-028 - Securiser les dependances et l'import tableur web

- Proprietaire: Claude Code
- Parent: PLANI-027
- Priorite: P0
- Effort: M
- Statut: BLOCKED
- Probleme: le web utilise `xlsx@0.18.5` pour lire des fichiers choisis par l'utilisateur; cette version est affectee par une pollution de prototype et un ReDoS, et aucune version corrigee n'existe dans le registre npm. L'audit runtime du 30 septembre 2026 ne remonte qu'une vulnerabilite haute, directe et sans correctif npm: `xlsx`. Les nouveaux avis `fast-uri@3.1.3` et `brace-expansion@5.0.7` se trouvent dans la chaine de build `vite-plugin-pwa > workbox-build`, pas dans les dependances runtime auditees, mais doivent etre tries avant cloture.
- Resultat utilisateur: importer un tableur sur le web sans qu'un fichier forge ne puisse bloquer, alterer ou rendre indisponible l'application.
- Perimetre: appliquer le contrat PLANI-027; remplacer ou sourcer de facon sure le parser; limiter taille, feuilles, lignes, colonnes et temps de traitement; isoler le parsing si necessaire; mettre a jour Vite/PostCSS et les transitives compatibles; fournir des erreurs accessibles et conserver la PWA.
- Hors perimetre: mobile, backend, redesign de l'import, ajout de formats ou utilisation de `npm audit fix --force`.
- Criteres d'acceptation:
  - Les fixtures de pollution de prototype, ReDoS, classeur corrompu et fichier surdimensionne sont rejetees ou traitees dans le budget defini sans bloquer l'interface.
  - Le parser retenu a une provenance, une licence, une integrite et une politique de maintenance documentees; aucune version npm connue vulnerable n'est conservee sans exception datee.
  - Les erreurs de taille, format et delai sont accessibles au clavier et annoncees au lecteur d'ecran sans exposer le contenu du fichier.
  - L'audit ne contient plus de vulnerabilite haute directe runtime applicable; les avis de build restants sont corriges ou acceptes avec menace et date d'expiration.
  - Le build PWA et les 28 tests Playwright existants restent verts, avec des tests d'import dedies.
- Contraintes: modifier uniquement `planii-vite/`; respecter PLANI-013; conserver les donnees du fichier localement jusqu'a confirmation; ne pas charger de code distant a l'execution.
- Dependances: PLANI-027.
- Risques: incompatibilite XLSX, croissance du bundle, blocage du thread principal, supply chain hors registre et regression CSV/Google Sheets.
- Tests attendus: unitaires parser/limites, fixtures forgees, Playwright import/erreurs accessibles, build PWA, inspection du bundle et audit npm.

### PLANI-029 - Securiser les dependances et l'import tableur mobile

- Proprietaire: Cursor AI
- Parent: PLANI-027
- Skills obligatoires: `expo:expo-overview` d'abord, puis `expo:expo-upgrade`, les skills Expo routes pour l'import de documents, la securite et les performances, `expo:expo-design-system`, `frontend-design`, `ui-ux-pro-max`, `21st-cli-use` et `21st-ui-review`.
- Priorite: P0
- Effort: M
- Statut: BLOCKED
- Probleme: le mobile utilise `xlsx@0.18.5` pour lire des fichiers utilisateurs. Apres la montee Expo 57, l'audit Yarn du 30 septembre remonte 79 vulnerabilites hautes et 28 moderees dans l'arbre declare. `brace-expansion@5.0.9`, apporte par `expo > @expo/fingerprint > minimatch`, est affecte par trois nouveaux avis de DoS et doit atteindre au moins 5.0.12; PLANI-024 ne resout pas a lui seul `xlsx` ni le triage des transitives Expo.
- Resultat utilisateur: importer des taches depuis un fichier sur iOS et Android sans gel, corruption d'etat ni consommation memoire incontrôlee.
- Perimetre: appliquer le contrat et les fixtures de PLANI-027; remplacer ou sourcer surement le parser; limiter taille, feuilles, lignes, colonnes, memoire et temps; coordonner le lockfile apres PLANI-024; mettre a jour `brace-expansion` de facon compatible avec Expo et verifier les commandes fingerprint/build/update; fournir des erreurs natives accessibles; verifier les avis residuels Expo/runtime.
- Hors perimetre: web, backend, nouvelle experience d'import, SDK 58 beta, DOM/CSS ou code 21st copie directement.
- Criteres d'acceptation:
  - Les fixtures de pollution de prototype, ReDoS, corruption et surdimensionnement ne bloquent ni iOS ni Android et restent dans les budgets du contrat.
  - Le parser retenu a provenance, licence, integrite et maintenance documentees; aucune version npm connue vulnerable n'est conservee sans exception datee.
  - Les erreurs exposent un nom, un role, un etat et une action coherents sous VoiceOver/TalkBack et n'affichent aucun contenu sensible.
  - Apres PLANI-024, `brace-expansion` est au minimum en 5.0.12, les fingerprints/runtimeVersion restent stables et l'audit ne contient plus de vulnerabilite haute directe runtime applicable; chaque reliquat a une analyse, un proprietaire et une echeance.
  - Le typecheck, les parcours d'import et les validations sur development builds iOS/Android passent avec des fichiers petits, grands, corrompus et forges.
- Contraintes: suivre `.cursor/rules/planii-mobile.mdc`; modifier uniquement `planii-mobile/`; traduire l'inspiration 21st avec les composants Expo/React Native et le design system existant; ne pas utiliser `npm audit fix --force`.
- Dependances: PLANI-027, PLANI-024.
- Risques: pression memoire sur appareil, incompatibilite Hermes, supply chain hors registre, cout EAS et divergence de comportement iOS/Android.
- Tests attendus: typecheck, `expo-doctor`, fingerprint et EAS Update hors production, unitaires parser/limites, fixtures forgees, development builds iOS/Android, VoiceOver/TalkBack, profil memoire et audit Yarn.

### PLANI-030 - Rendre les reunions Jitsi compatibles avec les politiques navigateur

- Proprietaire: Claude Code
- Priorite: P0
- Effort: M
- Statut: IN_PROGRESS
- Probleme: `Meeting.tsx` charge `https://meet.jit.si/external_api.js` et cree un iframe cross-origin, mais la configuration Nginx livree par le Dockerfile garde `script-src 'self'`, n'autorise aucun `frame-src` Jitsi et definit `camera=()` ainsi que `microphone=(self)`. La reponse publique actuelle n'expose en plus ni CSP ni Permissions-Policy, donc PLANI-026 ne peut pas prouver a la fois le durcissement et le fonctionnement des reunions.
- Resultat utilisateur: rejoindre une reunion avec camera et microphone apres un deploiement durci, avec une erreur accessible si le fournisseur tiers est indisponible.
- Perimetre: charger Jitsi uniquement a l'ouverture d'une reunion; definir les origines minimales dans CSP et la delegation camera/microphone; verifier les en-tetes servis par l'image Nginx puis sur un point d'entree de validation; fournir et internationaliser l'etat d'erreur; documenter fournisseur, finalites, donnees, region, sous-traitance, conservation, conditions et cout; utiliser `meet.jit.si` uniquement pour les tests d'integration.
- Hors perimetre: mobile, backend, remplacement fonctionnel des reunions, auto-hebergement Jitsi sans decision separee, jokers CSP, `unsafe-eval`, declaration juridique definitive ou refonte de PLANI-026.
- Criteres d'acceptation:
  - Une build Docker/Nginx charge le script et l'iframe Jitsi sans violation CSP inattendue, sans joker et sans ajouter `unsafe-eval`.
  - Camera et microphone fonctionnent uniquement dans l'iframe de reunion attendue; les autres origines et cadres restent bloques par defaut.
  - Le script tiers n'est charge qu'apres l'action explicite d'ouvrir la reunion; l'interface indique le fournisseur et renvoie vers l'information de confidentialite avant transfert de donnees.
  - Une panne, un refus de permission ou un blocage CSP produit un message traduit, focalisable et annonce par lecteur d'ecran, sans boucle ni ecran vide.
  - Les en-tetes de l'image et du point d'entree de validation correspondent; un test de production simulee hors production prouve ouverture, audio/video et fermeture propre sans presenter `meet.jit.si` comme cible livrable.
  - Le dossier d'exploitation documente role du fournisseur, region, sous-traitants, retention, conditions d'usage, limites et cout; toute base legale ou consentement est valide par la revue juridique sans etre presume par le code.
- Contraintes: modifier uniquement `planii-vite/` et la documentation web; attendre la cloture de PLANI-013 pour ne pas modifier `Meeting.tsx` en parallele; conserver une CSP restrictive et une politique de permissions au moindre privilege; ne jamais envoyer de contenu de projet avant l'ouverture explicite; ne pas utiliser `meet.jit.si` en production, conformement a la documentation Jitsi.
- Dependances: PLANI-013.
- Risques: ouverture excessive de la CSP, exfiltration vers un tiers, permissions media cassees, indisponibilite de `meet.jit.si`, non-conformite RGPD et cout futur d'une offre geree ou auto-hebergee.
- Tests attendus: build Vite/PWA, 28 tests Playwright existants, test E2E sous Nginx avec capture des violations CSP, permissions refusees/acceptees, clavier et lecteur d'ecran, inspection des en-tetes, smoke test d'integration hors production et revue de confidentialite/cout.
- Avancement observe: le chargement apres consentement, les etats accessibles, la CSP/Permissions-Policy minimales, six tests Jitsi simules sous les en-tetes Nginx et le dossier d'exploitation sont implementes localement. Les six tests Jitsi et la suite web complete 35/35 passent, et le build PWA reussit. Le ticket n'est pas clos: image Docker/Nginx reelle, correspondance des en-tetes de validation, audio/video reel, revue juridique/fournisseur et chiffrage restent ouverts; `meet.jit.si` ne peut fournir qu'une preuve d'integration hors production et PLANI-013 attend encore la revue manuelle VoiceOver/NVDA.

### PLANI-031 - Securiser l'acces aux salles de reunion Jitsi

- Proprietaire: Claude Code
- Parent: PLANI-030
- Priorite: P0
- Effort: L
- Statut: RESEARCH
- Probleme: le web derive la salle publique `meet.jit.si` directement de l'identifiant de projet (`planii-<projectId>`) et ne transmet ni credential de salle ni controle d'appartenance au fournisseur. Les identifiants projet sont aleatoires, mais ils circulent dans le client; toute personne qui obtient un nom de salle peut tenter de rejoindre hors de l'autorisation Planii. Jitsi precise en outre que `meet.jit.si` sert aux tests d'integration et n'est pas destine aux applications de production.
- Resultat utilisateur: seuls les membres autorises rejoignent la reunion de leur projet, avec des roles explicites et une revocation effective apres retrait du projet.
- Perimetre: ADR comparant JaaS gere et auto-hebergement, avec `meet.jit.si` conserve uniquement comme banc de test; region, DPA, sous-traitants, retention, SLA et cout; identifiant de salle non derive d'un identifiant metier expose; credential court signe cote backend si la cible le permet; roles hote/invite; revocation apres retrait; migration et repli; adaptation web et tests d'autorisation.
- Hors perimetre: mobile; enregistrement des reunions; transcription; achat ou deploiement fournisseur avant decision; refonte du chat Planii.
- Criteres d'acceptation:
  - L'ADR choisit JaaS ou un auto-hebergement apres comparaison securite, RGPD, region, DPA, disponibilite et cout; `meet.jit.si` est explicitement exclu de la production.
  - Le nom de salle n'expose ni identifiant projet ni donnee personnelle et offre au moins 128 bits d'entropie ou une garantie equivalente documentee.
  - Seul un membre encore autorise obtient un acces court; le role hote n'est pas forgeable par le client et un retrait de membre bloque les nouveaux acces.
  - Le credential ou secret de salle n'apparait ni dans les logs, ni la telemetrie, ni un referrer, ni un stockage navigateur persistant.
  - Un utilisateur non membre connaissant l'ancien nom de salle ne peut ni rejoindre ni observer les metadonnees de la reunion.
  - CSP, Permissions-Policy, information de confidentialite et dossier d'exploitation sont mis a jour pour le domaine finalement retenu.
- Contraintes: PLANI-030 doit d'abord stabiliser l'integration web; le backend necessaire est attribue a Claude Code car seul le client web en depend; aucune modification mobile; secrets signes et courts; aucune promesse juridique sans validation; aucune livraison de production sur `meet.jit.si`.
- Dependances: PLANI-030.
- Risques: cout recurrent, verrouillage fournisseur, latence, region indisponible, fuite de credential, migration des salles actives et complexite d'exploitation Jitsi.
- Tests attendus: tests API membre/non-membre/retrait/expiration/rejeu, test navigateur sans credential puis avec credential, verification des logs/referrers, smoke a deux comptes, revue DPA/region/cout et test de repli fournisseur indisponible.

## Dernier audit differentiel - 30 septembre 2026, 12:41 CEST

- Fenetre auditee: `2026-09-29T19:17:23.652Z`-`2026-09-30T10:41:10Z`. Aucun commit ni fichier applicatif nouveau; `HEAD` local et distant public restent alignes sur `a717cfe`. Le diff applicatif local preexistant conserve l'empreinte SHA-256 `830aa254...`; aucun code applicatif n'a ete modifie par l'automatisation.
- GitHub public: 0 issue ouverte, 0 PR ouverte et 0 deploiement. Le dernier workflow reste `Deploy to Hostinger VPS` `35592811607`, en echec sur `a717cfe`; PLANI-026 couvre l'incident. L'etat des secrets Actions n'est pas lisible sans authentification et le jeton local `gh` est invalide.
- Securite fraiche: web 1 haute (`xlsx`, sans correctif npm); backend 10 alertes, dont 6 hautes et 4 moderees; mobile 79 hautes et 28 moderees. Parmi 16 avis npm publies dans la fenetre, six touchent des versions resolues de `nodemailer`, `ip-address` et `brace-expansion`; PLANI-027/028/029 sont enrichis sans doublon.
- Veille produit: aucun release stable, signal collaboration, norme accessibilite, exigence RGPD/AI Act ou changement de cout/licence post-coupure n'est applicable. Expo SDK 58 reste beta et hors cible. Aucun nouveau ticket ni changement de priorite, proprietaire, statut ou dependance n'est justifie.
- Le backlog reste a 31 tickets, dont 8 Cursor AI avec `Skills obligatoires`, `expo:expo-overview` en premier, `.cursor/rules/planii-mobile.mdc` et les skills Expo/design/21st requis.

## Definition de pret

Un ticket est `READY` lorsque son objectif, ses criteres d'acceptation, ses dependances, ses risques et sa strategie de test sont compris. `IN_PROGRESS` signifie qu'un proprietaire a commence le chantier et qu'aucun autre agent ne doit le reprendre. `DONE` signifie que tous les criteres et tests attendus ont ete verifies. `RESEARCH` exige une decision documentee avant implementation. `PROPOSED` ne doit pas etre pris par un agent sans affinage. `BLOCKED` est specifie mais attend la fermeture explicite de ses dependances.

## Plan du jour - 30 septembre 2026, actualise a 12:41 CEST

### Cursor AI - mobile

1. **En cours: PLANI-024** - binaries EAS `development` 1.1.0 prets (Android APK `03a3b7f4-…`, iOS simulateur `e88e883b-…` apres correctif `expo-speech-recognition@57.1.0`). Restent: smoke Auth/Projets/Agenda/Tache sur simulateur/appareil (Xcode/emulateur absents ici), deep links, permissions, OTA hors production et profil memoire Reanimated.
2. **En cours: PLANI-016** - socle a11y Auth/Projets/Agenda/Tache pose dans le code; reste la revue VoiceOver/TalkBack sur development build SDK 57.
3. **Mobile pret, encore bloque: PLANI-019** - deep links, purge SecureStore et etats expire/invalide sont dans `planii-mobile/`; la cloture attend PLANI-017 (jeton atomique et revocation JWT).
4. **Bloques: PLANI-029, PLANI-021, PLANI-010, PLANI-011 et PLANI-023** - PLANI-029 integre desormais `brace-expansion >=5.0.12`; attendre PLANI-027/004/008/014 et la QA native de PLANI-024.

### Claude Code - web

1. **En cours: PLANI-013** - automatisation 35/35; executer et documenter VoiceOver/Safari et NVDA/Firefox sur Auth, Projets, Agenda, Tache et Import.
2. **En cours: PLANI-030** - terminer les preuves Docker/Nginx, media reel, en-tetes publics, revue juridique/cout et smoke de production sans reouvrir le perimetre de PLANI-013.
3. **Recherche, non prenable: PLANI-031** - choisir le controle d'acces Jitsi et le fournisseur apres PLANI-030; ne pas implementer avant l'ADR securite/RGPD/cout.
4. **Bloque: PLANI-018** - finaliser et tester le reset web apres PLANI-017; ne pas modifier les fichiers backend ou mobile.
5. **Bloques: PLANI-028 et PLANI-007** - attendre respectivement PLANI-027 et PLANI-004.

### Partage/backend

1. **Pret a prendre en premier: PLANI-027** - remedier les nouveaux avis Nodemailer/IP, les dependances API et le contrat partage d'import; eviter un travail parallele sur le lockfile et la CI backend.
2. **Pret ensuite: PLANI-001** - rendre PostgreSQL de test obligatoire et supprimer les faux verts a 12 tests ignores.
3. **En cours, a reprendre immediatement apres PLANI-001: PLANI-017** - rendre le reset atomique, revoquer API/WebSocket, limiter, purger et tester concurrence/expiration/rejeu.
4. **Pret a prendre sans chevauchement: PLANI-025** - verifier PostgreSQL de production et sa restauration.
5. **Bloque: PLANI-026** - attendre PLANI-031, puis retablir le deploiement avec secrets, empreinte, ingress Traefik verifie, gates et rollback.
6. **Puis: PLANI-009** - unifier l'agenda et fournir le flux ICS prive apres PLANI-001 et PLANI-002.
