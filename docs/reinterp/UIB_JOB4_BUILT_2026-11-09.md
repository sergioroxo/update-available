STATUS: live

# UiB job 4 — what was built (S345, 9 Nov 2026, UiB session)

*The answer to `docs/reinterp/UIB_JOB_4_2026-11-09.md`. Branch `uib/work`, merged with `origin/reinterp` first
(fast-forward to 678aa760), then commits f44e170c (his answers, T52) and dd52d85a (the headset items: T28, T29, T11).*

## His answers

| his answer | now | where |
|---|---|---|
| **1. Root Cause Digger's title: a two-layer teaching moment** | In 1997 the game now opens on a first title page. Under ROOT CAUSE DIGGER, two columns. Left, on the game's dark panel with its yellow rule: **WORDS OF HEALING · a glossary**, the programme's own voice, warm and certain. Right, on plain paper in black ink: **WHAT THE WORD DOES**, one plain line each. The six terms: **SSA · same-sex attraction** ("A feeling you have. It is not who you are." / "Splits you from your own love, so it can be treated."), **struggler**, **brokenness**, **root cause**, **the wound**, **healing · freedom**. Under the columns: "Real terms, as 1990s ex-gay ministries used them." **Next** leads to the existing page (the theory, how to play, Start). Every term is one the Lexicon research documents (its entries 1, 3, 7, 8, 9, 17; the sources are listed in the data's `_docS345`). No person is satirised: the satire stays in the programme's definitions. Shown in 1997 only. The game's later-era skins open straight on the theory page, as before. | `rootCause.ts` (`drawWords`), `rootcause.json` (`words`) |
| 2. Lamby's two 1997 lines, the Family Form's ad column, Prov. 22:6 | Kept, unchanged. | — |
| 3. No VR turn for the summer weekend | Kept: the 8 s wait stays. | — |
| **4. Harbor after the upload: Lamby** | Once his story is online and not yet posted, Lamby says one line: *"Your story is online! Share it on Harbor, so others who struggle can find it too."* The buttons are **Share it** and **No thanks**. Share it opens Harbor (WebView 6) straight at the thread, where the primed preview card and **Post your story** are the next thing to press. It is said once, it can be ignored, and it counts inside the era's cap of five. Today in Restorify is unchanged. | `lambyGuide.ts` (rung `harbor`), `lambyGuideDraw.ts`, `lambyGuide.json` (`harbor`), `os.ts` (`harborDue`, `open:harbor`), `web2003.ts` (`showThread`) |
| **5. The alert's silent steps: 6 s** | The falling streak and the sad hold now show **no Next** and move on after **6 s** (`silentNextSeconds`). The steps with text keep Next and the 20 s fallback. If the system's extra line rides on the streak (he opened his 1997 folder first), that step has text, so it keeps Next. Measured: stop, block and wanting take 20 s each; streak 5.75 s; system 20 s; sad 5.75 s; then caught. | `accountability.ts`, `s2_caleb.json` |

## From TODO

