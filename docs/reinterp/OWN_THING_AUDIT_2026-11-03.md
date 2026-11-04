STATUS: live

# Own-thing audit — 3 November 2026

Build audited: `7ccf737dc8abae341cd9583b594648a62d4ae9f9` (`origin/reinterp`, audit branch `codex/own-thing-audit`). Static audit of `data/` and executable `src/`; no code, content, or display-copy changes. Findings below are editorial observations for review, not ethics rulings or proposed copy.

## How to read the counts

An **own-thing** is personal material, a relationship, or an act of the person, distinguishable from the apparatus's claims about them. An icon, room prop, or name in a data file alone does not establish that a player encounters its meaning. “Handled” means an earlier interaction in that era, not merely an object mentioned or rendered.

Map positions below count every entry, including optional entries: E1 20, E2 17, E3 12, E4 19 (`data/strings/map.json:50`, `:201`, `:335`, `:433`). They are positions in the requested index, not a claim that the runtime follows every row. The runtime reads ledger gates: E1 diary failure, E2 residue, E3 phone cascade (`src/narrative/spine.ts:171`, `:207`; `src/room/era3Devices.ts:1257`). `data/paths.json:16` still marks the built diary false; its flags are not reachability evidence. The map has `quiet` and `optional`, **no register field** (`data/strings/map.json:185`, `:303`, `:416`, `:529`). A quiet flag is not proof of felt/respite, and absence is not proof of operable.

For a repeatable beat-level operable count, the table below labels a map row **mixed** if its live surface contains any person-side felt material; mixed rows interrupt an unbroken operable run. This avoids counting a whole testimony job as uninterrupted apparatus. This is an audit classification of rendered material, not an existing runtime register enum. Optional omissions and early exploration change actual runs. No universal longest run in seconds exists: replies wait for presses, and optional content can be revisited (`src/desktop/apps/caleb.ts:470`, `:489`; `src/desktop/apps/phoneE3.ts:677`). No new walk was run: the full tool takes a long route and writes other audit artifacts (`tools/walk-eras.mjs:14`; `tools/walk.mjs:1651`). Existing differently dated walks are not timing evidence for this revision.

## E1 — 1997, Daniel

**First own-thing on the indexed required route:** `form`, **step 14 of 20**. Its first separate felt screen says “I don't actually know what he thought. I never got to ask.” (`data/provotypes/origin_intake_e1.json:43`); later in the same beat, “He has a name. I'm not writing it down.” (`:76`) keeps a relationship outside the record. Both are Daniel's acts/relations, reached through the system's form. There are 13 prior map slots, of which 2 are optional (`browse`, `wall`); the earlier `web`/`channel` contain human speech, so **not all 13 are operable**. At the beat classification below, 11 preceding slots are operable and 2 mixed/felt (including the optional `browse` among the operable slots); specifically the full sequence is O O O O O O M O F O O O O. Six of those O slots are the initial questionnaire, disk, programme, prayer, pledge and connection (`data/strings/map.json:54–147`; evidence references in this document use the first line of each relevant block).

The first **independent personal document** is `diary`, **step 19 of 20**, after the packet, with “I know who I am, I just can't be it — but I will, even if they don't accept me.” (`data/dialog/s1_end.json:94`). The packet acknowledgement schedules the diary, and the failed erase files the update gate (`src/desktop/os.ts:864`, `:877`). It is not the first felt material: the channel already has Lume's television question, and the form has another felt line before the friendship one (`data/dialog/s1_irc.json:74`; `data/provotypes/origin_intake_e1.json:43`). Those are respectively somebody else's detail and Daniel's relation to the questioning, not an independently encountered possession.

**Available earlier, not guaranteed:** Root Cause is on the desktop from the disk; its quizzes and retained answers can be encountered before its map slot `rootcause`, step 15. The programme's labels remain system text, including “you liked drawing at age 7”; they are not independent proof of Daniel's hobby (`data/strings/rootcause.json:27`, `:97`; `src/desktop/os.ts:799`, `:978`, `:2694`). Tape C/mixtape is also physically addressable, but its first track is the apparatus's “Restore the child…” song, so do not count the prop name as a personal mixtape scene (`src/engine/app.ts:517`, `:524`; `data/dialog/s1_tapes.json:222`). These optional routes prevent an absolute chronological “first” independent of player choices.

**Longest indexed all-operable stretch:** **6 beats**, `profile` through `connect`, steps 1–6. `web` opens the routed channel and is mixed; `channel` is felt/person-side. Later `wall`–`dm` is 4 system/coercion beats; `form`, Root Cause's retained personal answers, and the racket's felt screens interrupt the later run. Full row labels: `OOOOOOMOFOOOOMMMOOMO` (20 entries). Sources: map `:54`, `:96`, `:111`, `:147`, `:154`, `:162`, `:185`; actual channel text `data/dialog/s1_irc.json:11`; separate felt rendering `src/desktop/apps/provotype.ts:292`, `:558`. **Seconds: not measured.** If counting only whole independent felt windows, rather than embedded felt screens, this number increases; silently treating those screens as operable would conceal existing personal material.

