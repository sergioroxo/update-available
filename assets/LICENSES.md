# Asset licenses

Every 3D model / asset shipped in `assets/` is listed here with its source and
license. **CC0** needs no attribution; **CC-BY** (and anything with an
attribution clause) MUST be credited in the in-piece colophon. No asset lands in
the build without a row here (see `docs/ASSET_PIPELINE.md`).

Aesthetic law still binds imported models: **no textures** — models are recolored
flat to the era palette in code. Pick ONE low-poly family and stick to it (don't
mix art styles between rooms).

| Model key | File | Source | License | Attribution needed | Notes |
|---|---|---|---|---|---|
| bed | bedSingle.glb | Kenney Furniture Kit | CC0 | no | recolored flat per room |
| desk | desk.glb | Kenney Furniture Kit | CC0 | no | |
| chair | chairDesk.glb | Kenney Furniture Kit | CC0 | no | |
| bookcase | bookcaseOpen.glb | Kenney Furniture Kit | CC0 | no | |
| rug | rugRectangle.glb | Kenney Furniture Kit | CC0 | no | |
| nightstand | sideTable.glb | Kenney Furniture Kit | CC0 | no | |
| opening_corkboard | wallCorkboardCreativeTrio.glb | Poly Pizza — "Wall Corkboard" by CreativeTrio | CC0 1.0 | no | geometry only; material overridden flat in code |
| plant | pottedPlant.glb | Kenney Furniture Kit | CC0 | no | Room 1 (C1), new r1-only dressing (windowsill corner) |
| _(staged)_ | lampSquareTable.glb | Kenney Furniture Kit | CC0 | no | copied, not yet wired |
| cassettePlayer | cassettePlayer.glb | "Casette Player" by Jason Toff, via Poly Pizza (https://poly.pizza/m/8Yu2_1Hfq4z) | CC-BY 3.0 | **yes** — see `docs/reinterp/ATTRIBUTIONS.md` | Session 32 (R28-2b-ii): Sérgio's live-playtest fix for the box-built `boombox` prop reading misaligned/clipping the Room 1 shelf's front-left support. Replaces ONLY the `boombox` prop's fallback box in reinterp (`data/room/reinterp_deltas.json` r1 — the `boomboxSpeakerL/R`/`boomboxDeck` sub-boxes are zeroed-out alongside it, since the single-mesh model already reads as one complete object); non-reinterp/baseline untouched. Native GLB bbox measured directly (no 3D viewer available) and used to compute `cx`/`cz`/`baseY` in `data/room/models.json` (scale non-uniform: `[0.55, 0.72, 0.37]`) — verified in-browser (oblique screenshot, no clipping, sits flush and centered) but not yet foreground-reviewed by Sérgio; treat the exact yaw/scale as a first pass, not final. `assets/Assests/"Boom box.glb"` (also CC-BY, Poly by Google) was evaluated first and declined: it unpacks as a 147-mesh, huge-coordinate-range file (looks like an unrelated bulk/scene export, not a single clean boombox prop) — flagged in case a cleaner single-object export turns up later. Session 54: rotated 90° (`models.json`'s `tilt`) — the native mesh reads as a handheld deck authored to lie flat with its controls facing up, so no `yaw` (Y-axis only) could ever turn its face toward the Room-1 seat; scale.x cut 0.55→0.40 afterward so the now-upright unit clears the real shelf board above it. |
| cassetteTape | cassetteTape.glb | "Cassette tape" by Poly by Google, via Poly Pizza (https://poly.pizza/m/aR5ot8Z7_-v) | CC-BY 3.0 | **yes** — see `docs/reinterp/ATTRIBUTIONS.md` | Session 54: revisits Session 24's C1 furnishing-pass decline below ("Cassette tape variants — both local copies are CC-BY; declined, mixtape stays a raw box") on Sérgio's direct instruction this session, now that the cassettePlayer precedent already established CC-BY-with-attribution as usable per D6 and the three tapes genuinely needed a body. Of the two local copies, `Pc_Simulation/Assests/"Cassette tape.glb"` (14 meshes, huge unrelated coordinate range) was declined again for the same reason Session 32 declined "Boom box.glb" — a bulk/scene export, not a clean single prop; `"Cassete Tape.glb"` (ONE mesh, 908 verts) was used instead. Its native GLB carried an embedded 2048×2048 baseColorTexture (obj2gltf output) that the no-textures law forbids shipping — stripped at import time with `@gltf-transform`'s Node API (geometry + a flat placeholder base color only; the real per-prop tint comes from `tintModel` same as every other model), which also cut the shipped file 1.47MB → 25.7KB. Authored standing on end (native bbox min[-4.337,0.134,-0.480] max[4.486,5.549,0.470]: length already horizontal, but width stands vertical where thickness should be) — `tilt` [90 pitch, 0] in `models.json` lays it flat, matching how tapeA/tapeB/mixtape already rest on the shelf. Wired onto tapeA/tapeB/tapeAInSlot/tapeBInSlot/tapeCInSlot (all `add`-introduced, so `model` worked immediately) and mixtape (an era1.json BASELINE prop — see `clusterMorph.ts`'s new box→model upgrade path and `reinterp_deltas.json`'s mixtape `_doc` for why that one needed a runtime fix, not just a manifest entry). |

Kit: **Kenney Furniture Kit** (https://kenney.nl/assets/furniture-kit), CC0 — no
attribution required. Authored at ~half real-world scale (pipeline applies ×1.9);
models auto-center on their prop position. Used in the reinterp side rooms
(Room 2 & Room 3) and now Room 1 (C1: desk/chair/bed/bookcase/rug/plant, all
reinterp-only via r1 — era1.json itself stays byte-identical to the shipped
baseline; see `data/room/reinterp_deltas.json`'s r1 block and its C1 comment
in `tools/gen_rooms.mjs`).

## C1 asset-library review (2026-07-10, Sérgio's curated
`/Users/sergiogalvaoroxo/Pc_Simulation/Assests` folder, catalogued in
`docs/reinterp/ASSET_RESISTANCE_DASHBOARD_2026-07-09.md`)

Reviewed for Room 1 (Era 1) furnishing. Only the Kenney `plant` above was
brought in — everything else was declined this session, logged here per the
brief's "side-room consistency wins, log the conflict" instruction:

- **"Computer 90s" / Monitor** — declined twice over: (a) CC-BY (Charlie /
  TheFlyingPotato via Poly Pizza — would need a colophon credit, and Session
  29 already set the house policy of preferring CC0 until that policy is
  explicitly accepted); (b) the CRT is `hero` tier (`era1room.ts`
  `classifyProp`) and the Kenney-model treatment is deliberately reserved for
  `set`/`personal` furniture — side rooms never modeled their own CRT either,
  it stays a crisp raw box by design ("the system's instruments are the most
  defined objects").
- **Desk Lamp** (Household Props 001, CreativeTrio) — declined: the lamp is
  `set` tier and side rooms never modeled theirs (it rides raw-box between
  rooms at E4 in `reinterp_deltas.json` r4). Modeling Room 1's lamp alone
  would break tier-discipline parity with the side rooms.
- **Radio.glb** (Quaternius, confirmed CC0) — considered as a `boombox`
  replacement (same `personal` tier as the modeled bed/rug). Declined: it
  would mix a second low-poly art family into a room whose other models are
  all Kenney Furniture Kit, against this file's own "pick ONE low-poly
  family" law, and no side room has ever modeled an electronics prop (only
  furniture). Logged for a future dedicated electronics-kit pass if Sérgio
  wants it.
- **Books.glb, "Small Stack of Paper", Debris Papers/Paper.glb** — declined
  for Room 1 this session: `book1-3` are `personal` tier but Books.glb's
  Poly Pizza license page wasn't independently re-confirmed as CC0 this
  session (CreativeTrio, unlike the corkboard, whose CC0 1.0 status was
  separately verified in Session 28) — left `[VERIFY SOURCE]`-style
  unresolved rather than guess; `homeworkPile` is deliberately `fog` tier
  (least-defined) and modeling it would work against, not for, that law.
- **Cassette tape variants** — both local copies are CC-BY (Poly by Google);
  declined, mixtape stays a raw box. **Revisited Session 54** (Sérgio's direct
  instruction, cassettePlayer's own CC-BY-with-attribution now an established
  precedent): the single-mesh copy is now `cassetteTape` in the table above,
  wired onto tapeA/tapeB/mixtape.

Net effect: Room 1's `hero` (CRT, kit) and `set` (lamp) tiers are unchanged
from the shipped baseline in every mode; only `personal`/`set` FURNITURE
(desk/chair/bed/bookcase/rug) plus one new `personal`-tier dressing item
(plant) carry Kenney meshes, matching the side rooms exactly.

## Audio

| File | Source | License | Attribution needed | Notes |
|---|---|---|---|---|
| tape-hiss.mp3 | self-generated (Session 30, R28-2b) | n/a — original, made for this project | no | `public/assets/audio/tape-hiss.mp3`, 6s mono loop. Generated locally with ffmpeg (`anoisesrc=color=pink`, band-limited 300Hz–6.5kHz, quiet gain, short in/out fades for a click-free loop point — no external source, no download). Placeholder ambience under the Era-1 tape system's captions (src/narrative/tapes.ts) until real recordings land per `docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md`. Command used: `ffmpeg -f lavfi -i "anoisesrc=color=pink:sample_rate=44100:duration=6:seed=42" -af "highpass=f=300,lowpass=f=6500,volume=0.18,afade=t=in:st=0:d=0.08,afade=t=out:st=5.92:d=0.08" -ac 1 -c:a libmp3lame -q:a 4 public/assets/audio/tape-hiss.mp3`. |
| family_design_solutions.mp3 / family_design_solutions_tape97.mp3 | Sérgio's own Suno/Treblo generation, delivered 2026-07-12 (`Pc_Simulation/Sources/Jingle_Brand New/Family Design Solutions - Family Design Solutions - Treblo.mp3`) | project-original (Sérgio's generation, not a real recording artist/label) | no | Pristine copy + `_tape97`-degraded master both live in `assets/audio/` (source pair); only the degraded file is served at runtime (`public/assets/audio/family_design_solutions_tape97.mp3`, registered in `src/audio/tapeAudio.ts`). Real duration 206.66s. This is **Tape C track 1** (Daniel's mixtape) in `data/dialog/s1_tapes.json` — lyrics from the accompanying `family_design_solutions.txt` (LRC word-timestamps), captioned line-by-line, synced to the real audio. Degraded via `tools/degrade_audio.sh --tape97` (Session 32). No real band/label reproduced — Sérgio's own generation, project-original. His own listen/voice pass over the final mix/wording is still pending. |
| discover_the_new_you.mp3 / discover_the_new_you_tape97_radio.mp3 | Sérgio's own Suno/Treblo generation, delivered 2026-07-12 (`Pc_Simulation/Sources/Jingle_Brand New/Discover_The_New_You.mp3`) | project-original | no | **SWAPPABLE CANDIDATE** — Sérgio is producing alternate versions of this broadcast jingle; this is the current one wired in. Pristine + degraded pair in `assets/audio/`; the degraded, `--wrap`-bookended file (tuning-static head 1.3s / tail 1.0s, so it reads as a captured off-air '97 broadcast) is what's served (`public/assets/audio/discover_the_new_you_tape97_radio.mp3`). Real song duration 28.63s (wrapped total 30.93s). This is **Tape B** (broadcast) in `s1_tapes.json` — lyrics from `discover_the_new_you.txt`, captioned line-by-line via its LRC timestamps. Swapping to a new Sérgio version requires only: re-run `tools/degrade_audio.sh`, add one registry line, repoint the `audio` field in the data — nothing else changes. |
| fold_my_hands.mp3 / fold_my_hands_tape97.mp3 | Sérgio's own Suno generation, delivered 2026-07-11 (`Pc_Simulation/Trials Songs/Prayer/Fold My Hands.mp3`) | project-original | no | Pristine + degraded pair in `assets/audio/`; degraded file served at runtime (`public/assets/audio/fold_my_hands_tape97.mp3`). Real duration 139.12s. This is **Tape A's final (prayer) segment** in `s1_tapes.json` — lyrics from the accompanying `Fold My Hands.txt` (Verse 1/Chorus/Verse 2/Bridge/Final Chorus, no internal timestamps — captions evenly distributed across the real duration, approximate by design). Formerly G1-gated as a bracketed stage-direction-only caption (no lyrics reproduced); now that Sérgio has delivered the actual sung words, they are wired as his canon draft text — his own voice pass over the exact wording is still pending, not an ethics gate anymore. |

All three degraded via `tools/degrade_audio.sh --tape97` (Session 32, R28-2b-ii)
— see that script's header for the exact filter chain (band-limit, cassette
wow, hiss floor, soft saturation) and its `--vhs03` sibling preset (available,
not used on these three files). Per the audio production guide's §4 doctrine,
SYSTEM audio stays clean; anything heard as coming off one of the Era-1
cassettes is always degraded first.

