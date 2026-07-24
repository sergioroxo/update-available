# THE NARRATIVE MASTER SCRIPT — beat map + the guide (v1)
STATUS: superseded-by docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md

*2026-07-04 · Fable 5 (design author). The story spine of the reinterpreted experience: every beat per
era, every cross-cluster send, where each built mechanic lands, what each update ritual means
dramatically, and every beat tagged for the two cuts. The assistant-as-guide spec is §2 of THIS doc —
the guide is the narrative's delivery mechanism, designed with it, per Sérgio's Round-19 instruction.
Everything else (OP-2, V2, R5, remaining builds) implements this document.*

*ALL display copy in this doc is PLACEHOLDER register-demonstration. Sérgio owns every survivor-adjacent
line, all dossier wording, and each ◆ decision. Companion docs this round:
[REINTERP_TRANSITION_CHOREOGRAPHY_2026-07-04.md](REINTERP_TRANSITION_CHOREOGRAPHY_2026-07-04.md) ·
[REINTERP_WITNESS_TERMINAL_DRAMATURGY_2026-07-04.md](REINTERP_WITNESS_TERMINAL_DRAMATURGY_2026-07-04.md).
Grounding: R6-1 alcove grid, R8-1 flow model, the era-vision doc, the fluid-room geometry doc, the
Opening & Flow spec, shipped `s1_end.json` (diary-glitch ending), Sessions 5–9 as built.*

---

## 0. Reading rules

- **Beat ids** are `eN.bNN_slug` (opening `o.bN`, close `x.bN`, sends `sN`). These are the ids
  `data/paths.json` composes cuts from (R3-4: nothing hardcoded; sequences are data).
- **Tags:** `FEST` (in the Festival cut) · `FULL` (Full cut) · `SIDE` (optional side-quest, Full only).
  A beat can carry a `-short` variant for Festival (same beat, tighter interior).
- **Register** per scene law: `operable | felt | respite`. The guide NEVER appears in `felt`.
- **Choices register, never branch** (Thought Audit law). A send is not a fork: it is a *summons*. What
  varies is only what the record shows you did with it.
- **The frame never plays.** Every demand below is diegetic — the OS's voice, the guide's voice, a
  ministry's paper. No quest popups, no scores.

## 1. The spine in one page

**One screen → one room → a cluster → all rooms → the network.** (R8-1.)

| Act | Year · lead | The era's sentence | The apparatus's shape | The update's dramatic meaning |
|---|---|---|---|---|
| O | — | You consent to controls; the system consents to nothing. | a boot screen that knows you | — |
| E1 | 1997 · Daniel, 15 | The room is the whole world. | mailed paper + one modem | **T1: the network arrives** — the same room opens; you learn you were never the only file |
| E2 | 2003 · Daniel, 21 | The network is an office. | programs, webcams, accountability | **T2: the rebrand** — the flagship collapses; your file survives the company that made it |
| E3 | 2016 · Vera | The platform is pleasant. | pastel sorting, testimony polish | **T3: the dissolve** — the rooms stop being rooms; the feed moves in |
| E4 | now · Maya | The interface is the room. | ambient AI, funnel, purity tech | **Close: the inversion** — restart as you are; the record becomes the community's constellation |

The radial space is a story because of the **sends** (§4): the lead room keeps summoning you into the
other identities' bays because the attacks *shared infrastructure* — and every time you come back
carrying something, the witness terminal cross-references two files. By E4 the terminal shows one mesh.
That mesh, inverted warm, is the Close.

## 2. THE GUIDE — assistant-as-guide spec (the delivery mechanism)

### 2.1 Lineage and names (R10 locked: Lamby variants per era)

