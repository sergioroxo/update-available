/**
 * ⚑ S227 — LAMBYOS HOME, THE ROOM'S ART (docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md §5).
 *
 * A FIRST PASS IN CODE, waiting for the drawn art. The design's §5 prompts will produce a backdrop and two sheets of
 * object layers; when they arrive, `drawBackdrop` becomes one image and each `SPRITES` entry becomes one cut-out, and
 * nothing else in Home has to change (the layout below is where they are placed). Until then the room is drawn here,
 * simply, as pixel art:
 *   - palette: theme/home.ts only (Daniel's 1997 room, the marigold accent, the 1997 machine, the lamb's wool);
 *   - pixel discipline: integer rects only, no rotation, no smoothing; the canvas is shown at an integer scale with
 *     `image-rendering: pixelated`;
 *   - Soft Lo-Fi: a warm evening room with a lamp on, the corners softening into haze — NOT horror-dark;
 *   - the lit state is a 1-px marigold edge around an object's own silhouette (§5 "after the renders" step 4), never
 *     a glow and never a sparkle.
 * Two compositions — a wide room (16:9) and a tall one (9:16, a phone held upright) — place the same objects, so
 * every target keeps its 44 css px at phone size without the objects overlapping.
 */
import { HOME } from '../theme/home';
import { drawLambyChar, type LambyPose } from '../apps/lambyChar';

export type HomeObject =
  | 'door' | 'notice' | 'plaque' | 'tape' | 'armchair' | 'remote' | 'switch'
  | 'computer' | 'tablet' | 'headset' | 'lamby';

export interface Rect { x: number; y: number; w: number; h: number }

