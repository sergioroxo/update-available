STATUS: live

# Codex briefs, 3 Nov 2026 — "the person's own thing" (why it can feel empty, and what to do about it)

*Written for Sérgio from a conversation about a playtest that felt "empty, soulless… a lack of story
development". Format follows `CODEX_BRIEFS_2026-11-02.md`: paste ONE brief into Codex; each starts
from `origin/reinterp` on its own `codex/<name>` branch. Run them IN ORDER: 1 → 2 → 3, then pick what
to build. Briefs 1, 2 and 3 write documents and one diagnostic tool; none changes what the player
sees or writes final copy.*

## What this is based on (and what it is not)

The idea Sérgio liked: **(1)** each era gives the person something that is *theirs* before the system
arrives, **(2)** the loss at the end is specific — it takes *that* object the player handled, **(3)**
each person gets one concrete odd detail and no biography.

⚑ **Read before pasting anything — the project already has pieces of this.** From `reinterp`:
- **E1:** the mixtape ("Tape C", the resisting element), `data/room/belongings.json` (the gathering
  window: the player chooses what to KEEP before the era turns; "kept: the mixtape").
- **E2:** Caleb's thread has a real respite ("RESPITE → FELT"), the song he sends, and the blank last
  night at New Morning ("never shown, never explained").
- **E3 (Vera): NO respite — Sérgio's confirmed decision.** Her unread birthday messages (`s3_maiden`)
  are the felt equivalent: nobody argues with her. **No brief below may add a respite to E3.** "The
  person's own thing" can exist there as `felt`, not `respite`.
- **E4 (Maya):** the TransJesus stream is the respite; the calendar with one Friday ringed.

So the open question is **not "add own-thing scenes"**. It is: *does the player actually meet and use
these things before they are taken, early enough and long enough to care?* Nobody has measured that,
which is why Brief 1 is an audit. (I did not play the build; I read the docs, data and BUILD_LOG on
`reinterp` only.)

