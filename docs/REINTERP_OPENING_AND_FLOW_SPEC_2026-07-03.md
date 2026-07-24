# OPENING & FLOW SPEC — beat-by-beat, browser-first, VR-integrated
STATUS: superseded-by docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md

*2026-07-03 · Fable 5 (design author, per Round 15's role restructure). Consolidates Sérgio's opening
brief (archive R9-1), the flow model (archive R8-1), the visual anchors and naming notes (archive R11-3),
and the Lamby-rig verdict (procedural, archive R11-4) into ONE buildable spec. All display copy below is
PLACEHOLDER — register and intent only; Sérgio's voice pass finalizes every line. Register direction from
his trials binds throughout: **more direct and controlling — the player is forced, limited, demanded of.**
The frame never plays; every demand is diegetic (the OS's voice, never the piece's).*

---

## 0-REV. ROUND 16 REVISIONS (Sérgio, 2026-07-03 — BINDING; where these conflict with anything below, these win)

1. **THE BROWSER VERSION IS THE 3D ROOM. `?flat=1` IS NOT THE BROWSER EXPERIENCE.** In the browser the
   player controls and explores the full 360° space (drag-look) and sees the computer WITH the desktop
   action inside it, on the monitor, in the room — never the desktop canvas full-screen. Full-screen
   flat is a testing/adjusting tool and a fallback only. Building the opening against `?flat=1` "would
   remove full intention of this becoming a WebXR experience." Every build session for opening/spatial
   work verifies in the 3D browser view; `?flat=1` remains only a regression baseline.
2. **Platform select = a start-up choice** (a button on the start screen, or auto-detect of the
   environment — showing both options is fine if it reduces coding errors).
3. **O2 camera: one behavior for both platforms.** In VR the camera may move to the equivalent position
   the browser camera takes — no need to design them separately.
4. **AUTO-CAM / CONDUCTED MODE (new, start-up options panel):** an accessibility + guidance option. When
   ON, at each beat the camera pans to the position it needs to be (for VR players with movement
   limitations, and anyone preferring a more conducted experience). When OFF, free look as designed.
   This is a per-player option, set at start-up, changeable at the options panel.
5. **O6 browser controls: drag AND arrow keys, plus shortcut keys** (R = reset view, F = flip, etc.).
   Deliberate revision of the click/tap-only law for browser CAMERA control only — interaction with the
   piece's content stays click/tap (VR-safe); the keyboard drives the camera/view, never a content verb.
6. **O8 is identical on browser and VR: the room morph is seen, in the room.** No full-screen ritual on
   browser — the update plays on the monitor in the 3D room, and the room morphs around the player.
7. **The logo (O1) is designed by Fable**: dual-toned, pseudo-3D low-poly, orange with black outline.
   First draft: `docs/REINTERP_LOGO_SPEC_2026-07-03.md`.

## 0. The macro shape (one sentence per act)

One screen → one room → a cluster → all rooms → the network. The player meets ONE person's world in full
before learning the apparatus was always processing others; each update ritual widens the circle; the
Close inverts the data grammar into the community's constellation.

## 1. THE OPENING, beat by beat

### Beat O1 — Pre-experience (outside the fiction)
**What happens:** black → logo (asset: Sérgio, to be made) → disclaimer/content warning (existing law:
minimum 4s before continue arms; Leave works from here on, forever). Behind the disclaimer text, the E1
room is already visible — **lit only by window light**, monitor dark, everything else in shadow. This is
the controls moment, outside the fiction: VR = "try your remotes" (point/click affordance check); browser
= one line on drag-to-look + click.
**Why it's built this way:** the player learns the verbs before the system starts abusing them — consent
to the controls precedes the fiction's fake consent rituals, so the contrast is available later.
**Data/keys:** `data/strings/opening.json → o1_disclaimer, o1_controls_vr, o1_controls_browser`.

### Beat O2 — Power on
**What happens:** on continue: the room's lights come ON (a warm, ordinary click — not dramatic), and the
**desk lamp illuminates more than is physically real** (R11-3's locked anchor: the lamp is canon's one
constant object across eras; the piece opens inside its symbolic light). The computer boots. **New
fiction, stated by the boot screen itself: this computer was made FOR you, running an operating system
built on the Lamby controlling system.** Boot sound: playful, condescending-childish, primitive polyphonic
MIDI Lamby chime (asset: Sérgio/Sonauto).
**Camera:** browser = the framed camera pulls from the room-wide establishing view to the desk; VR = the
player is already seated at it; the light change does the "look here."

### Beat O3 — Profile creation (consent theater zero)
**What happens:** the OS opens PROFILE SETUP — and **the name field is already filled.** They know your
name. (Inversion of the shipped name-typing: personalization you never provided.) The player picks, by
click/chip only:
1. **An icon/avatar** from a fixed grid of era-true pixel icons (none are people — objects: a star, a
   tape, a flower, a bird… the system will later re-caption whatever is chosen).
2. **Three "get to know you" chips** from a small set (PLACEHOLDER examples, system's cheery register:
   "I like music" / "I keep a diary" / "I have a best friend" / "I want to do better"). Every chip is
   warm on its face and reusable as surveillance later — that's the selection criterion for the final
   set: **each chip must be able to return, recontextualized, in the witness record or an assistant line.**
3. **One "goal"** the system insists on ("What would you like to work on?") — all options are
   apparatus-shaped; there is no neutral option; declining files as a choice too (Ethics #10 symmetry).
**Routing:** identical-routing, per the R11-3 proposal — whatever is picked, the apparatus routes the
player the same way ("we know what this really is"). The picks feed the LEDGER (in-memory only), not the
route. The re-filing is visible immediately: the profile-complete screen shows the player's selections
**already re-captioned in the system's categories** (e.g. the diary chip renders back as "self-monitoring:
enabled"). That's the whole thesis in ten seconds, before the first scene.
**Data/keys:** `data/strings/opening.json → o3_*`; ledger tags `profile:icon:*`, `profile:chip:*`,
`profile:goal:*`.

### Beat O4 — Login: Lamby is already installed
**What happens:** desktop appears; the proto-Lamby assistant (Clippy-position, procedural rig per the
Codex verdict — sprites reserved for authored transformation beats) is **already present, already
mid-greeting** — the player never installed it and is never offered the chance to. First lines establish
the guide register: helpful, proprietary, faintly condescending ("I've set everything up for you"). The
dismissal affordance EXISTS and WORKS from the first appearance (standing protection) — and dismissing is
logged.
**Canon note (already made in R9-2, restated here as binding):** the assistant is present from Stage 0 in
the reinterp version — the old "absent Stages 0–1" law is deliberately revised. Still standing: never
during `felt` beats; never jokes at the victim; dismissal always works and is logged.

### Beat O5 — The beginner panel (the museum frame, once)
**What happens:** one short orienting panel, the piece's own voice (the ONLY non-diegetic surface in the
opening): you will follow the lives of 3/4 different people through time — an exploration of different
realities and perspectives, not a childhood-to-adulthood biography. Two sentences, then gone.
**Placement:** AFTER login, BEFORE the first task — inside the fiction's pause, not interrupting a beat.

### Beat O6 — Era 1 begins: the tutorial room
**What happens:** the E1 room as built (kit/IRC/diary canon), with the reinterp additions: the rest of the
space sits in **darker tonality** — elements visible but not understood; the narrative pushes ROTATION
(browser: drag; VR: turn) as the exploration verb. "You need to touch stuff to see there's elements around
you." The graying task (R7/§R3-1) lives here. The fluid trans niche and other alcoves exist but are
**dark — architecture felt as hum and shadow, not shown** (geometry doc E1 state).

### Beat O7 — The first filing = the first reveal
**What happens:** at the existing wake trigger (kit insertion), the witness system files the player for
the first time — and the space acknowledges plurality: the **ceiling presence wakes** (light/eye-motif/
hum — presence, never reading, per R8-3) and the alcoves become **dimly legible for the first time**. The
reveal IS the lesson: you are one of the files; the apparatus was always processing others.
**Browser:** the ceiling wake reads as a light-state change + a brief upward camera acknowledgment (a
half-second tilt, not a cutscene); the record stays legible on the flip surface as shipped.

### Beat O8 — E1→E2: the update opens the world
**What happens:** the era-transition ritual as canon (notification → EULA → install → restart), staged in
the SAME room — which then opens to the next rooms on restart (R9-1's "fluid spaces"). The cluster reveal
completes HERE, not before: E2 boots with the radial grammar as the new normal.

## 2. THE FLOW MODEL from E2 on (summary — each era's own doc carries detail)

| Era | Cluster state | The trans niche (geometry doc) | Guide |
|---|---|---|---|
| E2 '03 | radial standing grammar; Daniel leads | trans-fem lean (continuum diagram) | Lamby |
| E3 '16 | cross-cluster sends begin in earnest | ALL-THREE convergence beat + the Lesbian/Trans-masc dilemma | Lambient |
| E4 now | cluster tightens around Maya | niche flips forward AS Maya's room; trans-masc phone side-presence | Echo |
| Close | slits → panels → `Restart as you are.` → point-cloud | threads gather into the constellation | none (felt) |

## 3. BROWSER vs VR, per beat (the dual-platform logistics table)

| Beat | Browser (primary) | VR (validated later, built-compatible now) |
|---|---|---|
| O1 | click-to-continue; one-line drag-look hint | remote try-out; gaze reticle check |
| O2 | framed camera moves to desk | no camera move — light pulls the head |
| O3 | mouse click on chips | point-click, chips sized for ray selection (min 0.05m targets) |
| O4–O5 | desktop canvas as shipped | same canvas on the monitor mesh |
| O6 | drag-to-look reveals the dark surround | physical turn; identical trigger logic |
| O7 | light change + brief camera tilt | ceiling glow above — a glance, never sustained reading |
| O8 | on the monitor, in the room; the room morphs on restart (REV-6: identical to VR) | same |
| `?flat=1` | **fallback/testing ONLY (REV-1) — never the browser experience.** Collapses to the desktop canvas alone for regression baseline + OS-adjustment work | n/a |

## 4. BUILD ORDER (three sessions, each independently verifiable)

1. **Session OP-1 (Sonnet): O1–O3** — disclaimer/room-light states, boot screen, profile creation +
   re-captioning screen. All data-driven; no new engine systems (light states = existing room lighting
   params).
2. **Session OP-2 (Opus): O4 Lamby integration** — the procedural rig (already prototyped, `?lambyrig=1`)
   extracted into the OS as the resident assistant with mood/line/anchor API + dismissal/logging.
3. **Session OP-3 (Sonnet): O5–O7 wiring** — beginner panel, dark-surround tonality state, the
   first-filing reveal hooks (ceiling wake stub + alcove dim-in). O8 reuses the shipped ritual unchanged.

## 5. OPEN ITEMS (Sérgio)
1. The profile chip/goal final set (the proposals in O3 are register demonstrations, not copy).
2. The proto-Lamby NAME for E1 (naming ritual — candidates due in the assistant-as-guide spec, next
   Fable deliverable).
3. Logo + boot chime assets (his, whenever).
4. Whether O7's browser camera-tilt is acceptable or the reveal should stay purely light-driven.
