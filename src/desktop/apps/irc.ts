/**
 * mIRC beat (S1.5, register: felt) — the channel the kit routed you to. The
 * warmth is real; the routing is the harm. Lines TYPE OUT one at a time at a
 * human speed and WRAP (nothing is cut); Rob's DM arrives by name and even for
 * lurkers. Script in data/dialog/s1_irc.json; this file is mechanics only.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import dialog from '../../../data/dialog/s1_irc.json';

interface Line { from: string; text: string }

const TYPE_CPS = 30;          // characters per second — natural typing
const HOLD_CHANNEL = 0.8;     // pause after a channel line finishes
const HOLD_DM = 1.1;          // pause after a DM line (slower, intimate)
const AMBIENT_START = 1.2;    // s before the room starts talking
const DM_DELAY = 3.5;         // s after the 2nd user message
const DM_LURKER_DELAY = 30;   // the DM comes even if you never speak (v0.7 §6)

/** a stream that types queued lines out one character at a time */
class TypeStream {
  done: Line[] = [];
  private queue: Line[] = [];
  private cur: Line | null = null;
  private shown = 0;
  private hold = 0;
  constructor(private readonly holdAfter: number) {}

  queueLine(l: Line): void { this.queue.push(l); }
  /** a line the player typed appears whole — they already wrote it */
  pushWhole(l: Line): void { this.done.push(l); }
  get idle(): boolean { return !this.cur && this.queue.length === 0; }
  get partial(): Line | null {
    return this.cur ? { from: this.cur.from, text: this.cur.text.slice(0, Math.floor(this.shown)) } : null;
  }

  update(dt: number): boolean {
    let changed = false;
    if (this.cur) {
      this.shown += TYPE_CPS * dt;
      changed = true;
      if (this.shown >= this.cur.text.length) {
        this.done.push(this.cur);
        this.cur = null;
        this.hold = this.holdAfter;
      }
    } else if (this.hold > 0) {
      this.hold -= dt;
    } else if (this.queue.length > 0) {
      this.cur = this.queue.shift()!;
      this.shown = 0;
      changed = true;
    }
    return changed;
  }
}

export class IrcApp {
  open = true;
  dmOpen = false;
  focus: 'channel' | 'dm' = 'channel';

  private channel = new TypeStream(HOLD_CHANNEL);
  private dm = new TypeStream(HOLD_DM);
  private input = '';
  private dmInput = '';
  private t = 0;
  private ambientFed = false;
  private userMessages = 0;
  private dmAt = DM_LURKER_DELAY;
  private dmFed = false;
  private dmReplied = false;
  onHooked?: () => void;
  private hooked = false;
  dirty = true;

  private fill(text: string): string {
    return text.replace('{name}', ledger.name);
  }

  update(dt: number): void {
    this.t += dt;
    // the room starts talking, then keeps a slow human rhythm
    if (!this.ambientFed && this.t >= AMBIENT_START) {
      this.ambientFed = true;
      for (const l of dialog.ambient) this.channel.queueLine(l);
    }
    if (this.channel.update(dt)) this.dirty = true;

    // the DM (by name, even for lurkers) feeds once its time comes
    if (!this.dmFed && this.t >= this.dmAt) {
      this.dmFed = true;
      this.dmOpen = true;
      this.focus = 'dm';
      for (const line of dialog.dm) this.dm.queueLine({ from: 'MentorRob', text: this.fill(line) });
      this.dirty = true;
    }
    if (this.dmFed && this.dm.update(dt)) this.dirty = true;

    // the hook lands once the whole DM has finished typing
    if (this.dmFed && !this.hooked && this.dm.idle && this.dm.done.length >= dialog.dm.length) {
      this.hooked = true;
      if (!ledger.records.includes('mirc-log')) ledger.records.push('mirc-log');
      if (!ledger.tags.includes('pastoral-referral')) ledger.tags.push('pastoral-referral');
      this.onHooked?.();
    }
  }

  submit(): void {
    if (this.focus === 'channel' && this.input.trim()) {
      this.channel.pushWhole({ from: ledger.name, text: this.input.trim() });
      this.input = '';
      this.userMessages++;
      if (this.userMessages === 1) {
        this.channel.queueLine({ from: dialog.welcome.from, text: this.fill(dialog.welcome.text) });
      } else if (this.userMessages === 2) {
        this.channel.queueLine({ from: dialog.secondReply.from, text: this.fill(dialog.secondReply.text) });
        this.dmAt = Math.min(this.dmAt, this.t + DM_DELAY); // speaking only hastens it
      }
      this.dirty = true;
    } else if (this.focus === 'dm' && this.dmInput.trim()) {
      this.dm.pushWhole({ from: ledger.name, text: this.dmInput.trim() });
      this.dmInput = '';
      if (!this.dmReplied && this.hooked) {
        this.dmReplied = true;
        this.dm.queueLine({ from: 'MentorRob', text: dialog.dmReply });
      }
      this.dirty = true;
    }
  }

