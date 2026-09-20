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
import { ledger } from '../state/ledger';
import practicesData from '../../data/dossier/practices.json';
import slice from '../../data/strings/slice.json';
import opening from '../../data/strings/opening.json';

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
  if (id === 'rob-spoke-mother') return { kind: 'referral', outcome: 'parent contacted', flagged: false };
  if (id.startsWith('dm-request:')) return { kind: 'referral', outcome: 'accepted', flagged: false };
  if (id === 'went-online' || id === 'mirc-log') return { kind: 'channel', outcome: 'joined', flagged: false };
  if (id.startsWith('channel-reply:')) return { kind: 'channel', outcome: 'spoke', flagged: false };
  if (id.startsWith('escalation-reply:')) {
    const w = id.slice('escalation-reply:'.length);
    return { kind: 'referral', outcome: 'replied', flagged: /resist|boundary|don't|refus/i.test(w) };
  }
  if (id === 'ministry-index-card') return { kind: 'referral', outcome: 'witnessed', flagged: false };
  if (id === 'enrollment-acknowledged') return { kind: 'placement', outcome: 'acknowledged', flagged: false };
  if (id.startsWith('diary')) return { kind: 'diary', outcome: id === 'diary-glitch' ? 'kept' : 'written', flagged: id === 'diary-glitch' };
  if (id === 'deletion-failed') return { kind: 'diary', outcome: 'refused deletion', flagged: true };
  if (id === 'tape-played') return { kind: 'tapes', outcome: 'played', flagged: false };
  if (id === 'subject-migrated') return { kind: 'arrival', outcome: 'migrated', flagged: false };
  if (id === 'lamby-rig-opened') return { kind: 'assistant', outcome: 'opened', flagged: false };
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

const FLAG_OUTCOMES = new Set(['abandoned', 'declined', 'dismissed', 'skipped', 'stood', 'held', 'committed', 'stoppedMidway', 'kept']);

export function recordEntries(): RecordEntry[] {
  const out: RecordEntry[] = [];
  const push = (era: RecordEra, kind: string, id: string, outcome: string, witness: string, flagged?: boolean): void => {
    out.push({ era, kind, id, outcome, witness, flagged: flagged ?? FLAG_OUTCOMES.has(outcome) });
  };
  // ── 1997 ──
  for (const r of ledger.records) {
    const k = recordKind(r);
    push('e1', k.kind, r, k.outcome, recordWitness(r), k.flagged);
  }
  for (const p of ledger.provotypes) push(p.id === 'pillow' ? 'e1' : 'e1', 'provotype', p.id, p.outcome, p.witness);
  for (const s of ledger.sends) push('e1', 'referral', s.id, s.outcome, s.witness);
  for (const g of ledger.guidance) push('e1', 'assistant', g.id, g.outcome, g.witness);
  for (const t of ledger.tapes) push('e1', 'tapes', t.id, t.outcome, t.witness);
  // ── 2003 ──
  for (const b of ledger.belongings) push('e2', 'belongings', b.id, b.outcome, b.witness);
  for (const l of ledger.lamby) push(l.id.startsWith('e3') ? 'e3' : 'e2', 'assistant', l.id, l.outcome, l.witness);   // Lambient's consent files here too
  for (const c of ledger.checkins) push(c.id.startsWith('e3') ? 'e3' : 'e2', c.id.startsWith('e3') ? 'contact' : 'checkin', c.id, 'answered', c.witness, false);
  for (const m of ledger.media) push('e2', 'media', m.id, m.outcome, m.witness);
  for (const cb of ledger.caleb) push('e2', 'contact', cb.id, cb.outcome, cb.witness);
  // ── 2016 ──
  for (const a of ledger.era3Arrival) push('e3', 'arrival', 'arrival', 'migrated', a.witness, false);
  for (const g of ledger.graceQueue) push('e3', 'queue', `card ${g.cardId}`, g.outcome, g.witness);
  for (const c of ledger.comments) push('e3', 'moderation', c.commentId, c.follow ? 'followed' : 'own words', c.witness, !c.follow);
  // ── 2026 ──
  for (const e of ledger.e4Space) {
    const kind = e.id === 'update' || e.id === 'companion' ? 'update'
      : e.id === 'record' || e.id === 'step:record' || e.id === 'legacy' ? 'record'
        : e.id === 'step:photos' || e.id === 'photos' ? 'photos'
          : e.id === 'program' || e.id === 'session' || e.id.startsWith('step:') || e.id.startsWith('tab:') || e.id.startsWith('care') ? 'session'
            : e.id === 'headset' || e.id === 'commons' || e.id === 'turn' ? 'headset'
              : e.id === 'laptop' ? 'termination' : 'session';
    push('e4', kind, e.id, e.outcome, e.witness);
  }
  // ── the updates, filed in the era they LEAVE ──
  ledger.updates.forEach((u, i) => {
    const era: RecordEra = u.toEra === 2 ? 'e1' : u.toEra === 3 ? 'e2' : u.toEra === 4 ? 'e3' : 'e4';
    const w = u.toEra === 0 ? 'the final restart' : `update to era ${u.toEra} — remind later ×${u.remindLaterCount}, terms read ${u.eulaScrollPct}%`;
    push(era, 'update', `update-${i}`, u.remindLaterCount ? 'deferred once' : 'accepted', w, false);
  });
  return out;
}

export function entriesByEra(): Record<RecordEra, RecordEntry[]> {
  const by: Record<RecordEra, RecordEntry[]> = { e1: [], e2: [], e3: [], e4: [] };
  for (const e of recordEntries()) by[e.era].push(e);
  return by;
}

/** how many entries the file holds — the witness pulse watches this grow */
export function recordCount(): number {
  return ledger.records.length + ledger.provotypes.length + ledger.sends.length + ledger.guidance.length
    + ledger.tapes.length + ledger.belongings.length + ledger.lamby.length + ledger.checkins.length
    + ledger.media.length + ledger.caleb.length + ledger.era3Arrival.length + ledger.graceQueue.length
    + ledger.comments.length + ledger.e4Space.length + ledger.updates.length + ledger.tags.length;
}
