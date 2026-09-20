/**
 * ⚑ THE MAP — where you are, what has happened, what is next (S145, 2026-09-16).
 *
 * docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §3A. The piece has a
 * conductor (`narrative/spine.ts`) that knows which beat it is waiting on, and
 * a ledger that knows what has been done — but nothing that tells the PLAYER
 * either. This is the frame's view over both: `data/strings/map.json` names the
 * beats per era in the order the spine walks them, each with a condition key
 * for "done" and a plain hint for "do this"; this file resolves the keys
 * against the ledger and the OS (the guide's own pattern: conditions in code,
 * content in data) and returns each era's beats as done / current / ahead.
 *
 * Read by: the game menu's *Where you are* (the map) and the idle helper (one
 * line: the current beat's hint). Both are FRAME voice — the map explains,
 * which the frame may do because the frame never plays. Nothing here files.
 *
 * Pure: derives, never writes. Era = the desktop era the OS is in, or the
 * Close once the final restart is on the ledger.
 */
import { ledger } from '../state/ledger';
import type { DesktopOS } from '../desktop/os';
import mapData from '../../data/strings/map.json';
import { entriesByEra, practiceOf, type RecordEra, type Practice } from './record';
import queue from '../../data/dialog/s3_queue.json';

export interface MapBeat {
  id: string;
  label: string;
  done: string;
  hint: string;
  where?: string;
  optional?: boolean;
  quiet?: boolean;
}
export interface MapEra { id: RecordEra; label: string; beats: MapBeat[] }
export type BeatState = 'done' | 'current' | 'ahead';

export interface MapEraState {
  id: RecordEra | 'close';
  label: string;
  here: boolean;
  beats: { beat: MapBeat; state: BeatState }[];
  /** the practices the record shows for this era, in the order met, once each */
  soFar: Practice[];
  entries: number;
}
export interface MapState {
  eras: MapEraState[];
  /** the beat the piece is waiting on, or null in the Close / when all is done */
  current: { era: RecordEra | 'close'; beat: MapBeat } | null;
  /** the helper must stay silent: a felt / respite / Close beat is live */
  quiet: boolean;
}

const M = mapData as unknown as {
  closeLabel: string; closeHint: string;
  eras: MapEra[];
};
const RECORD_VIEWED_LINE = (queue as unknown as { record: { witness: string } }).record.witness;

type Condition = (os: DesktopOS) => boolean;
const has = (id: string): boolean => ledger.records.includes(id);
const updatedTo = (n: number): boolean => ledger.updates.some((u) => u.toEra === n);

/** the condition registry. An unknown key is never true, so data may name a
 *  condition ahead of the code that makes it fire — and a beat whose key is
 *  misspelt stays "current" forever, which a walk of the map will show. */
const CONDITIONS: Record<string, Condition> = {
  // ── 1997 ──
  profileFiled: () => has('profile-initialized'),
  kitInserted: () => has('kit-inserted'),
  // S151 — the Un-Walk's steps
  kitRead: () => has('kit-read'),
  prayerSaid: () => has('prayer-said') || has('prayer-cut'),
  wentOnline: () => has('went-online'),
  formDone: () => ledger.provotypes.some((p) => p.id === 'origin_intake_e1'),
  pillowDone: () => ledger.provotypes.some((p) => p.id === 'pillow'),
  rootCauseOpened: () => has('rootcause-opened'),
  spokeInChannel: () => ledger.records.some((r) => r.startsWith('channel-reply:')),
  wallSeen: () => has('ministry-index-card'),
  dmAccepted: () => ledger.records.some((r) => r.startsWith('dm-request:')),
  repliedToContact: () => ledger.records.some((r) => r.startsWith('escalation-reply:')),
  packetAcked: () => has('enrollment-acknowledged'),
  diaryDone: () => has('diary-glitch'),
  updatedTo2: () => updatedTo(2),
  // ── 2003 ──
  assistantMet: () => ledger.lamby.some((l) => l.id === 'first-greeting' || l.id === 'introduction'),
  checkinDone: () => ledger.checkins.some((c) => !c.id.startsWith('e3')),
  sendResolved: () => ledger.sends.some((s) => s.outcome === 'visited' || s.outcome === 'declined'),
  contactOpened: () => ledger.caleb.some((c) => c.id === 'opened'),
  threadCommitted: () => ledger.caleb.some((c) => c.outcome === 'committed' || c.outcome === 'held'),
  restoreDone: () => ledger.caleb.some((c) => c.id === 'restore'),
  residueFiled: () => ledger.caleb.some((c) => c.outcome === 'residue'),
  updatedTo3: () => updatedTo(3),
  // ── 2016 ──
  migrated: () => has('subject-migrated'),
  signedIn: () => has('e3-signed-in') || ledger.lamby.some((l) => l.id === 'e3_lambient_consent'),
  consentAnswered: () => ledger.lamby.some((l) => l.id === 'e3_lambient_consent'),
  correctionsStarted: () => ledger.graceQueue.length >= 1,
  // S158 / R3-82 — 2016's beats as the flow of record has them: one job to its end, the vote
  oneJobDone: () => has('e3-job-done'),
  allJobsDone: () => has('e3-day-done'),
  voted: () => ledger.checkins.some((c) => c.id === 'e3_malta_voted'),
  recordViewed: () => ledger.era3Arrival.some((a) => a.witness === RECORD_VIEWED_LINE),
  phoneAnswered: () => ledger.checkins.some((c) => c.id.startsWith('e3_malta_')),
  cascadeSeen: () => ledger.checkins.some((c) => c.id === 'e3_cascade'),
  updatedTo4: () => updatedTo(4),
  // ── 2026 ──
  saverPressed: () => ledger.e4Space.some((e) => e.id === 'saver') || ledger.e4Space.some((e) => e.id === 'program'),
  browserOpen: (os) => os.e4?.browser.isOpen === true || ledger.e4Space.some((e) => e.id === 'program'),
  resultsSeen: (os) => ['results', 'site', 'agent', 'program'].includes(os.e4?.browser.programMode ?? '') || ledger.e4Space.some((e) => e.id === 'program'),
  programBegun: () => ledger.e4Space.some((e) => e.id === 'program'),
  stepsDone: () => ledger.e4Space.some((e) => e.id === 'step:search'),
  headsetWorn: () => ledger.e4Space.some((e) => e.id === 'headset'),
  commonsJoined: () => ledger.e4Space.some((e) => e.id === 'commons'),
  terminated: () => ledger.e4Space.some((e) => e.id === 'laptop'),
  closed: () => updatedTo(0)
};

