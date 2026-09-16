STATUS: live

# SÉRGIO'S SIT-THROUGH — 2026-09-17 · every point, answered and tracked
*His third full play (after 2026-08-21 and 2026-09-02). His verdict, verbatim: "There are a lot of
mistakes, forgotten tasks, ignored requests, and I feel like you are ignoring the build log with all
the stuff that should have been done, and also that you are no longer marking all the things to be
done. I am not happy about this."*

**He is right about the tracking.** Twenty-one of the items below were first reported on 2026-08-21
(`WALKTHROUGH_2026-08-21.md`) and are still open — the monkey, the duck, the racket, "Press to keep
it", the cassette caption, the PureMail ordering, "Not now", the intake panel, the network image, the
lyrics. They were captured, not scheduled: BUILD_LOG records what was built, and nothing held what
was *owed*. From this session every open item has an id in **`OPEN_ITEMS.md`** (one register, all
three reviews), every BUILD_LOG entry names the ids it closes, and nothing is called done without
the id moving. Items marked **REPEAT** below carry the date they were first reported.

Status vocabulary: **BUG** (wrong, fix) · **OPEN** (agreed, build) · **DESIGN** (agreed, needs a
design decision first — mine unless marked *his*) · **ASK** (I need one thing from him) · **DONE**
(nothing to do) · **PUSH BACK** (I disagree, with the reason; his call). Ids are R3-nn.

---

## THE FRONT DOOR
| id | his note | reply | status |
|---|---|---|---|
| R3-01 | The start-up menu needs a revamp: computer thematics, the logo, how the information is displayed, the text must make sense | Agreed. The pre-fiction panel is plain DOM from July. Proposal: the ERA1 palette and type, the CRT-with-the-room logo at the top, the three controls blocks as three cards (computer · headset · phone/tablet), the premise cut to what a visitor needs, the content note kept. Needs the logo file (PNG/SVG). | DESIGN · ASK (logo) |
| R3-02 | The descent needs sound — a score | Agreed; it is silent until the room bed. A rising bed for the descent (synthesised, ours) that hands over to the room's — or a track of yours if you have one. | OPEN |
| R3-03 | Text crisper, bold better | — | DONE (S143) |
| R3-04 | The room's sound only starts with the movement | Bug: the bed is set when the descent lands. Start it (and R3-02) at Log in. | BUG |

