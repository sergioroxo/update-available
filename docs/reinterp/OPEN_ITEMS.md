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
| R3-20 | The tape's radio voice comes from a press and says what it is for | OPEN |
| R3-21 / 22 | ~~The prayer's words on screen from the Whisper transcript, timed; follow along, press at the end (W: 08-21 §G)~~ | DONE — S151 · `s1_prayer.json` from his Whisper transcript, 147/147 words; highlighted as sung; Amen at the end; tour frame 12 |
| R3-26 | ~~Channel exchanges before the DM; the DM as a request to accept~~ | DONE — S151b · "MentorRob would like to send you a private message" — Accept (Ignore dead); the DM opens on the press; walked (dm-accept at 147) |
| R3-27 / 32 | ~~The intake panel explains itself; practice title beside each row (W: 08-21 §J)~~ | DONE — S151b · the wall: "A file kept on you…" + the practice's title beside each entry; the menu's Your file as wide as the map; seen from the flip |
| R3-28 | ~~DM scrollback; faster typing~~ | DONE — S151b · two arrows page the DM; 19 cps / 2.6 s hold; walked (dm-up/dm-down pressed) |
| R3-38 | ~~The racket: glow + guide line (W: 08-21 §D)~~ | DONE — S151b · the lift breathes 0.35→1.0 on 2.6 s; the guide line "the racket on the wall — the first exercise" (S151); seen from the seat |
| R3-40 | ~~Deferral: the IRC closes; the belongings window reads as a thing to do~~ | DONE — S151b · Remind me later closes the channel; "take what you are taking: press what you keep, here in the room"; the standing line says it too; the shelf breathes; by hand via update2 |
| R3-24 | ~~Dial-up on the black screen with a connection panel — his references FOUND: `References images/to enter online.png` (Internet Setup Wizard) and `for IRC connection.png` (Make New Connection) (W: 08-21 §H)~~ | DONE — S151 · the Internet Setup Wizard on black: Welcome · Make New Connection · Connect To; the dial-up plays as it opens; tour frames 15–17 |
| W-E1 | ~~The floppy / the tapes glow so they can be found (08-21 §E)~~ | DONE — S151b · the disk, the tapes and the player breathe while their line is up (with R3-38) |
| W-L1 | **Lamby's 1997 app**: today the rig file is "like a tamagotchi"; his design `Pc_Simulation/Lamby Games/Mini-Games_LAmby.md` (Root Cause Digger, Purity Maze, Straight & Narrow Crossing…) was never referenced in the repo — pick one for 1997 and build it as the kit's game | DESIGN · his pick |
| W-E2 | Windows minimise, not just X (08-21 §E) | PARTIAL — S151 · the Un-Walk wizard minimises (Cancel → its taskbar button; the A:\ icon brings it back); the channel, the packet and the diary still only close |

## Priority 3 — sound redo, one pass with his ear
| id | item | status |
|---|---|---|
| R3-02 | A score for the descent | OPEN |
| R3-08 | `ui_press` soft click | OPEN |
| R3-14 | Floppy drive sound | OPEN |
| R3-25 | IRC tick: soft, only his lines + the DM | OPEN |
| R3-36 | Diary: typing, flag, erase | OPEN |
| R3-39 | ~~Error ding lower~~ | DONE — S149 · u2 ding at 0.45 |
| R3-43 / 63 | Passage sound: low wind, no whoosh | OPEN |
| R3-48 / 64 | Boot cues 2003 / 2016; boot music quieter | OPEN |
| R3-68 | 2016 platform bed + Lambient chime | OPEN |
| R3-85 | The update's install/restart cues | OPEN |
| R3-88 | `type_2026` soft | OPEN |
| R3-97 | ~~Drop `restore_2026`~~ | DONE — S149 · dropped |
| R3-102 | The session's recording introduced, hiss cue reconsidered | OPEN |
| R3-110 | A Close score | OPEN |
| W-G1 | Lamby needs a sound ("how Clippy sounded") (08-21 §G) | OPEN |
| W-G2 | Captions everywhere (08-21 §G) | OPEN |