The jingle (the other candidate takes) and the full VO cast
(`docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md` §6/§7) are NOT in the
repo yet — Sérgio generates/delivers them externally; import happens in a
later build lane (one row here + one registry line in
`src/audio/tapeAudio.ts` each, per the same missing-file-safe pattern the
model manifest already uses).

## Candidate kits (researched — Sérgio's call)

- **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit — **CC0** —
  flat solid-color materials, no textures (fits our law), recolorable in code.
  The recommended default: hero furniture (bed, desk, chair, wardrobe, shelf).
- **Quaternius Ultimate House Interior** — https://quaternius.com/packs/ultimatehomeinterior.html
  — **CC0** — 120+ interior fills; convert to GLB.
- Era-2 PC (Sérgio liked): 410prod "Retro Monitor & PC Tower" (PSX-style) —
  **CC-BY** (needs colophon credit).

## rubberDuck.glb — CC0, added 2026-08-17 (S90 / decision D-A)
| | |
|---|---|
| **Asset** | "Rubber Duck" |
| **Creator** | CreativeTrio |
| **Source** | https://poly.pizza/m/oH3dEdlDpB |
| **Licence** | **Public Domain (CC0 1.0)** — no attribution required |
| **Used as** | Room 1 shelf 3 `rainbowDuck`, replacing the primitive box. reinterp only |

⚑ Shipped with its baseColorTexture **stripped** (`@gltf-transform`, geometry-only re-export,
56,764 → 38,160 bytes, geometry byte-identical) per the no-textures law — same treatment and same
reasoning as `cassetteTape`. No row in `docs/reinterp/ATTRIBUTIONS.md`: that file is for CC-BY assets
that owe credit, and CC0 owes none.

