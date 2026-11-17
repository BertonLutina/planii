# Connecteur IA Planii (MCP)

Permet à un assistant (Claude, ChatGPT, Gemini, Codex, tout client MCP) d'agir sur le compte Planii d'un utilisateur, **avec ses droits et jamais plus**.

- Serveur MCP : `https://api.planii.app/mcp` (transport *Streamable HTTP*, sans état, réponses JSON)
- Connexion : OAuth 2.1 (code + PKCE S256), enregistrement dynamique des clients (RFC 7591), métadonnées RFC 9728 / RFC 8414
- Code : `planii-backend/src/mcp/` (serveur + outils), `planii-backend/src/oauth/` (OAuth), migration `011_mcp_oauth.sql`
- UI : web `planii-vite/src/components/AiAssistants.tsx` · mobile `planii-mobile/src/screens/profile/AiAssistantsSection.tsx`

## Comment ça marche

```
Assistant ──POST /mcp (sans jeton)──────────────▶ 401 + WWW-Authenticate: resource_metadata=…
Assistant ──GET /.well-known/oauth-protected-resource/mcp ─▶ découvre le serveur d'autorisation
Assistant ──POST /oauth/register ───────────────▶ client_id (client public, PKCE obligatoire)
Assistant ──navigateur─▶ GET /oauth/authorize ──▶ 302 vers https://planii.app/oauth/consent?…
Utilisateur : se connecte à Planii, coche Lecture / Écriture / Suppression, « Autoriser »
Web ──POST /api/oauth/authorize/decision (JWT Planii)─▶ redirige vers l'assistant avec ?code=…
Assistant ──POST /oauth/token (code + code_verifier)─▶ jeton d'accès (1 h) + jeton de rafraîchissement (30 j, rotation)
Assistant ──POST /mcp (Bearer)──────────────────▶ outils planii_*
```

Les outils **appellent les services métier existants** (`task.service`, `project.service`, `appointment.service`…) avec l'utilisateur du jeton : aucune règle n'est dupliquée (membre du projet, « seul le responsable coche sa tâche », projet clos, etc.).

## Permissions (scopes)

| Scope | Donne accès à |
|---|---|
| `planii:read` (toujours) | projets, tâches, commentaires, rendez-vous, planning, « ma journée » |
| `planii:write` | créer / modifier projets, tâches, statuts, commentaires, rendez-vous |
| `planii:delete` | supprimer tâches et rendez-vous — **et** l'outil exige `confirm=true` après accord explicite de l'utilisateur |

L'utilisateur peut décocher Écriture / Suppression sur la page de consentement. Les jetons portent exactement ce qui a été accordé. Pas d'outil de suppression de projet ni de gestion des membres/invitations dans cette version.

## Outils (24)

Lecture : `planii_get_me`, `planii_get_today`, `planii_get_schedule`, `planii_list_projects`, `planii_get_project`, `planii_list_my_tasks`, `planii_list_tasks`, `planii_get_task`, `planii_list_appointments`
Écriture : `planii_create_project`, `planii_update_project`, `planii_close_project`, `planii_reopen_project`, `planii_create_task`, `planii_create_tasks_bulk`, `planii_update_task`, `planii_set_task_status`, `planii_complete_task`, `planii_claim_task`, `planii_add_task_comment`, `planii_create_appointment`, `planii_update_appointment`
Suppression : `planii_delete_task`, `planii_delete_appointment`

Ajouter un outil : l'écrire (`tool({ name, title, description, scope, input: <zod>, handler })`) dans le fichier de son domaine sous `src/mcp/tools/` et l'ajouter à `tools/index.ts`. Le contrôle du scope, la limitation de débit, la gestion d'erreurs et l'audit sont appliqués automatiquement.

## Sécurité

