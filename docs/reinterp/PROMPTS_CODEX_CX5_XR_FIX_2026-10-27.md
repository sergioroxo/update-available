STATUS: live

> ⚑ **S268 (27 Oct): Claude did this round itself, at his ask ("Can I run it on Claude instead?").** Built: VR now
> starts AT the seat (the entry had used the browser's descent pose — 1.5 m aside, 2.2 m up, pitched 30°, turned 44° —
> the cause of notes 1, 3, 8); the XR world is only ever turned, never tilted; a nudge under 0.35 m / 20° no longer
> re-forms the room at the gaze (notes 8, 9: "the camera was locked with my movement"); camera moves in XR are one cut
> under the dissolve; Meta's long-press recentre (reference-space `reset`) resets the mapping; the menu's Recentre uses
> the head as it was when the menu opened (note 6); the dissolve's cells 64 → 192 (his: "too big of squares"); pinch
> presses where the hand aimed when the pinch closed (note 2); no click sound, a light controller pulse (note 7); the
> Menu tab ~34° right, clear of the monitor (note 5); the seat line teaches pinch, trigger AND touch (note 2). Emulated
> XR check passes (60 draw calls). NOT yet done: per-era reach/centre measurement (1d), the XR menu's Win95 restyle,
> the fingertip ring, the 80-draw-call free pose, sharper screens (6ii–iv). Next: his headset check.

# Codex prompt CX5 — the VR fix round (Quest 3, Meta Browser) — after CX4 (211778e7) and S267 (9e7bef8c)
*His first headset check of CX4 (27 Oct, Quest 3, Meta Browser, the live Pages build). His notes, verbatim, are the
brief; the diagnosis under each is Claude's reading of the code, to be CONFIRMED or overturned, not trusted. New Codex
chat, PREAMBLE from PROMPTS_CODEX_2026-10-11.md first, Luna 6 Extra High.*

His notes (27 Oct), in his words:
1. "There are some issues with finding back to the center; it is kinda lopsided, why?"
2. "the pinch to press is not always working and having to touch the buttons needs to be more clear from the start"
3. "the press the screen is well but the stars are off to the side and it is a bit strange so the title is on your
   right in space"
4. "I have to press on the buttons that is very 'far away'"
5. "The floating menu button just sits in front of the screen"
6. "The recenter the view button doesn't really work because the menu is locked in space, how can I recenter if it
   forces me to look to the panel, it always makes it worse. The Meta recenter system of long press to the recenter
   should work here..."
7. "the beeping of the input is a bit annoying"
8. "I entered the room and it was minuscule stuff floating, the camera was locked so I could move without the rest,
   like this needs to 6DoF"
9. "It is impossible to see, it's just horrible"