export interface HomeLayout {
  kind: 'wide' | 'tall';
  W: number;
  H: number;
  /** the floor line (the wall stops here) */
  floorY: number;
  door: Rect;
  mat: Rect;
  window: Rect;
  mantel: Rect;      // the shelf the plaque hangs over
  sideboard: Rect;
  bookshelf: Rect;
  /** the floor lamp; the tall room has no wall to spare for one (the window lights it) */
  lamp: { x: number; y: number } | null;
  rug: Rect;
  table: Rect;
  /** where each sprite sits (its top-left); the sprite's size is its own */
  at: Record<'notice' | 'switch' | 'plaque' | 'crt' | 'vcr' | 'tape' | 'chair' | 'remote' | 'computer' | 'tablet' | 'headset' | 'lamby', { x: number; y: number }>;
  /** the pressable rects, in logical px (the art's own extent, before the 44 px minimum is applied) */
  hits: Record<HomeObject, Rect>;
}

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string): void => {
  if (w <= 0 || h <= 0) return;
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// ── the sprites: each drawn at its own origin, at a fixed size ──────────────────────────────────────────────────────
export interface Sprite { w: number; h: number; draw(c: Ctx, frame?: number): void }

const notice: Sprite = {
  w: 22, h: 28,
  draw(c) {
    r(c, 0, 0, 22, 28, HOME.floorLo);            // the frame's dark edge
    r(c, 1, 1, 20, 26, HOME.sill);               // the frame
    r(c, 3, 3, 16, 22, HOME.mug);                // the sheet
    r(c, 3, 3, 16, 1, HOME.paper);
    r(c, 5, 6, 12, 2, HOME.ink);                 // its heading, a bar of type
    for (let i = 0; i < 6; i++) r(c, 5, 10 + i * 2.5, i === 5 ? 7 : 12, 1, HOME.wallLo);
    r(c, 10, 0, 2, 1, HOME.ink);                 // the nail it hangs from
  }
};

const lightSwitch: Sprite = {
  w: 6, h: 9,
  draw(c) {
    r(c, 0, 0, 6, 9, HOME.wallLo);
    r(c, 0, 0, 5, 8, HOME.mug);
    r(c, 2, 2, 2, 4, HOME.wallHi);
    r(c, 2, 4, 2, 2, HOME.sill);                 // the rocker, down: the lamp is on
  }
};

const plaque: Sprite = {
  w: 34, h: 14,
  draw(c) {
    r(c, 0, 0, 34, 14, HOME.floorLo);
    r(c, 1, 1, 32, 12, HOME.floor);
    r(c, 4, 3, 26, 8, HOME.ink);
    r(c, 5, 4, 24, 6, HOME.sun);                 // brass
    r(c, 5, 4, 24, 1, HOME.sunHi);
    r(c, 9, 6, 16, 1, HOME.ink);                 // engraved lines (its words are the card's)
    r(c, 12, 8, 10, 1, HOME.ink);
  }
};

const crt: Sprite = {
  w: 30, h: 25,
  draw(c) {
    r(c, 1, 0, 28, 23, HOME.greyDark);
    r(c, 2, 1, 26, 21, HOME.crtCase);
    r(c, 2, 1, 26, 1, HOME.white);
    r(c, 4, 3, 22, 15, HOME.greyDark);
    r(c, 5, 4, 20, 13, HOME.crtScreen);           // the 1997 desktop, on
    r(c, 7, 6, 10, 7, HOME.crtCase);              // a window on it
    r(c, 7, 6, 10, 1, HOME.crtNavy);
    r(c, 6, 15, 2, 1, HOME.crtCase);              // an icon
    r(c, 22, 19, 3, 1, HOME.greyDark);            // the power light's housing
    r(c, 5, 23, 4, 2, HOME.greyDark);             // the feet
    r(c, 21, 23, 4, 2, HOME.greyDark);
  }
};

const vcr: Sprite = {
  w: 34, h: 7,
  draw(c) {
    r(c, 0, 0, 34, 7, HOME.greyDark);
    r(c, 1, 0, 32, 6, HOME.silver);
    r(c, 1, 0, 32, 1, HOME.white);
    r(c, 4, 2, 14, 2, HOME.greyDark);             // the tape slot
    r(c, 22, 2, 6, 2, HOME.crtScreenDark);        // the clock
    r(c, 23, 2, 1, 1, HOME.crtScreen);
    r(c, 25, 2, 2, 1, HOME.crtScreen);
    r(c, 30, 2, 1, 2, HOME.grey);
  }
};

const tape: Sprite = {
  w: 9, h: 15,
  draw(c) {
    r(c, 0, 0, 9, 15, HOME.ink);
    r(c, 1, 1, 7, 13, HOME.wallHi);               // the sleeve, a soft gradient
    r(c, 1, 9, 7, 5, HOME.rugHi);
    r(c, 1, 12, 7, 2, HOME.textileHi);
    r(c, 3, 4, 4, 3, HOME.wool);                  // the lamb on it
    r(c, 3, 6, 4, 1, HOME.woolShade);
    r(c, 2, 4, 2, 2, HOME.lambFace);
    r(c, 3, 7, 1, 1, HOME.lambFace);
    r(c, 6, 7, 1, 1, HOME.lambFace);
  }
};

/** the armchair, in three quarter-turns: 0 = from behind (as the room sees it), 1 = side, 2 = facing you */
const chair: Sprite = {
  w: 50, h: 54,
  draw(c, frame = 0) {
    const fab = HOME.textile, hi = HOME.textileHi, edge = HOME.ink, leg = HOME.floorLo;
    if (frame === 1) {
      // in profile, facing right
      r(c, 8, 4, 12, 36, edge); r(c, 9, 5, 10, 35, fab); r(c, 10, 5, 3, 33, hi);       // the back
      r(c, 8, 28, 36, 14, edge); r(c, 9, 29, 34, 12, fab); r(c, 9, 29, 34, 2, hi);     // the seat
      r(c, 14, 22, 28, 7, edge); r(c, 15, 23, 26, 5, fab); r(c, 15, 23, 26, 1, hi);    // the arm
      r(c, 10, 42, 4, 10, leg); r(c, 38, 42, 4, 10, leg);
      return;
    }
    if (frame === 2) {
      // facing you: the seat cushion, the back behind it
      r(c, 6, 0, 38, 30, edge); r(c, 7, 1, 36, 28, fab); r(c, 9, 2, 32, 2, hi);
      r(c, 0, 18, 10, 26, edge); r(c, 1, 19, 8, 24, fab); r(c, 1, 19, 8, 2, hi);       // the arms
      r(c, 40, 18, 10, 26, edge); r(c, 41, 19, 8, 24, fab); r(c, 41, 19, 8, 2, hi);
      r(c, 9, 26, 32, 14, edge); r(c, 10, 27, 30, 12, hi); r(c, 10, 34, 30, 5, fab);    // the cushion
      r(c, 4, 44, 4, 10, leg); r(c, 42, 44, 4, 10, leg);
      return;
    }
    // from behind: a tall back with stepped shoulders, the arms showing either side
    r(c, 0, 18, 10, 30, edge); r(c, 1, 19, 8, 28, fab); r(c, 1, 19, 8, 2, hi);
    r(c, 40, 18, 10, 30, edge); r(c, 41, 19, 8, 28, fab); r(c, 41, 19, 8, 2, hi);
    r(c, 8, 2, 34, 48, edge); r(c, 10, 0, 30, 2, edge);
    r(c, 9, 3, 32, 46, fab); r(c, 11, 1, 28, 2, fab);
    r(c, 11, 2, 10, 2, hi); r(c, 9, 4, 3, 40, hi);                                       // light from the upper left
    r(c, 9, 40, 32, 1, HOME.textile);
    r(c, 24, 6, 1, 36, edge);                                                             // the seam down the back
    r(c, 4, 48, 4, 6, leg); r(c, 42, 48, 4, 6, leg);
  }
};

const remote: Sprite = {
  w: 5, h: 11,
  draw(c) {
    r(c, 0, 0, 5, 11, HOME.greyDark);
    r(c, 1, 1, 3, 9, HOME.crtCase);
    r(c, 2, 2, 1, 1, HOME.accent);               // its CC button, the one bright one
    r(c, 1, 4, 1, 1, HOME.greyDark); r(c, 3, 4, 1, 1, HOME.greyDark);
    r(c, 1, 6, 1, 1, HOME.greyDark); r(c, 3, 6, 1, 1, HOME.greyDark);
    r(c, 2, 8, 1, 1, HOME.greyDark);
  }
};

const computer: Sprite = {
  w: 22, h: 10,
  draw(c) {
    r(c, 0, 7, 22, 3, HOME.ink);                  // the mat
    r(c, 1, 7, 20, 2, HOME.bookAlt);
    r(c, 8, 2, 9, 6, HOME.greyDark);              // the mouse
    r(c, 9, 2, 7, 5, HOME.crtCase);
    r(c, 9, 2, 7, 1, HOME.white);
    r(c, 12, 2, 1, 3, HOME.greyDark);             // its two buttons
    r(c, 2, 1, 7, 1, HOME.greyDark);              // its cable
    r(c, 8, 1, 1, 2, HOME.greyDark);
  }
};

const tablet: Sprite = {
  w: 18, h: 12,
  draw(c) {
    r(c, 2, 0, 15, 11, HOME.ink);                 // propped on its stand
    r(c, 3, 1, 13, 9, HOME.greyDark);
    r(c, 4, 2, 11, 7, HOME.crtScreenDark);
    r(c, 5, 3, 3, 1, HOME.crtScreen);             // a glint
    r(c, 0, 10, 18, 2, HOME.greyDark);
  }
};

const headset: Sprite = {
  w: 20, h: 12,
  draw(c) {
    // the strap, a loop going back over the top
    r(c, 5, 0, 10, 1, HOME.grey); r(c, 3, 1, 2, 1, HOME.grey); r(c, 15, 1, 2, 1, HOME.grey);
    r(c, 2, 2, 1, 3, HOME.grey); r(c, 17, 2, 1, 3, HOME.grey);
    // the body, rounded
    r(c, 1, 5, 18, 6, HOME.greyDark); r(c, 2, 4, 16, 1, HOME.greyDark); r(c, 2, 11, 16, 1, HOME.greyDark);
    r(c, 2, 5, 16, 6, HOME.crtCase);
    r(c, 3, 5, 14, 1, HOME.white);
    // the front plate, dark, with a soft sheen
    r(c, 3, 6, 14, 4, HOME.greyDark);
    r(c, 4, 7, 4, 1, HOME.grey);
    r(c, 9, 10, 2, 1, HOME.grey);                 // the nose bridge's notch
  }
};

export const SPRITES = { notice, lightSwitch, plaque, crt, vcr, tape, chair, remote, computer, tablet, headset };

// ── the pixel type for the doormat (the programme's signage) ────────────────────────────────────────────────────────
const GLYPHS: Record<string, string[]> = {
  W: ['10001', '10001', '10101', '10101', '01010'],
  E: ['111', '100', '110', '100', '111'],
  L: ['100', '100', '100', '100', '111'],
  C: ['011', '100', '100', '100', '011'],
  O: ['010', '101', '101', '101', '010'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  H: ['101', '101', '111', '101', '101'],
  ' ': ['00', '00', '00', '00', '00']
};
function textWidth(s: string): number {
  return [...s].reduce((n, ch) => n + (GLYPHS[ch]?.[0].length ?? 3) + 1, -1);
}
function pixelText(c: Ctx, s: string, x: number, y: number, col: string): void {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') r(c, cx + i, y + j, 1, 1, col); });
    cx += g[0].length + 1;
  }
}

// ── the two compositions ────────────────────────────────────────────────────────────────────────────────────────────
function hitOf(at: { x: number; y: number }, s: Sprite, pad = 0): Rect {
  return { x: at.x - pad, y: at.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 };
}

export function wideLayout(): HomeLayout {
  const at = {
    notice: { x: 66, y: 40 }, switch: { x: 54, y: 62 }, plaque: { x: 177, y: 30 },
    crt: { x: 178, y: 64 }, vcr: { x: 176, y: 88 }, tape: { x: 214, y: 80 },
    chair: { x: 214, y: 124 }, remote: { x: 257, y: 143 },
    computer: { x: 64, y: 128 }, tablet: { x: 92, y: 126 }, headset: { x: 118, y: 127 },
    lamby: { x: 148, y: 112 }
  };
  const L: HomeLayout = {
    kind: 'wide', W: 320, H: 180, floorY: 112,
    door: { x: 10, y: 24, w: 34, h: 88 },
    mat: { x: 4, y: 114, w: 50, h: 9 },
    window: { x: 98, y: 20, w: 52, h: 56 },
    mantel: { x: 166, y: 52, w: 56, h: 4 },
    sideboard: { x: 166, y: 95, w: 64, h: 17 },
    bookshelf: { x: 244, y: 22, w: 46, h: 90 },
    lamp: { x: 298, y: 44 },
    rug: { x: 84, y: 128, w: 150, h: 26 },
    table: { x: 58, y: 138, w: 86, h: 42 },
    at,
    hits: {} as Record<HomeObject, Rect>
  };
  L.hits = {
    door: { x: 10, y: 24, w: 34, h: 99 },
    notice: hitOf(at.notice, notice),
    plaque: hitOf(at.plaque, plaque),
    tape: hitOf(at.tape, tape),
    armchair: { x: 214, y: 124, w: 40, h: 56 },
    remote: hitOf(at.remote, remote),
    switch: hitOf(at.switch, lightSwitch),
    computer: hitOf(at.computer, computer),
    tablet: hitOf(at.tablet, tablet),
    headset: hitOf(at.headset, headset),
    lamby: { x: at.lamby.x + 14, y: at.lamby.y + 4, w: 36, h: 42 }
  };
  return L;
}

export function tallLayout(): HomeLayout {
  const at = {
    notice: { x: 60, y: 92 }, switch: { x: 43, y: 112 }, plaque: { x: 105, y: 72 },
    crt: { x: 104, y: 104 }, vcr: { x: 102, y: 128 }, tape: { x: 140, y: 120 },
    chair: { x: 116, y: 256 }, remote: { x: 159, y: 275 },
    computer: { x: 10, y: 218 }, tablet: { x: 44, y: 216 }, headset: { x: 72, y: 217 },
    lamby: { x: 92, y: 176 }
  };
  const L: HomeLayout = {
    kind: 'tall', W: 180, H: 320, floorY: 152,
    door: { x: 4, y: 58, w: 30, h: 94 },
    mat: { x: 0, y: 154, w: 52, h: 9 },
    window: { x: 54, y: 12, w: 74, h: 50 },
    mantel: { x: 98, y: 94, w: 48, h: 4 },
    sideboard: { x: 98, y: 135, w: 56, h: 17 },
    bookshelf: { x: 152, y: 20, w: 28, h: 132 },
    lamp: null,
    rug: { x: 20, y: 176, w: 150, h: 34 },
    table: { x: 4, y: 228, w: 92, h: 92 },
    at,
    hits: {} as Record<HomeObject, Rect>
  };
  L.hits = {
    door: { x: 4, y: 58, w: 30, h: 105 },
    notice: hitOf(at.notice, notice),
    plaque: hitOf(at.plaque, plaque),
    tape: hitOf(at.tape, tape),
    armchair: { x: 116, y: 256, w: 40, h: 64 },
    remote: hitOf(at.remote, remote),
    switch: hitOf(at.switch, lightSwitch),
    computer: hitOf(at.computer, computer),
    tablet: hitOf(at.tablet, tablet),
    headset: hitOf(at.headset, headset),
    lamby: { x: at.lamby.x + 14, y: at.lamby.y + 4, w: 36, h: 42 }
  };
  return L;
}

/**
 * Grow every hit rect to at least `min` logical px each way, about its own centre, then push apart any pair that
 * now overlaps (design §4: "the targets never overlap"). Deterministic and small: the compositions above leave room.
 */
export function finalHits(L: HomeLayout, min: number): Record<HomeObject, Rect> {
  const out = {} as Record<HomeObject, Rect>;
  for (const [k, h] of Object.entries(L.hits) as [HomeObject, Rect][]) {
    const w = Math.max(h.w, min), hh = Math.max(h.h, min);
    let x = Math.round(h.x + h.w / 2 - w / 2), y = Math.round(h.y + h.h / 2 - hh / 2);
    x = Math.max(0, Math.min(L.W - w, x));
    y = Math.max(0, Math.min(L.H - hh, y));
    out[k] = { x, y, w, h: hh };
  }
  // resolve overlaps by trimming the larger rect on the shared side (never below `min`)
  const keys = Object.keys(out) as HomeObject[];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = out[keys[i]], b = out[keys[j]];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0) continue;
      const [big, small] = a.w * a.h >= b.w * b.h ? [a, b] : [b, a];
      if (ox <= oy) {
        if (big.x < small.x) big.w = Math.max(min, small.x - big.x);
        else { const right = big.x + big.w; big.x = small.x + small.w; big.w = Math.max(min, right - big.x); }
      } else {
        if (big.y < small.y) big.h = Math.max(min, small.y - big.y);
        else { const bottom = big.y + big.h; big.y = small.y + small.h; big.h = Math.max(min, bottom - big.y); }
      }
    }
  }
  return out;
}

