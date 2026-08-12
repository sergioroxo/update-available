# S82 — INTEGRITY AUDIT
STATUS: live
**⚑ PROMPT STATUS: SHIPPED 2026-08-12 — audit report, never dispatch.**

**Date:** 2026-08-12  
**Scope:** branch `reinterp`, audience path `?reinterp=1`  
**Method:** static inspection of all 97 `STATUS: live` documents, `src/`, `data/`, and the named
tools. `08_STATUS_REGISTER.md` was read in full before the wider sweep. The existing `npm run audit`
headless diagnostic ran for numeric/assertion output only; no browser was manually driven and no
captured image was inspected. No phone, headset, or visual verification is claimed. Line numbers
below describe this audited tree after the narrow corrections listed in §0.

## Executive result — worst first

1. **REPORTED — the SEND seam is not wholly latent.** E2 offers s1 and s2 on the ordinary path and
   `visited` calls the movement runtime. The repository's repeated “no beat fires it / unreachable”
   claim is false. The failing s2 leg (6.874 m/s) is ordinary-path reachable; failing s3/s4 remain
   inaccessible on the E3 CRT. All three audit exclusions remain exactly as instructed; this audit
   did not change speed, draw calls, or the ratchet.
2. **REPORTED — the flip assist is global, not seat-relative.** At the 90° and 270° authored side-room
   seats, its absolute 0°/180° target can produce a 90° turn instead of the required ~180° turn. The
   same global hemisphere still controls witness filing and the keyboard gate.
3. **REPORTED — s3 and s4 are debug-only in E3.** The spine offers s3 on Daniel's CRT, but that CRT
   deliberately renders black throughout E3. The correction-list route independently reaches u4,
   which hides this broken branch from later-era review.
4. **REPORTED — the master plan is not a safe conflict winner.** Its E3 spine is obsolete, its
   continuity table still promises unbuilt E4/Close content, and it retains the old 60-draw-call law.
5. **REPORTED — `data/paths.json` is not a runtime composition.** Both it and `spine.ts` say it is;
   the runtime never imports it and its build flags have drifted.
6. **REPORTED — the console assertion is narrower than its claim.** It catches `pageerror`,
   `ASSERT`, and `Invalid batch`, not ordinary `console.error`.
7. **REPORTED — the idle wipe doctrine has no idle path.** All implemented termination paths wipe
   correctly and no storage API is used, but no inactivity reset exists.

No narrative wording, register, tone, source status, room staging, motion timing, performance
threshold, or reachability logic was changed.

## §0 — provable corrections made

These are the only edits outside this report/register/log:

- **FIXED:** three broken links in live docs. The nonexistent `PROCESS_REGISTER.md` pointers now say
  that the proposed file was never created and point to the status register; the absent storyboard
  file is no longer a live link. Found by resolving every local Markdown link in every live doc.
  Locations: `SCRIPT_UPDATE_v0.4.md:135,208`; `SCRIPT_UPDATE_v0.5.md:192`.
- **FIXED:** two stale E4 data paths. The old `s4_echo.json` / `s4_room.json` claims remain visible and
  are corrected to `s4_l.json` / `s4_space.json`. Found by comparing every named data path with the
  tracked file set. Locations: `REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md:95–99`;
  `REINTERP_E4_ECHO_SCRIPT_DRAFT_2026-07-13.md:129–130`.
- **FIXED:** the proposed Close schema's 2026-07-22 “Sérgio only / blank while waiting” rule was
  corrected in place to the 2026-07-24 co-creation norm, with the wrong claim retained. Location:
  `data/strings/_close_network.schema.json:3,21`.
- **FIXED:** `close-graph-report.mjs` claimed the engine cap was 28 while `pointCloud.ts` actually
  slices 32. Location: `tools/close-graph-report.mjs:62`; engine evidence
  `src/room/pointCloud.ts:198,209`.
- **FIXED:** active source comments/metadata saying “no beat fires” were corrected to distinguish
  E2 s1/s2 from inaccessible E3 s3/s4. Locations: `src/engine/app.ts:606–609`;
  `data/dialog/s4_update.json:4`; `tools/shots.mjs:1087–1100`. The audit exclusions themselves were
  not changed.
