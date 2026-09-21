/**
 * THE NARRATIVE SPINE — the conductor that makes the piece FOLLOW THE SCRIPT
 * (REINTERP_NARRATIVE_MASTER_SCRIPT §3 beat map · §5 composition; the beat
 * sequence lives in data/paths.json `reinterp_festival` — composition is
 * data, R3-4 law). It walks the beats that are BUILT and skips the rest, so
 * the whole 30-year arc is playable end-to-end today:
 *
 *   opening → E1 (kit → install/O7 reveal → provotypes) → T1 UPDATE → E2
 *   (pillow already filed or filed here → s1 → s2) → T2 UPDATE → E3
 *   (s3 → s4, the dilemma) → T3 UPDATE → E4 (the TURN) → the bare final
 *   restart → the Close.
 *
 * LAWS HONORED: updates fire only on documented system failures, never by
 * the player (v0.5 §1). E1 now uses the resolved e1.b09 trigger: the diary
 * delete fails, the person's glitch files, and only then does T1 arm. E2 now
 * has the same shape (S2R.7, Session 58): the accountability network collapses
 * on screen in S2R.5 — the era's documented failure, already played — the
 * Caleb thread runs out to its residue, and the spine reads that residue off
 * the ledger and closes the era. E3/E4's triggers are still the era's failure
 * analog, still placeholder-flagged.
 * Sends are summons, not doors (§4): the OS offers, the player answers or declines, both file.
 * The frame never plays: everything the spine does surfaces DIEGETICALLY
 * (system dialogs, desktop icons) — no quest popups in the piece's voice.
 *
 * All pacing constants are PLACEHOLDER — Sérgio tunes by feel.
 */
import { ledger } from '../state/ledger';
import type { DesktopOS } from '../desktop/os';
import type { UpdateKey } from '../desktop/apps/update';

const T1_DELAY = 1.2;   // s after DIARY.TXT's breakout hold before the notice
/** How many corrections Vera has resolved — applied or skipped, both count,
 *  because the record is symmetric and so is the interruption. */
function correctionsDone(): number { return ledger.graceQueue.length; }
/** ⚑ the block was outnumbered — filed by `phoneE3` when the last cascade
 *  message lands. The ledger is where the piece records what happened, so it is
 *  also where the spine asks; nothing keeps a second copy of this. */
function cascadeSeen(): boolean {
  return ledger.checkins.some(c => c.id === 'e3_cascade');
}

const SEND_DELAY = 9;   // s into an era before its first summons
const SEND_GAP = 6;     // s after one send resolves before the next
const UPDATE_GAP = 8;   // s after an era's beats exhaust before its failure
const E4_HOLD = 22;     // s in E4 before the bare final restart
/** S2R.7 — the quiet between the residue landing and u3's notice. Long enough
 *  that the notice is plainly NOT a response to the player's press (the press
 *  is the one thing in the era the apparatus was not there to file); short
 *  enough that the era reads as ending rather than idling. */
/** ⚑ S164 / R3-61: the monitor stays DARK after the residue now (os.ts
 *  `residueDark`); measured, the notice rises out of the black ~6 s after the
 *  hold ends at this value (the update's own notice delay is on top of it). */
const RESIDUE_GAP = 6;

type SpineStep =
  | 'e1' | 'e1_armed'
  | 'e2' | 'e2_s1' | 'e2_s2' | 'e2_residue' | 'e2_armed'
  | 'e3' | 'e3_s3' | 'e3_s4' | 'e3_armed'
  | 'e4' | 'e4_armed'
  | 'done';

export interface Spine {
  update(dt: number): void;
  /** the engine reports era arrivals (after driveMorph) so timers restart */
  onEra(era: string): void;
  /** ⚑ S150 — the Close was LEFT (the Restart card's era buttons): the piece may
   *  end again from the room it went back to. Without this the `closed` guard
   *  below swallowed the second ending — the spine sat at `e4` for ever (R3-113). */
  reopen(era: string): void;
  readonly step: SpineStep;
}

