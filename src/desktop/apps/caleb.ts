import decisions from '../../../data/strings/cx3b.json';
/**
 * THE CALEB THREAD — the FELT half (S2R.3–S2R.6, Session 45; rebuilt S339).
 *
 * Two people who survived the same placement, talking. The window is `felt`:
 * bare, human, specific — no satire, no mechanics, nothing scored, and
 * **LAMBY IS ABSENT**. That law is a module boundary here, not a promise:
 * this file imports no Lamby renderer, no Lamby strings, and draws no mark.
 * Everything the apparatus does TO this conversation is `operable` and lives
 * in src/desktop/apps/accountability.ts, which draws over this window's rect
 * and never inside its transcript.
 *
 * ⚑ S339 (his 8 Nov headset + answers 13/14; docs/reinterp/UIB_JOB_2003_2026-11-09.md):
 *  - THE MSN LOOK. "This is too close to the Mirk, and it should be closer to MSN… the bubbles… we can scroll up and
 *    down… this window could be bigger." The window nearly fills the monitor; each message is a bubble (his on the
 *    left, Daniel's on the right, "caleb says:" over a run); the transcript scrolls by its own ▲ ▼ (a press, never a
 *    gesture: the input law) and follows the newest line unless the visitor has scrolled up.
 *  - THE SONG'S TWO-STEP (answer 13). When the file arrives the conversation holds: "Wait" keeps it holding while he
 *    listens, "Go on" lets Caleb carry on — and if nothing is pressed for a while it carries on by itself.
 *  - NO CORNER TOAST, NO "NEW MESSAGE" (answer 14 / T13). Caleb does not knock while the apparatus is running. The
 *    Messenger comes back to life only after PureMail: the block lifts, his four lines arrive here, in this window.
 *  - THE RESIDUE IS DANIEL'S REPLY (answer 14). The bare field with its Continue is retired. Sérgio's locked line
 *    ("Then it was never me that was broken…", `_s`, verbatim) is now the one chip under Caleb's last line: Daniel
 *    says it to him, and saying it is the moment the update arrives (os.ts arms u3 at once). The second commit-press
 *    still rhymes with the first; the record still files it only as the gap it cannot classify.
 *
 * What this file owns:
 *  - the messenger window and its transcript (data/dialog/s2_caleb.json)
 *  - reply chips that REGISTER and never BRANCH — each files a `ledgerTag` the
 *    moment it is pressed and none of them changes what Caleb says next
 *  - THE COMMIT-PRESS: one chip, no alternative ("i want to be with you too").
 *  - THE REDACTION, one component run twice (`Redaction` below): forward at
 *    S2R.3B as Lamby explains that wanting is conducting, and the SAME object
 *    run in reverse at S2R.5 as the apparatus dies. No second grammar.
 *  - his four lines after the block lifts, and Daniel's answer.
 *
 * Copy: data/dialog/s2_caleb.json. The ⟨S⟩ residue line is Sérgio's locked canon, never paraphrased or re-wrapped.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import caleb from '../../../data/dialog/s2_caleb.json';
import { playOnce, isAudioAvailable } from '../../audio/tapeAudio';

interface Chip { id: string; label: string; say: string; ledgerTag: string }
interface ThreadStep { id: string; from?: string; text?: string; chips?: Chip[]; commit?: boolean;
  /** S143: a file he sends. S157 / R3-52: it no longer plays by itself — it ARRIVES as an
   *  attachment under the line, and pressing it opens the media player (os.ts). */
  audio?: string; requiresAudio?: boolean; attachment?: boolean }
interface Msg { from: 'them' | 'you'; text: string; attachment?: { name: string; audio: string; size: string } }
interface Hit { x: number; y: number; w: number; h: number; id: string }

// ⚑ S143: a step that needs a file it does not have is not in the thread —
//   the song he sends exists only when the track is registered and on disk
const threadWithRoom = (caleb.thread as unknown as ThreadStep[]).flatMap(s => s.id === 'c01' ? [s, { id: 'c01-room', from: 'them', text: decisions.caleb.sharedRoom }] : [s]);
const THREAD = threadWithRoom.filter((s) => !s.requiresAudio || isAudioAvailable(s.audio));

