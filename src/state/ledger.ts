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
   * S2R.3–S2R.6 (Session 45, THE CALEB THREAD): every act in the era's wound,
   * filed witness-symmetrically — answering a chip files, and so does reading
   * it and saying nothing (`held`); the system's own interventions file in
   * its own cheerful vocabulary (`intervened`: the flag, the redaction, the
   * streak's death, the "support" it provides for the wound it just made);
   * dismissing the assistant files (`dismissed`, CLAUDE.md's dismissal law);
   * the block lifting files (`restored`).
   *
   * `committed` is the COMMIT-PRESS — "i want to be with you too", the one
   * chip with no alternative. Nothing happened, nobody met: the record's own
   * line for it is what makes the beat's thesis exact.
   *
   * `residue` is the second commit-press (S2R.6) and is deliberately NOT a
   * classification: its `witness` is the GAP the record could not classify
   * (homecoming script S2R.6), never Sérgio's locked line itself — the
   * apparatus is no longer there to file that one.
   *
   * `witness` resolved from data/dialog/s2_caleb.json at file time, never
   * composed in TS. In-memory only, like everything here.
   */
  /**
   * ⚑ S189 — Phase 4's games (src/games/): one line per run that ended, in the era it was played —
   * FIT IN (1997), REACH (2003), TIDY (2026). FloppySheep never files (S70: it never judges her).
   * In-memory only, like everything here.
   */
  games: { id: string; era: 'e1' | 'e2' | 'e3' | 'e4'; witness: string }[];
  /** ⚑ S192 — 2016's newer board jobs that file their own line (Tag the video) */
  /** ⚑ S209 / P7-47 — the Lexicon's words the player met, in order (src/room/lexicon.ts meetWord); never a record line */
  lexicon: string[];
  era3Jobs: { id: string; witness: string }[];
  caleb: {
    id: string;
    outcome: 'replied' | 'held' | 'committed' | 'intervened' | 'dismissed' | 'restored' | 'residue';
    witness: string;
  }[];
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
   * THE CORRECTION LIST (Session 64, E3-iii — docs/REINTERP_E3_THE_CORRECTION_
   * LIST_2026-07-30.md): one line per correction DECIDED on the workstation, filed
   * witness-symmetrically — applying files, and so does skipping, because a
   * skip is an act and the record never leaves an act silent. `cardId` is the
   * correction's own id in data/dialog/s3_queue.json, where `witness` also
   * lives; nothing here is composed in TS. No scores, streaks or progress
   * counts are ever derived from this array (CLAUDE.md law) — the only number
   * the player ever sees is the in-fiction `n of m applied` on the workstation, and
   * it is computed from the list, not from here.
   *
   * ⚑ NOT filed here, deliberately: anything in the Malta beat. See
   * `src/room/graceQueueLite.ts`'s header — the apparatus did not ask for it,
   * so the apparatus does not get to record it (the Tape C doctrine, above).
   *
   * ⚑ `'stood'` is RETIRED — the Session-38 moderation verbs it belonged to
   * (`Approve` / `Move to review` / `Let it stand`) are deleted, and nothing
   * emits it any more. It stays in this union for one honest reason:
   * `src/witness/intake.ts` colours a filing by testing for it, and that file
   * is outside this session's fence. Whoever next opens intake.ts should drop
   * the test and this variant together.
   */
  graceQueue: { cardId: number; outcome: 'applied' | 'skipped' | 'stood'; witness: string }[];
  /**
   * THE COMMENTS (Session 70, E3 — docs/REINTERP_E3_THE_JOB_2026-08-03.md §1):
   * one line per template DEPLOYED under a comment on the tablet. `witness` is
   * the template's own line in data/dialog/s3_comments.json, never composed in
   * TS, and `follow` records the two templates that also flag the account for
   * personal follow-up — the recruitment floor, on the record, in the same flat
   * grammar as everything else she did.
   *
   * ⚑ WHAT IS DELIBERATELY NOT HERE, and each omission is the same doctrine as
   * the Malta beat above (the record answers for what the apparatus ASKED you
   * to do):
   *   · a comment READ AND LEFT UNANSWERED files nothing. The apparatus never
   *     asked for a reply, it only left the thread open — and an unanswered
   *     comment is already its own kind of record.
   *   · THE PROPAGATION files nothing. A stranger repeating a sentence Vera
   *     deployed is not an act of hers, and giving the record a line for it
   *     would be the piece pointing at the thing it must never point at.
   *   · FLOPPYSHEEP files nothing, ever. No time, no count, no entry. Nobody
   *     asked her to play it and nobody gets to write it down.
   * No score, streak or progress count is ever derived from this array.
   */
  comments: { commentId: string; templateId: string; follow: boolean; witness: string }[];
  /**
   * ERA 4's SHELL (Session 76 — docs/REINTERP_E4_THE_SPACE_2026-08-06.md).
   * Three entries at most, and they are the era's whole physical record:
   *   `installed` — the last update completed and the companion was registered
   *                 (filed at the RESTART, like u3's `subject-migrated`: the
   *                 record files the migration when the migration happens);
   *   `worn`      — the one touch on the headset;
   *   `turned`    — ⚑ filed ONCE, the first time the player turns while wearing
   *                 it. The line is `orientation: changed — view unchanged`.
   *                 The record is the only thing in the piece that remarks on
   *                 the turn that does not work, and it remarks on it the way
   *                 it remarks on everything: administratively, without comment.
   *
   * `witness` resolved from data/dialog/s4_space.json and s4_update.json at
   * file time, never composed in TS. In-memory only, like everything here.
   */
  /** ⚑ `read` added 2026-09-01 with the laptop: Era 4 now opens on her own
   *  machine and is SENT from it to the headset, so the first thing the record
   *  files in this era is having read what the update said, not having worn it. */
  e4Space: { id: string; outcome: 'installed' | 'worn' | 'turned' | 'read' | 'joined' | 'begun' | 'done' | 'pressed' | 'answered' | 'opened'; witness: string }[];   // S160: the saver's press, L's turns answered, a thread opened
  /**
   * ⚑ L, ERA 4's CONVERSATION (Session 77 — `data/dialog/s4_l.json`,
   * `src/desktop/apps/lVoice.ts`). Witness-symmetric in both directions, which
   * this era needs more than any other because the player barely acts in it:
   *
   *   `answered`   — a chip. Every answer is accepted, filed and reinterpreted;
   *                  agreeing and disagreeing both file, and u8's disagreement
   *                  files as `receptive — revisit` (Ethics #10: the system
   *                  pathologises compliance AND resistance, symmetrically).
   *   `silent`     — saying nothing, which is an act. The record never leaves an
   *                  act silent, so the option to say nothing files too.
   *   `corrected`  — ⚑ "My name is Maya." ALWAYS accepted, ALWAYS logged (the
   *                  dismissal law's descendant).
   *   `retained`   — ⚑ and always filed BESIDE it: `legacy record consistency —
   *                  retained`. The correction that never takes. The piece's
   *                  oldest beat (the diary the system could not delete)
   *                  inverted: now it is the system's text that cannot be
   *                  corrected, and both are true at once.
   *   `captioned`  — THE SYSTEM'S OWN ACT: it catalogued her belongings and
   *                  nobody asked it to. Witness symmetry does not only run
   *                  toward the player. Includes the one it could not place —
   *                  `no category returned — held for review`.
   *
   * ⚑ NO score, streak, count or progress figure is ever derived from this
   * array, and no chip is "correct". `witness` is resolved from
   * `data/dialog/s4_l.json` at file time, never composed in TS. In-memory only,
   * like everything here.
   */
  l: { id: string; outcome: 'answered' | 'silent' | 'corrected' | 'captioned' | 'retained'; witness: string }[];
  /**
   * ⚑ THE OFFERS (Session 78 — `data/dialog/s4_offers.json`,
   * `src/desktop/apps/offers.ts`). What the place put in front of her, and what
   * she did about it. Witness-symmetric in BOTH directions, and in this beat
   * the system's own direction carries most of the weight — she is barely asked
   * for anything, so most of what happens here is something done TO her:
   *
   *   `surfaced`  — ⚑ THE SYSTEM'S OWN ACT. A photograph resurfaced and
   *                 enhanced without being asked; four offers put up on the
   *                 wall; a paid placement selected for her out of 214. Nobody
   *                 requested any of it, and the record says so in the system's
   *                 own flat vocabulary — which is the only thing in the piece
   *                 that ever remarks on the curation.
   *   `undone`    — ⚑ the memories UNDO, and it ALWAYS WORKS and is ALWAYS
   *                 logged (the dismissal law, unbroken since E1). The picture
   *                 goes back to hers. The next memory is already enhanced.
   *   `withdrawn` — the recommendation the selection left out, taken away again
   *                 by the system, unrequested. Filed for exactly the reason
   *                 the enhancement is: an act nobody asked for is still an act.
   *   `answered` / `corrected` — the careful pause's two live chips. Neither is
   *                 correct, neither branches, and pressing the pause is NOT
   *                 filed as a defeat anywhere in this array or in its copy.
   *   `retained`  — ⚑ filed BESIDE `corrected`, as it has been since S77: the
   *                 legacy field is protected and the correction never takes.
   *                 And beside `answered` on the pause, where the record's line
   *                 (`care pathway: interrupted — flagged for review`) is not a
   *                 translation of what she chose. Both are true at once and
   *                 nothing in the piece ever reconciles them.
   *   `handed`    — the era handed over. One line, at the very end.
   *
   * ⚑ NO score, streak, count or progress figure is ever derived from this
   * array. `witness` is resolved from `data/dialog/s4_offers.json` at file time,
   * never composed in TS. In-memory only, like everything here.
   */
  e4Offers: {
    id: string;
    outcome: 'surfaced' | 'undone' | 'answered' | 'corrected' | 'retained' | 'withdrawn' | 'handed';
    witness: string;
  }[];
  /**
   * ⚑ S80 — LOOK-MODE 3 (the gyro), and it is deliberately NOT A RECORD.
   *
   * Every other field on this object is the piece's memory of what was done to
   * the player or by them. This one is not: it is the frame's own view state —
   * whether device-motion look is on, where the player's "forward" was last
   * zeroed, how many times they recentred. **Nothing in `src/witness/` reads
   * it, nothing files from it, and it must never appear on the record.** A
   * player turning their phone is not a data point.
   *
   * It lives here anyway for one reason, and it is the invariant: this object
   * is the only store the piece is allowed at all (the browser's persistent
   * ones are forbidden outright — see the header above), so anything that must
   * survive an era shift and die with the session belongs here and nowhere
   * else. `wipeLedger()` takes it with everything else.
   *
   * `motion`: 'unasked' before any request · 'granted'/'denied' after an iOS
   * permission prompt · 'unavailable' when the sensor never reported ·
   * 'off' when the player turned it back off themselves.
   * `yawZero`: the device heading, in degrees, that currently means "the way
   * the seat faces". Null until the first reading. iOS gives no reliable
   * absolute heading, so this is RELATIVE and it will drift — which is exactly
   * why Recentre exists in the game menu.
   * `screenAngle` + `screenAngleSource`: the current in-memory q₂ correction
   * and the evidence that supplied it. Null/unknown is deliberately distinct
   * from a reported 0°; no orientation fact is persisted between sessions.
   *
   * ⚑ `unvoicedName` (S77) — THE UNVOICED OPT-OUT, and it belongs on this field
   * and not on any of the record fields above for exactly the reason this field
   * exists: it is the FRAME's state, not the piece's memory of anything. It is
   * set from the game menu (`src/desktop/gameMenu.ts`), announced on the
   * pre-fiction panel, and read in one place — `src/desktop/apps/lVoice.ts`'s
   * `speak()`/`caption()`. With it on, a line flagged `deadname` is not spoken;
   * ⚑ the caption still shows that the system used a name Maya does not use, so
   * the beat survives and the ambush does not. Never written to storage — there
   * is none — so it resets every session, which is correct: an accessibility
   * setting that persisted would be a profile, and this piece keeps none.
   *
   * ⚑ It is in the FRAME and never in the fiction (08 §8 decision 10, Sérgio:
   * "if it is in the menu setting, then it's okay"). An opt-out the apparatus
   * grants you is not an opt-out.
   */
  view: {
    motion: 'unasked' | 'granted' | 'denied' | 'unavailable' | 'off';
    yawZero: number | null;
    screenAngle: number | null;
    screenAngleSource: 'screen.orientation' | 'legacy' | 'derived' | 'unknown';
    recentres: number;
    unvoicedName: boolean;
    /** S162 / F-01 — the sound NAMES in the caption strip (W-G2); chosen at the front door, changeable in the menu. Spoken words always show. */
    captions: boolean;
  };
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
  caleb: [],
  games: [],
  lexicon: [],
  era3Jobs: [],
  era3Arrival: [],
  graceQueue: [],
  comments: [],
  e4Space: [],
  l: [],
  e4Offers: [],
  view: {
    motion: 'unasked', yawZero: null,
    screenAngle: null, screenAngleSource: 'unknown',
    recentres: 0, unvoicedName: false, captions: true
  }
});

