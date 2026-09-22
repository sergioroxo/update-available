STATUS: live

# ASSET REQUEST — the models to fetch for me (2026-09-22, S174)
*Sérgio, after the exhibition stills: "those are clearly models missing, so if needed give me a list of
assets would like me to grab for you, and in what type of file." I checked `Pc_Simulation/Assests`
first — most of what you marked already had a model on your disk, and those are in the build now
(Mouse, Cup Of Tea, Mug With Office Tool and Computer, all CreativeTrio, CC0). This is only what is
genuinely missing.*

## The file you want, every time
- **Format: `.glb`** (binary glTF — one file, no separate textures folder). `.gltf` + `.bin` works too;
  `.fbx`, `.obj`, `.blend` do not go straight in.
- **Low-poly**, under ~2,000 triangles. One object, not a scene. Textures do not matter — I strip them
  (the no-textures law) and colour the model flat to its era.
- **Licence, in order of preference: CC0** (Kenney, Quaternius, CreativeTrio on Poly Pizza — nothing to
  credit) → **CC-BY** (fine: it gets a line in `ATTRIBUTIONS.md` and the credits). Nothing "free for
  personal use", nothing with no licence stated.
- **Where:** drop it in `Pc_Simulation/Assests/` and add its line to `Licenses .rtf` the way the others
  are ("Name by Author (licence) via Poly Pizza (link)"). Tell me the file name; I do the rest.

## Needed — these are out of the room until a model exists
| # | what | where it goes | why | search terms |
|---|---|---|---|---|
| 1 | **A flip phone** (clamshell, closed) | 2003, on Daniel's desk | it dates the room; it was a box standing *inside* the mouse | Poly Pizza "flip phone", "cell phone", "Nokia" |
| 2 | **A CD spindle** (or a small stack of CD cases) | 2003, desk corner by the lamp | you circled it: a grey box with a cap | "CD spindle", "CD stack", "disc" |

Both are **parked, not deleted** (`reinterp_deltas.json` r2 → `_parkedS174`): the moment a model exists,
they go back in one line each.

## Nice to have — each would replace a box that works but reads as a box
| # | what | where | note |
|---|---|---|---|
| 3 | A **1990s beige PC tower** | 1997 (`tower`) and 2003 (`tower2003`) | both towers are boxes; they read, but a model would match the new mouse |
| 4 | A **dial-up modem / early router** | 2003 | only if you want the modem back — you crossed it and it is out |
| 5 | A **table/desk lamp**, era-neutral | Rooms 1 and 2 | the lamp is three boxes; your `Household Props 001` has `Desk Lamp.glb` and `Lamp With Shade.glb` — say the word and I use one of those (no fetching needed) |

## Already on your disk and NOT used — so you know
`Radio.glb` (Quaternius) and `Empty Picture Frame.glb` (Jarlan Perez) exist, but you crossed the radio
and the frame on the 2016 still, so they are out of the room rather than modelled. If the crosses meant
"make this real" and not "take it out", tell me and they go back in with their models.
