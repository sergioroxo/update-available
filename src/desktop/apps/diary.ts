/**
 * DIARY.TXT (S1.85) — the held beat before the end, and the thematic core.
 * Opens as TWO windows (Sérgio): a "before departure" note (the system's own
 * assignment) and the DIARY.TXT notepad. The trap: the placement told you to
 * write encouragement to your future self — you write the TRUTH instead, and
 * the system flags it "dangerous" and tries to delete it. The deletion runs in
 * two steps (flag + wait, then a slow erase) and FAILS near the end: the screen
 * freezes and splits (the OS canvas glitch), the truth reasserts in green, and
 * it jumps STRAIGHT into the update ritual — no quiet captions. This is the
 * person's glitch (glitch doctrine: the system cannot overwrite a person). Soft
 * glitch only. Wording in data/dialog/s1_end.json.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import end from '../../../data/dialog/s1_end.json';
import { playOnce } from '../../audio/tapeAudio';

type DiaryPhase = 'prompt' | 'writing' | 'committed' | 'flagged' | 'deleting' | 'resist' | 'reassert' | 'breakout';

const TYPE_CPS = 13;          // they write it slowly; it costs something
const READ_HOLD = 4.5;        // hold the written line so it can be read
const FLAG_WAIT = 2.2;        // the flag appears and sits, before deletion
const DELETE_SECONDS = 5.5;   // erase speed — a slow erase you watch
const REASSERT_SECONDS = 1.1; // the truth surges back faster than it was erased
// B2: the deletion is a two-round TUG-OF-WAR the player drives. The system erases
// toward a target, STALLS (it can't finish), and the player presses to keep the
// truth — it surges back; the system tries AGAIN, weaker; a second press wins it
// for good (green). The system cannot overwrite a person — and the player's own
// hand is on the moment it fails. (glitch doctrine, Era-1 = its first instance.)
const ERASE_1 = 0.62;         // attempt 1 stalls here
const REASSERT_LOW = 0.14;    // how far the truth surges back when you first hold it
const ERASE_2 = 0.40;         // attempt 2 — the system gets LESS far (it's losing)
const BREAKOUT_HOLD = 3.0;    // the split holds, then jumps into the update

const NOTE = { x: 128, y: 26, w: 366, h: 70 };
// R28-0c (item 8): h was 178 — the 'resist' footer draws TWO lines
// ("Removal stalled…"/held + "(press to keep it)") plus a progress bar below
// the wrapped entry text, and the second line's baseline (c.y + c.h - 12)
// sat close enough to the window's own bottom bevel to clip on-screen (his
// screenshot). +18px gives both lines and the bar clearance inside the frame.
const PAD = { x: 108, y: 104, w: 384, h: 196 };

export class DiaryApp {
  open = true;
  dirty = true;
  /** fires when the deletion fails — triggers the screen split (person's glitch) */
  onBreakout?: () => void;
  /** fires after the breakout beat — the update ritual begins */
  onDone?: () => void;

  private phase: DiaryPhase = 'prompt';
  private shown = 0;
  private readT = 0;
  private flagT = 0;
  private erase = 0;
  private eraseTarget = ERASE_1;  // how far the current delete attempt may get
  private attempts = 0;           // how many times the player has held the truth
  private breakT = 0;
  private doneFired = false;

  update(dt: number): void {
    if (this.phase === 'writing') {
      this.shown += TYPE_CPS * dt;
      this.dirty = true;
      if (this.shown >= end.diary.entry.length) {
        this.shown = end.diary.entry.length;
        this.phase = 'committed';
        if (!ledger.records.includes('diary-committed')) ledger.records.push('diary-committed');
      }
    } else if (this.phase === 'committed') {
      this.readT += dt;
      this.dirty = true;
      if (this.readT >= READ_HOLD) this.phase = 'flagged';
    } else if (this.phase === 'flagged') {
      this.flagT += dt;
      this.dirty = true;
      if (this.flagT >= FLAG_WAIT) this.phase = 'deleting';
    } else if (this.phase === 'deleting') {
      // the system erases toward this attempt's target, then STALLS (can't finish)
      this.erase += dt / DELETE_SECONDS;
      this.dirty = true;
      if (this.erase >= this.eraseTarget) { this.erase = this.eraseTarget; this.phase = 'resist'; }
    } else if (this.phase === 'reassert') {
      // the truth you held surges back, then the system steels itself for round 2
      this.erase -= dt / REASSERT_SECONDS;
      this.dirty = true;
      if (this.erase <= REASSERT_LOW) { this.erase = REASSERT_LOW; this.eraseTarget = ERASE_2; this.phase = 'deleting'; }
    } else if (this.phase === 'breakout') {
      // it won for good: the words flood fully back (green), the split holds, then the update
      if (this.erase > 0) this.erase = Math.max(0, this.erase - dt / REASSERT_SECONDS);
      this.breakT += dt;
      this.dirty = true;
      if (this.breakT >= BREAKOUT_HOLD && !this.doneFired) {
        this.doneFired = true;
        this.open = false;
        this.onDone?.();
      }
    }
    // 'resist' has no timer — it waits for the player's hand (press())
  }

  /** press: phase 'prompt' commits the line; phase 'resist' HOLDS the truth against
   *  the erase — the reassertion is the player's own act (B2). */
  press(): void {
    if (this.phase === 'prompt') {
      this.phase = 'writing'; this.shown = 0; this.dirty = true;
    } else if (this.phase === 'resist') {
      this.attempts++;
      this.dirty = true;
      if (this.attempts >= 2) {
        // second hold: the deletion fails for good — the person's glitch
        this.phase = 'breakout'; this.breakT = 0;
        playOnce('glitch_e2.mp3');   // S141: the words flood back — the era's collapse, heard
        if (!ledger.records.includes('deletion-failed')) ledger.records.push('deletion-failed');
        this.onBreakout?.();   // the screen split fires as the truth wins
      } else {
        this.phase = 'reassert';   // it surges back; the system will try once more
      }
    }
  }

  private blink(): boolean { return Math.floor(Date.now() / 450) % 2 === 0; }

  draw(ctx: CanvasRenderingContext2D): void {
    // the "before departure" note — its own window, while you write (Sérgio)
    if (this.phase === 'prompt' || this.phase === 'writing' || this.phase === 'committed') {
      this.drawNote(ctx);
    }
    this.drawNotepad(ctx);
  }

  private drawNote(ctx: CanvasRenderingContext2D): void {
    const n = ui.windowFrame(ctx, NOTE.x, NOTE.y, NOTE.w, NOTE.h, end.diary.noteTitle, false);
    ui.px(ctx, n.x, n.y, n.w, n.h, ERA1.paper);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.greyDark;
    end.diary.note.forEach((line, i) => ctx.fillText(line, n.x + 8, n.y + 6 + i * 14));
  }

  private drawNotepad(ctx: CanvasRenderingContext2D): void {
    const c = ui.windowFrame(ctx, PAD.x, PAD.y, PAD.w, PAD.h, end.diary.fileTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.white);

    if (this.phase === 'prompt') {
      // the "before you go" note already gives the assignment — the diary file
      // itself just waits, blank, for your hand (no repeated "write a message…").
      for (let gy = c.y + 18; gy < c.y + c.h - 8; gy += 16) ui.px(ctx, c.x + 4, gy, c.w - 8, 1, ERA1.beige);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(end.diary.writeHint, c.x + 10, c.y + 10);
      if (this.blink()) ui.px(ctx, c.x + 10, c.y + 28, 7, 12, ERA1.greyDark);
      return;
    }

    // the flag banner stays up through the whole fight (the system keeps insisting)
    const inFight = this.phase === 'flagged' || this.phase === 'deleting'
      || this.phase === 'resist' || this.phase === 'reassert' || this.phase === 'breakout';
    const textTop = inFight ? c.y + 30 : c.y + 12;
    if (inFight) {
      ui.px(ctx, c.x, c.y, c.w, 16, ERA1.warnDark);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.white;
      ctx.fillText(end.diary.flagged, c.x + 8, c.y + 4);
    }
    for (let gy = textTop + 6; gy < c.y + c.h - 26; gy += 16) ui.px(ctx, c.x + 4, gy, c.w - 8, 1, ERA1.beige);

    // the entry — typed, then eroding/surging as the tug-of-war runs. GREEN while
    // the player is holding it (reassert/breakout): the truth alive under their hand.
    let text = end.diary.entry.slice(0, Math.floor(this.shown));
    if (this.phase === 'deleting' || this.phase === 'resist' || this.phase === 'reassert' || this.phase === 'breakout') {
      const keep = Math.ceil(end.diary.entry.length * (1 - this.erase));
      text = end.diary.entry.slice(0, keep);
    }
    const alive = this.phase === 'reassert' || this.phase === 'breakout';
    ui.setFont(ctx, 11);
    ctx.fillStyle = alive ? ERA1.ok : ERA1.navy;
    const rows = this.wrap(ctx, text, c.w - 20);
    rows.forEach((r, i) => ctx.fillText(r, c.x + 10, textTop + i * 16));
    if (this.phase === 'writing' && this.blink()) {
      const lastW = ctx.measureText(rows[rows.length - 1] ?? '').width;
      ui.px(ctx, c.x + 11 + lastW, textTop + (rows.length - 1) * 16, 6, 12, ERA1.navy);
    }

    // the system's "hold it" beat: the erase has stalled — the player presses to keep
    // the truth. Round 1 ("won't take") then round 2 ("cannot be removed"), each a press.
    if (this.phase === 'resist') {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(this.attempts >= 1 ? end.diary.held : end.diary.retrying, c.x + 10, c.y + c.h - 24);
      ctx.fillStyle = ERA1.greyDark;
      if (this.blink()) ctx.fillText(end.diary.keepHint, c.x + 10, c.y + c.h - 12);
      const bw = c.w - 20; const bx = c.x + 10; const by = c.y + c.h - 6;
      ui.px(ctx, bx, by, bw, 4, ERA1.beige);
      ui.px(ctx, bx, by, Math.round(bw * this.erase), 4, ERA1.warn);   // the jammed erase
    }

    // step 1: flag + wait (no bar); step 2: deleting (slow bar)
    if (this.phase === 'flagged') {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(end.diary.scanning, c.x + 10, c.y + c.h - 16);
    } else if (this.phase === 'deleting') {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(end.diary.deleting, c.x + 10, c.y + c.h - 22);
      const bw = c.w - 20; const bx = c.x + 10; const by = c.y + c.h - 10;
      ui.px(ctx, bx, by, bw, 5, ERA1.beige);
      ui.px(ctx, bx, by, Math.round(bw * this.erase), 5, ERA1.warn);
    }
  }

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
}
