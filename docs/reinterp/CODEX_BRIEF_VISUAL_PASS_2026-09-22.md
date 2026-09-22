STATUS: live

# CODEX BRIEF — THE VISUAL / LEGIBILITY PASS (read-only)
*Prepared 2026-09-22 (after S171) for Sérgio to paste as a Codex session prompt. Companion brief:
`CODEX_BRIEF_PLAYTEST_2026-09-22.md` (the one that actually plays it in a browser). This one LOOKS —
at the frames and at the code behind them. Do both, in either order, in separate sessions.*

---

**Model:** GPT-5.1-Codex-Max — or the strongest Codex model your account offers.
**Reasoning effort:** `xhigh`. **Approval/sandbox:** read-only; no edits, no commits, no branches.
**Shape of the session:** one long pass. Spend it looking and reading, not building.

---

## 1 · What this piece is, in three lines

**YOUR UPDATE HAS FAILED (PC Simulator)** is a browser + WebXR narrative experience from the
University of Bergen's Center for Digital Narrative, about how conversion-practice ("SOGICE")
networks target queer people online. You sit at one desk, in one room, across four eras — 1997, 2003,
2016, 2026 — and use the software; every era arrives as a *software update*, because the demand never
changes, only the disguise. You never walk: you turn, you click, and it ends with a record of what
the machine filed about you.

Repo: `/Users/sergiogalvaoroxo/update-available-reinterp` (git worktree, branch `reinterp`, at
`6e1b9f9`). Everything the player touches is drawn to offscreen 2D canvases and textured onto the
monitor / phone meshes inside a low-poly 3D room. There is no DOM UI. That is why this review is done
from **pictures**.

## 2 · Your job in one line

Look at this build the way a first-time player would, and tell me what is **visually broken** or
**unplayable** — the things its makers have stopped being able to see.

The two questions that matter most, and they are not about code:
1. **From this frame alone, would a player know what they can do next?**
2. **Does the story read in order** — does each beat make sense after the one before it, and does the
   thing the beat is about actually draw where you would look?

Code is in scope only as *evidence*: when you find a defect, it is worth more if you name the file and
line where it lives (`src/desktop/apps/kit.ts:412`). Do not fix it.

## 3 · Read order (before you look at anything)

1. `CLAUDE.md` (repo root) — the laws. **Binding.** Read the "REINTERP AMENDMENTS (R28)" block: this
   branch is the reinterpretation, behind `?reinterp=1`.
2. `docs/reinterp/REVIEW_ROUND_4_2026-09-22.md` — the piece as it plays right now, era by era, with
   the frames inline and twelve open flags (R4-01…R4-12). **This is the map of the thing you are
   reviewing.** Anything already flagged there is known — say so rather than re-raising it, and only
   add to it if you can say something new.
3. `docs/reinterp/OPEN_ITEMS.md` — the register of what is owed. The Round 4 block at the end is
   unanswered on purpose: those are Sérgio's rulings, not defects.
4. `docs/reinterp/NARRATIVE_FLOW_2026-09-17.md` and `PROGRESSION_LAW_2026-09-17.md` — what is supposed
   to happen, in what order, and what is allowed to block.
5. `docs/reinterp/STATE_2026-09-16b.md` (first block only) — where the build stands.

## 4 · Where the pictures are

- **Full resolution (1280 px) — review these:** `out/tour-e1/`, `out/tour-e2/`, `out/tour-e3/`,
  `out/tour-e4/`.