## ⚑ Two guards that apply to every brief
1. **No implied trajectory.** The eras must not read as one person going gay → lesbian → trans. Carried
   objects, shared names and "the file migrated" lines are where that implication sneaks in
   (`witness.eras` in `data/strings/slice.json`; the master plan row *"subject migrated — file
   retained"*; Maya "misfiled under the old file"). Daniel (E1→E2) is one person; Vera and Maya are
   not him. Anything a brief proposes must pass: *could a first-time player read this as one life?*
2. **The own-thing is not an identity signal.** It is a tape, a ringed date, an unread message — an
   ordinary private pleasure. Not a flag, not a coded accessory, not a stereotype. The system finds the
   queerness in the footprints; the object doesn't announce it.

## Shared rules for every brief (put this paragraph at the top of each paste)
> Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript WebXR art piece).
> First `git fetch && git checkout -b codex/<name> origin/reinterp`. Read CLAUDE.md and
> docs/ETHICS_CONSTRAINTS.md before anything — their laws bind you: no runtime network calls; no storage;
> colours only from src/desktop/theme/*; click/tap only, no free text, no timers that punish, no scores;
> respite is never a trap and never revealed as fake; the system targets AROUND it, never through it;
> E3 has no respite (Sérgio, confirmed). Every docs/**.md starts with `STATUS:`. All new display text is
> a draft: `_doc: "PLACEHOLDER — Sérgio voice pass pending"` and marked ⚑ — you do NOT write final
> survivor-adjacent text or make ethics calls; you flag them. Uncited facts carry `[VERIFY SOURCE]`.
> One line in BUILD_LOG.md (next session number after the last one — check). Commit with explicit paths,
> never `git add -A`; never stage README.md. Verify with `npx tsc --noEmit -p .` and `npm test` (both
> must pass). Do not push; leave the branch for review. Write a short report file
> docs/reinterp/CODEX_<NAME>_REPORT_2026-11-03.md (STATUS: live): what you changed, how you checked it,
> what still needs a real headset or Sérgio's decision.

---

## 1 · The own-thing audit — READ ONLY (`codex/own-thing-audit`)

**Why.** A playtest felt empty. Before adding anything, find out whether the person's own things
already exist in the build and where the player first meets them. Count from the BUILD (data +
`src/`), never from what the docs claim — a comment is not evidence (`00_WHERE_THINGS_STAND.md` trap
#1). **No code changes. No new content.**

**Do.** Write `docs/reinterp/OWN_THING_AUDIT_2026-11-03.md`. For each of E1 (1997 Daniel), E2 (2003
Daniel/Caleb), E3 (2016 Vera), E4 (2026 Maya) answer, with file:line evidence:
1. **First own-thing.** What is the first beat where the player does or sees something that belongs to
   the person and is not a system surface? Give its beat id and its position in the spine order
   (`data/strings/map.json`) as "step N of M", and say what the player has already been through before
   it (count operable beats before it).
2. **Longest unbroken operable stretch** in the era (consecutive `operable` beats with no `felt` or
   `respite`), in beats and, if the walk tools can tell you, seconds.
3. **The one odd detail.** What is the single concrete, non-generic thing about this person that a
   player could repeat afterwards ("the man who…")? If none, say none. Do not invent one.
4. **The loss.** At the era's end (E1 packet/suspension, E2 dispersal/closure, E3 Malta/the light, E4
   the Close) what is taken or left behind? Is it an object the player **handled earlier in the same
   era**? Quote the exact line that names it and the earlier beat that introduced it. (E1: check
   `belongings.json` — does the packet's "leave behind" line use what the player actually kept or
   left, or generic text?)
5. **Told vs shown.** In `felt` scenes, count lines that STATE a feeling versus lines that show an
   object or action. List the five most "told" lines.
6. **Jump legibility.** At each update, how does a first-time player learn that the next login is a
   different person (E2→E3, E3→E4), and that Daniel continues E1→E2? Quote the transition text. Check
   explicitly whether anything could read as ONE person's identity trajectory (guard 1), and list each
   place: file, line, wording.
7. **Orphans.** Any own-thing content authored but never triggered (the project's signature failure).

**End the doc with** a ranked list of gaps (worst first), each as: era · gap · evidence · smallest
possible fix · who decides. Do not propose respite for E3. Do not draft copy.

**Done when:** the doc exists, every claim has file:line, `npm test` still green (nothing else changed).

---

## 2 · Register timeline diagnostic (`codex/register-timeline`)

**Why.** "Empty" is partly a rhythm problem: too long on system surfaces between moments of the
person. A one-page printout lets Sérgio see the rhythm without playing four eras. Pure tooling, no
player-facing change.

**Build.** `tools/register-timeline.mjs`: read the spine order and register/quiet flags from
`data/strings/map.json` plus the provotype/dialog `register` fields, and print per era a line of
symbols in play order (`·` operable, `F` felt, `R` respite, `—` ritual/transition), with: counts per
register, longest operable run, index of the first `F`/`R`, and the ratio of operable to person
beats. Also emit `--md` output to `docs/reinterp/REGISTER_TIMELINE_2026-11-03.md`. If a beat has no
register in the data, print `?` and list those beats (do not guess). Add the command to the README
tools list only if one exists (never stage README.md). No runtime/bundle change.

**Done when:** running it prints all four eras; the `?` list is reported; `npm test` + `tsc` green.

---

## 3 · The own-thing spec — OPTIONS, NOT COPY (`codex/own-thing-spec`)

**Run after Sérgio has read the audit (Brief 1).** Paste the audit's ranked gap list under this brief.

**Why.** Turn the audit's gaps into a small number of buildable options Sérgio can pick from, using
only what the project can already do.

**Do.** Write `docs/reinterp/OWN_THING_SPEC_2026-11-03.md`. For each era that the audit shows has a
gap, give **three** options (not one), each in this template:
- **Object** — an ordinary thing (a tape, a ringed date, an unread message).
- **Verb** — ONE click/tap action that is not a game: no timing, no scoring, no failing. The thing
  plays or happens whether or not the player is good at it.
- **Odd detail** — one concrete specific, not a biography, not an identity signal (guard 2).
- **Where it sits** — beat position; how many seconds before the first system surface (target: the
  person before the apparatus, ≥ 90 s, never more than ~3 min); register (`respite` for E1/E2/E4,
  `felt` only for E3).
- **How the system arrives around it** — never through it, never revealing it as fake. Precedent to
  reuse: E2's blank last night (absence as the respite); E4's ball that files nothing.
- **What the witness side records** — nothing, or a "not observed / unclassifiable" line. Precedent:
  the mixtape never reaches `ledger.tapes`.
- **The loss** — which exact line later names this exact object, and which data key
  (in-memory `ledger` only) lets it name what the player really did.
- **Cost** — new assets? new `src/` code? or data-only? Quest budget impact (draw calls ≤ 75).
- **Risks** — guard 1 and 2 checked in one line each; anachronism risk `[VERIFY SOURCE]`.
Recommend one option per era and say why, but mark ⚑ that Sérgio chooses. Do not write final copy; any
sample lines are marked PLACEHOLDER. Verbs must respect the input laws (no keyboard, no timers that
punish).

**Done when:** the doc exists; every option names real files/keys; `npm test` green.

---

## 4 · Period research for the "odd detail" (`codex/own-thing-research`) — optional, can run in parallel with 1

**Why.** An odd detail only works if it is true to the period and the place. Gather candidates; do not
choose.

**Do.** Write `docs/research/OWN_THING_PERIOD_PRACTICES_2026-11-03.md`. For each of 1997, 2003, 2016,
2026 list 8–10 **ordinary private practices** of that period for a teenager/young adult at home with a
computer or phone (how media was copied and shared, what was kept in a drawer, what an unsent message
or an away-note looked like, small rituals around a shared family computer). For each give: a one-line
description, why it is specific to that year, a source (or `[VERIFY SOURCE]`), and an **anachronism
check** (what would be wrong in that year). Rules: sources only from the project's KB and the existing
`docs/research/` files unless you mark them unverified; no real people, no real brands (invented marks
only), no verbatim survivor testimony; do not write about conversion practices in this doc — this is
about ordinary life, which is what the system takes. No queer-coded stereotypes: if a practice is
interesting only because it signals identity, drop it.

**Done when:** the doc exists with sources or `[VERIFY SOURCE]` on every entry; no draft copy.

---

## 5 · Build template — only after Sérgio picks from Brief 3 (`codex/own-thing-<era>`)

*Do not paste this until Sérgio has marked his choice in the spec. Fill the angle brackets from his
pick. One era per paste.*

**Why.** Build exactly the chosen option for era `<E1|E2|E4 | E3 felt-only>`.

**Build.** From `OWN_THING_SPEC_2026-11-03.md`, option `<n>` for `<era>`, as chosen by Sérgio:
- Content in `data/` (new file `data/dialog/<sN>_own.json` or the era's existing dialog file), every
  display string `_doc: "PLACEHOLDER — Sérgio voice pass pending"`; geometry/layout in `.ts`.
- Register-appropriate: Assistant (Lamby) absent; no apparatus text; no UI that scores or times.
- Register the beat id with `cuts` metadata like the other beats; add it to `data/strings/map.json` as
  a `quiet` beat so the idle helper never speaks over it.
- Put the player's handling of the object into the in-memory `ledger` under a new key; make the later
  loss line read it (e.g. the packet / dispersal / closure names the object the player actually
  touched, with a safe generic fallback if they skipped). Skipping must always work and be logged.
- If audio is needed and absent, follow the registry law in `src/audio/tapeAudio.ts` (unregistered
  names are silently never requested; captions carry the beat). No synthesized voices of people.
- Witness side: exactly as the spec says (nothing, or "unclassifiable"). Never a score.
- Update `tools/register-timeline.mjs` output (Brief 2) if it exists.

**Done when:** `npm run dev` works; a walk (tools/walk.mjs or the era's tour script) reaches the beat
and the later loss line; skip path verified; the no-flag baseline unchanged; `tsc` + `npm test` green;
report lists what needs a real headset and Sérgio's voice pass. Leave E3 without respite.

---

## What to do in what order (for Sérgio)

1. Paste **Brief 1** and **Brief 2** into Codex (they don't touch what players see). Optionally
   **Brief 4** in parallel.
2. Read the audit + timeline. If they show your own things already land (early, handled, then lost),
   the emptiness is elsewhere (audio is ranked #1 in `00_WHERE_THINGS_STAND.md` — the piece is "nearly
   silent where it was designed to be sound", which alone can read as soulless) and Brief 3/5 can wait.
3. If they show gaps, paste **Brief 3**, choose one option per era, then paste **Brief 5** once per era.

---

# Addendum, 3 Nov 2026 (after the audit + period bank)

## 6 · Sound: inventory first, then build only what Codex may legitimately make (`codex/audio-gaps`)

**Why.** `00_WHERE_THINGS_STAND.md` (Aug 21) ranked missing audio the #1 gap ("six files, none
present"). `assets/audio/` now holds ~130 files, so that count is stale: **do not trust it, measure it.**
Silence where the piece was designed for sound can read as "soulless" on its own.

**Read first:** `docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md`, `docs/REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md`,
`src/audio/tapeAudio.ts` (REGISTRY + `requiresAudio` law), `tools/tts/render.py` (its ETHICS BOUNDARY is
binding), `tools/degrade_audio.sh`, `data/audio/{tts_manifest.json,sound_candidates.tsv,ingest.tsv}`,
`docs/reinterp/ATTRIBUTIONS.md`, `tools/volume-check.mjs`.

**Step A — inventory (read-only, do this and STOP for review before Step B).** Write
`docs/reinterp/AUDIO_GAPS_2026-11-03.md`: every audio name referenced anywhere in `data/**` or `src/**`,
one row each: name · era · beat id · register (operable/felt/respite) · kind (room bed / UI / foley /
apparatus voice / music / human voice) · status (on disk + registered / on disk but unregistered /
registered but absent / referenced but neither / orphaned file nothing references) · who can make it
(Codex procedurally · apparatus TTS · Sérgio-generated music · needs real recordings). Rank gaps by
felt impact: `felt` and `respite` beats first, then era-turn rituals, then UI. Count from code and disk,
not from comments.

**Step B — build only these classes** (after Sérgio approves the Step A list):
- **Procedural foley / UI / room beds** generated by a deterministic offline script
  (`tools/audio/synth_*.mjs` or `.py`, no network, no downloaded samples unless the licence is recorded
  in `ATTRIBUTIONS.md`): modem/floppy/CRT/fan, notification chimes, update-install textures, keys,
  fridge hum, rain on a window, a phone buzzing on wood. Era-appropriate and soft ("life is soft; the
  system's instruments are the sharp side"). Output `.wav` into `assets/audio/`, register in
  `tapeAudio.ts`. Run the degrade pass only for sounds heard as coming off a physical tape.
- **Apparatus voices only** (Lamby, L, system prompts) through `tools/tts/render.py` with
  `"register": "apparatus"` manifest entries.
- **Never** synthesize or imitate a human: not Daniel, Caleb, Vera, Maya, Junie, Rob, the ball, the stream
  chat, a congregation, a crowd. Those wait on real recordings (see the `_docNoBall` note in
  `data/audio/tts_manifest.json`).
- **Music is Sérgio's.** For each music/song gap write a generation prompt in
  `docs/reinterp/AUDIO_PROMPTS_FOR_SERGIO_2026-11-03.md` in the guide's format (style field ≤ 1,000
  chars, instrumental, no voice unless the Step A row says a real recording is planned, plus the
  length, loop point and which beat plays it). Do not generate music.

**Step C — mix and wiring rules.**
- Nothing plays over a `quiet`/felt beat except its own bed; ducking and fades live in code, levels in
  data. Loudness consistent across eras (measure with `tools/volume-check.mjs`, report the numbers); no
  sudden peaks (Quest comfort).
- Audio never starts before a user gesture; a sound-off player must still get the whole piece — every
  sound that carries meaning has a caption. An unregistered name is silently never requested (keep that).
- No timers that punish, no sound as reward/score ("the frame never plays").

**Done when:** the inventory exists and matches disk; every Step B file is registered, attributed
(procedural = "generated by tools/audio/…") and plays at its beat in a walk; the prompts doc exists for
every music gap; `tsc` + `npm test` green; the report lists what only a headset (spatial level, comfort)
can judge.

---

## 7 · E3 and E4 "first minutes" — options doc (`codex/e3-e4-openers`) — REVISED after Sérgio's notes

*Codex writes `docs/reinterp/E3_E4_OPENERS_2026-11-03.md`: feasibility, cost, risks, exact files, a step
list per candidate. No build, no final copy. Candidates are Claude's proposals; ⚑ Sérgio decides.
Sérgio's rules: no interactions through clothes (the coat is OUT); E4's opener must relate to the real
mechanism of the system steering a person toward detransition (apparatus and AI use only, never
detransitioners, never satirising the gender-exploratory clinical debate — both captions, unresolved).*

**Candidate E3-B · The mirrored message (after Lambient's question, before the work).** E3 is already a
three-screen room (workstation, tablet, phone: `src/room/era3Devices.ts`, "every screen you own").
After the `consent` beat and before `work`, a message notification arrives on the workstation as a
mirrored copy of her phone (period-correct device continuity; generic wording, no real brand), and the
phone on the nightstand lights at the same moment. The player may open it on the desktop or turn to the
phone, or ignore it and work. Rules: ONE notification, one voice at a time (S304), it never swallows a
click and clears itself (24 Oct playtest bugs 6 and 7 are exactly this failure); sender + first words
only; the platform and Lambient **never comment** and file nothing; opening it opens the phone's own
thread, not a platform widget; **E3 stays `felt`, not respite**; messages stay mundane (guard: no
declared acceptance); do not move the 14 March birthday. Reconcile: `phoneE3.ts` files `e3_backlog` on
opening the inbox while `s3_maiden` says nothing is filed. Surveillance reading to decide: a work
desktop showing a personal phone's messages makes the platform look like it can see them; say how the
notification avoids implying that, or whether Sérgio wants that implication.
Extra E3 "reality" elements to cost (data-first, small): (a) a long reply to Mam composed in a notes app
and never sent (bank 2016-06); (b) a friends' group muted with a large unread count beside a work group
with a small one (bank 2016-04); (c) a few near-duplicate camera-roll photos and a screenshot of a
timetable, as pre-authored sprites (bank 2016-01/02) — NOT a "folder of her past" (E2 already has the
1997 folder; do not repeat the device) and no photo that explains a backstory or signals identity.

**Candidate E4-B · The unfinished search (the system finishes her sentence).** Before `defaults`, the
restored session (`wake`/`l` beats) shows a search she typed herself the night before, left unfinished:
small, practical, hers, and NOT clinical or identity-debate content (it must not render either side of the
clinical question). Then the existing `search` beat ("The engine finishes it for you") finishes it
differently and steers to the sponsored result. The player sees the gap between what she asked and what
the system completed — the mechanism of steering, shown without a word of explanation. Reuses
`data/dialog/s4_browser.json` search and `s4_l.json`; check `docs/reinterp/ERA4_V2_BUILT_2026-11-02.md`
and `RESEARCH_2026_V2_WEAPONISED_CARE` for what is documented vs `[VERIFY SOURCE]`. Rules: L absent in the
opener; `felt`; nothing filed; no deadname; no clothing/prop interactions; the stream and ringed-Friday
calendar (optional, a wall prop, not clothing) must never become a loss at the Close.

For each candidate say: which existing files/props/data it reuses, what new code is needed, exact
effect on beat order in `data/strings/map.json`, effect on draw calls and the transitions, whether it
passes guards 1 and 2, and what to cut if the era runs long.
