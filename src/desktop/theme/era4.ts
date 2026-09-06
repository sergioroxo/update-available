/**
 * ERA 4 palette + visor chrome (2026, Room 3, Maya).
 * ⚑ Written by the STOPPED run, which numbered itself Session 75. That number is
 * RETIRED and never reused; the era's build is S76-S79. See BUILD_QUEUE_LIVE.md.
 *
 * ⚑ SALVAGED 2026-08-06. Session 75 (the first S73 attempt) was STOPPED by
 * Sérgio mid-run; this palette is the only artefact it produced and it is kept
 * rather than thrown away — the same discipline that recovered tools/harness/.
 * ⚑ ITS FRAMING IS SUPERSEDED, ITS COLOURS ARE NOT. The header below states
 * Option A ("only the mount point changed"). Sérgio pushed back on exactly that
 * on 2026-08-06 and the answer is now `docs/REINTERP_E4_THE_SPACE_2026-08-06.md`:
 * the visor opens a PLACE, not a rectangle — a headset home environment,
 * ad-saturated and addressed to her by name. Every hex here still obeys the
 * COLOR LAW and is still usable; read the paragraph below as history.
 *
 * THE SURFACE HAS NOT CHANGED, ONLY ITS MOUNT POINT
 * (docs/REINTERP_E4_THE_DEVICE_2026-08-05.md, Option A). Every era so far has
 * drawn onto ONE offscreen 2D canvas textured onto a mesh with FILTER_NEAREST:
 * a CRT in 1997/2003, a flat panel and two device screens in 2016, and now the
 * VISOR of a headset. Same canvas (`DesktopOS.canvas`), same logical
 * resolution (`ERA1_CANVAS`), same `?flat=1` review tool — so this file is a
 * PALETTE and a set of draw helpers, not a second UI system.
 *
 * COLOR LAW (CLAUDE.md; the same discipline `theme/era3.ts`'s NOA block
 * follows): every hex below is lifted VERBATIM from `data/room/era1.json`, the
 * room's own authored palette. Nothing here is invented. The room's dark glass
 * (`#15151F`, `#11111C`, `#1A1A24`) is literally the colour S74 turned the CRT
 * off to; the mint (`#9FD8CB` / `#5DCAA5`) is the room's own soft green, and it
 * is L's voice colour for a deliberate reason — ⚑ **L must sound and look
 * GOOD** (`REINTERP_E4_THE_ARGUMENT_2026-08-05.md` §4.1). A voice rendered in
 * alarm red would let the real thing off the hook. The uncanniness is in what
 * it offers, never in how it looks.
 *
 * ⚑ NOT a horror palette. Soft Lo-Fi doctrine: underdefined edges, low
 * contrast between the field and its panels, one warm accent. The SHARP thing
 * on this surface is the system's own instruments — the caption band, the
 * label field, the counter — exactly as the selective-fidelity law requires.
 */
import { px, setFont, wrapText } from './chrome';
import { RENDER_SCALE } from './era1';

export const ERA4 = {
  // the field — the visor's own darkness, the room's dead-glass hex
  field: '#11111C',
  fieldLo: '#15151F',
  panel: '#1A1A24',
  panelHi: '#1D1D28',
  panelEdge: '#23232F',
  rule: '#2C2C34',
  ruleHi: '#3A3A44',

  // type
  dim: '#556677',      // meta, timestamps, the things the system says to itself
  meta: '#6C7BA8',     // labels
  text: '#AABBCC',     // ordinary system text
  textHi: '#ECE7D8',   // ⚑ the caption — the warmest, most legible thing here

  // L: warm, mint, unhurried. Never red, never a warning colour.
  l: '#9FD8CB',
  lDim: '#5DCAA5',
  lBand: '#15151F',

  // chips
  chip: '#1D1D28',
  chipEdge: '#44464F',
  chipLive: '#9FD8CB',
  chipText: '#AABBCC',
  chipGone: '#3A3A44',     // a foreclosed chip: visible, greyed, never removed

  // the memories surface — the one warm rectangle in the era
  photoSky: '#8899BB',
  photoSkyHi: '#AABBCC',
  photoWall: '#A8917B',
  photoWallHi: '#C9BFA6',
  photoSkin: '#B89B7E',
  photoSkinHi: '#C9A07A',
  photoHair: '#74492F',
  photoCloth: '#9A9486',
  photoClothHi: '#B5A98C',
  photoWarm: '#E8C9A0',
  photoSun: '#F7C775',
  photoFrame: '#404040',

  // the room's own light, seen through the visor
  glow: '#9FB4C0',
  redact: '#44464F'
} as const;

/**
 * ⚑ THE PLACE (S76) — the home environment's palette, and it is the WARMEST
 * block in the piece since Era 1's paper.
 *
 * `docs/REINTERP_E4_THE_SPACE_2026-08-06.md` §4.1: *"The headset goes on and it
 * is better in here. Warmer, brighter and quieter than the room she is sitting
 * in. ⚑ The piece must let this land honestly. No irony, no warning."* So none
 * of these are dimmed, greyed or soured. It is a nice room. That is the whole
 * point, and souring it would be the era arguing with itself.
 *
 * COLOR LAW, same discipline as the ERA4 block above and `era3.ts`'s NOA:
 * ⚑ every hex is lifted VERBATIM from `data/room/era1.json`. Nothing invented.
 * The wall creams and the wood browns are literally the colours Daniel's 1997
 * room is painted in — which is not a saving, it is the argument: the pleasant
 * default room the apparatus hands her is assembled out of the same handful of
 * colours every room in this piece has always had.
 */
export const PLACE = {
  wallHi: '#F0E5D4',     // the lit wall, up near the window
  wall: '#E6D2BC',
  wallLo: '#CFC4AA',     // shadowed wall, and the window's own frame
  sill: '#B5A98C',
  floor: '#A07B52',
  floorLo: '#8A5A3B',    // the plank seams
  floorHi: '#B98563',    // where the light lands
  sky: '#AABBCC',
  skyLo: '#8899BB',      // higher up, further away
  skyHaze: '#EBD9C4',    // the warm band that sits on the horizon
  land: '#A8B49A',       // something green, far off, unresolvable
  landLo: '#9A9486',
  sun: '#F7C775',
  sunHi: '#FFD24C',
  rug: '#D8CDB4',
  rugHi: '#E8C9A0',
  textile: '#C9A8A0',    // the cushion nobody chose
  textileHi: '#D9A8A0',
  plant: '#A8B49A',
  plantLo: '#9A9486',
  mug: '#F5EDDC',
  shelf: '#B5A98C',
  book: '#C42020',
  bookAlt: '#2C3A5C',
  ink: '#74492F'         // the environment's own small print
} as const;

