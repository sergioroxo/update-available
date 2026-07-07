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
 * the player (v0.5 §1) — the spine's E1 trigger is a PLACEHOLDER (kit + one
 * provotype filed) until the real trigger beat (e1.b09, the diary-delete
 * failure) arrives with the content-merge lane; each later trigger is the
 * era's own failure analog, equally placeholder-flagged. Sends are summons,
 * not doors (§4): the OS offers, the player answers or declines, both file.
 * The frame never plays: everything the spine does surfaces DIEGETICALLY
 * (system dialogs, desktop icons) — no quest popups in the piece's voice.
 *
 * All pacing constants are PLACEHOLDER — Sérgio tunes by feel.
 */
import { ledger } from '../state/ledger';
import type { DesktopOS } from '../desktop/os';
import type { UpdateKey } from '../desktop/apps/update';

const T1_DELAY = 12;    // s after the E1 trigger condition before the notice
const SEND_DELAY = 9;   // s into an era before its first summons
const SEND_GAP = 6;     // s after one send resolves before the next
const UPDATE_GAP = 8;   // s after an era's beats exhaust before its failure
const E4_HOLD = 22;     // s in E4 before the bare final restart

type SpineStep =
  | 'e1' | 'e1_armed'
  | 'e2' | 'e2_s1' | 'e2_s2' | 'e2_armed'
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
          // T1 trigger: the Rob escalation has run to completion (the hook is
          // fully set — 'escalation-done' filed by the IRC). This replaces the
          // old kit+provotype placeholder; the real diary-glitch beat (e1.b09,
          // main-drift) will front-run this when the content-merge lands.
          if (ledger.records.includes('escalation-done')) {
            step = 'e1_armed';
            t = 0;
          }
          break;
        case 'e1_armed':
          if (t >= T1_DELAY) arm('u2', 'e2');
          break;

        case 'e2':
          if (t >= SEND_DELAY) offer('s1', 'e2_s1');
          break;
        case 'e2_s1':
          if (sendResolved('s1') && t >= SEND_GAP) offer('s2', 'e2_s2');
          break;
        case 'e2_s2':
          if (sendResolved('s2') && t >= UPDATE_GAP) arm('u3', 'e3');
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
