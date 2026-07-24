/**
 * THE CALEB THREAD — the OPERABLE half (S2R.3B/C and S2R.5, Session 45).
 *
 * Everything the apparatus does to the conversation next door. The register
 * split is the file split: `src/desktop/apps/caleb.ts` is `felt` and imports
 * no Lamby; this module is `operable` and owns every intrusion — the alert,
 * the flag, the streak's death, the shame, and finally the letter that ends it.
 * Lamby is drawn HERE and only here, never inside the chat's own window.
 *
 * S2R.3B — THE ACCOUNTABILITY ALERT fires on the COMMIT-PRESS, not on a
 * meeting and not on a message received. That is the thesis: the desire is the
 * offense and the meeting would only have been its evidence. Lamby explains
 * its own logic (≤2 lines per conduction beat), the chat is stamped
 * `Content Blocked Until Further Evaluation`, the flag renders
 * `HOMOSEXUAL CONDUCT`, the redaction walks the conversation out line by line,
 * and the streak dies on screen: 412 → 0. Then the two ⟨S⟩ system lines
 * reprice those 412 days as a debt owed to a woman who does not exist.
 *
 * S2R.3C — THE SHAME. Before any comfort, Lamby plays `sad` and HOLDS: the
 * apparatus does not scold, it looks hurt, and the player is invited to feel
 * they did that to it. A system that punishes creates resistance; a system
 * that looks wounded creates guilt. Only then, ⟨S⟩ "I caught it in time."
 * Nothing here winks.
 *
 * S2R.5 — THE COLLAPSE. A PureMail envelope arrives (a documented failure of
 * the apparatus, never anything the player did — SCRIPT_UPDATE v0.5 §1) and
 * the composite apology reads in full, in its EXISTING words. While it is
 * open the streak field glitches down to "412 days · for nothing" and Lamby
 * sits in the `sterile` mood, empty-eyed, saying nothing: the inner watcher
 * losing its outer god.
 *
 * DISMISSAL LAW: Lamby's window can be closed at ANY point and the dismissal
 * is filed. What that closes is the ASSISTANT, never the machine — the flag,
 * the redaction and the streak's death complete themselves regardless, which
 * is the honest version of the law and the more frightening one.
 *
 * All copy from data/dialog/s2_caleb.json (PLACEHOLDER-draft; the ⟨S⟩ lines
 * are Sérgio's own wording, verbatim).
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { drawLambyChar, type LambyMood } from './lambyChar';
import caleb from '../../../data/dialog/s2_caleb.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }

type AlertStep = 'stop' | 'block' | 'wanting' | 'streak' | 'system' | 'sad' | 'caught' | 'closed';
type MailPhase = 'none' | 'envelope' | 'letter' | 'closed';

/** PLACEHOLDER pacing — Sérgio tunes these by feel, like every other hold in
 *  the piece. The sad hold is the one that matters: long enough to feel like
 *  guilt, short enough not to read as a cutscene (his note, spec §S2R.3C). */
const HOLD: Record<Exclude<AlertStep, 'caught' | 'closed'>, number> = {
  stop: 3.0,
  block: 1.4,
  wanting: 2.6,
  streak: 2.0,
  system: 3.8,
  sad: 3.0
};
const STREAK_FALL = 1.3; // s for the counter to run 412 → 0
const GLITCH_STEP = 1.1; // s per state of the dying streak field (S2R.5)

/** the apparatus's band, along the bottom of the monitor — it pushes up from
 *  under the conversation rather than covering it: the redaction has to be
 *  watchable while Lamby explains why it is happening. */
const BAND = { x: 8, y: 239, w: 496, h: 117 } as const;

export class AccountabilityApp {
  open = true;
  dirty = true;

  /** the chat blacks out from here — os.ts hands this to the felt module */
  onRedactionStart?: () => void;
  /** the alert has finished; `dismissed` is true if the player closed Lamby */
  onAlertDone?: (dismissed: boolean) => void;
  /** the letter has been read and closed — the block lifts after this */
  onMailClosed?: () => void;
  /** S46 HOOK (not landed): a build-time WAV of the letter in Lamby's voice.
   *  Wired to nothing today, so the row does not render and nothing is ever
   *  requested — no runtime network, no missing-file noise. */
  onReadAloud?: (track: string) => void;

