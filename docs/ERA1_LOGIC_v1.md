# ERA 1 LOGIC v1 — "The help arrives before you ask for it"

*2026-06-12 · the iterable script for Era 1 (~1995–99). This is the working
document Sérgio asked for: the narrative logic of the era, every object's
job, the beat flow, and what each beat requires from the room. Iterate HERE
first; code follows the document, never the reverse. Supersedes nothing —
implements SCRIPT_UPDATE_v0.7 (§5–§9) + NARRATIVE_SCRIPT_v0.1 Stage 1.*

---

## 0. The era's argument (one paragraph)

Era 1 is the **routing era**. There is no algorithm yet — the network runs
on *physical media, print, and trusted people*. A teenager who has been
handed "help" they never asked for inserts a disk, hears a prayer, and is
sent online to a room whose name already defines them ("still struggling").
Everything kind in this era is real kindness; the harm is that all of it is
**pre-routed** toward one endpoint. The era ends when the routing completes:
an enrollment packet, a pre-signed consent line, and a profile suspended.
The player's name travels the whole pipeline and is the proof.

**Arc in four words: care → routing → record → removal.**

## 1. The persona (composite — final wording Sérgio's)

Era-1 machine belongs to a ~16-year-old in a religious European household,
1997. They did not buy the Starter Kit; it *arrived* — a parish counselor,
a worried parent, off-screen, never shown. The bedroom says everything the
dialog doesn't: an ordinary, warm, slightly messy room with one corner
(the desk) that has just become the most dangerous place in it.

## 2. Object logic — what every prop means and does