- **FIXED:** active `?flat=1` source labels now call it a review tool, not an audience fallback.
  Locations: `src/flat/flat.ts:2–4,27`; `src/debug/panel.ts:284`;
  `src/desktop/orientingCard.ts:300`; `src/desktop/os.ts:1417–1419`;
  `src/desktop/apps/space.ts:89,332`; `src/desktop/theme/era4.ts:21`.
- **FIXED:** live queue pointers now mark S78 shipped+verified, S82 shipped, S73 retired, and S79 unblocked; the
  active S79 prompt's 60-call and wholly-latent-send claims are corrected; the session log's stale
  “NEXT UP” list is explicitly historical. Locations: `BUILD_QUEUE_LIVE.md:20–31,668–673,
  760–793,1061`; `08_STATUS_REGISTER.md:543–549`;
  `01_SESSION_LOG.md:8–14`.

A repository-wide link check after those changes found **zero broken local targets in live docs**.
It also found 13 broken targets confined to history/superseded docs; those were reported by the
check and deliberately not rewritten as current guidance.

---

# PART A · NARRATIVE AND DOCUMENT INTEGRITY

**Part A summary:** the 97-live-doc set has seven decision-conflict families, the master continuity
table has five build gaps and one retired object, and the source-debt baseline is currently undefined.

## A1 · Cross-document contradictions

### A1.1 — SEND reachability: “latent” versus ordinary-path E2

- **What:** live docs and tool output repeatedly say no beat fires the seam. The spine actually offers
  s1 after nine seconds in E2 and s2 after s1 resolves.
- **Where:** later runtime evidence `src/narrative/spine.ts:121–131`, `src/desktop/os.ts:992–1059,
  2390–2392`, `src/engine/app.ts:730–737`; contrary live claims
  `08_STATUS_REGISTER.md:258–265,341–347`, `BUILD_QUEUE_LIVE.md:29–33`,
  `REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md:68–74`, and `tools/shots.mjs:1087–1100`.
- **How found:** followed `offerSend` → visible icon/window → `send-go` → `onSendResolve` rather than
  searching only for calls to `sendRt.fire`.
- **Verdict:** **REPORTED.** The automated diagnostic measures s2 at 6.874 m/s / 140.59°/s and 78
  draw calls for the grouped send run. Whoever certifies sends owns both failures; this audit did not
  alter their exclusion.

### A1.2 — Quest draw-call law: 60 versus 75

- **What:** live documents still assert two binding ceilings.
- **Where:** the later 75 decision is in `CLAUDE.md:97–103`, `08_STATUS_REGISTER.md:389–407`, and
  `BUILD_LOG.md:248`; 60 remains in live
  `REINTERP_MASTER_PLAN_v2_2026-07-12.md:58`, `RESEARCH_STRAND_B_RUN_KIT_2026-08-06.md:63`,
  `REINTERP_E3_THE_JOB_2026-08-03.md:254`, `REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md:33,72`,
  `REINTERP_MODE3_ASSESSMENT_2026-08-06.md:152`, `REINTERP_THE_BUILDING_2026-08-02.md:337`, and
  `reinterp/05_HOW_TO_RUN_A_SESSION.md:87`. Historical prompt bodies inside the live queue repeat 60
  at lines 121, 345, 361, 417, 499, 601, 697, 783, 930, and 1043.
- **How found:** extracted every numeric draw-call law, then compared document dates and correction
  headers.
- **Verdict:** **REPORTED.** Later is 75 (Sérgio, 2026-08-06); this audit does not decide which older
  documents should be rewritten versus preserved as session history. Claim-level supersession is
  required.

### A1.3 — `?flat=1`: fallback versus review tool

- **What:** the 2026-08-06 architecture says flat is a review tool, while live design/process docs
  still use fallback requirements.
- **Where:** later side `CLAUDE.md:35–41` and `REINTERP_THE_LOOK_MODES_2026-08-06.md:1–31`; older side
  `REINTERP_E4_THE_DEVICE_2026-08-05.md:63,73`, `SCRIPT_UPDATE_v0.5.md:194`,
  `08_STATUS_REGISTER.md:356–365`, and `reinterp/05_HOW_TO_RUN_A_SESSION.md:84`.
