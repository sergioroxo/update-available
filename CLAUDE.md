# YOUR UPDATE HAS FAILED (PC Simulator) — standing orders for AI assistants

Part of **SurvivingSOGICE** (University of Bergen, Center for Digital
Narrative). A browser + WebXR (Quest 3) narrative experience about how
conversion-practice (SOGICE) networks target queer people online. Design
docs: `docs/` (read PRODUCTION_SCRIPT_v0.3 + SCRIPT_UPDATE_v0.4–v0.6 before
narrative work; ETHICS_CONSTRAINTS.md before ANY content work).

## REINTERP AMENDMENTS (R28, struck by Sérgio 2026-07-10 — apply ONLY behind
## `?reinterp=1`; the shipped build's laws below stay exactly as written)
Plan of record: `docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md`.
1. **Movement (revises "no locomotion ever"):** the player turns but never
   walks — movement = player-initiated jumps between fixed seats (click the
   floor marker / VR thumbstick-select + trigger-confirm, blink cut, never
   gaze-triggered, never smooth travel) plus scripted sends. One seat per
   room; rotation IS the exploration; cross-room jumps are system-sent tasks
   from Era 3 on. The turn remains the signature bodily ask.
   ⚑ **REVISED 2026-10-10 (Sérgio): "We should not expect people to look around at any part, we need to take the
   viewer there. This is a rule for all."** No story beat may depend on the player choosing to look somewhere, and
   no beat is triggered by a look: where the story needs them to see something, the piece TAKES them there (a
   scripted send, a conducted turn, a device brought to the eye), as a sequence of actions. Looking around stays
   free; it is never required. (Cadence study §9, docs/reinterp/CADENCE_STUDY_2026-10-10.md.)
2. **Guidance (revises the Assistant caps):** Era 1 has NO assistant
   character — only impersonal system side-messages (short hints that help
   navigate and PREPARE the user for Lamby). The Lamby character-conductor
   debuts with the Era-2 update and conducts thereafter, ≤2 lines per
   conduction beat. Unchanged and non-negotiable: never during `felt` scenes,
   never jokes at the victim, never delivers Dossier text, dismissal always
   works and is logged.
3. **Input (revises "click/tap only"):** click/tap + the movement press
   (above) + Esc/pause opening the game menu. Still no free-text keyboard, no
   timers, no chords. ⚑ **S80: a tap is now resolved on RELEASE, behind a
   10 px / 1.2 s threshold — a press that travels is a look, a press that stays
   is a tap.** The two-finger pinch is a camera control, not an input, and the
   gyro is a LOOK: neither can ever select anything.
4. **The frame (unchanged, clarified):** the non-diegetic game menu
   (Esc/pause: resume, restart, controls help, credits/attributions, leave)
   is frame-voice — functional and undecorated. The frame still never plays.

## Stack & architecture (decided — do not re-litigate)
- PlayCanvas **as npm package** + Vite + TypeScript. No cloud editor. Static
  build, deployable to GitHub Pages (`base: './'`).
- **⚑ One scene, THREE look-modes — corrected 2026-08-06 by Sérgio.** This piece
  is a **WebXR experience**, and the browser build is **co-designed with the VR
  build, not degraded from it**:
  1. **Immersive WebXR** (Quest 3; Vision Pro) — the head is the camera.
  2. **Browser, drag-to-look** (desktop/laptop) — framed camera, same 3D room.
  3. **⚑ Browser, GYRO-to-look** (phone, tablet) — same room; you turn the
     device, as in a 360 video. **BUILT S80** (2026-08-09): same camera, same
     seat, same scene — the rig holds the authored pose and the gyro rotates
     the child camera, exactly where XR puts a tracked head, so drag and gyro
     COMPOSE. Entry is a deliberate button (iOS cannot be asked for orientation
     without a real gesture); **Recentre lives in the game menu** because iOS
     gives no absolute heading and relative yaw drifts. **Two-finger pinch =
     camera FOV, 30°–80°** — you narrow the frame, the room never leaves.
     ⚑ Verified by simulation in headless Chrome only; **never run on a phone.**
  The flip = camera/body turns ~180°, in all three.
- **⚑ `?flat=1` IS NOT A FALLBACK.** It was a testing-phase device and the old
  wording here ("universal fallback") was a misreading that limited development
  for months. It is a **REVIEW TOOL** — the desktop canvas alone, for inspecting
  2D work without the room. **It is not an audience target and no design
  decision should be justified by it.** The fallback for "VR is not possible"
  is **the browser 3D room**, which is a first-class build.
- **⚑ DEVICE REALITY (verified 2026-08-06, and it drives the above):** Safari
  implements WebXR **only on visionOS** — there is **no WebXR on iOS, iPadOS or
  macOS Safari**, and `navigator.xr` will never fire there. So for every Apple
  device except Vision Pro, **look-mode 3 IS the experience.** It needs
  `DeviceOrientationEvent.requestPermission()`, which requires **HTTPS** and a
  **real user gesture** (it cannot be requested on page load) — so it needs a
  deliberate button. Android grants orientation without a prompt.
- **One UI surface:** all interaction lives on the offscreen 2D desktop
  canvas (`src/desktop/`), textured onto the monitor mesh with
  `FILTER_NEAREST`. The 3D room is staging, not UI.
