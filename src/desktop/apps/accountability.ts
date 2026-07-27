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

const calebPacing = caleb.pacing;

interface Hit { x: number; y: number; w: number; h: number; id: string }

type AlertStep = 'stop' | 'block' | 'wanting' | 'streak' | 'system' | 'sad' | 'caught' | 'closed';
type MailPhase = 'none' | 'arriving' | 'envelope' | 'letter' | 'closed';

// ── PACING — ALL OF IT LIVES IN data/dialog/s2_caleb.json's `pacing` BLOCK ──
// Session 48 moved every timing constant out of here so Sérgio can tune the
// thread's breath without hunting through TypeScript. This module holds no
// numbers of its own; read that block's `_doc` before changing anything.
// The alert's dwells are the load-bearing ones: this is the beat that NAMES
// THE FLAG, and if its text cannot be read, the thesis is lost.
const A = calebPacing.alert;
const MAIL = calebPacing.mail;
const HOLD: Record<Exclude<AlertStep, 'caught' | 'closed'>, number> = {
  stop: A.stopSeconds,
  block: A.blockSeconds,
  wanting: A.wantingSeconds,
  streak: A.streakSeconds,
  system: A.systemSeconds,
  sad: A.sadHoldSeconds
};
const STREAK_FALL = A.streakFallSeconds;   // s for the counter to run 412 → 0
const GLITCH_STEP = MAIL.streakGlitchStepSeconds; // s per state of the dying field (S2R.5)
const MAIL_ARRIVE = MAIL.arriveGlitchSeconds;     // s of the envelope's glitch entrance
/** where in the entrance the tear resolves into the actual envelope card */
const MAIL_LOCK = 0.34;

/**
 * THE APPARATUS'S OWN WARM-CORRUPT GLITCH GRAMMAR (S2R.5's entrance).
 *
 * Deliberately the SAME vocabulary as the video's break in
 * src/desktop/apps/netvision.ts — scanlines on a 3px cadence, sparse tape
 * noise, one rolling tracking band — and no new effect. `amount` moves only
 * the DENSITY of the noise and the alpha of the band, and it ramps
 * monotonically, so the screen's luminance never jumps: warm-corrupt, NEVER
 * strobe (glitch doctrine + photosensitivity).
 *
 * WHY IT IS COPIED AND NOT IMPORTED: netvision.ts keeps this as private
 * methods and is outside this session's file fence. src/desktop/apps/caleb.ts
 * carries the same twelve lines for the residue's dissolve, and cannot import
 * them from here in any case — it is `felt` and imports nothing operable. If a
 * third copy ever appears, extract `src/desktop/theme/glitch.ts`.
 */