// ── PACING — ALL OF IT LIVES IN data/dialog/s2_caleb.json's `pacing` BLOCK ──
const P = caleb.pacing;
const CHAT = P.chat;
const RET = P.return;
const HOLD = caleb.songHold as { wait: string; go: string; listening: string; autoSeconds: number };
const RESIDUE = caleb.residue as { line: string; answer: string };

/** the messenger window (felt). The accountability stamp needs this rect. S339: MSN-sized — nearly the whole
 *  monitor above the taskbar (his "this window could be bigger… it doesn't need to be this small in the corner"). */
const WIN = { x: 10, y: 6, w: 492, h: 352 } as const;
/** the right-hand column: the two display pictures, as the period's messenger had them */
const SIDE_W = 100;
/** the reply tray under the transcript */
const TRAY_H = 38;
/** the scroll bar's width and the step of one press */
const SB_W = 12;
const SCROLL_STEP = 36;
/** the bubbles' type and spacing */
const FONT = 10;
const LINE_H = 13;
const PAD = 5;

/**
 * REDACTION ↔ UN-REDACTION — one component, run twice.
 *
 * Forward (S2R.3B): messages black out from the top, one at a time, while the
 * apparatus explains that the wanting was the conduct. Reverse (S2R.5): the
 * exact same walk undone — the last message blacked is the first returned, so
 * the sentence the system took last ("i just want to sit next to you and not
 * be watched") is the first one you get back, and the greeting comes home
 * last. S339: it walks MESSAGES (bubbles), and the transcript scrolls with it.
 */
class Redaction {
  private n = 0;
  private dir: -1 | 0 | 1 = 0;
  private t = 0;
  private total = 0;
  /** s per message — slow enough to watch a sentence disappear, fast enough to hurt */
  private static readonly STEP = P.redactionRowSeconds;

  start(total: number, dir: 1 | -1): void {
    this.total = total;
    this.dir = dir;
    this.t = 0;
    if (dir === -1) this.n = Math.min(this.n, total);
  }

  /** returns true when something changed (the caller marks itself dirty) */
  update(dt: number): boolean {
    if (this.dir === 0) return false;
    this.t += dt;
    if (this.t < Redaction.STEP) return false;
    this.t -= Redaction.STEP;
    if (this.dir === 1) {
      if (this.n >= this.total) { this.dir = 0; return false; }
      this.n++;
    } else {
      if (this.n <= 0) { this.dir = 0; return false; }
      this.n--;
    }
    return true;
  }

  /** ?debug=1 — the blackout, already finished */
  sealNow(total: number): void { this.total = total; this.n = total; this.dir = 0; }

  /** messages [0, n) are blacked out */
  hidden(i: number): boolean { return i < this.n; }
  get running(): boolean { return this.dir !== 0; }
  get blackedRows(): number { return this.n; }
  get sealed(): boolean { return this.total > 0 && this.n >= this.total; }
  get cleared(): boolean { return this.n === 0; }
}

/** Whole messages arrive with their beep; the authored gaps preserve reading time. */
class TypeStream {
  private queue: string[] = [];
  private hold = 0;
  /** s of quiet after a finished line, before the next one arrives */
  gap = CHAT.lineGapSeconds;
  onLine?: (text: string) => void;

  push(text: string): void { this.queue.push(text); }
  reset(): void { this.queue = []; this.hold = 0; }
  /** an EXTRA beat before the next line — he takes a moment (after a reply) */
  pause(seconds: number): void { this.hold = Math.max(this.hold, seconds); }
  get idle(): boolean { return this.queue.length === 0 && this.hold <= 0; }

  update(dt: number): boolean {
    if (this.hold > 0) { this.hold -= dt; return false; }
    const next = this.queue.shift();
    if (next !== undefined) {
      playOnce('notify_2003.mp3');
      this.onLine?.(next); // T26: message arrives whole with its beep.
      this.hold = this.gap;
      return true;
    }
    return false;
  }
}

/** S339: 'answer' = his four lines are in and Daniel's reply is offered; 'done' = Daniel has said it (the window
 *  stays: the conversation is theirs, and the update arrives over it). */
export type CalebPhase = 'chat' | 'sealed' | 'restoring' | 'returning' | 'answer' | 'done';

export class CalebThreadApp {
  onClose?: () => void;
  open = true;
  dirty = true;
  phase: CalebPhase = 'chat';

