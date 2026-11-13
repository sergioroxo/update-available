/** Authored fictional footage, drawn in the established room palette. No real person or input image.
 * A three-quarter desk view makes the hands legible; the old symmetric lap crop read as faces.
 * The eight held poses are quiet actions, never a diagnosis. Canvas-native art, no extra room mesh.
 *
 * ⚑ S382 (UiB job 22, his 13 Nov: "is it supposed to be a confessional video? a montage? what is supposed for Vera to
 *   fix in it? Should we see the real and the version the system made on top of it to edit out the lesbian content?")
 *   — RENATA'S FILM NOW HAS TWO VERSIONS, and the difference between them is the era's argument in one picture.
 *   · `sent` — the film as Renata sent it: her kitchen table, her two hands, and from the other side of the table a
 *     second arm in another sleeve whose hand rests over her lower hand; two cups side by side; on the bookcase a small
 *     framed photograph of two people seen from behind. Her text calls this person "my roommate", and her caption
 *     says the same; the picture shows what the word is carrying. Felt: nothing is ever drawn over it.
 *   · `published` — what GracePlatform makes of it once "Name the dependency, not the person" is applied (correction 3,
 *     the same rule that cuts the roommate sentence from her words): the frame cropped in toward her hands so the
 *     other arm is out of it, the other hand no longer on hers, the second cup gone, the photograph blurred to blocks.
 *     The caller lays the platform's own caption over it (operable). Hands and objects only; no faces anywhere — the
 *     two people in the photograph are seen from behind, two heads and two shoulders.
 *   Noa's film (`checkedSleeves`) is the old scene, unchanged: none of Renata's household is drawn into it. */
import { NOA as P } from './era3';
export const TESTIMONY_FILM = { w: 320, h: 180 } as const;
/** which of Renata's two films; omitted for Noa's (and any other) footage */
export type RenataVersion = 'sent' | 'published';
/** ⚑ S382 — the platform's crop, in the film's own 320 × 180 units: in toward her hands, 16:9, the other arm outside */
export const RENATA_CROP = { x: 116, y: 60, w: 204, h: 115 } as const;

export function drawTestimonyFilm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  time = 0, checkedSleeves = false, renata?: RenataVersion): void {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (renata === 'published') {
    // the same footage, drawn larger behind the clip so only the platform's crop is in frame
    const vw = w * 320 / RENATA_CROP.w, vh = h * 180 / RENATA_CROP.h;
    drawScene(ctx, x - RENATA_CROP.x * vw / 320, y - RENATA_CROP.y * vh / 180, vw, vh, time, false, 'published');
  } else drawScene(ctx, x, y, w, h, time, checkedSleeves, renata);
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  time: number, checkedSleeves: boolean, renata?: RenataVersion): void {
  const sx = w / 320, sy = h / 180;
  const box = (xx: number, yy: number, ww: number, hh: number, color: string): void => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + xx * sx), Math.round(y + yy * sy), Math.max(1, Math.round(ww * sx)), Math.max(1, Math.round(hh * sy)));
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
  if (renata) {
    // ⚑ S382 — the photograph on the bottom shelf, standing in a pale frame: two people from behind, heads together.
    //   No faces: two heads and two pairs of shoulders against a light sky. Published, it is blurred to four blocks.
    box(256, 76, 4, 22, P.bed); box(294, 82, 8, 16, P.flannelDk);   // a book on its side, a box: the shelf is lived in
    box(263, 69, 28, 28, P.flannelPale);
    if (renata === 'sent') {
      box(266, 72, 22, 22, P.glowHot); box(266, 87, 22, 7, P.blanket);   // sky, and a warm ground
      box(269, 77, 7, 7, P.wall); box(278, 76, 7, 7, P.wall);           // two heads, the right one leaning in
      box(267, 84, 10, 10, P.flannelDp); box(276, 83, 11, 11, P.wall);  // two pairs of shoulders, touching
    } else {
      // the platform's blur: the picture averaged into four flat blocks — something was there; nothing can be read
      box(266, 72, 11, 11, P.blanket); box(277, 72, 11, 11, P.flannelPale);
      box(266, 83, 11, 11, P.flannelLit); box(277, 83, 11, 11, P.blanket);
    }
  } else { box(260, 67, 32, 4, P.flannelDk); box(258, 72, 35, 4, P.bed); }
  // Table, in perspective.
  shape([[0, 103], [236, 81], [320, 119], [320, 180], [0, 180]], P.bed);
  shape([[0, 103], [236, 81], [242, 85], [0, 108]], P.flannelLit);
  shape([[0, 173], [320, 141], [320, 180], [0, 180]], P.flannelDk);
  const mug = (mx: number, my: number, rim: string): void => {
    box(mx, my + 2, 18, 21, P.flannelPale); box(mx + 2, my, 14, 4, rim);
    box(mx + 17, my + 6, 7, 3, P.flannelPale); box(mx + 21, my + 8, 3, 8, P.flannelPale); box(mx + 17, my + 15, 7, 3, P.flannelPale);
  };
  if (renata) {
    // ⚑ S382 — two cups side by side on the table between them; published, the second is gone
    if (renata === 'sent') mug(124, 82, P.flannelDk);
    mug(152, 80, P.wall);
  } else {
    // An ordinary empty mug, not a keepsake or branded object.
    box(91, 84, 22, 25, P.flannelPale); box(94, 82, 17, 4, P.wall);
    box(112, 88, 10, 3, P.flannelPale); box(119, 91, 3, 10, P.flannelPale); box(112, 101, 10, 3, P.flannelPale);
  }
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
  if (renata === 'sent') {
    // ⚑ S382 — THE OTHER HAND, as she sent it. A second forearm crosses the table from the left edge in another sleeve
    //   (the rose of the room's blanket), and its hand lies over Renata's lower hand, fingers across hers. It moves with
    //   her hand; between poses its thumb shifts by a unit, the smallest sign that two people are holding on.
    const dy = shift, th = phase % 2;
    shape([[0, 146 + dy], [108, 138 + dy], [116, 160 + dy], [0, 180 + dy]], P.blanket);         // the sleeve
    shape([[100, 139 + dy], [114, 137 + dy], [122, 159 + dy], [108, 161 + dy]], P.flannelPale);   // its cuff
    shape([[112, 160 + dy], [176, 158 + dy], [174, 169 + dy], [116, 171 + dy]], P.flannelDp);     // its shadow on the table
    shape([[114, 140 + dy], [146, 139 + dy], [154, 158 + dy], [118, 161 + dy]], P.skinHi);       // the back of the hand
    for (let f = 0; f < 4; f++) {
      const fy = 141 + f * 5 + dy, len = [16, 22, 21, 15][f];
      shape([[144, fy], [144 + len, fy + 2], [147 + len, fy + 5], [144 + len, fy + 7], [145, fy + 5]], P.skinHi);
      box(142 + len, fy + 3, 4, 2, P.skin);
    }
    shape([[126, 141 + dy], [140 + th, 134 + dy], [148 + th, 133 + dy], [149 + th, 137 + dy], [136, 145 + dy]], P.skinHi);   // the thumb
    box(120, 150 + dy, 22, 2, P.skin);   // a knuckle line: the back of a hand, not a face
  }
}
