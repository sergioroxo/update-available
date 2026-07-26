/**
 * Standalone Lamby rig lab (master plan R9-4).
 *
 * This route answers one question only: can Lamby-as-Clippy be drawn and
 * animated procedurally on canvas with era-1 palette discipline? It is mounted
 * by `?lambyrig=1` and deliberately does not touch DesktopOS, provotypes, or
 * any OS launcher surface.
 *
 * ⚑ SESSION 48 — THE LAB NO LONGER OWNS THE CHARACTER. It used to carry its
 * own private copy of the pose math and every drawing method, which S45 then
 * PORTED into `src/desktop/apps/lambyChar.ts` for the game: two Lambys, and a
 * restyle that had to be made twice or silently diverge. The character now has
 * exactly ONE definition — `drawLambyChar` — and this lab imports it. What
 * stays here is what is genuinely the LAB's: the stage, the mood/action
 * controls, the `disappear` reveal wipe, and the speech bubble (the game's
 * alert window carries Lamby's lines in its own type area, so it never wants
 * one). Change his look in lambyChar.ts and both surfaces change together.
 *
 * ⚑ SESSION 55 — THE PANEL IS NOW SHARED TOO. `LambyRigPanel` below (stage +
 * puppet + caption + mood/action controls, exported) is the SAME content the
 * `?lambyrig=1` lab and `src/desktop/apps/lambyRigFile.ts` (the Era-1
 * found-file easter egg, docs/REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md Part
 * 2) both draw — one definition, reused, never forked. Each HOST still owns
 * its own window chrome (`ui.windowFrame`, its own close box) exactly the way
 * every other windowed surface in this codebase does; the panel only draws
 * what goes INSIDE a caller-supplied content rect. `RIG_WINDOW_W/H` is the one
 * shared size, tuned to clear the desktop OS's taskbar (see lambyRigFile.ts)
 * as well as the lab's own bare canvas.
 */
import { ERA1, ERA1_CANVAS } from '../desktop/theme/era1';
import * as ui from '../desktop/theme/chrome';
import { drawLambyChar, type LambyMood, type LambyAction } from '../desktop/apps/lambyChar';
import copy from '../../data/strings/lamby_rig.json';

export type Mood = LambyMood;
export type Action = LambyAction;

export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

const W = ERA1_CANVAS.width;
const H = ERA1_CANVAS.height;
export const RIG_MOODS: Mood[] = ['cheerful', 'clinical', 'sterile', 'sad'];
export const RIG_ACTIONS: Action[] = ['idle', 'point', 'appear', 'disappear'];

/** the one shared window size both hosts draw at (24,10) — short enough to
 *  clear the desktop OS's taskbar (H-22) with room to spare; the lab's own
 *  bare canvas has no taskbar to clear, so the same size is simply tidier
 *  there too. */
export const RIG_WINDOW_W = 464;
export const RIG_WINDOW_H = 344;

export function isMood(value: string | null): value is Mood {
  return value === 'cheerful' || value === 'clinical' || value === 'sterile' || value === 'sad';
}

export function isAction(value: string | null): value is Action {
  return value === 'idle' || value === 'point' || value === 'appear' || value === 'disappear';
}

/**
 * The rig's shareable content: stage, puppet, caption and mood/action
 * controls, drawn inside a caller-owned `ui.ContentRect`. Window chrome
 * (`ui.windowFrame`, the close box) stays each host's own — same pattern as
 * every other windowed app in `src/desktop/apps/`. State (mood/action) lives
 * here so both hosts see identical behavior for free.
 */
export class LambyRigPanel {
  mood: Mood;
  action: Action;
  private moodStart = 0;

  constructor(initialMood: Mood = 'cheerful', initialAction: Action = 'idle') {
    this.mood = initialMood;
    this.action = initialAction;
  }

  /** draws stage+puppet+caption+controls inside `content`; returns this
   *  frame's hit rects (mood:/action: ids only, absolute canvas coords) —
   *  the caller merges them into its own hit-testing. */
  draw(ctx: CanvasRenderingContext2D, content: ui.ContentRect, t: number, hover: string): Hit[] {
    const hits: Hit[] = [];
    this.drawStage(ctx, content.x + 10, content.y + 10, content.w - 20, 190);
    this.drawLamby(ctx, 250, 182, t);
    this.drawCaption(ctx, content.x + 20, content.y + 208, content.w - 40);
    this.drawControls(ctx, content.x + 20, content.y + 240, hover, hits);
    return hits;
  }

  /** applies a mood:/action: hit id; returns true if it recognized one. */
  handleClick(id: string, t: number): boolean {
    if (id.startsWith('mood:')) {
      this.mood = id.slice(5) as Mood;
      this.moodStart = t;
      return true;
    }
    if (id.startsWith('action:')) {
      this.action = id.slice(7) as Action;
      return true;
    }
    return false;
  }