## ERA 1 — THE ROOM
| id | his note | reply | status |
|---|---|---|---|
| R3-05 | The monkey is still backward | **REPEAT 08-21 §D.** A 180° yaw in `reinterp_deltas.json`. | BUG · REPEAT |
| R3-06 | The message saying what to do appeared; maybe not 40 s | Agreed → 20 s (`map.json helper.idleSeconds`). | OPEN (easy) |
| R3-07 | The duck is still at the top, not pride colours. The book models are ugly | **REPEAT 08-21 §D** (the pride flag). Duck: bring it to shelf height and paint it (six bands, the ERA1 palette only has some of them — I will use the closest and say which). Books: the stacks are the placeholder GLB; replace with flat slabs with coloured spines or remove them. Your call which. | BUG · REPEAT / DESIGN *his* (books) |
| R3-08 | Button-press sound too thumpy | Redo `ui_press` as a short soft click (also R3-42, R3-77). | OPEN |
| R3-09 | Desktop icons too far to the side, should be more usable, missing logos | Agreed. A grid from the top-left with 32×32 pixel icons drawn per app (disk, IRC, kit, form, diary), labels under. | OPEN |
| R3-10 | Does the system now let people try things without breaking it? | Yes, in the sense the walk proves: it presses everything reachable, out of order, 900 steps, and reaches the Close every run since S131. What it does NOT prove is that the *sequence* makes sense when pressed out of order — that is the class of thing you found (R3-13, R3-73, R3-80), and those are design gates, tracked here. | DONE (robustness) · the gates are OPEN |
| R3-11 | Family Form not finalised in style, barebones; the X button doesn't work | Agreed on style (the provotype window is the S40 skeleton). X: bug — the frame's close box is drawn but only `leave` is wired. | BUG + OPEN |
| R3-12 | The pause button on the Family Form is for what? | I need to check which control you mean — the window's `_` (minimise, from 08-21 §E) or the exercise's hold. Will report with a frame. | ASK (a frame) |
| R3-13 | The companion form comes after Mom talked with Rob — I shouldn't be able to play it now. IF THIS THEN THIS; local storage | Agreed on the gate: the Family Form icon appears only after Rob's "I spoke with your mother". **On storage: the ledger already IS the if-this-then-this** — every act is filed in memory and every beat can read it (that is how the update, the spine and the map already work); it is wiped on exit because the no-storage rule is one of the piece's hard invariants ("the one promise none of the systems inside it could make"). So: no localStorage, same result. | OPEN (gate) · PUSH BACK (storage) |
| R3-14 | The floppy sound is not good | Redo (a real drive seek: motor + two head clicks, longer, lower). | OPEN |
| R3-15 | The "Un-Wak" needs its software design | I read this as the WAKE — the machine coming on before the desktop. Agreed it needs a screen (a BIOS line, a memory count, the OS name) instead of light only. Tell me if you meant something else. | ASK · OPEN |
| R3-16 | What is the booklet? What is the enclosed booklet? | The kit window IS the booklet (the guide says "read the enclosed booklet"). Wording confuses; and the kit should look like one — a cover, pages, a spine. | OPEN (wording + look) |
| R3-17 | This needs a song of the programmes of the time to fill the void | Agreed: a program loop (MIDI-hymn register) while the kit is open — and, per R3-53, the same idea as Era 1's standing music. | OPEN |
| R3-18 | "Companion Cassette insert?" — what is this? still here | **REPEAT 08-21 §E** ("maybe remove"). It is the tape system's caption. Remove the label; the shelf glow (08-21 §E) does the job. | BUG · REPEAT |
| R3-19 | Either the First Steps are selectable with a panel each, or it needs to be clearer what we're doing | Agreed, and it is the fix for R3-16/17/22/23/34: the kit's First Steps page becomes the era's programme — each step a press that opens its panel and ticks off (read · pray · connect · form · diary). | DESIGN → OPEN |
| R3-20 | The noise, and the presenter's voice makes no sense unless it plays on an action of theirs | Agreed: the tape's radio voice should come from a press (the tape, the boombox) and say what it is for. Ties to R3-19. | DESIGN |
| R3-21 | The prayer on screen is not the prayer in the song | **REPEAT 08-21 §G.** You supplied the Whisper transcripts (`~/Pc_Simulation/Trials Songs/Fold My Hands.json`); the screen must show those words, timed. | BUG · REPEAT |
| R3-22 | What is the person supposed to do while this happens? | Follow the words (highlighted as they are sung) and press when it ends — the "pray" step of R3-19. | DESIGN → OPEN |
| R3-23 | Is #stillstruggling still part of the steps? | Yes — "connect" is the third step; it will say so (R3-19). | DONE (answer) · OPEN (R3-19) |
| R3-24 | The internet log-in sound when the screen goes black; the network panel image I shared (find it) | **REPEAT 08-21 §H** (the Internet Setup Wizard reference). I searched `~/Pc_Simulation/Assests` and `MD/` — it is not on disk here; it was in a chat. Please drop it into `Assests/`. The dial-up will move to the black screen with a connection panel. | BUG · REPEAT · ASK (the image) |
| R3-25 | IRC sounds stringy/high, like a radar beep; not on every message | Redo: a soft short tick, only on Daniel's own lines and the DM's arrival. | OPEN |
| R3-26 | Said hi, no time to read before Rob appeared. Step by step: more channel conversation; Rob a pop-up you accept | Agreed. Two or three channel exchanges with replies before the DM; the DM arrives as a request ("MentorRob would like to message you — Accept"). | DESIGN → OPEN |
| R3-27 | The intake panel should explain what it is and have a press to start | **REPEAT 08-21 §J.** The wall gets an intro state ("INTAKE RECORD — a file kept on you. Read.") and the practice title beside each row (cold, one line). Sources stay in the frame. | OPEN · REPEAT |
| R3-28 | Scroll through the Rob conversation; faster | Scrollback in the DM window; the typing pace up. | OPEN |
| R3-29 | What is "Open the packet that has arrived"? | My map wording for the placement packet (the window with the Ok). Rename: "The placement letter — read it and press Ok." | BUG (wording) |
| R3-30 | The menu needs a better design; "later on the system says a name…" what is this? | The unvoiced-name setting: Era 4's system uses Maya's old name; this mutes the audio (your 2026-08-06 ruling to keep it in the frame). The sentence is opaque — rewrite: "In 2026 a system says a name Maya does not use. Mute it: off/on." Menu design with R3-01. | OPEN (wording + design) |
| R3-31 | What is the old name on the record? | Same beat: the record misfiles her "under the old file" (no deadname is ever written). | DONE (answer) |
| R3-32 | "What the system recorded" should also be on the intake panel; the menu's version is mobile-format, hard to read | R3-27 covers the wall. The menu's *Your file* view widens like the map did. | OPEN |
| R3-33 | "See reverse" → "see behind you"; the reverse button should glow | Rename; glow while the wall holds something unseen. | OPEN (easy) |
| R3-34 | Finished Rob, the placement appeared — where does the other stuff enter? | Today the tapes, the racket, the diary and the form are unconducted: they sit in the room and the guide names them one at a time. R3-19 makes the order visible. | DESIGN → R3-19 |
| R3-35 | Where does Lamby enter? Where does the Family Form enter? | Lamby: with the 2003 update, by design (R28). The Family Form: after Rob's "I spoke with your mother" (R3-13). | DONE (answer) · R3-13 |
| R3-36 | Sounds for the diary: typing etc. | Typing (soft, per character), the flag, the erase. | OPEN |
| R3-37 | "Press to keep it" is still cut off | **REPEAT 08-21 §H.** | BUG · REPEAT |
| R3-38 | Where does the racket enter? again forgotten | **REPEAT 08-21 §D.** It opens the exercise from the room (built S1xx) and nothing points at it. It gets the glow and a guide line ("the racket on the wall — the first exercise"), inside R3-19. | BUG · REPEAT |
| R3-39 | The error sound is not bad but lower | Level down. | OPEN (easy) |
| R3-40 | I deferred the update and there is nothing to do; the IRC window is still there | "Remind me later" opens the belongings window (take what you are taking) — it did not read as a thing to do. The IRC closes on the notice; the belongings get a clear line and the shelf glow. | OPEN |
| R3-41 | Restorify's Terms of Continued Care need design | The 2003 EULA gets the E2 look (the 2016 one has it now). | OPEN |
| R3-42 | Better button sound | = R3-08. | dup |

