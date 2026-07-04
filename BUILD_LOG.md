# BUILD_LOG

- 2026-06-12 — repo scaffolded (Vite + TS + PlayCanvas npm; boot screen; CI invariants). Tool: Claude Code (Claude Fable 5).
- 2026-06-12 — Vertical slice v1: warning → boot → name → desktop → mIRC + MentorRob DM → log toast → flip (F2/⟲, dead controls, computed INTAKE RECORD) → dossier card #1. Verified end-to-end in browser preview. Bug found+fixed: 'f' flip shortcut hijacked typing → moved to F2. Asset strategy: no Aseprite (docs/ASSET_STRATEGY.md). Tool: Claude Code (Claude Fable 5).
- 2026-06-12 — OS splash phase added (BIOS → PHASE/2 95 loading screen → name); render scale ×3 (logical 512×288, backing 1536×864) for VR text legibility. Verified visually. Skills installed by Sérgio: playcanvas-engine + aframe-webxr (claude-design-skillstack plugin cache) — references for the room/XR milestone.

## 2026-06-12 — Era-1 logic + the room blockout + ?flat=1
- docs/ERA1_LOGIC_v1.md: the era's iterable script — beats S1.0–S1.9
  (insert kit → tape → go online → channel → flip → escalation → packet →
  suspension), object logic table, room requirements, data architecture.
  Camp ending staged as administrative violence (approved by Sérgio):
  packet → screen powers down → `profile suspended — enrolled`.
- data/room/era1.json: full room layout (70+ props, 5 lights) — editable
  numbers, hot-reloads; src/room/era1room.ts builds flat-shaded boxes
  (v0.7 aesthetic law: flat low-poly, pixel art on screens only).
- src/engine/app.ts: meters scale (CRT screen 0.40×0.225 at origin, eye at
  0.7m), drag-to-look off-monitor (yaw ±110°, pitch ±55°; the flip stays
  the meaningful act), warm/cold light grammar, CSS vignette (taste call:
  no particles), witness side = oversized sharp repository wall (1.8×1.0m)
  in the dark back-of-house with filing furniture.
- src/flat/flat.ts + main.ts: `?flat=1` universal fallback — desktop canvas
  alone, no WebGL; same ledger/flip/dossier grammar (Codex Gap C closed).
- Verified in preview: warning→BIOS→splash→name on the in-room CRT, drag
  both directions (kit envelope visible on desk pre-S1.2), F2 flip to the
  intake wall, ESC return, flat mode. npm test (invariants) + build clean.

## 2026-06-12 — Round 9: Sérgio's playtest notes applied (verified in preview)
- Era-1 canvas → 4:3 (512×384), CRT casing rebuilt squarish with FLUSH
  bezels — the cut text he reported was bezel overlap. IRC window enlarged
  for 4:3; chat lines clip with … before the nick list (measureText).
- S1.0 power-on beat: warning → 'off' phase (dark glass, DOM hint, no blur
  per Sérgio) → clickable power button on the CRT (ray test) / dark glass /
  Enter → BIOS, which now ends NEW OPERATING SYSTEM FOUND / INSTALLING
  PHASE/2 95 (TM) / "EVERY PHASE PASSES." (⚑ tagline placeholder). Boot
  lines moved from code into data/strings/slice.json (Codex Gap A).
- Free mouse look: yaw unclamped — you can turn to the witness side by
  dragging; crossing the hemisphere does the filing bookkeeping however you
  got there; ⟲/F2 is now an assist tween. Pitch ±55°.
- Witness wall dormant ("· · ·" in the dark) until the first record exists
  (interim: mirc-log; moves to kit-inserted with S1.2).
- Room enlarged (~4.3×4.4m), chair back lowered out of view, bed/shelf/
  door/witness furniture repositioned.
- ERA1_LOGIC_v1 §6.5 added: the poster conversion (queer pop poster swaps
  to religious imagery mid-era — the room itself gets converted).
