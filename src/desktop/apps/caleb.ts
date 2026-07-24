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

interface Chip { id: string; label: string; say: string; ledgerTag: string }
interface ThreadStep { id: string; from?: string; text?: string; chips?: Chip[]; commit?: boolean }
interface Msg { from: 'them' | 'you'; text: string }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const THREAD = caleb.thread as unknown as ThreadStep[];

// Pacing, tuned for reading rather than speed (the audience mostly reads
// English as a second language — Sérgio). Nothing here is a deadline: the
// player is never asked to answer within a time, and the chips wait forever.
const CPS = 24;             // characters per second — Caleb types like a person
const HOLD = 1.05;          // s between his lines
const OPEN_DELAY = 0.8;     // s of quiet after the window appears
const COMMIT_LANDS = 1.1;   // s the committed line sits there, warm, before the alert
const RETURN_DONE_HOLD = 2.6; // s after his last line before the residue surfaces
const RESIDUE_ARRIVE = 1.4; // s of bare quiet before the one chip appears
const RESIDUE_HOLD = 5.0;   // s the committed line is allowed to just stand there
const TOAST_LIFE = 14;      // s a corner toast stays up (cleared early by the collapse)

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
  private static readonly STEP = 0.52;

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

/** a queue that types Caleb's lines out one character at a time */
class TypeStream {
  private queue: string[] = [];
  private cur: string | null = null;
  private shown = 0;
  private hold = 0;
  onLine?: (text: string) => void;

  push(text: string): void { this.queue.push(text); }
  reset(): void { this.queue = []; this.cur = null; this.shown = 0; this.hold = 0; }
  get idle(): boolean { return !this.cur && this.queue.length === 0 && this.hold <= 0; }
  get partial(): string | null {
    return this.cur ? this.cur.slice(0, Math.floor(this.shown)) : null;
  }

  update(dt: number): boolean {
    if (this.cur) {
      this.shown += CPS * dt;
      if (this.shown >= this.cur.length) {
        const done = this.cur;
        this.cur = null;
        this.hold = HOLD;
        this.onLine?.(done);
      }
      return true;
    }
    if (this.hold > 0) { this.hold -= dt; return false; }
    if (this.queue.length > 0) {
      this.cur = this.queue.shift() ?? null;
      this.shown = 0;
      return true;
    }
    return false;
  }
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

  private readonly msgs: Msg[] = [];
  private readonly stream = new TypeStream();
  private readonly redaction = new Redaction();
  private step = -1;
  private awaiting: Chip[] | null = null;
  private awaitingCommit = false;
  private t = 0;
  private startAt = OPEN_DELAY;
  private commitAt = Infinity;
  private returnSettleAt = Infinity;
  private residueAt = Infinity;
  private residueDoneAt = Infinity;
  private residueCommitted = false;
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

  /** the whole monitor belongs to the residue beat (respite: no UI, no chrome) */
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

  /** S2R.4 — he comes back through the system's own notification shape */
  pushBreakToast(): void {
    if (this.toasts.length > 0) return;
    const line = (caleb.toasts.lines as { id: string; text: string }[])[0];
    if (!line) return;
    this.toasts.push({ text: line.text, life: TOAST_LIFE });
    this.dirty = true;
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
      for (const toast of this.toasts) toast.life -= dt;
      const before = this.toasts.length;
      this.toasts = this.toasts.filter(toast => toast.life > 0);
      if (this.toasts.length !== before) this.dirty = true;
    }

    if (this.redaction.update(dt)) this.dirty = true;
    if (this.phase === 'restoring' && !this.redaction.running && this.redaction.cleared) {
      this.phase = 'returning';
      for (const line of caleb.return.lines as string[]) this.stream.push(line);
      this.dirty = true;
    }

    if (this.phase === 'chat' && this.step < 0 && this.t >= this.startAt) this.advance();
    if (this.stream.update(dt)) this.dirty = true;

    if (this.phase === 'chat' && this.step >= 0 && !this.awaiting && !this.awaitingCommit
        && this.stream.idle) {
      this.advance();
    }

    if (this.t >= this.commitAt) {
      this.commitAt = Infinity;
      this.phase = 'sealed';
      this.onCommit?.();
      this.dirty = true;
    }