## Priority 4 — the flight and Era 2
| id | item | status |
|---|---|---|
| R3-46 / 86 | Rise → hold → morph in view → descend | OPEN |
| R3-44 | 2003 dressing pass; room-audit findings closed (W: 08-21 §B) | OPEN · repeat |
| R3-45 | The computer changes: beige+CRT → black+LCD | OPEN |
| R3-48 | E2 boot: black → POST → shorter splash → OS | OPEN |
| R3-50 | Program-start splash for 2003 apps | OPEN |
| R3-51 | Messenger: faster; the 2003 IM look | OPEN |
| R3-52 / 75 | A media player: Caleb's song as an attachment; Noa's cut plays | OPEN |
| R3-58 / 59 | The network's failure SEEN before the mail; the glitch as its consequence | DESIGN |
| R3-60 | Deferral copy: "being removed" | OPEN |
| R3-62 | The 2003→2016 notice gets the E3 look | OPEN |
| R3-41 | The 2003 EULA gets the E2 look | OPEN |
| R3-61 | Anything to do after the residue? | DESIGN · his |

## Priority 5 — Era 3's devices
| id | item | status |
|---|---|---|
| R3-66 | Lambient "Not now" sticker; one clock for phone + workstation | OPEN |
| R3-70 | Corrections per story 7 → 3 | OPEN |
| R3-71 | Noa's video: a real player, labelled | OPEN |
| R3-72 | ~~The phone on a stand~~ | DONE — S149 · the dock (`w_phoneStand`) |
| R3-74 | "Back to today" at the bottom of a finished job | OPEN |
| R3-78 | Phone home screen: Messages, the platform, FloppySheep | OPEN |
| R3-81 | ~~A line to look at the phone; you can put it down~~ | DONE — S149 · Lambient: "Your phone's lit…" / "…you can always put it down." |
| R3-82 | Era 3 beats gate on the previous being seen | OPEN |

## Priority 6 — Era 4's program as a conversation with L
| id | item | status |
|---|---|---|
| R3-93 / 104 | L asks, she answers (chips); the five steps come out of it and build to the session | DESIGN (major) |
| R3-87 | The wake as a screensaver with one press | OPEN |
| R3-89 / 90 | The search tab as a results page → the Second Thoughts site → the agent | OPEN |
| R3-91 | The laptop says what it is doing | OPEN |
| R3-94 | Step 1 as the provider's intake gate; the BetterHelp case into the dossier | OPEN |
| R3-96 | L introduced by name on the laptop before the search | OPEN |
| R3-101 | "L needs access to your messages" → allow → threads → this one | OPEN |
| R3-105 / 106 | The first flash before the world; a slower arrival with lights and a greeting | OPEN |
| R3-92 | FloppySheep on the 2026 home screen | LATER |

## Priority 7 — the frame and the front door
| id | item | status |
|---|---|---|
| R3-01 | The pre-fiction panel: ERA1 look, the logo, three cards, the text | DESIGN · ask (logo) |
| R3-06 | ~~Helper idle 40 → 20 s~~ | DONE — S149 · 20 s |
| R3-09 | Desktop icon grid with drawn pixel icons | OPEN |
| R3-15 | ~~**Un-Walk = the Starter Kit programme (UNWALK.EXE)**, "a box with white background, empty, black and white font" → the Win95 WIZARD look from his reference `References images/for the Era-1 programs.png` (left picture panel, text, Back/Next/Cancel) — one design with R3-16/19~~ | DONE — S151 · the Win95 wizard from his reference — picture panel, title, Back/Next/Cancel; tour frame 07 |
| R3-29 | ~~Map wording: "the placement letter"~~ | DONE — S149 · "the placement letter" |
| R3-30 / 31 | The unvoiced-name setting in plain words; menu design | OPEN |
| R3-33 | ~~"See behind you"; the flip button glows when the wall holds something unseen~~ | DONE — S151b · "Record filed. (see behind you)"; the ⟲ control glows on the creep's breath while the wall holds something unseen |
| W-F1 | Leave: an interim safe space with a way back (08-21 §F); in-fiction "leave" renamed "Go back" | DESIGN |
| W-K1 | Browser: scroll wheel / trackpad zoom (08-21 §K) | OPEN |