  /** fires on the commit-press — os.ts hands the beat to the apparatus */
  onCommit?: () => void;
  /** fires the moment Daniel says the residue line — os.ts arms the update at once (his answer 14) */
  onThreadDone?: () => void;
  /** S157 / R3-52: the OS opens the media player for the file he sent */
  onOpenAttachment?: (file: { name: string; audio: string; size: string }) => void;
  /** S274 — the song's file has arrived in the thread */
  onSongArrived?: () => void;

  private readonly msgs: Msg[] = [];
  private readonly stream = new TypeStream();
  private readonly redaction = new Redaction();
  private step = -1;
  private awaiting: Chip[] | null = null;
  private awaitingCommit = false;
  private pendingChips: Chip[] | null = null;
  private pendingCommit = false;
  private chipsAt = Infinity;
  private t = 0;
  private startAt = CHAT.openDelaySeconds;
  private commitAt = Infinity;
  private returnSettleAt = Infinity;
  private returnStartAt = Infinity;
  private returnLineCount = 0;
  private residueCommitted = false;
  /** ⚑ S342 — Caleb's answer to Daniel's line has arrived; the thread ends (and the update arms) after it */
  private answerLanded = false;
  /** S339 — the song's two-step: 'none' → 'offered' (Wait · Go on, auto after HOLD.autoSeconds) → 'waiting' (Go on)
   *  → 'released' */
  private songHold: 'none' | 'offered' | 'waiting' | 'released' = 'none';
  private songHoldUntil = Infinity;
  private hits: Hit[] = [];
  private hover = '';
  /** the transcript's scroll: px from the top of the content; `stick` follows the newest line */
  private scrollY = 0;
  private stick = true;
  private maxScroll = 0;
  private sealPending = false;

  constructor() {
    this.stream.onLine = (text) => {
      this.msgs.push({ from: 'them', text });
      if (this.residueCommitted && text === RESIDUE.answer) this.answerLanded = true;
      if (this.phase === 'returning') this.returnLineCount++;
      const st = THREAD[this.step];
      if (this.phase === 'chat' && st && st.text === text && st.audio && st.attachment) {
        const last = this.msgs[this.msgs.length - 1];
        last.attachment = { name: caleb.attachment.label, audio: st.audio, size: caleb.attachment.size };
        this.onSongArrived?.();   // S274: the "1997" folder takes its unread pip (his option (b))
        // S339 — the two-step: the conversation holds for the song
        this.songHold = 'offered';
        this.songHoldUntil = this.t + HOLD.autoSeconds;
      }
      this.dirty = true;
    };
    this.file('opened', 'intervened', caleb.witness.contactOpened);
  }

  /** ⚑ S223 cloud / W1-D13 — the conversation is still being walked out message by message. os.ts holds the
   *  network's failure until this is false. Reads state only; the felt module learns nothing. */
  get blackingOut(): boolean { return this.redaction.running; }
  /** the felt window's rect — the operable stamp is positioned against it */
  get windowRect(): { x: number; y: number; w: number; h: number } { return { ...WIN }; }
  /** ⚑ S369 / F07 — set by the OS each frame: the canvas y below which the Accountability band covers this window (null = none).
   *  The transcript then ends above it and follows its newest line there: the strip docks BELOW the thread, never over it. */
  coverFromY: number | null = null;

  private file(
    id: string,
    outcome: 'replied' | 'held' | 'committed' | 'intervened' | 'restored' | 'residue',
    witness: string
  ): void {
    ledger.caleb.push({ id, outcome, witness });
  }

  // ── the beat seams os.ts drives ────────────────────────────────────────
  /** S2R.3B — the apparatus starts blacking the conversation out (os.ts cuts the song's player) */
  beginRedaction(): void {
    if (this.redaction.running || this.redaction.sealed) return;
    this.songHold = 'released';
    this.redaction.start(Math.max(this.msgs.length, 1), 1);
    this.file('redaction', 'intervened', caleb.witness.redacted);
    this.dirty = true;
  }

  /** S2R.5 — the block lifts: the same walk, reversed. S339: the Messenger comes back to life here, after PureMail. */
  beginRestore(): void {
    if (this.phase !== 'sealed') return;
    this.phase = 'restoring';
    this.open = true;
    this.redaction.start(this.redaction.blackedRows, -1);
    this.file('restore', 'restored', caleb.witness.blockLifted);
    this.dirty = true;
  }

