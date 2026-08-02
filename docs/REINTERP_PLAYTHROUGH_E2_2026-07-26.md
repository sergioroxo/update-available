STATUS: live

# PLAYTHROUGH — Era 2, end to end (Sérgio, 2026-07-26)
*His fullest review yet: ~30 findings. Triaged against the code before grouping. **A large cluster
shares ONE root cause — the debug ERA button is a geometry-only jump that desynchronises the spine,
the OS and the room.** That is good news (the build is less broken than the session felt) and bad
news (the review tooling misled him — the third time in this project).*

---

## ⚑ ROOT CAUSE #1 — the debug ERA button doesn't move the narrative, only the furniture

`src/engine/app.ts:1697` wires the panel's era buttons as:
```
onEra: (era) => driveMorph(era)
```
`driveMorph` **only morphs the room geometry.** The real transition path is `os.onEraShift`
(`app.ts:328–331`), which calls `driveMorph` **and** `spine?.onEra(era)`.

**And worse** — `app.ts:325–327`:
```
const reviewMode = !!(options.era || options.close || options.reveal || options.morphDemo);
if (!reviewMode) spine = createSpine(os, …);
```
**With `?era=` in the URL, the narrative spine is never created at all.** No sends, no updates, no
era transitions — the conductor is absent.

**This single fault explains, or partly explains:**
- **"The whole experience is locked, nothing lets you advance"** — with the spine absent or stuck in
  an E1 step, u3 can never arm. *Not an S57 bug: S57 verified the LINEAR path end to end with real
  clicks. Sérgio's path was the debug jump.*
- **"Service Transition doesn't appear by itself, had to go to debug."** Same cause.
- **"The witness board is still behind us"** and **"a yellow cassette tape is still on the shelf"** —
  E1 room state was never retired, because no era shift occurred.
- **"GracePlatform… is installing on the Era-2 session"** and **"pressing Daniel's computer changes
  the screen"** — stale E1/E2/E3 state mixed together.

**Fix:** the era buttons must drive the REAL transition (`os.onEraShift`), and `?era=` must not
silently kill the spine — or, if review mode genuinely needs no spine, the panel must say so on
screen. **Until this is fixed, no playthrough via the era buttons can be trusted**, and we will keep
mistaking tooling artifacts for content bugs.

## ⚑ ROOT CAUSE #2 — an authoring note is shipping to the player
`data/strings/slice.json:127`:
```
"note": "NOTE: [researcher note — Sérgio's voice, to write]",
```
That is a **note-to-self rendering as in-game text.** Sérgio: *"Why is there a Dossier on the
Desktop? Makes no sense and it says my name? 'Researcher note — Sérgio voice' — like please no."*
He is right: it breaks the fiction and puts the author's name inside the piece.
**Two fixes needed:** (a) remove/replace that string; (b) a **check-spec C7** that fails when any
player-visible string contains authoring markers (`PLACEHOLDER`, `to write`, `Sérgio`, `TODO`,
`[VERIFY SOURCE]`, `researcher note`). This is the same lesson as C5/C6 — if it can leak silently,
it will.

**✅ THE DOSSIER ITSELF — ANSWERED.** Sérgio: *"I think it can stay as like an easter egg with a
different name and like an explainer of the program."* So it is **kept, renamed, and repositioned**
— not cut. It becomes a **diegetic explainer of the program**, found rather than served, in the same
family as `lamby_rig.exe` (S55): an unremarked file on the desktop that rewards looking. The tactic
content he called interesting survives; what dies is the authoring voice and the front-and-centre
placement. **Rules inherited from the S55 easter egg:** never advertised, never rewarded, never
during a `felt` scene, filed silently. **Sérgio owns the new name and its copy** (it is in-world text).

---

## REAL FINDINGS (independent of the tooling fault)

### A · The E2 arrival doesn't introduce Lamby
1. **"Welcome Back Daniel" typeface is not visible enough.** Legibility fix.
2. **No boot sequence for the new LambyOS version** — no boot sound, no jingle. E1 had one; E2's
   version change passes unmarked.
