/**
 * ⚑ S392 (UiB job 26 Part B; S390 before it) — THE THREE TVs: where the piece takes everyone, and what they can go on watching.
 *
 * His 15 Nov answers on the v3 tapes and on job 25 B's page, built here (UIB_JOB_26 B0–B3; TEACHING_TAPES_V4_PLAN §4):
 *
 *  · OPTION A ("choose option A"). ONCE PER ROOM THE PIECE TAKES THE VISITOR TO THE TV (`TvMoment`), at one beat of the
 *    era's story, never a look, never during a felt or respite scene, never while another voice speaks: the TV turns on with
 *    its leader, the programme's call is said (1997 and 2016: Lamby, in the era's skin — "the TV is behind you. I'll take
 *    you there"; 2026: Dad's link), the view is conducted to it (in a headset one cut), and the tape plays FROM ITS START —
 *    the label, the title, Part 1 and the first commercial — and STOPS BY ITSELF at "End of Part 1" (Part A's
 *    `partOneEnd`), on the programme's own end card. After a breath the view is taken back to the desk, unless the visitor
 *    has pressed ▶ to play on. The 59 s montage of S390 is gone.
 *  · THE WHOLE TAPE WAITS ON THE SAME TV (`TeachingTv`): its controls drawn on its glass in its era's player — a 1997 VCR's
 *    on-screen display, a 2016 DVD player's (his "this was a DVD": no skip button; during the disc's trailers only pause),
 *    the 2026 display's — ▶/❚❚, ⏮ ⏭ (the chapters), ⏏ (stop, the place kept). If the visitor stops, it stays where they
 *    stopped; ▶ goes on from there, in the room and on the era's website. It never jumps to the end. A press is resolved on
 *    release (app.ts's one input seam, S80). Nothing counts down. When the story speaks the TV pauses itself; at the era's
 *    update it stops.
 *  · THE MARGIN AND THE CAPTIONS ARE DRAWN LIVE (`RecordPanel`, B2): Part A's margin.json and captions.vtt, in the record's
 *    style, on a panel that hangs just under the TV in the view, its capitals at 1.32° from the seat (data/room/teaching_tvs.json
 *    `panel`). It pauses and resumes with the tape (it is the tape's second that chooses the line) and uploads only when its
 *    words change.
 *  · THE GLASS UPLOADS ONLY WHILE A NEW PICTURE EXISTS: playing, one upload per new video frame; paused, stopped or off,
 *    nothing (counted by makeScreenTexture's own counter, `window.__uploads`).
 *
 * The bodies are room props (data/room/reinterp_deltas.json); placements in data/room/teaching_tvs.json; words in
 * data/strings/teaching_tv.json. The tape's own words are Part A's, in its picture and its files; Lamby never voices,
 * reads or delivers them.
 */
import * as pc from 'playcanvas';
import tvData from '../../data/room/teaching_tvs.json';
import words from '../../data/strings/teaching_tv.json';
import { TAPES, TAPE_IDS, TAPE_ERA, placeOf, chapterAt, marginAt, cueAt, screenAt, clock,
  type TapeId, type Chapter, type TapeData } from '../narrative/teachingTapes';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import { adoptOneShot, roomBed } from '../audio/tapeAudio';
import { ERA1 } from '../desktop/theme/era1';
import { ERA3 } from '../desktop/theme/era3';
import { ERA4 } from '../desktop/theme/era4';
import { RECORD } from '../desktop/theme/witness';
import { FACES, VENDORED } from '../desktop/theme/fonts';
import { holdVoice, releaseVoice, setVoiceWanted } from '../state/voiceHold';

type Style = 'vcr' | 'dvd' | 'hedge';
type Facing = 'south' | 'north' | 'east' | 'west';
interface TvSpec { era: string; tube: string; glass: { pos: number[]; w: number; h: number; facing: Facing }; canvas: number[]; picture: 'fill' | 'letterbox'; style: Style; seat: number[];
  /** the margin panel nearer the eye and smaller by the same factor (its letters keep their angle): 2026's room has the old
   *  monitor and her headset on its stand between the seat and where the panel would hang */
  panelScale?: number }
const SPECS = (tvData as unknown as { tvs: Record<TapeId, TvSpec> }).tvs;
const PANEL = (tvData as unknown as { panel: { dist: number; w: number; h: number; canvas: number[]; capDeg: number; gapDeg: number } }).panel;
const MOMENT = (tvData as unknown as { moment: { turnSecondsPerDegree: number; turnMin: number; turnMax: number; arriveHold: number; callHold: number; afterHold: number; afterDad: number; noPlayRelease: number } }).moment;
/** the conducted moment's clock (data/room/teaching_tvs.json `moment`), for the engine's triggers */
export const TV_MOMENT = MOMENT;
const W = words as unknown as {
  tapes: Record<TapeId, { leader: string[]; listHead: string; osd?: Record<string, string>; dadLine?: string; dadLink?: string; dadToast?: string }>;
  player: Record<string, string>; panel: Record<string, string>; lamby: Record<string, string> & { call: Record<string, string> } };
const P = W.player;
const FACING_YAW: Record<Facing, number> = { south: 0, east: 90, north: 180, west: -90 };
const D2R = Math.PI / 180;

export interface Hit { id: string; x: number; y: number; w: number; h: number }
/** `partOne` = stopped by itself on the end card of Part 1 (option A); `ended` = at the tape's own end */
export type TvState = 'off' | 'leader' | 'loading' | 'playing' | 'paused' | 'partOne' | 'ended' | 'stopped' | 'error';

/** a palette colour at an alpha (the colour is the palette's own; only its opacity is set) */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** each era's player in its own colours and face (palettes from src/desktop/theme/ only) */
const LOOK: Record<Style, { face: string; bg: string; ink: string; dim: string; accent: string; panel: string; edge: string; blue: string; weight: string }> = {
  vcr: { face: FACES.e1.family, bg: ERA1.black, ink: ERA1.white, dim: ERA1.silver, accent: ERA1.ok, panel: ERA1.navy, edge: ERA1.grey, blue: ERA1.navy, weight: '' },
  dvd: { face: FACES.e3.family, bg: ERA3.ink, ink: ERA3.white, dim: ERA3.glassEdge, accent: ERA3.accent, panel: ERA3.taskBot, edge: ERA3.greyDk, blue: ERA3.deskTop, weight: '600 ' },
  hedge: { face: FACES.e4.family, bg: ERA4.field, ink: ERA4.textHi, dim: ERA4.dim, accent: ERA4.text, panel: ERA4.panel, edge: ERA4.ruleHi, blue: ERA4.field, weight: '600 ' }
};

/** the glass, in world terms, for the press resolver and the walker (same columns convention as era3Devices' hitPlane) */
function hitPlane(entity: pc.Entity, LW: number, LH: number, ray: { p0: pc.Vec3; p1: pc.Vec3 }): { x: number; y: number } | null {
  const m = entity.getWorldTransform().data;
  const cx = m[12], cy = m[13], cz = m[14];
  const nX = m[4], nY = m[5], nZ = m[6];
  const dx = ray.p1.x - ray.p0.x, dy = ray.p1.y - ray.p0.y, dz = ray.p1.z - ray.p0.z;
  const denom = dx * nX + dy * nY + dz * nZ;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((cx - ray.p0.x) * nX + (cy - ray.p0.y) * nY + (cz - ray.p0.z) * nZ) / denom;
  if (t < 0 || t > 1) return null;
  const px = ray.p0.x + dx * t - cx, py = ray.p0.y + dy * t - cy, pz = ray.p0.z + dz * t - cz;
  const rl = Math.hypot(m[0], m[1], m[2]) || 1, hl = Math.hypot(m[8], m[9], m[10]) || 1;
  const lx = (px * m[0] + py * m[1] + pz * m[2]) / rl, lz = (px * m[8] + py * m[9] + pz * m[10]) / hl;
  const u = lx / rl + 0.5, v = 0.5 + lz / hl;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { x: u * LW, y: v * LH };
}

