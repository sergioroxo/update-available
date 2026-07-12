/**
 * The data-point ledger — the single in-memory state object the whole piece
 * follows (PRODUCTION_SCRIPT_v0.2 Part I). INVARIANTS (enforced by
 * tools/check-invariants.mjs + CI):
 *   - lives in memory ONLY: never persisted, never transmitted
 *   - wiped on exit, idle reset, and refusal-path endings
 */
export interface Ledger {
  name: string; // typed at boot; display only
  tags: string[];
  records: string[];
  flips: number;
  dossier: string[];
  session: { path: 'short' | 'full'; switched: boolean };
  assistant: {
    dismissals: number;
    acceptedSuggestions: string[];
    ignored: string[];
    nightSessions: number;
  };
  updates: { toEra: number; remindLaterCount: number; eulaScrollPct: number }[];
  respite: { streamOpenSeconds: number; songsPlayed: string[] };
  /**
   * Reinterpretation provotypes filed this session (reinterp build only).
   * Both completed and abandoned are recorded — abandonment is not invisible.
   * `witness` is the cold-side line, resolved from the provotype's own data so
   * display text stays in data/ (CLAUDE.md). In-memory only, like everything here.
   */
  provotypes: { id: string; outcome: 'completed' | 'abandoned'; witness: string; reps?: number }[];
  /**
   * Cross-cluster sends filed this session (reinterp build only; master
   * script §4). Symmetric by law (Ethics #10): offered, visited, AND declined
   * all file — declining is never invisible. `witness` is the cold-side line,
   * resolved from data/sends.json, never composed in TS. In-memory only.
   */
  sends: { id: string; outcome: 'offered' | 'visited' | 'declined'; witness: string }[];
  /**
   * Era-1 side-message guidance responses (reinterp build only; R28-2a,
   * witness symmetry per ERA_MINING FIND #4). Followed AND declined both
   * file — ignoring guidance is never invisible. `witness` is the cold-side
   * line, resolved from data/dialog/s1_guide.json at file time, never
   * composed in TS. In-memory only, like everything here.
   */
  guidance: { id: string; outcome: 'followed' | 'declined'; witness: string }[];
  /**
   * Era-1 tape outcomes (reinterp build only; R28-2b). Witness symmetry per
   * ERA_MINING FIND #4 IS NOT uniform here by design: Tapes A/B file
   * played-through/stopped-midway (never-touched files nothing — unplayed
   * media gets no response, same doctrine as guidance); Tape C (Daniel's own
   * mixtape) NEVER appears in this array under any outcome — its meaning is
   * that the system ignores it (R28-2 spec §3/§6, ambient-presence law),
   * enforced in src/narrative/tapes.ts, not just by convention here.
   * `witness` resolved from data/dialog/s1_tapes.json at file time. In-memory
   * only, like everything here.
   */
  tapes: { id: string; outcome: 'playedThrough' | 'stoppedMidway'; witness: string }[];
  /**
   * The belongings beat (reinterp build only; R28-2c, docs/REINTERP_R28-2_
   * GUIDED_NARRATIVE_SPEC_2026-07-10.md §4). One `kept: <label>` line per
   * item kept in the T1 gathering window (un-kept eligible items file
   * nothing — silence is the record's answer), OR one `processed` line if
   * the window never opened (Update-Now taken directly). The gathering
   * act itself ("gathered at all" vs "declined to gather") files through
   * `guidance` instead (the guide thread's own belongings message) — not
   * duplicated here. `witness` resolved from data/room/belongings.json at
   * file time, never composed in TS. In-memory only, like everything here.
   */
  belongings: { id: string; outcome: 'kept' | 'processed'; witness: string }[];
}

const fresh = (): Ledger => ({
  name: '—',
  tags: [],
  records: [],
  flips: 0,
  dossier: [],
  session: { path: 'full', switched: false },
  assistant: { dismissals: 0, acceptedSuggestions: [], ignored: [], nightSessions: 0 },
  updates: [],
  respite: { streamOpenSeconds: 0, songsPlayed: [] },
  provotypes: [],
  sends: [],
  guidance: [],
  tapes: [],
  belongings: []
});

export let ledger: Ledger = fresh();

export function wipeLedger(): void {
  ledger = fresh();
}

// The wipe is a hard guarantee, not a courtesy.
window.addEventListener('beforeunload', wipeLedger);
