/** RETIRED audience UI: StartMenuMap owns the reusable reference list.
 * This historical layout/data adapter never opens; its types and fakeOs helper are still shared. */
/**
 * ⚑ S229 / W1-A6 — "WHAT YOU CAN DO HERE", at the start of every era.
 *
 * Walkthrough 1: a colleague liked the one panel that said what you could do (the 1997 Un-Walk's steps), and
 * Sérgio asked for its equivalent at the start of EACH era (1997, 2003, 2016, 2026). This is that, and it is
 * DIEGETIC: the era's own software saying what to do, in the era's own chrome — the programme's Getting
 * Started window (1997), Restorify's Today (2003), GracePlatform's first-shift card (2016), GraceOS's
 * welcome-back card (2026). It is not the frame and not a character: no Assistant, no sound, nothing filed.
 *
 *  · The words are data (data/strings/startPanel.json): 3–5 steps, one line each, each naming a witness-map
 *    condition (src/witness/map.ts `beatDone`), so a tick is only ever true. The Speedrun Version lists the
 *    steps that cut has (`speedrun: false` / `textSpeedrun` / `doneSpeedrun`).
 *  · It opens ONCE per era, after the arrival has settled and the screen has been calm for a moment; it is a
 *    desktop-level object (the surface draws it UNDER its windows, and only while the screen is calm — never
 *    over a required modal, never during a felt scene); and it closes with its own close box (dismissal
 *    always works). Nothing depends on looking: it sits on the screen she is facing.
 *  · It publishes its close box as ordinary hit rects (id `startpanel-close`), which the surface pushes into
 *    its own hit list, the way every other window does — so the walker (tools/walk.mjs) can find and press it
 *    and nothing here can trap it. This class owns no hit array of its own on purpose (a second list would be
 *    a second thing to drift).
 *
 * The class holds only the "seen / closed" state and the calm-timer; each surface decides what "calm" means
 * for it and where the card sits.
 */
import strings from '../../../data/strings/startPanel.json';
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import * as aero from '../theme/era3';
import { CHROME } from '../theme/era4';
import { beatDone } from '../../witness/map';
import { isSpeedrun, extraOn } from '../../state/cut';
import type { DesktopOS } from '../os';

export type PanelEra = 'e1' | 'e2' | 'e3' | 'e4';
export interface Rect { x: number; y: number; w: number; h: number }
export interface PanelStep { text: string; done: boolean }

interface StepDef { text: string; done: string; speedrun?: boolean; textSpeedrun?: string; doneSpeedrun?: string; strip?: string; stripSpeedrun?: string }
interface EraDef { title: string; lead: string; steps: StepDef[]; close: string }
const DEFS = strings as unknown as Record<PanelEra, EraDef>;

export class StartPanel {
  /** the card has been shown and not yet closed. (The surface still draws it only while its screen is calm.) */
  open = false;
  private seen = false;
  /** the card has opened at least once this era (closed or not) */
  get everShown(): boolean { return this.seen; }

  /** `done(key)` answers a witness-map condition for this surface (see map.ts `beatDone`) */
  constructor(readonly era: PanelEra, private readonly done: (key: string) => boolean = (k) => beatDone(k)) {}

  /** this era's steps for the cut being played, each with its tick */
  steps(strip = false): PanelStep[] {
    const speed = isSpeedrun();
    return DEFS[this.era].steps
      .filter((s) => !(speed && s.speedrun === false && !extraOn('tapes')))
      .map((s) => { const speed = isSpeedrun() && !(this.era === 'e3' && extraOn('work')); return {
        text: strip && s.strip ? (speed && s.stripSpeedrun ? s.stripSpeedrun : s.strip) : speed && s.textSpeedrun ? s.textSpeedrun : s.text,
        done: this.done(speed && s.doneSpeedrun ? s.doneSpeedrun : s.done)
      }; });
  }

  /**
   * Call once a frame. `calm` = the surface's own judgement that nothing else owns the screen. Returns true when
   * the card needs redrawing (it just opened, or a tick changed).
   */
  tick(dt: number, calm: boolean): boolean {
    // Playtest polish: Start owns the reference list; no arrival card.
    void dt; void calm;
    return false;
  }

