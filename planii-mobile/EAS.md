# Planii mobile — builds et publication avec EAS

Tout ce qui suit se lance **sur ta machine**, depuis `planii-mobile/`. Les
commandes qui touchent à ton compte Expo, à Apple ou à Google ne peuvent pas
être exécutées à ta place : elles demandent une authentification et, pour
certaines, une double authentification.

---

## Ce qui est déjà en place

| Fichier | Rôle |
|---|---|
| `eas.json` | Les profils de build et de soumission |
| `app.json` | `runtimeVersion` sur la version d'app, schéma `planii://`, identifiants de bundle |
| `package.json` | Les raccourcis `npm run build:*`, `submit:*`, `update:*` |
| `.gitignore` | Les secrets de publication sont exclus |

Paquets ajoutés : `expo-dev-client` (indispensable — la dictée vocale ne
fonctionne pas dans Expo Go) et `expo-updates` (correctifs JS sans repasser par
la revue des stores).

Identifiants d'application, à changer **maintenant** si tu ne les veux pas :

- iOS : `app.planii.mobile`
- Android : `app.planii.mobile`

Une fois un build publié, ils sont figés.

---

## 1. Installer le CLI et se connecter

```bash
npm install -g eas-cli
eas login          # crée un compte sur expo.dev si tu n'en as pas
eas whoami
```

## 2. Rattacher le projet à ton compte

```bash
cd planii-mobile
eas init
```

Cette commande écrit `extra.eas.projectId` dans `app.json` et crée le projet
côté expo.dev. **Commite le fichier après** : sans ce champ, les builds ne
savent pas où aller.

Puis, pour les mises à jour à distance :

```bash
eas update:configure
```

## 3. Un premier build de développement

C'est celui dont tu as besoin en priorité : Expo Go ne sait pas charger les
modules natifs de la dictée vocale, donc la saisie vocale y est invisible.

```bash
# Simulateur iOS (rapide, gratuit, pas de compte Apple requis)
npm run build:dev:ios

# Téléphone Android
npm run build:dev:android
```

EAS te demandera de générer les identifiants de signature — réponds oui, il
s'en occupe. Le build tourne sur leurs serveurs ; tu récupères un lien de
téléchargement à la fin (10 à 20 minutes pour le premier).

Ensuite, tu lances le serveur de développement contre ce build :

```bash
npx expo start --dev-client
```

Le profil `development` pointe sur `http://localhost:4000/api`. Si tu testes
depuis un vrai téléphone, il ne verra pas ce `localhost` — utilise
`development-device`, qui vise l'API de production :

```bash
eas build --profile development-device --platform ios
```

## 4. Faire tester l'app autour de toi

```bash
npm run build:preview
```

Distribution interne : un lien et un QR code, sans passer par les stores. En
Android c'est un `.apk` qui s'installe directement. En iOS, il faut enregistrer
les appareils d'abord :

```bash
eas device:create      # génère un lien à ouvrir sur chaque iPhone
```

## 5. Publier sur les stores

```bash
npm run build:prod
```

Produit un `.aab` pour Google Play et un `.ipa` pour l'App Store, avec le
numéro de build incrémenté automatiquement (`autoIncrement`, et
`appVersionSource: remote` : c'est EAS qui tient le compteur, pas `app.json`).

Avant de soumettre, remplis la section `submit.production` de `eas.json` :

**iOS** — il te faut un compte Apple Developer (99 €/an) :

- `appleId` : l'e-mail du compte
- `ascAppId` : l'identifiant numérique de l'app dans App Store Connect, créé en
  ajoutant l'app une première fois là-bas
- `appleTeamId` : 10 caractères, visible dans Membership sur developer.apple.com

**Android** — compte Google Play Console (25 $ une fois) :

1. Play Console → Configuration → Accès à l'API → créer un compte de service
2. Télécharger la clé JSON
3. La poser dans `planii-mobile/credentials/google-play-service-account.json`
   (le dossier est déjà exclu de git)

Puis :

```bash
npm run submit:ios
npm run submit:android    # part sur la piste "internal" d'abord
```

## 6. Corriger sans repasser par la revue

Pour un changement purement JavaScript — un libellé, une couleur, une
correction de logique — pas besoin de rebuild :

```bash
npm run update:prod
```

L'app récupère la mise à jour au prochain lancement. **Attention** : dès que tu
touches à un module natif (nouveau paquet `expo-*`, changement dans `app.json`,
permissions), il faut un vrai build. La règle : si `runtimeVersion` change, il
faut rebuilder — et il suit `version` dans `app.json`.

---

## Ce qui reste à traiter avant la publication

1. **Le retour OAuth sous Expo Go** — `safeRedirect()` côté serveur n'accepte
   `exp://` qu'en dehors de la production. Contre l'API de production, la
   connexion Google/Microsoft ne bouclera pas depuis Expo Go ; elle fonctionne
   dans un build de développement, qui utilise `planii://`.
2. **Les icônes et l'écran de lancement** sont ceux du gabarit Expo. À
   remplacer dans `assets/` avant toute soumission — Apple refuse les icônes
   par défaut.
3. **La politique de confidentialité** est obligatoire pour les deux stores. Il
   en existe déjà une côté web (`planii-vite/src/components/Privacy.tsx`) : il
   faut son URL publique.
4. **Déclarer l'usage du micro** dans les deux formulaires de store, puisque
   l'app demande la reconnaissance vocale.
5. **`expo-doctor`** passe 19 vérifications sur 21 ici ; les deux échecs sont
   dus au réseau du bac à sable. Relance `npm run doctor` chez toi pour avoir
   le vrai résultat.
