STATUS: live

# JUST CHANGE — the arcade game · and lamby_rig.exe — the easter egg
*REWRITTEN 2026-07-25 on Sérgio's redirect. My first Part 1 was wrong: I built it on the Witness
side and the provotype grammar, and he said no — "it doesn't need to be about the Witness side…
Lamby should be a ridiculous game, that helps understand that Update-Available is about the DIGITAL
aspects of SOGICE… a fun way to explore game styles and genres." Part 2 he liked and wants developed.
Song rights: **cleared, no copyright issues** (his confirmation).*

---

# PART 1 · **JUST CHANGE** — an arcade game about the digital apparatus

**Form:** a standalone arcade game on its own GitHub Pages site under the *Just Change* name.
Ridiculous, playable, funny up front. **Not** a provotype, **not** the witness side, **no** cold
record. Four stages, one per era, running the **full 4:45 song**.

## The idea: the GENRE updates, era by era — and that IS the argument
The main piece's thesis is that the apparatus survives by **updating** — paper → software →
platform → ambient AI. So the game's own **genre updates with each era**, in the arcade idiom of
that moment. You aren't told the apparatus got smoother; you *play* it getting smoother, and the
smoothness is the horror.

| Stage | Era | Genre of its moment | You do | Lamby |
|---|---|---|---|---|
| **1** | **1997** floppy | maze / Snake — chunky, 4-colour, unfair | Steer a little figure down **the straight path**. Walls everywhere. You lose a lot. | A crude, half-drawn mascot. Barely animated. |
| **2** | **2003** Flash | whack-a-mole / clicker with a **streak counter** | Click the wrong thoughts before they reach the top. Faster, faster. | Now polished, bouncy, congratulating you. |
| **3** | **2016** mobile | endless runner + **gacha / IAP** | Collect grace tokens. Buy a booster: *"three easy payments of yourself."* | Push notifications. A daily login streak you didn't ask for. |
| **4** | **now** ambient AI | **the game plays itself** | Your inputs stop mattering. Lamby autocompletes your moves. A perfect score you didn't earn. | Everywhere. Serene. *"I'm always watching you."* |

**Stage 4 is the punchline and the thesis.** The endpoint of the digital apparatus is that it no
longer needs your participation — it will be well on your behalf. That lands as a *game-design*
joke (an idle game! a game with no player!) and as the argument at the same time. **This is the
collapse the tone law requires** — the satire is in Lamby's mascot self-presentation throughout, and
Stage 4 is where it curdles.

The **song drives the structure**: 4:45 across four stages, its cheerful refrain intact while the
mechanics rot underneath, and *"I'm always watching you"* arriving exactly as the automation takes
over. Word-timed `.lrc` is already in hand for on-screen sync.

## Why this is promotional in the right way
It's genuinely **fun and shareable** — four little games, escalating absurdity, a great mascot, a
banger. People share it for the joke. What they carry away is the shape: *it kept updating, and each
update was friendlier and worse.* Then the end card hands them the WebXR experience and
**SurvivingSOGICE**. The research arrives after the mechanism has been felt, not before.

## ⚑ The shared artifact (Sérgio's point 4)
> *"The Part 1 lives in a github page with the 'Just Change' and the 90s inside of the webXR."*

**Stage 1 also exists inside the WebXR piece** — as a period-correct floppy game on the Era-1
machine. Same game, two homes: in 1997 it's just a game a teenager has on a disk; on the *Just
Change* site it's Stage 1 of four, and you can see where it went. The piece and the promo share one
object across thirty years. That's the strongest link between them, and it costs almost nothing —
Stage 1 is the smallest stage, and E1's desktop already runs canvas apps.

## Laws that still bind (it carries the project's name)
- Satire targets **the apparatus, never queer people, never survivors**. Lamby is the joke; the
  player never is. The little figure you steer is never mocked.
- **No real organisations, people, or testimony** in the game. Invented marks only. Real material
  appears only on the end card, statused, as provenance.
