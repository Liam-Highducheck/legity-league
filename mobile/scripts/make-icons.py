#!/usr/bin/env python3
"""Generates every app icon/splash image from the moon mark (same artwork as web/public/icon.svg).

    python3 scripts/make-icons.py          (needs rsvg-convert: brew install librsvg, and Pillow)

Outputs into assets/. iOS icons must be opaque squares (the system rounds the corners); Android adaptive icons are three layers.
"""
import os, subprocess, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')

NAVY_A, NAVY_B = '#1b1f4a', '#0b0d1a'        # release background (matches the web icon)
DEV_A, DEV_B = '#5b4bd6', '#241a73'          # dev background: the app's purple, so the two are easy to tell apart
GOLD = '#ffd166'

_CENTRE = None

def moon(fill, tx=0, ty=0, scale=1.0, centred=True):
    # the web icon's artwork on a 512 grid, scaled about its own visual centre and placed at the canvas centre (+ tx, ty)
    global _CENTRE
    if centred and _CENTRE is None:
        _CENTRE = (256, 256)  # placeholder while measuring
        _CENTRE = _bbox_centre()
    cx, cy = _CENTRE if centred else (256, 256)
    t = f'translate({256 + tx} {256 + ty}) scale({scale}) translate({-cx} {-cy})'
    return f'''<g transform="{t}">
<path d="M318 112a152 152 0 1 0 82 280 128 128 0 0 1-82-280z" fill="{fill}"/>
<circle cx="372" cy="150" r="9" fill="#8b7cff"/><circle cx="414" cy="212" r="6" fill="#5eead4"/><circle cx="340" cy="92" r="5" fill="#ffffff"/>
</g>'''

def _bbox_centre():
    """Centre of the moon + stars artwork on the 512 grid, measured from a render, so the mark can be centred exactly."""
    with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w') as f:
        f.write(svg(moon(GOLD)))
    out = f.name.replace('.svg', '.png')
    subprocess.run(['rsvg-convert', '-w', '512', '-h', '512', f.name, '-o', out], check=True)
    x0, y0, x1, y1 = Image.open(out).getchannel('A').getbbox()
    os.unlink(f.name); os.unlink(out)
    return (x0 + x1) / 2, (y0 + y1) / 2

def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{body}</svg>'

def gradient(a, b):
    return f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/>'

def render(body, name, size, opaque=False):
    with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w') as f:
        f.write(svg(body))
    out = os.path.join(ASSETS, name)
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), f.name, '-o', out], check=True)
    os.unlink(f.name)
    if opaque:  # App Store icons must have no alpha channel
        Image.open(out).convert('RGB').save(out)
    print('wrote', name)

DEV_BAND = '''<g><rect x="0" y="388" width="512" height="124" fill="#0b0d1a" opacity="0.92"/>
<text x="256" y="469" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="76" letter-spacing="14" fill="#ffffff" text-anchor="middle">DEV</text></g>'''

# --- release ---
render(gradient(NAVY_A, NAVY_B) + moon(GOLD, scale=1.2), 'icon.png', 1024, opaque=True)
# --- dev ---
render(gradient(DEV_A, DEV_B) + moon(GOLD, ty=-30, scale=0.95) + DEV_BAND, 'icon-dev.png', 1024, opaque=True)

# --- Android adaptive layers (the launcher masks to a circle/squircle; keep art inside the centre 66%) ---
render(moon(GOLD, scale=0.8), 'android-icon-foreground.png', 1024)
render(gradient(NAVY_A, NAVY_B), 'android-icon-background.png', 1024, opaque=True)
render(gradient(DEV_A, DEV_B), 'android-icon-background-dev.png', 1024, opaque=True)
# themed (monochrome) icon: a single-colour silhouette
render(moon('#ffffff', scale=0.8).replace('#8b7cff', '#ffffff').replace('#5eead4', '#ffffff'), 'android-icon-monochrome.png', 1024)

# --- splash: the moon on a transparent canvas (the background colour comes from the splash config) ---
render(moon(GOLD, scale=1.0), 'splash-icon.png', 1024)

# --- web favicon used by Expo web ---
Image.open(os.path.join(ASSETS, 'icon.png')).resize((48, 48), Image.LANCZOS).save(os.path.join(ASSETS, 'favicon.png'))
print('wrote favicon.png')