## Priority 8 — the Close
| id | item | status |
|---|---|---|
| R3-111 | No "documentary" stamp on the panels; sources per panel in the frame; the CRT further back | OPEN |
| R3-112 | The drift pauses while a panel is looked at or pressed | OPEN |
| R3-109 | Daniel's computer visible from the start of the Close? | ASK |

## From the audit of every message he sent (`LOST_ASKS_AUDIT_2026-09-17.md`, Sonnet, all 672 read)
| id | item | first said | status |
|---|---|---|---|
| L-01 | The GRAYING: the guide sends you to find the apparatus's objects; each find grays a queer prop in the room (refusal-symmetric). `paths.json e1.b06_graying: built false`; zero code | 2026-07-02 | OPEN · lost 11 weeks |
| L-02 | FESTIVAL cut vs FULL cut, both real, selectable, from one source — for his article | 2026-07-02 | OPEN · lost (paths.json is dead metadata) |
| L-03 | Era 3's trans-masculine "borderland" connection (Round-20, locked 2026-07-05): the s3/s4 sends are still hard-gated off (`os.ts allowVisit`) — the one RULING the build contradicts | 2026-07-03 | OPEN · contradicts a ruling |
| L-04 | The Close's MAKERS as an in-world cluster/panels — the stars becoming the network of the data used to make the piece, four panels on the AI–human loop (his IDN disclosure) — built instead as a Credits paragraph + one line | 2026-07-24, again 2026-09-02 | OPEN · lost-partial |
| L-05 | TTS read-aloud as a standing accessibility principle for every long in-world text (kit, diary, tapes, testimonies) — built for two instances only | 2026-07-24 | OPEN · lost-partial |
| L-06 | The E1→E2 full-frame SYSTEM glitch: `os.onGlitch('system')` has no caller (the error-dialog cascade before the notice does exist — tour-e1 frame 24) | 2026-08-21 §H | OPEN · lost-partial |
| L-07 | The Close's "version history" receipt (every update stacked, each FAILED) and "the one uninstalled update" ending — still canon in MASTER_PLAN_v2, retired by no document; the Restart card replaced it without a decision | 2026-07 | DESIGN · his (keep the card, or bring the receipt back onto it) |
| L-08 | Rooms you have left go bare vs stay full — erasure or hope — as a choice | 2026-09-05 | UNSURE · his |
| L-09 | The idle wipe: CLAUDE.md says the ledger is wiped on exit/IDLE/refusal; no idle timer exists in src/ (only Leave and beforeunload wipe). Exhibition hardware runs unattended | invariant | OPEN · bug |

## Asks (his)
- R3-01 the logo file · R3-12 which "pause" button (a frame) · R3-07 the books: slabs or gone · W-L1 which mini-game first ·
  L-07 the Close's ending: the Restart card, the version-history receipt, or both · L-08 bare rooms as a choice, yes/no ·
  R3-61 anything after the residue · R3-109 the CRT from the start.

## Closed
- S151b (2026-09-20): R3-26, R3-27/32, R3-28, R3-33, R3-38, R3-40, W-E1 — Priority 2 Batch B; walked, 246 presses, spine done (`WALK_2026-09-20.md`).
- S151 (2026-09-20): R3-13, R3-15, R3-16, R3-17, R3-19, R3-21/22, R3-24 — Priority 2 Batch A; walked, 256 presses, spine done (`WALK_2026-09-20.md`); tour frames `out/tour-e1/07–18`.
- S150 (2026-09-19): R3-47, R3-49, R3-55, R3-69, R3-77, R3-79 (pixels), R3-96a, R3-98, R3-100, R3-113, R3-114 — walked, 223 presses, spine done.
- S149 (2026-09-19): R3-95, R3-73/80, R3-04, R3-05, R3-06, R3-11, R3-18, R3-29, R3-37, R3-39, R3-67, R3-72, R3-76, R3-79 (the chat), R3-81, R3-97, R3-103 — walked, 238 presses, spine done, Era 3 ended through the phone.
