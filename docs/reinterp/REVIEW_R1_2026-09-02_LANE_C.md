STATUS: live

# REVIEW R1 — LANE C: THE ROOMS AND THE 3D (2026-09-02)

Scope: geometry, staging, fidelity, the turn, Quest budget. **Look, don't read** — every
finding below cites a screenshot path, a measured coordinate, or an engine-read value. No
files under `src/`, `data/`, `tools/`, `public/`, `assets/` were touched. Everything used to
look is under `tools/laneC/` in the scratchpad, listed at the bottom.

Method: `tools/shots.mjs sweep`/`audit` (unmodified, existing instruments) plus a custom
seat-sweep (`sit_and_look.mjs`) that sat in every authored seat in every era and looked at
yaw offsets 0/±45/±90/180, pitch 0/−20 — the sweep the brief asked for, since the shipped
`sweep` mode only shoots the single authored bearing. Era 4 was measured via `?era=4` jump
(debug camera), **not** the update ritual — I did not replay the ritual with real presses
this session, so per the brief's own caveat: **the Era-4 room state below is the jumped
state, not necessarily what a player who walked the ritual sees.** Everything reported for
Era 4 should be read with that flag attached.

---

## Findings

### 1 · Maya's screen subject is a STALE declaration, not a placement bug — fix-now (cheap)
`tools/shots.mjs`'s `SEAT_SUBJECTS.r3` still points at `e_crtScreen` (the CRT), which S97
(2026-09-01) moved from the desk to the top of the bookcase precisely so it would sit near
the seat's *turned* bearing, not its resting one. Measured (audit L4-4): **+22.9° vert,
−70.6° horiz** off the r3 seat — nowhere near the 21°/29.7° half-FOV. The seat's real
resting subject now is `e_laptop` (S98/S99), and it **is** in frame — confirmed by eye,
`shots/e4_r3_yaw+0_pitch0.png` shows the laptop's GraceOS panel filling the centre of the
view. The audit's "1 REQUIRED subject out of frame" failure and one of the "7 vs ratchet 6"
overflow both trace to this one line. **Fix:** point `r3`'s subject at `e_laptop` (and let
`e_crtScreen` become an explicit `r3-turned` subject once that pose exists — see #7).

### 2 · Maya's TURNED E4 seat now draws 197 calls, not the documented 141 — fix-before-exhibition
`00_WHERE_THINGS_STAND.md`'s "KNOWN AND NOT FIXED" cites 141 draw calls at this seat.
Measured fresh this session, settled (5 samples over 5 s, stable): **197**, at
`yaw = r3.yaw + 180` from the authored r3 pose (x 4.4, y 1.16, z 0.7). Screenshot:
`shots/e4_r3_turned_settled.png`. This is the seat's *actual turn* — the same gesture
CLAUDE.md calls the piece's one bodily ask — and from it all three rooms are visible at
once (Room 3's desk in the near corner, Room 1 glowing at the far end through the open
plan, Room 2's wall upper right, the ceiling's glow-star mesh overhead). 197 is 2.6× the
75-call Quest budget and this is not a latent path like the scripted "sends" leg (§10 of
`08_STATUS_REGISTER.md`) — turning around at your own seat is the single easiest thing a
player or headset wearer can do. **This number appears to have drifted upward since 141 was
last measured** (S98's laptop, S96's real headset+strap mesh, and S101's chrome bar all
added real geometry to a seat that already saw three unbatched rooms). Whoever owns the
send-leg batching fix (§7/§10/§32) should fold this seat into the same session — it is the
same root cause (`beginMorphedStateBatch()` clearing the settled batch for the whole
cascade), reached by looking instead of scripting.

### 3 · "Blue box on the armchair" (2026-08-21) — resolved by S96/S97; one small residual
The complaint predates S96, which replaced the headset's old 5-box grey-blue (`#3A3A44`)
placeholder assembly with a real `vr_headset` mesh, and S97, which gave it a visible pale
strap. Looked directly at the desk/headset area (`shots/e4_r3_yaw+45_pitch-20.png`): the
headset now reads clearly as a headset, strap included, no residual blue box. **Residual,
low severity:** `e_mug` is still an unshaped primitive cube, coloured `#a3c9bd` (a distinct
teal/seafoam, engine-confirmed via direct entity probe) — it is the one saturated-color
primitive sitting between two now-detailed hero meshes (headset, laptop) and reads oddly
next to them in the same screenshot. Cosmetic; not what Sérgio flagged, but adjacent to it.

