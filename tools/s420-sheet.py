#!/usr/bin/env python3
"""
S420 (UiB job 34) -- one contact sheet for the picture: before (bd3b0203) over after, section by section, labelled in plain
words. Reads the stills tools/s420-picture-stills.mjs wrote into <before>/ and <after>/ (and goal-surfaces.png beside them).

    python3 tools/s420-sheet.py <before-dir> <after-dir> <out.png>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

B, A, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
BOLD = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
SMALL = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)
BG, INK, DIM = (36, 36, 44), (240, 240, 240), (170, 170, 185)
W = 2400
ROW_LABEL = 190

def load(d, name, crop=None, h=None):
    p = os.path.join(d, name)
    if not os.path.exists(p):
        im = Image.new('RGB', (400, 300), (60, 30, 30)); ImageDraw.Draw(im).text((10, 10), 'missing: ' + name, fill=INK, font=SMALL); return im
    im = Image.open(p).convert('RGB')
    if crop: im = im.crop(crop)
    if h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    return im

sections = []
def section(title, items, h):
    """items: [(file, crop, caption)] — the same files from before and after"""
    sections.append((title, items, h))

section('Join here: the monitor, close up. Her photo as the filter works on it (21%, 64%) and where it stops (99%).',
        [('photo-here-s03.png', (20, 150, 900, 600), '21%'), ('photo-here-s09.png', (20, 150, 900, 600), '64%'), ('photo-here-s14.png', (20, 150, 900, 600), '99%')], 300)
section('Join in VR: the headset\'s glass, close up. The same steps.',
        [('photo-vr-s03.png', (0, 170, 600, 600), '21%'), ('photo-vr-s06.png', (0, 170, 600, 600), '42%'), ('photo-vr-s09.png', (0, 170, 600, 600), '64%'), ('photo-vr-s14.png', (0, 170, 600, 600), '99%')], 300)
section('From the seat, at 99%: Join here and Join in VR, on the computer and in the headset.',
        [('B09-photo-here-99_desktop.png', (300, 200, 980, 580), 'Join here · computer'), ('B09-photo-vr-99_desktop.png', (200, 120, 1080, 600), 'Join in VR · computer'),
         ('B09-photo-here-99_xr.png', (200, 380, 800, 760), 'Join here · headset'), ('B09-photo-vr-99_xr.png', (100, 260, 800, 720), 'Join in VR · headset')], 260)
section('Beat 6: the console Second Thoughts puts on her bed. Its game after PLAY (the Pride \'24 picture under the same filter).',
        [('console-game-play.png', None, 'the game, close up'), ('B06-console-play_desktop.png', None, 'held up · computer'), ('B06-console-play_xr.png', (240, 410, 760, 640), 'held up · headset')], 300)
section('Not reached in the visit (they share the painter): the wall frame, the browser\'s card, the profile chips, the chat wallpaper.',
        [('goal-surfaces.png', (0, 0, 760, 280), '')], 280)

# lay out
blocks = []
for title, items, h in sections:
    rows = []
    for label, d in (('before\n(bd3b0203)', B), ('after\n(S420)', A)):
        ims = [(load(d, f, c, h), cap) for f, c, cap in items]
        rows.append((label, ims))
    blocks.append((title, rows, h))
H = 30
for title, rows, h in blocks: H += 50 + 2 * (h + 40) + 30
sheet = Image.new('RGB', (W, H), BG)
dr = ImageDraw.Draw(sheet)
y = 20
dr.text((20, y), 'S420 - the picture: no man anywhere. The system\'s target is its default avatar, default.png; the filter cuts away what she chose.', fill=INK, font=BOLD)
y += 50
for title, rows, h in blocks:
    dr.text((20, y), title, fill=INK, font=BOLD); y += 44
    for label, ims in rows:
        dr.multiline_text((20, y + 10), label, fill=DIM, font=FONT)
        x = ROW_LABEL
        for im, cap in ims:
            if x + im.width > W - 10:
                im = im.resize((W - 10 - x, round(im.height * (W - 10 - x) / im.width)))
            sheet.paste(im, (x, y))
            if cap: dr.text((x + 4, y + h + 6), cap, fill=DIM, font=SMALL)
            x += im.width + 14
        y += h + 40
    y += 24
sheet = sheet.crop((0, 0, W, y))
sheet.save(OUT)
print(OUT, sheet.size)