/** a bearing from the seat's eye: yaw (the camera's convention: atan2(−dx, −dz)), pitch, and the horizontal distance */
function bearing(seat: number[], p: number[]): { yaw: number; pitch: number; dist: number } {
  const dx = p[0] - seat[0], dy = p[1] - seat[1], dz = p[2] - seat[2], h = Math.hypot(dx, dz);
  return { yaw: Math.atan2(-dx, -dz) / D2R, pitch: Math.atan2(dy, h) / D2R, dist: Math.hypot(h, dy) };
}
/** the point `d` metres from the eye at a yaw and pitch (degrees) */
function along(seat: number[], yaw: number, pitch: number, d: number): pc.Vec3 {
  const c = Math.cos(pitch * D2R);
  return new pc.Vec3(seat[0] - Math.sin(yaw * D2R) * c * d, seat[1] + Math.sin(pitch * D2R) * d, seat[2] - Math.cos(yaw * D2R) * c * d);
}

/**
 * ⚑ S392 (B2) — THE PIECE'S MARGIN BESIDE THE TAPE: what is being said (the captions) and where it was taught or what is
 * known (the margin), in the record's palette and face, on a panel that hangs under the TV in the view and faces the seat.
 * Its capitals are `capDeg` tall from the seat's eye, whatever the panel's distance (measured: tools/s392-tv-probe.mjs).
 */
class RecordPanel {
  readonly entity: pc.Entity;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly tex: pc.Texture;
  private readonly plane: pc.Entity;
  private key = '\u0000';
  /** what the last draw put up, for the probe: the capital height in canvas px, the lines, the font px */
  shown: { cue: string | null; margin: string | null; capPx: number; fontPx: number; lines: number; contentH: number } = { cue: null, margin: null, capPx: 0, fontPx: 0, lines: 0, contentH: 0 };
  draws = 0;
  /** the last words it drew (the probe reads why it uploaded) */
  readonly recent: string[] = [];
  constructor(app: pc.AppBase, name: string, private readonly center: pc.Vec3, eye: pc.Vec3, private readonly k = 1) {
    const [cw, ch] = PANEL.canvas;
    this.canvas = document.createElement('canvas');
    this.canvas.width = cw; this.canvas.height = ch;
    this.ctx = this.canvas.getContext('2d');
    this.tex = makeScreenTexture(app, this.canvas, 'screen');
    this.entity = new pc.Entity(`${name}-anchor`);
    this.entity.setPosition(center);
    this.plane = makeScreenEntity(name, this.tex, PANEL.w * k, PANEL.h * k, true);
    this.plane.setLocalEulerAngles(90, 180, 0);   // the plane's normal on the anchor's −Z, which looks at the seat's eye
    this.entity.addChild(this.plane);
    app.root.addChild(this.entity);
    this.entity.lookAt(eye);
    this.entity.enabled = false;
  }
  /** the canvas px per metre, and the capital height asked for, in px, at this panel's distance */
  private capPx(): number {
    const pxPerM = PANEL.canvas[1] / (PANEL.h * this.k);
    return PANEL.dist * this.k * Math.tan(PANEL.capDeg * D2R) * pxPerM;
  }
  set(cue: string | null, margin: { kind: string; text: string } | null, on: boolean): void {
    const show = on && (!!cue || !!margin);
    if (this.entity.enabled !== show) this.entity.enabled = show;
    if (!show) return;
    const key = `${cue ?? ''}\u0001${margin ? `${margin.kind}:${margin.text}` : ''}`;
    if (key === this.key) return;
    this.key = key;
    this.recent.push(key.replace('\u0001', ' || ').slice(0, 60)); if (this.recent.length > 12) this.recent.shift();
    this.draw(cue, margin);
    this.tex.upload();
  }
  hide(): void { if (this.entity.enabled) this.entity.enabled = false; }
  redraw(): void { this.key = '\u0000'; }
  private draw(cue: string | null, margin: { kind: string; text: string } | null): void {
    const c = this.ctx; if (!c) return;
    this.draws++;
    const [cw, ch] = PANEL.canvas;
    c.clearRect(0, 0, cw, ch);
    const face = `"${VENDORED.bitmap}", ${FACES.e1.family}`;
    // the capital height asked for → the font size, from the face's own capital (measured on 'H' at 100 px)
    c.font = `100px ${face}`;
    const m = c.measureText('H');
    const capRatio = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent / 100 : 0.62;
    const cap = this.capPx();
    const fontPx = Math.ceil(cap / capRatio);
    const lh = Math.round(fontPx * 1.24);
    const pad = Math.round(fontPx * 0.42);
    const inner = cw - pad * 2;
    c.font = `${fontPx}px ${face}`;
    const wrap = (text: string): string[] => {
      const out: string[] = [];
      for (const para of text.split('\n')) {
        let line = '';
        for (const w of para.split(/\s+/).filter(Boolean)) {
          const t = line ? `${line} ${w}` : w;
          if (c.measureText(t).width <= inner || !line) line = t; else { out.push(line); line = w; }
        }
        if (line) out.push(line);
      }
      return out;
    };
    const tag = margin ? (W.panel[margin.kind] ?? margin.kind) : '';
    const marLines = margin ? wrap(`${tag} · ${margin.text}`) : [];
    // a cue's own line breaks are the film's layout (≤ 42 characters a line); kept while they fit, and flowed as one
    //   paragraph when they would not (the probe found 2026's first label frame at 11 lines, out of the frame)
    let capLines = cue ? wrap(cue) : [];
    if (cue && capLines.length + marLines.length > 7) capLines = wrap(cue.replace(/\s*\n\s*/g, ' '));
    const rule = capLines.length && marLines.length ? Math.round(lh * 0.45) : 0;
    const contentH = pad * 2 + (capLines.length + marLines.length) * lh + rule;
    const h = Math.min(ch, contentH);
    // the record's panel, only as tall as what it says, anchored at the top (just under the TV in the view)
    c.fillStyle = hexA(RECORD.panel, 0.9); c.fillRect(0, 0, cw, h);
    c.fillStyle = RECORD.line; c.fillRect(0, 0, cw, 3); c.fillRect(0, h - 3, cw, 3); c.fillRect(0, 0, 3, h); c.fillRect(cw - 3, 0, 3, h);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const base = (i: number): number => pad + i * lh + Math.round((lh + cap) / 2) - Math.round(lh * 0.08);
    let y = 0;
    c.fillStyle = RECORD.ink;
    capLines.forEach((l, i) => { if (base(i) < ch) c.fillText(l, pad, base(i)); });
    y = capLines.length;
    if (rule) { c.fillStyle = RECORD.line; c.fillRect(pad, pad + y * lh + Math.round(rule / 2) - 2, inner, 3); }
    marLines.forEach((l, i) => {
      const yy = base(y + i) + rule;
      if (yy >= ch) return;
      if (i === 0 && l.startsWith(tag)) {
        c.fillStyle = RECORD.dim; c.fillText(`${tag} ·`, pad, yy);
        const tw = c.measureText(`${tag} · `).width;
        c.fillStyle = RECORD.ink; c.fillText(l.slice(tag.length + 3), pad + tw, yy);
      } else { c.fillStyle = RECORD.ink; c.fillText(l, pad, yy); }
    });
    this.shown = { cue, margin: margin ? `${tag} · ${margin.text}` : null, capPx: cap, fontPx, lines: capLines.length + marLines.length, contentH };
  }
  /** the panel's top edge, centre (world), for the conducted view and the probe */
  get worldCenter(): pc.Vec3 { return this.center.clone(); }
}

