# YOUR UPDATE HAS FAILED (PC Simulator) — standing orders for AI assistants

Part of **SurvivingSOGICE** (University of Bergen, Center for Digital
Narrative). A browser + WebXR (Quest 3) narrative experience about how
conversion-practice (SOGICE) networks target queer people online. Design
docs: `docs/` (read PRODUCTION_SCRIPT_v0.3 + SCRIPT_UPDATE_v0.4–v0.6 before
narrative work; ETHICS_CONSTRAINTS.md before ANY content work).

## Stack & architecture (decided — do not re-litigate)
- PlayCanvas **as npm package** + Vite + TypeScript. No cloud editor. Static
  build, deployable to GitHub Pages (`base: './'`).
- **One scene, two cameras:** browser = framed camera in the same 3D room
  (drag-to-look); Quest 3 = the head. The flip = camera/body turns ~180°.
  `?flat=1` must always render the desktop canvas alone (universal fallback).
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
- Quest 3 budget: ≤75k tris, ≤60 draw calls, 72 Hz floor, no realtime
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
- Sérgio (project lead, non-coder) directs and edits; he owns all
  survivor-adjacent text, dossier wording, and ethics judgment calls.
