# Moodboard — Era 1 room ("the room, 1997")

*2026-06-12 · prepared by Claude (Fable 5, Claude Code) for Sérgio's taste calls
before the room milestone. References verified by live web search this session;
each link was checked to resolve. License notes go to `assets/LICENSES.md` on
first actual download.*

This board answers one question: **what should the Era-1 room feel like?**
Doctrine: Soft Lo-Fi (SCRIPT_UPDATE v0.5) — the life side is warm, cozy,
underdefined; the witness side is the only sharp, high-definition thing.
Selective fidelity (v0.6): `hero | set | fog`.

---

## 1. The vision in one paragraph

A small teenage bedroom at dusk, 1997. The only strong light sources are a
desk lamp (warm amber) and the CRT (teal — the ERA1 desktop teal `#008080`
spilling into the room). The desk and monitor are the **hero** tier: most
detailed, readable. The bed, shelf, chair, window are **set** tier: simple
low-poly shapes, soft fabric colors, no fine detail. The room's edges are
**fog** tier: definition and light fall off toward the edges — the room
doesn't end at walls, it ends at memory. Nothing is dark-horror; the gloom
budget is zero. When the player flips, the witness side breaks all of these
rules at once: sharp, cold navy/ink, full definition. The contrast IS the
argument.

> **REVISED 2026-06-12 (Sérgio, round 8 — see SCRIPT_UPDATE_v0.7 §2):** the
> 3D style is **flat-shaded low-poly** (Crossy Road / Kenney / Poly-by-Google
> language: chunky silhouettes, flat color faces, no/near-no textures) — NOT
> pixel-painted PS1 textures. Pixel art remains the screens' language only.
> Also lighter for Quest 3. Taste calls answered: dusk-cream wall · night
> window · vignette fog (no particles) · VOGONS-leaning clutter.

## 2. Palette (proposed — taste call needed)

| Register | Swatches | Notes |
|---|---|---|
| Life side (room) | `#F7C775` lamp amber · `#EBD9C4` dusk wall · `#D9A8A0` curtain rose · `#8A5A3B` warm wood · `#2C3A5C` night window | warm, desaturated, no pure black anywhere on this side |
| Era-1 OS (canon, [era1.ts](../src/desktop/theme/era1.ts)) | `#008080` desktop teal · `#d4d0c8` chrome beige · `#000080` title navy · `#f5f4ed` paper · `#c42020` warn (narrative events only) | already law — the room palette must harmonize with the screen glow |
| Witness side (canon, [intake.ts](../src/witness/intake.ts)) | `#05050a` void · `#0d0d1a` panel · `#556677` dim · `#aabbcc` ink · `#cc8855` flag | cold, sharp, the only high-definition register |

## 3. References (verified links)

