/**
 * THE CALEB THREAD — the FELT half (S2R.3–S2R.6, Session 45).
 *
 * Two people who survived the same placement, talking. The window is `felt`:
 * bare, human, specific — no satire, no mechanics, nothing scored, and
 * **LAMBY IS ABSENT**. That law is a module boundary here, not a promise:
 * this file imports no Lamby renderer, no Lamby strings, and draws no mark.
 * Everything the apparatus does TO this conversation is `operable` and lives
 * in src/desktop/apps/accountability.ts, which draws over this window's rect
 * and never inside its transcript.
 *
 * What this file owns:
 *  - the messenger window and its typing transcript (data/dialog/s2_caleb.json)
 *  - reply chips that REGISTER and never BRANCH — each files a `ledgerTag` the
 *    moment it is pressed and none of them changes what Caleb says next
 *  - THE COMMIT-PRESS: one chip, no alternative ("i want to be with you too").
 *    The player must say the bigger word — and that press is what the
 *    apparatus files as conduct. Nothing happened. Nobody met.
 *  - THE REDACTION, one component run twice (`Redaction` below): forward at
 *    S2R.3B as Lamby explains that wanting is conducting, and the SAME object
 *    run in reverse at S2R.5 as the apparatus dies. No second grammar.
 *  - Caleb's return as MSN-style corner toasts during the video's break — the
 *    system's own nag-shape, now carrying the person back in
 *  - his four lines after the block lifts, and the residue commit-press, which
 *    rhymes with the first: the system is no longer there to file this one.
 *
 * Copy: data/dialog/s2_caleb.json, PLACEHOLDER-draft except the ⟨S⟩ residue
 * line, which is Sérgio's locked canon and is never paraphrased or re-wrapped.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import caleb from '../../../data/dialog/s2_caleb.json';
import { playOnce } from '../../audio/tapeAudio';

interface Chip { id: string; label: string; say: string; ledgerTag: string }
interface ThreadStep { id: string; from?: string; text?: string; chips?: Chip[]; commit?: boolean }
interface Msg { from: 'them' | 'you'; text: string }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const THREAD = caleb.thread as unknown as ThreadStep[];

// ── PACING — ALL OF IT LIVES IN data/dialog/s2_caleb.json's `pacing` BLOCK ──
// Session 48 moved every timing constant out of here so Sérgio can tune the
// thread's breath without hunting through TypeScript. Read that block's `_doc`
// before changing anything; this file deliberately holds NO numbers of its own.
// Nothing here is a deadline — the player is never asked to answer within a
// time, and the chips wait forever.
const P = caleb.pacing;
const CHAT = P.chat;
const RET = P.return;
const RES = P.residue;
/** where in the dissolve the desktop gives way to the bare field — the noise
 *  is at its densest here, so the change of surface is never seen as a cut */
const DISSOLVE_TEAR = 0.45;
/** s for the residue line to fade up, and for the pressed line to replace it */
const LINE_FADE = 1.1;

/** the messenger window (felt). The accountability stamp needs this rect.
 *  Sized so the WHOLE conversation fits without scrolling — the redaction has
 *  to be able to walk every line the player actually said. */
const WIN = { x: 8, y: 10, w: 420, h: 225 } as const;
const ROW_H = 10;
const TRAY_H = 32;

/**
 * REDACTION ↔ UN-REDACTION — one component, run twice.
 *
 * Forward (S2R.3B): rows black out from the top, one at a time, while the
 * apparatus explains that the wanting was the conduct. Reverse (S2R.5): the
 * exact same walk undone — the last row blacked is the first row returned, so
 * the sentence the system took last ("i just want to sit next to you and not
 * be watched") is the first one you get back, and the greeting comes home
 * last. The censorship is undone in front of you by the mechanism that made it.
 */
class Redaction {
  private n = 0;
  private dir: -1 | 0 | 1 = 0;
  private t = 0;
  private total = 0;
  /** s per row — slow enough to watch a sentence disappear, fast enough to hurt */
  private static readonly STEP = P.redactionRowSeconds;

