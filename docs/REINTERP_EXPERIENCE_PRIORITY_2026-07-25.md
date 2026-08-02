STATUS: live

# THE EXPERIENCE — where the spine actually breaks (2026-07-25)
*Sérgio: "Just Change is not the priority. Let's focus on changes to the overall experience."
Assessed against the code, not the plan. **One finding dominates: Era 2's climax doesn't lead
anywhere.** The piece's most powerful beat is followed by a desktop and a timer.*

## The spine, as built

`src/narrative/spine.ts` drives the era transitions and it **works mechanically**:

| Transition | Gate (spine.ts) |
|---|---|
| E1 → E2 | `u2` arms after `T1_DELAY` |
| E2 → E3 | `u3` arms when **`sendResolved('s2')`** and `t >= UPDATE_GAP` |
| E3 → E4 | `u4` arms when `sendResolved('s4')` and `t >= UPDATE_GAP` |
| E4 → Close | `close` arms after `E4_HOLD` |

Sends are offered diegetically (`spine.ts:61 → os.offerSend`), so this is a real chain, not a
debug-only one. **The machine is sound.**

## ⚑ The break: the Caleb thread doesn't feed the spine

`os.ts`'s `onThreadDone` — the callback that fires after the residue line, the era's emotional
climax — does this and nothing else:

```
this.caleb = null;
this.accountability = null;
this.dirty = true;
```

So after *"Then it was never me that was broken…"*, the player is returned to a desktop to **wait
for a send to resolve and a timer to elapse**. The most important moment in Era 2 is narratively
inert: it changes nothing, arms nothing, and leads nowhere.

