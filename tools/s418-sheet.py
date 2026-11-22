#!/usr/bin/env python3
"""S418 (UiB job 34 Part B): contact sheets of 2026's beats, the BEFORE row above the AFTER row.

  room stills (the probes' frames, <root>/<before|after>/<name>_<desktop|xr>.png):
    python3 tools/s418-sheet.py room <root> <SHEET_x.png> "<name>=<label>" ...
      rows: before · computer, after · computer, before · headset, after · headset
  close-ups of the screen (tools/s418-screens.mjs, <root>/<before|after>/screen/<name>.png):
    python3 tools/s418-sheet.py screens <root> <SHEET_x.png> [--after-only | --pairs] [--cols N] "<name>=<label>" ...
      rows: before, after (or the after frames alone, in story order, wrapped N to a row; or --pairs: each beat's before
      above its after, N beats to a row)
A missing frame is a dark tile marked 'none'. Labels are plain words."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

kind, root, out = sys.argv[1], sys.argv[2], sys.argv[3]
args = sys.argv[4:]
after_only = '--after-only' in args
cols = 4
if '--cols' in args:
    cols = int(args[args.index('--cols') + 1])
    args = [a for i, a in enumerate(args) if a != '--cols' and (i == 0 or args[i - 1] != '--cols')]
frames = [a.split('=', 1) for a in args if '=' in a]
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
    big = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 21)
except Exception:
    font = big = ImageFont.load_default()

def tile(path, label, TW, TH, LAB=32):
    im = Image.new('RGB', (TW, TH + LAB), (26, 26, 30))
    d = ImageDraw.Draw(im)
    if os.path.exists(path):
        src = Image.open(path).convert('RGB')
        src.thumbnail((TW, TH), Image.LANCZOS)
        im.paste(src, ((TW - src.width) // 2, LAB + (TH - src.height) // 2))
    else:
        d.text((TW // 2 - 20, LAB + TH // 2 - 10), 'none', fill=(140, 140, 150), font=font)
    d.text((8, 6), label[:72], fill=(238, 238, 238), font=font)
    return im

PAD, HEAD = 10, 210
if kind == 'room':
    TW, TH = 520, 300
    rows = [('before', 'desktop', 'BEFORE|job 33, 7763b962|computer'), ('after', 'desktop', 'AFTER|S418|computer'),
            ('before', 'xr', 'BEFORE|job 33, 7763b962|headset'), ('after', 'xr', 'AFTER|S418|headset')]
    W = HEAD + len(frames) * (TW + PAD) + PAD
    H = len(rows) * (TH + 32 + PAD) + PAD
    g = Image.new('RGB', (W, H), (12, 12, 14)); d = ImageDraw.Draw(g)
    for r, (when, mode, title) in enumerate(rows):
        y = PAD + r * (TH + 32 + PAD)
        for k, line in enumerate(title.split('|')):
            d.text((12, y + 110 + k * 28), line, fill=(255, 214, 120) if when == 'after' else (190, 190, 200), font=big)
        for c, (name, label) in enumerate(frames):
            g.paste(tile(os.path.join(root, when, f'{name}_{mode}.png'), f'{name} · {label}', TW, TH), (HEAD + PAD + c * (TW + PAD), y))
else:
    TW, TH = 710, 384
    if '--pairs' in args:
        # each beat a cell: its before close-up above its after one, `cols` cells to a row, in story order
        TW, TH = 560, 303
        n = len(frames); nr = (n + cols - 1) // cols
        CH = 2 * (TH + 32) + 6
        W = cols * (TW + PAD) + PAD
        H = nr * (CH + 14) + PAD
        g = Image.new('RGB', (W, H), (12, 12, 14))
        for i, (name, label) in enumerate(frames):
            r, c = divmod(i, cols)
            x, y = PAD + c * (TW + PAD), PAD + r * (CH + 14)
            g.paste(tile(os.path.join(root, 'before', 'screen', f'{name}.png'), f'BEFORE · {label}', TW, TH), (x, y))
            g.paste(tile(os.path.join(root, 'after', 'screen', f'{name}.png'), f'AFTER · {label}', TW, TH), (x, y + TH + 38))
    elif after_only:
        n = len(frames); nr = (n + cols - 1) // cols
        W = cols * (TW + PAD) + PAD
        H = nr * (TH + 32 + PAD) + PAD
        g = Image.new('RGB', (W, H), (12, 12, 14))
        for i, (name, label) in enumerate(frames):
            r, c = divmod(i, cols)
            g.paste(tile(os.path.join(root, 'after', 'screen', f'{name}.png'), f'{i + 1}. {label}', TW, TH), (PAD + c * (TW + PAD), PAD + r * (TH + 32 + PAD)))
    else:
        rows = [('before', 'BEFORE|job 33|7763b962'), ('after', 'AFTER|S418')]
        W = HEAD + len(frames) * (TW + PAD) + PAD
        H = len(rows) * (TH + 32 + PAD) + PAD
        g = Image.new('RGB', (W, H), (12, 12, 14)); d = ImageDraw.Draw(g)
        for r, (when, title) in enumerate(rows):
            y = PAD + r * (TH + 32 + PAD)
            for k, line in enumerate(title.split('|')):
                d.text((12, y + 150 + k * 28), line, fill=(255, 214, 120) if when == 'after' else (190, 190, 200), font=big)
            for c, (name, label) in enumerate(frames):
                g.paste(tile(os.path.join(root, when, 'screen', f'{name}.png'), f'{name} · {label}', TW, TH), (HEAD + PAD + c * (TW + PAD), y))
g.save(out)
print(f'{out}: {len(frames)} frames')
