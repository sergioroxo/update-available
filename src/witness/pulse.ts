/**
 * ⚑ ONE PULSE — every filing heard once, seen everywhere (S145, 2026-09-16).
 *
 * docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §3F. S144 gave the wall
 * its pulse: when the record grows, the stamp sounds and the newest row lights.
 * The record now has faces on the devices too — the 2016 platform's chip and
 * the 2026 browser's badge — and they must light on the SAME growth, not keep
 * three counters. This is the one observer: the engine ticks it once a frame;
 * it notices when `recordCount()` grows and exposes `k()` — 1 at the
 * moment of filing, easing to 0 over `SECONDS` — for anything that draws.
 * (S401: it no longer plays the stamp; the wall it sounded from is gone.)
 *
 * It never writes to the ledger. The witness is symmetric: a refusal grows
 * the count exactly as compliance does, and lights the same chip.
 */
import { recordCount, recordCountFor, type RecordEra } from './record';

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
      // ⚑ S401 (UiB job 29 D1) — SILENT. The stamp went with the wall it came from (his round 2, 16 Nov: "If we removed
      //   the panel in the back, we must remove those sounds, as they no longer have a direct application of the
      //   diegetic/non-diegetic"). What a filing does now is seen, not heard: the file on each era's screen lights.
      onGrow?.();
    }
    if (t < PULSE_SECONDS) t += dt;
  },
  /** 1 at the filing, 0 once settled */
  k(): number { return t >= PULSE_SECONDS ? 0 : 1 - t / PULSE_SECONDS; },
  /** the file's size as of the last tick (⚑ S427: the entries the file lists, `recordEntries().length` — no map marks, no tags) */
  count(): number { return count; },
  /** ⚑ S178 — ONE PERSON'S file: what a device inside an era may show. Daniel, Vera and Maya
   *  do not share a file (his ruling); the run's total belongs to the frame (the menu, the
   *  Close). Found by his Witness research (2026-09-27): Vera's chip and Maya's badge showed
   *  the whole run's count while their pages listed only their own entries. */
  countFor(era: RecordEra): number { return recordCountFor(era); },   // ⚑ S427: the same number, without deriving the file every frame
  /** the wall (and any other surface that keeps its own clock) is told once per growth */
  set onGrow(fn: (() => void) | null) { onGrow = fn; },
  /** a review that wipes the ledger (Restart) must not hear a hundred stamps catching up */
  reset(): void { seen = -1; t = PULSE_SECONDS; }
};
