/**
 * ⚑ S179 / R5-02 — THE WALLS' PRINTS: the posters of each era, drawn as pixel art.
 *
 * Sérgio, 2026-09-27: "I want the posters to reflect the culture of SOGICE (like movie posters
 * for SOGICE movies, religious elements, secular marches, etc., stuff that helps set the tone
 * of the time)", and "the 2016 [one] can maybe be more related to X-out-Loud — they even have
 * music videos". So each room's walls carry the apparatus's own culture, in its own genre:
 *
 *   1997 · Daniel's wall — the camp's rally poster (the calendar's 12–19 July, advertised),
 *          and a Christian rock band's tour poster.
 *   2003 · the same wall — an ex-gay testimony film's poster, and a restored-family conference.
 *   2016 · Vera's wall — a young ex-LGBT testimony tour with its music video (the genre he
 *          named; an invented name), a women's-retreat sign, a "march for the family" flyer.
 *   2026 · Maya's wall — hers: the Commons ball, Friday the 23rd (her calendar's ring).
 *
 * ⚑ INVENTED MARKS ONLY (CLAUDE.md): every title here is ours. The genres are documented
 * (youth rallies, testimony films, family conferences, testimony media, "family" marches); no
 * real film, band, church, ministry or march is named or imitated. Drawn with calendarArt.ts's
 * own tools; colours in src/desktop/theme/calendar.ts (PRINT). Previews: tools/calendar_preview.mjs.
 */
import { px, text, textW, disc, line, sprite, gradient, type Ctx } from './calendarArt';
import { PRINT as P } from '../desktop/theme/calendar';

export type PrintId = 'rally1997' | 'band1997' | 'film2003' | 'conf2003' | 'tour2016' | 'retreat2016' | 'march2016' | 'ball2026';

/** each print's pixel size, ~2 px per centimetre of the prop it hangs on */
export const PRINT_SIZE: Record<PrintId, [number, number]> = {
  rally1997: [80, 110], band1997: [50, 70], film2003: [80, 110], conf2003: [50, 70],
  tour2016: [100, 120], retreat2016: [80, 52], march2016: [42, 60], ball2026: [70, 100]
};

const centre = (c: Ctx, s: string, y: number, col: string, W: number, sc = 1): void => {
  text(c, s, Math.round((W - textW(s, sc)) / 2), y, col, sc);
};

function rally1997(c: Ctx, W: number, H: number): void {
  gradient(c, 0, 70, [P.rallyNight, P.rallyNight, P.rallyDawn, P.rallyGlow], W);
  disc(c, 40, 70, 16, P.rallyGlow, 70);
  for (let x = 0; x < W; x++) px(c, x, Math.round(62 - 6 * Math.sin((x + 10) / 12)), P.rallyHill, 1, 40);
  // the cross on the hill, catching the dawn
  px(c, 39, 40, P.rallyCross, 3, 18); px(c, 34, 45, P.rallyCross, 13, 3);
  // the crowd, arms raised, in silhouette
  for (let i = 0; i < 9; i++) {
    const x = 4 + i * 9, y = 78 + (i % 2);
    px(c, x + 1, y, P.rallyCrowd, 3, 3); px(c, x, y + 3, P.rallyCrowd, 5, 7);
    if (i % 3 !== 1) { px(c, x - 1, y - 3, P.rallyCrowd, 1, 5); px(c, x + 5, y - 3, P.rallyCrowd, 1, 5); }
  }
  px(c, 0, 88, P.rallyNight, W, H - 88);
  centre(c, 'STAND FIRM', 5, P.rallyTitle, W, 2);
  centre(c, "YOUTH WEEKEND '97", 18, P.rallyAccent, W);
  centre(c, 'CAMP - JULY 12-19', 92, P.rallyAccent, W);
  centre(c, 'CHANGE STARTS HERE', 100, P.rallyTitle, W);
}