// ── the backdrop ────────────────────────────────────────────────────────────────────────────────────────────────────
/** a 1-px checker of `col` over a rect — the soft, underdefined edge (haze), never a gradient */
function dither(c: Ctx, x: number, y: number, w: number, h: number, col: string, phase = 0): void {
  c.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = (j + phase) % 2; i < w; i += 2) c.fillRect(x + i, y + j, 1, 1);
}

function drawWindow(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x - 2, y - 2, w + 4, h + 4, HOME.sill);
  r(c, x, y, w, h, HOME.sky);
  r(c, x, y, w, Math.round(h * 0.3), HOME.skyLo);                    // higher up, further away
  dither(c, x, y + Math.round(h * 0.3), w, 2, HOME.skyLo);
  const hz = y + Math.round(h * 0.62);
  r(c, x, hz, w, Math.round(h * 0.16), HOME.skyHaze);                // the warm band on the horizon
  dither(c, x, hz - 2, w, 2, HOME.skyHaze);
  const sx = x + Math.round(w * 0.66), sy = hz - 3;                  // the low sun
  r(c, sx - 3, sy - 1, 7, 4, HOME.sun); r(c, sx - 2, sy - 2, 5, 1, HOME.sun); r(c, sx - 1, sy - 1, 3, 2, HOME.sunHi);
  r(c, x, hz + Math.round(h * 0.16), w, h - Math.round(h * 0.78), HOME.land);
  r(c, x, y + h - 3, w, 3, HOME.landLo);
  r(c, x + Math.floor(w / 2) - 1, y, 2, h, HOME.sill);               // the glazing bars
  r(c, x, y + Math.floor(h / 2) - 1, w, 2, HOME.sill);
  r(c, x - 4, y + h + 2, w + 8, 3, HOME.sill);                       // the sill
  r(c, x - 4, y + h + 5, w + 8, 1, HOME.floorLo);
  // the curtains, tied back
  r(c, x - 8, y - 4, 7, h + 6, HOME.textile); r(c, x - 8, y - 4, 2, h + 6, HOME.textileHi);
  r(c, x + w + 1, y - 4, 7, h + 6, HOME.textile); r(c, x + w + 5, y - 4, 2, h + 6, HOME.textileHi);
  r(c, x - 10, y - 6, w + 20, 2, HOME.floorLo);                      // the rail
}