- **How found:** searched the whole live set for fallback language, then checked source comments and
  the actual flat entry point.
- **Verdict:** **REPORTED; stale source labels FIXED.** Reframing old design arguments is a design
  history decision, so the docs remain as evidence of the disagreement.

### A1.4 — movement: “no locomotion ever” versus fixed-seat jumps

- **What:** R28 explicitly strikes the old law for reinterp, but live guidance still quotes it without
  the “no free/smooth locomotion” qualification.
- **Where:** later side `CLAUDE.md:10–17` and
  `REINTERP_RESTRUCTURE_R28_2026-07-10.md:38,142–145`; older side
  `REINTERP_FLUID_TRANS_ROOM_GEOMETRY_2026-07-03.md:9` and
  `reinterp/05_HOW_TO_RUN_A_SESSION.md:84`.
- **How found:** searched live docs for the exact struck phrase and compared amendment dates.
- **Verdict:** **REPORTED.** The later amendment is explicit; no old design prose was silently
  rewritten.

### A1.5 — assistant name: L versus surviving Echo

- **What:** the later L decision is applied in runtime data but not throughout live supporting docs.
- **Where:** later side `REINTERP_E4_THE_ARGUMENT_2026-08-05.md:128–145`,
  `data/dialog/s4_l.json`, and `08_STATUS_REGISTER.md:283`; stale live uses occur in
  `REINTERP_CLOSE_CONSTELLATION_BRIEF_2026-07-24.md:20,60,114,129,135`,
  `REINTERP_ERA_MINING_R28_2026-07-10.md:100,137`,
  `REINTERP_WHAT_IS_MISSING_2026-08-04.md:33,39,79`,
  `REINTERP_LAMBY_GAME_CONCEPT_2026-07-25.md:109`, `reinterp/06_SERGIO_CHECKLIST.md:320–327,
  389–411,491,577`, and `reinterp/07_WAITING_ON_SERGIO.md:17,41,51,59`.
- **How found:** compared all Echo occurrences with source/data identifiers and separated the valid
  generic phrase “Echo arrivals” in `src/desktop/apps/comments.ts:157` from assistant naming.
- **Verdict:** **REPORTED; three stale data-path claims FIXED.** Updating historical design prose is
  broader than a pointer repair.

### A1.6 — co-creation: felt “brief only” versus PLACEHOLDER-draft

- **What:** the 2026-07-24 norm allows felt/poetic drafts for Sérgio to review. Earlier live material
  still says felt text receives only a brief; one E2 doc contains both rules internally.
- **Where:** later side `CLAUDE.md:129–134` and `research/00_CONSTELLATION_INTAKE_2026-07-24.md:34–51`;
  older side `reinterp/06_SERGIO_CHECKLIST.md:14`; internal contradiction
  `REINTERP_E2_HOMECOMING_SCRIPT_2026-07-25.md:6–7,19`.
- **How found:** searched the live corpus for authorship and “brief only” rules, then compared dates.
- **Verdict:** **REPORTED; proposed schema FIXED.** No felt copy was changed.

### A1.7 — current-status documents disagree with themselves

- **What:** the status register and queue preserve earlier statements after later closure, without
  marking every old sentence historical. Examples: §14 says `E4Shell.handOff()` is unwired at
  `08_STATUS_REGISTER.md:543–547`, while §15's later S78 implementation wires the offer handoff and
  the source does so at `src/desktop/apps/space.ts:127–129`; §2 says the Close label cap is 28 at
  `08_STATUS_REGISTER.md:84`, while the engine uses 32; §3's data list at lines 140–146 omits current
  s2/s3/s4 files; §4 counts 8 sources/two provotypes at lines 152–157, while the current read-only
  graph finds 12 distinct sources across three real provotypes.
- **How found:** treated later sections as evidence, not as automatic erasure of earlier sections,
  then compared every register inventory row to the tracked tree.
- **Verdict:** **REPORTED; queue pointers and report cap FIXED.** §16 registers the class.

No additional decision-conflict family was found in the 97-doc sweep. That is a clean result, not a
claim that every historical sentence is current; the seven families above are the semantic values
that coexist as live guidance.

## A2 · Does the build match its own docs?

### Era 1

