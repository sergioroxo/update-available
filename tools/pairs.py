#!/usr/bin/env python3
"""Before/after pairs for the article (his 12 Nov: OneDrive gets only the comparisons).

    python3 tools/pairs.py <folder>      # reads <folder>/pairs-spec.json, writes <folder>/pairs/<name>.png

pairs-spec.json is a list of {"name", "before", "after", "bl", "al"}: the two images (paths relative to <folder>) side by
side at the same height, each with its caption strip above it. Nothing else is read or written.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in ('/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main(folder):
    root = Path(folder)
    spec = json.loads((root / 'pairs-spec.json').read_text())
    out = root / 'pairs'
    out.mkdir(exist_ok=True)
    for p in spec:
        a = Image.open(root / p['before']).convert('RGB')
        b = Image.open(root / p['after']).convert('RGB')
        h = min(a.height, b.height, 1440)
        a = a.resize((round(a.width * h / a.height), h))
        b = b.resize((round(b.width * h / b.height), h))
        cap, gap = max(44, h // 24), 16
        f = font(round(cap * 0.55))
        im = Image.new('RGB', (a.width + b.width + gap, h + cap), (24, 24, 28))
        im.paste(a, (0, cap))
        im.paste(b, (a.width + gap, cap))
        d = ImageDraw.Draw(im)
        d.text((12, cap * 0.2), p['bl'], fill=(230, 230, 230), font=f)
        d.text((a.width + gap + 12, cap * 0.2), p['al'], fill=(255, 236, 160), font=f)
        im.save(out / f"{p['name']}.png", optimize=True)
        print('pair', p['name'])


if __name__ == '__main__':
    main(sys.argv[1])
