/**
 * ⚑ S372 / UiB job 17 Part B — THE LEXICON'S PICTURES. One emblem per word (data/strings/lexicon.json `emblem`): HOW THE
 * WORD WAS SOLD, by its medium — a tape, a booklet, a page on a CRT, a forum's bubbles, a phone, an AI's chat, a paper, a
 * bill, a form, a chart, a key, a house, a tome, a television, a floppy, a letter. Drawn as a 1990s CD-ROM reference drew
 * its plates: a small square picture in a sunken frame, hard pixels, a few flat colours.
 *
 * Pixel discipline (CLAUDE.md): every colour from ERA1 (src/desktop/theme/era1.ts), whole-pixel rects on a 24 × 24 grid
 * scaled by `u` (4 → 96 logical px on the glass), no rotation, no smoothing. Invented marks only: no cross, no logo, no
 * real product. Drawn only when the page is drawn (the glass uploads on change, never per frame).
 */
import { ERA1 } from '../desktop/theme/era1';
import { px } from '../desktop/theme/chrome';

export type EmblemKind = 'tape' | 'booklet' | 'web' | 'board' | 'phone' | 'chat' | 'news' | 'law' | 'form' | 'chart'
  | 'key' | 'house' | 'book' | 'tv' | 'disk' | 'mail';

type Ctx = CanvasRenderingContext2D;
type R = (gx: number, gy: number, gw: number, gh: number, c: string) => void;

/** the plate's ground: a dark teal field with a lighter pool of light under the object (a period "spotlight") */
function ground(r: R): void {
  r(0, 0, 24, 24, ERA1.tealDark);
  r(4, 18, 16, 3, ERA1.teal);
  r(2, 19, 20, 1, ERA1.teal);
  r(6, 21, 12, 1, ERA1.teal);
}