export function createSpine(os: DesktopOS, opts: { onClose: () => void }): Spine {
  let step: SpineStep = 'e1';
  let t = 0;
  let closed = false;

  const sendResolved = (id: string): boolean =>
    ledger.sends.some(s => s.id === id && (s.outcome === 'visited' || s.outcome === 'declined'));

  /** S2R.7 — the era's climax, read off the record the same way E1's trigger
   *  is (`diary-glitch`): the residue has been committed and held, the Caleb
   *  thread is over. The apparatus filed it as the one entry it could not
   *  classify, which is exactly why the spine — not the OS — is what notices. */
  const residueFiled = (): boolean => ledger.caleb.some(c => c.outcome === 'residue');

  function arm(key: UpdateKey, next: SpineStep): void {
    os.armUpdate(key);
    step = next;
    t = 0;
  }
  function offer(id: string, next: SpineStep): void {
    os.offerSend(id);
    step = next;
    t = 0;
  }

  return {
    get step(): SpineStep { return step; },

    reopen(era: string): void {
      closed = false;
      step = era === 'e2' ? 'e2' : era === 'e3' ? 'e3' : era === 'e4' ? 'e4' : 'e1';
      t = 0;
    },

    onEra(era: string): void {
      /**
       * ⚑ `close` IS AN ENDING, NOT AN ARRIVAL (S101). The close ritual is armed
       * from Era 4's LAPTOP now — the headset's plane is switched off by then, so
       * this conductor's own `case 'e4'` arm would have put the notice on a
       * surface that is no longer in the room. Whoever armed it, its completion
       * is the end of the piece, and it lands here: the step goes to `done` (so
       * nothing arms a second one) and the constellation is asked for once.
       * `closed` still guards it, so the older path through `e4_armed` — which
       * is intact and still works if a review drives it — cannot double-fire.
       */
      if (era === 'close') {
        if (!closed) { closed = true; step = 'done'; opts.onClose(); }
        return;
      }
      // arrival resets the clock; the era's own beats begin
      if (era === 'e2') step = 'e2';
      else if (era === 'e3') step = 'e3';
      else if (era === 'e4') step = 'e4';
      t = 0;
    },

    update(dt: number): void {
      // while a ritual or summons is live, the spine holds its breath
      if (step === 'done' || os.updateArmed || os.sendOfferPending) return;
      // ⚑ `os.inDesktop` IS THE WRONG GATE FROM ERA 3 ON, and it was silently
      //   switching the conductor off for half the piece. `os` is Room 1's
      //   monitor; from E3 the UI lives on Vera's workstation and from E4 on Maya's
      //   visor, and Room 1's machine is left dead BY DESIGN — so `inDesktop`
      //   is false for the whole of both eras and this `update` returned on its
      //   first line every frame. Measured 2026-08-24 at the E3 seat:
      //   `phase: 'r_profile', inDesktop: false, step: 'e3'` — the conductor
      //   sitting at the right beat, never ticking.
      //
      //   That is why E3's two sends were "latent, no beat fires that seam" and
      //   why the era had no exit at all: not one condition in `case 'e3'` was
      //   ever evaluated. The gate is kept for the eras whose surface really is
      //   that monitor, and lifted for the eras whose surface is elsewhere.
      const monitorIsTheSurface = step === 'e1' || step === 'e1_armed'
        || step === 'e2' || step === 'e2_s1' || step === 'e2_s2'
        || step === 'e2_residue' || step === 'e2_armed';
      if (monitorIsTheSurface && !os.inDesktop) return;
      t += dt;

      switch (step) {
        case 'e1':
          // T1 trigger: the system tried to erase DIARY.TXT and failed. That
          // is the documented failure beat for E1, not the player "failing."
          if (ledger.records.includes('diary-glitch')) {
            step = 'e1_armed';
            t = 0;
          }
          break;
        case 'e1_armed':
          if (t >= T1_DELAY) arm('u2', 'e2');
          break;

        // E2's three send steps all yield to the SAME thing: the era's own
        // climax. S2R.7's dramaturgy call (argued in the session log) is that
        // the residue does not merely satisfy the s2 gate — it RETIRES the
        // send lane. The summonses are errands of an accountability network
        // that has just collapsed on screen (S2R.5); once Daniel has said the
        // thing the record could not classify, the era has no further business
        // and the machine has no further right to send him anywhere. So the
        // residue short-circuits whichever send step is live, and the ending
        // is CAUSED by the climax rather than merely following it — while the
        // update itself still fires on the apparatus's documented failure, not
        // on any press of the player's (SCRIPT_UPDATE v0.5 §1).
        case 'e2':
          if (residueFiled()) { step = 'e2_residue'; t = 0; break; }
          if (t >= SEND_DELAY) offer('s1', 'e2_s1');
          break;
        case 'e2_s1':
          if (residueFiled()) { step = 'e2_residue'; t = 0; break; }
          if (sendResolved('s1') && t >= SEND_GAP) offer('s2', 'e2_s2');
          break;
        case 'e2_s2':
          if (residueFiled()) { step = 'e2_residue'; t = 0; break; }
          if (sendResolved('s2') && t >= UPDATE_GAP) arm('u3', 'e3');
          break;
        case 'e2_residue':
          // the quiet after the quiet: nothing speaks, and then the system
          // notices its own end and says so.
          if (t >= RESIDUE_GAP) arm('u3', 'e3');
          break;

        // ⚑ ERA 3 WAITS FOR THE PLAYER, NOT FOR A STOPWATCH. Fixed 2026-08-21.
        //
        // These fired on `t >= SEND_DELAY` — nine seconds after the era begins,
        // whatever the player happened to be doing. Sérgio met the first offer
        // ON TOP OF the "Welcome back, Vera" sign-in, and the second across
        // Renata's testimony while he was still reading it: *"I had to press the
        // source file because it was in front of the text."* A summons that
        // interrupts the task it is about reads as a bug, not as pressure, and
        // it cost him the era.
        //
        // ⚑ The signal already existed and nothing used it: `ledger.graceQueue`
        // gets an entry every time a correction is applied OR skipped. So the
        // offers now wait until Vera is genuinely AT WORK — which is also when
        // an interruption means something, because there is something to
        // interrupt. Elapsed time is kept only as a floor, never as the trigger.
        // ⚑ AND ERA 3 CAN NOW END — 2026-08-24, and until today it could not.
        //
        // The only route from `e3` to the update that opens Era 4 ran
        // `e3 → offer s3 → offer s4 → arm u4`, and s3/s4 are the two sends
        // ERA3_BUILD_PLAN §0 RETIRES in as many words: "already gated off, their
        // targets point at the retired radial layout — do not restore them in
        // this rebuild". So the era's exit was gated behind two beats that are
        // never meant to fire again. Every static check was green. This is the
        // dominant bug class in this project — authored content nobody can
        // reach — arriving at the largest possible scale: a whole ERA with no
        // way out of it.
        //
        // ⚑ THE FIX IS THE NARRATIVE, NOT A PATCH. §5: the era does not end
        // because Vera becomes brave, it ends because enough people stopped
        // doing the work. So the update is armed by THE CASCADE — the phone's
        // group outnumbering Lambient's block — and the trigger is read from
        // the ledger, where the piece already records what happened, rather
        // than from a second copy of the state kept in here.
        // ⚑ S149 — THE SPINE NO LONGER ARMS ERA 3's UPDATE. The room does
        //   (era3Devices.tick): the cascade seen AND nothing open, then a beat of
        //   quiet. Two arming sites meant the phone's gate could be jumped from
        //   here; one conductor for the era's end. `cascadeSeen` stays as the
        //   read this file documents, and `onEra('e4')` still moves the step.
        // ⚑ S150 — NO SUMMONS IN 2016 (OPEN_ITEMS R3-69). The s3 offer put a
        //   "Source file" icon on the workstation after two corrections, over the
        //   text she was reading (Sérgio 08-21 §C, again 09-17: "appears out of
        //   nowhere"), for a send ERA3_BUILD_PLAN §0 retired and `os.ts` hard-gates
        //   off. The era's beats are the board and the phone (NARRATIVE_FLOW). The
        //   send data stays for L-03 (the trans-masc borderland), which is a design
        //   of its own, not this icon.
        case 'e3':
          void correctionsDone;
          break;
        // ⚑ the two send legs are LEFT INTACT and unreachable-by-default rather
        //   than deleted: they are the shipped build's own beats, they still
        //   work if a review drives them, and the cascade check above runs
        //   first from `e3` regardless. Removing them is a separate decision.
        case 'e3_s3':
          if (sendResolved('s3') && t >= SEND_GAP && correctionsDone() >= 5) offer('s4', 'e3_s4');
          break;
        case 'e3_s4':
          void cascadeSeen;   // the era's end is the room's (S149) — see case 'e3'
          break;

        case 'e4':
          if (t >= E4_HOLD) arm('close', 'e4_armed');
          break;
        case 'e4_armed':
          // the bare restart completed → the constellation
          if (!os.updateArmed && !closed) {
            closed = true;
            step = 'done';
            opts.onClose();
          }
          break;
      }
    }
  };
}
