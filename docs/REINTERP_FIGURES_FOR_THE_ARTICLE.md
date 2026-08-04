STATUS: live

# FIGURES — where to get screenshots for the article
*Sérgio asked for one labelled place to find images like the `shots-before/` sweep. This is it.*
*Target venue: the Digital Creativity (T&F) special issue on IDN.*

## ⚑ First, the thing to know
The sweep folder he had bookmarked —
`/private/tmp/claude-501/…/e360ebae-…/scratchpad/shots-before` — **is gone or will be.** Session
scratchpads are temporary and get cleaned. **Never bookmark a scratchpad path.**

Everything below is either committed to the repo or regenerable in one command.

---

## 1 · Already committed — usable today
| file | what it shows | made by |
|---|---|---|
| [`docs/reinterp/S69_noa_video_ungraded_vs_graded.png`](reinterp/S69_noa_video_ungraded_vs_graded.png) | ⚑ **the strongest single figure in the repo** — Noa's testimony video before and after the "house look" preset. The apparatus grading a person as *ill* before she has said anything, in one A/B. | S69 |
| [`docs/reinterp/S70_comment_thread_routing_propagation_floppysheep.png`](reinterp/S70_comment_thread_routing_propagation_floppysheep.png) | four panels: the template picker · the routed reply with `follow-up assigned` · **the propagation** (your deployed sentence back in a stranger's mouth) · FloppySheep | S70 |
| [`docs/reinterp/S71_room_audit_before_after.png`](reinterp/S71_room_audit_before_after.png) | the room-audit fixes, before/after | S71 |
| [`docs/MOODBOARD_ERA1_ROOM.png`](MOODBOARD_ERA1_ROOM.png) | Era-1 room mood reference | — |

## 2 · Regenerate a full sweep — one command
```bash
npm run audit
```
Frames land in **`out/shots-<tag>/`** — every seat × era state × room, plus each choreography
overlook. `out/` is gitignored on purpose (regenerable, large), so **copy anything you want to keep
into `docs/`**, which is where the four files above live.

Sweep alone, without the assertions:
```bash
node tools/shots.mjs sweep --tag article
```
The device screens (laptop / tablet / phone canvases, at their true pixel size):
```bash
node tools/shots.mjs devices
```
A labelled contact sheet from a folder of frames:
```bash
node tools/shots.mjs sheet
```
Full options: `node tools/shots.mjs --help`. Needs Chrome; it starts its own dev server if none is
running. `npm test` never needs either.

## 3 · The moving picture
`tools/render-video.mjs` renders deterministic frames offline (node-canvas + ffmpeg) — this is how
the New You infomercial MP4 was made. Not part of `npm run audit`; run it when you want video.

---

## ⚑ What is NOT yet capturable, and it matters for the article
**Era 4 has no content to photograph**, and the Close is one button
(`REINTERP_WHAT_IS_MISSING_2026-08-04.md`). Any figure set assembled today shows **three of four
eras and no ending.**

Also worth knowing before a figure is chosen: **every string in the E3 images is PLACEHOLDER-draft**
— my drafts awaiting Sérgio's voice pass, per the co-creation norm. They are honest as *interface*
figures; they are not yet quotable as the piece's writing.

## Naming, so a future session can find them
`docs/reinterp/S<session>_<what_it_shows>.png` — lowercase, underscores, and the filename should say
what is in the frame rather than which build made it.