  private drawStage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.px(ctx, x, y, w, h, ERA1.black);
    ui.px(ctx, x, y, w, 1, ERA1.grey);
    ui.px(ctx, x, y + h - 1, w, 1, ERA1.silver);
    ui.px(ctx, x, y, 1, h, ERA1.grey);
    ui.px(ctx, x + w - 1, y, 1, h, ERA1.silver);
    for (let gx = x + 24; gx < x + w; gx += 24) ui.px(ctx, gx, y + 1, 1, h - 2, ERA1.greyDark);
    for (let gy = y + 24; gy < y + h; gy += 24) ui.px(ctx, x + 1, gy, w - 2, 1, ERA1.greyDark);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(copy.subtitle, x + 8, y + 8);
  }

  private drawCaption(ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number): void {
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.silver;
    const line = copy.bubble[this.mood];
    const shown = line.length > 66 ? line.slice(0, 66) : line;
    ctx.fillText(shown, x, y);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(copy.status[this.action], x, y + 14);
    ui.px(ctx, x, y + 34, maxW, 1, ERA1.greyDark);
  }

  private drawControls(
    ctx: CanvasRenderingContext2D, x: number, y: number, hover: string, hits: Hit[]
  ): void {
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(copy.moodHeading, x, y);
    let bx = x;
    for (const m of RIG_MOODS) {
      const w = m === 'cheerful' ? 72 : m === 'sad' ? 50 : 66;
      ui.button(ctx, bx, y + 16, w, 20, copy.moods[m], { hover: hover === `mood:${m}`, disabled: this.mood === m });
      hits.push({ x: bx, y: y + 16, w, h: 20, id: `mood:${m}` });
      bx += w + 8;
    }
    const ax = x;
    const ay = y + 42;
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(copy.actionHeading, ax, ay);
    bx = ax;
    for (const a of RIG_ACTIONS) {
      const w = a === 'disappear' ? 74 : 54;
      ui.button(ctx, bx, ay + 16, w, 20, copy.actions[a], { hover: hover === `action:${a}`, disabled: this.action === a });
      hits.push({ x: bx, y: ay + 16, w, h: 20, id: `action:${a}` });
      bx += w + 6;
    }
  }

  /** the panel's stage business AROUND the shared character: the reveal wipe,
   *  the disappear fade, and the bubble. The puppet itself — pose math,
   *  silhouette, moods — is drawLambyChar's, and only its. */
  private drawLamby(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
    const reveal = this.revealAmount(t);
    const sink = this.mood === 'sad'
      ? 6 * (1 - Math.pow(1 - Math.min(1, (t - this.moodStart) / 0.65), 3)) : 0;
    const drift = this.action === 'idle' && this.mood !== 'sad'
      ? { dx: Math.sin(t * 0.9) * 1.6, dy: Math.sin(t * 1.6 + 1.2) * 1.2 }
      : { dx: 0, dy: 0 };

    ctx.save();
    ctx.beginPath();
    ctx.rect(40, Math.round(52 + (1 - reveal) * 212), 432, Math.round(212 * reveal));
    ctx.clip();
    ctx.globalAlpha = this.action === 'disappear' ? Math.max(0.22, reveal) : 1;

    drawLambyChar(ctx, cx, cy, {
      mood: this.mood,
      action: this.action,
      t,
      moodStart: this.moodStart,
      loopAppear: true // both hosts replay the pop; the production game plays it once
    });

    // the bubble rides the character's own idle drift and sad sink so it stays
    // attached — the two values are read back from the same curves, not re-timed
    this.drawBubble(ctx, cx + drift.dx + 54, cy + drift.dy - 70 + sink * 0.4);
    ctx.restore();
  }

  private revealAmount(t: number): number {
    const local = (t % 3.2) / 3.2;
    if (this.action === 'appear') return Math.min(1, local * 2.2);
    if (this.action === 'disappear') return Math.max(0, 1 - local * 2.2);
    return 1;
  }

  private drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const lines = this.wrap(copy.bubble[this.mood], 28).slice(0, 2);
    const w = Math.max(102, ...lines.map(line => line.length * 6 + 16));
    const h = 18 + lines.length * 12;
    ui.px(ctx, x, y, w, h, this.mood === 'sterile' ? ERA1.silver : ERA1.tooltip);
    ui.px(ctx, x, y, w, 1, ERA1.black);
    ui.px(ctx, x, y + h - 1, w, 1, ERA1.black);
    ui.px(ctx, x, y, 1, h, ERA1.black);
    ui.px(ctx, x + w - 1, y, 1, h, ERA1.black);
    ui.px(ctx, x + 8, y + h, 9, 5, this.mood === 'sterile' ? ERA1.silver : ERA1.tooltip);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    lines.forEach((line, i) => ctx.fillText(line, x + 8, y + 6 + i * 12));
  }

  private wrap(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length > maxChars && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}

