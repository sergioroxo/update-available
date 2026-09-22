STATUS: live

# OPEN ITEMS — the one register of what is owed
*Started 2026-09-17 after Sérgio's third sit-through: "you are no longer marking all the things to be
done." BUILD_LOG records what was built; this records what is OWED, by id, until it moves. THE LAW
FROM HERE: every session opens by reading this file; every BUILD_LOG entry names the ids it closes
(`closes R3-05, R3-18`); an id moves to DONE only with proof (a walk, a frame, or his word); nothing
is removed, ever — closed ids stay, struck through, with the session that closed them.*

Sources: `REVIEW_ROUND_3_2026-09-17.md` (R3-nn, the full reply to each), `WALKTHROUGH_2026-08-21.md`
(W-nn, the first play — items not re-raised on 09-17 but still open), `REVIEW_R1_2026-09-02.md`.

## Priority 0 — THE PROGRESSION LAW (the rule under most of the list)
`NARRATIVE_FLOW_2026-09-17.md` is the flow of record (MAIN · ○ OPEN · VOICE · GATE · GLITCH per era; the map must match it). `PROGRESSION_LAW_2026-09-17.md`: inside an era everything on the desk is a sandbox (openable any time, never blocking); the era's exit is a GATE named by the map's beats; the update fires only when the gate is met AND nothing is open. Generalises R3-82 to all four eras; R3-13, R3-40, R3-73, R3-98 are its first cases.

## Priority 1 — premise bugs and outright bugs
| id | item | status |
|---|---|---|
| R3-95 | ~~Maya is not Daniel: Vera's profile and Maya's legacy file must hold their OWN era's rows only~~ | DONE — S149 · Vera 2016 rows only; Maya her 2026 rows only (`yourRecord.ts`, `browser.ts`); walked |
| R3-73/80 | ~~Era 3 must not end before the phone is picked up and the group seen; no update over an open job~~ | DONE — S149 · the era ends on the cascade SEEN on the phone and nothing open; the spine no longer arms it; walked through the phone (238 presses) |
| R3-04 | ~~Room bed starts at Log in, not at the landing~~ | DONE — S149 · `startFirstBed()` at build (the Log in press is the gesture) |
| R3-05 | ~~The monkey faces the wall (W: 08-21 §D)~~ | DONE — S149 · `yaw: 180` on teddyBox, checked by eye |
| R3-11 | ~~Family Form: the X does nothing~~ | DONE — S149 · the frame's X → leave |
| R3-18 | ~~"Companion cassette insert" caption — remove (W: 08-21 §E)~~ | DONE — S149 · caption removed |
| R3-37 | ~~"Press to keep it" cut off (W: 08-21 §H)~~ | DONE — S149 · beside the sentence |
| R3-47 | ~~No conducted look on landing (comfort law; cybersickness)~~ | DONE — S150 · the landing keeps the look (`seatCut(seat, true)`) |
| R3-67 | ~~Phone screen plane larger than its model; phone lost behind props~~ | DONE — S149 · on a 16 cm dock, leaning 15°, in frame from the seat (measured); the walk found it |
| R3-76 | ~~The held phone follows the head's yaw, not the seat's~~ | DONE — S149 · the held pose follows the look |
| R3-77 | ~~The phone's unlock has no drawn button~~ | DONE — S150 · an Unlock pill on the lock screen |
| R3-79 | ~~The chat does not play once opened; phone text pixelated~~ | DONE — S149 · root cause: no `link` message existed, the card could never open — the bill card and the vote card are in the thread; pixels: still open → R3-100 |
| R3-98 | ~~The photos step auto-advances to care~~ | DONE — S150 · every step waits for Continue; no clock |
| R3-100 | ~~E3/E4 screen text pixelated (surface render scale)~~ | DONE — S150 · monitor and phone surfaces at ×3 |
| R3-103 | ~~The session bed keeps playing under Junie's card~~ | DONE — S149 · the room bed fades as the session starts |
| R3-113 | ~~Restart card → Maya: no relocation, black screen~~ | DONE — S150 · a fresh shell on return; the spine reopens; verified by hand (Maya → the room, then the Close again) |
| R3-114 | ~~The 1997 Close panel draws "IN THIS ROOM, YOU" twice with 2026's lines~~ | DONE — S150 · `y0 +` — every era's lines were drawn into the first cell; reproduced and fixed |
| R3-49 | ~~Restorify "Not now" does nothing; window still 1997 (W: 08-21 §I)~~ | DONE — S150 · Not now → the system's toast says where Restorify went (the 2003 look stays under R3-41/50/51) |
| R3-55 | ~~Caleb pop-up AND PureMail both appear; PureMail before the thread (W: 08-21 §I)~~ | DONE — S150 · one line and the dot, no card; PureMail only after the commit |
| R3-69 | ~~The "source file" icon appears out of nowhere (W: 08-21 §C)~~ | DONE — S150 · no summons in 2016 (the send data stays for L-03) |
| R3-96a | ~~Restored photo drawn out of its area~~ | DONE — S150 · the comparison is width-bound inside the card |

