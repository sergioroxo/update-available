STATUS: live

# SCRIPT VS BUILD — side findings (bugs, stale claims, style; NOT absences)
*Companion to `SCRIPT_VS_BUILD_2026-08-21.md`. The audit was read-only; everything here was noticed
in passing while tracing beats and is recorded instead of fixed. Other passes own these — but several
directly caused or will cause the false "content is missing" impression the main audit exists to
dispel, so they are worth their own list.*

## 1 · `paths.json` is dead metadata wearing a live file's clothes
`data/paths.json`'s `_doc` says "the spine walks the built beats" — **the spine never reads
paths.json at all** (`src/narrative/spine.ts` imports only the ledger, the OS and the update key;
the sequence is hardcoded in its switch). This also breaks the R3-4 law the file itself cites
("composition is data, nothing hardcoded"). Worse, its `built` flags are badly stale and now
mislead any reader: `e1.b07_diary` and `e1.b09_glitch` are marked `built: false` ("main-drift")
while `DiaryApp` + the diary-glitch trigger are fully built and wired (`os.ts:407–419`,
`spine.ts:105`); `e2.b07_collapse` is marked false while S2R.5 ships; `e4.b06_finale` is marked
false while the S78/S88 finale ships. Either make the spine read the file or mark the file
historical — as it stands it is exactly the kind of stale claim that cost this project six sessions.

## 2 · `00_WHERE_THINGS_STAND.md:27` contains a false claim
"The ledger already wipes on idle — that part is done." No idle timer exists anywhere in `src/`;
the only wipe triggers are `beforeunload` (`src/state/ledger.ts:355`), Leave, and the menu's
Restart/Leave. The file whose own banner says "if it disagrees with a conversation, believe this
file" is wrong about a hard invariant (CLAUDE.md line 79 promises exit/idle/refusal wipes). Fix the
sentence now; build the timer whenever the exhibition lane runs.

## 3 · Stale spatial-model prose in a STATUS: live doc
`docs/REINTERP_TRANSITION_CHOREOGRAPHY_2026-07-04.md` is marked live but stages T1 on the retired
hexagon/wedge cluster ("the space resolves as a HEXAGON aligned to three 120° facings", `:31–42`)
and T3 on the retired browser dolly-between-seats grammar. R24's three-fixed-rooms model and the
S67 relocation superseded both. The dramaturgy (losses/persists tables, lamp carry, boxes) is still
the operative promise-set — the audit used it that way — but the doc needs a header note before it
misleads another cold session.

## 4 · Stale trigger comment in `era3Devices.ts`
`src/room/era3Devices.ts:274–280` still says the spine "waits at `e3_s3` forever" and the sends are
latent with "nowhere to draw." Since S87 the offers draw on Vera's workstation and since 2026-08-21 the
spine's E3 path gates on `ledger.graceQueue` and does advance. The armFinal fallback is still the
right mechanism, but the comment describes a dead world; the note "when the sends land, the spine
should take this trigger back" is the actual open task and deserves to be the headline.

## 5 · Two update-arming authorities for u4
u4 can be armed by `era3Devices.ts` (correction list exhausted → `armFinal()`) and by
`spine.ts:163–165` (`e3_s4` path: s4 resolved + 8s). `armUpdate` guards re-entry, so no double
ritual — but two independent authorities for one era-ending event is the kind of drift that made
E3 unplayable once already. When s3/s4 are retargeted, pick one owner (the spine, per the
era3Devices comment's own recommendation).

## 6 · The kit's `midiNote` label
`data/dialog/s1_kit.json:13` — "companion cassette insert" — is the string Sérgio flagged as unclear
("'companion cassette insert' is not clear what it is, maybe remove", WALKTHROUGH §E). One-line
change, left for the voice pass since all E1 copy is his to finalise.

## 7 · s1/s2 visits fly into closed rooms (bug, and the s3/s4 failure's sibling)
`data/sends.json` targets s1 at `{bay, yaw:90}` and s2 at `{facet: transfem}` — both authored for
the retired radial layout, exactly like the s3/s4 targets whose visits were re-gated on 2026-08-21
(`os.ts:1115–1134`). But **s1/s2 are still visitable**, and in E2 the walls are closed
(`cluster.ts` `e1-e2` `opensWalls: false`): accepting s1 dollies the camera to Room 2's seat —
Vera's dressed 2016 room, six years early, through/behind a sealed boundary — and s2 dollies to
Room 3 (`sends.ts:81`, facets return 270). Nobody appears to have played the visit leg since the
three-room model landed. Either extend the S87 gate to s1/s2 until retargeting, or retarget all
four together. (Recorded here as a bug; the main report carries the content half — the bays were
never dressed.)

## 8 · Orphaned blocks inside a referenced file defeat the C9 reachability check
`data/dialog/s1_end.json`'s `ritual` (`:82–104`) and `close` (`:105–115`) blocks are read by no
code (irc/packet/diary import only their own keys), yet check-spec reports "content reachability:
0/0 unreferenced" because C9 works at file granularity. The project's hardest-won lesson ("checks
prove files exist, never that a player can reach them") applies one level down: a key-level
reachability pass would have caught both this orphan and the paths.json drift.

## 9 · The `close` update's `notifyTitle` is a single space
`data/strings/updates.json:268` — `" "`. Presumably deliberate (a bare frame), but a magic
whitespace string with no `_doc` will read as an accident to the next session; one comment would
immunise it.

## 10 · `E4_HOLD = 22` still lives in the spine
`spine.ts:39` keeps the placeholder 22s E4 timer; it is neutralised by `e4HoldsTheSpine`
(`os.ts:1054–1056`) rather than removed, so the close arms the instant the ball hands off (the 22s
have always elapsed). Harmless today, but the constant's comment no longer describes what happens
and the arming latency is really "0 after hand-off," which matters if anyone ever tunes the
post-ball quiet.