const DRAW: Record<EmblemKind, (r: R) => void> = {
  tape(r) {
    r(3, 6, 18, 12, ERA1.black);
    r(4, 7, 16, 6, ERA1.paper);
    r(4, 8, 16, 1, ERA1.warn);                       // the label's stripe
    r(5, 10, 9, 1, ERA1.greyDark);
    r(8, 13, 8, 3, ERA1.greyDark);                   // the window
    r(8, 13, 3, 3, ERA1.silver); r(13, 13, 3, 3, ERA1.silver);
    r(9, 14, 1, 1, ERA1.black); r(14, 14, 1, 1, ERA1.black);
    r(6, 16, 12, 2, ERA1.grey);
    r(4, 16, 1, 1, ERA1.grey); r(19, 16, 1, 1, ERA1.grey);
  },
  booklet(r) {
    r(7, 4, 12, 17, ERA1.black);                     // its shadow
    r(6, 3, 12, 17, ERA1.paper);
    r(6, 3, 12, 6, ERA1.navy);                       // the cover's band
    r(8, 5, 8, 1, ERA1.tooltip); r(9, 7, 6, 1, ERA1.white);
    r(6, 3, 1, 17, ERA1.greyDark);                   // the fold
    r(8, 11, 8, 1, ERA1.grey); r(8, 13, 7, 1, ERA1.grey); r(8, 15, 8, 1, ERA1.grey); r(8, 17, 5, 1, ERA1.grey);
    r(9, 10, 6, 0, ERA1.grey);
    r(6, 6, 1, 1, ERA1.silver); r(6, 15, 1, 1, ERA1.silver);   // staples
  },
  web(r) {
    r(3, 3, 18, 14, ERA1.beige);
    r(4, 4, 16, 12, ERA1.greyDark);
    r(5, 5, 14, 10, ERA1.white);
    r(5, 5, 14, 2, ERA1.navy);
    r(6, 8, 4, 4, ERA1.olive);                        // a testimony's photo
    r(7, 9, 2, 1, ERA1.tooltip);
    r(11, 8, 7, 1, ERA1.titleBlue);                   // a link
    r(11, 10, 6, 1, ERA1.grey); r(11, 12, 7, 1, ERA1.grey); r(6, 13, 12, 1, ERA1.grey);
    r(9, 17, 6, 2, ERA1.silver);
    r(6, 19, 12, 2, ERA1.beige);
  },
  board(r) {
    r(3, 3, 13, 8, ERA1.white);
    r(5, 11, 3, 2, ERA1.white); r(5, 13, 1, 1, ERA1.white);
    r(5, 5, 9, 1, ERA1.navy); r(5, 7, 7, 1, ERA1.grey);
    r(8, 12, 13, 8, ERA1.tooltip);
    r(16, 20, 3, 1, ERA1.tooltip); r(18, 21, 1, 1, ERA1.tooltip);
    r(10, 14, 9, 1, ERA1.olive); r(10, 16, 7, 1, ERA1.grey);
    r(8, 12, 13, 1, ERA1.olive);
  },
  phone(r) {
    r(8, 2, 9, 20, ERA1.black);
    r(9, 4, 7, 15, ERA1.paper);
    r(9, 4, 7, 2, ERA1.ok);                           // the app's calm green bar
    r(11, 8, 3, 3, ERA1.ok); r(12, 7, 1, 1, ERA1.ok);  // its leaf
    r(10, 13, 5, 1, ERA1.grey); r(10, 15, 4, 1, ERA1.grey);
    r(10, 17, 5, 1, ERA1.silver);
    r(12, 20, 1, 1, ERA1.greyDark);
  },
  chat(r) {
    r(2, 2, 20, 20, ERA1.white);
    r(2, 2, 20, 3, ERA1.greyDark);
    r(18, 3, 1, 1, ERA1.tooltip);
    r(4, 7, 11, 4, ERA1.silver);                      // its answer
    r(5, 8, 8, 1, ERA1.greyDark); r(5, 9, 6, 1, ERA1.greyDark);
    r(9, 13, 11, 3, ERA1.titleBlue);                  // hers
    r(10, 14, 8, 1, ERA1.white);
    r(4, 18, 6, 2, ERA1.silver);                      // it is typing
    r(5, 18, 1, 1, ERA1.greyDark); r(7, 18, 1, 1, ERA1.greyDark);
    // the AI's sparkle, in gold: a plus with a bright centre
    r(18, 17, 1, 5, ERA1.olive); r(16, 19, 5, 1, ERA1.olive); r(18, 19, 1, 1, ERA1.tooltip);
  },
  news(r) {
    r(4, 4, 18, 18, ERA1.black);
    r(3, 3, 18, 18, ERA1.paper);
    r(3, 3, 18, 3, ERA1.black);                       // the masthead
    r(5, 4, 14, 1, ERA1.white);
    r(5, 8, 14, 2, ERA1.greyDark);                    // the headline
    r(5, 11, 10, 1, ERA1.greyDark);
    r(5, 13, 6, 1, ERA1.grey); r(5, 15, 6, 1, ERA1.grey); r(5, 17, 5, 1, ERA1.grey); r(5, 19, 6, 1, ERA1.grey);
    r(13, 13, 6, 5, ERA1.silver);                     // its picture
    r(14, 15, 2, 2, ERA1.grey);
    r(13, 19, 6, 1, ERA1.grey);
  },
  law(r) {
    r(6, 2, 13, 20, ERA1.black);
    r(5, 2, 13, 19, ERA1.paper);
    r(7, 4, 9, 2, ERA1.black);                        // its title
    r(7, 8, 9, 1, ERA1.grey); r(7, 10, 8, 1, ERA1.grey); r(7, 12, 9, 1, ERA1.grey); r(7, 14, 5, 1, ERA1.grey);
    r(12, 15, 6, 6, ERA1.warnDark);                   // the seal
    r(13, 16, 4, 4, ERA1.warn);
    r(14, 17, 2, 2, ERA1.warnDark);
    r(13, 21, 1, 2, ERA1.warn); r(16, 21, 1, 2, ERA1.warn);
  },
  form(r) {
    r(4, 3, 16, 19, ERA1.olive);                      // the clipboard
    r(9, 2, 6, 3, ERA1.silver); r(10, 2, 4, 1, ERA1.grey);
    r(6, 5, 12, 15, ERA1.paper);
    for (let i = 0; i < 4; i++) {
      const y = 7 + i * 3;
      r(7, y, 2, 2, ERA1.white); r(7, y, 2, 1, ERA1.greyDark); r(7, y, 1, 2, ERA1.greyDark);
      r(10, y, i === 3 ? 4 : 6, 1, ERA1.grey);
      // a tick, drawn in pixels: down-stroke then up-stroke, in the checklist's gold
      if (i < 3) { r(7, y, 1, 1, ERA1.warnDark); r(8, y + 1, 1, 1, ERA1.warnDark); r(9, y - 1, 1, 1, ERA1.warnDark); }
    }
  },
  chart(r) {
    r(4, 3, 16, 19, ERA1.greyDark);
    r(5, 4, 14, 17, ERA1.white);
    r(5, 4, 14, 2, ERA1.navy);
    for (let y = 8; y < 19; y += 2) r(6, y, 12, 1, ERA1.silver);   // the grid
    r(7, 14, 3, 5, ERA1.olive);                       // mild
    r(11, 11, 3, 8, ERA1.warn);                       // moderate
    r(15, 8, 3, 11, ERA1.warnDark);                   // severe
    r(6, 19, 12, 1, ERA1.black);
  },
  key(r) {
    r(3, 7, 9, 9, ERA1.olive);                        // the bow
    r(4, 8, 7, 7, ERA1.tooltip);
    r(6, 10, 3, 3, ERA1.tealDark);                    // its hole
    r(12, 10, 10, 3, ERA1.olive);                     // the shaft
    r(12, 10, 10, 1, ERA1.tooltip);
    r(17, 13, 2, 3, ERA1.olive); r(20, 13, 2, 2, ERA1.olive);   // the teeth
  },
  house(r) {
    r(5, 11, 14, 10, ERA1.paper);
    for (let i = 0; i < 6; i++) r(4 + i, 10 - i, 16 - i * 2, 1, ERA1.warnDark);   // the roof, in steps
    r(15, 4, 2, 4, ERA1.warnDark);                    // the chimney
    r(7, 13, 3, 3, ERA1.tooltip); r(14, 13, 3, 3, ERA1.tooltip);   // two windows, lit
    r(8, 13, 1, 3, ERA1.olive); r(15, 13, 1, 3, ERA1.olive);
    r(11, 16, 2, 5, ERA1.navy);                       // the door
  },
  book(r) {
    r(7, 3, 12, 19, ERA1.black);
    r(6, 2, 12, 19, ERA1.navy);
    r(17, 3, 2, 17, ERA1.paper);                      // the page edges
    r(6, 2, 2, 19, ERA1.olive);                       // the spine's band
    r(9, 5, 7, 1, ERA1.tooltip); r(10, 7, 5, 1, ERA1.tooltip);     // the gilt title
    r(9, 16, 7, 1, ERA1.olive);
    r(11, 10, 3, 3, ERA1.olive); r(12, 11, 1, 1, ERA1.tooltip);    // a gilt boss
  },
  tv(r) {
    r(7, 1, 1, 3, ERA1.grey); r(8, 3, 1, 1, ERA1.grey);   // the aerial, in steps
    r(16, 1, 1, 3, ERA1.grey); r(15, 3, 1, 1, ERA1.grey);
    r(3, 4, 18, 14, ERA1.greyDark);
    r(4, 5, 12, 11, ERA1.titleBlue);                  // the screen: a testimony, a talking head
    r(8, 7, 4, 4, ERA1.navy);
    r(6, 12, 8, 4, ERA1.navy);
    r(4, 15, 12, 1, ERA1.tooltip);                    // its caption bar
    r(17, 7, 3, 2, ERA1.silver); r(17, 11, 3, 2, ERA1.silver);
    r(5, 18, 2, 2, ERA1.greyDark); r(17, 18, 2, 2, ERA1.greyDark);
  },
  disk(r) {
    r(4, 3, 16, 18, ERA1.black);
    r(8, 3, 8, 6, ERA1.silver);                       // the shutter
    r(13, 4, 2, 4, ERA1.black);
    r(6, 11, 12, 8, ERA1.white);                      // the label
    r(7, 12, 10, 1, ERA1.navy);
    // a root, dug up: one line down that forks
    r(11, 14, 1, 3, ERA1.olive); r(9, 16, 2, 1, ERA1.olive); r(12, 16, 2, 1, ERA1.olive); r(8, 17, 1, 1, ERA1.olive); r(14, 17, 1, 1, ERA1.olive);
    r(4, 20, 1, 1, ERA1.greyDark);
  },
  mail(r) {
    r(4, 7, 18, 13, ERA1.black);
    r(3, 6, 18, 13, ERA1.paper);
    for (let i = 0; i < 6; i++) { r(3 + i, 6 + i, 1, 1, ERA1.grey); r(20 - i, 6 + i, 1, 1, ERA1.grey); }   // the flap
    r(9, 12, 6, 1, ERA1.grey);
    r(5, 15, 7, 1, ERA1.greyDark); r(5, 17, 5, 1, ERA1.grey);     // an address, a reference
    r(16, 14, 3, 3, ERA1.titleBlue);                  // the auto-reply's stamp
  }
};

