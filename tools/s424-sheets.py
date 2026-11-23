#!/usr/bin/env python3
"""S424 (UiB job 35 Part D, Act I): contact sheets, the before row over the after row, each frame labelled in plain words.
Reads a JSON spec: { "<SHEET name>": { "title": "...", "rows": [ { "label": "today (before)", "cells": [ {"label": "...",
"path": "/abs.png"} | null, ... ] }, ... ] } } and writes <out>/<SHEET name>.png. A null cell is drawn as an empty frame
("no such step"). Tiles keep their shape at one height (a phone's portrait frame is narrower).
   python3 tools/s424-sheets.py <spec.json> <out dir>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

spec = json.load(open(sys.argv[1]))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
TH, LAB, PAD, ROWLAB, TITLE = 330, 50, 10, 34, 46
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 17)
    bold = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 21)
    title = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 26)
except Exception:
    font = bold = title = ImageFont.load_default()

def load(cell):
    if not cell or not os.path.exists(cell['path']):
        return None
    im = Image.open(cell['path']).convert('RGB')
    w = max(1, round(im.width * TH / im.height))
    return im.resize((w, TH), Image.LANCZOS)

for name, sh in spec.items():
    rows = sh['rows']
    ncols = max(len(r['cells']) for r in rows)
    imgs = [[load(c) for c in r['cells']] for r in rows]
    # each column as wide as its widest frame (a missing frame borrows the column's width, or a computer frame's)
    colw = []
    for j in range(ncols):
        ws = [imgs[i][j].width for i in range(len(rows)) if j < len(imgs[i]) and imgs[i][j] is not None]
        colw.append(max(ws) if ws else round(TH * 1.6))
    W = PAD + sum(w + PAD for w in colw)
    H = TITLE + sum(ROWLAB + LAB + TH + PAD for _ in rows) + PAD
    g = Image.new('RGB', (W, H), (16, 16, 20))
    d = ImageDraw.Draw(g)
    d.text((PAD, 10), sh.get('title', name), fill=(245, 245, 245), font=title)
    y = TITLE
    for i, r in enumerate(rows):
        d.text((PAD, y + 6), r['label'], fill=(250, 214, 120) if 'after' in r['label'].lower() or 'training' in r['label'].lower() else (190, 190, 200), font=bold)
        y += ROWLAB
        x = PAD
        for j in range(ncols):
            cell = r['cells'][j] if j < len(r['cells']) else None
            lab = cell['label'] if cell else 'no such step'
            # the label wraps to two lines within its column
            words, lines, cur = lab.split(' '), [], ''
            for w_ in words:
                t_ = (cur + ' ' + w_).strip()
                if d.textlength(t_, font=font) <= colw[j] - 4 or not cur: cur = t_
                else: lines.append(cur); cur = w_
            lines.append(cur)
            for k_, ln in enumerate(lines[:2]):
                d.text((x + 2, y + 4 + k_ * 21), ln, fill=(235, 235, 235) if cell else (120, 120, 128), font=font)
            im = imgs[i][j] if j < len(imgs[i]) else None
            if im is not None:
                g.paste(im, (x + (colw[j] - im.width) // 2, y + LAB))
            else:
                d.rectangle([x, y + LAB, x + colw[j], y + LAB + TH], outline=(70, 70, 80), width=2)
            x += colw[j] + PAD
        y += LAB + TH + PAD
    g.save(os.path.join(out, name + '.png'))
    print('wrote', os.path.join(out, name + '.png'), g.size)
