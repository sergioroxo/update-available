/**
 * ⚑ S414 (UiB job 33 Part C; draft 3 §4 beats 9–10, his §8 answers; T97·26-18, 26-20, 26-21) — SHEPHERD LIVE™: ONE
 * SURFACE, TWO PLACES. What AI will soon be able to do: the partner's live "specialist", an exploratory session in the
 * language of wellness and church at once, that takes her own photo and alters it, and writes to her friends as her.
 *
 * The SAME surface is drawn wherever her door put it, and nothing in it knows which: the held headset's glass (Join in VR:
 * `E4Shell.draw`, 512 × 384) or the whole monitor (Join here: the one screen's AI pane at its full width, `LScreen.full`).
 * Only the photo's frame differs by door, as the draft asks — a MIRROR on the glass in front of her eyes, the two pictures
 * SIDE BY SIDE on the monitor. Everything is laid out from the rectangle it is given, and the cursors live in that
 * rectangle's own units (0…1), so the one session plays the same in either place.
 *
 *   · THE STUDIO: a pale broadcast — LIVE · Shepherd Live™ · exploratory session — the host with the halo ring (the company's
 *     mint, a lighting rig: faceless, robed, pale, like every figure in the piece; never a likeness, never Jesus as believers
 *     hold him), its words in the caption band. "Exploratory session" is the product's own word: never therapy, no
 *     clinician, clinic or diagnosis anywhere on it.
 *   · THE PHOTO: Shepherd's cursor opens her Photos and takes "me, after.jpg"; the filter works on it in steps and never
 *     finishes: "Made with AI", a ring stuck at "Becoming 99%", and its SEAMS SHOW — slices of it out of register, her own
 *     picture through the gaps. ⚑ S420 (his 22 Nov: "it keeps on using that image of male 'maya' that I've asked to be
 *     replaced") — it no longer turns her into a suited man (git bd3b0203): it works BY REMOVAL (theme/era4.ts
 *     `paintPortrait`, `portraitAt`) — her flag, her pin, her earrings, the pink of her top, the length of her hair, each
 *     selected under marching ants and lifted out to the checkerboard of deleted pixels, her room drained to grey — and at
 *     99% her face is still there, the selection waiting round it. The target in the ring is the system's DEFAULT AVATAR,
 *     default.png: a grey head and shoulders, nobody.
 *   · THE NOTES AT THE EDGE: what it sends as her, each under "Sent as Maya", and the booking card. No ✦ anywhere now.
 *   · BEAT 10: Junie's tell under the lot's note (a person's words: the host is silent while they are on the glass), the two
 *     sign-ins, two cursors that are not the system's (Junie yellow, Rae pink) and two small warm camera tiles of them at the
 *     glass's edge — people, not pop-ups: a head and shoulders in their own light, never a face — the fight for Settings,
 *     "Securing your account…", and the one control on the whole surface that is hers: Remove Second Thoughts? · Yes.
 *   · WHAT BREAKS: the picture stops where it is, tears in bands (stepped, never flashing; reduced motion gets a cut) and
 *     goes dark.
 *
 * ⚑ DIRTY ONLY (S406; 26-18's 13–16 fps was this moment): nothing here moves on a frame's clock. Cursors and the tear move
 * in `ANIM_HZ` steps; the photo changes in a handful of steps, each painted ONCE into its own small canvas and then only
 * copied; `version` bumps only when a step lands. The surface that shows it is re-uploaded on those bumps and never else.
 */
import { setFont, px } from '../theme/chrome';
import { fontFor, monoFor } from '../theme/fonts';
import { ERA4, PLACE, WEB, V3, CLIP, KETTLE, CHROME, OS26, roundRect, roundEdge, pill, assistantMark, mayaPhoto, paintPortrait, portraitAt, paintDefaultAvatar, thumb } from '../theme/era4';
import { reducedMotion } from '../../state/motion';
import { wrapRich, drawLine, AI, ANIM_HZ, type Hit, type Rect } from './lScreen';
import { fillRR, edgeRR, rr, softShadow, hazard, heavyText, alpha } from './desk26';
import { BRAND } from './brands26';
import ACTS from '../../../data/dialog/s4_acts.json';

export type Door = 'vr' | 'here';
type CurId = 'shepherd' | 'system' | 'junie' | 'rae';
interface Cur { on: boolean; x: number; y: number; fx: number; fy: number; tx: number; ty: number; t: number; dur: number; flash: number }
interface Note { to: string; text: string }

const A3 = (ACTS as unknown as { act3: {
  b9: { studio: { live: string; name: string; sub: string; host: string; inHeadset: string; cursor: string };
    photos: { app: string; file: string }; photo: { made: string; becoming: string; stopAt: number; amount: number; target: string };
    sentAs: string; booked: string };
  b10: { junie: { who: string; muted: string }; names: { junie: string; rae: string };
    settings: { title: string; row: string; sub: string; remove: string }; securing: string; ask: string; yes: string };
} }).act3;
const ST = A3.b9.studio, PH = A3.b9.photo, B10 = A3.b10;
/** ⚑ S418 — the show's own words: its episode, its sponsors, its ticker, the ring's word, the applause sign */
const SH = BRAND.shepherd;
const AGENT_NAME = (ACTS as unknown as { screen: { stName: string } }).screen.stName;

/** the studio's pale light: the same cold pale the room recedes into (app.ts `STUDIO_FOG`) */
export const STUDIO = { sky: PLACE.sky, skyHi: ERA4.photoSkyHi, haze: WEB.bg, floor: WEB.card, edge: ERA4.glow, halo: ERA4.l, robe: WEB.card,
  robeLo: ERA4.glow, head: WEB.shimmer, bar: ERA4.field, barInk: ERA4.textHi } as const;
const INK = { junie: PLACE.sunHi, rae: PLACE.textileHi, system: ERA4.l, shepherd: ERA4.l } as const;
/** how many steps the filter takes to its stopping point (each one painted once) */
const PHOTO_STEPS = 14;
/** the size the portraits are painted at (cells of the 24 × 30 grid × 5), then copied */
const PW = 120, PH_ = 150;
const BAR = 26, BAND = 34;
const BREAK_SECONDS = 0.9;
/** ⚑ S418 — the ticker along the foot (its height). ⚑ S418c — A FLIP TICKER, as TV news has it: one whole phrase at a time,
 *  held FLIP_SECONDS, a hard cut to the next (no scrolling, no fade); the applause marks round the ring change on the same
 *  cuts. Each change re-sends the whole monitor (2840 × 1536 in the headset, ≈ 17 MB) or the glass (2048 × 1536): a crawl
 *  at 4 steps a second measured 4.3–4.5 uploads a second and at 2 steps 2.2 (job 33: 0.17–0.33), where his headset run read
 *  13–16 fps; a cut every 3 s adds a third of one. Still under reduced motion (one phrase). */
