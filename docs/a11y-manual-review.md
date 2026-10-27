# Revue manuelle clavier + lecteur d'écran — web (PLANI-013)

Objectif : fermer le dernier critère d'acceptation de PLANI-013 (« Auth, Projets, Agenda et Tâche passent les scénarios lecteur d'écran documentés »). Les tests automatisés (`npm run test:e2e`) sont verts ; cette revue couvre ce qu'ils ne voient pas. Durée estimée : 45–60 min.

## Préparation
- App : `cd planii-vite && npm run build && npm run preview` (http://localhost:4173) avec un compte de test et au moins 2 projets, 3 tâches (une sans assigné), 1 rendez-vous.
- Combinaisons à tester (au minimum les deux premières) :
  1. macOS **VoiceOver + Safari** (Cmd+F5 ; VO = Ctrl+Option ; « Rotor » = VO+U).
  2. Windows **NVDA + Firefox** (Ctrl = stop, Insert = NVDA, liste des éléments = Insert+F7).
  3. (optionnel) iOS VoiceOver / Android TalkBack sur la PWA installée.
- Souris débranchée ou ignorée : **tout au clavier** (Tab, Maj+Tab, Entrée, Espace, flèches, Échap).
- Réglages à vérifier une fois : zoom navigateur 200 % ; mode « réduire les animations » du système activé.

## Règles de lecture des résultats
Pour chaque étape noter **OK / KO / N/A** et, si KO, ce qui a été annoncé (ou non). Un KO bloquant = impossible d'aller au bout du parcours ; non bloquant = gênant mais contournable.

## Parcours 1 — Auth
| # | Étape | Attendu | VO+Safari | NVDA+Firefox |
|---|---|---|---|---|
| 1.1 | Arriver sur l'accueil non connecté, Tab jusqu'à « Se connecter » | Focus visible, nom du bouton annoncé, ordre logique | | |
| 1.2 | Ouvrir le formulaire de connexion | Titre annoncé ; e-mail et mot de passe annoncés **avec leur libellé** et leur type | | |
| 1.3 | Soumettre vide, puis avec un mauvais mot de passe | Erreur annoncée sans quitter le champ (message lisible, pas de perte de focus) | | |
| 1.4 | « Mot de passe oublié » → soumettre un e-mail | Confirmation annoncée ; retour au login au clavier | | |
| 1.5 | Se connecter | Arrivée sur l'app, focus dans la page (pas perdu sur `body`) | | |

## Parcours 2 — Projets
| # | Étape | Attendu | VO+Safari | NVDA+Firefox |
|---|---|---|---|---|
| 2.1 | Naviguer vers Projets (nav latérale) | Bouton courant annoncé « sélectionné/actuel » ; titre de page annoncé | | |
| 2.2 | Parcourir les cartes projet | Chaque carte : nom, type, rôle, avancement lus ; pas de doublon bruyant | | |
| 2.3 | Tri « Manuel » → boutons monter/descendre | Nom du projet dans chaque bouton ; l'ordre change et est annoncé/perceptible | | |
| 2.4 | « Nouveau projet » (dialogue) | Focus dans le dialogue, titre annoncé, Tab piégé, Échap ferme, focus revient au bouton | | |
| 2.5 | Créer le projet et l'ouvrir | Arrivée dans le projet, titre lu | | |

## Parcours 3 — Agenda
| # | Étape | Attendu | VO+Safari | NVDA+Firefox |
|---|---|---|---|---|
| 3.1 | Aller à Agenda | Titre de page lu ; changement de mois/semaine annoncé | | |
| 3.2 | Parcourir les jours et événements | Date + intitulé lus ; jours hors mois distinguables sans la couleur | | |
| 3.3 | Ouvrir un événement / créer un rendez-vous | Dialogue conforme (comme 2.4) ; champs libellés ; erreurs annoncées | | |

## Parcours 4 — Tâche
| # | Étape | Attendu | VO+Safari | NVDA+Firefox |
|---|---|---|---|---|
| 4.1 | Dans un projet, atteindre une tâche | Titre, priorité (P1…), statut (texte), assigné, échéance lus | | |
| 4.2 | Cocher / décocher la tâche | État « coché » annoncé ; tâche verrouillée annoncée comme désactivée | | |
| 4.3 | Menu ⋯ → « Déplacer vers … » | Changement de statut sans glisser ; confirmation (toast) **annoncée** | | |
| 4.4 | Ouvrir le tiroir de tâche (depuis Accueil) | Dialogue nommé par le titre ; Échap ferme ; focus revient | | |
| 4.5 | Ajouter un commentaire | Champ libellé ; commentaire ajouté annoncé | | |

## Parcours 5 — Import de tâches
| # | Étape | Attendu | VO+Safari | NVDA+Firefox |
|---|---|---|---|---|
| 5.1 | « Importer des tâches » | Dialogue conforme ; étapes (Source/Feuille/Mode/Sélection) compréhensibles | | |
| 5.2 | Choisir un fichier (bouton, pas glisser-déposer) | Accessible au clavier ; erreur de format annoncée | | |
| 5.3 | Modes A/B/C : sélectionner cellules/lignes | Sélection faisable **au clavier** et annoncée (à noter précisément : point à risque) | | |
| 5.4 | Importer | Résultat annoncé | | |

## Contrôles transverses (une fois)
- [ ] Zoom 200 % : pas de perte de contenu ni de défilement horizontal de page.
- [ ] Animations réduites : pas de mouvement gênant.
- [ ] Palette de commandes (Cmd/Ctrl+K) : ouvre, champ focalisé, résultats atteignables, Échap ferme.
- [ ] Réunion : encart de consentement lu ; « Rejoindre la réunion » focalisé ; erreur (réseau coupé) annoncée.
- [ ] Thème sombre : mêmes parcours 1 et 2 lisibles.

## Restitution
Renvoyer ce fichier rempli (ou ses KO) : chaque KO devient une correction dans `planii-vite` et, une fois les parcours OK, PLANI-013 peut passer DONE et PLANI-030 se poursuit (sa dépendance est levée).
Testeur : ______  Date : ______  Versions (OS / navigateur / lecteur) : ______
