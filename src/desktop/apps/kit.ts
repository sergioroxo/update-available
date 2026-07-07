/**
 * The Starter Kit (S1.2–S1.4, register: operable) — the era's routing
 * artifact. A period shovelware autorun: booklet pages on screen, the hymn
 * indicator, the prayer subtitled, and a final page whose only real button
 * is the one that sends you to the channel. All wording in
 * data/dialog/s1_kit.json (⚑ draft, Sérgio approves).
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import kit from '../../../data/dialog/s1_kit.json';

type KitPhase = 'autorun' | 'pages' | 'dialing';

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
    // the hymn indicator — dim, constant, period-true
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.olive;
    ctx.fillText(`♪ ${kit.midiNote}`, c.x + c.w - 150, c.y + 4);
    // page title
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(p.title, c.x + 14, c.y + 18);
    // body — the prayer page reads as subtitles (grey, slower voice)
    ui.setFont(ctx, 10);
    const prayer = 'prayer' in p && p.prayer === true;
    p.lines.forEach((line, i) => {
      ctx.fillStyle = prayer
        ? (line.startsWith('(') ? ERA1.grey : ERA1.greyDark)
        : ERA1.black;
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
    if (last) {
      const label = 'connect' in p && typeof p.connect === 'string' ? p.connect : 'NEXT';
      ui.button(ctx, c.x + c.w - 112, c.y + c.h - 28, 100, 20, label, { hover: false });
    } else {
      ui.button(ctx, c.x + c.w - 112, c.y + c.h - 28, 60, 20, 'NEXT', { hover: false });
    }
  }

  /** click routing — logical canvas coordinates */
  handleClick(x: number, y: number): void {
    if (this.phase !== 'pages') return;
    const W = ERA1_CANVAS.width;
    const dw = 430; const dh = 330;
    const dx = Math.round((W - dw) / 2);
    const dy = 18;
    // content rect mirrors windowFrame's geometry exactly (chrome.ts:55)
    const cx = dx + 4; const cy = dy + 21;
    const cw = dw - 8; const ch = dh - 25;
    const by = cy + ch - 28;
    if (y >= by && y <= by + 20) {
      // BACK is dead (no going back, R26) — only NEXT/connect advances
      if (x >= cx + cw - 112 && x <= cx + cw - 12) {
        this.advance();
        return;
      }
    }
  }
}