/**
 * ONE TV: its glass, its video, its player, its margin. The video element is never put on the page; its pictures are drawn
 * on the glass's canvas (as the setup's opening film and the site viewer's film are), under the mixer's FILM channel and in
 * the one-shot set, so the frame's mute, the menu's hold and the idle cycle's mute reach its sound (adoptOneShot).
 */
export class TeachingTv {
  readonly spec: TvSpec;
  readonly entity: pc.Entity;
  readonly canvas: HTMLCanvasElement;
  readonly panel: RecordPanel;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly tex: pc.Texture;
  private readonly look: (typeof LOOK)[Style];
  state: TvState = 'off';
  hits: Hit[] = [];
  private video: HTMLVideoElement | null = null;
  private loaded = false;
  private pendingSeek: number | null = null;
  private wantPlay = false;
  private lastFrame = -1;
  private dirty = true;
  /** the tape's second last frame, to see it CROSS the end of Part 1 while playing (a seek past it does not stop it) */
  private prevT = -1;
  /** the visitor paused it themselves (not the menu, not the story) */
  userPaused = false;
  /** play() was refused with sound and it plays muted: a press on the chip gives the sound (a gesture) */
  needsSound = false;
  /** the era's update stopped it, or the visitor's ⏏: what the stopped screen says */
  private stopNote: string | null = null;
  /** the visible era says this TV is in the room */
  private inEra = false;
  /** draws and uploads, for the probe (uploads are also counted globally by makeScreenTexture) */
  draws = 0;
  /** seconds the tape has been "playing" with its clock standing still (an audio output that never opens holds a playing
   *  element at 0:00 — measured on this machine's headless Chrome after the device slept); see `update` */
  stalledFor = 0;
  private stallT = -1;
  private readonly LW: number;
  private readonly LH: number;
  /** where the conducted view looks: the TV and the margin under it, together */
  readonly viewPoint: pc.Vec3;

  constructor(app: pc.AppBase, readonly tape: TapeId) {
    this.spec = SPECS[tape];
    this.look = LOOK[this.spec.style];
    [this.LW, this.LH] = this.spec.canvas;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.LW; this.canvas.height = this.LH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = makeScreenTexture(app, this.canvas, 'screen');
    const g = this.spec.glass;
    this.entity = makeScreenEntity(`teaching-tv-${tape}`, this.tex, g.w, g.h);
    this.entity.setLocalPosition(g.pos[0], g.pos[1], g.pos[2]);
    this.entity.setLocalEulerAngles(90, FACING_YAW[g.facing], 0);
    this.entity.enabled = false;
    app.root.addChild(this.entity);
    // the margin panel: under the glass in the view, `gapDeg` below its lower edge, `dist` from the eye, facing it
    const seat = this.spec.seat, b = bearing(seat, g.pos);
    const half = Math.atan2(g.h / 2, b.dist) / D2R;
    const panelHalf = Math.atan2(PANEL.h / 2, PANEL.dist) / D2R;
    const top = b.pitch - half - PANEL.gapDeg;
    const eye = new pc.Vec3(seat[0], seat[1], seat[2]);
    const k = this.spec.panelScale ?? 1;
    this.panel = new RecordPanel(app, `teaching-margin-${tape}`, along(seat, b.yaw, top - panelHalf, PANEL.dist * k), eye, k);
    // the conducted view: the TV's top and about six lines of the margin, centred (the six lines are 6 × 1.24 × capDeg/0.62)
    const marginDeg = 6 * 1.24 * PANEL.capDeg / 0.62 + 2;
    this.viewPoint = along(seat, b.yaw, ((b.pitch + half) + (top - marginDeg)) / 2, b.dist);
  }

  get data(): TapeData { return TAPES[this.tape]; }
  get size(): { w: number; h: number } { return { w: this.LW, h: this.LH }; }
  get playing(): boolean { return this.state === 'playing' || (this.state === 'loading' && this.wantPlay); }
  /** heard right now (the kit's and the platform's own loops yield to it) */
  get audible(): boolean { return this.state === 'playing' && !!this.video && !this.video.muted && !this.video.paused; }
  get time(): number { return this.video && this.loaded ? this.video.currentTime : placeOf(this.tape).t; }
  get chapterIndex(): number { return chapterAt(this.data, this.time); }
  get chapter(): Chapter | undefined { return this.data.chapters[this.chapterIndex]; }
  get glassCentre(): pc.Vec3 { const p = this.spec.glass.pos; return new pc.Vec3(p[0], p[1], p[2]); }
  /** the disc's trailers (2016): the controls show only pause, as a DVD's did */
  private get inTrailer(): boolean { return this.chapter?.kind === 'trailer'; }

  setInEra(on: boolean): void {
    if (on === this.inEra) return;
    this.inEra = on;
    if (!on && this.state !== 'off') this.stop(null);
    this.sync();
  }
  private sync(): void { this.entity.enabled = this.inEra && this.state !== 'off'; if (!this.entity.enabled) this.panel.hide(); }