- Verified: 4:3 warning uncut → off+hint → power click → boot → name →
  desktop → manual 180° drag shows DORMANT wall → chat+DM → flip shows
  ACTIVE record (2 messages, pastoral-referral). Build + invariants clean.

## 2026-06-12 — Round 10: the Starter Kit (S1.1–S1.6 live)
- data/dialog/s1_kit.json: the kit's full content — Morning Light
  Fellowship "FIRST STEPS" companion disk v1.2 (⚑ composite name, verify;
  ⚑ all copy draft): autorun, 5 booklet pages (welcome / naming the
  struggle / first steps / the prayer subtitled / you are not alone),
  hymn.mid indicator, dial sequence. Period vocabulary researched live
  ("struggler"/"SSA" = 1997; "unwanted SSA" reserved for later eras —
  the rebrand becomes playable).
- src/desktop/apps/kit.ts: KitApp (autorun → pages → dialing); Enter
  advances; CONNECT NOW → modem dial → the OS opens the channel.
- os.ts: desktop now starts EMPTY (kit is the only way in); A:\ icon +
  desk toast; insertKit() (3D floppy click or icon); kit→irc chaining;
  mIRC icon only exists after the kit routes you.
- engine: clicking the physical floppy on the desk inserts it (ray test)
  and the disk vanishes from the desk into the drive.
- irc: DM arrives BY NAME and for lurkers (28s timer; 2 messages pulls
  it earlier). New ambient line ties the booklet into channel speech.
- witness: wakes at kit INSERT (not chat); new fields — SOURCE: starter
  kit v1.2 — postal placement; TRUSTED CONTACT: assigned → MentorRob —
  contact established; CHANNEL LOG: subject not yet online → N message(s).
- Verified end-to-end in preview incl. the two money shots: mid-kit flip
  (system already waiting, subject not yet online) and post-DM flip with
  0 messages on file. Build + invariants clean.

## 2026-06-12 — Round 11b: mIRC flow, afterplay, brochure (preview fixes)
- irc.ts rewritten: TypeStream types lines char-by-char (~30 cps) with pauses;
  word-WRAP with hanging indent (no more cut text); structured rows + shared
  renderer (channel + DM). Rob's DM segmented into 7 short beats. Verified in
  flat mode: lines unfold naturally, long lines wrap.
- Afterplay: after the log toast, a second toast "Record filed. (see reverse)"
  fires ~7s later; os.hasUnseenWitness drives a COLD peripheral creep
  (engine: bluish edge layer pulsing) until the player turns; turning calls
  os.markWitnessSeen(). Gives a diegetic reason to look back (Sérgio).
