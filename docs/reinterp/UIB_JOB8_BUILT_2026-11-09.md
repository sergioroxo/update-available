STATUS: live

# UiB job 8, built (S349, 9 Nov 2026): the build stamp, struggler, 2016 and 2026's visual culture, Noa, the inventory

*Branch `uib/work`. The job: docs/reinterp/UIB_JOB_8_2026-11-09.md (items 1–5). TODO rows: T12, T58, T44, T54.*

## 1. T12: which build is the Quest running?

The short git commit and the build's date and time are injected at build time (Vite `define` in `vite.config.ts`;
no network, nothing stored; `src/state/buildStamp.ts`). They show:

- on the game menu's **About** view and its **Credits & attributions** view: "Build 1a2b3c4 · 2026-11-09 22:30";
- on the headset's **debug plate** (`?debug=1`), as its first line;
- on the browser's **debug panel**, after the existing tag: "built 2026-11-09 22:30".

Checked: a production build carries the commit and the minute it was built. The stamp is the commit that was checked
out when the build ran, so a build made after this job is committed shows this job's commit. The dev server stamps
the moment it started.

## 2. T58: "struggler" in the Lexicon

- **The new entry:** `data/strings/lexicon.json` has "struggler" right after "the struggle", in the Lexicon's own
  format.
  - Status: "a moral frame, not a finding".
  - Its line: Root Cause's own "You fight it. That makes you one of us!".
  - Its plain sentence: "What ministries call a gay person who resists their own desire. It makes the fight the
    person's name, so the fight never ends. Members of these groups used it of themselves; the research records the
    word, it does not endorse it."
  - Source: RESEARCH_LEXICON §3 (Love in Action 2005, Erzen 2006).
- **Met words:** Root Cause Digger's glossary now marks its six words as **met** in the Lexicon at the Close (★):
  SSA, struggler, brokenness, root cause, the wound, healing.
- **The era websites** list the Lexicon's terms, so they were regenerated (`tools/gen_era_sites.mjs`).

## 3. T44: the visual culture of 2016 and 2026

All colours come from the eras' own theme files. No layout, position or font size changed: the buttons are where they
were and the type is the same size. No real marks are used.

**2016: GracePlatform, from Windows 7 glass to 2016 flat "material"** (`src/desktop/theme/era3.ts`,
`src/room/graceQueueLite.ts`):
- **windows:** a solid accent title bar with the title in white; ✕ and – drawn as thin white strokes with no box;
  a 1 px border (it was a glow frame, a two-tone glass bar and bevelled caption boxes);
- **buttons:** a flat fill raised by a 2 px shadow line. The primary is the accent with white text; Apply and Skip
  read as 2016 at once;
- **cards and tags:** the board's cards are white and lifted by a shadow line, with no outline; the tags are flat;
- **taskbar:** one solid dark strip with a flat accent start disc (it was a glass gradient and a glossy orb).

**2016: the Handset Window.** Its frame now wears the phone maker's own iOS 7 idiom (`PHONE`): a light bar, a
hairline and a dark title. It reads as a different company's software on the same desk, his 24 Aug point. The phone
inside was already in that idiom.