  start(total: number, dir: 1 | -1): void {
    this.total = total;
    this.dir = dir;
    this.t = 0;
    if (dir === 1 && this.n === 0) this.n = 0;
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

  /** ?debug=1 — the blackout, already finished (skips the ~8s walk) */
  sealNow(total: number): void { this.total = total; this.n = total; this.dir = 0; }

  /** rows [0, n) are blacked out */
  hidden(row: number): boolean { return row < this.n; }
  get running(): boolean { return this.dir !== 0; }
  get blackedRows(): number { return this.n; }
  get sealed(): boolean { return this.total > 0 && this.n >= this.total; }
  get cleared(): boolean { return this.n === 0; }
}

/**
 * A queue that types Caleb's lines out one character at a time — he is a
 * person at a keyboard, not a printer, so the rate is deliberately hand-speed
 * (`pacing.chat.typingCharsPerSecond`) and it doubles as the reader's pace.
 * `gap` is the pause AFTER a finished line and differs by beat: the chat
 * breathes at one rate, his four return lines at a slower one.
 */
class TypeStream {
  private queue: string[] = [];
  private cur: string | null = null;
  private shown = 0;
  private hold = 0;
  /** s of quiet after a finished line, before the next one starts typing */
  gap = CHAT.lineGapSeconds;
  onLine?: (text: string) => void;

  push(text: string): void { this.queue.push(text); }
  reset(): void { this.queue = []; this.cur = null; this.shown = 0; this.hold = 0; }
  /** an EXTRA beat before the next line — he takes a moment (after a reply) */
  pause(seconds: number): void { this.hold = Math.max(this.hold, seconds); }
  get idle(): boolean { return !this.cur && this.queue.length === 0 && this.hold <= 0; }
  get partial(): string | null {
    return this.cur ? this.cur.slice(0, Math.floor(this.shown)) : null;
  }

  update(dt: number): boolean {
    if (this.cur) {
      this.shown += CHAT.typingCharsPerSecond * dt;
      if (this.shown >= this.cur.length) {
        const done = this.cur;
        this.cur = null;
        this.hold = this.gap;
        this.onLine?.(done);
      }
      return true;
    }
    if (this.hold > 0) { this.hold -= dt; return false; }
    if (this.queue.length > 0) {
      this.cur = this.queue.shift() ?? null;
        playOnce('notify_2003.mp3');   // S141: a line arrives — the messenger's ping
      this.shown = 0;
      return true;
    }
    return false;
  }
}

/**
 * THE APPARATUS'S GLITCH GRAMMAR, borrowed for the residue's dissolve.
 *
 * Deliberately the SAME vocabulary as the video's break in
 * src/desktop/apps/netvision.ts — scanlines on a 3px cadence, sparse tape
 * noise, one slow rolling tracking band — and no new effect. Warm-corrupt,
 * never strobe: `amount` moves the DENSITY of the noise and the alpha of the
 * band, and both ramp monotonically. Nothing here ever changes the screen's
 * luminance abruptly, so there is no flicker-rate concern at any `amount`.
 *
 * WHY IT IS COPIED AND NOT IMPORTED: netvision.ts keeps this as private
 * methods and is outside this session's file fence, and this module is `felt`
 * — it may not import the operable side (see the header). accountability.ts
 * carries the same twelve lines for the PureMail entrance. If a third copy
 * ever appears, that is the moment to extract `src/desktop/theme/glitch.ts`
 * and have all three read it.
 */
function glitchWash(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  amount: number, t: number
): void {
  if (amount <= 0.01) return;
  ctx.fillStyle = `rgba(0,0,0,${(0.16 * amount).toFixed(3)})`;
  for (let sy = y; sy < y + h; sy += 3) ctx.fillRect(x, sy, w, 1);
  const count = Math.round(amount * amount * 900);
  for (let i = 0; i < count; i++) {
    const nx = x + Math.floor(Math.random() * w);
    const ny = y + Math.floor(Math.random() * h);
    // dark-dominant: the quietest moment in the piece stays dark, not bright
    ctx.fillStyle = Math.random() < 0.66 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
    ctx.fillRect(nx, ny, 1, Math.random() < 0.3 ? 2 : 1);
  }
  const bandH = 6;
  const frac = (t % 3.6) / 3.6; // slower than the video's 2.4s roll — this one settles
  const by = y + Math.round(frac * (h - bandH));
  ctx.fillStyle = `rgba(20,20,24,${(0.55 * amount).toFixed(3)})`;
  ctx.fillRect(x, by, w, bandH);
  ctx.fillStyle = `rgba(230,230,235,${(0.22 * amount).toFixed(3)})`;
  ctx.fillRect(x + 3, by + bandH, Math.max(w - 6, 0), 1);
}

export type CalebPhase = 'chat' | 'sealed' | 'restoring' | 'returning' | 'residue' | 'done';

export class CalebThreadApp {
  open = true;
  dirty = true;
  phase: CalebPhase = 'chat';