  // ── the video ─────────────────────────────────────────────────────────────
  private element(): HTMLVideoElement {
    if (this.video) return this.video;
    const v = document.createElement('video');
    v.preload = 'auto'; v.playsInline = true; v.controls = false; v.disablePictureInPicture = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('disablepictureinpicture', '');
    v.crossOrigin = null;
    const mine = (): boolean => this.video === v;
    v.addEventListener('playing', () => { if (!mine()) return; this.state = 'playing'; this.userPaused = false; this.stopNote = null; this.dirty = true; });
    v.addEventListener('waiting', () => { if (mine() && !v.paused) { this.state = 'loading'; this.dirty = true; } });
    v.addEventListener('pause', () => {
      if (!mine() || v.ended) return;
      this.note();
      if (this.state === 'playing' || this.state === 'loading') this.state = this.stopNote ? 'stopped' : 'paused';
      this.wantPlay = false; this.dirty = true;
    });
    v.addEventListener('ended', () => { if (mine()) this.ended(); });
    v.addEventListener('error', () => { if (mine()) { this.state = 'error'; this.wantPlay = false; this.dirty = true; } });
    v.addEventListener('loadedmetadata', () => {
      if (!mine()) return;
      if (this.pendingSeek !== null) { v.currentTime = Math.min(this.pendingSeek, Math.max(0, (v.duration || 0) - 0.05)); this.pendingSeek = null; }
    });
    v.addEventListener('seeked', () => { if (mine()) { this.lastFrame = -1; this.prevT = v.currentTime; this.dirty = true; } });
    v.addEventListener('loadeddata', () => { if (mine()) this.dirty = true; });
    v.addEventListener('timeupdate', () => { if (mine() && !v.paused) this.note(); });
    this.video = v;
    return v;
  }
  /** keep the place (memory only) */
  private note(): void {
    const v = this.video; if (!v || !this.loaded) return;
    const p = placeOf(this.tape);
    p.t = v.currentTime; p.started = true;
  }
  /** fetch the tape ahead of the moment (when its era begins), so it starts at once */
  preload(): void { this.load(placeOf(this.tape).t); }
  private load(t: number): void {
    const v = this.element();
    if (!this.loaded) {
      this.loaded = true;
      this.pendingSeek = t > 0.01 ? t : null;
      v.src = this.data.room.file;   // the project's own static file, same origin (the no-network law: no request is made by code)
      v.load();
    } else if (Math.abs(v.currentTime - t) > 0.05) {
      if (v.readyState >= 1) v.currentTime = t; else this.pendingSeek = t;
    }
    this.prevT = t;
    // a seek that lands past the end of Part 1 means it is behind the visitor now: it never stops there
    if (t >= this.data.partOneEnd) placeOf(this.tape).partOneSeen = true;
    this.lastFrame = -1; this.dirty = true;
  }
  /** play from `t` (the visitor's ▶, a chapter, or the conducted tape from its start) */
  play(t: number): void {
    this.load(t);
    const v = this.element();
    adoptOneShot(v, `teaching_${this.tape}.mp4`, 'film');
    this.wantPlay = true; this.userPaused = false; this.stopNote = null;
    if (this.state !== 'playing') this.state = 'loading';
    placeOf(this.tape).started = true;
    this.sync();
    const attempt = v.play();
    attempt?.catch((err: { name?: string }) => {
      if (this.video !== v) return;
      // ⚑ iOS / a browser without the entrance's gesture: the sound needs a press. Play it muted (the captions are drawn
      //   beside it) and put a "Press for sound" chip on the glass; that press is the gesture.
      if (err?.name === 'NotAllowedError' && !v.muted) {
        v.muted = true; this.needsSound = true; this.dirty = true;
        v.play().catch(() => { if (this.video === v && v.paused) { this.state = 'paused'; this.wantPlay = false; this.dirty = true; } });
      } else if (v.paused) { this.state = v.error ? 'error' : 'paused'; this.wantPlay = false; this.dirty = true; }
    });
    this.dirty = true;
  }
  pause(by: 'visitor' | 'story' | 'menu' = 'visitor'): void {
    const v = this.video;
    if (by === 'visitor') this.userPaused = true;
    if (by === 'story') this.stopNote = null;
    if (v && !v.paused) v.pause();
    this.wantPlay = false;
    if (this.state === 'loading') this.state = 'paused';
    this.dirty = true;
  }
  /** ⏏ — or the era's update: paused, the place kept, the stopped screen */
  stop(note: string | null): void {
    const v = this.video;
    this.stopNote = note ?? P.ejected;
    if (v && !v.paused) v.pause();
    this.note();
    this.wantPlay = false;
    if (this.state !== 'off') this.state = 'stopped';
    this.dirty = true;
  }
  /** the leader: the TV is on, the tape's label on the glass, before it rolls */
  showLeader(): void { this.state = 'leader'; this.dirty = true; this.sync(); this.preload(); }
  private ended(): void {
    const p = placeOf(this.tape);
    p.t = this.data.duration; p.partOneSeen = true;
    this.state = 'ended'; this.wantPlay = false; this.dirty = true;
  }
  /** ⚑ OPTION A — the tape crossed the end of Part 1 while playing: it stops by itself on the programme's end card */
  private stopAtPartOne(): void {
    const v = this.video, p = placeOf(this.tape);
    p.partOneSeen = true;
    if (v && !v.paused) v.pause();
    if (v && Math.abs(v.currentTime - this.data.partOneEnd) > 0.1) v.currentTime = this.data.partOneEnd;
    p.t = this.data.partOneEnd;
    this.wantPlay = false; this.userPaused = false;
    this.state = 'partOne'; this.dirty = true;
  }
  /** the conducted moment is let go of before Part 1 ended (paused, stopped, or it would not play): it never stops there */
  markPartOneSeen(): void { placeOf(this.tape).partOneSeen = true; }

  // ── the visitor's presses ────────────────────────────────────────────────
  pressAt(x: number, y: number): boolean {
    if (this.state === 'off') return false;
    const h = [...this.hits].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return true;   // a press on a lit glass is the TV's, even between its controls
    this.press(h.id);
    return true;
  }
  press(id: string): void {
    const v = this.video, p = placeOf(this.tape), d = this.data;
    if (id === 'tv-sound') { if (v) { v.muted = false; } this.needsSound = false; this.dirty = true; return; }
    if (id === 'tv-pause') { this.pause('visitor'); return; }
    if (id === 'tv-play') {
      if (this.state === 'ended') { this.play(0); return; }   // the tape's own end: from the start again
      if (this.state === 'leader') { this.play(0); return; }
      this.play(v && this.loaded ? v.currentTime : p.t);     // from where it stopped — never a jump
      return;
    }
    if (id === 'tv-eject') { this.stop(P.ejected); return; }
    if (id === 'tv-prev' || id === 'tv-next') {
      const t = v && this.loaded ? v.currentTime : p.t, i = chapterAt(d, t), ch = d.chapters;
      let to: number;
      if (id === 'tv-next') to = i + 1 < ch.length ? ch[i + 1].start : d.duration;
      else to = t - ch[i].start > 3 || i === 0 ? ch[i].start : ch[i - 1].start;
      if (to >= d.duration - 0.05) { if (v) v.currentTime = d.duration; this.ended(); return; }
      const resume = this.state === 'playing' || this.state === 'loading';
      if (resume) this.play(to);
      else { this.load(to); if (this.state === 'ended' || this.state === 'stopped' || this.state === 'partOne') this.state = 'paused'; p.t = to; }
      return;
    }
    if (id.startsWith('tv-ch-')) {
      const cid = id.slice(6), c = d.chapters.find((k) => k.id === cid);
      if (c) this.play(c.start);
    }
  }

  // ── the frame loop ───────────────────────────────────────────────────────
  update(dt = 1 / 60): void {
    if (this.state === 'off' || !this.entity.enabled) { this.panel.hide(); return; }
    const v = this.video;
    // OPTION A — the tape crosses the end of Part 1 while it plays (a frame's step, not a seek): it stops there, once
    if (v && this.loaded && this.state === 'playing' && !v.paused) {
      const t = v.currentTime, P1 = this.data.partOneEnd;
      if (!placeOf(this.tape).partOneSeen && this.prevT >= 0 && this.prevT < P1 && t >= P1 && t - this.prevT < 1.5) this.stopAtPartOne();
      this.prevT = t;
    }
    // a new picture: the clock counted in thirtieths of a second (the tapes are 30 frames a second), so the glass is drawn and
    //   uploaded once per frame of the tape, not once per frame of the room (the site viewer's film counts the same way)
    const tick = v ? Math.floor(v.currentTime * 30) : -1;
    if (v && (this.state === 'playing' || this.state === 'loading') && v.readyState >= 2 && tick !== this.lastFrame) {
      this.lastFrame = tick; this.dirty = true;
    }
    // ⚑ A PLAYING TAPE WHOSE CLOCK STANDS STILL is a sound device that will not open (the element says playing, the picture
    //   does not move). After 4 s it plays on muted — its captions are drawn beside it — with the "Press for sound" chip, so
    //   neither the visitor nor the conducted moment waits on a speaker that is not there.
    if (v && this.state === 'playing' && !v.paused) {
      if (Math.abs(v.currentTime - this.stallT) < 0.01) this.stalledFor += dt; else { this.stalledFor = 0; this.stallT = v.currentTime; }
      if (this.stalledFor >= 4 && !v.muted) { v.muted = true; this.needsSound = true; this.stalledFor = 0; this.dirty = true; }
    } else this.stalledFor = 0;
    if (this.audible) roomBed.duck(-12, 0.3);   // the room's music steps down under the tape; it never stops
    // the margin and the captions: the tape's own second chooses the line, so they pause and resume with it
    const t = this.time, live = this.state === 'playing' || this.state === 'loading' || this.state === 'paused' || this.state === 'partOne';
    // the large type on the picture (the label, the end card, the break) first, the spoken caption otherwise; stopped at End of
    //   Part 1 the end card's words stay up (the second is inside it), a caption does not
    const big = live ? screenAt(this.data, Math.min(t, this.data.duration - 0.01)) : null;
    const cue = big ?? (live && this.state !== 'partOne' ? cueAt(this.data, t) : null);
    const mar = live ? marginAt(this.data, t) : null;
    this.panel.set(cue?.text ?? null, mar ? { kind: mar.kind, text: mar.text } : null, live && this.loaded);
    if (!this.dirty) return;
    this.dirty = false;
    this.draw();
    this.tex.upload();
  }
  /** a repaint from outside (the faces loaded) */
  redraw(): void { this.dirty = true; this.panel.redraw(); }

