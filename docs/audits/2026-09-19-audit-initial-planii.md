# Audit initial de Planii - 19 septembre 2026

## Resume executif

Planii est deja un produit multiplateforme substantiel: application web/PWA, application mobile Expo, API Express, PostgreSQL, temps reel WebSocket, calendrier, projets, taches, reunions, sondages, invitations, notifications, gamification et administration. Les trois cibles compilent correctement.

La priorite n'est toutefois pas d'ajouter immediatement beaucoup de fonctions. La base de livraison doit d'abord etre renforcee: plus de la moitie des tests backend sont ignores sans PostgreSQL de test, aucun test automatise web/mobile n'est visible, le cache PWA conserve des reponses API authentifiees, et plusieurs modules centraux sont devenus tres volumineux. Ces points augmentent le risque de regression, de fuite locale de donnees et de ralentissement des futures evolutions.

## Perimetre observe

- Web: React 18, Vite 5, TypeScript, Tailwind, PWA, stockage du JWT dans `localStorage`.
- Mobile: Expo SDK 54, React Native 0.81, Expo Router, `SecureStore`, mises a jour EAS.
- Backend: Express 4, PostgreSQL, JWT, OAuth, WebSocket, e-mail/IMAP, migrations SQL au demarrage.
- Produit: projets et membres, taches et sous-taches, statuts, commentaires, transferts, rappels, calendrier, rendez-vous, sondages, reunions, notifications, classement et administration.

## Verification technique

| Controle | Resultat | Interpretation |
|---|---|---|
| Build backend TypeScript | Reussi | Le code courant compile. |
| Build web production | Reussi avec avertissement | Le bundle principal atteint 993,62 kB minifie, 308,28 kB gzip. |
| Typecheck mobile | Reussi | Les types Expo/React Native sont coherents. |
| Tests backend | 10 reussis, 12 ignores | Les tests dependants de PostgreSQL sont neutralises si la base manque. |
| Tests web/mobile | Aucun trouve | Les parcours UI critiques ne sont pas proteges automatiquement. |

## Constats prioritaires

### P0 - Les tests peuvent etre verts sans tester la base

`tests/setup.ts` transforme une indisponibilite PostgreSQL en `dbAvailable = false`; 12 tests sont alors ignores. Une CI peut donc sembler saine tout en ne testant ni permissions, ni ecritures en masse, ni authentification complete.

Action: PLANI-001.

### P0 - Le cache PWA peut conserver des reponses privees

La strategie Workbox `NetworkFirst` vise toute l'API de production et accepte les reponses HTTP 200, y compris les routes authentifiees. Sur un appareil partage, une reponse mise en cache peut survivre a la deconnexion. Le cache ne constitue pas non plus un vrai mode hors ligne transactionnel.

Action: PLANI-002.

### P0 - Le jeton web est accessible au JavaScript

Le JWT web est persiste dans `localStorage`. Toute injection de script reussie pourrait l'exfiltrer. Le mobile utilise deja un stockage securise, mais le web ne dispose pas de rotation ou de session serveur durable visible.

Action: PLANI-003.

### P1 - Absence de filet de securite sur les interfaces

Aucun test de composant, d'integration ou de parcours bout en bout n'a ete trouve pour le web et le mobile. Les parcours connexion, creation de projet, creation/deplacement de tache, invitation et calendrier sont donc verifies manuellement.

Action: PLANI-004.

### P1 - Modules trop volumineux et duplication multiplateforme

`ProjectDetail.tsx` atteint 1 413 lignes; `project.service.ts` 555; `task.service.ts` 482. Les clients web et mobile dupliquent aussi types, logique de tri, priorites, import de taches, dates et temps reel. Une modification de contrat peut diverger entre les plateformes.

Actions: PLANI-005 et PLANI-006.

### P1 - Chargement web initial lourd

Le bundle principal approche 1 Mo minifie. Les vues d'administration, d'import XLSX, de guide et de calendrier peuvent etre chargees a la demande.

Action: PLANI-007.

### P1 - Observabilite limitee

Le backend journalise les erreurs avec Pino, mais aucun suivi structure des erreurs client, traces distribuees, indicateurs de latence ou alertes de migrations n'est visible. Un incident multiplateforme restera difficile a reconstituer.

Action: PLANI-008.

## Forces a preserver

- Validation Zod, en-tetes Helmet, CORS explicite et limites de debit separees pour l'authentification.
- Transactions disponibles et migrations SQL versionnees.
- `SecureStore` sur mobile et deconnexion automatique sur 401.
- Debounce des rafraichissements temps reel pour eviter les rafales de requetes.
- Design multilingue, preferences de notifications et controles d'acces par projet deja presents.

## Ordre recommande

1. Rendre les tests backend obligatoires et reproductibles.
2. Corriger le cache PWA des donnees privees.
3. Concevoir une session web plus robuste avant d'ajouter passkeys ou IA.
4. Ajouter les parcours automatises web/mobile.
5. Reduire le bundle et clarifier les frontieres de modules.
6. N'integrer les innovations produit qu'apres validation par recherche et mesure utilisateur.

## Limites de l'audit

Cet audit est statique et local. Il ne couvre pas les journaux de production, les donnees reelles, les retours utilisateurs, les couts d'infrastructure, les politiques de sauvegarde/restauration ni un test d'intrusion. Les changements non valides lies a la reinitialisation du mot de passe ont ete observes mais pas modifies.
