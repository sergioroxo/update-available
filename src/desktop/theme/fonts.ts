/**
 * ⚑ THE FACES, ONE PER ERA (2026-09-13). Sérgio, after the DPR fix: *"we might
 * need to consider fonts from the time and adjust them, so they have more
 * contrast or be more legible. Especially in Era 1 where there's a lot of white
 * backgrounds. If you look into design at that time they had solutions."*
 *
 * They did, and the solution was the same everywhere: a 1997 UI never
 * anti-aliased its text. System faces were BITMAPS — one bit, black on the
 * dialog's grey, every stroke exactly one pixel — which is why a 9 px label
 * on a 640×480 CRT read at arm's length. The piece's `setFont` has drawn every
 * era in the browser's default `monospace` (Courier on most machines: thin,
 * grey when smoothed) since Session 1. This file is where the faces live, and
 * `setFont` (chrome.ts) reads the era's from here so 470 call sites change at
 * once.
 *
 * Two rules, both period ones:
 *   · WEIGHT. Small text is BOLD in Era 1 and 2 — a bitmap face has no thin
 *     strokes, and the bold of a vector monospace is the nearest thing until
 *     the bitmap face itself is vendored (see `VENDORED`).
 *   · STACKS. Each era names its faces in order; a vendored face first (if it
 *     has been loaded), then the platform's closest, then the generic.
 *
 * ⚑ VENDORED FACES land in `public/assets/fonts/` with an @font-face in
 * index.html and a row in assets/LICENSES.md — never fetched at runtime from
 * anywhere else (CLAUDE.md: no runtime network after asset load). Until a face
 * is on disk its name simply does not resolve and the stack falls through.
 */
export type FaceEra = 'e1' | 'e2' | 'e3' | 'e4' | 'close';

/** the vendored family names — present in the stacks now, resolved only once the files are */
export const VENDORED = {
  bitmap: 'Fixedsys Excelsior',   // Era 1/2: the machine's own bitmap face, public domain
  ui2016: 'Roboto',               // Era 3: the 2016 platform sans (Apache 2.0)
  ui2026: 'Inter'                 // Era 4: the 2026 product sans (OFL)
} as const;

const MONO_HEAVY = `"${VENDORED.bitmap}", "Lucida Console", Menlo, Consolas, "Courier New", monospace`;
const MONO_2016 = `Menlo, Consolas, "DejaVu Sans Mono", "Courier New", monospace`;
const SANS_2016 = `"${VENDORED.ui2016}", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
const SANS_2026 = `"${VENDORED.ui2026}", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

export interface Face { family: string; /** weight for text at or under `boldBelow` px */ boldBelow: number }

export const FACES: Record<FaceEra, Face> = {
  e1: { family: MONO_HEAVY, boldBelow: 13 },
  e2: { family: MONO_HEAVY, boldBelow: 13 },
  e3: { family: MONO_2016, boldBelow: 0 },
  e4: { family: MONO_2016, boldBelow: 0 },
  close: { family: MONO_HEAVY, boldBelow: 13 }
};

/** the era whose face `setFont` uses; `os.setDesktopEra` sets it, the Close sets `close` */
let current: FaceEra = 'e1';
export function setFaceEra(era: FaceEra): void { current = era; }
export function faceEra(): FaceEra { return current; }

/** the CSS font string for `size` px in the current era */
export function fontFor(size: number, era: FaceEra = current): string {
  const f = FACES[era];
  const weight = size <= f.boldBelow ? 'bold ' : '';
  return `${weight}${size}px ${f.family}`;
}

/** the reading sans for prose surfaces (the Close's panels, Era 4 pages that want one) */
export function sansFor(era: FaceEra): string { return era === 'e4' ? SANS_2026 : SANS_2016; }
