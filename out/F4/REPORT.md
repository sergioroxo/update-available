STATUS: live

# F4 — 2026: less reading (W1-B1, F-rows) — REPORT

Branch `cloud/F4` (from `origin/reinterp`). Commit `CLOUD: F4 — …`. Not merged; PR is "F4 — DO NOT MERGE (review)".

## The honest headline
**Era 4 barely moves: displayed text went from 3,222 to 3,173 words (−49, −1.5%) in 20 strings; no line removed.** Era 4 was cut in S223 and its surfaces are already at label size. What remains is, almost all of it, text that the rules protect (voiced, respite, clinical-debate, documented, the thesis of the update). To go further needs his yes on the proposals below. I did not widen the cut by touching protected text.

## Files changed
`data/dialog/s4_browser.json` (12 strings), `s4_ball.json` (2), `s4_space.json` (1), `s4_offers.json` (1), `data/strings/map.json` (4 Era-4 route hints). Each file also carries a one-line `_docF4cut` note. No code, layout, timing, colour or audio touched. No `edit.find`, id, witness/ledger line, `_s` line or dossier text touched.

## Words per surface (displayed text only; excludes `_` notes, ids, audio names, witness/ledger/`filed` lines, speedrun id lists)
| surface | before | after | change |
|---|---:|---:|---:|
| Browser: six tabs (chat, record, photos, care, stories) | 439 | 439 | 0 (0%) |
| Second Thoughts: site, results, five turns, files, console | 680 | 653 | -27 (-4%) |
| The Commons (session on the glass, ball, hall, stream) | 536 | 531 | -5 (-1%) |
| Laptop (L arrives) and the stop | 71 | 69 | -2 (-3%) |
| GraceOS boot, tab strip, search box | 88 | 88 | 0 (0%) |
| L's conversation (voiced) | 548 | 548 | 0 (0%) |
| L's offers (memories, wall, curation, pause) | 443 | 441 | -2 (-0%) |
| Game: Match Made Simple | 137 | 137 | 0 (0%) |
| Game: Tidy | 116 | 116 | 0 (0%) |
| Route hints (map.json, Era 4 beats) | 164 | 151 | -13 (-8%) |
| **TOTAL** | **3222** | **3173** | **-49 (-1.5%)** |

(Method: letter-or-digit tokens in every leaf string per surface, counted on `origin/reinterp` and on this branch by the same script.)

## Not touched, and why
- **L's voiced lines** (`s4_l.json`, and every line with an `audio` key in `s4_offers.json`): 47 pre-rendered clips (S102, one voice, one batch). The caption IS the transcript of the clip, so shortening the text without re-rendering would make the caption disagree with what is spoken. A shortened line needs a re-render in the same batch (`npm run tts`), which I cannot do here and which would break "one sitting, one voice". Not edited.
- **L's chat history tab** (14 months of transcript): its lines are the same sentences as the voiced ones and carry the evidence the design counts on (the correction three times, filed each time; "progress"). The S223 cut left it for the same reason. Not edited.
- **The ball** (MC, four categories, closing, house rules, Junie, Ade, the stream): `respite`. The 2026-10-10 Commons design keeps its categories and closing at full length ("the ball's stillness"). Only two operable lines of the session on the glass were trimmed.
- **Clinical-debate lines** (ETHICS: both captions, unresolved): the results page's People-also-ask answer and its two closed questions, the forum result ("Some effects reverse; some do not"), the gender-services result, the removed video and the short. Untouched, both sides at their full length.
- **The curation card** (STEADY VOICES excerpts, "a Compass campaign · placement paid") and its counter line: attributed, sourced speech by an actor, not the clinical debate (see `_docCuration`); wording kept exactly. The after-ball lines ("This one didn't take the usual pass"): respite, L must not remark on it.
- **The update ritual** (`updates.json` u4: notification, EULA clause 3, changelog, report): the thesis; the EULA's disclosure is deliberately "legally disclosed and practically invisible".
- **Record, care, photos, stories tab, Second Thoughts site and greeting**: documented/design text, one-claim lines already (S223), or the surfaces' evidence (retained file, "created automatically", "Conversations are public").
- **Felt content** (Junie's lines, the mum thread, the record's name rows): untouched.
- **The two games** (Match Made Simple, Tidy): arcade captions in capitals, each line a few words (Tidy's scrolling ticker and tips are the longest, 18 and 11 words, and are the perpetrator's self-presentation).

## What I changed, in kind
Only operable, non-voiced, non-respite text: the laptop console's "Step n **of 5** —" (the monitor's own step label already says it), four of L's five turn questions (each keeps its ask, its provider/photograph/messages/headset fact and L's softness), the locked-step line, the failed-site detail, one wall-card body (the satire's pitch, same claim), and four route hints (the frame's own voice).

## Proposals — NOT applied (need his yes)
1. **Re-render L's lines shorter, in one batch.** The only way to cut L's actual reading (548 displayed words in `s4_l.json`; most of the 441 in `s4_offers.json`). Cost: a TTS re-run of all the clips in one sitting and a listen. This is where the real saving is; I did not size it.
2. **Chat history: trim the three longest L turns** (the family thread, the "You're right. I keep doing that." reply, the pharmacy line: 64 words together), keeping the "old file" / "legacy field is protected" claims — only if the voiced twins are re-rendered to match.
3. **Second Thoughts site page: three slogans say one thing** ("A calm place to think again." appears as the result snippet and the first site line; the tagline and the footer repeat the promise). Dropping the duplicate site line would save 6 words; it is the satire's repetition, so his call.
4. **The pace of the five turns is a code question, not a text one:** each turn is ask + chip + the step's own press (W1-E5's shape again).