- **Present as documented:** opening/profile, kit/install/reveal, IRC, diary failure/glitch, two
  provotypes, tapes, system-side guidance, witness record, u2 ritual.
- **Documented but absent:** graying remains unbuilt (`data/paths.json:16`) and is still queued rather
  than falsely implemented.
- **Contradiction:** the continuity table still says “cork board”
  (`REINTERP_MASTER_PLAN_v2_2026-07-12.md:171`) although the same master explicitly retires it in
  favour of the record wall at lines 85–89 and the build follows the retirement.
- **Verdict:** **REPORTED.** Needs the master table cell corrected by its owner.

### Era 2

- **Present as documented:** Lamby arrival, Restorify/pillow, media/accountability collapse, Caleb
  thread/residue, s1/s2 offers, u3 ritual.
- **Documentation drift:** the master summary under-describes the later four-beat E2 structure; the
  current E2 scripts describe it. `data/dialog/s1_guide.json:2` also still says tape work awaits a
  session that has shipped.
- **Verdict:** **REPORTED.** Needs a build-state metadata pass, not copy changes.

### Era 3

- **Documented but absent/inaccessible:** s3/s4 exist as data/runtime but are not ordinarily
  operable; see B1. The master plan still describes an older moderation/“Spot” adaptation while the
  build implements Vera's correction list, comments, Noa video, Malta, and FloppySheep
  (`REINTERP_MASTER_PLAN_v2_2026-07-12.md:137–159` versus
  `REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md` and `src/room/graceQueueLite.ts`).
- **Verdict:** **REPORTED.** It takes a designated spine-document revision and an ordinary-path test.

### Era 4 and Close

- **Present:** last update on Vera's laptop, Maya's room/headset/place, L units, offers/memories/
  curation/finale, handoff seam, bare restart and procedural constellation.
- **Documented but absent:** TRANSCENDANCE/the ball is not built; the Close's authored continuity
  conclusions are not implemented. `enterClose()` disables every room/screen and shows the cloud
  (`src/engine/app.ts:2648–2670`), contrary to the master table's “same room, renamed rather than
  closed” value.
- **Verdict:** **REPORTED.** S79 owns the ball; a later scoped Close session must decide and build the
  content. Needs a visual pass when built.

### Built but undocumented

- **Result:** **none found unambiguously.** Every active implementation module mapped to at least one
  live design/session document. Some module filenames are not named verbatim, but their feature is.
  The quieter drift found here is the reverse: an apparently authoritative data composition that
  runtime ignores (B4).

## A3 · Six continuity threads, build against master §5b

| Thread | E1 | E2 | E3 | E4 | Close | Verdict |
|---|---|---|---|---|---|---|
| watcher | system side-messages | Lamby | Lambient marks | L | no watcher-lineage node/text in `close_network.json` | **REPORTED gap at Close** |
| board | record wall, not table's cork board | dashboard | feed | migrated witness plane | constellation | **REPORTED stale E1 table cell** |
| machine | CRT | CRT | three devices | visor/place | room/screens disabled | **REPORTED Close contradiction** |
| name/file | prefill and filings | migration/residue | correction records | deadname paperwork | master line “Nothing about you was broken” absent from `src/` and `data/` | **REPORTED Close gap** |
| warm objects | room objects/tape C | retained objects | Malta/Noa/FloppySheep counter-current | TRANSCENDANCE absent | “plays clean” absent | **REPORTED E4→Close gap** |
| law outside | deliberately none | collapse framing | Malta | regional/export offers | no ban/law conclusion in Close data | **REPORTED Close gap** |

How found: converted each master table cell into search terms, then required a concrete data id,
runtime call, entity, or display string. What it would take: give each cell a stable implementation
reference and separate planned/built/reachable/accepted status. No continuity content was drafted.

## A4 · Name and term drift

- **Room mapping — clean:** Room 1/Daniel serves E1+E2; Room 2/Vera serves E3; Room 3/Maya serves E4
  in `data/room/nodes.json`, debug labels, relocation data, and device code.
- **Runtime assistant name — clean:** no assistant named Echo remains in `src/` or display data.
  `comments.ts:157` uses “Echo arrivals” as a generic propagation term, not a character name.