function drawDoor(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x - 3, y - 3, w + 6, h + 3, HOME.sill);                       // the frame
  r(c, x - 3, y - 3, w + 6, 1, HOME.wallHi);
  r(c, x, y, w, h, HOME.floor);
  r(c, x, y, 2, h, HOME.floorHi);
  const inset = (ix: number, iy: number, iw: number, ih: number): void => {
    r(c, ix, iy, iw, ih, HOME.floorLo); r(c, ix + 1, iy + 1, iw - 1, ih - 1, HOME.floor);
  };
  r(c, x + 7, y + 6, w - 14, 14, HOME.floorLo);                      // the little window in the door
  r(c, x + 8, y + 7, w - 16, 12, HOME.skyLo);
  r(c, x + 8, y + 13, w - 16, 6, HOME.skyHaze);
  r(c, x + Math.floor(w / 2), y + 7, 1, 12, HOME.sill);
  inset(x + 5, y + 26, w - 10, Math.round(h * 0.28));
  inset(x + 5, y + 30 + Math.round(h * 0.28), w - 10, Math.round(h * 0.34));
  r(c, x + w - 7, y + Math.round(h * 0.55), 3, 3, HOME.sun);         // the knob
  r(c, x + w - 7, y + Math.round(h * 0.55), 1, 1, HOME.sunHi);
}

