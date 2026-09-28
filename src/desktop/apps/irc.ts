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
const CPS_DM = 19;            // Rob types deliberately, not slowly (R3-28: "faster")
const HOLD_CHANNEL = 1.5;     // short pause between room lines
const HOLD_DM = 2.6;          // a pause after a DM line — time to read Rob, not to wait for him
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

  /** S141: a line has begun to type — the app plays the channel's blip */
  onStart?: () => void;
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
      this.onStart?.();
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
  /** S141: a line arriving in either stream — os.ts wires the sound */
  /** S155 / R3-25 — the tick sounds only for HIS lines and the request's arrival
   *  (Sérgio: "not on every message"); the room's chatter and Rob's typing are silent */
  private tick: (() => void) | null = null;
  set onLine(fn: () => void) {
    this.tick = fn;
    this.dm.onStart = () => { this.dmScroll = 0; };   // R3-28: a new line shows the end
  }
  private t = 0;
  private ambientFed = false;
  private dmReadyAt = Infinity; // set once the room's ambient chatter settles
  private dmFed = false;
  /** R3-26 — Rob's DM arrives as a REQUEST the player accepts, not a window that
   *  opens on him: "MentorRob would like to message you — Accept". */
  private dmRequested = false;
  private dmAccepted = false;
  /** ⚑ S186 — yes.gif over DCC: offered once his DM has landed, accepted (the only live answer),
   *  viewed (os.ts owns the viewer), and only then does Rob's last line come and the hook land */
  private sendOffered = false;
  private sendAccepted = false;
  private sendViewed = false;
  /** os opens the viewer */
  onImage?: () => void;
  /** R3-28 — the DM's scrollback: how many rows up from the newest (0 = the end) */
  private dmScroll = 0;
  private dmRowsTotal = 0;
  private dmRowsShown = 0;
  onHooked?: () => void;
  private hooked = false;
  dirty = true;

  // S1.7 escalation — Rob's residential pitch is now a TURN-BY-TURN exchange:
  // Rob types a line, you reply with the line you're given (the narrowed voice),
  // Rob continues. The reply only sets the witness label, never the outcome. The
  // reply box renders OUTSIDE the chat window so it never covers the transcript.
  /**
   * ⚑ S142 — THE CHANNEL TALKS TO HIM. The room notices him after its fourth
   * line (`welcome`), he answers with the one line he is given — the channel's
   * own reply tray, the same press-only grammar as the DM's — and the room
   * answers back (`afterReply`), Lume pointing him at Rob. The DM that follows
   * quotes the channel. See s1_irc.json `_doc`.
   */
  private welcomed = false;
  private chanAwaitingReply = false;
  private chanReplied = false;
  private escalating = false;
  private escTurn = -1;            // index of the current exchange
  private escRobPending = false;   // Rob's line for this turn is still typing
  private escAwaitingReply = false;// the reply box is live, awaiting the click
  private escDone = false;         // all turns spoken
  private escEndAt = Infinity;     // a beat after the last reply, then the packet
  private escFired = false;
  /**
   * ⚑ The reply tray's live controls. `replyGeometry` has always been the one
   * source of truth for both the draw and the hit test, so these never drifted
   * the way `kit.ts`'s did — but they carried no `id`, which left them in a gap:
   * an audit walking the object graph could see a rect field here and so not
   * flag the surface as unauditable, yet could not name or aim at a single
   * control in it. Ids added 2026-08-28, and the array is cleared whenever the
   * tray is not drawn, so what is published is only ever what is really live.
   */
  private replyRects: Array<{ x: number; y: number; w: number; h: number; id: string }> = [];
  onEscalationDone?: () => void;

  private fill(text: string): string {
    // ⚑ S145 — EVERY token, not the first: Lume's welcome (S142) names him twice
    //   ("oh hey — {name} just joined. hi {name} :)") and the tour photographed
    //   the second one raw on the channel
    return text.split('{name}').join(ledger.name);
  }

  update(dt: number): void {
    this.t += dt;
    // the room starts talking, then keeps a slow human rhythm
    if (!this.ambientFed && this.t >= AMBIENT_START) {
      this.ambientFed = true;
      for (const l of dialog.ambient) this.channel.queueLine(l);
    }
    if (this.channel.update(dt)) this.dirty = true;
    // the room notices him once its own talk has run out
    if (this.ambientFed && !this.welcomed && this.channel.idle && this.channel.done.length >= dialog.ambient.length) {
      this.welcomed = true;
      this.channel.queueLine({ from: dialog.welcome.from, text: this.fill(dialog.welcome.text) });
    }
    // …and once the welcome has finished typing, his one line is offered
    if (this.welcomed && !this.chanReplied && !this.chanAwaitingReply && this.channel.idle
        && this.channel.done.length >= dialog.ambient.length + 1) {
      this.chanAwaitingReply = true;
      this.dirty = true;
    }

    // once the room has finished talking (the x-files line is the last ambient),
    // and after a short quiet, Rob's DM is allowed to open — never before, so it
    // cannot cover a live conversation
    if (this.chanReplied && this.dmReadyAt === Infinity
        && this.channel.idle && this.channel.done.length >= dialog.ambient.length + 2 + dialog.afterReply.length) {
      this.dmReadyAt = this.t + DM_AFTER_AMBIENT;
    }
    // R3-26: the room has settled — Rob ASKS first; the window opens on Accept
    if (!this.dmRequested && this.t >= this.dmReadyAt) {
      this.dmRequested = true;
      this.tick?.();
      this.dirty = true;
    }
    if (this.dmFed && this.dm.update(dt)) this.dirty = true;

    // ⚑ S186 — his DM has landed: Rob sends the picture (the only answer is Accept)
    if (this.dmFed && !this.sendOffered && this.dm.idle && this.dm.done.length >= dialog.dm.length) {
      this.sendOffered = true;
      this.tick?.();
      this.dirty = true;
    }
    // the hook lands once the whole DM — and the picture, and Rob's line after it — has landed
    if (this.dmFed && !this.hooked && this.sendViewed && this.dm.idle && this.dm.done.length >= dialog.dm.length + 1) {
      this.hooked = true;
      if (!ledger.records.includes('mirc-log')) ledger.records.push('mirc-log');
      if (!ledger.tags.includes('pastoral-referral')) ledger.tags.push('pastoral-referral');
      this.onHooked?.();
    }

    // S1.7 — once Rob's line for this turn finishes typing, offer the reply
    if (this.escalating && this.escRobPending && this.dm.idle) {
      this.escRobPending = false;
      this.escAwaitingReply = true;
      // S151 / R3-13: a turn may file a record the moment Rob has SAID it — "i
      // spoke with your mother" is what makes the Family Form exist (os.ts)
      const rec = (end.escalation.turns[this.escTurn] as { record?: string }).record;
      if (rec && !ledger.records.includes(rec)) ledger.records.push(rec);
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
    // S142: the review jump lands AFTER the channel has talked to him
    this.welcomed = true; this.chanReplied = true;
    this.channel.pushWhole({ from: dialog.welcome.from, text: this.fill(dialog.welcome.text) });
    this.channel.pushWhole({ from: ledger.name, text: dialog.channelReply.text });
    for (const l of dialog.afterReply) this.channel.pushWhole({ from: l.from, text: this.fill(l.text) });
    this.dmRequested = true; this.dmAccepted = true;
    this.sendOffered = true; this.sendAccepted = true; this.sendViewed = true;   // S186: the review jump has had the picture
    this.dmFed = true;
    this.dmOpen = true;
    this.focus = 'dm';
    if (this.dm.done.length === 0) {
      for (const line of dialog.dm) this.dm.pushWhole({ from: 'MentorRob', text: this.fill(line) });
      this.dm.pushWhole({ from: 'MentorRob', text: this.fill(dialog.dcc.afterSend) });
    }
    if (!this.hooked) {
      this.hooked = true;
      if (!ledger.records.includes('mirc-log')) ledger.records.push('mirc-log');
      if (!ledger.tags.includes('pastoral-referral')) ledger.tags.push('pastoral-referral');
      this.onHooked?.();
    }
    this.dirty = true;
  }

  /** R3-26 — the request accepted: the DM opens and Rob's lines begin */
  private acceptRequest(): void {
    if (this.dmAccepted) return;
    this.dmAccepted = true;
    this.dmFed = true;
    this.dmOpen = true;
    this.focus = 'dm';
    ledger.records.push(`dm-request:${dialog.request.witness}`);
    for (const line of dialog.dm) this.dm.queueLine({ from: 'MentorRob', text: this.fill(line) });
    this.dirty = true;
  }

  /** the request is on screen, unanswered — the guide's soft lines wait */
  get requestPending(): boolean { return this.dmRequested && !this.dmAccepted; }

  /** ⚑ S186 — the DCC send is on screen, unanswered */
  get sendPending(): boolean { return this.sendOffered && !this.sendAccepted; }
  /** accepted: filed, and the picture opens (os.ts) */
  private acceptSend(): void {
    if (this.sendAccepted) return;
    this.sendAccepted = true;
    if (!ledger.records.includes('yes-received')) ledger.records.push('yes-received');
    this.onImage?.();
    this.dirty = true;
  }
  /** the viewer was closed: Rob says the line he was waiting to say */
  imageClosed(): void {
    if (this.sendViewed || !this.sendAccepted) return;
    this.sendViewed = true;
    this.dm.queueLine({ from: 'MentorRob', text: this.fill(dialog.dcc.afterSend) });
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

  /** his first words in the channel: the line he is given, and the room answers */
  private sayInChannel(): void {
    if (!this.chanAwaitingReply) return;
    this.chanAwaitingReply = false;
    this.chanReplied = true;
    this.channel.pushWhole({ from: ledger.name, text: dialog.channelReply.text });
    this.tick?.();
    ledger.records.push(`channel-reply:${dialog.channelReply.witness}`);
    for (const l of dialog.afterReply) this.channel.queueLine({ from: l.from, text: this.fill(l.text) });
    this.dirty = true;
  }

  /** the player says the line they were given — it changes only the label */
  private chooseReply(i: number): void {
    const reply = end.escalation.turns[this.escTurn].replies[i];
    this.dm.pushWhole({ from: ledger.name, text: reply.text });
    this.dmScroll = 0;
    this.tick?.();
    ledger.records.push(`escalation-reply:${reply.witness}`);
    if (!ledger.tags.includes('consent-on-file')) ledger.tags.push('consent-on-file');
    this.escAwaitingReply = false;
    this.advanceEscTurn();
    this.dirty = true;
  }

  get escalationActive(): boolean { return this.escalating; }
  /** S151 — a window is drawn over this one: its tray is not pressable, so it
   *  publishes nothing (os.ts calls this after the windows are drawn). The
   *  walker kept aiming at a reply under the restored wizard and spent the
   *  reply's press cap on inert presses — a published rect must be a real one. */
  covered(): void { this.replyRects = []; }
  /** S151 — a reply tray is live: the player is being talked to (the guide's soft lines wait) */
  get awaitingReply(): boolean { return this.chanAwaitingReply || this.escAwaitingReply || this.requestPending || this.sendPending; }

  // The DM is press-only and, since S142, so is the channel — there is no free
  // typing anywhere (Sérgio: no keyboard dependency in VR). You are watched; you
  // reply with the words you are given, and the record counts them.
  // ⚑ S145 — this returned 0 while the wall said "first message — spoke in
  //   channel" three rows below "0 message(s) on file" (tour-e1 frame 13): the
  //   sharp side contradicting itself. Counted off the ledger, where the lines are.
  get userMessageCount(): number {
    return ledger.records.filter((r) => r.startsWith('channel-reply:') || r.startsWith('escalation-reply:')).length;
  }

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
    const c = ui.windowFrame(ctx, 14, 30, 400, 290, `${dialog.channel} — IRC`, this.focus === 'channel', 'irc');
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
    // ⚑ a tray that is not live publishes NOTHING — the first cut left the
    //   channel's rect standing after his line was said, and the walk pressed
    //   the phantom eight times, spending the cap the escalation needed
    if (!this.chanAwaitingReply && !this.escAwaitingReply) this.replyRects = [];
    if (this.chanAwaitingReply && !this.dmOpen) {
      // S142: his one line, in the channel's own type area — the same grammar as the DM's
      const rect = { x: c.x, y: c.y + c.h - 20, w: c.w - listW, h: 18, id: 'reply:0' };
      this.replyRects = [rect];
      ui.setFont(ctx, 10);
      ui.button(ctx, rect.x, rect.y, rect.w, rect.h, '', { hover: false });
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(dialog.channelReply.text, rect.x + 8, rect.y + 5);
    }

    if (this.dmOpen) {
      const d = ui.windowFrame(ctx, 170, 140, 300, 170, dialog.dmTitle, this.focus === 'dm');
      ui.px(ctx, d.x, d.y, d.w, d.h - 22, ERA1.paper);
      ui.setFont(ctx, 9);
      // the transcript scrolls; the reply takes the type area at the bottom (press-
      // only, no type box — Sérgio). When Rob is mid-line, the area is just empty.
      // R3-28 — SCROLLBACK: the window shows a page of the thread and two arrows
      //   page it; a new line always brings the view back to the end
      const all = this.rows(ctx, this.dm, d.w - 24,
        (f) => (f === ledger.name ? ERA1.navy : ERA1.warnDark), ERA1.black, caretOn);
      const PAGE = 9;
      this.dmRowsTotal = all.length; this.dmRowsShown = PAGE;
      this.dmScroll = Math.max(0, Math.min(this.dmScroll, Math.max(0, all.length - PAGE)));
      const end = all.length - this.dmScroll;
      const dmRows = all.slice(Math.max(0, end - PAGE), end);
      this.renderRows(ctx, dmRows, d.x + 4, d.y + 4);
      if (this.escAwaitingReply) this.drawReplyTray(ctx, d.x, d.y + d.h - 20, d.w);
      else this.replyRects = [];   // nothing to answer: publish nothing
      if (all.length > PAGE) {
        const ax = d.x + d.w - 14;
        const canUp = end - PAGE > 0; const canDown = this.dmScroll > 0;
        ui.button(ctx, ax, d.y + 2, 12, 12, '^', { disabled: !canUp });
        ui.button(ctx, ax, d.y + d.h - 36, 12, 12, 'v', { disabled: !canDown });
        if (canUp) this.replyRects.push({ x: ax, y: d.y + 2, w: 12, h: 12, id: 'dm-up' });
        if (canDown) this.replyRects.push({ x: ax, y: d.y + d.h - 36, w: 12, h: 12, id: 'dm-down' });
      }
    }
    // R3-26 — the request: a small dialog over the channel, one live answer
    if (this.requestPending) {
      const q = ui.windowFrame(ctx, 150, 150, 260, 92, dialog.request.title, true);
      ui.px(ctx, q.x, q.y, q.w, q.h, ERA1.beige);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ui.wrapText(ctx, this.fill(dialog.request.text), q.w - 16).forEach((ln, i) => ctx.fillText(ln, q.x + 8, q.y + 8 + i * 13));
      const by = q.y + q.h - 26;
      ui.button(ctx, q.x + q.w - 8 - 70, by, 70, 20, dialog.request.accept, {});
      // ⚑ the other answer is drawn dead: the mentor always finds you (the
      //   routing is the harm) — shown to be dead, not hidden (R26's convention)
      ui.button(ctx, q.x + q.w - 8 - 70 - 6 - 70, by, 70, 20, dialog.request.ignore, { disabled: true });
      this.replyRects = [{ x: q.x + q.w - 8 - 70, y: by, w: 70, h: 20, id: 'dm-accept' }];
    }
    // ⚑ S186 — the DCC send: the same grammar, one live answer (his "you have to accept")
    if (this.sendPending) {
      const q = ui.windowFrame(ctx, 160, 170, 270, 104, dialog.dcc.title, true);
      ui.px(ctx, q.x, q.y, q.w, q.h, ERA1.beige);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ui.wrapText(ctx, this.fill(dialog.dcc.text), q.w - 16).forEach((ln, i) => ctx.fillText(ln, q.x + 8, q.y + 8 + i * 13));
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(dialog.dcc.from, q.x + 8, q.y + 38);
      const by = q.y + q.h - 26;
      ui.button(ctx, q.x + q.w - 8 - 70, by, 70, 20, dialog.dcc.accept, {});
      ui.button(ctx, q.x + q.w - 8 - 70 - 6 - 70, by, 70, 20, dialog.dcc.ignore, { disabled: true });
      this.replyRects = [{ x: q.x + q.w - 8 - 70, y: by, w: 70, h: 20, id: 'dcc-accept' }];
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
  ): Array<{ x: number; y: number; w: number; h: number; id: string }> {
    const h = 18;
    if (n <= 1) return [{ x, y, w, h, id: 'reply:0' }];
    const gap = 6; const cw = (w - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => ({ x: x + i * (cw + gap), y, w: cw, h, id: `reply:${i}` }));
  }

  handleClick(x: number, y: number): void {
    // R3-26: the request owns the window while it stands
    if (this.requestPending) {
      const r = this.replyRects.find((r) => r.id === 'dm-accept');
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) this.acceptRequest();
      return;
    }
    // S186: …and so does the DCC send
    if (this.sendPending) {
      const r = this.replyRects.find((r) => r.id === 'dcc-accept');
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) this.acceptSend();
      return;
    }
    // R3-28: the scrollback's arrows
    const arrow = this.replyRects.find((r) => (r.id === 'dm-up' || r.id === 'dm-down')
      && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (arrow) {
      this.dmScroll += arrow.id === 'dm-up' ? this.dmRowsShown - 1 : -(this.dmRowsShown - 1);
      this.dmScroll = Math.max(0, Math.min(this.dmScroll, Math.max(0, this.dmRowsTotal - this.dmRowsShown)));
      this.dirty = true;
      return;
    }
    // the reply box is the only live control during the exchange
    if (this.escAwaitingReply) {
      const idx = this.replyRects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (idx >= 0) { this.chooseReply(idx); return; }
    }
    if (this.chanAwaitingReply) {
      const idx = this.replyRects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (idx >= 0) { this.sayInChannel(); return; }
    }
    if (this.dmOpen && x >= 170 && x <= 470 && y >= 140 && y <= 310) this.focus = 'dm';
    else if (x >= 14 && x <= 414 && y >= 30 && y <= 320) this.focus = 'channel';
    this.dirty = true;
  }
}