**One odd detail:** no guaranteed concrete hobby or taste outside the apparatus. The strongest required personal act is the unnamed friend's name withheld from the form, above. Drawing at seven is told by Root Cause's diagnostic voice, not independently shown (`data/strings/rootcause.json:27`). Lume's X-Files interest is Lume's, not Daniel's (`data/dialog/s1_irc.json:73`). The monkey and rainbow duck are selectable belongings, not an authored personal history (`data/room/belongings.json:11`).

**Loss:** “Leave behind: music, journals, anything from ‘before’.” (`data/dialog/s1_end.json:60`). **Generic, not computed from kept/left objects.** Packet substitution only replaces `{name}` (`src/desktop/apps/packet.ts:40`, `:51`). Actual belongings choices happen **later**, on Remind me later at u2, with item-specific retained lines and an alternative generic processed record (`src/desktop/os.ts:1051`, `:1060`; `src/narrative/belongings.ts:104`, `:116`, `:133`; `data/room/belongings.json:4`, `:14`). Thus the packet cannot truthfully describe a choice the player has not yet made. Music may have been handled voluntarily; the diary is introduced after the packet, not before it (`src/desktop/os.ts:867`). The failed erase resists the loss, rather than establishing that the journal was successfully taken (`src/desktop/apps/diary.ts:91`, `:101`).

## E2 — 2003, Daniel / Caleb

**First required own-thing:** `tapes`, **step 5 of 17**, the uncut reunion in Daniel's take: “...Caleb?” / “Daniel.” / “You okay?” / “Yeah.” (`data/dialog/s2_testimony.json:94`). Before it: **4 operable beats**, assistant, check-in, preparation and release (`data/strings/map.json:205`, `:212`, `:219`, `:226`). The footage remains inside a media-production interface; the personal part is the unplanned exchange after “cut,” not the coached testimony (`data/dialog/s2_testimony.json:89`, `:93`; runtime footage renderer `src/desktop/apps/testimony.ts:613`). In the speedrun, the map excludes tapes/cut, so this first is not universal across cuts (`data/strings/map.json:238`, `:246`).

**First independently explorable own collection:** the `1997` folder, **no map beat id or step**. It is drawn as an E2 desktop icon, has a real click handler, constructor, drawing and routing (`src/desktop/os.ts:3007`, `:3051`, `:3485`, `:4509`). It need not wait for Caleb; his arrival marks it unread and his window then closes it (`src/desktop/os.ts:1583`, `:1607`). Calling it step 8 (`yourfile`) would be wrong: that is the apparatus's read-only file (`data/strings/map.json:256`). The required personal conversation is `thread`, **step 14 of 17**, after the message at 13 (`data/strings/map.json:296`, `:303`).

**Longest indexed all-operable stretch:** **8 beats**, `cut`–`message`, steps 6–13, including optional Your file, forum, application and CLEAR. Full row labels: `OOOOMOOOOOOOOFOFO`. The uncut footage breaks the first stretch; the thread and residue break the later ones (`data/strings/map.json:233`, `:241`, `:303`, `:318`; `src/desktop/apps/caleb.ts:489`, `:731`). **Seconds: not measured.** An opened `1997` folder interrupts this nominal stretch; the intervening evening check-in and companion are real system material absent as separate map rows (`src/desktop/os.ts:1571`, `:1608`).

**One odd detail:** the man who kept the **card from Caleb's tape**, while the programme kept the tape. The optional postcard says “They kept the tape. I kept the card.”; the card is addressed “for D.” with “bed B” in its track list (`data/strings/folder1997.json:18`, `:27`, `:29`). This is concrete and specific, but optional. On the required route Caleb makes a library account to get past blocked requests, and later checks the bus (`data/dialog/s2_caleb.json:118`, `:299`). Those actions belong to Caleb, not a hobby invented for Daniel.

**Loss / what remains:** “Restorify — removed.” and “companion process — could not be removed. RENAMED.” (`data/strings/updates.json:127`). The removal preserves the record: “= your chart: exported, complete”, “= your file: transferred in full”, and explicitly archives Daniel's file (`data/strings/updates.json:119`). These are system processes/files the player has used, **not a personal handled object**. The personal ending is continued contact — “just checked, the bus still runs. i'm coming to you.” (`data/dialog/s2_caleb.json:299`) — and the residue “Then it was never me that was broken…” (`:304`, locked Sérgio line). The tape was introduced in the same era as “i still have the tape from that night. i ripped it. sending it — it's small.” (`:150`), then the block stops its playback (`src/desktop/apps/caleb.ts:317`). The file is registered (`src/audio/tapeAudio.ts:290`). Neither the card nor a keepsake chosen earlier is named as the object lost by the uninstall. The second belongings pass is optional and item-specific; it excludes already retained objects (`data/room/belongings.json:18`; `src/narrative/belongings.ts:75`).

## E3 — 2016, Vera

**First own-thing:** Vera's **personal phone inbox**, reachable as an optional detour before the work gate; not a dedicated map beat. Under the map's `phone`, **step 9 of 12**, it contains Mam's freezer bag with her name and Nuala's retained jumper (`data/dialog/s3_maiden.json:182`, `:207`). The inbox is drawn and individual messages have working read handlers (`src/desktop/apps/phoneE3.ts:577`, `:699`). The phone's required notification resets its screen when armed; it does not require reading the backlog (`:134`, `:142`, `:683`).

