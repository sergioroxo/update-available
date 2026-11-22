#!/usr/bin/env python3
"""S417 (UiB job 34): a contact sheet, the BEFORE row above the AFTER row, for the computer and then the headset.
   python3 tools/s417-sheet.py <stills dir with before/ and after/> <SHEET_name.png> "<B01>=<label>" "<B02>=<label>" ...
Each frame is <dir>/<before|after>/<name>_<desktop|xr>.png. Rows: before · computer, after · computer, before · headset,
after · headset. A missing frame is a dark tile marked 'none' (the before build has no Menu, for instance)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

root, out = sys.argv[1], sys.argv[2]
frames = [a.split('=', 1) for a in sys.argv[3:]]
TW, TH, LAB, PAD, HEAD = 520, 300, 30, 10, 200
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)
    big = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 20)
except Exception:
    font = big = ImageFont.load_default()

def tile(path, label):
    im = Image.new('RGB', (TW, TH + LAB), (26, 26, 30))
    d = ImageDraw.Draw(im)
    if os.path.exists(path):
        src = Image.open(path).convert('RGB')
        src.thumbnail((TW, TH), Image.LANCZOS)
        im.paste(src, ((TW - src.width) // 2, LAB + (TH - src.height) // 2))
    else:
        d.text((TW // 2 - 20, LAB + TH // 2 - 10), 'none', fill=(140, 140, 150), font=font)
    d.text((8, 6), label[:58], fill=(238, 238, 238), font=font)
    return im

rows = [('before', 'desktop', 'BEFORE|job 33, 7763b962|computer'), ('after', 'desktop', 'AFTER|S417|computer'),
        ('before', 'xr', 'BEFORE|job 33, 7763b962|headset'), ('after', 'xr', 'AFTER|S417|headset')]
W = HEAD + len(frames) * (TW + PAD) + PAD
H = len(rows) * (TH + LAB + PAD) + PAD
g = Image.new('RGB', (W, H), (12, 12, 14))
d = ImageDraw.Draw(g)
for r, (when, mode, title) in enumerate(rows):
    y = PAD + r * (TH + LAB + PAD)
    for k, line in enumerate(title.split('|')):
        d.text((12, y + 110 + k * 28), line, fill=(255, 214, 120) if when == 'after' else (190, 190, 200), font=big)
    for c, (name, label) in enumerate(frames):
        g.paste(tile(os.path.join(root, when, f'{name}_{mode}.png'), f'{name} · {label}'), (HEAD + PAD + c * (TW + PAD), y))
g.save(out)
print(f'{out}: {len(frames)} frames × {len(rows)} rows')