  private step: AlertStep = 'stop';
  private stepT = 0;
  private t = 0;
  private mood: LambyMood = 'cheerful';
  private moodStart = 0;
  private stamped = false;
  private streakT = -1;      // >= 0 once the counter is falling
  private streakDead = false;
  private mail: MailPhase = 'none';
  private glitchT = 0;
  private chat = { x: 8, y: 10, w: 420, h: 222 };
  private hits: Hit[] = [];
  private hover = '';

  /** while true the beat owns the monitor's clicks (over the chat, under the
   *  system-modal update ritual) */
  get modal(): boolean { return this.step !== 'closed' || this.mail === 'envelope' || this.mail === 'letter'; }
  /** the stamp outlives the alert: it sits on the chat until the block lifts */
  get stampVisible(): boolean { return this.stamped; }
  get alertRunning(): boolean { return this.step !== 'closed'; }
  get mailOpen(): boolean { return this.mail === 'envelope' || this.mail === 'letter'; }

  setChatRect(r: { x: number; y: number; w: number; h: number }): void { this.chat = { ...r }; }

  private file(id: string, outcome: 'intervened' | 'dismissed', witness: string): void {
    ledger.caleb.push({ id, outcome, witness });
  }

  private setMood(mood: LambyMood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    this.moodStart = this.t;
  }

  /** the machine's own acts — they complete whether or not Lamby is on screen */
  private startBlock(): void {
    if (this.stamped) return;
    this.stamped = true;
    this.file('flag', 'intervened', caleb.witness.flagged);
    this.onRedactionStart?.();
  }

  private killStreak(): void {
    if (this.streakT >= 0) return;
    this.streakT = 0;
    this.file('streak', 'intervened', caleb.witness.streakReset);
  }

  /** the block lifts (S2R.5) — the stamp comes off the conversation */
  liftStamp(): void {
    if (!this.stamped) return;
    this.stamped = false;
    this.dirty = true;
  }

  /** S2R.5 — the envelope arrives */
  openMail(): void {
    if (this.mail !== 'none') return;
    this.mail = 'envelope';
    this.step = 'closed'; // by the collapse the assistant has always finished talking
    this.setMood('sterile'); // empty-eyed: the inner watcher losing its outer god
    this.glitchT = 0;
    this.dirty = true;
  }

  // ── update ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    this.t += dt;
    if (this.streakT >= 0 && this.streakT < STREAK_FALL) {
      this.streakT = Math.min(STREAK_FALL, this.streakT + dt);
      if (this.streakT >= STREAK_FALL) this.streakDead = true;
      this.dirty = true;
    }
    if (this.mail === 'letter') { this.glitchT += dt; this.dirty = true; }
    if (this.step === 'closed' || this.step === 'caught') return;