const TICK = 18;
export const FLIP_SECONDS = 3;
/** the sponsor strip, under the bar, where the bar is too narrow to carry it (the headset's glass) */
const SPONSOR_H = 16;

export class ShepherdSession {
  version = 0;
  /** the session is up (drawn wherever its door is) */
  on = false;
  door: Door = 'here';
  /** seconds since it began (the title card's own clock, stepped) */
  private t = 0;
  private step = -1;
  /** the title card is still up (the jingle's first seconds, before the host) */
  intro = false;
  hostOn = false;
  /** the caption band: Shepherd's words now ('' while it is silent) */
  line = '';
  speaking = false;
  // ── the photo ──
  /** 0: no Photos; 1: Photos open (its cursor looking); 2: taken */
  photos: 0 | 1 | 2 = 0;
  /** the filter's step (0 … PHOTO_STEPS); its picture is painted once per step */
  private photoStep = 0;
  // ── the notes ──
  notes: Note[] = [];
  booked = false;
  // ── beat 10 ──
  /** Junie's words through the mute, in her thread at the edge under the lot's note: her tell, then "maya. press yes." */
  junie: string[] = [];
  signins: string[] = [];
  tiles = 0;
  settings = false;
  securing = false;
  ask = false;
  /** the friends ring the Yes while it waits */
  yesRing = false;
  /** seconds since it broke (−1: whole) */
  private breakT = -1;
  dark = false;
  // ── the cursors (in the surface's own 0…1 units) ──
  private readonly cur: Record<CurId, Cur> = { shepherd: blank(), system: blank(), junie: blank(), rae: blank() };
  /** where each part was drawn last (0…1 units): a cursor goes to an anchor by name */
  private anchors = new Map<string, Rect>();
  /** the controls the visitor may press, as last drawn (the surface's own coordinates): one — the Yes */
  hits: Hit[] = [];
  private clock = 0;
  /** ⚑ S418 — the ticker's phrase (and the applause marks' step): the next every FLIP_SECONDS while the session is whole */
  tick = 0;
  private tickT = 0;
  // ── the pictures, painted once ──
  private her: HTMLCanvasElement | null = null;
  private alt: HTMLCanvasElement | null = null;
  private altStep = -1;
  /** ⚑ S420 — default.png, the system's target, painted once (the ring holds it) */
  private target: HTMLCanvasElement | null = null;

  /** where the session is drawn: the glass of the held headset (VR) */
  get onGlass(): boolean { return this.on && this.door === 'vr'; }
  get broken(): boolean { return this.breakT >= 0; }
  /** the ring's number: 0 … 99, and never 100 */
  get becoming(): number { return Math.round((this.photoStep / PHOTO_STEPS) * PH.stopAt); }
  get photoDone(): boolean { return this.photoStep >= PHOTO_STEPS; }

  begin(door: Door): void {
    this.on = true; this.door = door; this.t = 0; this.step = -1; this.intro = true; this.hostOn = false;
    this.line = ''; this.photos = 0; this.photoStep = 0; this.notes = []; this.booked = false;
    this.junie = []; this.signins = []; this.tiles = 0; this.settings = false; this.securing = false;
    this.ask = false; this.yesRing = false; this.breakT = -1; this.dark = false; this.tick = 0; this.tickT = 0;
    for (const k of Object.keys(this.cur) as CurId[]) this.cur[k] = blank();
    this.version++;
  }
  end(): void { if (this.on) { this.on = false; this.hits = []; this.version++; } }
  touch(): void { this.version++; }
  say(text: string, speaking = true): void { if (this.line !== text || this.speaking !== speaking) { this.line = text; this.speaking = speaking; this.version++; } }
  silent(): void { this.say('', false); }
  /** the filter takes one more step (0…PHOTO_STEPS): its picture is painted once, then only copied */
  photoTo(step: number): void {
    const s = Math.max(0, Math.min(PHOTO_STEPS, Math.round(step)));
    if (s !== this.photoStep) { this.photoStep = s; this.version++; }
  }
  static readonly PHOTO_STEPS = PHOTO_STEPS;
  /** it breaks: the picture stops where it is and tears, then goes dark */
  breakNow(): void { if (this.breakT < 0) { this.breakT = 0; this.ask = false; this.yesRing = false; this.version++; } }

  // ── the cursors ──
  /** a cursor goes to the anchor `id` (as last drawn) over `seconds`; it appears where it was, or at `from` */
  cursorTo(who: CurId, id: string, seconds: number, from?: { x: number; y: number }): boolean {
    const a = this.anchors.get(id);
    if (!a) return false;
    const c = this.cur[who];
    if (!c.on) { const f = from ?? { x: 0.5, y: 0.9 }; c.x = f.x; c.y = f.y; c.on = true; }
    c.fx = c.x; c.fy = c.y; c.tx = a.x + Math.min(a.w * 0.5, 0.06); c.ty = a.y + a.h * 0.55; c.t = 0; c.dur = Math.max(0.05, seconds);
    this.version++;
    return true;
  }
  arrived(who: CurId): boolean { return this.cur[who].t >= 1; }
  hasAnchor(id: string): boolean { return this.anchors.has(id); }
  click(who: CurId): void { this.cur[who].flash = 0.3; this.version++; }
  hide(who: CurId): void { if (this.cur[who].on) { this.cur[who].on = false; this.version++; } }

  update(dt: number): void {
    if (!this.on) return;
    const before = this.clock;
    this.clock += dt;
    const tick = Math.floor(before * ANIM_HZ) !== Math.floor(this.clock * ANIM_HZ);
    this.t += dt;
    // ⚑ S418c — the ticker flips to its next phrase every FLIP_SECONDS (and the applause marks change with it); one phrase
    //   under reduced motion, and still once the picture breaks (the show stops where it is). ⚑ S418b — HELD while the filter
    //   is altering her photo (26-18, the moment his headset run measured at 13–16 fps): it waits for the ring to stop at 99
    const altering = this.photos === 2 && this.photoStep < PHOTO_STEPS;
    if (!reducedMotion() && this.breakT < 0 && !altering) {
      this.tickT += dt;
      const k = Math.floor(this.tickT / FLIP_SECONDS); if (k !== this.tick) { this.tick = k; this.version++; }
    }
    // the title card: four steps in, then held (the jingle has the floor)
    if (this.intro) { const s = Math.min(4, Math.floor(this.t * 3)); if (s !== this.step) { this.step = s; this.version++; } }
    for (const k of Object.keys(this.cur) as CurId[]) {
      const c = this.cur[k];
      if (c.on && c.t < 1) {
        c.t = Math.min(1, c.t + dt / c.dur);
        if (tick || c.t >= 1) { const e = c.t * c.t * (3 - 2 * c.t); c.x = c.fx + (c.tx - c.fx) * e; c.y = c.fy + (c.ty - c.fy) * e; this.version++; }
      }
      if (c.flash > 0) { c.flash = Math.max(0, c.flash - dt); if (c.flash === 0) this.version++; }
    }
    if (this.breakT >= 0 && !this.dark) {
      const b4 = this.breakT;
      this.breakT += dt;
      if (Math.floor(b4 * ANIM_HZ) !== Math.floor(this.breakT * ANIM_HZ)) this.version++;
      if (this.breakT >= BREAK_SECONDS || reducedMotion()) { this.dark = true; this.version++; }
    }
  }

