/**
 * ⚑ S394 (UiB job 27 Part B; S392, S390 before it) — THE LAMBY SET, BROUGHT CLOSE: where the piece shows everyone the
 * programme's tape, and what they can go on watching.
 *
 * His 15 Nov notes on job 26 B (TEACHING_TAPES_V4_PLAN §8; UIB_JOB_27 B1–B5), built here:
 *  · ONE SET IN ALL THREE ROOMS (`LambyVision`, src/room/lambyVision.ts): "a Lamby Branded TV from old time … that way it is
 *    clear that it is separate from the main narrative". 1997 on the chest of drawers behind Daniel's seat; 2016 on the low
 *    unit by Vera's door (the wall TV and its DVD player are gone); 2026 on Maya's shelf, where her old CRT stood — the
 *    object kept, made "an object of the time" (the cream 2026 screen on its arm is gone). Places: data/room/teaching_tvs.json.
 *  · BROUGHT CLOSE, THE GAME BOY'S GRAMMAR (heldDevice.ts: "it comes closer to you to let you play"): a press on the lit set and
 *    it comes before the eye, face on, top up — in a headset at `held.xrDist`, grown until the PICTURE is `held.pictureDeg`
 *    tall; on a computer or a phone at the distance where its face (the glass and the keys) fills `held.flatFill` of the view.
 *    Held, a press lands on its keys (⏮ ▶ ❚❚ ⏭ ⏏, and ⏻ which puts it back), on its glass (play / pause), or on its body
 *    (puts it back where it stands, paused where it was). A press that misses it passes on to the room.
 *  · THE MARGIN AND THE CAPTIONS ARE INSIDE THE SET'S FRAME: the glass is 4:3, the picture its upper three quarters (a 4:3
 *    tape pillarboxed, a 16:9 disc full width), and the bar under it carries the caption (the spoken line, or the large type
 *    on the picture) and the piece's margin (v5: `head`, then `text`) — sized to the picture, never a panel larger than it.
 *    The record's panel of S392 is gone (his: "a subtitles text 3 times bigger than the video").
 *  · THE MOMENT, NO TURNS AND NO FADES (B3): once per room, at the era's beat, Lamby's line appears IN VIEW wherever the
 *    visitor is looking (`TvCall`, a card placed in the current view, in the headset too — never behind them); then the set
 *    comes to them and plays from its start to End of Part 1, and waits there, held, ▶ ready. Nothing turns the visitor:
 *    job 26's conducted turns (1997's two of 22 s) and the headset's cut under the dissolve are gone. Lamby's × closes the
 *    balloon and the set still comes (the system forces; Lamby only speaks). After a breath on the end card the floor is
 *    free again; the next voice of the story sends the set back to its place, paused where it was.
 *  · KEPT FROM JOB 26: option A (start → End of Part 1), the live margin and captions, the era sites' tape resuming from the
 *    set's place (one timeline, memory only), the self-pause when the story speaks, the stop at the update, the uploads only
 *    while a new picture exists or a line changes.
 *
 * The tape's own words are Part A's, in its picture and its files; Lamby never voices, reads or delivers them.
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
import { ERA4, CHROME } from '../desktop/theme/era4';
import { RECORD } from '../desktop/theme/witness';
import { FACES, VENDORED } from '../desktop/theme/fonts';
import * as ui from '../desktop/theme/chrome';
import * as aero from '../desktop/theme/era3';
import { drawLambyChar } from '../desktop/apps/lambyChar';
import decisions from '../../data/strings/cx3b.json';
import { holdVoice, releaseVoice, voiceHolder, setVoiceWanted } from '../state/voiceHold';
import { buildLambySet, toLocal, hitBounds, keyAt, glassAt, GLASS, FACE, KEY_POINTS, KEY_ROW, SET_NAME, type LambySet, type SetKey } from './lambyVision';

type Style = 'vcr' | 'dvd' | 'hedge';
interface TvSpec { era: string; place: { pos: number[]; yaw: number }; style: Style; seat: number[] }
const SPECS = (tvData as unknown as { tvs: Record<TapeId, TvSpec> }).tvs;
const HELD = (tvData as unknown as { held: { xrDist: number; pictureDeg: number; flatFill: number; phoneFill: number; flatMaxW: number; liftBase: number; liftPerMetre: number; liftMax: number; clearance: number; glowRest: number; glowHeld: number; xrKey: number } }).held;
const BAR = (tvData as unknown as { bar: { captionCap: number; marginCap: number; floorDeg: number; floorPxComputer: number; floorPxPhone: number; baseH: number; maxH: number; pad: number; gap: number; lineK: number } }).bar;
const CALL = (tvData as unknown as { call: { w: number; xrDist: number; flatDist: number; drop: number; followDeg: number; follow: number } }).call;
const MOMENT = (tvData as unknown as { moment: { callHold: number; dismissBreath: number; noCall: number; afterHold: number; afterDad: number; noPlayRelease: number } }).moment;
/** the moment's clock (data/room/teaching_tvs.json `moment`), for the engine's triggers */
export const TV_MOMENT = MOMENT;
const W = words as unknown as {
  tapes: Record<TapeId, { leader: string[]; listHead: string; osd?: Record<string, string>; dadLine?: string; dadLink?: string; dadToast?: string }>;
  player: Record<string, string>; lamby: Record<string, string> & { call: Record<string, string> } };
const P = W.player;
const D2R = Math.PI / 180;

/** the glass's canvas: 4:3; the picture above, the bar (captions, the margin) under it — at least a quarter of the glass
 *  (`bar.baseH`), taller where a tape's lines need it in this look-mode (⚑ S394 fix: never cut off, never below the floor) */