  // ── the glass ────────────────────────────────────────────────────────────
  private picture(): { x: number; y: number; w: number; h: number } {
    if (this.spec.picture === 'letterbox') { const h = Math.round(this.LW * 9 / 16); return { x: 0, y: Math.round((this.LH - h) / 2), w: this.LW, h }; }
    return { x: 0, y: 0, w: this.LW, h: this.LH };
  }
  private font(px: number): string { return `${this.look.weight}${px}px ${this.look.face}`; }
  private draw(): void {
    const c = this.ctx; if (!c) return;
    this.draws++;
    const L = this.look, Wd = this.LW, Ht = this.LH, pic = this.picture();
    this.hits = [];
    c.save();
    c.fillStyle = L.bg; c.fillRect(0, 0, Wd, Ht);
    const v = this.video;
    const hasFrame = !!v && this.loaded && v.readyState >= 2 && v.videoWidth > 0 && this.state !== 'leader';
    if (hasFrame && v) {
      // the picture, scaled to fit inside its rect (a 4:3 tape stays 4:3, a 16:9 disc stays 16:9)
      const s = Math.min(pic.w / v.videoWidth, pic.h / v.videoHeight);
      const w = Math.round(v.videoWidth * s), h = Math.round(v.videoHeight * s);
      c.drawImage(v, pic.x + Math.round((pic.w - w) / 2), pic.y + Math.round((pic.h - h) / 2), w, h);
    }
    if (this.state === 'leader' || (!hasFrame && (this.state === 'loading' || this.state === 'playing'))) this.drawLeader();
    switch (this.state) {
      case 'playing': case 'loading': this.drawPlaying(); break;
      case 'paused': this.drawPaused(false); break;
      case 'partOne': this.drawPaused(true); break;
      case 'ended': this.drawList(); break;
      case 'stopped': this.drawStopped(); break;
      case 'error': this.drawError(); break;
      default: break;
    }
    if (this.needsSound && (this.state === 'playing' || this.state === 'loading')) {
      c.font = this.font(30); const tw = Math.ceil(c.measureText(P.sound).width) + 36;
      const r = { id: 'tv-sound', x: Wd - tw - 24, y: 24, w: tw, h: 56 };
      c.fillStyle = hexA(L.bg, 0.85); c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = L.ink; c.lineWidth = 3; c.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
      c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(P.sound, r.x + r.w / 2, r.y + r.h / 2 + 1);
      this.hits.push(r);
    }
    c.restore();
  }

