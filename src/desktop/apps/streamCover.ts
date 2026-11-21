/**
 * ⚑ S415 (UiB job 33 Part D) — TRANSJESUS.STR ON HER MONITOR, and the dark after it: the picture of beats 11–13 (the act that
 * moves it is src/desktop/apps/e4ActFour.ts; its header says what each beat is and why). Held by the director (e4Acts.ts
 * `stream`) the way Shepherd's surface is, and drawn over the whole glass (LScreen.cover) once it is open.
 *
 * ⚑ DIRTY ONLY (S406): the picture moves at STREAM_HZ (a stream's own low frame rate — the whole monitor is one texture,
 * re-sent at each step); the chat on each new line; the glitch at the act's own steps; the rest is still.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { ERA4, PLACE, WEB, V3, KETTLE, roundRect, roundEdge, pill, assistantMark, streamScene, streamShot, glitchBands, type StreamShot } from '../theme/era4';
import { CAL_2026 } from '../theme/calendar';
import { wrapRich, drawLine, type Rect, type Hit } from './lScreen';
import { drawCursor } from './shepherd';
import ACTS from '../../../data/dialog/s4_acts.json';
import BALL from '../../../data/dialog/s4_ball.json';
import V3DATA from '../../../data/dialog/s4_v3.json';

export interface Said { who: string; text: string; gift?: boolean }
export type ChatLine = Said & { sys?: boolean; mark?: 'joined' | 'ask' };
const A4 = (ACTS as unknown as { act4: { b11: { fund: string; fundFrom: number; fundStep: number; friends: { junie: string; rae: string } } } }).act4;
const B11 = A4.b11;
const KETTLE_NAME = (ACTS as unknown as { screen: { apps: Record<string, string> } }).screen.apps.kettle;
/** the people's chat and the stream's own words (the retired stream space's data, kept live: s4_ball.json `stream`) */
export const ST = BALL.stream as unknown as { mark: string; live: string; watching: string; count: number; joined: string; before: Said[]; welcome: Said[];
  ask: Said; chips: string[]; answer: Record<string, Said[]>; after: Said[] };
/** SESSION TERMINATED, as built (s4_ball.json `system`, 26-22) */
export const SYS = BALL.system as unknown as { mark: string; terminated: string; reason: string; terminatedNote: string };
const TITLE = (V3DATA as unknown as { fundraiser: { title: string } }).fundraiser.title;

/** the stream's own frame rate: a stream's low steps, not the room's frames. In the room each step re-sends only the picture's
 *  own plane (960 × 660, era3Devices `streamPic`): ≈ 15 MB a second at 6, where the whole monitor at 6 measured 64–82 */
export const STREAM_HZ = 6;
const BAR = 24, FUND = 24, CHAT_W = 222;
/** ⚑ the picture's rect on the monitor's 710 × 384 (the room puts its plane exactly here: era3Devices `streamPic`) */
export const PICTURE = { x: 4, y: BAR + FUND + 2, w: 710 - CHAT_W - 8, h: 384 - (BAR + FUND + 2) - 4 } as const;
/** the light's colour for each of the stream's shots (theme hexes only): it changes with the cut, never flashes */
export const SHOT_LIGHT: Record<StreamShot, string> = { wide: PLACE.textileHi, walker: PLACE.sun, crowd: CAL_2026.transPink, lights: PLACE.rugHi };

/**
 * THE STREAM ON THE MONITOR, then the dark after it. Its state is the act's; it draws over the whole glass (LScreen.cover)
 * once it is open, and grows out of Junie's link before that (LScreen.overlayTop).
 */