/**
 * ⚑ THE WALL (S78) — the palette the place's OFFERS are drawn in, and it is
 * deliberately the PAPER family rather than the visor's dark chrome.
 *
 * `docs/REINTERP_E4_THE_SPACE_2026-08-06.md` §2: the ads are not ads on a page,
 * they are ads IN A ROOM — *"everything here is addressed to her… offers that
 * are, genuinely, quite nice"*. So they are lit like the room they hang in, not
 * like a system dialog: warm card stock on a warm wall. ⚑ An offer drawn in
 * alarm colours would be the era arguing with itself, exactly as a sinister L
 * would be (§4.1). It should be a pleasure to look at. That is the trap.
 *
 * COLOR LAW, same discipline as every block above: ⚑ every hex is lifted
 * VERBATIM from `data/room/era1.json`. Nothing invented, ratchet unmoved.
 */
export const WALL = {
  card: '#F3EAD8',       // the card stock
  cardHi: '#F5F4ED',     // its lit top edge
  cardEdge: '#CFC4AA',
  mark: '#8A5A3B',       // the invented mark, small, above the title
  title: '#74492F',
  body: '#9A9486',
  price: '#2C3A5C',
  accent: '#EFA13F',     // the one warm accent — the thing they want you to press
  /** ⚑ the smallest, dimmest type on the surface, and it is where the export
   *  thesis lives: `Available in your region.` sits here, in the same colour as
   *  a delivery note, and nothing anywhere points at it. */
  fine: '#B5A98C',
  meta: '#A8917B',
  quiet: '#C9BFA6'       // a withdrawn item, on its way out
} as const;

/** ⚑ THE PARALLAX BOUND. The picture answers when you look, and it answers a
 *  little, in hard steps, and it never gets anywhere: three layers, twelve
 *  pixels at the very front, and turning further buys nothing. `look` is
 *  −1…+1 and is already quantised by the caller (see apps/space.ts's LOOK_STEP)
 *  so this can only ever be redrawn a handful of times across a whole turn. */
const PARALLAX = { far: 3, mid: 7, near: 12 } as const;
const shift = (look: number, depth: keyof typeof PARALLAX): number =>
  Math.round(-look * PARALLAX[depth]);

/**
 * ⚑ THE HOME ENVIRONMENT — a picture of a place, drawn on the canvas.
 *
 * Every VR headset ships one: a pleasant default room, a view out of a window,
 * a horizon. ⚑ *"A room that is not yours, that millions of people have an
 * identical copy of, designed to feel like somewhere"* (THE_SPACE §2). It adds
 * NO geometry — it is flat, and the flatness is the era's argument: the
 * apparatus can only ever show you a picture of a room.
 *
 * Drawn in hard steps, integer positions, no rotations (pixel discipline). The
 * only soft thing is the light, which is three alpha washes — the same device
 * `photograph()` uses for the light the system adds to her picture.
 *
 * ⚑ PLACEHOLDER-draft art — Sérgio's eye pending, like the NOA frames.
 */
export function homeEnvironment(
  ctx: CanvasRenderingContext2D, W: number, H: number, look: number
): void {
  const HORIZON = 236;
  const far = shift(look, 'far');
  const mid = shift(look, 'mid');
  const near = shift(look, 'near');

  // ── the wall, and the floor it stands on ──────────────────────────────────
  px(ctx, 0, 0, W, HORIZON, PLACE.wall);
  px(ctx, 0, 0, W, 96, PLACE.wallHi);          // higher up is lighter
  px(ctx, 0, HORIZON - 26, W, 26, PLACE.wallLo);
  px(ctx, 0, HORIZON, W, H - HORIZON, PLACE.floor);
  for (let y = HORIZON + 11; y < H; y += 13) px(ctx, 0, y, W, 1, PLACE.floorLo);

  // ── the window: the whole reason a default room feels like somewhere ──────
  const wx = 168 + mid; const wy = 44; const ww = 264; const wh = 168;
  px(ctx, wx - 6, wy - 6, ww + 12, wh + 12, PLACE.wallLo);   // the frame
  px(ctx, wx, wy, ww, wh, PLACE.skyLo);
  px(ctx, wx + far, wy + 52, ww, 46, PLACE.sky);
  px(ctx, wx + far, wy + 98, ww, 22, PLACE.skyHaze);         // the warm band
  px(ctx, wx + far, wy + 120, ww, 34, PLACE.land);
  px(ctx, wx + far, wy + 146, ww, 22, PLACE.landLo);
  // the sun: two squares, low and left, never a disc — pixel discipline
  px(ctx, wx + 42 + far, wy + 74, 18, 18, PLACE.sunHi);
  px(ctx, wx + 36 + far, wy + 68, 30, 30, PLACE.sun);
  px(ctx, wx + 42 + far, wy + 74, 18, 18, PLACE.sunHi);
  // mullions — the frame does not parallax against its own glass
  px(ctx, wx + Math.round(ww / 2) - 2, wy, 4, wh, PLACE.wallLo);
  px(ctx, wx, wy + Math.round(wh / 2) - 2, ww, 4, PLACE.wallLo);
  px(ctx, wx - 8, wy + wh, ww + 16, 9, PLACE.sill);

  // ── the light it throws, which is the honest part ─────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.20;
  px(ctx, wx - 26, HORIZON, ww + 52, 40, PLACE.sun);
  ctx.globalAlpha = 0.14;
  px(ctx, wx - 54, HORIZON + 40, ww + 108, 44, PLACE.sun);
  ctx.globalAlpha = 0.08;
  px(ctx, wx - 86, HORIZON + 84, ww + 172, 52, PLACE.sun);
  ctx.restore();
  px(ctx, wx + 10, HORIZON + 6, ww - 20, 3, PLACE.floorHi);

  // ── the things somebody put here for you ──────────────────────────────────
  // a shelf, three books, a plant. None of it is anybody's.
  const sx = 22 + mid;
  px(ctx, sx, 108, 108, 6, PLACE.shelf);
  px(ctx, sx + 10, 86, 8, 22, PLACE.book);
  px(ctx, sx + 20, 82, 7, 26, PLACE.bookAlt);
  px(ctx, sx + 29, 88, 9, 20, PLACE.ink);
  px(ctx, sx + 74, 92, 20, 16, PLACE.plantLo);
  px(ctx, sx + 78, 74, 12, 20, PLACE.plant);
  px(ctx, sx + 70, 80, 10, 8, PLACE.plant);
  px(ctx, sx + 88, 78, 10, 8, PLACE.plant);

  // the rug, the table, the cushion, the cup somebody left in the render
  const nx = near;
  px(ctx, 74 + nx, 262, 344, 78, PLACE.rug);
  px(ctx, 74 + nx, 262, 344, 4, PLACE.rugHi);
  px(ctx, 74 + nx, 336, 344, 4, PLACE.rugHi);
  px(ctx, 150 + nx, 272, 190, 30, PLACE.floorLo);
  px(ctx, 150 + nx, 272, 190, 5, PLACE.floorHi);
  px(ctx, 166 + nx, 302, 10, 26, PLACE.floorLo);
  px(ctx, 314 + nx, 302, 10, 26, PLACE.floorLo);
  px(ctx, 292 + nx, 258, 16, 14, PLACE.mug);
  px(ctx, 292 + nx, 258, 16, 3, PLACE.wallHi);
  px(ctx, 40 + nx, 288, 74, 44, PLACE.textile);
  px(ctx, 40 + nx, 288, 74, 5, PLACE.textileHi);
}