  /** Compatibility no-op: help routes to the shared Start list. */
  reopen(): void { this.open = false; this.seen = true; }
  toggle(): void { if (this.open) this.close(); else this.reopen(); }

  /** the close box, or the card's own Close */
  close(): void { this.open = false; this.seen = true; }

  /** the first step not yet done — the one the card leans on */
  private currentIndex(steps: PanelStep[]): number { return steps.findIndex((s) => !s.done); }

  // ── drawing — one look per era, all from the era's own palette and chrome ────────────────────────────────

  /** the card's height at width `w` (the surface places it) */
  height(ctx: CanvasRenderingContext2D, w: number): number { return this.layout(ctx, w).h; }

  private metrics(): { size: number; lead: number; lh: number; gap: number; box: number; pad: number; head: number; foot: number } {
    switch (this.era) {
      case 'e1': case 'e2': return { size: 9, lead: 10, lh: 11, gap: 5, box: 9, pad: 8, head: 0, foot: 24 };
      case 'e3': return { size: 10, lead: 13, lh: 13, gap: 6, box: 10, pad: 12, head: 36, foot: 34 };
      case 'e4': return { size: 10, lead: 12, lh: 13, gap: 6, box: 10, pad: 12, head: 36, foot: 30 };
    }
  }

  private layout(ctx: CanvasRenderingContext2D, w: number): { rows: string[][]; h: number; bodyW: number; leadRows: string[] } {
    const m = this.metrics();
    const steps = this.steps();
    const frameChrome = this.era === 'e1' || this.era === 'e2' ? 25 : 0;   // title bar + frame edge
    const bodyW = w - m.pad * 2 - m.box - 6 - (frameChrome ? 8 : 0);
    ui.setFont(ctx, m.size);
    const rows = steps.map((s) => ui.wrapText(ctx, s.text, bodyW));
    ui.setFont(ctx, this.era === 'e1' || this.era === 'e2' ? 9 : m.lead);
    const leadRows = this.era === 'e1' || this.era === 'e2' ? ui.wrapText(ctx, DEFS[this.era].lead, w - m.pad * 2 - 8) : [];
    const stepsH = rows.reduce((n, r) => n + r.length * m.lh + m.gap, 0);
    const leadH = this.era === 'e1' || this.era === 'e2' ? leadRows.length * m.lh + 7 : 0;
    return { rows, bodyW, leadRows, h: frameChrome + (frameChrome ? 8 : m.head) + leadH + stepsH + m.foot };
  }

