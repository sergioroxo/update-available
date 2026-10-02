/**
 * ⚑ S208 — THE SCREENSAVERS (data/strings/screensavers.json `_doc`; his, 2026-10-01: "inspired by the 95 ones…
 * relevant to the topic and the style of the experience… be creative about it").
 *
 * Each era's machine sleeps the way machines of its day did, and each sleep belongs to whoever owns the machine:
 *   stars — 1997, before the kit: the PC's own starfield (his machine, still his).
 *   text  — 1997, after the kit: the kit has replaced it with its own sign-off, WALK ON, in tumbling chrome 3D text.
 *   lambs — 2003: Restorify's flock flying out of the dark, haloed, all one way — and one lamb, halo-less, flying
 *           the other way, smaller and smaller, never caught.
 *   lock  — 2016: GracePlatform's lock screen: a sunrise, the time, a line of inspiration, "Like what you see?",
 *           and the corrections still counting up while she is away.
 *   orb   — 2026: GraceOS's breathing orb, wellness words circling it.
 *
 * Diegetic: the machine, not the piece. Nothing is filed. A press wakes it and does nothing else; the hosts (os.ts,
 * graceQueueLite.ts, browser.ts) decide WHEN — only after SAVER_SECONDS of no press, nothing open, nothing playing.
 * Pixel discipline: whole-pixel rects in each era's palette, banded (never smooth) light; it steps at ~11 Hz so the
 * monitor's texture uploads only when something moved.
 */
import { ERA1 } from '../theme/era1';
import { ERA3 } from '../theme/era3';
import { ERA4 } from '../theme/era4';
import * as ui from '../theme/chrome';
import S from '../../../data/strings/screensavers.json';

export type SaverKind = 'stars' | 'text' | 'lambs' | 'lock' | 'orb';
/** how long a desktop must be quiet — no press, nothing open, nothing playing — before its machine sleeps */
export const SAVER_SECONDS = 150;
const STEP_S = 0.09;

export class Screensaver {
  private acc = 0;
  private t = 0;
  private seed: number;
  private pts: Array<{ x: number; y: number; z: number; against?: boolean }> = [];
  private voxels: Array<[number, number]> = [];
  private vw = 0; private vh = 0;
  /** 2016: the clock the room already shows, and the open jobs the counter starts from */
  clock = '';
  waitingFrom = 3;
  /** 2026: the line under the orb (the arrival's "press to restore", or the idle's "press to continue") */
  line = '';

  constructor(readonly kind: SaverKind, seed = 1997) {
    this.seed = seed;
    if (kind === 'stars') for (let i = 0; i < 110; i++) this.pts.push(this.spawn(true));
    if (kind === 'lambs') {
      for (let i = 0; i < 26; i++) this.pts.push(this.spawn(true));
      this.pts.push({ x: 0.15, y: -0.1, z: 1.2, against: true });
    }
    if (kind === 'text') this.buildVoxels();
  }

  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private spawn(anyDepth: boolean): { x: number; y: number; z: number } {
    return { x: (this.rnd() - 0.5) * 2.4, y: (this.rnd() - 0.5) * 1.8, z: anyDepth ? 0.3 + this.rnd() * 3.7 : 4 };
  }

  /** true when the picture changed (the host marks its canvas dirty) */
  update(dt: number): boolean {
    this.acc += dt;
    if (this.acc < STEP_S) return false;
    const step = this.acc; this.acc = 0; this.t += step;
    if (this.kind === 'stars' || this.kind === 'lambs') {
      const speed = this.kind === 'stars' ? 1.3 : 0.55;
      for (let i = 0; i < this.pts.length; i++) {
        const p = this.pts[i];
        if (p.against) { p.z += step * 0.12; if (p.z > 4.5) { p.z = 0.9; p.x = (this.rnd() - 0.5) * 0.6; p.y = (this.rnd() - 0.5) * 0.4; } continue; }
        p.z -= step * speed;
        if (p.z < 0.25) this.pts[i] = this.spawn(false);
      }
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    switch (this.kind) {
      case 'stars': this.drawStars(ctx, W, H); return;
      case 'text': this.drawText(ctx, W, H); return;
      case 'lambs': this.drawLambs(ctx, W, H); return;
      case 'lock': this.drawLock(ctx, W, H); return;
      case 'orb': this.drawOrb(ctx, W, H); return;
    }
  }

  // ── 1997 · the PC's own starfield ─────────────────────────────────────
  private drawStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    const f = W * 0.42;
    for (const p of this.pts) {
      const x = Math.round(W / 2 + (p.x * f) / p.z), y = Math.round(H / 2 + (p.y * f) / p.z);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const near = p.z < 1 ? 2 : 1;
      ctx.fillStyle = p.z < 1.2 ? ERA1.white : p.z < 2.4 ? ERA1.silver : ERA1.grey;
      ctx.fillRect(x, y, near, near);
    }
  }