### A — Cozy low-poly rooms (the target feeling)
- [A Short Hike — press kit](https://ashorthike.com/press/) — the gold standard for "low poly that feels kind"; take the warmth-without-detail discipline.
- [Julia Morant — Isometric low poly diorama, The Room (day & night)](https://www.artstation.com/artwork/YKgb2b) — day/night same room; take the night-version light temperature.
- [Lenni M. — Cozy isometric room](https://wackyblocks.artstation.com/projects/Xn4L93) — prop density reference: how few objects still read "lived-in".
- [Bluzeroth_HS — Stylized low poly room diorama (Blender)](https://www.artstation.com/artwork/L4rDNv) — warm single-light-source interior.
- [Antoine Patel — isometric rooms collection (Sketchfab)](https://sketchfab.com/apatel/collections/isometric-rooms-b850a1031b44482bb2f3808f44475e71) — browsable 3D, useful for judging poly budgets in the round.

### B — 1997 computer corners (the documentary truth)
- [VOGONS forum — "What did your home PC space/room look like in the mid 90s?"](https://www.vogons.org/viewtopic.php?t=101256) — real people's photos and memories of their actual 90s PC corners; the best anti-nostalgia corrective: cables, clutter, woodgrain.

### C — Win95-era OS language (already largely built, kept for texture)
- [GUIdebook gallery — Windows 95 screenshots](https://guidebookgallery.org/screenshots/win95) — systematic, high quality.
- [ToastyTech GUI gallery — Windows 95](http://toastytech.com/guis/win95.html) — opinionated walkthrough, good for wizard/setup flows.
- [Wikimedia Commons — Windows 95 screenshots category](https://commons.wikimedia.org/wiki/Category:Windows_95_screenshots) — free-license stills.
- [Windows 95/98 startup screens](https://stormhighway.com/win95.php) — boot-screen art specifically (our splash riffs on this language).

### D — Glitch, the *soft* kind (update ritual, TransJesus corruption)
- [Glitch art — Wikipedia overview](https://en.wikipedia.org/wiki/Glitch_art) — orientation + artist index.
- [Rosa Menkman — the punctum as glitch (LoosenArt)](https://www.loosenart.com/blogs/magazine/the-punctum-as-glitch-in-contemporary-art-the-art-of-rosa-menkman) — the theorist of "corruption as evidence"; directly feeds the "the stream survives; the platform stutters" rule (Codex review A6).

### E — Sharp/cold counterpoint (witness side) — STILL TO GATHER
Brutalist terminal UI, filing-room photography, moderation-dashboard
aesthetics. Not yet researched with verified links; next research pass.

## 4. Asset plan (what to actually download)

**Primary kit strategy: one kit gives ~80% of the room.**

| Prop | Source | License | Format | Link |
|---|---|---|---|---|
| Desk, bed, shelf, chair, lamp, clutter | **Kenney Furniture Kit** (140 models) | CC0 | OBJ + GLTF (via Poly Pizza bundle) | [kenney.nl](https://kenney.nl/assets/furniture-kit) · [GLTF bundle](https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z) |
| Gap-fill furniture variants | Quaternius Furniture Pack (23 models) / Ultimate House Interior (120+) | CC0 | FBX/OBJ/Blend (convert, or pull GLB via [Poly Pizza](https://poly.pizza/u/Quaternius/Lists)) | [furniture](https://quaternius.com/packs/furniture.html) · [interior](https://quaternius.com/packs/ultimatehomeinterior.html) |
| **CRT monitor (the hero object)** | Jarlan Perez — CRT Monitor | **CC-BY 3.0 (attribution required)** | OBJ + GLTF | [poly.pizza/m/8jVB0zIXKCv](https://poly.pizza/m/8jVB0zIXKCv) |
| PS1-flavor clutter (radio, plants, cabinets) | Miziziziz — Retro3DGraphicsCollection | CC0 | via itch.io links | [GitHub](https://github.com/Miziziziz/Retro3DGraphicsCollection) |
| Style anchor: Computer (retro) | Poly by Google | CC-BY 3.0 | OBJ + GLTF | [poly.pizza/m/0JxgahNBrkL](https://poly.pizza/m/0JxgahNBrkL) |
| Style anchor: Macintosh Classic | Charlie | CC-BY 3.0 | FBX + GLTF | [poly.pizza/m/goeJLARWbs](https://poly.pizza/m/goeJLARWbs) |
| Style anchor: iFruit Vintage Computer | TRASH — TANUKI | CC-BY 3.0 | OBJ + GLTF | [poly.pizza/m/8r9bnI1sXt9](https://poly.pizza/m/8r9bnI1sXt9) |
| NEW (v0.7 Starter Kit): floppy/CD-ROM, booklet, cassette player | to source (poly.pizza search) | CC0/CC-BY | GLB | next research pass |

**Licensing policy (round 8):** CC0 preferred, **CC-BY accepted** —
attribution lands in `assets/LICENSES.md`, the Close credits, and the
minisite colophon.

CRT note: it is the hero object and carries the screen texture, so we may end
up **building it bespoke in code** (boxes + bevels + our pixel-painted casing
texture) using the CC-BY model only as a proportion reference — that would
keep the hero tier 100% ours and the license file CC0-only. Decision deferred
to the build.

All textures get the pixel-paint pass (small nearest-filtered textures, ERA1
palette harmonized) per [ASSET_STRATEGY.md](ASSET_STRATEGY.md) §3.

## 5. Taste calls — ANSWERED (Sérgio, 2026-06-12, round 8)

1. Wall color: **dusk cream** (`#EBD9C4`) — supports the blocky-aesthetic transition to the witness side.
2. Window: **night** (moon, `#2C3A5C`) — "late at night online."
3. Fog tier: **vignette** (definition/light falls off at edges; no particles).
4. Clutter: **VOGONS-real, or close** — cables, stacked media, lived-in.

Board exported: [MOODBOARD_ERA1_ROOM.png](MOODBOARD_ERA1_ROOM.png) ·
[MOODBOARD_ERA1_ROOM.svg](MOODBOARD_ERA1_ROOM.svg)
