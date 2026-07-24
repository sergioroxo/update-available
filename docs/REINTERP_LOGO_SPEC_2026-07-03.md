# LOGO SPEC — "YOUR UPDATE HAS FAILED."
STATUS: live

> **v1 (the fractured arrow, below) REJECTED — Sérgio, Round 17 (2026-07-04): "make something completely
> different." Kept for the record only.**

## DRAFT v2 — THE LAMP (current)

A completely different concept: **the desk lamp** — canon's one constant object across all four eras, the
thing the opening literally begins inside the light of. A low-poly lamp (two orange face tones, dark
extrusion tones, heavy black outline, same construction discipline as v1) casts an **impossibly wide cone
of warm light** — "illuminating more than is real," the O2 beat as a mark. The wordmark sits INSIDE the
lit pool — except the last letters ("ED.") which fall just outside the cone and render in the dark,
unlit tone. The light doesn't quite reach the end of the sentence: the promise fails exactly at the word
"FAILED."

Why this over the arrow: it's an object owned by the piece (not generic software iconography); it's warm
(the piece's thesis light — see `REINTERP_3D_STYLE_DIRECTION_2026-07-04.md` §1's two-temperature rule,
which this logo quietly states); and the failure is rendered as light falling short rather than a thing
breaking — quieter, stranger, more ours.

**Construction rules:** same family as v1 — dual-tone orange facets (#F59B23/#E07E12), dark sides
(#A9540F), black outline (#161616), no gradients (the cone is one flat translucent polygon, #F7D9A4 at
~55%); the unlit letters use a dimmed brown-orange (#6B4A26), never grey. Lockup: lamp left, cone
sweeping right over the stacked wordmark.

**v3 questions for Sérgio:** (1) does the lamp concept land, or different object entirely (the CRT? the
window? Lamby?); (2) cone contains the words (current) vs cone AS the background of the whole lockup;
(3) same typeface questions as before.

---

## v1 (REJECTED) — the fractured arrow, for the record

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