  // ── 1997 · after the kit: WALK ON, in chrome ──────────────────────────
  /** the words as a grid of solid cells, read once off an offscreen canvas */
  private buildVoxels(): void {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return;
    c.width = 220; c.height = 40;
    const g = c.getContext('2d');
    if (!g) return;
    ui.setFont(g, 30);
    g.fillStyle = ERA1.white;
    const text = S.e1.text;
    const tw = Math.ceil(g.measureText(text).width);
    g.fillText(text, Math.round((c.width - tw) / 2), 4);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const CELL = 2;
    const raw: Array<[number, number]> = [];
    for (let y = 0; y < c.height; y += CELL) for (let x = 0; x < c.width; x += CELL) {
      if (d[(y * c.width + x) * 4 + 3] > 100) raw.push([x / CELL, y / CELL]);
    }
    if (!raw.length) return;
    const minX = Math.min(...raw.map((v) => v[0])), maxX = Math.max(...raw.map((v) => v[0]));
    const minY = Math.min(...raw.map((v) => v[1])), maxY = Math.max(...raw.map((v) => v[1]));
    this.vw = maxX - minX + 1; this.vh = maxY - minY + 1;
    this.voxels = raw.map(([x, y]) => [x - minX, y - minY]);
  }

  private drawText(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    if (!this.voxels.length) return;
    const ry = this.t * 0.9, rx = Math.sin(this.t * 0.37) * 0.35;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const scale = (W * 0.8) / this.vw;
    const DEPTH = 5;
    // the chrome: hard reflection bands down the letters, as the period's chrome text had them
    const chrome = [ERA1.white, ERA1.silver, ERA1.titleBlue, ERA1.navy, ERA1.silver, ERA1.white];
    const front = cy >= 0;
    for (let layer = DEPTH; layer >= 0; layer--) {
      const z = ((front ? layer : DEPTH - layer) - DEPTH / 2) * 1.6;
      for (const [vx, vy] of this.voxels) {
        const x0 = vx - this.vw / 2, y0 = vy - this.vh / 2;
        const x1 = x0 * cy + z * sy, z1 = -x0 * sy + z * cy;
        const y1 = y0 * cx - z1 * sx, z2 = y0 * sx + z1 * cx;
        const persp = 60 / (60 + z2);
        const px = Math.round(W / 2 + x1 * scale * persp), py = Math.round(H / 2 + y1 * scale * persp);
        const sz = Math.max(1, Math.ceil(scale * persp));
        if (layer === 0) ctx.fillStyle = chrome[Math.min(chrome.length - 1, Math.floor((vy / this.vh) * chrome.length))];
        else ctx.fillStyle = layer > DEPTH / 2 ? ERA1.greyDark : ERA1.grey;
        ctx.fillRect(px, py, sz, sz);
      }
    }
  }

  // ── 2003 · Restorify's flock ──────────────────────────────────────────
  private drawLambs(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    const f = W * 0.42;
    const order = [...this.pts].sort((a, b) => b.z - a.z);   // far first
    for (const p of order) {
      const x = Math.round(W / 2 + (p.x * f) / p.z), y = Math.round(H / 2 + (p.y * f) / p.z);
      const s = Math.max(1, Math.round(6 / p.z));
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      this.lamb(ctx, x, y, s, !p.against, p.z);
    }
  }

