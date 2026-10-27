# Réunions vidéo (Jitsi Meet) — dossier d'exploitation web (PLANI-030)

Statut : **document technique, pas un avis juridique.** Les points marqués « À VALIDER » relèvent de la revue juridique / du fournisseur et ne sont pas présumés par le code.

## Ce que fait l'application
- L'écran Réunion (`planii-vite/src/components/Meeting.tsx`) n'appelle **rien** vers le fournisseur à l'ouverture. L'utilisateur voit d'abord un encart : fournisseur (`meet.jit.si`), données concernées, lien vers `/privacy`, bouton « Rejoindre la réunion ».
- Au clic seulement : chargement de `https://meet.jit.si/external_api.js` (15 s max), puis création de l'iframe Jitsi (salle `planii-<id du projet>`, nom d'affichage = nom de l'utilisateur).
- Erreurs (fournisseur injoignable, blocage CSP/réseau, délai dépassé) : message traduit (`role="alert"`), focus sur « Réessayer », pas d'écran vide ni de boucle. Refus/absence de caméra ou micro : message `role="status"`, la réunion continue.
- Aucun contenu de projet (tâches, messages du chat Planii) n'est envoyé à Jitsi ; seuls le nom d'affichage et le flux audio/vidéo transitent via l'iframe.

## Politique navigateur (nginx.conf, source unique)
| En-tête | Valeur utile |
|---|---|
| `Content-Security-Policy` | `script-src 'self' https://meet.jit.si`, `frame-src https://meet.jit.si`, `default-src 'self'`, pas de joker, pas de `unsafe-eval` |
| `Permissions-Policy` | `camera=("https://meet.jit.si")`, `microphone=(self "https://meet.jit.si")`, `display-capture=("https://meet.jit.si")`, `geolocation=()` |

L'iframe reçoit l'attribut `allow` de l'API externe de Jitsi ; sans l'entrée dans `Permissions-Policy`, le navigateur refuserait quand même la délégation. La caméra n'est **pas** autorisée pour l'application elle-même.

## Vérifications
- Tests navigateur sous les en-têtes de `nginx.conf` : `npm run test:e2e` (`e2e/meeting-csp.spec.ts`, serveur `e2e/serve-with-nginx-headers.mjs`). Jitsi est **simulé** : on teste notre contrat (rien avant consentement, aucune violation CSP, origines tierces bloquées, états d'erreur, axe clair/sombre).
- **Non réalisé ici** : build de l'image Docker/Nginx réelle (Docker absent sur le poste de dev) et audio/vidéo réels. À faire avant clôture :
  1. `docker build` de `planii-vite`, lancer le conteneur, puis `scripts/check-headers.sh http://localhost:<port>`.
  2. Le même script sur l'URL publique : les deux résultats doivent être identiques (sinon un proxy réécrit ou supprime les en-têtes → voir PLANI-026).
  3. Smoke test manuel après déploiement : ouvrir une réunion, accorder caméra/micro, vérifier audio/vidéo entre deux navigateurs, quitter, vérifier l'absence de violation CSP dans la console.
- Note Nginx : `location /assets/` redéfinit `add_header`, ce qui remplace (n'hérite pas) les en-têtes du serveur pour les fichiers statiques ; la CSP/Permissions-Policy s'appliquent au document HTML, ce qui est voulu.

## Fournisseur, données, contrat (à compléter par le responsable produit)
| Sujet | État |
|---|---|
| Fournisseur | Jitsi Meet, instance publique `meet.jit.si` (exploitée par 8x8 — À VALIDER dans leurs conditions actuelles) |
| Finalité | Visioconférence de projet |
| Données vues par le fournisseur | nom d'affichage, adresse IP, nom de salle, flux audio/vidéo/partage d'écran, métadonnées de connexion |
| Région / hébergement | Non choisi par Planii sur l'instance publique — À VALIDER |
| Sous-traitants / transferts hors UE | À VALIDER auprès du fournisseur |
| Conservation | À VALIDER (politique du fournisseur) ; Planii ne stocke pas les flux |
| Base légale / consentement | À VALIDER par la revue juridique ; l'encart de consentement n'est **pas** une validation juridique |
| Conditions d'usage / SLA | Service public gratuit, sans engagement de disponibilité — À VALIDER |
| Coût | 0 € aujourd'hui ; offres gérées ou auto-hébergement = décision séparée, coût à chiffrer |

## Risque de sécurité à traiter (hors périmètre de ce ticket)
Le nom de salle est `planii-<id du projet>` sur une instance publique **sans mot de passe ni JWT** : toute personne connaissant (ou devinant) l'identifiant peut rejoindre. À traiter par une décision séparée : salle avec secret non devinable, salle d'attente/lobby, ou offre gérée avec jeton signé côté serveur (backend).

## Limites connues
- Textes traduits en FR et EN ; les autres langues retombent sur l'anglais (mécanisme existant de l'i18n).
- Si le navigateur ou une extension bloque `meet.jit.si`, l'écran d'erreur s'affiche (il ne distingue pas la cause exacte).