| Era | Name | Form | Voice register (arc: friendlier surface, sharper demand) |
|---|---|---|---|
| E1 | **Lambert** (LOCKED — Sérgio, Round 20) | static pixel mascot on TriedPath paper + one OS corner sprite | formal, mail-order, slightly liturgical: "Lambert will accompany your walk." |
| E2 | **Lamby** | the procedural rig (Codex verdict: procedural ambient, sprites for authored transformation beats) | chipper, possessive, Clippy-cadence: "I've set everything up for us!" |
| E3 | **Lambient** | flat pastel blob, softly animated, lowercase UI | wellness-smooth, passive-voice demands: "your story is almost ready to be shared" |
| E4 | **"L"** (LOCKED — Sérgio, Round 20; hyper-minimal, replaces the Echo candidate) | no body — a single letterform glint inside every interface | ambient imperative, whisper-length: "left it open for you. — L" |

**The arc (locked): Lambert → Lamby → Lambient → L.** The thesis performed by *diminutive*: a
Sunday-best name in '97, a pet name in '03, a vibe in '16 — and by the present the name has eroded to
a single letter, the way the body eroded to a glint. Sérgio's "L" is the stronger close: the apparatus
ends the piece too minimal to accuse. The naming ritual (R11) applies to all four.

### 2.2 What the guide does (owns) and never does (laws)

