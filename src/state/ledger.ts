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
  /**
   * S2R.0/S2R.1 (R28-2d-i/ii, Session 34): the E2 arrival — the return press
   * (the machine waited; the player pressed anyway) and Lamby's debut
   * greeting outcome. Both directions of the greeting file (begun/dismissed
   * — dismissal always works and is always logged, CLAUDE.md R28 amendment
   * 2). `witness` resolved from data/dialog/s2_lamby.json at file time, never
   * composed in TS. In-memory only, like everything here.
   */
  lamby: { id: string; outcome: 'returned' | 'begun' | 'dismissed'; witness: string }[];
  /**
   * S2R.2 (R28-2d-ii): the Restorify Daily Realignment check-in. Every chip
   * is accepted (register, never branch — master plan §5b); each files its
   * own witness tag. `witness` resolved from data/dialog/s2_lamby.json.
   * In-memory only, like everything here.
   */
  checkins: { id: string; witness: string }[];
  /**
   * S2R.4 (R28-2d-iv, Session 35): Lamby's video offer (the NetVision Player,
   * "The New You Program") + the video's own outcome. `declined` files when
   * the offer's "Not now" chip is pressed (the offer does not repeat this
   * session); `watched`/`skipped` file the player's own outcome (witness
   * symmetry: either response is data); `interrupted` files separately at
   * THE BREAK — the video's own showpiece failure, distinct from the
   * viewer's choice. `witness` resolved from data/dialog/s2_media.json or
   * s2_lamby.json at file time, never composed in TS. In-memory only, like
   * everything here.
   */
  media: { id: string; outcome: 'declined' | 'watched' | 'skipped' | 'interrupted'; witness: string }[];
  /**
   * S3R.0 (Session 37, E3-i — THE THREE-SCREEN ROOM foundation): fires once,
   * the moment the player first arrives at Era 3 and any device wakes — the
   * fragments from E2's failed uninstall ("companion process — could not be
   * removed. migrating.") becoming visible again, now distributed across all
   * three screens (master plan §5b, "the watcher" thread). At most one entry
   * ever (guarded in src/room/era3Devices.ts). `witness` resolved from
   * data/strings/era3_devices.json at file time, never composed in TS.
   * In-memory only, like everything here.
   */
  era3Arrival: { witness: string }[];
  /**
   * S3R.1/S3R.5 (Session 38, E3-ii — the GraceQueue pattern strip + card set,
   * docs/REINTERP_E3_GRACEQUEUE_CARDS_DRAFT_2026-07-13.md): every card action
   * in the laptop's moderation loop files here, witness-symmetrically (both
   * off-script outcomes — reviewed AND stood — are data, never silence). No
   * scores/streaks/progress count are ever derived from this array (CLAUDE.md
   * law) — it exists purely as the record. `witness` resolved from
   * data/dialog/s3_queue.json at file time, never composed in TS.
   */
  graceQueue: { cardId: number; outcome: 'approved' | 'reviewed' | 'stood'; witness: string }[];
  /**
   * S3R.5 (the Mira choice): true once Mira's card has been let stand — a
   * state flag for the LATER turn/counter-current beats (S3R.6, not this
   * session's scope; this session only sets the flag + files the glitch
   * line above in `graceQueue`). Never true on 'reviewed' (bury). Persists
   * for the rest of the session once set (S3R.6 will read it, not clear it).
   */
  graceQueueMiraStood: boolean;
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
  belongings: [],
  lamby: [],
  checkins: [],
  media: [],
  era3Arrival: [],
  graceQueue: [],
  graceQueueMiraStood: false
});

export let ledger: Ledger = fresh();

export function wipeLedger(): void {
  ledger = fresh();
}

// The wipe is a hard guarantee, not a courtesy.
window.addEventListener('beforeunload', wipeLedger);