  /** a press on the surface (its own coordinates): the Yes, or nothing. Returns the id pressed. */
  pressAt(x: number, y: number): string | null {
    const h = this.hits.find((r) => x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4);
    return h ? h.id : null;
  }

  // ── the picture ────────────────────────────────────────────────────────────
  /**
   * the whole session in `r`; `publish` takes the controls the visitor may press (the Yes).
   * ⚑ S418 (UiB job 34 Part B; T101) — DRESSED AS LIVE TELEVISION ABOUT HER: a black bar with the red LIVE bug, the gold
   * title SHEPHERD LIVE™ and "exploratory session · episode 1" (the product's own words: never therapy, a clinic or a
   * diagnosis), its sponsors on the bar ("sponsored by HEDGE™ · Second Thoughts™"); a navy studio with a row of stage lights
   * and the host in its pale key light; her photo turned into the show's graphic — "BECOMING", a big gold ring stuck at 99%,
   * the studio's APPLAUSE sign lit, marks of applause round it; what it sent as her shown as the show's captions; and a gold
   * ticker crawling along the foot ("TONIGHT ON SHEPHERD LIVE · A NEW YOU · STAY WITH ME, MAYA"). Her friends' tiles, the
   * sign-ins, Settings and the one dialog are not the show's: they keep the OS's plain look, and Junie's words their own card.
   * Job 33's studio (pale bands, the small ring under the pictures) is in git at 7763b962.
   */
  draw(ctx: CanvasRenderingContext2D, r: Rect, publish: ((h: Hit) => void) | null = null): void {
    const hits: Hit[] = [];
    const push = (h: Hit): void => { hits.push(h); publish?.(h); };
    this.anchors.clear();
    const anchor = (id: string, a: Rect): void => { this.anchors.set(id, { x: (a.x - r.x) / r.w, y: (a.y - r.y) / r.h, w: a.w / r.w, h: a.h / r.h }); };
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.textBaseline = 'top';
    if (this.dark) { px(ctx, r.x, r.y, r.w, r.h, ERA4.field); ctx.restore(); this.hits = []; return; }
    const friends = this.junie.length > 0 || this.signins.length > 0;
    const colW = this.notes.length || this.booked || friends || this.settings ? Math.max(150, Math.min(250, Math.round(r.w * (r.w < 600 ? 0.42 : 0.35)))) : 0;
    // the sponsors ride on the bar where it is wide enough (the monitor), on a strip of their own under it where it is not
    setFont(ctx, 11);
    const sponsorW = Math.ceil(ctx.measureText(SH.sponsor).width) + 16;
    setFont(ctx, 14);
    const titleW = Math.ceil(ctx.measureText(ST.name.toUpperCase()).width);
    setFont(ctx, 11);
    const subText = `${ST.sub} · ${SH.episode}`, subW = Math.ceil(ctx.measureText(subText).width);
    const sponsorOnBar = 62 + titleW + 10 + subW + 16 + sponsorW + 28 <= r.w;
    const top = r.y + BAR + (sponsorOnBar ? 0 : SPONSOR_H), tickY = r.y + r.h - TICK, bandY = tickY - BAND;
    const stage: Rect = { x: r.x, y: top, w: r.w - colW, h: bandY - top };
    // ── the studio: a navy set, a row of stage lights along its top, a floor with a gold rim ──
    const floorY = stage.y + Math.round(stage.h * 0.78);
    const g = ctx.createLinearGradient(0, stage.y, 0, floorY);
    g.addColorStop(0, OS26.shNavy); g.addColorStop(1, OS26.shStage);
    ctx.fillStyle = g; ctx.fillRect(r.x, stage.y, r.w, floorY - stage.y);
    px(ctx, r.x, floorY, r.w, bandY - floorY, OS26.shNavy2);
    px(ctx, r.x, floorY, r.w, 2, OS26.shGoldLo);
    for (let lx = r.x + 14; lx < r.x + stage.w - 6; lx += 30) {
      fillRR(ctx, lx, stage.y + 5, 8, 8, 4, OS26.shGoldLo);
      fillRR(ctx, lx + 2, stage.y + 7, 4, 4, 2, OS26.shGoldHi);
    }
    if (this.intro) this.drawTitle(ctx, stage);
    else {
      const photoUp = this.photos === 2;
      // the host: centre stage in its key light — until her photo becomes the show's graphic, which has the stage then
      if (this.hostOn && !photoUp) {
        const hs = Math.max(0.6, Math.min(1.25, stage.h / 260));
        this.drawHost(ctx, stage.x + Math.round(stage.w / 2), floorY, hs);
      }
      if (photoUp) this.drawPhoto(ctx, stage, floorY);
      if (this.photos === 1) this.drawPhotos(ctx, stage, anchor);
    }
    // the friends' tiles at the glass's left edge (what they say is in Junie's thread at the edge)
    if (this.tiles > 0) this.drawTiles(ctx, stage);
    // the sign-ins, a thin strip each under the bar (the OS's own notices: plain)
    this.signins.forEach((s, i) => {
      setFont(ctx, 11);
      const w = Math.ceil(ctx.measureText(s).width) + 32, x = stage.x + Math.round((stage.w - w) / 2), y = stage.y + 6 + i * 22;
      roundEdge(ctx, x, y, w, 19, 9, WEB.cardEdge, WEB.card);
      keyIcon(ctx, x + 8, y + 5, CHROME.ink);
      ctx.fillStyle = V3.ink; ctx.fillText(s, x + 24, y + 3);
    });
    if (this.settings) this.drawSettings(ctx, stage, anchor);
    // ── the edge: what it sent as her, as the show's captions; her friends' answer in their own card ──
    if (colW) this.drawColumn(ctx, { x: r.x + r.w - colW, y: top, w: colW, h: bandY - top });
    // ── the dialog: the one press that changes anything (the OS's own, plain: not the show's) ──
    if (this.ask) {
      // right of the friends' tiles (they are people: the system's dialog never covers them)
      const w = Math.min(280, stage.w - 74), h = 96, x = stage.x + stage.w - w - 6, y = stage.y + Math.round((stage.h - h) / 2) + 10;
      softShadow(ctx, { x, y, w, h }, 12, 1.6);
      edgeRR(ctx, x, y, w, h, 12, OS26.winEdge, OS26.win);
      assistantMark(ctx, x + 12, y + 14, 22, AI.mark, WEB.card);
      setFont(ctx, w < 250 ? 13 : 14); ctx.fillStyle = OS26.winInk; ctx.fillText(fitIn(ctx, B10.ask, w - 48), x + 40, y + 17);
      setFont(ctx, 13);
      const bw = Math.max(84, Math.ceil(ctx.measureText(B10.yes).width) + 40), bx = x + w - bw - 14, by = y + h - 40;
      if (this.yesRing) { ctx.strokeStyle = INK.junie; ctx.lineWidth = 2; rr(ctx, bx - 4, by - 4, bw + 8, 34, 17); ctx.stroke(); }
      fillRR(ctx, bx, by, bw, 26, 13, OS26.menuButton);
      ctx.fillStyle = OS26.menuButtonInk; ctx.fillText(B10.yes, bx + Math.round((bw - ctx.measureText(B10.yes).width) / 2), by + 6);
      anchor('yes', { x: bx, y: by, w: bw, h: 26 });
      push({ x: bx - 6, y: by - 6, w: bw + 12, h: 38, id: 'a3-yes' });
    }
    // ── the bar: the LIVE bug, SHEPHERD LIVE™, "exploratory session · episode 1", its sponsors; the gear at its right ──
    if (this.securing) {
      // the system drags Settings back: its own yellow over the show's bar (Second Thoughts, fighting her friends)
      px(ctx, r.x, r.y, r.w, BAR, PLACE.sunHi);
      hazard(ctx, r.x, r.y + BAR - 3, r.w, 3, OS26.stInk, 1, 6);
      assistantMark(ctx, r.x + 8, r.y + 5, 16, OS26.stInk, PLACE.sunHi);
      setFont(ctx, 12); heavyText(ctx, fitIn(ctx, B10.securing, r.w - 60), r.x + 30, r.y + 6, OS26.stInk, 0.4);
    } else {
      px(ctx, r.x, r.y, r.w, BAR, OS26.shPlate);
      px(ctx, r.x, r.y + BAR - 2, r.w, 2, OS26.shGold);
      fillRR(ctx, r.x + 8, r.y + 5, 46, 16, 4, OS26.shLive);
      fillRR(ctx, r.x + 13, r.y + 10, 6, 6, 3, OS26.shText);
      setFont(ctx, 11); heavyText(ctx, ST.live, r.x + 22, r.y + 6, OS26.shText, 0.4);
      setFont(ctx, 14); heavyText(ctx, ST.name.toUpperCase(), r.x + 62, r.y + 5, OS26.shGold, 0.6);
      setFont(ctx, 11); ctx.fillStyle = OS26.shText;
      const sx = r.x + 62 + titleW + 10;
      ctx.fillText(fitIn(ctx, subText, Math.max(40, r.w - (sx - r.x) - 34 - (sponsorOnBar ? sponsorW + 16 : 0))), sx, r.y + 7);
      if (sponsorOnBar) { setFont(ctx, 11); ctx.fillStyle = OS26.shGold; ctx.fillText(SH.sponsor, r.x + r.w - 30 - sponsorW + 8, r.y + 7); }
      else {
        px(ctx, r.x, r.y + BAR, r.w, SPONSOR_H, OS26.shNavy2);
        setFont(ctx, 11); ctx.fillStyle = OS26.shGold;
        ctx.fillText(fitIn(ctx, SH.sponsor, r.w - 16), r.x + r.w - 8 - Math.min(r.w - 16, sponsorW - 16), r.y + BAR + 1);
      }
    }
    gearIcon(ctx, r.x + r.w - 22, r.y + 7, this.securing ? OS26.stInk : OS26.shGold, this.securing ? PLACE.sunHi : OS26.shPlate);
    anchor('gear', { x: r.x + r.w - 24, y: r.y + 5, w: 16, h: 16 });
    // ── the caption band: Shepherd's words, as the show's closed captions ──
    px(ctx, r.x, bandY, r.w, BAND, OS26.shPlate);
    if (this.line) {
      setFont(ctx, 11);
      const tw = Math.ceil(ctx.measureText(ST.host).width) + 14;
      fillRR(ctx, r.x + 8, bandY - 16, tw, 16, 3, this.speaking ? OS26.shGold : OS26.shGoldLo);
      ctx.fillStyle = OS26.shNavy; ctx.fillText(ST.host, r.x + 15, bandY - 14);
      ctx.font = fontFor(r.w < 560 ? 14 : 16, 'e4'); ctx.fillStyle = OS26.shText;
      const t = fitIn(ctx, this.line, r.w - 20), lw = Math.ceil(ctx.measureText(t).width);
      ctx.fillText(t, r.x + Math.max(10, Math.round((r.w - lw) / 2)), bandY + 9);
    }
    // ── the ticker along the foot, crawling in steps ──
    this.drawTicker(ctx, { x: r.x, y: tickY, w: r.w, h: TICK });
    // ── the cursors: Shepherd's (taking her photo), the system's, and her friends' ──
    for (const k of ['shepherd', 'system', 'junie', 'rae'] as CurId[]) {
      const c = this.cur[k];
      if (!c.on) continue;
      const label = k === 'shepherd' ? ST.cursor : k === 'system' ? AGENT_NAME : k === 'junie' ? B10.names.junie : B10.names.rae;
      drawCursor(ctx, Math.round(r.x + c.x * r.w), Math.round(r.y + c.y * r.h), INK[k], c.flash > 0, label, r.x + r.w);
    }
    // ── what breaks: it stops where it is and tears, in bands (stepped), then dark ──
    if (this.breakT >= 0) {
      const k = Math.min(1, Math.floor(this.breakT * ANIM_HZ) / Math.max(1, Math.floor(BREAK_SECONDS * ANIM_HZ)));
      const bands = 7, bh = Math.ceil(r.h / bands);
      for (let i = 0; i < bands; i++) {
        if (((i * 5) % 7) / 7 > k) continue;
        const y = r.y + i * bh, cut = Math.round(bh * (0.3 + 0.7 * k));
        px(ctx, r.x, y, r.w, cut, ERA4.field);
        px(ctx, r.x, y + cut, r.w, 1, ERA4.rule);
      }
    }
    ctx.restore();
    this.hits = hits;
  }

