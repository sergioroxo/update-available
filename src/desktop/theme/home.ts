/**
 * ⚑ S227 — LAMBYOS HOME's palette (docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md §5).
 *
 * COLOR LAW (CLAUDE.md "never invent colours"): there is not one hex in this file. Every colour is IMPORTED from a
 * palette that already exists, exactly as the design's §5 lists them:
 *   - the room: era4.ts `PLACE` — itself lifted verbatim from data/room/era1.json, Daniel's 1997 room, so the cut
 *     from Home into the 3D room is a match (design §3, "the bridge, in pictures");
 *   - the one warm accent, the thing they want you to press: era4.ts `WALL.accent` (marigold);
 *   - the 1997 machine: era1.ts `ERA1` (the CRT's teal, the beige, the navy, the silver);
 *   - Lamby's wool: calendar.ts `CAL_2003` (the lamb on the calendar).
 * Soft Lo-Fi: a cosy evening room, NOT horror-dark. The darkest line in the room is `PLACE.ink`, a warm brown.
 */
import { PLACE, WALL } from './era4';
import { ERA1 } from './era1';
import { CAL_2003 } from './calendar';

export const HOME = {
  ...PLACE,
  accent: WALL.accent,
  crtCase: ERA1.beige,
  crtScreen: ERA1.teal,
  crtScreenDark: ERA1.tealDark,
  crtNavy: ERA1.navy,
  silver: ERA1.silver,
  grey: ERA1.grey,
  greyDark: ERA1.greyDark,
  white: ERA1.white,
  paper: ERA1.paper,
  wool: CAL_2003.wool,
  woolShade: CAL_2003.woolShade,
  lambFace: CAL_2003.lambFace
} as const;
