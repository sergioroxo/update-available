STATUS: review

# F3 — 1997: less reading (W1-B1) — REPORT

Branch `cloud/F3` (from `origin/reinterp`). Commit `CLOUD: F3 — …`. PR "F3 — DO NOT MERGE (review)". Method and rules as `docs/reinterp/TEXT_CHANGES_2016_F2_2026-10-15.md`: shorten only, never delete a line, keep every fact and documented phrase.

## The honest headline
**Era 1 barely moves: displayed 1997 text goes from 3,109 to 3,072 words (-1.2%), 17 strings (the college page's two-line sentence counts as one), no line removed.** There was little left to take. The first W1-B1 pass (S223, 2026-10-09) already cut the browser, the kit, Rob's turns and the IRC channel, and he reviewed it and restored lines. What remains is mostly text the rules protect (see "Not touched"). Getting to "about half" would need whole lines removed, or felt text touched, and that needs his yes.

## Files changed
`data/dialog/s1_browser.json`, `s1_guide.json`, `s1_kit.json`, `data/strings/rootcause.json`, `startPanel.json` (e1 only), `pauses.json` (e1 only), and a line in `BUILD_LOG.md`. Each data file carries one `_docF3cut` note. No code, layout, timing or colour touched. No `_s` line touched.

## Words per surface
Displayed text only; excludes `_` notes, ids/keys/urls, and `witness`/ledger lines. Same script on `origin/reinterp` and on this branch.

| surface | file | before | after | change |
|---|---|---:|---:|---:|
| NetPilot browser (1997) | `data/dialog/s1_browser.json` | 684 | 674 | -10 (-1%) |
| IRC channel + DMs | `data/dialog/s1_irc.json` | 221 | 221 | +0 (+0%) |
| Placement letter, diary, update ritual, Era-1 close | `data/dialog/s1_end.json` | 331 | 331 | +0 (+0%) |
| FIT IN (handheld game) | `data/dialog/s1_fitin.json` | 71 | 71 | +0 (+0%) |
| Tapes (captions = lyrics) | `data/dialog/s1_tapes.json` | 400 | 400 | +0 (+0%) |
| Guidance bar (hint line) | `data/dialog/s1_guide.json` | 134 | 120 | -14 (-10%) |
| Un-Walk kit + Internet Setup | `data/dialog/s1_kit.json` | 568 | 558 | -10 (-2%) |
| Prayer (sung words) | `data/dialog/s1_prayer.json` | 147 | 147 | +0 (+0%) |
| ROOTCAUSE.EXE | `data/strings/rootcause.json` | 425 | 424 | -1 (-0%) |
| Getting Started card (1997) | `data/strings/startPanel.json` | 46 | 45 | -1 (-2%) |
| "Did you know" pause (1997) | `data/strings/pauses.json` | 82 | 81 | -1 (-1%) |
| **TOTAL** | | **3109** | **3072** | **-37 (-1.2%)** |

## Not touched, and why
- **#stillstruggling IRC** (`s1_irc.json`: ambient, Lume's welcome, the replies, Rob's DM, the yes.gif lines) and **Rob's escalation turns** (`s1_end.json`): the file's own `_doc` says `register: felt` ("the warmth is real; the routing is the harm"), and his 2026-10-09 review restored lines there (anjo_97's "rob you always say that lol", Rob's "because it's true :)", "she's relieved, honestly"). Left as they are. If he rules the channel operable for this purpose, about 25–30 words are available (e.g. Lume's welcome names Daniel twice; the DM lines have connecting words).
- **Daniel's diary** (the note, the entry, the flag/scan/delete lines) and the **Era-1 close**: felt. Untouched.
- **The prayer's sung words** (`s1_prayer.json`, 147 words) and **all tape captions** (`s1_tapes.json`, 400 words — every caption is a lyric; the two bracketed captions are scene-setting and left): lyrics, untouched.
- **Un-Walk welcome page, "step by step", the mentor page's "He has been where you are."**, and the pledge's two outcome lines ("the card is on file either way, and it will keep" is the satire collapsing): kept as his review left them.
- **The programme's documented phrases**: "Possible … root" findings and the review-quiz answers in ROOTCAUSE.EXE, the "Such were some of you" testimony, the parents' letter, the placement letter's fields, the changelog. Facts or the collapse of the satire. Untouched.
- **Already label-sized**: FIT IN (71 words), the Internet Setup wizard, buttons, chips, the guidance bar's single-verb lines, the Getting Started card (46 words → 45).
- **Not Era-1 desktop**: the 400-word "1997 · RECRUIT" panel is the Close's atlas (`close_network.json`), the intake record on the room wall, and `home.json`. Not in this task's scope.

## Proposals — NOT applied (need his yes)
- IRC channel as operable for trimming (see above): ~25–30 words.
- Show the Un-Walk's sentence "The world will tell you it is an identity. We gently say…" once only: it is the programme's thesis line; his call.
- Remove the browser's `list.members` rows 9–10 ("His Way Out — site moved", "Pure Hearts Tapes & Books — under construction"): whole lines, ~10 words, but they carry the 1997 texture.

## Checks
- `npm ci` OK (npm audit warnings pre-existing).
- `npx tsc --noEmit` clean.
- `npm test` passes (invariants, rooms, spec, licences).
- Dev server `npx vite --port 3000 --strictPort`; walk: `node tools/walk.mjs --port 3000 --max 1400 --one-era` reached **e2 from e1 — "one era walked"**: 295 presses over 471 steps, 61 presses changed nothing, exit 0 (`✓ one era: walked from e1 to e2`). Era 1 took 69 min wall-clock (headless Chromium, software rendering; the IRC and diary scenes are timed). Two earlier attempts of the same command were cut off by tool time limits and a container restart before the end; this is the complete third run, on the committed branch. The walk output (`out/walks/`) is git-ignored and not in this PR. One thing seen, not caused by this PR (no diary string was touched): the walk presses the diary 'known control' about ten times in a row with `silent-surface diary … owns no rect field` before moving on; I did not baseline it on `reinterp`.

## Every changed line (BEFORE / AFTER)
17 strings. Paths are inside the file named in each heading. The `_docF3cut` notes are added metadata and not listed.

#### `data/dialog/s1_browser.json`

**1.** `pages.directory.lines[3]` — 11 → 9 words
- BEFORE: Q: How do I find a ministry in my local area?
- AFTER: Q: How do I find a ministry near me?

**2.** `pages.college.lines.5–6` — 11 → 7 words
- BEFORE: We have added a number of links to / ministries this year.
- AFTER: We added links to ministries / this year.

**3.** `pages.faq.lines[3]` — 10 → 8 words
- BEFORE: Q: What if I need a ministry outside the USA?
- AFTER: Q: What if I need a ministry abroad?

**4.** `portal.ringLink` — 8 → 6 words
- BEFORE: The Walking-Out Ring — list of member sites
- AFTER: The Walking-Out Ring — member sites


#### `data/dialog/s1_guide.json`

**5.** `sideMessages[3].text` — 11 → 8 words
- BEFORE: the card. sign it in your name, or set it aside.
- AFTER: the card. sign it, or set it aside.

**6.** `sideMessages[5].text` — 12 → 10 words
- BEFORE: join the channel from the fellowship's page, or browse its pages first.
- AFTER: join the channel from the fellowship's page, or browse first.

**7.** `sideMessages[6].text` — 13 → 10 words
- BEFORE: you can keep browsing, or go to the channel. someone is waiting there.
- AFTER: keep browsing, or go to the channel. someone is waiting.

**8.** `sideMessages[7].text` — 11 → 9 words
- BEFORE: while you wait, the fellowship's pages are still open in NetPilot.
- AFTER: while you wait, browse the fellowship's pages in NetPilot.

**9.** `sideMessages[8].text` — 12 → 10 words
- BEFORE: a form has been sent to you. it is on the desktop.
- AFTER: a form has been sent. it is on the desktop.

**10.** `sideMessages[12].text` — 14 → 12 words
- BEFORE: the programme is on the taskbar. press it, or the disk, to go on.
- AFTER: press the programme on the taskbar, or the disk, to go on.


#### `data/dialog/s1_kit.json`

**11.** `pray.mayStop` — 14 → 12 words
- BEFORE: Press Amen to end the prayer here — or follow it to the end.
- AFTER: Press Amen to skip the rest, or follow it to the end.

**12.** `pray.aside` — 12 → 10 words
- BEFORE: (The second tape is the fellowship's radio hour — not a step.)
- AFTER: (The second tape: the fellowship's radio hour. Not a step.)

**13.** `pledge.before[0]` — 11 → 8 words
- BEFORE: Sign it in your name, or set it aside for today.
- AFTER: Sign it, or set it aside for today.

**14.** `form.lines[1]` — 9 → 6 words
- BEFORE: It is on the desktop. Open it and answer
- AFTER: It is on the desktop. Answer


#### `data/strings/rootcause.json`

**15.** `hint` — 16 → 15 words
- BEFORE: press the earth beside Lamby to dig · press a diagnosis beside you to inflate it
- AFTER: press the earth beside Lamby to dig · a diagnosis beside you to inflate it


#### `data/strings/startPanel.json`

**16.** `e1.steps[3].text` — 8 → 7 words
- BEFORE: Sign the pledge card, or set it aside.
- AFTER: Sign the pledge, or set it aside.


#### `data/strings/pauses.json`

**17.** `pause.e1.items.browse` — 16 → 15 words
- BEFORE: the fellowship's pages stay open in NetPilot — search them, browse the directory, follow the ring.
- AFTER: the fellowship's pages stay open in NetPilot — search, browse the directory, follow the ring.

