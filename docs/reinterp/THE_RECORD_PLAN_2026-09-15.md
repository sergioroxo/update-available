STATUS: live

# THE RECORD — one file, thirty years, and the reading of it
*2026-09-15, S144. Sérgio: "aren't we missing the whole system of Witness? How does it translate to
the other eras? The map of interaction? Its design revamp to make clear how it tracks you? How it
transforms into the new systems? How to make the user actually want to read it? How it brings
knowledge about the era and the process?" This is the plan, and the order it is built in.*

---

## 1 · What exists, honestly

| Surface | Where | Eras | What it does | The gap |
|---|---|---|---|---|
| **The Intake Record** (`src/witness/intake.ts`) | Room 1's back wall, seen by the flip | E1, E2 | Computed live from the ledger: subject, source, trusted contact, channel log, classification, status, and ~7 rows of "assigned sessions". Re-stamped at E2. | Off at E3 and E4 (on purpose — "the record is inside the platform"), but nothing inside the platform shows it. The seven rows are the whole map of interaction and they scroll off. Nothing explains what any row IS. |
| **The Dossier** | Era 1's "found file" window; five provotype debriefs; two Credits sub-views | E1, E3, E4 | The sourced layer: 33 status-graded source cards across the provotypes. | Reachable only by finishing a provotype, or from the menu's credits. A player who never opens the pillow never meets a source. No per-era reading of the *practices* the ledger entries belong to. |
| **The ledger** (`src/state/ledger.ts`) | memory only | all | 20 lists, every act filed with a cold `witness` line. | The one system that already spans the piece — and it is never shown as one thing. |
| **The Close** | the constellation | end | Four era panels (explanation + plate), 32 research anchors, the makers. | Says what the apparatus did; never what *you* did. The panels are the same for every player. |
| **E4's "Your information"** | the browser's record tab | E4 | Name, pronouns, `Legacy file · retained`, `1 item held for review`. | The legacy file is a chip. It should be the thirty years. |

So: the piece files everything and shows almost none of it; it has sources and hides them behind
the two least-visited doors; and the record stops being visible exactly when the eras become
about records.

## 2 · The principle

**One file. Four faces. One reading.**

- **One file** — the ledger, read through a single view-model (`src/witness/record.ts`): every entry
  gets an era, a kind, what you did, what it filed, and the PRACTICE it belongs to.
- **Four faces** — the file as each era's own instrument would show it (the index card; the scanned
  card with the accountability web; the platform's *Your record*; the 2026 *Legacy file*). Same
  data, aging form. This is "how it transforms into the new systems".
- **One reading** — the DOSSIER, in the frame (the game menu, Esc): *Your file* — the map of
  interaction per era, and under each entry the practice it belongs to with its dossier status and
  source. Frame voice: functional, undecorated, never plays. This is the educational spine, and it is
  the one thing in the piece the player opens *because they want to know*.

Why the frame and not the fiction for the reading: the apparatus explaining itself would be the
apparatus lying (it never tells her the truth), and CLAUDE.md's law is that the frame never plays.
A dossier the player opens is a reader's act. The fiction keeps its four faces cold.

## 3 · The build, in order

**A · `record.ts` — the view-model.** `recordEntries(): RecordEntry[]` from the ledger; `byEra()`.
Era comes from the list the entry lives in (records/tags/provotypes/sends/guidance/tapes → E1;
belongings/lamby/checkins/media/caleb → E2; era3Arrival/graceQueue/comments → E3; e4Space → E4;
updates → the era they leave). Kind → practice via `data/dossier/practices.json`.

**B · `practices.json` + the Dossier view in the menu ("Your file").** One card per practice the
piece performs — questionnaire, referral by contact, channel logging, placement packet, diary
surveillance, accountability check-in, contact monitoring, media as instruction, testimony editing,
moderation queue, autocomplete, retained record, photo "restoration", "support" agent, immersive
session, termination — each with: what the system did (one line), status (documentary / contested /
speculative), and a source pointer INTO the provotypes' existing sourced cards (no duplicated
claims, no new [VERIFY SOURCE]). The view lists, per era: *what you did → what it filed → the
practice → status*, and a one-line "further reading" from the existing Credits sub-views.

**C · E3 — the record inside the platform.** A `record` tile on the board (*Your record*): the
platform's profile page for Vera with the IMPORTED history (E1 and E2 entries as "migrated ·
1997–2003 · read-only"), her consent decision, her corrections count. The face for 2016: the file
became a profile.

**D · E4 — the Legacy file opens.** `Legacy file · retained` becomes a press: the record tab shows
the thirty years under it, as the 2026 product would — a timeline of "events", the E1 card's
wording verbatim as the oldest row. The face for 2026: the file became "your information".

**E · The Close — your own file on the panels.** Each era's panel gets two lines from the record:
*In this room you …* (the entries the player actually made), composited into the atlas at
`enterClose`. Every player reads a different Close.

**F · The witness pulse.** Every filing is HEARD and SEEN: a stamp (synthesized, cold, one per
ledger growth) and the wall panel's harden flash — the player learns, in Era 1, that the wall
answers what they do, before they are ever told.

**G · The Record's own redesign (the E1/E2 face).** The seven scrolling rows become a proper map:
grouped by session, newest at top, the FLAG rows first, a count ("14 entries · 3 flagged"), and one
line under the header in the apparatus's voice saying what the file is for. Sharper, colder,
readable at the flip's distance (measured, not guessed).

Order: A → B → F (one session: the spine), then C → D (the faces), then E → G.

## 4 · Laws that bind every step
- The fiction's faces never explain; the frame's reading never plays.
- No new claims: every practice card points at a source that already exists in the provotypes.
- Invented marks only in the faces; real organisations only where the dossier documents them.
- No storage: the file is memory, and "nothing kept" stays true — the Close says so.
- The witness is symmetric: refusing files as much as complying.