export class StreamCover {
  version = 0;
  /** the stream fills the monitor (the cover draws) */
  on = false;
  /** 0 … 1 while it grows out of the link (overlayTop draws it), 1 once it fills the glass */
  grow = 0;
  private growFrom: Rect | null = null;
  /** the stream's clock (its picture), stepped at STREAM_HZ */
  private t = 0;
  private frame = -1;
  /** the chat so far, the count, the fund */
  chat: ChatLine[] = [];
  /** the night's lines not yet said when the system comes back (they go on under its band) */
  rest: ChatLine[] = [];
  count = ST.count;
  fund = B11.fundFrom;
  lastGift = '';
  /** Rae's candles are lit (from "maya joined") */
  candles = false;
  /** her two presses are up */
  asking = false;
  choice: string | null = null;
  /** the people's arms up (her dance, a landing) until this stream second */
  private landingUntil = -1;
  // ── beat 12 ──
  band: string | null = null;
  terminated = false;
  /** the stream second the picture froze at (−1: live) */
  private frozenAt = -1;
  private frozenShot: StreamShot = 'wide';
  /** 0 … 1: the system's update failing over the frozen picture */
  glitch = 0;
  dark = false;
  // ── beat 13 ──
  junie: string | null = null;
  /** L's words so far (as the voice reaches each phrase) */
  lWords: string | null = null;
  title: string | null = null;
  /** Junie's cursor on her link (0 … 1 of the monitor), before the stream opens */
  junieCursor: { x: number; y: number; pressing: boolean } | null = null;
  hits: Hit[] = [];

  /** back to before the stream (a review jump, the acts begun again) */
  reset(): void {
    this.on = false; this.grow = 0; this.growFrom = null; this.t = 0; this.frame = -1; this.chat = []; this.rest = []; this.count = ST.count;
    this.fund = B11.fundFrom; this.lastGift = ''; this.candles = false; this.asking = false; this.choice = null; this.landingUntil = -1;
    this.band = null; this.terminated = false; this.frozenAt = -1; this.glitch = 0; this.dark = false;
    this.junie = null; this.lWords = null; this.title = null; this.junieCursor = null; this.hits = []; this.version++;
  }
  get frozen(): boolean { return this.frozenAt >= 0; }
  get shot(): StreamShot { return this.frozen ? this.frozenShot : streamShot(this.t + 30); }
  /** ⚑ the room has put the moving picture on its own small plane over the monitor (era3Devices `streamPic`): its frames are
   *  re-sent there (960 × 660) and the monitor (2130 × 1152, 2840 × 1536 in a headset) only when its own parts change — the
   *  probe measured the whole monitor re-sent 4–8 times a second otherwise (46–82 MB a second) */
  planeReady = false;
  /** the picture plane's version (its frames, her friends' candles, the band) */
  picVersion = 0;
  get planeOn(): boolean { return this.planeReady && this.on && this.grow === 0 && !this.frozen && !this.dark && this.glitch === 0; }
  touch(): void { this.version++; this.picVersion++; }

  update(dt: number): void {
    if (!this.on || this.frozen || this.dark) return;
    this.t += dt;
    const f = Math.floor(this.t * STREAM_HZ);
    if (f !== this.frame) { this.frame = f; if (this.planeOn) this.picVersion++; else this.version++; }
  }
  /** the stream's second now (for the light's colour and the people's landings) */
  get clock(): number { return this.t; }
  land(seconds: number): void { this.landingUntil = this.t + seconds; this.touch(); }
  /** the picture stops where it is, on the people mid-dance (their arms up), and stays */
  freeze(): void {
    if (this.frozen) return;
    this.frozenAt = this.t;
    const s = streamShot(this.t + 30);
    this.frozenShot = s === 'wide' || s === 'crowd' ? s : 'wide';
    this.landingUntil = Number.POSITIVE_INFINITY;
    this.touch();
  }
  say(l: ChatLine): void {
    this.chat.push(l);
    if (this.chat.length > 40) this.chat.shift();
    if (l.gift) { this.fund = Math.min(0.97, this.fund + B11.fundStep); this.lastGift = l.who; }
    this.version++;
  }