function drawShelfUnit(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x, y, w, h, HOME.floorLo);
  r(c, x + 2, y + 2, w - 4, h - 2, HOME.wallLo);
  const rows = Math.max(3, Math.floor(h / 22));
  const step = Math.floor((h - 4) / rows);
  const books = [HOME.book, HOME.bookAlt, HOME.textile, HOME.sill, HOME.bookAlt, HOME.plantLo, HOME.book, HOME.rugHi];
  for (let i = 0; i < rows; i++) {
    const sy = y + 2 + (i + 1) * step;
    r(c, x, sy - 2, w, 3, HOME.sill);
    r(c, x, sy + 1, w, 1, HOME.floorLo);
    // books on this shelf (one shelf keeps a gap: the Lexicon's place, empty until the Close brings it)
    let bx = x + 3, n = i * 3;
    const end = x + w - 3 - (i === 1 ? 14 : 0);
    while (bx < end - 2) {
      const bw = 2 + ((n * 7) % 3), bh = step - 6 - ((n * 5) % 4);
      if (bx + bw > end) break;
      const col = books[n % books.length];
      r(c, bx, sy - 2 - bh, bw, bh, col);
      r(c, bx, sy - 2 - bh, bw, 1, HOME.wallHi);
      bx += bw + (n % 4 === 3 ? 2 : 0);
      n++;
    }
    if (i === rows - 1) {                                           // a plant on the top shelf's end
      r(c, x + w - 10, sy - 7, 6, 5, HOME.floorLo);
      r(c, x + w - 12, sy - 13, 10, 6, HOME.plant); r(c, x + w - 10, sy - 15, 4, 2, HOME.plantLo);
    }
  }
}

