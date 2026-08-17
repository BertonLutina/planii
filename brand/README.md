# Planii — marque

Trois barres alignées, la deuxième évidée. Les barres portent le plan dans le
temps ; l'évidée porte l'intervenant externe — prestataire ou client. C'est ce
qui sépare Planii d'un Monday, où tout le monde est du même côté.

Rien n'est encore installé dans l'app : ces fichiers vivent à part, le temps que
tu valides. Les icônes Expo par défaut sont toujours en place dans
`planii-mobile/assets/`.

## Géométrie

Tout tient sur une grille de 100 unités, ce qui permet de sortir n'importe
quelle taille sans redécider :

| Barre | x | y | largeur | hauteur | traitement |
|---|---|---|---|---|---|
| 1 | 12 | 10.0 | 58 | 21 | plein |
| 2 | 12 | 39.5 | 76 | 21 | **évidé**, contour 7 |
| 3 | 12 | 69.0 | 40 | 21 | plein |

Le bord droit est volontairement irrégulier (58 / 76 / 40). Trois barres de
largeurs décroissantes formeraient l'icône « aligner à gauche » d'une barre
d'outils ; cette irrégularité l'empêche. La barre évidée est la plus longue :
l'élément qui porte le sens est aussi celui que l'œil rencontre en premier.

## Couleurs

Reprises telles quelles de `planii-vite/src/index.css` — rien de nouveau.

- Dégradé : `#8b7bff → #6d5cff`, 135°
- Aplat : `#6d5cff`
- Sur fond violet ou sombre : blanc

## Le seuil des 48 px

En dessous d'environ 48 px, le trou de la barre évidée mesure moins d'un pixel
et se referme — le signe perd précisément ce qui le distingue. Deux versions
existent donc :

- **`planii-mark*.svg`** — l'évidement, au-dessus de 48 px : en-tête, écran de
  connexion, App Store, splash.
- **`planii-mark-small.svg`** — l'évidement remplacé par un aplat à 55 %, en
  dessous de 48 px : favicon, barre d'onglets, avatars, notifications.

La hiérarchie à trois niveaux survit dans les deux cas ; seul le moyen change.
C'est un choix assumé, pas un pis-aller : un logo qui ne se lit qu'à une seule
taille n'est pas fini.

## Fichiers

### `svg/` — la référence

| Fichier | Usage |
|---|---|
| `planii-mark.svg` | Dégradé, sur fond clair |
| `planii-mark-white.svg` | Blanc, sur violet ou sombre |
| `planii-mark-mono.svg` | Hérite de `currentColor` — à préférer dans l'app, il suit le thème sans second fichier |
| `planii-mark-small.svg` | Variante sous 48 px, `currentColor` |

### `png/` — les rendus

| Fichier | Taille | Destination |
|---|---|---|
| `icon.png` | 1024 | Icône iOS et Android. **Carré plein, opaque, sans coins arrondis** — iOS applique son propre masque, arrondir ici doublerait l'arrondi |
| `splash-icon.png` | 1024 | Marque blanche sur fond transparent ; `app.json` pose déjà `#6d5cff` en arrière-plan. La marque n'occupe que 40 % pour ne pas remplir l'écran une fois mise à l'échelle |
| `favicon.png` | 64 | Web. Arrondi, lui, car aucun masque système ne s'applique. Utilise la variante petite taille |
| `android-icon-background.png` | 1024 | Couche de fond de l'icône adaptative |
| `android-icon-foreground.png` | 1024 | Couche avant. Contenu dans les 52 % centraux : le masque du constructeur peut rogner jusqu'à 33 % |
| `android-icon-monochrome.png` | 1024 | Couche monochrome (thème Android 13+). Android la teinte lui-même, seule la silhouette compte |
| `mark-*.png` | 512 | La marque seule, pour un usage hors app |
| `_apercu.png`, `_comparaison.png` | — | Planches de contrôle, à ne pas livrer |

## Installer dans l'app

Quand tu valides, il suffit de copier :

```bash
cd planii-mobile
cp ../brand/png/icon.png                      assets/icon.png
cp ../brand/png/splash-icon.png               assets/splash-icon.png
cp ../brand/png/favicon.png                   assets/favicon.png
cp ../brand/png/android-icon-background.png   assets/android-icon-background.png
cp ../brand/png/android-icon-foreground.png   assets/android-icon-foreground.png
cp ../brand/png/android-icon-monochrome.png   assets/android-icon-monochrome.png
```

Côté web, `planii-vite` dessine la marque en CSS (`.brand .logo`, `.logo-big`,
`.side-brand .logo`, `.legal-brand .logo`) — deux points blancs posés en
`box-shadow`. Il faudra remplacer ces règles par le SVG. Et l'écran de connexion
mobile affiche encore un « P » (`src/screens/auth/AuthScreen.tsx`) : c'est le
dernier endroit où subsiste l'ancienne marque.

## Reproduire

`brand/generate.py` régénère tous les PNG depuis la même grille. Modifie
`BARS` et relance — les proportions restent cohérentes partout.

## Avant publication

- Le nom **Planii** est proche de **Planio** (plan.io), un gestionnaire de
  projets établi, dans la même catégorie. À vérifier sur
  [TMview](https://www.tmdn.org/tmview/) en classes 9 et 42 avant d'investir
  davantage. Le signe, lui, reste valable quel que soit le nom.