/** the emblem, framed: a sunken plate of 24·u logical px with its 2 px bevel outside it */
export function drawEmblem(ctx: Ctx, kind: string | undefined, x: number, y: number, u = 4): void {
  const s = 24 * u;
  px(ctx, x - 2, y - 2, s + 4, 2, ERA1.greyDark);
  px(ctx, x - 2, y - 2, 2, s + 4, ERA1.greyDark);
  px(ctx, x - 2, y + s, s + 4, 2, ERA1.white);
  px(ctx, x + s, y - 2, 2, s + 4, ERA1.white);
  const r: R = (gx, gy, gw, gh, c) => { if (gw > 0 && gh > 0) px(ctx, x + gx * u, y + gy * u, gw * u, gh * u, c); };
  ground(r);
  const f = DRAW[(kind ?? 'book') as EmblemKind] ?? DRAW.book;
  f(r);
}

/** the small version for a list row (Your Words): the same picture at u = 1 (24 px), unframed */
export function drawEmblemSmall(ctx: Ctx, kind: string | undefined, x: number, y: number): void {
  const r: R = (gx, gy, gw, gh, c) => { if (gw > 0 && gh > 0) px(ctx, x + gx, y + gy, gw, gh, c); };
  ground(r);
  (DRAW[(kind ?? 'book') as EmblemKind] ?? DRAW.book)(r);
}
