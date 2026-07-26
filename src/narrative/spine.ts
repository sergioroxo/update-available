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
const SEND_DELAY = 9;   // s into an era before its first summons
const SEND_GAP = 6;     // s after one send resolves before the next
const UPDATE_GAP = 8;   // s after an era's beats exhaust before its failure
const E4_HOLD = 22;     // s in E4 before the bare final restart
/** S2R.7 — the quiet between the residue landing and u3's notice. Long enough
 *  that the notice is plainly NOT a response to the player's press (the press
 *  is the one thing in the era the apparatus was not there to file); short
 *  enough that the era reads as ending rather than idling. */
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

    onEra(era: string): void {
      // arrival resets the clock; the era's own beats begin
      if (era === 'e2') step = 'e2';
      else if (era === 'e3') step = 'e3';
      else if (era === 'e4') step = 'e4';
      t = 0;
    },

    update(dt: number): void {
      // while a ritual or summons is live, the spine holds its breath
      if (step === 'done' || !os.inDesktop || os.updateArmed || os.sendOfferPending) return;
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

        case 'e3':
          if (t >= SEND_DELAY) offer('s3', 'e3_s3');
          break;
        case 'e3_s3':
          if (sendResolved('s3') && t >= SEND_GAP) offer('s4', 'e3_s4');
          break;
        case 'e3_s4':
          if (sendResolved('s4') && t >= UPDATE_GAP) arm('u4', 'e4');
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
