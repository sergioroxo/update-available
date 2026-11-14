/**
 * ⚑ S386 (UiB job 24 Part A2) — RENATA'S FILM, MADE NEW. His 14 Nov: "still don't understand what the video is about";
 * on the plan: "the video should all be redone then, don't use the one already there". S382's drawing is gone; this
 * is a new scene, drawn live on the workstation canvas (the one UI surface: whole pixels, no codec, no autoplay risk on
 * a headset or a phone, and the texture uploads only while it plays — graceQueueLite's TICK).
 *
 * WHAT IT IS. Renata recorded herself telling her story at her kitchen table, with her girlfriend beside her: a phone
 * propped on the table, the camera at the height of the cups. HANDS AND OBJECTS ONLY — no face, no body above the
 * forearms, and no voice (none is ever synthesised for a member). Her words reach the film only as subtitles, which
 * the caller burns in from her submission text, word for word.
 *   · her hands around her mug (her sleeves come in from the right, where she sits);
 *   · a second mug, blue, on the table in front of the empty side;
 *   · her girlfriend's hand, in a rose sleeve from the left, coming into frame (ENTER) and resting on hers, its thumb
 *     moving now and then — the smallest sign that two people are holding on;
 *   · on the shelf behind them, a framed photograph of the two of them, seen from behind;
 *   · the minute she laughed (LAUGH): her hands shake with it and the other hand leaves hers to tap the table.
 *
 * WHAT THE PLATFORM DOES TO IT (the caller animates each 0 → 1, one at a time, in front of the visitor):
 *   `hand`  — the girlfriend's arm slides back out of the picture: "second person · cropped out";
 *   `crop`  — the frame closes in from the left, onto her hands (FILM_CROP);
 *   `mug`   — the second mug dissolves into the table: "second cup · removed";
 *   `photo` — the photograph is pixelated, then flattened to four blocks: "shelf photo · blurred".
 * (The laughing minute is cut from the TIMELINE by the caller; the subtitle's word by the caller too.)
 *
 * Register: the film is `felt` — her life, the soft side; nothing here mocks it. The cuts are the platform's (operable)
 * and they are drawn as the platform's: its red selection, its crop. Colours: `NOA` (the room's own domestic palette,
 * era3.ts) for her kitchen, `ERA3` for the daylight and the blue mug. Integer positions only (every rect is rounded).
 */
import { NOA as P, ERA3 } from './era3';

export const FILM = { w: 320, h: 180 } as const;
/** the platform's crop, in film units (16:9): in from the left, onto her hands, the shelf photo still in it */
export const FILM_CROP = { x: 64, y: 16, w: 256, h: 144 } as const;
/** how far the table and everything on it are lifted in the frame (film units): the bare table below is where the
 *  subtitles sit, so they never cover a hand */
const TABLE_LIFT = -22;
/** when the girlfriend's hand comes into frame and settles on hers (film seconds, as sent) */
export const ENTER = { from: 1.5, to: 3.5 } as const;
/** the minute she laughed: her hands shake, the other hand taps the table (film seconds, as sent; inside the cut) */
export const LAUGH = { from: 17.5, to: 25 } as const;

export type FilmTarget = 'hand' | 'mug' | 'photo';
type Rect = { x: number; y: number; w: number; h: number };
/** what the platform selects (its red box), in film units */
export const FILM_TARGETS: Record<FilmTarget, Rect> = {
  hand: { x: 0, y: 76, w: 198, h: 62 },
  mug: { x: 87, y: 64, w: 43, h: 40 },
  photo: { x: 225, y: 24, w: 52, h: 47 }
};

/** one frame: `t` in film seconds as sent; each cut 0 (not made) → 1 (made) */
export interface FilmFrame { t: number; hand: number; mug: number; photo: number; crop: number }
/** the frame the platform sends out (the send page's previews, the board's tile once cut) */
export const PUBLISHED_FRAME: FilmFrame = { t: 8, hand: 1, mug: 1, photo: 1, crop: 1 };
export const SENT_FRAME: FilmFrame = { t: 8, hand: 0, mug: 0, photo: 0, crop: 0 };