function glitchWash(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  amount: number, t: number
): void {
  if (amount <= 0.01) return;
  ctx.fillStyle = `rgba(0,0,0,${(0.16 * amount).toFixed(3)})`;
  for (let sy = y; sy < y + h; sy += 3) ctx.fillRect(x, sy, w, 1);
  const count = Math.round(amount * amount * 620);
  for (let i = 0; i < count; i++) {
    const nx = x + Math.floor(Math.random() * w);
    const ny = y + Math.floor(Math.random() * h);
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(nx, ny, 1, Math.random() < 0.3 ? 2 : 1);
  }
  const bandH = 6;
  const frac = (t % 2.4) / 2.4; // the video's own roll period
  const by = y + Math.round(frac * (h - bandH));
  ctx.fillStyle = `rgba(20,20,24,${(0.55 * amount).toFixed(3)})`;
  ctx.fillRect(x, by, w, bandH);
  ctx.fillStyle = `rgba(230,230,235,${(0.22 * amount).toFixed(3)})`;
  ctx.fillRect(x + 3, by + bandH, Math.max(w - 6, 0), 1);
}

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
  /**
   * S46's WAV, WIRED (S60). `public/assets/audio/lamby_puremail_apology.wav`
   * was rendered, committed and registered months ago and nothing ever played
   * it: the apparatus reading its own death notice, in the cheerful assistant
   * timbre, sitting unused on disk.
   *
   * os.ts owns the element (so pause/Leave can reach it); this module only
   * asks. `onReadAloud` toggles — pressing it while it plays stops it — and
   * returns whether audio is now sounding. `isReadingAloud` is polled for the
   * now-playing row, which is why that row can finally claim to be true.
   * MISSING-FILE-SAFE: `readAloudAvailable` is set from the registry, so an
   * absent WAV means no button at all rather than a button that lies.
   */
  onReadAloud?: (track: string) => boolean;
  isReadingAloud?: () => boolean;
  readAloudAvailable = false;

  private step: AlertStep = 'stop';
  private stepT = 0;
  private t = 0;
  private mood: LambyMood = 'cheerful';
  private moodStart = 0;
  private stamped = false;
  private streakT = -1;      // >= 0 once the counter is falling
  private streakDead = false;
  private mail: MailPhase = 'none';
  private mailT = 0;   // s since the envelope began tearing its way in
  private glitchT = 0;
  private chat = { x: 8, y: 10, w: 420, h: 222 };
  private hits: Hit[] = [];
  private hover = '';
  /** S60 — the player pressed Caleb's notification while the block is on. The
   *  apparatus answers the only way it can: by re-asserting its own stamp for
   *  a moment. The affordance works; the answer is no. */
  private stampPingT = 0;

  /** while true the beat owns the monitor's clicks (over the chat, under the
   *  system-modal update ritual) */
  get modal(): boolean { return this.step !== 'closed' || this.mailOpen; }
  /** the stamp outlives the alert: it sits on the chat until the block lifts */
  get stampVisible(): boolean { return this.stamped; }
  get alertRunning(): boolean { return this.step !== 'closed'; }
  get mailOpen(): boolean {
    return this.mail === 'arriving' || this.mail === 'envelope' || this.mail === 'letter';
  }

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

  /** the player tried to open the blocked message (from the corner toast, or
   *  from the taskbar mark). The stamp answers for the machine. */
  pingStamp(): void {
    if (!this.stamped) return;
    this.stampPingT = 0.9;
    this.dirty = true;
  }

  /** the block lifts (S2R.5) — the stamp comes off the conversation */
  liftStamp(): void {
    if (!this.stamped) return;
    this.stamped = false;
    this.dirty = true;
  }

  /** S2R.5 — the envelope arrives. It does NOT simply appear: the apparatus is
   *  failing, so its own signal tears and the message comes through the tear,
   *  in the warm-corrupt grammar the New You video broke in half an hour ago.
   *  Same vocabulary, slower, and the letter is what survives it. */
  openMail(): void {
    if (this.mail !== 'none') return;
    this.mail = 'arriving';
    this.mailT = 0;
    this.step = 'closed'; // by the collapse the assistant has always finished talking
    this.setMood('sterile'); // empty-eyed: the inner watcher losing its outer god
    this.glitchT = 0;
    this.dirty = true;
  }

  // ── update ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    this.t += dt;
    if (this.stampPingT > 0) {
      this.stampPingT = Math.max(0, this.stampPingT - dt);
      this.dirty = true;
    }
    if (this.streakT >= 0 && this.streakT < STREAK_FALL) {
      this.streakT = Math.min(STREAK_FALL, this.streakT + dt);
      if (this.streakT >= STREAK_FALL) this.streakDead = true;
      this.dirty = true;
    }
    if (this.mail === 'arriving') {
      this.mailT += dt;
      if (this.mailT >= MAIL_ARRIVE) this.mail = 'envelope';
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
  /**
   * S60 (finding E18, Sérgio: *"the Accountability window pops back when
   *  PureMail opens — why?"*). It did, and he was right to ask.
   *
   * WHAT WAS HAPPENING: the alert's band was drawn while `step !== 'closed'
   * || mailOpen`. The alert ends (the band goes away), a couple of seconds
   * pass, the envelope arrives — and the band came BACK, as a second live
   * window, because the collapse's own signals (the dying streak field, Lamby
   * gone empty-eyed) lived inside it. Two windows, no way to choose, and the
   * one carrying the era's most important text was the one that had just been
   * shoved.
   *
   * THE RULING: **the letter owns the screen.** The band is retired when the
   * alert closes and never returns. Nothing of S2R.5 is lost — the two signals
   * it carried move INSIDE the letter's own footer, where they belong anyway:
   * the streak dying and the assistant going quiet are things the death notice
   * is doing to the machine, not a separate window's business. One window, one
   * focus, and the collapse reads as one event.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    if (this.stamped) this.drawStamp(ctx);
    if (this.alertRunning) this.drawBand(ctx);
    if (this.mail === 'arriving') this.drawMailArrival(ctx);
    if (this.mail === 'envelope') this.drawEnvelope(ctx, true);
    if (this.mail === 'letter') this.drawLetter(ctx);
  }

  /** the apparatus's mark ON the conversation — a band across the transcript.
   *  It is drawn over the felt window's rect and never inside its grammar:
   *  no Lamby, no face, no charm. Just the stamp. */
  private drawStamp(ctx: CanvasRenderingContext2D): void {
    const x = this.chat.x + 6;
    const w = this.chat.w - 12;
    const y = this.chat.y + Math.round(this.chat.h * 0.42);
    // the ping (S60): pressing Caleb's notification re-asserts the block —
    // the band brightens for a beat and settles. No new copy, no new object.
    const ping = this.stampPingT > 0;
    ui.px(ctx, x, y, w, 30, ping ? ERA1.warn : ERA1.warnDark);
    ui.px(ctx, x, y, w, 1, ping ? ERA1.tooltip : ERA1.warn);
    ui.px(ctx, x, y + 29, w, 1, ping ? ERA1.tooltip : ERA1.warn);
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
    // DISMISSAL LAW, honestly (S60): the close box is hit-testable from the
    // alert's FIRST frame, not only once it reaches its last step. This
    // module's own header has always claimed "Lamby's window can be closed at
    // ANY point"; until now the code only pushed that rect inside
    // drawAlertButtons, i.e. at `caught`. It is also what makes greying the
    // "Not now" button below safe: the real exit was never that button.
    this.hits.push({
      x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'alert-dismiss'
    });

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

  /** 412 → 0, on screen, during the alert. The collapse's version of this
   *  field (the one that comes apart) now lives in the letter's own footer —
   *  see drawLetterFooter, and draw()'s ruling about who owns the screen. */
  private drawStreak(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(caleb.alert.streakLabel, x, y + 3);
    const from = caleb.alert.streakFrom;
    const k = Math.min(1, this.streakT / STREAK_FALL);
    const eased = k * k;
    const value = Math.max(caleb.alert.streakTo, Math.round(from - (from - caleb.alert.streakTo) * eased));
    ui.setFont(ctx, 12);
    ctx.fillStyle = this.streakDead ? ERA1.warn : ERA1.navy;
    ctx.fillText(`${value} ${caleb.alert.streakUnit}`, x + 130, y);
  }

  /**
   * ⚑ THE DEAD BUTTON, ON PURPOSE (S60, finding C12 — Sérgio's ruling: *"the
   * 'not now' either should be greyed out or just do the same as continue"*,
   * and greyed where the beat is coercive).
   *
   * This is the coercive beat: "Don't be hard on yourself — we'll get the days
   * back together." So "Not now" renders GREYED and takes no press. Nothing
   * branches, nothing diverges, no consequence is invented — the option was
   * never a fork, it was an ornament, and now it looks like one. The apparatus
   * displays a choice that is not one: *you may not decline this.*
   *
   * The dismissal law is untouched and is now MORE reachable than before: the
   * window's close box is live from the alert's first frame (see drawBand) and
   * files exactly as this button used to.
   */
  private drawAlertButtons(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const by = c.y + c.h - 22;
    const okX = c.x + c.w - 92;
    const noX = okX - 96;
    ui.button(ctx, okX, by, 88, 20, caleb.alert.okLabel, { hover: this.hover === 'alert-ok' });
    ui.button(ctx, noX, by, 88, 20, caleb.alert.dismissLabel, { disabled: true });
    this.hits.push({ x: okX, y: by, w: 88, h: 20, id: 'alert-ok' });
  }

  /** the envelope's rect, shared by the entrance and the card itself */
  private static readonly MAILBOX = { w: 300, h: 116, y: 60 } as const;

  /**
   * THE ENTRANCE (S2R.5). Two movements, one grammar:
   *  1. the TEAR — a band of corrupt signal opens where the message will be,
   *     growing from a hairline to the card's full height. Nothing readable,
   *     no frame yet: the apparatus's picture is coming apart, and something
   *     is arriving through the gap;
   *  2. the LOCK — the envelope resolves inside the tear and the noise decays
   *     off it, like a tape finding its tracking.
   * Density ramps both ways. Never a flash, never a strobe.
   */
  private drawMailArrival(ctx: CanvasRenderingContext2D): void {
    const W = ERA1_CANVAS.width;
    const { w: dw, h: dh, y: dy } = AccountabilityApp.MAILBOX;
    const dx = Math.round((W - dw) / 2);
    const p = Math.min(1, this.mailT / MAIL_ARRIVE);

    if (p < MAIL_LOCK) {
      const k = p / MAIL_LOCK;
      const bh = Math.max(2, Math.round(dh * k * k));
      const by = Math.round(dy + (dh - bh) / 2);
      ui.px(ctx, dx, by, dw, bh, ERA1.black);
      ui.px(ctx, dx, by, dw, 1, ERA1.grey);
      ui.px(ctx, dx, by + bh - 1, dw, 1, ERA1.silver);
      glitchWash(ctx, dx, by, dw, bh, 1, this.t);
      return;
    }
    this.drawEnvelope(ctx, false);
    const settle = 1 - (p - MAIL_LOCK) / (1 - MAIL_LOCK);
    glitchWash(ctx, dx, dy, dw, dh, settle, this.t);
  }

  /** `interactive` is false while the entrance is still resolving — the Open
   *  button is drawn but cannot be pressed through the noise. */
  private drawEnvelope(ctx: CanvasRenderingContext2D, interactive: boolean): void {
    const W = ERA1_CANVAS.width;
    const { w: dw, h: dh, y: dy } = AccountabilityApp.MAILBOX;
    const dx = Math.round((W - dw) / 2);
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
    if (interactive) this.hits.push({ x: bx, y: by, w: 76, h: 20, id: 'mail-open' });
  }

  private drawLetter(ctx: CanvasRenderingContext2D): void {
    // S60: the letter is now the ONLY window in the collapse (see draw()'s
    // ruling), so it carries S2R.5's other two signals itself, in a footer
    // strip: the streak field coming apart, and Lamby sitting empty-eyed and
    // silent beside it — the inner watcher losing its outer god, inside the
    // notice that killed it.
    const W = ERA1_CANVAS.width;
    const dw = 430; const dh = 306;
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

    this.drawLetterFooter(ctx, c);

    // the read-aloud row only exists once the voice really does — the registry
    // decides (S60): an unregistered/missing WAV means no button, not a lie
    if (this.readAloudAvailable) {
      const playing = this.isReadingAloud?.() === true;
      const rx = c.x + 8; const ry = c.y + c.h - 22;
      const label = playing ? caleb.pureMail.readAloudStopLabel : caleb.pureMail.readAloudLabel;
      ui.button(ctx, rx, ry, 96, 20, label, { hover: this.hover === 'mail-read' });
      this.hits.push({ x: rx, y: ry, w: 96, h: 20, id: 'mail-read' });
      if (playing) {
        // finding E19 — "now playing" WHAT? This row exists only while the
        // voice is audibly playing, and it names what it is.
        // 8px, and it lives in the gap between the two buttons — the row has
        // to fit between them without being clipped by Continue
        ui.setFont(ctx, 8);
        ctx.fillStyle = ERA1.navy;
        ctx.fillText(caleb.pureMail.nowPlaying, rx + 104, ry + 7);
      }
    }

    const bx = c.x + c.w - 92; const by = c.y + c.h - 22;
    ui.button(ctx, bx, by, 84, 20, caleb.pureMail.continueLabel, { hover: this.hover === 'mail-continue' });
    this.hits.push({ x: bx, y: by, w: 84, h: 20, id: 'mail-continue' });
  }

  /** S2R.5's other two signals, inside the letter: the dying streak field and
   *  Lamby, sterile and wordless. He is drawn from the ONE definition
   *  (src/desktop/apps/lambyChar.ts) here exactly as in the band. */
  private drawLetterFooter(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const fy = c.y + c.h - 96;
    ui.px(ctx, c.x + 8, fy, c.w - 16, 1, ERA1.grey);
    drawLambyChar(ctx, c.x + 52, fy + 40, {
      mood: this.mood, action: 'idle', t: this.t, moodStart: this.moodStart, scale: 0.44
    });
    const L = c.x + 108;
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(caleb.pureMail.streakFieldLabel, L, fy + 26);
    const states = caleb.pureMail.streakGlitch as string[];
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.warn;
    ctx.fillText(states[Math.min(states.length - 1, Math.floor(this.glitchT / GLITCH_STEP))], L, fy + 40);
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
      case 'mail-read':
        // a toggle, so the row can always be told the truth about itself
        this.onReadAloud?.(caleb.pureMail.readAloudTrack);
        this.dirty = true;
        break;
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