export function startLambyRig(canvasEl: HTMLCanvasElement): void {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  document.documentElement.dataset.lambyrig = '1';

  const rig = new LambyRig(canvasEl, ctx);
  rig.start();
}

/** the standalone host: owns the canvas, resize, pointer mapping, URL params
 *  and the animation loop; delegates all drawing/state to `LambyRigPanel`. */
class LambyRig {
  private readonly off = document.createElement('canvas');
  private readonly octx: CanvasRenderingContext2D;
  private readonly panel: LambyRigPanel;
  private hits: Hit[] = [];
  private hover = '';
  private last = performance.now();
  private elapsed = 0;

  constructor(
    private readonly canvasEl: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D
  ) {
    const params = new URLSearchParams(window.location.search);
    const moodParam = params.get('mood');
    const actionParam = params.get('action');
    this.panel = new LambyRigPanel(
      isMood(moodParam) ? moodParam : 'cheerful',
      isAction(actionParam) ? actionParam : 'idle'
    );
    this.off.width = W;
    this.off.height = H;
    const offCtx = this.off.getContext('2d');
    if (!offCtx) throw new Error('2D context unavailable');
    this.octx = offCtx;
    this.octx.imageSmoothingEnabled = false;
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvasEl.addEventListener('pointermove', (e) => this.handleMove(e));
    this.canvasEl.addEventListener('pointerdown', (e) => this.handleClick(e));
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize(): void {
    this.canvasEl.width = Math.floor(window.innerWidth * devicePixelRatio);
    this.canvasEl.height = Math.floor(window.innerHeight * devicePixelRatio);
    this.canvasEl.style.width = '100vw';
    this.canvasEl.style.height = '100vh';
    this.canvasEl.style.imageRendering = 'pixelated';
    this.ctx.imageSmoothingEnabled = false;
  }

  private destRect(): { x: number; y: number; w: number; h: number } {
    const scale = Math.floor(Math.min(this.canvasEl.width / W, this.canvasEl.height / H));
    const s = Math.max(1, scale);
    const w = W * s;
    const h = H * s;
    return {
      x: Math.floor((this.canvasEl.width - w) / 2),
      y: Math.floor((this.canvasEl.height - h) / 2),
      w,
      h
    };
  }

  private toLogical(e: PointerEvent): { x: number; y: number } | null {
    const r = this.destRect();
    const px = Math.floor(e.clientX * devicePixelRatio);
    const py = Math.floor(e.clientY * devicePixelRatio);
    const u = (px - r.x) / r.w;
    const v = (py - r.y) / r.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { x: Math.floor(u * W), y: Math.floor(v * H) };
  }

  private handleMove(e: PointerEvent): void {
    const p = this.toLogical(e);
    const hit = p ? this.hits.find(h => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) : undefined;
    const id = hit?.id ?? '';
    if (id !== this.hover) {
      this.hover = id;
      this.canvasEl.style.cursor = id ? 'pointer' : 'default';
    }
  }

  private handleClick(e: PointerEvent): void {
    const p = this.toLogical(e);
    if (!p) return;
    const hit = this.hits.find(h => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
    if (!hit) return;
    if (this.panel.handleClick(hit.id, this.elapsed)) this.replaceUrl();
  }

  private replaceUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('lambyrig', '1');
    url.searchParams.set('mood', this.panel.mood);
    url.searchParams.set('action', this.panel.action);
    window.history.replaceState(null, '', url);
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    this.draw(this.elapsed);
    requestAnimationFrame((t) => this.frame(t));
  }

  private draw(t: number): void {
    const o = this.octx;
    o.imageSmoothingEnabled = false;
    ui.px(o, 0, 0, W, H, ERA1.black);
    const c = ui.windowFrame(o, 24, 10, RIG_WINDOW_W, RIG_WINDOW_H, copy.title, true);
    ui.px(o, c.x, c.y, c.w, c.h, ERA1.tealDark);
    this.hits = this.panel.draw(o, c, t, this.hover);

    this.ctx.imageSmoothingEnabled = false;
    ui.px(this.ctx, 0, 0, this.canvasEl.width, this.canvasEl.height, ERA1.black);
    const r = this.destRect();
    this.ctx.drawImage(this.off, 0, 0, W, H, r.x, r.y, r.w, r.h);
  }
}
