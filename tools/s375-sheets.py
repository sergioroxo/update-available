#!/usr/bin/env python3
"""S375 (UiB job 19 Part A): contact sheets. Reads out/s375/sheets.json (written by tools/s375-index.mjs):
   { "<sheet name>": [ {"label": "...", "path": "/abs/file.png"}, ... ], ... }
and writes out/s375/<sheet name>.png (the whole grid) plus <sheet name>-p1.png ... (30 thumbnails a page, for viewing).
   python3 tools/s375-sheets.py [out/s375]"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1] if len(sys.argv) > 1 else 'out/s375'
sheets = json.load(open(os.path.join(root, 'sheets.json')))
TW, TH, LAB, PAD, COLS, PAGE = 480, 270, 34, 8, 6, 30
try:
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
except Exception:
    font = ImageFont.load_default()

def tile(item):
    im = Image.new('RGB', (TW, TH + LAB), (24, 24, 28))
    try:
        src = Image.open(item['path']).convert('RGB')
        src.thumbnail((TW, TH), Image.LANCZOS)
        im.paste(src, ((TW - src.width) // 2, LAB + (TH - src.height) // 2))
    except Exception:
        pass
    d = ImageDraw.Draw(im)
    d.text((6, 8), item['label'][:56], fill=(235, 235, 235), font=font)
    return im

def grid(items, cols):
    rows = (len(items) + cols - 1) // cols
    W = cols * (TW + PAD) + PAD
    H = rows * (TH + LAB + PAD) + PAD
    g = Image.new('RGB', (W, H), (10, 10, 12))
    for i, it in enumerate(items):
        g.paste(tile(it), (PAD + (i % cols) * (TW + PAD), PAD + (i // cols) * (TH + LAB + PAD)))
    return g

for name, items in sheets.items():
    items = [i for i in items if os.path.exists(i['path'])]
    if not items:
        continue
    grid(items, COLS).save(os.path.join(root, f'{name}.png'))
    for p in range(0, len(items), PAGE):
        grid(items[p:p + PAGE], COLS).save(os.path.join(root, f'{name}-p{p // PAGE + 1}.png'))
    print(f'{name}: {len(items)} thumbnails')