  /** draws the card with its top-left at (x, y), `w` wide; returns the rects that close it (the caller publishes them) */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): Rect[] {
    switch (this.era) {
      case 'e1': case 'e2': return this.drawWin(ctx, x, y, w);
      case 'e3': return this.drawGlass(ctx, x, y, w);
      case 'e4': return this.drawPaper(ctx, x, y, w);
    }
  }

  /** 1997 / 2003 — a window of the era's own chrome (the Un-Walk's wizard look; 2003 on lighter paper) */
  private drawWin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): Rect[] {
    const D = DEFS[this.era];
    const m = this.metrics();
    const L = this.layout(ctx, w);
    const steps = this.steps();
    const c = ui.windowFrame(ctx, x, y, w, L.h, D.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, this.era === 'e1' ? ERA1.beige : ERA1.paper);
    let ty = c.y + 6;
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.era === 'e1' ? ERA1.black : ERA1.navy;
    for (const r of L.leadRows) { ctx.fillText(r, c.x + m.pad, ty); ty += m.lh; }
    ty += 7;
    const cur = this.currentIndex(steps);
    steps.forEach((s, i) => {
      const bx = c.x + m.pad, by = ty;
      // a sunken box, and the tick the era would draw: hard pixels, one colour
      ui.px(ctx, bx, by, m.box, m.box, ERA1.black);
      ui.px(ctx, bx + 1, by + 1, m.box - 2, m.box - 2, ERA1.white);
      if (s.done) for (const [gx, gy] of [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2]]) ui.px(ctx, bx + gx, by + gy, 1, 2, ERA1.ok);
      ui.setFont(ctx, m.size);
      ctx.fillStyle = s.done ? ERA1.grey : ERA1.black;
      L.rows[i].forEach((r, j) => ctx.fillText(r, bx + m.box + 6, by + j * m.lh));
      if (i === cur) ui.px(ctx, c.x + 2, by, 2, m.box, this.era === 'e1' ? ERA1.navy : ERA1.titleBlue);
      ty += L.rows[i].length * m.lh + m.gap;
    });
    // her own Close: the title bar's box is small, the button is not
    const bw = 56, bh = 16, bx = c.x + c.w - bw - 8, by = c.y + c.h - bh - 6;
    ui.button(ctx, bx, by, bw, bh, D.close);
    return [c.closeBox, { x: bx, y: by, w: bw, h: bh }];
  }

  /** 2016 — GracePlatform's glass: a white card, an aero-blue rule, ticks in the approve-green */
  private drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): Rect[] {
    const D = DEFS.e3;
    const m = this.metrics();
    const L = this.layout(ctx, w);
    const steps = this.steps();
    aero.px(ctx, x - 2, y - 2, w + 4, L.h + 4, aero.ERA3.glassEdge);
    aero.px(ctx, x, y, w, L.h, aero.ERA3.white);
    aero.px(ctx, x, y, w, 4, aero.ERA3.accent);
    ui.setFont(ctx, 9); ctx.fillStyle = aero.ERA3.grey; ctx.fillText(D.title, x + m.pad, y + 11);
    ui.setFont(ctx, m.lead); ctx.fillStyle = aero.ERA3.titleText; ctx.fillText(D.lead, x + m.pad, y + 22);
    ui.setFont(ctx, 10); ctx.fillText('×', x + w - 18, y + 8);
    let ty = y + m.head + 4;
    const cur = this.currentIndex(steps);
    steps.forEach((s, i) => {
      const bx = x + m.pad, by = ty;
      aero.px(ctx, bx, by, m.box, m.box, aero.ERA3.fieldEdge);
      aero.px(ctx, bx + 1, by + 1, m.box - 2, m.box - 2, s.done ? aero.ERA3.good : aero.ERA3.white);
      if (s.done) for (const [gx, gy] of [[2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [7, 3]]) aero.px(ctx, bx + gx, by + gy - 1, 1, 2, aero.ERA3.white);
      ui.setFont(ctx, m.size);
      ctx.fillStyle = s.done ? aero.ERA3.grey : i === cur ? aero.ERA3.titleText : aero.ERA3.greyDk;
      L.rows[i].forEach((r, j) => ctx.fillText(r, bx + m.box + 6, by + j * m.lh));
      if (i === cur) aero.px(ctx, x, by, 2, m.box, aero.ERA3.accent);
      ty += L.rows[i].length * m.lh + m.gap;
    });
    const bw = 64, bh = 20, bx = x + w - bw - m.pad, by = y + L.h - bh - 8;
    aero.button(ctx, bx, by, bw, bh, D.close, { size: 10 });
    return [{ x: x + w - 20, y: y + 7, w: 14, h: 14 }, { x: bx, y: by, w: bw, h: bh }];
  }

  /** the height of 2016's one-row strip (the board's variant of the card) */
  static readonly STRIP_H = 32;

  /** 2016's board — the same steps as one row of short ones under the day's tiles, where a card would lie over a tile */
  drawStrip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): Rect[] {
    const D = DEFS.e3;
    const steps = this.steps(true);
    const h = StartPanel.STRIP_H;
    aero.px(ctx, x, y, w, h, aero.ERA3.white);
    aero.px(ctx, x, y, w, 1, aero.ERA3.glassEdge);
    aero.px(ctx, x, y + h - 1, w, 1, aero.ERA3.glassEdge);
    aero.px(ctx, x, y, 3, h, aero.ERA3.accent);
    ui.setFont(ctx, 8); ctx.fillStyle = aero.ERA3.grey;
    ctx.fillText('GETTING', x + 10, y + 8); ctx.fillText('STARTED', x + 10, y + 18);
    const labelW = 62, closeW = 76;
    const colW = Math.floor((w - labelW - closeW - 8) / steps.length);
    const cur = this.currentIndex(steps);
    steps.forEach((s, i) => {
      const bx = x + labelW + i * colW, by = y + 12;
      aero.px(ctx, bx, by, 10, 10, aero.ERA3.fieldEdge);
      aero.px(ctx, bx + 1, by + 1, 8, 8, s.done ? aero.ERA3.good : aero.ERA3.white);
      if (s.done) for (const [gx, gy] of [[2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [7, 3]]) aero.px(ctx, bx + gx, by + gy - 1, 1, 2, aero.ERA3.white);
      ui.setFont(ctx, 9);
      ctx.fillStyle = s.done ? aero.ERA3.grey : i === cur ? aero.ERA3.titleText : aero.ERA3.greyDk;
      ui.wrapText(ctx, s.text, colW - 18).slice(0, 2).forEach((r, j) => ctx.fillText(r, bx + 15, y + 7 + j * 11));
    });
    const bw = 46, bh = 18, bx = x + w - 72, by = y + Math.round((h - bh) / 2);
    aero.button(ctx, bx, by, bw, bh, D.close, { size: 9 });
    ui.setFont(ctx, 10); ctx.fillStyle = aero.ERA3.greyDk; ctx.fillText('×', x + w - 17, y + 11);
    return [{ x: x + w - 22, y: y + 8, w: 16, h: 16 }, { x: bx, y: by, w: bw, h: bh }];
  }

  /** 2026 — GraceOS's paper card on the restored page: warm, flat, one filled control (the era's own CHROME) */
  private drawPaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): Rect[] {
    const D = DEFS.e4;
    const m = this.metrics();
    const L = this.layout(ctx, w);
    const steps = this.steps();
    ui.px(ctx, x, y, w, L.h, CHROME.fieldEdge);
    ui.px(ctx, x + 1, y + 1, w - 2, L.h - 2, CHROME.field);
    ui.setFont(ctx, 8); ctx.fillStyle = CHROME.hint; ctx.fillText(D.title, x + m.pad, y + 10);
    ui.setFont(ctx, m.lead); ctx.fillStyle = CHROME.ink; ctx.fillText(D.lead, x + m.pad, y + 21);
    ui.setFont(ctx, 10); ctx.fillText('×', x + w - 18, y + 8);
    let ty = y + m.head + 4;
    const cur = this.currentIndex(steps);
    steps.forEach((s, i) => {
      const bx = x + m.pad, by = ty;
      ui.px(ctx, bx, by, m.box, m.box, s.done ? CHROME.accent : CHROME.fieldEdge);
      ui.px(ctx, bx + 1, by + 1, m.box - 2, m.box - 2, s.done ? CHROME.accent : CHROME.field);
      if (s.done) for (const [gx, gy] of [[2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [7, 3]]) ui.px(ctx, bx + gx, by + gy - 1, 1, 2, CHROME.field);
      ui.setFont(ctx, m.size);
      ctx.fillStyle = s.done ? CHROME.hint : i === cur ? CHROME.ink : CHROME.tabInk;
      L.rows[i].forEach((r, j) => ctx.fillText(r, bx + m.box + 6, by + j * m.lh));
      ty += L.rows[i].length * m.lh + m.gap;
    });
    const label = D.close;
    ui.setFont(ctx, 9);
    const bw = Math.ceil(ctx.measureText(label).width) + 18, bh = 18, bx = x + w - bw - m.pad, by = y + L.h - bh - 7;
    ui.px(ctx, bx, by, bw, bh, CHROME.button);
    ctx.fillStyle = CHROME.buttonInk;
    ctx.fillText(label, bx + 9, by + 5);
    return [{ x: x + w - 20, y: y + 7, w: 14, h: 14 }, { x: bx, y: by, w: bw, h: bh }];
  }
}

/** a thin helper for surfaces that ask the map about an OS they only half have (E4's browser) */
export function fakeOs(parts: Partial<DesktopOS>): DesktopOS { return parts as DesktopOS; }