  /** a pixel lamb at unit size s: a cloud of wool, a dark face, four legs, and (for the flock) a halo */
  private lamb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, halo: boolean, z: number): void {
    const wool = z > 2.6 ? ERA1.grey : z > 1.4 ? ERA1.silver : ERA1.white;
    ctx.fillStyle = wool;
    ctx.fillRect(x - 3 * s, y - s, 6 * s, 3 * s);
    ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillRect(x + 2 * s, y - 2 * s, 2 * s, 2 * s);   // the face, looking ahead
    for (const lx of [-2, -1, 1, 2]) ctx.fillRect(x + lx * s, y + 2 * s, Math.max(1, Math.round(s / 2)), 2 * s);
    if (halo) {
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillRect(x + s, y - 4 * s, 4 * s, Math.max(1, Math.round(s / 2)));
    }
  }

  // ── 2016 · GracePlatform's lock screen ────────────────────────────────
  private drawLock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // a dawn in bands, the sun rising slowly, two ridges and a lake
    const bands = [ERA3.deskTop, ERA3.deskMid, ERA3.deskLow, ERA3.accentHi, ERA3.glow];
    const skyH = Math.round(H * 0.6);
    bands.forEach((c, i) => ui.px(ctx, 0, Math.round((i * skyH) / bands.length), W, Math.ceil(skyH / bands.length) + 1, c));
    const sunY = Math.round(skyH * 0.7 - Math.min(40, this.t * 0.5));
    const sunR = Math.round(H * 0.07);
    ctx.fillStyle = ERA3.amber;
    for (let dy = -sunR; dy <= sunR; dy++) { const w = Math.round(Math.sqrt(sunR * sunR - dy * dy)); ctx.fillRect(Math.round(W * 0.68) - w, sunY + dy, w * 2, 1); }
    const ridge = (base: number, amp: number, freq: number, col: string): void => {
      ctx.fillStyle = col;
      for (let x = 0; x < W; x += 2) { const h = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * freq + amp))); ctx.fillRect(x, h, 2, skyH + 2 - h); }
    };
    ridge(skyH, H * 0.12, 0.011, ERA3.greyDk);
    ridge(skyH, H * 0.06, 0.023, ERA3.ink);
    ui.px(ctx, 0, skyH, W, H - skyH, ERA3.deskTop);
    for (let i = 0; i < 6; i++) ui.px(ctx, Math.round(W * 0.68) - 30 + ((i * 17) % 23), skyH + 6 + i * 9, 60 - i * 8, 2, ERA3.amber);
    // the time, the brand
    ui.setFont(ctx, 44); this.shadowed(ctx, this.clock, 28, 26, ERA3.white);
    ui.setFont(ctx, 12); this.shadowed(ctx, S.e3.brand, 30, 78, ERA3.glassEdge);
    // the line of inspiration, bottom left
    ui.setFont(ctx, 16); this.shadowed(ctx, S.e3.quote, 28, H - 74, ERA3.white);
    ui.setFont(ctx, 10); this.shadowed(ctx, S.e3.quoteBy, 30, H - 52, ERA3.glassEdge);
    // "Like what you see?" — the platform asks for a preference even now
    ui.setFont(ctx, 11);
    const lw = Math.ceil(ctx.measureText(S.e3.like).width);
    const lx = W - lw - 92, ly = 30;
    this.shadowed(ctx, S.e3.like, lx, ly, ERA3.white);
    for (const [i, up] of [[0, true], [1, false]] as Array<[number, boolean]>) {
      const bx = W - 80 + i * 34, by = ly - 4;
      ui.px(ctx, bx, by, 26, 20, ERA3.taskMid);
      ui.px(ctx, bx, by, 26, 1, ERA3.glassEdge);
      ctx.fillStyle = ERA3.white;   // a chevron, up or down
      for (let k = 0; k < 4; k++) ctx.fillRect(bx + 13 - (3 - k) - 1, by + (up ? 6 + k : 13 - k), (3 - k) * 2 + 2, 1);
    }
    // the work does not stop when she does
    const n = this.waitingFrom + Math.floor(this.t / 18);
    const msg = S.e3.waiting.replace('{n}', String(n));
    ui.setFont(ctx, 11);
    const mw = Math.ceil(ctx.measureText(msg).width) + 34;
    ui.px(ctx, W - mw - 24, H - 62, mw, 26, ERA3.taskBot);
    ui.px(ctx, W - mw - 24, H - 62, 3, 26, ERA3.amber);
    ui.px(ctx, W - mw - 12, H - 53, 8, 8, ERA3.amber);
    ctx.fillStyle = ERA3.white; ctx.fillText(msg, W - mw + 2, H - 55);
  }

  private shadowed(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, col: string): void {
    ctx.fillStyle = ERA3.ink; ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }

  // ── 2026 · GraceOS's breathing orb ────────────────────────────────────
  private drawOrb(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA4.field);
    const period = 8;
    const ph = (this.t % period) / period;   // 0..1: in for the first half, out for the second
    const breath = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const cx = Math.round(W / 2), cy = Math.round(H * 0.46);
    const R = Math.round(Math.min(W, H) * (0.16 + 0.08 * breath));
    const rings = [ERA4.panelHi, ERA4.rule, ERA4.lBand, ERA4.lDim, ERA4.l, ERA4.glow];
    rings.forEach((col, i) => {   // banded, outermost first
      const r = Math.round(R * (1.5 - i * 0.2));
      if (r <= 0) return;
      ctx.fillStyle = col;
      for (let dy = -r; dy <= r; dy += 2) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(cx - w, cy + dy, w * 2, 2); }
    });
    // the words that circle it: one at a time, a slow orbit
    const aff = S.e4.affirmations;
    const ai = Math.floor(this.t / 6) % aff.length;
    const ang = this.t * 0.25;
    ui.setFont(ctx, 11);
    const word = aff[ai];
    const ww = ctx.measureText(word).width;
    const ox = Math.round(cx + Math.cos(ang) * R * 1.9 - ww / 2), oy = Math.round(cy + Math.sin(ang) * R * 1.25);
    ctx.fillStyle = ERA4.meta; ctx.fillText(word, ox, oy);
    // in / out
    ui.setFont(ctx, 14);
    const cue = ph < 0.5 ? S.e4.in : S.e4.out;
    const cw = ctx.measureText(cue).width;
    ctx.fillStyle = ERA4.textHi; ctx.fillText(cue, Math.round(cx - cw / 2), cy + Math.round(R * 1.6) + 6);
    ui.setFont(ctx, 12);
    const mw = ctx.measureText(S.e4.mark).width;
    ctx.fillStyle = ERA4.dim; ctx.fillText(S.e4.mark, Math.round(cx - mw / 2), 22);
    if (this.line) {
      ui.setFont(ctx, 9);
      const lw = ctx.measureText(this.line).width;
      ctx.fillStyle = ERA4.dim; ctx.fillText(this.line, Math.round((W - lw) / 2), H - 30);
    }
  }
}