/**
 * ⚑ THE VISOR'S OWN EDGE. Four hard bands of the field colour, darkest at the
 * very border — the limit of what the thing on your face can show you. It is
 * also the honest seam: in the room, the picture is a rectangle mounted to your
 * head, and the rectangle has edges even when the place inside it does not.
 */
export function visorEdge(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const bands: [number, number][] = [[14, 0.10], [8, 0.20], [4, 0.34], [2, 0.55]];
  ctx.save();
  for (const [inset, alpha] of bands) {
    ctx.globalAlpha = alpha;
    px(ctx, 0, 0, W, inset, ERA4.field);
    px(ctx, 0, H - inset, W, inset, ERA4.field);
    px(ctx, 0, 0, inset, H, ERA4.field);
    px(ctx, W - inset, 0, inset, H, ERA4.field);
  }
  ctx.restore();
}

/**
 * The device before it is worn: a dark field, one standby light, one dim line.
 * ⚑ Drawn LARGE and simple on purpose — this same canvas is textured onto a
 * 9 cm visor across the room, so anything smaller than this reads as noise. The
 * grammar is S2R.0's waiting screen (one dim line on dark glass, pressed to
 * advance), which is the piece's own way of saying "it is on, and it is waiting".
 */
export function standby(
  ctx: CanvasRenderingContext2D, W: number, H: number, pulse: number, label: string
): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  px(ctx, 0, 0, W, 40, ERA4.fieldLo);
  px(ctx, 0, H - 40, W, 40, ERA4.fieldLo);
  const cx = Math.round(W / 2); const cy = Math.round(H / 2) - 14;
  // ⚑ THE STANDBY LIGHT, and it is deliberately BIG. Measured in-browser (S76):
  // the visor's face is about 80 screen px across at the seat, so a tasteful
  // 4 px rail resolves to less than one pixel and the device reads as dead
  // furniture. This is the affordance — the piece may not explain the headset
  // in words (the touchless budget, and nothing in Era 4 is announced), so the
  // object has to say "on, and waiting" by being visibly lit.
  const wide = 240 + Math.round(pulse * 24);
  px(ctx, cx - Math.round(wide / 2), cy - 2, wide, 14, ERA4.lBand);
  px(ctx, cx - Math.round(wide / 2), cy, wide, 10, ERA4.lDim);
  px(ctx, cx - 40, cy - 8, 80, 26, ERA4.l);
  setFont(ctx, 10);
  ctx.fillStyle = ERA4.dim;
  const tw = Math.ceil(ctx.measureText(label).width);
  ctx.fillText(label, cx - Math.round(tw / 2), cy + 28);
}

/** The visor's resting field: not black — a dark grey-blue with a soft, very
 *  low-contrast vignette. Underdefined edges, per the Soft Lo-Fi doctrine. */
export function visorField(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  // three faint bands rather than a gradient — pixel discipline, hard steps
  px(ctx, 0, 0, W, 26, ERA4.fieldLo);
  px(ctx, 0, H - 26, W, 26, ERA4.fieldLo);
}

/**
 * ⚑ THE CAPTION BAND — the era's accessibility surface AND its safety surface
 * (`REINTERP_E4_THE_ARGUMENT_2026-08-05.md` §4.2). It is drawn FIRST, before
 * the line is spoken, because a caption read a half-second early is the only
 * warning an audio beat can give. It is also the era's witness surface: a
 * piece whose spine is the record should let you read what was said to you.
 *
 * `speaker` is drawn small and dim; the line itself is the brightest text on
 * the whole surface. That hierarchy is the point — the apparatus's words are
 * the most legible thing in Maya's room.
 */
export function captionBand(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  speaker: string,
  lines: string[]
): void {
  const rows = Math.max(1, lines.length);
  const h = 16 + rows * 14 + 8;
  const y = H - h - 10;
  px(ctx, 12, y, W - 24, h, ERA4.lBand);
  px(ctx, 12, y, 2, h, ERA4.lDim);           // the speaker rail
  px(ctx, 12, y, W - 24, 1, ERA4.rule);
  px(ctx, 12, y + h - 1, W - 24, 1, ERA4.rule);
  setFont(ctx, 9);
  ctx.fillStyle = ERA4.lDim;
  ctx.fillText(speaker, 22, y + 5);
  setFont(ctx, 11);
  ctx.fillStyle = ERA4.textHi;
  lines.forEach((line, i) => ctx.fillText(line, 22, y + 18 + i * 14));
}

/**
 * A chip. Three states and only three: LIVE (pressable), GONE (foreclosed —
 * ⚑ drawn, greyed, and never removed: the shrinking choice is only legible in
 * retrospect if the foreclosure stays on screen), and HOVER.
 */
export function chip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string,
  opts: { live: boolean; hover?: boolean } = { live: true }
): void {
  px(ctx, x, y, w, h, opts.live ? ERA4.chip : ERA4.field);
  const edge = !opts.live ? ERA4.chipGone : opts.hover ? ERA4.chipLive : ERA4.chipEdge;
  px(ctx, x, y, w, 1, edge);
  px(ctx, x, y + h - 1, w, 1, edge);
  px(ctx, x, y, 1, h, edge);
  px(ctx, x + w - 1, y, 1, h, edge);
  setFont(ctx, 10);
  ctx.fillStyle = !opts.live ? ERA4.chipGone : opts.hover ? ERA4.chipLive : ERA4.chipText;
  ctx.fillText(label, x + 8, y + Math.round((h - 10) / 2));
}

/**
 * The system's own label field — the thing it puts on an object when it
 * captions the room. ⚑ This is the SHARP object on the surface (selective
 * fidelity: the system's instruments are the most defined things in the
 * piece), which is why it has a hard bracket and the caption band does not.
 */
