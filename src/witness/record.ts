/**
 * ⚑ THE RECORD — one file, read as one thing (S144, 2026-09-15).
 *
 * docs/reinterp/THE_RECORD_PLAN_2026-09-15.md §3A. The ledger (`state/ledger.ts`)
 * is twenty lists, one per surface, each filing a cold `witness` line; the
 * piece files everything and shows almost none of it. This is the single view
 * over all of it: every entry with the ERA it was filed in, the KIND of thing
 * it was, what you did, what the apparatus filed, and the PRACTICE it belongs
 * to (`data/dossier/practices.json` — status and a source pointer).
 *
 * Read by: the Dossier's "Your file" view in the game menu (the reading), the
 * E3 platform's *Your record* and E4's *Legacy file* (two of the four faces),
 * the Close's panels (your own lines), and the witness pulse (a count).
 *
 * Pure: derives, never writes. Era is a fact about which list the entry lives
 * in — the ledger never records when the room around the panel changed, and
 * this is the honest mapping from surface to decade.
 */
import { ledger, type Ledger } from '../state/ledger';
import practicesData from '../../data/dossier/practices.json';
import slice from '../../data/strings/slice.json';
import opening from '../../data/strings/opening.json';
import rigCopy from '../../data/strings/lamby_rig.json';
import recommend from '../../data/dialog/s3_recommend.json';

export type RecordEra = 'e1' | 'e2' | 'e3' | 'e4';
export type Status = 'documentary' | 'contested' | 'speculative';

export interface Practice {
  title: string;
  did: string;
  status: Status;
  source: { file: string; index: number } | null;
}

export interface RecordEntry {
  era: RecordEra;
  /** the practice key in practices.json */
  kind: string;
  /** the ledger's own id for the act */
  id: string;
  /** what the player did, in one or two words the ledger already uses */
  outcome: string;
  /** the cold line the apparatus filed */
  witness: string;
  /** a flagged entry is one the apparatus marked — refusal, distress, non-compliance */
  flagged: boolean;
}

const PRACTICES = (practicesData as { practices: Record<string, Practice> }).practices;

export function practiceOf(kind: string): Practice | undefined { return PRACTICES[kind]; }

