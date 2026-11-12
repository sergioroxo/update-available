#!/usr/bin/env python3
"""
S375 (UiB job 19 Part A) — THE TEN MOCKS, drawn.

    python3 tools/s375-mocks.py --photos /abs/path/out/s375 [--only m01,m04]

Each mock is a drawn PNG (PIL), never a change to the build: the redraw a builder in Part B (screens) or Part C (room)
is asked to make, shown in the piece's own palette and fonts, beside the photograph it answers. Output goes to
<photos>/mocks/ (untracked, like every photograph).

Colour law (CLAUDE.md): every colour below is READ from src/desktop/theme/*.ts at run time by `pal()` (an export const
block's `key: '#hex'` pairs), or sampled from the photograph being answered. No hex is typed into this file except the
room's own data hexes (data/room/era1.json), which `room_hex()` reads the same way.

Fonts: the piece's vendored faces from public/assets/fonts/ (job 18): Fixedsys Excelsior (1997, 2003, the Close),
Roboto (2016), Inter (2026).
"""
import argparse
import json
import math
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(ROOT, 'src', 'desktop', 'theme')
FONTS = os.path.join(ROOT, 'public', 'assets', 'fonts')


# ── palette and fonts, read from the repo ────────────────────────────────────────────────────────────────────────────
def pal(file, name):
    """an `export const NAME = { key: '#hex', … }` block from a theme file, as {key: (r, g, b)}"""
    src = open(os.path.join(THEME, file), encoding='utf8').read()
    m = re.search(r'export const ' + re.escape(name) + r'\s*=\s*\{(.*?)\}\s*as const', src, re.S)
    if not m:
        raise SystemExit(f'no palette {name} in {file}')
    out = {}
    for k, v in re.findall(r"([A-Za-z0-9_]+)\s*:\s*'(#[0-9a-fA-F]{6})'", m.group(1)):
        out[k] = hexrgb(v)
    return out


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def room_hex(file, prop_id):
    """a prop's colour from a room data file (data/room/*.json), by id"""
    src = open(os.path.join(ROOT, 'data', 'room', file), encoding='utf8').read()
    m = re.search(r'"id":\s*"' + re.escape(prop_id) + r'"[^}]*?"color":\s*"(#[0-9A-Fa-f]{6})"', src, re.S)
    return hexrgb(m.group(1))


def font(face, px):
    files = {
        'fixedsys': 'fixedsys-excelsior-3.022-latin.woff2',
        'roboto': 'roboto-5.3.0-latin-400.woff2',
        'roboto-bold': 'roboto-5.3.0-latin-700.woff2',
        'inter': 'inter-5.3.0-latin-400.woff2',
        'inter-semi': 'inter-5.3.0-latin-600.woff2',
    }
    return ImageFont.truetype(os.path.join(FONTS, files[face]), px)


ERA1 = pal('era1.ts', 'ERA1')
ERA3 = pal('era3.ts', 'ERA3')
PHONE = pal('phone.ts', 'PHONE')
PRINT = pal('calendar.ts', 'PRINT')
CAL97 = pal('calendar.ts', 'CAL_1997')
CAL03 = pal('calendar.ts', 'CAL_2003')
CAL16 = pal('calendar.ts', 'CAL_2016')
CAL26 = pal('calendar.ts', 'CAL_2026')
FOOT = pal('calendar.ts', 'FOOTAGE')
CLEAR = pal('calendar.ts', 'CLEAR')
HANDHELD = pal('calendar.ts', 'HANDHELD')


# ── small drawing kit (logical pixels, scaled up NEAREST like the piece's canvases) ───────────────────────────────────
class Px:
    def __init__(self, w, h, bg=(0, 0, 0)):
        self.im = Image.new('RGB', (w, h), bg)
        self.d = ImageDraw.Draw(self.im)
        self.w, self.h = w, h

    def r(self, x, y, w, h, c):
        if w <= 0 or h <= 0:
            return
        self.d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), c)

    def disc(self, cx, cy, rad, c):
        for y in range(-rad, rad + 1):
            for x in range(-rad, rad + 1):
                if x * x + y * y <= rad * rad + rad * 0.6:
                    self.p(cx + x, cy + y, c)

    def checker(self, x, y, w, h, c, phase=0):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if (xx + yy + phase) % 2 == 0:
                    self.p(xx, yy, c)

    def line(self, x0, y0, x1, y1, c):
        self.d.line([x0, y0, x1, y1], fill=c, width=1)

    def up(self, k):
        return self.im.resize((self.w * k, self.h * k), Image.NEAREST)


def text(im, xy, s, face, px, fill, anchor='la', shadow=None):
    d = ImageDraw.Draw(im)
    f = font(face, px)
    if shadow:
        d.text((xy[0] + shadow[0], xy[1] + shadow[1]), s, font=f, fill=shadow[2], anchor=anchor)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def label(im, s, sub=None):
    """a caption strip above a picture (the mocks' own frame: plain, like a contact sheet)"""
    pad = 56 if sub else 40
    out = Image.new('RGB', (im.width, im.height + pad), (20, 20, 24))
    out.paste(im, (0, pad))
    d = ImageDraw.Draw(out)
    d.text((12, 8), s, font=font('inter-semi', 20), fill=(235, 235, 235))
    if sub:
        d.text((12, 32), sub, font=font('inter', 15), fill=(170, 170, 178))
    return out


def side(a, b, la='BEFORE', lb='MOCK', h=None):
    if h:
        a = a.resize((int(a.width * h / a.height), h), Image.LANCZOS)
        b = b.resize((int(b.width * h / b.height), h), Image.LANCZOS)
    a, b = label(a, la), label(b, lb)
    out = Image.new('RGB', (a.width + b.width + 12, max(a.height, b.height)), (10, 10, 12))
    out.paste(a, (0, 0))
    out.paste(b, (a.width + 12, 0))
    return out


def stack(ims, gap=12):
    w = max(i.width for i in ims)
    out = Image.new('RGB', (w, sum(i.height for i in ims) + gap * (len(ims) - 1)), (10, 10, 12))
    y = 0
    for i in ims:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def replace_colours(photo, layer, colours, tol=6, box=None):
    """paste `layer` (same size as photo) wherever the photo shows one of `colours` (an emissive plate's exact hue)"""
    ph = photo.copy()
    src = ph.load()
    lay = layer.load()
    x0, y0, x1, y1 = box or (0, 0, ph.width, ph.height)
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = src[x, y]
            for c in colours:
                if abs(r - c[0]) <= tol and abs(g - c[1]) <= tol and abs(b - c[2]) <= tol:
                    src[x, y] = lay[x, y]
                    break
    return ph