  // ── the picture ────────────────────────────────────────────────────────────
  /** the whole stream (or the dark after it) over the monitor; her two presses published while they wait */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, push: (h: Hit) => void): void {
    this.hits = [];
    ctx.textBaseline = 'top';
    if (this.dark) { this.drawDark(ctx, W, H); return; }
    this.drawStream(ctx, W, H, push);
    if (this.glitch > 0) {
      // the system's own update failing: the picture torn in bands, the light going out of it (stepped by the act)
      glitchBands(ctx, W, H, this.glitch);
      const was = ctx.globalAlpha;
      ctx.globalAlpha = this.glitch * this.glitch;
      px(ctx, 0, 0, W, H, ERA4.field);
      ctx.globalAlpha = was;
    }
  }

  private drawStream(ctx: CanvasRenderingContext2D, W: number, H: number, push: (h: Hit) => void, scaled = false): void {
    const t = this.frozen ? this.frozenAt : this.t;
    px(ctx, 0, 0, W, H, ERA4.panel);
    // ── the bar: LIVE · transjesus.str · birthday stream · for trans youth … 42 watching ──
    px(ctx, 0, 0, W, BAR, ERA4.field);
    if (this.frozen) pill(ctx, 8, 5, 42, 14, ERA4.rule);
    else { pill(ctx, 8, 5, 42, 14, WEB.danger); roundRect(ctx, 13, 9, 6, 6, 3, WEB.card); }
    ctx.font = monoFor(10); ctx.fillStyle = WEB.card; ctx.fillText(ST.live, 22, 7);
    setFont(ctx, 13); ctx.fillStyle = ERA4.textHi; ctx.fillText(ST.mark, 58, 5);
    const mw = Math.ceil(ctx.measureText(ST.mark).width);
    setFont(ctx, 11); ctx.fillStyle = ERA4.text; ctx.fillText(`·  ${TITLE}`, 66 + mw, 7);
    const watching = ST.watching.replace('{n}', String(this.count));
    setFont(ctx, 11); ctx.fillStyle = this.count > ST.count ? PLACE.textileHi : ERA4.textHi;
    ctx.fillText(watching, W - 10 - Math.ceil(ctx.measureText(watching).width), 7);
    // ── the fund: "for Maya's name change", a bar that fills a hair at each gift (no total, no thanks, no score) ──
    px(ctx, 0, BAR, W, FUND, ERA4.panelHi);
    setFont(ctx, 11); ctx.fillStyle = ERA4.textHi; ctx.fillText(B11.fund, 10, BAR + 6);
    const fx = 22 + Math.ceil(ctx.measureText(B11.fund).width), gift = this.lastGift ? `✓ ${this.lastGift}` : '';
    setFont(ctx, 10);
    const gw = gift ? Math.ceil(ctx.measureText(gift).width) + 12 : 0, fw = W - fx - 12 - gw;
    pill(ctx, fx, BAR + 9, fw, 6, ERA4.rule);
    pill(ctx, fx, BAR + 9, Math.max(6, Math.round(fw * this.fund)), 6, PLACE.textileHi);
    if (gift) { ctx.fillStyle = PLACE.textileHi; ctx.fillText(gift, W - 10 - gw + 12, BAR + 7); }
    // ── the picture: the community and TransJesus dancing, wordless (on its own plane over the monitor while it moves, in the
    //   room: here only the ground under it; drawn here when it is still, frozen, growing, or there is no room) ──
    const top = BAR + FUND + 2, pw = W - CHAT_W - 8, ph = H - top - 4, pic: Rect = { x: 4, y: top, w: pw, h: ph };
    if (this.planeOn && !scaled) px(ctx, pic.x, pic.y, pic.w, pic.h, ERA4.field);
    else this.paintPicture(ctx, pic, t);
    // SESSION TERMINATED, as built: the system's card over the frozen picture
    if (this.terminated) {
      // over the frozen picture's middle, below her friends' tiles (the system's card never covers the people who came for her)
      const cw = 372, ch = 112, cx = pic.x + Math.round((pic.w - cw) / 2), cy = pic.y + Math.round(pic.h * 0.36);
      roundRect(ctx, cx, cy + 2, cw, ch, 10, ERA4.panelEdge);
      roundRect(ctx, cx, cy, cw, ch, 10, ERA4.field);
      px(ctx, cx, cy, cw, 3, ERA4.l);
      setFont(ctx, 18); ctx.fillStyle = ERA4.textHi; ctx.fillText(SYS.terminated, cx + 18, cy + 18);
      setFont(ctx, 13); ctx.fillStyle = ERA4.l; ctx.fillText(SYS.reason, cx + 18, cy + 48);
      setFont(ctx, 11); ctx.fillStyle = ERA4.text;
      const rows = wrapRich(ctx, SYS.terminatedNote, cw - 36, 11);
      rows.slice(0, 2).forEach((r, i) => drawLine(ctx, r, cx + 18, cy + 74 + i * 15, 11, ERA4.text));
    }
    // ── the chat: the community, in its own words ──
    this.drawChat(ctx, { x: W - CHAT_W - 2, y: top, w: CHAT_W, h: H - top - 2 }, push);
  }

  /** the picture itself: the scene, her friends on camera, and the system's band when it comes */
  private paintPicture(ctx: CanvasRenderingContext2D, pic: Rect, t: number): void {
    const landing = t < this.landingUntil ? 1 : 0;
    streamScene(ctx, pic.x, pic.y, pic.w, pic.h, t + 30, this.frozen ? this.frozenShot : streamShot(t + 30), landing, 'tj');
    // her friends on camera: Junie, and Rae holding the candles
    this.drawTiles(ctx, pic, t);
    // the system's thin grey band, across the top of the picture (over the rig, never on a dancer or the chat)
    if (this.band) {
      const by = pic.y + 6, bh = 24;
      const was = ctx.globalAlpha; ctx.globalAlpha = 0.94; px(ctx, pic.x, by, pic.w, bh, V3.grey); ctx.globalAlpha = was;
      px(ctx, pic.x, by + bh, pic.w, 1, V3.ink2);
      assistantMark(ctx, pic.x + 8, by + 4, 16, V3.ink2, V3.grey);
      setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(this.band, pic.x + 30, by + 5);
    }
  }
  /** ⚑ the picture plane's own canvas (era3Devices): the picture at its own size, at its own steps (`picVersion`) */
  drawPicture(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.textBaseline = 'top';
    this.paintPicture(ctx, { x: 0, y: 0, w, h }, this.frozen ? this.frozenAt : this.t);
  }
  /** two small camera tiles at the picture's foot: a head and shoulders in their own light, never a face; Rae's candles */
  private drawTiles(ctx: CanvasRenderingContext2D, pic: Rect, t: number): void {
    // at the picture's top left, over the back wall (never over the floor, where TransJesus dances, nor under the band)
    const tw = 92, th = 68, y = pic.y + 38;
    const who: ('junie' | 'rae')[] = ['junie', 'rae'];
    who.forEach((k, i) => {
      const x = pic.x + 8 + i * (tw + 6);
      px(ctx, x - 2, y - 2, tw + 4, th + 4, WEB.card);
      px(ctx, x, y, tw, th, k === 'junie' ? PLACE.wall : PLACE.wallLo);
      const was = ctx.globalAlpha; ctx.globalAlpha = 0.5;
      px(ctx, x + Math.round(tw * (k === 'junie' ? 0.62 : 0.06)), y, Math.round(tw * 0.3), th, PLACE.sun);
      ctx.globalAlpha = was;
      const cx = x + Math.round(tw / 2) + (k === 'junie' ? -4 : 4), hy = y + Math.round(th * 0.14), hs = Math.round(th * 0.34);
      const hair = k === 'junie' ? PLACE.ink : ERA4.photoHair;
      if (k === 'rae') roundRect(ctx, cx - Math.round(hs * 0.7), hy - Math.round(hs * 0.12), Math.round(hs * 1.4), Math.round(hs * 1.45), Math.round(hs * 0.5), hair);
      roundRect(ctx, cx - Math.round(hs / 2), hy, hs, Math.round(hs * 1.15), Math.round(hs * 0.45), k === 'junie' ? ERA4.photoSkin : ERA4.photoSkinHi);
      roundRect(ctx, cx - Math.round(hs * 0.56), hy - Math.round(hs * 0.14), Math.round(hs * 1.12), Math.round(hs * 0.42), Math.round(hs * 0.2), hair);
      roundRect(ctx, cx - Math.round(tw * 0.32), y + Math.round(th * 0.62), Math.round(tw * 0.64), th, 8, k === 'junie' ? PLACE.sunHi : PLACE.textileHi);
      if (k === 'rae') {
        // the candles: a small cake held up to the camera, five candles, lit from "maya joined" (a flame's flicker in two
        //   steps a second at most)
        const kx = cx - 22, ky = y + th - 22;
        roundRect(ctx, kx, ky, 44, 18, 3, CAL_2026.paper);
        px(ctx, kx, ky + 7, 44, 3, CAL_2026.transPink);
        for (let c = 0; c < 5; c++) {
          const sx = kx + 5 + c * 8;
          px(ctx, sx, ky - 7, 2, 7, c % 2 ? CAL_2026.transBlue : CAL_2026.transWhite);
          if (this.candles) {
            const tall = (Math.floor(t * 2) + c) % 2 === 0;
            px(ctx, sx, ky - (tall ? 11 : 10), 2, tall ? 4 : 3, CAL_2026.bulb);
          }
        }
      }
      ctx.font = monoFor(9);
      const name = k === 'junie' ? B11.friends.junie : B11.friends.rae, nw = Math.ceil(ctx.measureText(name).width) + 8;
      const was2 = ctx.globalAlpha; ctx.globalAlpha = 0.8; px(ctx, x + 2, y + 2, nw, 12, ERA4.field); ctx.globalAlpha = was2;
      ctx.fillStyle = WEB.card; ctx.fillText(name, x + 6, y + 3);
    });
  }

  private drawChat(ctx: CanvasRenderingContext2D, r: Rect, push: (h: Hit) => void): void {
    px(ctx, r.x, r.y, r.w, r.h, ERA4.field);
    const chipH = 30, foot = this.asking ? chipH + 14 : 6;
    const lineH = 16, maxW = r.w - 16;
    const rows: { who: string; text: string; sys?: boolean; first: boolean }[] = [];
    setFont(ctx, 12);
    for (const l of this.chat.slice(-16)) {
      const lead = l.sys ? '' : `${l.who}  `;
      const lw = Math.ceil(ctx.measureText(lead).width);
      const lines: string[] = [];
      let cur = '', first = true;
      for (const word of l.text.split(' ')) {
        const test = cur ? `${cur} ${word}` : word;
        if (cur && ctx.measureText(test).width > maxW - (first ? lw : 10)) { lines.push(cur); cur = word; first = false; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      lines.forEach((text, i) => rows.push({ who: i === 0 ? l.who : '', text, sys: l.sys, first: i === 0 }));
    }
    const fit = Math.floor((r.h - foot - 8) / lineH);
    const shown = rows.slice(-fit);
    let y = r.y + r.h - foot - shown.length * lineH - 4;
    shown.forEach((row, i) => {
      const newest = i >= shown.length - 2;
      let x = r.x + 8;
      if (row.sys) { setFont(ctx, 12); ctx.fillStyle = PLACE.textileHi; ctx.fillText(row.text, x, y); y += lineH; return; }
      if (row.first && row.who) {
        setFont(ctx, 12); ctx.fillStyle = row.who === 'junie' || row.who === 'rae' ? PLACE.textileHi : PLACE.sunHi;
        ctx.fillText(row.who, x, y); x += Math.ceil(ctx.measureText(`${row.who}  `).width);
      } else if (!row.first) x += 10;
      setFont(ctx, 12); ctx.fillStyle = newest && !this.frozen ? ERA4.textHi : ERA4.text;
      ctx.fillText(row.text, x, y);
      y += lineH;
    });
    // her one act: dance · stay — the people's colour, her press
    if (this.asking) {
      const gap = 8, cw = Math.floor((r.w - 16 - gap) / 2), cy = r.y + r.h - chipH - 8;
      ST.chips.forEach((c, k) => {
        const cx = r.x + 8 + k * (cw + gap);
        pill(ctx, cx, cy, cw, chipH, PLACE.textileHi);
        setFont(ctx, 13); ctx.fillStyle = PLACE.ink;
        const tw = Math.ceil(ctx.measureText(c).width);
        ctx.fillText(c, cx + Math.round((cw - tw) / 2), cy + 8);
        const h: Hit = { x: cx - 2, y: cy - 4, w: cw + 4, h: chipH + 8, id: `a4-${c}` };
        this.hits.push(h); push(h);
      });
    }
  }

  /** the dark after it: Junie's line, then L's, then the update's report — one at a time, each alone on the black */
  private drawDark(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    if (this.junie) {
      // her message, as it arrives on a sleeping screen: her mark, her name, her words (lowercase, her own)
      setFont(ctx, 21);
      const tw = Math.ceil(ctx.measureText(this.junie).width), cw = Math.max(280, tw + 84), ch = 78;
      const cx = Math.round((W - cw) / 2), cy = Math.round(H * 0.4 - ch / 2);
      roundEdge(ctx, cx, cy, cw, ch, 12, ERA4.rule, ERA4.panel);
      roundRect(ctx, cx + 16, cy + 20, 38, 38, 19, KETTLE.avatarJunie);
      setFont(ctx, 17); ctx.fillStyle = WEB.ink; ctx.fillText('J', cx + 30, cy + 29);
      setFont(ctx, 12); ctx.fillStyle = ERA4.text; ctx.fillText(KETTLE_NAME, cx + 68, cy + 14);
      setFont(ctx, 21); ctx.fillStyle = ERA4.textHi; ctx.fillText(this.junie, cx + 68, cy + 36);
    }
    if (this.lWords !== null) {
      // L, in its own mint, its mark and its words as the voice reaches them
      assistantMark(ctx, Math.round(W / 2) - 13, Math.round(H * 0.34), 26, ERA4.l, ERA4.field);
      setFont(ctx, 20); ctx.fillStyle = ERA4.l;
      const rows = wrapRich(ctx, this.lWords, W - 120, 20);
      rows.forEach((row, i) => drawLine(ctx, row, Math.round((W - row.w) / 2), Math.round(H * 0.34) + 42 + i * 28, 20, ERA4.l));
    }
    if (this.title) {
      setFont(ctx, 26); ctx.fillStyle = ERA4.textHi;
      const tw = Math.ceil(ctx.measureText(this.title).width);
      ctx.fillText(this.title, Math.round((W - tw) / 2), Math.round(H / 2) - 12);
    }
  }

  /** while it grows out of Junie's link (over her thread), and her cursor on the link before it does */
  drawOver(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.grow > 0 && this.growFrom) {
      const e = this.grow * this.grow * (3 - 2 * this.grow), f = this.growFrom;
      const r = { x: Math.round(f.x * (1 - e)), y: Math.round(f.y * (1 - e)), w: Math.round(f.w + (W - f.w) * e), h: Math.round(f.h + (H - f.h) * e) };
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.translate(r.x, r.y); ctx.scale(r.w / W, r.h / H);
      this.drawStream(ctx, W, H, () => undefined, true);
      ctx.restore();
    }
    const c = this.junieCursor;
    if (c) drawCursor(ctx, Math.round(c.x * W), Math.round(c.y * H), PLACE.sunHi, c.pressing, B11.friends.junie, W);
  }
  /** the stream begins to grow out of the link's rect (monitor coordinates) */
  growOut(from: Rect): void { this.growFrom = from; this.grow = 0.0001; this.version++; }
}