## THE FLIGHT 1997 → 2003
| id | his note | reply | status |
|---|---|---|---|
| R3-43 | The flying sound is terrible; the flyover doesn't go far enough to see the room change | Sound: redo the passage (a low wind, no whoosh). Path: see R3-46. | OPEN |
| R3-44 | Era 2's bedroom doesn't change enough to be memorable; still errors | **REPEAT 08-21 §B.** A 2003 dressing pass: the poster, the bedding, the desk clutter, the monitor (R3-45), the lamp; and the room-audit findings closed rather than triaged. | OPEN · REPEAT |
| R3-45 | Should the computer model change? | Yes: a beige tower and a 4:3 CRT in 1997; a black tower and a flat LCD in 2003 (`Flat Monitor modern.glb` is in Assests). | DESIGN → OPEN |
| R3-46 | We should fly to the top of the room and see the space morph; the turn to see it should be before we climb | Agreed: the relocation becomes rise → hold overlooking → morph in view → descend into the new room. Today the morph runs during the rise. | DESIGN → OPEN |
| R3-47 | After arriving it forces you to fixate on the screen; in VR cybersickness | Agreed and it is the comfort law: no conducted look on landing. The screen waits for the return press instead. In VR the camera is never rotated for you. | BUG |
| R3-48 | Boot music too loud; black screen before the blue house and Lamby's panel; loading bar shorter; no PC boot sounds | Agreed on all four (E2 boot sequence: black → POST beep → splash shorter → OS). | OPEN |