  /** fires on the commit-press — os.ts hands the beat to the apparatus */
  onCommit?: () => void;
  /** fires once his four return lines have all landed and settled */
  onReturnSettled?: () => void;
  /** fires when the residue has been committed and held — the thread is over */
  onThreadDone?: () => void;
  /** S60 — the player pressed Caleb's notification while the block is on.
   *  This module does not know and must not know what answers it: os.ts hands
   *  the press to the apparatus, which re-asserts its own stamp. The felt side
   *  only reports that he tried. */
  onNotificationPressed?: () => void;

  private readonly msgs: Msg[] = [];
  private readonly stream = new TypeStream();
  private readonly redaction = new Redaction();
  private step = -1;
  private awaiting: Chip[] | null = null;
  private awaitingCommit = false;
  /** chips do not land the instant his line finishes — they arrive a beat
   *  later, so the sentence is read before the answers are weighed */
  private pendingChips: Chip[] | null = null;
  private pendingCommit = false;
  private chipsAt = Infinity;
  private t = 0;
  private startAt = CHAT.openDelaySeconds;
  private commitAt = Infinity;
  private returnSettleAt = Infinity;
  private returnStartAt = Infinity;
  /** THE DISSOLVE (S2R.6): `t` at which the slow glitch dissolve began, or -1.
   *  It starts while the chat is still on screen and runs THROUGH the change
   *  of surface — see drawToasts()/drawResidue(). */
  private dissolveAt = -1;
  private residueAt = Infinity;
  private residueDoneAt = Infinity;
  private residueCommitted = false;
  private residueCommittedAt = Infinity;
  private toasts: { text: string; life: number }[] = [];
  private hits: Hit[] = [];
  private hover = '';
  private returnLineCount = 0;
  /** the rows the transcript last rendered — what the redaction actually walks */
  private renderedRows = 0;
  private sealPending = false;

  constructor() {
    this.stream.onLine = (text) => {
      this.msgs.push({ from: 'them', text });
      if (this.phase === 'returning') this.returnLineCount++;
      this.dirty = true;
    };
    this.file('opened', 'intervened', caleb.witness.contactOpened);
  }

  /** the whole monitor belongs to the residue beat (respite: no UI, no chrome).
   *  It flips at the dissolve's TEAR, not at its start — see DISSOLVE_TEAR. */
  get ownsScreen(): boolean { return this.phase === 'residue'; }
  /** the felt window's rect — the operable stamp is positioned against it */
  get windowRect(): { x: number; y: number; w: number; h: number } { return { ...WIN }; }
  get windowVisible(): boolean {
    return this.phase === 'chat' || this.phase === 'sealed'
      || this.phase === 'restoring' || this.phase === 'returning';
  }

  private file(
    id: string,
    outcome: 'replied' | 'held' | 'committed' | 'intervened' | 'restored' | 'residue',
    witness: string
  ): void {
    ledger.caleb.push({ id, outcome, witness });
  }

  // ── the beat seams os.ts drives ────────────────────────────────────────
  /** S2R.3B — the apparatus starts blacking the conversation out */
  beginRedaction(): void {
    if (this.redaction.running || this.redaction.sealed) return;
    this.redaction.start(Math.max(this.renderedRows, 1), 1);
    this.file('redaction', 'intervened', caleb.witness.redacted);
    this.dirty = true;
  }

  /** S2R.5 — the block lifts: the same walk, reversed */
  beginRestore(): void {
    if (this.phase !== 'sealed') return;
    this.phase = 'restoring';
    this.redaction.start(this.redaction.blackedRows, -1);
    this.file('restore', 'restored', caleb.witness.blockLifted);
    this.dirty = true;
  }

  /**
   * S2R.4 — he comes back through the system's own notification shape.
   *
   * S60 (finding D17): it PERSISTS. It used to carry `pacing.toastLifeSeconds`
   * and vanish — Sérgio watched it cover the disclaimer crawl and then expire
   * before he could do anything with it, which is the worst of both. A crack
   * in the block does not heal on a countdown: this one stays until the block
   * itself lifts (`clearToasts`, called at S2R.5's mail-close). os.ts also
   * pushes it later now — after the crawl, not at the break's start.
   */
  pushBreakToast(): void {
    if (this.toasts.length > 0) return;
    const line = (caleb.toasts.lines as { id: string; text: string }[])[0];
    if (!line) return;
    this.toasts.push({ text: line.text, life: Infinity });
    this.dirty = true;
  }

