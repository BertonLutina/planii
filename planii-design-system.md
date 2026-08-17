# Planii — Design System

Référence du système de design de Planii : couleurs, typographie, espacements, composants, icônes, états d'interaction et mise en page. Tout est piloté par des **variables CSS** (`planii-vite/src/index.css`) et s'adapte automatiquement aux thèmes **clair / sombre / auto**.

L'app mobile (`planii-mobile`) reprend les mêmes jetons dans `src/theme/tokens.ts`, sous forme d'objets `light` / `dark` : `--accent-bg` y devient `c.accentBg`. Les deux plateformes doivent bouger ensemble.

> Règle d'or : ne jamais coder une couleur en dur. Toujours passer par une variable (`var(--accent)`), sinon le mode sombre casse.

---

## 1. Marque

- **Logo** : deux points blancs (une tâche cochée) sur un carré violet accent, rayon 25–30 %.
- **Nom** : « Planii », graisse 600.
- **Couleur principale** : violet accent `#6d5cff`.

---

## 2. Couleurs

Chaque couleur d'état possède deux compagnons :

- une variante `-bg` — le **fond pâle** des pastilles, bannières et surfaces d'accent ;
- une variante `-on` — la **couleur du texte posé sur ce fond pâle**.

La teinte de marque ne tient pas le rapport 4.5:1 sur son propre fond pâle en thème clair (`--accent` sur `--accent-bg` : 3.87:1). `--accent` reste donc la couleur des aplats — un bouton principal, le logo — et `--accent-on` prend le relais dès qu'il s'agit de texte sur fond pâle. En thème sombre les deux sont identiques : les paires d'origine y passent déjà largement.

### Thème clair

| Rôle | Variable | Hex |
|------|----------|-----|
| Fond page | `--bg` | `#f7f7f8` |
| Surface (carte) | `--surface` | `#ffffff` |
| Surface secondaire | `--surface-2` | `#f0f0f2` |
| Ligne (hairline) | `--line` | `#e5e5e7` |
| Ligne forte | `--line-strong` | `#d6d6da` |
| Texte | `--text` | `#0d0d0d` |
| Texte discret | `--muted` | `#68687a` |
| Indice | `--hint` | `#6a6a76` |
| **Accent** | `--accent` | `#6d5cff` |
| Accent fond | `--accent-bg` | `#efeaff` |
| Accent texte | `--accent-on` | `#5a48e8` |
| Accent clair | `--accent-2` | `#8b7bff` |
| Danger | `--danger` / `--danger-bg` / `--danger-on` | `#c8362f` / `#fdeceb` / `#c8362f` |
| Attention | `--warn` / `--warn-bg` / `--warn-on` | `#a5680a` / `#fdf2df` / `#8a5608` |
| Succès | `--ok` / `--ok-bg` / `--ok-on` | `#0f8f6a` / `#e2f6ef` / `#0b7a5a` |
| Info | `--blue` / `--blue-bg` / `--blue-on` | `#1f6fc9` / `#e7f0fc` / `#1a5da8` |
| Or | `--gold` | `#c98a12` |
| Texte sur accent | `--on-accent` | `#ffffff` |

### Thème sombre

| Rôle | Variable | Hex |
|------|----------|-----|
| Fond page | `--bg` | `#100e1a` |
| Surface | `--surface` | `#191426` |
| Surface secondaire | `--surface-2` | `#231d3a` |
| Ligne | `--line` | `#2a2442` |
| Ligne forte | `--line-strong` | `#382f59` |
| Texte | `--text` | `#f3f1fb` |
| Texte discret | `--muted` | `#a29dbf` |
| Indice | `--hint` | `#8b86aa` |
| **Accent** | `--accent` / `--accent-on` | `#8b7bff` |
| Accent fond | `--accent-bg` | `#231d44` |
| Accent clair | `--accent-2` | `#a78bff` |
| Danger | `--danger` / `--danger-bg` | `#ff8189` / `#2a1418` |
| Attention | `--warn` / `--warn-bg` | `#ffc44d` / `#2a2010` |
| Succès | `--ok` / `--ok-bg` | `#3ce0ab` / `#0f2a21` |
| Info | `--blue` / `--blue-bg` | `#5cb0ff` / `#12233a` |
| Or | `--gold` | `#ffc44d` |
| Texte sur accent | `--on-accent` | `#12101c` |

**Sur fond coloré**, utiliser toujours la variante `-on` de la même famille comme couleur de texte (texte `--accent-on` sur fond `--accent-bg`), jamais du noir pur ni la teinte pleine.