function band1997(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.bandBg, W, H);
  for (let y = 0; y < H; y += 3) px(c, (y * 7) % W, y, P.bandBgHi, 6, 1);   // a grungy, xeroxed field
  centre(c, 'LAMPSTAND', 4, P.bandInk, W);
  // a guitar, and a dove over it
  line(c, 14, 52, 32, 22, P.bandPale, 2);
  disc(c, 13, 54, 6, P.bandInk); disc(c, 13, 54, 2, P.bandDark);
  sprite(c, 28, 14, ['..#....', '.###...', '#####..', '..####.', '...#..#'], { '#': P.bandDove });
  centre(c, 'LIVE', 58, P.bandPale, W);
  centre(c, "TOUR 97", 64, P.bandInk, W);
}

function film2003(c: Ctx, W: number, H: number): void {
  gradient(c, 0, 58, [P.filmSky, P.filmSky, P.filmDawn], W);
  disc(c, 58, 58, 8, P.filmSun, 58);
  for (let y = 58; y < 96; y++) px(c, 0, y, y < 70 ? P.filmField : P.filmField, W, 1);
  // the fork in the road: one way into the sunrise, lit; one into the dark
  for (let y = 58; y < 96; y++) {
    const k = (y - 58) / 38, half = 1 + Math.round(k * 9);
    px(c, 40 - half + Math.round(k * 0), y, P.filmRoad, half * 2, 1);
    px(c, Math.round(40 + k * 14) - 1, y, P.filmRoadLit, 2 + Math.round(k * 3), 1);   // the lit branch
    px(c, Math.round(40 - k * 22) - 1, y, P.filmRoad, 2 + Math.round(k * 3), 1);      // the dark one
  }
  for (let x = 44; x < W; x++) px(c, x, 58, P.filmFieldLit, 1, 2);
  // the man at the crossroads, his back to us
  sprite(c, 37, 72, ['.##.', '####', '####', '####', '.##.', '.##.', '.#.#', '.#.#'], { '#': P.filmMan });
  px(c, 0, 96, P.filmSky, W, H - 96);
  centre(c, 'NEW CREATURE', 6, P.filmTitle, W);
  centre(c, "ONE MAN'S WAY OUT", 14, P.filmSun, W);
  centre(c, 'IN CHURCHES NOW', 99, P.filmTitle, W);
  for (let i = 0; i < 3; i++) px(c, 10 + i * 22, 106, P.filmCredit, 16, 1);   // the credit block
}

function conf2003(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.confBg, W, H);
  px(c, 0, 0, P.confBlue, W, 12);
  centre(c, 'HOPE FOR', 3, P.confBg, W);
  centre(c, 'TOMORROW', 15, P.confBlue, W);
  // the restored family under an arch: a man, a woman, a child
  for (let a = 0; a <= 16; a++) { const t = Math.PI * a / 16; px(c, Math.round(25 - 17 * Math.cos(t)), Math.round(46 - 17 * Math.sin(t)), P.confGold, 2, 2); }
  sprite(c, 13, 33, ['.#....#.....', '###..###....', '###..###..#.', '###..###.###', '.#....#...#.', '.#....#...#.'],
    { '#': P.confInk });
  centre(c, 'CONFERENCE', 52, P.confRed, W);
  centre(c, 'OCT 03', 60, P.confInk, W);
}

function tour2016(c: Ctx, W: number, H: number): void {
  gradient(c, 0, H - 1, [P.tourA, P.tourB, P.tourC], W);
  // the spotlight and the singer — a music-video still
  for (let y = 20; y < 92; y++) { const half = 4 + Math.round((y - 20) * 0.35); for (let x = 50 - half; x <= 50 + half; x += 2) px(c, x + (y & 1), y, P.tourSpot); }
  sprite(c, 44, 48, [
    '...##...', '..####..', '..####..', '...##...', '.######.', '########', '##.##.##', '##.##.##',
    '..####..', '..####..', '..#..#..', '..#..#..', '..#..#..', '..#..#..', '.##..##.'
  ], { '#': P.tourSinger });
  px(c, 55, 50, P.tourSinger, 1, 14); px(c, 54, 48, P.tourSinger, 3, 2);   // the mic stand
  centre(c, 'BRAVE & NEW', 6, P.tourTitle, W, 1);
  centre(c, 'TESTIMONY TOUR 2016', 96, P.tourTitle, W);
  // the video's play badge
  disc(c, 50, 108, 6, P.tourPlayBg);
  sprite(c, 48, 105, ['#..', '##.', '###', '##.', '#..'], { '#': P.tourPlay });
  text(c, 'NEW VIDEO', 62, 106, P.tourTitle);
}

