STATUS: live

# CODEX BRIEF — THE PLAYTEST (drive the browser; play it as a person would)
*Prepared 2026-09-22 (after S171) for Sérgio to paste as a Codex session prompt. Companion brief:
`CODEX_BRIEF_VISUAL_PASS_2026-09-22.md` (the one that reviews the frames). Separate sessions.*

---

**Model:** **Luna 6**, at `xhigh` reasoning effort — the project's GPT-side model from 2026-09-22
(`03_COORDINATION.md` → *Model history*); if your account names it differently, the strongest model
available to your Codex, at its highest reasoning effort. This is a long, patient, judgement-heavy task;
do not run it on a small model.
**Tools:** browser automation (your Playwright/Chrome tooling), a shell for the dev server, and read
access to the repo.
**Approval/sandbox:** may run `npm`/`node` locally and drive a browser at `localhost`. **Read-only on
`src/`, `data/`, `public/`** — no edits, no commits.
**Budget:** plan for 2–3 hours of wall-clock. The piece is long on purpose.

---

## 1 · What this piece is, in three lines

**YOUR UPDATE HAS FAILED (PC Simulator)** is a browser + WebXR narrative experience from the
University of Bergen's Center for Digital Narrative, about how conversion-practice ("SOGICE")
networks target queer people online. You sit at one desk, in one room, across four eras — 1997, 2003,
2016, 2026 — and use the software; every era arrives as a *software update*, because the demand never
changes, only the disguise. You never walk: you turn, you click, and it ends with a record of what the
machine filed about you.

Repo: `/Users/sergiogalvaoroxo/update-available-reinterp` (worktree, branch `reinterp`, at its tip — `git log -1`).

## 2 · Your job in one line

**Play it, all the way through, by clicking — and tell me everything that is bugging.** Worst first,
urgent separated from the rest.

The three questions that matter, in order:
1. **Could you get through?** Every beat must be reachable by ordinary presses. A beat you could only
   reach by cheating is the single most valuable finding this project can receive.
2. **Did the story read?** Could you follow who you are, what the software wants, and why each era
   follows the last — without the design documents?
3. **What annoyed, confused or stalled you?** Where did you not know what to press; where did you
   press something that did nothing; where did you wait and wonder if it had crashed.

## 3 · How to run it

```bash
npm install
npm run dev -- --port 3000
```

Open **`http://localhost:3000/?reinterp=1`** — the flag is required (without it you get the old
shipped baseline, which is not this piece).

Optional: `&debug=1` adds **read-only** probes — `window.__ledger` (what the machine has filed about
you), `window.__os` (OS phase and the live hit rects), `window.__guide` (the current hint),
`window.__camProbe`, `window.__app`. Reading them is welcome and makes your report much stronger.
**Do not use them to move:** no `__os.debugJump(...)`, no `__requestMove`, no `__camFree`, no
`?era=`. If a beat can only be reached that way, that is the finding.

## 4 · How this thing takes input — read this or you will waste an hour

- **There is no DOM UI.** One canvas fills the page. Every screen you see — the 1997 desktop, the
  phone, the browser, the Close's panels — is drawn to an offscreen 2D canvas and textured onto a mesh
  inside a 3D room. An accessibility-tree read of the page will be empty. **Drive by screenshot and
  click on the picture**; your clicks are raycast into the room exactly as a player's are.
- **A press resolves on RELEASE, behind a 10 px / 1.2 s threshold.** A press that travels is a *look*;
  a press that stays is a *tap*. So: press and release without moving the mouse, and keep it under
  1.2 s. `el.click()` on the canvas proves nothing — use real mouse down/up.
- **Drag to look around.** You turn; you never walk. **The turn is the piece's signature ask** — more
  than once, the thing you need is behind you, and nothing will tell you twice.
- **Scroll wheel zooms the field of view** (30°–80°). Use it to read the monitor; the room never
  leaves the frame.
- **Click a marker on the floor to move to it.** That is the only movement there is.
- **Esc (or the button in the top corner) opens the game menu:** Resume · **Where you are** (a map of
  the beats — use it if you are lost, and tell me when you had to) · Recentre · Restart · Leave.
- **The front door arms after ~4 seconds.** The content note has a deliberate delay before the entry
  buttons work. That is not a dead button. Choose **"On this computer" → Log in**.
- **After ~40 seconds of stillness a helper line appears** with the current hint. If you needed it,
  write that down — it is a measure of how discoverable the beat was.

## 5 · Patience — the most common false finding

This piece has long, deliberate stillnesses, and every previous automated attempt at it has reported
them as bugs:

- the boots, the installs and the cartoons run on their own clock (tens of seconds);
- the Close's final camera move is **44 seconds** of flight with nothing to press;
- the Commons ball in 2026 is about **3½ minutes with no controls at all, by design**.

**Never report "nothing is happening" before four minutes of no change, with no caption, no helper
line, and no new console output.** Before you call a beat stuck: wait, then look *around* (drag), then
check the menu's "Where you are", then read `window.__guide` and the console. Then report it.

## 6 · The laws you must not "fix"

These are decided. Findings that propose undoing them get discarded.