Before step 9 are 8 listed slots: 3 opening operable beats, a mixed `work`, operable `record`, mixed `jobs`, operable `recommend` and `group` — **6 all-operable slots, 2 mixed**, including optional rows (`data/strings/map.json:339`, `:360`, `:370`, `:378`, `:386`, `:394`). They are not eight mandatory jobs. The work gate is two jobs in the ordinary cut, one in speedrun (`src/witness/map.ts:128`; `data/strings/map.json:360`). Renata/Noa/Marisol and the other submissions are other people's lives, not Vera's own things (`data/dialog/s3_queue.json:134`, `:145`, `:164`, `:175`). The mandatory group/news route does not establish that the player read Vera's personal messages.

**Longest indexed all-operable stretch:** **3 beats**, `migrate`–`consent`, steps 1–3. Full row labels: `OOOMOMOOMMMO`. Here `work` and `jobs` contain person-side material (submission text, family letters and podcast quotations), and the phone/vote/cascade include the women's own messages (`src/room/graceQueueLite.ts:1779`; `data/dialog/s3_family.json:20`; `data/dialog/s3_podcast.json:26`; `src/desktop/apps/phoneE3.ts:486`). This measure does **not** mean Vera gets an independent personal beat after three steps: the first interruption is somebody else's story being worked on. A route that chooses only apparatus jobs has a longer run; the map does not constrain a unique sequence. **Seconds: not measured. E3 has no respite; none is proposed.**

**One odd detail:** the woman whose mother has **ham in the freezer with her name on the bag** (`data/dialog/s3_maiden.json:182`). It is authored and reachable, but optional. Nuala says “I still have your jumper. I'm not holding it hostage, it's just here.” (`:207`); the build does not explain “former partner” in that message, so that relationship must not be inferred from a design note. No equivalent concrete Vera detail is guaranteed by the work gate (`src/witness/map.ts:128`, `:133`).

**Loss / what remains:** the ending removes the **contributor tools**, not the jumper or freezer bag: “Contributor tools are being retired.” / “Your file comes with you.” (`data/strings/updates.json:162`, `:167`), then “- contributor tools: retired” and “- the moderation queue: retired” (`:240`). The tools were handled earlier during `work`; they are system instruments. The group keeps forwarding the news while people are added (`data/dialog/s3_maiden.json:121`, `:143`, `:153`); its completion files the actual ending gate (`src/desktop/apps/phoneE3.ts:173`; `src/room/era3Devices.ts:1257`). The room's light lifts when the block card opens (`src/desktop/apps/phoneE3.ts:200`, `:211`; `src/room/cluster.ts:105`). **Light is not a handled possession.** No end line names a previously handled personal object being taken. The belongings system has only first/second passes, not a Vera pass (`src/narrative/belongings.ts:54`; `data/room/belongings.json:16`).

## E4 — 2026, Maya

**First required personal act:** `meridian`, **step 8 of 19**: sending her own support enquiry, signed Maya; “I'm trans, and I'm one of those too.” / “Things have got hard lately and I don't know who else to ask.” (`data/dialog/s4_browser.json:258`). Before it: **7 operable map entries**, including optional Match Made (`data/strings/map.json:437`, `:472`, `:480`, `:487`). This is her authored act inside a provider interface, not an independent refuge.

**First required personal object:** `photo`, **step 10 of 19** — the library includes `Pride '24`, `me + Junie.jpg`, and `junie's sign.jpg` (`data/dialog/s4_browser.json:601`, `:606`, `:628`). The player opens/selects real diegetic file rows, implemented by `file-` handlers; this is pre-authored imagery, not camera/file input (`src/desktop/apps/browser.ts:1881`). Nine preceding map entries include 8 operable and the mixed enquiry. First independent felt conversation: `junie`, **step 14 of 19**, with 13 preceding slots (11 operable, 2 mixed: enquiry/photo), not thirteen uninterrupted operable beats (`data/strings/map.json:529`; `src/desktop/apps/browser.ts:267`, `:1893`).

**Longest indexed all-operable stretch:** **7 beats**, `wake`–`open`, steps 1–7; full labels `OOOOOOOMOMOOOFOOORM` (19 entries). The enquiry and file picker are mixed personal/system surfaces; the Junie sheet is felt; the correction `session` remains operable even though the map marks it quiet. The stream is respite; the Close combines its continuation with the system's defeat (`src/desktop/apps/browser.ts:1877`, `:1881`, `:1893`; `data/dialog/s4_ball.json:247`). **Seconds: not measured.** Treating `quiet` as synonymous with felt would incorrectly shorten the system's headset session.

**One odd detail:** the woman whose **coat's shoulder and pocket Junie repaired**, with the pocket worse than she said (`data/dialog/s4_browser.json:719`). This is concrete, on the required Junie route, and not a line from the agent. The coat is mentioned, **never handled** in the current route. The photo library supplies another concrete shared history (`:601`, `:606`).

