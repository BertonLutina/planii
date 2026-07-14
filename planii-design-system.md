# Planii — Design System

Référence du système de design de Planii : couleurs, typographie, espacements, composants, icônes, états d'interaction et mise en page. Tout est piloté par des **variables CSS** (`planii-vite/src/index.css`) et s'adapte automatiquement aux thèmes **clair / sombre / auto**.

> Règle d'or : ne jamais coder une couleur en dur. Toujours passer par une variable (`var(--accent)`), sinon le mode sombre casse.

---

## 1. Marque

- **Logo** : deux points blancs (une tâche cochée) sur un carré violet accent, rayon 25–30 %.
- **Nom** : « Planii », graisse 600.
- **Couleur principale** : violet accent `#534AB7`.

---

## 2. Couleurs

Chaque couleur d'état possède une variante `-bg` (fond pâle) utilisée pour les pastilles, bannières et surfaces d'accent.

### Thème clair

| Rôle | Variable | Hex |
|------|----------|-----|
| Fond page | `--bg` | `#faf9f5` |
| Surface (carte) | `--surface` | `#ffffff` |
| Surface secondaire | `--surface-2` | `#f1efe8` |
| Ligne (hairline) | `--line` | `#e6e3da` |
| Ligne forte | `--line-strong` | `#d3d1c7` |
| Texte | `--text` | `#26251f` |
| Texte discret | `--muted` | `#6b6a63` |
| Indice | `--hint` | `#93918a` |
| **Accent** | `--accent` | `#534AB7` |
| Accent fond | `--accent-bg` | `#eeedfe` |
| Accent clair | `--accent-2` | `#7f77dd` |
| Danger | `--danger` / `--danger-bg` | `#a32d2d` / `#fcebeb` |
| Attention | `--warn` / `--warn-bg` | `#854f0b` / `#faeeda` |
| Succès | `--ok` / `--ok-bg` | `#0f6e56` / `#e1f5ee` |
| Info | `--blue` / `--blue-bg` | `#185fa5` / `#eaf2fb` |
| Or | `--gold` | `#ba7517` |
| Texte sur accent | `--on-accent` | `#ffffff` |

### Thème sombre

| Rôle | Variable | Hex |
|------|----------|-----|
| Fond page | `--bg` | `#1b1a17` |
| Surface | `--surface` | `#26251f` |
| Surface secondaire | `--surface-2` | `#302e27` |
| Ligne | `--line` | `#3a382f` |
| Ligne forte | `--line-strong` | `#4a473c` |
| Texte | `--text` | `#f1efe8` |
| Texte discret | `--muted` | `#b4b2a9` |
| Indice | `--hint` | `#9a988f` |
| **Accent** | `--accent` | `#afa9ec` |
| Accent fond | `--accent-bg` | `#2b2758` |
| Danger | `--danger` / `--danger-bg` | `#f09595` / `#3a1a1a` |
| Attention | `--warn` / `--warn-bg` | `#efa927` / `#3a2a10` |
| Succès | `--ok` / `--ok-bg` | `#5dcaa5` / `#123027` |
| Info | `--blue` / `--blue-bg` | `#85b7eb` / `#12233a` |
| Or | `--gold` | `#ef9f27` |
| Texte sur accent | `--on-accent` | `#1b1a17` |

**Sur fond coloré**, utiliser toujours la teinte foncée de la même famille comme couleur de texte (ex. texte `--accent` sur fond `--accent-bg`), jamais du noir pur.

---

## 3. Typographie

- **Police** : pile système — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
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
| Ombre (`--shadow`) | `0 1px 3px rgba(0,0,0,.06), 0 6px 20px rgba(0,0,0,.05)` |

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
| Actif / sélectionné | classe `.on` (fond accent pâle + couleur accent, ou surface + ombre pour les segments) |
| Désactivé | `opacity: .5` |
| Focus | anneau natif du navigateur (pas de style custom global) |
| Glisser-déposer | poignée `⠿`, opacité .45 sur l'élément déplacé, zone de dépôt surlignée accent |

---

## 8. Mise en page & points de rupture

- **Mobile (< 900 px)** : barre de navigation en bas (`.bottomnav`) + bouton flottant (`.fab`). Contenu pleine largeur, padding 14–18 px.
- **Desktop (≥ 900 px)** : barre latérale fixe (`.sidebar`, 238 px) + zone principale (`.shell-main`) avec en-tête collant (`.appbar`).
- **Grille projets** : 1 colonne < 700 px, 2 colonnes ≥ 700 px.
- **Largeurs de lecture** : pages de réglages/profil centrées (`max-width` ~600 px) ; contenu général confortable avec padding latéral sur desktop.

Points de rupture : **900 px** (bascule mobile/desktop), **700 px** (grille projets), **640 / 560 px** (ajustements mobiles).

---

## 9. Règles d'usage

1. **Toujours** utiliser les variables CSS — jamais de hex en dur.
2. Vérifier chaque écran en **clair ET sombre** (test mental : sur fond quasi noir, tout le texte reste-t-il lisible ?).
3. Couleur = sens : accent pour l'action principale, danger/warn/ok pour les états. Un seul bouton `primary` par vue.
4. Casse en phrase, pas de Title Case ni de ALL CAPS (sauf en-têtes de groupe).
5. Formes : rayon 14 px cartes, 12 px contrôles, 99 px pastilles ; bordures fines `--line`.
6. Densité mesurée : listes en lignes bordées plutôt qu'en cartes empilées ; pas de sur-padding.

---

*Généré depuis le code source de Planii (`planii-vite/src/index.css`). Voir aussi `planii-design-system.html` pour l'aperçu visuel interactif clair/sombre.*
