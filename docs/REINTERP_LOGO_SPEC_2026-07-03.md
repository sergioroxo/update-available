# LOGO SPEC + DRAFT v1 — "YOUR UPDATE HAS FAILED."

*2026-07-03 · Fable 5 (design author). Per Sérgio's Round-16 direction: dual-toned, pseudo-3D low-poly,
orange with black outline. This is DRAFT v1 for reaction — the mark, the construction rules, and the SVG
source a build session can drop into the O1 pre-experience beat. Sérgio reacts; v2 follows his notes.*

## The mark

A **low-poly downward update arrow, mid-failure**: the classic "update/download" glyph rendered as
faceted pseudo-3D (two orange tones on the front facets, a darker orange on the extruded sides, heavy
black outline on every facet edge) — with **the arrow's tip fractured off**, drifting slightly apart from
the body. The apparatus's own icon, broken exactly where it points at the person. Wordmark beneath in two
stacked lines ("YOUR UPDATE" / "HAS FAILED."), heavy geometric sans, orange fill with black outline, the
second line one tone darker — the period included (canon styling).

## Construction rules (for any redraw/final pass)

- **Palette (draft values, to be locked against an era-neutral pair):** face light `#F59B23`, face mid
  `#E07E12`, facet highlight `#F5B03D`, extrusion sides `#A9540F`/`#8F4409`, outline `#161616`.
  Dual-tone discipline: every front facet is one of the two face tones; depth is the side tone only —
  no gradients ever (pixel/low-poly law).
- **Pseudo-3D = one extrusion direction** (up-right, dx≈+14 dy≈−10), sides always the dark tones.
- **Low-poly = triangulated front faces**, straight edges only, beveled black joins (stroke-linejoin
  round/bevel, ~4px at this scale — scale stroke with the mark).
- **The fracture is the identity**: the tip fragment offsets down-right with a visible gap; never healed,
  never animated back together. Any animated version may glitch the GAP (jitter, misregister) — the break
  itself is permanent.
- **Wordmark**: all-caps (canonical title styling), heavy geometric sans (final typeface TBD — draft uses
  the system sans; candidates should feel era-neutral, since the logo lives OUTSIDE the fiction in O1),
  black outline behind the fill (`paint-order: stroke`), line 2 in the darker face tone.

## SVG source (draft v1 — extractable as the O1 asset)

```svg
<svg viewBox="0 0 680 400" xmlns="http://www.w3.org/2000/svg">
<g stroke="#161616" stroke-width="4" stroke-linejoin="round">
<polygon points="316,52 396,52 410,42 330,42" fill="#a9540f"/>
<polygon points="396,52 396,148 410,138 410,42" fill="#8f4409"/>
<polygon points="424,148 438,138 410,138 396,148" fill="#a9540f"/>
<polygon points="316,52 396,52 396,100 316,100" fill="#f59b23"/>
<polygon points="316,100 396,100 356,148 316,148" fill="#e07e12"/>
<polygon points="396,100 396,148 356,148" fill="#f5b03d"/>
<polygon points="288,148 424,148 396,196 340,196" fill="#f59b23"/>
<polygon points="288,148 340,196 316,148" fill="#e07e12"/>
<polygon points="424,148 396,196 372,172" fill="#e07e12"/>
<polygon points="346,214 390,214 368,252" fill="#f59b23"/>
<polygon points="390,214 402,206 380,244 368,252" fill="#a9540f"/>
</g>
<g font-family="sans-serif" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="#161616" stroke-width="3" stroke-linejoin="round">
<text x="340" y="316" font-size="46" fill="#f59b23" letter-spacing="3">YOUR UPDATE</text>
<text x="340" y="368" font-size="46" fill="#e07e12" letter-spacing="3">HAS FAILED.</text>
</g>
</svg>
```

## Open for Sérgio's reaction (v2 inputs)
1. Orange temperature — warmer/ambery (current) vs hotter/redder?
2. The fracture: tip-only (current) vs a full diagonal crack through the whole mark?
3. Wordmark stacked under (current) vs beside the mark (horizontal lockup)? Both will exist eventually;
   which is primary?
4. Final typeface direction (chunky geometric vs pixel-era bitmap — note the logo sits OUTSIDE the
   fiction, so it doesn't have to obey any single era's palette/type law).