```
TASK = cx5-xr-fix. PORT = 3221. Read CLAUDE.md (immersive WebXR is a first-class build; comfort laws; ≤75 draw calls,
72 Hz), docs/reinterp/PROMPTS_CODEX_CX4_XR_2026-10-25.md (what CX4 built), docs/reinterp/HEADSET_CHECKLIST_CX4.md,
docs/reinterp/PROMPTS_CODEX_CX5_XR_FIX_2026-10-27.md (THIS file: his nine notes above, verbatim), and the XR code:
src/frame/xrComfort.ts (the world rebase, calibrate(), the pixel dissolve), src/frame/xrFrame.ts (the XR menu, the
≡ Menu tab, the hint plane), src/frame/xrInput.ts (rays, pinch, poke, the click sound), src/frame/xrTargets.ts,
src/room/restoreEntrance.ts (the stars and the setup window), src/engine/app.ts around startApp's XR block
(xr.start with XRSPACE_LOCAL, mountXrComfort, onRecentre → xrComfort.calibrate), src/engine/screenTexture.ts.
Everything below is IMMERSIVE XR ONLY — the laptop/tablet/phone builds must behave exactly as now (check both).
Do these IN ORDER; each item says what to fix and what Claude suspects. Confirm the cause in code before fixing.

1. ONE SEAT, CENTRED, AND THE HEADSET'S OWN RECENTRE (notes 1, 3, 4, 6). Suspected single root: the mapping from the
   physical head to the authored eye (xrComfort's `fixed` / `calibration`) is wrong or stale, so the whole world sits
   rotated and offset — "lopsided", the stars and title to the right, the monitor's buttons "far away".
   a. META'S LONG-PRESS RECENTRE MUST WORK. When the system recentres, the WebXR reference space fires `reset`
      (XRReferenceSpace 'reset' event; find how PlayCanvas exposes the reference space). On reset, rebuild the mapping
      so the head's NEW origin maps to the authored eye facing the authored forward (i.e. drop any stale calibration),
      with no dissolve and no flash. This is the primary recentre; say so in the controls help.
   b. ENTRY IS CENTRED. At session start, and when the room first forms from the stars, map the head's CURRENT yaw and
      position to the authored seat (an automatic calibrate), so the stars, the title, the setup window and the room all
      start straight ahead at the right distance, whatever way the visitor was facing when they put the headset on.
      The "Sit comfortably — press to set your seat" press stays as a manual re-set.
   c. THE MENU'S RECENTRE MUST NOT USE WHERE YOU LOOK AT THE MENU. Calibrate from the head yaw captured at the moment
      the menu was OPENED (before the visitor turns to the panel), or better: Recentre closes the menu, shows a short
      "Look straight ahead… 3" countdown hint head-locked, then calibrates. Never calibrate yaw from a head that is
      looking at a world-locked panel.
   d. MEASURE: from the calibrated seat in every era, the monitor's/device's pressable area must be within ~0.55–0.75 m
      of the eye and centred within ±10° of straight ahead (worldToScreen / distance from the XR camera). Report the
      numbers per era. If a screen is further than reach, the XR seat moves closer (XR-only seat offset), never the
      visitor.
2. THE MINUSCULE ROOM AND THE LOCKED CAMERA (note 8). He entered a room (ask nothing; find it) and saw "minuscule stuff
   floating", and his movement did not move the world ("the camera was locked"). Suspects, check all: (i) the restore
   entrance's worldReady=false phase — only 'restore-pixels' is reparented into xr-world, so the rest of the room is not
   rebased while the pixels are, and the two disagree; (ii) a scripted relocation leg (the 'rise'/overlook in
   app.ts relocKey e3-e4, RELOC_OVERLOOK_*), which in XR must be a dissolve, never a rig move — if it still writes the
   rig, the viewer is lifted above tiny rooms; (iii) any entity parented under the camera rig or head that should be in
   the world (it would be head-locked: "I could move without the rest"). Reproduce in the emulated-XR harness CX4 used,
   at each era entry and each send, and print for each: the stage transform, whether every room root is under
   xr-world, and the head's world position vs the authored eye. Fix the cause. 6DoF is the law: head position AND
   rotation always move the view; nothing in the world is ever head-locked except the comfort veil and hints.
3. THE MENU TAB IN FRONT OF THE SCREEN (note 5). The ≡ Menu tab hangs at a fixed offset from the head (TAB_DIST 0.6,
   TAB_DROP 0.36) and ends up between the eye and the monitor. Move it off the work: on the visitor's non-dominant wrist
   (a small tab on the controller/hand that faces the eye when the wrist is turned up), or low and to the left of the
   monitor, never overlapping any screen's pressable rect. The menu itself: a lazy-follow panel (it stays put while
   open, but opens straight ahead of the head and slightly below eye line, never behind a screen). AND give the XR
   menu the browser Esc menu's look: the Win95 DIALOG style (src/desktop/gameMenu.ts, DIALOG tokens in
   src/desktop/theme/), not the old dark FRAME plate — the drift Claude found on 27 Oct.
4. PRESSING THAT WORKS, AND IS TAUGHT FROM THE START (notes 2, 4). Measure pinch reliability: log each pinch start/end
   with the ray hit, and find where presses are lost (hysteresis thresholds, the ray leaving the rect between pinch
   start and end, the hit resolving on release after the ray moved — the 10 px / 1.2 s tap rule must be in angle for
   XR, ~2°, not pixels). Make the ray's hit sticky for the duration of a pinch. Teach both ways in the first XR moment,
   before the first press is needed (the setup window in the stars): one line and a visible hand/controller hint —
   "Point and pinch (or pull the trigger) to press. Close enough to touch? Just touch it." — and show the poke
   affordance (a ring on the fingertip that fills as it nears a button) whenever a hand is within 15 cm of a screen.
5. THE CLICK (note 7). Remove the per-press key_1997.mp3 click in XR (xrInput.ts:98). Feedback in XR is visual (the
   button's pressed state, the cursor dot) plus a light controller haptic pulse (gamepad.hapticActuators, ~10 ms, low
   intensity) when a controller is used; hands get no sound. The era's own UI sounds inside the screens are unchanged.
6. READABLE (note 9: "It is impossible to see, it's just horrible"). Find out what is unreadable and fix it, in this
   order of suspicion: (i) screens too far (item 1d fixes most of it); (ii) the screen textures' resolution vs their
   size in the eye — at the measured distance each era's text must be at least ~1.2 arc-minutes per pixel row of the
   font cap height; raise the XR render-texture resolution or the framebufferScaleFactor where the budget allows
   (Quest 3: try 1.2–1.4, measure 72 Hz); (iii) the 2003/1997 dark rooms too dark in the headset — an XR-only exposure
   lift within the era's tone dial, never daylight; (iv) a held device (Game Boy, phone) brought nearer the eye when
   held. Report before/after numbers per era.
7. BUDGET. The free head pose measured 80 draw calls in CX4 (>75). Find what enters the view from that pose and cull it
   or merge it. Report the worst pose per era after the fix.
8. CHECKS. npm test; npx tsc; a full browser walk (caffeinate -i node tools/walk.mjs --port 3221 --max 2600
   --require-close > out/cx5-xr-fix/walk.log 2>&1 — ⚑ ALWAYS --max 2600) reaching the Close; the emulated-XR pass for
   items 1, 2 and 4 with its printed numbers; nothing in the desktop/phone builds changed (screenshots of the 1997 and
   2026 desks before/after). Write docs/reinterp/HEADSET_CHECKLIST_CX5.md: one line per note above, what to try in the
   headset to confirm it, on the live URL in a fresh tab. Commit on branch codex/cx5-xr-fix; do NOT commit out/.
```