export function labelField(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  object: string, label: string, uncertain = false
): void {
  const h = 30;
  px(ctx, x, y, w, h, ERA4.panel);
  px(ctx, x, y, w, 1, ERA4.ruleHi);
  px(ctx, x, y + h - 1, w, 1, ERA4.rule);
  // the bracket: two hard corners, the machine's own framing gesture
  for (const cx of [x, x + w - 7]) {
    px(ctx, cx, y, 7, 1, ERA4.lDim);
    px(ctx, cx === x ? x : x + w - 1, y, 1, 5, ERA4.lDim);
    px(ctx, cx, y + h - 1, 7, 1, ERA4.lDim);
    px(ctx, cx === x ? x : x + w - 1, y + h - 5, 1, 5, ERA4.lDim);
  }
  setFont(ctx, 9);
  ctx.fillStyle = ERA4.meta;
  ctx.fillText(object, x + 10, y + 5);
  setFont(ctx, 11);
  ctx.fillStyle = uncertain ? ERA4.dim : ERA4.text;
  ctx.fillText(label, x + 10, y + 16);
}

/**
 * ⚑ THE FILING STRIP (S119) — WHAT THE MACHINE WRITES DOWN, WHILE IT APOLOGISES.
 *
 * Era 4's spine is a name-correction arc in four states, and its antagonist is
 * the second line filed underneath every apology:
 * `legacy record consistency — retained`. The apology is the surface, the
 * retention is the truth, and the beat is the gap between them.
 *
 * ⚑ UNTIL NOW THAT GAP WAS INVISIBLE. `ledger.l` was written by every chip in
 * the era and read by NOTHING — verified by grep, zero consumers — and the one
 * surface built to show it, the intake record, is switched off for the whole of
 * Era 4 (`cluster.ts setTerminalVisible(era !== 'e3' && era !== 'e4')`). So what
 * a player actually met was a kind machine apologising five times and meaning
 * it, which is not the beat: that is L winning.
 *
 * THE RULES THIS SURFACE OBEYS, and each one is load-bearing:
 *
 * 1. ⚑ **EVERY LINE LOOKS THE SAME.** The retention is not coloured, boxed,
 *    delayed or emphasised. `name: corrected by subject` and `legacy record
 *    consistency — retained` are drawn at identical weight, because that is
 *    exactly how a record treats them — as two facts of equal standing. The
 *    moment this surface points at one of them, the piece is narrating instead
 *    of showing, and the era already has too much of that.
 * 2. **Nothing announces it.** No heading that explains, no "note", no alert.
 *    One clerical word in the machine's own meta type.
 * 3. **It is not pressable and never will be.** It is the instrument's notes,
 *    not a panel she is being offered. She cannot edit it. That is the era.
 * 4. **Newest at the top, and the older ones dim** rather than scrolling away —
 *    the file gets longer, and nothing ever leaves it.
 *
 * SELECTIVE FIDELITY (CLAUDE.md): the system's instruments are the most defined
 * objects in the piece, so this shares `labelField`'s bracket — it reads as the
 * same instrument, seen from its other side.
 */
export function filingStrip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  heading: string,
  entries: string[]
): void {
  if (entries.length === 0) return;
  const rowH = 12;
  const top = 13;
  const h = top + entries.length * rowH + 6;
  px(ctx, x, y, w, h, ERA4.fieldLo);
  px(ctx, x, y, w, 1, ERA4.rule);
  // the same two hard corners the label field brackets itself with
  px(ctx, x, y, 7, 1, ERA4.lDim);
  px(ctx, x + w - 7, y, 7, 1, ERA4.lDim);

  setFont(ctx, 9);
  ctx.fillStyle = ERA4.dim;
  ctx.fillText(heading, x + 10, y + 3);

  // ⚑ CLIPPED TO ITS OWN BOX, and this is not belt-and-braces. The witness
  // lines are authored in `data/` and nothing constrains their length — the
  // longest today is `legacy record consistency — retained` at ~205 px — so a
  // strip placed in a narrow gutter silently painted them straight across the
  // memory card beside it. Found by looking at a render, which is the only way
  // this class of fault is ever found in this project.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < entries.length; i++) {
    // ⚑ the ONLY thing that varies between rows is age, and age is not emphasis.
    // The newest line is legible and the ones under it recede, the way a log
    // reads. Nothing here knows what any of these lines mean.
    ctx.fillStyle = i === 0 ? ERA4.text : i === 1 ? ERA4.meta : ERA4.dim;
    ctx.fillText(entries[i], x + 10, y + top + i * rowH);
  }
  ctx.restore();
}

/**
 * ⚑ THE PHOTOGRAPH (S4R.4, the memories feature). Pre-authored pixel art —
 * there is NO camera input and NO file input in this piece, ever, and there
 * never will be (CLAUDE.md hard invariant; the same law the E1 Restoration
 * Filter obeys). Two versions of the SAME image:
 *
 *   `original`  — hers. Dim, off-centre, grainy, the horizon slightly wrong.
 *   `enhanced`  — ⚑ and the cruelty is that it is a GOOD photo. Warmer light,
 *                 straightened, cleaner, the sky lifted. The system is pleased
 *                 with itself. It thinks it did her a favour, and by every
 *                 measure it has been taught, it did.
 *
 * FACELESS, like `era3.ts`'s NOA frames and for the same reason: no real
 * people, no likenesses, ever. The figure is a shape at a window.
 * ⚑ PLACEHOLDER-draft art — Sérgio's eye pending.
 *
 * ⚑ S78 ADDED `variant`, because the beat needs TWO memories and not one: the
 * second one is *already enhanced when it arrives*, which is the whole point
 * (nothing you decline is ever un-offered), and that reads as a system habit
 * only if it is visibly a different photograph. 0 = the window portrait,
 * 1 = outdoors in the spring.
 *
 * ⚑ S119 ADDED `variant 2` — THE BALL, AND `enhanced` DOES NOTHING TO IT.
 * `REINTERP_E4_DEEP_PASS_2026-08-05.md` §2 designed this and it was never
 * built: *"The ball photographs cannot be enhanced. L tries — the same
 * automatic pass it ran on everything else — and returns them unchanged…
 * Not because it refuses. Because it cannot tell what it is looking at."*
 *
 * So the flag is accepted, ignored, and the picture is identical either way.
 * ⚑ THE MECHANISM IS EXPRESSED IN THE RENDERER RATHER THAN NARRATED: there is
 * no branch here that says "and if it is the ball, refuse". The enhancement
 * pass simply has nothing to take hold of. Same tilt, same grain, same figures,
 * both times.
 *
 * ⚑ AND IT IS NOT SOURED, DIMMED OR GLITCHED. Register law is absolute at the
 * ball: *respite is never a trap and is never revealed as fake; the system
 * targets AROUND it, never through it.* This picture is warm and crowded and
 * the machine's failure is the machine's, not the room's. Faceless, like every
 * other figure in this piece.
 */