function drawLamp(c: Ctx, at: { x: number; y: number }, floorY: number): void {
  const { x, y } = at;
  // the warm pool the lamp throws on the wall: a dither, so its edge is soft
  dither(c, x - 14, y - 6, 30, 22, HOME.skyHaze);
  r(c, x + 1, y + 10, 1, floorY - y - 12, HOME.ink);                 // the pole
  r(c, x - 3, floorY - 3, 9, 3, HOME.ink);                            // the foot
  r(c, x - 5, y, 13, 10, HOME.ink);                                   // the shade
  r(c, x - 4, y + 1, 11, 8, HOME.sun);
  r(c, x - 4, y + 1, 11, 2, HOME.sunHi);
}

function drawRug(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x + 4, y, w - 8, h, HOME.rugHi);
  r(c, x, y + 3, w, h - 6, HOME.rugHi);
  r(c, x + 5, y + 2, w - 10, h - 4, HOME.rug);
  r(c, x + 2, y + 5, w - 4, h - 10, HOME.rug);
  for (let i = x + 10; i < x + w - 10; i += 6) r(c, i, y + Math.floor(h / 2), 3, 1, HOME.rugHi);
}

function drawTable(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x, y, w, 4, HOME.sill);
  r(c, x, y, w, 1, HOME.wallHi);
  r(c, x, y + 4, w, 2, HOME.floorLo);
  r(c, x + 4, y + 6, 5, h - 6, HOME.floor); r(c, x + 4, y + 6, 1, h - 6, HOME.floorHi);
  r(c, x + w - 9, y + 6, 5, h - 6, HOME.floor);
  r(c, x + 9, y + 14, w - 18, 2, HOME.floorLo);                      // the stretcher
}

