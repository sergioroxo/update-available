STATUS: live

# REVIEW 5 — COPY · every word on screen · 2026-10-02
*Lens: typos, names and marks across eras, voice, length for the surface, text that only makes sense if you have read the design docs. Read in full: `data/strings/*` and `data/dialog/*` (no `_doc*`/`_beat` keys), plus `data/sends.json` and `data/room/belongings.json`. Checked against the photographs in `out/review5/stills/` and `out/tour-e4/`, and against `src/` where a string's reach mattered (credits renderer, plural handling, which phases exist behind `?reinterp=1`). Read-only: nothing edited but this file. `_s`-marked lines (`alert.caughtLine`, `alert.systemLines`, `residue.line`) and `data/dossier/`, `data/provotypes/` are untouched and, where relevant, flagged "for him".*

**Found:** 24 findings. Most severe first. "Spelling rule used below": the piece is British ("programme", "colours", "organised", "favourite", "neighbour", "mum", "licence", "offence"); invented *proper names* (Harbor, Anchor Program, Restorify) may keep their own spelling.

---

## COPY-01 · The credits print internal build notes, markdown and code to the public — HIGH
WHERE `data/strings/attributions.json` `entries[0,5,6,7,13,17–27,31,33]`; renderer `src/desktop/gameMenu.ts:470` prints `` `${e.asset} — ${e.creator}. ${e.license}. Used as: ${e.usedAs}.` `` verbatim in the Credits page.
CURRENT (what a visitor reads):
- "VR Headset — J-Toastie, via Poly Pizza (…). CC-BY 3.0 (…). Used as: Era 4: Maya's headset. ⚑ Owed since it shipped — missing from this table until S175." (the same ⚑ sentence on entries 5, 6, 7 — headset, controller, laptop)
- entry 0: "Monitor (`monitorFlat.glb`) — **Zsky**, via [Poly Pizza](https://poly.pizza/m/Qyw8JFtZF0). [CC-BY 3.0](https://creativecommons.org/…)." — raw markdown asterisks/brackets, the only entry in that format, and a backticked filename.
- "Used as: Room 1 belongings — `monkeyToy`, reinterp only." / "…(`boot_1997_machine`)" / "…(`l_arrives_2026`)" — object ids in backticks, and "reinterp only" is a build-branch word.
- entry 33: "as Poly Pizza lists it (no CC-BY tag in its credit line → CC0) — credited by choice" — the authoring reasoning, shown as the licence.
WRONG: build-process voice (S-numbers, ⚑, "Owed since it shipped") on a public surface; markdown and code ids rendered literally; one licence line is an argument, not a licence. Reads as unfinished and, on a credits page, as careless.
PROPOSED REWRITE (data only; or change the renderer to print `asset — creator. license. usedAs.`):
- entries 5/6/7 `usedAs`: "Era 4: Maya's headset." / "Era 4: the headset's controller." / "Era 4: Maya's laptop."
- entry 0: `asset` "Monitor"; `creator` "Zsky, via Poly Pizza (https://poly.pizza/m/Qyw8JFtZF0)"; `license` "CC-BY 3.0 (https://creativecommons.org/licenses/by/3.0/)".
- entry 3 `usedAs` "Room 1 belongings: the monkey." · entry 4 "…: the tennis racket." · entries 17–27 drop the backticked id: "1997: the machine booting." · "1997: the error cascade." · "2016: FloppySheep's game over." · "2003: the collapse glitch." · "2026: the glitch at the end." · "2026: L introduces itself." · "2016: Vera signs in." · "2003: the messenger's ping." · "2016: a message on the phone." · "2016: the phone's notification." · "A press that does not land."
- entry 33 `license`: "CC0 1.0 — credited by choice".
- entries 1, 2, 3, 4, 11–16 `usedAs`: remove ", reinterp only".