  /** the tape's label before it rolls: a VCR's blue, the TV's input card with the assignment, the share line */
  private drawLeader(): void {
    const c = this.ctx!, L = this.look, lines = W.tapes[this.tape].leader;
    const pic = this.picture(), k = this.LH / 720;
    c.fillStyle = this.spec.style === 'vcr' ? L.blue : L.panel; c.fillRect(pic.x, pic.y, pic.w, pic.h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const cx = pic.x + pic.w / 2, cy = pic.y + pic.h / 2;
    if (this.spec.style === 'vcr') {
      c.font = this.font(32); c.fillStyle = L.dim; c.fillText(lines[0], cx, cy - 110);
      c.font = this.font(48); c.fillStyle = L.ink; c.fillText(lines[1], cx, cy - 30);
      c.font = this.font(32); c.fillStyle = L.accent; c.fillText(lines[2], cx, cy + 40);
      c.font = this.font(48); c.fillStyle = L.accent; c.textAlign = 'left'; c.fillText(`${W.tapes['1997'].osd?.play ?? 'PLAY'} ▶`, 48, 64);
    } else if (this.spec.style === 'dvd') {
      c.fillStyle = ERA3.glass; const bw = Math.round(560 * k * 1.33), bh = Math.round(230 * k * 1.33); c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
      c.fillStyle = ERA3.accent; c.fillRect(cx - bw / 2, cy - bh / 2, bw, 8);
      c.font = this.font(Math.round(26 * k * 1.33)); c.fillStyle = ERA3.greyDk; c.fillText(lines[0], cx, cy - 64 * k * 1.33);
      c.font = this.font(Math.round(32 * k * 1.33)); c.fillStyle = ERA3.accent; c.fillText(lines[1], cx, cy - 14 * k * 1.33);
      c.font = this.font(Math.round(34 * k * 1.33)); c.fillStyle = ERA3.ink; c.fillText(lines[2], cx, cy + 44 * k * 1.33);
    } else {
      c.font = this.font(Math.round(30 * k * 1.33)); c.fillStyle = L.dim; c.fillText(lines[0], cx, cy - 36 * k * 1.33);
      c.font = this.font(Math.round(52 * k * 1.33)); c.fillStyle = L.ink; c.fillText(lines[1], cx, cy + 34 * k * 1.33);
    }
    c.textAlign = 'left';
  }

  /** the row of controls (⏮ ▶/❚❚ ⏭ ⏏; during a disc's trailer only ▶/❚❚), the part and the time, over the picture's foot */
  private controls(h: number): void {
    const c = this.ctx!, L = this.look, Wd = this.LW, y = this.LH - h;
    const g = c.createLinearGradient(0, y - 40, 0, y + h);
    g.addColorStop(0, hexA(L.bg, 0)); g.addColorStop(0.35, hexA(L.bg, 0.78)); g.addColorStop(1, hexA(L.bg, 0.92));
    c.fillStyle = g; c.fillRect(0, y - 40, Wd, h + 40);
    const playing = this.state === 'playing' || this.state === 'loading';
    const bh = Math.min(h - 16, 84), bw = Math.round(bh * 1.35), gap = 14, top = Math.round(y + (h - bh) / 2);
    const toggle: [string, string] = [playing ? 'tv-pause' : 'tv-play', playing ? '❚❚' : '▶'];
    const items: [string, string][] = this.inTrailer ? [toggle] : [['tv-prev', '⏮'], toggle, ['tv-next', '⏭'], ['tv-eject', '⏏']];
    let x = 28;
    for (const [id, glyph] of items) {
      const r = { id, x, y: top, w: bw, h: bh };
      this.button(r, glyph);
      this.hits.push(r);
      x += bw + gap;
    }
    // the part and the time, right of the buttons; a DVD's and a 2026 display's progress line along the top edge of the row
    const d = this.data, t = this.time, ch = this.chapter;
    c.font = this.font(Math.round(bh * 0.4)); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'right';
    c.fillText(`${clock(t)} / ${clock(d.duration)}`, Wd - 28, top + Math.round(bh * 0.3));
    c.font = this.font(Math.round(bh * 0.32)); c.fillStyle = L.dim;
    let title = ch?.title ?? '';
    const room = Wd - 28 - x - 12;
    while (title.length > 4 && c.measureText(title).width > room) title = title.slice(0, -2);
    if (title !== (ch?.title ?? '')) title = title.trimEnd() + '…';
    c.fillText(title, Wd - 28, top + Math.round(bh * 0.76));
    c.textAlign = 'left';
    if (this.spec.style !== 'vcr') {
      const sy = y - 6, k = d.duration > 0 ? Math.min(1, t / d.duration) : 0;
      c.fillStyle = hexA(L.ink, 0.35); c.fillRect(28, sy, Wd - 56, 6);
      c.fillStyle = L.accent; c.fillRect(28, sy, Math.round((Wd - 56) * k), 6);
      for (const k2 of d.chapters) { const xx = 28 + Math.round((Wd - 56) * k2.start / Math.max(1, d.duration)); c.fillStyle = L.bg; c.fillRect(xx, sy, 3, 6); }
    }
  }

  private button(r: Hit, glyph: string): void {
    const c = this.ctx!, L = this.look;
    if (this.spec.style === 'vcr') {
      // the remote's own blocky key: a bevel in the 1997 chrome
      c.fillStyle = ERA1.black; c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = ERA1.white; c.fillRect(r.x, r.y, r.w - 3, r.h - 3);
      c.fillStyle = ERA1.greyDark; c.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      c.fillStyle = ERA1.silver; c.fillRect(r.x + 3, r.y + 3, r.w - 9, r.h - 9);
      c.fillStyle = ERA1.black;
    } else if (this.spec.style === 'dvd') {
      c.fillStyle = hexA(L.ink, 0.16); c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = L.ink;
    } else {
      c.fillStyle = L.panel; c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = L.edge; c.lineWidth = 2; c.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      c.fillStyle = L.ink;
    }
    c.font = this.font(Math.round(r.h * 0.5)); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(glyph, r.x + r.w / 2, r.y + r.h / 2 + 2);
    c.textAlign = 'left';
  }

  /** while it plays: the whole picture is the pause control (a DVD's trailers too: pause is the one control they allow) */
  private drawPlaying(): void {
    const c = this.ctx!, L = this.look, pic = this.picture();
    this.hits.push({ id: 'tv-pause', x: pic.x, y: pic.y, w: pic.w, h: pic.h });
    if (this.state === 'loading') {
      const osd = W.tapes[this.tape].osd?.loading;
      if (osd) { c.font = this.font(this.spec.style === 'vcr' ? 40 : 30); c.fillStyle = L.accent; c.textBaseline = 'middle'; c.fillText(osd, 48, 64); }
    }
  }

  /** paused (by the visitor, the story or the menu), or stopped by itself at the end of Part 1 — the picture stays (the end
   *  card is the programme's own), the player's own pause sign, and the controls; at Part 1's end the ▶ says "Play on" */
  private drawPaused(partOne: boolean): void {
    const c = this.ctx!, L = this.look, pic = this.picture(), osd = W.tapes[this.tape].osd;
    const k = this.LH / 720;
    if (this.spec.style === 'vcr') {
      c.font = this.font(48); c.fillStyle = L.accent; c.textBaseline = 'middle'; c.fillText(`${osd?.pause ?? 'PAUSE'} ❚❚`, 48, 64);
    } else {
      c.fillStyle = hexA(L.bg, partOne ? 0.12 : 0.35); c.fillRect(pic.x, pic.y, pic.w, pic.h);
      c.font = this.font(Math.round(30 * k * 1.33)); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.fillText(`❚❚ ${osd?.pause ?? ''}`.trim(), 32, 44 * k * 1.33);
    }
    if (partOne) {
      // the visitor's ▶: "Play on" — Part 2 onward, from this second (never a jump)
      const label = `▶  ${P.playOn}`;
      c.font = this.font(Math.round(44 * k)); const bw = Math.ceil(c.measureText(label).width) + Math.round(64 * k), bh = Math.round(84 * k);
      const r = { id: 'tv-play', x: Math.round(this.LW - bw - 32 * k), y: Math.round(this.LH - bh - 140 * k), w: bw, h: bh };
      if (this.spec.style === 'vcr') this.button(r, '');
      else { c.fillStyle = this.spec.style === 'dvd' ? ERA3.accent : L.panel; c.fillRect(r.x, r.y, r.w, r.h); c.strokeStyle = L.ink; c.lineWidth = 2; c.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
      c.font = this.font(Math.round(44 * k)); c.fillStyle = this.spec.style === 'vcr' ? ERA1.black : L.ink; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(label, r.x + Math.round(32 * k), r.y + bh / 2 + 2);
      this.hits.push(r);
    }
    this.controls(Math.round(120 * k));
  }

  /** the tape's own end: its chapter list, each pressable, and "From the start" */
  private drawList(): void {
    const c = this.ctx!, L = this.look, pic = this.picture(), k = this.LH / 720;
    c.fillStyle = hexA(this.spec.style === 'vcr' ? L.blue : L.bg, this.spec.style === 'vcr' ? 0.92 : 0.82);
    c.fillRect(pic.x, pic.y, pic.w, pic.h);
    const rows = this.data.chapters.filter((ch) => ch.kind === 'lesson' || ch.kind === 'commercial' || ch.kind === 'collapse' || ch.kind === 'break');
    const x0 = pic.x + 40;
    let y = pic.y + 34 * k;
    c.textBaseline = 'top'; c.textAlign = 'left';
    if (this.spec.style === 'vcr') { c.font = this.font(40); c.fillStyle = L.accent; c.fillText(W.tapes['1997'].osd?.ended ?? '', x0, y); }
    else { c.font = this.font(Math.round(32 * k * 1.2)); c.fillStyle = L.dim; c.fillText(W.tapes[this.tape].listHead, x0, y); }
    y += 56 * k;
    const avail = pic.h - 220 * k;
    const rowH = Math.max(26 * k, Math.min(50 * k, Math.floor(avail / Math.max(1, rows.length))));
    const maxRows = Math.floor(avail / rowH);
    c.font = this.font(Math.round(rowH * 0.62));
    for (const ch of rows.slice(0, maxRows)) {
      const r = { id: `tv-ch-${ch.id}`, x: x0 - 8, y, w: pic.w - 80, h: rowH - 4 };
      c.fillStyle = hexA(L.ink, 0.08); c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = ch.kind === 'commercial' ? L.dim : L.ink;
      c.fillText(`▶  ${ch.title}`, x0 + 8, y + Math.round((rowH - 4) * 0.18));
      c.textAlign = 'right'; c.fillStyle = L.dim; c.fillText(clock(ch.end - ch.start), r.x + r.w - 12, y + Math.round((rowH - 4) * 0.18)); c.textAlign = 'left';
      this.hits.push(r);
      y += rowH;
    }
    const bh = Math.round(84 * k), by = pic.y + pic.h - bh - 26 * k;
    const label = `▶  ${P.playAgain}`;
    c.font = this.font(Math.round(44 * k)); const bw = Math.ceil(c.measureText(label).width) + Math.round(64 * k);
    const r = { id: 'tv-play', x: x0 - 8, y: by, w: bw, h: bh };
    if (this.spec.style === 'vcr') this.button(r, '');
    else { c.fillStyle = this.spec.style === 'dvd' ? ERA3.accent : L.panel; c.fillRect(r.x, r.y, r.w, r.h); c.strokeStyle = L.ink; c.lineWidth = 2; c.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
    c.font = this.font(Math.round(44 * k)); c.fillStyle = this.spec.style === 'vcr' ? ERA1.black : L.ink; c.textBaseline = 'middle';
    c.fillText(label, r.x + Math.round(32 * k), r.y + bh / 2 + 2);
    this.hits.push(r);
  }

  private drawStopped(): void {
    const c = this.ctx!, L = this.look, pic = this.picture(), k = this.LH / 720;
    c.fillStyle = this.spec.style === 'vcr' ? L.blue : hexA(L.bg, 0.9); c.fillRect(pic.x, pic.y, pic.w, pic.h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    if (this.spec.style === 'vcr') { c.font = this.font(48); c.fillStyle = L.accent; c.fillText(W.tapes['1997'].osd?.stop ?? '', 48, 64); }
    const p = placeOf(this.tape), ch = this.data.chapters[chapterAt(this.data, p.t)];
    c.font = this.font(Math.round(40 * k * 1.15)); c.fillStyle = L.ink; c.fillText(this.data.title, 48, pic.y + pic.h * 0.3);
    c.font = this.font(Math.round(32 * k * 1.15)); c.fillStyle = L.dim; c.fillText(`${ch?.title ?? ''} · ${clock(p.t)}`, 48, pic.y + pic.h * 0.3 + 56 * k * 1.15);
    c.fillText(this.stopNote ?? P.stopped, 48, pic.y + pic.h * 0.3 + 104 * k * 1.15);
    this.controls(Math.round(120 * k));
  }

  private drawError(): void {
    const c = this.ctx!, L = this.look, pic = this.picture();
    c.fillStyle = this.spec.style === 'vcr' ? L.blue : L.panel; c.fillRect(pic.x, pic.y, pic.w, pic.h);
    c.font = this.font(36); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(P.cannot, pic.x + pic.w / 2, pic.y + pic.h / 2); c.textAlign = 'left';
  }

  pressRay(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean {
    if (!this.entity.enabled) return false;
    const at = hitPlane(this.entity, this.LW, this.LH, ray);
    return at ? this.pressAt(at.x, at.y) : false;
  }
  /** is a ray on this glass (the pointer's "what is this" and the cursor) */
  aim(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean { return this.entity.enabled && !!hitPlane(this.entity, this.LW, this.LH, ray); }

  debug() {
    const v = this.video;
    return { tape: this.tape, entity: this.entity.name, enabled: this.entity.enabled, LW: this.LW, LH: this.LH, state: this.state,
      t: v?.currentTime ?? null, paused: v?.paused ?? null, muted: v?.muted ?? null, volume: v?.volume ?? null, src: v?.src ?? null,
      chapter: this.chapter?.id ?? null, chapterKind: this.chapter?.kind ?? null, hits: this.hits.map((h) => ({ ...h })), needsSound: this.needsSound, userPaused: this.userPaused,
      draws: this.draws, place: { ...placeOf(this.tape) }, partOneEnd: this.data.partOneEnd, duration: this.data.duration,
      glass: { pos: this.spec.glass.pos, w: this.spec.glass.w, h: this.spec.glass.h },
      panel: { enabled: this.panel.entity.enabled, draws: this.panel.draws, center: [this.panel.worldCenter.x, this.panel.worldCenter.y, this.panel.worldCenter.z],
        w: PANEL.w, h: PANEL.h, canvas: PANEL.canvas, ...this.panel.shown, recent: [...this.panel.recent] },
      viewPoint: [this.viewPoint.x, this.viewPoint.y, this.viewPoint.z] };
  }
}

/** what the conducted moment needs from the engine (app.ts implements it; nothing here moves the camera itself) */
export interface TvHost {
  /** the era the visitor is in now (the room's) */
  era(): string;
  /** the era's beat has been reached: the story may bring this tape now */
  due(tape: TapeId): boolean;
  /** no other voice, no felt scene, no update, nothing scripted, the menu shut: the floor is free. `dueFor` = seconds the
   *  moment has been due and waiting (a guide balloon is waited for only so long: it hides while the TV has the floor) */
  quiet(tape: TapeId, dueFor: number): boolean;
  /** the game menu (or the idle cycle) holds the piece: the moment's clock stops */
  held(): boolean;
  /** a conducted turn to look at a world point over `seconds` (in a headset: one cut under the dissolve) */
  conduct(target: pc.Vec3, seconds: number): void;
  /** a conducted return to the seat's own pose */
  returnToSeat(seconds: number): void;
  /** degrees between where the visitor looks now and a world point (or the seat, with no point) */
  angleTo(target: pc.Vec3 | null): number;
  /** a scripted camera move is in flight */
  cameraBusy(): boolean;
  /** the era's own arrival line (2026: Dad's message and link); 1997/2016 bring theirs on the glass */
  announce(tape: TapeId): void;
  /** ⚑ S392 — Lamby's call (1997, 2016): `text` while the call is up, null to take it down */
  call(tape: TapeId, text: string | null): void;
  /** Lamby's call balloon is still up (not yet answered or closed) */
  callOpen(): boolean;
}

export type MomentStage = 'idle' | 'arrive' | 'turn' | 'play' | 'after' | 'return' | 'done';

/** ONCE PER ROOM: the TV turns on, the call, the visitor is taken to it, the tape plays from its start to the end of Part 1, a
 *  breath on the end card, and back to the desk */
class TvMoment {
  stage: MomentStage = 'idle';
  private t = 0;
  private started = 0;
  /** Lamby's Take me there was pressed: the turn comes now */
  private go = false;
  /** the call balloon was seen up (so its closing means the visitor answered it) */
  private callSeen = false;
  /** seconds the moment has been due and waiting for the floor */
  dueFor = 0;
  /** seconds the moment took, from the TV turning on to the visitor back at the desk (the probe reports the cost) */
  seconds = 0;
  /** seconds from the TV turning on to the turn (the call's share of the cost) */
  callSeconds = 0;
  constructor(private readonly tv: TeachingTv, private readonly host: TvHost) {}
  get running(): boolean { return this.stage !== 'idle' && this.stage !== 'done'; }
  get calling(): boolean { return this.stage === 'arrive'; }
  private turnSeconds(target: pc.Vec3 | null): number {
    const a = this.host.angleTo(target);
    return Math.max(MOMENT.turnMin, Math.min(MOMENT.turnMax, a * MOMENT.turnSecondsPerDegree));
  }
  /** Lamby's Take me there, during the call */
  takeNow(): void { if (this.stage === 'arrive') this.go = true; }
  /** the era's update, a Leave or a wipe: let go of everything at once (the TV keeps its place) */
  abort(note: string | null): void {
    if (!this.running) return;
    this.tv.stop(note);
    this.tv.markPartOneSeen();
    this.host.call(this.tv.tape, null);
    releaseVoice('teaching-tv');
    this.stage = 'done';
  }
  update(dt: number): void {
    if (this.stage === 'done') return;
    const tape = this.tv.tape;
    if (this.stage === 'idle') {
      const due = this.host.due(tape);
      this.dueFor = due ? this.dueFor + dt : 0;
      if (due && this.host.quiet(tape, this.dueFor)) {
        holdVoice('teaching-tv');
        this.tv.showLeader();
        this.host.announce(tape);
        const call = W.lamby.call[TAPE_ERA[tape]];
        if (call) this.host.call(tape, call);
        this.stage = 'arrive'; this.t = 0; this.go = false; this.callSeen = false; this.started = performance.now();
      }
      return;
    }
    if (this.host.held()) return;
    this.t += dt;
    switch (this.stage) {
      case 'arrive': {
        const hasCall = !!W.lamby.call[TAPE_ERA[tape]];
        if (this.host.callOpen()) this.callSeen = true;
        // 2026: Dad's link, a breath, the turn. 1997/2016: Lamby's call — Take me there turns at once; closing it (or a call that
        //   never showed) lets the turn come after a breath; otherwise it is read for up to `callHold`
        const ready = !hasCall ? this.t >= MOMENT.arriveHold
          : this.go || this.t >= MOMENT.callHold || (this.t >= MOMENT.arriveHold && !this.host.callOpen() && (this.callSeen || this.t >= 2.5));
        if (ready && !this.host.cameraBusy()) {
          this.host.call(tape, null);
          this.callSeconds = (performance.now() - this.started) / 1000;
          this.host.conduct(this.tv.viewPoint, this.turnSeconds(this.tv.viewPoint));
          this.stage = 'turn'; this.t = 0;
        }
        break;
      }
      case 'turn':
        if (this.t > 0.2 && !this.host.cameraBusy()) { this.tv.play(0); this.stage = 'play'; this.t = 0; }
        break;
      case 'play': {
        const s = this.tv.state;
        const refused = ((s === 'paused' || s === 'loading') && !this.tv.userPaused && this.t >= MOMENT.noPlayRelease && this.tv.time < 0.2)
          || this.tv.stalledFor >= MOMENT.noPlayRelease;   // still standing even muted: let the visitor go (▶ stays theirs)
        if (s === 'partOne' || s === 'ended' || s === 'error' || this.tv.userPaused || s === 'stopped' || refused) {
          this.tv.markPartOneSeen();
          this.stage = 'after'; this.t = 0;
        }
        break;
      }
      case 'after':
        // the visitor pressed ▶ to play on: they are watching; the moment lets go where they are (no return)
        if (this.tv.playing) { this.finish(); break; }
        if (this.t >= MOMENT.afterHold && !this.host.cameraBusy()) {
          this.host.returnToSeat(this.turnSeconds(null));
          this.stage = 'return'; this.t = 0;
        }
        break;
      case 'return':
        if (this.t > 0.2 && !this.host.cameraBusy()) this.finish();
        break;
      default: break;
    }
  }
  private finish(): void {
    releaseVoice('teaching-tv');
    this.seconds = (performance.now() - this.started) / 1000;
    this.stage = 'done';
  }
}

/** THE THREE, and the rules they share: one era's TV in the room at a time, one moment per room, one voice at a time */
export class TeachingTvs {
  readonly tvs: Record<TapeId, TeachingTv>;
  private readonly moments: Record<TapeId, TvMoment>;
  private era = '';
  /** the voices as they were last frame (a voice that ARRIVES pauses a playing TV) */
  private voicesWas: Record<string, string> = {};
  constructor(app: pc.AppBase, private readonly host: TvHost) {
    this.tvs = { '1997': new TeachingTv(app, '1997'), '2016': new TeachingTv(app, '2016'), '2026': new TeachingTv(app, '2026') };
    this.moments = { '1997': new TvMoment(this.tvs['1997'], host), '2016': new TvMoment(this.tvs['2016'], host), '2026': new TvMoment(this.tvs['2026'], host) };
  }
  /** a conducted moment holds the floor */
  get momentRunning(): boolean { return TAPE_IDS.some((t) => this.moments[t].running); }
  moment(tape: TapeId): TvMoment { return this.moments[tape]; }
  /** any TV is heard (the kit's and the platform's own loops yield to it) */
  get audible(): boolean { return TAPE_IDS.some((t) => this.tvs[t].audible); }
  /** the TV of the era the visitor is in */
  current(): TeachingTv | null { const id = TAPE_IDS.find((t) => TAPE_ERA[t] === this.era); return id ? this.tvs[id] : null; }

  /**
   * every frame. `voices` = each of the story's voices by name, as a short signature ('' when silent): Lamby, a toast, a
   * side-message (its text), the conduction, a felt scene, a camera move not ours. A voice that ARRIVES — a name whose
   * signature turns non-empty or changes — pauses a TV the visitor set playing. `updateArmed` = the era's update ritual has
   * begun.
   */
  update(dt: number, era: string, voices: Record<string, string>, updateArmed: boolean): void {
    if (era !== this.era) {
      // the era changed: the old room's TV stops (its place kept for the Close), the new room's TV fetches its tape
      for (const id of TAPE_IDS) {
        const mine = TAPE_ERA[id] === era;
        if (!mine) this.moments[id].abort(P.stopped);
        this.tvs[id].setInEra(mine);
        if (mine && this.moments[id].stage === 'idle') this.tvs[id].preload();
      }
      this.era = era;
    }
    // the update stops the TV, and holds it stopped for as long as the update ritual is up
    if (updateArmed) for (const id of TAPE_IDS) { if (this.moments[id].running) this.moments[id].abort(P.stopped); if (this.tvs[id].playing) this.tvs[id].stop(P.stopped); }
    for (const id of TAPE_IDS) this.moments[id].update(dt);
    setVoiceWanted(TAPE_IDS.some((id) => this.moments[id].stage === 'idle' && this.moments[id].dueFor > 0) ? 'teaching-tv' : null);
    // the story speaks: a TV the visitor set playing pauses itself and keeps its place (on the voice's first moment; pressing
    //   ▶ while a voice is on is the visitor's own choice and is let be)
    const arrived = Object.keys(voices).some((k) => voices[k] !== '' && voices[k] !== (this.voicesWas[k] ?? ''));
    if (arrived && !this.momentRunning) for (const id of TAPE_IDS) if (this.tvs[id].playing) this.tvs[id].pause('story');
    this.voicesWas = { ...voices };
    for (const id of TAPE_IDS) this.tvs[id].update(dt);
  }

  /** the press resolver (app.ts resolveTapRay): true when a lit glass took the press */
  pressRay(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean {
    for (const id of TAPE_IDS) if (this.tvs[id].pressRay(ray)) return true;
    return false;
  }
  aim(ray: { p0: pc.Vec3; p1: pc.Vec3 }): TapeId | null {
    for (const id of TAPE_IDS) if (this.tvs[id].aim(ray)) return id;
    return null;
  }
  /** the lit glass a ray lands on, and where (the sentence line names it; in a headset the ray ends there) */
  aimPoint(ray: { p0: pc.Vec3; p1: pc.Vec3 }): { tape: TapeId; at: { x: number; y: number; z: number } } | null {
    for (const id of TAPE_IDS) {
      const e = this.tvs[id].entity;
      if (!e.enabled || !this.tvs[id].aim(ray)) continue;
      const m = e.getWorldTransform().data, n = new pc.Vec3(m[4], m[5], m[6]);
      const d = ray.p1.clone().sub(ray.p0), denom = d.dot(n);
      if (Math.abs(denom) < 1e-9) continue;
      const t = new pc.Vec3(m[12], m[13], m[14]).sub(ray.p0).dot(n) / denom;
      const at = ray.p0.clone().add(d.mulScalar(t));
      return { tape: id, at: { x: at.x, y: at.y, z: at.z } };
    }
    return null;
  }

  /** Lamby may offer to take a stalled visitor back: the era's tape has more to play, it is not playing, the moment is over
   *  (the once-per-era is Lamby's own, src/narrative/lambyGuide.ts) */
  offerDue(era: string): boolean {
    const tv = this.current(); if (!tv || TAPE_ERA[tv.tape] !== era) return false;
    const p = placeOf(tv.tape);
    return this.moments[tv.tape].stage === 'done' && p.partOneSeen && !tv.playing && p.t < TAPES[tv.tape].duration - 1;
  }
  lambyLine(era: string): string { return W.lamby[era] ?? ''; }
  /** Lamby's Yes: during the call, the conducted moment turns now; afterwards, the visitor is taken to the TV (it does not
   *  start itself: ▶ is theirs to press) */
  takeTo(): void {
    const tv = this.current(); if (!tv) return;
    const m = this.moments[tv.tape];
    if (m.calling) { m.takeNow(); return; }
    if (this.host.cameraBusy()) return;
    this.host.conduct(tv.viewPoint, Math.max(MOMENT.turnMin, Math.min(MOMENT.turnMax, this.host.angleTo(tv.viewPoint) * MOMENT.turnSecondsPerDegree)));
  }

  /** the Close and a Leave: every TV stops and goes dark; the places stay in memory for the era websites */
  stopAll(): void {
    for (const id of TAPE_IDS) { this.moments[id].abort(P.stopped); this.tvs[id].stop(P.stopped); this.tvs[id].setInEra(false); }
    this.era = 'close';
    releaseVoice('teaching-tv');
  }

  redraw(): void { for (const id of TAPE_IDS) this.tvs[id].redraw(); }

  // ── review aids (?debug=1): the walker, the probes ───────────────────────
  debug() {
    return { era: this.era, moments: Object.fromEntries(TAPE_IDS.map((t) => [t, { stage: this.moments[t].stage, seconds: this.moments[t].seconds, callSeconds: this.moments[t].callSeconds }])),
      tvs: TAPE_IDS.map((t) => this.tvs[t].debug()) };
  }
  canvases(): Record<string, HTMLCanvasElement> { return Object.fromEntries(TAPE_IDS.flatMap((t) => [[`tv${t}`, this.tvs[t].canvas], [`margin${t}`, this.tvs[t].panel.canvas]])); }
}