## Priority 2 — Era 1 conducted (one design: the First Steps as the spine)
| id | item | status |
|---|---|---|
| R3-19 | ~~The kit's First Steps: each a press with its panel; ticks off~~ | DONE — S151 · the wizard's First Steps page: five presses in order, each its own panel, ticks off; walked |
| R3-13 | ~~The Family Form appears only after Rob's "I spoke with your mother"~~ | DONE — S151 · `rob-spoke-mother` filed by Rob's turn; the icon, the wizard's step 4 and the guide line read it; walked (step:form after the line) |
| R3-16 | ~~The kit looks like a booklet; the guide stops saying "enclosed booklet"~~ | DONE — S151 · the wizard look (R3-15) supersedes the booklet; "read the programme." |
| R3-17 / 53 | ~~A programme loop (MIDI-hymn register) while the kit is open~~; the same loop as a file in 2003 | R3-17 DONE — S151 · `unwalk_loop_1997.mp3` (tools/make_hymn.py), yields to the tape and the menu · R3-53 OPEN (Priority 4) |
| R3-20 | ~~The tape's radio voice comes from a press and says what it is for~~ | DONE — S159 · his call: the wizard names it as an option — one line on the pray page: "the second tape on the shelf is the fellowship's radio hour — not a step; there if you want it" |
| R3-21 / 22 | ~~The prayer's words on screen from the Whisper transcript, timed; follow along, press at the end (W: 08-21 §G)~~ | DONE — S151 · `s1_prayer.json` from his Whisper transcript, 147/147 words; highlighted as sung; Amen at the end; tour frame 12 |
| R3-26 | ~~Channel exchanges before the DM; the DM as a request to accept~~ | DONE — S151b · "MentorRob would like to send you a private message" — Accept (Ignore dead); the DM opens on the press; walked (dm-accept at 147) |
| R3-27 / 32 | ~~The intake panel explains itself; practice title beside each row (W: 08-21 §J)~~ | DONE — S151b · the wall: "A file kept on you…" + the practice's title beside each entry; the menu's Your file as wide as the map; seen from the flip |
| R3-28 | ~~DM scrollback; faster typing~~ | DONE — S151b · two arrows page the DM; 19 cps / 2.6 s hold; walked (dm-up/dm-down pressed) |
| R3-38 | ~~The racket: glow + guide line (W: 08-21 §D)~~ | DONE — S151b · the lift breathes 0.35→1.0 on 2.6 s; the guide line "the racket on the wall — the first exercise" (S151); seen from the seat |
| R3-40 | ~~Deferral: the IRC closes; the belongings window reads as a thing to do~~ | DONE — S151b · Remind me later closes the channel; "take what you are taking: press what you keep, here in the room"; the standing line says it too; the shelf breathes; by hand via update2 |
| R3-24 | ~~Dial-up on the black screen with a connection panel — his references FOUND: `References images/to enter online.png` (Internet Setup Wizard) and `for IRC connection.png` (Make New Connection) (W: 08-21 §H)~~ | DONE — S151 · the Internet Setup Wizard on black: Welcome · Make New Connection · Connect To; the dial-up plays as it opens; tour frames 15–17 |
| W-E1 | ~~The floppy / the tapes glow so they can be found (08-21 §E)~~ | DONE — S151b · the disk, the tapes and the player breathe while their line is up (with R3-38) |
| W-L1 | ~~**Lamby's 1997 app**: today the rig file is "like a tamagotchi"; his design `Pc_Simulation/Lamby Games/Mini-Games_LAmby.md` (Root Cause Digger, Purity Maze, Straight & Narrow Crossing…) was never referenced in the repo — pick one for 1997 and build it as the kit's game — ⚑ HIS PICK (2026-09-20): **Dig Dug → "Root Cause Digger"**~~ | DONE — S153 · ROOTCAUSE.EXE beside lamby_rig.exe: press-only, turn-based Dig Dug, the diagnoses, the burst, the glitch, the Authentic Memory flag; ○ on the map, one soft line; played to both endings by hand, walked (264, the walker dug) |
| W-E2 | ~~Windows minimise, not just X (08-21 §E)~~ | DONE — S165 · his call (a): every program window has a `_` box and a taskbar button (mIRC · Un-Walk · lamby_rig · ROOTCAUSE · found · Restorify · Player · NetVision); the felt windows own the screen by law and do not |