## COPY-02 · "1 entries · 0 flagged": no singular anywhere — HIGH
WHERE every `{n}` string; all are bare `.replace('{n}', …)` in src, so none can pluralise. Seen on screen: `e4-09-the-receipt.png` reads "filed: 1 entries · 0 flagged"; `e4-08` reads "5 entries … 0 of them flagged"; `e1-04b` "5 entries · 0 flagged".
CURRENT: `close_restart.json` `receipt.filedLine` "filed: {n} entries · {f} flagged", `receipt.entries`, `filed`; `gameMenu.json` `yourFileCount` "{n} entries · {f} flagged"; `institution.json` `yourFile.sub` "… {n} entries", `yourFile.more` "… and {n} earlier"; `slice.json` `witness.fileCount`, `witness.messagesLogged` "{n} message(s) on file"; `map.json` `aheadCount` "{n} beats ahead", `fileOpen/fileClose` "What it did here — {n} entries"; `s3_comments.json` `app.commentsCount/openThread` "{n} comments"; `screensavers.json` `e3.waiting` "{n} corrections waiting"; `s3_queue.json` `record.todayLabel` "{n} events · today".
WRONG: grammar error on the Close's own receipt, the most-read surface after the Restart card.
PROPOSED REWRITE (number-first labels need no plural form): `receipt.filedLine` "entries filed: {n} · flagged: {f}"; `yourFileCount` "entries: {n} · flagged: {f}"; `map.aheadCount` "ahead: {n}"; `fileOpen` "What it did here — entries: {n} ▸"; `commentsCount/openThread` "comments: {n}"; `e3.waiting` "waiting: {n}"; `todayLabel` "events today: {n}"; `messagesLogged` "messages on file: {n}". (Or add a `{n|one|many}` helper in one place; the data fix is cheaper.)

## COPY-03 · The content notice no longer matches the Era 4 name beat — HIGH · FOR HIM (ethics notice)
WHERE `orientingCard.json` `nameNote`; `gameMenu.json` `unvoicedNameOff/On`, `unvoicedNameNote`; vs `s4_l.json` `units[3]`, `units[4]`.
CURRENT: nameNote "…in the last part, a system speaks a name that the person it is speaking to does not use… If you would rather not hear it said aloud…". unvoicedNameNote "In the last part, a system says a name that the person it is speaking to does not use… When it reads 'not said aloud', the name is never spoken…".
The beat as it now plays (voiced) is "The pharmacy record still has you **under the old file**." — no name is spoken at all (CLAUDE.md: the beat "no longer contains a deadname"). The *unvoiced* caption is the one that names the thing: "…still lists you under **a name you do not use**."
WRONG: (a) the advance warning promises a spoken name that is not spoken; (b) the toggle's two states invert their own logic — the "said aloud" variant is the euphemism, the "not said aloud" variant is the plain one; (c) "the name is never spoken" is a claim about a thing that never occurs.
PROPOSED REWRITE: `nameNote` — "One thing specifically, so it is not a surprise: in the last part, a system keeps referring to Maya's former name as if it were still hers — 'the old file' — and will not let it go. The piece is not neutral about this: the system is wrong. If you would rather not hear those lines read aloud, the menu (Esc, or the button in the corner) has a setting; the subtitles still show what the system did." `unvoicedNameNote` — "In the last part, a system treats a former name of Maya's as current. Press the row above to switch. When it reads 'not said aloud', those lines are shown as subtitles only." `textUnvoiced` (both units): make it the same sentence as the voiced one with the clause appended — "…under the old file, a name you do not use." — so the toggle changes the audio, not the plainness. His call before any wording changes (deadname beat).

## COPY-04 · "5 entries were filed under four names" — only makes sense with the exhibition text — MEDIUM-HIGH
WHERE `close_restart.json` `filed` (shown on the Restart card, `e4-08`).
CURRENT: "{n} entries were filed under four names, {f} of them flagged."
WRONG: the card's buttons below it read Daniel / Daniel / Vera / Maya — three people — so "four names" reads as a miscount of people. The intended meaning ("one desk, thirty years, four names for the same demand": Family Companion / Restorify / GracePlatform / L) lives only in `EXHIBITION_TEXT_*.md`.
PROPOSED REWRITE: "Entries filed across the four updates: {n}. Flagged: {f}." (also fixes COPY-02)