    this.stepT += dt;
    const hold = HOLD[this.step];
    if (this.stepT < hold) return;
    this.stepT = 0;
    switch (this.step) {
      case 'stop':
        this.step = 'block';
        this.setMood('clinical');
        this.startBlock();
        break;
      case 'block':
        this.step = 'wanting';
        break;
      case 'wanting':
        this.step = 'streak';
        this.killStreak();
        break;
      case 'streak':
        this.step = 'system';
        break;
      case 'system':
        this.step = 'sad';
        this.setMood('sad'); // the deflate plays from here and then just holds
        break;
      case 'sad':
        this.step = 'caught';
        this.file('comfort', 'intervened', caleb.witness.comforted);
        break;
    }
    this.dirty = true;
  }

  private closeAlert(dismissed: boolean): void {
    if (this.step === 'closed') return;
    // whatever the player does to the assistant, the machine finishes its work
    this.startBlock();
    this.killStreak();
    if (dismissed) {
      this.file('alert', 'dismissed', caleb.witness.alertDismissed);
      ledger.assistant.dismissals += 1;
    }
    this.step = 'closed';
    this.dirty = true;
    this.onAlertDone?.(dismissed);
  }

  // ── drawing ────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    if (this.stamped) this.drawStamp(ctx);
    if (this.step !== 'closed' || this.mailOpen) this.drawBand(ctx);
    if (this.mail === 'envelope') this.drawEnvelope(ctx);
    if (this.mail === 'letter') this.drawLetter(ctx);
  }

  /** the apparatus's mark ON the conversation — a band across the transcript.
   *  It is drawn over the felt window's rect and never inside its grammar:
   *  no Lamby, no face, no charm. Just the stamp. */
  private drawStamp(ctx: CanvasRenderingContext2D): void {
    const x = this.chat.x + 6;
    const w = this.chat.w - 12;
    const y = this.chat.y + Math.round(this.chat.h * 0.42);
    ui.px(ctx, x, y, w, 30, ERA1.warnDark);
    ui.px(ctx, x, y, w, 1, ERA1.warn);
    ui.px(ctx, x, y + 29, w, 1, ERA1.warn);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(caleb.alert.stampTitle, x + 8, y + 4);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(caleb.alert.blocked, x + 8, y + 16);
  }

  private drawBand(ctx: CanvasRenderingContext2D): void {
    const c = ui.windowFrame(ctx, BAND.x, BAND.y, BAND.w, BAND.h, caleb.alert.windowTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);

    // he sits at the left of his own window, whole: the paperclip loop reaches
    // ~52px behind him at this scale, so the centre cannot sit tighter than
    // that against the frame without clipping the character.
    drawLambyChar(ctx, c.x + 60, c.y + 40, {
      mood: this.mood,
      action: this.t < 1.0 && this.step === 'stop' ? 'appear' : 'idle',
      t: this.t,
      moodStart: this.moodStart,
      scale: 0.68
    });

    const L = c.x + 106;
    const colW = c.w - 110;
    this.drawSpeech(ctx, L, c.y + 2, colW);

    ui.px(ctx, L, c.y + 44, colW, 1, ERA1.grey);
    if (this.stamped) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(caleb.alert.flagLabel, L, c.y + 51);
      ui.setFont(ctx, 12);
      ctx.fillStyle = ERA1.warn;
      ctx.fillText(caleb.alert.flag, L + 130, c.y + 48);
    }
    if (this.streakT >= 0) this.drawStreak(ctx, L, c.y + 66);
    if (this.step === 'caught') this.drawAlertButtons(ctx, c);
  }

  /** the type area: Lamby's current beat, or the SYSTEM's own two lines, or —
   *  during the shame hold and the collapse — nothing at all. */
  private drawSpeech(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    // the collapse: Lamby says nothing at all, and his window carries only the
    // apparatus's own dying status line (the jingle, coming back broken)
    if (this.mailOpen) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(caleb.pureMail.brokenNowPlaying, x, y + 14);
      return;
    }
    ui.setFont(ctx, 10);
    let lines: string[] = [];
    let color: string = ERA1.black;
    if (this.step === 'stop' || this.step === 'block') lines = caleb.alert.lines.stop as string[];
    else if (this.step === 'wanting') lines = caleb.alert.lines.wanting as string[];
    else if (this.step === 'system') {
      // ⟨S⟩ — Sérgio's own wording, and the SYSTEM's voice, not Lamby's: it is
      // rendered unattributed and cold, exactly as the shipped build files it.
      lines = caleb.alert.systemLines as string[];
      color = ERA1.warnDark;
    } else if (this.step === 'caught') {
      // ⟨S⟩ "I caught it in time." leads, in the assistant's own type; the
      // reassurance follows it, quieter — care as the thing that closes the trap.
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(caleb.alert.caughtLine, x, y);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ui.wrapText(ctx, (caleb.alert.lines.caught as string[])[0] ?? '', w).slice(0, 2)
        .forEach((line, i) => ctx.fillText(line, x, y + 18 + i * 12));
      return;
    }
    // 'streak' and 'sad' draw nothing — the counter, and then the hold, are the line.
    let row = 0;
    for (const line of lines) {
      for (const wrapped of ui.wrapText(ctx, line, w)) {
        if (row >= 3) return;
        ctx.fillStyle = color;
        ctx.fillText(wrapped, x, y + row * 13);
        row++;
      }
    }
  }

  /** 412 → 0, on screen. Then, at the collapse, the field itself comes apart. */
  private drawStreak(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(caleb.alert.streakLabel, x, y + 3);
    const from = caleb.alert.streakFrom;
    const k = Math.min(1, this.streakT / STREAK_FALL);
    const eased = k * k;
    const value = Math.max(caleb.alert.streakTo, Math.round(from - (from - caleb.alert.streakTo) * eased));
    ui.setFont(ctx, 12);
    let text = `${value} ${caleb.alert.streakUnit}`;
    if (this.mail === 'letter') {
      const states = caleb.pureMail.streakGlitch as string[];
      text = states[Math.min(states.length - 1, Math.floor(this.glitchT / GLITCH_STEP))];
    }
    ctx.fillStyle = this.streakDead ? ERA1.warn : ERA1.navy;
    ctx.fillText(text, x + 130, y);
  }

  private drawAlertButtons(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const by = c.y + c.h - 22;
    const okX = c.x + c.w - 92;
    const noX = okX - 96;
    ui.button(ctx, okX, by, 88, 20, caleb.alert.okLabel, { hover: this.hover === 'alert-ok' });
    ui.button(ctx, noX, by, 88, 20, caleb.alert.dismissLabel, { hover: this.hover === 'alert-dismiss' });
    this.hits.push({ x: okX, y: by, w: 88, h: 20, id: 'alert-ok' });
    this.hits.push({ x: noX, y: by, w: 88, h: 20, id: 'alert-dismiss' });
    // the close box is live too — dismissal always works (CLAUDE.md)
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'alert-dismiss' });
  }

  private drawEnvelope(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    const dw = 300; const dh = 116;
    const dx = Math.round((W - dw) / 2); const dy = 60;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, caleb.pureMail.inboxTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.warnDark;
    ctx.fillText(caleb.pureMail.unread, c.x + 8, c.y + 6);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(caleb.pureMail.fromLabel, c.x + 8, c.y + 24);
    ctx.fillText(caleb.pureMail.subjectLabel, c.x + 8, c.y + 40);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(caleb.pureMail.from, c.x + 60, c.y + 23);
    ctx.fillText(caleb.pureMail.subject, c.x + 60, c.y + 39);
    const bx = c.x + c.w - 84; const by = c.y + c.h - 26;
    ui.button(ctx, bx, by, 76, 20, caleb.pureMail.openLabel, { hover: this.hover === 'mail-open' });
    this.hits.push({ x: bx, y: by, w: 76, h: 20, id: 'mail-open' });
  }

  private drawLetter(ctx: CanvasRenderingContext2D): void {
    // sized to end ABOVE the apparatus's own band: the letter and the dying
    // streak field have to be readable at the same time (spec §S2R.5).
    const W = ERA1_CANVAS.width;
    const dw = 430; const dh = 236;
    const dx = Math.round((W - dw) / 2); const dy = 2;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, caleb.pureMail.letterTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(`${caleb.pureMail.fromLabel} ${caleb.pureMail.from}`, c.x + 8, c.y + 4);
    ctx.fillText(`${caleb.pureMail.subjectLabel} ${caleb.pureMail.subject}`, c.x + 8, c.y + 16);
    ui.px(ctx, c.x + 8, c.y + 28, c.w - 16, 1, ERA1.grey);

    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(caleb.pureMail.heading, c.x + 8, c.y + 34);
    let y = c.y + 52;
    for (const line of caleb.pureMail.lines as string[]) {
      ctx.fillText(line, c.x + 8, y);
      y += 12;
    }
    ctx.fillStyle = ERA1.warnDark;
    ctx.fillText(caleb.pureMail.closing, c.x + 8, y + 6);

    // the read-aloud row only exists once a voice does (S46) — no dead button
    if (this.onReadAloud) {
      const rx = c.x + 8; const ry = c.y + c.h - 22;
      ui.button(ctx, rx, ry, 96, 20, caleb.pureMail.readAloudLabel, { hover: this.hover === 'mail-read' });
      this.hits.push({ x: rx, y: ry, w: 96, h: 20, id: 'mail-read' });
    }

    const bx = c.x + c.w - 92; const by = c.y + c.h - 22;
    ui.button(ctx, bx, by, 84, 20, caleb.pureMail.continueLabel, { hover: this.hover === 'mail-continue' });
    this.hits.push({ x: bx, y: by, w: 84, h: 20, id: 'mail-continue' });
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
    switch (hit.id) {
      case 'alert-ok': this.closeAlert(false); break;
      case 'alert-dismiss': this.closeAlert(true); break;
      case 'mail-open': this.mail = 'letter'; this.glitchT = 0; this.dirty = true; break;
      case 'mail-read': this.onReadAloud?.(caleb.pureMail.readAloudTrack); break;
      case 'mail-continue':
        this.mail = 'closed';
        this.dirty = true;
        this.onMailClosed?.();
        break;
    }
  }

  /** ?debug=1 review only — drop straight into a step without waiting out the
   *  holds (the system's acts still fire, so the ledger reads the same). */
  debugStep(step: 'sad' | 'caught'): void {
    this.startBlock();
    this.killStreak();
    this.streakT = STREAK_FALL;
    this.streakDead = true;
    this.setMood('sad');
    this.step = step;
    this.stepT = 0;
    this.dirty = true;
  }
}
