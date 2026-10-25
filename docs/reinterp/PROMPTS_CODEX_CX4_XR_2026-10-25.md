STATUS: live

# Codex prompt CX4 — the VR round (Quest 3, Meta Browser) — after CX3b and CX3c are merged
*His WebXR test (24 Oct, Quest 3, Meta Browser, the GitHub Pages build) and his rulings (25 Oct): the pixel dissolve as
VR's transition; VR-specific rendering; hands AND controllers, always both; itch.io and a native Unity app are later.
Brief: docs/reinterp/VR_NOTES_2026-10-24.md. New Codex chat, PREAMBLE first, Luna 6 Extra High.*

```
TASK = cx4-xr. PORT = 3219. Read CLAUDE.md (look-mode 1, immersive WebXR, is a first-class build; Quest budget ≤75 draw
calls, 72 Hz; the comfort laws), docs/reinterp/VR_NOTES_2026-10-24.md, docs/reinterp/HEADSET_CHECKLIST_2026-10-19.md,
and the XR code: src/frame/xrInput.ts, src/frame/xrFrame.ts, src/desktop/home/homeXr.ts, src/room/restoreEntrance.ts
(the floating setup window), the camera rig and every scripted camera move in src/engine/app.ts (relocations, sends,
conducted turns, the restore flight, the Close's journey), src/room/heldDevice.ts and handheld.ts (the Game Boy).
Everything below is for IMMERSIVE XR ONLY — the laptop/tablet/phone builds must behave exactly as now (check both).
Do these IN ORDER:
1. COMFORT FIRST — THE PIECE NEVER MOVES OR TURNS THE VIEW IN VR. His words: "There cannot be any camera correction if
   we are in VR, as it is extremely nauseating." Find every place the piece writes the camera/rig transform (flights,
   sends, conducted turns, seat cuts, the restore's flight, the Close's journey, "take the viewer there") and, when
   app.xr.active, replace each with THE PIXEL DISSOLVE (his choice): the world around the seated viewer dissolves into
   the piece's own square pixels/stars (the restore entrance's look: night-blue, the Close's warm/cool tones), the
   scene changes underneath, and the new room re-forms around the viewer from pixels — the viewer never sees themselves
   move. ~1.5–2.5 s, never a black fade, never vection. "Take the viewer there" in VR = dissolve and re-form the scene so
   the thing is in front of them, or bring the object to them. Player-chosen seat jumps (floor markers) use the same
   dissolve. Reduced motion: an instant cut.
2. SEATED 6DOF: the head's own position and rotation always drive the view; the seat sets the origin once. Use a seated
   reference space ('local'), a one-time "Sit comfortably — press to set your seat" calibration at entry, and Recentre
   in the XR menu. Check the seat height puts the viewer at the desk naturally.
3. POINTING THAT YOU CAN SEE: from each controller AND each tracked hand, a visible ray with a cursor dot where it lands
   on the monitor / setup window / menu; a hover highlight on every pressable thing (canvas buttons: an outline drawn on
   the desktop canvas for the hovered hit rect); bigger hit targets in XR (min ~4 cm at 1 m); a soft click sound.
4. SHARP SCREENS IN VR: render the desktop canvases (monitor, setup window, laptop) at a higher resolution in XR, give
   their textures mipmaps + linear (anisotropic if available) filtering in XR only — keep FILTER_NEAREST on flat screens
   (pixel discipline); request antialiasing for the XR session and a framebuffer scale up to ~1.2 if the 72 Hz budget
   holds; check text sizes are readable at the seat. Measure draw calls and frame time in XR emulation and report.
5. HANDS (always alongside controllers): WebXR hand input on Quest 3 — pinch = select with a ray from the hand; poke to
   press near buttons (the handheld's, the setup window's when close); hands visible as simple low-poly hands in the
   piece's palette (no realistic hands); controllers keep working exactly as before.
6. HOLD THE GAME BOY: grab the handheld with the grip button or a hand pinch-and-hold; it follows the hand; its buttons
   are pressed by the other hand's ray, pinch or poke, or by the controller's face buttons; release puts it back on the
   desk. Same for the 2016 phone and the 2026 console if cheap.
Rules: no new storage; era palettes; no DOM in XR; list every new string BEFORE/AFTER. Verify with WebXR emulation in
headless Chrome where possible (a mocked XR session: dissolve instead of camera moves, rays and hover, hand pinch, grab)
and say exactly what still needs the real headset. Re-run the flat-screen behaviour once (the laptop build unchanged).
Finish with one full walk on the flat build in the background (`caffeinate -i node tools/walk.mjs --port 3219 --max 2600 --require-close`), read only its last lines (PREAMBLE rule 5), and write
docs/reinterp/HEADSET_CHECKLIST_CX4.md: what he should try on the Quest 3 to confirm each item.
```