  /** ⚑ S418c — the flip ticker: the show's own line, one phrase at a time (a gold strip, a navy tab, navy capitals); the
   *  phrase changes with a hard cut at each tick, never scrolls */
  private drawTicker(ctx: CanvasRenderingContext2D, t: Rect): void {
    px(ctx, t.x, t.y, t.w, t.h, OS26.shGold);
    px(ctx, t.x, t.y, t.w, 1, OS26.shGoldHi);
    const phrases = SH.ticker.split(' · ');
    const phrase = phrases[((this.tick % phrases.length) + phrases.length) % phrases.length] ?? SH.ticker;
    fillRR(ctx, t.x + 8, t.y + 4, 10, t.h - 8, 2, OS26.shNavy);
    setFont(ctx, 11);
    ctx.save(); ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
    heavyText(ctx, fitIn(ctx, phrase, t.w - 40), t.x + 26, t.y + 3, OS26.shNavy, 0.35);
    ctx.restore();
  }

  /** the monitor while the session is on the headset's glass: one still card, drawn on change only (⚑ S418: the show's own
   *  card — its bar's LIVE bug, its gold title, its words) */
  drawAway(ctx: CanvasRenderingContext2D, r: Rect): void {
    // (the anchors are the glass's: this card touches none of them)
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, OS26.shNavy); g.addColorStop(1, OS26.shStage);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    for (let lx = r.x + 14; lx < r.x + r.w - 6; lx += 30) { fillRR(ctx, lx, r.y + 8, 8, 8, 4, OS26.shGoldLo); fillRR(ctx, lx + 2, r.y + 10, 4, 4, 2, OS26.shGoldHi); }
    const cx = r.x + Math.round(r.w / 2), cy = r.y + Math.round(r.h * 0.32);
    haloRing(ctx, cx, cy, 34, OS26.shGold, 4);
    fillRR(ctx, cx - 23, cy + 24, 46, 16, 4, OS26.shLive);
    fillRR(ctx, cx - 18, cy + 29, 6, 6, 3, OS26.shText);
    setFont(ctx, 11); heavyText(ctx, ST.live, cx - 9, cy + 25, OS26.shText, 0.4);
    setFont(ctx, 24);
    const name = ST.name.toUpperCase(), nw = Math.ceil(ctx.measureText(name).width);
    heavyText(ctx, name, cx - Math.round(nw / 2), cy + 50, OS26.shGold, 0.8);
    setFont(ctx, 12); ctx.fillStyle = OS26.shText;
    const sub = `${ST.sub} · ${SH.episode}`, sw = Math.ceil(ctx.measureText(sub).width); ctx.fillText(sub, cx - Math.round(sw / 2), cy + 84);
    setFont(ctx, 14); ctx.fillStyle = OS26.shText;
    const iw = Math.ceil(ctx.measureText(ST.inHeadset).width); ctx.fillText(ST.inHeadset, cx - Math.round(iw / 2), cy + 112);
    setFont(ctx, 11); ctx.fillStyle = OS26.shGold;
    const pw = Math.ceil(ctx.measureText(SH.sponsor).width); ctx.fillText(SH.sponsor, cx - Math.round(pw / 2), r.y + r.h - 24);
  }

  // ── its parts ──────────────────────────────────────────────────────────────
  /** the title card (the jingle's first seconds): the gold halo grows in steps, then SHEPHERD LIVE™, then its episode */
  private drawTitle(ctx: CanvasRenderingContext2D, s: Rect): void {
    const k = Math.max(0, this.step) / 4;
    const cx = s.x + Math.round(s.w / 2), cy = s.y + Math.round(s.h * 0.38);
    haloRing(ctx, cx, cy, Math.round(20 + 18 * k), OS26.shGold, 3 + Math.round(2 * k));
    if (k >= 0.5) {
      setFont(ctx, s.w < 400 ? 24 : 30);
      const name = ST.name.toUpperCase(), nw = Math.ceil(ctx.measureText(name).width);
      heavyText(ctx, name, cx - Math.round(nw / 2), cy + 40, OS26.shGold, 0.9);
    }
    if (k >= 0.75) {
      setFont(ctx, 13); ctx.fillStyle = OS26.shText;
      const sub = `${ST.sub} · ${SH.episode}`, sw = Math.ceil(ctx.measureText(sub).width); ctx.fillText(sub, cx - Math.round(sw / 2), cy + 80);
    }
  }

  /** the host: faceless, robed, pale, a halo ring behind its head (the company's mint, a lighting rig), standing in its key
   *  light with its arms a little open. It never moves toward her. Speaking, the ring is lit. */
  private drawHost(ctx: CanvasRenderingContext2D, cx: number, floorY: number, s: number): void {
    const u = (n: number): number => Math.round(n * s);
    const headY = floorY - u(158);
    // the studio's key light behind it, and its pool on the floor
    // ⚑ S418 — on the show's navy set, the key light is a spotlight: a soft pale cone falling from the rig, a pool on the floor
    ctx.save();
    const spot = ctx.createRadialGradient(cx, headY + u(40), u(10), cx, headY + u(60), u(110));
    spot.addColorStop(0, alpha(OS26.shText, 0.42)); spot.addColorStop(0.6, alpha(OS26.shText, 0.14)); spot.addColorStop(1, alpha(OS26.shText, 0));
    ctx.fillStyle = spot; ctx.beginPath(); ctx.ellipse(cx, headY + u(60), u(110), u(120), 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = STUDIO.edge;
    ctx.beginPath(); ctx.ellipse(cx, floorY, u(64), u(8), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    haloRing(ctx, cx, headY + u(4), u(27), this.speaking ? STUDIO.halo : ERA4.glow, Math.max(2, u(4)));
    // the robe: soft shoulders falling to the floor, the sleeves a little open
    ctx.fillStyle = STUDIO.robe;
    ctx.beginPath();
    ctx.moveTo(cx - u(12), headY + u(25));
    ctx.quadraticCurveTo(cx - u(32), headY + u(28), cx - u(36), headY + u(52));
    ctx.lineTo(cx - u(50), floorY);
    ctx.lineTo(cx + u(50), floorY);
    ctx.lineTo(cx + u(36), headY + u(52));
    ctx.quadraticCurveTo(cx + u(32), headY + u(28), cx + u(12), headY + u(25));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = STUDIO.robeLo;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * u(30), headY + u(40));
      ctx.lineTo(cx + side * u(58), headY + u(92));
      ctx.lineTo(cx + side * u(50), headY + u(100));
      ctx.lineTo(cx + side * u(24), headY + u(62));
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = STUDIO.robeLo; ctx.lineWidth = Math.max(1, u(2));
    ctx.beginPath(); ctx.moveTo(cx - u(8), headY + u(66)); ctx.lineTo(cx - u(16), floorY - u(2)); ctx.moveTo(cx + u(10), headY + u(70)); ctx.lineTo(cx + u(18), floorY - u(2)); ctx.stroke();
    // the head: a pale oval, no face
    ctx.fillStyle = STUDIO.head;
    ctx.beginPath(); ctx.ellipse(cx, headY + u(11), u(11), u(13), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = STUDIO.robeLo; ctx.fillRect(cx - u(6), headY + u(23), u(12), u(3));
  }

  /** her Photos, opened by Shepherd's cursor: a grid, and "me, after.jpg" among them */
  private drawPhotos(ctx: CanvasRenderingContext2D, s: Rect, anchor: (id: string, a: Rect) => void): void {
    const w = Math.min(300, s.w - 40), h = Math.min(190, s.h - 30), x = s.x + Math.round((s.w - w) / 2), y = s.y + Math.round((s.h - h) / 2);
    roundEdge(ctx, x - 1, y - 1, w + 2, h + 2, 10, V3.edge, V3.card);
    px(ctx, x, y, w, 22, V3.bar);
    setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(A3.b9.photos.app, x + 10, y + 5);
    const cols = 4, gap = 8, tw = Math.floor((w - 20 - gap * (cols - 1)) / cols), th = Math.round(tw * 0.8);
    for (let i = 0; i < 8; i++) {
      const tx = x + 10 + (i % cols) * (tw + gap), ty = y + 30 + Math.floor(i / cols) * (th + 22);
      if (i === 5) {
        // hers: the photograph itself, small, with its name
        this.ensureHer();
        if (this.her) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(this.her, tx, ty, tw, th); ctx.imageSmoothingEnabled = was; }
        setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(fitIn(ctx, A3.b9.photos.file, tw + 14), tx, ty + th + 3);
        anchor('photo-file', { x: tx, y: ty, w: tw, h: th });
      } else {
        thumb(ctx, tx, ty, tw, th, i % 3, false, 4);   // her other pictures (variant 3 is a portrait like hers: not used here)
      }
    }
  }

  /** the photo: a MIRROR on the headset's glass, SIDE BY SIDE on the monitor. ⚑ S418 — turned into the show's graphic: the
   *  pictures to the left (at the size their seams still show: job 33's beat, 26-18), BECOMING's big gold ring to the right */
  private drawPhoto(ctx: CanvasRenderingContext2D, s: Rect, _floorY: number): void {
    this.ensureHer();
    this.ensureAlt();
    const mirror = this.door === 'vr';
    const R = Math.round(Math.max(40, Math.min(64, s.h * 0.27, s.w * (mirror ? 0.19 : 0.15))));
    const ring = 2 * R + 30, pad = 12;
    let fh = Math.min(s.h - 50, 178), fw = Math.round(fh * 0.8);
    const avail = s.w - ring - 2 * pad - 10;
    const need = (w: number): number => (mirror ? w + 10 : 2 * w + 18);
    if (need(fw) > avail) { fw = Math.floor(mirror ? avail - 10 : (avail - 18) / 2); fh = Math.round(fw / 0.8); }
    const y = s.y + Math.max(20, Math.round((s.h - fh - 22) / 2));
    let x = s.x + pad + (mirror ? 6 : 0);
    if (mirror) {
      // the mirror's frame, and the altered picture in it; her own photo, taken from her Photos, tucked into its corner
      roundEdge(ctx, x - 7, y - 7, fw + 14, fh + 14, 10, OS26.shGold, OS26.shNavy2);
      this.blitAlt(ctx, x, y, fw, fh);
      stamp(ctx, x + 4, y + 4, PH.made, true);   // ⚑ S420: top left, clear of the flag it cuts out first
      const tw = Math.round(fw * 0.34), th = Math.round(tw * 1.25);
      px(ctx, x - 10, y + fh - th + 4, tw + 6, th + 6, WEB.card);
      if (this.her) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(this.her, x - 7, y + fh - th + 7, tw, th); ctx.imageSmoothingEnabled = was; }
      x += fw + 10;
    } else {
      // hers, as taken from her Photos (its name under it), and the system's beside it
      px(ctx, x - 3, y - 3, fw + 6, fh + 6, WEB.card);
      if (this.her) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(this.her, x, y, fw, fh); ctx.imageSmoothingEnabled = was; }
      setFont(ctx, 11); ctx.fillStyle = OS26.shText; ctx.fillText(fitIn(ctx, A3.b9.photos.file, fw + 10), x, y + fh + 7);
      const x1 = x + fw + 18;
      px(ctx, x1 - 3, y - 3, fw + 6, fh + 6, OS26.shGold);
      this.blitAlt(ctx, x1, y, fw, fh);
      stamp(ctx, x1 + 4, y + 4, PH.made, true);   // ⚑ S420: top left, clear of the flag it cuts out first
      // the arrow between them: what was done to it
      const ay = y + Math.round(fh / 2);
      for (let i = 0; i < 3; i++) px(ctx, x + fw + 4 + i * 4, ay - 1, 3, 3, OS26.shGold);
      x = x1 + fw;
    }
    const cx = Math.round(x + (s.x + s.w - x) / 2), cy = y + Math.round(fh / 2) - 12;
    this.drawBecoming(ctx, cx, cy, R);
  }
  /**
   * ⚑ S418 — "BECOMING", the show's big gold ring, stuck at 99% (never 100): a dark gold track, its gold arc; under it the
   * word, and the studio's APPLAUSE sign lit once it stops; marks of applause round the ring that change on the ticker's
   * steps (still under reduced motion).
   * ⚑ S420 — THE TARGET IS IN THE RING: default.png, the system's default avatar (a grey head and shoulders, nobody), as a
   * profile picture sits in its ring; the number moves onto a gold badge across the ring's foot, and the file's name,
   * "default.png", is written under the word — "BECOMING · default.png".
   */
  private drawBecoming(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
    const n = this.becoming, lw = Math.max(7, Math.round(R * 0.17));
    // its glow
    const g = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.55);
    g.addColorStop(0, alpha(OS26.shGold, 0.22)); g.addColorStop(1, alpha(OS26.shGold, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2); ctx.fill();
    // default.png inside the ring (painted once, copied)
    this.ensureTarget();
    if (this.target) {
      const ri = R - Math.ceil(lw / 2) - 2;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.clip();
      const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.target, cx - ri, cy - ri, 2 * ri, 2 * ri);
      ctx.imageSmoothingEnabled = was;
      ctx.restore();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = OS26.shGoldLo; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    if (n > 0) { ctx.strokeStyle = OS26.shGold; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n) / 100); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // the number, on a gold badge across the ring's foot
    const ns = Math.max(14, Math.round(R * 0.3));
    setFont(ctx, ns);
    const num = `${n}%`, nw = Math.ceil(ctx.measureText(num).width), bw = nw + 18, bh = ns + 8, by = cy + R - Math.round(bh / 2);
    fillRR(ctx, cx - Math.round(bw / 2), by, bw, bh, Math.round(bh / 2), OS26.shGold);
    heavyText(ctx, num, cx - Math.round(nw / 2), by + 4, OS26.shNavy, 0.8);
    setFont(ctx, 13);
    const word = SH.ring.split('').join('\u2009'), ww = Math.ceil(ctx.measureText(word).width), wy = by + bh + 5;
    heavyText(ctx, word, cx - Math.round(ww / 2), wy, OS26.shGold, 0.5);
    ctx.font = monoFor(11); ctx.fillStyle = OS26.shText;
    const tw = Math.ceil(ctx.measureText(PH.target).width); ctx.fillText(PH.target, cx - Math.round(tw / 2), wy + 17);
    if (n >= PH.stopAt) {
      // the studio's applause sign, lit; marks of applause round the ring, changing on the ticker's steps
      setFont(ctx, 11);
      const aw = Math.ceil(ctx.measureText(SH.applause).width) + 16, ay = wy + 33;
      fillRR(ctx, cx - Math.round(aw / 2), ay, aw, 18, 4, OS26.shLive);
      heavyText(ctx, SH.applause, cx - Math.round(aw / 2) + 8, ay + 3, OS26.shText, 0.4);
      const alt = reducedMotion() ? 0 : this.tick % 2;
      ctx.strokeStyle = OS26.shGoldHi; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        if (i % 2 !== alt) continue;
        const a = (i / 12) * Math.PI * 2 + 0.2, r0 = R + lw / 2 + 6, r1 = r0 + 8;
        if (Math.sin(a) > 0.45) continue;   // clear of the word and the sign under the ring
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  }

  /** the altered picture, copied in slices out of register: its seams show, and her own picture shows through them */
  private blitAlt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.alt || !this.her) return;
    const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const k = this.photoStep / PHOTO_STEPS;
    const slices = 6, sh = PH_ / slices, dh = h / slices;
    const off = [0, 3, -4, 5, -2, 2];
    // her photograph under it all: wherever the system's picture does not meet itself, she is there
    ctx.drawImage(this.her, x, y, w, h);
    for (let i = 0; i < slices; i++) {
      const o = Math.round(off[i] * k * Math.max(1, w / 90));
      const sy = Math.round(i * sh), dy = Math.round(y + i * dh), dhh = Math.round(y + (i + 1) * dh) - dy;
      const inset = i === 2 || i === 4 ? Math.round(w * 0.06 * k) : 0;
      ctx.drawImage(this.alt, 0, sy, PW - Math.round((inset * PW) / w), Math.round(sh), x + o, dy, w - inset, dhh);
      if (i > 0 && k > 0.2) px(ctx, x, dy, w, 1, ERA4.glow);
    }
    ctx.imageSmoothingEnabled = was;
  }
  private ensureHer(): void {
    if (this.her || typeof document === 'undefined') return;
    const c = document.createElement('canvas'); c.width = PW; c.height = PH_;
    const g = c.getContext('2d'); if (!g) return;
    mayaPhoto(g, 0, 0, PW, PH_);
    this.her = c;
  }
  private ensureAlt(): void {
    if (typeof document === 'undefined') return;
    if (!this.alt) { this.alt = document.createElement('canvas'); this.alt.width = PW; this.alt.height = PH_; }
    if (this.altStep === this.photoStep) return;
    const g = this.alt.getContext('2d'); if (!g) return;
    // ⚑ S420 — the filter's own order, by removal: it stops at 99, her face still there. Its marching ants move one notch a
    //   step (painted once a step, like the rest of the picture: no upload of their own); still under reduced motion
    const amount = (this.photoStep / PHOTO_STEPS) * PH.amount;
    paintPortrait(g, 0, 0, PW, PH_, { ...portraitAt(amount), ants: reducedMotion() ? 0 : this.photoStep });
    this.altStep = this.photoStep;
  }
  private ensureTarget(): void {
    if (this.target || typeof document === 'undefined') return;
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const g = c.getContext('2d'); if (!g) return;
    paintDefaultAvatar(g, 0, 0, 96, 96);
    this.target = c;
  }

  /** the edge: each note under "Sent as Maya", Junie's answer under the lot's (through the mute), the booking.
   *  ⚑ S418 — what it sent as her are the show's on-screen captions now (dark plates, a gold bar, SENT AS MAYA); Junie's words
   *  keep their own plain card (felt stays bare); the booking is the show's green plate */
  private drawColumn(ctx: CanvasRenderingContext2D, c: Rect): void {
    const was = ctx.globalAlpha; ctx.globalAlpha = 0.94; px(ctx, c.x, c.y, c.w, c.h, OS26.shNavy); ctx.globalAlpha = was;
    px(ctx, c.x, c.y, 2, c.h, OS26.shGold);
    let y = c.y + 8;
    const x = c.x + 9, w = c.w - 16;
    this.notes.forEach((n, i) => {
      setFont(ctx, 11);
      const head = `${A3.b9.sentAs.toUpperCase()} · ${n.to}`;
      heavyText(ctx, fitIn(ctx, head, w), x, y, OS26.shGold, 0.35);
      y += 15;
      // her words as it wrote them, whole (three lines at most), on the show's caption plate
      const lines = wrapRich(ctx, n.text, w - 18, 12).slice(0, 3);
      const bh = lines.length * 15 + 10;
      fillRR(ctx, x, y, w, bh, 4, OS26.shPlate);
      px(ctx, x, y, 3, bh, OS26.shGold);
      lines.forEach((l, j) => drawLine(ctx, l, x + 10, y + 5 + j * 15, 12, OS26.shText));
      y += bh + 7;
      // Junie's answer to the lot's message: through the mute (her own card: plain)
      if (i === 0 && this.junie.length) {
        roundRect(ctx, x + 2, y, 16, 16, 8, KETTLE.avatarJunie);
        setFont(ctx, 10); ctx.fillStyle = V3.ink; ctx.fillText('J', x + 7, y + 3);
        setFont(ctx, 11); ctx.fillStyle = OS26.shText; ctx.fillText(`${B10.junie.who} · ${B10.junie.muted}`, x + 22, y + 2);
        y += 20;
        for (const said of this.junie) {
          const jl = wrapRich(ctx, said, w - 24, 12);
          const jh = jl.length * 15 + 10;
          roundEdge(ctx, x + 10, y, w - 10, jh, 8, KETTLE.rowEdge, KETTLE.theirs);
          jl.forEach((l, j) => drawLine(ctx, l, x + 17, y + 5 + j * 15, 12, KETTLE.ink));
          y += jh + 5;
        }
        y += 3;
      }
    });
    if (this.booked) {
      setFont(ctx, 11);
      const lines = wrapRich(ctx, A3.b9.booked, w - 18, 11).slice(0, 2);
      const bh = lines.length * 14 + 10;
      fillRR(ctx, x, y, w, bh, 4, OS26.shBooked);
      lines.forEach((l, j) => drawLine(ctx, l, x + 9, y + 5 + j * 14, 11, OS26.shText));
      y += bh + 6;
    }
  }

  /** Settings, opened by her friends over the stage's top right (never over her words at the edge): the system closes it,
   *  they open it again */
  private drawSettings(ctx: CanvasRenderingContext2D, st: Rect, anchor: (id: string, a: Rect) => void): void {
    const S = B10.settings, pw = Math.min(230, Math.round(st.w * 0.55)), ph = 104, sx = st.x + st.w - pw - 8, sy = st.y + 8;
    roundEdge(ctx, sx - 1, sy - 1, pw + 2, ph + 2, 10, V3.ink, V3.card);
    setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(S.title, sx + 12, sy + 9);
    px(ctx, sx + 10, sy + 28, pw - 20, 1, V3.edge);
    assistantMark(ctx, sx + 12, sy + 38, 18, AI.mark, WEB.card);
    setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(fitIn(ctx, S.row, pw - 46), sx + 36, sy + 37);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(fitIn(ctx, S.sub, pw - 46), sx + 36, sy + 52);
    setFont(ctx, 11);
    const rw = Math.ceil(ctx.measureText(S.remove).width) + 24, rx = sx + pw - rw - 12, ry = sy + ph - 30;
    roundEdge(ctx, rx, ry, rw, 22, 11, V3.ink, V3.card);
    ctx.fillStyle = V3.ink; ctx.fillText(S.remove, rx + 12, ry + 5);
    anchor('remove', { x: rx, y: ry, w: rw, h: 22 });
  }

  /** two small warm camera tiles at the glass's left edge: a head and shoulders in their own light, never a face */
  private drawTiles(ctx: CanvasRenderingContext2D, s: Rect): void {
    const tw = Math.max(54, Math.min(78, Math.round(s.w * 0.15))), th = Math.round(tw * 0.75);
    const who: ('junie' | 'rae')[] = ['junie', 'rae'];
    for (let i = 0; i < Math.min(2, this.tiles); i++) {
      const k = who[i], x = s.x + 8, y = s.y + 52 + i * (th + 22);
      const cloth = k === 'junie' ? INK.junie : INK.rae;
      px(ctx, x - 2, y - 2, tw + 4, th + 4, WEB.card);
      // their room, in its own warm light (a wall, a lamp's glow)
      px(ctx, x, y, tw, th, k === 'junie' ? PLACE.wall : PLACE.wallLo);
      ctx.save(); ctx.globalAlpha = 0.55; px(ctx, x + Math.round(tw * (k === 'junie' ? 0.62 : 0.08)), y, Math.round(tw * 0.3), th, PLACE.sun); ctx.restore();
      if (k === 'rae') px(ctx, x + Math.round(tw * 0.7), y + Math.round(th * 0.18), Math.round(tw * 0.16), Math.round(th * 0.28), PLACE.textile);
      // a head and shoulders: hair, a head with no face, the shoulders in their colour
      const cx = x + Math.round(tw / 2) + (k === 'junie' ? -3 : 3), hy = y + Math.round(th * 0.2), hs = Math.round(th * 0.36);
      const hair = k === 'junie' ? PLACE.ink : ERA4.photoHair;
      if (k === 'rae') roundRect(ctx, cx - Math.round(hs * 0.7), hy - Math.round(hs * 0.12), Math.round(hs * 1.4), Math.round(hs * 1.45), Math.round(hs * 0.5), hair);
      roundRect(ctx, cx - Math.round(hs / 2), hy, hs, Math.round(hs * 1.15), Math.round(hs * 0.45), k === 'junie' ? ERA4.photoSkin : ERA4.photoSkinHi);
      roundRect(ctx, cx - Math.round(hs * 0.56), hy - Math.round(hs * 0.14), Math.round(hs * 1.12), Math.round(hs * 0.42), Math.round(hs * 0.2), hair);
      roundRect(ctx, cx - Math.round(tw * 0.34), y + Math.round(th * 0.7), Math.round(tw * 0.68), th, 8, cloth);
      // their name, small, in the corner
      ctx.font = monoFor(11);
      const name = k === 'junie' ? B10.names.junie : B10.names.rae, nw = Math.ceil(ctx.measureText(name).width) + 8;
      ctx.save(); ctx.globalAlpha = 0.8; px(ctx, x + 2, y + th - 15, nw, 14, ERA4.field); ctx.restore();
      ctx.fillStyle = WEB.card; ctx.fillText(name, x + 6, y + th - 14);
    }
  }
}