const smooth = (k: number): number => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };

/** the view window (film units) for a crop value */
function view(crop: number): Rect {
  const k = smooth(crop);
  return { x: FILM_CROP.x * k, y: FILM_CROP.y * k, w: FILM.w + (FILM_CROP.w - FILM.w) * k, h: FILM.h + (FILM_CROP.h - FILM.h) * k };
}

/** a rect in film units → canvas pixels, for the caller's marks and tags */
export function filmToCanvas(r: Rect, x: number, y: number, w: number, h: number, crop: number): Rect {
  const v = view(crop), sx = w / v.w, sy = h / v.h;
  const x0 = Math.round(x + (r.x - v.x) * sx), y0 = Math.round(y + (r.y - v.y) * sy);
  return { x: x0, y: y0, w: Math.round(x + (r.x + r.w - v.x) * sx) - x0, h: Math.round(y + (r.y + r.h - v.y) * sy) - y0 };
}

/** a stable 0..1 per block, for the second mug's dissolve */
const hash = (i: number, j: number): number => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };

export function drawRenataFilm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: FilmFrame): void {
  const v = view(f.crop), sx = w / v.w, sy = h / v.h;
  const X = (u: number): number => Math.round(x + (u - v.x) * sx);
  const Y = (q: number): number => Math.round(y + (q - v.y) * sy);
  const box = (u: number, q: number, uw: number, qh: number, c: string): void => {
    const a = X(u), b = Y(q);
    ctx.fillStyle = c; ctx.fillRect(a, b, Math.max(1, X(u + uw) - a), Math.max(1, Y(q + qh) - b));
  };
  const poly = (pts: number[][], c: string, dx = 0, dy = 0): void => {
    ctx.fillStyle = c; ctx.beginPath();
    pts.forEach(([u, q], i) => { const a = X(u + dx), b = Y(q + dy); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
    ctx.closePath(); ctx.fill();
  };
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const t = Math.max(0, f.t);
  const tick = Math.floor(t * 4);                      // the film moves four times a second, as the screen does
  const laughing = t >= LAUGH.from && t < LAUGH.to;

  // ── the kitchen wall ──
  box(0, 0, 320, 72, P.glow);
  box(0, 0, 320, 4, P.wallLit);
  box(206, 4, 114, 68, P.wallLit);                     // the shelf's corner sits in its own shade

  // ── the window, daylight ──
  box(10, 4, 9, 62, P.blanket); box(79, 4, 9, 62, P.blanket);   // the curtains
  box(17, 6, 64, 50, P.flannelPale);
  box(20, 9, 27, 21, ERA3.glow); box(51, 9, 27, 21, ERA3.glow);
  box(20, 33, 27, 20, ERA3.glow); box(51, 33, 27, 20, ERA3.glow);
  box(22, 11, 6, 2, ERA3.glassHi); box(53, 11, 6, 2, ERA3.glassHi);
  box(14, 56, 70, 4, P.flannelPale);                   // the sill

  // ── the shelf ──
  box(210, 4, 4, 68, P.flannelDk); box(306, 4, 4, 68, P.flannelDk);
  box(210, 22, 100, 3, P.flannel); box(210, 22, 100, 1, P.flannelLit);
  box(210, 68, 100, 4, P.flannel); box(210, 68, 100, 1, P.flannelLit);
  const books = [P.blanket, P.flannelPale, ERA3.accentHi, P.flannelLit, P.skin, P.blanket, P.flannelPale];
  for (let i = 0; i < books.length; i++) { const bh = 13 + (i * 5) % 7; box(218 + i * 8, 22 - bh, 6, bh, books[i]); }
  box(278, 13, 22, 9, P.flannelDk);                    // a box, lying down
  // a plant and a jar on the lower shelf, beside the photograph
  box(284, 57, 14, 11, P.flannelDk); box(282, 56, 18, 2, P.flannel);
  box(286, 47, 4, 9, ERA3.good); box(291, 43, 4, 13, ERA3.good); box(281, 50, 5, 4, ERA3.good); box(295, 48, 5, 4, ERA3.good);
  box(275, 58, 6, 10, P.flannelPale);

  // ── the photograph of the two of them, from behind (`photo` blurs it) ──
  box(PIC.x - 3, PIC.y - 3, PIC.w + 6, PIC.h + 6, P.flannelPale);   // the frame, standing on the shelf
  const pic = PIC;
  if (f.photo >= 0.5) {
    // flattened to four blocks: something was there; nothing can be read
    box(pic.x, pic.y, 20, 17, P.glowHot); box(pic.x + 20, pic.y, 20, 17, P.flannelLit);
    box(pic.x, pic.y + 17, 20, 18, P.flannelDp); box(pic.x + 20, pic.y + 17, 20, 18, P.floor);
  } else if (f.photo > 0) {
    // the platform's blur, half way: the picture sampled in coarse squares
    const s = 6;
    for (let by = 0; by < pic.h; by += s) for (let bx = 0; bx < pic.w; bx += s) {
      box(pic.x + bx, pic.y + by, Math.min(s, pic.w - bx), Math.min(s, pic.h - by), photoAt(bx + s / 2, by + s / 2));
    }
  } else {
    box(pic.x, pic.y, pic.w, pic.h, P.glowHot);
    for (let by = 0; by < pic.h; by += 2) for (let bx = 0; bx < pic.w; bx += 2) {
      const c = photoAt(bx + 1, by + 1);
      if (c !== P.glowHot) box(pic.x + bx, pic.y + by, 2, 2, c);
    }
  }

  // ── the table and everything on it sit high in the frame: the foot of the picture is bare table, where her words go ──
  const L = TABLE_LIFT;
  const boxT = (u: number, q: number, uw: number, qh: number, c: string): void => box(u, q + L, uw, qh, c);
  // ── the table ──
  boxT(0, 94, 320, 86 - L, P.bed);
  boxT(0, 94, 320, 3, P.flannelLit);                    // its lit far edge
  boxT(0, 152, 320, 1, P.flannelDk); boxT(30, 168, 290, 1, P.flannelDk);   // grain, faint

  // ── the second mug, blue, on the empty side (`mug` dissolves it into the table) ──
  if (f.mug < 1) {
    boxT(94, 121, 36, 3, P.flannelDp);                  // its shadow
    boxT(98, 90, 28, 32, ERA3.accentHi);
    boxT(98, 103, 28, 5, ERA3.accent);
    boxT(100, 90, 24, 3, P.wall);                       // coffee
    boxT(90, 96, 8, 3, ERA3.accentHi); boxT(90, 96, 3, 16, ERA3.accentHi); boxT(90, 109, 8, 3, ERA3.accentHi);   // its handle
    if (f.mug > 0) {
      const b = 3;
      for (let j = 87; j < 126; j += b) for (let i = 88; i < 131; i += b) if (hash(i, j) < f.mug) boxT(i, j, b, b, j < 94 ? P.glow : P.bed);
    }
  }

  // ── her mug and her two hands round it (they shake while she laughs) ──
  const jx = laughing ? (tick % 2 ? 1 : -1) : 0, jy = laughing ? (tick % 2 ? -2 : 1) : 0;
  const R = (u: number, q: number, uw: number, qh: number, c: string): void => boxT(u + jx, q + jy, uw, qh, c);
  const sleeve = ERA3.grey, cuff = ERA3.greyDk;      // her sleeves, a grey-blue jumper, come in from the right
  poly([[320, 84], [320, 106], [214, 104], [212, 90]], sleeve, jx, jy + L);                  // her far arm, behind the mug
  poly([[214, 90], [222, 89], [224, 104], [215, 105]], cuff, jx, jy + L);
  R(172, 133, 46, 3, P.flannelDp);                     // the mug's shadow
  R(176, 90, 38, 44, P.flannelPale);                   // her mug
  R(176, 104, 38, 6, P.blanket);                       // a rose band round it
  R(178, 90, 34, 4, P.wall);                           // tea
  const thumb = Math.floor(t / 2) % 2;                 // a thumb moves on the rim now and then
  // the far hand comes round behind the mug: its fingertips show at the mug's left edge
  for (let fi = 0; fi < 3; fi++) { R(170, 98 + fi * 7, 9, 5, P.skinHi); R(170, 102 + fi * 7, 9, 1, P.skin); }
  R(194 + thumb, 86, 18, 5, P.skinHi);                 // its thumb over the rim
  // the near hand: forearm from the right, the back of the hand, four fingers round the mug's front
  poly([[320, 116], [320, 152], [240, 146], [236, 118]], sleeve, jx, jy + L);
  poly([[234, 117], [244, 117], [246, 146], [236, 147]], cuff, jx, jy + L);
  poly([[204, 114], [236, 112], [240, 128], [236, 146], [210, 147], [200, 132]], P.skinHi, jx, jy + L);
  R(208, 140, 28, 6, P.skin);                          // its underside, in shade
  for (let fi = 0; fi < 4; fi++) { R(190, 114 + fi * 8, 18, 6, P.skinHi); R(190, 119 + fi * 8, 18, 1, P.skin); R(190, 114 + fi * 8, 2, 6, P.skin); }
  R(214 - thumb, 106, 16, 6, P.skinHi);                // its thumb

  // ── her girlfriend's hand, from the left, resting on hers (`hand` slides it back out of the picture) ──
  const enter = smooth((t - ENTER.from) / (ENTER.to - ENTER.from));
  if (enter > 0 && f.hand < 1) {
    // while Renata laughs it leaves hers and taps the table in front of the blue mug
    const away = laughing ? smooth(Math.min(t - LAUGH.from, LAUGH.to - t) / 0.5) : 0;
    const dx = -200 * (1 - enter) - 230 * smooth(f.hand) - 46 * away, dy = 22 * away;
    poly([[0, 124], [0, 158], [146, 132], [140, 112]], P.blanket, dx, dy + L);              // the rose sleeve
    poly([[138, 111], [147, 110], [152, 132], [144, 134]], P.flannelPale, dx, dy + L);      // its cuff
    poly([[148, 110], [170, 104], [182, 108], [184, 124], [160, 132], [150, 128]], P.skin, dx, dy + L);   // the back of her hand
    boxT(152 + dx, 126 + dy, 30, 5, P.skinLo);
    for (let fi = 0; fi < 4; fi++) {
      const up = away > 0.9 && (tick + fi) % 3 === 0 ? -4 : 0;   // the tapping fingers
      boxT(180 + dx, 105 + fi * 6 + dy + up, 16 - fi * 2, 5, P.skin);
      boxT(194 - fi * 2 + dx, 105 + fi * 6 + dy + up, 2, 5, P.skinLo);
    }
    const stroke = away > 0 ? 0 : (Math.floor(t) % 3 === 1 ? 3 : 0);   // her thumb across Renata's fingers
    boxT(160 + stroke + dx, 100 + dy, 15, 5, P.skin);
  }
  ctx.restore();
}

/** the photograph inside its frame (film units) */
const PIC = { x: 231, y: 30, w: 40, h: 35 };
/** the photograph's colour at a point inside it (pic-local units): drawn from this, and the half-way blur samples it,
 *  so the blur is palette-true. Two people from behind, heads together, against a warm sky. */
function photoAt(u: number, q: number): string {
  const head = (cx: number, cy: number, r: number): boolean => (u - cx) * (u - cx) + (q - cy) * (q - cy) <= r * r;
  if (head(13, 11.5, 6)) return P.flannelDk;             // her hair, brown, from behind
  if (head(26, 12, 6)) return P.dark;                 // the other's, dark, leaning in
  if (u >= 5 && u < 20 && q >= 17) return P.wall;      // her shoulders, a dark coat
  if (u >= 19 && u < 34 && q >= 17) return ERA3.rose;  // the other's, touching
  return q < 24 ? P.glowHot : P.floor;                 // the sky, and a warm ground (a field, a beach: theirs)
}
