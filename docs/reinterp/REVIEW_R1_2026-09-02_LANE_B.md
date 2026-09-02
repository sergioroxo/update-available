STATUS: live

# REVIEW ROUND 1 — LANE B (CODE AND STATE) — 2026-09-02

*Every finding below names what was OBSERVED (a probe script's printed output, a
ledger dump, a network/storage read, a live WebGL call count, a pixel sample). Where
something could only be confirmed by reading, it is in "Could not verify" and says so.
Probe scripts live in `/private/tmp/claude-501/-Users-sergiogalvaoroxo-update-available-reinterp/dda8b2df-9727-45fa-89e7-aba237337de0/scratchpad/laneB/` (paths below).
Dev server: `http://localhost:3000`, headless Chrome via `puppeteer-core`, same launch
pattern as `tools/walk.mjs`/`tools/shots.mjs`.*

## Findings

### 1. The main desktop screen and the witness wall upload to the GPU every rendered frame, not on dirty — CLAUDE.md's own law, broken for the piece's two busiest surfaces
**What a player experiences:** nothing visibly wrong — this is a performance/battery
cost, not a visual bug. But it is exactly the class CLAUDE.md forbids ("render-texture
uploads on dirty only").
**Where:** `src/desktop/os.ts:1372` — `this.dirty = true; // caret blink etc.;
dirty-rect optimization comes later`, set **unconditionally inside `update(dt)`**,
which runs every frame the OS is not paused. `src/witness/intake.ts:71` — the same
pattern, inside `WitnessCanvas.update(dt)`. Both feed `src/engine/app.ts:3099-3101`
(`if (os.dirty) frontTex.upload(); ... if (witness.dirty) backTex.upload();`), so both
of Room 1's two-sided monitor textures re-upload every frame regardless of whether
anything changed.
**Observed:** `gl-uploads.mjs` patches `HTMLCanvasElement.prototype.getContext` before
any app code runs and counts real `texImage2D`/`texSubImage2D` calls against the
app's single WebGL context. Measured over 3-4s windows, at rest, in every era, and
during an active talking beat (L in Era 4):
```
E1 boot-text scrolling             239.8/s  (drawCalls=78)
E1 desktop IDLE (nothing pressed)  240.9/s  (drawCalls=30)
E2 settled seat IDLE               239.9/s  (drawCalls=28)
E3 settled seat IDLE               239.9/s  (drawCalls=50)
E4 settled seat IDLE               239.9/s  (drawCalls=61)
E4 L talking/animating             239.9/s  (drawCalls=61)
name-entry caret idle (no keys)    239.9/s  (drawCalls=30)
```
The rate is **identical whether the piece is idle or animating**, which is the
signature of an unconditional-dirty bug rather than legitimate activity (a caret
blink or L's captions would move the rate; nothing here does). 240/s = 2 uploads ×
~120 fps (headless Chrome's uncapped rate) — i.e. both the front (OS) and back
(witness) textures, every frame. By contrast `src/room/era3Devices.ts:987-1018`
gates the workstation/phone/visor screens on `s.versionOf() !== s.lastVersion`
before marking dirty — correctly upload-on-change — and the flat 240/s rate holding
steady across eras (E3's workstation being present adds nothing measurable) is
consistent with those screens correctly contributing ~0 while idle.
**Severity: fix-now.** This is the piece's two most-visible, most-often-onscreen
surfaces, on every device, for the whole runtime. The fix is a one-line change in
each file (only set `dirty = true` when something actually changed — text content,
caret phase, hover, filed record — not unconditionally at the end of `update`).

### 2. The intake record's index card is permanently stamped "era 1" — confirmed in code; the live hardened render was not captured this session
**What a player experiences:** exactly what Sérgio already reported in his own
walkthrough ("on Era 2 it should change styles and content… it still says era-1") —
00_WHERE_THINGS_STAND.md already lists this as a known, unfixed fault.
**Where:** `src/witness/intake.ts:266` — `ctx.fillText('index · era 1 · drawer 12',
cx + 10, cy + 44);`, a literal string. `intake.ts` imports no current-era value at
all (only `ERA1`/`ERA1_CANVAS` theme constants), so there is no code path by which
this line could ever read anything but "era 1".
**Observed:** a `fillText`-wrapping probe against the live witness canvas
(`intake-aging2.mjs`) confirmed the render pipeline is live and capturable — a fresh
`?era=N` jump correctly renders the record's *dormant* state (`"· · ·"` placeholders,
`drawDormant()`) at every era, because a cold jump carries no filed ledger. To see
the hardened index card at all requires actually filing something first (confirmed
separately — see #4 below) and then continuing forward in the *same* session. That
combined test (`intake-aging3.mjs`) filed the Era-1 profile correctly but the
follow-up real-mouse press sequence missed a 14px-tall goal-row target after a small
camera-pose drift between runs, so the hardened index line was not captured on
camera this session. **This finding is therefore code-certain (a literal string with
no era parameter anywhere in the file) and partially observed (dormant-state
rendering verified live; the specific hardened "index · era 1" frame was not
re-captured this session)** — treat the hardened-text capture as read-only evidence
carried over from Sérgio's own prior report, not a fresh screenshot from this round.
**Severity: fix-before-exhibition.** Cosmetic but directly contradicts the record's
own conceit (a live filing system) and has already confused the one person who
looked closely at it.

### 3. The real, click-only walk from 2026-08-31 got stuck entering Era 4 — my own jumped test the same day succeeded at the identical beat
**What a player experiences (potentially):** arriving at Era 4's desktop with nothing
reachable — the laptop that starts the era's whole spine sitting in front of the
camera but never registering a press.
**Where:** `docs/reinterp/WALK_2026-08-31.md` (a **real, non-jumped, click-only run**,
153 presses, reached `e4`) stops with: *"STUCK. 10 hit rects are registered and none
can be aimed at — but every one of them is BEHIND THE CAMERA… notification (phone,
behind the camera); unlock (phone…); win-min (workstation…)…"* — i.e. the played
arrival pose left every registered control (all on Room 2/3's older devices) behind
the camera, and nothing new was offered in front of it.
**Observed (this session):** `ledger-probe-e4.mjs`, starting from a **fresh
`?era=4&debug=1` jump** (not the played path), found and pressed the laptop plane
directly (`era3-device-laptop`, found via the scene graph, no hit rect required) and
it worked cleanly — three presses filed `e4Space: laptop/read` once, then a fourth
press against the headset (`era4-visor` plane / `os:e4-touch` once it appears) filed
`headset/worn` once, in the documented order.
**This is a real discrepancy, not yet reconciled.** Two explanations are both
plausible and neither was ruled out this session: (a) the review-jump seat for
`?era=4` is not the same pose the *played* E3→E4 relocation lands the camera in
(this project's own "measure from the seat" trap — a jump seats you somewhere
idealised, the ritual's own relocation may not), or (b) `tools/walk.mjs`'s own
plane-fallback sweep (it does have logic to press a bare `era3-device-laptop`/
`era4-visor` plane at its centre — see `walk.mjs`'s `surfaced`/plane-press block)
failed to find it for a reason not diagnosed here.
**Severity: fix-now, pending a real (non-jumped) re-walk of just the E3→E4 leg** to
settle which explanation is true — if (a), this is the single most serious finding
in this report, since it would mean a player arriving normally cannot start Era 4 at
all.

### 4. Ledger filing — every beat tested this session files correctly, once, symmetrically, with the right witness line
Tested by real mouse press (`mouse.move → down → 70ms → up`, S80's own press law),
dumping the ledger before/after each press, via `ledger-probe.mjs` and
`ledger-probe-e3.mjs`:
- **Era 1 profile** (`picon:star` → `pchip:music/diary/friend` → `pgoal:fit_in`):
  files `records: ["profile-initialized"]` exactly once, only once icon + chips +
  goal are all chosen — none of the intermediate chip presses file anything
  prematurely.
- **Lamby debut, BEGUN vs DISMISSED** (`lamby-hello` / `lamby-intro-dismiss`): both
  file, symmetrically, with distinct witness lines —
  `"assistant: introduced — companion process accepted"` and
  `"assistant: dismissed — introduction"`. Confirms CLAUDE.md's dismissal law by
  observation, not just by reading the doc comment.
- **E3 correction list, APPLY vs SKIP**: `apply` → `{cardId:1, outcome:"applied",
  witness:"list: applied — renata (soften the term)"}`; a fresh run's `skip` →
  `{outcome:"skipped", witness:"list: skipped — renata (soften the term)"}` — same
  card, opposite outcome, matching witness text, one entry each.
- **E3 comments, Remove vs Leave up**: `cm-remove-c_brigid` →
  `{commentId:"c_brigid", templateId:"removed", witness:"comments: removed — former
  schoolmate, personal contact"}`; `cm-leave-c_nothing` → `{templateId:"left",
  witness:"comments: left up — disputes editorial policy"}`. Both file once, no
  double-filing.
- **E4 shell, laptop → headset ordering**: `e4Space` stayed `[]` for the first two
  presses on the laptop plane, filed `{"id":"laptop","outcome":"read","witness":"desk:
  the update introduced itself — L, on the laptop"}` on the **third** press (matching
  "three presses, one line each"), and only then did a headset control become
  reachable; pressing it filed `{"id":"headset","outcome":"worn","witness":"device:
  worn — one touch"}`. laptop:read precedes headset:worn in the observed order, as
  documented.
**Clean across all five tested beats** — no double-filing, no missing filing, no
witness-text mismatch found.

### 5. Malta's "files nothing" doctrine — confirmed for the portion reached; the full press-through was not completed this session
**Where:** `src/room/graceQueueLite.ts`'s header doctrine + `ledger.graceQueue`'s
comment in `src/state/ledger.ts` ("NOT filed here, deliberately… the apparatus did
not ask for it").
**Observed:** `ledger-probe-e3.mjs`'s Malta scenario moved the camera to `r2-phone`,
ran `debugBeat('maltaArrive')`, and confirmed the ledger count was unchanged
immediately after arrival (15 → 15). The follow-up presses (`notification`, `open`,
`reply`) could not be projected to a screen point this session (the phone-hand-hold
plane projection failed intermittently — the same class of camera/seat fragility as
finding #3) so the reply-field press specifically was not exercised. **Partially
observed**: confirms the arrival files nothing; does not confirm the reply field
also files nothing (which the code comment says it should).

### 6. `kit.ts`'s NEXT hit rect matches its drawn button, pixel-for-pixel at the edges
**Observed:** `pixel-check-kit.mjs` read `os.kit.hits` for the `next` control
(`{x:355,y:316,w:60,h:20}`), sampled the live OS canvas (`os.canvas`, via
`getImageData`) at the rect's centre and at each edge, and just outside each edge.
Inside: `rgb(212,208,200)` (the button's fill) on both left and right inside edges.
Just outside (left, right, and below the rect): `rgb(245,244,237)` (the panel
background) — a clean, consistent boundary with no overhang in either direction.
This is the specific check the 2026-08-28 kit/update fix (40px drift) was meant to
guarantee, spot-verified clean today for this one control.

## Clean

- **Hard invariants, by observation.** `invariants-observed.mjs`: a full jumped
  pass (16 review jumps, E1 → Close, plus an attempt to open Restorify directly) —
  only 4 network requests fired *after* the initial asset load: 3 `media` (on-demand
  audio, expected) and 1 `favicon.ico` (the browser's own auto-probe, not app code,
  to `localhost:3000`). Zero requests to any non-localhost host, zero
  fetch/XHR/WebSocket/beacon calls. `document.cookie` empty, `localStorage` empty,
  `sessionStorage` empty, `indexedDB.databases()` empty, at the end of the pass.
  `navigator.mediaDevices.getUserMedia` was wrapped and counted **0 calls**, even
  after calling `os.openRestorify()` directly. `document.querySelectorAll('input
  [type=file]')` found **0** elements. The typed name lives only in
  `window.__ledger().name` (`"Daniel"`, the untyped default this session);
  `localStorage` stayed empty throughout.
- **Static checks**, run fresh this session: `node tools/check-invariants.mjs` →
  `invariants OK: no network, no storage tokens in src/`. `node tools/check-rooms.mjs`
  → `rooms OK: 4 states fold cleanly over era1.json (189 props live at E4)`. `node
  tools/check-spec.mjs` → all clear (dossier statuses, palette 33/33, C6 debug-panel
  coverage of all 71 `debugJump` ids, 0 unreferenced `data/**.json` files).
- **The game menu (Esc/pause) is real DOM, not canvas — correctly outside the
  ledger.** `gamemenu-check.mjs`: pressed `Escape`, found the six real `<button>`
  elements (`Resume, Restart, Controls, Credits & attributions, Leave×2`), and
  confirmed `window.__ledger()` was byte-identical before and after opening it — the
  "frame never plays" law holds by observation, not just by the file's own doc
  comment.
- **Draw calls at rest**, read from `window.__drawCalls` during the same idle
  windows as finding #1: E1 desktop 30 (entrance ramp peaks at 78), E2 settled 28,
  E3 settled 50, E4 settled 61 — all comfortably under the 75 budget, consistent with
  `tools/shots.mjs`'s own ratchet baselines.
- **Hit-rect ownership, enumerated structurally** across every file in
  `src/desktop/apps/`: `kit`, `packet`, `provotype`, `lambyRigFile`, `netvision`,
  `offers`, `restorify`, `update`, `caleb`, `accountability`, `lVoice` each own a
  private `hits` array; `irc` owns `replyRects` (a distinct name, historically a
  walker blind spot, not a code defect); `comments`, `floppysheep`, `phoneE3` each
  own a private `rects` array. The six Era-3 "other jobs"
  (`clearComments`/`familyCalls`/`podcastOrder`/`storyCut`/`courseBuilder`/
  `comments`, mounted via `graceQueueLite`) implement `TaskSurface`, whose `draw(ctx,
  area, hit)` contract takes a **callback** the job calls while drawing rather than
  owning a field of its own — a deliberate design (`taskSurface.ts`'s own header)
  that structurally prevents the "two copies drift" bug class kit/update had before
  2026-08-28, by never letting a second copy of the geometry exist. `diary` and
  Era 2's `silence` screen own no rects by design (whole-screen-is-the-button,
  documented and expected). `ball` has no desktop surface at all (ambient
  light/sound in the room, per its own header). This matches `WALK_2026-08-31.md`'s
  own structural finding: only `diary` is currently silent-by-design; kit and update
  are no longer in the "owns no rects" list.

## Could not verify (read only, not observed)

- **The full Malta reply-field press** (finding #5) — doctrine read from
  `graceQueueLite.ts`'s header and `ledger.ts`'s comment; only the arrival portion
  was exercised live.
- **The hardened intake index card's live text** past Era 1 (finding #2) — the
  literal-string claim is code-certain; the specific "index · era 2/3/4" (or lack
  thereof) frame was not captured live this session, only the dormant state was.
- **E4's non-jumped reachability** (finding #3) — resolving whether the played
  E3→E4 relocation seat can reach the laptop requires a real, non-jumped walk of
  just that leg, which was not run this session (a full `tools/walk.mjs` run takes
  ~25 minutes per its own header; not attempted here).
- **Per-surface upload rate isolation** — the GL-call counter (finding #1) counts
  calls against the app's single shared WebGL context; it cannot attribute an
  individual `texSubImage2D` call to a specific `pc.Texture`. The conclusion that
  it is specifically the OS+witness pair follows from (a) the code read
  (`os.ts:1372`, `intake.ts:71` are the only unconditional-dirty sites found) and
  (b) the rate being flat regardless of which devices/screens are present — not
  from a direct per-texture measurement.
- **Every other ledger-writing beat** listed in the task brief (kit pages, the IRC
  replies, the packet, the diary, Restorify check-in, Caleb chips, L's remaining
  chips beyond the ones reached, the offers, the ball's unvoiced law) — not pressed
  this session; time did not allow a full sweep of all ~15 ledger-writing arrays.
  The five tested (#4) all came back clean, which is evidence for the ledger's
  general discipline but not proof for the untested beats.

## Probe scripts

All in `/private/tmp/claude-501/-Users-sergiogalvaoroxo-update-available-reinterp/dda8b2df-9727-45fa-89e7-aba237337de0/scratchpad/laneB/`:
- `gl-uploads.mjs` — GPU upload-rate instrumentation (finding #1); per-canvas variant
  `gl-uploads-percanvas.mjs` confirms only one shared WebGL context exists.
- `intake-aging2.mjs`, `intake-aging3.mjs` — witness-canvas `fillText` capture via
  the live `witness-screen` entity's emissiveMap source canvas (finding #2); PNGs
  saved alongside as `witness_e{1..4}.png` / `witness_final.png`.
- `ledger-probe.mjs`, `ledger-probe-e3.mjs`, `ledger-probe-e4.mjs` — real-press
  ledger-diff probes (findings #4, #5); reuse `tools/walk.mjs`'s own hit-rect →
  world → screen projection. Run logs saved as `run1.log`…`run4.log`.
- `pixel-check-kit.mjs` — canvas pixel-edge sampling against a live hit rect
  (finding #6).
- `invariants-observed.mjs` — full jumped-pass network/storage/getUserMedia/file-input
  capture (Clean, hard invariants).
- `gamemenu-check.mjs` — Esc-menu DOM + ledger-invariance check (Clean).
- `debug_probe.mjs`, `debug_probe2.mjs`, `debug_probe3.mjs` — scratch scripts used to
  diagnose the profile-chip projection/timing issue; kept for reference, not a
  deliverable.