- Brochure: kit prop reshaped to a tri-fold brochure holding the floppy; desk
  toast now diegetic ("The brochure on your desk says: insert the enclosed
  disk to begin.").
- Names propagated: UN-WALK — TriedPath Fellowship (verified on the kit window).
- Era 2/3/4 notes captured (MOODBOARD_ERA2: gay-man-first rationale, palette
  = era-resonance not desaturation, 410prod PSX monitor preferred CC-BY +
  no-style-mixing, Clippy-assistant, Era3=2010 YouTube/lesbian, Era4 trans +
  LGB-anti-trans critical angle). Analysis prompt for external model added.

## 2026-06-12 — Round 11c: pacing, brochure legibility, cold-creep bugfix, ending content
- Pacing (Sérgio: too fast, ESL audience): IRC TYPE_CPS 30→17, HOLD_DM 1.1→3.2,
  HOLD_CHANNEL 0.8→1.8; boot crawl 0.018→0.030 s/char + 4.8s hold; splash
  2.8→4.6s. Reading time, not speed.
- Brochure rebuilt to READ as a leaflet: tri-fold sheet w/ fold lines, teal
  cover band + title + motif, 3 instruction text-strips, a pocket flap, and
  the floppy with a metal shutter + label in the pocket. Verified in 3D
  (looks like a pamphlet + disk now). KIT_FLOPPY ray target + hide-list updated.
- Cold-creep BUGFIX: it had a CSS `transition: opacity 0.6s` fighting the
  per-frame pulse, so it never reached visible opacity ("didn't work" — Sérgio
  was right). Removed the transition; strengthened to 0.30–0.80 pulse, more
  saturated. Resets cleanly when facing back.
- Verified files: preview pinned to canonical repo; no active duplicate dirs
  (only backups). Brochure was rendering all along — it was a legibility issue.
- s1_end.json authored (approved ending content: escalation+chips, packet,
  diary, EULA, changelog) — ready to wire next turn.
- ChatGPT 5.5 analysis integrated into MOODBOARD_ERA2 (gay-male-emblem precise;
  lesbians disciplined via 'female masculinity'; app=Google/Living Hope 2019 →
  Era 3; Era 2 assistant = desktop accountability sw; finale = EU 2027
  Recommendation non-binding, confirmed).
- 2026-07-02 — Reinterp Session 0: created isolated `reinterp` worktree, synced reinterp docs, installed dependencies there, verified `npm test`, `npm run build`, and HTTP 200 for `/` plus `/?flat=1&reinterp=1`.
- 2026-07-02 — Reinterp Session 1/R0: added `?reinterp=1` mount flag, flag-only debug marker/data hook, `data/provotypes/_schema.json`, and `data/panels/`; verified tests, build, flagged flat preview, and no-flag baselines.
- 2026-07-02 — Reinterp Session 2/R1: provotype framework (`src/desktop/apps/provotype.ts`) — data-driven invitation→frame→vignette(states)→dossier-grade debrief, fixed Leave/Pause every phase, no score/streak/timer, felt lines bare, ledger+witness file both completion and abandonment; `_schema.json` extended (invitation/frame/states/debrief/sources[status+confidence]/ledgerTags/witness + `cuts`); `_dummy.json` scaffold (PLACEHOLDER); reinterp-gated launcher wired into `DesktopOS`; `data/strings/reinterp.json` chrome. Verified: `npm test` + `npm run build` green; full round-trip in `?flat=1&reinterp=1` (invitation→3 states→debrief→close→witness "session: completed · outcome: none" + `provotype:dummy` classification); no-flag baseline shows no marker/launcher, console clean; 44 headless assertions against the real bundled source (round-trip, abandonment, pause, OS wiring, baseline non-regression). All copy PLACEHOLDER.
- 2026-07-03 — Parallel R9-4 Lamby rig prototype: added standalone `?lambyrig=1` procedural canvas route (`src/lambyrig/lambyRig.ts` + `data/strings/lamby_rig.json`), with idle/blink/point/appear/disappear + cheerful/clinical/sterile moods; verdict logged: procedural recommended for first OS-guide pass, sprites reserved for high-authored close-up/transformation beats. Verified screenshots, click proof, `/` + `/?flat=1` baselines, `npm test`, and `npm run build`.
- 2026-07-03 — Reinterp Session 3/R2: the pillow provotype ("Somatic Reprocessing", `data/provotypes/pillow.json`) — proxy framing (player authorises/advances, Daniel keeps `felt`), Lift/Exhale/Strike click-confirm cycles ×3 (escalating interpretation, restrained low-poly pose on Daniel's side, no swing satisfaction), Repeat/Finish decision each cycle, unwinnable terminal loop ("Continue until the deeper layer arrives" — Repeat past cycle 3 changes nothing further), provenance card (Cohen/WaPo/GLAAD documentary, JONAH documentary, APA/UK-MoU documentary, "until deeper feelings emerge" flagged speculative and omitted as fact). Framework addition (§R8-5): `states[].choices[]` — per-choice `ledgerTag` + optional per-choice `response` + optional `goto` (state index or `"debrief"`), registering without narrative branching. Fixed a debrief-window overflow bug found in testing (4-source provenance card clipped behind the fixed Leave/Pause row) by growing the window height within the taskbar bound and tightening line spacing. Verified: `npm test` + `npm run build` green; full playthrough at `?flat=1&reinterp=1` on a dedicated worktree dev server (port 5174) — invitation → 3 escalating cycles → Repeat-changes-nothing terminal loop confirmed idempotent → Finish → provenance card (all 4 sources visible) → clean exit to desktop; Leave verified mid-cycle (abandonment); no-flag `?flat=1` baseline unchanged (no marker, no Session icon); console clean. All copy PLACEHOLDER (`_doc` flags + G6 ethics gate pending).
- 2026-07-03 — Reinterp Session 3-revision: pillow embodiment fixes per `docs/REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS_2026-07-03.md` §4, scope-fenced to `provotype.ts`/`pillow.json`/`reinterp.json` (ledger/witness filing, proxy framing, density law untouched). Room/environment presence for the vignette (new `drawRoomBackdrop` + `drawOverlayPanel`, ordinary chrome kept for invitation/frame/debrief); Daniel's `felt` line now gets its own dedicated screen (new `feltRevealed` state) instead of rendering under the system's response paragraph; one grounding stakes-line added to the frame text (who "Dad" is, why today); new `close` phase (Phase union + `Provotype.close`) inserts a near-wordless felt-register beat between the vignette's end and the sourced debrief, all four cycle Repeat/Finish `goto:"debrief"` re-routed to `goto:"close"`. Verified: `npm test` + `npm run build` green; full playthrough at `?flat=1&reinterp=1` (added the missing `reinterp-dev` port-5174 launch config to the session root, per the prior session's flagged gap); before/after screenshots captured via a `git stash`/`stash pop` round-trip against the shipped R2 code. `_schema.json` intentionally not updated (out of scope; confirmed no runtime validator reads it). All copy still PLACEHOLDER; no ethics/creative calls made.
- 2026-07-03 — Reinterp Session 4/R4: the Origin Story Intake ('97, Era 1, `data/provotypes/origin_intake_e1.json`), built on the revised room-presence/felt-beat/close-phase grammar (commit 607a542) — `provotype.ts` unchanged. Five-question 1997 family intake administered by Mom (G7: minor + adult-administered, kept explicit, never softened into Daniel's own choice), delivered via the established TriedPath Fellowship/Un-Walk canon; two verbatim van den Aardweg 1997 Anamnestic Questionnaire quotes, one flagged paraphrase (childhood play), and the archive §R2-4 merge of the conformity-drill items (walk/talk/sit, "healthy friendship" logging) into the same instrument. Choices tag the ledger but never override the shared response, so every answer files identically — the silence failure shape made mechanical. Terminal line auto-reveals "Recommendation: further support recommended" regardless of input; close beat before the debrief. Debrief: 4 sources (van den Aardweg documentary/high, Love Won Out documentary/medium, Guay/Flentje et al. 2013 documentary/medium, APA no-evidence documentary/high), all `[VERIFY SOURCE]`. Added a second desktop launcher icon ("Family Form") and generalized `openProvotype()` in `os.ts` so both provotypes coexist on the one Era-1 desktop that exists in code today. Bug found and fixed in verification: an early 5-source/verbose-confidence debrief draft overflowed the fixed window (same category as Session 3's bug) — fixed by merging/trimming source text to the pillow's terse style, no code change. Verified: `npm test` + `npm run build` green; full playthrough at `?flat=1&reinterp=1` on the worktree's dev server (port 5174) — invitation → all 5 questions (both felt beats confirmed) → silence terminal → close → 4-source debrief fitting cleanly → Return; no-flag `?flat=1` baseline unchanged, console clean. All copy PLACEHOLDER (`_doc` + G6/G7 ethics gates pending). Built out of queue order per explicit session instruction, authorized by master plan Round 14 (§R14-1, R4/R5/R6 unpaused independent of the R7/pillow track).
- 2026-07-04 — Reinterp Session 5/OP-1: opening beats O1–O3 behind `?reinterp=1`, in the 3D room (docs/REINTERP_OPENING_AND_FLOW_SPEC_2026-07-03.md §1, §0-REV binding). O1 start screen is a non-diegetic DOM overlay (`src/desktop/opening.ts`) laid over the window-lit E1 room (monitor dark): logo placeholder slot, disclaimer (4s arm before Continue), platform select (browser/VR) + auto-cam/conducted toggle, Leave working from the first frame; drag/arrows look around behind it. O2 (Continue): room lights on + desk-lamp symbolic over-throw, framed camera pans establishing→desk (conducted & uninterruptible under auto-cam ON; the default framing the player can drag away from under OFF), LambyOS "made for you" boot on the monitor. O3 on the monitor: name pre-filled ("Daniel", never typed), pixel-icon grid, three get-to-know-you chips, one insisted goal (no neutral option + a decline that files too), then the profile-complete screen re-captioning every pick in system categories (diary→"self-monitoring: enabled", etc.); picks → in-memory ledger tags `profile:icon|chip|goal:*`; identical routing (Enter → shipped desktop) regardless of picks. §0-REV-5 browser CAMERA controls added (arrows + R reset + F flip), reinterp-gated, camera-only, suppressed while a phase captures typed text. New DesktopOS phases r_dark/r_boot/r_profile/r_recap; all opening copy in `data/strings/opening.json` (PLACEHOLDER). Verified: `npm test` + `npm run build` green (pre-existing chunk-size warning only); full O1→O3→desktop playthrough IN THE 3D BROWSER VIEW (worktree dev server :5174) with screenshots of start screen, options (platform/auto-cam), boot, profile/chips, and re-caption; auto-cam ON (conducted dock) and OFF (drag interrupts) both confirmed; keyboard drag/arrows/R-reset confirmed; Leave-from-disclaimer wipes and shows the exit note; `?flat=1&reinterp=1` shows the opening on the canvas alone (fallback intact); `?flat=1` and no-flag `/` baselines unchanged (shipped warning, no overlay, no `data-reinterp`, default lighting). All new code reinterp-gated; O4 Lamby + O5–O8 + VR-specific paths out of scope. Copy PLACEHOLDER (Sérgio voice pass pending); one FABLE-ROUND question logged (chip/goal/icon final set + pre-filled name).
- 2026-07-04 — Reinterp Session 6: fluid trans niche GREYBOX behind ?reinterp=1, in the 3D room (docs/REINTERP_FLUID_TRANS_ROOM_GEOMETRY_2026-07-03.md — built exactly its proposal). ONE shallow alcove on the ±110° rear-lateral arc (chose -110°, east wall, in the clear gap between the shelf and door), holding THREE facet stations at EQUAL fidelity (transfem/transmasc/nonbinary — the Round-16 de-gate: no greybox-until-consult split). Facets are STATES of one volume (§1.1): the player turns once, the facet resolves in place. Quest discipline (§4.3): the three stations SHARE the box mesh and just TWO station skins — a fog "unresolved silhouette" (greyDark) and a hero "resolved/lit" (silver emissive) — swapped by material reference on foreground, plus one small warm omni per station toggled on; never a spawn. New src/room/fluidNiche.ts (builder + setFacet controller = the send/gaze seam, DATA-STUBBED this session) + data/room/fluid_niche.json (per-era facet tables E1–E4: default/convergence/weights + hero-slot ids + pull{gaze,sends} stubs; NO `gated` field; niche anchor). ?facet=tw|tm|nb|all debug override wired through main.ts → app.ts (reinterp+3D only); E1 default = near-dark 'none'. Draw-call cost: +8 box meshes (5 structural: backing/lintel/sill/2 jambs + 3 stations), 3 shared materials (1 structural tealDark + fog + hero, meeting §4.3's "two station skins + one structural"), 3 omni facet-lights (off until foregrounded, not draw calls). No witness/ceiling/desktop-canvas/copy/cross-cluster work (send interface stubbed only); file fence honored (provotypes/, provotype.ts, reinterp.json untouched). Verified: npm test + npm run build green (pre-existing chunk-size warning only); all five states driven IN THE 3D BROWSER VIEW (drag+arrow-key look, not ?flat=1) with screenshots — none (3 dark fog), tw (left lit), tm (middle lit), nb (right lit), all (3-hero convergence triptych); no-flag `/` baseline shows the east wall bare (no niche, data-reinterp null) and ?flat=1 shows the unchanged shipped warning, console clean on both. Doc set already current (last session's sync pulled the de-gated geometry doc) — no sync commit needed. All hero-slot ids PLACEHOLDER. One open item → FABLE ROUND: the niche's exact placement is provisional (greybox against existing props); §5 open questions (azimuth ±110 vs ±70, convergence readability, gaze-pull gamification) remain headset/Sérgio calls.
- 2026-07-04 — Reinterp Session 7: E1 room STYLE PASS behind ?reinterp=1 (REINTERP_3D_STYLE_DIRECTION_2026-07-04.md §2-E1; visuals only, no new content/props/mechanics). (1) TWO-TEMPERATURE RIG (§2-E1, in src/engine/app.ts): rebalanced the existing room lights (era1.json hues kept — rebalanced, never invented) into warm-dominant ~70/30 — O2 `applyLightsOn` now widens the lamp's amber pool over the WHOLE room (intensity 2.9, range 3.4→5.6, faked with falloff, no shadows), warm roomFill (0.85), the monitor's screenGlow as the only true cold INTERIOR source (0.32), a soft moon-blue window wash (moonlight 0.14), and the cold rear dimmed (witnessCold 0.9→0.50) so the front stays warm; O1 `applyWindowLight` is the pre-power moon-wash alone; reinterp ambient warmed (0.17,0.14,0.11). (2) MATERIAL SPLIT (§1 rule 2, in src/room/era1room.ts, new `reinterp` param): per-prop classify+treat — hero (crt*/kit*) crisp/true + faint self-emissive so it stays the most-defined thing; system (tower/keyboard/mouse/modem) color-true; personal (bed/posters/tape deck/books/rug/curtains) muted — desaturated, warm-nudged, darkened so edges don't fully resolve; fog (soda can/homework pile) muted hardest; set (desk/shelf/door/chair/shell) left true; emissive props (window/moon/LEDs/lampshade) untouched. Vertex-color/flat only, no textures (literal larger bevels deferred to V2 — softness expressed as colour). (3) HERO/SET/FOG per §2-E1. (4) NICHE cold sliver: unchanged from Session 6 — the tealDark recess reads clearly as draft-under-a-door against the newly-warmed wall WITHOUT any added relight, so no niche light was added (near-dark E1 state intact). Light count: 5 room lights (2 warm-dominant + 3 cool accents) + 3 dormant niche facet-lights (off in E1) = 8, unchanged (no new lights). Draw calls: 86 room props + 8 niche + 2 screens = 96, UNCHANGED (material/light-only pass, zero new geometry). Verified: npm test + npm run build green (pre-existing chunk warning only); walked O1→O2 in the 3D browser view (drag+arrow look) with screenshots — O1 window-light establishing (cool moon wash, cozy-dark not horror-dark), O2 desk under the amber lamp pool with the cool moon window above (two temps in one frame), soft-vs-crisp (muted posters + crisp tower; crisp CRT/tower/modem vs muted soda/homework), the niche's cold teal sliver against the warm wall; no-flag `/` baseline unchanged (posters un-muted, default lighting, data-reinterp null) and ?flat=1 unchanged; console clean. All changes reinterp-gated. FILE FENCE honored (provotypes/, provotype.ts, reinterp.json untouched). → FABLE ROUND (Sérgio judges by eye): the exact 70/30 warmth balance, whether the lamp pool is a touch hot on the near west wall, and whether the material-mute amounts read "soft" enough or want literal beveled geometry in V2.
