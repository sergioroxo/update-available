STATUS: live

# PHASE 7 — THE GPT VISUAL WALKTHROUGH (brief, 2026-09-29, build `5501d9c`)
*Prepared for Sérgio after S201. Two ways to run it — pick one or both:*
- **A · Codex (or any agent with the repo):** reads the code and the frames, read-only. Prompt in §4.
- **B · ChatGPT with pictures:** upload the contact sheets from `out/phase7/sheets/` (numbered, ~12 images, one era per
  group) and paste the prompt in §5. No repo needed.

*Bring the answer back as a file (e.g. `~/Pc_Simulation/Sources/Deep Research/phase7.md`); the next session triages it into
`OPEN_ITEMS.md` — broken things get fixed, taste calls come back to you as questions.*

## 1 · The frames
- `out/stills/` — **2560 × 1440**, every era from the same places (its corner, above, the seat, the screen close, the turn), the
  Close and the receipt; captions in `out/stills/STILLS.json`. Regenerated 2026-09-29 on this build.
- `out/phase7/raw/` — every surface built since Round 4, shot headless: the 1997 web (portal, directory, ring list, a Resources
  page, results), yes.gif, the 2003 forum (rules, index, bookstore, the pre-filled application, thread), the institution's corner,
  the handhelds and the three games (in the room and as played contact sheets), FloppySheep with the lyrics, the 2016 jobs (Tag
  the video, Post to the group), Maya's results and the agent's chat page, the wall prints.
- `out/phase7/sheets/` — the same, on numbered contact sheets with captions, for upload.
⚑ The frames in `raw/` and on the sheets were shot with `?debug=1`, so they carry the review overlays (the grey "GYRO / HORIZON" box top right, the "Look with your device" chip top left, the "⚙ E1" era badge). **They are not part of the piece** — tell the reviewer to ignore them. The stills are clean. A copy of the sheets is at `~/Pc_Simulation/Phase7_sheets/` for upload, with `INDEX.txt` (every frame's number and caption). All three folders are git-ignored and local. Regenerate: `node tools/stills.mjs --port 3000`, then `out/probe/phase7.sh`,
then `node out/probe/sheets.mjs` (dev server on :3000).

## 2 · What changed since Round 4 (so the reviewer knows what is new)
See `docs/reinterp/STATE_2026-09-29.md` §"What S177–S201 built". The short list: the rooms re-lit (no daylight); the
institution's corner behind the seat; a period browser in every era and the recommendation event through them; the pre-filled
application; four games; the helpers; 42 dossier sources.

## 3 · The questions that matter this round
1. **Legibility.** From each frame alone, would a first-time player know what they can do next — and can they read it at the
   size it is drawn (the monitor is ~0.4 m wide, three quarters of a metre away)?
2. **Order.** Does each era read in sequence: what the software asks → what it files → what it does to the person?
3. **Period truth.** Does each era's interface look like its year (1997 Netscape/Yahoo; 2003 IE6/forums; 2016 platforms and
   apps; 2026 a conversation) — without "1990s costume"?
4. **Density.** Where is a screen too full to take in? Where is something important too small or at the edge?
5. **The four games.** Is each one's failure legible as the point ("the queer side always wins"), not as a bug?
6. **The corner.** Does the institution behind the seat read as "the system's side", and does its change between turns show?

## 4 · Prompt A — Codex / an agent with the repo (read-only)
> You are reviewing **YOUR UPDATE HAS FAILED (PC Simulator)**, a browser + WebXR narrative piece (University of Bergen,
> Center for Digital Narrative) about how conversion-practice (SOGICE) networks target queer people online. Repo:
> `/Users/sergiogalvaoroxo/update-available-reinterp`, branch `reinterp` at `5501d9c`. **Read-only: no edits, no commits.**
> Read first: `CLAUDE.md` (the laws — binding; the R28 amendments apply), `docs/reinterp/STATE_2026-09-29.md`,
> `docs/reinterp/PHASE7_VISUAL_WALKTHROUGH_2026-09-29.md` (this brief, §3 = the questions), and the Round 4 review
> `docs/reinterp/REVIEW_ROUND_4_2026-09-22.md` (known issues — don't re-raise them unless they regressed).
> Then look at every frame in `out/stills/` and `out/phase7/raw/` (regenerate per §1 if missing; the dev server is
> `npm run dev -- --port 3000`, open `?reinterp=1`). Answer §3's six questions era by era. For each finding give: the frame
> name, what a player sees, why it is a problem, and — where you can — the file and line that draws it. Grade each:
> **broken** (overlap, clipped, unreadable, unreachable), **unclear** (a player would not know what to do), or **taste**
> (a design call — say it once and leave it). Do not propose anything the laws forbid (no walking, no timers, no free typing,
> no scores in the frame's voice, no real marks or people, felt scenes stay bare, no network or storage). Do not rewrite copy;
> you may say a line is cut off or unreadable. End with the ten findings you would fix first.

## 5 · Prompt B — ChatGPT with the contact sheets
> I'm the director of an interactive artwork, **YOUR UPDATE HAS FAILED**: you sit at one desk across four eras — 1997, 2003,
> 2016, 2026 — and use the software a conversion-practice ("ex-gay") network put in front of three people (Daniel in 1997–2003,
> Vera in 2016, Maya in 2026). Each era arrives as a software update. Everything you touch is a period interface drawn on a
> monitor or a device in a low-poly 3D room; you never walk, you turn and click. The satire is always the seller's; the people
> are never the joke; marks are invented; a "dossier" sources every documented practice. The attached sheets are numbered
> frames from the current build, era by era, with captions.
> Please review them **as a first-time player and as a designer of period interfaces**:
> 1. From each frame alone, would I know what I can do next — and can I read it at its size?
> 2. Does each era read in order: what the software asks, what it files, what it does to the person?
> 3. Does each era's interface look like its year (1997 Netscape/Yahoo and personal ministry pages; 2003 IE6, forums and
>    ministry portals; 2016 social platforms, video sidebars and accountability apps; 2026 an AI conversation) — without
>    turning into a costume of clichés?
> 4. Where is a screen too dense, or something important too small or at the edge?
> 5. The four games (FIT IN, REACH, TIDY, FloppySheep) are the programme's products and are built so they cannot be won — the
>    queer thing always persists. Does that read as the point, or as a bug?
> 6. Behind the seat, "the institution" (a filing cabinet, a desk and terminal, a suitcase) changes as the file grows. Does it
>    read as the system's side?
> For each finding: the frame number, what you see, why it matters, and a grade — **broken**, **unclear**, or **taste**. Don't
> suggest walking, timers, typing, points or achievements, real brands or people, or lighter treatment of the documented harm.
> Finish with the ten things you would fix first.
