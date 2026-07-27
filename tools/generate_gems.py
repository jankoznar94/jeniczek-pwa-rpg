#!/usr/bin/env python3
"""Generate gem images with distinct shapes per quality level (D2 style)."""

from PIL import Image, ImageDraw
import math, os

GEMS = {
    'ruby':     (200, 30, 40),
    'sapphire': (40, 80, 200),
    'emerald':  (30, 160, 70),
    'topaz':    (200, 160, 20),
}

QUALITIES = ['chipped', 'flawed', 'normal', 'flawless', 'perfect']

def polygon(cx, cy, points, draw, fill, outline=(255,255,255,80)):
    pts = [(cx + p[0], cy + p[1]) for p in points]
    draw.polygon(pts, fill=fill, outline=outline)

def draw_gem(draw, cx, cy, size, color, quality):
    r = size / 2
    c = tuple(color) + (255,)
    bright = tuple(min(255, x + 60) for x in color) + (255,)
    dark = tuple(max(0, x - 40) for x in color) + (255,)

    if quality == 'chipped':
        # Small rough triangle
        pts = [(0, -r*0.7), (-r*0.6, r*0.5), (r*0.5, r*0.6)]
        polygon(cx, cy, pts, draw, c, bright)
        # inner chip
        pts2 = [(0, -r*0.3), (-r*0.25, r*0.2), (r*0.2, r*0.25)]
        polygon(cx, cy, pts2, draw, bright)

    elif quality == 'flawed':
        # Pentagon
        pts = []
        for i in range(5):
            a = math.radians(-90 + i * 72)
            pts.append((math.cos(a) * r * 0.8, math.sin(a) * r * 0.8))
        polygon(cx, cy, pts, draw, c, bright)
        # inner
        pts2 = []
        for i in range(5):
            a = math.radians(-90 + i * 72)
            pts2.append((math.cos(a) * r * 0.35, math.sin(a) * r * 0.35))
        polygon(cx, cy, pts2, draw, bright)

    elif quality == 'normal':
        # Emerald cut (octagon)
        pts = [(0, -r*0.85), (r*0.4, -r*0.6), (r*0.4, r*0.6), (0, r*0.85),
               (-r*0.4, r*0.6), (-r*0.4, -r*0.6)]
        polygon(cx, cy, pts, draw, c, bright)
        # facets
        pts2 = [(0, -r*0.4), (r*0.2, -r*0.25), (r*0.2, r*0.25), (0, r*0.4),
                (-r*0.2, r*0.25), (-r*0.2, -r*0.25)]
        polygon(cx, cy, pts2, draw, bright)

    elif quality == 'flawless':
        # Octagon with more facets
        pts = []
        for i in range(8):
            a = math.radians(-90 + i * 45)
            pts.append((math.cos(a) * r * 0.9, math.sin(a) * r * 0.9))
        polygon(cx, cy, pts, draw, c, bright)
        # star facet
        pts2 = []
        for i in range(8):
            a = math.radians(-90 + i * 45)
            rr = r * 0.3 if i % 2 == 0 else r * 0.5
            pts2.append((math.cos(a) * rr, math.sin(a) * rr))
        polygon(cx, cy, pts2, draw, bright)
        # center
        pts3 = []
        for i in range(4):
            a = math.radians(-90 + i * 90)
            pts3.append((math.cos(a) * r * 0.15, math.sin(a) * r * 0.15))
        polygon(cx, cy, pts3, draw, (255,255,255,200))

    elif quality == 'perfect':
        # Brilliant cut (round with many facets)
        # Outer circle
        for i in range(12):
            a1 = math.radians(-90 + i * 30)
            a2 = math.radians(-90 + (i+1) * 30)
            pts = [(0, 0),
                   (math.cos(a1) * r * 0.95, math.sin(a1) * r * 0.95),
                   (math.cos(a2) * r * 0.95, math.sin(a2) * r * 0.95)]
            polygon(cx, cy, pts, draw, c if i % 2 == 0 else dark)
        # Inner star
        pts = []
        for i in range(8):
            a = math.radians(-90 + i * 45)
            rr = r * 0.4 if i % 2 == 0 else r * 0.2
            pts.append((math.cos(a) * rr, math.sin(a) * rr))
        polygon(cx, cy, pts, draw, bright)
        # Center sparkle
        draw.ellipse([cx-3, cy-3, cx+3, cy+3], fill=(255,255,255,220))

def generate():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets', 'gems')
    os.makedirs(out_dir, exist_ok=True)

    for gem_name, color in GEMS.items():
        for q in QUALITIES:
            size = 64
            img = Image.new('RGBA', (size, size), (0,0,0,0))
            draw = ImageDraw.Draw(img)
            draw_gem(draw, size//2, size//2, size-4, color, q)

            filename = gem_name + ('' if q == 'normal' else '_' + q) + '.png'
            path = os.path.join(out_dir, filename)
            img.save(path, 'PNG')
            print(f'  {filename}')

if __name__ == '__main__':
    generate()
    print('Done!')
