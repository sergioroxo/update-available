#!/usr/bin/env python3
"""S423 (UiB job 35 Part C): the contact sheets, the before row over the after row, each frame labelled in plain words.
   python3 tools/s423-sheets.py <session folder>
The folder holds before/ and after/ (the same names in both):
   update_##_<screen>_<look>.png                 (tools/s423-update-stills.mjs)
   flight_<look>/f###.jpg + flight_<look>.json   (tools/s423-flight-probe.mjs: the rows of report.json for that look)
Writes SHEET_update.png (per look: a before row and an after row, screen by screen) and SHEET_flight_<look>.png (pairs of
rows, before over after, at the same second of the flight, every 1.5 s from the rise to the landing, with the whitest
frame of each run put in at its own second and marked)."""
import glob, json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1]
try:
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
    big = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 22)
except Exception:
    font = big = ImageFont.load_default()
LOOKS = {'desktop': 'computer', 'phone': 'phone', 'xr': 'headset mock'}
SCREEN = {'notice': 'the notice', 'deferred': 'Remind me later, pressed', 'notice-again': 'the notice back (spent)',
          'install-early': 'install, early', 'install-changelog': 'install, changelog typed',
          'install-report': 'install, L registered', 'restart': 'Restarting…'}

def tile(path, label, w, h, crop=None, mark=False):
    im = Image.new('RGB', (w, h + 26), (24, 24, 28))
    if path and os.path.exists(path):
        src = Image.open(path).convert('RGB')
        if crop:
            W, H = src.size
            src = src.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
        src.thumbnail((w, h), Image.LANCZOS)
        im.paste(src, ((w - src.width) // 2, 26 + (h - src.height) // 2))
    d = ImageDraw.Draw(im)
    d.text((5, 5), label[:int(w / 9)], fill=(255, 90, 90) if mark else (235, 235, 235), font=font)
    if mark:
        d.rectangle([0, 0, w - 1, h + 25], outline=(255, 60, 60), width=3)
    return im

def row_label(text, w, h):
    im = Image.new('RGB', (w, h + 26), (10, 10, 12))
    ImageDraw.Draw(im).multiline_text((8, 30), text, fill=(255, 220, 120), font=big, spacing=6)
    return im

def sheet(rows, title, out):
    # rows: list of lists of PIL tiles (same height per row)
    W = max(sum(t.width for t in r) for r in rows) + 8
    H = sum(r[0].height for r in rows) + 8 * len(rows) + 44
    g = Image.new('RGB', (W, H), (0, 0, 0))
    ImageDraw.Draw(g).text((8, 10), title, fill=(255, 255, 255), font=big)
    y = 44
    for r in rows:
        x = 0
        for t in r:
            g.paste(t, (x, y)); x += t.width
        y += r[0].height + 8
    g.save(out)
    print(out, g.size)

# ── SHEET_update ──
names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(root, 'after', 'update_*.png')))
rows = []
for look in LOOKS:
    screens = []
    for side in ('before', 'after'):
        for n in sorted(os.path.basename(p) for p in glob.glob(os.path.join(root, side, f'update_*_{look}.png'))):
            m = re.match(r'update_\d+_(.+)_' + look + r'\.png', n)
            if m and m.group(1) not in screens: screens.append(m.group(1))
    order = ['notice', 'deferred', 'notice-again'] + sorted(s for s in screens if s.startswith('terms')) + ['install-early', 'install-changelog', 'install-report', 'restart']
    screens = [s for s in order if s in screens]
    w, h = 420, 300
    # each look sees the monitor as part of a whole frame: the sheet shows the monitor's part of it, so its words can be
    # read (the stills themselves are whole, from the seat)
    crop = {'desktop': (0.30, 0.10, 0.80, 0.74), 'phone': (0.30, 0.16, 0.78, 0.82), 'xr': (0.27, 0.36, 0.82, 0.70)}[look]
    for side in ('before', 'after'):
        r = [row_label(f'{side.upper()}\n{LOOKS[look]}', 170, h)]
        for s in screens:
            hit = glob.glob(os.path.join(root, side, f'update_*_{s}_{look}.png'))
            label = SCREEN.get(s) or (f'terms, page {s[7:]}' if s.startswith('terms-p') else s)
            r.append(tile(hit[0] if hit else None, label if hit else f'{label}: (no such screen)', w, h, crop))
        rows.append(r)
sheet(rows, '2016 → 2026, the update from Vera\'s chair · before (0ee79d30) over after (S423) · each tile the monitor\'s part of the frame (whole stills beside the sheet)', os.path.join(root, 'SHEET_update.png'))

# ── SHEET_flight_<look> ──
for look in LOOKS:
    runs = {}
    for side in ('before', 'after'):
        p = os.path.join(root, side, f'flight_{look}.json')
        if os.path.exists(p): runs[side] = json.load(open(p))
    if len(runs) < 2: continue
    end = max(max((f['t'] for f in r['rows'] if f.get('leg')), default=0) for r in runs.values()) + 1.0
    times = [round(0.25 + 1.5 * i, 2) for i in range(int(end / 1.5) + 1)]
    whitest = {s: max(r['rows'], key=lambda f: f.get('white', 0)) for s, r in runs.items()}
    for s, f in whitest.items():
        if f.get('white', 0) >= 0.5 and not any(abs(t - f['t']) < 0.05 for t in times):
            times.append(f['t'])
    times.sort()
    w, h = (220, 220) if look == 'xr' else (300, 169) if look == 'desktop' else (300, 139)
    cols = 12
    rows = []
    for c0 in range(0, len(times), cols):
        chunk = times[c0:c0 + cols]
        for side in ('before', 'after'):
            r = [row_label(f'{side.upper()}', 120, h)]
            for t in chunk:
                f = min(runs[side]['rows'], key=lambda x: abs(x['t'] - t))
                void = f.get('white', 0) >= 0.5
                label = f"{f['t']:.2f}s {f.get('leg') or 'landed'} {f['yaw']}°" + (f" WHITE {f['white']:.0f}%" if void else '')
                r.append(tile(os.path.join(root, side, f'flight_{look}', f['file']), label, w, h, None, void))
            rows.append(r)
    pk = {s: (r.get('peakDraws'), (r.get('peakAt') or {}).get('leg')) for s, r in runs.items()}
    sheet(rows, f"2016 → 2026, the flight · {LOOKS[look]} · before (0ee79d30) over after (S423), the same second · every 1.5 s, the whitest frame of each run added and marked red · draw peak before {pk['before'][0]} ({pk['before'][1]}) → after {pk['after'][0]} ({pk['after'][1]})",
          os.path.join(root, f'SHEET_flight_{look}.png'))