- **Invented marks — clean:** Compass, HopeRestored, Pastor.AI, Sift™, Restorify, GracePlatform,
  SisterSignal, Lambient and L are consistently used in fiction data; no conflicting spelling was
  found.
- **Real people/organisations/brands — clean in fiction surfaces:** named real entities found in
  `data/` are confined to dossier/provenance/source metadata or project attribution. Malta is the
  documented law/country beat. No real logo/likeness or unauthorized brand was found in display
  fiction.
- **Live-doc Echo drift — reported:** see A1.5.

## A5 · Placeholder and `[VERIFY SOURCE]` ledger

### Scope problem

The prompt's “132 markers / 32 files” cannot be reproduced without an unstated exclusion rule.
Counting exact literal occurrences against the pre-audit `HEAD` (so this report cannot inflate its
own census) gives:

| population | `[VERIFY SOURCE]` occurrences |
|---|---:|
| all repository files at pre-S82 `HEAD` | 150 |
| docs | 110 (84 live, 22 history, 4 superseded) |
| data | 23 |
| tools | 7 literal checker/report tokens, not evidentiary claims |
| other repo guidance/log/assets | 10 |
| docs + data | **133** |

Active data debt, excluding fixture `_dummy.json` and the proposed
`_close_network.schema.json`, is **19 markers**:

| Era/kind | Files | Count |
|---|---|---:|
| E2 dialog | `dialog/s2_media.json` | 2 |
| E4 dossier | `provotypes/e4_offers.json` | 5 |
| E1 dossier | `provotypes/origin_intake_e1.json`, `provotypes/pillow.json` | 8 |
| cross-era update grounding | `strings/updates.json` | 4 |
| proposed Close schema (excluded above) | `strings/_close_network.schema.json` | 1 |
| test fixture (excluded above) | `provotypes/_dummy.json` | 3 |

The current Close report finds **12 distinct real sources, 12 recorded source→scene edges, three real
provotypes, 10 documentary + 2 speculative, and 8 unverified**. The authored Close contributes 24
labels, so 36 prospective nodes exceed the actual 32-label cap by four. This is static report output,
not visual verification.

### PLACEHOLDER data-file census

There are **33** tracked data files containing the literal `PLACEHOLDER`; excluding the test fixture
and archived room delta leaves **31 active/proposed files**, not 32.

| Era/kind | Files |
|---|---|
| E1 dialog/dossier | `dialog/s1_end.json`, `s1_guide.json`, `s1_tapes.json`; `provotypes/origin_intake_e1.json`, `pillow.json`; `room/belongings.json`; `strings/opening.json` |
| E2 dialog | `dialog/s2_caleb.json`, `s2_lamby.json`, `s2_media.json` |
| E3 dialog/system | `dialog/s3_comments.json`, `s3_floppysheep.json`, `s3_queue.json`; `strings/era3_devices.json` |
| E4 dialog/dossier | `dialog/s4_l.json`, `s4_offers.json`, `s4_space.json`, `s4_update.json`; `provotypes/e4_offers.json` |
| cross-era/system/Close | `paths.json`, `sends.json`; `room/cluster.json`, `fluid_niche.json`, `nodes.json`; `strings/close_network.json`, `gameMenu.json`, `lamby_rig.json`, `orientingCard.json`, `reinterp.json`, `slice.json`, `updates.json` |
| excluded fixture/archive | `provotypes/_dummy.json`; `room/_archive/reinterp_deltas.radial-hexagon.json` |

- **How found:** exact-token count over the pre-S82 Git tree, then lifecycle and primary-consumer
  grouping; no generated/build directories or this report's self-references included.
- **Verdict:** **REPORTED.** Build a checked-in census command with stable scope, per-era/kind output,
  lifecycle, fixture/proposal exclusions, and a delta from the last accepted baseline. Do not make the
  article depend on a hand-count.

---

# PART B · LOGIC AND STRUCTURE

**Part B summary:** E1/E2 and the E3 correction-list route are statically continuous, but s3/s4 are
debug-only, `paths.json` is non-operative, and idle-reset is promised but absent; filing silences and
storage prohibitions remain intact.

## B1 · Ordinary-path reachability

### Reachable by ordinary clicking/pressing

- Opening → profile → kit → IRC/diary glitch → u2.
- E2 Restorify/media/Caleb residue → u3. Before residue, the time-based conductor can also expose
  s1 then s2; decline and visit both resolve.
