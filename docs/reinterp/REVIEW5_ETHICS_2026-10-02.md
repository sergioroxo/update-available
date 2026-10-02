STATUS: live

# REVIEW 5 — ETHICS (tone and care) — 2026-10-02
*Reviewer: Sonnet 5.5, read-only. Lens: the register laws in CLAUDE.md, docs/ETHICS_CONSTRAINTS.md, and his rulings of 2026-09-28 and 2026-10-01. Read in full: every file in `data/dialog/` and `data/strings/` (`_doc*` keys skipped for content, read for register), plus `data/provotypes/` and `data/dossier/practices.json`. Read in code: `screensaver.ts`, `netvision.ts` (montage and sad figure), `pauses.ts`, `guide.ts`, `phoneE3.ts`, and the Lambient lane in `graceQueueLite.ts`. Nothing was run. I checked OPEN_ITEMS first: P7-26 (disabled "Not now" / "Ignore"), P7-38 (screensavers), P7-46 (the montage) and the ballroom homage ruling are treated as ruled, not defects.*

**Headline.** No slurs, no self-harm lines, no deadname (the 2026 record says "the old file", and the `textUnvoiced` variants never name anything), and no real organisation or person appears in any player-facing room line. All real names sit on dossier or provenance surfaces. The new work (screensavers, the montage, the pauses) is mostly sound. The real problems are small and specific: one false line on Vera's phone, Lambient's lane sitting over survivors' words, the 2026 orb having no tell, and a few law-versus-build drifts.

---

## Findings (most severe first)

