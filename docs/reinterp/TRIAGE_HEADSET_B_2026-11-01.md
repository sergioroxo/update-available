STATUS: live

# Triage: headset session B (31 Oct 2026, 22:43–00:01)

Source: HEADSET_SESSION_2026-10-31b.md and his dictated remarks in its §6. Every point he made is listed once, with
what happens to it. The build he saw was **S275** (the 1997 folder and the pet are in the frames); the report's
"eb3f6e13" is wrong. The dollhouse lamps (S276) came after his session.

Marks: **FIXED S277** = changed this session (walked before commit) · **CHECK** = fixed in code, needs his headset ·
**TODO** = buildable, not yet done · **DESIGN** = needs a design pass first · **HIS** = needs his ruling.

## Across the whole piece

| # | What he saw | Cause found | Status |
|---|---|---|---|
| A1 | Left the session from the boot screen's Leave | the opening's Leave left on one press | FIXED S277: first press shows "Leave? Press again" (4 s) |
| A2 | Invisible boxes over text; lines "available to be pressed with nothing there"; pressing the 1997 folder pressed the Family Companion | the headset ray collected buttons from every app object, including closed and finished ones, and snapped to them | FIXED S277 (CHECK): below the desktop, only a window that is open lends the ray its buttons |
| A3 | ≡ Menu tab in front of the screens (2003, 2016, 2026), "on a different layer" | the floating tab, re-hung four times since S209 | FIXED S277 (CHECK): the floating tab is gone; the menu is the wrist tab (turn the wrist to the face), the controller's grip, or Esc |
| A4 | Songs from the last scene keep playing (2003 → 2016, "the new you" over 2026, the dossier) | clips were only stopped on a menu jump, never on the update ritual | FIXED S277 (CHECK): every era shift stops the last era's clips, jingles and read-alouds |
| A5 | The ending song is missing | the Close's score is the room bed; the leaking song likely covered it | CHECK after A4 |
| A6 | Text jagged ("serrated knife"), blurry when moving away | the screens are drawn with nearest filtering and no mipmaps, so they shimmer when small | TODO: mipmaps for minification, nearest kept for close-up |
| A7 | Transitions: the circle grid, the fades in the Close "horrible" | design | DESIGN |
| A8 | Dollhouse too fast — "like a clock with the time passing", a slider | S270g's 4.2 s hold | TODO: slower, with the years counting on its base; slider is DESIGN |
| A9 | Elements open in his face; should know where the head is; screens too close or too far; Recentre wrong after a jump | XR placement | TODO (one pass on every held/opened panel's distance) |
| A10 | Games unplayable with hands; Start/Begin/Pause in front; too small; no glow when aimed | held devices, 7 mm buttons, the sentence line over the device | TODO: in a headset the controller plays (stick = d-pad, trigger = A); hands get bigger targets; no caption over a held device |
| A11 | Lamby's message lost when a window opened on top | the one-voice queue | TODO |
| A12 | "Match my table" says fingertip | copy | FIXED S277: "Rest your hand flat on your table" |
| A13 | A skip button for the opening film, in the debug panel | — | TODO (debug only) |
| A14 | Performance: 2026 wide view 408 draws / 48 fps | measured S277: looking back west from Maya's seat = 145 draws (×2 per eye) | TODO: hide the left rooms' small props from Maya's seat |

## 1997

| # | What he said | Status |
|---|---|---|
| B1 | Rob's chat stops after "i don't want to go." — "I don't know what to do" | FIXED S277: the chat closes itself and the Family Form opens 3.5 s later |
| B2 | Rob's messages too slow ("this is always going to be fake") | TODO: faster typing |
| B3 | No minimise button on Rob's chat | TODO |
| B4 | "About this" panels on the form and the pillow: "not for here — for the Lexicon" (the anamnestic questionnaire, the treatment's real name, origins) | HIS yes given in the session → TODO: move to the Lexicon |
| B5 | Release Work / the racket: unclear; the racket should be on his side, "as if I was the one at the pillow" | DESIGN |
| B6 | The drawer opens and nothing else happens | DESIGN |
| B7 | "Show me" did nothing when NetPilot was closed — it should open it, then take him there | TODO |
| B8 | Root cause game missing on the desktop | TODO: check its condition after the S272 reorder |
| B9 | "Press here to play FIT IN" needs the game's own style | TODO |
| B10 | The three-dots button still on the desktop | TODO: identify (likely the frame helper) |
| B11 | Pressing Lamby while the Yes image is open should say "close the image to continue" | TODO |

## The update to 2003

| # | What he said | Status |
|---|---|---|
| C1 | The taskbar still shows mIRC and NetPilot during the update | TODO |
| C2 | Restorify's update screen should look like 2003 | DESIGN |
| C3 | The modem should be a different colour | TODO (palette) |
| C4 | The flip phone is too close to the face | TODO (A9) |

## 2003

| # | What he said | Status |
|---|---|---|
| D1 | Lamby's face "looks dead" (the eyes) | TODO (art) |
| D2 | The daily check-in should be forced, and come first | TODO |
| D3 | The start menu is still the old style (the bar is new) | TODO |
| D4 | The 1997 Family Form / Family Companion still on the 2003 desktop | TODO: take the two 1997 launchers off (the folder and Your file carry 1997 now) |
| D5 | ROLL_01: not clear that frames are pressable; frame 27 reads as "two coffins and a cigarette" | TODO: redraw frame 27, mark the pressable frame |
| D6 | The pet appears "out of the blue", then disappears | TODO: check the logic |
| D7 | "Your file" still says "Your file profile" in the story; old design | TODO |
| D8 | The testimony: no sound, "Start here" arrow with no button | TODO |
| D9 | The summons has different names; the window is 1997's design; "Go to next task" is weird | TODO |
| D10 | "Daily realignment" comes back — why? | TODO: check |
| D11 | The messenger pops in silently: wants a small cute sound | TODO (needs a sound asset) |
| D12 | Caleb: "Mine too… Mine too" — something missing; it should read as Caleb trying to find Daniel, because the system keeps them apart | HIS steer given → TODO: rewrite the exchange |
| D13 | Accountability: error messages over the content | TODO: check |
| D14 | "The window outside is blank" | TODO: check |
| D15 | Something next to the modem, "like a letter" | TODO: identify (probably the pet's keychain, S275) |

## 2016

| # | What he said | Status |
|---|---|---|
| E1 | Daniel's room still has the 1997 racket ("the first exercise") | FIXED S277: the racket and the exercise poster leave at 2016 (the room is packed) |
| E2 | Slippers "just there" | FIXED S277: removed (one line to restore) |
| E3 | Stars visible behind | TODO: check |
| E4 | The pen does nothing — wants an emotional link with the paper | DESIGN (his: "ask for a model to run something here") |
| E5 | The pen cup with the ruler is unpainted | TODO |
| E6 | Sign-in and Start too light to read | TODO (contrast) |
| E7 | A GracePlatform button in the middle cannot be pressed | TODO |
| E8 | "Back to today" should be a button at the end of the sequence | TODO |
| E9 | The video ("two hands") is unclear and ugly | DESIGN |
| E10 | The "Your record" button always there | TODO: check |
| E11 | Lambient "completely non-functional" | TODO |
| E12 | The messages are not open, so the sequence is lost | TODO |
| E13 | FloppySheep should glow | TODO |
| E14 | The vote link too fast to read | TODO |
| E15 | "Nuala, I still have your jumper" is not obviously the update | TODO |
| E16 | Installing contributor tools after Malta makes no sense: "wasn't Malta supposed to break the system?" | HIS (narrative) |
| E17 | The desk far away after the change to 2026 | TODO (A9) |

## 2026

| # | What he said | Status |
|---|---|---|
| F1 | Daniel's screens "just in the air" | TODO: a screen plane left on after its monitor was removed |
| F2 | The caption says "suitcase… youth weekend" with no suitcase there | TODO |
| F3 | The "Five steps" page: "needs a profound redesign"; "nothing about the actual aspects of conversion therapy" | DESIGN + HIS |
| F4 | Confirm "resets the image"; pop-ins | TODO |
| F5 | The session screen out of focus and too close | TODO (A9) |
| F6 | Maya asks Meridian LGB Trust for help and is refused (his yes to B) | FIXED S277 |

## The Close, the Lexicon, the receipt

| # | What he said | Status |
|---|---|---|
| G1 | People "morphed together"; the lamp fading in and out; "the fading is horrible" | DESIGN (he: "I already told that I didn't want this lamp thing") |
| G2 | Session-terminated panels too close to the face | TODO (A9) |
| G3 | Text moves to his face — no need | TODO |
| G4 | Sources cannot be pointed at; too far | TODO |
| G5 | The Lexicon is crisp and beautiful; other text should be as good | note: the Lexicon draws its text large; carry that to A6 |
| G6 | The Lexicon needs a song; the receipt has no sound | TODO (needs his choice of music) |
| G7 | The receipt cannot scroll back; "Back to library" out of place | TODO |
