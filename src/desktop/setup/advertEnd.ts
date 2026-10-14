import { reducedMotion } from '../../state/motion';
/**
 * ⚑ S242 — THE ADVERT'S END CARD (the lead, 2026-10-13: "add the same effect from the screen saver,
 * and from the noise it becomes 'Over 30 years sold as Care!' and keep the scroll 'not therapy, not a cure'").
 *
 * When the "Discover the New You" infomercial has played to its end (never after Skip) the player window
 * fills with TV noise (~1 s, era greys), and the noise's dots GATHER — the same gathering as the Leave
 * page's starfield (src/frame/leavePage.ts `starfield`, the same 3×5 DOT font) — into
 *   OVER 30 YEARS / SOLD AS CARE!
 * Under it the infomercial's own small print crawls, slowly: the exact line from data/dialog/s2_media.json.
 * Then the Sources pointer and a Close button (the Close is the setup's, published by setup.ts).
 *
 * Frame voice; no assistant; no sound; no storage. Reduced motion: no noise, no gather, no crawl — the
 * text simply appears. Flash safety: the noise is a spatially even random field in greys (mean luminance
 * constant) re-drawn ~12×/s, and it fades out as the dots gather; nothing blinks.
 */
import copy from '../../../data/strings/setup.json';
import media from '../../../data/dialog/s2_media.json';
import { ERA1 as P } from '../theme/era1';
import * as ui from '../theme/chrome';
import { DOT } from '../../frame/leavePage';

type Rect = { x: number; y: number; w: number; h: number };

const NOISE_S = 1.0;       // full static
const MOVE_S = 1.6;        // the dots gather (the starfield's gather, a little quicker)
const NOISE_TICK = 1 / 12; // the noise re-rolls ~12×/s
const CELL = 7;            // DOT cell, canvas px
const TEXT_AT = NOISE_S + MOVE_S * 0.6;   // the small print and the pointer arrive once the static has mostly gone
const TOP = 26;            // the gathered title sits this far below the window's top edge
const DOT_PX = CELL - Math.ceil(CELL / 4);
const CRAWL_PX_S = 36;     // slow: the fine print is meant to be read
const NOISE_COLOURS = [P.black, P.greyDark, P.grey, P.silver];

/** the infomercial's own small print — the exact line, not a copy of it */
export const SMALL_PRINT: string = media.scenes.find(s => /not a cure/.test(s.line))?.line ?? '';