### Contraste — le seuil à tenir

Petit corps : **4.5:1** minimum. Grand corps (≥ 18.66 px, ou ≥ 24 px en 400) : 3:1. Les bordures, icônes décoratives et séparateurs relèvent du seuil non textuel de **3:1** — c'est pourquoi `border-color` garde la teinte de marque là où `color` passe en `-on`.

Les 30 paires texte/fond des deux thèmes sont vérifiées. Toute nouvelle paire doit l'être aussi : la mesure, jamais l'œil. Une teinte lisible sur `--surface` peut échouer sur `--surface-2`, qui est plus sombre en clair.

---

## 3. Typographie

- **Police** : `Inter Variable`, avec repli sur la pile système — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Le mobile s'en tient à la pile système.
- **Interlignage corps** : 1.5.
- **Graisses utilisées** : 400 (normal), 600, 700, 800.
- **Casse** : phrase (« sentence case ») partout. Les en-têtes de groupe sont en MAJUSCULES + `letter-spacing: .05em`.

| Usage | Taille / graisse |
|-------|------------------|
| Titre de page | 28 px / 800 |
| Valeur statistique | 26 px / 800 |
| Titre de carte (`.title-lg`) | 17 px / 600 |
| Corps de texte | 16 px / 400 |
| Bouton / libellé de champ | 13.5 px / 700 |
| Sous-texte (`.sub`) | 13 px / 400, couleur `--muted` |
| En-tête de groupe (`.grp-h`) | 12 px / 800, MAJ, `letter-spacing .05em` |
| Drapeau de priorité / badge | 10.5–11 px / 700 |

---

## 4. Espacements, rayons & ombre

| Élément | Valeur |
|---------|--------|
| Rayon cartes & contrôles | `--radius: 14px` |
| Rayon boutons | 12 px (petit : 10 px) |
| Rayon pastilles (pill / chip / avatar) | 99 px |
| Rayon drapeau de priorité | 6 px |
| Padding carte | 16 px |
| Padding contenu (`.wrap`) | 18 px |
| Gouttière de grille | 12 px |
| Ombre (`--shadow`) | `0 1px 3px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.05)` |

Espacements verticaux courants : 6 · 8 · 10 · 12 · 14 · 18 px.

---

## 5. Composants

### Boutons (`.btn`)

| Variante | Classe | Style |
|----------|--------|-------|
| Principal | `.btn.primary` | fond `--accent`, texte `--on-accent` |
| Secondaire | `.btn` | fond `--surface`, bordure `--line-strong` |
| Fantôme | `.btn.ghost` | fond transparent |
| Danger | `.btn.danger` | texte + bordure `--danger` |
| Petit | `.btn.sm` | padding réduit, rayon 10 px |
| Pleine largeur | `.btn.block` | `width:100%` |
| Lien | `.btn-link` | texte accent, sans bordure |

Base : `display:inline-flex; gap:8px; border-radius:12px; font-weight:700; padding:11px 16px`. Désactivé : `opacity:.5`.

### Pastilles de statut (`.pill`)
`--*-bg` en fond, `--*` en texte. Variantes : `.acc` (accent), `.ok`, `.warn`, `.danger`. Rayon 99 px, 11.5 px / 600.

### Chips (rôles & types de tâches) (`.chip`)
Pastille avec bordure fine. Couleurs par catégorie : `.tt-a` accent, `.tt-b` info, `.tt-c` succès, `.tt-d` attention, `.tt-e` danger. Variante suppressible : `.chip-x` (croix). Variante bouton : `.chip.as-btn`.

### Drapeaux de priorité (`.pflag`)
`P1` → `P6`, du plus urgent au plus bas :

| | Couleur |
|-|---------|
| P1 `.pf1` | danger (rouge) |
| P2 `.pf2` | attention (ambre) |
| P3 `.pf3` | accent (violet) |
| P4 `.pf4` | info (bleu) |
| P5 `.pf5` | succès (vert) |
| P6 `.pf6` | discret (gris) |

### Champs (`.field`)
Label 13 px / 600 `--muted` au-dessus. Input : `padding:12px 13px; border:1px solid --line-strong; border-radius:11px; font-size:15px` (16 px sur mobile pour éviter le zoom iOS). Textarea : `min-height:80px`.

### Onglets (`.tabs`)
Groupe segmenté sur fond `--surface-2`, rayon 12 px ; onglet actif `.on` sur `--surface` avec ombre.