function drawSideboard(c: Ctx, R: Rect): void {
  const { x, y, w, h } = R;
  r(c, x - 1, y, w + 2, 3, HOME.sill);
  r(c, x, y + 3, w, h - 3, HOME.floor);
  r(c, x, y + 3, w, 1, HOME.floorLo);
  r(c, x + Math.floor(w / 2), y + 4, 1, h - 6, HOME.floorLo);
  r(c, x + Math.floor(w / 2) - 4, y + 8, 2, 2, HOME.sun);
  r(c, x + Math.floor(w / 2) + 3, y + 8, 2, 2, HOME.sun);
}

function drawMantel(c: Ctx, R: Rect): void {
  const { x, y, w } = R;
  r(c, x, y, w, 3, HOME.sill);
  r(c, x, y, w, 1, HOME.wallHi);
  r(c, x, y + 3, w, 1, HOME.floorLo);
  r(c, x + 4, y + 4, 2, 4, HOME.floorLo); r(c, x + w - 6, y + 4, 2, 4, HOME.floorLo);
  // a plant and a mug on it — the room's own small things
  r(c, x + 5, y - 5, 6, 5, HOME.floorLo);
  r(c, x + 3, y - 11, 10, 6, HOME.plant); r(c, x + 6, y - 13, 4, 2, HOME.plantLo);
  r(c, x + w - 11, y - 5, 5, 5, HOME.mug); r(c, x + w - 6, y - 4, 2, 2, HOME.mug);
}

function drawMat(c: Ctx, R: Rect, text: string): void {
  const { x, y, w, h } = R;
  r(c, x, y, w, h, HOME.floorLo);
  r(c, x + 1, y + 1, w - 2, h - 2, HOME.floorHi);
  const tw = textWidth(text);
  pixelText(c, text, x + Math.floor((w - tw) / 2), y + Math.floor((h - 5) / 2), HOME.ink);
}