  /** S339 / ⚑ S342 — the update was put off once ("Remind me later"): the deferral returns to the Messenger, where
   *  Caleb's answer already stands (his 9 Nov answer 3: every player sees it, before the update; nothing new here). */
  afterword(): void {
    if (this.phase !== 'done') return;
    this.open = true;
    this.stick = true;
    this.dirty = true;
  }

  // ── update ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    this.t += dt;

    if (this.redaction.update(dt)) this.dirty = true;
    if (this.phase === 'restoring' && !this.redaction.running && this.redaction.cleared) {
      // the block has lifted — but he does not answer the instant it does
      this.phase = 'returning';
      this.returnStartAt = this.t + RET.leadInSeconds;
      this.dirty = true;
    }
    if (this.t >= this.returnStartAt) {
      this.returnStartAt = Infinity;
      this.stream.gap = RET.lineGapSeconds; // his four lines get more room than the chat did
      for (const line of caleb.return.lines as string[]) this.stream.push(line);
      this.stick = true;
      this.dirty = true;
    }

    if (this.phase === 'chat' && this.step < 0 && this.t >= this.startAt) this.advance();
    if (this.stream.update(dt)) { this.stick = this.stick || this.phase !== 'chat'; this.dirty = true; }

    // the song's two-step: if nothing is pressed, the conversation carries on by itself
    if (this.songHold === 'offered' && this.t >= this.songHoldUntil) { this.songHold = 'released'; this.dirty = true; }

    // the chips land a beat after the line they answer, never on the same frame
    if (this.pendingChips && this.t >= this.chipsAt) {
      this.awaiting = this.pendingChips;
      this.awaitingCommit = this.pendingCommit;
      this.pendingChips = null;
      this.chipsAt = Infinity;
      this.dirty = true;
    }

    if (this.phase === 'chat' && this.step >= 0 && !this.awaiting && !this.awaitingCommit
        && !this.pendingChips && this.stream.idle && !this.songHeld) {
      this.advance();
    }

    if (this.t >= this.commitAt) {
      this.commitAt = Infinity;
      this.phase = 'sealed';
      this.onCommit?.();
      this.dirty = true;
    }

