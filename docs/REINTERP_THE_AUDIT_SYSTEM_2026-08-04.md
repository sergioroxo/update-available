STATUS: live

> **⚑ BUILT — Session 72, 2026-08-04.** L3 and L4 are in `tools/shots.mjs`; `npm run audit` runs
> L1 + L2 + L3 + L4 as one command. **Five of the six assertions are live**, each ratcheted at a
> measured value; **assertion 6 (reachability on the ordinary path) was NOT built** and says so in
> every report. `tools/harness/` is retired to a tombstone.
>
> The first real run found **four comfort violations nothing had ever measured** — the entrance
> descent at 0.497 m/s (1.2× the envelope the same file claims it meets) and the scripted-send dolly
> at 4.4–6.9 m/s (10–16×, latent: no beat fires the seam yet). Both are REPORTED with exact proposed
> durations and **nothing was applied.** Findings and numbers: `docs/reinterp/01_SESSION_LOG.md`
> Session 72.

# THE AUDIT SYSTEM — catching it before Sérgio has to
*Sérgio, 2026-08-04: "We for sure will have in the future to make a system of analysis and audit for
the experience so we can catch errors in time."*

## ⚑ The case, made from this project's own last four sessions

Every check this repo has is **static or geometric**. Every error that has actually reached Sérgio
was **experiential** — something you only find by rendering a frame and looking at it:

| Found by looking | Which check would have caught it? |
|---|---|
| "the room photographs as brown mud" — Room 2 had one invisible ceiling omni | **none** |
| the desk/PC assembly reading as unlit black blocks | **none** |
| the material law had never applied to Rooms 2 or 3 (83 props fell through to `set`) | **none** |
| Maya's screen blank at the E4 home seat | **none** |
| the desk sits 45.7–50.9° below a 21° half-FOV | **none** |
| E3→E4 running at 3.667 m/s — **8.5× the comfort envelope** — under a comment describing a rise the code never performed | **none** |
| eight `terminalFrame` console asserts | **none** |
| the tablet could not be clicked at its own seat | **none** |
| 63 draw calls against a ≤60 budget | **none** |

**Nine faults, zero coverage.** Meanwhile `check-spec` C1–C8 and `room-audit.mjs` between them are
now genuinely good at the classes they *do* cover — and those classes stopped recurring the moment
they were machine-checked. **That is the argument: this project's checks work. There just aren't
enough of them, and the missing tier is the visual one.**

## ⚑ And the specific waste, which is urgent rather than theoretical

**The capture rig has been written three times and thrown away three times** — S69, S70 part 2, S71 —
because each session built it in its own scratchpad. It was recovered from S71's scratchpad on
2026-08-04 and is now in `tools/harness/` (see its README). **A fourth session would have written it
a fourth time.**

That is the whole problem in one artefact: *the verification capability exists, and it evaporates
between sessions.*

---

# The five tiers

| tier | what it checks | state |
|---|---|---|
| **L1 · static** | invariants, register laws, dossier status, doc lifecycle, panel completeness, prompt lifecycle | ✅ **built** — `check-invariants` + `check-rooms` + `check-spec` C1–C8 |
| **L2 · measured geometry** | prop-in-prop, prop-through-wall, floating props, rendered-vs-authored scale | ✅ **built** — `tools/room-audit.mjs` (S71), agrees with the live engine to 0.00000 m |
| **L3 · capture** | render every seat × era × room + the overlooks, and every device canvas, to real files | ✅ **built** (S72) — `tools/shots.mjs sweep` / `devices` / `sheet`; holds no camera numbers of its own |
| **L4 · assertions over L3** | ⚑ **the missing tier.** Comfort, budget, blank frames, subject-in-frame, console asserts | ✅ **5 of 6 built** (S72) — `tools/shots.mjs audit`; assertion 6 (reachability) NOT built |
| **L5 · the human pass** | does it *mean* anything; is the register right; does it work in a headset | 🔒 **irreplaceable — Sérgio, and A11** |

