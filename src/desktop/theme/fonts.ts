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
  bitmap: 'Fixedsys Excelsior',   // Era 1/2: the machine's own bitmap face, public domain (shipped S373)
  ui2016: 'Roboto',               // Era 3: the 2016 platform sans (Apache 2.0)
  ui2026: 'Inter'                 // Era 4: the 2026 product sans (OFL)
} as const;

const MONO_HEAVY = `"${VENDORED.bitmap}", "Lucida Console", Menlo, Consolas, "Courier New", monospace`;
const MONO_2016 = `Menlo, Consolas, "DejaVu Sans Mono", "Courier New", monospace`;
const SANS_2016 = `"${VENDORED.ui2016}", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
const SANS_2026 = `"${VENDORED.ui2026}", -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

export interface Face { family: string; /** weight for text at or under `boldBelow` px */ boldBelow: number; /** the weight used under `boldBelow` (default bold) */ weight?: string }

export const FACES: Record<FaceEra, Face> = {
  e1: { family: MONO_HEAVY, boldBelow: 13 },
  e2: { family: MONO_HEAVY, boldBelow: 13 },
  // ⚑ S327 (his 8 Nov headset session, 2016: "still like the issues with the lettering… now we have different styles of
  //   fonts") — 2016 is ONE family: the platform sans its own pages (the testimony editor, the record, the send page)
  //   already used, so the board, the buttons, the sign-in and the notices stop being monospace beside them. The
  //   smallest sizes take a heavier weight so they hold up at headset distance.
  e3: { family: SANS_2016, boldBelow: 10, weight: '600' },
  // ⚑ S321 — 2026 v3's presentation rules (DESIGN_2026_V3_PRESSURE §"Presentation rules" 5): "a bolder face. Replace
  //   the thin monospace with the era's bolder UI face. Monospace only for system lines" (`monoFor` below).
  e4: { family: SANS_2026, boldBelow: 99, weight: '600' },
  close: { family: MONO_HEAVY, boldBelow: 13 }
};

/** ⚑ S373 — THE FIRST PAINT WAITS FOR THE FACES. A canvas draws once and keeps its pixels: text drawn before a face has
 *  loaded is drawn in the fallback and stays that way until something repaints it. So nothing draws until every weight the
 *  stacks use has loaded from `public/assets/fonts/` (an asset load like the models; no remote fetch). A face that cannot
 *  load must not hold the piece shut, so the wait gives up after `timeoutMs` and the fallback stack takes over. */
export function fontsReady(timeoutMs = 6000): Promise<void> {
  const fonts = (typeof document !== 'undefined' ? document.fonts : undefined);
  if (!fonts?.load) return Promise.resolve();
  const sample = 'AaBbQq 0123 — …';
  const wants = [`16px "${VENDORED.bitmap}"`, `bold 12px "${VENDORED.bitmap}"`,
    `400 12px "${VENDORED.ui2016}"`, `700 12px "${VENDORED.ui2016}"`,
    `400 12px "${VENDORED.ui2026}"`, `600 12px "${VENDORED.ui2026}"`];
  const loads = Promise.all(wants.map((w) => fonts.load(w, sample).catch(() => []))).then(() => fonts.ready).then(() => undefined);
  return Promise.race([loads, new Promise<void>((r) => setTimeout(r, timeoutMs))]);
}

/** the era whose face `setFont` uses; `os.setDesktopEra` sets it, the Close sets `close` */
let current: FaceEra = 'e1';
export function setFaceEra(era: FaceEra): void { current = era; }
export function faceEra(): FaceEra { return current; }

/** the CSS font string for `size` px in the current era */
export function fontFor(size: number, era: FaceEra = current): string {
  const f = FACES[era];
  const weight = size <= f.boldBelow ? `${f.weight ?? 'bold'} ` : '';
  return `${weight}${size}px ${f.family}`;
}

/** the reading sans for prose surfaces (the Close's panels, Era 4 pages that want one) */
export function sansFor(era: FaceEra): string { return era === 'e4' ? SANS_2026 : SANS_2016; }

/** ⚑ S321 — the system's own lines in 2026 (addresses, filings, timestamps, the clinic's reference): monospace, kept
 *  so the machine still sounds like a machine beside the bolder UI face */
export function monoFor(size: number): string { return `${size}px ${MONO_2016}`; }
/** ⚑ S321 — a newspaper's masthead and headline (the simulated articles): the platform's serif */
export function newsFor(size: number, bold = true): string { return `${bold ? '700 ' : ''}${size}px Georgia, "Times New Roman", serif`; }