## ERA 2
| id | his note | reply | status |
|---|---|---|---|
| R3-49 | What does "Not now" do at Restorify? The box layout is still 1997 | **REPEAT 08-21 §I.** "Not now" will file a decline and the check-in returns later; the window gets the 2003 look. | BUG · REPEAT |
| R3-50 | Daily Realignment should have a loading box, like old Windows | Agreed: a program-start splash for every 2003 app. | OPEN |
| R3-51 | The messenger part is slow; where is the MSN design? | Slow: the reply gaps (08-21 §I) — tighten. Design: the messenger window gets the 2003 IM look (contact list, nudge bar, the mark). | OPEN |
| R3-52 | The sounds he made should open a media player, or a file you press to play | Agreed: Caleb's song arrives as an attachment; a player window (the NetVision family) opens it. | DESIGN → OPEN |
| R3-53 | The loop song should be playable — and Era 1's programme should have loop music like this | = R3-17 for Era 1; for 2003 the same loop is a file in the player. | OPEN |
| R3-54 | NetVision player is amazeballs | — | DONE |
| R3-55 / 56 / 57 | We still haven't fixed this: the Caleb pop-up and the inbox email both appear; I pressed PureMail and Caleb's message started, so the pop-up is not needed | **REPEAT 08-21 §I** (PureMail before Caleb). One door: the messenger's dot, no pop-up; the email comes only after the thread. | BUG · REPEAT |
| R3-58 | Contextualise the email: does the programme try to make him call and the system fails? | Yes — that is the accountability network collapsing on screen (S2R.5); it needs to be SEEN failing before the mail arrives. | DESIGN |
| R3-59 | The glitch needs better contextualisation | With R3-58: the glitch is the network's failure, shown as such. | DESIGN |
| R3-60 | Update Later → the story app says continue; should say it is being removed | Copy fix on the deferral. | OPEN (easy) |
| R3-61 | What is the person to do in Era 2 after all this? | Nothing, by design — the era ends on the residue and the notice. If that reads as a hole, the deferral's belongings window (R3-40) is the one act left. | DESIGN *his* |
| R3-62 | The GracePlatform notice inside Era 2 is barebones | The 2003→2016 notice gets the E3 look. | OPEN |
| R3-63 | Flying sound remove; fix the update sounds | R3-43; and the update's install/restart cues redone (R3-85). | OPEN |

## ERA 3
| id | his note | reply | status |
|---|---|---|---|
| R3-64 | No boot sounds in Era 3; the fixed system for the start of the screen | Boot cue + the same black → POST → splash shape as R3-48. | OPEN |
| R3-65 | The Grace log-in sound is great | — | DONE |
| R3-66 | Lambient's "Not now" needs a sticker ("not yet available"); the phone and computer clocks coordinated | Sticker: yes. Clocks: both read 9:41 · 13/12 — they will tick together from one clock. | OPEN (easy) |
| R3-67 | The phone is lost behind stuff; the screen is over the model's limit | The screen plane is 0.071×0.152 on a smaller GLB; resize the plane to the model and lift the phone onto a stand (R3-72). | BUG |
| R3-68 | The platform needs system sound: Ambient sends something calming, or the approved radio | Agreed: a 2016 platform bed and Lambient's chime. | OPEN |
| R3-69 | The "source file" icon appears out of nowhere | **REPEAT 08-21 §C.** | BUG · REPEAT |
| R3-70 | The first testimony should be ~3 presses; too many per file | Corrections per story 7 → 3. | OPEN (easy) |
| R3-71 | Impossible to understand the attached video; can't play it | Noa's video has a play control that does not read as one. A real player (R3-52's), bigger, with a label. | BUG |
| R3-72 | The phone on a stand? | Yes (R3-67). | OPEN |
| R3-73 / 80 | "Update now" appeared while I was doing the comments and had not touched the phone; then the phone let me do nothing and the computer forced the update — all wrong | **BUG, and the era's biggest.** The phone's "ignored" path advances the story on work done, so the update can arm before the phone is ever read. New rule: Era 3 does not end until the phone has been picked up and the group seen; the update never arms over an open job. | BUG (priority) |
| R3-74 | When I finish a section there should be a button at the bottom to go back to the panel | Yes. | OPEN (easy) |
| R3-75 | Cut the Story should be playable | The cut plays back in the player (R3-52). | OPEN |
| R3-76 | Touching the phone should lock the screen to where I am looking (swivelling with the phone), not to the monitor | Agreed: the held pose follows the head's yaw, not the seat's. | BUG |
| R3-77 | Button sound wrong; I need a button to unlock the screen | R3-08; the phone's unlock is a rect with no button drawn — draw it. | BUG |
| R3-78 | I need the home screen and a Messages app to enter the chat | A phone home screen: Messages (badge), the platform app, FloppySheep. | DESIGN → OPEN |
| R3-79 | Opened the chat, nothing happened; a text from Bea and not much; the phone text is pixelated | Chat: the thread should play (the first message, the vote, the cascade) once opened. Pixels: the phone canvas is 180×360 at ×2 — raise its scale (with R3-100). | BUG |
| R3-81 | A message should tell me to look at my phone, and that I can put it down | Lambient's line + the helper's hint (the map has the beat). | OPEN |
| R3-82 | Remember: individual actions that play one after another | Adopted as Era 3's rule: each beat gates on the previous being SEEN (the map's conditions already know them). | DESIGN → OPEN |
| R3-83 | I hope you've been registering everything in the build log | Builds, yes. Your review items were not held in one place — that is the failure named at the top; `OPEN_ITEMS.md` from now. | DONE (the register) |
| R3-84 | Finally the Continuity of Care terms have a design | — | DONE |
| R3-85 | The update sound is horrible | Redo (with R3-63). | OPEN |
| R3-86 | The turn to see the morph before we climb | = R3-46. | dup |

