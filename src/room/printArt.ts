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
import { px, text, textW, disc, line, sprite, gradient, hand, type Ctx } from './calendarArt';
import { PRINT as P } from '../desktop/theme/calendar';

export type PrintId = 'rally1997' | 'band1997' | 'film2003' | 'conf2003' | 'tour2016' | 'retreat2016' | 'march2016' | 'ball2026' | 'drawer12' | 'campTag' | 'referral1997' | 'rules2003';

/** each print's pixel size, ~2 px per centimetre of the prop it hangs on */
export const PRINT_SIZE: Record<PrintId, [number, number]> = {
  rally1997: [80, 110], band1997: [50, 70], film2003: [80, 110], conf2003: [50, 70],
  tour2016: [100, 120], retreat2016: [80, 52], march2016: [42, 60], ball2026: [70, 100],
  drawer12: [24, 12], campTag: [36, 22], referral1997: [42, 56], rules2003: [42, 56]
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
  // ⚑ S181 (his: "a bit too clean… maybe like now streaming on your ministry channel") — a
  //   still from the tour's music video: a dark stage, pastel haze, the crowd's raised hands, the
  //   player's own progress bar. The testimony as content.
  px(c, 0, 0, P.tourDark, W, H);
  text(c, 'BRAVE & NEW', 8, 4, P.tourHands, 2);
  text(c, 'BRAVE & NEW', 7, 3, P.tourA, 2);
  // the video frame
  const FY = 17, FH = 66;
  gradient(c, FY, FY + FH, [P.tourDark, P.tourB, P.tourA], W);
  // haze beams from the rig, dithered
  for (const [bx, col] of [[22, P.tourC], [50, P.tourSpot], [78, P.tourB]] as [number, string][]) {
    for (let y = FY; y < FY + FH; y++) { const half = 1 + Math.round((y - FY) * 0.28); for (let x = bx - half; x <= bx + half; x += 2) if (((x + y) & 1) === 0) px(c, x, y, col); }
  }
  // the singer, a hand raised, the mic in the other
  sprite(c, 42, FY + 18, [
    '.......##.......', '......####......', '......####......', '.......##.....#.', '....########.##.', '...##########...',
    '...##.####.##...', '...##.####.#....', '...#..####......', '......####......', '......####......', '.....##..##.....',
    '.....##..##.....', '.....##..##.....', '.....##..##.....', '....###..###....'
  ], { '#': P.tourSinger });
  px(c, 44, FY + 22, P.tourSinger, 1, 4); px(c, 43, FY + 21, P.tourSpot, 2, 1);   // the mic, catching the light
  // the crowd's hands, raised into the frame
  for (let i = 0; i < 12; i++) {
    const x = 3 + i * 8 + (i % 2), top = FY + FH - 12 + (i % 3) * 2;
    px(c, x, top + 4, P.tourHands, 5, FY + FH - top - 4);
    px(c, x + 1, top, P.tourHands, 1, 5); if (i % 2) px(c, x + 3, top + 1, P.tourHands, 1, 4);
  }
  // grain
  for (let k = 0; k < 90; k++) px(c, (k * 37) % W, FY + ((k * 53) % FH), P.tourGrain);
  // the player: play, progress, time
  const BY = FY + FH + 3;
  sprite(c, 4, BY - 1, ['#..', '##.', '###', '##.', '#..'], { '#': P.tourPlay });
  px(c, 10, BY + 1, P.tourBarBg, 70, 2); px(c, 10, BY + 1, P.tourPlayBg, 44, 2); px(c, 53, BY, P.tourPlay, 2, 4);
  text(c, '3:42', 83, BY, P.tourSpot);
  text(c, 'NOW STREAMING', Math.round((W - textW('NOW STREAMING')) / 2), BY + 10, P.tourA);
  text(c, 'ON YOUR MINISTRY CHANNEL', Math.round((W - textW('ON YOUR MINISTRY CHANNEL')) / 2), BY + 17, P.tourSpot);
  text(c, 'TESTIMONY TOUR 2016', Math.round((W - textW('TESTIMONY TOUR 2016')) / 2), BY + 26, P.tourC);
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

/** ⚑ S181 / R5-03 — drawer 12's card: the index card on the record says "index · era 1 · drawer 12" */
function drawer12(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.cardStock, W, H);
  px(c, 0, 0, P.cardInk, W, 1); px(c, 0, H - 1, P.cardInk, W, 1);
  text(c, '12', 3, 4, P.cardInk);
  px(c, 12, 6, P.cardInk, 9, 1); px(c, 12, 8, P.cardInk, 6, 1);   // a surname's worth of typed line
}

