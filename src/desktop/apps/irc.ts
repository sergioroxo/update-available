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
import end from '../../../data/dialog/s1_end.json';

interface Line { from: string; text: string }

// pacing tuned for reading, not speed — most of the audience reads English as
// a second language (Sérgio). Slow type, generous holds so each line can land.
const CPS_CHANNEL = 22;       // the room chatters at a livelier clip
const CPS_DM = 13;            // Rob types slowly and deliberately (Sérgio: don't cut)
const HOLD_CHANNEL = 1.5;     // short pause between room lines
const HOLD_DM = 3.6;          // long pause after a DM line — time to read Rob fully
const AMBIENT_START = 1.4;    // s before the room starts talking
// Rob does NOT message until the room's ambient chatter has finished (the last
// line is the x-files exchange); otherwise his window covers the channel mid-
// conversation (Sérgio). This is the one true gate — speaking no longer races it.
const DM_AFTER_AMBIENT = 2.6; // s of quiet after the room settles, then Rob

/** a stream that types queued lines out one character at a time */
class TypeStream {
  done: Line[] = [];
  private queue: Line[] = [];
  private cur: Line | null = null;
  private shown = 0;
  private hold = 0;
  constructor(private readonly holdAfter: number, private readonly cps: number) {}

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
      this.shown += this.cps * dt;
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

  private channel = new TypeStream(HOLD_CHANNEL, CPS_CHANNEL);
  private dm = new TypeStream(HOLD_DM, CPS_DM);
  private t = 0;
  private ambientFed = false;
  private dmReadyAt = Infinity; // set once the room's ambient chatter settles
  private dmFed = false;
  onHooked?: () => void;
  private hooked = false;
  dirty = true;

  // S1.7 escalation — Rob's residential pitch is now a TURN-BY-TURN exchange:
  // Rob types a line, you reply with the line you're given (the narrowed voice),
  // Rob continues. The reply only sets the witness label, never the outcome. The
  // reply box renders OUTSIDE the chat window so it never covers the transcript.
  private escalating = false;
  private escTurn = -1;            // index of the current exchange
  private escRobPending = false;   // Rob's line for this turn is still typing
  private escAwaitingReply = false;// the reply box is live, awaiting the click
  private escDone = false;         // all turns spoken
  private escEndAt = Infinity;     // a beat after the last reply, then the packet
  private escFired = false;
  private replyRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  onEscalationDone?: () => void;

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

    // once the room has finished talking (the x-files line is the last ambient),
    // and after a short quiet, Rob's DM is allowed to open — never before, so it
    // cannot cover a live conversation
    if (this.ambientFed && this.dmReadyAt === Infinity
        && this.channel.idle && this.channel.done.length >= dialog.ambient.length) {
      this.dmReadyAt = this.t + DM_AFTER_AMBIENT;
    }
    if (!this.dmFed && this.t >= this.dmReadyAt) {
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

    // S1.7 — once Rob's line for this turn finishes typing, offer the reply
    if (this.escalating && this.escRobPending && this.dm.idle) {
      this.escRobPending = false;
      this.escAwaitingReply = true;
      this.dirty = true;
    }
    // a beat after the final reply, hand off to the placement packet
    if (this.escDone && !this.escFired && this.t >= this.escEndAt) {
      this.escFired = true;
      this.onEscalationDone?.();
    }
  }

  /** debug: jump straight to the hooked state — the room + DM appear at once */
  debugHook(): void {
    this.ambientFed = true;
    for (const l of dialog.ambient) this.channel.pushWhole(l);
    this.dmFed = true;
    this.dmOpen = true;
    this.focus = 'dm';
    if (this.dm.done.length === 0) {
      for (const line of dialog.dm) this.dm.pushWhole({ from: 'MentorRob', text: this.fill(line) });
    }
    if (!this.hooked) {
      this.hooked = true;
      if (!ledger.records.includes('mirc-log')) ledger.records.push('mirc-log');
      if (!ledger.tags.includes('pastoral-referral')) ledger.tags.push('pastoral-referral');
      this.onHooked?.();
    }
    this.dirty = true;
  }

  /** the hook has been fully witnessed — Rob now pushes the residential program */
  beginEscalation(): void {
    if (this.escalating || !this.hooked) return;
    this.escalating = true;
    this.dmOpen = true;
    this.focus = 'dm';
    this.advanceEscTurn();
    this.dirty = true;
  }