    if (this.phase === 'returning' && this.stream.idle && this.returnSettleAt === Infinity
        && this.returnStartAt === Infinity
        && this.returnLineCount >= (caleb.return.lines as string[]).length) {
      this.returnSettleAt = this.t + RET.settleSeconds;
    }
    // ⚑ S342 — Caleb has answered Daniel and the line has had its moment: NOW the record files the gap and the
    //   update is free to arrive (his 9 Nov answer 3: "Caleb answers with this line, and THEN the update pops in")
    if (this.residueCommitted && this.answerLanded && this.phase === 'answer' && this.stream.idle) {
      this.file('residue', 'residue', caleb.witness.residue);
      this.phase = 'done';
      this.onThreadDone?.();
      this.dirty = true;
    }
    if (this.t >= this.returnSettleAt) {
      // S339 — Daniel's reply is offered: one chip, Sérgio's line, verbatim
      this.returnSettleAt = Infinity;
      this.phase = 'answer';
      this.dirty = true;
    }
  }

  private get songHeld(): boolean { return this.songHold === 'offered' || this.songHold === 'waiting'; }

  /** walk the authored thread: his lines queue to arrive; a chip step waits */
  private advance(): void {
    this.step++;
    const s = THREAD[this.step];
    if (!s) return;
    if (s.chips) {
      this.pendingChips = s.chips;
      this.pendingCommit = !!s.commit;
      this.chipsAt = this.t + CHAT.chipsArriveSeconds;
      this.dirty = true;
      return;
    }
    if (s.text) this.stream.push(s.text);
  }

  private chooseChip(chip: Chip): void {
    const wasCommit = this.awaitingCommit;
    this.awaiting = null;
    this.awaitingCommit = false;
    if (chip.say) this.msgs.push({ from: 'you', text: chip.say });
    this.stick = true;
    if (wasCommit) {
      this.file(chip.id, 'committed', chip.ledgerTag);
      // it lands, warm, and is allowed to just sit there before anything answers it
      this.commitAt = this.t + CHAT.commitLandsSeconds;
    } else {
      this.file(chip.id, chip.say ? 'replied' : 'held', chip.ledgerTag);
      this.advance();
      this.stream.pause(CHAT.replyGapSeconds); // he reads it before he types back
    }
    this.dirty = true;
  }

  /** S339 — Daniel says it, to Caleb. ⚑ S342 — Caleb answers ("it never was, d. not once."), for every player, and
   *  only then is the gap filed (the record shows a GAP it could not classify — never the line itself) and the update
   *  allowed in (update(), above). */
  private commitResidue(): void {
    if (this.residueCommitted) return;
    this.residueCommitted = true;
    this.msgs.push({ from: 'you', text: RESIDUE.line });
    this.stick = true;
    this.stream.gap = CHAT.lineGapSeconds + 0.6;   // a beat after his answer before the system speaks
    this.stream.pause(CHAT.replyGapSeconds);
    this.stream.push(RESIDUE.answer);
    this.dirty = true;
  }

  // ── drawing ────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, caleb.window.title, true);
    this.hits.push({ ...c.closeBox, id: 'caleb-close' });
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);

    // the "To:" strip and the dead toolbar (Nudge · Wink · Font — the era's furniture, not this piece's inputs)
    const CT = caleb.window.contacts;
    ui.setFont(ctx, 10);
    ui.px(ctx, c.x + 4, c.y + 3, 14, 13, ERA1.navy);
    ctx.fillStyle = ERA1.white; ui.setFont(ctx, 9);
    ctx.fillText(CT.mark, c.x + 5, c.y + 5);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(caleb.window.to, c.x + 24, c.y + 5);
    const toW = ctx.measureText(caleb.window.to).width;
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(caleb.window.contact, c.x + 28 + toW, c.y + 5);
    const nameW = ctx.measureText(caleb.window.contact).width;
    ui.px(ctx, c.x + 34 + toW + nameW, c.y + 8, 6, 6, ERA1.ok);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(`(${caleb.window.status})`, c.x + 44 + toW + nameW, c.y + 5);
    [CT.nudge, CT.wink, CT.font].forEach((v, i) => ui.button(ctx, c.x + c.w - SIDE_W - 168 + i * 56, c.y + 2, 52, 15, v, { disabled: true }));

    // the right column: his display picture with his personal message, Daniel's below
    this.drawSide(ctx, c.x + c.w - SIDE_W, c.y + 2, SIDE_W - 4, c.h - 4);

    // the transcript
    const tx = c.x + 4, ty = c.y + 22;
    const tw = c.w - SIDE_W - 8 - SB_W;
    const full = c.h - 22 - TRAY_H - 4;
    const th = this.coverFromY !== null ? Math.max(40, Math.min(full, this.coverFromY - 4 - ty)) : full;
    ui.px(ctx, tx - 1, ty - 1, tw + SB_W + 2, th + 2, ERA1.grey);
    ui.px(ctx, tx, ty, tw, th, ERA1.white);
    this.drawTranscript(ctx, tx, ty, tw, th);
    this.drawScrollBar(ctx, tx + tw, ty, SB_W, th);

    // the tray
    this.drawTray(ctx, c.x + 4, c.y + c.h - TRAY_H - 2, c.w - SIDE_W - 8, TRAY_H);
  }

  /** two framed pictures, no faces (no likenesses): his is the window's own colour field, Daniel's the desk's */
  private drawSide(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const CT = caleb.window.contacts;
    const pic = (px: number, py: number, s: number, ground: string, mark: string): void => {
      ui.px(ctx, px - 1, py - 1, s + 2, s + 2, ERA1.grey);
      ui.px(ctx, px, py, s, s, ERA1.white);
      ui.px(ctx, px + 3, py + 3, s - 6, s - 6, ground);
      // a plain sun over a horizon — a stock display picture of the period, not a person
      const r = Math.round(s / 6);
      ui.px(ctx, px + Math.round(s / 2) - r, py + Math.round(s / 3) - r, r * 2, r * 2, mark);
      ui.px(ctx, px + 3, py + Math.round(s * 0.66), s - 6, Math.round(s * 0.34) - 3, ERA1.olive);
    };
    const s1 = Math.min(84, w - 8);
    pic(x + Math.round((w - s1) / 2), y + 4, s1, ERA1.titleBlue, ERA1.tooltip);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(caleb.window.contact, x + 6, y + s1 + 10);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    let pm = CT.personal as string;
    while (pm.length > 4 && ctx.measureText(pm).width > w - 10) pm = `${pm.slice(0, -2)}…`;
    ctx.fillText(pm, x + 6, y + s1 + 24);
    const s2 = Math.min(60, w - 24);
    pic(x + Math.round((w - s2) / 2), y + h - s2 - 22, s2, ERA1.teal, ERA1.paper);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(this.youNick(), x + 6, y + h - 16);
  }

  private youNick(): string {
    // finding C9 — his replies are HIS: a typed name with a letter in it, else the data's own `you`
    const typed = ledger.name.trim();
    return /[a-zA-ZÀ-ɏ]/.test(typed) ? typed.toLowerCase() : caleb.window.you;
  }

  /** lay the messages out as bubbles, then draw the slice in view — the redaction walks these MESSAGES */
  private drawTranscript(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.setFont(ctx, FONT);
    const maxBubble = Math.round(w * 0.74);
    type Item = { i: number; m: Msg; top: number; bh: number; bw: number; lines: string[]; head: string | null };
    const items: Item[] = [];
    let cy = 6;
    let prev: Msg['from'] | null = null;
    this.msgs.forEach((m, i) => {
      const head = m.from !== prev ? caleb.window.says.replace('{name}', m.from === 'them' ? caleb.window.contact : this.youNick()) : null;
      prev = m.from;
      if (head) cy += 12;
      ui.setFont(ctx, FONT);
      const lines = m.text ? ui.wrapText(ctx, m.text, maxBubble - PAD * 2) : [];
      let bw = Math.max(24, ...lines.map((l) => Math.ceil(ctx.measureText(l).width) + PAD * 2));
      let bh = lines.length * LINE_H + PAD * 2 - 2;
      if (m.attachment) {
        const label = `${m.attachment.name}  ${m.attachment.size}`;
        bw = Math.max(bw, Math.ceil(ctx.measureText(label).width) + 34 + PAD * 2);
        bh += 20;
      }
      bw = Math.min(bw, maxBubble);
      items.push({ i, m, top: cy, bh, bw, lines, head });
      cy += bh + 5;
    });
    const contentH = cy + 4;
    this.maxScroll = Math.max(0, contentH - h);
    // while the block walks, the transcript follows the walk; otherwise it follows the newest line unless scrolled up
    if (this.redaction.running && items.length) {
      const k = Math.min(items.length - 1, Math.max(0, this.redaction.blackedRows - 1));
      this.scrollY = items[k].top - Math.round(h / 2);
    } else if (this.stick) this.scrollY = this.maxScroll;
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY));
    if (this.sealPending) { this.sealPending = false; this.redaction.sealNow(this.msgs.length); }

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (const it of items) {
      const top = y + it.top - this.scrollY;
      if (top + it.bh < y - 14 || top > y + h) continue;
      const mine = it.m.from === 'you';
      const bx = mine ? x + w - it.bw - 6 : x + 6;
      if (it.head) {
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.grey;
        const hw = ctx.measureText(it.head).width;
        ctx.fillText(it.head, mine ? x + w - 6 - hw : x + 6, top - 12);
      }
      if (this.redaction.hidden(it.i)) {
        // the censor bar: the bubble's own shape, nothing else touched
        this.bubble(ctx, bx, top, it.bw, it.bh, ERA1.black, ERA1.black);
        continue;
      }
      this.bubble(ctx, bx, top, it.bw, it.bh, mine ? ERA1.tooltip : ERA1.paper, mine ? ERA1.olive : ERA1.titleBlue);
      ui.setFont(ctx, FONT);
      ctx.fillStyle = ERA1.black;
      it.lines.forEach((l, r) => ctx.fillText(l, bx + PAD, top + PAD + r * LINE_H));
      if (it.m.attachment) {
        // the attachment: an icon, the name, the size — pressable while the chat is live
        const ay = top + PAD + it.lines.length * LINE_H + 1;
        const aw = it.bw - PAD * 2;
        const hov = this.hover === 'attachment';
        ui.px(ctx, bx + PAD, ay, aw, 17, hov ? ERA1.titleBlue : ERA1.navy);
        ui.px(ctx, bx + PAD + 1, ay + 1, aw - 2, 15, ERA1.white);
        ui.px(ctx, bx + PAD + 4, ay + 3, 9, 11, ERA1.silver); ui.px(ctx, bx + PAD + 6, ay + 7, 5, 4, ERA1.navy);
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.navy;
        ctx.fillText(`${it.m.attachment.name}  ${it.m.attachment.size}  · ${caleb.attachment.open}`, bx + PAD + 18, ay + 4);
        if (top >= y && ay + 17 <= y + h) this.hits.push({ x: bx + PAD, y: ay, w: aw, h: 17, id: 'attachment' });
      }
    }
    ctx.restore();
  }

  /** a bubble with its corners knocked off (pixel-rounded), the period's IM shape */
  private bubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge: string): void {
    ui.px(ctx, x + 2, y, w - 4, h, edge);
    ui.px(ctx, x, y + 2, w, h - 4, edge);
    ui.px(ctx, x + 1, y + 1, w - 2, h - 2, edge);
    ui.px(ctx, x + 2, y + 1, w - 4, h - 2, fill);
    ui.px(ctx, x + 1, y + 2, w - 2, h - 4, fill);
  }

  private drawScrollBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.px(ctx, x, y, w, h, ERA1.silver);
    const arrow = (ay: number, up: boolean, id: string): void => {
      ui.button(ctx, x, ay, w, w, '', { hover: this.hover === id, disabled: this.maxScroll <= 0 });
      ctx.fillStyle = this.maxScroll <= 0 ? ERA1.grey : ERA1.black;
      for (let r = 0; r < 3; r++) {
        const yy = up ? ay + 4 + r : ay + w - 6 - r;
        ctx.fillRect(x + 6 - r - 1, yy, r * 2 + 1, 1);
      }
      if (this.maxScroll > 0) this.hits.push({ x, y: ay, w, h: w, id });
    };
    arrow(y, true, 'scroll-up');
    arrow(y + h - w, false, 'scroll-down');
    const track = h - w * 2;
    if (this.maxScroll > 0) {
      const viewK = Math.min(1, h / (h + this.maxScroll));
      const th = Math.max(10, Math.round(track * viewK));
      const ty = y + w + Math.round((track - th) * (this.scrollY / this.maxScroll));
      ui.bevel(ctx, x, ty, w, th, true);
      // a press on the track above or below the thumb pages that way
      if (ty > y + w) this.hits.push({ x, y: y + w, w, h: ty - (y + w), id: 'scroll-up' });
      if (ty + th < y + h - w) this.hits.push({ x, y: ty + th, w, h: y + h - w - (ty + th), id: 'scroll-down' });
    }
  }

  /** the reply chips — they register how he engaged, they never fork anything */
  private drawTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.px(ctx, x - 1, y - 1, w + 2, h + 2, ERA1.grey);
    ui.px(ctx, x, y, w, h, ERA1.paper);
    // ⚑ S339 — the song's two-step
    if (this.phase === 'chat' && this.songHeld && !this.awaiting) {
      const labels = this.songHold === 'offered' ? [['song-wait', HOLD.wait], ['song-go', HOLD.go]] : [['song-go', HOLD.go]];
      ui.setFont(ctx, 10);
      let bx = x + 8;
      for (const [id, label] of labels) {
        const bw = Math.ceil(ctx.measureText(label).width) + 28;
        ui.button(ctx, bx, y + 9, bw, 20, label, { hover: this.hover === id });
        this.hits.push({ x: bx, y: y + 9, w: bw, h: 20, id });
        bx += bw + 10;
      }
      if (this.songHold === 'waiting') {
        ui.setFont(ctx, 9); ctx.fillStyle = ERA1.grey;
        ctx.fillText(HOLD.listening, bx + 4, y + 14);
      }
      return;
    }
    // ⚑ S339 — Daniel's reply to Caleb: Sérgio's locked line, one chip, no alternative
    if (this.phase === 'answer' && !this.residueCommitted) {
      ui.setFont(ctx, 10);
      const bw = Math.min(w - 16, Math.ceil(ctx.measureText(RESIDUE.line).width) + 40);
      const bx = x + Math.round((w - bw) / 2);
      ui.button(ctx, bx, y + 8, bw, 22, RESIDUE.line, { hover: this.hover === 'residue', primary: true });
      this.hits.push({ x: bx, y: y + 8, w: bw, h: 22, id: 'residue' });
      return;
    }
    // finding C10: while he types, the tray is EMPTY — nothing is offered, so nothing is claimed
    if (!this.awaiting || this.phase !== 'chat') return;
    if (this.awaitingCommit) {
      // THE COMMIT-PRESS: one chip, no alternative, no hint over it
      const chip = this.awaiting[0];
      const bw = Math.min(300, w - 16);
      const bx = x + Math.round((w - bw) / 2);
      ui.button(ctx, bx, y + 8, bw, 22, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 8, w: bw, h: 22, id: `chip:${chip.id}` });
      return;
    }
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(caleb.window.hint, x + 6, y + 2);
    const n = this.awaiting.length;
    const gap = 8;
    ui.setFont(ctx, 10);
    const widths = this.awaiting.map(chip => Math.ceil(ctx.measureText(chip.label).width) + 18);
    const spare = Math.max(0, w - 12 - gap * (n - 1) - widths.reduce((a, b) => a + b, 0));
    let offset = 0;
    this.awaiting.forEach((chip, i) => {
      const cw = widths[i] + Math.floor(spare / n);
      const bx = x + 6 + offset; offset += cw + gap;
      ui.button(ctx, bx, y + 14, cw, 20, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 14, w: cw, h: 20, id: `chip:${chip.id}` });
    });
  }

  // ── input ──────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.id === 'caleb-close') { this.onClose?.(); this.dirty = true; return; }
    if (hit.id === 'residue') { this.commitResidue(); return; }
    if (hit.id === 'scroll-up' || hit.id === 'scroll-down') {
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + (hit.id === 'scroll-up' ? -SCROLL_STEP : SCROLL_STEP)));
      this.stick = this.scrollY >= this.maxScroll;
      this.dirty = true;
      return;
    }
    if (hit.id === 'song-wait') { this.songHold = 'waiting'; this.dirty = true; return; }
    if (hit.id === 'song-go') { this.songHold = 'released'; this.dirty = true; return; }
    if (hit.id === 'attachment') {
      const m = this.msgs.find((mm) => mm.attachment);
      if (m?.attachment && this.phase === 'chat') this.onOpenAttachment?.(m.attachment);
      return;
    }
    if (hit.id.startsWith('chip:') && this.awaiting) {
      const chip = this.awaiting.find(c => c.id === hit.id.slice(5));
      if (chip) this.chooseChip(chip);
    }
  }

  /** ?debug=1 review only — walk the authored thread to the commit-press
   *  without hand-clicking every chip (the first chip of each step files, so
   *  the ledger still reads as a real, if hurried, engagement). */
  debugFastForwardToCommit(): void {
    this.startAt = Infinity;
    this.stream.reset();
    this.msgs.length = 0;
    this.pendingChips = null;
    this.chipsAt = Infinity;
    this.songHold = 'released';
    for (let i = 0; i < THREAD.length; i++) {
      const s = THREAD[i];
      this.step = i;
      if (s.text) { this.msgs.push({ from: 'them', text: s.text }); continue; }
      if (!s.chips) continue;
      if (s.commit) {
        this.awaiting = s.chips;
        this.awaitingCommit = true;
        this.dirty = true;
        return;
      }
      const chip = s.chips[0];
      if (chip.say) this.msgs.push({ from: 'you', text: chip.say });
      this.file(chip.id, chip.say ? 'replied' : 'held', chip.ledgerTag);
    }
    this.dirty = true;
  }

  /** ?debug=1 — press the commit chip; files exactly as a real press does */
  debugCommit(): void {
    if (!this.awaitingCommit || !this.awaiting) return;
    this.chooseChip(this.awaiting[0]);
  }

  /** ?debug=1 — the conversation, already blacked out and filed */
  debugSealNow(): void {
    if (this.phase === 'chat') this.phase = 'sealed';
    this.sealPending = true;
    if (!ledger.caleb.some(l => l.id === 'redaction')) {
      this.file('redaction', 'intervened', caleb.witness.redacted);
    }
    this.dirty = true;
  }

  /** ?debug=1 — straight to Daniel's reply (S339: the chip under his four lines) */
  debugResidue(): void {
    this.awaiting = null; this.awaitingCommit = false;
    for (const line of caleb.return.lines as string[]) this.msgs.push({ from: 'them', text: line });
    this.phase = 'answer';
    this.stick = true;
    this.dirty = true;
  }
}