export function drawBackdrop(c: Ctx, L: HomeLayout, matText: string): void {
  const { W, H, floorY } = L;
  // the wall: lit near the window and the lamp, cream elsewhere, shadow at the ceiling
  r(c, 0, 0, W, floorY, HOME.wall);
  r(c, 0, 0, Math.round(W * 0.55), floorY, HOME.wallHi);
  dither(c, Math.round(W * 0.55), 0, 4, floorY, HOME.wallHi);
  r(c, 0, 0, W, 3, HOME.wallLo);
  dither(c, 0, 3, W, 3, HOME.wallLo);
  // the floor: planks, their seams, and the light that lands from the window
  r(c, 0, floorY, W, H - floorY, HOME.floor);
  for (let yy = floorY + 6, n = 0; yy < H; yy += 7, n++) {
    r(c, 0, yy, W, 1, HOME.floorLo);
    for (let xx = (n * 23) % 40; xx < W; xx += 40) r(c, xx, yy - 6, 1, 6, HOME.floorLo);
  }
  const sunX = L.window.x - 6, sunW = L.window.w + 30;
  dither(c, sunX + 8, floorY + 4, sunW, Math.min(18, H - floorY - 4), HOME.floorHi);
  // the skirting
  r(c, 0, floorY - 3, W, 3, HOME.sill);
  r(c, 0, floorY, W, 1, HOME.floorLo);
  // the corners soften into warm haze (underdefined edges, design §5)
  dither(c, 0, 0, 6, floorY, HOME.skyHaze, 1);
  dither(c, W - 6, 0, 6, floorY, HOME.skyHaze, 1);

  drawWindow(c, L.window);
  if (L.lamp) drawLamp(c, L.lamp, floorY);
  drawShelfUnit(c, L.bookshelf);
  drawMantel(c, L.mantel);
  drawSideboard(c, L.sideboard);
  drawDoor(c, L.door);
  drawMat(c, L.mat, matText);
  drawRug(c, L.rug);
  drawTable(c, L.table);
}

// ── sprites into the room, with the lit edge ────────────────────────────────────────────────────────────────────────
const spriteCache = new Map<string, HTMLCanvasElement>();
function spriteCanvas(s: Sprite, frame: number, lit: boolean): HTMLCanvasElement {
  const key = `${SPRITE_KEYS.get(s)}:${frame}:${lit ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = s.w + 2; cv.height = s.h + 2;
  const c = cv.getContext('2d')!;
  c.translate(1, 1);
  s.draw(c, frame);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (lit) {
    // the marigold edge: every empty pixel that touches the silhouette (4-neighbour)
    const img = c.getImageData(0, 0, cv.width, cv.height);
    const a = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < cv.width && j < cv.height && img.data[(j * cv.width + i) * 4 + 3] > 0;
    c.fillStyle = HOME.accent;
    for (let j = 0; j < cv.height; j++) for (let i = 0; i < cv.width; i++) {
      if (a(i, j)) continue;
      if (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1)) c.fillRect(i, j, 1, 1);
    }
  }
  spriteCache.set(key, cv);
  return cv;
}
const SPRITE_KEYS = new Map<Sprite, string>(Object.entries(SPRITES).map(([k, v]) => [v, k]));

export function drawSprite(c: Ctx, s: Sprite, at: { x: number; y: number }, opts: { frame?: number; lit?: boolean } = {}): void {
  c.drawImage(spriteCanvas(s, opts.frame ?? 0, !!opts.lit), at.x - 1, at.y - 1);
}

// ── Lamby, the one Lamby (apps/lambyChar.ts), drawn small and pixel-sampled ────────────────────────────────────────
/** Lamby's own canvas: drawn at the rig's scale, then sampled down by 3 with no smoothing — a 1997 sprite, not a blur */
export const LAMBY_SIZE = { w: 60, h: 48 } as const;
const LAMBY_SRC = { w: 180, h: 144, cx: 92, cy: 62 } as const;
let lambySrc: HTMLCanvasElement | null = null;
export function drawLamby(target: HTMLCanvasElement, pose: LambyPose): void {
  if (!lambySrc) { lambySrc = document.createElement('canvas'); lambySrc.width = LAMBY_SRC.w; lambySrc.height = LAMBY_SRC.h; }
  const s = lambySrc.getContext('2d')!;
  s.clearRect(0, 0, LAMBY_SRC.w, LAMBY_SRC.h);
  drawLambyChar(s, LAMBY_SRC.cx, LAMBY_SRC.cy, pose);
  const t = target.getContext('2d')!;
  t.imageSmoothingEnabled = false;
  t.clearRect(0, 0, target.width, target.height);
  t.drawImage(lambySrc, 0, 0, LAMBY_SRC.w, LAMBY_SRC.h, 0, 0, LAMBY_SIZE.w, LAMBY_SIZE.h);
}
