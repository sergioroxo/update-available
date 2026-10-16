/**
 * ONE version for visitors (2026-10-15, the lead);
 * the full cut is kept for review behind ?cut=full.
 * Internal speedrun names remain so existing authored data stays intact.
 */
import { ledgerGeneration } from './ledger';
export type Cut = 'full' | 'speedrun';
let chosen: Cut | null = null;
export function currentCut(): Cut {
  if (chosen) return chosen;
  try { chosen = new URLSearchParams(window.location.search).get('cut') === 'full' ? 'full' : 'speedrun'; }
  catch { chosen = 'speedrun'; }
  return chosen;
}
/** Entrance handover only; no visitor-facing version selector calls this. */
export function chooseCut(c: Cut): void { chosen = c; }
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
