STATUS: live

# Headset session, 28 Oct 2026 (Quest 3, Meta Browser, cast to a Mac)

Observer: Claude (Sonnet 5.5), watching the cast and the frames only. No code, data or public files were touched.
Nothing here is committed. Frames and marked frames live in `out/cast-2026-10-28/` (never committed).

## 1. Setup

- Device: Meta Quest 3, Meta Browser. Cast to a Mac through horizon.meta.com/casting (in the Claude app's browser pane, then expanded).
- Build: the live Pages build at 096cebd4 (S268 VR fixes). The new 1997 order is not live.
- Capture: `screencapture` every 5 s, full main display.
- Window: first frame 093941, last 095311. 158 frames. Casting stopped on its own (the cast page shows "Casting stopped." in frame 095230), so the session ended with the break described in 3.1.
- Limits: the cast shows one eye and lags the headset. No sound. The cast pane was small for the first minutes; it was full screen from about 094200. I never saw his hands, only what the piece drew. Remarks below are his words; my notes say "frame shows" for what I can see.
- Era/beat coverage: 1997 only. Stars + title, the LambyOS setup dialog, the "Welcome Home" ad screen, the "All set! See you later!" dialog, then the 1997 room. He never got past the 1997 room.

## 2. His nine notes from 27 Oct

1. Finding the centre is lopsided: SAME. Setup screen sits well right of centre and rolled (094302, 094827 about 12 degrees, 094945 about 25-30 degrees).
2. Pinch not reliable, touch not clear: SAME (his remark at ~094451). Frames show no hand cursor, ray or pressed state as feedback, so there is no visible confirmation. The cast cannot show which pinches were lost.
3. Stars and title off to the side: SAME. 093956 and 094200: title bottom-left and low, then split with the dim plane left and bright pixel letters right (094200).
4. Buttons "far away": NOT SEEN as a distance complaint this time; he did not mention reach. The Start button was too hard to see (see 3.4).
5. Floating menu tab in front of the screen: NOT SEEN. The tab was not in any frame I looked at.
6. Menu Recentre does not work: SAME/WORSE (094343). After recentre the setup screen is still far right and cut off at the frame edge. His words: "it jumped to the side".
7. Beeping of the input: NOT SEEN (cast has no sound). He did not mention it.
8. Tiny room, camera locked, needs 6DoF: SAME/WORSE (094909, 094924). The room formed but he was up near the ceiling, pitched up and rolled about 10 degrees, with a black rectangle where a screen should be. He said it was the same short, tiny room.
9. "Impossible to see": BETTER for the setup text (it reads in 094451), WORSE for the 1997 room (black rectangle, ceiling view).

## 3. New problems, most severe first

3.1 Room entry breaks the session (1997 desk, ~094850-094950).
After he pixelated into the room, it came up short and tiny (as in note 8). The view then jumped to an "outside" pose near the ceiling, the menu popped up, and the session broke (casting ended). His words in 6.9. Frames: `094909_just-before-flying.jpg`, `094924_small-room-then-flying.jpg`, `094945_it-broke.jpg`. In 094924 and 094909 a large black rectangle is where a screen or monitor should be. The seat pose is wrong and the room is not rebased with the rest of the world.

3.2 A hand gesture brings up a menu, and then the view recentres (~094516-094543).
He moved his hands quickly and a menu appeared; afterwards the image recentred. He asked if the menu was on purpose. The piece has no palm or wrist gesture for a menu (grep in `src/frame/` finds none), so it may be Meta's own system menu or the piece's tab. I could not tell which from the frames. The recentre after it suggests either Meta's reference-space `reset` event or a head-pose jump re-forming the room. Frames: `094516_hand-menu-appears.jpg`, `094543_recentre-after-menu.jpg`.

3.3 Hand-tracking is unstable and the image is lopsided (~094302).
His words in 6.1. The setup screen is right of centre and rolled. Frame: `094302_hand-tracking-lopsided.jpg`.

3.4 The Start button is pre-selected and very hard to see when to click (~094827).
The "All set! See you later!" dialog has a small Start button with only a faint outline. Frame: `094827_start-menu-preselected.jpg`.

3.5 The hand marker is too blocky and reads as a skeleton hand (~094945).
He wants it more clearly a block shape so people do not take it for a skeleton hand. Frame: `094945_hand-marker-blocky.jpg` (a pale blocky cluster beside the menu; I cannot be sure from the frame that it is the hand marker, he confirmed it).

3.5b XR menu is the old dark plate, not the Win95 dialog style (094945). Items: Resume, Where you are, Recentre the view, Controls, Restart, Leave. The CX5 restyle is not done.

3.6 No visible confirmation of a press (~094451). See note 2. He asked for "a better confirmation of the action". Frame: `094451_pinch-unreliable.jpg`.

3.7 Lamby in VR (design remark, ~094827).
He wants Lamby to work more in the environment in VR, since turning around is easier there. This is a design request, not a bug.

3.8 A white ray line is drawn across the view (094343, 094909). Unclear whether this is the controller ray or the hand ray. It is distracting.

## 4. What looked fine

- The star field, the setup dialog text and the "Over 30 years of care" ad screen are readable in the cast (094451).
- The setup choice (Yes, please / I know what to do) did go through at ~094451.

## 5. Open questions for him

1. Was the menu at ~094516 the Meta bar (system) or the piece's ≡ Menu tab?
2. Were you using hands or controllers at each point? The frames cannot say.
3. At ~094900, did the pixel dissolve start from your press, or on its own?
4. Did you hear the click or beep again?
5. Did Meta's long-press recentre do anything this time?

## 6. His remarks, verbatim, with time (clock time of my marking, +-10 s)

1. ~094300: "the tracking with hands isnt very stable, ther image is loopsided"
2. ~094345: "judt recentreedand it jumped to the side"
3. ~094450: "pinch to click is very unreliable, need a better confirmation of te action,"
4. ~094520: "if i move my hands qucikly rh menu appears, is that on purppusode?"
5. ~094545: "bt then it recsets the image after the menu appears"
6. ~094700: "keep taking screenshots every few seconds so youcn keep track"
7. ~094830: "the start menu was pre selected here and very hard to see when i am supposed to click, we also need to see how does tehe klamby helper work with th VR because it should be more for the environoment since it is easier to toturn around. Sorry for the mispeals, iam tyoing due to a small gap on the VR headset, oplus the dyslexia"
8. ~094930: "wgat happened? the samll room appearaed then i apperar flying and nothing moves?"
9. ~094950: "it brokw"
10. ~0950-0953 (time not logged exactly): "It has my hand marker, that is still too blocky, and needs more block so people dont think it is skeleton hand. Also, yeah I pixelated to the room and it made the same error of the short and tiny room, and then jumped to the ousiteide view and the menu pop-up and brakes."
11. ~0953+ (after casting had stopped): "Make the report so I can send to toher session"

(Spelling is as typed; he types in the headset with a small gap and has dyslexia.)

## 7. Marked frames

All in `out/cast-2026-10-28/marked/`:
094302_hand-tracking-lopsided, 094333_before-recentre, 094343_recentre-jumped-side, 094451_pinch-unreliable, 094516_hand-menu-appears, 094543_recentre-after-menu, 094827_start-menu-preselected, 094909_just-before-flying, 094924_small-room-then-flying, 094945_it-broke, 094945_hand-marker-blocky.