**L4 is the whole proposal.** L3 makes frames; L4 is what turns frames into a build failure.

## ⚑ L4 — the six assertions, all cheap, all derived from real faults

1. **THE COMFORT ENVELOPE.** Sample the live camera rig through every driven leg; fail if peak
   exceeds **0.43 m/s** or **9.1 °/s**. `tools/harness/relocmeasure.mjs` already does the sampling —
   it just needs a threshold and an exit code. **This is the single highest-stakes check in the piece
   and it currently exists only as a number a session happened to measure by hand.** E3→E4 shipped at
   8.5× the envelope for weeks.
2. **THE DRAW-CALL CEILING.** Peak calls across every transition, ratcheted. Currently 62 against a
   ≤60 budget — so the baseline starts at 62 and nags downward, exactly like the palette ratchet that
   went 157 → 33.
3. **⚑ THE BLANK-FRAME CHECK, and it is the clever one.** A captured frame whose luminance variance
   is near zero **is an unlit block or a dead screen.** That one statistic catches "reads as unlit
   black blocks", "photographs as brown mud" and "Maya's screen is blank" — three of Sérgio's own
   reports — for about twenty lines of code.
4. **SUBJECT-IN-FRAME.** Each seat declares what it is *for*; assert that thing's projected position
   sits inside the FOV. Catches the desk seat framing its subject 45–51° below a 21° half-FOV.
5. **CONSOLE ASSERTS = 0.** S71 got the eight `terminalFrame` asserts to zero. Nothing currently
   stops them coming back. `tools/harness/asserts.mjs` already counts them.
6. **REACHABILITY ON THE ORDINARY PATH.** C6 proves every beat has a debug button. Nothing proves a
   beat is reachable *without* one — which is precisely the S64 class of bug where `?era=` killed the
   spine and three playthroughs were misled.

## The design rules, taken from what has already worked here

- **⚑ RATCHETS, NOT PERFECTION.** Every numeric check starts at today's real value and fails on
  growth. The palette ratchet went 157 → 33 because it nagged instead of blocking. A check that
  fails on day one gets disabled on day one.
- **ONE COMMAND.** `npm run audit` — L1 + L2 + L4, with L3 captured underneath it. If it takes three
  commands and a dev server, it will be run once.
- **NO NEW RUNTIME DEPENDENCIES.** `room-audit.mjs` is dependency-free and that is why it will be run
  again. The harness needs `puppeteer-core` + the system Chrome; keep it a **devDependency and
  optional**, so `npm test` never depends on a browser.
- **REPORT, DON'T REDECORATE.** L2's rule holds for L4: fix what is provably wrong by measurement,
  propose what is taste. Nothing in this system may retune a composition on its own.
- **⚑ IT REPLACES NOTHING.** L5 is not automatable. This catches regressions so that Sérgio's
  attention goes to whether the piece *means* what it should — and **A11, the in-headset pass, has
  still never run**, so every comfort number in this repo remains desktop-measured.

---

# Beyond L4 — the two that are not checks

**The experience log.** L1–L4 catch faults. They cannot tell you the piece got worse. A per-session
record of *what a playthrough feels like at each era* — which is what Sérgio's play passes already
are — is the only instrument for that, and it exists as prose in the session log rather than as
anything comparable over time.

**The Dossier's evidential health.** C1 checks that a card *has* a status. Nothing checks whether the
sources behind `documentary` are still verified, or that `[VERIFY SOURCE]` markers are being retired
rather than accumulating. The Close constellation's topology is *still* flagged decorative-not-real.
That is an audit of a different kind, and it is the one the article will be judged on.

---

# ⚑ WHAT I WOULD DO FIRST, IF ONLY ONE THING

**Land the capture rig and the comfort check.** Everything else is worth doing; those two are worth
doing now:
- the rig, because it has already cost three sessions and would have cost a fourth;
- the comfort check, because it is the only law in this piece that can hurt a person, it protects
  the one bodily ask the work is built on, and it has already been violated by 8.5× in shipped code
  without anything noticing.