- E3 correction list → six-second quiet → u4 through `era3Devices.ts:653–657`, independently of the
  spine's send branch.
- E4 shell/L/offers → `E4Shell.handOff()` → bare restart → Close. The ball is absent, so this is the
  currently built handoff, not the planned S79 experience.

### Debug-only / ordinary-path inaccessible

- **s3 and s4.** `spine.ts:139–146` offers them, but `os.ts:1402–1423` paints Daniel's E3 monitor
  black before desktop icons/windows, while `offerSend` only exists on that `DesktopOS` canvas.
  `os.ts:2259–2260` has debug buttons, so C6 passes. s4 additionally depends on resolving s3.
- **Verdict:** **REPORTED.** Either mount E3 sends on an actually used E3 device and define their
  relationship to correction-list exhaustion, or remove them from the ordinary E3 graph. Then build
  assertion 6 to compare expected versus visited beats.

The ball/TRANSCENDANCE is **absent**, not debug-only: no beat or texture exists to reach.

## B2 · Orphans and dead seams

| Seam/code | Classification | Evidence and action |
|---|---|---|
| `src/room/sends.ts` | **PARTLY LIVE, PARTLY INACCESSIBLE — neither DEAD nor wholly latent** | E2 s1/s2 call it; E3 s3/s4 do not have an ordinary surface. Do not delete. |
| `data/paths.json` as runtime composition | **DEAD AS RUNTIME INPUT** | no source import; `spine.ts` hard-codes the graph. Still referenced as an authoring/build ledger, so deletion would be a design decision. Reported. |
| `_close_network.schema.json` | **LATENT-BY-DESIGN** | explicitly proposed and not consumed. Keep pending decision. |
| `E4Shell.onBreak/resumeAfterBreak` and S79 handoff | **LATENT-BY-DESIGN** | named seam awaiting TRANSCENDANCE. Keep. |
| `ceilingWitness.ts` | **LATENT/DORMANT-BY-DESIGN** | still constructed and updated; wake role deliberately retired. Not dead. |
| `ledger.graceQueue.outcome === 'stood'` | **LIVE-BUT-DEPRECATED** | one witness renderer consumer, no current producer; status register already identifies paired removal. |

The TypeScript unused-symbol check is clean. No additional safely deletable, caller-free production
code was proved dead; therefore no code was deleted.

## B3 · State and ledger integrity

- **Storage/network — clean:** no runtime `localStorage`, `sessionStorage`, `indexedDB`, cookie, fetch,
  XHR, WebSocket, beacon, or analytics use was found. `check-invariants` also enforces these tokens.
- **Implemented wipes — clean:** `beforeunload` (`ledger.ts:341–346`), menu Restart/Leave
  (`gameMenu.ts:205–228`), OS Leave (`os.ts:2462–2473`), and pre-fiction Leave
  (`orientingCard.ts:281–296`) all call `wipeLedger`; it replaces the complete ledger with `fresh()`.
- **Idle doctrine — missing:** `ledger.ts:3–7` promises an idle reset, but no inactivity timer/reset
  exists. **REPORTED.** It takes a specified threshold and centralized termination test; this audit
  does not invent one.
- **FILING silence — clean:** Tape C hard-returns before filing and never sets `tape-played`
  (`tapes.ts:118–138`); Malta open/reply writes no ledger (`graceQueueLite.ts:552–575`); playing
  Noa's video only changes playback state (`graceQueueLite.ts:506–513`); FloppySheep imports no
  ledger and comments explicitly file only deployed templates (`graceQueueLite.ts:713–728`).
  TRANSCENDANCE/the ball is absent, so it cannot file. No violation found.

## B4 · Data schema drift

### B4.1 — `paths.json` is dropped before runtime

- **What:** `spine.ts:2–6` and `data/paths.json:4` assert that composition lives in data and the spine
  walks built beats. `spine.ts` imports only ledger/types and implements a hard-coded switch. Current
  data still marks built diary/glitch/E4 finale false and s3/s4 true without expressing their
  inaccessibility.
- **How found:** traced every JSON import, then compared path flags to concrete modules.
- **Verdict:** **REPORTED.** Consume and validate it end-to-end, or demote it from composition/build
  truth. Do not keep both representations authoritative.