## Priority 3 — sound redo, one pass with his ear
| id | item | status |
|---|---|---|
| R3-02 | ~~A score for the descent~~ | DONE — S155 · `descent_score` — his 2026-09-20: "I don't mind the descent score" |
| R3-08 | ~~`ui_press` soft click~~ | DONE — S155 · 14 ms filtered noise, ours; Freesound #619835 retired |
| R3-14 | ~~Floppy drive sound~~ | DONE — S155 · a drive: motor, two head seeks, 3.4 s, lower |
| R3-25 | ~~IRC tick: soft, only his lines + the DM~~ | DONE — S155 · one soft tick; only his lines and the request |
| R3-36 | ~~Diary: typing, flag, erase~~ | DONE — S155 · a key per character, the flag, the erase; by hand |
| R3-39 | ~~Error ding lower~~ | DONE — S149 · u2 ding at 0.45 |
| R3-43 / 63 | ~~Passage sound: low wind, no whoosh~~ | DONE (sound) — S155 · low wind (`passage_wind`), no whoosh; the update cues under R3-85 · the path is R3-46 |
| R3-48 / 64 | Boot cues 2003 / 2016; boot music quieter | PARTIAL — S155 · 2003: POST beep + drive under the splash, the jingle at half; 2016: a soft rising pair · OPEN: the black screen before the blue house, the shorter loading bar |
| R3-68 | ~~2016 platform bed + Lambient chime~~ | DONE — S155 · `lambient_chime` with every Lambient line, over the 2016 bed |
| R3-85 | ~~The update's install/restart cues~~ | DONE — S155 · the install as a drive working, the restart as the hum dropping — HIS EAR on it |
| R3-88 | ~~`type_2026` soft~~ | DONE — S155 · sparser, softer, not per character |
| R3-97 | ~~Drop `restore_2026`~~ | DONE — S149 · dropped |
| R3-102 | ~~The session's recording introduced, hiss cue reconsidered~~ | DONE — S155 · "Now playing: a recorded conversation, 11 min…" before the sentences; the hiss at half; the card still on the dash |
| R3-110 | A Close score | BUILT — S155 · `close_score` — sent to him S159 to hear; the Close's other notes are C-01…C-03 |
| W-G1 | ~~Lamby needs a sound ("how Clippy sounded") (08-21 §G)~~ | DONE — S155 · `lamby_pop` on his appear |
| W-G2 | ~~Captions everywhere (08-21 §G)~~ | DONE — S159 · his call (b): every sound is named in the strip for 1.8 s (`data/strings/captions.json`, `setCueListener`); the tapes' words first, then a cue, then the sentence line. His second half — "in the startup panel include the option on how we'd want to navigate" — is F-01 under Priority 7 |

## Priority 4 — the flight and Era 2
| id | item | status |
|---|---|---|
| R3-46 / 86 | ~~Rise → hold → morph in view → descend~~ | DONE — S156 · rise to a high overlook looking down (−40°), hold over the room at −45° while it ages, 8 s descent; comfort law kept; seen by hand; walked 259 |
| R3-44 | ~~2003 dressing pass; room-audit findings closed (W: 08-21 §B)~~ | DONE — S157 · the posters, the curtains, the lamp, the desk clutter, the machine (R3-45); the audit's r2 findings closed (0) |
| R3-45 | ~~The computer changes: beige+CRT → black+LCD~~ | DONE — S156 · the 2003 fold retires the beige CRT/tower/keyboard and adds a black flat panel on a stem, a black tower, a black keyboard (box-built behind the same screen plane); r4 removes them |
| R3-48 | ~~E2 boot: black → POST → shorter splash → OS~~ | DONE — S166 · his call moved the whole question: the machine boots in silence (black · POST · crawl · installer line) and the jingle is the software's, over Lamby's cartoon; the splash and its bar are out of play (`e2Splash` reviews them) |
| R3-50 | ~~Program-start splash for 2003 apps~~ | DONE — S157 · a loading box before every 2003 program |
| R3-51 | ~~Messenger: faster; the 2003 IM look~~ | DONE — S157 · the 2003 IM look (mark, toolbar, contact list); gaps tightened |
| R3-52 / 75 | ~~A media player: Caleb's song as an attachment; Noa's cut plays~~ | DONE — S157 · the rip as an attachment → a Media Player; the Story cut plays (playhead, her sentences lit; no voice) |
| R3-58 / 59 | ~~The network's failure SEEN before the mail; the glitch as its consequence~~ | DONE — S157 · the network seen failing before the mail: four contacts tried and lost, "Escalation failed", then the envelope |
| R3-60 | ~~Deferral copy: "being removed"~~ | DONE — S156 · u3 deferred: "Restorify is being removed. Take what you are taking…" |
| R3-62 | ~~The 2003→2016 notice gets the E3 look~~ | DONE — S157 · the 2003→2016 notice and terms on 2016's glass |
| R3-41 | ~~The 2003 EULA gets the E2 look~~ | DONE — S157 · Restorify's band and house mark over the 2003 terms |
| R3-61 | ~~Anything to do after the residue?~~ | DONE — S164 · his call: the monitor stays black after the residue and the Service Transition notice rises out of it (`residueDark`) |