export let ledger: Ledger = fresh();

export function wipeLedger(): void {
  ledger = fresh();
}

// The wipe is a hard guarantee, not a courtesy.
window.addEventListener('beforeunload', wipeLedger);

/**
 * ⚑ ERA 4'S FILE, READ BACK — S119, and it closes a hole this project had
 * carried since the era was built.
 *
 * `l` and `e4Offers` were WRITTEN by every chip in Era 4 and READ BY NOTHING.
 * The one surface built to show them — the intake record on Maya's wall — is
 * switched off for the whole era (`cluster.ts`, `setTerminalVisible(era !==
 * 'e3' && era !== 'e4')`), and the migration that used to carry it there was
 * retired on 2026-09-05. So the era's spine — an apology on top, a retention
 * underneath — had a top and no underneath.
 *
 * This is the underneath. It is a READ, and deliberately nothing else: no new
 * field, no persistence, no ordering key. The two lists are concatenated in the
 * order the era plays them (L's ten units, then the offers), which is already
 * chronological because nothing in Era 4 runs them the other way round.
 *
 * ⚑ NEWEST FIRST, and capped — a strip, not an archive. The cap is a layout
 * fact (the visor is 512 x 384 and the label field is above it), not an
 * editorial one: nothing is ever DELETED from the file, it only stops being on
 * screen, which is the difference the era is about.
 */
export function e4Filings(limit = 4): string[] {
  const all = [...ledger.l, ...ledger.e4Offers];
  const out: string[] = [];
  for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
    out.push(all[i].witness);
  }
  return out;
}
