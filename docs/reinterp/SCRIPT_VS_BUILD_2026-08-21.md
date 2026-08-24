STATUS: live

# SCRIPT VS BUILD — what the scripts promise, what the build contains, what a player can reach
*Audit run 2026-08-22 (second, independent pass) per `PROMPT_SCRIPT_VS_BUILD_AUDIT.md`. Read-only:
nothing was fixed, nothing was improved. A prior audit by another session now sits beside this one as
`SCRIPT_VS_BUILD_2026-08-21_Claude.md` (+ `_SIDE_FINDINGS_Claude.md`); this pass re-verified every claim
in it against data and code before reuse, corrected six of them (§CORRECTIONS below), and adds findings
it missed. Verdicts here rest on **data and code only** — never on a status document, including this
project's own `paths.json` `built` flags and `00_WHERE_THINGS_STAND.md`, both of which this pass found
wrong in places (the PATHS row in CROSS-ERA; the idle-wipe row). Bugs, stale comments and style noticed
in passing went to `SCRIPT_VS_BUILD_2026-08-21_SIDE_FINDINGS.md` where they belong; this file is
**absence only**.*

## The verdict in one paragraph

**The piece is in much better shape than the fear says.** The spine the reinterp actually adopted —
opening → E1 kit/IRC/packet/diary → T1 → E2 homecoming/Caleb/collapse → T2 → E3 correction
list/Malta/comments → T3 → E4 device/L/offers/ball → the Close — is **built, wired and triggered end
to end**, including everything hardest to get right: the diary glitch, the dispersal, the redaction and
streak death, Noa's video and the as-sent frame, Malta's light lift that files nothing, the template
propagation, the whole ten-unit L conversation with the misfile beat and the shrinking chips, the
memories undo, the curation counter-voice withdrawn unasked, the ball's four categories quoting the
apparatus's own thirty years, and a Close that lands the title. Of the ~110 promised beats walked
below, the large majority are BUILT with their triggers verified. The genuine losses cluster in six places:
**(1)** sound — the audio-first Era 4, the ball, and every transition are silent; **(2)** the E1→E2
transition spectacle (the lead's named loss — confirmed, and half of it sits **orphaned in the data**);
**(3)** E3's confirmed "rest of the workday" surfaces, never dispatched; **(4)** the s3/s4 visit legs,
gated off with their payoffs stranded; **(5)** the Close's version-history receipt and its
uninstalled-update hope, dropped without retirement; **(6)** the idle wipe and attract state, one of
which a status file claims is done and is not.

## How supersession was applied (later wins)

- `PRODUCTION_SCRIPT_v0.3` → `SCRIPT_UPDATE_v0.4–v0.8` describe the **shipped-build** design (Helpy/
  Sol/Ami, persona cards, Stage 0–4). The reinterp branch re-derived the piece; the operative promises
  for THIS branch are `REINTERP_RESTRUCTURE_R28` + `REINTERP_MASTER_PLAN_v2` (plan of record, §10
  supersession map) + the era specs that postdate it (`REINTERP_E2_HOMECOMING_SCRIPT`,
  `REINTERP_E3_THE_CORRECTION_LIST` [supersedes E3_RECONSIDERED, which superseded the adaptation
  spec], `REINTERP_E3_THE_JOB`, the `REINTERP_E4_*` suite, `REINTERP_THE_CLOSE_TREATMENT`) +
  `CLAUDE.md`'s REINTERP AMENDMENTS.
- What survives from v0.4–v0.8 into the reinterp **unchallenged** (and is audited as binding): the
  update ritual grammar (v0.4 §1.1, v0.5 §1 triggers), the glitch doctrine (v0.8 §1), the cascade
  transition (v0.8 §7), the diary (v0.8 §2), the EULA bold line (v0.8 §6), the respite laws
  (v0.4 §2/v0.5 §5), the title lock (v0.7 §1), the starter kit (v0.7 §6), the intake record
  (v0.3 Part V), the Paths system (v0.3 Part III), soft lo-fi / selective fidelity (v0.5 §3, v0.6 §3).
- ⚑ **Three big supersessions happened silently** — no document records them: the Sides chart, the
  convergence triptych, and the Close's version-history/uninstalled-update/plays-clean beats each
  vanished from the design without a retirement. They are flagged `SUPERSEDED?` below — decisions
  Sérgio should make on paper, because today they are neither promised nor retired.

## Verdict legend

| verdict | meaning |
|---|---|
| **BUILT** | data exists, code reads it, something triggers it on the played path |
| **⚑ MISSING** | promised and absent. The deliverable |
| **⚑ ORPHANED** | data or code exists but nothing reaches it in play; the dead link is cited |
| **PARTIAL** | some of it landed; the absent part is named |
| **SUPERSEDED** | a later script or CLAUDE.md retired it; cited, not counted as a loss |
| **SUPERSEDED?** | silently dropped — no document retires it; needs a decision on paper |

---

# ACT O — THE OPENING

| beat | verdict | evidence (promise → build) |
|---|---|---|
| o.b1 — start screen: premise, content note, controls, Leave (R28 §4.1) | **BUILT** | `REINTERP_RESTRUCTURE_R28:119–121` → `src/main.ts:72` mounts `orientingCard.ts`; all copy in `data/strings/orientingCard.json` (premise `:5`, content note `:7`, per-platform controls `:11–31`, Leave `:36`), incl. the deadname advisory + unvoiced opt-out pointer (`:8`) |
| o.b2 — LambyOS boot "made for you"; the room wakes itself | **BUILT** | `REINTERP_OPENING_DECISION:46–51` (§3 auto-boot) → wake `src/engine/app.ts:1517–1524` (`finishWake → beginReinterpOpening`); boot crawl `src/desktop/os.ts:1947–1966`, copy `data/strings/opening.json:79–91` ("This computer was made for you." `:82`) |
| o.b3 — profile: prefilled name, icon, 3 chips, insisted goal → re-caption | **BUILT** | master script `:103` → `os.ts:2000–2089` (profile), first click files instantly (`os.ts:2181–2185`, FIND #5), recap `os.ts:2092–2139`, mirrored to the rear record plane (`app.ts:811–814`); copy `opening.json:92–207` |
| o.b4 — guide installed mid-greeting from first boot | **SUPERSEDED** | `CLAUDE.md` R28 amendment 2: Era 1 has NO assistant character. Replaced by the side-message guide thread — BUILT: `src/narrative/guide.ts` + `data/dialog/s1_guide.json` (8 messages, floppy→…→update→belongings), rendered in the taskbar well `os.ts:1688–1696`, followed/declined both file (`guide.ts:121–125`) |
| o.b5 — cork-board beginner panel | **SUPERSEDED** | R28 §4 ("the cork panel as onboarding is dead", `:112–116`); `REINTERP_OPENING_DECISION:34–38` (Sérgio: "fully out"); job moved to the orienting card (built, above) |
| o.b6 — diegetic tutorial: conductor teaches LOOK/MOVE/INTERACT, player presses power | **SUPERSEDED** | `REINTERP_OPENING_DECISION:46–51,60–65,116–122` (S44): auto-boot replaces the power press; LOOK/INTERACT retired; controls teaching moved to the card. MOVE has nothing to teach in E1 (markers exist only from E3, `data/room/nodes.json:2`) |
| v0.4 §4 — intake panel: diegetic session-length choice (short/full) | **⚑ MISSING** | `SCRIPT_UPDATE_v0.4.md:167–186` ("SESSION CONFIGURATION · How long will this machine be yours?"). Build: no selection surface anywhere; one hardcoded sequence (`src/narrative/spine.ts:46–51`); `data/paths.json` is dead metadata (see the PATHS row in CROSS-ERA). Dies together with the Paths system |

# ERA 1 — 1997 · Daniel · Room 1

| beat | verdict | evidence |
|---|---|---|
| e1.b01 — the mailed kit: brochure + floppy on the desk | **BUILT** | master script `:112` → floppy prop `app.ts:52` (KIT_FLOPPY), `insertKit()` `os.ts:361–386`, guide message `s1_guide.json:7` |
| e1.b02 — insert floppy → TriedPath "Un-Walk" installs (autorun booklet) | **BUILT** | master script `:113` → `src/desktop/apps/kit.ts` + `data/dialog/s1_kit.json` (5 pages `:14–84`, connect page `:70–81`) |
| v0.7 §6 — the kit "plays a MIDI hymn" / cassette prayer, heard AND read | **PARTIAL** | `SCRIPT_UPDATE_v0.7.md:81–83`. Build: no MIDI and no audio in the kit at all — `kit.ts:102–105` draws only the `midiNote` label, whose value is "companion cassette insert" (`s1_kit.json:13`; Sérgio asked to remove it, WALKTHROUGH §E). The prayer itself moved to Tape A and IS a real registered recording (`tapeAudio.ts:31`, `s1_tapes.json:50–160`) |
| e1.b03 — first filing = first reveal: ceiling wakes, light-leak seams | **SUPERSEDED** | master script `:114` promised it; **R26 retired the staging**: `cluster.ts:814–821` ("reveal is a pure state change for gaze/send gating"), `app.ts:2275–2280` ("the old radial-era flourishes (an upward camera glance… + wall light-leak seams) are REMOVED (Sérgio R26: 'the camera goes up to nothing')"), `ceilingWitness.ts:1–28` (iris retired S61). The state change still exists and gates the witness; the visible flourish was Sérgio's own cut, not a loss |
| e1.b04 — #TriedPath IRC, welcome, the hook, reply chips | **BUILT** | master script `:115` → `src/desktop/apps/irc.ts` + `data/dialog/s1_irc.json` (channel welcome from Lume `:18`, Rob's ambient `:11–13`, hook "you must be the one the fellowship wrote to us about." `:22`); escalation earned by the flip with a 24s fallback (`os.ts:103,376–383`) |
| e1.b04 seed — Rob mentions "the girls' program" once (pays off at s1) | **⚑ MISSING** (minor) | master script `:122–123` ("The one E1 seed"). No such line in `s1_irc.json`, `s1_kit.json` or `s1_guide.json`; s1's offer copy ("A companion module exists for the / women's track", `sends.json:36–40`) lands unplanted. One line in `s1_irc.json` would plant it |
| e1.b05 — Origin Story Intake ('97 questionnaire) | **BUILT** | master script `:116` → `data/provotypes/origin_intake_e1.json`, launcher `os.ts:1575`, carried forward onto the E2 desktop (`os.ts:1624–1627`, S86) |
| the pillow provotype (mandatory in every cut) | **BUILT** | master script `:131` → `data/provotypes/pillow.json`, launcher `os.ts:1574`, E2 carry `os.ts:1625` |
| e1.b06 — **the graying task** (guide asks you to FIND apparatus objects; each find grays a queer prop) | **⚑ MISSING** | master script `:117`; still promised in MASTER_PLAN_v2 `:118` ("remains a queued E1 lane"); `paths.json:16` `built:false`; ◆N1 (the tightening repeat-ask) already RESOLVED on paper (master script `:198–203`). Build: zero code — no "graying" anywhere in `src/`, and the guide thread has no find-anything message. Would need: a guide task, prop tint states, decline filing, and the payoff below. Sérgio felt the absence: "nothing connected to the racket" (WALKTHROUGH §D; the racket prop exists at `reinterp_deltas.json:267–280`) |
| the mixtape **resists** the graying — the piece's glitch #1 | **⚑ MISSING** (falls with b06) | Same citations. The *survival* half exists — kept objects freeze un-aged through morphs (`cluster.ts:381–384,920`, `clusterMorph.ts:174–179`) — the *resistance staged as a glitch* does not |
| JUST CHANGE Stage 1 — the floppy game inside the E1 machine | **⚑ MISSING** | `REINTERP_LAMBY_GAME_CONCEPT:47–54` ("Stage 1 also exists inside the WebXR piece — as a period-correct floppy game on the Era-1 machine"), greenlit in `JUST_CHANGE_BUILD_SPEC:1–6`. Build: no game app on the E1 desktop; the kit floppy is the only floppy. The external site is a separate module; the in-piece game is this repo's debt |
| e1.b07 — DIARY.TXT, felt read (v0.8 §2, Sérgio's line preserved) | **BUILT** | `SCRIPT_UPDATE_v0.8.md:39–57` → `src/desktop/apps/diary.ts` + `s1_end.json:62–80` (his line verbatim `:73`, 🔒) |
| e1.b08 — Rob's turn-by-turn narrowing; replies change only the witness label | **BUILT** | v0.8 §3 → `s1_end.json:4–37` (5 turns, exactly one chip each — the narrowed voice), `irc.ts:176–198,296–306` |
| S1.8 — the placement packet (consent already signed; administrative violence, v0.7 §8) | **BUILT** | `ERA1_ENDING_SCRIPT_v2.md:42–70` → `src/desktop/apps/packet.ts` + `s1_end.json:39–60` (signature "[ already signed ]" `:52`, dead "Ask a question" `:59`) |
| e1.b09 — deletion fails → the person's glitch → T1 arms | **BUILT** | v0.8 §1–2 → `diary.onBreakout → os.onGlitch('person')` (`os.ts:412`), `diary-glitch` record (`os.ts:415`) read by `spine.ts:105`; the warm wash renders at `app.ts:873–887` |
| S1.9 — suspension: screen powers down, ~6s silence, machine wakes itself | **SUPERSEDED** | `ERA1_ENDING_SCRIPT_v2.md:92–97` → MASTER_PLAN_v2 §5 E1 flow (T1 notice → "Remind me later" = belongings → full ritual; no power-down). Build goes diary-glitch → 1.2s → u2 notice (`spine.ts:31,111`) |
| v0.8 §6 — EULA bold line "You agree the program corrects in your best interest." (Sérgio CONFIRMED) | **⚑ ORPHANED** | `SCRIPT_UPDATE_v0.8.md:107–111`. The line exists only in the unread `ritual` block of `s1_end.json:91`; u2's built EULA (`updates.json:16–38`) does not carry it. One data edit (into `updates.json` u2 page 2) would land a confirmed Sérgio line |
| the belongings beat (gather what you're taking; kept objects survive un-aged) | **BUILT** | MASTER_PLAN_v2 `:114–116` → `src/narrative/belongings.ts` + `data/room/belongings.json` (9 eligible incl. mixtape/monkey/duck `:3–13`; pass 2 minus the tapes `:16–21`); wired at `os.ts:521–528` for u2/u3 |
| THE THREE TAPES (A prayer · B broadcast · C mixtape) + boombox | **BUILT / PARTIAL on audio** | MASTER_PLAN_v2 `:110–112` → `src/narrative/tapes.ts` + `data/dialog/s1_tapes.json` (A 18 segs / B 7 / C 40; shelf labels `:9,:166,:235`, S89). Audio: Tape A (`tapeAudio.ts:31`), Tape B (`:37`) and Tape C track 1 (`:30`) are real registered recordings; Tape C tracks 2–3 are `audio:null` by design (`s1_tapes.json:285,293`) — MASTER_PLAN §7 "mixtape tracks pending" is still true of those two |
| Tape C never filed, never acknowledged (ambient-presence law) | **BUILT** | R28 §2/§6 → `tapes.ts:196` ("BINDING: never files, under any outcome") + `:181` |
| `lamby_rig.exe` easter egg | **BUILT** (bonus — LAMBY_GAME_CONCEPT Part 2) | `src/desktop/apps/lambyRigFile.ts`, gated by `e1DesktopIdle` (`os.ts:448–451,1580–1582`) |

# T1 — THE E1→E2 UPDATE (1997 → 2003)

| beat | verdict | evidence |
|---|---|---|
| Ritual: notification ("Remind me later" works once, **visibly**) → EULA → changelog → restart | **BUILT** | v0.4 §1.1/v0.5 §1 → `src/desktop/apps/update.ts` (notify `:213–245`, EULA `:247–265`, install `:267–316`, restart `:318–325`); copy `updates.json:3–58`; spent deferral drawn greyed (`update.ts:240–243`), deferral status line (`:202–211`) |
| Trigger = documented failure, never the player | **BUILT** | v0.5 §1 → `spine.ts:101–111` (diary-glitch, 1.2s); grounding `_sourceGrounding` `updates.json:51–58` (Paulk 2000, `[VERIFY SOURCE]`) |
| **The install glitch — "glitch web aesthetics: the old era's chrome tears, tiles, ghost-frames into the new"** | **⚑ MISSING** | `SCRIPT_UPDATE_v0.4.md:49–52`; v0.8 §1 (the system's glitch, "ominous transformation"). Build: the install screen is a black field + typed changelog + a progress bar whose only glitch is a stutter (`update.ts:313`). The full-frame wash (`app.ts:873–887`) is a flat translucent gradient, and **`onGlitch('system')` is never called anywhere** — the only caller is the diary's `'person'` glitch (`os.ts:412`). This is the lead's named absence (WALKTHROUGH `:103`, and `:100` "the reboot sequence is missing glitching beforehand") |
| **The error cascade before the update** ("a new update is needed" — Error-999-style stack, Retry/Cancel) | **⚑ ORPHANED** | `ERA1_ENDING_SCRIPT_v2.md:105–106` + `s1_end.json:82–104` (`ritual` block: error/errorRetry/errorCancel/loading — AUTHORED). No `src/` file reads `end.ritual`: `packet.ts`/`diary.ts`/`irc.ts` import only their own keys (`packet.ts:11,41–57`, `diary.ts:16,65–204`, `irc.ts:11,176–297`). The chain dies at the imports — the diary glitch goes straight to `armUpdate('u2')` (`spine.ts:111`). This orphan is the desktop half of the "cascade of windows" the lead remembers |
| **The cascade** (v0.8 §7 — the update guides the look-around; the new era resolves; back at the desk, the PC itself is new) | **PARTIAL** | Room half BUILT: the S86 relocation ages the room in front of you — rise/hold/descend (`cluster.ts:280–311`; camera legs `app.ts:183–232`), morph fires mid-leg (`cluster.ts:858–866`), ascent starts on the I-Agree press (`update.ts:115–133,187`). Desk half MISSING: the r2 fold is **0 adds / 22 removes / 1 override** (`reinterp_deltas.json` r2) — the choreography's re-dress (kit brochure → Restorify box; soda → coffee mug; homework → job folder, `REINTERP_TRANSITION_CHOREOGRAPHY:45–47`) never happens; nothing on the desk marks six years (Sérgio: "needs more changes and elements that make it look like we jumped in time", WALKTHROUGH §B) |
| T1's named losses (moon · boombox packed away · mixtape survives) | **BUILT** | choreography `:49–52` → r2 removes `moon`, `boomboxModel`, kit props (`reinterp_deltas.json` r2 remove list); mixtape survives via belongings (`cluster.ts:920`) |
| T1 sound (dial-up handshake stretched under the bar; ballast clunks; fluorescent hum) | **⚑ MISSING** | choreography `:53–54`. No transition audio of any kind is registered (`tapeAudio.ts:24–63` — six entries, none transitional). Same gap at T2 (MSN chime, `:83–84`), T3 (phone-vibration swarm, `:118–119`) and T4 (fan hum → warm chord, `:134`) |
| New embodiment = new login as a new person (v0.8 §4) | **SUPERSEDED** | D15 homecoming law: E2 is DANIEL, older, same room (MASTER_PLAN_v2 §1/§5). The new-person login grammar now lives at E3 ("Welcome back, Vera." `s3_queue.json:9`) and E4 |
| The walls-open staging at T1 (choreography T1.4, hexagon) | **SUPERSEDED** | R24/D14/D15 three-room model; the wall-opening + ballast stutter moved to T2, where it is BUILT (`cluster.ts:285–294` `opensWalls:true`; ballast events `:872–876`) |

# ERA 2 — 2003 · Daniel adult · Room 1 aged (walls closed)

| beat | verdict | evidence |
|---|---|---|
| S2R.0 — silent return: one dim line, the return press | **BUILT** | HOMECOMING `:19–32` → `os.ts:557–566` (silence), `1787–1803` (draw), press files `os.ts:598–605`; copy `s2_lamby.json:3–4` |
| S2R.0b — LambyOS 2003 boot crawl (+ jingle) | **BUILT / silent** | Session-60 beat → `os.ts:643–650,1829–1848`; `s2_lamby.json:7–17`. Jingle: hook wired (`os.ts:648`), **no asset registered** (`tapeAudio.ts:54–62`; `s2_lamby.json:6` documents it) — the boot is silent |
| S2R.1 — Lamby's debut, 2 beats × 2 lines, dismissal files at both | **BUILT** | HOMECOMING `:34–44` → `os.ts:1329–1335` (intro fires), `1812–1823` (draw), dismissal `os.ts:614–636`; `s2_lamby.json:22–32` |
| S2R.2 — the check-in: streak counted while he was away; every answer filed differently | **BUILT** | HOMECOMING `:46–52` → `src/desktop/apps/restorify.ts:62–70` ("412 days" `:65`, "includes supervised period" `:70`), chips `:81–93`, per-chip filing `:158`; `s2_lamby.json:54–63` |
| S2R.3 — Caleb: warm thread → live redaction → `HOMOSEXUAL CONDUCT` → streak dies 412→0 → Lamby consoles ("filed as care") | **BUILT** | HOMECOMING `:54–74` → `src/desktop/apps/caleb.ts` (felt; imports no Lamby) + `src/desktop/apps/accountability.ts` (operable); `s2_caleb.json:66–109` (thread), commit `:97–108`, flag `:116`, streak `:131–133`; ⟨S⟩ lines preserved `:123–128` |
| S2R.4 — the New You infomercial as Lamby's recovery recommendation; "Not now" visibly inert; skip arms at 15s; **the break** | **BUILT** | HOMECOMING `:76–93` → `src/desktop/apps/netvision.ts` + `s2_media.json` (114s `:85`, scenes `:86–126`, disclaimer `:125`, break/tear flags `:121–124`); real 1:54 song registered (`tapeAudio.ts:48`); skip delay 15s (`os.ts:854–856` ← `s2_caleb.json:142`); greyed inert "Not now" (`os.ts:960–969`); break toast after the disclaimer (`os.ts:1292–1299`) |
| S2R.5 — the collapse: PureMail "We have to stop", apology read in Lamby's voice (TTS), streak "412 days · for nothing", un-redaction, one new message from Caleb | **BUILT** | HOMECOMING `:95–106` → `accountability.openMail` (armed `os.ts:1300–1304`); read-aloud WAV registered (`tapeAudio.ts:53`) and wired (`os.ts:813–819`); glitch states `s2_caleb.json:186`; un-redaction `os.ts:797–807`; Caleb's return `s2_caleb.json:192–200` |
| — the jingle returns **broken** (degraded render) | **⚑ MISSING (asset)** | HOMECOMING `:100`; MASTER_PLAN §7 "broken render pending". `s2_caleb.json:188` explicitly un-claims it until a file exists. No broken render on disk |
| S2R.6 — the residue: "Then it was never me that was broken…" chip-committed; system says nothing | **BUILT** | HOMECOMING `:108–113` → `caleb.ts:467–471` (`commitResidue`), `s2_caleb.json:204–205` (⟨S⟩ locked line, filed only as the gap); the spine reads it (`spine.ts:72,126`); mixtape stays playable |
| S2R.7 — u3 ritual + **the dispersal** (Lamby coming apart into the seven marks that arrive as Lambient's badges) + last filing under Daniel's name | **BUILT** | HOMECOMING `:115–132` → `update.ts:60–90,283–307,345–368` (report + `drawDispersal`); `updates.json:110–113` ("could not be removed. RENAMED."); the same seven marks settled on E3's screens (`src/desktop/theme/era3.ts` `drawLambMark`, via `era3Devices.ts`); `subject migrated — file retained` filed at the restart (`os.ts:494–496`, `updates.json:124`, rendered `intake.ts:180–184`) |
| e2.b06 — webcam check-ins / the commercial / MSN thread | **SUPERSEDED** | The E2 HOMECOMING script (R28-2d source of truth) contains no webcam beat; S2R.2–S2R.4 replace it. `restorify.ts:6` excludes it explicitly. Not counted as a loss |
| e2.b07 — the accountability web fails publicly (Exodus analog) | **BUILT** (as S2R.5) | v0.5 §1 trigger table → the collapse is the era's documented failure; the spine closes the era off the residue (`spine.ts:114–141`) |
| s1 — SEND: Daniel → women's track ('03) | **PARTIAL** | Machinery BUILT: offer via `spine.ts:127`, window `os.ts:1099–1141`, resolve → `sends.ts:84–103`. Destination has no content AND no geometry in E2: the bay target (`sends.json:8–11`, `yaw:90` = Room 2's seat) points at a room that does not exist until the r3 fold — walls closed (`cluster.ts:281–284`), Room 2 architecture added only at E3 (`reinterp_deltas.json` r3). The Love Won Out tape / *Restoring Sexual Identity* insert (master script `:132`) was never dressed; the carry-back is a greybox slab (`sends.json:12–24`, `sends.ts:58–72`). Accepting flies you to an un-built void — see SIDE FINDINGS §7 |
| s2 — SEND: severer classification → trans-fem facet ("homosexual continuum" diagram) | **PARTIAL** (same shape) | Facet call BUILT (`sends.ts:98–100` → `niche.setFacet`), but the niche root is **hidden** (`fluid_niche.json:7` → `fluidNiche.ts:116`) so nothing renders; the diagram content (`continuumCounsellingDiagram` hero slot, `fluid_niche.json:28`) was never built; target resolves to Room 3 (`sends.ts:81`), which does not exist in E2 |

# T2 — THE E2→E3 UPDATE (2003 → 2016)

| beat | verdict | evidence |
|---|---|---|
| Walls open + relocation to Room 2; Daniel's boxes; migration filing | **BUILT** | choreography T2 → `cluster.ts:285–294` (`opensWalls:true`, comfort-measured 7/11/11.5); r3 removes `wallWest`/`wallEast` and adds `movingBox1/2` (`reinterp_deltas.json` r3); arrival witness `era3_devices.json:23` |
| — ◆T2: the EULA **as transfer manifest** — "the player scrolls through their own E1+E2 terminal lines re-labeled as assets" | **⚑ MISSING** | `REINTERP_TRANSITION_CHOREOGRAPHY:62–63` (still an open ◆T2 for Sérgio). Build: u3's EULA is static composed text (`updates.json:74–96`) — no ledger lines appear in it. Would need `update.ts` to render ledger-derived lines on u3's pages |
| "case resolved — transferred" (T2.4: Daniel's file closes on the terminal, unprompted) | **PARTIAL** | choreography `:74–76`; master script `:141`. No such string in `data/`; the information reaches the player as "= your file: transferred in full" (`updates.json:106`) + the migration record (`updates.json:124`) + the boxes. The on-screen terminal staging itself was never built |
| e3 arrival — dark workstation → SisterSignal boot → "1 update found" → GracePlatform install + changelog **on Vera's machine** → "Welcome back, Vera." | **BUILT** | Session-61 split → `updates.json:245–264` (`e3_arrival`); `src/room/graceQueueLite.ts:196` (modes), `772–846` (boot/install/sign-in); `s3_queue.json:9`; Daniel's monitor stays dead by law (`os.ts:1523–1565`, S61) |

# ERA 3 — 2016 · Vera · Room 2

| beat | verdict | evidence |
|---|---|---|
| The correction list — APPLY/SKIP, `n of m applied`, skipping files and nothing else happens | **BUILT** | CORRECTION_LIST §§1,3 → `graceQueueLite.ts:525–540` (apply/skip), counter `:1036–1043` (counts applied only), skip doctrine `:50–53`; `s3_queue.json` — 3 submissions (Renata/Noa/Deb M. `:26–66`), 13 corrections |
| Script/scripture doubling — `The Ordering` cites `Household`, same weight, verse never cruel | **BUILT** | CORRECTION_LIST §2 → every one of the 13 corrections carries `manual` + `verse` (`s3_queue.json:67–232`); identical rendering (`graceQueueLite.ts:1097,1124–1133`); Household 6:2 cited three times (`:151,:176,:213`) |
| Noa: two contradictory corrections rendered, neither endorsed; **the video** + correction 13 "Apply the house look" / `Honest Light` / as-sent frame kept / tablet publishes clean | **BUILT** | CORRECTION_LIST rev 5 → `s3_queue.json:50–54,158–180,219–231`; frames `src/desktop/theme/era3.ts` (`NOA_FRAME:323`, `drawNoaFrame:369`, `honestLight:556`); grade transform `graceQueueLite.ts:902–949`; as-sent thumb `:913–922` (`s3_queue.json:48`); clean publish `:686–700`; playing files nothing (`:506–514`) |
| "Route for mentorship" — the recruitment beat, quietest presentation | **BUILT** | CORRECTION_LIST §1 item 7 → `s3_queue.json:146–156` (`quiet:true :153`) and id 12 `:208–218`; quiet suppresses the channel preview (`graceQueueLite.ts:1074–1076,1134–1135`) |
| ⚑ THE BREAK — Malta, from **Bea** on the phone; live blinking reply field that types nothing; **the light lifts**; files NOTHING | **BUILT** | CORRECTION_LIST §4 → `era3_devices.json:13–21` (Bea, the two lines `:17–20`); reply field `graceQueueLite.ts:674–679,574–579`; room lift `graceQueueLite.ts:375–384` → `cluster.ts:700–721` (`E3_LIFT :103–117`, 5s); workstation grade `graceQueueLite.ts:766`; zero filing (the only ledger writes in the file are `:530` and `:723`) |
| The comments thread (tablet): live thread, template picker, **templates propagate** to another account | **BUILT** | THE_JOB §1 → `src/desktop/apps/comments.ts` + `data/dialog/s3_comments.json` (12 comments, 6 templates, one authored echo per template `:36–105`, schedule `:184–197`); propagation never marked, files nothing (`ledger.ts:171–173`) |
| FloppySheep on the phone (one tap away while a comment waits; never filed, never scolded) | **BUILT** | THE_JOB confirmation ("FloppySheep must be there", `:188–192`) → `src/desktop/apps/floppysheep.ts` + `s3_floppysheep.json`; icon on the home screen (`graceQueueLite.ts:620–633`); files nothing (`ledger.ts:174–175`; the module imports no ledger) |
| s3 — SEND: the recycled phrasing → **the dormant earlier file reopens as "referenced material"** (the piece's continuity punch) | **⚑ ORPHANED** | master script `:145` → offer surfaces on Vera's workstation (`era3Devices.ts:505–522`) and can be DECLINED only: `os.ts:1134` (`const allowVisit = this.sendOffer.id !== 's3' && this.sendOffer.id !== 's4';`) re-gated 2026-08-21 because the target (`sends.json:95–98`, `yaw:0` — a retired radial coordinate) is not there, and the fly crashed Sérgio's E3 (WALKTHROUGH §C). The visit leg — the HOPE 2016 sheet carry-back (`sends.json:99–112`) and the witness line "dormant file reopened — referenced material" (`sends.json:116`) — is authored data no player can reach. The chain dies at `os.ts:1134`. Spine gates: `spine.ts:158–162` |
| s4 — SEND: **THE DILEMMA** (the chart has no cell; butch/trans-masc borderland; ◆N4) | **⚑ ORPHANED** (same gate) | master script `:146,:206–207` → `os.ts:1134`; target `facet:transmasc` (`sends.json:134–141`) belongs to the hidden niche (`fluid_niche.json:7`) in Room 3, which does not exist in E3. The borderland copy was never written (master script `:146` "copy = voice pass"). The era's hardest beat is currently unreachable AND unwritten |
| e3.b02 — the Sides A/B/X/Y chart debuts complete (hero object) | **SUPERSEDED?** — decide on paper | master script `:142`. No implementation anywhere in `src/`; survives only as a Close label (`close_network.json:16`) and adjacent copy (`sends.json:152`, `updates.json:105,259`); `paths.json:27` `built:false`. The correction-list redesign (2026-07-30, "stop retrofitting old canon", `:52–55`) contains no chart, and no document retires it |
| e3.b07 — the convergence triptych (all three facets lit; buckets incl. **transgender**; HOPE audio plays *about* her) | **⚑ ORPHANED / SUPERSEDED?** | master script `:147` called it a FELT ANCHOR of every cut. The mechanism exists — `fluid_niche.json:36–37` (`convergence.allowed`), and `setFacet('all')` IS called in play on E3 entry (`cluster.ts:895,913,933` via the era default) — but the niche root is hidden (`fluid_niche.json:7` → `fluidNiche.ts:116`), so the call renders nothing; the hero objects are placeholder slots; the staged beat is `paths.json:30` `built:false`. Nothing in E3's no-room-jumping design gives it a home |
| e3.b04 — femininity homework provotype (FULL cut) | **⚑ MISSING** | master script `:144` ("R5 — unbuilt"). No provotype file, no code |
| **THE JOB's remaining surfaces — the Story (in-point clip), the Podcast (order three clips), the Course (price + payment link), the Livestream (ambient, always on)** | **⚑ MISSING** | `REINTERP_E3_THE_JOB:117–144` — Sérgio-confirmed design (`:185–194`, 2026-08-03); the doc's own header says "§§2–6 below are UNBUILT and remain the design". Only §1 (comments) was ever dispatched (S70, "the first surface of the reframe", `BUILD_QUEUE_LIVE.md:215–221`). Nothing retired the rest — and Sérgio's walkthrough still asks for exactly this: "so filled with text… we need something more dynamic, maybe more visual changes than text" (WALKTHROUGH §C) |
| e3.b08 — the refusal as T3 trigger | **SUPERSEDED** | Correction-list ending: u4 arms when the list is exhausted (`era3Devices.ts:671–674`) or s4 resolves (`spine.ts:164–166`); the refusal survives as u4's notice line "A submission could not be processed as written." (`updates.json:142–144`) |
| E3 has no respite | **BUILT (deliberate)** | Sérgio-confirmed (`THE_JOB:278`); FloppySheep is `operable`, never respite |

# T3 — THE E3→E4 UPDATE (2016 → now)

| beat | verdict | evidence |
|---|---|---|
| u4 on Vera's workstation; L installed via the report block ("~ no further action is required from you"); adopter-thesis clause on EULA page 3 | **BUILT** | THE_SPACE §6 / SOURCE_PASS → `updates.json:137–240` (EULA page 3 `:181–195`, report `:224–228`); composited on the workstation (`era3Devices.ts:262–265,505–522`) |
| THE TURN (◆N3) — restart re-anchors 180°; Maya's desk shares the wall with the record; lamp carried | **BUILT** | master script `:154,:205` → `cluster.ts:295–310` (e3-e4, seat 270; 24s crossing set by the turn's °/s), `homeYaw` 270 (`cluster.ts:811`), `TERMINAL_E4` (`cluster.ts:329`), lamp light rides to Maya's desk (`cluster.ts:567–571,835`; r4 lamp overrides `reinterp_deltas.json:2613–2633`) |
| Lambient → "L" transformation sprite (blob thins to a letterform, slides off-screen) | **SUPERSEDED** | CORRECTION_LIST decisions ("Lambient = the Grace software. Not a character", `:220–221`); L arrives *inside the update* (`updates.json:224–228`) — the stronger, sourced version of the same beat |
| T3 sound (phone-vibration swarm → near-silence) | **⚑ MISSING** | choreography `:118–119`. Nothing registered (same row as T1 sound) |

# ERA 4 — now · Maya · Room 3

| beat | verdict | evidence |
|---|---|---|
| The headset as a real prop; the visor IS the screen (same canvas remounted) | **BUILT** | THE_DEVICE Option A → `era3Devices.ts:74–78` (visor = `DesktopOS.canvas`), `564–586` (`ensureVisor`), `619–662` (`driveVisor` pins it to the head); prop `reinterp_deltas.json:2654–2676` |
| "The one touch" entry | **BUILT** | THE_DEVICE §2 → `space.ts:208–243` (`wear()`, files once), room-side hit (`era3Devices.ts:770–784`), canvas-side (`os.ts:1516,2558–2561`); witness `s4_space.json:9` |
| THE PLACE — home environment, "for you" wall, addressed ads | **BUILT** | THE_SPACE §2 → `src/desktop/theme/era4.ts:189–257` (`homeEnvironment`), tag/tagSub `s4_space.json:5–7`; the wall lives in the offers beat (below) |
| — the store | **SUPERSEDED** (documented cut) | THE_SPACE `:150–151` ("cut the store and the for-you wall… keep the home environment and the turn"); `s4_offers.json:62` records the decision. Not a loss |
| **The turn does not work** (bounded stepped parallax; filed once, flatly; never explained) | **BUILT** | THE_SPACE §4.3 → `space.ts:253–266` (`setLook`, ±40° in 8 steps, files once), witness "orientation: changed — view unchanged" (`s4_space.json:10`), head-mount feeds it (`era3Devices.ts:661`) |
| L's conversation u1–u10: room captions, the unplaceable hoodie, **deadname beat ×2 as misfile** ("under the old file"), friction pattern, shrinking chips u7→u9, the correction chip's return | **BUILT** | ECHO_DRAFT (12 units, redistributed per its own header `:9–16`) → `src/desktop/apps/lVoice.ts` + `data/dialog/s4_l.json:21–336` (all ten units); misfile ×2 (`:124` "still has you under the old file", `:188` "addressed to the old file"; no invented deadname exists anywhere — no `personFormerName`, `lVoice.ts:268–274`); friction u5 (`:159–180`); shrink 3→2→1 live chips (`:250–305`); `textUnvoiced` opt-out (`:125,:189`) honoured via `ledger.view.unvoicedName` (`ledger.ts:312`) + the menu toggle (`gameMenu.ts:232–236`) |
| **L is a VOICE** (E4 is AUDIO-FIRST; "L must sound good") | **⚑ MISSING (the whole era's audio)** | MASTER_PLAN §5 ("DIRECTION REVISED: AUDIO-FIRST… L is a VOICE"); AUDIO_FIRST_DESIGN §1. Build: **not one line is voiced** — zero `l_*` entries in the registry (`tapeAudio.ts:24–63`); the TTS batch is deliberately unrun pending Sérgio's voice pass (`tts_manifest.json:22–38`, `_docNotRun:24`). Today the era is silent captions. Deliberate sequencing, but the player-facing absence is total |
| The memories feature (m1 silent enhancement, undo works, m2 already enhanced) | **BUILT** | DEEP_PASS §2 → `src/desktop/apps/offers.ts` + `s4_offers.json:26–59` (m1 `:32–44`, undo files `offers.ts:488–496`, m2 `:45–57` with `enhanced=[true,true]` start `offers.ts:166–169`); sprites `era4.ts:518–562`; no camera/file input |
| — the inverse: **ball photos return un-enhanceable, "no enhancement available"** | **⚑ MISSING** | `REINTERP_E4_DEEP_PASS:165–174` ("Two mechanisms, one inversion") and §6 (`:260–261`, "in scope"). Build: no such beat — "no enhancement" appears nowhere in `src/` or `data/` |
| The "for you" wall (4 cards; satire collapses on Pastor.AI 3 a.m.; **the export** — "Available in your region." in the fine print, unremarked) | **BUILT** | THE_SPACE §2 / DEEP_PASS §3.4 → `s4_offers.json:61–105` (Pastor.AI `:94–102`, export fine print `:76`), drawn `offers.ts:429–441`, smallest type `era4.ts:607–615` |
| The curation beat + required counter-voice, withdrawn by the system unasked ("3 of 214") | **BUILT** | THE_ARGUMENT §2 / SOURCE_PASS → `s4_offers.json:107–135` (counter `:124–129`, withdrawn `:133`, "3 of 214" `:132`), timed withdrawal `offers.ts:255–273` |
| The careful pause (both live chips advance; "Not now." greyed forever; the gap filed both ways) | **BUILT** | AUDIO_FIRST_DESIGN §2 / ECHO_DRAFT U11 → `s4_offers.json:137–169` (`pause_notnow` `gone:true :162–167`), both-live law `offers.ts:498–517` |
| A ball object brought home; L captions it wrong twice, offers a third, stops | **⚑ MISSING** (minor) | DEEP_PASS §3.3 (`:189–192`). Nothing in `s4_l.json`/`s4_offers.json`; the hoodie (u3, `s4_l.json:84–116`) carries the pattern indoors, but the trophy variant was never made |
| TRANSCENDANCE — the ball: machine hears it first and stops talking; label field fails 7 steps to `NO CATEGORY FOUND`; device off = the turn works; four categories quoting the apparatus's own words; Household/house rhyme unglossed; nothing asks you to leave; **files nothing** | **BUILT** | DEEP_PASS §1 → `src/desktop/apps/ball.ts` + `data/dialog/s4_ball.json` (machine stops `_beat:19`; labels a1–a7 `:21–29`; categories `:53–116`; files-nothing assertion `:134–137` — `ball.ts` imports no ledger); device-off → turn returns (`ball.ts:169–181` → `space.ts:160`); light stations `cluster.ts:177–183,723–757` (never reaches the player) |
| — the ball's **sound** (MC voice, beat, calls, applause) | **⚑ MISSING (assets, deliberately withheld)** | `s4_ball.json:128–132` (recording list, "not a hookup"); `tts_manifest.json:4` (`_docNoBall`: may never be synthesized; waits on real recordings via the reader protocol). The piece's climactic respite is a silent light-and-caption scene until then |
| e4.b02 funnel / e4.b03 purity app / e4.b04 trans-masc phone / e4.b05 Exploratory Care Planner | **SUPERSEDED?** (with one flag) | The S73–S79 E4 suite (`THE_ARGUMENT/THE_DEVICE/THE_SPACE/BUILD_PLAN/DEEP_PASS`) redefined the era as device → L → offers → ball; none of these beats appear in it (the funnel is reinterpreted as the offers suite). ⚑ Flag: with e4.b04 gone, the niche hidden, and s4 orphaned, **the trans-masc presence in the played piece is now one pair of correction lines on Noa** (`s3_queue.json:171–180`) plus a decline-only offer — a thread-level thinning nobody decided on paper (MASTER_PLAN §3 still promises the "trans-masc facet" as content) |
| The finale — glitch → cyclorama slits → four year-panels → hand-off; spends no Close material | **BUILT** | BUILD_PLAN Stage 2 → `offers.ts:124–126,348–363` (glitch bands `era4.ts:695–724`, cyclorama `:770–787`, `eraPanels` `:726–768`, years `s4_offers.json:173`); hand-off `offers.ts:359` → `space.ts:275–279` → `os.ts:1054–1056` → `spine.ts:168–170`; spends nothing (`s4_offers.json:18`) |
| Room 3 dressed as a livable 2026 room | **BUILT** (per current spec; Sérgio's objection open) | BUILD_PLAN Stage 1 → the r3 fold adds 68 Room-3 props incl. Maya's belongings (sketchbook, hoodie, mug, books, sneakers, frame — `reinterp_deltas.json` r3); r4 adds the fixtures (phone assembly, headset, glasses — `:2638–2685`) and darkens the CRT (`:2609–2612`). ⚑ The CRT's presence is a DOCUMENTED decision ("the CRT goes dark and STAYS… the piece's own argument", `THE_DEVICE:154`) — Sérgio's walkthrough reaction ("A CRT makes no sense in 2026", WALKTHROUGH §B) contests that decision and predates nothing; the all-three-rooms logistics pass he asked for is still open |

# THE CLOSE

| beat | verdict | evidence |
|---|---|---|
| The bare restart — "Restart as you are." — no terms, no changelog | **BUILT** | TREATMENT §5 → `updates.json:265–278`; `update.ts:213–224` bare branch |
| **"Your update has failed."** — the title said once, flat, on the machine's own dark restart beat | **BUILT** | TREATMENT §1 → `updates.json:277` (S92) |
| The two-tier constellation — apparatus nodes cool/sharp/labelled/chained; person nodes warm/soft/unlabelled/unlinked; slots not cubes (the building's grammar) | **BUILT** | TREATMENT §3 → `src/room/pointCloud.ts:1–41,71–101` + `close_network.json` (24 labels); the survivors debt paid as "unreadable, numerous and on" (TREATMENT §4) |
| The last press does not loop back to 1997 | **BUILT** | TREATMENT §5 → `enterClose` (`app.ts:3160–3185`) installs no handler; the constellation holds |
| x.b1 — **the lift**: the terminal's lines rise off the wall into warm points; the lamp holds 3 seconds after every other light | **⚑ MISSING** | master script `:166`; choreography T4 `:124–131`. Build: `enterClose()` disables the rooms and shows the cloud in one frame (`app.ts:3163–3180`) — no line-to-node animation (the treatment calls that "a polish pass, not a blocker", `:87–88`), and nothing performs the lamp hold + hand-over, which is the Close's one *felt* transition |
| x.b3 — the unfinished line ("Conversion therapy continues to affect…") | **⚑ MISSING — by law, waiting on Sérgio** | master script `:168`: "surfaced for Sérgio; never completed by any model." Correctly absent from the build; it is the one absence no session may fill |
| v0.6 C.4.1 — **the version history**: every era's update stacked, each stamped `FAILED`, one more row dated today, changelog "(being written)" | **⚑ MISSING — SUPERSEDED? decide on paper** | `SCRIPT_UPDATE_v0.6.md:44–50`; never retired anywhere. The built S92 Close simply doesn't contain it; it exists nowhere in `data/` or `src/`. It is the title's receipt — thirty years of failure itemised |
| v0.6 C.4.4 — **the one uninstalled update**: "UPDATE AVAILABLE — for the world, not for you. Includes: bans that bind · care without conditions · names for what this is. Status: not yet installed." | **⚑ MISSING — SUPERSEDED? decide on paper** | `SCRIPT_UPDATE_v0.6.md:58–66`; still canon in MASTER_PLAN_v2 §5 ("the one uninstalled update", `:161`). The treatment dropped it without a word. This was the ending's entire forward-hope beat — "reality as the report, the better society as the to-do" |
| v0.5 §5 — TransJesus/TRANSCENDANCE **plays clean at the Close** ("the one file the restart restores rather than wipes") | **⚑ MISSING** | `SCRIPT_UPDATE_v0.5.md:156–159`; MASTER_PLAN §5 Close canon ("TRANSCENDANCE plays clean", `:160`) and §5b's warm-objects thread ends "plays clean" (`:174`). The built Close has no audio and no replay of anything. No document retires it |
| The dossier reframe ("Nothing about you was broken…") | **BUILT (re-interpreted)** | TREATMENT §3 argues the apparatus/person asymmetry IS the reframe; S92 built exactly that. The v0.6 text version (`:54–57`) exists nowhere — acceptable under the treatment, noted for completeness |
| "Survivors speak first" (MASTER_PLAN Close canon) | **SUPERSEDED** | TREATMENT §4 (later doc, built as S92): "not a memorial, not a count, and not a line of prose" — replaced by the person tier |
| Point-cloud entered through the X arm (C2) | **SUPERSEDED** | MASTER_PLAN §5 (`:162`) → the treatment's direct entry (built; `spine.ts:171–178` → `enterClose`). `?layout=x` exists but is off the played path |
| The room half-visible during the Close (confirmed 2026-07-24) | **SUPERSEDED?** | `REINTERP_CLOSE_CONSTELLATION_BRIEF:151–160` records the confirmation; S92 disables the rooms outright (`app.ts:3163–3177`). The treatment is silent on it — a staging call, noted so the supersession is not silent |

# CROSS-ERA SYSTEMS

| promise | verdict | evidence |
|---|---|---|
| PATHS — two cuts (FESTIVAL/FULL), composition as data, nothing hardcoded (v0.3 Part III; master script §5; R3-4 law) | **⚑ MISSING** | `PRODUCTION_SCRIPT_v0.3.md:116–143` → one sequence exists and it is hardcoded in `spine.ts:46–51`. **`data/paths.json` is dead metadata: no file in `src/` imports it** (the only reference is `spine.ts:4`'s header comment); its `built` flags are stale in both directions (marks built beats unbuilt: `e1.b07/:17`, `e1.b09/:18`, `e2.b07/:24`, `e4.b06/:34`). No cut-selection surface exists (the intake-panel row above is its front door). FULL-cut-only beats (e3.b04, e4.b03–05, side quests) mostly don't exist |
| Witness symmetry — every response classifies, silence included | **BUILT** | throughout: guide followed/declined (`guide.ts:121–125`), Lamby records, check-ins, sends both ways (`sends.ts:88`), L's "(say nothing)" chips, the held-read files (`ledger.ts:118–122`) |
| Ambient-presence exception — mixtape/duck/monkey never filed | **BUILT** | R28 §2 → `tapes.ts:196`; ball files nothing; Malta files nothing; FloppySheep files nothing (`ledger.ts:165–177`) |
| The computed INTAKE RECORD: **era-specific filing artifacts** (index card → database row/printer → CRM dashboard → moderation console) | **PARTIAL** | `PRODUCTION_SCRIPT_v0.3.md:200–217` → the record accumulates real, traceable lines from every era (`intake.ts:282–387`) — the legibility rule is honoured. But the artifact never ages: the surface is the Era-1 index card in every era — `'index · era 1 · drawer 12'` hardcoded (`intake.ts:266`). Sérgio hit exactly this (WALKTHROUGH §I) and his §J proposal (ages per era + terminology layer + hosts the menu) is a design request on top of the same gap |
| The Assistant's report-view (bubble on your side / cold log on the witness side) | **BUILT** | v0.3 Part II → every conduction files a re-captioned line (`s2_lamby.json` witness block; `intake.ts:327–330`; L's `alsoFiles`) |
| Helpy → Sol → Ami™ lineage; Assistant's Close goodbye ("Can I help?") | **SUPERSEDED** | Reinterp lineage Lambert→Lamby→Lambient→L (master script §2.1), then R28 amendment 2 removed the E1 character; the goodbye's descendants are the dispersal + the ball's silent L. Not a loss |
| Persona cards per era ("composites, labeled" — methodological honesty on the surface, v0.4 §3) | **SUPERSEDED / PARTIAL** | v0.4 §3 (`:143–163`) → per-era arrival beats replace the cards (return press / Vera sign-in / "Hi Maya"); "different lives" disclosed once on the orienting card (`orientingCard.json:5`). ⚑ The "composite, no real person" labelling now lives NOWHERE — not in the fiction, not in the credits (`attributions.json` carries no such line). Flag for Sérgio, not counted as a loss |
| Update triggers = documented failures with sources (v0.5 §1; D5) | **BUILT** | `updates.json` `_sourceGrounding` blocks on u2/u3/u4 (`:51–58,:127–135,:231–240`) — all still `[VERIFY SOURCE]`, awaiting Sérgio |
| Sift™ mark + shared autocomplete format; the search-bar hint beat (v0.4 §5) | **PARTIAL / SUPERSEDED?** | Sift exists as an invented mark on the E4 wall (`s4_offers.json:80`); no search bar, no autocomplete data format, no dormant link anywhere (`v0.4:188–203`). The E4 redesign has no search surface; the shared-format infrastructure half (U5) was never made and nothing retires it |
| Zap! / JUST CHANGE™ ad-game embeds (v0.5 §6, V5 "first repo task after vertical slice") | **⚑ MISSING** | `SCRIPT_UPDATE_v0.5.md:164–196`. The 2026-07-25 redirect (LAMBY_GAME_CONCEPT / JUST_CHANGE_BUILD_SPEC) moved the game to its own repo and kept only the E1 floppy game in-piece — which is also missing (ERA 1 table above). Needs a paper decision: embed, or retire V5 |
| TransJesus — `transjesus.str` found in E2/E3, survives every update, targets around never through | **SUPERSEDED (E4 half) / ⚑ MISSING (E2/E3 + Close)** | `SCRIPT_UPDATE_v0.5.md:136–160`. The E4 respite half is reinterpreted as the ball (DEEP_PASS §1.4: "the ball is the room; the stream is how the apparatus receives it"). The E2/E3 discovery beats have no successor and no retirement; the Close payoff is the "plays clean" row above. Zero `transjesus` traces in `src/` or `data/` |
| SOGICEfy player, dual life — your music vs the witness-side "corrected" library (v0.4 §2) | **SUPERSEDED?** | `SCRIPT_UPDATE_v0.4.md:126–132`. Zero traces in the build; the tape system covers E1's "your music" respite. No document retires the witness-side shadow — flag for Sérgio |
| Title lock: YOUR UPDATE HAS FAILED + subtitle "Nothing to update. Change has failed." (v0.7 §1) | **PARTIAL** | `SCRIPT_UPDATE_v0.7.md:13–20` → title everywhere (`orientingCard.json:3`); the locked subtitle exists only in the orphaned `s1_end.json:113` close block — no player-reachable surface carries it (the card's subtitle is the institutional strapline) |
| No runtime network / no storage / in-memory ledger **wiped on exit, idle, refusal** (CLAUDE.md hard invariant) | **PARTIAL — ⚑ the idle half is MISSING** | Exit + refusal wipes BUILT: `ledger.ts:355` (`beforeunload`), `os.leave()` (`os.ts:2701–2707`), menu Restart/Leave (`gameMenu.ts:300–318`). **Idle wipe: no code** — no inactivity timer exists anywhere in `src/` (no `idle`/`attract`/`inactivity` matches). ⚑ `00_WHERE_THINGS_STAND.md:27` claims "The ledger already wipes on idle — that part is done"; the claim is false. For an exhibition machine this is the difference between a visitor's name evaporating and it sitting on screen for the next visitor |
| Attract state / return-to-start for a walked-away visitor | **⚑ MISSING (known)** | `00_WHERE_THINGS_STAND` §3 — honestly tracked, still absent; listed because the next player feels it |
| TTS read-aloud for long in-world text (standing accessibility principle, 2026-07-24) | **PARTIAL** | One surface has it (the PureMail apology — built AND wired, `s2_caleb.json:170`, `os.ts:813–819`). The EULAs, the correction list, the Close — nothing else is read-aloud-able |
| Movement: seat markers from E3 on, blink cuts, never gaze-armed; instructions | **BUILT** | R28 §2 → `movementNodes.ts` + `nodes.json` (E1/E2 zero markers, E3 r1/r2-desk + tablet/phone, E4 adds r3-desk; era gating `:14–86`); blink cut `app.ts:382–383`; instructions on the card (`orientingCard.json:14,21`) + moveHint (`reinterp.json`) |
| Game menu (Esc): resume/restart/controls/credits/leave; frame voice; Recentre; unvoiced-name toggle | **BUILT** | R28 §4 → `src/desktop/gameMenu.ts` mounted before either engine (`main.ts:67`); credits carry attributions + the ballroom cultural credit + the two E4 dossier source cards (S87, `gameMenu.ts:274–291`) |
| Look-mode 3 (gyro) + pinch-FOV + tap-on-release (S80) | **BUILT** (per code; ⚑ never verified on a real phone — CLAUDE.md's own caveat) | `app.ts` motion states (`applyMotionLook:1939`), tap resolved on release at 10px/1.2s (`:2334–2335,2618–2639`), pinch FOV 30°–80° (`:2357–2359,2584–2590`), Recentre (`:2052–2056`) |

---

# ⚑ CORRECTIONS TO THE PRIOR AUDIT (`_Claude` file)

*The prior audit is otherwise corroborated. Six of its claims did not survive re-verification; they are
corrected here so the next session does not trust a stale document — this project's standing trap.*

1. **e1.b03 (first-filing reveal)** was marked BUILT. The visible beat (ceiling wake + light-leak seams)
   was **retired at R26/S61 by Sérgio's own instruction** (`app.ts:2275–2280`, `cluster.ts:814–821`);
   only the state change survives. SUPERSEDED, not BUILT — and not a loss.
2. **Convergence (e3.b07)** was described as "nothing in play ever calls `setFacet('all')`". It IS called
   on every E3 entry (`cluster.ts:895,913,933` via the era default) — but the niche root is hidden
   (`fluid_niche.json:7`), so the call renders nothing. The verdict (ORPHANED) stands; the mechanism is
   one step further gone: live call → invisible geometry.
3. **Room 3 "zero belongings / no CRT"**: the r3 fold now adds 68 Room-3 props including Maya's
   belongings, and the CRT's presence is a documented decision (`THE_DEVICE:154`), not an oversight.
   The prior framing was out of date the day it was written (the r3/r4 folds landed 2026-08-20/21).
4. **Tape C**: not all 40 segments are "captions over hiss" — track 1 is a real registered recording
   (`tapeAudio.ts:30`); only tracks 2–3 are silent by design (`s1_tapes.json:285,293`).
5. **The "composite, no real person" persona label** is not "in the menu credits" — it is nowhere
   (`attributions.json` carries no such line). The gap is real; the prior location was wrong.
6. **The lamp-carry citation** `cluster.ts:143` pointed at the E3_LIFT doc block; the lamp carry is
   `cluster.ts:567–571` (called at `:835`). Same beat, wrong line.

# THE TEN MOST DAMAGING ABSENCES, RANKED
*"Damaging" = a player feels the gap. Retirements are excluded; deliberate sequencing (voice passes)
is included where the player-facing effect is total.*

1. **The piece is nearly silent, and its last act was designed as sound.** E4 is "audio-first" and no
   line of L is voiced; the ball — the emotional summit — is a light show with captions; the E2 boot
   jingle is a hooked empty socket; the broken jingle, every transition sound, and the kit's hymn are
   absent. Six audio files exist in the whole work (`tapeAudio.ts:24–63`). Much of this is deliberately
   sequenced behind Sérgio's voice pass — but that voice pass is the bottleneck for the single largest
   felt gap in the build, and the ball's real-recording plan has no owner or date.
2. **The E1→E2 transition spectacle — the lead's named loss, confirmed.** The desktop-side install is a
   black screen with a typed list and a stuttering bar (`update.ts:313`); the promised chrome-tearing
   glitch-web install (v0.4 §1.1.3) has its machinery built and never called (`onGlitch('system')` has
   no caller); the pre-reboot error cascade is authored and orphaned (`s1_end.json:82–104`); the desk
   re-dress that shows six years passing never happens (r2 fold: 0 adds). This is also the transition
   every player sees first. One-line fixes exist for two of the four parts (call the system glitch on
   install; read the orphaned cascade block) — the desk needs real content.
3. **Era 3 is still the text-heavy era its own design was confirmed to fix.** THE JOB (2026-08-03,
   Sérgio-confirmed) specced four more workday surfaces — the Story, the Podcast, the Course, the
   Livestream — exactly answering his "too much text, something more dynamic" complaint; only the
   comments surface was ever dispatched (S70). The design remains unbuilt and unretired, and Sérgio's
   walkthrough (2026-08-21, §C) repeats the complaint verbatim. This is the most recent absence on the
   list, and the one with the clearest paper trail.
4. **s3/s4's visit legs are gated off, and with them the era-linking payoffs.** The re-gate was the
   correct emergency call (the targets are retired-layout coordinates; visiting crashed E3) — but until
   the sends are retargeted to places that exist, the trans-masc borderland dilemma (◆N4, the era's
   hardest beat, copy never written) and the "dormant file reopened — referenced material" continuity
   punch are unreachable authored content (`os.ts:1134`). s1/s2 visits still "work" and fly into rooms
   that do not exist in E2 — a summons that lands in a void teaches the player the offers are noise.
5. **The Close dropped its receipt and its hope.** The FAILED version-history stack (v0.6 C.4.1) and
   the uninstalled update "for the world, not for you" (C.4.4) — the latter still canon in MASTER_PLAN
   §5 — exist nowhere; TRANSCENDANCE never plays clean. The built Close lands the title reversal
   beautifully and then has nothing to say about the thirty documented failures or the to-do it was
   meant to hand the audience.
6. **No idle wipe, no attract state — and a status file says the wipe is done.** For the exhibition
   this is a privacy invariant (CLAUDE.md hard invariant) failing silently on the venue floor.
   `ledger.ts:355` is the only automatic wipe; `00_WHERE_THINGS_STAND.md:27` is wrong.
7. **The graying task (e1.b06) and the mixtape's resistance — glitch #1 never fires.** E1's one
   room-scale interactive task, with its ◆N1 design already resolved on paper, has zero code. The
   piece's glitch-doctrine ladder (diary → mixtape → TransJesus → finale) is missing its second rung,
   and the props sit in the room unconnected (Sérgio felt exactly this: "nothing connected to the
   racket").
8. **The intake record doesn't age.** Thirty years pass and the witness artifact is a 1997 index card
   in 2026 (`intake.ts:266`). The v0.3 Part V per-era artifacts were the witness side's whole
   time-arc; the lead independently asked for this twice in his walkthrough (§I, §J).
9. **The trans-masc thread has quietly thinned to almost nothing.** Between the orphaned s4, the hidden
   niche (`fluid_niche.json:7`), the superseded e4.b04 phone, and the never-written borderland copy,
   the played build's entire trans-masc presence is two correction lines on Noa's submission. Every
   individual step had a reason; nobody chose the sum. (Same audit lens, smaller: the "girls' program"
   seed for s1 was never planted; the E1 JUST CHANGE floppy game was never built.)
10. **The E3 felt anchor vanished without a decision.** The convergence triptych (e3.b07) — a FEST+FULL
    *felt* beat in the master script — is a live call into invisible geometry with no staging; the
    Sides chart (e3.b02) survives only as a Close label. If the correction-list era supersedes them,
    no document says so; if it doesn't, the era lost its second emotional peak (Malta is carrying the
    whole era alone).

## And, stated plainly, what is in better shape than the fear

The walkthrough's despair ("so much is missing, so much got lost") is mostly about **sound, rooms,
pacing — not about lost beats.** Of the ~110 promised beats walked above, the large majority are BUILT
with their triggers verified, including everything hardest to get right: the homecoming, the Caleb
redaction and collapse, the dispersal, the correction list with Noa's video and as-sent frame, Malta's
light, the template propagation, the whole ten-unit L conversation with the misfile beat and the
shrinking chips, the memories, the wall, the curation counter-voice, the ball's four categories quoting
the apparatus's own thirty years, and a Close that lands the title. The losses are real, listed, and
countable — **thirty-nine ⚑ loss-candidate rows above (24 MISSING, 5 ORPHANED, 10 PARTIAL), plus four
silently-superseded rows that need a decision on paper** (the Sides chart, e4.b02–05, SOGICEfy, the
Sift infrastructure half — and, if Sérgio ratifies the Close treatment against the v0.6 canon, the
version history, the uninstalled update and "plays clean" join the retirements rather than the losses).
Two of the 24 are not build debts at all: x.b3 waits on Sérgio by law, and the era's voice waits on
his voice pass. The fear can retire; this list replaces it.
