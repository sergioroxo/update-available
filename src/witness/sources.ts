/**
 * ⚑ S174 — WHERE A PRACTICE IS DOCUMENTED, read in one place.
 *
 * A practice (`data/dossier/practices.json`) points at a sourced line in one of
 * the provotype cards' debriefs (`source: { file, index }`). The frame's menu
 * resolved that pointer with a private table; the Close's dossier window
 * (closeMonitor.ts, R4-18) needs the same answer, and two tables would drift.
 * So the table lives here and both read it. It only ever returns what a card
 * already says — never a new claim.
 */
import originIntake from '../../data/provotypes/origin_intake_e1.json';
import pillowCard from '../../data/provotypes/pillow.json';
import e3Day from '../../data/provotypes/e3_theday.json';
import e4Ball from '../../data/provotypes/e4_ball.json';
import e4Offers from '../../data/provotypes/e4_offers.json';

type Debriefed = { debrief: { sources: { status: string; text: string }[] } };

export const SOURCE_FILES: Record<string, Debriefed> = {
  origin_intake_e1: originIntake as unknown as Debriefed,
  pillow: pillowCard as unknown as Debriefed,
  e3_theday: e3Day as unknown as Debriefed,
  e4_ball: e4Ball as unknown as Debriefed,
  e4_offers: e4Offers as unknown as Debriefed
};

/** the sourced line a practice points at, or null when the beat is the piece's own */
export function sourceTextOf(pr: { source?: { file: string; index: number } | null }): string | null {
  if (!pr.source) return null;
  return SOURCE_FILES[pr.source.file]?.debrief.sources[pr.source.index]?.text ?? null;
}
