/**
 * ⚑ S227 — THE TWO CUTS (his, 2026-10-10: the exhibition offers "both" — the full piece and the Speedrun Version;
 * W1-A3 named it "Speedrun Version"). One source, two routes through it (OPEN_ITEMS L-02, P7-33). The cut is chosen
 * at the front door (LambyOS Home) or by the URL `?cut=speedrun`; it is read once and never stored (no storage law).
 * Each era decides what the shorter route means for it; this file only answers which cut is running.
 */
export type Cut = 'full' | 'speedrun';

let chosen: Cut | null = null;

/** which cut this visit is playing */
export function currentCut(): Cut {
  if (chosen) return chosen;
  try {
    chosen = new URLSearchParams(window.location.search).get('cut') === 'speedrun' ? 'speedrun' : 'full';
  } catch {
    chosen = 'full';
  }
  return chosen;
}

export function isSpeedrun(): boolean {
  return currentCut() === 'speedrun';
}

/** the front door's choice (LambyOS Home): set once, before the fiction starts; memory only */
export function chooseCut(c: Cut): void {
  chosen = c;
}
