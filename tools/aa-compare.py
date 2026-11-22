"""AA COMPARE (S357fp) — for each still triple (aa0 = before, aa1 = MSAA on, mip = MSAA + the room's pictures smoothed
when shrunk), find the two areas where the three differ most and lay them out side by side, magnified with nearest
sampling so the stair-steps are visible. Writes <dir>/cmp/<era>-dpr<n>-<view>.png.
Usage: python3 tools/aa-compare.py out/aa"""
import sys, os, glob
from PIL import Image, ImageChops, ImageDraw
d = sys.argv[1]; os.makedirs(os.path.join(d, 'cmp'), exist_ok=True)
COLS = [('aa0', 'BEFORE: no anti-aliasing'), ('aa1', 'A: MSAA on (edges)'), ('mip', 'A + B: pictures smoothed when shrunk')]
for a_path in sorted(glob.glob(os.path.join(d, '*-aa0-*.png'))):
    paths = [a_path.replace('-aa0-', f'-{v}-') for v, _ in COLS]
    if not all(os.path.exists(p) for p in paths): continue
    ims = [Image.open(p).convert('RGB') for p in paths]
    dpr = 2 if ims[0].size[0] > 2000 else 1
    S = 112 * dpr
    diff = ImageChops.lighter(ImageChops.difference(ims[0], ims[1]), ImageChops.difference(ims[1], ims[2])).convert('L').point(lambda p: 255 if p > 24 else 0)
    W, H = ims[0].size; best = []
    for y in range(0, H - S, S // 2):
        for x in range(0, W - S, S // 2):
            best.append((sum(diff.crop((x, y, x + S, y + S)).histogram()[255:]), x, y))
    best.sort(reverse=True); picks = []
    for n, x, y in best:
        if all(abs(x - px) >= S or abs(y - py) >= S for _, px, py in picks): picks.append((n, x, y))
        if len(picks) == 2: break
    Z = 3 if dpr == 1 else 1.5
    tile = int(S * Z); out = Image.new('RGB', (tile * 3 + 40, (tile + 36) * len(picks) + 10), (24, 24, 28))
    dr = ImageDraw.Draw(out)
    for i, (n, x, y) in enumerate(picks):
        oy = 10 + i * (tile + 36)
        for j, (im, (_, label)) in enumerate(zip(ims, COLS)):
            ox = 10 + j * (tile + 10)
            dr.text((ox, oy), label, fill=(230, 230, 230))
            out.paste(im.crop((x, y, x + S, y + S)).resize((tile, tile), Image.NEAREST), (ox, oy + 16))
    tag = os.path.basename(a_path).replace('-aa0-', '-').replace('.png', '')
    out.save(os.path.join(d, 'cmp', tag + '.png')); print(tag, [(x, y, n) for n, x, y in picks])
