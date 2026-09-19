/**
 * The Starter Kit (S1.2–S1.4, register: operable) — the era's routing
 * artifact. A period shovelware autorun: booklet pages on screen, the cassette
 * insert indicator, the prayer printed, and a final page whose only real button
 * is the one that sends you to the channel. All wording in
 * data/dialog/s1_kit.json (⚑ draft, Sérgio approves).
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import kit from '../../../data/dialog/s1_kit.json';

type KitPhase = 'autorun' | 'pages' | 'dialing';

/** same shape every other surface in the build publishes (provotype.ts, os.ts,
 *  graceQueueLite.ts, phoneE3.ts) — see `hits` below for why this one now does too */
interface Hit { x: number; y: number; w: number; h: number; id: string }

const AUTORUN_SECONDS = 2.6;
const DIAL_SECONDS = 3.2;

export class KitApp {
  open = true;
  dirty = true;
  /** fires when the dial sequence completes — the OS opens the channel */
  onConnect?: () => void;

  private phase: KitPhase = 'autorun';
  private t = 0;
  private page = 0;
  private connected = false;
  /**
   * ⚑ THE BUTTON IS REGISTERED WHERE IT IS DRAWN, and until 2026-08-28 it was
   * not. `handleClick` used to recompute the dialog's geometry from scratch —
   * the same numbers, written a second time — and the two copies had already
   * drifted: NEXT is drawn 60 px wide on every page but the last, while the
   * click test accepted 100 px, so **40 px of blank paper to the right of the
   * button silently turned the page.** Nobody saw it, because nothing in this
   * repo could see it: a surface that publishes no rects cannot be audited by
   * `tools/walk.mjs` or by any check, which is precisely how this project has
   * repeatedly shipped content a player could not reach.
   *
   * So: built while drawing, tested on click, one source of truth. Same
   * contract as every other surface here.
   */
  private hits: Hit[] = [];

  // read-only state for the R28-2a guide-thread conditions (narrative/guide.ts)
  get reading(): boolean { return this.phase === 'pages'; }
  get dialing(): boolean { return this.phase === 'dialing'; }
  get pageIndex(): number { return this.page; }
  get onPrayerPage(): boolean {
    const p = kit.pages[this.page] as { prayer?: boolean };
    return this.phase === 'pages' && p.prayer === true;
  }
  get onConnectPage(): boolean {
    return this.phase === 'pages' && this.page === kit.pages.length - 1;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.phase === 'autorun' && this.t >= AUTORUN_SECONDS) {
      this.phase = 'pages';
      this.t = 0;
    }
    if (this.phase === 'dialing' && this.t >= DIAL_SECONDS && !this.connected) {
      this.connected = true;
      this.open = false;
      this.onConnect?.();
    }
    this.dirty = true;
  }

  /** Enter advances; on the last page it connects */
  advance(): void {
    if (this.phase !== 'pages') return;
    if (this.page < kit.pages.length - 1) {
      this.page++;
    } else {
      this.startDial();
    }
    this.dirty = true;
  }

  private startDial(): void {
    this.phase = 'dialing';
    this.t = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    this.hits = [];   // the dial and the autorun crawl register nothing: they return below

    if (this.phase === 'dialing') {
      // a bare terminal: the connection is an event, not a transition
      ui.px(ctx, 0, 0, W, ERA1_CANVAS.height, ERA1.black);
      ui.setFont(ctx, 12);
      ctx.fillStyle = ERA1.silver;
      const shown = Math.min(kit.dial.length, 1 + Math.floor(this.t / 0.8));
      for (let i = 0; i < shown; i++) {
        ctx.fillText(kit.dial[i], 24, 120 + i * 18);
      }
      return;
    }

    const dw = 430; const dh = 330;
    const dx = Math.round((W - dw) / 2);
    const dy = 18;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, kit.windowTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);

    if (this.phase === 'autorun') {
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.greyDark;
      const shown = Math.min(kit.autorun.length, 1 + Math.floor(this.t / 0.5));
      for (let i = 0; i < shown; i++) {
        ctx.fillText(kit.autorun[i], c.x + 12, c.y + 16 + i * 14);
      }
      return;
    }

    const p = kit.pages[this.page];
    // (S149: the "companion cassette insert" caption is gone — Sérgio, 08-21 §E and
    //  09-17 R3-18: "what is this? still here". The tape page names the tape.)
    // page title
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(p.title, c.x + 14, c.y + 18);
    // body — the prayer page reads as a printed cassette insert
    ui.setFont(ctx, 10);
    const prayer = 'prayer' in p && p.prayer === true;
    p.lines.forEach((line, i) => {
      ctx.fillStyle = prayer ? ERA1.greyDark : ERA1.black;
      ctx.fillText(line, c.x + 14, c.y + 42 + i * 14);
    });
    // pager
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(`${this.page + 1} / ${kit.pages.length}`, c.x + 14, c.y + c.h - 22);
    const last = this.page === kit.pages.length - 1;
    // no BACK: the path only runs forward — the victim can't go back (Sérgio
    // R26). The control stays visible but permanently greyed (the affordance
    // of return is shown to be dead, not hidden).
    ui.button(ctx, c.x + c.w - 180, c.y + c.h - 28, 60, 20, 'BACK', {
      disabled: true, hover: false
    });
    // ⚑ BACK GETS NO HIT RECT, deliberately — it is drawn dead so the affordance
    // of return is SHOWN to be dead rather than hidden (R26, Sérgio). Same
    // convention as the greyed "not now" in os.ts's Netvision offer.
    const bw = last ? 100 : 60;
    const label = last && 'connect' in p && typeof p.connect === 'string' ? p.connect : 'NEXT';
    ui.button(ctx, c.x + c.w - 112, c.y + c.h - 28, bw, 20, label, { hover: false });
    this.hits.push({ x: c.x + c.w - 112, y: c.y + c.h - 28, w: bw, h: 20, id: 'next' });
  }

  /** click routing — logical canvas coordinates, against the rects `draw` registered */
  handleClick(x: number, y: number): void {
    if (this.phase !== 'pages') return;
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    // BACK is dead (no going back, R26) and registers nothing — only NEXT/connect advances
    if (hit?.id === 'next') this.advance();
  }
}