/** ⚑ S181 / R5-03 — the suitcase's tag: "camp", 12–19, in the calendar's own hand (his mother's biro) */
function campTag(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.tagStock, W, H);
  disc(c, 4, 4, 2, P.tagString); px(c, 4, 4, P.tagStock);   // the eyelet
  hand(c, 'camp', 9, 3, P.motherInk);
  text(c, '12-19', 9, 13, P.motherInk);
  line(c, 30, 14, 34, 14, P.motherInk);
}

/**
 * ⚑ S182 / R5-03 — THE REFERRAL LIST (his intake research, 2026-09-27: in 1997 the documented path
 * was a parent calling the pastor, and the pastor using a ministry referral directory — "a folded
 * referral sheet… with a pastor's handwritten phone number"). A photocopied page of ministry listings,
 * and a number written on it in his mother's biro. Invented names; the form is the documented one.
 */
function referral1997(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.cardStock, W, H);
  text(c, 'REFERRALS', 3, 3, P.cardInk);
  px(c, 3, 10, P.cardInk, W - 6, 1);
  for (let i = 0; i < 7; i++) {                       // the listings: a name line, an address line
    const y = 13 + i * 5;
    px(c, 3, y, P.cardInk, 3, 2); px(c, 8, y, P.cardInk, 14 + ((i * 7) % 12), 1); px(c, 8, y + 2, P.tagString, 10 + ((i * 5) % 9), 1);
  }
  line(c, 2, 26, 40, 26, P.motherInk);                // one listing underlined, in her pen
  hand(c, 'pas', 4, 44, P.motherInk);                  // "pastor" won't fit at this size: her own abbreviation
  text(c, '555-0147', 6, 50, P.motherInk);            // 32 px: on its own line, so it never runs off the sheet
}

/**
 * ⚑ S182 / R5-03 — THE RULES (documented for 2003–05: a programme's numbered rules on hair, clothing,
 * media, bedroom doors, contact with unapproved people; a 26-page application with a liability release).
 * The sheet a client is handed and signs. Numbered lines; the text too small to read, the form legible.
 */
function rules2003(c: Ctx, W: number, H: number): void {
  px(c, 0, 0, P.cardStock, W, H);
  px(c, 0, 0, P.confBlue, W, 7);
  text(c, 'RULES', 3, 1, P.cardStock);
  for (let i = 0; i < 7; i++) {                        // 6 px a row: the 5-px digits must not touch
    const y = 10 + i * 6;
    text(c, String(i + 1), 2, y - 1, P.cardInk);
    px(c, 8, y + 1, P.cardInk, 18 + ((i * 11) % 14), 1);
  }
  px(c, 3, H - 3, P.cardInk, 16, 1);                  // the signature line
  line(c, 4, H - 5, 14, H - 6, P.motherInk);           // signed
}

const DRAW: Record<PrintId, (c: Ctx, W: number, H: number) => void> = {
  rally1997, band1997, film2003, conf2003, tour2016, retreat2016, march2016, ball2026, drawer12, campTag, referral1997, rules2003
};

export function drawPrint(c: Ctx, id: PrintId): void {
  const [W, H] = PRINT_SIZE[id];
  DRAW[id](c, W, H);
}
