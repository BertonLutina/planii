"""Génère l'identité Planii — variante 1 : trois barres alignées, la 2e évidée.

Toute la géométrie vit sur une grille de 100 unités, ce qui permet de sortir
n'importe quelle taille sans redécider quoi que ce soit. Le PNG est rendu en
suréchantillonnage x4 puis réduit : Pillow ne lisse pas les bords, la
réduction s'en charge.
"""
from PIL import Image, ImageDraw
import os

OUT_SVG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'svg')
OUT_PNG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'png')

ACCENT   = (109, 92, 255)
ACCENT_2 = (139, 123, 255)
WHITE    = (255, 255, 255)

# [x, y, largeur, hauteur, évidée]  — grille 100
# Proportions revues après la planche de contrôle. Trois défauts corrigés :
#
#  1. Le trou de la barre évidée valait 3 unités sur 17 : à 60 px il faisait
#     moins de 2 px et se refermait. Barres épaissies à 21, trou porté à 7.
#  2. Trois barres alignées de largeurs décroissantes, c'est l'icône
#     « aligner à gauche ». Le bord droit devient irrégulier — 58 / 76 / 40 —
#     et ne décrit plus un paragraphe.
#  3. La barre évidée est désormais la plus longue : l'élément qui porte le
#     sens est aussi celui que l'œil rencontre en premier.
BARS = [
    (12, 10.0, 58, 21, False),
    (12, 39.5, 76, 21, True),
    (12, 69.0, 40, 21, False),
]
STROKE = 7.0          # épaisseur du contour — laisse 7 unités de trou

SS = 4                # facteur de suréchantillonnage


def capsule(draw, x, y, w, h, fill):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=h / 2, fill=fill)


def draw_mark(draw, S, colour, ox=0.0, oy=0.0, scale=1.0, simplified=False):
    """Dessine les trois barres dans un carré de S px.

    `simplified` : variante petite taille. En dessous d'environ 48 px, le trou
    de la barre évidée mesure moins d'un pixel et se referme — le signe perd
    justement ce qui le distingue. On remplace alors l'évidement par un aplat
    à 55 % : la hiérarchie à trois niveaux survit, sans dépendre d'un détail
    que le rendu ne peut plus tenir.
    """
    u = (S / 100.0) * scale
    for bx, by, bw, bh, hollow in BARS:
        x, y, w, h = ox + bx * u, oy + by * u, bw * u, bh * u
        if hollow and simplified:
            faded = colour[:3] + (int(colour[3] * 0.55),)
            capsule(draw, x, y, w, h, faded)
        elif hollow:
            capsule(draw, x, y, w, h, colour)
            st = STROKE * u
            capsule(draw, x + st, y + st, w - 2 * st, h - 2 * st, (0, 0, 0, 0))
        else:
            capsule(draw, x, y, w, h, colour)


def gradient(S, a=ACCENT_2, b=ACCENT):
    """Dégradé linéaire 135° — identique à --grad-accent."""
    img = Image.new('RGB', (S, S))
    px = img.load()
    for j in range(S):
        for i in range(S):
            t = (i + j) / (2.0 * (S - 1))
            px[i, j] = tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3))
    return img


def squircle_mask(S, n=5.0):
    """Superellipse : la courbure continue de l'icône iOS, pas un rayon."""
    m = Image.new('L', (S * SS, S * SS), 0)
    d = ImageDraw.Draw(m)
    R = S * SS / 2.0
    for j in range(S * SS):
        dy = abs((j + 0.5 - R) / R)
        if dy >= 1:
            continue
        # |dx|^n + |dy|^n = 1  ->  dx = (1 - dy^n)^(1/n)
        dx = (1 - dy ** n) ** (1 / n)
        d.line([(R - dx * R, j), (R + dx * R, j)], fill=255)
    return m.resize((S, S), Image.LANCZOS)


def mark_layer(S, colour, scale=1.0, simplified=False):
    """Les barres seules, sur fond transparent, centrées."""
    big = Image.new('RGBA', (S * SS, S * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    span = S * SS * scale
    off = (S * SS - span) / 2.0
    draw_mark(d, S * SS, colour + (255,), ox=off, oy=off, scale=scale,
              simplified=simplified)
    return big.resize((S, S), Image.LANCZOS)


def save(img, name):
    p = os.path.join(OUT_PNG, name)
    img.save(p)
    return f'{name}  {img.size[0]}x{img.size[1]}'


log = []

# ── icon.png — iOS exige un carré plein, opaque, sans coins arrondis :
#    le système applique son propre masque. Arrondir ici double l'arrondi.
S = 1024
icon = gradient(S).convert('RGBA')
icon.alpha_composite(mark_layer(S, WHITE, scale=0.66))
log.append(save(icon.convert('RGB'), 'icon.png'))

# ── favicon — arrondi, lui, car aucun masque système ne s'applique.
fav = gradient(256).convert('RGBA')
fav.alpha_composite(mark_layer(256, WHITE, scale=0.66, simplified=True))
fav.putalpha(squircle_mask(256))
log.append(save(fav.resize((64, 64), Image.LANCZOS), 'favicon.png'))

# ── splash — marque blanche sur fond transparent ; app.json pose déjà
#    #6d5cff en backgroundColor. La marque n'occupe que 40 % pour ne pas
#    remplir l'écran une fois mise à l'échelle par resizeMode "contain".
log.append(save(mark_layer(1024, WHITE, scale=0.40), 'splash-icon.png'))

# ── Android adaptatif : le masque du constructeur peut rogner jusqu'à 33 %.
#    Le contenu reste donc dans les 66 % centraux — ici 52 % par sécurité.
bg = gradient(1024)
log.append(save(bg, 'android-icon-background.png'))
log.append(save(mark_layer(1024, WHITE, scale=0.52), 'android-icon-foreground.png'))
# Couche monochrome : Android la teinte lui-même, la couleur n'a pas d'importance,
# seule la silhouette compte.
log.append(save(mark_layer(1024, (0, 0, 0), scale=0.52), 'android-icon-monochrome.png'))

print('\n'.join(log))


# ── Marques exportées seules, pour le web et l'app
log.append(save(mark_layer(512, ACCENT, scale=0.90), 'mark-accent.png'))
log.append(save(mark_layer(512, WHITE, scale=0.90), 'mark-white.png'))
log.append(save(mark_layer(512, ACCENT, scale=0.90, simplified=True), 'mark-accent-small.png'))
log.append(save(mark_layer(512, WHITE, scale=0.90, simplified=True), 'mark-white-small.png'))
print('\n'.join(log[-4:]))
