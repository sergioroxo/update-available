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
| Startup-options panel — `intake.ts` `setStartupBoard`/`handleStartupClick`/`drawStartupBoard` + `app.ts:737/751/1009/1254` | **live-but-deprecated** | R28 §4 killed the onboarding JOB; still wired, so a fresh `?reinterp=1` shows the R28 replacement AND the dead thing. **The partition:** the cork BOARD survives (witness lineage state 1 — `openingBoardDressing.ts`, O3 profile pinning); only the "Start-up options / This screen / Headset / Conducted view" panel dies. Retires in S40 when §4 layer 3 ships |
| `opening.ts` `mountStartupOverlay` (~440 lines) | **dead** | zero callers since Session 27; header claims a VR future the physicalized in-scene board already serves better. REC retire (decision Q3); `data/strings/opening.json` stays either way (intake.ts reads it) |
| `ceilingWitness.ts` | **live-but-deprecated (dormant by design)** | retired role R26-B4; shell still built, never woken; its header SAYS so — the model citizen |
| `lambyRig.ts` (`?lambyrig=1`) | **UNREVIEWED** | standalone QA route, still mounted; S34 built Lamby's debut WITHOUT extracting it. Keep as rig lab or retire — flag for the S41 header pass |
| `pointCloud.ts` | **live, two flagged defects** | (1) `labels.slice(0, 28)` vs 32 merged nodes — 4 silently drop (S41 chore); (2) topology is decoration claiming provenance (decision Q4) |
| `tools/`: check-invariants, check-rooms, check-spec, close-graph-report, gen_rooms, gen_attributions, export-atlases, degrade_audio, backup | **live** | first three run in `npm test`; close-graph-report read-only by design |

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
