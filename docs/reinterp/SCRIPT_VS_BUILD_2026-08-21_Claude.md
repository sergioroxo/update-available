STATUS: live

# SCRIPT VS BUILD — what the scripts promise, what the build contains, and what a player can reach
*Audit run 2026-08-21/22 by a fresh model (Fable 5) with no history in this project, per
`PROMPT_SCRIPT_VS_BUILD_AUDIT.md`. Read-only: nothing was fixed, nothing was improved. Every verdict
below was checked against **data and code**, never against a status document's claim — including this
project's own `paths.json` `built` flags and `08_STATUS_REGISTER.md`, both of which this audit caught
being wrong (see the side-findings file). Bugs, stale comments and style issues found in passing are
in `SCRIPT_VS_BUILD_2026-08-21_SIDE_FINDINGS.md` — this file is **absence only**.*

## The verdict in one paragraph

**The piece is in much better shape than the fear suggests.** The spine the reinterp actually adopted
— opening → E1 kit/IRC/packet/diary → T1 → E2 homecoming/Caleb/collapse → T2 → E3 correction
list/Malta → T3 → E4 voice/offers/ball → the Close — is **built, wired, and triggered end to end**,
including its most sensitive beats (the deadname-as-misfile, the shrinking chips, the ball, the
two-tier constellation). The genuine losses cluster in five places: **(1)** the era-transition
*spectacle* on the desktop (the lead's remembered "cascade of windows and glitching effects" — he is
right, it was designed and never built, and part of it sits **orphaned in the data**); **(2)** the
cross-room sends s3/s4, whose *visit* half is deliberately gated off (correctly — the destinations
don't exist), which strands the trans-masc borderland and the era-linking "dormant file reopened"
punch; **(3)** sound — the "audio-first" Era 4 and the ball are currently silent captions;
**(4)** three Close beats that were canon in the master plan and silently dropped by the built S92
Close (the FAILED version-history, the uninstalled update, TRANSCENDANCE playing clean); **(5)** the
idle wipe and attract state, one of which a status file claims is done and is not.

## How supersession was applied (later wins)

- `PRODUCTION_SCRIPT_v0.3` → `SCRIPT_UPDATE_v0.4–v0.8` describe the **shipped-build** design
  (Helpy/Sol/Ami, persona cards, Stage 0–4). The reinterp branch re-derived the piece; the operative
  promises for THIS branch are `REINTERP_RESTRUCTURE_R28` + `REINTERP_MASTER_PLAN_v2` (plan of
  record, its own §10 supersession map) + the era-level specs that postdate it
  (`REINTERP_E2_HOMECOMING_SCRIPT`, `REINTERP_E3_THE_CORRECTION_LIST` [supersedes E3_RECONSIDERED,
  which superseded the adaptation spec], the `REINTERP_E4_*` suite, `REINTERP_THE_CLOSE_TREATMENT`)
  + `CLAUDE.md`'s REINTERP AMENDMENTS.
- What survives from v0.4–v0.8 into the reinterp **unchallenged** (and is audited as binding): the
  update ritual grammar (v0.4 §1.1, v0.5 §1 triggers), the glitch doctrine (v0.8 §1), the cascade
  transition (v0.8 §7), the diary (v0.8 §2), the respite laws (v0.4 §2/v0.5 §5), the title lock
  (v0.7 §1), soft lo-fi / selective fidelity (v0.5 §3, v0.6 §3).
- ⚑ One systemic observation the tables below keep hitting: **this project's supersessions are
  usually explicit, but three big ones happened silently** — the Sides chart, the convergence
  triptych, and the Close's version-history/uninstalled-update beats each vanished from the design
  without any doc retiring them. Those are flagged `SUPERSEDED?` — a decision Sérgio should make on
  paper, because today they are neither promised nor retired.

---

# ACT O — THE OPENING

| beat | verdict | evidence |
|---|---|---|
| o.b1/O1 — start screen: disclaimer, premise, controls, Leave (R28 §4.1) | **BUILT** | `src/desktop/orientingCard.ts` mounted at `src/main.ts:72`; text `data/strings/orientingCard.json` (incl. per-device controls + the deadname advisory + unvoiced opt-out pointer) |
| o.b2 — LambyOS boot "made for you" | **BUILT** | `os.ts:1947` (`drawReinterpBoot`), lines `data/strings/opening.json` |
| o.b3 — profile: prefilled name, icon, 3 chips, insisted goal → re-caption | **BUILT** | `os.ts:2000–2139`; first click files instantly (`os.ts:2181`, FIND #5); recap mirrors to the rear record plane (`app.ts:811`) |
| o.b4 — guide installed mid-greeting from first boot | **SUPERSEDED** | CLAUDE.md R28 amendment 2: Era 1 has NO assistant character. Replaced by the side-message guide thread — BUILT (`src/narrative/guide.ts` + `data/dialog/s1_guide.json`, rendered `os.ts:1688–1696`) |
| o.b5 — cork-board beginner panel | **SUPERSEDED** | R28 §4 "the cork panel as onboarding is dead"; job moved to the orienting card (built, above) |
| o.b6 / R28 §4.3 — diegetic tutorial: conductor teaches LOOK/MOVE/INTERACT, player presses power | **SUPERSEDED** | `REINTERP_OPENING_DECISION_2026-07-24.md` (built S44): log-in panel + the room **wakes itself** (no power press, D22); controls teaching moved to the card. MOVE has nothing to teach in E1 (markers exist only from E3, `data/room/nodes.json:eras`) |
| v0.4 §4 — intake panel: diegetic session-length choice (short/full) | **⚑ MISSING** (with the whole two-cut system — see Cross-era) | Script: `SCRIPT_UPDATE_v0.4.md:167–186`. Build: no selection surface anywhere; one hardcoded sequence (`src/narrative/spine.ts:46–51`) |

# ERA 1 — 1997 · Daniel · Room 1

| beat | verdict | evidence |
|---|---|---|
| e1.b01 — the mailed kit: brochure + floppy on the desk | **BUILT** | floppy prop + guide message `floppy` (`s1_guide.json`) + `os.ts:361` `insertKit()` |
| e1.b02 — insert floppy → TriedPath "Un-Walk" installs (autorun booklet) | **BUILT** | `src/desktop/apps/kit.ts`, `data/dialog/s1_kit.json` |
| v0.7 §6 — the kit "plays a MIDI hymn" | **PARTIAL** | Promise: `SCRIPT_UPDATE_v0.7.md:81–83`. Build: no MIDI anywhere; the prayer moved to Tape A (real recording, registered: `tapeAudio.ts:31`). The kit's own `midiNote` field is now just the label "companion cassette insert" (`s1_kit.json:13`) — which Sérgio has separately asked to remove (WALKTHROUGH §E) |
| e1.b03 — first filing = first reveal (ceiling wakes, light-leak seams) | **BUILT** | `app.ts:2281–2286` `onKitInserted → cluster.reveal()`; `src/room/ceilingWitness.ts` |
| e1.b04 — #TriedPath IRC, Rob's welcome, the hook, reply chips | **BUILT** | `src/desktop/apps/irc.ts` + `data/dialog/s1_irc.json`; escalation earned by the flip with a 24s fallback (`os.ts:103,376–383`) |
| e1.b04 seed — Rob mentions "the girls' program" once (pays off at s1) | **⚑ MISSING** (minor) | Script: master script `:124` ("The one E1 seed"). No such line in `s1_irc.json`; s1's offer copy ("women's track", `sends.json:36`) now lands unplanted |
| e1.b05 — Origin Story Intake ('97 questionnaire) | **BUILT** | `data/provotypes/origin_intake_e1.json`, launcher icon `os.ts:1575`, statuses verified by check-spec |
| the pillow provotype (mandatory in every cut) | **BUILT** | `data/provotypes/pillow.json`, launcher `os.ts:1574`; both provotypes also carried forward onto the E2 desktop (`os.ts:1585–1627`, S86) |
| e1.b06 — **the graying task** (guide asks you to FIND apparatus objects; each find grays a queer prop) | **⚑ MISSING** | Script: master script `:117`; still promised in MASTER_PLAN_v2 `:118` ("remains a queued E1 lane") and build queue §9 lane 10 ("slot anytime"); ◆N1 was even RESOLVED (the tightening repeat-ask, master script `:198–203`). Build: zero code — `grep -rn graying src/` returns nothing. Would need: a guide-thread task, prop-gray shader/tint states, decline filing, and the mixtape-resists payoff |
| the mixtape **resists** the graying — the piece's glitch #1 | **⚑ MISSING** (falls with e1.b06) | Same citations. The surviving fragment: a kept mixtape stays un-aged through morphs (`cluster.ts setKeptIds`) — the *survival* half exists, the *resistance staged as a glitch* does not |
| e1.b07 — DIARY.TXT, felt read (v0.8 §2, Sérgio's line preserved) | **BUILT** | `src/desktop/apps/diary.ts` + `s1_end.json` `diary` block |
| e1.b08 — Rob's turn-by-turn narrowing; replies change only the witness label | **BUILT** | `irc.ts:80,176–198`; `s1_end.json` escalation turns |
| S1.8 — the placement packet (consent already signed, itinerary; administrative violence, v0.7 §8) | **BUILT** | `src/desktop/apps/packet.ts` + `s1_end.json` `packet` |
| e1.b09 — deletion fails → the person's glitch → T1 arms | **BUILT** | `diary.onBreakout → os.onGlitch('person')` (`os.ts:412`); `diary-glitch` record read by `spine.ts:105` |
| v0.7 §8 — screen powers down; era ends "while you were away" | **SUPERSEDED** | MASTER_PLAN_v2 §5: T1 notice → "Remind me later" = the belongings beat → full ritual. No power-down |
| the belongings beat (gather what you're taking; kept objects survive un-aged) | **BUILT** | `src/narrative/belongings.ts` + `data/room/belongings.json` (9 eligible incl. mixtape/monkey/duck); wired at `os.ts:521–528`; second pass at u3 |
| THE THREE TAPES (A prayer · B broadcast · C mixtape) + boombox | **BUILT / PARTIAL on audio** | `src/narrative/tapes.ts` + `data/dialog/s1_tapes.json` (18/7/40 segments, shelf labels S89). Audio: Tape A + Tape B + **one** Tape C track registered (`tapeAudio.ts:30–37`); the rest of the mixtape's 40 segments are captions over hiss — MASTER_PLAN §7's "mixtape tracks pending" is still true |
| Tape C never filed, never acknowledged (ambient-presence law) | **BUILT** | `tapes.ts:21` — hard-excluded from filing in code |
| `lamby_rig.exe` easter egg | **BUILT** (bonus — not script-promised) | `src/desktop/apps/lambyRigFile.ts`, gated by `e1DesktopIdle` (`os.ts:448`) |

# T1 — THE E1→E2 UPDATE (1997 → 2003)

| beat | verdict | evidence |
|---|---|---|
| Ritual: notification ("Remind me later" works once, visibly) → EULA → changelog → restart | **BUILT** | `src/desktop/apps/update.ts` key `u2`; copy `data/strings/updates.json:3–58`; spent deferral drawn greyed (`update.ts:240–243`) |
| Trigger = documented failure, never the player | **BUILT** | `spine.ts:101–111` (diary-glitch, 1.2s delay) |
| **The install glitch: "glitch web aesthetics — the old era's chrome tears, tiles, ghost-frames into the new"** | **⚑ MISSING** | Script: `SCRIPT_UPDATE_v0.4.md:49–52`; v0.8 §1 ("the system's glitch… ominous transformation"). Build: the install screen is a black field + typed changelog + a progress bar whose only "glitch" is a stutter (`update.ts:313`); the full-frame wash is a flat translucent div (`app.ts:873–886`). **This is the lead's named absence** (WALKTHROUGH `:103`) and his walkthrough note "the reboot sequence is missing glitching beforehand" (`:100`) names the same gap |
| **The error cascade before the update** ("a new update is needed" — Error-999-style stack, Retry/Cancel) | **⚑ ORPHANED** | The data EXISTS and nothing reads it: `data/dialog/s1_end.json:82–104` (`ritual` block: error, errorRetry, errorCancel, loading). No `src/` file references `end.ritual` (irc/packet/diary import only their own keys). The chain dies at the imports — the diary glitch goes straight to `armUpdate('u2')` (`spine.ts:111`). This orphan is the desktop half of the "glitching effects" the lead remembers |
| **The cascade** (v0.8 §7 — the update "guides the player to look around the room, the new era resolving as they pan; back at the desk, the PC itself is new") | **PARTIAL** | Room half: BUILT — the S86 rise/hold/descend relocation ages the room in front of you (`update.ts:116–133` `onInstallBegin`; `cluster.ts:203–311`, `e1-e2` 7/7/7). Desk half: **MISSING** — the r2 fold is remove-only (`reinterp_deltas.json` r2: 22 removes, 0 adds), so the choreography's desk re-dress (kit → Restorify box, soda → coffee, homework → job folder; `REINTERP_TRANSITION_CHOREOGRAPHY:45–47`) never happens; "the PC itself is new" doesn't occur (same CRT — correct for 2003, but nothing on the desk marks six years, which is Sérgio's walkthrough note "needs more elements that make it look like we jumped in time", §B) |
| T1 sound (dial-up handshake stretched under the bar; ballast clunks; fluorescent hum) | **⚑ MISSING** | `REINTERP_TRANSITION_CHOREOGRAPHY:53–54`. No transition audio exists; nothing is registered for any ritual (`tapeAudio.ts:24–63`) |
| New embodiment = new login as a new person (v0.8 §4) | **SUPERSEDED** | D15 homecoming law: E2 is DANIEL, older, same room (MASTER_PLAN §1/§5). The new-person login grammar now lives at E3 ("Welcome back, Vera" sign-in — built) and E4 ("Hi Maya") |

# ERA 2 — 2003 · Daniel adult · Room 1 aged (walls closed)

| beat | verdict | evidence |
|---|---|---|
| S2R.0 — silent return: 2003 daylight, dust sheets, kept objects un-aged, "Welcome back… press to continue" + return press | **BUILT** | `os.ts:557–566,1787–1803`; rig note `cluster.ts:266–268`; return press files (`os.ts:600–605`) |
| S2R.1 — LambyOS 2003 boot crawl (+jingle hook) → "finishing installation…" → **Lamby's debut**, 2 beats × 2 lines, dismissal files at both | **BUILT** | `os.ts:74–76,1314–1335,1812–1823`; `data/dialog/s2_lamby.json`. Jingle: hook wired, **no asset registered** (`tapeAudio.ts:54–62`) — boot is silent |
| S2R.2 — the check-in: streak counted while he was away ("412 days · includes supervised period"), Daily Realignment chips, every answer filed differently | **BUILT** | `src/desktop/apps/restorify.ts`; `s2_lamby.json:54`; `ledger.checkins` |
| S2R.3 — Caleb: warm thread → live redaction → `HOMOSEXUAL CONDUCT` flag → streak dies 412→0 → Lamby consoles ("filed as care") | **BUILT** | `src/desktop/apps/caleb.ts` (felt; imports no Lamby) + `src/desktop/apps/accountability.ts` (operable); ⟨S⟩ lines preserved in `s2_caleb.json:129–134` |
| S2R.4 — the New You infomercial as Lamby's recovery recommendation; "Not now" visibly inert; skip arms at 15s; **the break** (tape tears, Caleb arrives through the wreck) | **BUILT** | `src/desktop/apps/netvision.ts` (1745 lines) + `s2_media.json`; real 1:54 song registered (`tapeAudio.ts:48`); break toast after the disclaimer (`os.ts:1293–1299`) |
| S2R.5 — the collapse: PureMail "We have to stop", apology read in Lamby's voice (TTS), streak "412 days · for nothing", un-redaction line by line, one new message from Caleb | **BUILT** | `accountability.openMail`; read-aloud WAV registered (`tapeAudio.ts:53`) and wired (`os.ts:813–819`); `s2_caleb.json:186` |
| — the jingle returns **broken** (degraded render) | **⚑ MISSING (asset)** | MASTER_PLAN §7 "broken render pending"; `s2_caleb.json:188` explicitly un-claims it until a file exists. No broken render on disk |
| S2R.6 — the residue: "Then it was never me that was broken…" chip-committed; mixtape playable; system says nothing | **BUILT** | `caleb.ts` residue + `spine.ts:72` reads it; mixtape lives in the room and tapes stay playable (era-gated stop `tapes.ts:224`) |
| S2R.7 — u3 ritual: sunset notice, EULA, removal changelog, **the dispersal** ("companion process — could not be removed. RENAMED." + Lamby coming apart into the seven marks that arrive as Lambient's badges) | **BUILT** | `update.ts:60–90,283–307,345–368`; `updates.json:110–113`; marks settled on E3's three screens (`era3Devices.ts` header / `era3.ts drawLambMark`) |
| — "the last filing under Daniel's name: `subject migrated — file retained`" | **BUILT** | `os.ts:494–496`; `updates.json:124` |
| s1 — SEND: Daniel → women's track ('03). Offer + decline + visit machinery, carry-back, witness lines | **PARTIAL** | Machinery BUILT: offer via `spine.ts:127`, window `os.ts:1099–1141`, resolve → `sends.ts:84–103` + dolly (`app.ts:778–793`). **The destination has no content**: `paths.json:22` itself says "bay content dressing = build"; the Love Won Out tape / *Restoring Sexual Identity* insert (master script `:132`) was never dressed; the carry-back is a greybox slab (`sends.json:13–24`). And the target (`yaw: 90` = Vera's Room 2) is a retired radial-layout coordinate — in E2 the walls are closed, so a visit dollies into an unopened 2016 room. See side-findings §7 |
| s2 — SEND: severer classification → trans-fem facet ("homosexual continuum" diagram) | **PARTIAL** (same shape) | Facet seam BUILT (`sends.ts:98–100` → `fluidNiche.setFacet`); the diagram content never built ("content = build", master script `:133`); target facet lives in Room 3, across a closed building |
| e2.b06 — webcam check-ins / the commercial / MSN thread | **SUPERSEDED** | The E2 HOMECOMING script (R28-2d source of truth) contains no webcam beat; its S2R.2–S2R.4 replace this material. Not counted as a loss |
| e2.b07 — the accountability web fails publicly (Exodus analog) | **BUILT** (as S2R.5) | above |

# ERA 3 — 2016 · Vera · Room 2

| beat | verdict | evidence |
|---|---|---|
| E2→E3: walls open + relocation to Room 2; boxes; "case resolved — transferred" | **BUILT** | `cluster.ts:285–294` (`opensWalls: true`, comfort-measured legs); `movingBox1/2` in the r3 fold (`reinterp_deltas.json:1701,1715`); migration filing above |
| — ◆T2: the EULA **as transfer manifest** — "the player scrolls through their own E1+E2 terminal lines re-labeled as assets" | **⚑ MISSING** | Script: `REINTERP_TRANSITION_CHOREOGRAPHY:62–63` (still an open ◆T2 for Sérgio). Build: u3's EULA is static composed text (`updates.json:75–95`) — no ledger lines appear in it |
| e3 arrival — dark laptop → SisterSignal boot → "1 update found" → GracePlatform install + changelog **on Vera's machine** → "Welcome back, Vera." sign-in | **BUILT** | `updates.json:245–264` (`e3_arrival`); `src/room/graceQueueLite.ts`; Daniel's monitor stays dead by law (`os.ts:1523–1565`, S61) |
| The correction list — APPLY/SKIP, `n of m applied`, skipping files and nothing else happens; visible tracked-change edits; tablet publishes clean | **BUILT** | `graceQueueLite.ts` + `data/dialog/s3_queue.json` (3 submissions, 13 corrections; `_docEdit`) |
| Script/scripture doubling — `The Ordering` cites `Household`, same weight, verse never cruel | **BUILT** | every `manual`/`verse` pair in `s3_queue.json:67–232`; Household 6:2 deliberately cited twice |
| Noa: two contradictory corrections rendered, neither endorsed; **the video** (faceless, tender, felt) + correction 13 "Apply the house look" / `Honest Light` grade with as-sent frame kept | **BUILT** | `s3_queue.json:44–55,219–231` + frames in `src/desktop/theme/era3.ts` (S69) |
| "Route for mentorship" — the recruitment beat, quietest presentation | **BUILT** | `s3_queue.json:147–156` (`quiet: true`) |
| ⚑ THE BREAK — Malta, Act LV, from **Bea** on the phone; live blinking reply field that types nothing; **the light lifts** (room rig + laptop grade), files NOTHING | **BUILT** | `graceQueueLite.ts:205,298–299` + `cluster.ts:103–104` (`E3_LIFT`); held-read lifts the phone to the hand (`era3Devices.ts:216–247`) |
| The comments thread (tablet): live thread, template picker, **templates propagate** to another account | **BUILT** | `src/desktop/apps/comments.ts` + `data/dialog/s3_comments.json`, reached via `graceQueueLite.drawTablet()` |
| FloppySheep on the phone (one tap away while a comment waits; never filed, never scolded) | **BUILT** | `src/desktop/apps/floppysheep.ts` + `s3_floppysheep.json` |
| s3 — SEND: the recycled phrasing → **the dormant earlier file reopens as "referenced material"** (the piece's continuity punch) | **⚑ ORPHANED** | Offer surfaces on the laptop and can be DECLINED only: `os.ts:1115–1134` re-gated the "Turn and look" button on 2026-08-21 because the target (`sends.json:96–99`, `yaw: 0` — a retired radial coordinate) "is not there," and the fly crashed Sérgio's E3 (WALKTHROUGH §C). So the visit leg — the HOPE 2016 sheet carry-back and the reopened-file witness line (`sends.json:114–117`) — is authored data no player can reach. The chain dies at `os.ts:1134` (`allowVisit = … !== 's3'`) |
| s4 — SEND: **THE DILEMMA** (the chart has no cell; butch/trans-masc borderland; misfiled-folder inspection point, ◆N4) | **⚑ ORPHANED** (same gate) | `os.ts:1134`; target `facet: transmasc` (`sends.json:134–141`) belongs to Room 3, which does not exist in E3 under the three-room model. The trans-masc facet geometry exists (`fluidNiche.ts`) and its copy was always "= voice pass" — **the era's hardest beat is currently unreachable and unwritten** |
| e3.b02 — the Sides A/B/X/Y chart debuts complete (hero object) | **SUPERSEDED?** — decide on paper | Promised: master script `:143`. The correction-list redesign (2026-07-30, "stop retrofitting old canon") contains no chart and no doc retired it; today it survives only as a Close label (`close_network.json:16`). Not counted as a loss *if* Sérgio confirms the retirement |
| e3.b07 — the convergence triptych (all three facets lit; buckets incl. **transgender**; HOPE audio plays *about* her) | **⚑ ORPHANED / SUPERSEDED?** | The mechanism exists — `fluid_niche.json` `convergence.allowed`, `fluidNiche.setFacet('all')` — and nothing in play ever calls it (`grep setFacet` → only sends/era defaults/debug). The staged beat ("content build", `paths.json:30`) was never made, and the no-room-jumping E3 leaves it nowhere to live. Master script called it a FELT ANCHOR of every cut (`:147`) |
| e3.b04 — femininity homework provotype (FULL cut) | **⚑ MISSING** | Master script `:144` ("R5 — unbuilt"); no provotype file, no code |
| e3.b08 — the refusal ("the queue rejects the one line Vera won't polish") as T3 trigger | **SUPERSEDED** | Correction-list ending: u4 arms when the list is exhausted (`era3Devices.ts:267–287`); the refusal survives as u4's own notice line "A submission could not be processed as written" (`updates.json:143`) |
| E3 has no respite | **BUILT (deliberate)** | Sérgio-confirmed, `s3_queue.json` `_docRegister` |

# ERA 4 — now · Maya · Room 3

| beat | verdict | evidence |
|---|---|---|
| T3: u4 on Vera's laptop; L installed via the report block ("~ no further action is required from you"); adopter-thesis clause on EULA page 3 | **BUILT** | `updates.json:137–240`; `era3Devices.ts:250–265` (RITUAL_OFFSET) |
| THE TURN (◆N3) — restart re-anchors 180°; Maya's desk shares the wall with the record; lamp carried | **BUILT** | `cluster.ts:295–330` (`e3-e4`, seat 270, TERMINAL_E4, 24s crossing set by the turn's °/s); lamp travel `cluster.ts:143` |
| Lambient → "L" transformation sprite (blob thins to a letterform, slides off-screen) | **SUPERSEDED** | Correction-list decisions: "Lambient = the Grace software. Not a character"; L arrives *inside the update* (`updates.json` `_reportDoc`) — the stronger, sourced version of the same beat |
| The headset, the one touch, THE PLACE ("genuinely nice… a picture pretending to be a room") | **BUILT** | `src/desktop/apps/space.ts`; `era3Devices.ts` pins the visor to the head |
| **The turn does not work** (bounded stepped parallax; filed once, flatly; never explained) | **BUILT** | `space.ts:253–266` (`setLook`, `orientation: changed — view unchanged`) |
| L's conversation u1–u10: room captions, the unplaceable hoodie, **deadname beat ×2 as misfile** ("under the old file"), friction pattern, shrinking chips u7→u9, the correction chip's return | **BUILT** | `src/desktop/apps/lVoice.ts` + `data/dialog/s4_l.json` (all ten units authored, incl. `textUnvoiced` opt-out variant, `gone` chips, D-C name separation — no deadname invented, per 00_WHERE_THINGS_STAND retirements) |
| **L is a VOICE** (E4 is AUDIO-FIRST; "L must sound good") | **⚑ MISSING (the whole era's audio)** | Promise: MASTER_PLAN §5 ("DIRECTION REVISED: AUDIO-FIRST… L is a VOICE"); `s4_l.json` `_docAudio`. Build: **not one line is voiced** — the TTS batch is deliberately unrun pending Sérgio's voice pass (`tts_manifest.json` `l_era4_voice._docNotRun`), no filename is registered (`tapeAudio.ts:24–63`). Today the era is silent captions. Deliberate sequencing, but the player-facing absence is total, so it is listed here and ranked below |
| The memories feature (m1 silent enhancement, undo works, m2 already enhanced) | **BUILT** | `src/desktop/apps/offers.ts` + `s4_offers.json:26–59`; sprites in `era4.ts`; no camera/file input |
| — the inverse: **ball photos return un-enhanceable, "no enhancement available"** | **⚑ MISSING** | Promise: `REINTERP_E4_DEEP_PASS:165–174` ("Two mechanisms, one inversion") and §6 ("its inverse… is the same beat's second half — in scope"). Build: no such beat — `grep "no enhancement"` returns nothing in src/ or data/ |
| The "for you" wall (4 cards; satire collapses on Pastor.AI 3 a.m.; **the export** — "Available in your region." in the fine print, unremarked) | **BUILT** | `s4_offers.json:61–105` |
| The curation beat + required counter-voice, withdrawn by the system unasked ("3 of 214") | **BUILT** | `s4_offers.json:107–135` |
| The careful pause (both live chips advance; "Not now." greyed forever; the gap filed both ways) | **BUILT** | `s4_offers.json:137–169` |
| A ball object brought home; L captions it wrong twice, offers a third, stops | **⚑ MISSING** (minor) | `REINTERP_E4_DEEP_PASS:189–192` (§3.3). Not in `s4_l.json`/`s4_offers.json`; the hoodie (u3) carries the pattern indoors, the trophy variant was never made |
| TRANSCENDANCE — the ball: the machine hears it first and stops talking; label field fails 7 steps to `NO CATEGORY FOUND`; device off = the turn works; four categories quoting the apparatus's own words (walk/talk/sit · four chips · remove the unresolved · in repair); Household/house rhyme unglossed; nothing asks you to leave; **files nothing** | **BUILT** | `src/desktop/apps/ball.ts` + `data/dialog/s4_ball.json`; light stations `cluster.ts:133`; no-record asserted in data (`s4_ball.json:135`) |
| — the ball's **sound** (MC voice, beat, calls, applause) | **⚑ MISSING (assets, deliberately withheld)** | `s4_ball.json` `_docVoice` + `tts_manifest.json` `_docNoBall`: may never be synthesized; waits on real recordings via the reader protocol. Until then the piece's climactic respite is a silent light-and-caption scene — flagged so it is planned for, not discovered at the exhibition |
| e4.b02 funnel / e4.b03 purity app / e4.b04 trans-masc phone / e4.b05 Exploratory Care Planner | **SUPERSEDED** (with one flag) | The S73–S79 E4 suite (`REINTERP_E4_THE_ARGUMENT/THE_DEVICE/THE_SPACE/BUILD_PLAN/DEEP_PASS`) redefined the era as voice → offers → ball and none of these beats appear in it. ⚑ Flag: with e4.b04 gone AND s4 orphaned, **the trans-masc presence in the played piece is now a single pair of correction lines on Noa** — a thread-level thinning nobody decided on paper (MASTER_PLAN §3 still promises the "trans-masc facet" as content) |
| The finale — glitch → cyclorama slits → four year-panels → hand-off; spends no Close material | **BUILT** | `offers.ts` finale + `era4.ts` `eraPanels`; hand-off chain `space.ts:143–163`; post-hand-off quiet (`space.ts:298`, S88) |
| Room 3 dressed as 2026 / a livable room (E4 build plan Stage 1: "~35 belongings", real device models, no CRT) | **PARTIAL** | Fixtures landed (phone got a real composite model, `reinterp_deltas.json:1775`; L's captioned props exist — sketchbook/hoodie/frame). But Era 4's own fold changes almost nothing (`r4`: 6 adds, 1 remove + overrides), and the lead's walkthrough verdict stands: *"such a horrible mess. Why is this older computer here? A CRT makes no sense in 2026"* (WALKTHROUGH §B). The Stage-1 "all three rooms" pass the build plan ordered is at best half-done |

# THE CLOSE

| beat | verdict | evidence |
|---|---|---|
| The bare restart — "Restart as you are." — no terms, no changelog | **BUILT** | `updates.json:265–278`; `update.ts:213–224` bare branch |
| **"Your update has failed."** — the title said once, flat, on the machine's own dark restart beat | **BUILT** | `updates.json:277` (S92 placement per THE_CLOSE_TREATMENT §1) |
| The two-tier constellation — apparatus nodes cool/sharp/labelled/chained & traceable; person nodes warm/soft/unlabelled/unlinked; slots not cubes (the building's grammar) | **BUILT** | `src/room/pointCloud.ts:1–80` + `close_network.json` (24 labels); the survivors debt paid as "unreadable, numerous and on" per treatment §4 |
| The last press does not loop back to 1997 | **BUILT** | treatment §5; verified live per 00_WHERE_THINGS_STAND §2 (and `enterClose` has no restart path, `app.ts:3160–3185`) |
| x.b1 — **the lift**: the terminal's lines rise off the wall into warm points; the lamp holds 3 seconds after every other light | **⚑ MISSING** | Promise: master script `:166`; choreography T4 `:124–131` (treatment calls the line-to-node animation "a polish pass, not a blocker" — but the lamp-hold and the terminal handing over are the Close's one *felt* transition). Build: `enterClose()` (`app.ts:3160`) hard-disables the rooms and shows the cloud in one frame |
| x.b3 — the unfinished line ("Conversion therapy continues to affect…") | **⚑ MISSING — by law, waiting on Sérgio** | master script `:168`: "surfaced for Sérgio; never completed by any model." Correctly absent from the build; it is the one absence no session may fill |
| v0.6 C.4.1 — **the version history**: every era's update stacked, each stamped `FAILED`, one more row dated today, changelog "(being written)" | **⚑ MISSING — SUPERSEDED? decide on paper** | Promise: `SCRIPT_UPDATE_v0.6.md:44–50`; never retired anywhere. The built S92 Close (treatment) simply doesn't contain it. It is the title's receipt — thirty years of failure itemised — and it exists nowhere in `data/` or `src/` |
| v0.6 C.4.4 — **the one uninstalled update**: "UPDATE AVAILABLE — for the world, not for you. Includes: bans that bind · care without conditions · names for what this is. Status: not yet installed." | **⚑ MISSING — SUPERSEDED? decide on paper** | Promise: `SCRIPT_UPDATE_v0.6.md:58–66`; still canon in MASTER_PLAN_v2 §5 ("the one uninstalled update"). The treatment dropped it without a word. This was the ending's entire forward-hope beat — "reality as the report, the better society as the to-do" |
| v0.5 §5 — TransJesus/TRANSCENDANCE **plays clean at the Close** ("the one file the restart restores rather than wipes") | **⚑ MISSING** | Promise: `SCRIPT_UPDATE_v0.5.md:156–159`; MASTER_PLAN §5 Close canon ("TRANSCENDANCE plays clean") and §5b's warm-objects thread ends "plays clean". The built Close has no audio and no replay of anything |
| The dossier reframe | **BUILT (re-interpreted)** | Treatment §3 argues the apparatus/person asymmetry IS the reframe; S92 built exactly that. The v0.6 text version ("Nothing about you was broken…") exists nowhere — acceptable under the treatment, noted for completeness |

# CROSS-ERA SYSTEMS

| promise | verdict | evidence |
|---|---|---|
| PATHS — two cuts (FESTIVAL/FULL), composition as data, nothing hardcoded (v0.3 Part III; master script §5; R3-4 law) | **⚑ MISSING** | One sequence exists and it is hardcoded in `spine.ts:46–51`; `paths.json`'s `reinterp_festival` is dead metadata the spine never reads (side-findings §1). The FULL-cut-only beats (e1.b05✓ but e3.b04, e4.b03–05, side quests) mostly don't exist; no cut-selection surface |
| Witness symmetry — every response classifies, silence included; unseen guidance files nothing | **BUILT** | throughout: guide `witness.followed/declined`, Lamby records, checkins, sends, L's chips incl. `(say nothing)` |
| Ambient-presence exception — mixtape/duck/monkey never filed | **BUILT** | `tapes.ts:21`; ball files nothing; Malta files nothing |
| The computed INTAKE RECORD: **era-specific filing artifacts** (index card → database row/printer → CRM dashboard → moderation console) with fields the player can trace (v0.3 Part V) | **PARTIAL** | The record accumulates real, traceable lines from every era (`intake.ts:293–370`) — the legibility rule is honoured. But the artifact never ages: the surface is the Era-1 card in every era (`intake.ts:266` — "index · era 1 · drawer 12" hardcoded). Sérgio hit exactly this: "on Era 2 it should change styles and content — it still says era-1" (WALKTHROUGH §I), and his §J proposal (ages per era + terminology layer + hosts the menu) is a design request on top of the same gap |
| The Assistant's report-view (bubble on your side / cold log on the witness side) | **BUILT** | every conduction files a re-captioned line (e.g. comfort filed as `support: provided`, `s2_lamby.json` witness block; L's `alsoFiles`) |
| Helpy → Sol → Ami™ lineage; Assistant's Close goodbye ("Can I help?" frozen under the card) | **SUPERSEDED** | Reinterp lineage Lambert→Lamby→Lambient→L (master script §2.1), then R28 amendment 2 removed the E1 character; the goodbye's descendant is the dispersal + the ball's silent L. Not a loss |
| Persona cards per era ("composites, labeled" — methodological honesty on the surface, v0.4 §3) | **SUPERSEDED / PARTIAL** | Per-era arrival beats replace the cards (return press / Vera sign-in / "Hi Maya"); "different lives" disclosed once on the orienting card (`orientingCard.json:5`). ⚑ The "composite, no real person" labelling now lives only in menu credits — nothing in-fiction states it. Flag for Sérgio, not counted as a loss |
| Update triggers = documented failures with sources (v0.5 §1 trigger table; D5) | **BUILT** | `updates.json` `_sourceGrounding` blocks on u2/u3/u4 (Paulk 2000, Exodus 2013, Malta Act LV) — all still `[VERIFY SOURCE]`, awaiting Sérgio |
| Sift™ mark + shared autocomplete format; the search-bar hint beat (v0.4 §5) | **PARTIAL / SUPERSEDED** | Sift exists as an invented mark on the E4 wall (`s4_offers.json:80–84`); no search bar, no autocomplete data format, no dormant link. The E4 redesign has no search surface; the *shared-format infrastructure* half (U5) was never made |
| Zap! / JUST CHANGE™ ad-game embeds (v0.5 §6, V5 "first repo task after vertical slice") | **⚑ MISSING** | Never appears in any reinterp doc or code; FloppySheep now occupies the era-game niche in spirit. Needs a paper decision: embed, or retire V5 |
| Title lock: YOUR UPDATE HAS FAILED + subtitle "Nothing to update. Change has failed." (v0.7 §1) | **PARTIAL** | Title everywhere (`orientingCard.json:3`). The locked subtitle exists only in the orphaned `s1_end.json:113` close block — no player-reachable surface carries it (the card's subtitle line is the institutional strapline instead) |
| No runtime network / no storage / in-memory ledger **wiped on exit, idle, refusal** (CLAUDE.md hard invariant, line 79) | **PARTIAL — ⚑ the idle half is MISSING** | Exit + refusal wipes: BUILT (`ledger.ts:350–355`, `os.leave()`, menu Restart/Leave). **Idle wipe: no code** — no inactivity timer exists anywhere in `src/` (grep). ⚑ `00_WHERE_THINGS_STAND.md:27` claims "The ledger already wipes on idle — that part is done"; the claim is false. For an exhibition machine this is the difference between a visitor's name evaporating and it sitting on screen for the next visitor |
| Attract state / return-to-start for a walked-away visitor | **⚑ MISSING (known)** | 00_WHERE_THINGS_STAND §3 — honestly tracked, still absent; listed because a player (the next one) feels it |
| TTS read-aloud for long in-world text (standing accessibility principle, 2026-07-24) | **PARTIAL** | One surface has it (the PureMail apology, built + wired). The EULAs, the correction list, the Close — nothing else is read-aloud-able |
| Movement: seat markers from E3 on, blink cuts, never gaze-armed; instructions | **BUILT** | `movementNodes.ts` + `nodes.json` (eras gating matches MASTER_PLAN §3); held-read for devices (S66); instructions on the card + moveHint |
| Game menu (Esc): resume/restart/controls/credits/leave; frame voice; Recentre; unvoiced-name toggle | **BUILT** | `src/desktop/gameMenu.ts` mounted before either engine (`main.ts`); credits carry attributions + the E4 dossier/ballroom sources (S87) |
| Look-mode 3 (gyro) + pinch-FOV + tap-on-release (S80) | **BUILT** (per code; ⚑ never verified on a real phone — CLAUDE.md's own caveat) | `app.ts:1748–2085` motion states |

---

# THE TEN MOST DAMAGING ABSENCES, RANKED
*"Damaging" = a player feels the gap. Retirements are excluded; deliberate sequencing (voice passes)
is included where the player-facing effect is total.*

1. **The piece is nearly silent, and its last act was designed as sound.** E4 is "audio-first" and no
   line of L is voiced; the ball — the emotional summit — is a light show with captions; every
   transition, boot jingle and broken-jingle beat is an empty hook. Six audio files exist in the
   whole work (`tapeAudio.ts:24–63`). Much of this is *deliberately* sequenced behind Sérgio's voice
   pass — but the voice pass is the bottleneck for the single largest felt gap in the build, and the
   ball's real-recording plan has no owner or date.
2. **The E1→E2 transition spectacle — the lead's named loss, confirmed.** The desktop-side install is
   a black screen with a typed list and a stuttering bar; the promised chrome-tearing glitch-web
   install (v0.4 §1.1.3), the pre-reboot error cascade (authored and orphaned in
   `s1_end.json:82–104`), and the desk re-dress that shows six years passing (choreography T1.6; the
   r2 fold adds nothing) are all absent. This is also the transition every player sees first.
3. **s3/s4's visit legs are gated off, and with them the era-linking payoffs.** The re-gate was the
   correct emergency call (the targets are retired-layout coordinates; visiting crashed E3) — but
   until the sends are retargeted to places that exist, the trans-masc borderland dilemma (◆N4, the
   era's hardest beat, copy never written) and the "dormant file reopened — referenced material"
   continuity punch are unreachable authored content. `os.ts:1115–1134`.
4. **The Close dropped its receipt and its hope.** The FAILED version-history stack (v0.6 C.4.1) and
   the uninstalled update "for the world, not for you" (C.4.4) — still canon in MASTER_PLAN §5 —
   exist nowhere. The built Close lands the title reversal beautifully and then has nothing to say
   about the thirty documented failures or the to-do it was meant to hand the audience.
5. **No idle wipe, no attract state — and a status file says the wipe is done.** For the exhibition
   this is a privacy invariant (CLAUDE.md line 79) failing silently on the venue floor.
   `ledger.ts:355` is the only wipe trigger.
6. **The graying task (e1.b06) and the mixtape's resistance — glitch #1 never fires.** E1's one
   room-scale interactive task, with its ◆N1 design already resolved on paper, has zero code. The
   piece's glitch-doctrine ladder (diary → mixtape → TransJesus → finale) is missing its second rung,
   and the racket/props sit in the room unconnected (Sérgio felt exactly this: "nothing connected to
   the racket").
7. **The intake record doesn't age.** Thirty years pass and the witness artifact is a 1997 index card
   in 2026 (`intake.ts:266`). The v0.3 Part V per-era artifacts were the witness side's whole
   time-arc; the lead independently asked for this twice in his walkthrough (§I, §J).
8. **E3's felt anchor vanished without a decision.** The convergence triptych (e3.b07) — a FEST+FULL
   *felt* beat in the master script — is machinery with no trigger and no staging; the Sides chart
   (e3.b02) survives only as a Close label. If the correction-list era supersedes them, no document
   says so; if it doesn't, the era lost its second emotional peak (Malta is now carrying the whole
   era alone).
9. **The sends' destinations were never dressed.** Even the two visits that still work (s1/s2) fly
   the player to greybox slabs in rooms that are closed or wrong-era; the Love Won Out bay and the
   continuum diagram were never built. A summons that lands nowhere teaches the player the offers
   are noise — the opposite of the "shared infrastructure" argument the sends exist to make.
10. **The transmasc thread has quietly thinned to almost nothing.** Between the orphaned s4, the
    superseded e4.b04 phone, and the never-written borderland copy, the played build's entire
    trans-masc presence is two correction lines on Noa's submission. Every individual step had a
    reason; nobody chose the sum. (Same audit lens, smaller: the "girls' program" seed for s1 was
    never planted.)

## And, stated plainly, what is in better shape than the fear

The walkthrough's despair ("so much is missing, so much got lost") is mostly about **rooms, pacing
and silence — not about lost beats.** Of the ~90 promised beats walked above, the large majority are
BUILT with their triggers verified, including everything hardest to get right: the homecoming, the
Caleb redaction and collapse, the dispersal, the correction list with Noa's video, Malta's light, the
whole ten-unit L conversation with the misfile beat and the shrinking chips, the memories, the wall,
the curation counter-voice, the ball's four categories quoting the apparatus's own thirty years, and
a Close that lands the title. The losses are real, listed, and countable — **fourteen ⚑ rows, of
which four are decisions to confirm rather than content to build.** The fear can retire; this list
replaces it.
