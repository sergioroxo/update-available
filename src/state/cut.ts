/**
 * ONE version for visitors (2026-10-15, the lead).
 * ⚑ S401 (UiB job 29 D5; his "Yes, freeze it", 17 Nov) — ONE VERSION. The old full route is FROZEN as a research state
 * (git tag `research/full-cut-2026-11-17`; docs/reinterp/RESEARCH_NOTE_THE_TWO_CUTS_2026-11-17.md): the live build no
 * longer answers `?cut=full`, and `currentCut()` is always the visit. The code behind `isSpeedrun()` stays as it is (his
 * 15 Oct: "Turn the separate full version off (keep the code)"); "speedrun" is only the visit's old internal name.
 */
import { ledgerGeneration } from './ledger';
export type Cut = 'full' | 'speedrun';
export function currentCut(): Cut { return 'speedrun'; }
/** Entrance handover only; no visitor-facing version selector calls this. Since S401 the visit is the only cut. */
export function chooseCut(c: Cut): void { void c; }
export function isSpeedrun(): boolean { return currentCut() === 'speedrun'; }

// Visit-only opt-ins and irreversible branch points; wiped with the ledger, including soft Restart.
const extras = new Set<string>();
const passed = new Set<string>();
let generation = ledgerGeneration;
function syncVisit(): void {
  if (generation === ledgerGeneration) return;
  extras.clear(); passed.clear(); generation = ledgerGeneration;
}
export function extraOn(id: string): boolean { syncVisit(); return extras.has(id); }
export function extraPassed(id: string): boolean { syncVisit(); return passed.has(id); }
export function markExtraPassed(id: string): void { syncVisit(); passed.add(id); }
/** Idempotent and forward-only: a stale menu press cannot reopen an elapsed branch. */
export function enableExtra(id: string): void {
  syncVisit();
  if (!passed.has(id)) extras.add(id);
}