| law | what it means for your report |
|---|---|
| **Click/tap only** | Plus the floor-marker press and Esc. No free-text keyboard, no timers, no chords, no hover-only affordances. Do not propose keyboard shortcuts, gamepad, or drag-and-drop. |
| **No locomotion** | You turn; you do not walk. Do not propose free movement or "let me get closer" (the wheel zoom already exists). |
| **Pixel discipline, era palettes** | Colours come from `src/desktop/theme/`; nearest-neighbour, integer positions. 1997 is meant to look like 1997. Off-palette or wrong-era chrome is a finding; "dated" is not. |
| **Soft lo-fi, not horror** | Cozy low-poly, underdefined edges. Do not propose darker or sharper. |
| **The frame never plays** | No scores, achievements, streaks, quest popups or tutorials in the piece's own voice. Gamification exists only inside the fiction. |
| **Felt scenes are bare** | Scenes about the *person* (not the apparatus) carry no assistant, no satire, no mechanics. Do not propose help there. |
| **No network, no storage** | Nothing is fetched after load and nothing is persisted — no localStorage, no analytics, no saved progress. If you see a network call after asset load, **that is an URGENT finding.** |
| **Invented marks only** | No real people, orgs or logos. The project lead's name never appears in player-visible strings. |
| **The writing is not yours** | Report "this line is cut off / unreadable / contradicts the last beat". Do not rewrite copy. |
| **`?flat=1` is a review tool** | Not an audience target. Do not test in it or propose work for it. |

Suggestions are welcome — in the suggestion column, marked as suggestions. Design rulings, copy
rewrites and new features are Sérgio's, not the report's.

## 7 · Route

Play it straight through: **the front door → 1997 (Daniel, sixteen) → the update → 2003 (Daniel,
adult) → the update → 2016 (Vera, a content moderator) → the update → 2026 (Maya) → the Commons →
the Close and the receipt.**

Each era is a desk with a sandbox on it: things you can open in any order, and a *gate* that ends the
era. Read `docs/reinterp/PROGRESSION_LAW_2026-09-17.md` if you want to know what is supposed to block.
For the intended flow beat by beat — and the twelve things already flagged — read
`docs/reinterp/REVIEW_ROUND_4_2026-09-22.md`. **Anything already flagged there (R4-01…R4-18 — the last six fixed in S174, so their return is a finding) is known;
list it under "already known" rather than as a new finding.**

**At the Close, press a label or a panel in the sky** (new in S174): the eye goes to Daniel's machine
and it opens that room's dossier in that room's OS. Try every era's, page through one, and come back.

If you genuinely run out of budget, the documented review jump is `?reinterp=1&era=2&descent=0` (and
`era=3`); Era 4 is entered from Era 3's ending. **Say in the report exactly where you jumped and why** —
a jump invalidates every reachability claim after it.

If you are stuck and cannot find the control: `tools/walk.mjs` is this project's autonomous clicker and
it knows how to aim at the real hit rects (it reads each surface's published rects and projects them
through the surface's own transform). You may read it for the method, or run
`node tools/walk.mjs --port 3000 --max 1500` to unstick yourself. **A walk is not a playtest** — use it
only to get past a wall, and say so. Never edit anything under `src/`, `data/` or `public/` while it
runs: Vite hot-reloads the page and kills the run.

## 8 · What I want back

**One file: `docs/reinterp/CODEX_PLAYTEST_2026-09-22.md`.** First line `STATUS: live`. Screenshots to
`out/codex-playtest/` (git-ignored), referenced by file name. Write nothing else; change nothing else.

Structure:

1. **The log** — what you did, in order, with rough timings: era, beat, what you pressed, how long it
   took, where you hesitated. Terse is fine; this is the evidence behind everything below.
2. **What I understood the piece to be about** — one paragraph, written *before* you read the design
   docs, in your own words. Who were these people, what was the software doing to them, what did the
   ending tell you. **This is the comprehension check and it is the point of the whole exercise.**
3. **URGENT — it blocks or breaks play.** Worst first:
   - a beat you could not reach by clicking
   - a control that does nothing, or does the wrong thing
   - a crash, a softlock, a black screen that never resolves, a console error that costs you a beat
   - text you could not read at all, at the seat, at any zoom
   - anything that breaks a hard invariant (a network call after load; anything written to storage)
4. **THE REST** — friction, pacing, legibility, story confusion, overlap/occlusion/clipping, controls
   that look dead or look live and are not, chrome drawn inconsistently.
5. **Already known** — by their R4 ids.
6. **The three worst moments**, in one line each, with what you would look at first.

Table shape for 3, 4 and 5:

| id | sev | era / beat | what I pressed | what happened vs what I expected | screenshot | suggestion (optional) |
|---|---|---|---|---|---|---|
| CP-01 | URGENT | 2003 · the residue | … | … | `out/codex-playtest/…png` | … |

Severity: `URGENT` · `HIGH` · `MEDIUM` · `LOW`.

## 9 · House rules

- Read-only on `src/`, `data/`, `public/`. No commits, no branches, no `git add`. The tree must be
  clean apart from your one report file and `out/`.
- No downloads, no new dependencies, no fetched assets.
- Do not run `tools/make_tones.sh` or any generator that rewrites committed assets.
- If something fails, report it with its output. Do not repair the tooling.
