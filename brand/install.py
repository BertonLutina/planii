"""Installe la marque Planii dans les deux applications.

`generate.py` produit les masters dans `brand/png/`. Ce script les pose là où
les plateformes les attendent — il ne redessine rien, il dérive.

    python3 brand/generate.py && python3 brand/install.py

Trois règles gouvernent les dérivations :

1. **iOS veut un carré plein.** `icon.png` est opaque, sans coins arrondis :
   le système applique son propre masque. L'arrondir ici le doublerait.
   La même image sert l'iPhone et l'iPad — Expo décline les tailles.
2. **En dessous de ~48 px, le trou de la barre évidée se referme.** Le favicon
   32 px dérive donc de `favicon.png`, rendu en variante simplifiée (aplat à
   55 % au lieu de l'évidement), pas de `icon.png`.
3. **Une icône « maskable » peut être rognée d'un tiers.** Elle est composée du
   fond dégradé et de la marque à 52 % — les mêmes couches que l'icône
   adaptative Android, dont c'est exactement le contrat.
"""
from PIL import Image
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, 'brand', 'png')
MOBILE = os.path.join(ROOT, 'planii-mobile', 'assets')
WEB = os.path.join(ROOT, 'planii-vite', 'public')
WEB_ICONS = os.path.join(WEB, 'icons')

log = []


def src(name):
    return Image.open(os.path.join(PNG, name))


def out(img, path, size=None):
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    rel = os.path.relpath(path, ROOT)
    log.append(f'{rel:52} {img.size[0]}x{img.size[1]}')


# ── 1. Application mobile (Expo) ─────────────────────────────────────────────
# Copie à l'identique : app.json pointe déjà sur ces noms de fichiers.
# `icon.png` couvre iPhone ET iPad — `ios.supportsTablet` est déjà à true et
# Expo décline toutes les tailles à partir du master 1024.
for name in ('icon.png', 'splash-icon.png', 'favicon.png',
             'android-icon-background.png', 'android-icon-foreground.png',
             'android-icon-monochrome.png'):
    dst = os.path.join(MOBILE, name)
    shutil.copy2(os.path.join(PNG, name), dst)
    with Image.open(dst) as im:
        log.append(f'{os.path.relpath(dst, ROOT):52} {im.size[0]}x{im.size[1]}  (copie)')

# ── 2. Web — favicon et icônes PWA ───────────────────────────────────────────
icon = src('icon.png').convert('RGBA')

# 32 px : variante simplifiée, déjà arrondie en squircle par generate.py
out(src('favicon.png'), os.path.join(WEB_ICONS, 'favicon-32.png'), 32)

# 180 px : iOS/iPadOS applique son masque, on livre le carré plein
out(icon, os.path.join(WEB_ICONS, 'apple-touch-180.png'), 180)

# PWA « any » : carré plein, le système ou le navigateur décide de l'arrondi
out(icon, os.path.join(WEB_ICONS, 'icon-192.png'), 192)
out(icon, os.path.join(WEB_ICONS, 'icon-512.png'), 512)

# PWA « maskable » : zone de sécurité — marque à 52 % sur le fond dégradé
maskable = src('android-icon-background.png').convert('RGBA')
maskable.alpha_composite(src('android-icon-foreground.png').convert('RGBA'))
out(maskable, os.path.join(WEB_ICONS, 'maskable-512.png'), 512)

# Logo carré servi aux fournisseurs OAuth (écran de consentement Google, etc.)
out(icon, os.path.join(WEB, 'planii-oauth-logo.png'), 256)

print('\n'.join(log))
print(f'\n{len(log)} fichiers installés.')