## Priority 5 — Era 3's devices
| id | item | status |
|---|---|---|
| R3-66 | ~~Lambient "Not now" sticker; one clock for phone + workstation~~ | DONE — S158 · the "not yet available" sticker on Not now (it still works); one clock, 9:41 at sign-in, both faces |
| R3-70 | ~~Corrections per story 7 → 3~~ | DONE — S158 · Renata: soften the term · clip for the broadcast · route for mentorship |
| R3-71 | ~~Noa's video: a real player, labelled~~ | DONE — S158 · the player a third bigger, a Play/Pause button beside it |
| R3-72 | ~~The phone on a stand~~ | DONE — S149 · the dock (`w_phoneStand`) |
| R3-74 | ~~"Back to today" at the bottom of a finished job~~ | DONE — S158 · a finished story holds: Back to today / Next story |
| R3-78 | ~~Phone home screen: Messages, the platform, FloppySheep~~ | DONE — S158 · the platform's tile, Messages with the group's thread first, FloppySheep |
| R3-81 | ~~A line to look at the phone; you can put it down~~ | DONE — S149 · Lambient: "Your phone's lit…" / "…you can always put it down." |
| R3-82 | ~~Era 3 beats gate on the previous being seen~~ | DONE — S158 · one job → the phone; the map's 2016 beats as the flow of record; walked 262 |