- Jetons, codes : stockés **hachés** (SHA-256) ; codes à usage unique (10 min) consommés atomiquement ; PKCE S256 obligatoire ; `redirect_uri` en correspondance exacte ; schémas exécutables refusés.
- Jetons liés à la ressource `…/mcp` (paramètre `resource`) ; clients publics uniquement (aucun secret).
- Rotation du jeton de rafraîchissement ; **réutilisation d'un ancien jeton ⇒ connexion révoquée**.
- Révocation : par l'utilisateur (Profil → Assistants IA, web et mobile) ou RFC 7009 (`/oauth/revoke`) ; effet immédiat. Une « connexion » n'est listée qu'après l'échange réel du code.
- Limites : 120 lectures et 40 écritures par minute et par connexion ; échecs d'authentification limités par IP ; `/oauth/*` limité par IP. Listes paginées (50 max), planning ≤ 62 jours, 50 tâches max par import en masse.
- Audit : chaque appel d'outil (réussi, refusé, erreur) est écrit dans `mcp_audit` et visible par l'utilisateur concerné ; purge à 180 jours.
- Les journaux serveur masquent désormais `Authorization` et les cookies.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `OAUTH_CALLBACK_BASE` | Adresse publique de l'API (**pas** `APP_URL`, qui est le site web). Défaut en production : `https://api.planii.app` |
| `APP_URL` / `APP_WEB_URL` | Site web, utilisé pour la page de consentement `…/oauth/consent` |
| `MCP_ENABLED` | `false` coupe `/mcp`, `/oauth/*` et la découverte OAuth (404). Défaut : `true` |

Aucun secret supplémentaire : pas de clé d'API d'assistant, rien dans le frontend ni l'app mobile.

## Déploiement

1. Déployer le backend (la migration `011_mcp_oauth` s'applique au démarrage, elle est additive et idempotente). Le `Dockerfile` copie maintenant `assets/` (icône du connecteur).
2. Traefik : aucune règle à ajouter, `Host(api.planii.app)` couvre `/mcp`, `/oauth/*`, `/.well-known/*`, `/icon.png`, `/favicon.ico`.
3. Déployer le frontend web (page `/oauth/consent` et section « Assistants IA » ; nginx sert déjà l'app sur toute route via `try_files`).
4. Mobile : nouvelle section dans le Profil (mise à jour OTA possible, pas de module natif ajouté).
5. Vérifier :

```bash
curl -s https://api.planii.app/.well-known/oauth-protected-resource/mcp   # resource = https://api.planii.app/mcp
curl -s https://api.planii.app/.well-known/oauth-authorization-server     # endpoints en https://api.planii.app
curl -si -X POST https://api.planii.app/mcp -d '{}' | head -5             # 401 + WWW-Authenticate: Bearer resource_metadata=…
curl -sI https://api.planii.app/icon.png                                  # 200 image/png
```

Contrôle de disponibilité : `GET /.well-known/oauth-protected-resource/mcp` → 200 (à ajouter à la supervision, en plus de `/api/health`).

## Retour arrière

- Immédiat, sans redéploiement : `MCP_ENABLED=false` puis redémarrer. Les assistants reçoivent 404 ; le reste de Planii est intact.
- Complet : redéployer l'image précédente. Les tables `oauth_*` / `mcp_audit` restent inertes ; pour les supprimer : `DROP TABLE mcp_audit, oauth_tokens, oauth_codes, oauth_connections, oauth_clients;` et `DELETE FROM schema_migrations WHERE id='011_mcp_oauth';`.
- Couper un assistant précis : l'utilisateur le révoque ; en urgence globale : `UPDATE oauth_connections SET revoked_at = now() WHERE revoked_at IS NULL;`.

## Ce qui est vérifié, et ce qui ne l'est pas

Vérifié (tests automatisés `tests/mcp.test.ts`, 21 cas + parcours navigateur réel en local) : découverte OAuth, PKCE, usage unique du code, scopes, isolation entre utilisateurs, règles métier, expiration, rotation/réutilisation, révocation, limites de débit, appels simultanés, audit, jetons hachés, **client MCP officiel du SDK** (liste d'outils, appels, annotations, icône).

**Non vérifié** : connexion depuis les vrais produits Claude, ChatGPT, Gemini ou Codex. Les guides affichés dans Planii suivent leur documentation publique, mais leurs menus changent : à tester sur chaque produit après déploiement HTTPS. Points d'attention connus :
- Seul l'enregistrement dynamique (DCR) est pris en charge ; les clients qui exigent un *Client ID Metadata Document* ne pourront pas se connecter tant que ce n'est pas ajouté.
- La limitation de débit est en mémoire (par instance) : à externaliser (Redis) si le backend passe à plusieurs instances.
- Si un fichier `apple-app-site-association` est un jour publié pour planii.app, y **exclure** `/oauth/*` pour que la page de consentement reste dans le navigateur (Android ne revendique déjà que `/invite` et `/reset-password`).
- Les textes de l'interface sont en français et en anglais ; les autres langues retombent sur l'anglais.