## ERA 4
| id | his note | reply | status |
|---|---|---|---|
| R3-87 | A screensaver screen to press on to restore | Agreed: the wake becomes a screensaver (the GraceOS mark drifting) with one press. | OPEN |
| R3-88 | The typing sound is horrible | Redo `type_2026` (soft, quieter, not per character). | OPEN |
| R3-89 | A fake Google with the results of the search she already did; recent queries | Agreed: the search tab opens as a results page (her history, the finished query, results that lead to Second Thoughts). | DESIGN → OPEN |
| R3-90 | We should see the Second Thoughts website that takes us to the AI | Yes — the results page → the site → the agent. | DESIGN → OPEN |
| R3-91 | The other monitor says "one moment"? | The laptop mirrors L during restore; it will say what it is doing ("Restoring your session — 6 tabs"). | OPEN (easy) |
| R3-92 | The home screen could have FloppySheep, a computer version | Nice — after the rest. | DESIGN (later) |
| R3-93 | Why isn't she talking to the AI on Second Thoughts? | Because the program is one-directional: L acts, she confirms. You want a conversation — L asks, she answers with chips — and the five steps come out of it. This is the biggest Era 4 change on the list and it answers R3-98/99/101/104 too. | DESIGN (major) |
| R3-94 | Why am I shown the "You" information? A terms-of-service? Like BetterHelp? | It is step 1: confirm your record. Your reading is better than mine: make it the platform's intake gate before "care" — the BetterHelp case (`www-them-us-story-better-help…md`) goes into the dossier as the source for the care step. | DESIGN → OPEN |
| R3-95 | WE SHOULD NOT SEE DANIEL'S STUFF — MAYA IS NOT DANIEL | **BUG, my mistake, and a premise error.** S144's "one file, four faces" imported Daniel's entries into Vera's profile and into Maya's legacy file. Your ruling stands: each person's record holds their own era only; the thirty years live in the Close and the frame's map, never in the fiction's files. Fix: Vera's profile = 2016 rows; Maya's legacy file = her own 2026 rows (and the migration/continuity line stays as words, not as Daniel's lines). | BUG (priority) |
| R3-96 | Image out of the area; the laptop OS should be more interesting; we were never introduced to L | Overflow: bug. L: the restore introduces L by name and by what it does, on the laptop, before the search. | BUG + DESIGN |
| R3-97 | The restoring sound makes no sense; the notification is enough | Drop `restore_2026`. | OPEN (easy) |
| R3-98 | Where does this image go, why? Did we jump to care? | The photos step auto-advanced after the result. No auto-advance: L says what it did and asks to continue (R3-93). | BUG |
| R3-99 | Can't go back; no explanation of AI images; L should have told us from the start | R3-93/96. | dup |
| R3-100 | The text upscaling is pixelated again | The OS canvas is drawn at a fixed scale and the 2026 monitor fills the view; raise the render scale for E3/E4 surfaces (the DPR fix was the 3D canvas only). | BUG |
| R3-101 | The 4th panel is not understandable — who is seeing this conversation and why? L should ask for chat access, then chats to pick | Agreed (R3-93): "L needs access to your messages" → allow → a list of threads → this one. | DESIGN → OPEN |
| R3-102 | What is this recording sound? The session sequence is poorly done | The "recorded voice" item plays `playback_hiss`. The session gets a sequence: plan → grounding → the recording introduced as what it is → cut. | OPEN |
| R3-103 | The song should not be playing when Junie sends the message | Stop the session bed at the card. | BUG (easy) |
| R3-104 | Zero tension about why this appears now; nothing forced me to see anything about detransition | R3-93: the program's steps must build to the session (the record confirms, the photo restores, care assigns, the chat is read, the search leads) so the session is the consequence. | DESIGN (major) |
| R3-105 | The glitch should appear before the disco starts so we don't miss the entrance. Love the VR world; more of this engagement | The first flash before the world cuts in; the arrival slower (R3-106). | OPEN |
| R3-106 | Restoring the session shouldn't be so fast: lights, people saying "Hi Maya" | The arrival: lights come up in the hall, two figures turn and greet her by name before the stage. | DESIGN → OPEN |
| R3-107 | Junie's link tricks the system into another world; love the glitch sound | That is the built beat. | DONE |
| R3-108 | Very good glitch at the end | — | DONE |

## THE CLOSE
| id | his note | reply | status |
|---|---|---|---|
| R3-109 | In Daniel's place, the computer should be there | It is Daniel's monitor that carries the Restart card — if you mean it should be visible from the start of the Close (not only when lit), say so. | ASK |
| R3-110 | Missing music or sound in the Close | The sky bed is too quiet to register; a Close score (yours, or synthesised: the four beds resolving into one). | OPEN |
| R3-111 | Don't want the "documentary" label. The dossier should list this content; press it to see the sources for each action. The reboot PC should be Daniel's and much further away — I can barely see the Close | Label: gone. Sources: each panel's claims get a row in the frame's map/file ("read: …"). Distance: the CRT moves back so the constellation is the frame and the card is a screen in it. | OPEN |
| R3-112 | The constellation should travel only when I am not moving, and not while I press a panel; hard to read | The drift pauses while the head is still on a panel (in view) and on any press; resumes after. | OPEN |
| R3-113 | Pressing Maya jumped right away without morph and the screen is black | Bug in `leaveClose('e4')` — the review re-entry skips the relocation and the visor is off. | BUG |
| R3-114 | *(mine, from your frame)* The 1997 panel's "IN THIS ROOM, YOU" is drawn twice, overlapping, with 2026's lines | Bug in S144's `setPlayerLines` (the clear rect misses the second draw; the pick mixes eras). | BUG |

---

## THE ORDER OF THE FIX ROUNDS
1. **The two premise bugs first:** R3-95 (Maya is not Daniel), R3-73/80 (Era 3 ends before the phone).
   Then the outright bugs: R3-04, 05, 11, 18, 37, 47, 67, 76, 77, 79, 98, 100, 103, 113, 114.
2. **Era 1 conducted:** R3-19 (the First Steps as the spine) with 13, 16, 17, 20–23, 26, 27, 34, 38, 40.
3. **Sound redo, all of it in one pass** (with your ear on each): R3-02, 08, 14, 25, 36, 39, 43, 48, 63, 68, 85, 88, 97, 102, 110.
4. **The flight and Era 2:** R3-44–46, 48–53, 55–62.
5. **Era 3's devices:** R3-66–72, 74, 75, 78, 81, 82.
6. **Era 4's program as a conversation with L:** R3-87–94, 96, 101, 104–106.
7. **The frame and the front door:** R3-01, 06, 09, 29–33, 41.
8. **The Close:** R3-109–112.

Each round ends with a walk, a tour of the era, and the ids moved in `OPEN_ITEMS.md`.