**2026: the assistant, Kettle, the cards** (`src/desktop/apps/browser.ts`, `messenger.ts`, `theme/era4.ts`):
- **Second Thoughts** speaks the way today's AI assistants do:
  - a four-point sparkle in a soft disc (`assistantMark`, generic, no product's mark) instead of a letter;
  - its replies as plain text on the page; only Maya's own words sit in a round bubble;
  - the typing dots are round;
- **cards and rows:** the evidence cards are rounder (radius 12). Kettle's rows (radius 10) and bubbles are softer.

**Photographed from the seat, before and after** (`out/s349/vc-before/` and `out/s349/vc-after/`, git-ignored):

| | before | after |
|---|---|---|
| the 2016 board and the Handset Window | Windows 7 glass title bar, bevelled ✕, glossy taskbar | flat blue bar, drawn ✕, flat cards, phone-style window bar |
| the 2016 correction list | glass buttons | a raised blue Apply and a flat white Skip |
| the Handset Window (the group) | grey bar | the phone's light bar; bubbles as before |
| the 2026 bot | mint bubbles with an "S" avatar | the sparkle mark, plain replies, her words in a bubble |
| the 2026 browser and Kettle | — | rounder rows |

Files: `e3-close-board.png`, `e3-close-list.png`, `e3-close-handset-group.png`, `e3-close-handset-home.png`,
`e4-close-browser-kettle.png`, `e4-close-bot.png`, and the `*-seat-*` versions (`out/s349/vc-photos.mjs` makes
them).

## 4. T54: Noa in 2026, a proposal

`docs/reinterp/DESIGN_NOA_2026_2026-11-09.md` (`STATUS: draft`). Three options, each with what it adds, its risk and
its cost:
1. **A viewer in the birthday stream:** one ordinary chat line and a donation. Recommended: she simply exists, and no
   law is bent.
2. **The "someone who went back" recording:** ruled out as written, because the piece would answer for her. A
   "greyed, never opened" variant is described.
3. **The bot's "stories" page:** the system's card about her, against her own plain words.

The fixed points come first. Noa is no longer in 2016. Nothing from her 2016 file travels with her (guard 1). No beat
resolves her. **He picks.**

## 5. The visual-culture inventory (his article)

`docs/reinterp/VISUAL_CULTURE_INVENTORY_2026-11-09.md` (`STATUS: live`) covers every visual-culture element, era by
era:

| section | rows |
|---|---|
| 1997 | 38 |
| 2003 | 30 |
| 2016 | 26 |
| 2026 | 23 |
| the Close | 9 |
| across the eras | 13 (including the transition ritual and its glob morph) |

Each row gives:
- where the element is (screen or prop, and file);
- the period reference it evokes, in words only;
- what it does in the piece;
- whether it is documented in the project's sources or is the piece's own design.

The document also has:
- **the archive finds** (18 rows), and what each one documents;
- **notes for the article**;
- **a list of photos** under `out/`, with this job's before and after;
- **what was left out and why.**

Three findings worth knowing for the article:
- **No font file ships.** The theme names Fixedsys Excelsior, Roboto and Inter, but `public/assets/fonts/` does not
  exist, so every browser uses its own system faces.
- **The archive finds reach the piece as the era websites' "Pages of the time" links.** No drawn look cites them in
  the code.
- **The 2016 and 2026 rows describe the restyled look,** with the before and after photos.

## The walks

Only the touched eras were walked, each to the next, with `node tools/walk.mjs --port 3181 --from-era N --one-era
--max 900` (reports in `out/walks/`, git-ignored): 1997 → 2003 ✓ (85 presses; the Root Cause glossary is in 1997),
2016 → 2026 ✓ (37), 2026 → the Close ✓ (86). The first 1997 walk timed out in the opening film while another
session's walk loaded the machine; run again alone, it passed. `npm test` passes.

## For Sérgio to check

1. **On the Quest:** open the menu, then Credits. Does the build line match the commit of the build you meant to load?
2. **2016:** does GracePlatform now read as 2016 (flat) rather than 2009 (glass)? Does the Handset Window read as her
   phone's maker rather than her employer?
3. **2026:** does Second Thoughts read as a 2026 assistant?
4. **Noa:** pick option 1, 2 (variant) or 3, and say whether you want to write her one line.
5. **The inventory:** read it for the article. Its "Unsure" section lists what I could not source.

## Not done / notes

- Not run on a Quest.
- The 2026 windows run edge to edge on the monitor, so their corners were left square: rounding them would change
  the layout.
- In 2016, every surface that uses the era's shared window, button and taskbar (the sign-in, the board, the lists,
  the consent, the update) changed together. That is the point of changing the theme rather than the pages.