## Checks
- `npx tsc --noEmit`: clean.
- `npm test` (invariants, rooms, spec, licences): all four OK.
- `node tools/walk.mjs --port 3000 --max 2600 --require-close`: **RUNNING when this was written** (headless Chromium without a GPU on a 4-core container: ~6.5 s per step, so ≈ 4–5 h for 2,600 steps). The result is appended below the moment it finishes. This is a data-only change (strings; no ids, keys, code or layout), so the walk is a confirmation, not a discovery; the lead's machine re-walks before merging anyway.


## Every changed line (BEFORE / AFTER)
20 strings. Key paths are inside the file named in each heading.

#### L's offers: the wall — `data/dialog/s4_offers.json`

**1.** `wall.cards.1.body` — 13 → 11 words
- BEFORE: We hold back the things likely to upset you, before you see them.
- AFTER: We hold back what might upset you, before you see it.


#### Laptop — `data/dialog/s4_space.json`

**2.** `laptop.lines.2` — 13 → 11 words
- BEFORE: When it's back, start with the search. The rest isn't on this screen.
- AFTER: When it's back, start with the search. The rest isn't here.


#### Route hints — `data/strings/map.json`

**3.** `eras.3.beats.0.hint` — 13 → 10 words
- BEFORE: The monitor is asleep on its mark — press it to restore the session.
- AFTER: The monitor is asleep — press it to restore the session.

**4.** `eras.3.beats.1.hint` — 14 → 12 words
- BEFORE: The laptop is restoring your session — wait for it, then start with the search.
- AFTER: The laptop is restoring your session — wait, then start with the search.

**5.** `eras.3.beats.3.hint` — 16 → 12 words
- BEFORE: The first result is a site. Open it, start a session, and let the agent begin.
- AFTER: Open the first result, start a session, and let the agent begin.

**6.** `eras.3.beats.5.hint` — 17 → 13 words
- BEFORE: L asks, you answer — then each step's own press. Continue moves you on; nothing moves by itself.
- AFTER: L asks, you answer — then each step's own press. Continue moves you on.


#### Second Thoughts program: L's five turns — `data/dialog/s4_browser.json`

**7.** `program.steps.0.turn.ask` — 14 → 11 words
- BEFORE: Before care can begin, your provider needs your details confirmed. Is this still you?
- AFTER: Your provider needs your details confirmed first. Is this still you?

**8.** `program.steps.1.turn.ask` — 12 → 10 words
- BEFORE: There's one photograph on your file. Shall I restore it for you?
- AFTER: There's one photograph on your file. Shall I restore it?

**9.** `program.steps.3.turn.ask` — 13 → 11 words
- BEFORE: To keep your history whole, I need access to your messages. Allow it?
- AFTER: To keep your history whole, I need your messages. Allow it?

**10.** `program.steps.4.turn.ask` — 13 → 9 words
- BEFORE: Everything's in order. Your session is ready — the headset is beside you. Now?
- AFTER: Everything's in order. The headset is beside you. Now?


#### Second Thoughts program: locked step, failed site — `data/dialog/s4_browser.json`

**11.** `program.locked` — 10 → 8 words
- BEFORE: This step unlocks when the one before it is complete.
- AFTER: Unlocks when the step before it is complete.

**12.** `program.failed.detail` — 15 → 13 words
- BEFORE: Your session could not be continued. Second Thoughts has ended the session on your behalf.
- AFTER: Your session could not be continued. Second Thoughts ended it on your behalf.


#### Second Thoughts program: the laptop console line — `data/dialog/s4_browser.json`

**13.** `program.console.wait` — 24 → 22 words
- BEFORE: While you think it over, Maya — the console on your bed has a game from us. Match three, and watch your before come back.
- AFTER: While you think, Maya — the console on your bed has a game from us. Match three, and watch your before come back.

**14.** `program.steps.0.console` — 10 → 8 words
- BEFORE: Step 1 of 5 — confirm your details on the monitor.
- AFTER: Step 1 — confirm your details on the monitor.

**15.** `program.steps.1.console` — 9 → 7 words
- BEFORE: Step 2 of 5 — choose a photograph to restore.
- AFTER: Step 2 — choose a photograph to restore.

**16.** `program.steps.2.console` — 10 → 8 words
- BEFORE: Step 3 of 5 — acknowledge the actions taken for you.
- AFTER: Step 3 — acknowledge the actions taken for you.

**17.** `program.steps.3.console` — 9 → 7 words
- BEFORE: Step 4 of 5 — confirm your history with L.
- AFTER: Step 4 — confirm your history with L.

**18.** `program.steps.4.console` — 8 → 6 words
- BEFORE: Step 5 of 5 — put the headset on.
- AFTER: Step 5 — put the headset on.


#### The Commons: session on the glass — `data/dialog/s4_ball.json`

**19.** `session.recorded.intro` — 10 → 8 words
- BEFORE: Now playing · 11 min. The speaker's name has been removed.
- AFTER: 11 min. The speaker's name has been removed.

**20.** `session.grounding.note` — 7 → 4 words
- BEFORE: a quiet room  ·  the environment is holding
- AFTER: a quiet room  ·  holding