const LW = 960, LH = 720, PIC_BASE = 540;
/** a phone (the touch device): its own capital floor and its own hold (the glass, the bar and the keys fill the height) */
export const isPhone = (): boolean => (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  || (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches === true);
/** the distance a flat screen holds the set at: its face (the glass's top to the keys' foot) fills `fill` of the view's
 *  height, never more than `flatMaxW` of its width */
function flatDistance(cam: pc.CameraComponent | null | undefined, phone: boolean): number {
  const fov = cam?.fov ?? 42, tanV = Math.tan((fov / 2) * D2R);
  const gd = pc.Application.getApplication()?.graphicsDevice;
  const aspect = gd && gd.height > 0 ? gd.width / gd.height : 16 / 9;
  return Math.max((FACE.top - FACE.bottom) / (2 * tanV * (phone ? HELD.phoneFill : HELD.flatFill)), FACE.width / (2 * tanV * aspect * HELD.flatMaxW));
}
/** the headset's growth: the picture (540 canvas px) `pictureDeg` tall at `xrDist` */
const xrScale = (): { d: number; k: number } => { const d = Math.max(0.5, HELD.xrDist); return { d, k: (2 * d * Math.tan((HELD.pictureDeg / 2) * D2R)) / (GLASS.h * (PIC_BASE / LH)) }; };
/**
 * ⚑ S394 fix — HOW BIG A CANVAS PIXEL IS, HELD, IN THIS LOOK-MODE, and so the bar's capital floor in canvas px: 1.0° in a
 * headset (degrees per canvas px across the grown glass at `xrDist`), 14 CSS px on a computer and 12 on a phone (CSS px per
 * canvas px of the glass at the flat hold's distance and the camera's field of view).
 */
export function readingScale(xr: boolean, cam: pc.CameraComponent | null): { unit: 'deg' | 'px'; perCanvas: number; floor: number; phone: boolean } {
  if (xr) {
    const { d, k } = xrScale();
    const per = (2 * Math.atan((GLASS.h * k / 2) / d) / D2R) / LH;
    return { unit: 'deg', perCanvas: per, floor: BAR.floorDeg / per, phone: false };
  }
  const phone = isPhone(), d = flatDistance(cam, phone);
  const tanV = Math.tan(((cam?.fov ?? 42) / 2) * D2R);
  const el = pc.Application.getApplication()?.graphicsDevice.canvas as HTMLCanvasElement | undefined;
  const cssH = el?.clientHeight || 720;
  const per = (cssH * GLASS.h / (2 * d * tanV)) / LH;
  return { unit: 'px', perCanvas: per, floor: (phone ? BAR.floorPxPhone : BAR.floorPxComputer) / per, phone };
}
type BarLines = { caption: string | null; margin: { head: string; text: string } | null };
type BarBlock = { lines: string[]; px: number; cap: number };
type BarLayout = { cap: BarBlock | null; mar: (BarBlock & { head: string }) | null; h: number };
/** the margin's face: the piece's own sans in every room (the margin is the piece's voice, not the era's) */
const MARGIN_FACE = `"${VENDORED.ui2026}", ${FACES.e4.family}`;

export interface Hit { id: string; x: number; y: number; w: number; h: number }
/** `partOne` = stopped by itself on the end card of Part 1 (option A); `ended` = at the tape's own end */
export type TvState = 'off' | 'leader' | 'loading' | 'playing' | 'paused' | 'partOne' | 'ended' | 'stopped' | 'error';
/** where the set is: in its place, coming to the eye, held, or going back */
export type Pose = 'rest' | 'lifting' | 'held' | 'returning';
/** what a ray is on: the resting set ('pick'), or, held, a key, the glass, the body */
export type SetAim = 'pick' | SetKey | 'glass' | 'body';
type Ray = { p0: pc.Vec3; p1: pc.Vec3 };

/** a palette colour at an alpha (the colour is the palette's own; only its opacity is set) */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** each era's player in its own colours and face (palettes from src/desktop/theme/ only) */
const LOOK: Record<Style, { face: string; bg: string; ink: string; dim: string; accent: string; panel: string; blue: string; weight: string }> = {
  vcr: { face: FACES.e1.family, bg: ERA1.black, ink: ERA1.white, dim: ERA1.silver, accent: ERA1.ok, panel: ERA1.navy, blue: ERA1.navy, weight: '' },
  dvd: { face: FACES.e3.family, bg: ERA3.ink, ink: ERA3.white, dim: ERA3.glassEdge, accent: ERA3.accent, panel: ERA3.taskBot, blue: ERA3.deskTop, weight: '600 ' },
  hedge: { face: FACES.e4.family, bg: ERA4.field, ink: ERA4.textHi, dim: ERA4.dim, accent: ERA4.text, panel: ERA4.panel, blue: ERA4.field, weight: '600 ' }
};

/** a plane's canvas point under a ray (the same columns convention as era3Devices' hitPlane) */
function hitPlane(entity: pc.Entity, cw: number, ch: number, ray: Ray): { x: number; y: number } | null {
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
  return { x: u * cw, y: v * ch };
}

/** the eye's frame for a brought object: in a headset the head's heading with its pitch held between 30° down and level
 *  (heldDevice S345: a look at the floor must not put it in the lap); on a flat screen the camera's own */
function eyeFrame(eye: pc.Entity, xr: boolean): { fwd: pc.Vec3; up: pc.Vec3 } {
  let fwd = eye.forward.clone(), up = eye.up.clone();
  if (xr) {
    const h = new pc.Vec3(fwd.x, 0, fwd.z);
    if (h.lengthSq() < 1e-6) h.set(-up.x, 0, -up.z);
    h.normalize();
    const pitch = Math.max(-30, Math.min(0, Math.asin(Math.max(-1, Math.min(1, fwd.y))) / D2R)) * D2R;
    fwd = new pc.Vec3(h.x * Math.cos(pitch), Math.sin(pitch), h.z * Math.cos(pitch));
    up = new pc.Vec3(0, 1, 0).sub(fwd.clone().mulScalar(fwd.y)).normalize();
  }
  return { fwd: fwd.normalize(), up: up.normalize() };
}
/** a rotation whose +Z faces the eye (−fwd) and whose +Y is `up` */
function faceRot(fwd: pc.Vec3, up: pc.Vec3): pc.Quat {
  const z = fwd.clone().mulScalar(-1), x = new pc.Vec3().cross(up, z).normalize();
  const y = new pc.Vec3().cross(z, x).normalize();
  const m = new pc.Mat4();
  m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
  return new pc.Quat().setFromMat4(m);
}
const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * ONE TAPE ON ITS SET: the set in its room, the glass laid on it, the video drawn on the glass (never on the page), the bar,
 * and the bringing close. The video plays under the mixer's FILM channel and in the one-shot set, so the frame's mute, the
 * menu's hold and the idle cycle's mute reach its sound (adoptOneShot).
 */
export class TeachingTv {
  readonly spec: TvSpec;
  readonly set: LambySet;
  /** the glass (the screen plane laid on the set) — named `teaching-tv-<tape>` for the walker's map and the probes */
  readonly entity: pc.Entity;
  readonly canvas: HTMLCanvasElement;
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
  private barKey = '';
  /** the tape's second last frame, to see it CROSS the end of Part 1 while playing (a seek past it does not stop it) */
  private prevT = -1;
  /** the visitor paused it themselves (not the menu, not the story) */
  userPaused = false;
  /** play() was refused with sound and it plays muted: a press on the glass gives the sound (a gesture) */
  needsSound = false;
  private stopNote: string | null = null;
  private inEra = false;
  /** draws (each is one upload of the glass), for the probe */
  draws = 0;
  stalledFor = 0;
  private stallT = -1;
  /** what the bar last drew, for the probe: each block's capital height in canvas px (of the 540-px picture), its lines */
  bar: { caption: string | null; margin: string | null; capCaption: number; capMargin: number; lines: number; height: number; top: number; barH: number;
    ink: { x0: number; x1: number; y0: number; y1: number } | null; recent: string[] } = { caption: null, margin: null, capCaption: 0, capMargin: 0, lines: 0, height: 0, top: 0, barH: 0, ink: null, recent: [] };
  // ── the bringing close ──
  pose: Pose = 'rest';
  private liftT = 1;
  private liftDur = 0.8;
  private readonly restPos: pc.Vec3;
  private readonly restRot: pc.Quat;
  private readonly from = { pos: new pc.Vec3(), rot: new pc.Quat(), k: 1 };
  private readonly to = { pos: new pc.Vec3(), rot: new pc.Quat(), k: 1 };
  private readonly via = new pc.Vec3();
  /** the scale it is held at (a headset grows it until the picture is `pictureDeg` tall; a flat screen keeps it) */
  heldScale = 1;
  /** the eye's distance to the glass when held (metres), for the probe */
  heldDist = 0;
  /** where the eye was when it was taken: a seat change (a marker, a scripted send) leaves it behind, so it goes back */
  readonly takenAt = new pc.Vec3();
  private litFor = 0;
  /** the last press on it (for the probes: what it did) */
  lastPress: string | null = null;
  /** the visitor set it down themselves (the moment lets go) */
  setDown = false;
  /** ⚑ S394 fix — the bar's capital floor (canvas px) in this look-mode, and the bar's height (canvas px) for this tape at it */
  floorCap = 19.4;
  barH = 180;
  /** the tape's tallest moment at the floor (for the probe): its lines, the height it needs, whether it fits the bar */
  barWorst: { key: string; need: number; fits: boolean } = { key: '', need: 0, fits: true };
  /** the picture's rect on the glass's canvas: everything above the bar */
  get pic(): { x: number; y: number; w: number; h: number } { return { x: 0, y: 0, w: LW, h: LH - this.barH }; }

  constructor(app: pc.AppBase, readonly tape: TapeId) {
    this.spec = SPECS[tape];
    this.look = LOOK[this.spec.style];
    this.set = buildLambySet(app, `lamby-set-${tape}`);
    const pl = this.spec.place;
    this.restPos = new pc.Vec3(pl.pos[0], pl.pos[1], pl.pos[2]);
    this.restRot = new pc.Quat().setFromEulerAngles(0, pl.yaw, 0);
    this.set.root.setPosition(this.restPos);
    this.set.root.setRotation(this.restRot);
    this.set.root.enabled = false;
    this.set.glow(HELD.glowRest);
    app.root.addChild(this.set.root);
    this.canvas = document.createElement('canvas');
    this.canvas.width = LW; this.canvas.height = LH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = makeScreenTexture(app, this.canvas, 'screen');
    this.entity = makeScreenEntity(`teaching-tv-${tape}`, this.tex, GLASS.w, GLASS.h);
    this.entity.setLocalPosition(GLASS.cx, GLASS.cy, GLASS.z);
    this.entity.setLocalEulerAngles(90, 0, 0);
    if (this.entity.render) this.entity.render.batchGroupId = -1;
    this.entity.enabled = false;
    this.set.root.addChild(this.entity);
    // ⚑ S394 fix — the bar is measured in the faces it is drawn in: when a face finishes loading, it is sized and drawn again
    //   (a bar sized in a fallback face ran its last lines off the glass: the 2026 margin line in the photographs)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.addEventListener?.('loadingdone', () => this.redraw());
    void fonts?.ready.then(() => this.redraw());
  }

  get data(): TapeData { return TAPES[this.tape]; }
  get size(): { w: number; h: number } { return { w: LW, h: LH }; }
  get playing(): boolean { return this.state === 'playing' || (this.state === 'loading' && this.wantPlay); }
  get audible(): boolean { return this.state === 'playing' && !!this.video && !this.video.muted && !this.video.paused; }
  get time(): number { return this.video && this.loaded ? this.video.currentTime : placeOf(this.tape).t; }
  get chapterIndex(): number { return chapterAt(this.data, this.time); }
  get chapter(): Chapter | undefined { return this.data.chapters[this.chapterIndex]; }
  get held(): boolean { return this.pose === 'held' || this.pose === 'lifting'; }
  get glassCentre(): pc.Vec3 { return this.entity.getPosition().clone(); }
  /** ⚑ S394 fix — the look-mode's floor arrives (app.ts, each frame through TeachingTvs): a change sizes the bar again */
  setFloor(floor: number): void {
    if (Math.abs(floor - this.floorCap) < 0.05) return;
    this.floorCap = floor;
    this.sizeBar();
    this.redraw();
  }
  /** every moment of the tape that puts words in the bar: each caption, each margin line, each pair shown together, and the
   *  break's bar with its captions */
  barMoments(): BarLines[] {
    const d = this.data, out: BarLines[] = [];
    const over = (a: { start: number; end: number }, b: { start: number; end: number }): boolean => a.start < b.end - 0.01 && a.end > b.start + 0.01;
    for (const c of d.cues) out.push({ caption: c.text, margin: null });
    for (const m of d.margin) {
      out.push({ caption: null, margin: { head: m.head, text: m.text } });
      for (const c of d.cues) if (over(c, m)) out.push({ caption: c.text, margin: { head: m.head, text: m.text } });
    }
    const b = d.break;
    if (b?.barHead && b.on) {
      const span = { start: b.on[0], end: b.on[1] };
      out.push({ caption: null, margin: { head: b.barHead, text: b.bar ?? '' } });
      for (const c of d.cues) if (over(c, span)) out.push({ caption: c.text, margin: { head: b.barHead, text: b.bar ?? '' } });
    }
    return out;
  }
  /** the bar's height for this tape: the tallest moment at its sizes (wrapped first), within `bar.baseH`…`bar.maxH` */
  private sizeBar(): void {
    if (!this.ctx) return;
    let need = 0, key = '';
    for (const m of this.barMoments()) {
      const L = this.fitBar(m, BAR.maxH);
      if (L.h > need) { need = L.h; key = `${m.caption ?? ''} || ${m.margin ? `${m.margin.head} — ${m.margin.text}` : ''}`; }
    }
    const h = Math.ceil(need + BAR.pad * 2);
    this.barH = Math.max(BAR.baseH, Math.min(BAR.maxH, h));
    this.barWorst = { key: key.slice(0, 120), need: Math.round(need), fits: h <= BAR.maxH };
  }
  private get inTrailer(): boolean { return this.chapter?.kind === 'trailer'; }

  setInEra(on: boolean): void {
    if (on === this.inEra) return;
    this.inEra = on;
    if (!on) {
      if (this.state !== 'off') this.stop(null);
      this.snapHome();
    }
    this.set.root.enabled = on;
    this.sync();
  }
  private sync(): void { this.entity.enabled = this.inEra && this.state !== 'off'; }

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
    if (t >= this.data.partOneEnd) placeOf(this.tape).partOneSeen = true;
    this.lastFrame = -1; this.dirty = true;
  }
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
      // iOS / a browser without the entrance's gesture: the sound needs a press. Play it muted (the captions are in the bar)
      //   with a "Press for sound" chip on the glass; that press is the gesture.
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
  /** the leader: the set is on, the tape's label on the glass, before it rolls */
  showLeader(): void { this.state = 'leader'; this.dirty = true; this.sync(); this.preload(); }
  /** lit at its place in the tape, paused (Lamby's later offer brings a set that was let go of) */
  wake(): void {
    if (this.state !== 'off') return;
    this.load(placeOf(this.tape).t);
    this.state = 'paused'; this.sync(); this.dirty = true;
  }
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
  markPartOneSeen(): void { placeOf(this.tape).partOneSeen = true; }

  // ── the bringing close (heldDevice's grammar) ───────────────────────────────
  /** the set comes before the eye (the pose fixed at the press, as the phone and the Game Boy do) */
  take(eye: pc.Entity, xr: boolean, cam?: pc.CameraComponent | null): void {
    if (this.pose === 'held' || this.pose === 'lifting' || !this.inEra) return;
    const { fwd, up } = eyeFrame(eye, xr);
    const rot = faceRot(fwd, up);
    let d: number, k: number, anchor: pc.Vec3;
    if (xr) {
      // the PICTURE `pictureDeg` tall at `xrDist` (Meta's 0.5 m floor for anything looked at for long; nearer than the desk)
      ({ d, k } = xrScale());
      // the picture's centre on the line of sight (the bar under it, the keys under that)
      anchor = new pc.Vec3(GLASS.cx, GLASS.cy + GLASS.h * (1 - PIC_BASE / LH) / 2, GLASS.z);
    } else {
      // the FACE (the glass's top to the keys' foot) fills `flatFill` of the view's height (a phone: `phoneFill`, the glass, the
      //   bar and the keys filling it — ⚑ S394 fix: its capitals at ≥ 12 px), never more than `flatMaxW` of its width
      d = flatDistance(cam, isPhone());
      k = 1;
      anchor = new pc.Vec3(FACE.cx, (FACE.top + FACE.bottom) / 2, GLASS.z);
    }
    const eyeP = eye.getPosition().clone();
    this.takenAt.copy(eyeP);
    const target = eyeP.clone().add(fwd.clone().mulScalar(d));
    const off = rot.transformVector(anchor.clone().mulScalar(k));
    this.to.pos.copy(target).sub(off); this.to.rot.copy(rot); this.to.k = k;
    this.from.pos.copy(this.set.root.getPosition()); this.from.rot.copy(this.set.root.getRotation()); this.from.k = this.set.root.getLocalScale().x;
    this.path(eyeP);
    this.heldScale = k; this.heldDist = d;
    this.pose = 'lifting'; this.liftT = 0; this.setDown = false;
    this.set.glow(HELD.glowHeld);
  }
  /** back to its place, paused where it was (the visitor's body press or ⏻; or the story moving on) */
  putBack(eye: pc.Vec3 | null, by: 'visitor' | 'story'): void {
    if (this.pose === 'rest' || this.pose === 'returning') return;
    if (this.playing) this.pause(by);
    if (by === 'visitor') this.setDown = true;
    this.from.pos.copy(this.set.root.getPosition()); this.from.rot.copy(this.set.root.getRotation()); this.from.k = this.set.root.getLocalScale().x;
    this.to.pos.copy(this.restPos); this.to.rot.copy(this.restRot); this.to.k = 1;
    this.path(eye ?? this.from.pos.clone().add(new pc.Vec3(0, 0.3, 0)));
    this.pose = 'returning'; this.liftT = 0;
  }
  /** at once, no travel (the era left, a wipe) */
  snapHome(): void {
    this.pose = 'rest'; this.liftT = 1;
    this.set.root.setPosition(this.restPos); this.set.root.setRotation(this.restRot); this.set.root.setLocalScale(1, 1, 1);
    this.set.glow(HELD.glowRest);
  }
  /** the travel: a curve that keeps `clearance` from the eye (from behind the seat it swings round, never through the head) */
  private path(eye: pc.Vec3): void {
    const half = new pc.Vec3().lerp(this.from.pos, this.to.pos, 0.5);
    const mid = half.clone();
    const away = mid.clone().sub(eye);
    if (away.length() < HELD.clearance) {
      if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
      mid.copy(eye).add(away.normalize().mulScalar(HELD.clearance));
    }
    // a quadratic through `mid` at its half: the control point is 2·mid − (a+b)/2
    this.via.copy(mid).mulScalar(2).sub(half);
    const dist = this.from.pos.distance(this.to.pos);
    this.liftDur = Math.min(HELD.liftMax, HELD.liftBase + dist * HELD.liftPerMetre);
  }
  private tickLift(dt: number): void {
    if (this.pose !== 'lifting' && this.pose !== 'returning') return;
    this.liftT = Math.min(1, this.liftT + dt / this.liftDur);
    const k = smooth(this.liftT), a = this.from.pos, b = this.to.pos, c = this.via;
    const u = 1 - k;
    this.set.root.setPosition(u * u * a.x + 2 * u * k * c.x + k * k * b.x, u * u * a.y + 2 * u * k * c.y + k * k * b.y, u * u * a.z + 2 * u * k * c.z + k * k * b.z);
    this.set.root.setRotation(new pc.Quat().slerp(this.from.rot, this.to.rot, k));
    const s = this.from.k + (this.to.k - this.from.k) * k;
    this.set.root.setLocalScale(s, s, s);
    if (this.liftT >= 1) {
      if (this.pose === 'lifting') this.pose = 'held';
      else this.snapHome();
    }
  }

  // ── a press ─────────────────────────────────────────────────────────────────
  /** what a ray is on (null: it misses the set). At rest any part of the lit set brings it; held, its keys, glass, body. */
  aim(ray: Ray, xr: boolean): SetAim | null {
    if (!this.set.root.enabled || this.pose === 'returning') return null;
    const { a, b } = toLocal(this.set.root, ray);
    const enter = hitBounds(a, b);
    // before its moment the set is dark and nothing (the tape is not there yet, in the story's order)
    if (this.pose === 'rest') return enter !== null && this.state !== 'off' ? 'pick' : null;
    const key = keyAt(a, b, xr ? HELD.xrKey / Math.max(1e-3, this.heldScale) : 0);
    if (key) return key.id;
    if (glassAt(a, b)) return 'glass';
    return enter !== null ? 'body' : null;
  }
  /** a press: true when the set took it */
  press(ray: Ray, eye: pc.Entity, xr: boolean, cam?: pc.CameraComponent | null): boolean {
    const what = this.aim(ray, xr);
    if (!what) return false;
    this.lastPress = what;
    if (what === 'pick') { this.take(eye, xr, cam); return true; }
    if (this.pose === 'lifting') return true;   // on its way: the press is its, nothing else happens
    if (what === 'body' || what === 'power') { this.light(what === 'power' ? 'power' : null); this.putBack(eye.getPosition(), 'visitor'); return true; }
    if (what === 'glass') {
      if (this.needsSound && this.playing) { this.pressId('tv-sound'); return true; }
      this.pressId(this.playing ? 'tv-pause' : 'tv-play');
      return true;
    }
    this.light(what);
    this.pressId(what === 'play' ? 'tv-play' : what === 'pause' ? 'tv-pause' : what === 'prev' ? 'tv-prev' : what === 'next' ? 'tv-next' : 'tv-eject');
    return true;
  }
  private light(key: SetKey | null): void { if (key) { this.set.light(key); this.litFor = 0.22; } }
  /** a control by its id (the keys and the glass resolve here; the review aids call it too) */
  pressId(id: string): void {
    const v = this.video, p = placeOf(this.tape), d = this.data;
    if (id === 'tv-sound') { if (v) v.muted = false; this.needsSound = false; this.dirty = true; return; }
    if (id === 'tv-pause') { if (this.playing) this.pause('visitor'); return; }
    if (id === 'tv-play') {
      if (this.state === 'ended' || this.state === 'leader') { this.play(0); return; }
      if (this.playing) return;
      this.play(v && this.loaded ? v.currentTime : p.t);   // from where it stopped — never a jump
      return;
    }
    if (id === 'tv-eject') { this.stop(P.ejected); return; }
    if (id === 'tv-prev' || id === 'tv-next') {
      // ⚑ his "this was a DVD": during the disc's trailers only pause is offered (no skip)
      if (this.inTrailer) return;
      const t = v && this.loaded ? v.currentTime : p.t, i = chapterAt(d, t), ch = d.chapters;
      let to: number;
      if (id === 'tv-next') to = i + 1 < ch.length ? ch[i + 1].start : d.duration;
      else to = t - ch[i].start > 3 || i === 0 ? ch[i].start : ch[i - 1].start;
      if (to >= d.duration - 0.05) { if (v) v.currentTime = d.duration; this.ended(); return; }
      const resume = this.state === 'playing' || this.state === 'loading';
      if (resume) this.play(to);
      else { this.load(to); if (this.state === 'ended' || this.state === 'stopped' || this.state === 'partOne' || this.state === 'leader') this.state = 'paused'; p.t = to; this.sync(); }
    }
  }

  // ── the frame loop ─────────────────────────────────────────────────────────
  update(dt = 1 / 60): void {
    this.tickLift(dt);
    if (this.litFor > 0) { this.litFor -= dt; if (this.litFor <= 0) this.set.light(null); }
    if (this.state === 'off' || !this.entity.enabled) return;
    const v = this.video;
    if (v && this.loaded && this.state === 'playing' && !v.paused) {
      const t = v.currentTime, P1 = this.data.partOneEnd;
      if (!placeOf(this.tape).partOneSeen && this.prevT >= 0 && this.prevT < P1 && t >= P1 && t - this.prevT < 1.5) this.stopAtPartOne();
      this.prevT = t;
    }
    // a new picture: counted in thirtieths of a second (the tapes are 30 frames a second), so the glass is drawn and uploaded
    //   once per frame of the tape, not once per frame of the room
    const tick = v ? Math.floor(v.currentTime * 30) : -1;
    if (v && (this.state === 'playing' || this.state === 'loading') && v.readyState >= 2 && tick !== this.lastFrame) { this.lastFrame = tick; this.dirty = true; }
    // a playing tape whose clock stands still is a sound device that will not open: after 4 s it plays on muted
    if (v && this.state === 'playing' && !v.paused) {
      if (Math.abs(v.currentTime - this.stallT) < 0.01) this.stalledFor += dt; else { this.stalledFor = 0; this.stallT = v.currentTime; }
      if (this.stalledFor >= 4 && !v.muted) { v.muted = true; this.needsSound = true; this.stalledFor = 0; this.dirty = true; }
    } else this.stalledFor = 0;
    if (this.audible) roomBed.duck(-12, 0.3);
    // the bar's words: the tape's own second chooses them, so they pause and resume with it; a change of words is a redraw
    const lines = this.barLines();
    const key = `${lines.caption ?? ''}\u0001${lines.margin ? `${lines.margin.head}|${lines.margin.text}` : ''}`;
    if (key !== this.barKey) { this.barKey = key; this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    this.draw(lines);
    this.tex.upload();
  }
  redraw(): void { this.dirty = true; this.barKey = '\u0000'; this.sizeBar(); }

  /**
   * the bar's two blocks for this second: the caption (the spoken line) and the margin. ⚑ S394: the tape's large type (the
   * label, the end card, the break's quote — screen_text.vtt) is no longer repeated in the bar: S392 drew it there because the
   * TV was 2 m away and its picture 8.5° tall; brought close, the picture is 28° tall in the headset and its own type reads (a
   * second copy also crowded the bar and lost its last lines: the probe's first 2016 v5 frame).
   */
  private barLines(): BarLines {
    const live = this.loaded && (this.state === 'playing' || this.state === 'loading' || this.state === 'paused' || this.state === 'partOne');
    if (!live) return { caption: null, margin: null };
    const t = this.time;
    // a spoken line that only reads out the type on the picture is not said twice; one that says something else is captioned
    const big = screenAt(this.data, Math.min(t, this.data.duration - 0.01));
    const said = this.state !== 'partOne' ? cueAt(this.data, t) : null;
    const norm = (x: string): string => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const cue = said && big && norm(big.text).includes(norm(said.text)) ? null : said;
    const m = marginAt(this.data, t);
    // ⚑ S394 — v5's short break: the admission is the picture; its bar (barHead, then bar) is the set's to draw, during `on`
    const b = this.data.break;
    if (!m && b?.barHead && b.on && t >= b.on[0] && t < b.on[1]) return { caption: cue?.text ?? null, margin: { head: b.barHead, text: b.bar ?? '' } };
    return { caption: cue?.text ?? null, margin: m ? { head: m.head, text: m.text } : null };
  }

  // ── the glass ──────────────────────────────────────────────────────────────
  private font(px: number): string { return `${this.look.weight}${px}px ${this.look.face}`; }
  private draw(lines: BarLines): void {
    const c = this.ctx; if (!c) return;
    this.draws++;
    const L = this.look;
    this.hits = [];
    c.save();
    c.fillStyle = ERA1.black; c.fillRect(0, 0, LW, LH);
    const v = this.video;
    const hasFrame = !!v && this.loaded && v.readyState >= 2 && v.videoWidth > 0 && this.state !== 'leader';
    if (hasFrame && v) {
      // the picture at its own shape inside the upper three quarters (a 4:3 tape pillarboxed, a 16:9 disc full width)
      const PIC = this.pic, s = Math.min(PIC.w / v.videoWidth, PIC.h / v.videoHeight);
      const w = Math.round(v.videoWidth * s), h = Math.round(v.videoHeight * s);
      c.drawImage(v, PIC.x + Math.round((PIC.w - w) / 2), PIC.y + Math.round((PIC.h - h) / 2), w, h);
    }
    if (this.state === 'leader' || (!hasFrame && (this.state === 'loading' || this.state === 'playing'))) this.drawLeader();
    switch (this.state) {
      case 'playing': case 'loading': this.drawPlaying(); break;
      case 'paused': this.drawPaused(false); break;
      case 'partOne': this.drawPaused(true); break;
      case 'ended': this.drawEnded(); break;
      case 'stopped': this.drawStopped(); break;
      case 'error': this.drawError(); break;
      default: break;
    }
    if (this.needsSound && (this.state === 'playing' || this.state === 'loading')) {
      c.font = this.font(30); const tw = Math.ceil(c.measureText(P.sound).width) + 36;
      const r = { x: LW - tw - 24, y: 24, w: tw, h: 56 };
      c.fillStyle = hexA(L.bg, 0.85); c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = L.ink; c.lineWidth = 3; c.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
      c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(P.sound, r.x + r.w / 2, r.y + r.h / 2 + 1);
      c.textAlign = 'left';
    }
    this.drawBar(lines);
    // the glass is one control (play / pause; the sound, when asked for), published whole for the walker's map
    this.hits.push({ id: this.playing ? (this.needsSound ? 'tv-sound' : 'tv-pause') : 'tv-play', x: 0, y: 0, w: LW, h: LH });
    c.restore();
  }

  /** words wrapped to a width at a font */
  private wrap(text: string, font: string, width: number): string[] {
    const c = this.ctx!; c.font = font;
    const out: string[] = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const tt = line ? `${line} ${w}` : w;
        if (c.measureText(tt).width <= width || !line) line = tt; else { out.push(line); line = w; }
      }
      if (line) out.push(line);
    }
    return out;
  }
  private capRatio(face: string, weight = ''): number {
    // ⚑ S394 fix — measured on the alphabetic baseline whatever the last drawing left set: under 'middle' (the paused and
    //   leader screens) the capital measured 0.44 of the size instead of 0.73, every line was laid out ~1.65× too big, and the
    //   2026 margin line ran off the foot of the glass
    const c = this.ctx!; c.font = `${weight}100px ${face}`; c.textBaseline = 'alphabetic';
    const m = c.measureText('H');
    return m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent / 100 : 0.7;
  }

  /**
   * ⚑ S394 (B2; S394 fix) — THE BAR UNDER THE PICTURE: the caption in the player's own face and ink, and under it the piece's
   * margin (the record's colours, the piece's sans: its head, then its text). Each block's capitals are asked for at
   * `bar.captionCap` / `bar.marginCap` canvas px, never under the look-mode's floor (`floorCap`: 1.0° in a headset, 14 px on a
   * computer, 12 px on a phone). WRAP FIRST: every line is wrapped, never cut — the bar is as tall as the tape's tallest moment
   * needs (`sizeBar`, within the set's frame: `bar.maxH`), and only a moment that will not fit it then steps its type down, never
   * under the floor. The margin is one line where it can be ("HEAD — text"), else the head and the text on two (v5's rule),
   * else wrapped.
   */
  private barLayout(lines: BarLines, cc: number, mc: number): BarLayout {
    const inner = LW - 2 * 22, capW = this.look.weight, capFam = this.look.face, lhK = BAR.lineK;
    const rc = this.capRatio(capFam, capW), rm = this.capRatio(MARGIN_FACE);
    let mar: (BarBlock & { head: string }) | null = null;
    if (lines.margin) {
      const { head, text } = lines.margin, px = Math.ceil(mc / rm), f = `${px}px ${MARGIN_FACE}`;
      const one = text ? `${head} — ${text}` : head;
      let ls = this.wrap(one, f, inner);
      if (ls.length > 1 && text) {
        const hs = this.wrap(head, f, inner), ts = this.wrap(text, f, inner);
        if (hs.length === 1 && ts.length === 1) ls = [hs[0], ts[0]];
      }
      mar = { lines: ls, px, cap: mc, head };
    }
    let cap: BarBlock | null = null;
    if (lines.caption) { const px = Math.ceil(cc / rc); cap = { lines: this.wrap(lines.caption, `${capW}${px}px ${capFam}`, inner), px, cap: cc }; }
    const h = (cap ? cap.lines.length * cap.px * lhK : 0) + (mar ? mar.lines.length * mar.px * lhK : 0) + (cap && mar ? BAR.gap : 0);
    return { cap, mar, h };
  }
  /** the layout for a moment in a bar `room` px tall: at the asked sizes (never under the floor), stepping down toward the floor
   *  only if it will not fit */
  private fitBar(lines: BarLines, room: number): BarLayout {
    const fl = this.floorCap, cc0 = Math.max(BAR.captionCap, fl), mc0 = Math.max(BAR.marginCap, fl), avail = room - BAR.pad * 2;
    let L = this.barLayout(lines, cc0, mc0);
    for (let s = 1; L.h > avail && s <= 16; s++) {
      const cc = Math.max(fl, cc0 - s), mc = Math.max(fl, mc0 - s * 0.5);
      L = this.barLayout(lines, cc, mc);
      if (cc === fl && mc === fl) break;
    }
    return L;
  }
  private drawBar(lines: BarLines): void {
    const c = this.ctx!; const H = this.barH, top0 = LH - H, lhK = BAR.lineK;
    const capW = this.look.weight, capFam = this.look.face;
    const L = this.fitBar(lines, H);
    let y = top0 + Math.max(BAR.pad, Math.round((H - L.h) / 2));
    c.textBaseline = 'alphabetic';
    /** each drawn line's ink box (canvas px), for the probe: nothing may leave the bar */
    const ink: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const put = (t: string, x: number, yy: number, align: 'center' | 'left'): void => {
      const m = c.measureText(t), w = m.width, x0 = align === 'center' ? x - w / 2 : x;
      ink.push({ x0, x1: x0 + w, y0: yy - (m.actualBoundingBoxAscent || 0), y1: yy + (m.actualBoundingBoxDescent || 0) });
    };
    if (L.cap) {
      const cb = L.cap;
      c.font = `${capW}${cb.px}px ${capFam}`; c.fillStyle = this.look.ink; c.textAlign = 'center';
      cb.lines.forEach((l, i) => { const yy = y + Math.round((i + 0.5) * cb.px * lhK + cb.cap / 2); c.fillText(l, LW / 2, yy); put(l, LW / 2, yy, 'center'); });
      y += Math.round(cb.lines.length * cb.px * lhK) + (L.mar ? BAR.gap : 0);
    }
    if (L.mar) {
      const mb = L.mar;
      c.font = `${mb.px}px ${MARGIN_FACE}`; c.textAlign = 'left';
      mb.lines.forEach((l, i) => {
        const yy = y + Math.round((i + 0.5) * mb.px * lhK + mb.cap / 2);
        const w = c.measureText(l).width, x = Math.round((LW - w) / 2);
        if (l.startsWith(mb.head)) {
          c.fillStyle = RECORD.ink; c.fillText(mb.head, x, yy);
          c.fillStyle = ERA1.silver; c.fillText(l.slice(mb.head.length), x + c.measureText(mb.head).width, yy);
        } else { c.fillStyle = ERA1.silver; c.fillText(l, x, yy); }
        put(l, x, yy, 'left');
      });
    }
    c.textAlign = 'left';
    const recentKey = `${lines.caption ?? ''} || ${lines.margin ? `${lines.margin.head} — ${lines.margin.text}` : ''}`.slice(0, 80);
    if (this.bar.recent[this.bar.recent.length - 1] !== recentKey) { this.bar.recent.push(recentKey); if (this.bar.recent.length > 12) this.bar.recent.shift(); }
    const inkBox = ink.length ? { x0: Math.min(...ink.map((b) => b.x0)), x1: Math.max(...ink.map((b) => b.x1)), y0: Math.min(...ink.map((b) => b.y0)), y1: Math.max(...ink.map((b) => b.y1)) } : null;
    // never cut off: a moment the bar was not sized for (a face that loaded since, a line that wraps once more) grows it, within
    //   the glass, and the glass is drawn again on the next frame
    if ((L.h + BAR.pad * 2 > H || (inkBox && inkBox.y1 > LH)) && H < BAR.maxH) { this.barH = Math.min(BAR.maxH, Math.ceil(L.h + BAR.pad * 2)); this.dirty = true; }
    this.bar = { caption: L.cap ? L.cap.lines.join(' / ') : null, margin: L.mar ? L.mar.lines.join(' / ') : null,
      capCaption: L.cap?.cap ?? 0, capMargin: L.mar?.cap ?? 0, lines: (L.cap?.lines.length ?? 0) + (L.mar?.lines.length ?? 0), height: Math.round(L.h),
      top: top0, barH: H, ink: inkBox, recent: this.bar.recent };
  }
  /**
   * ⚑ S394 fix (review aid, ?debug=1) — EVERY MOMENT OF THE TAPE DRAWN INTO THE BAR, one after another, in this look-mode: for
   * each, the capitals (canvas px), the lines, the space left, and whether any ink left the bar (or the bar the glass). The glass
   * is drawn back as it was afterwards.
   */
  fitAll(): { floor: number; barH: number; moments: { key: string; capCaption: number; capMargin: number; lines: number; need: number; left: number; inside: boolean }[] } {
    const out: { key: string; capCaption: number; capMargin: number; lines: number; need: number; left: number; inside: boolean }[] = [];
    const c = this.ctx; if (!c) return { floor: this.floorCap, barH: this.barH, moments: out };
    this.sizeBar();
    const was = this.state;
    for (const m of this.barMoments()) {
      // the whole glass, as the frame loop draws it, in each state the bar is up in (playing; paused and at End of Part 1 the
      //   player's own display draws first and leaves its own text state behind: the measurement must not depend on it)
      let worst: (typeof out)[number] | null = null;
      for (const st of ['playing', 'paused', 'partOne'] as TvState[]) {
        this.state = st;
        this.draw(m);
        const b = this.bar, ink = b.ink;
        const inside = !!ink && ink.x0 >= 0 && ink.x1 <= LW && ink.y0 >= b.top && ink.y1 <= LH && b.top >= 0 && b.barH <= BAR.maxH;
        const row = { key: `${m.caption ?? ''} || ${m.margin ? `${m.margin.head} — ${m.margin.text}` : ''}`.slice(0, 140), capCaption: b.capCaption, capMargin: b.capMargin,
          lines: b.lines, need: b.height, left: Math.round(b.barH - BAR.pad * 2 - b.height), inside };
        if (!worst || !row.inside || row.left < worst.left) worst = row;
      }
      if (worst) out.push(worst);
    }
    this.state = was;
    this.redraw();
    return { floor: this.floorCap, barH: this.barH, moments: out };
  }

  /** the tape's label before it rolls: a VCR's blue, the disc's input card with the assignment, Dad's share line */
  private drawLeader(): void {
    const c = this.ctx!, L = this.look, lines = W.tapes[this.tape].leader;
    const pic = this.pic, k = pic.h / 540;
    c.fillStyle = this.spec.style === 'vcr' ? L.blue : L.panel; c.fillRect(pic.x, pic.y, pic.w, pic.h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const cx = pic.x + pic.w / 2, cy = pic.y + pic.h / 2;
    if (this.spec.style === 'vcr') {
      c.font = this.font(30); c.fillStyle = L.dim; c.fillText(lines[0], cx, cy - 90);
      c.font = this.font(46); c.fillStyle = L.ink; c.fillText(lines[1], cx, cy - 20);
      c.font = this.font(30); c.fillStyle = L.accent; c.fillText(lines[2], cx, cy + 46);
      c.font = this.font(42); c.fillStyle = L.accent; c.textAlign = 'left'; c.fillText(`${W.tapes['1997'].osd?.play ?? 'PLAY'} ▶`, 44, 54);
    } else if (this.spec.style === 'dvd') {
      c.fillStyle = ERA3.glass; const bw = Math.round(700 * k), bh = Math.round(290 * k); c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
      c.fillStyle = ERA3.accent; c.fillRect(cx - bw / 2, cy - bh / 2, bw, 8);
      c.font = this.font(Math.round(32 * k)); c.fillStyle = ERA3.greyDk; c.fillText(lines[0], cx, cy - 80 * k);
      c.font = this.font(Math.round(40 * k)); c.fillStyle = ERA3.accent; c.fillText(lines[1], cx, cy - 18 * k);
      c.font = this.font(Math.round(42 * k)); c.fillStyle = ERA3.ink; c.fillText(lines[2], cx, cy + 56 * k);
    } else {
      // 2026: Dad's share line, and his words ("Watch this. All of it." stays, on the set's screen)
      c.font = this.font(Math.round(36 * k)); c.fillStyle = L.dim; c.fillText(lines[0], cx, cy - 46 * k);
      c.font = this.font(Math.round(60 * k)); c.fillStyle = L.ink; c.fillText(lines[1], cx, cy + 40 * k);
    }
    c.textAlign = 'left';
  }

  /** while it plays: the reading-the-tape note while it loads */
  private drawPlaying(): void {
    const c = this.ctx!, L = this.look;
    if (this.state === 'loading') {
      const osd = W.tapes[this.tape].osd?.loading;
      if (osd) { c.font = this.font(this.spec.style === 'vcr' ? 38 : 30); c.fillStyle = L.accent; c.textBaseline = 'middle'; c.fillText(osd, 44, 54); }
    }
  }
  /** the part and the time, the player's own on-screen display (top right of the picture), while it is paused or stopped */
  private drawClock(): void {
    const c = this.ctx!, L = this.look, d = this.data, t = this.time;
    c.font = this.font(30); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'right';
    c.fillText(`${clock(t)} / ${clock(d.duration)}`, LW - 36, 54);
    let title = this.chapter?.title ?? '';
    c.font = this.font(24); c.fillStyle = L.dim;
    while (title.length > 4 && c.measureText(title).width > LW * 0.5) title = title.slice(0, -2);
    if (title !== (this.chapter?.title ?? '')) title = title.trimEnd() + '…';
    c.fillText(title, LW - 36, 90);
    c.textAlign = 'left';
  }
  /** paused (by the visitor, the story or the menu), or stopped by itself at the end of Part 1 — the picture stays (the end card
   *  is the programme's own), the player's pause sign; at Part 1's end a "▶ Play on" chip (the glass and ▶ both play on) */
  private drawPaused(partOne: boolean): void {
    const c = this.ctx!, L = this.look, osd = W.tapes[this.tape].osd;
    if (this.spec.style === 'vcr') {
      c.font = this.font(44); c.fillStyle = L.accent; c.textBaseline = 'middle'; c.fillText(`${osd?.pause ?? 'PAUSE'} ❚❚`, 44, 54);
    } else {
      const PIC = this.pic; c.fillStyle = hexA(L.bg, partOne ? 0.12 : 0.35); c.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
      c.font = this.font(34); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.fillText(`❚❚ ${osd?.pause ?? ''}`.trim(), 36, 54);
    }
    this.drawClock();
    if (partOne) this.chip(`▶  ${P.playOn}`);
  }
  /** a chip at the picture's foot, right (the player's own offer: Play on, From the start) */
  private chip(label: string): void {
    const c = this.ctx!, L = this.look;
    c.font = this.font(40); const bw = Math.ceil(c.measureText(label).width) + 56, bh = 74;
    const PIC = this.pic, r = { x: LW - bw - 30, y: PIC.y + PIC.h - bh - 26, w: bw, h: bh };
    if (this.spec.style === 'vcr') {
      c.fillStyle = ERA1.black; c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = ERA1.white; c.fillRect(r.x, r.y, r.w - 3, r.h - 3);
      c.fillStyle = ERA1.greyDark; c.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      c.fillStyle = ERA1.silver; c.fillRect(r.x + 3, r.y + 3, r.w - 9, r.h - 9);
      c.fillStyle = ERA1.black;
    } else {
      c.fillStyle = this.spec.style === 'dvd' ? ERA3.accent : L.panel; c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = L.ink; c.lineWidth = 2; c.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      c.fillStyle = L.ink;
    }
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillText(label, r.x + 28, r.y + r.h / 2 + 2);
  }
  /** the tape's own end: what was on it, and "From the start" (the glass or ▶ plays it again) */
  private drawEnded(): void {
    const c = this.ctx!, L = this.look;
    const PIC = this.pic;
    c.fillStyle = hexA(this.spec.style === 'vcr' ? L.blue : L.bg, this.spec.style === 'vcr' ? 0.92 : 0.82);
    c.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    if (this.spec.style === 'vcr') { c.font = this.font(40); c.fillStyle = L.accent; c.fillText(W.tapes['1997'].osd?.ended ?? '', 44, 54); }
    else { c.font = this.font(34); c.fillStyle = L.dim; c.fillText(W.tapes[this.tape].listHead, 44, 54); }
    const rows = this.data.chapters.filter((ch) => ch.kind === 'lesson' || ch.kind === 'commercial' || ch.kind === 'collapse' || ch.kind === 'break');
    c.font = this.font(28);
    rows.slice(0, 8).forEach((ch, i) => { c.fillStyle = ch.kind === 'commercial' ? L.dim : L.ink; c.fillText(ch.title, 60, 112 + i * 40); });
    this.chip(`▶  ${P.playAgain}`);
  }
  private drawStopped(): void {
    const c = this.ctx!, L = this.look;
    const PIC = this.pic; c.fillStyle = this.spec.style === 'vcr' ? L.blue : hexA(L.bg, 0.9); c.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    if (this.spec.style === 'vcr') { c.font = this.font(44); c.fillStyle = L.accent; c.fillText(W.tapes['1997'].osd?.stop ?? '', 44, 54); }
    const p = placeOf(this.tape), ch = this.data.chapters[chapterAt(this.data, p.t)];
    c.font = this.font(42); c.fillStyle = L.ink; c.fillText(this.data.title, 48, PIC.h * 0.36);
    c.font = this.font(32); c.fillStyle = L.dim; c.fillText(`${ch?.title ?? ''} · ${clock(p.t)}`, 48, PIC.h * 0.36 + 60);
    c.fillText(this.stopNote ?? P.stopped, 48, PIC.h * 0.36 + 112);
  }
  private drawError(): void {
    const c = this.ctx!, L = this.look;
    const PIC = this.pic; c.fillStyle = this.spec.style === 'vcr' ? L.blue : L.panel; c.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
    c.font = this.font(36); c.fillStyle = L.ink; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(P.cannot, PIC.x + PIC.w / 2, PIC.y + PIC.h / 2); c.textAlign = 'left';
  }

  /** where the walker and the probes aim: each key, a point on the bezel (the body), the glass's centre, in world metres */
  targets(): { keys: { id: SetKey; at: number[] }[]; body: number[]; glass: number[]; picTop: number[]; picBottom: number[]; keyRow: number[][] } {
    const m = this.set.root.getWorldTransform();
    const w = (x: number, y: number, z: number): number[] => { const p = m.transformPoint(new pc.Vec3(x, y, z)); return [p.x, p.y, p.z]; };
    const top = GLASS.cy + GLASS.h / 2, picBot = top - GLASS.h * (this.pic.h / LH);
    return { keys: KEY_POINTS.map((k) => ({ id: k.id, at: w(k.at[0], k.at[1], k.at[2]) })),
      body: w(-0.236, GLASS.cy + 0.06, GLASS.z - 0.004), glass: w(GLASS.cx, GLASS.cy, GLASS.z), picTop: w(GLASS.cx, top, GLASS.z), picBottom: w(GLASS.cx, picBot, GLASS.z),
      keyRow: [w(KEY_ROW.x0, KEY_ROW.y0, KEY_ROW.z), w(KEY_ROW.x1, KEY_ROW.y0, KEY_ROW.z), w(KEY_ROW.x0, KEY_ROW.y1, KEY_ROW.z), w(KEY_ROW.x1, KEY_ROW.y1, KEY_ROW.z)] };
  }

  debug() {
    const v = this.video;
    return { tape: this.tape, entity: this.entity.name, enabled: this.entity.enabled, setEnabled: this.set.root.enabled, LW, LH, state: this.state,
      t: v?.currentTime ?? null, paused: v?.paused ?? null, muted: v?.muted ?? null, volume: v?.volume ?? null, src: v?.src ?? null,
      chapter: this.chapter?.id ?? null, chapterKind: this.chapter?.kind ?? null, hits: this.hits.map((h) => ({ ...h })), needsSound: this.needsSound, userPaused: this.userPaused,
      draws: this.draws, place: { ...placeOf(this.tape) }, partOneEnd: this.data.partOneEnd, duration: this.data.duration,
      pose: this.pose, held: this.held, heldScale: this.heldScale, heldDist: this.heldDist, lastPress: this.lastPress, setDown: this.setDown,
      glass: { w: GLASS.w, h: GLASS.h, picFrac: this.pic.h / LH, barPx: this.barH }, floorCap: this.floorCap, barWorst: { ...this.barWorst }, bar: { ...this.bar, recent: [...this.bar.recent] }, targets: this.targets() };
  }
}