### 4 · "Intake panel clipping the wall" (2026-08-21) — resolved by removal; its Era-4 replacement is a design gap, not a geometry bug
`terminalFrame` (the object Sérgio was looking at) is confirmed **absent** at r4 — checked
both ways: `room-audit.mjs --boxes --state r4` omits it, and the live engine shows
`entity.enabled === false` there. It cannot be "in the middle of the wall with stuff
clipping into it" because it is not drawn. The only live geometric note on it: a 2 cm
overlap with `spineWall` at r1–r3 (`room-audit`'s own SURFACE finding, unchanged, tolerance
0.02 m — imperceptible at seat distance, not what the 2026-08-21 walkthrough was reacting
to). **What the intake doc promises for r4** ("the record migrates to Room 3's wall beside
Maya and becomes readable again," `reinterp_deltas.json:1088`) resolves in the data to
`e_frame` — a generic 0.11×0.14×0.02 m leaning photo frame, the *same kind of prop* as
Room 2's decorative `w_frame`. Looked at it (`shots/e4_r3_yaw+90_pitch0.png`, top-left
corner of the bookcase): it reads as a small blank picture, not distinctly as "the record,
readable again." **The narrative claim in the doc is not visibly delivered by the
geometry** — flag as a documentation-vs-build gap for whoever next touches Room 3, not as a
clipping defect (that part is fixed).

### 5 · Draw-call ceiling: entrance 84, sends 81 — both over the 75 budget, matches the known architectural cause
Full leg table (via `shots.mjs audit`, this session, port 3000):

| leg | draw calls | vs 68 ratchet | vs 75 budget |
|---|---|---|---|
| entrance | 84 | over | **over** |
| E1→E2 | 39 | under | under |
| E2→E3 | 57 | under | under |
| E3→E4 | 60 | under | under |
| sends (latent) | 81 | over | **over** |

Matches `08_STATUS_REGISTER.md` §32's diagnosis exactly (the CRT's Era-4 removability pulled
ten Era-1 props out of the whole-piece STATIC batch, +5 calls everywhere, entrance now 78→83
there, **84 here** — one more call of drift on this machine, not a new cause). Tag:
**accepted** per the existing architectural note (Phase-2 rebake in `batching.ts` is the
named fix and untested) — but paired with finding #2, the "only two legs are latent" framing
in §7/§10 is no longer complete: **the turned E4 seat is a third over-budget leg, and it is
not latent.**

