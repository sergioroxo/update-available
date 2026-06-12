# Asset strategy — no Aseprite required (decided 2026-06-12)

Sérgio does not use Aseprite. Assets come from three channels; the
`export-atlases` pipeline stays for the day a pixel artist joins, but nothing
depends on it.

## 1. AI-drawn (Claude Code) — the default
Claude draws pixel art **programmatically**: era-palette sprites, window
chrome, icons, props — as canvas-drawing code (like the whole slice UI) or as
generated PNGs. For finer sprite work, install
**[pixel-art-cli](https://github.com/vossenwout/pixel-art-cli)** (`pxcli`) —
a drawing interface built for AI agents (set_pixel/fill_rect/line → PNG, no
Aseprite, free). Adopt when sprite needs outgrow canvas code.
*(Evaluated and parked: `pixel-plugin` — natural-language pixel art, but it
drives Aseprite, which we're avoiding; PixelForge-type AI generators — fine
for one-off props via the downscale→nearest→palette-quantize pipeline, never
for faces/people.)*

## 2. Downloaded — CC0/free packs (record license per file in assets/LICENSES.md)
- **Kenney.nl** — CC0 everything: UI packs, 1-bit/pixel packs, **low-poly 3D
  furniture & room kits** (GLB/GLTF — loads straight into PlayCanvas).
- **Quaternius.com** — CC0 low-poly 3D model packs (rooms, props).
- **Poly Pizza** — searchable index of free low-poly models (filter CC0).
- **OpenGameArt.org / itch.io free packs** — pixel UI, icons, fonts (check
  each license; prefer CC0).
- **Pixel fonts**: itch.io "W95-style" UI fonts; verify license per font.

## 3. 3D models + pixel-painted textures — yes, this works
The Soft Lo-Fi doctrine is exactly this technique (PS1-style):
1. Take a CC0 low-poly model (Kenney/Quaternius) or a primitive Claude builds
   in code.
2. Texture it with a **small pixel-art texture** (64–256px, era palette,
   AI-drawn or downloaded), `FILTER_NEAREST`, no mipmaps blur.
3. Vertex-color or quantized-palette materials for the `set`/`fog` fidelity
   tiers; reserve painted pixel textures for `hero` objects.
Claude can do steps 1–3 entirely in code/repo; Sérgio's role is taste: look
at screenshots, say warmer/colder/softer.

## Division of labor
- **Claude:** draws/generates, integrates, palette-enforces, screenshots for
  review.
- **Sérgio:** picks from candidates, supplies AI-image references when useful
  (ChatGPT stills → downscale → quantize), final taste calls.
- Every downloaded pack: source URL + license line in `assets/LICENSES.md`
  (create on first download) + a PROCESS_REGISTER entry.