  /** queue Rob's next line, or — if the conversation is spent — end it */
  private advanceEscTurn(): void {
    this.escTurn++;
    const turns = end.escalation.turns;
    if (this.escTurn >= turns.length) {
      this.escDone = true;
      this.escEndAt = this.t + 2.4;
      return;
    }
    this.dm.queueLine({ from: 'MentorRob', text: this.fill(turns[this.escTurn].rob) });
    this.escRobPending = true;
    this.escAwaitingReply = false;
  }

  /** the player says the line they were given — it changes only the label */
  private chooseReply(i: number): void {
    const reply = end.escalation.turns[this.escTurn].replies[i];
    this.dm.pushWhole({ from: ledger.name, text: reply.text });
    ledger.records.push(`escalation-reply:${reply.witness}`);
    if (!ledger.tags.includes('consent-on-file')) ledger.tags.push('consent-on-file');
    this.escAwaitingReply = false;
    this.advanceEscTurn();
    this.dirty = true;
  }

  get escalationActive(): boolean { return this.escalating; }

  // The channel is lurk-only and the DM is press-only — there is no free typing
  // anywhere (Sérgio: no keyboard dependency in VR). You are watched; you reply
  // with the words you are given. The witness still files you as a silent lurker.
  get userMessageCount(): number { return 0; }

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
    // the channel is lurk-only — no input field; the chat fills the window
    const c = ui.windowFrame(ctx, 14, 30, 400, 290, `${dialog.channel} — IRC`, this.focus === 'channel');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.black);
    const listW = 78;
    ui.px(ctx, c.x + c.w - listW, c.y, listW, c.h, ERA1.tealDark);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.silver;
    [...dialog.users, ledger.name].forEach((u, i) => {
      ctx.fillText(u.slice(0, 11), c.x + c.w - listW + 4, c.y + 4 + i * 11);
    });

    ui.setFont(ctx, 9);
    const chRows = this.rows(ctx, this.channel, c.w - listW - 12,
      (f) => (f === ledger.name ? ERA1.tooltip : ERA1.ok), ERA1.silver, caretOn).slice(-22);
    this.renderRows(ctx, chRows, c.x + 4, c.y + 4);

    if (this.dmOpen) {
      const d = ui.windowFrame(ctx, 170, 140, 300, 170, dialog.dmTitle, this.focus === 'dm');
      ui.px(ctx, d.x, d.y, d.w, d.h - 22, ERA1.paper);
      ui.setFont(ctx, 9);
      // the transcript scrolls; the reply takes the type area at the bottom (press-
      // only, no type box — Sérgio). When Rob is mid-line, the area is just empty.
      const dmRows = this.rows(ctx, this.dm, d.w - 12,
        (f) => (f === ledger.name ? ERA1.navy : ERA1.warnDark), ERA1.black, caretOn).slice(-9);
      this.renderRows(ctx, dmRows, d.x + 4, d.y + 4);
      if (this.escAwaitingReply) this.drawReplyTray(ctx, d.x, d.y + d.h - 20, d.w);
    }
  }

  /** the line(s) the player can say, in the type area at the bottom of the DM */
  private drawReplyTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const replies = end.escalation.turns[this.escTurn].replies;
    this.replyRects = this.replyGeometry(replies.length, x, y, w);
    ui.setFont(ctx, 10);
    replies.forEach((r, i) => {
      const rect = this.replyRects[i];
      ui.button(ctx, rect.x, rect.y, rect.w, rect.h, '', { hover: false });
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(r.text, rect.x + 8, rect.y + 5);
    });
  }

  private replyGeometry(
    n: number, x: number, y: number, w: number
  ): Array<{ x: number; y: number; w: number; h: number }> {
    const h = 18;
    if (n <= 1) return [{ x, y, w, h }];
    const gap = 6; const cw = (w - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => ({ x: x + i * (cw + gap), y, w: cw, h }));
  }

  handleClick(x: number, y: number): void {
    // the reply box is the only live control during the exchange
    if (this.escAwaitingReply) {
      const idx = this.replyRects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (idx >= 0) { this.chooseReply(idx); return; }
    }
    if (this.dmOpen && x >= 170 && x <= 470 && y >= 140 && y <= 310) this.focus = 'dm';
    else if (x >= 14 && x <= 414 && y >= 30 && y <= 320) this.focus = 'channel';
    this.dirty = true;
  }
}