## Priority 6 — Era 4's program as a conversation with L
| id | item | status |
|---|---|---|
| R3-93 / 104 | ~~L asks, she answers (chips); the five steps come out of it and build to the session~~ | DONE — S160 · the turn: L's question in the step bar, two chips, both leading on; her answer filed as `turn:<step>`; no press of the step's own until answered; the headset only after the last |
| R3-87 | ~~The wake as a screensaver with one press~~ | DONE — S160 · the mark drifting on black, "press to restore your session" (`saver-wake`) |
| R3-89 / 90 | ~~The search tab as a results page → the Second Thoughts site → the agent~~ | DONE — S160 · recents, the query, four results (the first the only press), the landing page, Start a session → the agent |
| R3-91 | ~~The laptop says what it is doing~~ | DONE — S160 · restoring · restored · the search is done · Second Thoughts can take it from here · each step's line · the headset |
| R3-94 | ~~Step 1 as the provider's intake gate; the BetterHelp case into the dossier~~ | DONE — S160 · "Second Thoughts Care · intake · required before care"; `e4_offers.json` source 4 (documentary, high), `practices.json` `care` cites it |
| R3-96 | ~~L introduced by name on the laptop before the search~~ | DONE — S160 · the laptop's lines name L and say it is restoring six tabs |
| R3-101 | ~~"L needs access to your messages" → allow → threads → this one~~ | DONE — S160 · Allow / Just this once → Junie · Mum · Flat 3B (Junie's the press) → the thread → Confirm |
| R3-105 / 106 | ~~The first flash before the world; a slower arrival with lights and a greeting~~ | DONE — S161 · the glass flickers over her room 2.4 s, the hall cuts in on the first full flash; lamps 0→9→17→25 in the fight, 41 in the hall; the two beside her step in: "Hi, Maya." / "You made it…" before the MC |
| R3-92 | ~~FloppySheep on the 2026 home screen~~ | DONE — S168 · a ☆ bookmark in the free browser; the phone's game in a frame on the page |

## Priority 7 — the frame and the front door
| id | item | status |
|---|---|---|
| F-01 | ~~**The front door offers the choices** (his 2026-09-20): how you want to navigate this — computer (mouse/drag) · phone (turn the device) · headset — and captions on/off — chosen on the pre-fiction panel, not discovered; with R3-01's redesign~~ | DONE — S162 · three cards with their own way in (the phone card asks the device in its press); the captions checkbox = `ledger.view.captions`, also a menu row |
| R3-01 | ~~The pre-fiction panel: ERA1 look, the logo, three cards, the text~~ | DONE — S162 · a 1997 dialog (`DIALOG` tokens), three cards, the text cut · S167: his logo file on the masthead |
| R3-06 | ~~Helper idle 40 → 20 s~~ | DONE — S149 · 20 s |
| R3-09 | ~~Desktop icon grid with drawn pixel icons~~ | DONE — S169 · `theme/icons.ts`, ten pictures |
| R3-15 | ~~**Un-Walk = the Starter Kit programme (UNWALK.EXE)**, "a box with white background, empty, black and white font" → the Win95 WIZARD look from his reference `References images/for the Era-1 programs.png` (left picture panel, text, Back/Next/Cancel) — one design with R3-16/19~~ | DONE — S151 · the Win95 wizard from his reference — picture panel, title, Back/Next/Cancel; tour frame 07 |
| R3-29 | ~~Map wording: "the placement letter"~~ | DONE — S149 · "the placement letter" |
| R3-30 / 31 | ~~The unvoiced-name setting in plain words; menu design~~ | DONE — S162 · "The name on the record: said aloud / shown, not said aloud" + a plain note; the menu wears the door's 1997 chrome |
| R3-33 | ~~"See behind you"; the flip button glows when the wall holds something unseen~~ | DONE — S151b · "Record filed. (see behind you)"; the ⟲ control glows on the creep's breath while the wall holds something unseen |
| W-F1 | ~~Leave: an interim safe space with a way back (08-21 §F); in-fiction "leave" renamed "Go back"~~ | DONE — S168 · his call: an encyclopedia lookalike (`leavePage.ts`) with three discreet ways back; sound muted, the piece held; the exercises' Leave is Go back |
| W-K1 | ~~Browser: scroll wheel / trackpad zoom (08-21 §K)~~ | DONE — S169 · the wheel is the pinch (FOV 30–80°) |

## Priority 8 — the Close
| id | item | status |
|---|---|---|
| C-01 | **The flight to the Close** (his 2026-09-20): "why does the camera go to the right and then to the left? it should go to the LEFT so we can see the other rooms as we voyage to Daniel's seat — that way, as the Close is morphing with the space, we arrive and still see part of it coming down on us" — redo the four legs: leftward past Rooms 3→2→1, the morph in view on the way, arriving into it | DONE — S163 · one 44 s sweep turning left the long way to face west; night + the constellation 14 s before landing; lookUp brings the head round |
| C-02 | **The Close's PC** (his 2026-09-20): "the PC model is still all wrong and in front of the panels; it should be further, and the screen image bigger. If we need to, we can press and go there" — the monitor further back, the Restart card's screen larger, a marker/press to go to it | DONE — S163 · 3 m back, ×1.8; the far face + "Press the screen to come to it." (`close-go`); the eye comes to it over 8 s |
| C-03 | ~~The beep at the end~~ | DONE — S159 · gone ("unnecessary") |
| C-04 | ~~The keyboard sounds~~ | DONE — S159 · gone, all three (the page-turn click, the diary's key, the 2026 typing) — "hideous… or go find one from android"; the flag and the erase stay |
| R3-111 | ~~No "documentary" stamp on the panels; sources per panel in the frame; the CRT further back~~ | DONE — S163 · stamp gone; Credits → The Close's panels — sources; a press on a panel opens it there; the CRT 3 m back |
| R3-112 | ~~The drift pauses while a panel is looked at or pressed~~ | DONE — S163 · eases to a stop on the gaze and for 3 s after a press, eases back |
| R3-109 | ~~Daniel's computer visible from the start of the Close?~~ | DONE — S163 · read as yes: the dark machine stands in the sky from the moment the room goes; lit when the Close settles |

## From the audit of every message he sent (`LOST_ASKS_AUDIT_2026-09-17.md`, Sonnet, all 672 read)
| id | item | first said | status |
|---|---|---|---|
| L-01 | The GRAYING: the guide sends you to find the apparatus's objects; each find grays a queer prop in the room (refusal-symmetric). `paths.json e1.b06_graying: built false`; zero code | 2026-07-02 | OPEN · lost 11 weeks |
| L-02 | FESTIVAL cut vs FULL cut, both real, selectable, from one source — for his article | 2026-07-02 | OPEN · lost (paths.json is dead metadata) |
| L-03 | Era 3's trans-masculine "borderland" connection (Round-20, locked 2026-07-05): the s3/s4 sends are still hard-gated off (`os.ts allowVisit`) — the one RULING the build contradicts | 2026-07-03 | OPEN · contradicts a ruling |
| L-04 | The Close's MAKERS as an in-world cluster/panels — the stars becoming the network of the data used to make the piece, four panels on the AI–human loop (his IDN disclosure) — built instead as a Credits paragraph + one line | 2026-07-24, again 2026-09-02 | OPEN · lost-partial |
| L-05 | TTS read-aloud as a standing accessibility principle for every long in-world text (kit, diary, tapes, testimonies) — built for two instances only | 2026-07-24 | OPEN · lost-partial |
| L-06 | The E1→E2 full-frame SYSTEM glitch: `os.onGlitch('system')` has no caller (the error-dialog cascade before the notice does exist — tour-e1 frame 24) | 2026-08-21 §H | OPEN · lost-partial |
| L-07 | ~~The Close's "version history" receipt (every update stacked, each FAILED) and "the one uninstalled update" ending — still canon in MASTER_PLAN_v2, retired by no document; the Restart card replaced it without a decision~~ | 2026-07 | DONE — S167 · his call: a receipt of the whole experience — the card's Receipt face |
| L-08 | ~~Rooms you have left go bare vs stay full — erasure or hope — as a choice~~ | 2026-09-05 | CLOSED — S167 · his call: no ("what benefit would that be?"); the rooms keep their one light |
| L-09 | The idle wipe: CLAUDE.md says the ledger is wiped on exit/IDLE/refusal; no idle timer exists in src/ (only Leave and beforeunload wipe). Exhibition hardware runs unattended | invariant | OPEN · bug |

## Ideas (his, 2026-09-20 — logged so they are not lost; none scheduled yet)
| id | idea | where it could go | status |
|---|---|---|---|
| I-01 | ~~**The Genderbread Person as content** — "not for 1997, but another era". His deep research (`Sources/Deep Research/Interactive Sexuality Pedagogy…md`) documents the 2010s–20s forms: affirming groups' *digital identity-resource discussion* (orientation / identity / expression / body drawn apart) and, on the other side, the conservative *social-media worldview audit* — a leader puts the viral diagram up and the group finds its "assumptions". That second one IS a 2016 correction job: a member posts the person-diagram, the platform's job is "apply the house look" — its own design-figure collapses the four lines into one; APPLY / SKIP, both captions kept, unresolved (the law on the gender-exploratory debate). ⚑ Invented figure in the genre, not the real graphic (invented marks); the real one is Killermann's, uncopyrighted but still someone's — his ethics call~~ | 2016, the correction list | DONE — S154 · his call: inspired. Marisol's four-line figure; correction 14 'Apply the design figure' → the house's one line, hers `as sent` beside it; correction 15 cuts the outside source; both stay, nothing comments; by hand + walked 261 |
| I-02 | ~~The prayer: no added activity; "what would someone at the time do?" — fast-forward the tape~~ | 1997, the pray step | DONE — S151c · Amen offered from the first chorus; taking it early stops the tape and files `prayer-cut`, flagged — "some way of resistance… and it gives something back" |
| I-03 | ~~His deep research's documented interactive forms as content: 1997 the pledge card / the ring; 2003 the multimedia rally, the testimony; 2016 the worldview audit (I-01), the testimony essay; 2026 the online peer group (the Commons), the deconstruction story circle (the Close?)~~ | each era | DONE — S170 · the 1997 pledge card as the wizard's third step; 2003/2016/2026 already carried their forms (NetVision + the Messenger; the queue's stories; the Commons + the Close) |

## Asks (his)
- R3-110 the Close score — his to hear on the sit-through ("should probably still have the song from TransJesus? dunno").
  (R3-01, R3-12, R3-07, L-07, L-08 answered 2026-09-21 and built S167/S168; W-L1 S153; R3-109 S163; R3-61 S164.)

## Round 4 — his sit-through of the new build (2026-09-22)
*From `REVIEW_ROUND_4_2026-09-22.md` §5 — my flags; his notes come on top when he has played it.*
| id | item | status |
|---|---|---|
| R4-01 | The door's Leave (inert page) vs the piece's Leave (the encyclopedia page) | ❓ his |
| R4-02 | The ring "in the post" — a payoff in 2003, or dangling | ❓ his |
| R4-03 | The 1997 update notice lands over the open channel — close/minimise the windows first | PROPOSED |
| R4-04 | ~~Back from the record cleared a finished story's done row~~ | DONE — S171 |
| R4-05 | The tour cannot photograph 2016's ending | tool · optional |
| R4-06 | The chime and pop over the jingle's tail | ❓ his ear |
| R4-07 | The black after the residue (~6 s) | ❓ his ear |
| R4-08 | The chips both lead on with no on-screen acknowledgement — one line from L? | ❓ his |
| R4-09 | The receipt's practice list in a real playthrough | CHECK on his sit-through |
| R4-10 | The sky at 12 % while the card is read | ❓ his eye |
| R4-11 | The Close score (= R3-110) | ❓ his ear |
| R4-12 | The Leave page's article rhymes with the piece | ❓ his |

### Round 4b — what the exhibition stills exposed (2026-09-22, S173; his eye on the frames)
*Photographing the piece at 2560 px put four defects on the table that no walk and no check has ever
caught, because every one of them is about what a thing LOOKS like from a place the tools never stood.
Measured, not eyeballed. Nothing here is built: they need a walk, and his review is still open.*

| id | item | status |
|---|---|---|
| R4-13 | ~~Era 3's phone: the screen is not on the phone~~ | DONE — S174 · phone.glb's origin is its centre → `baseY` −0.4547 (it stood half inside the dock); tilt −15 not +15 (it leaned toward the seat, crossing the screen); the prop 2.1 cm toward the seat so the screen lies on its face. Measured body vs screen live; frames `e3-01`, probe side/front views |
| R4-14 | ~~The Close's far machine is a shape, not a machine~~ | DONE — S174 · it was always Daniel's CRT, but 8-corner boxes averaged every normal and one flat emissive painted all faces alike: per-face vertices, baked face shades, `emissiveVertexColor`; 0.4 m off the seat's axis so its depth shows. Frame `e4-07b-the-machine` |
| R4-15 | ~~The clear corridor does not clear the stars~~ | DONE — S174 · the corridor is a SIGHT-LINE now (eye → the machine's silhouette): stars, link lines, labels AND panels on it fold away, far and near; buffers rewritten only on change. Near view 1.26 → 1.55 m so the receipt frame holds the whole machine. Frames `e4-07b`, `e4-09` |
| R4-16 | ~~At the Close, Room 2 is back in 2016, its monitor on~~ | DONE — S174 · two causes: leaving the Commons set every room entity to enabled (now restores what each was), and a per-frame line re-lit Vera's resting phone in every era (now 2016 only); plus Room 2's tower, phone, dock, mug and notepad leave at the r4 fold. Measured live through the sweep; frame `e4-05b-the-night` |
| R4-17 | ~~The 7 process labels read as "sources that aren't sources"~~ | DONE — S174 · MY CALL, reversible: set apart — drawn in the cloud's own link blue, and their window is "How this was made" (the project's documents, not sources about the practices) |
| R4-18 | ~~His ask: the sources should OPEN~~ | DONE — S174 · a press on a label or a panel brings the eye to Daniel's machine and opens that room's dossier in that room's OS (1997 · 2003 · 2016 · 2026; the frame's dialog for the process seven). The room's dossier, never a per-label claim. Real mouse press tested; frames `e4-10-dossier-*` |
| R4-19 | The dossier windows show the sources' `[VERIFY SOURCE]` markers verbatim (as the menu always has; check-spec's 10 known leaks) — now in front of every visitor at the ending | ❓ his pass, before the exhibition |
| R4-20 | Two 2003 props parked for want of a model — a flip phone and a CD spindle (`ASSET_REQUEST_2026-09-22.md`) | ❓ his, to fetch |


## Closed
- S174 (2026-09-22): R4-13, R4-14, R4-15, R4-16, R4-17 (my call), R4-18 — and his marks on the 2003 and 2016 stills (four CreativeTrio models; the modem, frame and radio out; the spindle and flip phone parked); walked, 285 presses, spine done, console clean.
- S171 (2026-09-22): R4-04; the tours brought up to date; the review list written; walked, 292 presses, spine done.
- S170 (2026-09-21): I-03 — the pledge card; walked, 284 presses, spine done.
- S169 (2026-09-21): R3-09, W-K1 — the icons drawn, the wheel zooms; walked, 292 presses, spine done.
- S168 (2026-09-21): W-F1, R3-12, R3-07 (the duck; the books stay by his call), R3-92 — his answers 5–8; walked with S167, 291 presses, spine done.
- S167 (2026-09-21): R3-01 (the logo), L-07 (the receipt), L-08 (no), the Close's occlusion + the dossier button — his answers 1, 3, 4; R3-110 awaits his sit-through.
- S166 (2026-09-21): his S162 notes — the jingle is the software's (Lamby's cartoon over it; the machine boots in silence; the CD-ROM splash retired to review), the version on the door (v0.1.0 · alpha); walked, 271 presses, spine done. R3-48's bar question is moot (the splash's bar is gone from play).
- S165 (2026-09-21): W-E2 (a) — every program window minimises; walked with S164, 277 presses, spine done (the first walk spent its budget toggling the new chrome — `LAST_RESORT` in walk.mjs now ranks `min-`/`taskbar-` last).
- S164 (2026-09-21): R3-61 — the notice rises out of the residue's dark.
- S163 (2026-09-20): C-01, C-02, R3-109, R3-111, R3-112 — Priority 8, the Close; walked with S162, 280 presses, spine done — `WALK_2026-09-21.md`.
- S162 (2026-09-20): F-01, R3-01 (bar the logo file), R3-30, R3-31 — Priority 7, the front door; its own walk was aborted at press 100 by an edit of mine; walked with S163 (280 presses, spine done — `WALK_2026-09-21.md`).
- S161 (2026-09-20): R3-105, R3-106 — Priority 6 batch B (the entrance seen, the arrival slower); walked, 273 presses, spine done.
- S160 (2026-09-20): R3-87, R3-89/90, R3-91, R3-93/104, R3-94, R3-96, R3-101 — Priority 6 batch A (the way in + the turn); walked, 275 presses, spine done.
- S159 (2026-09-20): R3-20, W-G2, C-03, C-04 — his six answers, the quick four; R3-02/R3-110 sent to him to hear; W-E2 (a), R3-61, C-01, C-02, F-01 registered with his rulings.
- S158 (2026-09-20): R3-66, R3-70, R3-71, R3-74, R3-78, R3-82 — Priority 5; walked, 262 presses, spine done (all four stories met).
- S157 (2026-09-20): R3-41, R3-44, R3-50, R3-51, R3-52/75, R3-58/59, R3-62 — Priority 4 batch B; walked, 261 presses, spine done.
- S156 (2026-09-20): R3-45, R3-46/86, R3-60, R3-48 (bar the bar's length) — Priority 4 batch A; his boot notes (the machine heard on the way down, the OS splash + chime); walked, 259 presses, spine done.
- S155 (2026-09-20): R3-08, R3-14, R3-25, R3-36, R3-43/63 (sound), R3-68, R3-85, R3-88, R3-102, W-G1; R3-02 and R3-110 built, his to hear; R3-48/64 partial; his ask: the prayer tape's intro cut — walked, 258 presses, spine done.
- S154 (2026-09-20): I-01 — the member's figure as a 2016 correction job; walked, 261 presses, spine done.
- S153 (2026-09-20): W-L1 — Root Cause Digger; walked, 264 presses, spine done. S152: the sentence line (doctrine; no id). S151c: I-02 (the prayer's Amen from the chorus); walked 242.
- S151b (2026-09-20): R3-26, R3-27/32, R3-28, R3-33, R3-38, R3-40, W-E1 — Priority 2 Batch B; walked, 246 presses, spine done (`WALK_2026-09-20.md`).
- S151 (2026-09-20): R3-13, R3-15, R3-16, R3-17, R3-19, R3-21/22, R3-24 — Priority 2 Batch A; walked, 256 presses, spine done (`WALK_2026-09-20.md`); tour frames `out/tour-e1/07–18`.
- S150 (2026-09-19): R3-47, R3-49, R3-55, R3-69, R3-77, R3-79 (pixels), R3-96a, R3-98, R3-100, R3-113, R3-114 — walked, 223 presses, spine done.
- S149 (2026-09-19): R3-95, R3-73/80, R3-04, R3-05, R3-06, R3-11, R3-18, R3-29, R3-37, R3-39, R3-67, R3-72, R3-76, R3-79 (the chat), R3-81, R3-97, R3-103 — walked, 238 presses, spine done, Era 3 ended through the phone.
