/**
 * THE WITNESS SIDE — the cold record's palette. LAW: import these, never invent
 * colors (CLAUDE.md).
 *
 * Extracted from `src/witness/intake.ts` with every value preserved exactly —
 * a naming pass, not a repaint.
 *
 * Register: this surface is SHARP and cold. "The witness side is the sharp
 * side" (CLAUDE.md aesthetic laws) — surveillance is high-definition, life is
 * soft. Near-black panels, a cool blue-grey ink, and one warm flag.
 *
 * ── The one token that carries meaning ──
 * `FLAG` marks every place the record notes a REFUSAL: a provotype abandoned, a
 * send declined, guidance declined, Lamby dismissed, media skipped, the ending
 * stood. It was the same literal repeated ten times across intake.ts with no
 * name. It is the warmest thing on the cold side, and that is the point — the
 * apparatus finds your refusals the most interesting thing about you.
 *
 * ── Warm/cold drift, for Sérgio ──
 * The board materials below are this surface's rendering of the SAME objects
 * `./board.ts` draws warm (R26 §B1's lineage). Two pairs agree exactly and are
 * imported from there. Three diverge by a single hex digit — almost certainly
 * accidental drift from hand-typing, not an authored choice, but they are left
 * EXACTLY as they were rather than silently unified, because the warm/cold
 * relationship is Sérgio's call, not a refactor's. See BUILD_LOG 2026-07-22.
 */
import { PAPER, PIN } from './board';

/** The record's own chrome — cool, near-black, no warmth of its own. */
export const RECORD = {
  ink: '#aabbcc',
  dim: '#556677',
  panel: '#0d0d1a',
  field: '#0a0a15',
  line: '#222244',
  voidBg: '#05050a', // the surround: darker than any panel
  pulseOn: '#15151f',
  pulseOff: '#1d1d2c',
  cardLine: '#333344',
  footer: '#445566'
} as const;

/** The refusal flag. See the header — this one means something. */
export const FLAG = '#cc8855';

/**
 * The cork board as the record sees it. `pinBlue` and `strip` are byte-identical
 * to the warm side and so are imported; the three marked ones diverge by one
 * digit (drift, pending Sérgio).
 */
export const COLD_BOARD = {
  pinGold: '#d0a315',
  pinBlue: PIN.blue, //          exact match with the warm side
  strip: PAPER.band, //          exact match with the warm side
  paper: '#f3ead3', // warm side's nearest is INK.onDark #f3ead2 — 1-digit drift
  band: '#ead6ad', //  warm side's nearest is SCRAP.ticket #ead6a4 — 1-digit drift
  rule: '#bca36e'
} as const;