### B4.2 — active `_doc` build-state fields can lie

- **What:** `s1_guide.json:2` still points at a tape session as future work; the previous
  `s4_update.json` trigger note said no send beat fires despite E2 wiring (corrected in §0). These
  fields are read by maintainers but have no expiry/check.
- **How found:** searched all active data `_doc` strings for “awaiting”, “not built”, “latent”, and
  named sessions, then compared code.
- **Verdict:** **REPORTED; one false claim FIXED.** Add structured build-state metadata or lint named
  sessions/symbols; prose `_doc` is not a reliable schema boundary.

No new `modelScale`/prefill/replace-versus-merge-shaped field loss was found in the current room fold,
E4 bridge, ledger initialization, or canvas data consumers. That suspected fault class was clean.

---

# PART C · THE BUGS THAT KEEP COMING BACK

**Part C summary:** S80 removed yaw from picking, but global yaw still corrupts seat-relative flip,
witness crossing, and keyboard routing; flat remains a review-tool gap; console-assert zero can be
checked, general console-error zero cannot.

## C1 · Every remaining yaw-for-place/facing comparison

| Location | What the yaw answers | Verdict |
|---|---|---|
| `app.ts:1000–1021` | room from camera **position**; optional “turned to record” annotation from `angDist(camYaw,180)` | **Room lookup correct.** Annotation is only facing, not place; boundary remains globally framed. |
| `app.ts:1865–1876` `isBackYaw()` | whether witness hemisphere is crossed | **SAME CLASS AGAIN at side seats.** Desktop uses absolute 90°…270°, so a small turn from a 90° seat can count as the bodily crossing. XR/gyro use camera forward, which is better but still not explicitly seat/witness-relative. Authored seat evidence: `data/room/nodes.json:20–45`. |
| `app.ts:1902–1911` `doFlip()` | destination of the ~180° assist | **NEW BUG.** Absolute target 0° or 180° means 90°→180° and 270°→180° are only 90° turns. Found by enumerating `data/room/nodes.json:20–45` and applying the function's formula. |
| `app.ts:2313–2317` | swallow keyboard while `facingBack` | **KNOWN OPEN, SAME CLASS.** The global classification can discard keys at side seats. |
| E4 shell `setLook(deltaDeg)` | delta from worn authored pose | **CORRECT HERE.** It measures a relative turn, not a place. |
| `movementNodes.available(..., seatYaw)` | current movement node | **CORRECT HERE.** `seatYaw` is a node identity selected by an explicit seat cut/request, not inferred from look yaw. Device nodes retain explicit ids/poses. |
| `recentreView()` | current authored pose | **CORRECTED/CLEAN.** Uses `seatNodeId` and node pose before falling back to room seat (`app.ts:1786–1800`). |
| `flat.ts` `facingBack` | explicit two-state review flip | **CORRECT HERE.** It is toggled by the flip action, not inferred from global yaw. |

- **Verdict:** **REPORTED.** Define witness/back as a relation between current seat forward (or the
  witness plane) and current look; implement flip as current look + 180°, with per-seat × per-mode
  tests. This changes signature movement and therefore was not fixed in an audit.

## C2 · `?flat=1` review-tool gap

- **Framing:** this is a tooling gap, not a broken audience path. Browser 3D is the audience fallback.
- **What:** `src/flat/flat.ts` creates only `DesktopOS`/WitnessCanvas and its own two-state flip. It
  mounts neither the narrative spine nor debug panel nor Room 2 devices. It cannot expose E3's device
  surfaces or seed E4. Its pointer path also dispatches on `pointerdown` (`flat.ts:101–108`) rather
  than the 3D path's 10 px / 1.2 s release contract (`app.ts:2231–2251`).
- **How found:** compared entry-point construction and input listeners, rather than loading flat.
- **Verdict:** **REPORTED.** Scope: add an explicit era/beat review controller; provide canvas-only
  hosts for E3 devices and E4 shell; mount the debug panel or equivalent review controls; decide
  whether S80 release semantics are part of flat interaction review. Then needs a visual pass.

## C3 · send legs previously classified as wholly latent