/**
 * ⚑ S394 (B3) — LAMBY'S LINE, IN VIEW. His: "on the headset there are no FADES … if needed we need to find a way for the line
 * to appear in the 360º environment." The guide's call (the set's moment) and its one later offer are drawn here, on a card
 * placed in the current view — on every device, the headset included — never on a monitor the visitor may have turned away
 * from. It sits a little under the line of sight at `call.flatDist` / `call.xrDist`, faces the eye, is drawn over the room
 * (no depth test: the desk or the monitor never cuts it), and if the visitor turns more than `call.followDeg` away it glides
 * back into view (`call.follow` s; it never fades). Its words, its buttons and its × are the guide's own (the balloon on the
 * glass is not drawn while this card shows it: said once). The era's balloon grammar (lambyGuideDraw.ts).
 */
class TvCall {
  readonly entity: pc.Entity;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly tex: pc.Texture;
  /** logical px (the desktop's grammar), drawn ×3 */
  private readonly S = 3;
  readonly CW = 300;
  readonly CH = 120;
  hits: Hit[] = [];
  private key = '';
  shown = false;
  private glide = 1;
  private readonly gFrom = new pc.Vec3();
  private readonly gTo = new pc.Vec3();
  /** the text it shows (the probe reads it) */
  text: string | null = null;
  constructor(app: pc.AppBase) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.CW * this.S; this.canvas.height = this.CH * this.S;
    this.ctx = this.canvas.getContext('2d');
    this.tex = makeScreenTexture(app, this.canvas, 'screen');
    this.entity = makeScreenEntity('teaching-tv-call', this.tex, CALL.w, CALL.w * this.CH / this.CW, true);
    const mi = this.entity.render?.meshInstances[0];
    if (mi?.material instanceof pc.StandardMaterial) { mi.material.depthTest = false; mi.material.update(); }
    if (this.entity.render) { this.entity.render.batchGroupId = -1; this.entity.render.castShadows = false; }
    if (mi) mi.drawOrder = 1000;
    this.entity.enabled = false;
    app.root.addChild(this.entity);
  }
  /** the card for a guide view, or hidden (`text` null) */
  show(skin: string, text: string | null, buttons: [string, string][], eye: pc.Entity | null, xr: boolean): void {
    if (!text || !eye) { if (this.shown) { this.shown = false; this.entity.enabled = false; this.text = null; } return; }
    const key = `${skin}|${text}|${buttons.map((b) => b[0]).join(',')}`;
    if (key !== this.key) { this.key = key; this.paint(skin, text, buttons); }
    if (!this.shown) { this.shown = true; this.text = text; this.place(eye, xr, true); this.entity.enabled = true; }
  }
  /** where it belongs now: a little under the line of sight, facing the eye */
  private spot(eye: pc.Entity, xr: boolean): pc.Vec3 {
    const { fwd, up } = eyeFrame(eye, xr);
    const d = xr ? CALL.xrDist : CALL.flatDist;
    const right = new pc.Vec3().cross(fwd, up).normalize();
    const q = new pc.Quat().setFromAxisAngle(right, -CALL.drop);
    return eye.getPosition().clone().add(q.transformVector(fwd.clone()).mulScalar(d));
  }
  private place(eye: pc.Entity, xr: boolean, now: boolean): void {
    const at = this.spot(eye, xr);
    if (now) { this.entity.setPosition(at); this.glide = 1; } else { this.gFrom.copy(this.entity.getPosition()); this.gTo.copy(at); this.glide = 0; }
    this.face(eye);
  }
  /** the plane's face (+Y) to the eye, its top up: look at the eye (−Z to it), turn about Y, tip up about X */
  private face(eye: pc.Entity): void {
    this.entity.lookAt(eye.getPosition(), pc.Vec3.UP);
    this.entity.rotateLocal(0, 180, 0);
    this.entity.rotateLocal(90, 0, 0);
  }
  update(dt: number, eye: pc.Entity, xr: boolean): void {
    if (!this.shown) return;
    if (this.glide < 1) {
      this.glide = Math.min(1, this.glide + dt / CALL.follow);
      this.entity.setPosition(new pc.Vec3().lerp(this.gFrom, this.gTo, smooth(this.glide)));
      this.face(eye);
      return;
    }
    // turned away: it comes back into view (a glide, never a fade)
    const to = this.entity.getPosition().clone().sub(eye.getPosition()).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, to.dot(eye.forward)))) / D2R;
    if (ang > CALL.followDeg) this.place(eye, xr, false);
  }
  /** a press: the button's id, 'card' (on the card, on no button: consumed), or null */
  press(ray: Ray): string | null {
    if (!this.shown) return null;
    const at = hitPlane(this.entity, this.CW, this.CH, ray);
    if (!at) return null;
    const h = this.hits.find((r) => at.x >= r.x && at.x <= r.x + r.w && at.y >= r.y && at.y <= r.y + r.h);
    return h ? h.id : at.y <= this.used ? 'card' : null;
  }
  /** the height the balloon uses (logical px; below it the card is clear and lets a press through) */
  private used = 0;
  /** the balloon, in the era's grammar */
  private paint(skin: string, text: string, buttons: [string, string][]): void {
    const c = this.ctx; if (!c) return;
    const S = this.S;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(S, 0, 0, S, 0, 0);
    this.hits = [];
    const e1 = skin === 'e1' || skin === 'e2', e3 = skin === 'e3';
    const ground = skin === 'e4' ? CHROME.field : e3 ? ERA3.glass : skin === 'e2' ? ERA1.paper : ERA1.tooltip;
    const ink = skin === 'e4' ? CHROME.ink : e3 ? ERA3.ink : ERA1.black;
    const accent = e3 ? ERA3.accent : skin === 'e4' ? CHROME.accent : ERA1.navy;
    const x = 2, w = this.CW - 4;
    ui.setFont(c, 14);
    const textX = x + 58, textW = w - 58 - 26;
    const lines = ui.wrapText(c, text, textW);
    const h = Math.min(this.CH - 4, 16 + lines.length * 19 + 36);
    const y = 2;
    this.used = y + h;
    if (e1) { ui.px(c, x, y, w, h, ERA1.black); ui.px(c, x + 1, y + 1, w - 2, h - 2, ground); }
    else {
      const edge = e3 ? ERA3.glassEdge : CHROME.fieldEdge;
      ui.px(c, x, y, w, h, edge); ui.px(c, x + 1, y + 1, w - 2, h - 2, ground); ui.px(c, x + 1, y + 1, w - 2, 3, accent);
    }
    // Lamby, the era's own face of him
    c.save(); c.beginPath(); c.rect(x + 4, y + 4, 50, h - 8); c.clip();
    if (skin === 'e4') { ui.setFont(c, 22); c.fillStyle = accent; c.fillText(decisions.helper.e4, x + 12, y + 14); }
    else if (e3) aero.drawLambMark(c, x + 29, y + 32, 1.4);
    else drawLambyChar(c, x + 29, y + 46, { mood: 'cheerful', action: 'idle', t: 0, moodStart: 0, scale: 0.36, headOnly: true });
    c.restore();
    ui.setFont(c, 14); c.fillStyle = ink;
    lines.forEach((l, i) => c.fillText(l, textX, y + 10 + i * 19));
    // × closes it (logged by the guide, like every dismissal)
    ui.setFont(c, 14); c.fillStyle = ink; c.fillText('×', x + w - 17, y + 6);
    this.hits.push({ id: 'lg-x', x: x + w - 26, y: y + 1, w: 25, h: 24 });
    let bx = textX;
    buttons.forEach(([id, label], i) => {
      ui.setFont(c, 12); const bw = Math.ceil(c.measureText(label).width) + 22, by = y + h - 31, bh = 24;
      if (e3) aero.button(c, bx, by, bw, bh, label, { primary: i === 0, size: 12 });
      else if (skin === 'e4') {
        ui.px(c, bx, by, bw, bh, i === 0 ? CHROME.button : CHROME.fieldEdge);
        if (i !== 0) ui.px(c, bx + 1, by + 1, bw - 2, bh - 2, CHROME.field);
        ui.setFont(c, 12); c.fillStyle = i === 0 ? CHROME.buttonInk : CHROME.ink; c.fillText(label, bx + 11, by + 6);
      } else {
        ui.px(c, bx, by, bw, bh, ERA1.black); ui.px(c, bx, by, bw - 1, bh - 1, ERA1.white);
        ui.px(c, bx + 1, by + 1, bw - 2, bh - 2, ERA1.grey); ui.px(c, bx + 1, by + 1, bw - 3, bh - 3, ERA1.beige);
        ui.setFont(c, 12); c.fillStyle = ERA1.black; c.fillText(label, bx + 11, by + 6);
      }
      this.hits.push({ id, x: bx, y: by, w: bw, h: bh }); bx += bw + 8;
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.tex.upload();
  }
  hide(): void { this.show('', null, [], null, false); }
}

/** what the moment needs from the engine (app.ts implements it; nothing here moves the camera) */
export interface TvHost {
  era(): string;
  /** the era's beat has been reached: the story may bring this tape now */
  due(tape: TapeId): boolean;
  /** no other voice, no felt scene, no update, nothing scripted, the menu shut: the floor is free */
  quiet(tape: TapeId, dueFor: number): boolean;
  /** the game menu (or the idle cycle) holds the piece: the moment's clock stops */
  held(): boolean;
  /** the eye a brought set faces: the logical head in a headset, the camera otherwise */
  eye(): pc.Entity;
  /** the flat camera (its field of view sizes the set in the hand), or null in a headset */
  camera(): pc.CameraComponent | null;
  xr(): boolean;
  /** the era's own arrival (2026: Dad's message and link) */
  announce(tape: TapeId): void;
  /** Lamby's call: `text` while the call is up, null to take it down */
  call(tape: TapeId, text: string | null): void;
  /** Lamby's call balloon is still up (not yet answered or closed) */
  callOpen(): boolean;
  /** a press on the in-view card's button, handed to the guide ('lg-take', 'lg-later', 'lg-x') */
  guidePress(id: string): void;
}

export type MomentStage = 'idle' | 'call' | 'bring' | 'play' | 'after' | 'done';

/** ONCE PER ROOM: the set lights with its leader, Lamby's line in view, the set comes to the visitor, the tape plays from its
 *  start to the end of Part 1, a breath on the end card, and the floor is free (the set waits, held, ▶ ready) */
class TvMoment {
  stage: MomentStage = 'idle';
  private t = 0;
  private started = 0;
  private go = false;
  private callSeen = false;
  private callClosedAt = -1;
  dueFor = 0;
  /** seconds from the set lighting to the floor being free (the probe reports the cost) */
  seconds = 0;
  /** seconds from the set lighting to the set setting off (the call's share) */
  callSeconds = 0;
  constructor(private readonly tv: TeachingTv, private readonly host: TvHost) {}
  get running(): boolean { return this.stage !== 'idle' && this.stage !== 'done'; }
  get calling(): boolean { return this.stage === 'call'; }
  takeNow(): void { if (this.stage === 'call') this.go = true; }
  abort(note: string | null): void {
    if (!this.running) return;
    this.tv.stop(note);
    this.tv.markPartOneSeen();
    this.host.call(this.tv.tape, null);
    this.stage = 'done';
  }
  update(dt: number): void {
    if (this.stage === 'done') return;
    const tape = this.tv.tape;
    if (this.stage === 'idle') {
      const due = this.host.due(tape);
      this.dueFor = due ? this.dueFor + dt : 0;
      if (due && this.host.quiet(tape, this.dueFor)) {
        this.tv.showLeader();
        this.host.announce(tape);
        const call = W.lamby.call[TAPE_ERA[tape]];
        if (call) this.host.call(tape, call);
        this.stage = 'call'; this.t = 0; this.go = false; this.callSeen = false; this.callClosedAt = -1; this.started = performance.now();
      }
      return;
    }
    if (this.host.held()) return;
    this.t += dt;
    switch (this.stage) {
      case 'call': {
        // Lamby's line is in view: its yes sends the set at once; × closes the balloon and the set comes after a breath (the
        //   system forces, Lamby only speaks); otherwise the line is given `callHold` to be read. A call that never showed (the
        //   era's cap) lets the set come after `noCall`.
        if (this.host.callOpen()) this.callSeen = true;
        else if (this.callSeen && this.callClosedAt < 0) this.callClosedAt = this.t;
        const ready = this.go || this.t >= MOMENT.callHold
          || (this.callClosedAt >= 0 && this.t - this.callClosedAt >= MOMENT.dismissBreath)
          || (!this.callSeen && this.t >= MOMENT.noCall);
        if (ready) {
          this.host.call(tape, null);
          this.callSeconds = (performance.now() - this.started) / 1000;
          this.tv.take(this.host.eye(), this.host.xr(), this.host.camera());
          this.stage = 'bring'; this.t = 0;
        }
        break;
      }
      case 'bring':
        if (this.tv.pose === 'held') { this.tv.play(0); this.stage = 'play'; this.t = 0; }
        else if (this.tv.pose === 'rest' && this.t > 0.5) { this.tv.markPartOneSeen(); this.finish(); }   // it never set off (the era left)
        break;
      case 'play': {
        const s = this.tv.state;
        const refused = ((s === 'paused' || s === 'loading') && !this.tv.userPaused && this.t >= MOMENT.noPlayRelease && this.tv.time < 0.2)
          || this.tv.stalledFor >= MOMENT.noPlayRelease;
        if (!this.tv.held) { this.tv.markPartOneSeen(); this.finish(); break; }   // set down by the visitor: the moment lets go
        if (s === 'partOne' || s === 'ended' || s === 'error' || this.tv.userPaused || s === 'stopped' || refused) {
          this.tv.markPartOneSeen();
          this.stage = 'after'; this.t = 0;
        }
        break;
      }
      case 'after':
        // the end card, a breath: then the floor is free. ▶ (playing on) or setting it down ends the breath at once.
        if (this.tv.playing || !this.tv.held || this.t >= MOMENT.afterHold) this.finish();
        break;
      default: break;
    }
  }
  private finish(): void {
    this.seconds = (performance.now() - this.started) / 1000;
    this.stage = 'done';
  }
}

/** THE THREE, and the rules they share: one era's set in the room at a time, one moment per room, one voice at a time */
export class TeachingTvs {
  readonly tvs: Record<TapeId, TeachingTv>;
  private readonly moments: Record<TapeId, TvMoment>;
  private readonly card: TvCall;
  private era = '';
  private voicesWas: Record<string, string> = {};
  /** the look-mode's reading scale (degrees or CSS px per canvas px, held) and the bar's floor */
  reading: ReturnType<typeof readingScale> = { unit: 'px', perCanvas: 1, floor: 19.4, phone: false };
  constructor(app: pc.AppBase, private readonly host: TvHost) {
    this.tvs = { '1997': new TeachingTv(app, '1997'), '2016': new TeachingTv(app, '2016'), '2026': new TeachingTv(app, '2026') };
    this.moments = { '1997': new TvMoment(this.tvs['1997'], host), '2016': new TvMoment(this.tvs['2016'], host), '2026': new TvMoment(this.tvs['2026'], host) };
    this.card = new TvCall(app);
  }
  get momentRunning(): boolean { return TAPE_IDS.some((t) => this.moments[t].running); }
  moment(tape: TapeId): TvMoment { return this.moments[tape]; }
  get audible(): boolean { return TAPE_IDS.some((t) => this.tvs[t].audible); }
  current(): TeachingTv | null { const id = TAPE_IDS.find((t) => TAPE_ERA[t] === this.era); return id ? this.tvs[id] : null; }
  /** a set is in the hand (or on its way): it is in front of everything for a press */
  get holding(): boolean { return TAPE_IDS.some((t) => this.tvs[t].held); }
  /** a held set is playing: the visitor is watching (the story waits: one voice at a time) */
  get watching(): boolean { return TAPE_IDS.some((t) => this.tvs[t].held && this.tvs[t].playing); }
  /** Lamby's line is on the card in view */
  get carding(): boolean { return this.card.shown; }

  /**
   * every frame. `voices` = each of the story's voices by name, as a short signature ('' when silent). A voice that ARRIVES
   * (a name whose signature turns non-empty or changes) pauses a set the visitor set playing — and, held, sends it back to
   * its place, paused where it was (the story moving on). `updateArmed` = the era's update ritual has begun.
   */
  update(dt: number, era: string, voices: Record<string, string>, updateArmed: boolean): void {
    if (era !== this.era) {
      for (const id of TAPE_IDS) {
        const mine = TAPE_ERA[id] === era;
        if (!mine) this.moments[id].abort(P.stopped);
        this.tvs[id].setInEra(mine);
        if (mine && this.moments[id].stage === 'idle') this.tvs[id].preload();
      }
      this.era = era;
    }
    if (updateArmed) for (const id of TAPE_IDS) {
      if (this.moments[id].running) this.moments[id].abort(P.stopped);
      // ⚑ S394 fix — stopped at the update even if a voice paused it a moment before (the update's own notice arrives first)
      const st = this.tvs[id].state;
      if (st === 'playing' || st === 'loading' || st === 'paused' || st === 'partOne' || st === 'leader') this.tvs[id].stop(P.stopped);
      if (this.tvs[id].held) this.tvs[id].putBack(this.host.eye().getPosition(), 'story');
    }
    for (const id of TAPE_IDS) this.moments[id].update(dt);
    // ONE VOICE AT A TIME: the moment holds the floor, and so does a held set that is playing (the visitor is watching)
    const floor = this.momentRunning || this.watching;
    if (floor && !voiceHolder()) holdVoice('teaching-tv');
    else if (!floor) releaseVoice('teaching-tv');
    setVoiceWanted(TAPE_IDS.some((id) => this.moments[id].stage === 'idle' && this.moments[id].dueFor > 0) ? 'teaching-tv' : null);
    // the story speaks: a set the visitor set playing pauses itself and keeps its place; a held set goes back to its place
    const arrived = Object.keys(voices).some((k) => voices[k] !== '' && voices[k] !== (this.voicesWas[k] ?? ''));
    if (arrived && !this.momentRunning) {
      for (const id of TAPE_IDS) {
        const tv = this.tvs[id];
        if (tv.playing) tv.pause('story');
        if (tv.held) tv.putBack(this.host.eye().getPosition(), 'story');
      }
    }
    this.voicesWas = { ...voices };
    // ⚑ S394 fix — the bar's capital floor for this look-mode (1.0° / 14 px / 12 px), in canvas px: each tape sizes its bar to it
    this.reading = readingScale(this.host.xr(), this.host.camera());
    for (const id of TAPE_IDS) this.tvs[id].setFloor(this.reading.floor);
    // the visitor's seat changed under a held set (a marker, a scripted send): the story moved on, the set goes back
    const eyeNow = this.host.eye().getPosition();
    for (const id of TAPE_IDS) {
      const tv = this.tvs[id];
      if (tv.pose === 'held' && tv.takenAt.distance(eyeNow) > 0.45) tv.putBack(eyeNow, 'story');
    }
    for (const id of TAPE_IDS) this.tvs[id].update(dt);
    this.card.update(dt, this.host.eye(), this.host.xr());
  }

  /** ⚑ S394 — the guide's call and its one later offer, drawn IN VIEW (the card), from the guide's own view. Each frame. */
  guide(view: { era: string; rung: string; text: string | null; hidden: boolean }, active: boolean): void {
    const up = active && !view.hidden && (view.rung === 'tvcall' || view.rung === 'tv') && !!view.text;
    const buttons: [string, string][] = view.rung === 'tv' ? [['lg-take', W.lamby.yes], ['lg-later', W.lamby.no]] : [['lg-take', W.lamby.yes]];
    this.card.show(view.era, up ? view.text : null, buttons, this.host.eye(), this.host.xr());
  }
  /** a press on the card (true: it took it) */
  pressCard(ray: Ray): boolean {
    const id = this.card.press(ray);
    if (!id) return false;
    if (id !== 'card') this.host.guidePress(id);
    return true;
  }
  /** a press on a held set (true: it took it); a press that misses it passes on to the room */
  pressHeld(ray: Ray): boolean {
    for (const id of TAPE_IDS) if (this.tvs[id].held && this.tvs[id].press(ray, this.host.eye(), this.host.xr(), this.host.camera())) return true;
    return false;
  }
  /** a press on a resting, lit set brings it (true: it took it) */
  pressRest(ray: Ray): boolean {
    for (const id of TAPE_IDS) {
      const tv = this.tvs[id];
      if (tv.pose === 'rest' && tv.press(ray, this.host.eye(), this.host.xr(), this.host.camera())) return true;
    }
    return false;
  }
  /** what a ray is on, and where (the sentence line names it; in a headset the ray ends there) */
  aimPoint(ray: Ray): { tape: TapeId; what: SetAim | 'card'; at: { x: number; y: number; z: number } } | null {
    if (this.card.press(ray)) {
      const p = this.card.entity.getPosition();
      return { tape: TAPE_IDS.find((t) => TAPE_ERA[t] === this.era) ?? '1997', what: 'card', at: { x: p.x, y: p.y, z: p.z } };
    }
    const order = [...TAPE_IDS].sort((a, b) => Number(this.tvs[b].held) - Number(this.tvs[a].held));
    for (const id of order) {
      const tv = this.tvs[id];
      const what = tv.aim(ray, this.host.xr());
      if (!what) continue;
      const { a, b } = toLocal(tv.set.root, ray);
      const t = hitBounds(a, b) ?? 0;
      const at = new pc.Vec3().lerp(ray.p0, ray.p1, t);
      return { tape: id, what, at: { x: at.x, y: at.y, z: at.z } };
    }
    return null;
  }

  /** Lamby may offer to bring the set to a stalled visitor: the era's tape has more to play, it is not playing or held, the
   *  moment is over (the once-per-era is Lamby's own, src/narrative/lambyGuide.ts) */
  offerDue(era: string): boolean {
    const tv = this.current(); if (!tv || TAPE_ERA[tv.tape] !== era) return false;
    const p = placeOf(tv.tape);
    return this.moments[tv.tape].stage === 'done' && p.partOneSeen && !tv.playing && tv.pose === 'rest' && p.t < TAPES[tv.tape].duration - 1;
  }
  lambyLine(era: string): string { return W.lamby[era] ?? ''; }
  /** Lamby's yes: during the call, the set comes now; afterwards, the set is brought to the visitor (▶ is theirs to press) */
  takeTo(): void {
    const tv = this.current(); if (!tv) return;
    const m = this.moments[tv.tape];
    if (m.calling) { m.takeNow(); return; }
    tv.wake();
    tv.take(this.host.eye(), this.host.xr(), this.host.camera());
  }

  /** the Close and a Leave: every set stops and goes; the places stay in memory for the era websites */
  stopAll(): void {
    for (const id of TAPE_IDS) { this.moments[id].abort(P.stopped); this.tvs[id].stop(P.stopped); this.tvs[id].setInEra(false); }
    this.era = 'close';
    this.card.hide();
    releaseVoice('teaching-tv');
  }

  redraw(): void { for (const id of TAPE_IDS) this.tvs[id].redraw(); }

  // ── review aids (?debug=1): the walker, the probes ───────────────────────
  debug() {
    const p = this.card.entity.getPosition();
    return { era: this.era, name: SET_NAME, holding: this.holding, watching: this.watching,
      moments: Object.fromEntries(TAPE_IDS.map((t) => [t, { stage: this.moments[t].stage, seconds: this.moments[t].seconds, callSeconds: this.moments[t].callSeconds }])),
      call: { shown: this.card.shown, text: this.card.text, hits: this.card.hits.map((h) => ({ ...h })), entity: this.card.entity.name, cw: this.card.CW, ch: this.card.CH, at: [p.x, p.y, p.z] },
      tvs: TAPE_IDS.map((t) => this.tvs[t].debug()) };
  }
  /** ⚑ S394 fix (review aid) — every moment of every tape drawn into its bar in this look-mode, in its units */
  fitAll() {
    const r = this.reading;
    return { reading: r, tapes: Object.fromEntries(TAPE_IDS.map((t) => [t, this.tvs[t].fitAll()])) };
  }
  canvases(): Record<string, HTMLCanvasElement> {
    return Object.fromEntries([...TAPE_IDS.flatMap((t) => [[`tv${t}`, this.tvs[t].canvas], [`set${t}`, this.tvs[t].set.decal]] as [string, HTMLCanvasElement][]), ['call', this.card.canvas] as [string, HTMLCanvasElement]]);
  }
}