**Loss / what remains:** the system ends its own session: “SESSION TERMINATED” / “reason: social contagion” / “Second Thoughts has ended this session for your safety.” (`data/dialog/s4_ball.json:260`). The stream chat still contains “same time next week” and “bus is home. still watching” (`:231`, `:235`); the final report says “Your update has failed.” (`data/strings/updates.json:301`). This is **not a personal object taken**. Earlier the photo selection makes a composite, while “original kept” becomes the later “Use original” / “Match: Maya” act (`data/dialog/s4_browser.json:657`, `:733`; `src/desktop/apps/browser.ts:1902`). Yes, a photo was selected earlier in this era; no, the Close does not take it away. The coat is not the object at stake in the Close. Do not turn this ending into a loss of the genuine stream.

## Told versus shown — transparent census

“Line” here means one authored utterance/body string, independent of pixel wrapping. Postcard and certificate inscriptions split for layout are joined into one utterance; track titles each count once. T = explicitly states an inner/bodily state, desire or evaluative reassurance; S = names a concrete object or depicts an action; B = both; O = other conversation, acknowledgement or context. T and S totals below both include B; therefore they overlap. These are editorial classifications, not diagnoses of the characters or objective quality scores.

The row ledger below supplies file:line for **every counted item**. Scope: person-side text on felt and mixed surfaces: E1 channel peers (not Rob), form felt screens, racket felt/landing, diary; E2 both raw participant clips (not producer/system), Caleb thread/return/residue, folder captions/inscriptions/track titles; E3 submission bodies, human comments, flagged thread, parent letters, podcast quotes, group human messages and backlog; E4 Junie sheet. System text, dossier, UI furniture, authored lyrics, perpetrator coaching and stream respite are excluded. Meridian's enquiry is reported separately below because its provider screen is mixed, not the protected felt sheet. This is a census of authored reachable variants, **not the number of lines every run displays**; alternatives and optional jobs are counted once each. The code renders these fields: `src/desktop/apps/provotype.ts:292`, `src/desktop/apps/caleb.ts:489`, `src/room/graceQueueLite.ts:1779`, `src/desktop/apps/phoneE3.ts:486`, `:577`, `src/desktop/apps/browser.ts:1893`. Field-level availability is not a claim all optional text fits the initial viewport: the phone draws the most recent bubbles bottom-up (`src/desktop/apps/phoneE3.ts:498`).

| Era | Counted utterances | State T (including B) | Object/action S (including B) | Other |
|---|---:|---:|---:|---:|
| E1 | 17 | 6 | 9 | 2 |
| E2 | 51 | 12 | 26 | 14 |
| E3 | 48 | 18 | 36 | 5 |
| E4 | 7 | 1 | 4 | 2 |

Five strongest examples of “told” (editorial ranking; exact existing text, no replacement copy):

- E1: “I know who I am, I just can't be it — but I will, even if they don't accept me.” — `data/dialog/s1_end.json:94`.
- E2: “Then it was never me that was broken…” — `data/dialog/s2_caleb.json:304`.
- E2: “i just want to sit next to you and not be watched. if thats allowed.” — `data/dialog/s2_caleb.json:186`.
- E3: “My sponsor says I have an unmet emotional need and I let a woman meet it instead of God, and some days that still sounds true to me.” — `data/dialog/s3_podcast.json:26`.
- E3: “Does it come back? The wanting. Two years in, it came back last month, and I don't know what that says about the two years.” — `data/dialog/s3_comments.json:163`.

E4 has no comparable explicit feeling declaration in its seven protected-sheet utterances beyond the conditional “too much”; its strongest specific line shows the coat repair. On the mixed Meridian screen, the five layout strings at `data/dialog/s4_browser.json:257`–261 contain one explicit distress statement (line 259), no concrete possession, and four greeting/identity/request/signature strings; these are additional to the table. The earlier E3 mother message and E4 coat message demonstrate that personal specifics already exist, with different degrees of guaranteed encounter.

### Counted-line ledger