- Narrative content lives in `data/` (scenes, dialog, strings, paths) —
  prefer editing data over code. All display text in `data/strings/` (plain,
  human-editable).
- "Fake intelligence" only: scripted branching. No live AI calls at runtime.

## Hard invariants (CI-enforced; a PR that breaks these is wrong by definition)
- **No runtime network calls** after asset load. No fetch/XHR/WebSocket/
  beacons/analytics. CSP will pin this.
- **No storage of user input**: no localStorage/sessionStorage/indexedDB/
  cookies. The typed name + all inputs live in the in-memory `ledger`
  (`src/state/ledger.ts`) only, wiped on exit/idle/refusal endings.
- The photo-filter ("Restoration Filter") never takes camera/file input —
  its "preview" is a pre-authored sprite. Never request permissions.
- Dossier cards REQUIRE `status: documentary | contested | speculative`.
  Build fails without it. Cite only sources verified in the knowledge base.

## Tone & register laws (ethics-derived — never bend these)
- Victim side grounded ("darkness earned"). **Satire only inside perpetrator
  self-presentation, and it must collapse.** Never satirize the
  gender-exploratory clinical debate: render BOTH captions, unresolved.
- Scene flag `register: operable | felt | respite`:
  - `operable` (system surfaces) may glitter, charm, play;
  - `felt` (the person) — bare: no Assistant, no satire, no mechanics;
  - `respite` — genuine queer joy; **never a trap, never revealed as fake**;
    the system targets *around* it, never through it.
- **The frame never plays:** no quest popups, scores, or achievements in the
  piece's own voice — gamification exists only diegetically.
- The Assistant (Helpy → Aski → Sol → Ami™): absent in Stages 0–1; ≤5 lines
  per stage; never during `felt` scenes; never jokes at the victim; never
  delivers Dossier text; dismissal always works and is logged to the ledger.
- No real people, likenesses, logos, or verbatim survivor testimony.
  Invented marks only (Compass, HopeRestored, Pastor.AI, Sift™, EuroRepent
  Elite™, transjesus.str…). Organizations may be NAMED only where the KB
  documents them.

## Aesthetic laws
- Pixel discipline: import era palettes from `src/desktop/theme/` — never
  invent colors. `FILTER_NEAREST`, integer positions, 90°-step rotations only.
- **Soft Lo-Fi doctrine:** rooms are cozy low-poly with underdefined edges —
  NOT horror-dark. Tone dial per scene `tone: -2…+2`; extremes forbidden.
  The **witness side is the sharp side** (surveillance is high-definition;
  life is soft).
- **Selective fidelity:** tiers `hero | set | fog`; ≤3 hero objects per scene
  on Quest. The system's instruments are the most defined objects.
- Quest 3 budget: ≤75k tris, **≤75 draw calls** (⚑ raised from 60 by Sérgio
  2026-08-06; his cross-platform research puts Quest 2 at <80 and Quest 3 at
  <120, so 75 keeps margin under the LOWER of the two while clearing the
  entrance at 68 and the E3→E4 cascade at 62, which were never defects. The
  latent send leg at 78 is still over), 72 Hz floor, no realtime
  shadows, render-texture uploads on dirty only. No locomotion ever — the
  only bodily ask is the turn.

## Era transitions = software updates (SCRIPT_UPDATE_v0.5 §1)
Notification ("Remind me later" works once) → EULA (scroll, one live
"I Agree") → install (changelog-as-thesis + glitch) → restart. Updates are
triggered by documented system failures, never by the player.

## Workflow
- One module per session. Acceptance criteria checkable by feel.
- Definition of done: `npm run dev` works; `npm test` passes; README current;
  one line appended to BUILD_LOG.md; in-headset note for XR-touching changes.
- Sources: anything uncited carries `[VERIFY SOURCE]` until Sérgio checks it.
- Sérgio (project lead, non-coder) directs. **⚑ THE WRITING IS CLAUDE'S — revised
  2026-08-17, superseding the 2026-07-24 co-creation norm.** His words: *"I am not
  going to write it, is your work here."* So: **Claude writes the display text,
  including survivor-adjacent and felt beats, and finishes it** — no more
  PLACEHOLDER-draft parked awaiting a pass that is not coming. He reviews when he
  wants to and his edit still wins, but **nothing waits on him to write it.**
  ⚑ What did NOT move: he owns ethics judgment calls, dossier phrasing, and every
  `_s`-marked line (his own verbatim wording, never overwritten).
  ⚑ **And the responsibility moves with the work.** Text nobody else is going to
  write is text nobody else is going to catch — so felt and survivor-adjacent
  material gets MORE care now, not less: no invented deadnames, no borrowed
  testimony, no beat that speaks *for* people rather than about the system.
- **⚑ THE TRANS READER PASS IS RETIRED AS A GATE (2026-08-17, Sérgio: "its not
  going to happen").** It blocked Era 4's deadname beat. That beat no longer
  contains a deadname — the record now misfiles Maya ("under the old file")
  rather than misnaming her — which removes most of what the gate existed to
  review. **Nothing in the piece is BLOCKED-ON-READER-PASS any more.** If an
  outside reader ever becomes available the offer stands, but no work waits.