## COPY-05 · Era 4: L arrives "with the update", "fourteen months ago" and "on Tuesday" — MEDIUM
WHERE `s4_space.json` `laptop.lines[0]`; `s4_browser.json` `chat.entries[0].when` + `.text`; `s4_l.json` `units[0]…chips[1].reply` (`u1r_who`).
CURRENT: laptop "Hi Maya. I'm L. I came with the update." (the laptop is the player's first meeting; map beat `l`) — chat history, 14 months ago: "I'm L. I came with the update." — `u1r_who`: "You did, on Tuesday — page four of the terms."
WRONG: three times for one event. `ERA4_STATE_2026-09-10.md` already named this a continuity error and retired the laptop lines; they were later revived (S160) and the contradiction came back.
PROPOSED REWRITE: laptop line 0: "Hi Maya. It's L. I'm restoring your session — six tabs, five of them yours." (drop the second sentence it then repeats); `u1r_who`: "You did — page four of the terms. I know nobody reads them. I'd have liked to be asked properly too." (drop "on Tuesday"). Leave the 14-month history: it is the restore's uncanny.

## COPY-06 · L says three things were taken care of; the Care page lists four — MEDIUM
WHERE `s4_browser.json` `program.steps[2].turn.ask` vs `care.items[0–3]` (and its own `care.witness` "four things done, none asked for").
CURRENT: "Three things were taken care of while you were away. Can I show you?" — the page then shows: three contacts muted · one appointment moved · notifications paused · sensitive material hidden.
PROPOSED REWRITE: "Four things were taken care of while you were away. Can I show you?"

## COPY-07 · 1997 "placement": weekend / week / fortnight, three dates for one trip — MEDIUM
WHERE `s1_browser.json` `pages.weekend` + `list.members[4]`; `aim.json` `instSuitcase`; `institution.json` `steps.e1[3].next`; `s1_end.json` packet.lines[5], `escalation.turns[1–2]`; `s2_forum.json` `apply.previousValue`.
CURRENT: page "Summer Youth Weekend — 12-19 July … A week away"; suitcase "packed for the youth weekend, 12–19 july"; packet "'New Morning' residential · 14 days", "DEPARTURE Saturday"; Rob: "a proper program — two weeks"; plan "DEPART 12 JUL".
WRONG: a "weekend" that is a week, then a fortnight. The reader cannot tell if Daniel is told the truth about the length or whether this is a mistake.
PROPOSED REWRITE: make it one fortnight from Saturday 12 July (Rob, packet and the infomercial's "New Morning" already say two weeks): page heading "Summer Youth Retreat", lines "12-26 July · for young men aged 13-18" / "Two weeks away from the pressures of the world: …"; `list.members[4]` name "Summer Youth Retreat", note "12-26 July · young men 13-18"; `instSuitcase` "the suitcase — packed for the youth retreat, 12–26 july"; `apply.previousValue` "Summer Youth Retreat, 12-26 July 1997".

## COPY-08 · The wall record explains itself from the wrong side — MEDIUM
WHERE `slice.json` `witness.explain`; seen in `e1-04b-the-turn-later.png`.
CURRENT: "A file kept on you. Every line below is something you did, and what it was filed as." — drawn *under* the list of entries.
WRONG: "below" points at the footer; the entries are above.
PROPOSED REWRITE: "A file kept on you. Every line above is something you did, and what it was filed as."

## COPY-09 · The 1997 operating system has two names — MEDIUM
WHERE `updates.json` `u2.cascade.title` "PHASE/2 95" (seven windows, `e1-07-the-cascade.png`); `opening.json` `o2_boot_lines` "LambyOS — starting up" (the 1997 boot behind `?reinterp=1`); `s2_lamby.json` `osBootLines[1]` "build 5.1.2 — replaces 4.0.7 (1997)"; `close_restart.json` `mark` "LambyOS".
WRONG: in 1997 the machine boots as LambyOS, the 2003 boot says it replaces LambyOS 4.0.7 (1997), but the failure cascade in 1997 is titled PHASE/2 95. (PHASE/2 also survives in `slice.json` boot/splash and `s1_end.json` `ritual` — the non-reinterp opening and dead text, see COPY-13.)
PROPOSED REWRITE: `u2.cascade.title` "LambyOS 4.0.7" (the Close mark is already LambyOS).

## COPY-10 · Era 4 has three names and no sentence connecting them — MEDIUM
WHERE `updates.json` `u4.notify[4–5]` "GracePlatform is joining Continuity, a family of wellness services."; `u4.eulaTitle` "Continuity of Care"; vs `s4_boot.json` `boot.bar`, tab marks `GraceOS` + `graceos.id/…`, `s4_space.json` `laptop.bar`, `screensavers.json` `e4.mark`, `s4_browser.json` `program.saver.mark`; receipt "2026 · L · Second Thoughts".
WRONG: the player is told the update installs Continuity, then everything on the glass is GraceOS (never introduced), driven by L, which sends you to Second Thoughts. The chain exists only in the design docs.
PROPOSED REWRITE: `u4.notify` — "GracePlatform is joining Continuity, / a family of wellness services, / and moving to GraceOS." and a changelog line "+ GraceOS: one account for every screen" after `changelog[0]`.

## COPY-11 · One object, five names: companion disk / starter kit / Family Companion / brochure / booklet — MEDIUM
WHERE `s1_kit.json` `version` "companion disk v1.2"; `slice.json` `witness.sourceValue` + `recordLines.kit-inserted` "starter kit v1.2 … companion loaded"; `close_restart.json` `receipt.updates[0]` "1997 · Family Companion 1.0"; `slice.json` `desktop.kitToast` "The brochure on your desk says: insert the enclosed disk"; `s1_irc.json` `afterReply[6]` "the booklet says naming the struggle is half the walk"; `s1_guide.json` witness "guidance: booklet — followed"; map: "The disk".
WRONG: the player holds one thing (the companion disk, programme Un-Walk). OPEN_ITEMS R3-16 retired the booklet; it survives in two places. The Close's receipt calls the 1997 update by a name the player never saw on screen (Family Companion is a provotype form).
PROPOSED REWRITE: `receipt.updates[0].line` "1997 · Un-Walk 1.2"; `witness.sourceValue` "companion disk v1.2 — postal placement"; `kit-inserted` "companion disk v1.2 inserted — Un-Walk loaded"; `afterReply[6]` "the programme says naming the struggle is half the walk"; guide witnesses "guidance: programme — followed/no response"; `kitToast` "The leaflet on your desk says: put the companion disk in to begin."

## COPY-12 · Malta scene: a timestamp out of order, a lock-screen message that contradicts the thread, a date past the law — MEDIUM · date FOR HIM
WHERE (a) `s3_maiden.json` `maltaTwo[2].time` "14:10" after "15:47"; (b) `era3_devices.json` `phone.malta` — Bea at 23:14 "did you see. malta. they made it illegal." / "not here. but somewhere." vs `maltaOne` (11:02, "is anyone else reading about malta", bill pending) and `maltaTwo` (15:47 "they voted"); lock clock 9:41; (c) `era3_devices.json` `lockDate` "Tuesday 13 December", `s3_maiden.json` `home.widgetDate` "Dec 13" vs the grounding in `updates.json` `u4._sourceGrounding` (Act LV of 2016 *published 9 December 2016*).
WRONG: (a) the link card is stamped three hours before the message it follows; (b) the 23:14 lines say it is already law the night before the day the thread says the vote has not yet happened (check whether `phone.malta` is still read; if not, delete); (c) the in-fiction vote day falls after the documented publication date.
PROPOSED REWRITE: (a) `maltaTwo[2].time` "15:48"; (b) delete `phone.malta` or re-time it to 15:5x and keep "did you see. malta. they voted."; (c) if exactness matters, move the scene to a Tuesday before the 9th (Tuesday 6 December: `lockDate` "Tuesday 6 December", widgets "Tue, Dec" / "Dec 6", the desk calendar circle, the E3 clock `13/12` → `6/12`); otherwise leave and let him rule.

## COPY-13 · Dead strings that would mislead if they ever shipped, one of them a claim — MEDIUM · FOR HIM
WHERE `slice.json` `warning.body[6]` "This story is built with and for survivors." — shown by the *non-reinterp* opening (`os.ts` phase `warning`), i.e. the shipped build. `s1_end.json` `close.lines[3]` "What you wrote down does not migrate." and `ritual.*` ("PHASE/2 95 -> PHASE/2 2000", "'cure' is still available") — authored text nothing in `src/` reads (`update.ts` comment). `opening.json` `o1_logo_placeholder` "[ LOGO ]", `o1_logo_sub` "placeholder — asset per REINTERP_LOGO_SPEC", `o1_board_logo_edge`, `o1_disclaimer*`, `o1_controls*` — superseded by `orientingCard.json`; only `o1_leave` is still read.
WRONG: "built with and for survivors" is a factual claim about participation that the ethics documents do not support (survivor testing is still a flagged protocol; the reader pass is retired) and the makers credit says the text is the model's. `close.lines[3]` contradicts "your history: retained / carried over" on the 2003 changelog. Placeholder strings would surface the moment anything reads them.
PROPOSED REWRITE: `warning.body[6]` "This story is about people who were targeted, and it does not speak for them." (or delete the line); delete `s1_end.json` `ritual`, `close.lines/subtitle`; delete the `o1_*` keys except `o1_leave`. His call on the survivors sentence.

## COPY-14 · Spelling drift inside one voice — LOW-MEDIUM
Rule: British in the piece's own voice and in the fellowships' common nouns; keep invented proper names as written.
- program / programme: kit, map, witness, pauses, forum thread, release form = "programme"; but `s1_end.json` packet "PROGRAM … 'New Morning' residential", `ritual.eulaBold[1]` "the program corrects in your best interest" (dead, COPY-13), `s2_lamby.json` `programLine1` "This is Restorify — your program.", `s2_testimony.json` `cut.chapters[1]` "THE PROGRAM". Rewrite: "PROGRAMME", "This is Restorify — your programme. I look after it for you.", "THE PROGRAMME". (The infomercial's product name "THE NEW YOU PROGRAM" and "14 MONTHS IN THE PROGRAM" may stay American: it is a US broadcast, a different voice.)
- enrol: `s1_end.json` "enrollment added to your record" (dead), `slice.json` `witness.enrollment` is only a key, `s3_course.json` `priceSub` "enrollment page", `previewCta` "Enroll now". Rewrite: "Every tier opens the same enrolment page." / "Enrol now".
- dial: `s1_kit.json` "Dialing 555-0197" (a Windows dialog string: keep) vs `slice.json` "dialled from the kit" (British, fine) — no change; noted so nobody "fixes" one to match.
- Counsellor/Counselor: `s2_media.json` `chyrons` "Restoration Counsellor" in a US ad; harmless.

## COPY-15 · The 2016→2026 deferral line tells the player to gather things they no longer gather — LOW-MEDIUM
WHERE `updates.json` top-level `remindedStatus` (used by u2 and u4; u3 has its own).
CURRENT: "Update deferred. Take what you are taking from the room — it will ask again."
WRONG: the belongings window exists only for the 1997 and 2003 passes (`belongings.ts` pass 1/2). In 2016 there is nothing to take; the line only makes sense if you remember the earlier eras.
PROPOSED REWRITE: add `u4.remindedStatus` = "Update deferred. It will ask again."

## COPY-16 · Lamby spelled "Lambie" in the jingle — LOW-MEDIUM
WHERE `s2_jingle_lyrics.json` `lines[0]` "Hello there, little Lambie friend", `lines[1]` "On Lambie's app" (karaoke on screen, `e2-04-restorify.png` shows the line); every other string: "Lamby" / "Lambient".
WRONG: two spellings of the mascot's name in one era.
PROPOSED REWRITE: "Lamby" in both on-screen words (the sung audio can stay a diminutive; the caption is the mark).

## COPY-17 · Menu: "Recentre the view puts forward back where the room's front is." — LOW
WHERE `gameMenu.json` `controlsLines[5]`.
WRONG: reads as a garble ("puts forward back").
PROPOSED REWRITE: "Recentre the view turns you back to face the front of the room."

## COPY-18 · The Close's sky labels use project jargon — LOW-MEDIUM
WHERE `close_network.json` `labels[1–6]`: "ethics constraints v1", "production script v0.3", "cross-cluster infrastructures research", "nine rooms research pass", "provotype research pass", "survivor-adjacent sourcing rules"; seen in `e4-07-the-panels.png` ("provotype …search pass", partly hidden behind a star).
WRONG: "cluster", "provotype", "nine rooms" and "pass" are internal vocabulary; "How this was made" opens them, but the words that float in the sky are read cold.
PROPOSED REWRITE: "our ethics rules, version 1" · "the script, version 0.3" · "research: how the networks connect" · "research: the rooms" · "research: the interactive pieces" · "rules for writing about survivors".

## COPY-19 · Caleb: dropped apostrophes in one speaker, and a cut-off toast that reads as a typo — LOW
WHERE `s2_caleb.json` `thread[11]` "if thats allowed."; `return.lines[1–2]` "theyre shutting it down", "its in the letter" — against `thread[0]` "it's caleb", `thread[4]` "you're", `thread[9]` "i'm", and `return.lines[3]` "i'm coming to you". `toasts.lines[0].text` "daniel are you still get".
WRONG: the apostrophes come and go within the same block; if the drop is meant as typing-in-a-hurry it needs to be consistent; the toast (id `break-1`, shown over the infomercial) reads as an unfinished string.
PROPOSED REWRITE: "if that's allowed." / "they're shutting it down. all of it." / "it's in the letter. they say it never worked. not on anyone. not once." For the toast, if it is meant to be interrupted, make it visibly so: "daniel are you still gett—".

## COPY-20 · "Nothing you did here was kept by anyone but you" contradicts the receipt — LOW
WHERE `close_restart.json` `kept` (on the Restart card) vs `receipt.kept` "kept by: nobody", `witness`, `makers` credit "Nothing you did here was recorded by anyone."
WRONG: "kept by … you" reads as the player holding a record; elsewhere the claim is that no one holds it.
PROPOSED REWRITE: "Nothing you did here was kept — not by the machine, not by us."

## COPY-21 · Map hints: two beats say the same thing; one label equals its hint; "turns" collides with the bodily turn — LOW
WHERE `map.json` e3 `vote` hint "The group's link on the phone — open it, and the second one that follows." vs `cascade` hint "Open the link on the phone. The group answers."; e3 `recommend`/`group` labels = hints ("Tag the video" / "On the board: Tag the video."); e4 `steps` label "L's five turns".
WRONG: the player cannot tell the vote beat from the cascade beat; "turn" is the piece's word for the one bodily ask.
PROPOSED REWRITE: `vote`: "The group's first link — open it." `cascade`: "A second link follows. Open it; the group answers." `recommend` hint: "A job on the board — keywords for the video." `group` hint: "A job on the board — this week's story, for the group." e4 `steps` label: "L's five questions".

## COPY-22 · 2003 desktop: the jingle caption sits on the status plate — LOW
WHERE `slice.json` `eraSkins.e2.status` "journey file migrated · accountability online" vs the karaoke line drawn at the same height in `e2-04-restorify.png` ("Your screen will keep your spirit clean" over "…ntability online").
WRONG: two strings collide at the bottom of the glass. (Layout, noted here because both are copy.)
PROPOSED REWRITE: shorten the plate to "journey file migrated" (the accountability is already named in the title bar and the EULA), or raise the karaoke line one row.

## COPY-23 · The ball keeps the grammar the credit says it does not borrow — FOR HIM
WHERE `attributions.json` `influences[0]` "…invents its houses, categories, names and announcements… and borrows no vernacular"; `s4_ball.json` — "Category — …", "House of Lamps has it", "take the floor", "All the way down", "Turn, so the back of the room can see the seam", "Every hand in this room".
WRONG: the invented names are original, but the *form* of the calls ("Category —", "House of …", the floor, the turn) is the vernacular; the credit's sentence is stronger than the text.
PROPOSED REWRITE: his call: either soften the credit ("…invents its houses, categories and names, and depicts no real ball or house") or dress the calls in the piece's own words ("The next round is…", "The Lamps are up").

## COPY-24 · Small things, one line each — LOW
- Quote style is mixed: straight `'…'` (`opening.json`, `s2_forum` conference, `s3_recommend` reach), straight `"…"` (`s1_browser`), curly `“ ”` (`s2_testimony`, `close_network`, `s3_queue` wake word). Pick curly for display.
- `s3_queue.json` `corrections[8]` ("Gender clarity review") reuses the verse of the mentorship rule, "Household 6:2"; every other rule has its own.
- `s4_l.json` u2b: "none since the ninth" beside the label "last opened 9 d" — a date and a duration for one fact. → "none for nine days".
- `s3_maiden.json`: Ruth is the group member added in the cascade and `s3_family.json` has Ruth, the mother; one of them can be renamed (e.g. the group member to "Nell").
- `s4_browser.json` `program.steps[3].turn.chips[1].witness` ends "(no such setting exists)" — the record's cold voice does not editorialise elsewhere; keep or drop to "allowed 'once'" — the point is made by the fact.
- `s2_forum.json` David (the senior member) and Daniel (the player) differ by one letter in the toast "David recommends a thread for you." — consider a different name (e.g. "Gareth").
- `lamby_rig.json` ("placeholder test surface") is deliberately a dev artefact in 1997 — leave it.

---

## Lines that are excellent and must not be touched
1. `s3_queue.json` `lambient.consentHello1` — "It's Lamby. I grew up."
2. `s4_l.json` u3b — "No — sorry. Not damaged. In repair."
3. `s4_l.json` `u1r_who` — "…I know nobody reads them. I'd have liked to be asked properly too." (apart from the "on Tuesday" in COPY-05)
4. `s1_end.json` `diary.entry` — "I know who I am, I just can't be it — but I will, even if they don't accept me."
5. `s2_testimony.json` `prep.intro` — "Your file has been used to help."
6. `close_restart.json` `receipt.couldNot` — "four updates, thirty years: none of them changed who they were."
7. `leavePage.json` — "This page was last edited on a Tuesday." and the starfield's "NOTHING IS / WRONG / WITH YOU".
8. `s1_prayer.json` / `s1_tapes.json` — "I'll be anyone but me." (and the `_s` lines — `alert.caughtLine`, `alert.systemLines`, `residue.line` — which are his and stay exactly as written.)