def bbox_of(photo, colour, tol=6, box=None):
    px = photo.load()
    x0, y0, x1, y1 = box or (0, 0, photo.width, photo.height)
    xs, ys = [], []
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            r, g, b = px[x, y]
            if abs(r - colour[0]) <= tol and abs(g - colour[1]) <= tol and abs(b - colour[2]) <= tol:
                xs.append(x)
                ys.append(y)
    return (min(xs), min(ys), max(xs) + 2, max(ys) + 2)


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M01 · ROOM · the 1997 window: a pixel-art night with the moon in it (printArt.ts `night1997`), in place of a flat
#        #2C3A5C slab and a 12 cm white square
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def night1997(W=72, H=82):
    c = Px(W, H, PRINT['rallyNight'])
    # the sky in flat bands, darkest at the top (the prints' dithered gradient, read as a grid behind glass)
    bands = [(PRINT['rallyNight'], 0.34), (CAL26['night'], 0.18), (CAL26['evening'], 0.16), (CAL26['warm'], 0.12)]
    y = 0
    for col, f in bands:
        h = round(H * f)
        c.r(0, y, W, h, col)
        y += h
    c.r(0, y, W, H - y, CAL26['warm'])
    # band seams dithered one row each way (the 1997 way of hiding a step)
    yy = 0
    for i, (col, f) in enumerate(bands[:-1]):
        yy += round(H * f)
        nxt = bands[i + 1][0]
        c.checker(0, yy - 1, W, 1, nxt)
        c.checker(0, yy, W, 1, col, 1)
    # stars: a few single pixels, two of them a plus
    for (sx, sy) in [(6, 5), (31, 3), (44, 11), (59, 6), (66, 19), (38, 22), (12, 27), (53, 28)]:
        c.p(sx, sy, CAL97['spark'])
    for (sx, sy) in [(48, 4), (8, 16)]:
        c.p(sx, sy, CAL97['spark'])
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            c.p(sx + dx, sy + dy, FOOT['cool'])
    # the moon: a full disc with a dithered halo and three craters — the room's cold light, now drawn
    mx, my = 22, 17
    for rad in (12, 11):
        for a in range(0, 360, 3):
            x = mx + round(rad * math.cos(math.radians(a)))
            y = my + round(rad * math.sin(math.radians(a)))
            if (x + y) % 2 == 0:
                c.p(x, y, CAL26['warm'] if rad == 12 else FOOT['cool'])
    c.disc(mx, my, 8, PRINT['rallyCross'])
    for (cx, cy, cr) in [(19, 14, 2), (25, 20, 1), (24, 13, 1)]:
        c.disc(cx, cy, cr, CAL97['rule'])
    c.p(27, 15, CAL97['rule'])
    # the street across: three gabled roofs in silhouette, a tree, a pole and its wire
    base = 62
    houses = [(-3, 20, 6), (19, 22, 7), (43, 18, 5), (60, 16, 6)]   # x, width, roof height (a low gable on a box)
    for (x0, w, peak) in houses:
        c.r(x0, base, w, H - base, PRINT['filmMan'])                  # the house
        for i in range(w + 2):                                        # its roof, one pixel of eave each side
            hgt = peak - abs(i - (w + 2) // 2) * peak // max(1, (w + 2) // 2)
            c.r(x0 - 1 + i, base - hgt, 1, hgt, PRINT['filmMan'])
        c.r(x0 + w // 2 + 3, base - peak - 1, 2, 3, PRINT['filmMan'])  # a chimney
    # the tree in the near garden: a dark crown, ragged
    for (tx, ty, tr) in [(64, 47, 7), (69, 42, 6), (60, 41, 5), (67, 36, 4)]:
        c.disc(tx, ty, tr, PRINT['rallyHill'])
    c.r(65, 50, 2, H - 50, PRINT['rallyHill'])
    # a telephone pole and its wire, sagging across the moonlit sky (a suburb in 1997)
    c.r(49, 30, 1, H - 30, PRINT['filmMan'])
    c.r(46, 32, 7, 1, PRINT['filmMan'])
    for x in range(0, 49):
        sag = round(3 * math.sin(math.pi * x / 49))
        c.p(x, 34 + sag, PRINT['filmMan'])
    for x in range(50, W):
        sag = round(2 * math.sin(math.pi * (x - 50) / (W - 50)))
        c.p(x, 33 + sag, PRINT['filmMan'])
    # one window still lit across the street (someone else awake), and a streetlamp's pool
    c.r(25, 66, 3, 3, PRINT['filmRoadLit'])
    c.r(46, 67, 2, 3, PRINT['rallyGlow'])
    c.r(14, 58, 1, H - 58, PRINT['filmMan'])                          # the streetlamp …
    c.r(13, 57, 4, 1, PRINT['rallyGlow'])                             # … its lamp
    c.checker(11, 76, 9, 2, PRINT['filmRoadLit'])                     # … and its pool on the pavement
    # the pavement line
    c.r(0, H - 6, W, 1, CAL26['night'])
    return c


def m01(photos, out):
    pane = room_hex('era1.json', 'windowPane')
    moon = room_hex('era1.json', 'moon')
    view = night1997()
    view.up(8).save(os.path.join(out, 'm01-night1997-print-x8.png'))
    pairs = []
    for rel, note in [('xr/sweep/e1-room-front.png', 'from the seat, emulated headset'),
                      ('browser/stills/e1-00-entrance.png', 'the 1997 still (the room as it is first shown)')]:
        ph = Image.open(os.path.join(photos, rel)).convert('RGB')
        bb = bbox_of(ph, pane)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        layer = Image.new('RGB', ph.size)
        layer.paste(view.im.resize((w, h), Image.NEAREST), (bb[0], bb[1]))
        after = replace_colours(ph, layer, [pane, moon], tol=4, box=bb)
        pairs.append(side(ph, after, f'BEFORE · {rel}', f'MOCK · night1997 on the pane ({note})', h=720))
    stack(pairs).save(os.path.join(out, 'm01-1997-window.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M02 · SCREEN · the 1997 profile pictures: six 32 × 32 icons in the Win95 icon manner (1 px black outline, flat fills,
#        one shade), where today the star and the moon are ERA1.tooltip on ERA1.paper — about 1.05:1, invisible
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def outline_fill(c, pts, fill, edge=None):
    c.d.polygon(pts, fill=fill, outline=edge or ERA1['black'])


def icon32(kind):
    c = Px(32, 32, ERA1['paper'])
    K, D = ERA1['black'], ERA1['greyDark']
    if kind == 'star':
        pts = []
        for i in range(10):
            a = -math.pi / 2 + i * math.pi / 5
            rad = 14 if i % 2 == 0 else 6
            pts.append((16 + round(rad * math.cos(a)), 17 + round(rad * math.sin(a))))
        outline_fill(c, pts, ERA1['tooltip'])
        c.d.polygon([(16, 6), (19, 13), (16, 17), (13, 13)], fill=ERA1['white'])
        for (x, y) in [(18, 22), (20, 21), (22, 20), (21, 23), (15, 24)]:
            c.p(x, y, ERA1['olive'])
        c.checker(17, 18, 7, 6, ERA1['olive'])
        outline_fill(c, pts, None)
    elif kind == 'tape':
        c.r(2, 7, 28, 19, K)
        c.r(3, 8, 26, 17, ERA1['grey'])
        c.r(5, 9, 22, 8, ERA1['white'])
        c.r(5, 9, 22, 2, ERA1['warn'])
        c.r(9, 12, 14, 1, ERA1['greyDark'])
        c.r(8, 18, 16, 5, ERA1['greyDark'])
        for x in (11, 21):
            c.disc(x, 20, 2, ERA1['white'])
            c.p(x, 20, K)
        c.r(10, 24, 12, 2, ERA1['silver'])
        c.r(3, 8, 26, 1, ERA1['silver'])
    elif kind == 'flower':
        c.r(15, 16, 2, 14, ERA1['ok'])
        c.d.polygon([(16, 24), (9, 19), (8, 22), (15, 26)], fill=ERA1['ok'], outline=K)
        c.d.polygon([(17, 27), (24, 21), (25, 24), (18, 29)], fill=ERA1['ok'], outline=K)
        for (dx, dy) in [(0, -7), (7, 0), (0, 7), (-7, 0), (5, -5), (5, 5), (-5, 5), (-5, -5)]:
            c.disc(16 + dx, 12 + dy, 4, K)
        for (dx, dy) in [(0, -7), (7, 0), (0, 7), (-7, 0), (5, -5), (5, 5), (-5, 5), (-5, -5)]:
            c.disc(16 + dx, 12 + dy, 3, ERA1['warn'])
        for (dx, dy) in [(5, 5), (0, 7), (7, 0)]:
            c.checker(16 + dx - 2, 12 + dy - 1, 4, 3, ERA1['warnDark'])
        c.disc(16, 12, 4, K)
        c.disc(16, 12, 3, ERA1['tooltip'])
        c.checker(16, 13, 3, 2, ERA1['olive'])
    elif kind == 'bird':
        outline_fill(c, [(4, 17), (9, 12), (18, 11), (24, 8), (28, 11), (25, 16), (20, 22), (10, 23), (3, 21)], ERA1['titleBlue'])
        outline_fill(c, [(9, 15), (17, 14), (14, 20), (8, 19)], ERA1['navy'])
        outline_fill(c, [(28, 11), (31, 12), (27, 14)], ERA1['warn'])
        c.p(25, 10, K)
        c.r(19, 13, 4, 1, ERA1['white'])
        c.r(12, 23, 1, 4, K)
        c.r(16, 22, 1, 5, K)
        c.r(10, 27, 9, 1, ERA1['olive'])
    elif kind == 'heart':
        pts = [(16, 28), (3, 15), (3, 9), (6, 5), (11, 5), (16, 10), (21, 5), (26, 5), (29, 9), (29, 15)]
        outline_fill(c, pts, ERA1['warn'])
        c.checker(17, 16, 9, 7, ERA1['warnDark'])
        c.r(7, 8, 3, 2, ERA1['white'])
        c.r(6, 10, 2, 2, ERA1['white'])
        outline_fill(c, pts, None)
    elif kind == 'moon':
        c.disc(16, 16, 14, K)
        c.disc(16, 16, 13, ERA1['navy'])
        c.disc(15, 16, 9, ERA1['tooltip'])
        c.disc(19, 13, 8, ERA1['navy'])
        c.checker(8, 18, 4, 5, ERA1['olive'])
        for (x, y) in [(24, 22), (25, 9), (21, 25)]:
            c.p(x, y, ERA1['white'])
    return c


def m02(photos, out):
    cv = Image.open(os.path.join(photos, 'browser/sweep/e1-profile.canvas-os.png')).convert('RGB')
    after = cv.copy()
    kinds = ['star', 'tape', 'flower', 'bird', 'heart', 'moon']
    for i, k in enumerate(kinds):
        # the tile as os.ts draws it: boxX = L + i·70 + 12 (L = 38), boxY = 87, 40 × 40, inner paper at +2 … 36 px
        bx, by = 50 + i * 70, 87
        ic = icon32(k).up(3)
        after.paste(ic, ((bx + 4) * 3, (by + 4) * 3))
    crop = (0, 0, 1536, 420)
    a, b = cv.crop(crop), after.crop(crop)
    sheet = Image.new('RGB', (32 * 6 * 8 + 5 * 24, 32 * 8), ERA1['paper'])
    for i, k in enumerate(kinds):
        sheet.paste(icon32(k).up(8), (i * (256 + 24), 0))
    stack([side(a, b, 'BEFORE · e1-profile (canvas, ×3): star and moon are #ffffcc on #f5f4ed',
                'MOCK · drawProfileIcon at 32 × 32, Win95 icon manner'),
           label(sheet.resize((sheet.width // 2, sheet.height // 2), Image.NEAREST), 'the six, ×4')]).save(
        os.path.join(out, 'm02-1997-profile-pictures.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M03 · SCREEN · the 2003 desktop: a Restorify wallpaper in XP's idiom (the CAL_2003 hill, sky and lamb, banded), the
#        brand on the wallpaper as an OEM mark, the status in a tray balloon — in place of a flat #1084d0 field and a
#        navy slab across the top
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def restorify_wallpaper(W=512, H=384, rays=True):
    c = Px(W, H, CAL03['skyTop'])
    sky = [(CAL03['skyTop'], 0.22), (CAL03['skyMid'], 0.2), (CAL03['skyLow'], 0.12), (CAL03['skyHorizon'], 0.08)]
    y = 0
    for i, (col, f) in enumerate(sky):
        h = round(H * f)
        c.r(0, y, W, h, col)
        if i:
            c.checker(0, y, W, 2, sky[i - 1][0])
        y += h
    c.r(0, y, W, H - y, CAL03['skyHorizon'])
    # the sun low on the left, its rays in hard bands (the system's own light: it promises a morning)
    sx, sy = 120, 168
    for k in range(12 if rays else 0):
        a0 = k * math.pi / 6
        pts = [(sx, sy), (sx + 400 * math.cos(a0), sy + 400 * math.sin(a0)), (sx + 400 * math.cos(a0 + 0.12), sy + 400 * math.sin(a0 + 0.12))]
        c.d.polygon(pts, fill=CAL03['ray'])
    c.disc(sx, sy, 26, CAL03['sun'])
    c.disc(sx, sy, 18, CAL03['sunCore'])
    # two clouds, puffed
    for (cx, cy) in [(330, 70), (420, 110)]:
        for dx, dy, rr in [(-18, 4, 10), (0, 0, 14), (18, 4, 10), (8, 8, 9)]:
            c.disc(cx + dx, cy + dy, rr, CAL03['wool'])
        c.r(cx - 26, cy + 10, 54, 5, CAL03['woolShade'])
    # the hills: a far one and the near one (XP's rolling green, invented, banded and dithered at the seams)
    for x in range(W):
        top = round(232 - 34 * math.sin((x + 40) / 120))
        c.r(x, top, 1, H - top, CAL03['hillBack'])
        c.r(x, top + 4, 1, 3, CAL03['hillBackShade']) if x % 3 == 0 else None
    for x in range(W):
        top = round(286 - 46 * math.sin((x - 60) / 150) + 10 * math.sin(x / 31))
        c.r(x, top, 1, H - top, CAL03['hillFront'])
        if (x // 2) % 2 == 0:
            c.p(x, top + 1, CAL03['hillBack'])
    c.checker(0, 330, W, 54, CAL03['hillFrontShade'])
    # the lamb on the brow of the hill — the programme's mascot as the picture's subject
    lx, ly = 300, 230
    for dx, dy, rr in [(-6, 0, 6), (2, -3, 7), (9, 0, 6), (2, 4, 6)]:
        c.disc(lx + dx, ly + dy, rr, CAL03['wool'])
    c.r(lx - 6, ly + 8, 2, 6, CAL03['lambFace'])
    c.r(lx + 8, ly + 8, 2, 6, CAL03['lambFace'])
    c.r(lx + 13, ly - 4, 6, 6, CAL03['lambFace'])
    c.p(lx + 17, ly - 2, CAL03['wool'])
    return c


def xp_balloon(im, x, y, w, h, title, body, k=3):
    d = ImageDraw.Draw(im)
    X, Y, Wd, Hd = x * k, y * k, w * k, h * k
    d.rounded_rectangle([X, Y, X + Wd, Y + Hd], radius=6 * k // 2, fill=ERA1['tooltip'], outline=ERA1['black'], width=k)
    # the tail toward the tray
    d.polygon([(X + Wd - 40 * k // 3 * 1, Y + Hd), (X + Wd - 22 * k // 3 * 1, Y + Hd), (X + Wd - 14 * k // 3, Y + Hd + 10 * k)],
              fill=ERA1['tooltip'], outline=ERA1['black'])
    d.line([(X + Wd - 40 * k // 3 + k, Y + Hd), (X + Wd - 22 * k // 3 - k, Y + Hd)], fill=ERA1['tooltip'], width=k)
    # the info glyph: a blue disc, a white i
    d.ellipse([X + 6 * k, Y + 6 * k, X + 16 * k, Y + 16 * k], fill=ERA1['titleBlue'], outline=ERA1['navy'], width=k // 2)
    text(im, (X + 11 * k, Y + 11 * k), 'i', 'fixedsys', 10 * k, ERA1['white'], anchor='mm')
    text(im, (X + 21 * k, Y + 6 * k), title, 'fixedsys', 10 * k, ERA1['black'])
    text(im, (X + 21 * k, Y + 18 * k), body, 'fixedsys', 9 * k, ERA1['greyDark'])


def m03(photos, out, rays=True):
    k = 3
    cv = Image.open(os.path.join(photos, 'browser/sweep/e2-message-toast.canvas-os.png')).convert('RGB')
    wall = restorify_wallpaper(rays=rays).up(k)
    # the slab goes: wallpaper wherever the canvas shows the desktop's own two grounds (titleBlue field, navy banner)
    after = cv.copy()
    ap, wp = after.load(), wall.load()
    banner = (26 * k, 24 * k, (512 - 26) * k, 68 * k)
    for y in range(0, (384 - 28) * k):        # the XP taskbar (bottom 28 px logical) is kept as drawn
        for x in range(after.width):
            r, g, b = ap[x, y]
            inb = banner[0] <= x < banner[2] and banner[1] <= y < banner[3]
            if (r, g, b) == ERA1['titleBlue'] or inb:
                ap[x, y] = wp[x, y]
    # icon labels: XP's white with a dark drop shadow, so they read on a photograph
    lab = Image.new('L', after.size, 0)
    lp = lab.load()
    for y in range(90 * k, 300 * k):
        for x in range(0, 140 * k):
            if cv.getpixel((x, y)) == ERA1['white']:
                lp[x, y] = 255
    shadow = Image.new('RGB', after.size, ERA1['black'])
    after.paste(shadow, (k // 1, k // 1), ImageChops.offset(lab, 0, 0))
    after.paste(Image.new('RGB', after.size, ERA1['white']), (0, 0), lab)
    # the OEM mark on the wallpaper, bottom right (as branded machines shipped) — the brand string from slice.json
    slice_e2 = json.load(open(os.path.join(ROOT, 'data', 'strings', 'slice.json'), encoding='utf8'))
    skin = slice_e2['desktop']['eraSkins']['e2']
    text(after, (494 * k, 238 * k), skin['brand'], 'fixedsys', 22 * k, CAL03['brand'], anchor='rs',
         shadow=(k, k, CAL03['brandShadow']))
    text(after, (494 * k, 252 * k), 'one day at a time', 'fixedsys', 10 * k, CAL03['tagline'], anchor='rs')
    # the status, said once in a tray balloon above the clock (XP's own voice for "something changed")
    xp_balloon(after, 296, 262, 196, 34, skin['brand'], skin['status'], k)
    a = label(cv.resize((1024, 768), Image.LANCZOS), 'BEFORE · e2-message-toast (canvas)')
    b = label(after.resize((1024, 768), Image.LANCZOS), 'MOCK · the Restorify wallpaper, the mark, the tray balloon')
    w2 = restorify_wallpaper().up(2)
    if not rays:   # the calm, period-true variant (XP's own wallpaper was calm): the one Part B builds by default
        side(cv, after, 'BEFORE · 2003 desktop (canvas e2-message-toast)', 'MOCK (calm) · the same, no rays', h=768).save(
            os.path.join(out, 'm03b-2003-desktop-calm.png'))
        return
    stack([side(cv, after, 'BEFORE · 2003 desktop (canvas e2-message-toast)', 'MOCK · Restorify wallpaper (CAL_2003), OEM mark, tray balloon', h=768),
           label(w2, 'the wallpaper alone, ×2 (every colour from CAL_2003)')]).save(os.path.join(out, 'm03-2003-desktop.png'))
    after.save(os.path.join(out, 'm03-2003-desktop-canvas.png'))
    m03(photos, out, rays=False)


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M04 · SCREEN · the Close's four panels: the plates re-shot from the rooms as they are now, the hint out from under
#        the Sources button, the title in the Close's own face (Fixedsys) and the paragraph in a vendored face
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
ERA4 = None


def wrap(s, f, width, draw):
    words, lines, line = s.split(), [], ''
    for w in words:
        t = (line + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width:
            line = t
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def close_cell(panel, plate, era):
    """one panel cell as pointCloud.ts lays it out (CELL 1536 × 768, PLATE 40/40 600 × 688, TEXT_X 728, SRC_BTN)"""
    cl = json.load(open(os.path.join(ROOT, 'data', 'room', 'cluster.json'), encoding='utf8'))['pointCloud']
    backdrop, link, labelc, warm = hexrgb(cl['backdrop']), hexrgb(cl['link']), hexrgb(cl['labelColor']), hexrgb(cl['warm'][2])
    hint = json.load(open(os.path.join(ROOT, 'data', 'strings', 'close_restart.json'), encoding='utf8'))['source']['panelHint']
    W, H = 1536, 768
    im = Image.new('RGB', (W, H), (14, 18, 30))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 8, W, H - 8], fill=backdrop)
    d.rectangle([0, 8, W, 12], fill=link)
    pw, ph = 600, 688
    sc = max(pw / plate.width, ph / plate.height)
    pl = plate.resize((round(plate.width * sc), round(plate.height * sc)), Image.LANCZOS)
    ox, oy = (pl.width - pw) // 2, (pl.height - ph) // 2
    im.paste(pl.crop((ox, oy, ox + pw, oy + ph)), (40, 40))
    TX = 728
    TW = W - TX - 44
    d.text((TX, 96), f"{panel['years']}  ·  {panel['title']}", font=font('fixedsys', 54), fill=labelc, anchor='lm')
    f = font('inter', 30)
    rows = wrap(panel['text'], f, TW, d)
    for i, r in enumerate(rows[:13]):
        d.text((TX, 168 + i * 39), r, font=f, fill=warm, anchor='lm')
    # the button where it is (SRC_BTN), the hint in two lines in the space left of it — no longer drawn under it
    bx, by, bw, bh = W - 40 - 300, H - 48 - 39, 300, 78
    if era == 1:
        d.rectangle([bx, by, bx + bw, by + bh], fill=ERA1['black'])
        d.rectangle([bx, by, bx + bw - 3, by + bh - 3], fill=ERA1['white'])
        d.rectangle([bx + 3, by + 3, bx + bw - 3, by + bh - 3], fill=ERA1['greyDark'])
        d.rectangle([bx + 3, by + 3, bx + bw - 6, by + bh - 6], fill=ERA1['silver'])
        d.rectangle([bx + 6, by + 6, bx + bw - 6, by + bh - 6], fill=ERA1['beige'])
        d.text((bx + bw // 2, by + bh // 2), 'Sources', font=font('fixedsys', 36), fill=ERA1['black'], anchor='mm')
    else:
        d.rectangle([bx, by, bx + bw, by + bh], fill=ERA4['chipEdge'])
        d.rectangle([bx + 3, by + 3, bx + bw - 3, by + bh - 3], fill=ERA4['chip'])
        d.text((bx + bw // 2, by + bh // 2), 'Sources', font=font('inter-semi', 32), fill=ERA4['chipText'], anchor='mm')
    hf = font('fixedsys', 24)
    hrows = wrap(hint, hf, bx - TX - 24, d)
    for i, r in enumerate(hrows):
        d.text((TX, by + 18 + i * 30 - (len(hrows) - 2) * 15), r, font=hf, fill=link, anchor='lm')
    return im


def m04(photos, out):
    global ERA4
    ERA4 = pal('era4.ts', 'ERA4')
    panels = json.load(open(os.path.join(ROOT, 'data', 'strings', 'close_network.json'), encoding='utf8'))['panels']
    # the plates as they ship (public/assets/close/eraN.jpg, baked 26 Sep) beside the rooms today (the S375 stills)
    olds = [Image.open(os.path.join(ROOT, 'public', 'assets', 'close', f'era{i}.jpg')).convert('RGB') for i in range(1, 5)]
    nows = [Image.open(os.path.join(photos, 'browser', 'stills', f)).convert('RGB') for f in
            ['e1-00-entrance.png', 'e2-00-entrance-2003.png', 'e3-00-entrance-2016.png', 'e4-00-entrance-2026.png']]
    # a plate is the desk seen past the chair: the stills' right two-thirds, cropped to the plate's 600 × 688
    nows_c = [n.crop((560, 0, 2160, 1440)) for n in nows]
    strip_o = Image.new('RGB', (4 * 300 + 30, 344), (10, 10, 12))
    strip_n = Image.new('RGB', (4 * 300 + 30, 344), (10, 10, 12))
    for i in range(4):
        o = olds[i].resize((300, 263), Image.LANCZOS)
        strip_o.paste(o, (i * 310, 40))
        sc = max(300 / nows_c[i].width, 344 / nows_c[i].height)
        nn = nows_c[i].resize((round(nows_c[i].width * sc), round(nows_c[i].height * sc)), Image.LANCZOS)
        strip_n.paste(nn.crop(((nn.width - 300) // 2, 0, (nn.width - 300) // 2 + 300, 344)), (i * 310, 0))
    before = [Image.open(os.path.join(photos, 'browser/sweep/close-panel-1997.png')).convert('RGB'),
              Image.open(os.path.join(photos, 'browser/sweep/close-panel-2026.png')).convert('RGB')]
    cells = [close_cell(panels[0], nows_c[0], 1), close_cell(panels[3], nows_c[3], 4)]
    rows = [side(before[0], cells[0], 'BEFORE · close-panel-1997 (hint cut by the button: "…to ope")',
                 'MOCK · 1997 cell: today\'s room, Fixedsys title, the hint left of the button', h=640),
            side(before[1], cells[1], 'BEFORE · close-panel-2026 (plate: the laptop he removed, a bare wall)',
                 'MOCK · 2026 cell: today\'s room (posters, flag, lamp); its paragraph is still the old 2026 — HIS', h=640),
            label(strip_o, 'the plates as shipped (public/assets/close/era1–4.jpg, baked 26 Sep)'),
            label(strip_n, 'the same four rooms today (stills from this run) — what a re-bake would show')]
    stack(rows).save(os.path.join(out, 'm04-close-panels.png'))

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M05 · ROOM · the Close in front of the machine: nothing on the line between the seat and Daniel's CRT — no source
#        label across its glass while a panel is read, no constellation label blown up over its bezel at the Restart
#        card (R4-15's own rule, regressed)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def fill_from_left(im, box, test):
    """inside `box`, every pixel `test` accepts takes the colour of the nearest accepted-free pixel to its left"""
    px = im.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        last = None
        for x in range(x0, x1):
            c = px[x, y]
            if test(c):
                if last is not None:
                    px[x, y] = last
            else:
                last = c


def m05(photos, out):
    f070 = Image.open(os.path.join(photos, 'close-flow/desktop-f070.png')).convert('RGB')
    f088 = Image.open(os.path.join(photos, 'close-flow/desktop-f088.png')).convert('RGB')
    a070 = f070.copy()
    lum = lambda c: (c[0] * 3 + c[1] * 6 + c[2]) / 10
    # the machine's dark body, below the 1997 panel (measured on this frame): labels and link lines inside it go
    # the machine's dark body under the 1997 panel (measured on this frame): its glass is the run of near-black, its
    # frame the dark grey round it — both put back flat, as they are where no label crosses
    box = (1226, 944, 1860, 1300)
    pk = a070.load()
    gx = [x for x in range(box[0], box[2]) if lum(pk[x, 1150]) < 6]
    gy = [y for y in range(box[1], box[3]) if lum(pk[1540, y]) < 6]
    glass = (min(gx), min(gy), max(gx) + 1, box[3])
    frame_c, glass_c = pk[box[0] + 6, box[3] - 6], pk[glass[0] + 30, glass[3] - 6]
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            ing = glass[0] <= x < glass[2] and glass[1] <= y < glass[3]
            pk[x, y] = glass_c if ing else frame_c
    a088 = f088.copy()
    px = a088.load()
    # the bezel outside the glass: each row back to its own lit colour (the blown-up label only ever darkens it)
    scr = (700, 300, 1975, 1262)
    for y in range(100, 1240):
        row = [px[x, y] for x in range(505, 2170) if not (scr[0] <= x < scr[2] and scr[1] <= y < scr[3])]
        if not row:
            continue
        ref = sorted(row, key=lum)[int(len(row) * 0.9)]
        for x in range(505, 2170):
            if scr[0] <= x < scr[2] and scr[1] <= y < scr[3]:
                continue
            c = px[x, y]
            if lum(c) > 100 and abs(lum(ref) - lum(c)) > 2:
                px[x, y] = ref
    stack([side(f070, a070, 'BEFORE · the 1997 panel: two source labels and a link line run across the machine',
                'MOCK · nothing between the seat and the CRT (labels kept beside it)', h=620),
           side(f088, a088, 'BEFORE · the Restart card: "van den Aardweg" blown up over the bezel',
                'MOCK · the constellation recedes while the card is up', h=620)]).save(os.path.join(out, 'm05-close-machine.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M06 · SCREEN · Lamby's cartoon (2003, the software's boot over the jingle): a 2003 Flash cartoon of itself — a night
#        bedroom, a puffed thought-cloud of static, then the monitor's sunburst over the room — in place of grey
#        blocks on a black void. Lamby's own sprites are kept (cut from the photographs); the timeline is untouched.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def sprite_from(canvas, box, keep):
    """cut a sprite out of a ×3 canvas: the pixels `keep` accepts, alpha elsewhere"""
    im = canvas.crop(box).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not keep((r, g, b), y + box[1]):
                px[x, y] = (0, 0, 0, 0)
    return im


def puff_cloud(c, cx, cy, puffs, fill, shade, edge):
    for dx, dy, rr in puffs:
        c.disc(cx + dx, cy + dy, rr + 1, edge)
    for dx, dy, rr in puffs:
        c.disc(cx + dx, cy + dy, rr, fill)
    for dx, dy, rr in puffs:
        if dy >= 0:
            c.checker(cx + dx - rr + 2, cy + dy + rr // 2, 2 * rr - 4, max(1, rr // 2 - 1), shade)


def m06(photos, out):
    import random
    rnd = random.Random(7)
    k = 3
    asleep_cv = Image.open(os.path.join(photos, 'browser/sweep/e2-cartoon.canvas-os.png')).convert('RGB')
    late_cv = Image.open(os.path.join(photos, 'browser/sweep/e2-cartoon-late.canvas-os.png')).convert('RGB')
    lam = json.load(open(os.path.join(ROOT, 'data', 'dialog', 's2_lamby.json'), encoding='utf8'))['cartoon']
    wool = {ERA1['white'], ERA1['beige'], ERA1['paper'], ERA1['silver'], ERA1['black'], ERA1['greyDark'], ERA1['grey'],
            (253, 253, 253), (11, 11, 11), (19, 19, 19)}
    asleep = sprite_from(asleep_cv, (230, 600, 620, 1010), lambda c, y: c != (0, 0, 0) and (c in wool or c == ERA1['grey']))
    stand = sprite_from(late_cv, (250, 590, 720, 1000), lambda c, y: c in wool)
    # ── frame A · asleep: the room at night, the cloud of static over him, the monitor dark ──
    A = Px(512, 384, ERA1['navy'])
    A.checker(0, 0, 512, 300, PRINT['rallyNight'])            # the night wall, dithered (two navies, one texture)
    A.r(0, 300, 512, 84, ERA1['tealDark'])                    # the floor
    A.r(0, 300, 512, 2, ERA1['black'])
    A.r(36, 40, 92, 84, ERA1['silver'])                       # the window …
    A.r(40, 44, 84, 76, ERA1['black'])
    A.r(81, 44, 2, 76, ERA1['silver'])
    A.r(40, 81, 84, 2, ERA1['silver'])
    A.disc(104, 62, 9, ERA1['tooltip'])                        # … and the moon in it, a crescent
    A.disc(108, 59, 8, ERA1['black'])
    for (sx, sy) in [(52, 54), (64, 98), (110, 104), (92, 50), (58, 72)]:
        A.p(sx, sy, ERA1['white'])
    A.r(36, 214, 10, 74, ERA1['greyDark'])                     # the bed: headboard, frame, quilt (teal and navy), pillow
    A.r(40, 254, 196, 34, ERA1['greyDark'])
    A.r(46, 230, 186, 26, ERA1['teal'])
    A.checker(46, 230, 186, 26, ERA1['tealDark'])
    for x in range(52, 232, 22):
        A.r(x, 230, 2, 26, ERA1['navy'])
    A.r(48, 222, 40, 12, ERA1['paper'])
    puff_cloud(A, 150, 112, [(-46, 8, 22), (-20, -8, 28), (12, -12, 30), (44, 2, 24), (0, 16, 26), (-28, 20, 18), (30, 20, 18)],
               ERA1['white'], ERA1['silver'], ERA1['black'])
    x, y = 112, 108                                            # the static: a scribble, never a picture of anything
    for i in range(70):
        nx = max(100, min(200, x + rnd.randint(-14, 14)))
        ny = max(92, min(134, y + rnd.randint(-7, 7)))
        A.line(x, y, nx, ny, ERA1['greyDark'] if i % 3 else ERA1['black'])
        x, y = nx, ny
    for (bx, by, rr) in [(116, 168, 5), (104, 184, 3), (96, 196, 2)]:
        A.disc(bx, by, rr + 1, ERA1['black'])
        A.disc(bx, by, rr, ERA1['white'])
    A.r(352, 236, 136, 64, ERA1['greyDark'])                   # the desk and the monitor, dark
    A.r(372, 150, 100, 80, ERA1['grey'])
    A.r(378, 156, 88, 64, ERA1['black'])
    A.r(408, 230, 28, 6, ERA1['grey'])
    A.p(458, 224, ERA1['ok'])
    a_img = A.up(k)
    text(a_img, (64 * k, 170 * k), 'z', 'fixedsys', 12 * k, ERA1['white'])
    text(a_img, (54 * k, 152 * k), 'z', 'fixedsys', 16 * k, ERA1['white'])
    text(a_img, (40 * k, 128 * k), 'Z', 'fixedsys', 22 * k, ERA1['white'])
    a_img.paste(asleep, (160, 520), asleep)
    # ── frame B · the light: the monitor's sunburst paints the room, the cloud breaks up, he stands and points ──
    B = Px(512, 384, CAL03['skyMid'])
    sx, sy = 422, 190
    for kk in range(16):                                       # the rays, hard bands from the screen
        a0 = kk * math.pi / 8
        pts = [(sx, sy), (sx + 700 * math.cos(a0), sy + 700 * math.sin(a0)),
               (sx + 700 * math.cos(a0 + math.pi / 16), sy + 700 * math.sin(a0 + math.pi / 16))]
        B.d.polygon(pts, fill=CAL03['ray'])
    B.r(0, 300, 512, 84, CAL03['hillFront'])
    B.checker(0, 300, 512, 84, CAL03['hillFrontShade'])
    B.r(0, 300, 512, 2, CAL03['hillFrontShade'])
    for (cx, cy) in [(120, 110), (160, 92)]:                   # the cloud, breaking into pixels as the light reaches it
        for i in range(60):
            rx, ry = cx + rnd.randint(-40, 40), cy + rnd.randint(-22, 22)
            B.r(rx, ry, 3, 3, ERA1['white'])
    for (px_, py_, s_) in [(80, 60, 5), (250, 70, 4), (300, 150, 6), (60, 180, 3), (210, 40, 3), (340, 60, 5)]:
        B.r(px_ - s_, py_, 2 * s_ + 1, 1, CAL03['sunCore'])    # sparkles: four-point stars
        B.r(px_, py_ - s_, 1, 2 * s_ + 1, CAL03['sunCore'])
        B.r(px_ - 1, py_ - 1, 3, 3, ERA1['white'])
    B.r(352, 236, 136, 64, ERA1['greyDark'])                   # the desk; the monitor lit, beige, and on it what is right
    B.r(356, 130, 132, 104, ERA1['beige'])
    B.r(362, 136, 120, 88, ERA1['titleBlue'])
    B.r(410, 234, 24, 6, ERA1['grey'])
    B.r(470, 226, 3, 2, ERA1['ok'])
    B.disc(386, 176, 16, ERA1['white'])                        # the mark: a big tick in a white disc
    for i in range(7):
        B.r(378 + i, 176 + i, 3, 3, ERA1['ok'])
    for i in range(13):
        B.r(384 + i, 182 - i, 3, 3, ERA1['ok'])
    b_img = B.up(k)
    text(b_img, (408 * k, 148 * k), lam['mark'], 'fixedsys', 10 * k, ERA1['white'])
    text(b_img, (408 * k, 166 * k), lam['streakLabel'], 'fixedsys', 9 * k, ERA1['tooltip'])
    text(b_img, (408 * k, 182 * k), lam['streakDays'], 'fixedsys', 13 * k, ERA1['white'])
    b_img.paste(stand, (250, 590), stand)
    for img, cv in [(a_img, asleep_cv), (b_img, late_cv)]:    # the lyric bands, as drawn now
        img.paste(cv.crop((0, 1040, 1536, 1152)), (0, 1040))
    rows = [side(asleep_cv, a_img, 'BEFORE · e2-cartoon (asleep: grey blocks, a black void)',
                 'MOCK · asleep: his room at night, a puffed cloud of static', h=576),
            side(late_cv, b_img, 'BEFORE · e2-cartoon-late (the light)',
                 "MOCK · the light: the screen's sunburst, the streak, the cloud breaking up", h=576)]
    stack(rows).save(os.path.join(out, 'm06-2003-lamby-cartoon.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M07 · ROOM · Daniel's 1997 bed: the navy-and-red plaid PLAN_ROUND5 promised ("a teenager's, bought by his mother"),
#        muted, as a printed surface — in place of a flat near-black slab, the darkest mass in the warm room
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def plaid(W=48, H=48):
    c = Px(W, H, PRINT['rallyNight'])
    for x in range(0, W, 16):
        c.r(x + 5, 0, 5, H, ERA1['warnDark'])
        c.r(x + 13, 0, 1, H, CAL97['rule'])
    for y in range(0, H, 16):
        c.checker(0, y + 5, W, 5, ERA1['warnDark'])
        c.checker(0, y + 13, W, 1, CAL97['rule'])
    return c


def m07(photos, out):
    ph = Image.open(os.path.join(photos, 'browser/stills/e1-00-entrance.png')).convert('RGB')
    after = ph.copy()
    pa, pp = after.load(), ph.load()
    tile = plaid().up(4).load()
    lum = lambda c: (c[0] * 3 + c[1] * 6 + c[2]) / 10
    # the blanket: the dark, slightly warm pixels in the bed's corner of the still; a sheared screen-space print, kept
    # in the face's own shading (a sketch of a printed texture on the blanket's faces, not a UV map)
    ref = 64.0
    wall = pp[1500, 260]                                         # the lit wall behind the desk, sampled
    for y in range(760, 1440):
        for x in range(0, 760):
            c = pp[x, y]
            if lum(c) < 96 and c[0] >= c[2] and abs(c[0] - c[1]) < 14:
                u = int(x * 0.94 + y * 0.52) % 192
                v = int(-x * 0.34 + y * 0.94) % 192
                t = tile[u, v]
                s = max(0.55, min(1.35, lum(c) / ref))
                # muted (his 'personal things muted'): a quarter of the way toward the room's own wall tone
                pa[x, y] = tuple(min(255, int((t[i] * 0.75 + wall[i] * 0.25) * s)) for i in range(3))
    stack([side(ph, after, 'BEFORE · the 1997 still: the blanket is a near-black slab',
                "MOCK · the plaid, muted, in the face's own light", h=720),
           label(plaid().up(8), 'the print ×8 (PRINT.rallyNight, ERA1.warnDark, CAL_1997.rule)')]).save(
        os.path.join(out, 'm07-1997-bed.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M08 · SCREEN · the 2016 Handset Window's lock screen: a photograph that is hers (the harbour wall at dusk, nobody in
#        it) under the clock, in place of grey target rings — the most-seen surface of 2016
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def m08(photos, out):
    before = Image.open(os.path.join(photos, 'browser/sweep/e3-board.canvas-phone.png')).convert('RGB')
    W, H = before.size
    im = Image.new('RGB', (W, H), PHONE['wallTop'])
    d = ImageDraw.Draw(im, 'RGBA')
    bands = [(PHONE['wallTop'], 0.30), (PHONE['wallMid'], 0.16), (PHONE['wallBot'], 0.08)]
    y = 0
    for col, f in bands:
        h = round(H * f)
        d.rectangle([0, y, W, y + h], fill=col)
        y += h
    horizon = y
    for i, a in enumerate([70, 50, 34, 22, 12]):                # the low sun behind cloud, soft (the period's photo)
        r = 60 + i * 46
        d.ellipse([W * 0.68 - r, horizon - r * 0.55, W * 0.68 + r, horizon + r * 0.55], fill=PRINT['tourSpot'] + (a,))
    d.rectangle([0, horizon, W, H], fill=ERA3['deskMid'])        # the sea
    for i in range(16):                                          # the sun's road on the water
        yy = horizon + 10 + i * 14
        w = 30 + i * 9
        d.rectangle([W * 0.68 - w / 2, yy, W * 0.68 + w / 2, yy + 3], fill=PRINT['tourSpot'] + (120 - i * 6,))
    for i in range(10):
        yy = horizon + 18 + i * 22
        d.line([(20 + (i * 53) % 200, yy), (60 + (i * 53) % 200, yy)], fill=PHONE['wallBot'] + (90,), width=2)
    hw = int(H * 0.70)                                           # the harbour wall in front, a bollard, a lamp
    d.polygon([(0, hw), (W, hw + 60), (W, H), (0, H)], fill=ERA3['ink'])
    d.rectangle([60, hw - 34, 92, hw + 4], fill=ERA3['ink'])
    d.ellipse([56, hw - 44, 96, hw - 26], fill=ERA3['ink'])
    d.rectangle([W - 120, hw - 230, W - 112, hw + 60], fill=ERA3['ink'])
    d.rectangle([W - 140, hw - 238, W - 92, hw - 228], fill=ERA3['ink'])
    for i, a in enumerate([110, 60, 30]):
        r = 10 + i * 14
        d.ellipse([W - 116 - r, hw - 220 - r, W - 116 + r, hw - 220 + r], fill=PRINT['rallyGlow'] + (a,))
    for mx in (150, 196, 230):                                   # masts out on the water
        d.line([(mx, horizon - 120 + (mx % 40)), (mx, horizon + 6)], fill=ERA3['ink'], width=3)
        d.polygon([(mx - 26, horizon + 2), (mx + 22, horizon + 2), (mx + 14, horizon + 14), (mx - 18, horizon + 14)], fill=ERA3['ink'])
    d.rectangle([0, 0, W, H], fill=ERA3['ink'] + (40,))         # the lock screen's own dim, so the clock reads
    im.paste(before.crop((0, 0, W, 84)), (0, 0))                 # the status bar as it is
    text(im, (W // 2, 262), '18:04', 'roboto', 132, PHONE['surface'], anchor='mm')
    text(im, (W // 2, 352), 'Tuesday 6 December', 'roboto', 38, PHONE['surface'], anchor='mm')
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([W // 2 - 125, 965, W // 2 + 125, 1040], radius=38, fill=PHONE['surface'])
    text(im, (W // 2, 1003), 'Unlock', 'roboto-bold', 44, PHONE['ink'], anchor='mm')
    side(before, im, 'BEFORE · e3-board phone (rings)', 'MOCK · her own photograph', h=900).save(
        os.path.join(out, 'm08-2016-lock-screen.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M09 · ROOM · the 2003 flip phone held to the eye: a clamshell (earpiece, a printed mark, the hinge, the keypad half
#        falling away) in place of a dark slab that reads as a 2016 phone
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def m09(photos, out):
    ph = Image.open(os.path.join(photos, 'browser/sweep/e2-held-phone.png')).convert('RGB')
    after = ph.copy()
    d = ImageDraw.Draw(after)
    lcd = (855, 155, 1712, 1245)                                 # the LCD as the photograph has it (measured): kept
    lcd_img = ph.crop(lcd)
    body, edge = HANDHELD['bezel'], CLEAR['frame']
    d.rounded_rectangle([740, -60, 1830, 1330], radius=120, fill=edge)       # the top half's shell
    d.rounded_rectangle([752, -48, 1818, 1318], radius=110, fill=body)
    d.rounded_rectangle([826, 120, 1744, 1282], radius=36, fill=ERA1['black'])
    after.paste(lcd_img, (lcd[0], lcd[1]))
    d.rounded_rectangle([1180, 40, 1390, 70], radius=14, fill=HANDHELD['dpad'])   # the earpiece
    for i in range(6):
        d.rectangle([1200 + i * 32, 50, 1212 + i * 32, 60], fill=edge)
    d.rounded_rectangle([700, 1300, 1870, 1440], radius=60, fill=edge)            # the hinge barrel
    d.rectangle([700, 1360, 1870, 1376], fill=HANDHELD['dpad'])
    d.ellipse([1260, 1318, 1310, 1350], fill=CLEAR['halo'])                        # the charging LED
    text(after, (1285, 1300), 'RESTORIFY', 'fixedsys', 46, CLEAR['lattice'], anchor='ms')
    side(ph, after, 'BEFORE · e2-held-phone (a slab)', 'MOCK · a clamshell: earpiece, mark, hinge (HANDHELD / CLEAR)', h=720).save(
        os.path.join(out, 'm09-2003-flip-phone.png'))


# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# M10 · SCREEN · GracePlatform's Today board: each job card gets a flat 2016 picture of what the job does (a map with
#        flagged pins, a phone with waiting calls, the group's faceless members) — three of four are grey bars today
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def thumb(kind, W=354, H=104):
    im = Image.new('RGB', (W, H), ERA3['glass'])
    d = ImageDraw.Draw(im)
    if kind == 'places':
        d.rectangle([0, 0, W, H], fill=ERA3['sysBand'])
        d.rectangle([0, 64, W, 104], fill=ERA3['lambBand'])                     # the water
        for x in (70, 170, 280):
            d.rectangle([x, 0, x + 10, 64], fill=ERA3['white'])                 # streets
        d.rectangle([0, 26, W, 34], fill=ERA3['white'])
        d.rectangle([190, 0, 270, 24], fill=ERA3['good'])                        # a park
        for (px_, py_, col) in [(110, 52, ERA3['amber']), (232, 58, ERA3['alarm']), (318, 48, ERA3['amber'])]:
            d.ellipse([px_ - 13, py_ - 38, px_ + 13, py_ - 12], fill=col)
            d.polygon([(px_ - 10, py_ - 20), (px_ + 10, py_ - 20), (px_, py_)], fill=col)
            d.ellipse([px_ - 5, py_ - 30, px_ + 5, py_ - 20], fill=ERA3['white'])
    elif kind == 'calls':
        d.ellipse([18, 18, 86, 86], fill=ERA3['accent'])
        d.rounded_rectangle([36, 34, 48, 70], radius=6, fill=ERA3['white'])
        d.rounded_rectangle([56, 34, 68, 70], radius=6, fill=ERA3['white'])
        d.rectangle([42, 46, 62, 58], fill=ERA3['white'])
        d.ellipse([70, 12, 96, 38], fill=ERA3['alarm'])
        text(im, (83, 25), '3', 'roboto-bold', 18, ERA3['white'], anchor='mm')
        for i, (w, col) in enumerate([(220, ERA3['memberBand']), (180, ERA3['white']), (230, ERA3['memberBand'])]):
            y = 14 + i * 28
            d.rounded_rectangle([110, y, 110 + w, y + 22], radius=11, fill=col, outline=ERA3['fieldEdge'])
            d.rectangle([126, y + 9, 126 + int(w * 0.6), y + 12], fill=ERA3['grey'])
            d.rectangle([110, y + 2, 114, y + 20], fill=ERA3['memberSpine'])
    elif kind == 'group':
        d.rectangle([0, 0, W, 22], fill=ERA3['accent'])
        text(im, (12, 11), 'New Hope Stories · group', 'roboto', 14, ERA3['white'], anchor='lm')
        cols = [ERA3['rose'], ERA3['amber'], ERA3['good'], ERA3['accentHi'], ERA3['bury'], ERA3['grey']]
        for i, col in enumerate(cols):
            cx = 34 + i * 50
            d.ellipse([cx - 20, 30, cx + 20, 70], fill=col)
            d.ellipse([cx - 7, 37, cx + 7, 51], fill=ERA3['white'])
            d.pieslice([cx - 13, 52, cx + 13, 78], 180, 360, fill=ERA3['white'])
        d.rounded_rectangle([12, 78, W - 12, 98], radius=10, fill=ERA3['white'], outline=ERA3['fieldEdge'])
        text(im, (24, 88), 'Write to the group…', 'roboto', 13, ERA3['grey'], anchor='lm')
    return im


def m10(photos, out):
    cv = Image.open(os.path.join(photos, 'browser/sweep/e3-board.canvas-workstation.png')).convert('RGB')
    after = cv.copy()
    for kind, (x, y) in [('places', (528, 261)), ('calls', (984, 261)), ('group', (72, 576))]:
        after.paste(thumb(kind), (x, y))
    crop = (0, 0, 1420, 760)
    side(cv.crop(crop), after.crop(crop), 'BEFORE · e3-board (canvas): three grey-bar thumbnails',
         'MOCK · flat 2016 pictures of the jobs (ERA3)', h=700).save(os.path.join(out, 'm10-2016-board-cards.png'))


MOCKS = {'m01': m01, 'm02': m02, 'm03': m03, 'm04': m04, 'm05': m05, 'm06': m06, 'm07': m07, 'm08': m08, 'm09': m09, 'm10': m10}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--photos', required=True)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    out = os.path.join(a.photos, 'mocks')
    os.makedirs(out, exist_ok=True)
    only = [s for s in a.only.split(',') if s]
    for k, fn in MOCKS.items():
        if only and k not in only:
            continue
        print('·', k)
        fn(a.photos, out)


if __name__ == '__main__':
    main()
