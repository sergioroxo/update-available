/**
 * ⚑ ONE PULSE — every filing heard once, seen everywhere (S145, 2026-09-16).
 *
 * docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §3F. S144 gave the wall
 * its pulse: when the record grows, the stamp sounds and the newest row lights.
 * The record now has faces on the devices too — the 2016 platform's chip and
 * the 2026 browser's badge — and they must light on the SAME growth, not keep
 * three counters. This is the one observer: the engine ticks it once a frame;
 * it plays the stamp when `recordCount()` grows and exposes `k()` — 1 at the
 * moment of filing, easing to 0 over `SECONDS` — for anything that draws.
 *
 * It never writes to the ledger. The witness is symmetric: a refusal grows
 * the count exactly as compliance does, and lights the same chip.
 */
import { recordCount } from './record';
import { playOnce } from '../audio/tapeAudio';

export const PULSE_SECONDS = 1.6;

let seen = -1;
let t = PULSE_SECONDS;
let count = 0;
let onGrow: (() => void) | null = null;

export const pulse = {
  /** once per frame, by the engine */
  tick(dt: number): void {
    const n = recordCount();
    count = n;
    if (seen < 0) { seen = n; return; }
    if (n > seen) {
      seen = n;
      t = 0;
      playOnce('stamp_witness.mp3');
      onGrow?.();
    }
    if (t < PULSE_SECONDS) t += dt;
  },
  /** 1 at the filing, 0 once settled */
  k(): number { return t >= PULSE_SECONDS ? 0 : 1 - t / PULSE_SECONDS; },
  /** the file's size as of the last tick */
  count(): number { return count; },
  /** the wall (and any other surface that keeps its own clock) is told once per growth */
  set onGrow(fn: (() => void) | null) { onGrow = fn; },
  /** a review that wipes the ledger (Restart) must not hear a hundred stamps catching up */
  reset(): void { seen = -1; t = PULSE_SECONDS; }
};