**Owns:** task issuance (the graying task is *asked for*, e1.b05) · **every send** (§4 — the guide is
how the system routes you; guidance itself dramatizes coercion, R1) · ritual announcements (T1–T3
notifications are delivered in the guide's voice before the OS takes over) · the profile recap echo
(it quotes your O3 chips back at the worst moments — the selection criterion made audible).

**Never:** appears in `felt` beats · jokes at the victim · delivers Dossier text (documentary record
stays on dossier/terminal surfaces) · blocks or delays dismissal · survives the Close (the Close has
no guide — `felt`, the law already says so).

**Dismissal dramaturgy:** dismissal always works, instantly, mid-line. The guide returns only at the
next beat boundary. Every dismissal is filed (`ledger.assistant.dismissals`) and surfaces on the
terminal re-captioned ("support declined ×3") — the coercion is *visible in the record*, never punished
in the mechanics. Dismissing the guide before a send leaves the send available as a quiet glow at the
aperture (the summons persists; the salesman doesn't).

**◆G2 — line-budget law revision (open question #3, needs Sérgio's explicit ratification):** the
shipped law is ≤5 lines/stage with the assistant absent Stages 0–1; the reinterp guide is present from
boot (R9 canon revision, already made). Proposed replacement discipline: **≤2 lines per beat, ≤12 lines
per era, silence is the default state.** The guide talks at beat boundaries, never during interaction.

### 2.3 Transformation beats

One authored sprite beat per restart (T1, T2, T3), each ≤10 seconds, on the monitor during reboot:
Lambert's paper texture pixelates into Lamby's bounce (T1); Lamby's mouth smooths away into Lambient's
blob (T2); Lambient thins to a single letterform — "L" — that slides off-screen into the room (T3 —
L is never again *on* the screen; it is *around*). The Tamagotchi-Lamby transformation idea (R9)
lands here.

## 3. THE BEAT MAP

### Act O — the opening (built: OP-1 · spec: Opening & Flow §1)

| id | beat | reg | cut | built? |
|---|---|---|---|---|
| o.b1 | disclaimer over window-lit room; platform + conducted-view choice | frame | FEST FULL | ✅ S5 (+S9 restyle) |
| o.b2 | lights + lamp over-throw; LambyOS boot "made for you"; slow travel to desk | operable | FEST FULL | ✅ S5 (+S9 pacing) |
| o.b3 | profile: pre-filled name, icon, 3 chips, insisted goal → re-caption screen | operable | FEST FULL | ✅ S5 |
| o.b4 | login: the guide already installed, mid-greeting; dismissal works from first frame | operable | FEST FULL | OP-2 |
| o.b5 | beginner panel — the piece's only non-diegetic paragraph (3/4 people, perspectives not biography) | frame | FEST FULL | OP-3 |
| o.b6 | E1 tutorial push: dark surround, rotation as the exploration verb | operable | FEST FULL | OP-3 (partial: dark surround ✅ S8/9) |

### Act E1 — 1997 · Daniel, 15 · one lit room (cluster SEALED; no sends — the reveal is the only widening)

| id | beat | reg | cut | mechanics / built |
|---|---|---|---|---|
| e1.b01_kit | the mailed kit on the desk: brochure + floppy (physical-media threshold, F5 canon) | operable | FEST FULL | ✅ shipped |
| e1.b02_install | insert floppy → TriedPath "Un-Walk" installs | operable | FEST FULL | ✅ shipped; **= the O7 trigger** |
| e1.b03_reveal | **the first filing = the first reveal**: ceiling wakes, light-leak seams appear under the walls (there is something beyond them), half-second upward glance | operable | FEST FULL | ✅ S8/S9/S11 |
| e1.b04_irc | #TriedPath, Rob's welcome, the hook | operable | FEST FULL | ✅ shipped |
| e1.b05_intake | **Origin Story Intake** — Mom administers the '97 questionnaire; silence shape | operable | FULL | ✅ S4 (R4) |
| e1.b06_graying | **the graying task**: the guide asks you to FIND apparatus objects (bible, camp brochure, struggler's diary); each find grays a queer prop; **the mixtape resists** (glitch #1) | operable | FEST-short FULL | build R7; demand strength = ◆N1 (open q #11) |
| e1.b07_diary | reading the found diary — the S1.85 truth object; guide absent | **felt** | FEST FULL | shipped (main; drift flag §7) |
| e1.b08_escalation | Rob's turn-by-turn narrowing; replies change only the witness label | operable | FULL (FEST-short) | shipped (main) |
| e1.b09_glitch | the system flags the diary "dangerous," tries to delete it, **fails** — the person's glitch covers the room change | operable→felt edge | FEST FULL | shipped (main) → **T1 trigger** |

*E1 niche state: near-dark `none` — the darkness is the content. The one E1 seed: Rob mentions "the
girls' program" once in e1.b04 (plants the paired track; pays off at s1). No travel in E1.*

### Act E2 — 2003 · Daniel, 21 · the cluster opens (sends begin)

| id | beat | reg | cut | mechanics / built |
|---|---|---|---|---|
| e2.b01_arrival | restart into fluorescent; bays lit; **Lambert→Lamby transformation**; Lamby tours the cluster in 2 lines | operable | FEST FULL | rig ✅ S8; transformation = OP-2 |
| e2.b02_restorify | Restorify onboarding + accountability web | operable | FEST FULL | shipped (main; drift §7) |
| e2.b03_pillow | **the pillow** — proxy compliance, Daniel's felt beat, close, debrief | operable+felt beat | **FEST (the one mandatory provotype)** FULL | ✅ S2/S3 |
| s1 | **SEND: Daniel → west bay (lesbian '03).** Lamby, filing the pillow outcome: "a companion module exists for the women's track." Bay: the Love Won Out tape / *Restoring Sexual Identity* insert (R6-1) — the same conference, translated for entry. Carry-back: the paired-track pamphlet appears on Daniel's desk. Terminal: first **cross-reference** line. | operable | FEST-look FULL | send seam ✅ S8 (occupant table); content = build |
| s2 | **SEND: Daniel → east bay (trans-fem '03).** Accountability escalation: "your pattern matches a severer classification." Transfem facet foregrounds (✅ built table): the "homosexual continuum" counselling diagram — folding, not meeting. Carry-back: a referral slip; `send:continuum`. | operable, played bare at its edge | FULL | facet ✅ S6–S9; content = build |
| e2.b06_webcam | webcam check-ins / the commercial / the MSN thread | operable | FULL SIDE | shipped (main; drift §7) |
| e2.b07_collapse | the accountability web fails publicly (Exodus-collapse analog); TriedPath "sunsets"; your file is "migrated to partner care" | operable | FEST FULL | **T2 trigger** |

### Act E3 — 2016 · Vera · the pleasant platform (the cross-cluster era — both sends are load-bearing)

| id | beat | reg | cut | mechanics / built |
|---|---|---|---|---|
| e3.b01_arrival | room re-dressed as Vera's; **Daniel's boxes visible in the west bay** ("resolved — transferred"); Lamby→**Lambient** | operable | FEST FULL | T2 choreography doc |
| e3.b02_chart | **the Sides A/B/X/Y chart debuts complete** — hero object, both temperatures never touch it yet | operable | FEST FULL | content build; taxonomy guards per R4 (2c) |
| e3.b03_queue | GraceQueue testimony-polish loop | operable | FEST-short FULL | shipped core |
| e3.b04_homework | femininity homework provotype | operable | FULL | R5 — unbuilt |
| s3 | **SEND: Vera → west bay (gay man '16).** In the polish queue she recognizes recycled phrasing → the bay: HOPE 2016 session sheet ("How Transformation Happens" beside "The Father Heart of God"). Carry-back: the sheet; terminal **reopens Daniel's dormant file as "referenced material"** — the piece's continuity punch. | operable | FEST-look FULL | build |
| s4 | **SEND: Vera → east bay — THE DILEMMA (R14 confirmed).** The chart has no cell for her friend: butch/FTM borderland; the misfiled-folder motif; trans-masc facet foregrounds via send (✅ seam). Ends bare. | operable→**felt** close | FEST FULL | facet ✅; copy = voice pass |
| e3.b07_convergence | **all-three triptych** (✅ built): buckets (male/female/**transgender**/parents) beside the completed chart — the sorting instinct staged twice; HOPE audio page plays *about* her, she is absent | **felt** (transfem panel) | FEST FULL | ✅ S6/S8 spotlight; audio asset Sérgio |
| e3.b08_refusal | the queue rejects the one line Vera won't polish (documented failure shape) | operable | FEST FULL | **T3 trigger** |

### Act E4 — now · Maya · interface-lit (the cluster tightens)

| id | beat | reg | cut | mechanics / built |
|---|---|---|---|---|
| e4.b01_turn | restart + **THE TURN** (LOCKED — "let's be bold, we need emotion"): the home facing re-anchors 180° — Maya's desk on the south spine beside the terminal (the person and the record finally share a wall); Lambient→**"L"** | operable | FEST FULL | choreography doc §T3; built S10 |
| e4.b02_funnel | algorithm first, coach second, private group third (E4 spec) | operable | FEST FULL | E4 spec beats |
| e4.b03_purity | west bay: **Restorify's descendant** — purity app with a Lamby-descendant companion (4c confirmed) | operable | FULL SIDE | build |
| e4.b04_phone | east niche: the trans-masc **phone** — dark screen, interactable only if sought (gaze-armed, ✅ `set` tier) | operable | FULL SIDE | facet ✅; copy placeholder |
| e4.b05_planner | Exploratory Care Planner provotype (GETA sample-protocol wording cleared, 2e) | operable | FULL | R6 — unbuilt |
| e4.b06_finale | Maya's escalation → the system tries to overwrite her and **fails** (glitch doctrine, the person survives) | operable→felt | FEST FULL | E4 spec |
| e4.b07_restart | **"Restart as you are."** | felt | FEST FULL | → Close |

### Act X — the Close

| id | beat | reg | cut | built |
|---|---|---|---|---|
| x.b1_lift | the terminal's lines lift off the wall into warm points (terminal doc §W7) | felt | FEST FULL | animate = build; cloud ✅ |
| x.b2_cloud | the constellation: warm nodes / cool web / the knowledge-network labels | felt | FEST FULL | ✅ S8/S9 |
| x.b3_line | the unfinished line ("Conversion therapy continues to affect…") — **surfaced for Sérgio; never completed by any model** (law, open q #10) | frame | FEST FULL | copy = Sérgio only |

## 4. The sends, as a system

One law: **a send is a summons, not a door.** The guide names a reason rooted in the *shared
infrastructure* (referral map, paired curricula, recirculated testimony, the same buckets); the target
bay/facet foregrounds (the built seam); the player turns, reads, returns; a **carry-back** lands
(a physical page on the lead desk + a ledger tag + a terminal cross-reference line). Declining a send
is always possible and files symmetrically ("referral declined") — Ethics #10 both ways. ◆N2: should
carry-backs be physical desk objects (recommended — the desk slowly silts up with other people's
paperwork, a quiet horror) or terminal-lines only?

## 5. Festival / Full composition (paths.json-ready)

- **FESTIVAL** (~30–35 min): `o.b1–o.b6 · e1.b01,02,03,04,06-short,07,09 · T1 · e2.b01,03,s1-look,07 ·
  T2 · e3.b01,02,03-short,s4,07,08 · T3 · e4.b01,02,06,07 · x.b1–b3`. One provotype (pillow), both
  `felt` anchors (diary, convergence), the dilemma send, all three rituals full-length (rituals are
  never shortened — they are the thesis).
- **FULL** (~75–100 min): everything above at full interior + `e1.b05,08 · e2.s2,b06 · e3.b04,s3 ·
  e4.b03,04,05` + SIDE quests (mixtape play = respite, dossier deep-reads, second visits to bays).
- Composition is data: every beat registers its id + `cuts:[...]` on creation; `data/paths.json`
  sequences both cuts; nothing is hardcoded (R3-4 standing).

## 6. ◆ DECISIONS — RESOLVED (Sérgio, Round 20, 2026-07-05)

1. **◆G1 LOCKED: Lambert.** E4 name revised by Sérgio: **"L"** (hyper-minimal), replacing Echo.
   Lineage: Lambert → Lamby → Lambient → L.
2. **◆G2 PROVISIONAL WORKING LAW** (Sérgio: "don't fully know how to reply"): build to "≤2 lines per
   beat, ≤12 per era, silence default" and let him FEEL it in playtest — the ratification moves from
   paper to trial. Flag stays open in the questions register (#3) until he plays it.
3. **◆N1 RESOLVED — "choose the most interesting":** the **tightening repeat-ask**. Lambert asks
   again after each decline, never blocks, but each re-ask is one register-notch more specific about
   WHERE the object is ("the shelf, Daniel") — the system's patience revealing its surveillance.
   Every decline files ("task declined ×N"); the third decline ends the asking forever (the guide
   stops, the terminal remembers).
4. **◆N2 RESOLVED — both:** physical carry-back object on the desk AND the terminal cross-ref line.
   The desk silts up; the record meshes.
5. **◆N3 LOCKED — THE TURN** ("let's be bold, we need emotion"). Built Session 10.
6. **◆N4 LOCKED:** routing-form/misfiled-folder spine + one inspection-point beat (placed E3, inside
   s4, where the borderland makes it sharpest; E4 keeps only the phone).
7. **◆N5 DEFERRED by design:** build the whole experience; cut lengths decided from the built whole.

## 7. Logistics flags (once, plainly)

- **Worktree/main drift:** e1.b07–09, e2.b02/b06 live in MAIN's shipped build (Round 11b/11c commits,
  post-fork). The reinterp worktree needs a content-merge session (or re-authoring) before those beats
  exist behind `?reinterp=1`. This is the next architecture-lane session after OP-2.
- The A11 in-headset checkpoint still gates all spatial feel calls (open q #6): convergence readability,
  the E4 turn, ceiling glance comfort.
- Open questions register updated by this doc: #3 (◆G2), #8 (answered → terminal doc), #11 (◆N1);
  #5 revised by Sérgio's Round-18 label direction (readable knowledge network supersedes "sub-legible").