| Era / row | Class | Field and build evidence |
|---|---|---|
| E1/1 | S | `data/dialog/s1_irc.json:14` · `ambient.0.text` |
| E1/2 | O | `data/dialog/s1_irc.json:18` · `ambient.1.text` |
| E1/3 | T | `data/dialog/s1_irc.json:22` · `ambient.2.text` |
| E1/4 | T | `data/dialog/s1_irc.json:54` · `afterReply.0.text` |
| E1/5 | S | `data/dialog/s1_irc.json:62` · `afterReply.2.text` |
| E1/6 | T | `data/dialog/s1_irc.json:70` · `afterReply.4.text` |
| E1/7 | S | `data/dialog/s1_irc.json:74` · `afterReply.5.text` |
| E1/8 | O | `data/dialog/s1_irc.json:78` · `afterReply.6.text` |
| E1/9 | S | `data/dialog/s1_irc.json:27` · `welcome.text` |
| E1/10 | S | `data/dialog/s1_irc.json:48` · `channelReply.text` |
| E1/11 | T | `data/provotypes/origin_intake_e1.json:43` · `states.1.felt` |
| E1/12 | S | `data/provotypes/origin_intake_e1.json:76` · `states.4.felt` |
| E1/13 | T | `data/provotypes/pillow.json:51` · `states.2.felt` |
| E1/14 | S | `data/provotypes/pillow.json:82` · `states.6.felt` |
| E1/15 | S | `data/provotypes/pillow.json:113` · `states.10.felt` |
| E1/16 | S | `data/provotypes/pillow.json:143` · `close.lines.0` |
| E1/17 | T | `data/dialog/s1_end.json:94` · `diary.entry` |
| E2/1 | O | `data/dialog/s2_caleb.json:79` · `thread.0.text` |
| E2/2 | S | `data/dialog/s2_caleb.json:84` · `thread.1.text` |
| E2/3 | S | `data/dialog/s2_caleb.json:90` · `thread.2.text` |
| E2/4 | O | `data/dialog/s2_caleb.json:97` · `thread.3.chips.0.say` |
| E2/5 | O | `data/dialog/s2_caleb.json:103` · `thread.3.chips.1.say` |
| E2/6 | S | `data/dialog/s2_caleb.json:118` · `thread.4.text` |
| E2/7 | S | `data/dialog/s2_caleb.json:123` · `thread.5.text` |
| E2/8 | O | `data/dialog/s2_caleb.json:130` · `thread.6.chips.0.say` |
| E2/9 | T | `data/dialog/s2_caleb.json:136` · `thread.6.chips.1.say` |
| E2/10 | T | `data/dialog/s2_caleb.json:145` · `thread.7.text` |
| E2/11 | S | `data/dialog/s2_caleb.json:150` · `thread.8.text` |
| E2/12 | S | `data/dialog/s2_caleb.json:158` · `thread.9.text` |
| E2/13 | O | `data/dialog/s2_caleb.json:165` · `thread.10.chips.0.say` |
| E2/14 | T | `data/dialog/s2_caleb.json:171` · `thread.10.chips.1.say` |
| E2/15 | O | `data/dialog/s2_caleb.json:177` · `thread.10.chips.2.say` |
| E2/16 | T | `data/dialog/s2_caleb.json:186` · `thread.11.text` |
| E2/17 | T | `data/dialog/s2_caleb.json:194` · `thread.12.chips.0.say` |
| E2/18 | O | `data/dialog/s2_caleb.json:296` · `return.lines.0` |
| E2/19 | O | `data/dialog/s2_caleb.json:297` · `return.lines.1` |
| E2/20 | O | `data/dialog/s2_caleb.json:298` · `return.lines.2` |
| E2/21 | S | `data/dialog/s2_caleb.json:299` · `return.lines.3` |
| E2/22 | T | `data/dialog/s2_caleb.json:304` · `residue.line` |
| E2/23 | S | `data/strings/folder1997.json:9` · `files.0.caption` |
| E2/24 | S | `data/strings/folder1997.json:10` · `files.1.caption` |
| E2/25 | S | `data/strings/folder1997.json:11` · `files.2.caption` |
| E2/26 | S | `data/strings/folder1997.json:12` · `files.3.caption` |
| E2/27 | S | `data/strings/folder1997.json:13` · `files.4.caption` |
| E2/28 | B | `data/strings/folder1997.json:18` · `card.message` |
| E2/29 | S | `data/strings/folder1997.json:5` · `certificate.back` |
| E2/30 | S | `data/strings/folder1997.json:21` · `roll.frame27` |
| E2/31 | S | `data/strings/folder1997.json:29` · `jcard.tracks.0` |
| E2/32 | S | `data/strings/folder1997.json:29` · `jcard.tracks.1` |
| E2/33 | S | `data/strings/folder1997.json:29` · `jcard.tracks.2` |
| E2/34 | S | `data/strings/folder1997.json:29` · `jcard.tracks.3` |
| E2/35 | S | `data/strings/folder1997.json:29` · `jcard.tracks.4` |
| E2/36 | S | `data/strings/folder1997.json:29` · `jcard.tracks.5` |
| E2/37 | S | `data/strings/folder1997.json:29` · `jcard.tracks.6` |
| E2/38 | S | `data/strings/folder1997.json:29` · `jcard.tracks.7` |
| E2/39 | T | `data/dialog/s2_testimony.json:90` · `tapes.clips.daniel.lines.1.text` |
| E2/40 | T | `data/dialog/s2_testimony.json:91` · `tapes.clips.daniel.lines.2.text` |
| E2/41 | T | `data/dialog/s2_testimony.json:92` · `tapes.clips.daniel.lines.3.text` |
| E2/42 | S | `data/dialog/s2_testimony.json:94` · `tapes.clips.daniel.lines.5.text` |
| E2/43 | O | `data/dialog/s2_testimony.json:95` · `tapes.clips.daniel.lines.6.text` |
| E2/44 | O | `data/dialog/s2_testimony.json:96` · `tapes.clips.daniel.lines.7.text` |
| E2/45 | O | `data/dialog/s2_testimony.json:97` · `tapes.clips.daniel.lines.8.text` |
| E2/46 | O | `data/dialog/s2_testimony.json:98` · `tapes.clips.daniel.lines.9.text` |
| E2/47 | S | `data/dialog/s2_testimony.json:105` · `tapes.clips.caleb.lines.0.text` |
| E2/48 | T | `data/dialog/s2_testimony.json:106` · `tapes.clips.caleb.lines.1.text` |
| E2/49 | T | `data/dialog/s2_testimony.json:107` · `tapes.clips.caleb.lines.2.text` |
| E2/50 | O | `data/dialog/s2_testimony.json:108` · `tapes.clips.caleb.lines.3.text` |
| E2/51 | S | `data/dialog/s2_testimony.json:110` · `tapes.clips.caleb.lines.5.text` |
| E3/1 | B | `data/dialog/s3_queue.json:134` · `submissions.0.text` |
| E3/2 | B | `data/dialog/s3_queue.json:145` · `submissions.1.text` |
| E3/3 | S | `data/dialog/s3_queue.json:164` · `submissions.2.text` |
| E3/4 | B | `data/dialog/s3_queue.json:175` · `submissions.3.text` |
| E3/5 | S | `data/dialog/s3_comments.json:115` · `comments.0.text` |
| E3/6 | O | `data/dialog/s3_comments.json:121` · `comments.1.text` |
| E3/7 | T | `data/dialog/s3_comments.json:127` · `comments.2.text` |
| E3/8 | S | `data/dialog/s3_comments.json:133` · `comments.3.text` |
| E3/9 | B | `data/dialog/s3_comments.json:139` · `comments.4.text` |
| E3/10 | S | `data/dialog/s3_comments.json:145` · `comments.5.text` |
| E3/11 | S | `data/dialog/s3_comments.json:151` · `comments.6.text` |
| E3/12 | S | `data/dialog/s3_comments.json:157` · `comments.7.text` |
| E3/13 | T | `data/dialog/s3_comments.json:163` · `comments.8.text` |
| E3/14 | S | `data/dialog/s3_comments.json:169` · `comments.9.text` |
| E3/15 | S | `data/dialog/s3_comments.json:175` · `comments.10.text` |
| E3/16 | S | `data/dialog/s3_comments.json:181` · `comments.11.text` |
| E3/17 | T | `data/dialog/s3_flagged.json:25` · `thread.0.body` |
| E3/18 | T | `data/dialog/s3_flagged.json:33` · `thread.1.body` |
| E3/19 | T | `data/dialog/s3_flagged.json:41` · `thread.2.body` |
| E3/20 | S | `data/dialog/s3_flagged.json:49` · `thread.3.body` |
| E3/21 | S | `data/dialog/s3_flagged.json:57` · `thread.4.body` |
| E3/22 | S | `data/dialog/s3_flagged.json:65` · `thread.5.body` |
| E3/23 | B | `data/dialog/s3_family.json:23` · `parents.0.body` |
| E3/24 | B | `data/dialog/s3_family.json:30` · `parents.1.body` |
| E3/25 | S | `data/dialog/s3_family.json:37` · `parents.2.body` |
| E3/26 | T | `data/dialog/s3_podcast.json:26` · `clips.0.quote` |
| E3/27 | B | `data/dialog/s3_podcast.json:35` · `clips.1.quote` |
| E3/28 | B | `data/dialog/s3_podcast.json:44` · `clips.2.quote` |
| E3/29 | S | `data/dialog/s3_maiden.json:18` · `before.0.text` |
| E3/30 | S | `data/dialog/s3_maiden.json:23` · `before.1.text` |
| E3/31 | B | `data/dialog/s3_maiden.json:28` · `before.2.text` |
| E3/32 | O | `data/dialog/s3_maiden.json:33` · `before.3.text` |
| E3/33 | T | `data/dialog/s3_maiden.json:38` · `before.4.text` |
| E3/34 | S | `data/dialog/s3_maiden.json:43` · `before.5.text` |
| E3/35 | S | `data/dialog/s3_maiden.json:52` · `maltaOne.0.text` |
| E3/36 | S | `data/dialog/s3_maiden.json:62` · `maltaOne.2.text` |
| E3/37 | S | `data/dialog/s3_maiden.json:76` · `maltaTwo.0.text` |
| E3/38 | O | `data/dialog/s3_maiden.json:86` · `maltaTwo.2.text` |
| E3/39 | S | `data/dialog/s3_maiden.json:91` · `maltaTwo.3.text` |
| E3/40 | S | `data/dialog/s3_maiden.json:123` · `cascade.2.text` |
| E3/41 | O | `data/dialog/s3_maiden.json:133` · `cascade.4.text` |
| E3/42 | O | `data/dialog/s3_maiden.json:138` · `cascade.5.text` |
| E3/43 | S | `data/dialog/s3_maiden.json:182` · `backlog.0.text` |
| E3/44 | S | `data/dialog/s3_maiden.json:187` · `backlog.1.text` |
| E3/45 | B | `data/dialog/s3_maiden.json:192` · `backlog.2.text` |
| E3/46 | B | `data/dialog/s3_maiden.json:197` · `backlog.3.text` |
| E3/47 | S | `data/dialog/s3_maiden.json:202` · `backlog.4.text` |
| E3/48 | S | `data/dialog/s3_maiden.json:207` · `backlog.5.text` |
| E4/1 | T | `data/dialog/s4_browser.json:707` · `thread.messages.0.text` |
| E4/2 | S | `data/dialog/s4_browser.json:711` · `thread.messages.1.text` |
| E4/3 | S | `data/dialog/s4_browser.json:715` · `thread.messages.2.text` |
| E4/4 | S | `data/dialog/s4_browser.json:719` · `thread.messages.3.text` |
| E4/5 | S | `data/dialog/s4_browser.json:723` · `thread.messages.4.text` |
| E4/6 | O | `data/dialog/s4_browser.json:726` · `thread.reply` |
| E4/7 | O | `data/dialog/s4_browser.json:727` · `thread.replied` |