`os.ts:361` says so in its own comment — *"u3/u4/close are untouched, their own gathering beats are
a later lane (E2 homecoming script S2R.7 names one at u3, not this session's scope)."* S45 was
correctly scoped; the lane just never ran.

**This is the single highest-value change to the overall experience.** Everything else on the queue
adds material; this one makes the material that already exists *land*.

## What S2R.7 is (homecoming script §S2R.7)
1. **The u3 update ritual** — notification → EULA → changelog → restart. "Remind me later" works once.
2. **The belongings beat fires again** — *what do you take from THIS life?* (the mechanism exists:
   `src/narrative/belongings.ts`, wired at `app.ts:171/668/751`).
3. **The restart delivers the player to Room 2** — Vera's era begins where Daniel's ends.
4. The last thing filed under Daniel's name: **`subject migrated — file retained`**.
5. **⚑ THE DISPERSAL** — the era's closing image, and the piece's explanation for *why the rooms
   open*: during the install, `"Restorify — removed."` then, a line lower and smaller,
   `"companion process — could not be removed. migrating."` Lamby's silhouette fragments into the
   many small marks that become Lambient's badges at E3. *The program died; the watching dispersed.*

## ✅ D31 — STRUCK AND ADOPTED (Sérgio, 2026-07-25)
He asked whether the GPAHE reports helped decide it. They did, decisively: the dispersal is
**documented history, not a dramatic invention** — GPAHE records that after Exodus's 2013 shutdown
the movement survived by *rebranding* and *decentralizing* "from centralized structures to networks
of independent affiliates," and the project's own KB already cited GPAHE saying "the rhetoric did
not disappear. It migrated into platform-native forms."

**Adopted with three refinements** (see `REINTERP_D31_DISPERSAL_EVIDENCE_2026-07-25.md`):
- the line becomes **"could not be removed — RENAMED"** (GPAHE's documented mechanism: NARTH→ATCSI
  2014, medical-sounding relabelling to evade moderation) — better sourced than "migrating", and it
  rhymes with the piece's own update-as-survival grammar;
- staged as **survival by scattering, never omnipotence** (2023: deplatforming partly worked);
- real organisations stay **dossier-only**; the fiction keeps its invented marks.

**And the reason the rooms open got sharper** — Sérgio also adopted the general-purpose
infrastructure finding as the piece's documented spine (`REINTERP_INFRASTRUCTURE_SPINE_2026-07-25.md`).
The rooms don't open because the apparatus multiplied; they open because it **stopped being a place
you go to**. His words: it "does help with the D31 of changing the way the rooms open up."

## After that, in order
1. **E3 sends build** — `REINTERP_E3_SENDS_SCRIPTS_2026-07-13.md` is scripted and unbuilt. E3's
   equivalent connective tissue.
2. **C2 layout-X ending arm + Close entry** — needs a spec first.
3. **R7 graying task (E1)** — still needs its build spec; do not improvise it.
4. Small, already-logged: the transparency unblock (approved, needs `main.ts` + holding the descent),
   and S51's `netvisionBreak` debug jump seeking `duration − 3` = 111s at the new 114s length, which
   lands deep in the tear instead of at the break's start — that one is review tooling and cheap.

## Structural gates (not buildable — Sérgio's)
- **A11 in-headset playtest.** The session log calls it *"the longest-standing structural gate;
  every week it waits the gated pile grows."* It now also gates S53's descent, which is the piece's
  only artificial locomotion and is **unverified in VR by construction** (no XR entry point exists
  in the build).
- **All voice passes** — everything still ships `_doc: PLACEHOLDER`.
- **G6/G7 ethics read** of the pillow + Origin Story Intake — neither build is cleared without it.
- **Source verification** — S47 applied the C1–C6 corrections as `_proposed`; they await review.

---

# S57 — S2R.7: ERA 2 ENDS · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch
reinterp, ?reinterp=1). Read first: CLAUDE.md (the era-transition grammar in "Era transitions =
software updates" is binding), docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md §S2R.7 (THE SPEC),
docs/REINTERP_EXPERIENCE_PRIORITY_2026-07-25.md (why this is the priority),
src/narrative/spine.ts, src/narrative/belongings.ts, src/desktop/os.ts (note openCaleb's
onThreadDone), and the tail of docs/reinterp/01_SESSION_LOG.md.

THE PROBLEM: Era 2's emotional climax leads nowhere. After the residue line ("Then it was never me
that was broken…"), os.ts's onThreadDone nulls the thread and returns the player to a desktop, where
they wait for a send to resolve and a timer to elapse. The era does not end; it stops. This session
gives Era 2 its ending and hands the player to Era 3.

SCOPE — S2R.7, per the homecoming script:
1. THE RESIDUE LEADS SOMEWHERE. Connect the Caleb thread's completion to the era's close. Do NOT
   simply force u3 the instant the residue lands — read spine.ts first and work WITH its existing
   gate (u3 arms on sendResolved('s2') + UPDATE_GAP). The residue should make the ending feel
   caused, not merely timed. If the cleanest answer is that the residue satisfies or accelerates
   the gate, do that; if it is that the residue arms a quiet beat which then leads to the update,
   do that. Explain your choice in the log — this is a dramaturgy call and it should be argued.
2. THE u3 UPDATE RITUAL, in the established grammar (CLAUDE.md): notification ("Remind me later"
   works ONCE) → EULA (scroll, one live "I Agree") → install with the changelog-as-thesis + glitch
   → restart. The changelog migrates the collapsed program into the platform era. Reuse the
   existing update machinery (u2 already ships); do not build a parallel one.
3. THE BELONGINGS BEAT FIRES AGAIN — "what do you take from THIS life?" The mechanism exists
   (src/narrative/belongings.ts; click geometry at app.ts ~171/668/751). This is its second use, in
   a different life: the E1 pass was a teenager's room, this one is an adult's.
4. THE RESTART DELIVERS THE PLAYER TO ROOM 2. Vera's era begins where Daniel's ends. The cross-room
   relocation grammar exists (the sends seam, movementNodes) — reuse it.
5. THE LAST FILING under Daniel's name: `subject migrated — file retained`. Witness-symmetric, in
   the record's own cold register.
6. ⚑ THE DISPERSAL — BUILD IT. D31 was STRUCK by Sérgio 2026-07-25 after the GPAHE check, WITH
   refinements; read docs/REINTERP_D31_DISPERSAL_EVIDENCE_2026-07-25.md and
   docs/REINTERP_INFRASTRUCTURE_SPINE_2026-07-25.md before staging it.
   During the install: "Restorify — removed." then, a line lower and smaller,
   "companion process — could not be removed. RENAMED." (the adopted wording — GPAHE's documented
   mechanism is RENAMING, not vague migration: NARTH became ATCSI in 2014, and providers relabel in
   medical-sounding language to evade moderation. It is better sourced than "migrating" AND it
   rhymes with the piece's own update-as-survival grammar.) Lamby's silhouette then fragments into
   the many small marks that become Lambient's badges at E3.
   ⚑ THE DISPERSAL IS ALREADY HALF BUILT — REUSE, DO NOT INVENT. Verified 2026-07-25:
   `src/room/era3Devices.ts` renders "Lambient's marks (the E2 dispersal payoff)… drawn from the
   SAME fixed FRAG offset grammar Session 33 used for the uninstall-report scatter
   (src/desktop/apps/update.ts) — here rendered SETTLED (no animation; THE FRAGMENTS HAVE ALREADY
   MIGRATED AND ARRIVED, PER u3'S OWN LINE)." So: the scatter grammar EXISTS in update.ts, the
   ARRIVAL exists at E3, and E3's code already refers to a u3 line that has never been written.
   Only the DEPARTURE is missing. Read both files first and reuse the SAME FRAG offsets, so the
   fragments that leave at u3 are literally the ones that arrive at E3. Building a new scatter
   would break a payoff that is already shipping.
   THREE CONSTRAINTS ON THIS BEAT, all binding:
   a. Stage it as SURVIVAL BY SCATTERING, never as omnipotence. GPAHE 2023 found deplatforming
      partly WORKED. An all-powerful apparatus would be both inaccurate and against the piece's own
      laws (the respite is never a trap; the Close is solidarity, not defeat).
   b. NO REAL ORGANISATIONS IN THE FICTION. GPAHE names real companies; they belong to dossier and
      provenance surfaces only. The scene keeps its invented marks (Restorify → GracePlatform).
   c. The changelog may now say what actually happened — the program didn't end, it moved into the
      platform — and that claim carries `status: documentary`. This is also WHY the rooms open:
      the apparatus stopped being a place you go to. Don't explain it in copy; stage it.

LAWS: updates are triggered by documented system failures, NEVER by the player (SCRIPT_UPDATE v0.5
§1) — the collapse already happened in S2R.5, so the trigger is the apparatus's own failure, not the
player's action. All new copy ships PLACEHOLDER-draft. Leave/pause live throughout. Nothing scored.

FILES YOU MAY TOUCH: src/desktop/apps/update.ts (THE UPDATE RITUAL LIVES HERE — essential for
items 2 and 6), src/desktop/os.ts, src/narrative/spine.ts, src/narrative/belongings.ts,
data/strings/updates.json, data/dialog/s2_caleb.json (the seam only, not the felt copy),
src/witness/intake.ts (the migration filing), src/engine/app.ts (relocation/belongings geometry),
src/debug/panel.ts (any new beat — C6 fails otherwise), docs/reinterp/01_SESSION_LOG.md.
READ/IMPORT ONLY, DO NOT EDIT: src/desktop/apps/lambyChar.ts (consume drawLambyChar; it is shared
with the rig lab and Just Change), src/room/era3Devices.ts (read it to match the arrival).
NOT: src/desktop/apps/caleb.ts or accountability.ts (the felt modules are settled — S45's register
boundary is load-bearing), data/provotypes/**, any dossier text.

ACCEPTANCE: played LINEARLY with real clicks from the E2 arrival through to standing in Room 2 —
check-in → Caleb → commit → alert → video → PureMail → residue → the era ends → u3 ritual →
belongings → restart → Room 2. State in the log how the residue connects to the ending and why.
The migration filing appears in the witness record. Add any new beat to the debug panel (check-spec
C6 fails otherwise). npm test + npm run build green; baselines unaffected.
GIT DISCIPLINE (mandatory): explicit pathspecs only — `git commit -- <your files>`; never bare
`git commit` or `git add -A`; check `git status --short` first.
Blocked ≠ improvise: STOP and log BLOCKED. If D31 is unstruck, that is not a blocker for items 1-5.
```
