# STATUS REGISTER — every population, by status (R29, 2026-07-23)
STATUS: live

*Fable. The one page Sérgio asked for ("this has been so hard to track that even you got
confused — this needs a better system"). Four populations, FOUR SEPARATE AXES — a doc's
lifecycle status and a source's evidentiary status are different things; conflating them is
how "status" becomes noise. §5 is the mechanism that keeps this page true (headers + checker),
because a hand-maintained register is just one more thing that drifts.*

**Vocabularies (do not mix):**
- Docs: `live` · `superseded-by <doc>` · `history-only` (+ `UNREVIEWED` where honesty beats a guess)
- Code: `live` · `live-but-deprecated` · `dead`
- Data: `live` · `PLACEHOLDER awaiting Sérgio` · `fixture`
- Sources: `documentary | contested | speculative` (dossier enum, CI-enforced) × verified-or-not (Sérgio's check — ALL currently unverified)

---

## §1 DOCS (83 .md — 60 top-level + 23 in `docs/reinterp/`)

### Live — the current-truth set (read these; when they disagree, MASTER_PLAN_v2 wins)
| Doc | Note |
|---|---|
| `CLAUDE.md` (repo root) + `docs/ETHICS_CONSTRAINTS.md` | the laws + binding gates |
| `REINTERP_MASTER_PLAN_v2_2026-07-12.md` | PLAN OF RECORD; §9 queue now superseded by §3 below — fold at next consolidation |
| `REINTERP_RESTRUCTURE_R28_2026-07-10.md` | R28 record; **§4 layer 3 still unbuilt** (see §3); §4's "Lamby teaches" wording is amended by CLAUDE.md amendment 2 (E1 teacher = impersonal side-messages) |
| `REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_2026-07-10.md` | partially executed; Caleb sections gated |
| `REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md` | S2R.0–S2R.4 built; **S2R.5–S2R.7 unbuilt** |
| `REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md` · `REINTERP_E3_SENDS_SCRIPTS_2026-07-13.md` · `REINTERP_E3_GRACEQUEUE_CARDS_DRAFT_2026-07-13.md` | E3 spine; sends scripted not built; cards await Sérgio |
| `REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md` · `REINTERP_E4_ECHO_SCRIPT_DRAFT_2026-07-13.md` | E4 direction; Echo draft awaits D37 verify |
| `REINTERP_E1_TAPE_VO_SCRIPTS_2026-07-13.md` · `REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md` | Sérgio's recording queue |
| `REINTERP_ERA_MINING_R28_2026-07-10.md` | still being drawn from (finds #7, #10 unspent) |
| `REINTERP_3D_STYLE_DIRECTION_2026-07-04.md` | art direction; V2 prop pass pending |
| `REINTERP_TRANSITION_CHOREOGRAPHY_2026-07-04.md` | update-ritual staging, still consulted |
| `REINTERP_PROVOTYPES_v1_2026-07-02.md` | the provotype grammar (2 built against it) |
| `REINTERP_TRANS_REALITY_ERA_VISION_2026-07-03.md` | feeds E3 borderland + E4 content |
| `REINTERP_TRANSMAN_ALCOVE_DESIGN_2026-07-02.md` | live but **G1-BLOCKED** — blocked ≠ superseded |
| `REINTERP_SPATIAL_VERSIONS.md` · `ASSET_PIPELINE.md` · `ASSET_STRATEGY.md` · `BACKUP_AND_RESTORE.md` · `WEBXR_PERFORMANCE_NOTES.md` | working tooling/ops/perf references |
| `MOODBOARD_ERA1_ROOM.md` · `MOODBOARD_ERA2_ROOM.md` | taste references for the V2+ prop passes |
| `REINTERP_LOGO_SPEC_2026-07-03.md` | v1 section history-only (rejected); lamp direction (v2) is the live thread |
| reinterp/: `00_START_HERE` `01_SESSION_LOG` `02_SONNET_SESSION_TEMPLATE` `03_COORDINATION` `04_FABLE_ROUND_PROMPT` `05_HOW_TO_RUN_A_SESSION` `06_SERGIO_CHECKLIST` `07_WAITING_ON_SERGIO` `08_STATUS_REGISTER` (this) | the coordination layer — 03/04 refreshed this round after drifting since R17 |
| reinterp/: `COPY_INVENTORY_E1..E4/_CROSS.md` + `INVENTORY_SUMMARY.md` · `ATTRIBUTIONS.md` | voice-pass queue · credits source (feeds `gen_attributions`) |

### Live, shipped-lineage (canon for the untouchable shipped build; REFERENCE here, per v2 §10)
`PRODUCTION_SCRIPT_v0.3.md` · `SCRIPT_UPDATE_v0.4–v0.8` · `ERA1_LOGIC_v1.md` · `ERA1_ENDING_SCRIPT_v2.md`
(CLAUDE.md still cites SCRIPT_UPDATE_v0.5 §1 for the update ritual — that citation is live.)

### Superseded (keep; consult for "why", never for "what's current")
| Doc | Superseded by |
|---|---|
| `REINTERP_MASTER_PLAN_v1_2026-07-02.md` | MASTER_PLAN_v2 |
| `REINTERP_NARRATIVE_MASTER_SCRIPT_2026-07-04.md` | MASTER_PLAN_v2 §5 (pre-R28 beat map) |
| `REINTERP_OPENING_AND_FLOW_SPEC_2026-07-03.md` | R28 §4 + Session 36 (chip/goal sets §5.1 still salvage material) |
| `REINTERP_FLUID_TRANS_ROOM_GEOMETRY_2026-07-03.md` | v2 §3 (R24 three-rooms) for geometry; niche facet design lives on in `fluid_niche.json` |
| `REINTERPRETATION_FOUR_ROOMS_ANALYSIS_2026-07-01.md` | v2 §3 (R24) |
| `PRODUCTION_SCRIPT_v0.2.md` → v0.3 · `ERA1_ENDING_SCRIPT_v1.md` → v2 · `BUILDING_GUIDE.md` → CLAUDE.md stack section | version chains |

### History-only (records of executed work or absorbed analysis; nothing consults them for direction)
- Master-plan archives (R1–11, R12–13) — explicitly archived.
- All 9 `CHATGPT_DEEPRESEARCH_*.md` — executed research inputs (CONSULT_ENGAGEMENT already carries a ⛔ RETIRED header — the model for §5). **Exception flagged:** `…TRANSMAN_CONSULT_SOURCING_2026-07-03.md` may still be worth running before the trans-masc reader consult — Sérgio's call, listed in 07.
- `CODEX_PROMPT_REINTERP_R0_R2` · reinterp/ `CODEX_BRIEF_S17/R26/R26_VERIFIED/R27/R28-2a/O1_REVAMP` — executed briefs.
- `CREATIVE_ANALYSIS_v1` · `PROJECT_SCRIPT_AND_APPLICATION_REVIEW` · `ChatGPT analysis.md` · `ANALYSIS_PROMPT_era_framing` · `REINTERP_MECHANICS_AND_ENDING_NOTES` (absorbed into v2/provotypes) · `REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS` (diagnosis absorbed) · `REINTERP_WITNESS_TERMINAL_DRAMATURGY` (lineage absorbed into v2 §3; iris retired) · reinterp/`ASSET_RESISTANCE_DASHBOARD` (point-in-time report) · reinterp/`FABLE_BRIEF_TRACKING_R29` (this round's input — history once this register lands).

---

## §2 CODE SURFACES

| Surface | Status | Evidence / note |
|---|---|---|
| The `main.ts` graph: engine/app, flat, desktop OS + apps, narrative (spine/guide/tapes/belongings), rooms, witness/intake, ledger, audio, gameMenu, orientingCard, debug panel | **live** | imported + reachable |
| Opening front door — the interim LOG-IN panel (`orientingCard.ts`) + the room WAKE (`app.ts`) | **live** | S44 (2026-07-24), per `REINTERP_OPENING_DECISION_2026-07-24.md`: the panel carries project + a VR-and-desktop controls display + log-in; entry auto-wakes the room (light ramp → unconditional auto-boot). S40's optional power-press and its LOOK/INTERACT pre-boot window are **dead and deleted** (data entries removed from `s1_guide.json` too); the startup-options panel S40 retired stays retired |
| ~~`opening.ts` `mountStartupOverlay`~~ · ~~`openingBoardDressing.ts`~~ · cork profile-pinning in `intake.ts` | **dead — DELETED S44** | Sérgio retired the cork board outright (decision doc §1). Both files are gone from the tree (git history keeps them); `intake.ts`'s `drawCorkBoard`/`drawPinnedNote`/`optionLabel` are removed, and the wall now goes dormant → hardening → cold record. Nine `KILLS:` lines in the decision doc hold the ground (C5). `data/strings/opening.json` stays (intake.ts still reads `o3_board_hardening`); its five pinned-note caption keys went with the board |
| `theme/era3.ts` `NOA` / `drawNoaFrame` / `honestLight` | **live — S69** | ⚑ Noa's video and the preset that grades it. Pre-authored pixel frames (faceless, `felt`), plus the colour half of correction 13 — desaturate, cool, low-key — each move a line of the documented codebook's phase 1. **Every `NOA` hex is lifted verbatim from `data/room/era1.json`** per `cluster.json`'s COLOR LAW; nothing invented, and the palette ratchet is unmoved at 33/34. ⚑ The FRAMES are draft art (three rewrites; the failure mode was that axis-aligned rects read as architecture at 176×100) and want Sérgio's eye. The preset's "minor pad" is **drawn as a transport lane, not sounded** — audio needs `data/audio/` + `src/audio/`, outside S69's fence |
| `graceQueueLite.ts` + `era3Devices.ts` (E3's laptop/tablet/phone) | **live — rebuilt S64, extended S69** | S69 added the video player (play is optional, files NOTHING to the ledger — Malta's doctrine), correction 13 `Apply the house look`, tracked-changes-for-an-image (the ungraded frame stays beside it; the tablet publishes the graded still clean), and five debug beats. ⚑ Correction 13 is FIRST on Noa's submission because deciding the LAST correction advances the submission, which would hide the picture it just changed. Below: | THE CORRECTION LIST (`REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md`). S38's moderation loop is **dead and deleted**: the verbs `Approve` / `Move to review` / `Let it stand`, the Mira gate (`miraId`/`miraGateFlags`), `ledger.graceQueueMiraStood`, and `era3Devices.drawPhoneShell` are all gone, with the reason in graceQueueLite's header (the research rates peer moderation CONTESTED; testimony production is DOCUMENTED). The phone is no longer a static shell — it holds the era's break and has its own version counter |
| `desktop/apps/comments.ts` + `data/dialog/s3_comments.json` | **live — S70** | ⚑ THE COMMENTS: the whole TABLET now — the feed (moved verbatim from `era3Devices.drawTabletShell`, which is deleted) plus a live comment thread under one published testimony, with a pinned-template picker. Four mechanisms, all authored: a scripted arrival schedule that **never empties** (`afterOpen` / `afterReplies`+`delay`, no generator); six templates with **printed, unbound** ⌘-shortcuts (the input law); ⚑ the PROPAGATION (`templates[].echo`, keyed to what the player deployed, never marked); and `follow: true` on two of six, identical in the picker, leaving one grey `follow-up assigned`. Register split is stated in the file header and in the data's four `_doc` gates — `_docTrouble` governs `c5`, the commenter no template fits. ⚑ Scrolling is resolved at DRAW time (the first build set it on tap, before the dock existed, and the open card sat behind it) |
| `desktop/apps/floppysheep.ts` + `data/dialog/s3_floppysheep.json` | **live — S70** | the mascot game on the phone, and the only app on her home screen. One-thumb runner, authored 20-fence course, `operable` and **NOT respite**; files nothing, unlocks nothing, keeps no best. ⚑ It is the era's ONE dirty-discipline exception and the bounds are in its header: up to 30 uploads/s **while the sheep is moving only**, on the 140×280 phone canvas (~0.31 MP vs the laptop's 2.4), stopping the instant the game closes. The `FLOPPY` palette is lifted from `era1.json` + `ERA3`; ratchet unmoved at 33 |
| `app.ts` `heldDevice` / `isBackYaw()` | **live — S70, and a PARTIAL fix by design** | ⚑ the witness hemisphere is a GLOBAL camera yaw that assumes Room 1's chair; Room 2's tablet seat authors yaw 180, so sitting down with the tablet counted as turning to the record and `pointerdown`'s whole prop/screen block (guarded by `if (!facingBack)`) discarded every press on it. S70 closed only the case that blocked it — a device in the hands is not a direction. **The general fault is S71's.** S71 closed the readout half of it (the room is now read from camera **x**, not from the nearest seat yaw — it had been reporting `spine · door + record` at the tablet seat) and left `isBackYaw()` itself as S70 wrote it |
| `ledger.comments` | **live — S70** | one line per template DEPLOYED, with its `follow` flag; witness text from `s3_comments.json`, never composed in TS. ⚑ Deliberately NOT filed: a comment read and left, the propagation, and every second of FloppySheep — the Malta/Tape C doctrine, stated in the field's own comment |
| `ledger.graceQueue.outcome === 'stood'` | **live-but-deprecated (one known caller)** | nothing emits it after S64; the variant survives only because `src/witness/intake.ts` colours a filing by testing for it and that file was outside S64's fence. Drop the test and the variant together |
| `cluster.ts` `RELOCATIONS` / `relocationFor` + `app.ts` `RELOC_POSES` | **live — generalised S67** | ⚑ THE RELOCATION is now the piece's movement grammar at EVERY era change, not one handoff (`REINTERP_THE_BUILDING_2026-08-02.md` rev 1). One plan table drives both halves; `morphToEra(era, animate, plan)` takes an explicit `null` to opt out and `?descent=0` does exactly that. **S61's E2→E3 numbers are unchanged and re-measured identical** (0.415 m/s, 7.09 °/s). E1→E2 previously fired NO camera move; E3→E4's `dollyTo(270, 4.5)` measured 3.667 m/s / 75 °/s against an 0.43 / 9.1 envelope and is **dead and deleted**. ⚑ Every figure is DESKTOP-measured — A11 has never run |
| ~~`cluster.ts` doorplates (`showPlates`/`hidePlates`, `drawPlate`)~~ | **dead — DELETED S71** | Sérgio, 2026-08-03: *"the doorplates aren't good."* S66 had already removed their job — they captioned rooms with no identity, and Room 2 has one now. Gone from code, from `data/room/cluster.json`, and `data/strings/doorplates.json` is deleted. **The choreography stays and is unchanged**; measured side effect, they were exactly the 1 draw call S67 attributed to them (E2→E3 peak 58 → 57, E3→E4 63 → 62). ⚑ One thing the cut leaves open: S67's argument for E1→E2 was that the single lit plate stops the empty hold reading as a missing asset. Untested in the seat |
| `cluster.ts` `setEra3Lift` / `liftE3` | **live** | ⚑ E3's one inversion — the room's light LIFTS at Malta. Derived from the `e3` rig by gains, deliberately not a new rig in `cluster.json` (the beat is that there is no new lighting state). Reached from the laptop through a module-level hook because `app.ts` owns both halves and was outside S64's fence |
| `ceilingWitness.ts` | **live-but-deprecated (dormant by design)** | retired role R26-B4; shell still built, never woken; its header SAYS so — the model citizen |
| `lambyRig.ts` (`?lambyrig=1`) | **UNREVIEWED** | standalone QA route, still mounted; S34 built Lamby's debut WITHOUT extracting it. Keep as rig lab or retire — flag for the S41 header pass |
| `pointCloud.ts` | **live, two flagged defects** | (1) `labels.slice(0, 28)` vs 32 merged nodes — 4 silently drop (S41 chore); (2) topology is decoration claiming provenance (decision Q4) |
| `tools/`: check-invariants, check-rooms, check-spec, close-graph-report, gen_rooms, gen_attributions, export-atlases, degrade_audio, backup | **live** | first three run in `npm test`; close-graph-report read-only by design |
| `tools/room-audit.mjs` | **live — new S71** | ⚑ the positional checker, and the answer to "S66's overlap solver was ad-hoc and is gone". Reports SURFACE / OVERLAP / FLOATING / BOUNDS / SCALE across all four space states. **No browser, no dependencies** — it reads the same three data files the engine reads and takes mesh extents from the GLBs' own POSITION accessor min/max; the fold is a port of `clusterMorph.foldTargets` and the placement maths a port of `assets.spawnModel`, so **if either changes, change this with it**. Cross-checked against live PlayCanvas AABBs at **0.00000 m** across 67/184/185 props (r2/r3/r4). Not in `npm test` — it reports judgement calls as well as faults, and a ratchet on it would be a ratchet on taste. **S72: its engine cross-check is now a command** — `node tools/shots.mjs verify` (r4, 185 props, 0.00000 m) |
| `tools/shots.mjs` | **live — new S72** | ⚑ L3 capture + L4 assertions; `npm run audit` runs L1 + L2 + L3 + L4 as ONE command and starts its own dev server. **Five assertions live** — comfort envelope (a LAW: 0.43 m/s / 9.1 °/s, fails outright), draw-call peak (ratchet **67**), blank frames (ratchet **1**), subject-in-frame (ratchet **6**), console asserts (**0**, absolute). ⚑ **Assertion 6, reachability on the ordinary path, is NOT BUILT** and says so in every report. It holds **no camera numbers of its own** — poses come from `app.ts`'s `CAMERA_POSES` via `window.__poses`, prop boxes from `room-audit --boxes`; the one authored table is `SEAT_SUBJECTS`, which states what each seat is *for*. `puppeteer-core` is an OPTIONAL devDependency: no Chrome ⇒ skip + exit 0, and `npm test` never needs a browser |
| ~~`tools/harness/` (12 scripts)~~ | **CONSOLIDATED S72** — all twelve deleted, README kept as a tombstone with the where-did-each-go table. Written three times and thrown away three times before this |
| `engine/app.ts` `CAMERA_POSES` / `__camPose()` / `camMoveSeq` | **live — new S72** | the pose tables exported so no tool transcribes them again, plus a read-only `?debug=1` camera probe. ⚑ `camMoveSeq` is what makes the comfort check honest: a CUT is not locomotion, and differencing across a blink jump or `endRelocation`'s seat snap reports thousands of m/s. `__camPose().t` is the MOVE's clock, so velocities are what the curve prescribes rather than the renderer's frame pacing |
| Room 3 (Maya) — belongings, the headset, the dark CRT, both phones | **live — new S74** | ⚑ Stage 1 of Era 4. ~32 belongings added at `r3` (present from E3 on, same convention as Vera's own — the three rooms are one building ageing in parallel; Maya's room is not empty until the story reaches it). The headset (hero tier, `era1room.ts` `classifyProp` — Room 3's two heroes are the CRT and the headset), its stand and the honest-detail glasses arrive at `r4`, alongside the phone (moved from the desk to the nightstand) and `e_crtScreen`'s colour going to `#15151F` (reused, not invented) — off, not deleted. Fixed in the same pass: `e_desk`↔`e_bed`'s 0.086 m overlap (S71's own P1, desk `pos.z` 0.7→0.61, every desk-surface prop shifted with it), both Room 1 curtains' 0.93 m float (S71's P6 — a `curtainRod` added to `r1`, same fix the side rooms already had), and the `w_desk`∩`w_chair` reading confirmed as the SAME intentional "chair tucked under desk" pattern as Room 1's (P6), not a new fault |
| `desktop/apps/space.ts` + `data/dialog/s4_space.json` (`E4Shell`, the bridge) | **live — new S76** | ⚑ ERA 4's SHELL: the headset's standby field and THE PLACE — a home environment drawn on the canvas (window, horizon, shelf, table), parallaxed in bounded hard steps, **no geometry added**, every hex lifted verbatim from `era1.json` into `theme/era4.ts`'s new `PLACE` block (ratchet unmoved at 33). Register `operable`, never `respite` — it is the trap, and it is deliberately NOT soured. ⚑ L is absent by construction: this module imports no voice and holds no lines. Two seams left named and unused: `handleClick` returns false while worn (S77's chips) and `handOff()` (S79's ball, which releases the spine — see below). The bridge (`setE4Bridge`/`e4Bridge`) is the `setEra3Lift` pattern — `app.ts` builds `era3Devices` BEFORE the OS and was outside the fence |
| `os.ts` — the `e4` branch of `drawDesktop` / `handleClick`, `e4HoldsTheSpine` | **live — new S76** | ⚑ **E4 HAS NO DESKTOP**: from `e4` on, `drawDesktop` returns before any chrome — no taskbar, icons, clock or era toast. The phase stays `desktop` because that is the machine's word for "running". ⚑ Two consequences worth knowing: the FOUND FILE (the renamed dossier) is drawn only on an idle desktop and therefore **has no home in E4** — S77/S78's call; and `sendOfferPending` now also holds while E4 runs, because `spine.ts`'s placeholder `E4_HOLD = 22` would otherwise close the piece 22 s into the era. S79 releases it |
| `era3Devices.ts` — the `visor` screen, the u4 composite, the E3-end trigger | **live — new S76** | ⚑ THE VISOR is a fourth screen textured with **`DesktopOS.canvas` itself** (`external: true` — this module never draws a stroke on those pixels; one UI surface, second mount). Created lazily at `e4` and enabled at `e4` ONLY, so no earlier transition gains a call; measured A/B at Maya's seat, closed vs worn: **63→64, 53→54, +1 and only while worn**. `driveVisor` pins it to the camera's live world transform every frame (quaternion slerp off `cam.getRotation()` — ⚑ euler round-trips lie here: a rig yaw of 270 reads back off the child camera as 68.78°). ⚑ **THE LAST UPDATE lands on Vera's laptop** (composited over `graceQueueLite.draw`, offsets in `RITUAL_OFFSET`, clicks routed with the same offset) and **arms itself** when `ledger.graceQueue` reaches `s3_queue.json`'s own correction count + 6 s — the spine's e3 path is gated on the LATENT sends (§7), so this is why E4 is reachable by ordinary clicking at all. ⚑ When the sends land, the spine takes the trigger back |
| `era1room.ts` `PropDef.parts` / `PropHandle.composite` (the box-assembly composite) | **live — new S74** | ⚑ THE PHONE GETS A REAL MODEL (the fixture list), and no CC0 phone-shaped GLB exists in the local kit (no network fetch capability this session either) — built the CRT's own way, a multi-box assembly, but as ONE toggleable entity rather than N separate room props. Needed because `app.ts`'s held-read toggles `w_phoneDevice` by literal id (`h.entity.enabled = held !== name`) and this session's file fence held `app.ts` to seat poses only — extra sibling props would not hide when the phone comes to hand. `clusterMorph.ts` threads `parts` through the fold and treats a composite exactly like a `model` prop (presence/position only, no colour/scale via the fold). Room 3's own phone (`e_phoneBody`/`e_phoneCam`) uses plain sibling props instead — nothing hides it, so the simpler pattern was enough there |

**The two defects S67 logged — ONE CLOSED, ONE STILL OPEN (S71 measured both):**
(1) **STILL OPEN.** `beginMorphedStateBatch()` clears the settled batch for a whole cascade, so
**E3→E4 peaks at 62 draw calls against the ≤60 budget** — re-measured live at 5 samples of 367 over
budget, ~0.6 s of a 42.5 s move (E2→E3 peaks at 57 and is clear). The fix that would work is to
batch the props whose fold is identical between the two states instead of clearing everything; r4
changes 7 props, so almost the whole room would stop glitching during that cascade. **That is a
visible change to the piece's signature effect and therefore Sérgio's call, not a measurement fix.**
⚑ **S72 adds a leg S71 never measured: the ENTRANCE peaks at 67**, while the batcher is still
settling — so the piece's highest draw-call moment is its first ten seconds, on every run, for every
player. The `shots.mjs` ratchet is set there (67) and nags downward.
⚑ **S74 measured both legs AGAIN after Room 3's belongings landed, and the ratchet is now exceeded:
entrance 68, sends 78** (was 67/60). Investigated at length — live in-browser at every steady seat the
new props are correctly in the settled batch (no singleton colour groups beyond three small, deliberate
ones: keys, and clock+cable sharing one), and a manual replay of the entrance descent measured a peak
of 29, nowhere near 68 — so whatever `shots.mjs` is sampling is a genuine transient this session could
not reproduce by hand in the time available. **Not root-caused, reported rather than hidden.** The
`sends` number is on the same LATENT/unreachable mechanism as the comfort violations on those legs (no
beat fires `onSendResolve` yet); `entrance` is the one on a real path and is the more concerning of the
two. Whoever next opens `batching.ts`/`clusterMorph.ts` should treat this alongside defect (1) above —
both are the settled-batch-during-a-driven-leg class of problem.
(2) **CLOSED — S71**, and S67 named the wrong file. The cause is not `batching.ts`, it is the
toggle: `cluster.ts`'s `setTerminalVisible()` flips `.enabled` on a batched node, which batching.ts's
own documented law forbids. `terminalFrame` is now excluded from the settled group exactly as
`BELONGINGS_IDS` already is, for the same reason. Measured after: **0 asserts, 0 extra draw calls**.

**Two ratchets went SLACK in S64 and should be tightened by whoever next owns `tools/check-spec.mjs`**
(it was outside that session's fence, so both now emit a nag instead of holding the line):
C4 palette **32/40** (five phone colours moved into `src/desktop/theme/era3.ts`, three call-site
literals removed) and C7 authoring markers **10/12** (`era3_devices.json`'s two PLACEHOLDER strings
became real draft copy). Lower the baselines to 32 and 10.

**Enforcement claims audited (the "documented as enforced but isn't" hunt the brief asked for):**
no-network/no-storage — genuinely enforced (`check-invariants.mjs`, token scan + `invariant-allow` escape).
Dossier status — NOW enforced (check-spec C1, closed 2026-07-22; was false since the claim was written).
Felt purity / tier-register vocabulary / hero budget — now enforced (C2/C3). Palette — ratchet (C4).
**No remaining CI claim in CLAUDE.md is false as of this audit.** The unenforced-by-nature laws
(satire targets, register feel, Lamby brand-vs-character) are human reads and correctly not claimed as CI.

---

## §3 DATA FILES

| File(s) | Status |
|---|---|
| `data/paths.json` · `room/era1.json` · `room/models.json` · `room/reinterp_deltas.json` · `strings/attributions.json` | **live** (structural; no voice dependency) |
| `dialog/s1_end·s1_guide·s1_irc·s1_kit·s1_tapes·s2_lamby·s2_media·s3_queue` · `strings/opening·orientingCard·gameMenu·lamby_rig·reinterp·slice·updates·era3_devices` · `room/belongings·cluster·fluid_niche·nodes` · `sends.json` · `provotypes/origin_intake_e1·pillow` | **live + PLACEHOLDER awaiting Sérgio** (all display text; `_doc`-flagged) |
| ~~`strings/doorplates.json`~~ | **DELETED S71** — the plates are cut (see §2). The two open calls in its `_doc` died with it |
| `strings/close_network.json` | **live + PLACEHOLDER** — and carries the fake-topology caveat (Q4); no node may render bright-documentary until sources verify |
| `strings/_close_network.schema.json` | **proposed** — not yet consumed by engine or CI; activates only if/when the derived graph is adopted |
| `provotypes/_schema.json` | **live** (consumed by check-spec C1; `close`/`goto` now documented — the old session-log BLOCKED note is stale and pruned this round) |
| `provotypes/_dummy.json` · `room/_archive/*` | **fixture** (dead data must never fail a live build — and check-spec correctly skips it) |

---

## §4 SOURCES (evidentiary axis — dossier enum × Sérgio-verified)

All 8 dossier sources across both real provotypes: **7 `documentary`, 1 `speculative`, 0 `contested` —
and 0 of 8 verified** (all carry `[VERIFY SOURCE]`). Until the source pass: no constellation node may
render as a bright documentary star; the u2/u3/u4 trigger groundings ([VERIFY SOURCE] on the ~2000
collapses, Exodus 2013, the 2019 app-store removals; Malta 2016 is the one CONFIRMED) stay provisional.
The piece-wide `[VERIFY SOURCE]` sweep (checklist §D) was promised and never generated — dispatched
this round (S42). The verified-or-not bit lives with the source, never with the doc that cites it.

---

## §5 HOW THIS PAGE STAYS TRUE (the durable fix — adopted as improved, D47)

**The failure class this round exists for:** work that was planned, partially done, then assumed
complete. Verified instances: R28 §4 layer 3 (unbuilt while layers 1–2 shipped); R28 §6's own
consolidation (v2 written — the satisfying half — but the supersession headers, the 03 dispatch board,
and 04's read-order pointer never updated: 03/04 sat frozen at Round 17 / v1 for nineteen days);
checklist §D (header created, queue never generated); session-log NEXT UP (frozen at ~Session 6
content while DONE grew — with 00_START_HERE telling every new session "your session = the top item
of NEXT UP"). **That last one is the likely mechanism of the cork-panel incident: the pointers agents
are told to trust were the stalest layer in the repo.**

**Why R28 §6 failed, said plainly:** it was a one-shot heroic pass with no failure signal for the
tedious half. Nothing broke when the headers didn't land, so they didn't. Any fix that isn't
mechanically checked will fail the same way.

**The mechanism (Sérgio's header proposal, improved):**
1. **`STATUS:` header** as the first body line of every `docs/**.md`: `STATUS: live` ·
   `STATUS: superseded-by <file>` · `STATUS: history-only`. One line, greppable, human-writable.
2. **check-spec C5**, three checks: (a) headerless-doc count as a RATCHET (C4 idiom — baseline
   frozen at adoption, fails on growth, nags downward; this is what makes the migration incremental
   instead of another heroic pass); (b) every `superseded-by` target must exist; (c) opt-in
   **`KILLS: src/<path>#<symbol>`** lines under a header — the checker fails if the named symbol is
   still referenced outside its own file. R28 §4's record carrying
   `KILLS: src/desktop/opening.ts#mountStartupOverlay` would have caught finding #2 mechanically.
3. **`tools/doc-status-report.mjs`** (read-only, not in `npm test`): lists docs by status — the
   generated view of §1, so §1's table can shrink to exceptions and partitions over time.
4. **Honest limit, stated up front:** a checker can catch a dead SYMBOL, not a dead JOB. The
   cork-panel partition (job dies, surface survives) needed a human sentence; the header convention
   forces that sentence to exist in one greppable place, which is the most a cheap system can do.
5. **Two trackers, never merged:** THIS (lifecycle — what is current) is the urgent problem and is
   now mechanized. The provenance graph (what the piece is built from — the Close constellation,
   dossier statuses, close-graph-report) is the right long game but is thin until the dossier grows;
   it gets no new machinery until content justifies it.

Build lane: S41. This register is hand-written ONCE (this round); after S41 the headers are the
truth and this page holds only what headers can't say.


---

## §6 — PROMPT BLOCKS ARE A LIFECYCLE SURFACE (added 2026-08-02, after a dispatched stale prompt)

§5 named the class: *"the pointers agents are told to trust were the stalest layer in the repo."*
**Prompt blocks were the un-audited instance of exactly that**, and on 2026-08-02 one was dispatched:
the `S66 — BUILD THE TESTIMONY STUDIO` block out of `REINTERP_E3_STUDIO_SPEC_2026-07-30.md`, a file
whose first line had read `STATUS: superseded-by …` since the day it was written. The session logged
BLOCKED and built nothing (`423bd62`) — **but only because that agent chose to check the header of
the file its prompt came from, which is a habit, not a control.**

**Two failures, both now machine-checked by `check-spec.mjs` C8:**
1. **A doc's STATUS does not propagate into the prompt a human copies out of it.** A prompt block is
   pasted into a fresh agent with none of its surrounding document. It must carry its own status.
2. **Session numbers are not unique.** "S66" named three different jobs at once: the retired studio
   build, the shipped correction list, and the live livable-rooms work. Grepping for a number found
   the wrong one.

**The rules C8 enforces:**
- A `STATUS: superseded-by` doc must contain **no dispatchable prompt block at all.** Delete the
  prompt and keep the reasoning — an annotated prompt is still a prompt.
- Every prompt heading (`# S<n> — …`) must carry
  `**⚑ PROMPT STATUS: SHIPPED | QUEUED | BLOCKED | DRAFT …**` within three lines.
- Scene ids are exempt by construction: they carry a dot (`S1.7`, `S2R.3`) and the pattern requires
  a dash. The first pass flagged three Era-1 scene headings before this was tightened.

**Retired numbers stay retired.** When a prompt ships, its marker says so and the number is not
reused; if a number must be re-pointed, the old block says where it now points. 24 prompt blocks are
marked as of adoption.
---

## §7 — THE S74 DRAW-CALL REGRESSION, DIAGNOSED (2026-08-06)

S74 reported honestly that it could not explain why `npm run audit` now exceeds its draw-call ratchet
while a manual seat measurement showed only 29. **The pattern across the legs is the diagnosis, and
it was not visible from any single measurement:**

| leg | before S74 | after | Δ |
|---|---|---|---|
| entrance | 67 | 68 | +1 |
| E1→E2 | 38 | 39 | +1 |
| E2→E3 | 57 | 57 | **0** |
| E3→E4 | 62 | 62 | **0** |
| **⚑ sends** | 60 | **78** | **+18** |

**⚑ Two era transitions are UNCHANGED despite Room 3 gaining 68 props.** So this is not "more props
cost more draws" globally, and it is not a tool artifact — it is one leg.

**The cause: Maya's belongings were added at `r3`, not `r4`.** That was a defensible call (S66 did
the same for Vera; the rooms age as one building and Maya lives there the whole time) — but it means
**32 belongings are present during ERA 3**, and the scripted send dolly is the one leg that flies
across Room 3 *during E3* with all of them in frame at once. The era transitions do not spike because
their peaks fall inside the morph cascade, when the props are mid-fold rather than all resident.

**Why a seat measured 29:** a settled seat is the batched steady state. The tool measures the PEAK
during motion, while the batcher is still merging. **Both numbers are right; they measure different
moments.** S72's own note already said the entrance is the piece's highest draw-call moment *because
the batcher is still settling* — S74 hit the same wall without that context to hand.

### ⚑ The recommendation: DO NOT raise the ratchet
- **The sends are latent.** No beat fires that seam (`app.ts`: the trigger beats ride the
  content-merge lane), so 78 is unreachable in play today — exactly like the **6.87 m/s** on the same
  legs.
- **So the sends leg is now over budget AND over speed, and both are latent.** ⚑ Whoever wires the
  first send beat must fix both, in the same session. That is the note this entry exists to leave.
- Raising the ratchet to 78 would legitimise a regression on an unreachable path. **A failing ratchet
  on a path nobody can reach is exactly the right kind of nag** — it costs nothing today and it
  cannot be forgotten tomorrow.
- The two `+1`s (entrance, E1→E2) are Room 1's new `curtainRod` and are not worth acting on.

**If the sends leg later needs to come down:** the lever is whether Maya's belongings need to be
resident at `r3` at all, or whether they can arrive at `r4` with the era they belong to. That is a
narrative call — the rooms-age-together argument is good — and it should be made deliberately rather
than as a performance fix.


---

## §8 — ERA 4's DECISIONS, REGISTERED (2026-08-06)
*Every call made this week, in one place, so no session has to re-derive one. Sérgio's are marked
**[S]**; the rest are mine under the co-creation norm and are his to overturn.*

| # | decision | where it is argued |
|---|---|---|
| 1 | **[S]** The assistant is **L**, not Echo — the dispersal finishing as a file designation | ARGUMENT §3 |
| 2 | **[S]** The device is a **headset**, and ⚑ **the visor opens a PLACE, not a rectangle** | THE_SPACE §1–2 |
| 3 | The place is a **home environment** — a default room that is not hers, ad-saturated, addressed to her by name. **Drawn on the canvas**: a picture of a place, no new geometry | THE_SPACE §2 |
| 4 | ⚑ **The turn does not work in it.** The place comes with you. Nobody explains it | THE_SPACE §4 |
| 5 | ⚑ **E4 has NO DESKTOP.** The application layer is gone; the OS is the assistant | THE_SPACE §6 |
| 6 | **[S]** The era opens with **the update ritual**, and **L arrives inside it** — installed, agreed to. The EULA is where *"it accepted the terms"* lands | THE_SPACE §6 |
| 7 | **[S]** Putting the headset on is **ONE TOUCH**, not a movement. No donning animation | S73_OPEN_ISSUES Q2 |
| 8 | **[S]** The **touchless budget** is a rule: if a beat can advance itself, it does. Three presses in the whole era — chip, undo, turn | THE_DEVICE, Stage 0 |
| 9 | The **deadname advisory** goes on the **pre-fiction panel**, never in-fiction *(Sérgio had no preference; my call, his to overturn)* | S73_OPEN_ISSUES Q3 |
| 10 | **[S]** The **unvoiced opt-out** goes in the **game menu**. Accessibility belongs to the frame, never to the apparatus | S73_OPEN_ISSUES Q4 |
| 11 | The record holds **"Daniel"** — ⚑ *answered by fact*: this branch prefills the name, so there is no typed name to retain. The name was never the player's to give | S73 gates, closed |
| 12 | **[S]** The ball is an **interpretive homage**; the reader gate is **lifted**. Function without vernacular; invented categories; ballroom credited by lineage | DEEP_PASS §1.2, SOURCE_PASS §4 |
| 13 | ⚑ The ball's **categories echo the apparatus's own words** — corrected by the provenance pass. What was seized back is the **judging**, not the vocabulary | DEEP_PASS §1 (corrected) |
| 14 | **TRANSCENDANCE has no screen at all** — and that is the same point as #2, not a contradiction | THE_SPACE §3 |
| 15 | The apparatus is an **ADOPTER, not a developer** of AI | SOURCE_PASS |
| 16 | The **memories/photo beat stays `speculative`** — no such tool exists in the record | SOURCE_PASS, negative findings |
| 17 | The export thesis is **"the law arrived in patches; a ban is national, a URL is not"** — twice corrected | ARGUMENT §1 |
| 18 | **The store and the "for you" wall are droppable on purpose** — cut first if S78 runs long | S78 scope 4 |

### Numbers retired this week
**S68** (gyroscope, never written) · **S73** (one giant Stage 2, superseded by the space reframe) ·
**S75** (the number the stopped run used for itself). ⚑ Numbers are never reused — `08 §6`.

### The E4 build, as it now stands
**S74 ✅ rooms → S76 ✅ shell → S77 voice → S78 offers → S79 the ball.** Each is playable alone and
none leaves the era unreachable. ⚑ **S77 carries the trans reader pass as a GATE, not a review step.**

### ⚑ WHAT S76 HANDS THE NEXT THREE (2026-08-08)
1. **The era opens and holds.** E3's list running out arms the last update on Vera's laptop; the
   restart relocates to Maya's seat; one touch on the headset opens the place. `E4Shell.handOff()`
   is the ONLY thing that lets the spine close the piece — **S79 must call it**, or the era never ends.
2. **S77's chips land in `E4Shell.handleClick`**, which currently returns false while worn. The
   worn visor consumes every press so nothing falls through to the room behind it.
3. **⚑ A press in the back hemisphere is still discarded** (`app.ts`'s `isBackYaw`, the general fault
   S70/S71 left open). It does not bite this session — the one touch happens before any turn — but
   **it will bite S77's chips the moment a player answers L while turned.** Fix it with the chips.
4. **⚑ The headset is a few degrees outside the frame at Maya's seat** (33.9° off the seat bearing vs
   a 29.7° horizontal half-FOV at 1280×860). One line in `data/room/reinterp_deltas.json`, which was
   outside S76's fence: `e_headsetStand`/`e_headsetVisor`/`e_headsetStrap`/`e_glasses` from `z 0.05`
   to ~`z 0.30`, and `PLACEMENT.visor.pos.z` in `era3Devices.ts` with them. Sérgio's call.
5. **The found file has no home in E4** (drawn only on an idle desktop; there is none). Decide.
6. **`?flat=1` still has no E3 or E4 to play** — E3's content is all on room devices (since S37), so
   nothing can arm u4 there. Older than S76; the shell itself draws correctly in flat.