- **800 px copies, named as the review document cites them:**
  `docs/reinterp/review-2026-09-22/img/` — `e1-00-door.png`, `e4-63-close-receipt.png`, and so on
  (the era prefix plus the tour's own file name). 158 frames: 47 / 33 / 15 / 63.
- **Both folders are git-ignored.** If they are missing, regenerate them (§5). **Always cite a
  finding by the `eN-…png` name**, because that is the name in the review document.

Regenerate (dev server on port 3000 must be running — see §5):

```bash
node tools/tour.mjs --era 1 --port 3000 --out out/tour-e1
node tools/tour.mjs --era 2 --port 3000 --out out/tour-e2
node tools/tour.mjs --era 3 --port 3000 --out out/tour-e3
node tools/tour-e4.mjs --port 3000 --out out/tour-e4
```

Then make the 800 px review copies:

```bash
mkdir -p docs/reinterp/review-2026-09-22/img
for e in 1 2 3 4; do for f in out/tour-e$e/*.png; do cp "$f" "docs/reinterp/review-2026-09-22/img/e$e-$(basename "$f")"; done; done
sips -Z 800 docs/reinterp/review-2026-09-22/img/*.png >/dev/null
```

Each tour takes 5–15 minutes and plays the era through the player's own surfaces. The `look-` frames
are a free camera (the reviewer's eye); every other frame is **the seat's own view** — that is what a
player actually sees, and "is it readable / is it in frame" must be judged on those.

## 5 · How to run it

```bash
npm install
npm run dev -- --port 3000
```

Then open **`http://localhost:3000/?reinterp=1`** — the flag is required; without it you get the old
shipped baseline, which is not what this review is about.

- `?reinterp=1&debug=1` adds read-only probes: `window.__ledger`, `window.__os`, `window.__guide`,
  `window.__camProbe`, `window.__app`. Reading them is welcome.
- `?flat=1&reinterp=1` draws the desktop canvas alone. **It is a review tool, not an audience target.**
  Never judge the piece by it and never propose work for it.
- `npm test` runs the invariant checkers (no network, no storage, spec laws, palette ratchet, doc
  STATUS headers). Run it if you like; it should be green at `6e1b9f9`.

## 6 · The laws you must not "fix"

These are decided. A report that proposes undoing one of them is a report we throw away.

| law | what that means for your findings |
|---|---|
| **Pixel discipline, era palettes** | Colours are imported from `src/desktop/theme/` (`era1.ts`, `era2.ts`, …). `FILTER_NEAREST`, integer positions, 90°-step rotations. "Wrong-era colour" is a finding when a surface uses a colour from the wrong era's palette or off-palette entirely — **not** when the 1997 desktop looks like 1997. Do not propose anti-aliasing, gradients, rounded corners or a modern refresh. |
| **Soft lo-fi, not horror** | Rooms are cozy low-poly with underdefined edges. Do not propose darker, sharper, scarier. Low contrast is a finding only where it makes text or a control genuinely unreadable. |
| **Click / tap only** | Plus the movement press (a jump between fixed seats) and Esc for the menu. No free-text keyboard, no timers, no chords, no hover-only affordances. Do not propose keyboard shortcuts, gamepad support, or drag-and-drop. |
| **No locomotion** | The only bodily ask is **the turn**. Do not propose a way to walk, strafe, teleport freely, or "get closer". (The wheel zooms the FOV; that already exists.) |
| **The frame never plays** | No scores, achievements, quest popups, streaks, progress bars or onboarding in the piece's own voice. Gamification exists only *diegetically* (the software's own purity streak is the satire). Do not propose a tutorial. |
| **Felt scenes are bare** | Scenes flagged `register: felt` (the person, not the apparatus) carry no assistant, no satire, no mechanics, no extra chrome. Do not propose adding help, hints or affordances there. |
| **No network, no storage** | No fetch/XHR/websockets after asset load; no localStorage/sessionStorage/cookies/IndexedDB. Do not propose analytics, telemetry, CDN fonts, or saved progress. |
| **Invented marks only** | No real people, likenesses, logos or verbatim testimony. Sérgio's name never appears in player-visible strings (CI enforces this). |
| **The writing is not yours** | Copy belongs to the project. You may say "this line is cut off" or "this line is unreadable at this size"; do not rewrite it. |

## 7 · What a finding is

Anything a player would see and that is wrong on its own terms:

- **overlap** — two things drawn on top of each other that should not be
- **occlusion** — the thing you need is behind something else, or the room eats it
- **clipping** — text or art running past its box, a mesh through a mesh, a panel past the screen edge
- **unreadable text** — too small, too low-contrast, or too fast at the seat's real distance
- **wrong-era colour or chrome** — off-palette, or 2003 chrome in 1997
- **off-screen from the seat** — a control or a beat that is not in frame from the authored pose
- **dead-looking / live-looking** — a control that looks pressable and is not, or one that is the next
  step and looks like decoration
- **inconsistent chrome** — the same kind of window, button or dialog drawn two different ways
- **the next action is not discoverable** — the frame gives a player nothing to aim at
- **the story does not read** — this beat does not follow from the last one, or the picture points at
  the wrong thing for what is being said
- **anything that looks like a bug**: a stray rect, a flash of the wrong palette, a half-drawn frame,
  a caption on screen with nothing to caption.

**Not a finding:** taste, tone, pacing you would have done differently, copy you would rewrite,
features you would add. Those are Sérgio's. You may put a suggestion in the suggestion column — that
is welcome, it is what an audit is for — but it goes in that column, marked as a suggestion, and never
as an instruction.

## 8 · What I want back

**One file: `docs/reinterp/CODEX_VISUAL_PASS_2026-09-22.md`.** First line must be `STATUS: live`
(every doc in this repo carries one). Write nothing else; change nothing else.

Structure:

1. **What I did** — which frames you looked at, whether you ran the build, how long.
2. **The story as I read it from the frames alone** — one paragraph, no peeking at the design docs
   first. This is the comprehension check and it may be the most useful thing in the report.
3. **The findings table, worst first:**

| id | sev | frame / where | what is wrong | why it matters | suggestion (optional) |
|---|---|---|---|---|---|
| CX-01 | URGENT | `e4-61-close-monitor-far.png` | … | … | … |

Severity: `URGENT` (a player cannot proceed, or cannot read something they must read) ·
`HIGH` (visibly broken, will be noticed) · `MEDIUM` (wrong but survivable) · `LOW` (polish).

4. **Already known** — anything you found that R4-01…R4-12 already covers, listed by their id, so we
   can tell new from old.
5. **Where I would look next** — three lines, what a second pass should cover.

## 9 · House rules while you work

- **Read-only on `src/`, `data/`, `public/`.** No edits, no commits, no branches, no `git add`. Leave
  the tree clean apart from your one report file and anything under `out/` (git-ignored).
- **No downloads.** No new dependencies, no fetched assets, no fonts.
- Do not run `tools/make_tones.sh` (it regenerates every audio master) or any generator that rewrites
  committed assets.
- Never edit anything under `src/`, `data/` or `public/` while a tour or a walk is running — Vite
  hot-reloads the page and kills the run.
- If a tour fails, say so with its log; do not "fix" the tool.
