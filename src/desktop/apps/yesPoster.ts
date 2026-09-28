/**
 * ⚑ S186 — yes.gif. Sérgio, 2026-09-28, on his 1990s web finds: "the poster using the YES online, as
 * something sent to Daniel" — and "you have to accept, it's not optional (pressure)". MentorRob sends it
 * over DCC once his private message has landed (irc.ts); the only live answer is Accept; it opens here,
 * in an image viewer that owns the screen until it is closed (os.ts `drawYesViewer`).
 *
 * The image is drawn as pixel art at its native 96 × 150 and shown ×2, nearest-neighbour — a 1997 GIF.
 * Its grammar is the documented one of the period's ex-gay print advertising (his 1996 "Can homosexuals
 * change? YES!" image): a waterfall, a crowd of smiling people with their arms raised, a verse, a PO box.
 * Every mark on it is invented ("the fellowship" is the channel's own name for itself); the verse is
 * the KJV (public domain). The satire is the seller's: the crowd is the advert's crowd, not queer people.
 */
import { px, text, textW, type Painter } from '../../room/calendarArt';
import { YES_POSTER as Y } from '../theme/calendar';

export const YES_W = 96;
export const YES_H = 150;

export function drawYesPoster(c: Painter): void {
  // the sky, and the falls down the middle
  px(c, 0, 0, Y.skyHigh, YES_W, 18);
  px(c, 0, 18, Y.sky, YES_W, 90);
  for (let x = 0; x < YES_W; x++) {                      // the cliffs either side, ragged
    const edgeL = 30 + ((x * 7) % 5), edgeR = 64 - ((x * 5) % 4);
    if (x < edgeL - 4) px(c, x, 22 + ((x * 13) % 9), Y.rock, 1, 88);
    if (x > edgeR + 4) px(c, x, 20 + ((x * 11) % 9), Y.rock, 1, 90);
  }
  for (let x = 0; x < YES_W; x += 3) px(c, x, 26 + ((x * 17) % 30), Y.moss, 2, 2);
  for (let x = 30; x < 66; x++) {                        // the water: vertical streaks
    px(c, x, 18, (x % 3 === 0) ? Y.waterShade : Y.water, 1, 88);
  }
  px(c, 22, 96, Y.mist, 52, 10);                         // the spray at the foot
  // the title
  const t1 = 'CAN YOU CHANGE?';
  text(c, t1, Math.round((YES_W - textW(t1)) / 2), 4, Y.title);
  // YES! — its own bold 5×7 letters (the 3×5 face breaks up at poster size), outlined, shaded
  const BIG: Record<string, string[]> = {
    Y: ['11011', '11011', '11011', '01110', '00100', '00100', '00100'],
    E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
    S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
    '!': ['00110', '00110', '00110', '00110', '00110', '00000', '00110']
  };
  const cell = 3, pitch = 6 * cell, word = ['Y', 'E', 'S', '!'];
  const bx = Math.round((YES_W - (word.length * pitch - cell)) / 2), by = 22;
  const glyph = (dx: number, dy: number, col: string): void => word.forEach((ch, i) => BIG[ch].forEach((row, r) => {
    for (let k = 0; k < 5; k++) if (row[k] === '1') px(c, bx + i * pitch + k * cell + dx, by + r * cell + dy, col, cell, cell);
  }));
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) glyph(dx, dy, Y.yesEdge);
  glyph(1, 1, Y.yesShade);
  glyph(0, 0, Y.yes);
  // the verse, on a pale band
  px(c, 0, 48, Y.mist, YES_W, 16);
  const v1 = 'SUCH WERE SOME OF YOU';
  text(c, v1, Math.round((YES_W - textW(v1)) / 2), 51, Y.verse);
  const v2 = '1 COR 6:11';
  text(c, v2, Math.round((YES_W - textW(v2)) / 2), 58, Y.verse);
  // the crowd: rows of small people, arms up, smiling
  for (let row = 0; row < 4; row++) {
    const y = 82 + row * 11;
    for (let i = 0; i < 16; i++) {
      const x = 1 + i * 6 + (row % 2) * 3;
      if (x > YES_W - 5) continue;
      const k = row * 16 + i;
      const skin = Y.skins[(k * 7) % Y.skins.length];
      const shirt = Y.shirts[(k * 5) % Y.shirts.length];
      px(c, x + 1, y - 1, Y.hair, 3, 1);                // hair
      px(c, x + 1, y, skin, 3, 3);                      // face
      px(c, x, y + 3, shirt, 5, 5);                     // body
      if (k % 3 !== 1) { px(c, x - 1, y - 2, skin, 1, 4); px(c, x + 5, y - 2, skin, 1, 4); }   // arms up
    }
  }
  // the band: who is selling it
  px(c, 0, 128, Y.band, YES_W, 22);
  const n = 'THE FELLOWSHIP';
  text(c, n, Math.round((YES_W - textW(n)) / 2), 132, Y.bandInk);
  const b = 'PO BOX 4471';
  text(c, b, Math.round((YES_W - textW(b)) / 2), 140, Y.bandDim);
}