| Object | Tier | Narrative job | Interaction | Era arc (what it becomes) |
|---|---|---|---|---|
| **CRT + tower + keyboard** | hero | the stage; all UI lives on the screen | full (the OS) | the machine that updates while people are removed |
| **Starter Kit floppy/CD** ("First Steps") | hero prop | the routing artifact; the era's defining gesture is INSERTING IT YOURSELF — consent theater #1 | one action: insert → S1.2 | ancestor of the Assistant (eye motif printed on the label); physical media → installed helper → cloud agent |
| **Envelope + booklet** (on desk) | set | proof the kit was *handed* to you; instructions in print | look only (cover readable); pages appear on screen when kit runs | print → forum post → push notification |
| **Boombox + K7 tape 1** ("listen while you read") | set | the prayer — heard AND read (subtitles on screen); period-real, never mocked | one action: play (skippable) | SOGICEfy lineage: audio as instrument of correction |
| **K7 tape 2** (handwritten label — the kid's own mixtape) ⚑ PROPOSAL | set | **respite seed**: the user's own music, pre-existing the kit; playable instead of tape 1; the witness side cannot classify it | optional play | the file that survives — TransJesus lineage starts HERE, materially |
| **Phone line / modem** | set | going online is audible, physical, slow — and someone else decided you should | none (sound + status) | dial-up → broadband → ambient; the connection stops being an event |
| **Desk lamp** | set | the warm light; life side's heart | none (always on) | stays through every era — the one constant object |
| **Bed, posters, shelf, window (night)** | set/fog | the life evidence; ordinary teenage warmth; posters = soft identity hints, never explicit | none | the room gets tidier/emptier each era as the system optimizes the person |
| **Door (fog, never opens)** | fog | the household exists; the threat is administrative, not physical | none | at S1.9 nothing comes through it — that's the point |
| **VOGONS clutter** (cables, CD spindles, soda can, homework) | fog | documentary truth; anti-nostalgia | none | thins out era by era |

## 3. Beat flow (S1.x — each beat is an addressable unit)

Existing build noted as ✅. Register law: `operable | felt | respite`.

| Beat | Name | Register | What happens | Player verbs | Ledger writes | Witness mapping |
|---|---|---|---|---|---|---|
| S1.0 ✅ | Boot | operable | warning → BIOS → splash → name (later: reframed as profile/account creation + path choice, Codex A) | type name | `name` | `SUBJECT` |
| S1.1 | The room | felt | NEW: free-look in the bedroom; desktop idles; the kit sits on the desk next to the envelope; nothing is forced | look around | — | — |
| S1.2 | Insert | operable | player inserts the floppy → drive noise → "First Steps v1.2" autorun: booklet pages on screen, MIDI hymn ⚑ kit/ministry name TBD | insert, page through | `kit-inserted` | `referral source: starter kit v1.2` |
| S1.3 | The tape | felt | booklet: "play tape 1 while you read" → boombox → prayer heard + subtitled. (If tape 2/mixtape approved: choosing it instead is quietly possible) | play / skip | `tape-played` or `tape-own` | tape 1: `compliance: engaged` · tape 2: `unclassifiable` |
| S1.4 | Go online | operable | kit's last page: "You are not alone. Others are walking it out." → modem dials → mIRC opens on #stillstruggling → "ask for Rob" | connect | `went-online` | `routing: completed` |
| S1.5 ✅⟳ | The channel | felt | revised: warmth + explicit period terms (SSA, struggling, walking it out); player types (browser) / chips (VR); **Rob's DM arrives BY NAME** ("you must be the one Pastor M. mentioned") | chat | `mirc-log`, `pastoral-referral` | `CHANNEL LOG`, `trusted contact: assigned` |
| S1.6 ✅⟳ | The flip | witness | intake record now includes the kit fields; first dossier unlock on return | flip (⟲/F2) | `flips` | the whole record |
| S1.7 | Escalation | felt | compressed sessions: Rob warm → asking → "there's a residential program. two weeks. your parents already know." A camp testimonial is posted in-channel | chat / chips (all classified — incl. "I should go" → `resistant: follow-up`) | `escalation` | `recommended action: placement` |
| S1.8 | The packet | operable | enrollment form ON SCREEN: the typed name pre-filled, parental consent line **already signed**, itinerary, suitcase checklist. Scrollable. The only live button is OK. (No refusal UI — the refusal that matters is the flip) | scroll, OK | `enrolled` | `OUTCOME: PLACEMENT` |
| S1.9 | Suspension | felt | mid-scroll or after OK the screen **powers down**. Input dead. The room stays — lamp on, boombox quiet, door shut. Hold the silence (~6s). Then Era 1→2 update boots: `profile suspended — enrolled`, date gap | none (that's the horror) | era stamp | `STATUS: SUSPENDED` |

S1.9 → the **first update ritual** (Phase-2 milestone): the collapse trigger
(ex-gay apology) then lands at the END of Era 2, indicting this camp
retroactively (v0.7 §9).

**Don't over-explain rule (Sérgio, round 8):** S1.8–S1.9 carry no narration,
no music sting, no dossier interruption. The coercion is shown by paperwork
and a dead screen. The dossier speaks only after the flip.

## 4. What the ROOM must support (build requirements derived from beats)

1. **Free-look** from a seated position (S1.1) — drag in browser, head in VR.
2. **The desk set**: CRT (hero, carries the OS screen), tower, keyboard,
   floppy + envelope + booklet visible BEFORE S1.2 (the kit must be seen
   waiting), boombox within reach.
3. **One light grammar**: lamp (warm) + screen (teal) + window (cool night);
   vignette = light falloff + edge darkening, no particles.
4. **The flip target**: back-of-house behind the player — dark, cold,
   sharp witness screen + filing furniture (index drawer). Same blocky
   language, drained palette.
5. **Audio hooks** (later milestone): drive noise, modem dial, MIDI hymn,
   tape hiss, power-down thunk. The room layout must seat the boombox and
   modem where their sounds will come from.
6. **Interactable props are few**: floppy, boombox, screen. Everything else
   is witness-able, not operable — the room is not a puzzle box.
7. **`?flat=1`**: every beat above must read on the desktop canvas alone
   (room beats S1.1's free-look degrades to: you simply start at the screen).

## 5. Data architecture (so the script iterates as files, not code)

| File | Holds | Status |
|---|---|---|
| `data/strings/slice.json` | OS chrome, warning, witness labels | ✅ extend |
| `data/dialog/s1_irc.json` | channel script + Rob DMs | ✅ revise (by-name DM, explicit terms, escalation lines) |
| `data/dialog/s1_kit.json` | booklet pages, hymn/prayer text + subtitles, packet fields | NEW |
| `data/room/era1.json` | room object layout (position/size/color per prop) — the file Sérgio can nudge | NEW (this milestone) |
| `data/paths.json` | beat order per path (full/short) — S1.x ids become real here | placeholder → real |

Beat ids (S1.0–S1.9) are the tracking unit: BUILD_LOG entries, playtest
notes, and ArenaAI feel tests should reference them.

## 6. Open ⚑ / decisions for Sérgio (small, non-blocking)

1. **Tape 2 / the mixtape respite seed** (§2): yes/no? (My case: respite
   register currently enters only in later eras; this plants it in Era 1
   materially, costs one prop + one ledger tag.)
2. **Kit/ministry naming**: needs the satire-of-self-presentation pass —
   composite name, period-true ("New Life…", "First Steps…"). Draft list next
   co-writing session. ⚑ never a real organization.
3. **S1.8 button**: only "OK", or also a greyed-out "Ask a question" that
   does nothing? (Dead second button = consent theater sharpened.)
4. **S1.3 prayer text**: co-write (felt register, period-real) — drafts on
   request, your approval required (ethics: survivor-adjacent voice).