3. **⚑ Lamby is never PRESENTED.** He simply appears. Sérgio: *"we need to be presented to Lamby…
   it doesn't make much connection with the overall experience."* This is the biggest narrative gap
   in the era — his debut is the whole point of E2's guidance lineage.
4. **Lamby should present RESTORIFY to us.** Right now the two feel like competing systems; Lamby
   introducing the program resolves the conflict and gives him a job on arrival.

### B · Restorify / the check-in
5. **"Not Now" on the Daily Realignment — what does it do?** (See the dead-button cluster below.)
6. ✅ **Its background colour differs from the desktop — KEEP** (his explicit note).
7. **"How was your walk" resolves into nothing** — the card vanishes and jumps to the Messenger with
   nothing said. It needs a response.
8. **No notification that a message arrived.** Lamby should tell you, so opening the Messenger is
   motivated. *More guidance needed here generally.*

### C · The Caleb thread
9. **Replies should be attributed to "Daniel"** — the piece knows his name; the chat should use it.
10. **"Click to Reply" appears while Caleb is still typing** — you must wait for the boxes anyway,
    so the affordance lies. Show it when it's true.
11. ✅ **Sad Lamby — loved.**
12. **✅ ANSWERED — the dead buttons.** Sérgio: *"the 'not now' either should be greyed out or just
    do the same as continue."* So: **no branching, no invented consequence.** And his simpler answer
    is the better one — **a greyed-out "not now" is honest and carries the thesis:** the apparatus
    displays an option that is not one. *You may not decline this.* That says more as UI than a
    hidden ledger difference would. **Pick greyed-out where the beat is coercive** (the "we'll get
    the days back" reassurance, the "don't be discouraged" pop-up); make it a plain synonym for
    continue only where greying would read as a bug. Do NOT invent divergent paths.
13. **Lamby's second pop-up uses a DIFFERENT SYMBOL** — is that intended? Reads as inconsistent.

### D · NetVision — mostly working
14. ✅ **"Great."** ✅ **Three steps — amazing.** ✅ **Karaoke bubble — so great.**
15. **Each image needs more animation** — the shots are static.
16. **✅ ANSWERED — the seals are DRTV OFFER-SCREEN FURNITURE.** Sérgio sent a reference: a classic
    late-night infomercial end-frame with **$29.99**, payment-card logos, *"Please allow 6-8 weeks
    for delivery / Express delivery for U.S. only / Terms and conditions may apply"*, **ORDER NOW!**,
    a website, a 1-800 number, and a gold **"30 DAY MONEY BACK GUARANTEE"** rosette.
    So the offer screen needs that whole apparatus of trust: the guarantee rosette, the card badges,
    the delivery fine print, the phone number. **Why this is more than dressing:** it puts *"three
    easy payments of yourself"* into its native visual grammar — and a **money-back guarantee on
    selfhood** is the single most damning object the era could put on screen. The satire is entirely
    in the apparatus's self-presentation, exactly as the tone law requires.
    ⚑ **ETHICS: the card logos in the reference are REAL BRANDS (Visa, Mastercard, AmEx, Discover).
    Every badge must be INVENTED** — same rule as everything else in the fiction.
17. **⚑ Caleb's toast arrives too early** — it covers the end-of-video disclaimer scroll (*"a great
    text"*), then disappears with no way to interact. **Move it after the scroll**, and make it
    persistent/actionable rather than a flash.

### E · PureMail / Accountability — the confused moment
18. **The Accountability window pops back when PureMail opens — why?** Two things compete for
    attention with no way to choose.
19. **It says "now playing" — playing WHAT?** Unexplained state.
20. **"1 new message — C___" in the system bar is barely visible AND not clickable.** He tried to
    open it and couldn't. Either it's an affordance or it isn't.
21. **⚑ Lamby should READ the PureMail message aloud.** *This is exactly what S46's TTS pipeline was
    built for* — `lamby_puremail_apology.wav` already exists, rendered and committed. **It is built
    and not wired.** Highest value-per-effort item in the list.

### F · The residue
22. **After "Continue", Caleb's messages were cleared — did he say anything or not?** The
    un-redaction beat did not read.
23. ✅ **Scanlines — loved.** ✅ **The residue line as a button — loved.**
24. **It needs a drop shadow** so it reads as clickable.
25. **⚑ On click it "appeared repeated on the screen and jumped back to the Restorify desktop."**
    That is a bug — and it's also where the era should have ended. Needs diagnosis with the spine
    actually running.

### G · The u3 transition
26. **"Remind me later" — what does it do?** (Law says it works ONCE; unclear in play.)
27. **GracePlatform opens barebones, says 2016, "a design that makes no sense", and installs on the
    Era-2 session.** Partly root-cause #1; the barebones look may be real.
28. ✅ **"Absolutely LOVED the Lamby deletion animation."** — the dispersal lands.
29. **The transition needs explaining** — focus on the update and Restorify; **GraceProgram should
    load on VERA's computer**, not Daniel's.
30. **⚑ The fly-over must be SLOWER** — *"let you see the room being built, so you understand the
    new space and the passage of time."* The relocation is currently too fast to read as a change
    of life.
31. **Era 3 shouldn't start without the computer's boot-up** — same missing-boot note as E2 (#2).
32. **The witness panel is still visible in Room 2.**

### H · Room 2's details (his doodles)
33. **A black rectangle in the ceiling** — *"a black square in the sky"*, unexplained.
34. **Circled as "weird":** a pale blue rectangle and a pink strip on the wall, the left-hand
    monitor, a beige box on the floor, the chair base. Room 2's dressing needs a pass.

---

## Suggested order
1. **S58 — Fix the review tooling** *(small, and everything depends on it)*: era buttons drive the
   real transition; `?era=` doesn't silently kill the spine; add **C7** for authoring-marker leaks;
   remove the `slice.json:127` note. **Then re-play before building anything else** — several
   findings above may evaporate, and we should know which.
2. **S59 — The E2 arrival + the desktop's introduction layer**: LambyOS boot + jingle, Lamby's
   presentation of himself and of Restorify, the "Welcome back Daniel" legibility fix, the message
   notification, the walk-card response — and the **dossier rebuilt as a renamed diegetic easter-egg
   explainer** (root cause #2), since that is also "what the E2 desktop presents". The era's missing
   front door.
3. **S60 — The dead buttons, the PureMail moment, and the NetVision offer screen**: grey out "not
   now" (never invent divergent paths), wire the **already-built** Lamby TTS to PureMail, fix the
   taskbar affordance, move Caleb's toast after the disclaimer scroll, add the residue drop shadow,
   diagnose the residue click — **plus the DRTV offer-screen seals (#16) and per-shot animation
   (#15)**, which belong here because they share `netvision.ts` with the toast fix and would
   otherwise collide.
4. **S61 — The transition**: slow the fly-over so the room builds visibly, GraceProgram on Vera's
   machine, E3 boot sequence, retire the witness panel in Room 2, Room 2 dressing pass.

## ✅ All three questions answered by Sérgio, 2026-07-26
1. **The seals** → DRTV offer-screen furniture (guarantee rosette, card badges, fine print, 1-800
   number), with every badge INVENTED. → **S60**
2. **The dossier** → kept, renamed, repositioned as a diegetic easter-egg explainer of the program.
   → **S59**
3. **The dead buttons** → greyed out, or a plain synonym for continue. **No invented paths.** → **S60**

## ✅ #13 answered too (2026-07-26)
Sérgio: *"maybe a slip and we should try for cohesion."* → **ONE Lamby mark everywhere.** Any
second symbol is a slip; unify on the `lambyChar.ts` character (already the single source since S48,
shared with the rig lab and Just Change). → **S60**

---

# THE PROMPTS — paste-ready, in order
*Run **S58 first and re-play before the rest**: until the era buttons drive the real transition, we
cannot tell tooling artifacts from content bugs, and several findings above may simply evaporate.
Run **one session at a time** (shared worktree = shared git index — see the S43/S44 postmortem).*

## S58 — FIX THE REVIEW TOOLING · Sonnet 5, high effort · **RUN FIRST**
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Tooling session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch
reinterp, ?reinterp=1&debug=1). Read CLAUDE.md, docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md (ROOT
CAUSE #1 and #2 are the spec), src/engine/app.ts (lines ~320-335 and ~1690-1700),
src/narrative/spine.ts, src/debug/panel.ts, tools/check-spec.mjs (match its idiom — C5/C6 are the
model), and the tail of docs/reinterp/01_SESSION_LOG.md.

THE PROBLEM: Sérgio played Era 2 through the debug panel and reported the experience as locked, with
stale props and mixed era state. It was mostly the TOOLING. app.ts:~1697 wires the panel's era
buttons as `onEra: (era) => driveMorph(era)` — geometry only — while the real path (os.onEraShift,
~line 328) calls driveMorph AND spine?.onEra(era). And `reviewMode` (~line 325) is true whenever
?era= is present, which skips createSpine ENTIRELY: no sends, no updates, no transitions. A review
tool that misrepresents the build is worse than none — this is the third time it has cost a session.

SCOPE:
1. THE ERA BUTTONS MUST DRIVE THE REAL TRANSITION. Route them through the same path a real
   playthrough takes (os.onEraShift), so the spine advances, the OS shifts era, and E1 room state
   retires. Verify by clicking to E2 and confirming: no witness board behind you, no E1 cassette on
   the shelf, and the spine actually in an E2 step.
2. ?era= MUST NOT SILENTLY KILL THE SPINE. Either create the spine in review mode too (seeded to the
   requested era), or — if review genuinely needs it off — SAY SO ON SCREEN in the panel ("spine
   disabled — transitions will not fire"). Silence is what cost a whole playthrough. Choose, and
   argue the choice in the log.
3. check-spec C7 — THE AUTHORING-MARKER LEAK DETECTOR. Fail when any PLAYER-VISIBLE string in data/
   contains an authoring marker: "PLACEHOLDER", "to write", "TODO", "Sérgio", "[VERIFY SOURCE]",
   "researcher note", "FIXME". Keys beginning "_" (_doc/_note/_state) are authoring metadata and are
   EXEMPT — that is the whole distinction. Follow C1-C6's idiom and PROVE the failure mode by real
   mutation-and-revert.
4. FIX THE KNOWN LEAK: data/strings/slice.json:127 renders
   "NOTE: [researcher note — Sérgio's voice, to write]" to the player. Remove that string. Do NOT
   rewrite the dossier around it — S59 owns repositioning it as a renamed easter egg. If removing it
   leaves a hole, leave the hole and say so.
5. While you are in there: os.ts's `netvisionBreak` debug jump seeks `duration - 3`, which at the
   video's current 114s lands at 111s — deep in the tear, not at the break's start. Fix it to land
   ON the break (~100.3s). It is how the break gets reviewed.

FILES YOU MAY TOUCH: src/engine/app.ts, src/debug/panel.ts, src/desktop/os.ts (the debug jump only),
tools/check-spec.mjs, data/strings/slice.json, README (checker table row),
docs/reinterp/01_SESSION_LOG.md. NOT: any other data file, src/desktop/apps/**, src/narrative/**
(read spine.ts, do not edit it).

ACCEPTANCE: clicking the panel's E2 button produces the SAME state a linear playthrough reaches —
prove it by comparing, and state in the log what you compared; C7 green with its failure mode proven
by mutation-and-revert; the leak is gone; netvisionBreak lands on the break. npm test + npm run build
green; baselines unaffected.
GIT DISCIPLINE (mandatory): explicit pathspecs only — `git commit -- <your files>`; never bare
`git commit` or `git add -A`; check `git status --short` first.
Blocked ≠ improvise: STOP and log BLOCKED.
```

## S59 — THE E2 ARRIVAL (the era's missing front door) · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (…/update-available-reinterp, branch reinterp, ?reinterp=1). Read
CLAUDE.md (register laws + the Assistant laws — Lamby's debut is governed by them),
docs/ETHICS_CONSTRAINTS.md, docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md §A and §B (the spec),
docs/REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md S2R.0-S2R.2, src/desktop/os.ts's E2Stage machine,
data/dialog/s2_lamby.json, and the tail of docs/reinterp/01_SESSION_LOG.md.

THE PROBLEM (Sérgio's words): "there is no boot up sequence for the new version of LambyOS… we need
to be presented to Lamby, if not it doesn't make much connection with the overall experience. Also it
may create a bit of conflict with the overall Restorify system, so Lamby needs to present it to us."
Era 2 currently starts and Lamby is simply THERE. His debut is the whole point of the era's guidance
lineage, and it is unmarked.

SCOPE:
1. THE LAMBYOS BOOT SEQUENCE. E1 boots with a crawl; E2's version change passes unmarked. Give E2 its
   own boot — the machine has been UPDATED, and the boot should say so. Include its boot sound/jingle
   (audio may be a committed placeholder; if none exists, leave a clean hook and log it rather than
   inventing an asset).
2. ⚑ LAMBY IS PRESENTED. He introduces himself — briefly, in character, within the Assistant laws
   (≤2 lines per conduction beat, never during a felt scene, dismissal always works and is logged).
   This is the debut the whole lineage hangs on.
3. LAMBY PRESENTS RESTORIFY. Sérgio: the two currently read as competing systems. Lamby introducing
   the program resolves that and gives him a job on arrival — he is the face; Restorify is the
   apparatus he speaks for.
4. "WELCOME BACK DANIEL" LEGIBILITY — the typeface is not readable enough. Fix without restyling the
   era's chrome.
5. GUIDANCE AT THE MESSENGER SEAM: (a) the "how was your walk" card currently resolves into NOTHING
   — it vanishes and jumps to the Messenger; it needs a response. (b) Lamby should NOTIFY the player
   that a message arrived, so opening the Messenger is motivated rather than guessed at.
6. THE DOSSIER, REBUILT AS AN EASTER EGG (Sérgio, 2026-07-26): "it can stay as like an easter egg
   with a different name and like an explainer of the program." Keep the tactic content, kill the
   authoring voice and the front-and-centre placement. It becomes a diegetic explainer FOUND on the
   desktop — same family as S55's lamby_rig.exe, and inheriting its rules: never advertised, never
   rewarded, never reachable during a felt scene, filed silently. ⚑ THE NEW NAME AND ITS COPY ARE
   SÉRGIO'S (in-world text) — ship a PLACEHOLDER-draft name and flag it for his pass.

LAWS: all new copy ships PLACEHOLDER-draft. Lamby never appears in a felt scene. Nothing is scored.
Leave/pause live throughout.

FILES YOU MAY TOUCH: src/desktop/os.ts, data/dialog/s2_lamby.json, data/strings/slice.json,
src/desktop/apps/restorify.ts, src/audio/tapeAudio.ts (boot sound registration only),
public/assets/audio/** (only if a real asset exists to commit), src/debug/panel.ts (new beats — C6
fails otherwise), docs/reinterp/01_SESSION_LOG.md. READ/IMPORT ONLY: src/desktop/apps/lambyChar.ts.
NOT: src/desktop/apps/caleb.ts or accountability.ts (S60 owns them), src/engine/app.ts,
data/provotypes/**.

ACCEPTANCE: a linear E1→E2 run (NOT a debug jump — S58 must have landed first) plays: update →
LambyOS boot with its jingle → Lamby introduces himself → Lamby presents Restorify → check-in → the
walk card ANSWERS → Lamby notifies you of the message → Messenger. "Welcome back Daniel" is legible
at the seat. The dossier is findable, renamed, and never advertised. npm test (C7 will catch
authoring markers) + npm run build green.
GIT DISCIPLINE (mandatory): explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```

## S60 — THE DEAD BUTTONS, PUREMAIL, AND THE OFFER SCREEN · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (…/update-available-reinterp, branch reinterp, ?reinterp=1). Read
CLAUDE.md (register laws), docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md §C-§F (the spec),
docs/REINTERP_E2_CALEB_SCRIPT_DRAFT_2026-07-24.md, src/desktop/apps/caleb.ts,
src/desktop/apps/accountability.ts, src/desktop/apps/netvision.ts, src/audio/tapeAudio.ts, and the
tail of docs/reinterp/01_SESSION_LOG.md.

⚑ THE REGISTER BOUNDARY IS LOAD-BEARING (S45): caleb.ts holds the FELT surfaces and imports no Lamby
renderer, no Lamby strings, and draws no mark; accountability.ts holds the OPERABLE intrusions and is
the only module that imports the Lamby character. You may EDIT both — you may NOT blur that line.

SCOPE:
1. THE DEAD BUTTONS (Sérgio's ruling): "the 'not now' either should be greyed out or just do the
   same as continue." NO branching, NO invented consequence, NO divergent ledger paths. Prefer
   GREYED OUT where the beat is coercive (the "we'll get the days back together" reassurance; the
   "don't be discouraged" pop-up) — a visibly inert option is HONEST and carries the thesis: the
   apparatus displays a choice that is not one. Use a plain synonym for continue only where greying
   would read as a bug.
2. ONE LAMBY MARK EVERYWHERE (Sérgio: the second symbol is "a slip and we should try for cohesion").
   Unify on lambyChar.ts's character — it has been the single source since S48. Import it; do not
   fork or re-draw.
3. ⚑ WIRE THE PUREMAIL READ-ALOUD. This is BUILT AND UNWIRED: S46 rendered and committed
   public/assets/audio/lamby_puremail_apology.wav and registered it in tapeAudio.ts with a playOnce()
   helper. Lamby reads the apology in his own voice — the apparatus narrating its own death notice.
   Highest value-per-effort item in the review. Missing-file-safe (a missing WAV must degrade
   silently, per Session 30's pattern).
4. THE PUREMAIL MOMENT IS CONFUSED. (a) The Accountability window pops back when PureMail opens —
   two things compete with no way to choose; decide which owns the screen and say why in the log.
   (b) It says "now playing" — playing WHAT? Either make it true or remove it. (c) "1 new message —
   C___" in the taskbar is barely visible AND not clickable; Sérgio tried to open it. Make it a real
   affordance or remove it — do not leave a lie.
5. THE RESIDUE. (a) Add a drop shadow so the line reads as clickable (Sérgio loves the beat, could
   not tell it was a button). (b) DIAGNOSE: on click it "appeared repeated on the screen and jumped
   back to the Restorify desktop." That is a bug — reproduce it with the spine RUNNING (S58 first),
   fix it, and say what it was. (c) After Continue, Caleb's messages were cleared and Sérgio could
   not tell whether he had said anything — the un-redaction beat is not reading. Make it read.
6. THE CALEB CHAT. (a) Attribute the player's replies to "Daniel" — the piece knows his name.
   (b) "Click to Reply" shows while Caleb is still typing; show it only when it is true.
7. NETVISION — the offer screen and the shots. (a) THE SEALS, per Sérgio's reference: the DRTV
   end-frame apparatus of trust — a "money-back guarantee" rosette, payment-card badges, the delivery
   fine print, ORDER NOW!, a phone number. It puts "three easy payments of yourself" in its native
   grammar, and a money-back guarantee on SELFHOOD is the most damning object the era can show.
   ⚑ EVERY BADGE MUST BE INVENTED — his reference shows real card brands (Visa/Mastercard/AmEx/
   Discover) and those may never appear in the fiction. (b) Each shot needs more ANIMATION; they are
   static. Keep the existing scanline/noise/tear vocabulary — he loves it; do not restyle.
   (c) Caleb's toast arrives too early and COVERS the end-of-video disclaimer scroll ("a great text")
   then vanishes unusably. Move it AFTER the scroll and make it persistent/actionable.

FILES YOU MAY TOUCH: src/desktop/apps/caleb.ts, src/desktop/apps/accountability.ts,
src/desktop/apps/netvision.ts, src/desktop/os.ts, src/audio/tapeAudio.ts,
data/dialog/s2_caleb.json, data/dialog/s2_media.json, docs/reinterp/01_SESSION_LOG.md.
READ/IMPORT ONLY: src/desktop/apps/lambyChar.ts. NOT: src/engine/app.ts, src/narrative/**,
data/provotypes/**.

ACCEPTANCE: played at REAL SPEED with sound, linearly, with the spine running. Every "not now" is
either visibly inert or a plain continue. One Lamby mark. Lamby AUDIBLY reads PureMail. The taskbar
message either opens or is gone. The residue reads as clickable and its click bug is fixed and
explained. The offer screen carries invented seals. npm test + npm run build green.
GIT DISCIPLINE (mandatory): explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```

## S61 — THE TRANSITION AND ROOM 2 · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (…/update-available-reinterp, branch reinterp, ?reinterp=1). Read
CLAUDE.md (comfort law + aesthetic laws), docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md §G and §H (the
spec), docs/REINTERP_INFRASTRUCTURE_SPINE_2026-07-25.md (why the rooms open — the transition should
EXPRESS this), src/engine/app.ts, src/room/era3Devices.ts, src/desktop/apps/update.ts, and the tail
of docs/reinterp/01_SESSION_LOG.md.

THE PROBLEM: the E2→E3 handoff exists but does not READ. Sérgio: "needs a better explanation of the
transition… the GraceProgram should load on Vera's computer. Also the fly over needs to be slower and
let you see the room being built so you understand the new space and the passage of time."

SCOPE:
1. ⚑ SLOW THE FLY-OVER, AND LET THE ROOM BUILD. This is the session's centre. The relocation to Room
   2 is currently too fast to read as a change of life. Slow it, and stage it so the player SEES the
   new space assemble — six years and a different person. The comfort law binds (this is artificial
   locomotion): slow, eased, no roll, no simultaneous fast translation+rotation; state your measured
   peak linear and angular rates in the log, as S53 did.
2. GRACEPROGRAM LOADS ON VERA'S COMPUTER, not Daniel's. Right now the E3 platform installs into the
   Era-2 session, which is why it read as "installing on the Era-2 session… a design that makes no
   sense." The install belongs to the machine you arrive at.
3. ERA 3 NEEDS ITS BOOT. Sérgio: "we shouldn't start without the boot up on the computer." Same note
   as E2's missing boot — the new era's machine should start in front of you.
4. "REMIND ME LATER" — the law says it works ONCE; in play it is unclear what it does. Make its
   behaviour legible (and confirm the once-only rule actually holds).
5. RETIRE THE WITNESS PANEL IN ROOM 2 — it is still visible there.
6. ROOM 2 DRESSING PASS. From Sérgio's annotated screenshot, these read as wrong or unexplained:
   a black rectangle in the CEILING ("a black square in the sky" — unexplained), a pale blue
   rectangle and a pink strip on the wall, the left-hand monitor, a box on the floor, and the chair
   base. Diagnose each (misplaced? mis-scaled? sunk through a surface? a leftover from another era?)
   and fix. NOTE the pattern from S52/S54/S56: prop bugs in this project are usually a stale measured
   height or an override silently dropping a field — measure against the real mesh, do not guess.

FILES YOU MAY TOUCH: src/engine/app.ts, src/room/*.ts, src/desktop/apps/update.ts,
src/desktop/os.ts, data/room/*.json, data/strings/updates.json, docs/reinterp/01_SESSION_LOG.md.
NOT: src/desktop/apps/caleb.ts, accountability.ts, netvision.ts (S60 owns them), data/provotypes/**.

ACCEPTANCE: a linear run through u3 into Room 2, watched AT REAL SPEED, in which the fly-over reads
as a passage of time and the room visibly assembles; GraceProgram installs on Vera's machine; Era 3
boots in front of you; no witness panel in Room 2; every circled prop resolved with a stated cause.
Measured comfort rates logged. npm test + npm run build green; baselines unaffected. VR remains
unverified here (no XR entry point) — say so plainly.
GIT DISCIPLINE (mandatory): explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```
