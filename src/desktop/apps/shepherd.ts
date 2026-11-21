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
 *   · THE PHOTO: Shepherd's cursor opens her Photos and takes "me, after.jpg"; the filter works on it in steps (her own
 *     photograph and the system's picture, `paintPortrait`), stops short of its gloss and never finishes: "Made with AI", a
 *     ring stuck at "Becoming 99%", and its SEAMS SHOW — slices of it out of register, her own picture through the gaps.
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
import { ERA4, PLACE, WEB, V3, CLIP, KETTLE, CHROME, roundRect, roundEdge, pill, assistantMark, mayaPhoto, paintPortrait, portraitAt, thumb } from '../theme/era4';
import { reducedMotion } from '../../state/motion';
import { wrapRich, drawLine, AI, ANIM_HZ, type Hit, type Rect } from './lScreen';
import ACTS from '../../../data/dialog/s4_acts.json';

export type Door = 'vr' | 'here';
type CurId = 'shepherd' | 'system' | 'junie' | 'rae';
interface Cur { on: boolean; x: number; y: number; fx: number; fy: number; tx: number; ty: number; t: number; dur: number; flash: number }
interface Note { to: string; text: string }

const A3 = (ACTS as unknown as { act3: {
  b9: { studio: { live: string; name: string; sub: string; host: string; inHeadset: string; cursor: string };
    photos: { app: string; file: string }; photo: { made: string; becoming: string; stopAt: number; amount: number };
    sentAs: string; booked: string };
  b10: { junie: { who: string; muted: string }; names: { junie: string; rae: string };
    settings: { title: string; row: string; sub: string; remove: string }; securing: string; ask: string; yes: string };
} }).act3;
const ST = A3.b9.studio, PH = A3.b9.photo, B10 = A3.b10;
const AGENT_NAME = (ACTS as unknown as { screen: { stName: string } }).screen.stName;

/** the studio's pale light: the same cold pale the room recedes into (app.ts `STUDIO_FOG`) */
export const STUDIO = { sky: PLACE.sky, skyHi: ERA4.photoSkyHi, haze: WEB.bg, floor: WEB.card, edge: ERA4.glow, halo: ERA4.l, robe: WEB.card,
  robeLo: ERA4.glow, head: WEB.shimmer, bar: ERA4.field, barInk: ERA4.textHi } as const;
