/** Authored camera-roll sprites, rasterised once on demand. No asset requests or camera input. */
import { ERA3 } from '../theme/era3';
import { phoneFont, phoneWrap } from '../theme/phone';

export function makeE3PhotoSprites(busText: string): HTMLCanvasElement[] {
  return [0, 1, 2, 3, 4].map(index => {
    const c = document.createElement('canvas'); c.width = 72; c.height = 72;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const rect = (x: number, y: number, w: number, h: number, color: string): void => {
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    };
    if (index === 4) {
      rect(0, 0, 72, 72, ERA3.greyDk);
      rect(4, 18, 64, 32, ERA3.grey); rect(4, 48, 64, 4, ERA3.ink);
      rect(13, 52, 3, 20, ERA3.ink); rect(57, 52, 3, 20, ERA3.ink);
      // Two glasses at the corner table; the chair is empty.
      for (const x of [21, 43]) {
        rect(x, 24, 9, 13, ERA3.glassEdge); rect(x + 2, 27, 5, 8, ERA3.amber);
        rect(x + 4, 37, 1, 6, ERA3.white); rect(x + 1, 43, 7, 1, ERA3.white);
      }
      rect(24, 51, 25, 4, ERA3.titleB); rect(23, 54, 3, 18, ERA3.ink); rect(47, 54, 3, 18, ERA3.ink);
      rect(24, 57, 25, 3, ERA3.titleB);
      return c;
    }
    if (index === 3) {
      rect(0, 0, 72, 72, ERA3.white); rect(0, 0, 72, 12, ERA3.deskMid);
      rect(7, 20, 58, 1, ERA3.glassEdge); rect(7, 53, 58, 1, ERA3.glassEdge);
      phoneFont(ctx, 9, 600); ctx.fillStyle = ERA3.ink;
      phoneWrap(ctx, busText, 58).forEach((line, i) => ctx.fillText(line, 7, 28 + i * 12));
      return c;
    }
    rect(0, 0, 72, 72, ERA3.greyDk);
    // Same saucer and cake, the framing a couple of pixels apart.
    const dx = index === 1 ? 2 : 0, dy = index === 1 ? -1 : 0;
    ctx.save(); ctx.translate(dx, dy);
    rect(5, 48, 64, 16, ERA3.grey); rect(8, 44, 57, 16, ERA3.glassEdge);
    rect(14, 41, 46, 18, ERA3.white); rect(18, 55, 36, 3, ERA3.titleB);
    // A triangular slice: pale icing, two layers, one thin jam seam.
    const poly = (points: number[][], color: string): void => {
      ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill();
    };
    poly([[19,31],[48,23],[56,33],[27,42]], ERA3.memberBand);
    poly([[19,31],[27,42],[56,33],[56,45],[27,54],[19,43]], ERA3.amber);
    poly([[19,36],[27,47],[56,38],[56,41],[27,50],[19,39]], ERA3.rose);
    poly([[19,31],[48,23],[56,33],[27,42]], ERA3.memberBand);
    rect(26, 30, 2, 2, ERA3.rose); rect(40, 29, 2, 2, ERA3.rose); rect(33, 35, 2, 2, ERA3.rose);
    ctx.restore();
    if (index === 2) {
      // Offline-style horizontal smear, baked into this one sprite; no live filter.
      const copy = document.createElement('canvas'); copy.width=72; copy.height=72;
      copy.getContext('2d')!.drawImage(c,0,0);
      ctx.globalAlpha=0.35; ctx.drawImage(copy,-3,0); ctx.drawImage(copy,3,0); ctx.globalAlpha=1;
    }
    return c;
  });
}
