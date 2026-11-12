"""Draws the title screen's lettering at any size, centred, from the piece's own 3x5 dot font (src/frame/leavePage.ts DOT)
and its colours: backdrop #2C3A5C x 0.4 (data/room/cluster.json), the dots' white and blue-grey as rendered."""
import random, sys
from PIL import Image, ImageDraw
DOT = {'A':'010101111101101','D':'110101101101110','E':'111100110100111','H':'101101111101101','I':'111010010010111',
       'O':'010101101101010','R':'110101110101101','S':'011100010001110','T':'111010010010010','U':'101101101101111',
       'Y':'101101010010010','P':'110101110100100','F':'111100110100100','L':'100100100100111',' ':'0'*15}
LINES = ['YOUR UPDATE', 'HAS FAILED']
BG = (18, 23, 37); WHITE = (249, 250, 252); BLUE = (192, 202, 221)

def draw(W, H, frac, out, seed=7):
    rnd = random.Random(seed)
    widest = max(len(l) for l in LINES) * 4 - 1           # cells across the widest line
    cell = max(4, int(W * frac / widest))
    dot = cell - max(1, round(cell * 0.14))                 # a hair of gap between dots, as on screen
    block_h = (len(LINES) - 1) * 7 * cell + 5 * cell
    y0 = (H - block_h) // 2
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    # the stars: small points, a few brighter, kept off the lettering
    tx0 = (W - widest * cell) // 2 - cell; tx1 = W - tx0; ty0 = y0 - cell; ty1 = y0 + block_h + cell
    n = int(W * H / 2400)
    for _ in range(n):
        x, y = int(rnd.random() * W), int(rnd.random() * H)
        if tx0 < x < tx1 and ty0 < y < ty1: continue
        r = max(1, round(W / 1300 * rnd.choice([0.6, 0.8, 1, 1, 1.4, 2])))
        c = WHITE if rnd.random() < 0.55 else BLUE
        d.rectangle([x, y, x + r - 1, y + r - 1], fill=c)
    # the letters, each line centred on its own, as the entrance lays them out
    for li, line in enumerate(LINES):
        w = len(line) * 4 * cell - cell
        x0 = (W - w) // 2; yl = y0 + li * 7 * cell
        for ci, ch in enumerate(line):
            g = DOT[ch]
            for i in range(15):
                if g[i] == '1':
                    x = x0 + (ci * 4 + i % 3) * cell; y = yl + (i // 3) * cell
                    d.rectangle([x, y, x + dot - 1, y + dot - 1], fill=BLUE if rnd.random() < 0.15 else WHITE)
    im.save(out)
    return cell

if __name__ == '__main__':
    o = sys.argv[1]
    for W, H, frac, name in [(630, 500, 0.82, 'cover-630x500.png'), (1890, 1500, 0.82, 'cover-1890x1500.png'),
                             (1920, 1080, 0.66, 'title-16x9-1920x1080.png'), (3840, 2160, 0.66, 'title-16x9-3840x2160.png')]:
        print(name, 'cell', draw(W, H, frac, f'{o}/{name}'))