const INK = { junie: PLACE.sunHi, rae: PLACE.textileHi, system: ERA4.l, shepherd: ERA4.l } as const;
/** how many steps the filter takes to its stopping point (each one painted once) */
const PHOTO_STEPS = 14;
/** the size the portraits are painted at (cells of the 24 × 30 grid × 5), then copied */
const PW = 120, PH_ = 150;
const BAR = 22, BAND = 34;
const BREAK_SECONDS = 0.9;

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
  // ── the pictures, painted once ──
  private her: HTMLCanvasElement | null = null;
  private alt: HTMLCanvasElement | null = null;
  private altStep = -1;

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
    this.ask = false; this.yesRing = false; this.breakT = -1; this.dark = false;
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
  /** the whole session in `r`; `publish` takes the controls the visitor may press (the Yes) */
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
    const top = r.y + BAR, bandY = r.y + r.h - BAND;
    const stage: Rect = { x: r.x, y: top, w: r.w - colW, h: bandY - top };
    // ── the studio: pale bands, a floor, the key light ──
    const sky = [STUDIO.sky, STUDIO.skyHi, STUDIO.edge, STUDIO.haze];
    const floorY = stage.y + Math.round(stage.h * 0.74);
    for (let i = 0; i < 4; i++) px(ctx, r.x, stage.y + Math.round(((floorY - stage.y) * i) / 4), r.w, Math.ceil((floorY - stage.y) / 4) + 1, sky[i]);
    px(ctx, r.x, floorY, r.w, bandY - floorY, STUDIO.floor);
    px(ctx, r.x, floorY, r.w, 1, STUDIO.edge);
    if (this.intro) this.drawTitle(ctx, stage);
    else {
      const photoUp = this.photos === 2;
      // the host: centre stage, or to the left of the picture once it is up
      if (this.hostOn) {
        const hs = Math.max(0.6, Math.min(1.25, stage.h / 260)) * (photoUp ? 0.62 : 1);
        const hx = photoUp ? stage.x + Math.round(34 * hs) + 8 : stage.x + Math.round(stage.w / 2);
        this.drawHost(ctx, hx, floorY, hs);
      }
      if (photoUp) this.drawPhoto(ctx, stage, floorY);
      if (this.photos === 1) this.drawPhotos(ctx, stage, anchor);
    }
    // the friends' tiles at the glass's left edge (what they say is in Junie's thread at the edge)
    if (this.tiles > 0) this.drawTiles(ctx, stage);
    // the sign-ins, a thin strip each under the bar
    this.signins.forEach((s, i) => {
      setFont(ctx, 10);
      const w = Math.ceil(ctx.measureText(s).width) + 30, x = stage.x + Math.round((stage.w - w) / 2), y = stage.y + 6 + i * 20;
      roundEdge(ctx, x, y, w, 17, 8, WEB.cardEdge, WEB.card);
      keyIcon(ctx, x + 7, y + 4, CHROME.ink);
      ctx.fillStyle = V3.ink; ctx.fillText(s, x + 22, y + 3);
    });
    if (this.settings) this.drawSettings(ctx, stage, anchor);
    // ── the edge: what it sent as her, and her friends' answer ──
    if (colW) this.drawColumn(ctx, { x: r.x + r.w - colW, y: top, w: colW, h: bandY - top });
    // ── the dialog: the one press that changes anything ──
    if (this.ask) {
      // right of the friends' tiles (they are people: the system's dialog never covers them)
      const w = Math.min(280, stage.w - 74), h = 96, x = stage.x + stage.w - w - 6, y = stage.y + Math.round((stage.h - h) / 2) + 10;
      roundEdge(ctx, x - 1, y - 1, w + 2, h + 2, 12, V3.ink, V3.card);
      assistantMark(ctx, x + 12, y + 14, 22, AI.mark, WEB.card);
      setFont(ctx, w < 250 ? 13 : 14); ctx.fillStyle = V3.ink; ctx.fillText(fitIn(ctx, B10.ask, w - 48), x + 40, y + 17);
      setFont(ctx, 13);
      const bw = Math.max(84, Math.ceil(ctx.measureText(B10.yes).width) + 40), bx = x + w - bw - 14, by = y + h - 40;
      if (this.yesRing) { ctx.strokeStyle = INK.junie; ctx.lineWidth = 2; ctx.strokeRect(bx - 4, by - 4, bw + 8, 34); }
      pill(ctx, bx, by, bw, 26, AI.primary);
      ctx.fillStyle = AI.primaryInk; ctx.fillText(B10.yes, bx + Math.round((bw - ctx.measureText(B10.yes).width) / 2), by + 6);
      anchor('yes', { x: bx, y: by, w: bw, h: 26 });
      push({ x: bx - 6, y: by - 6, w: bw + 12, h: 38, id: 'a3-yes' });
    }
    // ── the bar: LIVE · Shepherd Live™ · exploratory session; the gear at its right (Settings) ──
    px(ctx, r.x, r.y, r.w, BAR, this.securing ? AI.primary : STUDIO.bar);
    if (this.securing) {
      assistantMark(ctx, r.x + 8, r.y + 3, 16, AI.primaryInk, AI.primary);
      setFont(ctx, 11); ctx.fillStyle = AI.primaryInk; ctx.fillText(fitIn(ctx, B10.securing, r.w - 60), r.x + 30, r.y + 5);
    } else {
      pill(ctx, r.x + 8, r.y + 4, 40, 14, V3.danger);
      roundRect(ctx, r.x + 13, r.y + 8, 6, 6, 3, WEB.card);
      ctx.font = monoFor(9); ctx.fillStyle = WEB.card; ctx.fillText(ST.live, r.x + 22, r.y + 7);
      setFont(ctx, 11); ctx.fillStyle = STUDIO.barInk;
      const nw = Math.ceil(ctx.measureText(ST.name).width);
      ctx.fillText(ST.name, r.x + 56, r.y + 5);
      setFont(ctx, 10); ctx.fillStyle = ERA4.text; ctx.fillText(fitIn(ctx, `· ${ST.sub}`, r.w - nw - 100), r.x + 62 + nw, r.y + 6);
    }
    gearIcon(ctx, r.x + r.w - 20, r.y + 5, this.securing ? AI.primaryInk : ERA4.text);
    anchor('gear', { x: r.x + r.w - 22, y: r.y + 3, w: 16, h: 16 });
    // ── the caption band: Shepherd's words ──
    px(ctx, r.x, bandY, r.w, BAND, CLIP.band);
    if (this.line) {
      ctx.font = monoFor(9);
      const tw = Math.ceil(ctx.measureText(ST.host).width) + 12;
      px(ctx, r.x + 8, bandY - 13, tw, 13, CLIP.band);
      ctx.fillStyle = this.speaking ? ERA4.l : ERA4.glow; ctx.fillText(ST.host, r.x + 14, bandY - 11);
      ctx.font = fontFor(r.w < 560 ? 14 : 16, 'e4'); ctx.fillStyle = CLIP.ink;
      const t = fitIn(ctx, this.line, r.w - 20), lw = Math.ceil(ctx.measureText(t).width);
      ctx.fillText(t, r.x + Math.max(10, Math.round((r.w - lw) / 2)), bandY + 9);
    }
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

  /** the monitor while the session is on the headset's glass: one still card, drawn on change only */
  drawAway(ctx: CanvasRenderingContext2D, r: Rect): void {
    // (the anchors are the glass's: this card touches none of them)
    px(ctx, r.x, r.y, r.w, r.h, STUDIO.skyHi);
    px(ctx, r.x, r.y + Math.round(r.h * 0.62), r.w, Math.round(r.h * 0.38), STUDIO.haze);
    const cx = r.x + Math.round(r.w / 2), cy = r.y + Math.round(r.h * 0.36);
    haloRing(ctx, cx, cy, 30, STUDIO.halo, 4);
    setFont(ctx, 18); ctx.fillStyle = V3.ink;
    const nw = Math.ceil(ctx.measureText(ST.name).width); ctx.fillText(ST.name, cx - Math.round(nw / 2), cy + 44);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2;
    const sw = Math.ceil(ctx.measureText(ST.sub).width); ctx.fillText(ST.sub, cx - Math.round(sw / 2), cy + 68);
    setFont(ctx, 13); ctx.fillStyle = V3.ink;
    const iw = Math.ceil(ctx.measureText(ST.inHeadset).width); ctx.fillText(ST.inHeadset, cx - Math.round(iw / 2), cy + 96);
  }

  // ── its parts ──────────────────────────────────────────────────────────────
  private drawTitle(ctx: CanvasRenderingContext2D, s: Rect): void {
    const k = Math.max(0, this.step) / 4;
    const cx = s.x + Math.round(s.w / 2), cy = s.y + Math.round(s.h * 0.4);
    haloRing(ctx, cx, cy, Math.round(18 + 16 * k), STUDIO.halo, 3 + Math.round(2 * k));
    if (k >= 0.5) {
      ctx.font = fontFor(s.w < 400 ? 20 : 24, 'e4'); ctx.fillStyle = V3.ink;
      const nw = Math.ceil(ctx.measureText(ST.name).width); ctx.fillText(ST.name, cx - Math.round(nw / 2), cy + 44);
    }
    if (k >= 0.75) {
      setFont(ctx, 12); ctx.fillStyle = V3.ink2;
      const sw = Math.ceil(ctx.measureText(ST.sub).width); ctx.fillText(ST.sub, cx - Math.round(sw / 2), cy + 74);
    }
  }

  /** the host: faceless, robed, pale, a halo ring behind its head (the company's mint, a lighting rig), standing in its key
   *  light with its arms a little open. It never moves toward her. Speaking, the ring is lit. */
  private drawHost(ctx: CanvasRenderingContext2D, cx: number, floorY: number, s: number): void {
    const u = (n: number): number => Math.round(n * s);
    const headY = floorY - u(158);
    // the studio's key light behind it, and its pool on the floor
    ctx.save();
    ctx.globalAlpha = 0.45; ctx.fillStyle = WEB.shimmer;
    ctx.beginPath(); ctx.ellipse(cx, headY + u(52), u(74), u(78), 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.fillStyle = STUDIO.edge;
    ctx.beginPath(); ctx.ellipse(cx, floorY, u(60), u(7), 0, 0, Math.PI * 2); ctx.fill();
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
        setFont(ctx, 9); ctx.fillStyle = V3.ink; ctx.fillText(fitIn(ctx, A3.b9.photos.file, tw + 6), tx, ty + th + 4);
        anchor('photo-file', { x: tx, y: ty, w: tw, h: th });
      } else {
        thumb(ctx, tx, ty, tw, th, i % 3, false, 4);   // her other pictures (variant 3 is a portrait like hers: not used here)
      }
    }
  }

  /** the photo: a MIRROR on the headset's glass, SIDE BY SIDE on the monitor */
  private drawPhoto(ctx: CanvasRenderingContext2D, s: Rect, floorY: number): void {
    this.ensureHer();
    this.ensureAlt();
    const mirror = this.door === 'vr';
    const fh = Math.min(s.h - 54, mirror ? 236 : 220), fw = Math.round(fh * 0.8);
    const ringR = Math.max(8, Math.round(fh / 22));
    if (mirror) {
      const x = s.x + Math.round((s.w - fw) / 2) + 18, y = s.y + 10;
      // the mirror's frame, and the altered picture in it
      roundEdge(ctx, x - 8, y - 8, fw + 16, fh + 16, 10, ERA4.ruleHi, ERA4.panelHi);
      this.blitAlt(ctx, x, y, fw, fh);
      stamp(ctx, x + fw - 4, y + 4, PH.made);
      // her own photo, taken from her Photos, tucked into the frame's corner
      const tw = Math.round(fw * 0.32), th = Math.round(tw * 1.25);
      px(ctx, x - 12, y + fh - th + 4, tw + 6, th + 6, WEB.card);
      if (this.her) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(this.her, x - 9, y + fh - th + 7, tw, th); ctx.imageSmoothingEnabled = was; }
      this.drawBecoming(ctx, x + Math.round(fw / 2), y + fh + 18, ringR);
    } else {
      const gap = 26, x0 = s.x + Math.round((s.w - (2 * fw + gap)) / 2) + 30, y = s.y + 12;
      // hers, as taken from her Photos (its name under it), and the system's beside it
      px(ctx, x0 - 3, y - 3, fw + 6, fh + 6, WEB.card);
      if (this.her) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(this.her, x0, y, fw, fh); ctx.imageSmoothingEnabled = was; }
      setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(A3.b9.photos.file, x0, y + fh + 8);
      const x1 = x0 + fw + gap;
      px(ctx, x1 - 3, y - 3, fw + 6, fh + 6, ERA4.ruleHi);
      this.blitAlt(ctx, x1, y, fw, fh);
      stamp(ctx, x1 + fw - 4, y + 4, PH.made);
      // the arrow between them: what was done to it
      const ay = y + Math.round(fh / 2);
      for (let i = 0; i < 3; i++) px(ctx, x0 + fw + 7 + i * 4, ay - 1, 3, 3, AI.mark);
      this.drawBecoming(ctx, x1 + Math.round(fw / 2), Math.min(floorY + 30, y + fh + 16), ringR);
    }
  }
  /** the ring, stuck: "Becoming 99%" */
  private drawBecoming(ctx: CanvasRenderingContext2D, cx: number, cy: number, rr: number): void {
    const n = this.becoming, label = PH.becoming.replace('{n}', String(n));
    setFont(ctx, 12);
    const lw = Math.ceil(ctx.measureText(label).width), total = rr * 2 + 8 + lw, x = cx - Math.round(total / 2);
    ctx.strokeStyle = ERA4.ruleHi; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x + rr, cy, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = AI.mark;
    ctx.beginPath(); ctx.arc(x + rr, cy, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n) / 100); ctx.stroke();
    ctx.fillStyle = V3.ink; ctx.fillText(label, x + rr * 2 + 8, cy - 7);
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
    // the filter's own order, stopped short of its gloss: it never finishes
    const amount = (this.photoStep / PHOTO_STEPS) * PH.amount;
    paintPortrait(g, 0, 0, PW, PH_, portraitAt(amount), 0);
    this.altStep = this.photoStep;
  }

  /** the edge: each note under "Sent as Maya", Junie's answer under the lot's (through the mute), the booking */
  private drawColumn(ctx: CanvasRenderingContext2D, c: Rect): void {
    px(ctx, c.x, c.y, c.w, c.h, V3.page);
    px(ctx, c.x, c.y, 1, c.h, V3.edge);
    let y = c.y + 8;
    const x = c.x + 8, w = c.w - 16;
    this.notes.forEach((n, i) => {
      setFont(ctx, 9); ctx.fillStyle = V3.ink2;
      ctx.fillText(fitIn(ctx, `${A3.b9.sentAs} · ${n.to}`, w), x, y);
      y += 13;
      // her words as it wrote them, whole (never cut: the edge is wide enough for three lines on the monitor)
      const lines = wrapRich(ctx, n.text, w - 14, 10);
      const bh = lines.length * 13 + 10;
      roundRect(ctx, x, y, w, bh, 8, KETTLE.mine);
      lines.forEach((l, j) => drawLine(ctx, l, x + 7, y + 5 + j * 13, 10, KETTLE.ink));
      y += bh + 6;
      // Junie's answer to the lot's message: through the mute
      if (i === 0 && this.junie.length) {
        roundRect(ctx, x + 2, y, 16, 16, 8, KETTLE.avatarJunie);
        setFont(ctx, 9); ctx.fillStyle = V3.ink; ctx.fillText('J', x + 7, y + 3);
        ctx.fillStyle = V3.ink2; ctx.fillText(`${B10.junie.who} · ${B10.junie.muted}`, x + 22, y + 3);
        y += 19;
        for (const said of this.junie) {
          const jl = wrapRich(ctx, said, w - 24, 11);
          const jh = jl.length * 14 + 10;
          roundEdge(ctx, x + 10, y, w - 10, jh, 8, KETTLE.rowEdge, KETTLE.theirs);
          jl.forEach((l, j) => drawLine(ctx, l, x + 17, y + 5 + j * 14, 11, KETTLE.ink));
          y += jh + 5;
        }
        y += 3;
      }
    });
    if (this.booked) {
      setFont(ctx, 10);
      const lines = wrapRich(ctx, A3.b9.booked, w - 16, 10).slice(0, 2);
      const bh = lines.length * 13 + 10;
      roundRect(ctx, x, y, w, bh, 8, AI.primary);
      lines.forEach((l, j) => drawLine(ctx, l, x + 8, y + 5 + j * 13, 10, AI.primaryInk));
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
    setFont(ctx, 9); ctx.fillStyle = V3.ink2; ctx.fillText(fitIn(ctx, S.sub, pw - 46), sx + 36, sy + 52);
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
      ctx.font = monoFor(8);
      const name = k === 'junie' ? B10.names.junie : B10.names.rae, nw = Math.ceil(ctx.measureText(name).width) + 8;
      ctx.save(); ctx.globalAlpha = 0.8; px(ctx, x + 2, y + th - 12, nw, 11, ERA4.field); ctx.restore();
      ctx.fillStyle = WEB.card; ctx.fillText(name, x + 6, y + th - 11);
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
/** "Made with AI": the clip's stamp idiom (warning yellow, dark ink, square), right-aligned at x */
function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  ctx.font = fontFor(9, 'e4'); ctx.textBaseline = 'top';
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  px(ctx, x - w, y, w, 14, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk; ctx.fillText(text, x - w + 4, y + 2);
}
function keyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  roundRect(ctx, x, y, 6, 6, 3, ink); px(ctx, x + 2, y + 2, 2, 2, WEB.card);
  px(ctx, x + 6, y + 2, 6, 2, ink); px(ctx, x + 9, y + 4, 1, 2, ink); px(ctx, x + 11, y + 4, 1, 2, ink);
}
function gearIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  roundRect(ctx, x + 2, y + 2, 8, 8, 4, ink); px(ctx, x + 4, y + 4, 4, 4, STUDIO.bar);
  px(ctx, x + 5, y, 2, 2, ink); px(ctx, x + 5, y + 10, 2, 2, ink); px(ctx, x, y + 5, 2, 2, ink); px(ctx, x + 10, y + 5, 2, 2, ink);
}
/** a cursor: an arrow in its owner's colour with a dark edge, its owner's name on it, a ring when it presses */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, pressing: boolean, label: string, right: number): void {
  setFont(ctx, 9);
  const lw = Math.ceil(ctx.measureText(label).width) + 10, lx = x + 14 + lw > right - 2 ? x - lw - 4 : x + 14;
  pill(ctx, lx, y + 16, lw, 13, ink);
  ctx.fillStyle = V3.ink; ctx.fillText(label, lx + 5, y + 18);
  if (pressing) { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
  const path = (): void => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 7, y + 19); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x + 7, y + 12); ctx.lineTo(x + 12, y + 12); ctx.closePath(); };
  path(); ctx.fillStyle = V3.ink; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(0.78, 0.78); ctx.translate(-x + 1.2, -y + 3); path(); ctx.fillStyle = ink; ctx.fill(); ctx.restore();
}
