/**
 * ⚑ S207 — THE PAUSES AND THE WAYS BACK (data/strings/pauses.json; plan: SKETCH_BRANCHES_AND_SIDE_DOORS §4).
 *
 * One pause per era: the era's own software says, once, what else is on the desk — only what has not been opened
 * yet, read live from the map's optional beats, so the list shrinks as the player goes and never goes stale.
 * And the way back: when an optional thing is closed, the era's voice names the main path's current step. Every
 * side door the SYSTEM built leads back to it; the people's things (Caleb's song, the radio tape, Tape C, the
 * outtake, the ball) never call this — that difference is the point.
 *
 * Pure reads: nothing here files anything.
 */
import P from '../../data/strings/pauses.json';
import { mapState } from '../witness/map';
import type { DesktopOS } from '../desktop/os';

type EraId = 'e1' | 'e2' | 'e3' | 'e4';
let osRef: DesktopOS | null = null;
/** the OS registers itself once, so the 2016 workstation and the 2026 laptop can read the same map */
export function setPauseOS(os: DesktopOS): void { osRef = os; }

const PAUSE = P.pause as unknown as Record<EraId, { items: Record<string, string> } & Record<string, unknown>>;
const WAYBACK = P.wayBack as unknown as Record<EraId, string>;

/** the pause's lines for an era: each listed item whose map beat is not done yet (items with no map beat are
 *  shown unless the caller says they are done) */
export function pauseItems(era: EraId, extraDone: string[] = []): string[] {
  if (!osRef) return [];
  const st = mapState(osRef);
  const eraState = st.eras.find((e) => e.id === era);
  const items = PAUSE[era].items;
  const out: string[] = [];
  for (const [id, line] of Object.entries(items)) {
    const beat = eraState?.beats.find((b) => b.beat.id === id);
    const done = beat ? beat.state === 'done' : extraDone.includes(id);
    if (!done) out.push(line);
  }
  return out;
}

/** the era's voice naming the main path's current step — null when there is none, or a quiet beat holds */
export function wayBackLine(era: EraId): string | null {
  if (!osRef) return null;
  const st = mapState(osRef);
  if (!st.current || st.quiet || st.current.era !== era) return null;
  return WAYBACK[era].replace('{beat}', st.current.beat.label);
}

/** the pause's fixed words (title, lead, outro, close; 2026's line) */
export function pauseWords(era: EraId): Record<string, string> {
  return PAUSE[era] as unknown as Record<string, string>;
}