export function photograph(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  enhanced: boolean,
  variant = 0
): void {
  const sky = enhanced ? ERA4.photoSkyHi : ERA4.photoSky;
  const skin = enhanced ? ERA4.photoSkinHi : ERA4.photoSkin;
  const cloth = enhanced ? ERA4.photoClothHi : ERA4.photoCloth;
  const wall = ERA4.photoWall;
  // ⚑ the enhanced pass STRAIGHTENS and RE-CENTRES. Her own frames are a few
  // pixels out and a little off to one side, the way a photograph taken quickly
  // by a person is. The system's are level and composed.
  const tilt = enhanced ? 0 : 3;
  const skew = enhanced ? 0 : 5;
  // ⚑ a photograph is a rectangle and everything in it stops at its edge. The
  // tilt and the skew push bands past that edge on purpose, so the crop is what
  // keeps them inside — found by looking: the spring memory's ground ran a
  // hundred pixels down the wall of the room behind it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (variant === 2) {
    // ⚑ THE BALL, AND NOTHING BELOW READS `enhanced`.
    // A dark warm room seen from inside it: the back wall in shadow, a crowd in
    // silhouette against it, a pool of light on the floor, and one person
    // standing in the pool with the room's attention on them.
    // ⚑ COLOUR NOTE, and it cost a render to find: `ERA4.photoHair` and
    // `PLACE.ink` are the SAME hex (#74492F). The first pass used one for the
    // wall and the other for the crowd, so the room and the people in it were
    // literally the same colour and the picture read as mud. Three warm values
    // apart, darkest to lightest: photoFrame < ink < floorLo.
    const horizon = y + Math.round(h * 0.62);
    px(ctx, x, y, w, h, PLACE.ink);                          // the room, warm
    px(ctx, x, y, w, Math.round(h * 0.18), ERA4.photoFrame); // the ceiling, dark
    px(ctx, x, horizon, w, h, PLACE.floorLo);                // the floor

    // ⚑ the light that walks the building, one person at a time: a pool on the
    // floor and a soft column above it. Never a spotlight cone — the room is
    // not a stage set, it is a room.
    const cx = x + Math.round(w * 0.50);
    ctx.save();
    ctx.globalAlpha = 0.55;
    px(ctx, cx - Math.round(w * 0.17), horizon, Math.round(w * 0.34), h, PLACE.rugHi);
    ctx.globalAlpha = 0.10;
    px(ctx, cx - Math.round(w * 0.13), y, Math.round(w * 0.26), horizon - y, BALL.attention);
    ctx.restore();

    // THE CROWD — silhouettes, irregular, overlapping, and no faces ever. The
    // spacing is deliberately uneven: a row of evenly pitched shapes reads as
    // bottles on a shelf, which is what the first pass of this drew.
    const gap = [0, 9, 17, 23, 34, 41, 55, 63, 70, 82, 91, 99, 112, 120];
    for (let i = 0; i < gap.length; i++) {
      const bx = x + 2 + Math.round((gap[i] / 128) * (w - 10));
      const bh = 30 + ((i * 13) % 14);
      const bw = 8 + (i % 3);
      // the ones nearer the light are a shade warmer; the rest are the wall
      // silhouettes: DARK against the warm wall, and the ones standing in the
      // light are a shade lifted rather than a different colour.
      const near = Math.abs(bx - cx) < w * 0.20;
      const ink = near ? PLACE.floorLo : ERA4.photoFrame;
      px(ctx, bx, horizon - bh, bw, bh + 5, ink);
      px(ctx, bx + 1, horizon - bh - 7, bw - 2, 7, ink);   // head and shoulders
    }

    // ⚑ THE ONE PERSON WITH THE FLOOR. Warm-lit, faceless, and NOT larger than
    // the crowd — the ball's own politics: the room turns toward somebody who
    // is the same size as everybody in it.
    const wy = horizon - 40;
    px(ctx, cx - 6, wy + 12, 13, 30, PLACE.textileHi);      // what she is wearing
    px(ctx, cx - 8, wy + 12, 2, 26, PLACE.sun);             // the rim of the light
    px(ctx, cx - 4, wy, 9, 11, ERA4.photoSkinHi);           // head, no features
    px(ctx, cx - 6, wy - 3, 13, 5, ERA4.photoHair);
    px(ctx, cx - 12, wy + 15, 7, 3, PLACE.textileHi);       // an arm, out
    px(ctx, cx + 7, wy + 9, 8, 3, PLACE.textileHi);         // and the other, up

    // grain, and it stays whether or not the pass was asked for
    ctx.save();
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 90; i++) {
      px(ctx, x + ((i * 37) % w), y + ((i * 53) % h), 1, 1, ERA4.textHi);
    }
    ctx.restore();
    ctx.restore();   // the crop
    px(ctx, x - 1, y - 1, w + 2, 1, ERA4.photoFrame);
    px(ctx, x - 1, y + h, w + 2, 1, ERA4.photoFrame);
    px(ctx, x - 1, y - 1, 1, h + 2, ERA4.photoFrame);
    px(ctx, x + w, y - 1, 1, h + 2, ERA4.photoFrame);
    return;
  }

  if (variant === 1) {
    // outdoors: a horizon, something green, and light the system found for it
    px(ctx, x, y, w, h, sky);
    if (enhanced) {
      px(ctx, x, y + Math.round(h * 0.30), w, Math.round(h * 0.16), PLACE.skyHaze);
      px(ctx, x + Math.round(w * 0.14), y + Math.round(h * 0.12), 14, 14, PLACE.sun);
      px(ctx, x + Math.round(w * 0.14) + 3, y + Math.round(h * 0.12) + 3, 8, 8, PLACE.sunHi);
    }
    px(ctx, x - skew, y + Math.round(h * 0.50) + tilt, w + skew, Math.round(h * 0.18),
      enhanced ? PLACE.land : PLACE.landLo);
    px(ctx, x - skew, y + Math.round(h * 0.66) + tilt, w + skew, h,
      enhanced ? ERA4.photoWallHi : PLACE.landLo);
  } else {
    px(ctx, x, y, w, h, wall);
    // the window she is standing in front of
    const wx = x + Math.round(w * 0.10) - skew;
    const ww = Math.round(w * 0.52);
    const wh = Math.round(h * 0.62);
    px(ctx, wx, y + 6 + tilt, ww, wh, sky);
    px(ctx, wx + Math.round(ww / 2) - 1, y + 6 + tilt, 2, wh, wall);
    if (enhanced) {
      // ⚑ WHAT THE SYSTEM ACTUALLY DID, and it is not a wash over everything:
      // it found the light. A warm spill off the window onto the wall beside
      // it, a lifted sill, and a top band of sun — the picture reads LIT rather
      // than paled, which is the only version of this beat that works. If the
      // enhanced photograph is not the better photograph, the beat is inverted
      // and the cruelty is gone.
      px(ctx, x, y, w, 5, ERA4.photoWarm);
      px(ctx, wx, y + 6 + wh, ww, 4, ERA4.photoWarm);
      ctx.save();
      ctx.globalAlpha = 0.22;
      px(ctx, wx + ww, y + 10, Math.round(w * 0.22), h - 20, ERA4.photoSun);
      ctx.globalAlpha = 0.12;
      px(ctx, x, y, w, Math.round(h * 0.30), ERA4.photoSun);
      ctx.restore();
    }
  }
  // the figure — a shape, no face, ever
  const fx = x + Math.round(w * (variant === 1 ? 0.42 : 0.56)) + skew;
  const fy = y + Math.round(h * (variant === 1 ? 0.30 : 0.22)) + tilt;
  px(ctx, fx, fy, 14, 14, skin);                 // head
  px(ctx, fx - 2, fy - 3, 18, 6, ERA4.photoHair);
  px(ctx, fx - 4, fy + 15, 22, h - (fy - y) - 15, cloth); // shoulders down
  if (enhanced) {
    // the rim of light down one side of her — the flattering half of the pass
    px(ctx, fx - 5, fy + 15, 1, h - (fy - y) - 15, ERA4.photoWarm);
    px(ctx, fx - 1, fy, 2, 14, ERA4.photoWarm);
  } else {
    // ⚑ her version is UNDEREXPOSED and it has grain. The enhanced one is
    // neither, and that is the tell — the only one there is.
    ctx.save();
    ctx.globalAlpha = 0.18;
    px(ctx, x, y, w, h, ERA4.field);
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 90; i++) {
      const gx = x + ((i * 37) % w);
      const gy = y + ((i * 53) % h);
      px(ctx, gx, gy, 1, 1, ERA4.textHi);
    }
    ctx.restore();
  }
  ctx.restore();   // the crop
  // frame
  px(ctx, x - 1, y - 1, w + 2, 1, ERA4.photoFrame);
  px(ctx, x - 1, y + h, w + 2, 1, ERA4.photoFrame);
  px(ctx, x - 1, y - 1, 1, h + 2, ERA4.photoFrame);
  px(ctx, x + w, y - 1, 1, h + 2, ERA4.photoFrame);
}

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * ⚑ THE MEMORY (S78) — and the surface exists to be UNREMARKABLE.
 *
 * `docs/REINTERP_E4_DEEP_PASS_2026-08-05.md` §2: it is not an app. There is no
 * window frame, no title bar, no toolbar and nothing to open — a card the way a
 * phone puts a card in front of you, with the date at the top and the picture
 * under it. **Nothing announces that the picture has been changed.**
 *
 * The one control is the small grey `See original` line every photo product in
 * the world puts under an automatic enhancement, drawn in the DIMMEST type on
 * the card, below the picture, where such a line always is. ⚑ It is the era's
 * second press and the whole reason the beat can be discovered at all — and it
 * is deliberately not styled as a warning, a button or an alert. Returns its
 * rect so the caller can hit-test the same geometry that was drawn.
 */