- **No storage, no network, no analytics** — the same invariant as the piece. It must not do the
  thing it depicts, and the end card should say nothing was kept.
- **No win state that endorses the apparatus.** Stages can be *lost*; "winning" Stage 4 is the
  indictment, not a reward.
- Content note before it starts. Leave always available.
- **Sérgio's greenlight required** — it's a new public artifact under the project's name.

## Build shape
Standalone repo, Vite + TS + canvas (same stack, no framework), GitHub Pages. Reuses
`lambyChar.ts` so both Lambys stay one Lamby. Stage 1 authored so it can be dropped into the WebXR
E1 desktop unchanged. Each stage ~1 minute; total ≈ the song.

---

# PART 2 · **lamby_rig.exe** — the easter egg, developed

*He likes this one and wants the positioning worked out: "it can be there from the start of E2, or
as precursor inside E1 or even later. It needs a storytelling logic as well."*

## What it is
The rig lab (`?lambyrig=1`, which already exists) found as a **file the player wasn't meant to
open** — the apparatus's own puppet-rigging tool. Sliders for mood (`cheerful | clinical | sterile |
sad`), the motion vocabulary, the speech-bubble copy. **You can make Lamby look sad on demand.**

The revelation: Lamby's warmth is an **authored artifact**. Someone chose the deflate. Someone tuned
the guilt. The system's sincerity has a settings panel.

## ⚑ Where it goes — my recommendation: **E1, as a precursor**
Three options, and I think the answer is clear:

**A · E1 precursor (recommended).** Per the R28 amendment, **Lamby the character does not exist in
Era 1** — E1 has only impersonal system messages. So finding `lamby_rig.exe` on a 1997 machine means
**you meet the rigging tool before you meet the puppet.** It reads as a development artifact
someone left on the disk: unfinished, unlabelled, a half-drawn lamb that doesn't move well yet.

Why it's the strongest position:
- **It pays off twice, later.** At Lamby's E2 debut you *recognise* him — and you know he was built.
  Then at S2R.3C, when the sad face makes you feel guilty, **you have already moved that slider
  yourself.** The shame beat gets retroactively poisoned by something you did an era earlier, out of
  curiosity. Nothing else in the piece can do that.
- **It's an anachronism the player will notice**, and the noticing is the content: the digital
  apparatus was being *built* before it was deployed. The tool predates the mascot.
- **It fits E1's register.** The tone risk with a playful rig lab is real, but in E1 it isn't
  playful yet — it's a crude dev tool. It has no charm to break the grave register with. The charm
  is what arrives later, and now you know where charm comes from.

**B · Start of E2.** Simpler, safer, weaker — by then Lamby is already charming, so the reveal only
confirms what the player suspects.
**C · E3/E4.** Archaeology. Too late to poison anything; Lamby has already become Lambient/Echo.

## The ambitious version (offered, not assumed)
**The rig ages with him.** E1: crude dev tool, half-drawn lamb, placeholder labels. E2: polished, the
sliders now match the Lamby you know. E3: the file is still there but the character has moved to the
cloud — the local rig no longer controls anything. E4: the rig is gone; nothing is authored by hand
any more. That turns a one-off find into a longitudinal thread about who is holding the pen — and it
reuses one surface four times.
*This is more scope. The E1-only version is the minimum that earns its place; say which you want.*

## Rules for it
- Register `operable` — a system surface, it may glitter. **Never during a `felt` scene.**
- **Finding it is never rewarded** — no achievement, no acknowledgement, no quest log. The frame
  never plays. It is simply there for whoever looks.
- Not a minigame, not a collectible, nothing scored.
- Filed like anything else in the ledger (opening it is data) — but never remarked on.

---

## ✅ ALL DECIDED — Sérgio, 2026-07-25
1. **Part 1 GREENLIT** — "truly like it." Build spec: `docs/JUST_CHANGE_BUILD_SPEC_2026-07-25.md`.
2. **Stage 1 in both places: YES** — the 1997 game ships inside the WebXR on the Era-1 machine too.
3. **Part 2 placement: E1 PRECURSOR, adopted.**
4. **Part 2 scope: E1 ONLY for now.** His reasoning, recorded because it's the right instinct: the
   ages-with-him version is "very interesting" but "makes the easter egg very expanded on the
   narrative… we first need to fix other narrative elements before developing the easter egg as wide
   on all Eras." **Open to it later if it earns real narrative connections** — not closed, deferred.
   *Design consequence: build the E1 rig so a later era-aware variant is possible, but do not
   scaffold for it now. No speculative generality.*
5. **Hosting: its own repo + GitHub Pages.**
6. Song rights: **cleared, no copyright issues.**

---

# S55 — THE E1 EASTER EGG: lamby_rig.exe · Sonnet 5, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read CLAUDE.md (register laws + "the frame never plays"), docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md Part 2 (THE SPEC — Sérgio adopted the E1-precursor
placement), src/lambyrig/lambyRig.ts, src/desktop/os.ts, and the tail of 01_SESSION_LOG.md.

THE IDEA: the player finds the apparatus's own puppet-rigging tool — on a 1997 machine, BEFORE Lamby
the character exists (per the R28 amendment, Era 1 has no Lamby, only impersonal system messages).
So you meet the rigging software before the puppet. It pays off twice later: you recognise Lamby at
his E2 debut knowing he was built, and at S2R.3C's shame beat you will have already moved the sad
slider yourself, an era earlier, out of curiosity.

SCOPE:
1. An unremarked file on the ERA-1 desktop — `lamby_rig.exe` or an unlabelled icon — that opens the
   existing rig lab as an in-fiction surface. Reuse src/lambyrig/lambyRig.ts; do not fork it.
2. ⚑ IN E1 IT IS NOT CHARMING YET. This is the tone requirement that makes the placement work:
   it must read as an UNFINISHED DEV ARTIFACT someone left on the disk — placeholder labels, a
   half-drawn lamb that doesn't animate well, no polish. E1's register is grave; a playful rig lab
   would break it. The charm arrives in E2, and the player will then know where charm comes from.
   (This crude Lamby is deliberately the same one as JUST CHANGE's Stage 1 — keep them consistent.)
3. FINDING IT IS NEVER REWARDED. No achievement, no acknowledgement, no quest log, no assistant
   remark, no score. The frame never plays. It is simply there for whoever looks.
4. Register `operable` (a system surface — it may glitter within E1's limits). It must NEVER be
   reachable during a `felt` scene; check that explicitly and say so in the log.
5. Opening it is filed to the ledger like any other act (witness symmetry) — but never remarked on
   in the fiction.
6. SCOPE DISCIPLINE (Sérgio, point 4): E1 ONLY. The "rig ages across all four eras" variant is
   DEFERRED, not adopted — he wants other narrative elements fixed first. Build so a later era-aware
   variant stays possible, but add NO scaffolding, config, or abstraction for it now.

FILES YOU MAY TOUCH: src/desktop/os.ts, src/lambyrig/lambyRig.ts, src/desktop/apps/ (if the launcher
needs a small surface), data/strings/lamby_rig.json, docs/reinterp/01_SESSION_LOG.md. NOT:
src/desktop/apps/caleb.ts or accountability.ts, src/engine/app.ts, src/witness/intake.ts,
data/provotypes/**, any dossier text.

ACCEPTANCE: the file is findable on the E1 desktop but never advertised; opening it shows the crude
1997-era rig; it is unreachable during any felt scene (state this explicitly); nothing is rewarded or
acknowledged; the ledger records the opening silently. Verified with real clicks from a fresh
?reinterp=1. Add its beat to the debug panel (check-spec C6 will fail otherwise — the panel must
cover every jump). npm test + npm run build green; baselines unaffected.
GIT DISCIPLINE (mandatory): explicit pathspecs only — `git commit -- <your files>`; never bare
`git commit` or `git add -A`; check `git status --short` first.
Blocked ≠ improvise: STOP and log BLOCKED.
```