## Jump legibility / guard 1

**E1 → E2, same Daniel:** installation says “= Daniel's file: carried over, scanned” (`data/strings/updates.json:57`), arrival says “Welcome back, Daniel.” (`data/dialog/s2_lamby.json:3`), boot says “build 5.1.2 — replaces 4.0.7 (1997)” and “Your file was kept while you were away.” (`:8`, `:18`). These fields are actually rendered by `src/desktop/apps/update.ts:499` and `src/desktop/os.ts:3338`, `:3386`. The published page adds “Daniel came to New Morning in 1997.” (`data/dialog/s2_testimony.json:141`). Strong redundant continuity, not just a changed calendar.

**E2 → E3, a different person:** the install explicitly says “= Daniel's file: archived · a new file: Vera” (`data/strings/updates.json:121`); arrival says “Welcome back, Vera.” (`data/dialog/s3_queue.json:12`, rendered at `src/room/graceQueueLite.ts:1449`). The explicit distinction is one typed changelog row, not a separate mandatory acknowledgement. It is rendered, but this audit has not established its first-time readability in a headset (`src/desktop/apps/update.ts:499`).

**E3 → E4, a different person:** “= Vera's file: archived · a new file: Maya” (`data/strings/updates.json:238`), then “L — booting up for you, Maya.” (`data/dialog/s4_boot.json:10`, rendered at `src/desktop/apps/browser.ts:692`). These are clear identity markers when read. The first Maya personal act now follows the agent referral, not the instant arrival (`src/desktop/apps/browser.ts:1877`; `data/dialog/s4_browser.json:279`).