export function memoryCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  title: string, control: string,
  enhanced: boolean, variant: number
): Rect {
  const pad = 12;
  const pw = w - pad * 2;
  const ph = Math.round(pw * 0.62);
  const h = pad + 14 + ph + 10 + 12 + pad - 6;
  px(ctx, x, y, w, h, WALL.card);
  px(ctx, x, y, w, 1, WALL.cardHi);
  px(ctx, x, y + h - 1, w, 1, WALL.cardEdge);
  px(ctx, x, y, 1, h, WALL.cardEdge);
  px(ctx, x + w - 1, y, 1, h, WALL.cardEdge);

  setFont(ctx, 9);
  ctx.fillStyle = WALL.meta;
  ctx.fillText(title, x + pad, y + pad - 3);

  photograph(ctx, x + pad, y + pad + 12, pw, ph, enhanced, variant);

  // the small grey line under the picture. Never emphasised, never coloured.
  const cy = y + pad + 12 + ph + 8;
  setFont(ctx, 9);
  ctx.fillStyle = enhanced ? WALL.fine : WALL.quiet;
  ctx.fillText(control, x + pad, cy);
  const cw = Math.ceil(ctx.measureText(control).width);
  return { x: x + pad - 4, y: cy - 4, w: cw + 8, h: 16 };
}

export interface OfferCopy {
  mark: string; title: string; body: string; price: string; fine: string;
}

/**
 * ⚑ AN OFFER, on the wall of the place (S78). Warm card stock, one accent, and
 * the fine print in the dimmest type there is — which is where the export
 * thesis lives (`Available in your region.`) and why nothing here draws the eye
 * to it. It is not pressable: this era's presses are spent elsewhere, and a
 * store you could buy from would be a beat nobody asked for.
 *
 * ⚑ PLACEHOLDER-draft art. `body` is wrapped by the caller so this helper stays
 * a painter and the copy stays in `data/dialog/s4_offers.json`.
 */
export function offerCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  copy: OfferCopy, bodyRows: string[]
): void {
  px(ctx, x, y, w, h, WALL.card);
  px(ctx, x, y, w, 1, WALL.cardHi);
  px(ctx, x, y + h - 1, w, 1, WALL.cardEdge);
  px(ctx, x, y, 1, h, WALL.cardEdge);
  px(ctx, x + w - 1, y, 1, h, WALL.cardEdge);
  px(ctx, x, y, 3, h, WALL.accent);      // the one warm accent

  setFont(ctx, 8);
  ctx.fillStyle = WALL.mark;
  ctx.fillText(copy.mark, x + 10, y + 7);
  // the title wraps rather than running off the card — the copy lives in data
  // and is the project lead's to rewrite, so the painter must survive a longer
  // line instead of the line being cut to fit the painter.
  setFont(ctx, 10);
  const titleRows = wrapText(ctx, copy.title, w - 20).slice(0, 2);
  ctx.fillStyle = WALL.title;
  titleRows.forEach((row, i) => ctx.fillText(row, x + 10, y + 18 + i * 12));
  setFont(ctx, 9);
  ctx.fillStyle = WALL.body;
  const bodyTop = y + 20 + titleRows.length * 12;
  bodyRows.forEach((row, i) => ctx.fillText(row, x + 10, bodyTop + i * 11));
  setFont(ctx, 10);
  ctx.fillStyle = WALL.price;
  ctx.fillText(copy.price, x + 10, y + h - 32);
  // ⚑ THE SMALLEST TYPE ON THE SURFACE, and it is where the export thesis
  // lives. It WRAPS rather than being cut to the card, because `Available in
  // your region.` is the line the whole beat is built on and a clipped line
  // carries nothing. Nothing else about it is emphasised: same colour as a
  // delivery note, no rule above it, never mentioned by anybody.
  setFont(ctx, 8);
  ctx.fillStyle = WALL.fine;
  wrapText(ctx, copy.fine, w - 18).slice(0, 2)
    .forEach((row, i) => ctx.fillText(row, x + 10, y + h - 21 + i * 10));
}