### Cartes de statistiques (`.stat-card`)
Grille `repeat(auto-fit, minmax(140px, 1fr))`. Icône 20 px, valeur 26 px / 800, libellé 13 px `--muted`.

### Autres
- **Carte** (`.card`) : surface blanche, bordure `--line`, rayon 14 px, ombre.
- **Bannière** (`.banner`) : fond `--accent-bg`, bordure `--accent`.
- **Avatar** (`.avatar`) : cercle, initiales sur `--accent-bg`.
- **Barre de progression** (`.mini-bar`) : hauteur 6–8 px, remplissage `--accent`.
- **Menu d'actions** (`.mact`) : lignes 15 px, `.danger` en rouge.

---

## 6. Icônes

- **Style** : SVG **outline** (contour), `fill:none; stroke:currentColor`, épaisseur **1.8–2.0**, `stroke-linecap/linejoin: round`. Taille courante 19–24 px.
- Les icônes **héritent** de la couleur du parent (`currentColor`).
- Des **emojis** sont utilisés pour les accents ludiques (priorités, sections admin, actions vocales) — à garder ponctuels.

---

## 7. États d'interaction

| État | Convention |
|------|------------|
| Survol (éléments cliquables) | fond → `var(--surface-2)` |
| Survol (cartes) | bordure → `var(--line-strong)` |
| Survol (carte projet) | légère élévation `translateY(-1px)` + ombre douce |
| Actif / sélectionné | classe `.on` (fond accent pâle + couleur `--accent-on`, ou surface + ombre pour les segments) |
| Désactivé | `opacity: .5` |
| Focus | anneau natif du navigateur (pas de style custom global) — ne jamais poser `outline:none` sans remplacement visible |
| Glisser-déposer | poignée `⠿`, opacité .45 sur l'élément déplacé, zone de dépôt surlignée accent |

---

## 8. Mise en page & points de rupture

- **Mobile (< 900 px)** : barre de navigation en bas (`.bottomnav`) + bouton flottant (`.fab`). Contenu pleine largeur, padding 14–18 px.
- **Desktop (≥ 900 px)** : barre latérale fixe (`.sidebar`, 238 px) + zone principale (`.shell-main`) avec en-tête collant (`.appbar`).
- **Grille projets** : 1 colonne < 700 px, 2 colonnes ≥ 700 px.
- **Largeurs de lecture** : pages de réglages/profil centrées (`max-width` ~600 px) ; contenu général confortable avec padding latéral sur desktop.

Points de rupture : **900 px** (bascule mobile/desktop), **700 px** (grille projets), **640 / 560 px** (ajustements mobiles).

### App native

`planii-mobile` ne reprend pas les points de rupture : il n'y a qu'une largeur, et elle descend à **320 pt**. Tout doit rester lisible là. Deux règles s'y ajoutent :

- **Cible tactile 44 pt minimum**, y compris les croix de suppression et les chevrons de réordonnancement.
- **`auto` suit le réglage système** de l'appareil, là où le web bascule sur l'heure (19 h → 7 h). C'est la convention native : l'utilisateur s'attend à retrouver son choix iOS/Android.

---

## 9. Règles d'usage

1. **Toujours** utiliser les variables CSS — jamais de hex en dur. Seule exception : les couleurs choisies par l'utilisateur (libellés de projet, statuts de tâche), qui sont de la donnée. Ne jamais les poser derrière du texte : pastille ou bordure uniquement.
2. Vérifier chaque écran en **clair ET sombre**, et **mesurer** le contraste plutôt que l'estimer. Sur fond pâle, le texte prend la variante `-on`.
3. Couleur = sens : accent pour l'action principale, danger/warn/ok pour les états. Un seul bouton `primary` par vue.
4. **La couleur ne porte jamais seule l'information** : un drapeau de priorité écrit « P1 », un badge de notification écrit son compte.
5. Casse en phrase, pas de Title Case ni de ALL CAPS (sauf en-têtes de groupe).
6. Formes : rayon 14 px cartes, 12 px contrôles, 99 px pastilles ; bordures fines `--line`.
7. Densité mesurée : listes en lignes bordées plutôt qu'en cartes empilées ; pas de sur-padding.
8. **Chargement = squelette** au gabarit du contenu final, pas un rond qui tourne. Les états vide et erreur se conçoivent en même temps que l'état plein.

---

*Généré depuis le code source de Planii (`planii-vite/src/index.css`, `planii-mobile/src/theme/tokens.ts`). Voir aussi `planii-design-system.html` pour l'aperçu visuel interactif clair/sombre.*
