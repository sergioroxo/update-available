STATUS: live

# JUST CHANGE — build spec for the external arcade game
*Greenlit by Sérgio 2026-07-25 ("truly like it"). Own repo + GitHub Pages (his point 5). Song rights
cleared. Concept: `REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md` Part 1. This doc is what a build
session works from.*

## The one-sentence pitch
A ridiculous four-stage arcade game where **the genre updates with each era** — floppy maze → Flash
whack-a-mole → mobile endless-runner → a game that plays itself — so the player *experiences* the
argument the WebXR piece makes: the apparatus survives by updating, and each update was friendlier
and worse.

## Non-negotiables (it carries the project's name)
- **Satire targets the apparatus, never queer people, never survivors.** Lamby is the joke. The
  little figure you steer is never mocked, never punished for what it is.
- **No real organisations, people, or testimony** in the game. Invented marks only (TriedPath,
  Restorify, GracePlatform — reuse the parent project's canon). Real material only on the end card,
  each claim carrying `documentary | contested | speculative`.
- **No storage, no network, no analytics, no cookies.** Same invariant as the piece. It must not do
  the thing it depicts — and the end card says so plainly: *nothing you did here was kept.*
- **No win state that endorses the apparatus.** Stages can be lost. "Winning" Stage 4 is the
  indictment, not a reward.
- **Content note before it starts. Leave/pause always available, from the first frame.**
- The satire **must collapse** — Stage 4 is where it curdles. Never leave the mascot un-undercut.

## Stack
Vite + TypeScript + 2D canvas, no framework. Deploy to GitHub Pages (`base: './'`).
**Reuse `lambyChar.ts`** from the parent repo (S48 made it the single source of truth) so the toy and
the piece share one Lamby by construction — vendor it in, and note the sync point in the README.

## ⚑ Repo state — build as an ADDITION, not a from-scratch assumption
*Sérgio 2026-07-25: "that is still being built, so the prompt should work for an addition."*
The Just Change repo may already exist and be part-built. **The session must look first and adapt:**
if the repo/project already exists, ADD these stages into its existing structure and conventions
(its stack, its naming, its build config) rather than reorganising it; only scaffold from scratch if
there is genuinely nothing there. Do not overwrite existing work, and do not "fix" conventions that
are simply different from this spec's suggestions — the spec describes the GAME, not the file layout.

## ⚑ The end card's WebXR spot — build it to survive not-yet-shipped
*Sérgio: "The end card should have a promotional spot for the WebXR but since it's not finished it's
hard to know if it's direct, but hopefully yes."*
So: **reserve a real promotional slot** for *YOUR UPDATE HAS FAILED* — title, one-line description,
and the SurvivingSOGICE / University of Bergen framing — that **works today without a live link**
and becomes a direct link the moment the experience ships.
Practically: put the destination in **ONE constant** (e.g. `WEBXR_URL`), and have the card render a
non-clickable "coming soon"-style block when it's empty and a real link when it's set. **Never ship a
dead link**, and never scatter the URL through the code — flipping it live must be a one-line change.

## Audio
`~/Pc_Simulation/Testing/Lamby Song/` — *"Always Your Lamby — Lamby Knows What Goes on Inside
(Inside Dream Remix)"* by **Treblo**, 4:45, with a word-timed `.lrc` and an `.ogg` + `.mp3`.
Rights cleared. The song runs continuously across all four stages; **stage transitions land on song
section boundaries**, and *"I'm always watching you"* must arrive as Stage 4's automation takes over.
Credit Treblo prominently.

## The four stages

### Stage 1 · 1997 · **THE UN-WALK** — floppy maze
Four colours, chunky pixels, unfair. You steer a small figure along **"the straight path"** — a
corridor that keeps narrowing. Bump a wall and you lose ground. *(Name is parent canon: "TriedPath
Un-Walk", `data/dialog/s1_kit.json`.)*
**Lamby here is crude** — half-drawn, barely animated, a placeholder mascot. This is deliberately the
same unfinished Lamby as the E1 easter egg: the tool before the puppet.
*The joke:* the path is absurdly narrow, and the game is simply not fair. It doesn't teach you; it
just fails you.

### Stage 2 · 2003 · **DAILY REALIGNMENT** — Flash whack-a-mole + streak
XP-era chrome, saturated blues, a jaunty click. Wrong thoughts rise as bubbles; pop them before they
reach the top. Speed escalates. **A STREAK COUNTER appears** — reuse the parent piece's 412 — and
missing one resets it to zero.
**Lamby is polished now**, bouncy, congratulating you by name.
*The joke:* the streak matters more than you do. The number is the point, and it is the apparatus's
number, not yours.

### Stage 3 · 2016 · **GRACE QUEUE** — mobile endless-runner + gacha
Flat UI, rounded cards, a notification tray. Endless runner: collect grace tokens. Spend them on
boosters in a gacha pull — **"three easy payments of yourself"** (parent canon, from the infomercial).
A daily-login streak notification you never opted into.
**Lamby is ambient**, arriving as push notifications.
*The joke:* selfhood as a monetised loop, and the queue never empties.

### Stage 4 · NOW · **LAMBY KNOWS** — the game plays itself
Serene, minimal, ambient. **Your inputs stop mattering.** Lamby "helpfully" completes your moves —
first assisting, then anticipating, then simply playing. The score climbs perfectly without you. The
song reaches *"I'm always watching you."*
**⚑ This is the collapse.** The mascot's cheer curdles into the language of a record. The charm that
carried three stages is revealed as the mechanism.
*The joke and the thesis in one:* a game with no player. The apparatus's endpoint is that it will be
well on your behalf, and it no longer requires your consent to do it.

### End card
What this was about, in plain language. Statused provenance for any real claim. Then the two links:
the **WebXR experience** and **SurvivingSOGICE** (University of Bergen, Center for Digital
Narrative). Plus: *nothing you did here was kept.* Credit Treblo.

## ⚑ The shared artifact (Sérgio's point 4 — confirmed)
**Stage 1 must be authored so it can drop into the WebXR piece unchanged**, as a period-correct
floppy game on the Era-1 machine. Keep it self-contained: its own module, no dependency on the
site's shell, canvas-only, era-1 palette. One object in two homes, thirty years apart.

---

# THE BUILD PROMPT (paste into a NEW chat, in the new repo)

```
You are building JUST CHANGE — a small standalone arcade game, from scratch, in its own new repo.
It is a promotional companion to a University of Bergen research artwork about how organised
conversion-practice ("SOGICE") networks operate online. The game is satirical and educational; its
target is the APPARATUS, never queer people and never survivors.

READ FIRST (in the parent project at /Users/sergiogalvaoroxo/update-available-reinterp):
- docs/JUST_CHANGE_BUILD_SPEC_2026-07-25.md  ← THE SPEC, authoritative
- docs/REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md Part 1  ← the reasoning behind it
- CLAUDE.md and docs/ETHICS_CONSTRAINTS.md  ← the laws travel with the project's name
- src/lambyrig/lambyRig.ts + src/desktop/apps/lambyChar.ts  ← the Lamby you will reuse

SETUP — LOOK BEFORE YOU SCAFFOLD. The Just Change project may ALREADY EXIST and be part-built.
Inspect it first. If it exists, ADD these four stages into its existing structure and follow its
conventions (stack, naming, build config); do not reorganise it, do not overwrite existing work, and
do not "fix" conventions that merely differ from this spec — the spec describes the GAME, not the
file layout. Only scaffold from scratch if there is genuinely nothing there: Vite + TypeScript + 2D
canvas, no framework, `base: './'` for GitHub Pages.
Vendor in lambyChar.ts rather than reimplementing Lamby, and record the sync point in the README.

SCOPE — four stages, one continuous 4:45 song, per the spec's stage table:
  1. 1997 THE UN-WALK      — floppy maze, 4 colours, unfair, a crude half-drawn Lamby
  2. 2003 DAILY REALIGNMENT — Flash whack-a-mole with a streak counter that resets to 0
  3. 2016 GRACE QUEUE       — endless runner + gacha, "three easy payments of yourself"
  4. NOW  LAMBY KNOWS       — THE GAME PLAYS ITSELF; inputs stop mattering; the collapse
Stage transitions land on song section boundaries. "I'm always watching you" must arrive as Stage
4's automation takes over — the song is doing the argument, so let it.

BUILD STAGE 1 SO IT CAN BE LIFTED OUT: its own self-contained module, canvas-only, era-1 palette,
no dependency on the site shell. It will also ship inside the WebXR piece as a floppy game on the
Era-1 machine.

HARD LAWS (all enforced, no exceptions):
- No storage, no network calls, no analytics, no cookies. The game must not do the thing it depicts.
- No real organisations, people, or testimony in play. Invented marks only — reuse the parent's
  canon (TriedPath, Restorify, GracePlatform). Real material appears ONLY on the end card, each
  claim labelled documentary | contested | speculative.
- No win state that endorses the apparatus. Stage 4's "perfect score" is the indictment.
- Content note before the game starts; Leave/pause live from the first frame.
- The satire targets the apparatus. The figure the player steers is never mocked or punished for
  what it is. If a joke would land on a queer person rather than on the system, cut it.
- The mascot's charm MUST collapse in Stage 4. Do not leave it un-undercut.

END CARD: what the game was about, statused provenance, the line "nothing you did here was kept",
a prominent credit to Treblo for the song, and a link to SurvivingSOGICE (University of Bergen,
Center for Digital Narrative).
⚑ PLUS a reserved PROMOTIONAL SLOT for the WebXR piece "YOUR UPDATE HAS FAILED" — it is not finished
yet, so build the slot to work WITHOUT a live URL and to become a real link later with a one-line
change. Put the destination in a single constant (e.g. WEBXR_URL); render a non-clickable
"coming soon" block when it is empty, a real link when it is set. NEVER ship a dead link, and never
scatter the URL through the code.

ACCEPTANCE: all four stages playable end to end with the song running; you have PLAYED IT YOURSELF
at real speed and can state that each stage reads as its genre and that Stage 4 lands as both a joke
and an indictment; Stage 1 is cleanly liftable; no network/storage anywhere (grep for it and say so);
builds and deploys to GitHub Pages; README documents the lambyChar.ts sync point and the song credit.
Blocked ≠ improvise: STOP and report. If any beat feels like it mocks the wrong target, STOP and
flag it rather than shipping it — that is an ethics call, not a design call.
```

## Open (Sérgio)
- Repo name — `just-change`? And which account/org?
- Does the end card link the WebXR piece publicly, or is that held until the experience ships?