  /**
   * The toast is drawn OVER everything (it is the felt module's over-everything
   * pass), so it must be PRESSABLE over everything too — otherwise it is a
   * button that only works when nothing is on top of it, which is the same
   * lie in a new place. os.ts asks this before its window routing, exactly as
   * it does for the taskbar mark. Returns true if the press was the toast's.
   */
  pressToastAt(x: number, y: number): boolean {
    const hit = this.hits.find(h => h.id === 'toast');
    if (!hit) return false;
    if (x < hit.x || x > hit.x + hit.w || y < hit.y || y > hit.y + hit.h) return false;
    this.onNotificationPressed?.();
    return true;
  }

  clearToasts(): void {
    if (this.toasts.length === 0) return;
    this.toasts = [];
    this.dirty = true;
  }

  // ── update ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    this.t += dt;

    if (this.toasts.length > 0) {
      // a finite life still expires (the array is the seam for any future
      // toast that should); the break toast's is Infinity and simply stays
      for (const toast of this.toasts) toast.life -= dt;
      const before = this.toasts.length;
      this.toasts = this.toasts.filter(toast => toast.life > 0);
      if (this.toasts.length !== before) this.dirty = true;
    }

    if (this.redaction.update(dt)) this.dirty = true;
    if (this.phase === 'restoring' && !this.redaction.running && this.redaction.cleared) {
      // the block has lifted — but he does not answer the instant it does.
      // The lead-in is the quiet where you realise the words are back.
      this.phase = 'returning';
      this.returnStartAt = this.t + RET.leadInSeconds;
      this.dirty = true;
    }
    if (this.t >= this.returnStartAt) {
      this.returnStartAt = Infinity;
      this.stream.gap = RET.lineGapSeconds; // his four lines get more room than the chat did
      for (const line of caleb.return.lines as string[]) this.stream.push(line);
      this.dirty = true;
    }

    if (this.phase === 'chat' && this.step < 0 && this.t >= this.startAt) this.advance();
    if (this.stream.update(dt)) this.dirty = true;

    // the chips land a beat after the line they answer, never on the same frame
    if (this.pendingChips && this.t >= this.chipsAt) {
      this.awaiting = this.pendingChips;
      this.awaitingCommit = this.pendingCommit;
      this.pendingChips = null;
      this.chipsAt = Infinity;
      this.dirty = true;
    }

    if (this.phase === 'chat' && this.step >= 0 && !this.awaiting && !this.awaitingCommit
        && !this.pendingChips && this.stream.idle) {
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
    if (this.t >= this.returnSettleAt) {
      this.returnSettleAt = Infinity;
      this.onReturnSettled?.();
      // S2R.6 arrives as a slow glitch DISSOLVE, never a cut: the dissolve
      // starts here, over the chat still on screen, and the surface changes
      // underneath it at the tear (see drawToasts/drawResidue).
      this.dissolveAt = this.t;
      this.residueAt = this.t + RES.dissolveSeconds + RES.arriveSeconds;
      this.dirty = true;
    }
    if (this.dissolveAt >= 0 && this.phase === 'returning'
        && this.t - this.dissolveAt >= RES.dissolveSeconds * DISSOLVE_TEAR) {
      this.phase = 'residue';
      this.dirty = true;
    }
    // the dissolve, the line's fade-in and the commit cross-fade all need
    // every frame; nothing else in this beat does
    if (this.phase === 'residue' && this.t < this.residueAt + LINE_FADE) this.dirty = true;
    // the commit's cross-fade AND the exit fade both need every frame
    if (this.residueCommitted) this.dirty = true;
    if (this.t >= this.residueDoneAt) {
      this.residueDoneAt = Infinity;
      this.phase = 'done';
      this.open = false;
      this.onThreadDone?.();
      this.dirty = true;
    }
  }

  /** 0..1 across the whole dissolve; -1 when there isn't one running */
  private get dissolveK(): number {
    if (this.dissolveAt < 0) return -1;
    const k = (this.t - this.dissolveAt) / RES.dissolveSeconds;
    return k >= 1 ? -1 : Math.max(0, k);
  }