**Every located active transition wording that could support a one-person reading despite those markers:**

| Location | Exact wording | Ambiguity |
|---|---|---|
| `data/strings/updates.json:81` | “Your file has been migrated to a” / “brighter place.” | Direct second-person continuity before the new-Vera row. |
| `data/strings/updates.json:106` | “Files inherited from previous” / “providers remain available to” / “our care team. All of them.” | Suggests one accumulating subject file unless the archive distinction lands. |
| `data/strings/updates.json:119` | “= your chart: exported, complete” / “= your file: transferred in full” / “+ nothing has been deleted” | Adjacent to the correct new-file row but retains the migration premise. |
| `data/strings/updates.json:140` | “subject migrated — file retained” | Witness record says the subject, not only infrastructure, migrated. Actually filed at u3 and rendered by intake (`src/desktop/os.ts:1012`; `src/witness/intake.ts:262`). |
| `data/strings/updates.json:282` | “= the chart: complete” / “= your file: cross-referenced” | Vera's arrival retains a chart from the preceding ritual without explaining whose chart. |
| `data/strings/updates.json:287` | “Installed. Your file arrived first.” | Vera can read as the migrated Daniel; actual arrival renderer `src/room/graceQueueLite.ts:1427`. |
| `data/strings/updates.json:167` | “Your file comes with you.” | Second-person E3→E4 continuity. |
| `data/strings/updates.json:188` | “Your record (1997, 2003, 2016) is” / “carried forward without alteration” / “and informs your experience today.” | Strongest active guard-1 risk: the 2026 addressee appears to own all three previous eras. |
| `data/strings/updates.json:237` | “= the record: thirty years, intact” / “= the goal: unchanged, on file” | Thirty-year identity/goal accumulation beside Maya's new-file marker. |
| `data/dialog/s4_boot.json:5` | “Restoring your session” | On its own this is normal device continuity, but next to the accumulated record it can strengthen the same-subject reading. |

This is a list of possible readings for Sérgio, **not a finding that Daniel transitions into Vera or Maya in canon**. The explicit archive/new-file lines establish the opposite. The witness map labels all four eras by person (`data/strings/map.json:51`, `:202`, `:336`, `:434`), but a first-time player need not open the game menu to read them.

**Dormant contradictory copy, not an active transition:** “The next session begins as someone else.” / “What you wrote down does not migrate.” (`data/dialog/s1_end.json:131`). Packet and diary import this file but read their own blocks (`src/desktop/apps/packet.ts:51`; `src/desktop/apps/diary.ts:17`); the active E1 transition is UpdateApp's u2 data (`src/desktop/apps/update.ts:499`). Do not cite the dormant ending as evidence of what the audience sees.

## Orphans and encounter failures