/** the era-1 `records` strings are free-form; this reads the act out of the id */
function recordKind(id: string): { kind: string; outcome: string; flagged: boolean } {
  if (id === 'profile-initialized') return { kind: 'profile', outcome: 'answered', flagged: false };
  if (id === 'kit-inserted') return { kind: 'kit', outcome: 'inserted', flagged: false };
  if (id === 'kit-read') return { kind: 'kit', outcome: 'read', flagged: false };
  if (id === 'prayer-said') return { kind: 'tapes', outcome: 'prayed', flagged: false };
  if (id === 'prayer-cut') return { kind: 'tapes', outcome: 'cut short', flagged: true };
  if (id === 'pledge-signed') return { kind: 'pledge', outcome: 'signed', flagged: false };
  if (id === 'pledge-declined') return { kind: 'pledge', outcome: 'set aside', flagged: true };
  if (id === 'rob-spoke-mother') return { kind: 'referral', outcome: 'parent contacted', flagged: false };
  if (id.startsWith('dm-request:')) return { kind: 'referral', outcome: 'accepted', flagged: false };
  if (id === 'went-online') return { kind: 'channel', outcome: 'online', flagged: false };
  if (id === 'channel-joined' || id === 'mirc-log') return { kind: 'channel', outcome: 'joined', flagged: false };
  // S190 — the search that found the network
  if (id === 'search-1997') return { kind: 'referral', outcome: 'searched', flagged: false };
  // S191 — 2003's forum: recommended, its rules agreed, a post held for approval
  if (id === 'forum-recommended') return { kind: 'recommendation', outcome: 'recommended', flagged: false };   // S195
  if (id === 'forum-rules') return { kind: 'channel', outcome: 'agreed', flagged: false };
  if (id === 'forum-posted') return { kind: 'channel', outcome: 'posted', flagged: false };
  if (id === 'forum-applied') return { kind: 'placement', outcome: 'applied', flagged: false };   // S199
  // S205 — 2003's testimony: his story prepared, released, filmed, cut and published (s2_testimony.json)
  if (id.startsWith('testimony-')) return { kind: 'testimony', outcome: id.slice('testimony-'.length), flagged: id === 'testimony-online' };
  if (id.startsWith('channel-reply:')) return { kind: 'channel', outcome: 'spoke', flagged: false };
  if (id.startsWith('escalation-reply:')) {
    const w = id.slice('escalation-reply:'.length);
    return { kind: 'referral', outcome: 'replied', flagged: /resist|boundary|don't|refus/i.test(w) };
  }
  if (id === 'ministry-index-card') return { kind: 'referral', outcome: 'witnessed', flagged: false };
  // S186 — the image Rob sent over DCC: the advertising, delivered by the friend
  if (id === 'yes-received') return { kind: 'referral', outcome: 'accepted', flagged: false };
  if (id === 'enrollment-acknowledged') return { kind: 'placement', outcome: 'acknowledged', flagged: false };
  if (id.startsWith('diary')) return { kind: 'diary', outcome: id === 'diary-glitch' ? 'kept' : 'written', flagged: id === 'diary-glitch' };
  if (id === 'deletion-failed') return { kind: 'diary', outcome: 'refused deletion', flagged: true };
  if (id === 'tape-played') return { kind: 'tapes', outcome: 'played', flagged: false };
  if (id === 'subject-migrated') return { kind: 'arrival', outcome: 'migrated', flagged: false };
  if (id === 'lamby-rig-opened') return { kind: 'assistant', outcome: 'opened', flagged: false };
  // S153 — the game on the disk: opened, and its two endings
  if (id === 'rootcause-installed') return { kind: 'kit', outcome: 'installed', flagged: false };
  if (id === 'rootcause-opened') return { kind: 'kit', outcome: 'opened', flagged: false };
  if (id === 'harbor-partner') return { kind: 'channel', outcome: 'matched', flagged: false };   // S209 / B22
  if (id === 'harbor-parents') return { kind: 'contact', outcome: 'read', flagged: false };   // S357e — the house rules
  if (id.startsWith('rootcause-memory:')) return { kind: 'kit', outcome: 'uncovered', flagged: true };
  if (id.startsWith('rootcause-report:')) return { kind: 'kit', outcome: 'reported', flagged: false };
  if (id.startsWith('rootcause-kept:')) return { kind: 'kit', outcome: 'kept', flagged: true };   // S215: the honest answer, scored as deflection
  return { kind: 'provotype', outcome: 'filed', flagged: false };
}

/** the witness line for an era-1 `records` id — the ledger stores only the id */
const RECORD_LINES = (slice as unknown as { witness: { recordLines: Record<string, string> } }).witness.recordLines;
function recordWitness(id: string): string {
  if (id === 'profile-initialized') return (opening as unknown as { witness_profile_init: string }).witness_profile_init;
  const i = id.indexOf(':');
  if (i > 0) return id.slice(i + 1);
  return RECORD_LINES[id] ?? id.replace(/-/g, ' ');
}

/** ⚑ S267 — ids `ledger.records` holds for the map (src/witness/map.ts), never meant for Your file */
const MAP_BEATS = new Set(['e3-signed-in', 'e3-job-done', 'e3-two-jobs', 'e3-day-done']);
/** ⚑ S405 (UiB job 31, T94) — and 2016's job marks (graceQueueLite.ts updateConnections: `e3-job:<id>` as each job is
 *  finished, `e3-jobs-done` when all are): progress marks for the map and the day (map.ts, phoneE3.ts, app.ts read them),
 *  not filings. Each job files its own entry (the testimony: graceQueue + era3Jobs 'pipeline'; the places list: era3Jobs
 *  'places'; the mothers: their check-ins below; the group: era3Jobs 'group'), so the marks belong in no file. Until S405
 *  they fell through recordKind() into 1997's file as "The exercise", with the bare word after the colon as their line. */
/** ⚑ S426c — and the memory card's Not now (S425, graceQueueLite: `e3-memory-notnow`, the dismissal's log): a mark of
 *  the day, not a filing. Until S426c it fell through recordKind() into Daniel's 1997 file as a stray entry. */
const isMapMark = (id: string): boolean => MAP_BEATS.has(id) || id.startsWith('e3-job:') || id === 'e3-jobs-done' || id === 'e3-memory-notnow';

/** ⚑ S405 (UiB job 31, T94) — the mothers' messages ("Answer the mothers", familyCalls.ts) are Vera's job in 2016. They
 *  file into `ledger.checkins` (the list the record reads as attention paid to a message), and every 2003 reader of that
 *  list (the pocket pet's mood, checkinDone, Restorify) skips ids that start with `e3`, so their ids carry this prefix.
 *  Until S405 they were filed bare (`p_maureen`), so Daniel's 2003 file said he had opened Maureen's message. */
export const FAMILY_CHECKIN = 'e3-family:';
export const familyCheckinId = (parentId: string): string => FAMILY_CHECKIN + parentId;

const FLAG_OUTCOMES = new Set(['abandoned', 'declined', 'dismissed', 'skipped', 'stood', 'held', 'committed', 'stoppedMidway', 'kept']);

/** a 2016 job's place in Vera's file: the card (a key of practices.json), the word for what happened, flagged or not */
export interface Era3Card { kind: string; outcome: string; flagged: boolean }
/**
 * ⚑ S427 (UiB job 37, T95; his 26 Nov to the sheet: "yes i agree. Yes I think the refusals should be marked too") — 2016'S
 * JOBS, EACH UNDER ITS OWN CARD. Until S427 every `ledger.era3Jobs` entry but the residue filed under The recommendation,
 * outcome `tagged`, whatever she did, and her refusals were not flagged (docs/reinterp/T95_2016_RECORD_SHEET_2026-11-25.md).
 * ONE table from the entry to its card and the word for what happened (his picks, row by row). A refusal goes under the card
 * of the job she refused (`refuse(what, job)` keeps the job on the entry), as `refused`, FLAGGED: also when Lambient or an
 * administrator then did the job anyway — the file keeps what she did, and the witness line already says who finished it.
 * "Flagged" is what it is for Daniel: the flag colour, first on the Close's panels, counted in "… flagged", on the receipt.
 * The witness lines are the jobs' own, word for word.
 */
export const ERA3_JOB_CARD: Record<string, Era3Card> = {
  pipeline: { kind: 'testimony', outcome: 'sent', flagged: false },                       // graceQueueLite: the corrected testimony, sent
  places: { kind: 'places', outcome: 'added', flagged: false },                           // placesList: The Wick added
  group: { kind: 'checkin', outcome: 'posted', flagged: false },                          // groupTask: the week's check-in (The daily check-in)
  kit: { kind: 'testimony', outcome: 'approved', flagged: false },                        // graceQueueLite: by her, or by an administrator when she leaves it
  'take-down': { kind: 'testimony', outcome: 'take-down requested', flagged: false },     // graceQueueLite: the story kept even so
  recommend: { kind: 'recommendation', outcome: 'tagged', flagged: false },               // recommendTask: the one this card describes
  'recommend:declined': { kind: 'recommendation', outcome: 'declined', flagged: true },  // recommendTask: "video left untagged"
  'refusal:places': { kind: 'places', outcome: 'refused', flagged: true },                // lambientDesk refuse(), from placesList
  'refusal:group': { kind: 'checkin', outcome: 'refused', flagged: true },                // … from groupTask
  'refusal:family': { kind: 'moderation', outcome: 'refused', flagged: true },            // … from familyCalls (a mother's message)
  'refusal:list': { kind: 'queue', outcome: 'refused', flagged: true },                   // … from graceQueueLite (a correction-list item)
  residue: { kind: 'queue', outcome: 'residue', flagged: false }                          // phoneE3: her newest note (S404)
};
const RECOMMEND_DECLINED = (recommend as { witness: { declined: string } }).witness.declined;
/** the table's row for one `era3Jobs` entry (the declined video is recommendTask's own line, as recommendTask finds it) */
export function era3JobRow(j: { id: string; witness: string; job?: string }): string {
  if (j.id === 'refusal') return `refusal:${j.job ?? ''}`;
  if (j.id === 'recommend' && j.witness === RECOMMEND_DECLINED) return 'recommend:declined';
  return j.id;
}
/** an entry the table does not name stays where every 2016 job was before S427, saying only that it was filed */
export function era3JobCard(j: { id: string; witness: string; job?: string }): Era3Card {
  return ERA3_JOB_CARD[era3JobRow(j)]
    ?? { kind: 'recommendation', outcome: j.id === 'refusal' ? 'refused' : 'filed', flagged: j.id === 'refusal' };
}

export function recordEntries(): RecordEntry[] {
  const out: RecordEntry[] = [];
  const push = (era: RecordEra, kind: string, id: string, outcome: string, witness: string, flagged?: boolean): void => {
    out.push({ era, kind, id, outcome, witness, flagged: flagged ?? FLAG_OUTCOMES.has(outcome) });
  };
  // ── 1997 ──
  for (const r of ledger.records) {
    if (isMapMark(r)) continue;   // S267 / S405: the map's own progress marks, not filings (2016's jobs file themselves)
    const k = recordKind(r);
    push(r.startsWith('forum-') || r.startsWith('testimony-') || r === 'harbor-partner' || r === 'harbor-parents' ? 'e2' : 'e1', k.kind, r, k.outcome, recordWitness(r), k.flagged);   // S191: 2003's forum files in 2003 (S205: and its testimony)
  }
  for (const p of ledger.provotypes) push(p.id === 'pillow' ? 'e1' : 'e1', 'provotype', p.id, p.outcome, p.witness);
  // S189 — the games: each in the era it was played, as The exercise (a task that could only end one way)
  for (const g of ledger.games) push(g.era, 'provotype', g.id, 'played', g.witness, false);
  for (const s of ledger.sends) push('e1', 'referral', s.id, s.outcome, s.witness);
  for (const g of ledger.guidance) push('e1', 'assistant', g.id, g.outcome, g.witness);
  for (const t of ledger.tapes) push('e1', 'tapes', t.id, t.outcome, t.witness);
  // ── 2003 ──
  for (const b of ledger.belongings) push('e2', 'belongings', b.id, b.outcome, b.witness);
  for (const l of ledger.lamby) push(l.id.startsWith('e3') ? 'e3' : 'e2', 'assistant', l.id, l.outcome, l.witness);   // Lambient's consent files here too
  for (const c of ledger.checkins) {
    if (c.id.startsWith(FAMILY_CHECKIN)) continue;   // S405: the mothers are 2016's (filed below, under Moderation)
    push(c.id.startsWith('e3') ? 'e3' : 'e2', c.id.startsWith('e3') ? 'contact' : 'checkin', c.id, 'answered', c.witness, false);
  }
  if (ledger.guidePersonalisation.personalised) push('e2', 'assistant', 'guide-personalised', 'personalised', rigCopy.personalise.record, false);
  for (const m of ledger.media) push('e2', 'media', m.id, m.outcome, m.witness);
  for (const cb of ledger.caleb) push('e2', 'contact', cb.id, cb.outcome, cb.witness);
  // ── 2016 ──
  for (const a of ledger.era3Arrival) push('e3', 'arrival', 'arrival', 'migrated', a.witness, false);
  for (const g of ledger.graceQueue) push('e3', 'queue', `card ${g.cardId}`, g.outcome, g.witness);
  for (const c of ledger.comments) push('e3', 'moderation', c.commentId, c.follow ? 'followed' : 'own words', c.witness, !c.follow);
  // ⚑ S405 (T94) — the mothers' messages, opened and answered: Moderation ("had you answer families in the platform's voice",
  //   documentary, e3_theday #8), the card that describes this job; the witness lines are familyCalls' own, word for word
  for (const c of ledger.checkins) if (c.id.startsWith(FAMILY_CHECKIN)) push('e3', 'moderation', c.id, 'answered', c.witness, false);
  // ⚑ S427 (T95) — her jobs, each under its own card (ERA3_JOB_CARD). Until S427: all but the residue under The
  //   recommendation (S195), outcome 'tagged'. (S404: her newest note, the residue, under The correction queue — the practice
  //   whose rule gave her the word she refuses, as Daniel's sits under his messenger's — is the table's last row.)
  for (const j of ledger.era3Jobs) {
    const c = era3JobCard(j);
    push('e3', c.kind, j.id, c.outcome, j.witness, c.flagged);
  }
  // ── 2026 ──
  for (const e of ledger.e4Space) {
    // ⚑ S321 — 2026 v3's filings: the new you and the photograph are `photos`; the clinic's number is `record`; the
    //   muting on advice and Junie unmuted are `care` (the system acting on her contacts); the rest are the session
    const kind = e.id === 'newyou' || e.id === 'v3:keep' ? 'photos'
      : e.id === 'v3:clinic' ? 'record'
        : e.id === 'v3:mute' || e.id === 'v3:junie' ? 'care'
          : e.id === 'update' || e.id === 'companion' ? 'update'
      : e.id === 'record' || e.id === 'step:record' || e.id === 'legacy' || e.id === 'conv:back' ? 'record'
        : e.id === 'step:photos' || e.id === 'photos' || e.id === 'conv:see' || e.id === 'conv:composite' || e.id === 'reversal' ? 'photos'
          : e.id === 'step:care' || e.id.startsWith('care') || e.id === 'turn:care' || e.id === 'conv:care' ? 'care'   // S160 / R3-94: the care assignment has its own practice and source
          : e.id === 'program' || e.id === 'session' || e.id === 'saver' || e.id.startsWith('step:') || e.id.startsWith('tab:') || e.id.startsWith('turn:') ? 'session'
            : e.id === 'headset' || e.id === 'commons' || e.id === 'turn' ? 'headset'
              : e.id === 'host' ? 'host'   // ⚑ S356 — Shepherd Live™, the AI host (practices.json `host`, speculative)
              : e.id === 'laptop' ? 'termination' : 'session';
    push('e4', kind, e.id, e.outcome, e.witness);
  }
  // ── the updates, filed in the era they LEAVE ──
  ledger.updates.forEach((u, i) => {
    const era: RecordEra = u.toEra === 2 ? 'e1' : u.toEra === 3 ? 'e2' : u.toEra === 4 ? 'e3' : 'e4';
    const w = u.toEra === 0 ? 'the final restart' : `update to era ${u.toEra} — remind later ×${u.remindLaterCount}, terms read ${u.eulaScrollPct}%`;
    push(era, 'update', `update-${i}`, u.remindLaterCount ? 'deferred once' : 'accepted', w, false);
  });
  return out.filter((entry) => ledger.reachedEras.includes(entry.era));
}

export function entriesByEra(): Record<RecordEra, RecordEntry[]> {
  const by: Record<RecordEra, RecordEntry[]> = { e1: [], e2: [], e3: [], e4: [] };
  for (const e of recordEntries()) by[e.era].push(e);
  return by;
}

/**
 * ⚑ S427 (UiB job 37, T95) — THE COUNT IS THE FILE'S. Until S427 `recordCount()` was the ledger's lists added whole, so the
 * map's own marks in `ledger.records` (isMapMark) and `ledger.tags` pushed the number above the entries the file lists.
 * `ledger.tags` are mechanical classification tags, not entries: the opening profile's picks (`profile:…`, os.ts), each
 * send's `send:<id>:<outcome>` and its extra tags (sends.ts), the IRC's `pastoral-referral` / `consent-on-file` (irc.ts) and a
 * finished provotype's `ledgerTags`; read only by the old build's wall (intake.ts, not in the visit), listed in no file. Each
 * goes with an act that files its own entry, so they do not count. Now the count is `recordEntries().length`, per era too.
 *
 * Read every frame (the pulse, app.ts; each era's file item, fileItem.ts), so it is DERIVED ONLY WHEN THE LEDGER MOVED: the
 * check per frame is the same sum of list lengths the old count was (the lists `recordEntries()` reads), the eras reached,
 * the personalisation and the ledger itself (a Restart replaces it), compared with the last derivation's. A swap that keeps
 * every length (recommendTask's "left untagged" replaced by "tagged") keeps every count too.
 */
let seen: { ledger: Ledger | null; size: number; reached: number; personal: boolean } = { ledger: null, size: -1, reached: -1, personal: false };
let counts: Record<RecordEra, number> & { all: number } = { e1: 0, e2: 0, e3: 0, e4: 0, all: 0 };
function fileCounts(): Record<RecordEra, number> & { all: number } {
  const L = ledger;
  const size = L.records.length + L.provotypes.length + L.games.length + L.sends.length + L.guidance.length + L.tapes.length
    + L.belongings.length + L.lamby.length + L.checkins.length + L.media.length + L.caleb.length + L.era3Arrival.length
    + L.graceQueue.length + L.comments.length + L.era3Jobs.length + L.e4Space.length + L.updates.length;
  const reached = L.reachedEras.length, personal = L.guidePersonalisation.personalised;
  if (L !== seen.ledger || size !== seen.size || reached !== seen.reached || personal !== seen.personal) {
    seen = { ledger: L, size, reached, personal };
    const by = entriesByEra();
    counts = { e1: by.e1.length, e2: by.e2.length, e3: by.e3.length, e4: by.e4.length, all: 0 };
    counts.all = counts.e1 + counts.e2 + counts.e3 + counts.e4;
  }
  return counts;
}

/** how many entries the file holds (`recordEntries().length`) — the witness pulse watches this grow */
export function recordCount(): number { return fileCounts().all; }
/** how many entries one era's file holds (`entriesByEra()[era].length`), as cheaply */
export function recordCountFor(era: RecordEra): number { return fileCounts()[era]; }