### ETHICS-01 — The phone says "Nothing here is filed." while the same screen files it
- **WHERE:** `data/dialog/s3_maiden.json` key `home.readNote`, drawn at `src/desktop/apps/phoneE3.ts:527`. The filings are at `phoneE3.ts:583` (opening the inbox → `e3_backlog` "phone: unread messages opened"), `:711` (opening the group → "phone: group opened — Maiden-to-be"), `:150` (the Malta card → "malta: link opened — blocked, group flagged") and `:141`/`:630` (the cascade). Every `e3*` check-in becomes a record entry (`src/witness/record.ts:125`).
- **WHAT A PLAYER EXPERIENCES:** Vera opens her Messages (Mam's ham, Aunt Cliona's "exactly as you are", The Wick's carol night). The screen says "Nothing here is filed." Later "Your file" and the Close's receipt list "phone: unread messages opened" under her name.
- **WHY IT MATTERS:** It breaks the piece's own doctrine for the people's things. The header of `graceQueueLite.ts` (about line 44) says nothing in the Malta beat files to the ledger ("the phone is the one thing in the room she chose"), by the same logic as Tape C. Pauses.json makes the same promise for "what people made for each other". Filing the opening of the one warm inbox is the system targeting *through* the nearest thing E3 has to respite. The false reassurance is also unlabelled: nothing tells the player it is a lie told by the platform. Law: ETHICS #8 / CLAUDE.md `respite` ("targets around it, never through it") by analogy; ETHICS #10 (the record must be honest about itself).
- **SEVERITY:** medium. **CONFIDENCE:** high on the contradiction; medium on whether it is deliberate irony (nothing in the docs says so).
- **SUGGESTED FIX:** Stop filing `e3_backlog` and `e3_group` (keep the Malta card, which really is the apparatus acting), and keep the note true. If the irony is wanted, record it as a ruling and let the record visibly contradict the note on purpose.

### ETHICS-02 — Lambient's lane is drawn over survivors' words
- **WHERE:** `src/room/graceQueueLite.ts`: `openTask` (about lines 831 and 845, `firstTask1/2`: "Apply what fits. Skip what doesn't. Either way it's recorded, so you can't get it wrong."), `armMalta` (line 937, `phone1/2`), and the lane drawn above the submission at lines 1555-1560 and in `drawSurface` (1316). The lane clears only when a verb is pressed (line 882). Strings in `data/dialog/s3_queue.json` key `lambient`.
- **WHAT A PLAYER EXPERIENCES:** Renata's, Noa's or Deb's own words are on screen, and a Lambient strip sits above them telling the player they "can't get it wrong". When the Malta threshold is reached, "Your phone's lit…" appears in the same strip over the next person's story.
- **WHY IT MATTERS:** CLAUDE.md: the Assistant is "never during `felt` scenes". The file's own register header (graceQueueLite.ts about lines 43-48) says `felt` is "the submissions themselves… no Lambient lane on any screen showing a person's words". The code comment at 1550 calls it a one-off beat, but it is the exact thing the header forbids. The line "either way it's recorded" is the surveillance clause spoken over a woman's testimony.
- **SEVERITY:** medium. **CONFIDENCE:** medium-high (code reading, not a played run).
- **SUGGESTED FIX:** Say the first-task beat on the board before the job opens (or on its tile), and delay `phone1/2` until the player is back on the board. Do not set `lambLines` while `mode === 'list'` or a surface that shows a person's words is open.

### ETHICS-03 — The 2026 orb is the only screensaver with no tell
- **WHERE:** `data/strings/screensavers.json` key `e4.affirmations` ("you are becoming", "this is care", "slowly, Maya", "nothing is lost here", "we kept your place"); drawn by `drawOrb` in `src/desktop/apps/screensaver.ts` (about lines 232-262); shown at Era 4's arrival (`browser.ts:253`) and on idle (`browser.ts:262`).
- **WHAT A PLAYER EXPERIENCES:** A calm breathing orb that addresses Maya by name. Nothing in it is off. The 1997 text is cold, 2003 has the lamb flying the wrong way, and 2016 has a counter climbing and a "Like what you see?". The 2026 orb simply comforts, and "you are becoming" reads as affirming trans language.
- **WHY IT MATTERS:** Satire "must collapse" (CLAUDE.md tone laws; ETHICS #6), and his 2026-09-28 correction says 2026 is not gentle: pair the cosy surfaces with the documented consequences. The orb is the one sleep state that never lets the system show its hand. A trans player can read it as the piece being kind in the system's voice.
- **SEVERITY:** medium. **CONFIDENCE:** medium (the piece as a whole does collapse; this single surface does not).
- **SUGGESTED FIX:** Give the orb one cold, dim line in the era's own register, for example the record's field ("legacy file: retained · 1 item held for review"), or let one affirmation be the system's own wrong word. Keep it small and unremarked, in the same grammar as the other three.

### ETHICS-04 — A "mechanics" line sits on the screen during the 1997 diary
- **WHERE:** `data/dialog/s1_guide.json` side-message `diary` ("a journal entry is required."), triggered by `diaryOpen` in `src/narrative/guide.ts:83`. Nothing in `guide.ts` gates it for `felt`.
- **WHAT A PLAYER EXPERIENCES:** Daniel writes the one line he is going to be flagged for, and the taskbar well says the journal entry is "required".
- **WHY IT MATTERS:** CLAUDE.md: `felt` is bare, with "no mechanics". R28 allows only impersonal hints in Era 1, and this one is an order issued during the most private beat of the era. (The dossier practices file rates the diary `contested`, and it is treated as felt in `os.ts`'s own comments.)
- **SEVERITY:** low-medium. **CONFIDENCE:** medium (I did not confirm whether the diary is formally tagged `felt`).
- **SUGGESTED FIX:** Show the line when the diary icon becomes available (before the window opens) and retire it silently the moment `diary.open` is true.

### ETHICS-05 — Era 4's L cannot be dismissed, and CLAUDE.md says dismissal always works
- **WHERE:** `data/dialog/s4_offers.json` `pause.chips` ("Not now." `gone:true`), `s4_l.json` chips marked `gone` ("Take that thread off my account", "I am trans and that is not the problem"); the live intro chips (`s4_l.json` unit 1) offer no "turn it off".
- **WHAT A PLAYER EXPERIENCES:** Options vanish or grey out for good, on purpose. The player can always Esc/menu/leave.
- **WHY IT MATTERS:** The letter of the law is "dismissal always works and is logged" (CLAUDE.md R28 §2, Assistant caps). The foreclosure is the era's thesis and is documented (`_docPause`, the S60 "a dead button is literally the thesis" ruling; related P7-26), so this is probably ruled. But the law text is unqualified, and the next reviewer will read it as broken.
- **SEVERITY:** low. **CONFIDENCE:** medium (probably by design).
- **SUGGESTED FIX:** Ask Sérgio to record the exception in CLAUDE.md ("Era 4's L is the one assistant that cannot be dismissed, by design; the frame's menu and Leave always work").

### ETHICS-06 — Lambient speaks the moment the felt cascade ends
- **WHERE:** `data/dialog/s3_maiden.json` `after.lambientLine1/2` ("Everything on your board is still there. Take the time you need with it."), triggered at `graceQueueLite.ts:507` when `phone.broken` becomes true.
- **WHAT A PLAYER EXPERIENCES:** The group chat on the phone has just filled with Malta's vote; on the workstation the assistant says her board is still there.
- **WHY IT MATTERS:** The map marks this beat `quiet` and `pauses.ts` suppresses the way-back line for quiet beats, but this line is not gated the same way. Assistant "never during `felt` scenes".
- **SEVERITY:** low. **CONFIDENCE:** low-medium (it lands on a different screen from the phone, so it may be after the scene rather than during it).
- **SUGGESTED FIX:** Hold the line until the player puts the phone down or the era's update begins.

### ETHICS-07 — The dossier says both readings of the clinical debate are rendered; no surface renders them
- **WHERE:** `data/provotypes/e4_offers.json` debrief source on LGB Alliance ("renders both readings unresolved"); `src/desktop/apps/offers.ts` header point 5; ETHICS #7.
- **WHAT A PLAYER EXPERIENCES:** The only detransition-related voices in 2026 are the system's (Second Thoughts' "Someone who went back", Detrans.ai on the card, the `STEADY VOICES` excerpts). No surface holds a second caption.
- **WHY IT MATTERS:** ETHICS #7 / CLAUDE.md: "render BOTH captions, unresolved". The target is rightly the apparatus, and the counter-voice ("They keep saying they're protecting me…") is removed by the system. But the dossier's claim about what the piece does is not true of what is on screen, and a detransitioned reader meets only the apparatus's use of their story.
- **SEVERITY:** low-medium. **CONFIDENCE:** medium.
- **SUGGESTED FIX:** Either soften the dossier sentence to what is built ("the piece takes no position on the clinical question and does not stage it"), or add one unmanipulated second caption beside the recorded voice.

### ETHICS-08 — Era 4's laptop beat has three L lines, over the two-line cap
- **WHERE:** `data/dialog/s4_space.json` key `laptop.lines` (three lines: "Hi Maya. I'm L…" / "I'm restoring your session…" / "When it's back, start with the search…").
- **WHAT A PLAYER EXPERIENCES:** Three consecutive L lines on one beat.
- **WHY IT MATTERS:** CLAUDE.md R28 §2: the conductor speaks "≤2 lines per conduction beat". Probably the lines are pressed through one at a time, in which case this may count as three beats.
- **SEVERITY:** low. **CONFIDENCE:** low.
- **SUGGESTED FIX:** Merge lines 2 and 3, or confirm and record that each press is its own beat.

### ETHICS-09 — Lamby's 2003 way-back can point at the felt message
- **WHERE:** `data/strings/pauses.json` `wayBack.e2` ("Lamby: that's a good stretch. Back to it — next: {beat}."), `src/narrative/pauses.ts` `wayBackLine` (suppresses only `quiet` beats), `data/strings/map.json` beat "A message from outside" (`contactOpened`, not `quiet`).
- **WHAT A PLAYER EXPERIENCES:** After closing Harbor or "Your file", Lamby may say "next: A message from outside", which is Caleb.
- **WHY IT MATTERS:** Lamby is not in the Messenger, but pointing the player at the felt thread is the assistant conducting toward a felt scene. The 2016 and 2026 voices have the same exposure.
- **SEVERITY:** low. **CONFIDENCE:** low.
- **SUGGESTED FIX:** Mark `contactOpened` `quiet:true` in map.json so the way-back says nothing there.

### ETHICS-10 — A dead claim: "built with and for survivors"
- **WHERE:** `data/strings/slice.json` `warning.body` (line 11). Reachable only through the old `phase === 'warning'` path in `src/desktop/os.ts:2129`; the reinterp sets `r_dark` (os.ts:454) and uses `orientingCard.json`, which makes no such claim.
- **WHAT A PLAYER EXPERIENCES:** Nothing today.
- **WHY IT MATTERS:** The trans reader pass is retired and no survivor has reviewed the survivor-adjacent text, so the sentence is an unverified claim about the work's provenance (ETHICS #16 still lists survivor testing as an open flag). If the flat path were ever surfaced, it would be an overclaim.
- **SEVERITY:** low. **CONFIDENCE:** high that it is dead; medium that it matters.
- **SUGGESTED FIX:** Delete the line, or replace it with the plain truth the Close already states ("Made at the University of Bergen with Claude").

### ETHICS-11 — A real product name in the 1997 room
- **WHERE:** `data/strings/slice.json` `desktop.iconIrc`, `taskbarIrc` ("mIRC"), `kitToast` ("C:\mirc\logs\…").
- **WHAT A PLAYER EXPERIENCES:** A period-correct IRC client name.
- **WHY IT MATTERS:** CLAUDE.md: "Invented marks only." This is a name, not a logo, and nothing is said against it, so the risk is trivial.
- **SEVERITY:** low. **CONFIDENCE:** medium.
- **SUGGESTED FIX:** Rename to an invented client ("IRChat") or note the exception.

---

## What is handled with care and must not be touched

1. **The deadname beat (`s4_l.json`, `s4_browser.json` chat history).** The record misfiles Maya "under the old file", the unvoiced variants say "a name you do not use", the correction chip always works and never gets taken, and the front door and menu warn about it. No name appears anywhere.
2. **The montage's logic (`s2_media.json` `montage`, `netvision.ts` `drawRealStoriesMontage`).** The ad cuts his own take into a wall of nine, flips eight to "AFTER" and never his, and stamps RESULTS NOT TYPICAL on him. The satire stays inside the seller's pitch and collapses on the seller. Marcus's later DRAMATIZATION tag retracts the claim. Keep the sad figure short and never add a caption that reads it as the programme's success.
3. **The screensavers' diegesis (`screensavers.json`, `screensaver.ts`).** 1997, 2003 and 2016 each show the seller's own hand: the kit's cold sign-off, the one halo-less lamb never caught, the counter that keeps climbing. They fire only on a window-free desktop with nothing playing (`desktopIdle`, `anythingPlaying`), so no felt window is ever under one, and they file nothing.
4. **The pauses' exception list (`pauses.json` `_doc`, `pauses.ts`).** Caleb's song, the radio tape, Tape C, the outtake and the ball never call `wayBack`, and I confirmed that at every call site. 1997 uses no assistant; the programme speaks impersonally.
5. **The ball (`s4_ball.json`, `e4_ball.json`).** Respite, files nothing, no L, no voice, invented houses, an outsider's homage credited to its lineage in the debrief. The apparatus's overlay fails to classify the room, and the room is still full when the picture ends.
6. **The curation beat (`s4_offers.json` `curation`, offers.ts header).** The campaign is rendered as its own speech on a card that names the sponsor, and the system withdraws the counter-voice rather than the piece mocking anyone.
7. **Felt text with the care it needs.** Caleb's thread and the residue line (his `_s`-marked wording, untouched), Daniel's diary entry, the Malta group chat and the 2016 backlog messages. None is used as a joke, and the sincerity of the submitters is never the target.
8. **The Leave page and the frame (`leavePage.json`, `orientingCard.json`, `gameMenu.json`).** A real way out that stays functional and undecorated, with the 4-second arm delay, the deadname warning up front and "nothing you do is kept".