const smooth = (k: number): number => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class AdvertEndCard {
  /** seconds since the card opened (a still can set it) */
  t = 0;
  get reduced(): boolean { return reducedMotion(); }
  private noise: HTMLCanvasElement | null = null;
  private noiseAt = -1;
  private noiseW = 0;
  private noiseH = 0;
  private particles: { sx: number; sy: number; tx: number; ty: number; has: boolean }[] = [];
  private built = '';

  update(dt: number): void { this.t += dt; }
  /** needs a fresh frame every tick (noise, gather, crawl); reduced motion draws once */
  get animating(): boolean { return !this.reduced; }

  private build(c: Rect): void {
    const key = `${c.x}:${c.y}:${c.w}`;
    if (key === this.built) return;
    this.built = key;
    const lines = copy.advertAsterisk.gather;
    const lineH = 6 * CELL + CELL;
    const top = c.y + TOP;
    const targets: { x: number; y: number }[] = [];
    lines.forEach((line, li) => {
      const w = line.length * 4 * CELL - CELL;
      const x0 = Math.round(c.x + (c.w - w) / 2), y0 = top + li * lineH;
      [...line].forEach((ch, ci) => {
        const g = DOT[ch] ?? DOT[' '];
        for (let i = 0; i < 15; i++) if (g[i] === '1') targets.push({ x: x0 + ci * 4 * CELL + (i % 3) * CELL, y: y0 + Math.floor(i / 3) * CELL });
      });
    });
    const rand = rng(1997);
    const n = targets.length + 70;
    this.particles = Array.from({ length: n }, (_, i) => ({
      sx: c.x + rand() * c.w, sy: c.y + rand() * c.h,
      tx: targets[i]?.x ?? 0, ty: targets[i]?.y ?? 0, has: i < targets.length
    }));
  }

  /** the static: a small random-grey image scaled up with no smoothing (cheap, and chunky like a CRT) */
  private drawNoise(ctx: CanvasRenderingContext2D, c: Rect, alpha: number): void {
    const cell = 3, w = Math.ceil(c.w / cell), h = Math.ceil(c.h / cell);
    if (!this.noise) this.noise = document.createElement('canvas');
    if (this.noiseW !== w || this.noiseH !== h) { this.noise.width = w; this.noise.height = h; this.noiseW = w; this.noiseH = h; this.noiseAt = -1; }
    const tick = Math.floor(this.t / NOISE_TICK);
    if (tick !== this.noiseAt) {
      this.noiseAt = tick;
      const g = this.noise.getContext('2d')!;
      const img = g.createImageData(w, h);
      const rand = rng(tick * 7919 + 13);
      const pal = NOISE_COLOURS.map(rgb);
      for (let i = 0; i < w * h; i++) {
        const [r, gg, b] = pal[Math.floor(rand() * pal.length)];
        img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
    ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.noise, c.x, c.y, w * cell, h * cell);
    ctx.restore();
  }

  /** Paints the player-window's client area `c`. The Close button is the setup's own. */
  draw(ctx: CanvasRenderingContext2D, c: Rect): void {
    this.build(c);
    ui.px(ctx, c.x, c.y, c.w, c.h, P.black);
    const settled = this.reduced || this.t >= NOISE_S + MOVE_S;
    const e = this.reduced ? 1 : smooth((this.t - NOISE_S) / MOVE_S);
    if (!this.reduced && this.t < NOISE_S + MOVE_S) this.drawNoise(ctx, c, 1 - e);
    if (settled || this.t >= NOISE_S) {
      for (const p of this.particles) {
        if (!p.has && e > 0.85) continue;
        const x = p.has ? p.sx + (p.tx - p.sx) * e : p.sx, y = p.has ? p.sy + (p.ty - p.sy) * e : p.sy;
        const size = p.has && e > 0.5 ? DOT_PX : 2;
        ui.px(ctx, x, y, size, size, p.has ? P.white : P.silver);
      }
    }
    // the small print and the pointer arrive as the dots do (immediately, under reduced motion)
    if (this.reduced || this.t >= TEXT_AT) {
      const bandY = c.y + TOP + 2 * (7 * CELL) + 26;
      ui.px(ctx, c.x, bandY, c.w, 1, P.greyDark);
      ui.px(ctx, c.x, bandY + 36, c.w, 1, P.greyDark);
      ctx.save();
      ctx.beginPath(); ctx.rect(c.x, bandY + 1, c.w, 35); ctx.clip();
      ui.setFont(ctx, 13); ctx.fillStyle = P.tooltip;
      if (this.reduced) {
        const lines = ui.wrapText(ctx, SMALL_PRINT, c.w - 24);
        lines.forEach((l, i) => ctx.fillText(l, c.x + 12, bandY + 4 + i * 15));
      } else {
        const tw = Math.ceil(ctx.measureText(SMALL_PRINT).width), travel = c.w + tw;
        const x = Math.round(c.x + c.w - (((this.t - TEXT_AT) * CRAWL_PX_S) % travel));
        ctx.fillText(SMALL_PRINT, x, bandY + 11);
      }
      ctx.restore();
      ui.setFont(ctx, 11); ctx.fillStyle = P.white;
      ui.wrapText(ctx, copy.advertAsterisk.sources, c.w - 24).forEach((l, i) => ctx.fillText(l, c.x + 12, bandY + 52 + i * 16));
    }
  }
}