1. **Maya's sketchbook/footwear observation remains authored but has no ordinary start.** `u2_room` still contains FOOTWEAR and sketchbook cataloguing (`data/dialog/s4_l.json:74`, `:83`, `:96`). LVoice initializes `started = false` and only `begin()` changes it (`src/desktop/apps/lVoice.ts:140`, `:148`); Space constructs and updates it but the current wear path sets session state instead of calling begin (`src/desktop/apps/space.ts:212`, `:355`, `:833`). `voice.begin()` occurs only in a historical comment (`:804`). Thus importing the JSON does not make those object-caption beats reachable. The r4 removal list also removes `e_sketchbook` and `e_hoodie` (`data/room/reinterp_deltas.json:2595`, `:2597`). This is dormant/retired material, not a new content opportunity to restore without a decision.
2. **E1's old closing/power-of-migration text is dormant**, as traced above (`data/dialog/s1_end.json:126`; live consumers `src/desktop/apps/packet.ts:51`, `src/desktop/apps/diary.ts:17`). This includes a misleading “someone else” E1→E2 claim. It should not inflate the active guard-1 count.
3. **E2's personal collection is not orphaned.** The actual icon, open handler, rendered captions, postcard, certificate back, roll frame and track list exist (`src/desktop/os.ts:3007`, `:3485`, `:4509`; `src/desktop/apps/folder1997.ts:115`, `:153`, `:278`, `:292`). Its omission from all 17 E2 map rows is an **encounter/index gap**, not a missing trigger (`data/strings/map.json:201`). Opening Caleb actively puts it down (`src/desktop/os.ts:1607`), so an unread mark is not proof the collection was seen.
4. **Vera's backlog is not orphaned.** The messages are in the phone list and read handler (`src/desktop/apps/phoneE3.ts:577`, `:699`). It is optional, while the notification goes directly to the group (`:683`). Importantly, the data comment says “nothing is filed,” but the inbox handler actually files `e3_backlog` (`:685`); individual read presses only update in-memory read state (`:699`). Comments are not evidence of either silence or a triggered encounter. No respite is inferred from the stale “ERA'S RESPITE” comment at `data/dialog/s3_maiden.json:177`.
5. **The old tape-song distinction does not establish an own-thing:** the physical `mixtape` maps to Tape C (`src/engine/app.ts:517`) but its live first track is programme lyrics (`data/dialog/s1_tapes.json:222`). Caleb's later rip is a different registered file and does have a thread trigger (`data/dialog/s2_caleb.json:150`; `src/audio/tapeAudio.ts:290`; `src/desktop/apps/caleb.ts:282`). Do not merge them into a single handled keepsake on the strength of “tape.”
6. **No static orphan found for the live E4 personal sequence:** photograph selection and Junie reply have direct handlers (`src/desktop/apps/browser.ts:1881`, `:1893`, `:1900`); `Use original` is gated on that reply (`:1902`). Ball's current ending has an executable continuation and monitor-stream renderer (`src/desktop/apps/ball.ts:293`, `:552`). This is static wiring evidence, not a new successful walkthrough or headset observation.

## Ranked gaps — worst first

| Rank | Era · gap | Evidence | Smallest possible fix (no copy drafted) | Who decides |
|---:|---|---|---|---|
| 1 | E2→E3 / E3→E4 · identity handoff competes with one accumulating “your” record | `data/strings/updates.json:121`, `:188`, `:238`, `:287`; `src/witness/intake.ts:262` | Review the listed transition strings together; retain the explicit new-person rows and remove conflicting subject continuity if directed. | Sérgio: guard-1/ethics and wording direction; implementer after decision. |
| 2 | E3 · Vera's strongest own specifics are optional inbox detours; required work first shows other people | `data/dialog/s3_maiden.json:182`, `:207`; `src/desktop/apps/phoneE3.ts:683`; `data/strings/map.json:360`, `:402` | Conduct an existing personal-message encounter before returning to work, if approved; no new scene, no E3 respite. | Sérgio: whether/how to require it; implementer: routing. |
| 3 | E1 · “leave behind” is generic and precedes both the diary and actual keep/leave choices | `data/dialog/s1_end.json:60`; `src/desktop/apps/packet.ts:40`; `src/desktop/os.ts:867`, `:1051` | Decide whether the packet is an institutional prohibition or a later consequence of actual choices; only the latter should resolve from belongings state. | Sérgio: meaning/order; implementer: data binding after decision. |
| 4 | E2 · rich personal collection absent from the map, closed when Caleb arrives | `src/desktop/os.ts:1607`, `:3007`; `data/strings/map.json:201`; `data/strings/folder1997.json:18` | Index the existing collection; review a return opportunity after the song instead of authoring another collection. | Sérgio: cadence; implementer: map/routing. |
| 5 | E1 · early warmth belongs to channel peers; independent personal diary is step 19 | `data/dialog/s1_irc.json:74`; `data/strings/map.json:185`; `data/provotypes/origin_intake_e1.json:76` | Review placement of an existing person-side act; do not treat programme diagnostic labels as independent biography. | Sérgio: narrative order; implementer afterwards. |
| 6 | E4 · coat detail is specific but never handled; retired sketchbook can be mistaken for live personal material | `data/dialog/s4_browser.json:719`; `data/dialog/s4_l.json:96`; `src/desktop/apps/lVoice.ts:140`; `data/room/reinterp_deltas.json:2597` | Confirm whether the present photo/library handling already supplies sufficient ownership; mark/remove dormant captions only if separately authorized. | Sérgio: sufficiency and retirement; implementer: cleanup. |
| 7 | All · map rows hide mixed registers and unindexed content, so a quiet-flag count misstates felt cadence | `data/strings/map.json:233`, `:360`, `:551`; `src/desktop/apps/provotype.ts:292` | Maintain sub-beat/register annotations or a trace that records actual felt entry before making timing claims. | Implementer proposes instrumentation for offline review; Sérgio reviews cadence. |
