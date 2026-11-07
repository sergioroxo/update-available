/** Authored fictional footage, drawn in the established room palette. No real person or input image.
 * A three-quarter desk view makes the hands legible; the old symmetric lap crop read as faces.
 * The eight held poses are quiet actions, never a diagnosis. Canvas-native art, no extra room mesh. */
import { NOA as P } from './era3';
export const TESTIMONY_FILM = { w: 320, h: 180 } as const;
export function drawTestimonyFilm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  time = 0, checkedSleeves = false): void {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const sx = w / 320, sy = h / 180;
  const box = (xx: number, yy: number, ww: number, hh: number, color: string): void => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + xx * sx), Math.round(y + yy * sy), Math.round(ww * sx), Math.round(hh * sy));
  };
  const shape = (points: number[][], color: string): void => {
    ctx.fillStyle = color; ctx.beginPath();
    points.forEach(([xx, yy], i) => { const a = Math.round(x + xx * sx), b = Math.round(y + yy * sy); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
    ctx.closePath(); ctx.fill();
  };
  box(0, 0, 320, 180, P.wallLit);
  box(0, 0, 320, 7, P.wall);
  // The window and bookcase remain soft background shapes. The body has the clearer silhouette.
  box(12, 8, 68, 78, P.flannelDk); box(18, 12, 55, 64, P.flannelPale);
  box(43, 12, 3, 64, P.wallLit); box(18, 42, 55, 3, P.wallLit);
  box(10, 8, 12, 83, P.blanket); box(67, 8, 14, 83, P.blanket);
  box(13, 14, 2, 71, P.flannelPale); box(74, 14, 2, 71, P.flannelPale);
  box(246, 16, 62, 84, P.wall); box(252, 22, 50, 3, P.bed); box(252, 56, 50, 3, P.bed);
  for (let i = 0; i < 6; i++) box(255 + i * 7, 34 - i % 2 * 5, 5, 22 + i % 2 * 5, [P.blanket, P.flannelPale, P.flannel][i % 3]);
  box(260, 67, 32, 4, P.flannelDk); box(258, 72, 35, 4, P.bed);
  // Table, in perspective. An ordinary empty mug, not a keepsake or branded object.
  shape([[0, 103], [236, 81], [320, 119], [320, 180], [0, 180]], P.bed);
  shape([[0, 103], [236, 81], [242, 85], [0, 108]], P.flannelLit);
  shape([[0, 173], [320, 141], [320, 180], [0, 180]], P.flannelDk);
  box(91, 84, 22, 25, P.flannelPale); box(94, 82, 17, 4, P.wall);
  box(112, 88, 10, 3, P.flannelPale); box(119, 91, 3, 10, P.flannelPale); box(112, 101, 10, 3, P.flannelPale);
  // Her torso is outside the shot to the right; forearms enter from that side, rather than facing the camera.
  shape([[267, 111], [320, 119], [320, 180], [260, 167], [231, 143]], P.flannelDp);
  const phase = Math.floor(Math.max(0, time) / 4) % 8;
  const rest = phase === 0 || phase === 7;
  const shift = [0, -3, -5, -4, -2, -4, -1, 0][phase];
  const hand = (hx: number, hy: number, lower: boolean): void => {
    const dy = lower ? shift : -shift;
    // Sleeve and cuff. A checked sleeve is retained for Noa; Renata's is plain.
    shape([[hx + 39, hy + 8 + dy], [320, hy + 30], [320, hy + 55], [hx + 24, hy + 28 + dy]], P.flannelDk);
    shape([[hx + 30, hy + 9 + dy], [hx + 43, hy + 10 + dy], [hx + 33, hy + 31 + dy], [hx + 22, hy + 27 + dy]], P.flannelPale);
    if (checkedSleeves) for (let i = 0; i < 4; i++) box(hx + 48 + i * 16, hy + 20 + i * 2, 3, 18, P.flannelDp);
    // Cast shadow beneath the whole hand, then a narrow wrist and flat palm.
    shape([[hx - 44, hy + 20 + dy], [hx + 30, hy + 19 + dy], [hx + 24, hy + 34 + dy], [hx - 38, hy + 32 + dy]], P.flannelDp);
    shape([[hx + 10, hy + 10 + dy], [hx + 34, hy + 16 + dy], [hx + 25, hy + 28 + dy], [hx + 6, hy + 25 + dy]], P.skinLo);
    shape([[hx - 13, hy + 4 + dy], [hx + 18, hy + 10 + dy], [hx + 22, hy + 24 + dy], [hx - 15, hy + 28 + dy], [hx - 23, hy + 16 + dy]], P.skin);
    // Four long, separate fingers point left along the table. They do not form eyes or a face.
    for (let f = 0; f < 4; f++) {
      const length = [22, 30, 28, 20][f] - (rest ? 0 : (f === 0 ? 3 : 0));
      const fy = hy + 5 + f * 6 + dy;
      shape([[hx - 10, fy], [hx - length - 10, fy - 2], [hx - length - 13, fy + 1], [hx - length - 10, fy + 4], [hx - 9, fy + 5]], P.skin);
      box(hx - length - 9, fy, 5, 2, P.skinHi);
    }
    // The thumb turns toward the other hand, resting or briefly touching its knuckles.
    shape([[hx + 9, hy + 8 + dy], [hx - 2, hy - 3 + dy], [hx - 13, hy - 6 + dy], [hx - 18, hy - 2 + dy], [hx - 8, hy + 5 + dy], [hx, hy + 17 + dy]], P.skin);
    shape([[hx - 15, hy + 8 + dy], [hx + 8, hy + 12 + dy], [hx + 9, hy + 15 + dy], [hx - 15, hy + 12 + dy]], P.skinHi);
  };
  hand(207, 103, false); hand(174, 139, true);
  ctx.restore();
}
