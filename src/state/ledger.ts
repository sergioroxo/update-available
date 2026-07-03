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
  provotypes: []
});

export let ledger: Ledger = fresh();

export function wipeLedger(): void {
  ledger = fresh();
}

// The wipe is a hard guarantee, not a courtesy.
window.addEventListener('beforeunload', wipeLedger);