  typeChar(ch: string): void {
    if (this.focus === 'channel' && this.input.length < 60) this.input += ch;
    else if (this.focus === 'dm' && this.dmInput.length < 60) this.dmInput += ch;
    this.dirty = true;
  }

  backspace(): void {
    if (this.focus === 'channel') this.input = this.input.slice(0, -1);
    else this.dmInput = this.dmInput.slice(0, -1);
    this.dirty = true;
  }

  get userMessageCount(): number { return this.userMessages; }

  // ── drawing ────────────────────────────────────────────────────────────
  /** greedy word-wrap to a pixel width */
  private wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const rows: string[] = [];
    let row = '';
    for (const w of words) {
      const test = row ? `${row} ${w}` : w;
      if (ctx.measureText(test).width > maxW && row) { rows.push(row); row = w; }
      else row = test;
    }
    if (row) rows.push(row);
    return rows.length ? rows : [''];
  }

  /** flatten a stream into wrapped rows: nick prefix + wrapped body, typing tail */
  private rows(
    ctx: CanvasRenderingContext2D, stream: TypeStream, bodyW: number,
    nickColor: (from: string) => string, bodyColor: string, caret: boolean
  ): Array<{ prefix: string; prefixColor: string; body: string; bodyColor: string; indent: number }> {
    const out: Array<{ prefix: string; prefixColor: string; body: string; bodyColor: string; indent: number }> = [];
    const all = [...stream.done];
    const p = stream.partial;
    if (p) all.push(p);
    all.forEach((l, idx) => {
      const prefix = `<${l.from}> `;
      const pw = ctx.measureText(prefix).width;
      const lines = this.wrap(ctx, l.text, bodyW - pw);
      const typingTail = caret && p && idx === all.length - 1;
      lines.forEach((ln, i) => {
        const tail = typingTail && i === lines.length - 1 ? '█' : '';
        out.push({
          prefix: i === 0 ? prefix : '',
          prefixColor: nickColor(l.from),
          body: ln + tail,
          bodyColor,
          indent: i === 0 ? 0 : pw
        });
      });
    });
    return out;
  }

  private renderRows(
    ctx: CanvasRenderingContext2D,
    rows: ReturnType<IrcApp['rows']>, x: number, y0: number
  ): void {
    rows.forEach((r, i) => {
      const y = y0 + i * 12;
      let cx = x + r.indent;
      if (r.prefix) {
        ctx.fillStyle = r.prefixColor;
        ctx.fillText(r.prefix, cx, y);
        cx += ctx.measureText(r.prefix).width;
      }
      ctx.fillStyle = r.bodyColor;
      ctx.fillText(r.body, cx, y);
    });
  }

  draw(ctx: CanvasRenderingContext2D, caretOn: boolean): void {
    const c = ui.windowFrame(ctx, 14, 30, 400, 290, `${dialog.channel} — IRC`, this.focus === 'channel');
    ui.px(ctx, c.x, c.y, c.w, c.h - 22, ERA1.black);
    const listW = 78;
    ui.px(ctx, c.x + c.w - listW, c.y, listW, c.h - 22, ERA1.tealDark);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.silver;
    [...dialog.users, ledger.name].forEach((u, i) => {
      ctx.fillText(u.slice(0, 11), c.x + c.w - listW + 4, c.y + 4 + i * 11);
    });

    ui.setFont(ctx, 9);
    const chRows = this.rows(ctx, this.channel, c.w - listW - 12,
      (f) => (f === ledger.name ? ERA1.tooltip : ERA1.ok), ERA1.silver, caretOn).slice(-19);
    this.renderRows(ctx, chRows, c.x + 4, c.y + 4);
    ui.inputField(ctx, c.x, c.y + c.h - 20, c.w, 18, this.input, caretOn && this.focus === 'channel');

    if (this.dmOpen) {
      const d = ui.windowFrame(ctx, 170, 140, 300, 170, dialog.dmTitle, this.focus === 'dm');
      ui.px(ctx, d.x, d.y, d.w, d.h - 22, ERA1.paper);
      ui.setFont(ctx, 9);
      const dmRows = this.rows(ctx, this.dm, d.w - 12,
        (f) => (f === ledger.name ? ERA1.navy : ERA1.warnDark), ERA1.black, caretOn).slice(-9);
      this.renderRows(ctx, dmRows, d.x + 4, d.y + 4);
      ui.inputField(ctx, d.x, d.y + d.h - 20, d.w, 18, this.dmInput, caretOn && this.focus === 'dm');
    }
  }

  handleClick(x: number, y: number): void {
    if (this.dmOpen && x >= 170 && x <= 470 && y >= 140 && y <= 310) this.focus = 'dm';
    else if (x >= 14 && x <= 414 && y >= 30 && y <= 320) this.focus = 'channel';
    this.dirty = true;
  }
}