- **Static confirmation:** failing s3/s4 remain ordinary-path inaccessible because the E3 CRT is
  black. The failing s2 leg is ordinary-path reachable after s1 resolves in E2. The grouped send run
  remains over 75 draw calls (78); s2 measures 6.874 m/s and s3/s4 4.420 m/s.
- **Correction:** the underlying runtime and one failing leg are not latent; see A1/B1.
- **Verdict:** **REPORTED, NOT FIXED.** The ratchet exclusion, comfort values, timing, and content are
  unchanged. Whoever wires/certifies the first send beat owns both failures.

## C4 · console assertions/errors

- **Eight `terminalFrame` asserts:** the source regression scan is clean; the audit baseline remains
  zero. Final command results are recorded in §D.
- **General console errors:** **NOT ESTABLISHED.** All three `shots.mjs` page listeners only retain
  text matching `/ASSERT|Invalid batch/i`; `openPage` also records `pageerror`
  (`tools/shots.mjs:500–508,721,856`). A plain `console.error('x')` is discarded.
- **Verdict:** **REPORTED.** Capture `m.type() === 'error'` in every listener and give console errors
  their own zero baseline. This requires no visual judgment.

## C5 · bugs not named in the prompt

1. **Flip can be 90° from side-room seats** — found by enumerating authored seat yaws through
   `doFlip()`; reported in C1.
2. **E2 sends are ordinary-path reachable despite “latent” classification** — found by following the
   callback chain in both directions; reported in A1/B1/C3.
3. **Console-zero assertion ignores ordinary console errors** — found by inspecting the listener's
   predicate; reported in C4.
4. **Idle wipe path does not exist** — found by enumerating all `wipeLedger` callers and then searching
   for an inactivity controller; reported in B3.
5. **Close report's cap was stale (28 versus 32)** — found by comparing tool constant to engine slice;
   **FIXED** in §0.
6. **Room geometry audit reports 70 flags** — 14/11/23/22 across r1–r4, including the recurring
   `terminalFrame` surface contact in r1–r3, furniture/clothing overlaps, unsupported-object reports,
   and authored-versus-mesh scale differences. Found by the requested `npm run audit` L2 pass.
   **REPORTED, not called a proved visual defect:** `room-audit.mjs` explicitly reports geometric
   judgement candidates, and resolving them needs a visual pass at each named seat/era.
7. **The blank-frame metric retained one candidate:** `seat-r1-turned` in E4 measured 64% flat tiles
   against the 60% flag line. It remains at the existing ratchet of one, so this is not a new
   threshold regression. **REPORTED; needs a visual pass.** The six desk subjects reported below
   frame were explicitly marked “expected — S71 P3” by the tool and are not restated as new bugs.

---

## D · Verification record

Acceptance is command-only. No visual verification is claimed.

- `npx tsc --noEmit`: **PASS**
- `npm test`: **PASS** — invariants, four room folds, dossier schema, three-hero budget, palette
  33/33, document headers/supersession/KILLS, all 63 debug ids, marker leaks, and C8 all green.
- `npm run build`: **PASS** — TypeScript + production Vite build; pre-existing chunk-size warning only.
- `npm run audit`: **EXPECTED FAIL (exit 1), exactly three retained comfort legs:** s2 6.874 m/s /
  140.59°/s; s3 and s4 4.420 m/s / 70.30°/s. Draw calls: 68 entrance, 39 E1→E2, 57 E2→E3,
  62 E3→E4, 78 grouped sends. Console asserts: **0**. Assertion 6: **NOT BUILT**. Its generic
  console-error probe limitation remains C4. No output image was visually inspected.
- live-doc local-link resolver: **PASS — 0 broken targets**
- runtime storage/network source scan: **PASS — none found**

## E · What this audit did not complete

- No visual, phone, tablet, or headset pass; the headless diagnostic's output images were not
  inspected, and every finding that needs eyes says so.
- No qualitative narrative/register/tone judgment and no survivor-adjacent text revision.
- No decision about which side of a live-doc contradiction should become canon; dates and both sides
  are reported.
- No automated ordinary-path traversal was built. B1 is a static state-machine trace; assertion 6
  remains an explicitly required implementation.
- No source was verified or status-promoted. The census measures debt; it does not retire it.
