/**
 * ⚑ THE DESKTOP ICONS, DRAWN (S169 / R3-09). Sérgio (round 3): "desktop icon
 * grid with drawn pixel icons" — every launcher on the 1997/2003 desktops was
 * the same beige box with a navy lid, so a desk of six files read as six of
 * the same thing. Each id gets its own picture now, 22 × 18 logical px in the
 * ERA1 sixteen, integer rects only, no rotation (the pixel discipline): a
 * floppy, a speech bubble, a sheet, a form with its ticks, the lamb's face, a
 * shovel, a text file, two heads, the house, a bound log. An id with no
 * picture falls back to the box, so a new launcher is never invisible.
 */
import { ERA1 } from './era1';
import { px } from './chrome';

type Ctx = CanvasRenderingContext2D;

/** the pictures, keyed by hit id — each draws inside (x, y) → (x+22, y+18) */
const ICONS: Record<string, (ctx: Ctx, x: number, y: number) => void> = {
  // A:\ — the companion disk
  'icon-a': (ctx, x, y) => {
    px(ctx, x + 2, y, 18, 18, ERA1.black);
    px(ctx, x + 6, y, 10, 6, ERA1.silver);      // the shutter
    px(ctx, x + 12, y + 1, 2, 4, ERA1.black);
    px(ctx, x + 5, y + 9, 12, 8, ERA1.white);   // the label
    px(ctx, x + 7, y + 11, 8, 1, ERA1.greyDark);
    px(ctx, x + 7, y + 13, 6, 1, ERA1.greyDark);
  },
  // mIRC — a speech bubble with three dots
  'icon-irc': (ctx, x, y) => {
    px(ctx, x + 1, y + 1, 20, 12, ERA1.navy);
    px(ctx, x + 2, y + 2, 18, 10, ERA1.white);
    px(ctx, x + 4, y + 13, 4, 3, ERA1.navy);    // the tail
    px(ctx, x + 4, y + 13, 3, 2, ERA1.white);
    px(ctx, x + 5, y + 6, 2, 2, ERA1.navy);
    px(ctx, x + 10, y + 6, 2, 2, ERA1.navy);
    px(ctx, x + 15, y + 6, 2, 2, ERA1.navy);
  },
  // Session — a sheet with a navy header and lines
  'icon-provotype': (ctx, x, y) => {
    px(ctx, x + 3, y, 16, 18, ERA1.greyDark);
    px(ctx, x + 4, y + 1, 14, 16, ERA1.paper);
    px(ctx, x + 4, y + 1, 14, 3, ERA1.navy);
    for (let i = 0; i < 4; i++) px(ctx, x + 6, y + 6 + i * 3, 10 - (i === 3 ? 4 : 0), 1, ERA1.grey);
  },
  // Family Form — a form with two ticked boxes
  'icon-provotype-intake': (ctx, x, y) => {
    px(ctx, x + 3, y, 16, 18, ERA1.greyDark);
    px(ctx, x + 4, y + 1, 14, 16, ERA1.paper);
    for (let i = 0; i < 3; i++) {
      px(ctx, x + 6, y + 3 + i * 5, 3, 3, ERA1.white);
      px(ctx, x + 6, y + 3 + i * 5, 3, 1, ERA1.greyDark);
      px(ctx, x + 6, y + 3 + i * 5, 1, 3, ERA1.greyDark);
      px(ctx, x + 11, y + 4 + i * 5, 5, 1, ERA1.grey);
    }
    px(ctx, x + 7, y + 4, 1, 1, ERA1.black); px(ctx, x + 8, y + 3, 1, 1, ERA1.black);   // tick
    px(ctx, x + 7, y + 9, 1, 1, ERA1.black); px(ctx, x + 8, y + 8, 1, 1, ERA1.black);   // tick
  },
  // lamby_rig.exe — the lamb's face
  'icon-lambyrig': (ctx, x, y) => {
    px(ctx, x + 3, y + 2, 16, 14, ERA1.white);
    px(ctx, x + 1, y + 5, 3, 6, ERA1.white);    // ears
    px(ctx, x + 18, y + 5, 3, 6, ERA1.white);
    px(ctx, x + 6, y + 9, 10, 6, ERA1.beige);   // the muzzle
    px(ctx, x + 7, y + 5, 2, 2, ERA1.black);    // eyes
    px(ctx, x + 13, y + 5, 2, 2, ERA1.black);
    px(ctx, x + 10, y + 11, 2, 1, ERA1.black);  // the nose
  },
  // rootcause.exe — a shovel in the ground
  'icon-rootcause': (ctx, x, y) => {
    px(ctx, x + 2, y + 13, 18, 5, ERA1.olive);  // the earth
    px(ctx, x + 10, y, 2, 10, ERA1.greyDark);   // the handle
    px(ctx, x + 8, y, 6, 2, ERA1.greyDark);
    px(ctx, x + 7, y + 9, 8, 6, ERA1.silver);   // the blade
    px(ctx, x + 8, y + 15, 6, 1, ERA1.grey);
  },
  // referral_notes.txt — a text file, corner folded
  'icon-found-file': (ctx, x, y) => {
    px(ctx, x + 3, y, 16, 18, ERA1.greyDark);
    px(ctx, x + 4, y + 1, 14, 16, ERA1.white);
    px(ctx, x + 14, y + 1, 4, 4, ERA1.silver);  // the fold
    px(ctx, x + 14, y + 1, 4, 1, ERA1.greyDark);
    px(ctx, x + 17, y + 1, 1, 4, ERA1.greyDark);
    for (let i = 0; i < 4; i++) px(ctx, x + 6, y + 7 + i * 2, 10 - (i % 2) * 3, 1, ERA1.greyDark);
  },
  // Messenger — two heads
  'icon-messenger': (ctx, x, y) => {
    px(ctx, x + 4, y + 2, 6, 6, ERA1.navy);     // a head
    px(ctx, x + 2, y + 9, 10, 8, ERA1.navy);    // its shoulders
    px(ctx, x + 12, y + 4, 6, 6, ERA1.teal);
    px(ctx, x + 10, y + 11, 10, 6, ERA1.teal);
  },
  // Restorify — the house, one window lit
  'icon-restorify': (ctx, x, y) => {
    px(ctx, x + 3, y + 8, 16, 10, ERA1.beige);  // the walls
    px(ctx, x + 1, y + 7, 20, 2, ERA1.navy);    // the eaves
    px(ctx, x + 4, y + 5, 14, 2, ERA1.navy);    // the roof, stepped
    px(ctx, x + 7, y + 3, 8, 2, ERA1.navy);
    px(ctx, x + 10, y + 1, 2, 2, ERA1.navy);
    px(ctx, x + 6, y + 10, 4, 4, ERA1.tooltip); // the lit window
    px(ctx, x + 13, y + 12, 3, 6, ERA1.greyDark); // the door
  },
  // ⚑ Phase 7 (his: "Your file, Harbor… and Route sheet… doesn't have an icon") —
  // Your file (read only) — a manila folder, a tab, and the padlock that makes it read-only
  'icon-your-file': (ctx, x, y) => {
    px(ctx, x + 1, y + 2, 8, 3, ERA1.olive);    // the tab
    px(ctx, x + 1, y + 4, 20, 13, ERA1.olive);  // the folder
    px(ctx, x + 2, y + 5, 18, 11, ERA1.tooltip);
    px(ctx, x + 2, y + 5, 18, 1, ERA1.beige);   // a sheet's edge inside
    px(ctx, x + 13, y + 9, 6, 6, ERA1.greyDark); // the padlock
    px(ctx, x + 14, y + 6, 4, 1, ERA1.greyDark);
    px(ctx, x + 14, y + 6, 1, 3, ERA1.greyDark); px(ctx, x + 17, y + 6, 1, 3, ERA1.greyDark);
    px(ctx, x + 15, y + 11, 2, 2, ERA1.tooltip); // its keyhole
  },
  // Harbor Forums — an anchor on a page, the board's own mark
  'icon-forum': (ctx, x, y) => {
    px(ctx, x + 2, y, 18, 18, ERA1.greyDark);
    px(ctx, x + 3, y + 1, 16, 16, ERA1.white);
    px(ctx, x + 3, y + 1, 16, 3, ERA1.navy);    // the board's bar
    px(ctx, x + 10, y + 6, 2, 9, ERA1.navy);    // the shank
    px(ctx, x + 9, y + 5, 4, 2, ERA1.navy);     // the ring
    px(ctx, x + 7, y + 8, 8, 1, ERA1.navy);     // the stock
    px(ctx, x + 6, y + 12, 2, 2, ERA1.navy);    // the arms
    px(ctx, x + 14, y + 12, 2, 2, ERA1.navy);
    px(ctx, x + 7, y + 14, 8, 2, ERA1.navy);
  },
  // Route sheet — a sheet with the route drawn on it: a dotted line from a pin to a cross
  'icon-send': (ctx, x, y) => {
    px(ctx, x + 2, y + 1, 18, 16, ERA1.greyDark);
    px(ctx, x + 3, y + 2, 16, 14, ERA1.paper);
    for (let i = 0; i < 5; i++) px(ctx, x + 6 + i * 2, y + 12 - i * 1, 1, 1, ERA1.grey);
    px(ctx, x + 5, y + 11, 3, 3, ERA1.warn);    // where he is
    px(ctx, x + 6, y + 14, 1, 1, ERA1.warn);
    px(ctx, x + 15, y + 4, 1, 1, ERA1.navy);    // where he is sent
    px(ctx, x + 14, y + 5, 3, 1, ERA1.navy); px(ctx, x + 15, y + 6, 1, 1, ERA1.navy);
    px(ctx, x + 14, y + 3, 1, 1, ERA1.navy); px(ctx, x + 16, y + 3, 1, 1, ERA1.navy);
    px(ctx, x + 14, y + 7, 1, 1, ERA1.navy); px(ctx, x + 16, y + 7, 1, 1, ERA1.navy);
  },
  // ⚑ S205 — Your Story: a MiniDV cassette with its label, the testimony's tape
  'icon-story': (ctx, x, y) => {
    px(ctx, x + 1, y + 3, 20, 13, ERA1.greyDark);
    px(ctx, x + 2, y + 4, 18, 11, ERA1.black);
    px(ctx, x + 4, y + 6, 14, 4, ERA1.white);     // the label
    px(ctx, x + 5, y + 7, 7, 1, ERA1.warn);       // its line in red pen
    px(ctx, x + 5, y + 11, 3, 3, ERA1.grey);      // the spools
    px(ctx, x + 14, y + 11, 3, 3, ERA1.grey);
  },
  // Care Log — a bound book
  'icon-era-1': (ctx, x, y) => {
    px(ctx, x + 3, y + 1, 16, 16, ERA1.navy);
    px(ctx, x + 3, y + 1, 3, 16, ERA1.greyDark); // the spine
    px(ctx, x + 8, y + 5, 9, 4, ERA1.white);     // the label
    px(ctx, x + 9, y + 6, 6, 1, ERA1.grey);
    px(ctx, x + 9, y + 8, 4, 1, ERA1.grey);
  }
};

/** true when the id has a drawn picture (the caller keeps the box otherwise) */
export function hasPixelIcon(id: string): boolean { return !!ICONS[id]; }

/** draw the id's picture with its top-left at (x, y) — 22 × 18 logical px */
export function drawPixelIcon(ctx: Ctx, x: number, y: number, id: string): void {
  ICONS[id]?.(ctx, x, y);
}