function cond(key: string, os: DesktopOS): boolean {
  const fn = CONDITIONS[key];
  return fn ? fn(os) : false;
}

/** which era the player is in, for the map: the OS's desktop era, unless the
 *  final restart is on the ledger (the Close has no desktop era) */
export function mapEraNow(os: DesktopOS): RecordEra | 'close' {
  if (updatedTo(0)) return 'close';
  return os.era;
}

const ORDER: (RecordEra | 'close')[] = ['e1', 'e2', 'e3', 'e4', 'close'];

export function mapState(os: DesktopOS): MapState {
  const now = mapEraNow(os);
  const nowIdx = ORDER.indexOf(now);
  const by = entriesByEra();
  let current: MapState['current'] = null;
  let quiet = now === 'close';
  const eras: MapEraState[] = M.eras.map((era) => {
    const eraIdx = ORDER.indexOf(era.id);
    const here = era.id === now;
    let currentFound = false;
    // ⚑ a beat the piece has moved PAST reads as done, whatever its own condition
    //   says: the map is a map of where you are, not an audit. (A review jump
    //   into 2016 never files the migration; the first tour showed it as the
    //   current beat under three ticked ones.)
    const doneFlags = era.beats.map((beat) => cond(beat.done, os));
    // ⚑ S151 — only a MAIN beat moves the line: a ○ sandbox beat done early (the
    //   racket, listed after the diary) must not read the whole era as past
    const lastDone = doneFlags.reduce((last, d, i) => (d && !era.beats[i].optional ? i : last), -1);
    const beats = era.beats.map((beat, idx) => {
      const done = doneFlags[idx] || idx < lastDone;
      let state: BeatState;
      if (done) state = 'done';
      else if (eraIdx < nowIdx) state = 'done';           // an era left behind is over, whatever was skipped
      else if (here && !currentFound && !beat.optional) { state = 'current'; currentFound = true; }
      else state = 'ahead';
      if (state === 'current') { current = { era: era.id, beat }; if (beat.quiet) quiet = true; }
      return { beat, state };
    });
    const seen = new Set<string>();
    const soFar: Practice[] = [];
    for (const e of by[era.id]) {
      if (seen.has(e.kind)) continue;
      seen.add(e.kind);
      const p = practiceOf(e.kind);
      if (p) soFar.push(p);
    }
    return { id: era.id, label: era.label, here, beats, soFar, entries: by[era.id].length };
  });
  eras.push({
    id: 'close', label: M.closeLabel, here: now === 'close',
    beats: [{ beat: { id: 'close', label: M.closeLabel, done: 'closed', hint: M.closeHint, quiet: true }, state: now === 'close' ? 'current' : 'ahead' }],
    soFar: [], entries: 0
  });
  return { eras, current, quiet };
}

/** the helper's one line: the current beat's hint, or nothing */
export function nextHint(os: DesktopOS): { text: string; where?: string; quiet: boolean; key: string } | null {
  const s = mapState(os);
  if (!s.current) return null;
  return { text: s.current.beat.hint, where: s.current.beat.where, quiet: s.quiet, key: `${s.current.era}:${s.current.beat.id}` };
}