  /** walk the authored thread: his lines queue to type; a chip step waits */
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
    if (wasCommit) {
      this.file(chip.id, 'committed', chip.ledgerTag);
      // it lands, warm, and is allowed to just sit there before anything
      // answers it — the pause is what makes the flag land ON the wanting
      this.commitAt = this.t + CHAT.commitLandsSeconds;
    } else {
      this.file(chip.id, chip.say ? 'replied' : 'held', chip.ledgerTag);
      this.advance();
      this.stream.pause(CHAT.replyGapSeconds); // he reads it before he types back
    }
    this.dirty = true;
  }

  private commitResidue(): void {
    if (this.residueCommitted) return;
    this.residueCommitted = true;
    this.residueCommittedAt = this.t;
    // the record shows a GAP it could not classify — never the line itself
    this.file('residue', 'residue', caleb.witness.residue);
    this.residueDoneAt = this.t + RES.holdSeconds;
    this.dirty = true;
  }

  // ── drawing ────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    if (this.phase === 'residue') { this.drawResidue(ctx); return; }
    if (!this.windowVisible) return;

    const c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, caleb.window.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);

    // the contact strip — no presence games, no typing tease, no ornament
    ui.px(ctx, c.x, c.y, c.w, 14, ERA1.beige);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(caleb.window.contact, c.x + 6, c.y + 3);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(caleb.window.status, c.x + c.w - 44, c.y + 3);

    const bodyX = c.x + 6;
    const bodyY = c.y + 18;
    const bodyW = c.w - 12;
    // S60 (finding F22, Sérgio: *"after Continue, Caleb's messages were
    // cleared — did he say anything or not?"*). DIAGNOSED IN PLAY: the
    // un-redaction worked perfectly and then the transcript ate it. The body
    // is a tail window (`rows.slice(-maxRows)`), and with the reply tray's 32px
    // permanently reserved it held only 15 rows — so the moment his four
    // return lines started typing, the conversation the block had just handed
    // back scrolled off the top, in front of him. The words came back and left
    // again. The tray is only ever drawn during `chat`, so from the seal
    // onwards the transcript takes that space and the restored conversation
    // stays on screen while he answers.
    const bodyH = c.h - 18 - (this.phase === 'chat' ? TRAY_H : 0);
    this.drawTranscript(ctx, bodyX, bodyY, bodyW, bodyH);

    if (this.phase === 'chat') this.drawTray(ctx, c.x + 6, c.y + c.h - TRAY_H + 4, c.w - 12);
  }

  /** flatten the transcript into wrapped rows, then draw — the redaction walks
   *  these ROWS, so what blacks out is exactly what is on screen */
  private drawTranscript(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ui.setFont(ctx, 9);
    const rows: { prefix: string; prefixColor: string; body: string; indent: number }[] = [];
    const all: Msg[] = [...this.msgs];
    const partial = this.stream.partial;
    if (partial !== null) all.push({ from: 'them', text: partial });
    for (const m of all) {
      // finding C9 — his replies are HIS. `ledger.name` is authoritative when
      // it holds a real name; `src/state/ledger.ts` initialises it to the
      // placeholder "—", so any entry point that skips the opening (every
      // review link, every debug jump — the path Sérgio played) attributed his
      // side of the conversation to an em dash. Anything with no LETTER in it
      // is not a name: fall back to the data's own `you`.
      const typed = ledger.name.trim();
      const you = /[a-zA-ZÀ-ɏ]/.test(typed) ? typed.toLowerCase() : caleb.window.you;
      const nick = m.from === 'them' ? caleb.window.contact : you;
      const prefix = `${nick}: `;
      const pw = ctx.measureText(prefix).width;
      const wrapped = ui.wrapText(ctx, m.text, w - pw);
      wrapped.forEach((line, i) => rows.push({
        prefix: i === 0 ? prefix : '',
        prefixColor: m.from === 'them' ? ERA1.warnDark : ERA1.navy,
        body: line,
        indent: i === 0 ? 0 : pw
      }));
    }
    const maxRows = Math.floor(h / ROW_H);
    const shown = rows.slice(-maxRows);
    this.renderedRows = shown.length;
    // a ?debug=1 seal resolves here, where the real row count is finally known
    if (this.sealPending) { this.sealPending = false; this.redaction.sealNow(shown.length); }

    shown.forEach((r, i) => {
      const ry = y + i * ROW_H;
      if (this.redaction.hidden(i)) {
        // the censor bar: the row's own width, nothing else touched
        const wide = ctx.measureText(r.prefix + r.body).width + r.indent;
        ui.px(ctx, x, ry - 1, Math.min(wide + 4, w), ROW_H - 1, ERA1.black);
        return;
      }
      let cx = x + r.indent;
      if (r.prefix) {
        ctx.fillStyle = r.prefixColor;
        ctx.fillText(r.prefix, cx, ry);
        cx += ctx.measureText(r.prefix).width;
      }
      ctx.fillStyle = ERA1.black;
      ctx.fillText(r.body, cx, ry);
    });
  }

  /** the reply chips — they register how he engaged, they never fork anything */
  private drawTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    // finding C10 (Sérgio: *"'Click to Reply' appears while Caleb is still
    // typing — you must wait for the boxes anyway, so the affordance lies"*).
    // While he types, the tray is EMPTY: nothing is offered, so nothing is
    // claimed. The hint now labels the chips at the moment they actually
    // exist — it is true when it is on screen, and it is true about the thing
    // directly under it.
    if (!this.awaiting) return;
    ui.px(ctx, x, y - 4, w, 1, ERA1.beige);
    if (this.awaitingCommit) {
      // THE COMMIT-PRESS: one chip, no alternative, and no hint over it — the
      // beat is not asking him to learn an interface.
      const chip = this.awaiting[0];
      const bw = Math.min(300, w);
      const bx = x + Math.round((w - bw) / 2);
      ui.button(ctx, bx, y + 6, bw, 20, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 6, w: bw, h: 20, id: `chip:${chip.id}` });
      return;
    }
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(caleb.window.hint, x, y - 1);
    const n = this.awaiting.length;
    const gap = 8;
    const cw = Math.floor((w - gap * (n - 1)) / n);
    this.awaiting.forEach((chip, i) => {
      const bx = x + i * (cw + gap);
      ui.button(ctx, bx, y + 10, cw, 18, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 10, w: cw, h: 18, id: `chip:${chip.id}` });
    });
  }

  /** the corner toasts — drawn LAST by os.ts, over the apparatus's own video.
   *  This is also the felt module's ONLY over-everything pass, so the first
   *  half of the residue's dissolve rides it: the desktop has to corrupt while
   *  it is still on screen, and this is the one call that happens after it is
   *  drawn (the second half lives in drawResidue, which owns the screen). */
  drawToasts(ctx: CanvasRenderingContext2D): void {
    const k = this.dissolveK;
    if (k >= 0 && this.phase !== 'residue') {
      glitchWash(ctx, 0, 0, ERA1_CANVAS.width, ERA1_CANVAS.height,
        Math.min(1, k / DISSOLVE_TEAR), this.t);
    }
    if (this.toasts.length === 0) return;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const tw = 168;
    const th = 58; // room for his line AND the affordance line under it
    this.toasts.forEach((toast, i) => {
      const tx = W - tw - 8;
      const ty = H - 22 - th - 6 - i * (th + 4);
      // it casts a shadow, like every other pressable thing in this era's
      // chrome — the toast is an affordance now (finding E20's other half)
      ui.px(ctx, tx + 2, ty + 2, tw, th, ERA1.black);
      const c = ui.windowFrame(ctx, tx, ty, tw, th, caleb.toasts.windowTitle, true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.black;
      ui.wrapText(ctx, toast.text, c.w - 8).slice(0, 2)
        .forEach((line, r) => ctx.fillText(line, c.x + 4, c.y + 3 + r * ROW_H));
      ctx.fillStyle = this.hover === 'toast' ? ERA1.navy : ERA1.grey;
      ctx.fillText(caleb.toasts.hint, c.x + 4, c.y + c.h - 10);
      if (i === 0) this.hits.push({ x: tx, y: ty, w: tw, h: th, id: 'toast' });
    });
  }

  /** S2R.6 — the quiet after. No guide, no UI, no apparatus: the monitor holds
   *  one truth and the player commits it himself. Never revealed as a trap.
   *
   *  The beat ARRIVES rather than cuts: the second half of the dissolve plays
   *  out over this bare field, the noise thinning to nothing — something
   *  settling, not an effect — and only then, after a stretch of genuinely
   *  empty screen, does the line fade up. */
  private drawResidue(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    ui.px(ctx, 0, 0, W, H, ERA1.tealDark);
    const k = this.dissolveK;
    if (k >= 0) {
      glitchWash(ctx, 0, 0, W, H,
        Math.max(0, 1 - (k - DISSOLVE_TEAR) / (1 - DISSOLVE_TEAR)), this.t);
    }
    if (this.t < this.residueAt) return; // a beat of nothing at all first

    const line = caleb.residue.line;
    const up = Math.min(1, (this.t - this.residueAt) / LINE_FADE);
    // THE PRESS, RE-STAGED (S60, finding F25). Sérgio: on click the line
    // *"appeared repeated on the screen"*. It was: the offered line (11px, in
    // a button at H/2-12) and the standing line (13px, at H/2-6) cross-faded
    // over the same 1.1s at different sizes and different baselines, so for a
    // beat there were visibly TWO copies of the era's most important sentence,
    // one sliding out from under the other. They are now the same words in the
    // same place at the same size — what changes is the FRAME AROUND THEM: the
    // button falls away and the line is left standing on its own. And the two
    // halves are sequenced, not overlapped: the button goes first, then the
    // line settles. One sentence, always.
    const pressed = this.residueCommitted
      ? Math.min(1, (this.t - this.residueCommittedAt) / LINE_FADE) : 0;
    const chromeOut = Math.min(1, pressed / 0.45);   // the button leaves first
    const settle = Math.max(0, (pressed - 0.45) / 0.55); // then the line settles

    ui.setFont(ctx, 12);
    const tw = ctx.measureText(line).width;
    const bw = Math.round(tw) + 40;
    const bx = Math.round((W - bw) / 2);
    const by = Math.round(H / 2) - 13;
    const textX = bx + 20;
    const textY = by + 8;

    if (chromeOut < 1) {
      ctx.save();
      ctx.globalAlpha = up * (1 - chromeOut);
      // A DROP SHADOW (finding F24). Sérgio loved the beat and could not tell
      // the line was a button. The bevel alone was too quiet on this field; a
      // hard offset shadow is the era's own way of saying "this is raised, and
      // you may press it" — the same object, finally legible as one.
      ui.px(ctx, bx + 3, by + 3, bw, 26, ERA1.black);
      ui.button(ctx, bx, by, bw, 26, '', { hover: this.hover === 'residue' });
      ctx.restore();
      // it only takes a click once it is actually legible
      if (!this.residueCommitted && up > 0.5) {
        this.hits.push({ x: bx, y: by, w: bw, h: 26, id: 'residue' });
      }
    }
    // the SAME words, in the SAME place, twice over: dark while they sit on
    // the button, pale once they are standing on the field. Two draws of one
    // sentence at one baseline — never two sentences.
    ui.setFont(ctx, 12);
    if (chromeOut < 1) {
      ctx.save();
      ctx.globalAlpha = up * (1 - chromeOut);
      ctx.fillStyle = this.hover === 'residue' && !this.residueCommitted ? ERA1.navy : ERA1.black;
      ctx.fillText(line, textX, textY);
      ctx.restore();
    }
    if (settle > 0) {
      ctx.save();
      ctx.globalAlpha = settle;
      ctx.fillStyle = ERA1.paper;
      ctx.fillText(line, textX, textY);
      ctx.restore();
    }

    // …and then it goes out. The hold's last seconds fade the whole field to
    // black so the desktop can come back UP out of it (os.ts owns that half)
    // rather than replacing this on one frame — see `pacing.residue._doc_exit`.
    const toGo = this.residueDoneAt - this.t;
    if (toGo < RES.exitFadeSeconds) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, 1 - toGo / RES.exitFadeSeconds));
      ui.px(ctx, 0, 0, W, H, ERA1.black);
      ctx.restore();
    }
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
    if (hit.id === 'residue') { this.commitResidue(); return; }
    if (hit.id === 'toast') { this.onNotificationPressed?.(); return; }
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

  /** ?debug=1 — straight to the quiet after (S2R.6). It arms the REAL
   *  dissolve rather than cutting to the field, because the dissolve IS the
   *  beat now: a jump that skipped it would show the one thing this beat is
   *  not (a cut). */
  debugResidue(): void {
    this.phase = 'returning';
    this.dissolveAt = this.t;
    this.residueAt = this.t + RES.dissolveSeconds + RES.arriveSeconds;
    this.dirty = true;
  }
}