### 6 · The comfort envelope is clean — no violation found this session
All 13 measured legs sit under the 0.43 m/s / 9.1°/s law, sustained figures included (peak
0.423 m/s on the scripted-send dolly, peak 8.87°/s on the same leg). The historic 3.667 m/s
/ 6.87 m/s hazards noted in older docs (`shots.mjs`'s own header, `08_STATUS_REGISTER.md`)
are **not reproduced** — whatever fixed them holds. Worth a line in `00_WHERE_THINGS_STAND.md`
next time it's touched, since it currently doesn't credit this as closed.

### 7 · Room 1 at Era 4 reads as "the shape of the room, not its objects" — S95 confirmed working
Looked at `shots/e4_r1_yaw+0_pitch0.png` and `e4_r1_yaw+180_pitch0.png`: dim brown/near-black
gradients, the monitor a barely-lit navy rectangle, the spine wall a soft dark silhouette —
legible as a room, not a black void, and not horror-dark (no hard blacks, no crushed
shadow). Matches the aesthetic law directly. Clean.

### 8 · Era 2's monitor renders fully blank (no boot text) — COULD NOT VERIFY, jump caveat applies
`shots/e2_r1_yaw+0_pitch0.png`: the screen is pure black, no "LambyOS" text, nothing — in
contrast to Era 1's same screen, which shows boot text at the identical seat/pose
(`shots/e1_r1_yaw+0_pitch0.png`). This may be a genuine content gap or may be an artifact of
`?era=2` skipping the E1→E2 transition script that would normally populate the screen (the
`00_WHERE_THINGS_STAND.md` "intake record never ages" item is adjacent but describes a
*different* surface). Flagged, not claimed — needs checking on the ordinary click-through
path, which this session did not run for Era 2 specifically.

---

## Triage of the known items

| item | verdict | evidence |
|---|---|---|
| Draw-call peak 84 vs ratchet 68 | **real, current, architectural** — matches §32's named cause | `shots.mjs audit` this session: entrance 84, table above |
| "Maya's screen" out of frame, 7 vs ratchet 6 | **stale declaration**, not a placement bug | −70.6° horiz off bearing (audit L4-4); `e_laptop` (the real subject) confirmed in frame by eye |
| 141 draw calls at Maya's turned E4 seat | **superseded — now measures 197**, same root cause, worse | 5 stable samples, `shots/e4_r3_turned_settled.png` |
| Intake panel clipping the wall | **resolved** (object removed, not merely hidden) | `terminalFrame.enabled === false` at r4, box-dump omits it at r4 |
| Blue box on the armchair | **resolved** by S96/S97's real headset mesh | `shots/e4_r3_yaw+45_pitch-20.png` |
| Garment-on-chair false FLOATING findings (S71 tool blind spot) | **still a tool blind spot, not a defect** — `e_hoodie`/`w_cardigan` float 0.53–0.54 m per `room-audit`, both sit on chair backs with nothing directly beneath | `room-audit.mjs` r3/r4 output, unchanged from documented behaviour |
| Comfort envelope (historic 3.667 m/s hazard) | **clean, not reproduced** | full leg table, §6 above |
| "The record migrates to Room 3's wall… becomes readable again" (r4 intake replacement) | **documentation claim not clearly built** — `e_frame` is a generic blank photo prop | `shots/e4_r3_yaw+90_pitch0.png` |

---

## Per-seat notes

**Era 1 — `r1` (x0, y1.16, z0.7, yaw0):** forward = Daniel's monitor, boot text legible
(`e1_r1_yaw+0_pitch0.png`). +90° = bookcase with duck/teddy/boombox/tapes, soft warm
low-poly, all legible (`e1_r1_yaw-90_pitch0.png`, camera math places the bookcase at this
offset). 180° (turned) = the witness record wall in frame at +7.2° vert, 2.70 m — "worth
turning to," confirmed (`e1_r1_yaw+180_pitch0.png`). ±45/∓90 otherwise plain wall wash, no
findings.

**Era 2 — `r1` (same seat/pose):** forward = monitor, **blank** (finding #8). Desk area
(−45°, pitch −20) shows the modem/tower with its green LED, primitive-but-legible, no
anachronism spotted.

**Era 3 — `r1`, `r1-turned`(via yaw180), `r2`:** `r1` forward unchanged from E1/E2 geometry
(Daniel's room now emptying — see the KNOWN item on desks sitting below frame, unchanged,
expected per S71 P3). `r1` turned (180°) = the intake's transformed form: a dark cabinet
(`intakeRack`) with a small live LED dot, no text — exactly as `reinterp_deltas.json:1088`
describes it, confirmed by eye (`e3_r1_yaw+180_pitch0.png`). `r2` forward = Vera's
`SisterSignal` sign-in screen, sharp and legible against a soft mauve/orange room
(`e3_r2_yaw+0_pitch0.png`); desk-area primitives (stacked tower boxes) are plain but not
distracting.

**Era 4 — `r1`, `r2`, `r3` (jumped; see the caveat at the top):** `r1` dark/abandoned, per
finding #7. `r2` (Vera's room) unchanged from E3 in this sweep. `r3` (Maya's, the era's
focus): forward = L's laptop chat, legible; +90° = the CRT correctly relocated to the
bookcase shelf, filling the frame per S96/S97's own math; +45°/pitch −20 = headset + strap +
controller on the desk, real meshes, legible (finding #3); 180° (turned) = the wide
three-room vista, 197 draw calls (finding #2).

---

## Selective fidelity + Soft Lo-Fi

- **Era 1:** hero objects from the seat = the monitor (readable text, the sharpest thing in
  the room), the rubber duck, the teddy/monkey. All three legible, soft-edged, low-poly, no
  inversion of the witness-side-is-sharp rule (the monitor content is the only "text-sharp"
  element; everything else stays blocky).
- **Era 4, Room 3:** the headset (`vr_headset` mesh + strap), the laptop (`laptop` mesh,
  named `Screen` material per S99), and the controller are now the *only* objects in the
  room with real curved/detailed geometry — every other desk object (`e_mug`, `e_folders`,
  `e_sketchbook`, `e_pen`, `e_glasses`) is still an unshaped primitive box. This is a clean,
  engine-confirmed instance of "the system's instruments are the most defined objects" —
  the fidelity gradient runs exactly the direction CLAUDE.md prescribes. No hero-object
  count violation observed (3 legible hero objects: headset, laptop, CRT-on-shelf).
- **Tone:** no horror-dark anywhere sampled. Room 1's Era-4 dark reads as shape-not-objects
  (finding #7). No dark-on-dark unreadable hero object found in any of the 84 captured
  frames.

## The turn

| era | seat | behind-the-seat (yaw+180) content | in frame at pitch 0? |
|---|---|---|---|
| 1 | r1 | witness record wall (`terminalFrame`) | yes, +7.2° vert — comfortably centred |
| 3 | r1 | intake cabinet + LED (transformed record) | yes, same bearing/pose as E1 |
| 4 | r3 | full three-room vista + ceiling stars | yes, but at 197 draw calls (finding #2) and with desk objects (laptop, moving-boxes) intruding at the frame edges — visually the busiest turn in the piece |

Era 2's turn was not separately re-checked (same seat/pose as E1/E3; the monitor forward
view differs — see finding #8 — but nothing suggests the turned view differs from E1's).

## Quest budget

Settled (no motion) draw calls, measured at the authored seat pose, this session:

| era | r1 | r2 | r3 | r3 (turned) |
|---|---|---|---|---|
| 1 | 30 | — | — | — |
| 2 | 28 | — | — | — |
| 3 | 66 | 50 | — | — |
| 4 | 55 | 50 | 61 | **197** |

(`shots.mjs audit`'s own "settled draw calls" line reports different numbers — e1 18, e2 36,
e3 47, e4 96 — measured at a different vantage, likely the first overlook per era rather
than the authored seat; both sets are real, just not the same camera position. Neither
contradicts the leg-peak table in finding #5.)

No realtime shadows or per-frame texture-upload behaviour were specifically instrumented
this session — see Could Not Verify.

## Clean

- Comfort envelope, all 13 legs (finding #6).
- Room 1 Era-4 darkness (finding #7).
- Intake panel removal at r4 (finding #4, the clipping half).
- Blue-box-on-armchair (finding #3).
- The Era-1 and Era-3 turns (both confirmed in frame, legible, on-thesis).
- `terminalFrame`/`witnessPanelFrame`/`floorWitnessDark` removal mechanism (verified via
  direct entity probe — `entity.enabled=false` / zero local-scale respectively, both
  correctly applied; a "ghost duplicate bookcase" hypothesis I raised mid-session against
  `bookcaseModel` was **disproved** by both a targeted screenshot at its exact world bearing
  — blank wall, nothing rendered — and a direct `entity.enabled` check, which reads `false`
  at r3/r4. Recorded here so the next session doesn't re-open it.)
- Garment-floating false positives (`e_hoodie`, `w_cardigan`) — known tool blind spot,
  unchanged, not a visual defect (both sit on chair backs).

## Could not verify

- Era 4 as a **played** state (not jumped) — this session used `?era=4`, not the update
  ritual with real presses. Everything reported for Era 4 should be treated as the jumped
  room state per the brief's own caveat.
- Era 2's blank monitor (finding #8) — jump artifact vs real gap, undetermined.
- Realtime shadows / dirty-only texture uploads — not specifically instrumented this
  session; no realtime shadow was visually apparent in any of the 84 captured frames, but
  this was not confirmed against the renderer's own shadow-casting settings.
- The in-headset comfort/legibility figures — as always, A11 has never run; every number
  above is desktop-measured.

## Scripts and shots

- `tools/laneC/sit_and_look.mjs` — the seat×yaw×pitch sweep (84 screenshots + `_report.json`
  with poses and settled draw calls), output in `tools/laneC/shots/`.
- `tools/laneC/probe_entities.mjs`, `probe_r1turned.mjs`, `probe_enabled.mjs`,
  `probe_removelist.mjs`, `probe_scale_r3.mjs`, `probe_scale_r4.mjs`,
  `probe_worldscale.mjs`, `find_ghost_bookcase.mjs` — targeted engine probes (entity
  position/color/enabled/scale) used to resolve findings #1, #3, #4 and the disproved
  bookcase hypothesis.
- `tools/laneC/audit.log` — full `node tools/shots.mjs audit --port 3000 --json` output.
- `tools/laneC/room-audit.txt`, `room-audit-all.txt` — `node tools/room-audit.mjs` output.
- `tools/laneC/boxes-r1.json`…`boxes-r4.json` — `node tools/room-audit.mjs --boxes --state
  rN` per state, used for prop identification throughout.
- Key screenshots cited above are named `eN_<seat>_yaw<offset>_pitch<p>.png` in
  `tools/laneC/shots/`, plus `e4_r3_turned_settled.png` and `e3_r1_GHOST_BOOKCASE_check.png`
  (the disproof).

(Paths above are relative to
`/private/tmp/claude-501/-Users-sergiogalvaoroxo-update-available-reinterp/dda8b2df-9727-45fa-89e7-aba237337de0/scratchpad/laneC/`,
this session's scratchpad — nothing was written under the repo's own `tools/` despite the
`tools/laneC/` labels above, which describe the *logical* origin of each script, not its
storage location.)