function blank(): Cur { return { on: false, x: 0.5, y: 0.9, fx: 0, fy: 0, tx: 0, ty: 0, t: 1, dur: 0, flash: 0 }; }

function fitIn(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  let n = text.length; while (n > 0 && ctx.measureText(`${text.slice(0, n).trimEnd()}…`).width > w) n--;
  return `${text.slice(0, n).trimEnd()}…`;
}
/** the halo: a ring of the company's mint (a lighting rig, never a saint's) */
function haloRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink: string, lw: number): void {
  ctx.strokeStyle = ink; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, Math.round(r * 0.38), 0, 0, Math.PI * 2); ctx.stroke();
}
/** "Made with AI": the clip's stamp idiom (warning yellow, dark ink, square), right-aligned at x (or, `fromLeft`, from x) */
function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, fromLeft = false): void {
  ctx.font = fontFor(9, 'e4'); ctx.textBaseline = 'top';
  const w = Math.ceil(ctx.measureText(text).width) + 8, x0 = fromLeft ? x : x - w;
  px(ctx, x0, y, w, 14, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk; ctx.fillText(text, x0 + 4, y + 2);
}
function keyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  roundRect(ctx, x, y, 6, 6, 3, ink); px(ctx, x + 2, y + 2, 2, 2, WEB.card);
  px(ctx, x + 6, y + 2, 6, 2, ink); px(ctx, x + 9, y + 4, 1, 2, ink); px(ctx, x + 11, y + 4, 1, 2, ink);
}
function gearIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, ground: string = STUDIO.bar): void {
  roundRect(ctx, x + 2, y + 2, 8, 8, 4, ink); px(ctx, x + 4, y + 4, 4, 4, ground);
  px(ctx, x + 5, y, 2, 2, ink); px(ctx, x + 5, y + 10, 2, 2, ink); px(ctx, x, y + 5, 2, 2, ink); px(ctx, x + 10, y + 5, 2, 2, ink);
}
/** a cursor: an arrow in its owner's colour with a dark edge, its owner's name on it, a ring when it presses */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, pressing: boolean, label: string, right: number): void {
  // ⚑ S418b — its name at the reading floor (11 px; job 33's was 9)
  setFont(ctx, 11);
  const lw = Math.ceil(ctx.measureText(label).width) + 12, lx = x + 14 + lw > right - 2 ? x - lw - 4 : x + 14;
  pill(ctx, lx, y + 16, lw, 16, ink);
  ctx.fillStyle = V3.ink; ctx.fillText(label, lx + 6, y + 18);
  if (pressing) { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
  const path = (): void => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 7, y + 19); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x + 7, y + 12); ctx.lineTo(x + 12, y + 12); ctx.closePath(); };
  path(); ctx.fillStyle = V3.ink; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(0.78, 0.78); ctx.translate(-x + 1.2, -y + 3); path(); ctx.fillStyle = ink; ctx.fill(); ctx.restore();
}