| id | cause found | fix | where |
|---|---|---|---|
| **T52** | On the family job's screen, Lambient's mark was drawn at the bottom left, the same spot where the job writes "The line is clear. / New messages arrive…" when it is done. | The mark now sits top right on every job screen, on the Back button's row. The board keeps its mark at the bottom left (nothing is written there). | `graceQueueLite.ts` (`drawSurface`) |
| **T28 the Tapper** | Measured in the emulated headset. Its buttons caught a ray only within 13–17 mm. A ray 25 mm off A, on the case under the buttons, or 4 cm off its edge counted as a press on the case. A press on the case **put the device back on the bed, about 2 m behind him: that is the "vanishing"**. Letting go of the grip did the same. | In a headset, the device comes up **in front** of him (the head's heading, its pitch held between level and 30° down) and its glass turns to his eyes. Each button catches the ray within **30–38 mm** (nearest wins). The case and a 20 cm margin round it are a **safe zone**: a press there does nothing. Only a press clearly away from it puts it down. The grip carries it where the hand goes, and **letting go leaves it in hand** where it was put. A device in the hand is named before anything behind it. Flat-screen behaviour is unchanged. | `heldDevice.ts`, `handheld.ts`, `app.ts` |
| **T29 the pointer's box** | The "box" was the helper's plate. Whatever the ray was on was named on a 50 × 6.6 cm yellow bar hung 67 cm out at keyboard height, between his hands and the desk. | Following his answer 20 (smaller, visibly connected to the ray), the name is now a **small tag about 2 cm tall, pinned where the ray lands**. Its corner touches the point, and it sits beside it, never over it. The ray ends in a **small square frame lying on the surface** (about 0.7° in the view at any distance), and the frame swells for a moment on a press. On a room object the ray only passes near, a thin leader joins the mark to the object. The plate keeps only the helper's own lines. | `xrFrame.ts` (`setAim`), `xrInput.ts` (`end`, `setAimTarget`, the mark), `app.ts` (`aimAt`) |
| **T11, 2026** | A sweep of controller presses across 2026's monitor (the browser open, the Kettle window enlarged, a guide tip up; 1,024 rays each) found **no** press landing anywhere other than where its ray lands: no stale rect after a scroll and no enlarge swap. What remains is the trigger. A controller's `select` arrives on the trigger's **release**, with the pose at that moment, and pulling a trigger dips the controller. A 2–2.5° dip is about 3.5 cm on 2026's monitor (~47 of its 384 px), enough to land on the tab or bookmark below. In a modelled run, 11 of 18 presses moved to a different control or to empty screen. | A controller's press now goes **where the ray was when the trigger began**, unless the hand moved more than 10° while the trigger was held (a deliberate re-aim, so the release wins). Hands are unchanged (the pinch already worked this way). This applies in every era. | `xrInput.ts` (`selectstart`) |

## Verified

- `npx tsc --noEmit -p .` clean; `npm test` passes.
- Photographed (probes in `out/s345/` and `out/xrjob4/`, git-ignored):
  - the glossary page (`out/s345/shots/words-canvas.png`);
  - Lamby's Harbor balloon, then the thread after Share it (`harbor-lamby-canvas.png`, `harbor-thread-canvas.png`);
  - the alert's step timings (printed by the probe);
  - the family job's done screen with the mark top right (`family-done.png`).
- The headset items in the emulated XR (`out/xrjob4/mock.mjs`, a WebXR mock with real controller rays):
  - `probe-t28.mjs`: before and after the fix, in `t28-base.json` and `t28-recheck.json`, with pictures.
  - `probe-t29.mjs`: `t29-base-*` against `t29-fixed-*`.
  - `probe-t11-sweep.mjs` (no off-target presses in the three states) and `probe-t11-dip.mjs` (the trigger dip, modelled).
- Draw calls with the Game Boy in hand, counted over both eyes: 82–84 before the fix, 86 after (about 43 per eye,
  against the 75 budget). The tag is the only addition, and it draws only while the ray is on something.

## For Sérgio in the headset

1. **T28:**
   - Pick up the Tapper. It should come up in front of you, a little below eye level, with its screen facing you.
   - Press A, the d-pad and START, aiming roughly (up to about 3 cm off still counts).
   - Press on the case, or just beside it: nothing should happen, and it must not disappear.
   - Turn your head: it stays where it is.
   - Hold the grip and move it, then let go: it stays where you left it.
   - To put it down, press well away from it.
2. **T29:**
   - Point at the disk, the racket, the poster, the monitor.
   - You should see a small square where the ray lands, and a small yellow name tag beside it, touching it.
   - Nothing should hang between your hands and the desk.
   - Is the tag readable? It is about 2 cm tall at arm's length.
3. **T11:**
   - In 2026, press the browser's tabs, the bookmarks and the chat rows with the trigger, the way you did on the 8th.
   - Every press should land on what the ray was on when you started pulling.
   - If any press still lands somewhere else, note what was open on screen.
4. **The glossary:** read it at the monitor. Both columns are 9 px text; the column headings are 8 px.

## Open questions

1. The glossary is only in 1997. Should the game's later skins (2003/2016/2026) show it too, or is 1997 its place?
2. Lamby's Harbor line counts inside 2003's cap of five. A player who has used all five never hears it. Keep it
   inside the cap (the law), or make it the one exception?

## The walks

Every era was touched (the Tapper and the pointer are shared code), so all four were walked, one era each, with
`node tools/walk.mjs --port … --from-era N --one-era --max 900`. The reports are in `out/walks/`, git-ignored.

| from | result |
|---|---|
| 1997 | ✓ reached 2003 in 85 presses |
| 2003 | ✓ reached 2016 in 77 presses (pressed Next on the alert three times, waited out the silent steps) |
| 2016 | ✓ reached 2026 in 37 presses |
| 2026 | ✓ reached the Close in 80 presses |

The walker does not play in a headset. T28, T29 and T11 are verified in the emulated XR only (see above).

*Note: a helper agent began the headset items and stopped twice on a network error. Its edits were reviewed,
re-measured with its probes on the current tree, and kept. The before/after numbers above come from those re-runs.*