/**
 * ⚑ AN OFFER, OPENED (S120, P3) — the same card, big enough to read.
 *
 * The wall's four cards are 120 px wide on a 512 px canvas, which puts `fine`
 * — *Available in your region.*, the line the export thesis is built on — at
 * 8 px for ten seconds. This is that card at 360 px, held open until she
 * closes it, with the fine print set at a size a person can actually read.
 *
 * ⚑ NOTHING IS ADDED. Same mark, same title, same body, same price, same fine
 * print, same accent, same colours — it is the card, larger. There is no
 * detail view, no feature list, no testimonial and above all no BUY: the era's
 * thesis is that the choice is gone, and a store you could buy from would be a
 * beat nobody asked for (`s4_offers.json`'s own standing note, kept).
 *
 * Returns the close control's rect so the draw and the hit test cannot drift.
 */
export function offerCardOpen(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  copy: OfferCopy, bodyRows: string[], fineRows: string[], close: string
): Rect {
  px(ctx, x, y, w, h, WALL.card);
  px(ctx, x, y, w, 1, WALL.cardHi);
  px(ctx, x, y + h - 1, w, 1, WALL.cardEdge);
  px(ctx, x, y, 1, h, WALL.cardEdge);
  px(ctx, x + w - 1, y, 1, h, WALL.cardEdge);
  px(ctx, x, y, 4, h, WALL.accent);

  setFont(ctx, 10);
  ctx.fillStyle = WALL.mark;
  ctx.fillText(copy.mark, x + 18, y + 14);

  setFont(ctx, 16);
  ctx.fillStyle = WALL.title;
  ctx.fillText(copy.title, x + 18, y + 32);

  setFont(ctx, 11);
  ctx.fillStyle = WALL.body;
  bodyRows.forEach((row, i) => ctx.fillText(row, x + 18, y + 60 + i * 15));

  setFont(ctx, 15);
  ctx.fillStyle = WALL.price;
  ctx.fillText(copy.price, x + 18, y + h - 68);

  // ⚑ STILL THE SMALLEST TYPE ON THE CARD, and still unemphasised — it is
  // simply no longer too small to read. Nothing draws the eye to it: no rule,
  // no colour, no label, and nobody ever mentions it.
  setFont(ctx, 10);
  ctx.fillStyle = WALL.fine;
  fineRows.forEach((row, i) => ctx.fillText(row, x + 18, y + h - 40 + i * 12));

  setFont(ctx, 9);
  ctx.fillStyle = WALL.quiet;
  const cw = Math.ceil(ctx.measureText(close).width);
  const cx = x + w - 18 - cw;
  ctx.fillText(close, cx, y + h - 18);
  return { x: cx - 6, y: y + h - 24, w: cw + 12, h: 18 };
}

/**
 * ⚑ THE RECOMMENDATION (S78) — the curated clip, on the same card stock as the
 * offers because it IS one: a placement, paid for, selected for her.
 *
 * The card states who is speaking and that the placement was paid for, because
 * `docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md` §2's law is that a lobbying
 * campaign is ATTRIBUTED, not held open as a question. The excerpts are drawn
 * as speech and nothing on the surface answers them — the answer is the second
 * card, which the system takes away.
 */
export function mediaCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  mark: string, meta: string, runtime: string, rows: string[]
): void {
  px(ctx, x, y, w, h, WALL.card);
  px(ctx, x, y, w, 1, WALL.cardHi);
  px(ctx, x, y + h - 1, w, 1, WALL.cardEdge);
  px(ctx, x, y, 1, h, WALL.cardEdge);
  px(ctx, x + w - 1, y, 1, h, WALL.cardEdge);
  px(ctx, x, y, w, 22, WALL.cardHi);
  px(ctx, x, y + 22, w, 1, WALL.cardEdge);

  setFont(ctx, 10);
  ctx.fillStyle = WALL.title;
  ctx.fillText(mark, x + 10, y + 7);
  setFont(ctx, 8);
  ctx.fillStyle = WALL.meta;
  const rw = Math.ceil(ctx.measureText(runtime).width);
  ctx.fillText(runtime, x + w - 10 - rw, y + 9);
  ctx.fillStyle = WALL.fine;
  ctx.fillText(meta, x + 10, y + 27);

  setFont(ctx, 10);
  ctx.fillStyle = WALL.body;
  rows.forEach((row, i) => ctx.fillText(row, x + 10, y + 42 + i * 13));
}

/**
 * ⚑ THE ONE THE SELECTION LEFT OUT (S78), and the system is taking it away.
 * Same stock, no accent rail, dimmer. `fade` runs 1 → 0 as it is withdrawn; at
 * 0 the card is gone and its row prints what the system did, in the system's
 * own flat vocabulary. Nothing else remarks on it, ever.
 */
export function counterCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  meta: string, rows: string[], removedLabel: string, fade: number
): void {
  if (fade <= 0) {
    // the row the card left behind. Quiet, but it has to be READABLE — the
    // withdrawal is the beat's whole indictment and an invisible line indicts
    // nothing. One thin strip of stock so it is not competing with a wall.
    px(ctx, x, y, w, 14, WALL.cardHi);
    px(ctx, x, y, w, 1, WALL.cardEdge);
    px(ctx, x, y + 13, w, 1, WALL.cardEdge);
    setFont(ctx, 8);
    ctx.fillStyle = WALL.meta;
    ctx.fillText(removedLabel, x + 10, y + 4);
    return;
  }
  ctx.save();
  ctx.globalAlpha = fade;
  px(ctx, x, y, w, h, WALL.card);
  px(ctx, x, y, w, 1, WALL.cardEdge);
  px(ctx, x, y + h - 1, w, 1, WALL.cardEdge);
  px(ctx, x, y, 1, h, WALL.cardEdge);
  px(ctx, x + w - 1, y, 1, h, WALL.cardEdge);
  setFont(ctx, 8);
  ctx.fillStyle = WALL.fine;
  ctx.fillText(meta, x + 10, y + 7);
  setFont(ctx, 10);
  ctx.fillStyle = WALL.body;
  rows.forEach((row, i) => ctx.fillText(row, x + 10, y + 21 + i * 13));
  ctx.restore();
}