function retreat2016(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.retreatBg, W, H);
  for (const [x, y, r] of [[8, 8, 4], [70, 9, 4], [5, 47, 3], [75, 47, 3]]) {
    disc(c, x, y, r, P.retreatRose); disc(c, x, y, 1, P.retreatBg);
    px(c, x + r, y + r - 1, P.retreatLeaf, 4, 2);
  }
  centre(c, 'BELOVED', 14, P.retreatInk, W, 2);
  centre(c, 'FOR THE HEART', 30, P.retreatInk, W);
  centre(c, "WOMEN'S RETREAT", 38, P.retreatRose, W);
}

function march2016(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.marchBg, W, H);
  px(c, 0, 0, P.marchBlue, W, 16);
  centre(c, 'MARCH', 2, P.marchBg, W);
  centre(c, 'FOR THE', 9, P.marchBg, W);
  centre(c, 'FAMILY', 19, P.marchBlue, W);
  // the family under one umbrella: one man, one woman, two children
  px(c, 6, 30, P.marchSky, 30, 18);
  for (let a = 0; a <= 12; a++) { const t = Math.PI * a / 12; px(c, Math.round(21 - 13 * Math.cos(t)), Math.round(37 - 8 * Math.sin(t)), P.marchPink, 2, 1); }
  px(c, 20, 37, P.marchInk, 1, 10);
  sprite(c, 11, 40, ['#...#..#.#', '#...#..#.#', '#...#......'], { '#': P.marchInk });
  centre(c, 'SAT 22 OCT', 52, P.marchInk, W);
}

function ball2026(c: Ctx, W: number, H: number): void {
  gradient(c, 0, H - 1, [P.ballBg, P.ballGlow, P.ballBg], W);
  centre(c, 'THE COMMONS', 5, P.ballInk, W);
  centre(c, 'BALL', 13, P.ballGold, W, 2);
  // a figure mid-vogue, arms framing the face, in the trans flag's light
  for (let y = 30; y < 80; y++) { const k = (y - 30) / 50; px(c, 0, y, k < 0.33 ? P.ballBlue : k < 0.66 ? P.ballPink : P.ballWhite, 3, 1); px(c, W - 3, y, k < 0.33 ? P.ballBlue : k < 0.66 ? P.ballPink : P.ballWhite, 3, 1); }
  sprite(c, 26, 32, [
    '#........#', '.#..##..#.', '..#####...', '...####...', '....##....', '...####...', '..######..', '..######..',
    '...####...', '...####...', '..##..##..', '.##....##.', '##......##'
  ], { '#': P.ballFigure });
  disc(c, 35, 58, 5, P.ballGold); px(c, 33, 63, P.ballGold, 5, 6); px(c, 31, 69, P.ballGold, 9, 2);   // the trophy
  centre(c, 'CATEGORY IS', 78, P.ballPink, W);
  centre(c, 'ALL WELCOME', 86, P.ballInk, W);
  centre(c, 'FRI 23 OCT', 93, P.ballBlue, W);
}

const DRAW: Record<PrintId, (c: Ctx, W: number, H: number) => void> = {
  rally1997, band1997, film2003, conf2003, tour2016, retreat2016, march2016, ball2026
};

export function drawPrint(c: Ctx, id: PrintId): void {
  const [W, H] = PRINT_SIZE[id];
  DRAW[id](c, W, H);
}