    if (this.phase === 'returning' && this.stream.idle && this.returnSettleAt === Infinity
        && this.returnLineCount >= (caleb.return.lines as string[]).length) {
      this.returnSettleAt = this.t + RETURN_DONE_HOLD;
    }
    if (this.t >= this.returnSettleAt) {
      this.returnSettleAt = Infinity;
      this.onReturnSettled?.();
      this.phase = 'residue';
      this.residueAt = this.t + RESIDUE_ARRIVE;
      this.dirty = true;
    }
    if (this.phase === 'residue' && !this.residueCommitted && this.t >= this.residueAt) {
      this.dirty = true; // the chip has arrived; it waits as long as it needs to
    }
    if (this.t >= this.residueDoneAt) {
      this.residueDoneAt = Infinity;
      this.phase = 'done';
      this.open = false;
      this.onThreadDone?.();
      this.dirty = true;
    }
  }

  /** walk the authored thread: his lines queue to type; a chip step waits */
  private advance(): void {
    this.step++;
    const s = THREAD[this.step];
    if (!s) return;
    if (s.chips) {
      if (s.commit) this.awaitingCommit = true;
      this.awaiting = s.chips;
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
      this.commitAt = this.t + COMMIT_LANDS; // it lands, warm, before anything answers it
    } else {
      this.file(chip.id, chip.say ? 'replied' : 'held', chip.ledgerTag);
      this.advance();
    }
    this.dirty = true;
  }

  private commitResidue(): void {
    if (this.residueCommitted) return;
    this.residueCommitted = true;
    // the record shows a GAP it could not classify — never the line itself
    this.file('residue', 'residue', caleb.witness.residue);
    this.residueDoneAt = this.t + RESIDUE_HOLD;
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
    const bodyH = c.h - 18 - TRAY_H;
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
      const nick = m.from === 'them' ? caleb.window.contact : ledger.name.toLowerCase();
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
    if (!this.awaiting) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(caleb.window.hint, x, y + 8);
      return;
    }
    ui.px(ctx, x, y - 4, w, 1, ERA1.beige);
    if (this.awaitingCommit) {
      // THE COMMIT-PRESS: one chip, no alternative. There is nothing else on
      // the tray because there is nothing else he can say.
      const chip = this.awaiting[0];
      const bw = Math.min(300, w);
      const bx = x + Math.round((w - bw) / 2);
      ui.button(ctx, bx, y + 4, bw, 20, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 4, w: bw, h: 20, id: `chip:${chip.id}` });
      return;
    }
    const n = this.awaiting.length;
    const gap = 8;
    const cw = Math.floor((w - gap * (n - 1)) / n);
    this.awaiting.forEach((chip, i) => {
      const bx = x + i * (cw + gap);
      ui.button(ctx, bx, y + 4, cw, 20, chip.label, { hover: this.hover === `chip:${chip.id}` });
      this.hits.push({ x: bx, y: y + 4, w: cw, h: 20, id: `chip:${chip.id}` });
    });
  }

  /** the corner toasts — drawn LAST by os.ts, over the apparatus's own video */
  drawToasts(ctx: CanvasRenderingContext2D): void {
    if (this.toasts.length === 0) return;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const tw = 168;
    const th = 46;
    this.toasts.forEach((toast, i) => {
      const tx = W - tw - 8;
      const ty = H - 22 - th - 6 - i * (th + 4);
      const c = ui.windowFrame(ctx, tx, ty, tw, th, caleb.toasts.windowTitle, true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.black;
      ui.wrapText(ctx, toast.text, c.w - 8).slice(0, 2)
        .forEach((line, r) => ctx.fillText(line, c.x + 4, c.y + 3 + r * ROW_H));
    });
  }

  /** S2R.6 — the quiet after. No guide, no UI, no apparatus: the monitor holds
   *  one truth and the player commits it himself. Never revealed as a trap. */
  private drawResidue(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    ui.px(ctx, 0, 0, W, H, ERA1.tealDark);
    if (this.t < this.residueAt) return; // a beat of nothing at all first

    const line = caleb.residue.line;
    if (!this.residueCommitted) {
      ui.setFont(ctx, 11);
      const tw = ctx.measureText(line).width;
      const bw = Math.round(tw) + 40;
      const bx = Math.round((W - bw) / 2);
      const by = Math.round(H / 2) - 12;
      ui.button(ctx, bx, by, bw, 26, '', { hover: this.hover === 'residue' });
      ui.setFont(ctx, 11);
      ctx.fillStyle = this.hover === 'residue' ? ERA1.navy : ERA1.black;
      ctx.fillText(line, bx + 20, by + 7);
      this.hits.push({ x: bx, y: by, w: bw, h: 26, id: 'residue' });
      return;
    }
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.paper;
    const tw = ctx.measureText(line).width;
    ctx.fillText(line, Math.round((W - tw) / 2), Math.round(H / 2) - 6);
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

  /** ?debug=1 — straight to the quiet after (S2R.6) */
  debugResidue(): void {
    this.phase = 'residue';
    this.residueAt = this.t + 0.2;
    this.dirty = true;
  }
}