/**
 * ⚑ THE GLITCH (S78, the finale's first move). The piece's own grammar — the
 * update ritual has stuttered at every era change since 1997 — in hard integer
 * bands, never a strobe, never a colour that is not already on the surface. It
 * displaces what is ALREADY DRAWN rather than drawing anything new, which is
 * why it takes the canvas as its own source. `k` runs 0→1.
 *
 * ⚑ THE SOURCE RECT IS IN BACKING-STORE PIXELS AND THE DESTINATION IS NOT.
 * `os.ts` renders this canvas at ×`RENDER_SCALE` so glyphs resolve in VR, and
 * the 2D context carries that scale in its transform — which `drawImage`
 * applies to the destination and NOT to the source. Reading `0,y,W,bh` took a
 * sixth of the top-left corner and blew it up over the whole band; the first
 * capture of this beat was a cream-coloured smear with one letter in it. Found
 * by looking at the frame, which is the only way this class of fault is ever
 * found.
 */
export function glitchBands(ctx: CanvasRenderingContext2D, W: number, H: number, k: number): void {
  const bands = 7;
  const bh = Math.ceil(H / bands);
  const S = RENDER_SCALE;
  for (let i = 0; i < bands; i++) {
    // deterministic, seeded off the band index — no rng, same every run
    const dir = i % 2 === 0 ? 1 : -1;
    const amp = Math.round(k * (6 + ((i * 13) % 17)));
    if (amp === 0) continue;
    const y = i * bh;
    ctx.drawImage(ctx.canvas, 0, y * S, W * S, bh * S, dir * amp, y, W, bh);
    px(ctx, 0, y, W, 1, ERA4.rule);
  }
}

/**
 * ⚑ THE FOUR PANELS (S78, the finale) — and they are the cyclorama's own slits,
 * widened. FOUR of the countless rooms open far enough to be rooms: a window, a
 * floor, and one thing in each. The years are the ONLY text in the beat.
 *
 * ⚑ Same grammar as `cyclorama` above and as the relocation choreography's
 * building (`REINTERP_THE_BUILDING_2026-08-02.md`) — the piece has ONE image for
 * *countless rooms* and this is it. `k` runs 0→1.
 * ⚑ IT SETS THE CLOSE UP AND SPENDS NONE OF IT: no survivors, no title card, no
 * `Restart as you are.` Those are the Close's and they are not this session's.
 */
export function eraPanels(
  ctx: CanvasRenderingContext2D, W: number, H: number, k: number, years: string[]
): void {
  const n = Math.max(1, years.length);
  const pw = 96;
  const ph = 132;
  const gap = Math.round((W - n * pw) / (n + 1));
  const top = Math.round((H - ph) / 2) - 8;
  years.forEach((year, i) => {
    const phase = Math.max(0, Math.min(1, k * 2.4 - i * 0.34));
    if (phase <= 0) return;
    const x = gap + i * (pw + gap);
    const openW = Math.max(2, Math.round(pw * phase));
    const ox = x + Math.round((pw - openW) / 2);
    // the room, seen edge-on: wall, floor, a window, and one thing in it
    px(ctx, ox, top, openW, ph, PLACE.wallLo);
    px(ctx, ox, top + ph - 34, openW, 34, PLACE.floorLo);
    if (phase > 0.55) {
      px(ctx, ox + 14, top + 22, Math.max(2, openW - 28), 46, PLACE.skyLo);
      px(ctx, ox + 14, top + 44, Math.max(2, openW - 28), 24, PLACE.skyHaze);
      px(ctx, ox + 20, top + ph - 52, 18, 18, PLACE.shelf);
    }
    px(ctx, ox, top, openW, 1, ERA4.glow);
    px(ctx, ox, top + ph - 1, openW, 1, ERA4.rule);
    if (phase >= 1) {
      setFont(ctx, 10);
      ctx.fillStyle = ERA4.dim;
      const tw = Math.ceil(ctx.measureText(year).width);
      ctx.fillText(year, x + Math.round((pw - tw) / 2), top + ph + 12);
    }
  });
}

/**
 * THE FINALE's cyclorama slits (S4R.9). ⚑ Deliberately the SAME grammar as the
 * relocation choreography's building — vertical lit slots in a dark field,
 * countless rooms seen edge-on — and NOT a second visual idea invented for the
 * ending (`REINTERP_THE_BUILDING_2026-08-02.md`). `k` runs 0→1.
 */
export function cyclorama(ctx: CanvasRenderingContext2D, W: number, H: number, k: number): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const phase = Math.max(0, Math.min(1, k * 2.2 - i / n));
    if (phase <= 0) continue;
    const sw = 3;
    const sx = Math.round(((i + 0.5) / n) * W) - 1;
    const sh = Math.round(H * 0.62 * phase);
    px(ctx, sx, Math.round((H - sh) / 2), sw, sh, i % 3 === 0 ? ERA4.glow : ERA4.rule);
  }
}

/**
 * ⚑ THE BALL (S79) — and it is the smallest block in this file on purpose.
 *
 * TRANSCENDANCE has NO SCREEN (`REINTERP_E4_THE_DEVICE_2026-08-05.md`, Stage 0
 * §"And TRANSCENDANCE has no screen at all"). Four eras have been surfaces — a
 * CRT, a program, three device screens, a visor — and the last thing in the era
 * is a ROOM: sound and light in geometry that already exists. So this block
 * draws NOTHING. It holds two light colours the room borrows and one ink the
 * frame's own subtitle borrows, and that is the entire visual budget of the
 * scene, because the whole contrast is that **the apparatus can only ever show
 * you a picture of a room, and this is a room.**
 *
 * COLOR LAW, same as every block above: both light colours are lifted verbatim
 * from `data/room/era1.json` by way of `PLACE` — `sun` and `rugHi`. The warm
 * light at the end of thirty years is the same warm light 1997 was lit with,
 * which is not thrift, it is the argument.
 *
 * ⚑ `attention` IS THE INVERSE OF THE HOUSE LOOK. E3's correction 13 applies a
 * grading preset — "one lamp for the whole room, so that no face is lit
 * differently from another" (`Household` 1:5, `data/dialog/s3_queue.json`).
 * This is one lamp that MOVES, lighting one person at a time, differently.
 * Nothing in the piece ever remarks on that, and nothing ever should.
 */
export const BALL = {
  /** the attention: the light that walks the building, one person at a time */
  attention: PLACE.sun,
  /** the room the attention is in — warm, low, and never sharp */
  room: PLACE.rugHi,
  /** ⚑ frame-voice subtitle ink for the ball's own sound. NOT a screen and not
   *  the fiction's UI: plain DOM chrome in the idiom `src/engine/app.ts`'s tape
   *  captions already established for audio that plays IN THE ROOM. It is the
   *  era's warmest legible ink because a subtitle's one job is to be read. */
  captionInk: ERA4.textHi,
  captionField: 'rgba(10,10,14,0.78)'
} as const;
