import { reducedMotion, setReducedMotion } from '../../state/motion';
import { setOneShotsMuted } from '../../audio/tapeAudio';
/** Pre-story setup, on the same desktop canvas and hit rectangles as the OS.
 * The restore entrance calls startSetup() in the stars, before restoring the seat.
 * The entrance owns the Enter glitch; ?setup=1 remains the monitor review route.
 * Programme balloons are operable; all information lives in plain windows.
 * No record, storage, voice or assistant sound. Only view preferences carry on.
 */
import copy from '../../../data/strings/setup.json';
import { ERA1 as P } from '../theme/era1';
import * as ui from '../theme/chrome';
import { drawWeb1997Icon } from '../apps/web1997';
import { drawLambyChar } from '../apps/lambyChar';
import { playOnce, adoptOneShot, stopClip } from '../../audio/tapeAudio';
import { ledger } from '../../state/ledger';
import { chooseCut, currentCut, type Cut } from '../../state/cut';
import { AdvertEndCard } from './advertEnd';

export interface SetupHit { x: number; y: number; w: number; h: number; id: string }
interface SetupHost { setup: LambySetup | null; dirty: boolean }
let host: SetupHost | null = null;
/** The desktop registers itself, so the entrance needs no OS argument. */
export function registerSetupHost(os: SetupHost): void { host = os; }
export function startSetup(): Promise<{ cut: 'full' | 'speedrun' }> {
  if (!host) return Promise.reject(new Error('Setup requires the desktop canvas'));
  if (host.setup?.open) return host.setup.result;
  const os = host;
  os.setup = new LambySetup();
  os.dirty = true;
  return os.setup.result;
}

type WindowKind = 'about' | 'session' | 'look' | 'note' | 'advert' | 'asterisk';
export class LambySetup {
  open = true;
  hits: SetupHit[] = [];
  dirty = true;
  readonly result: Promise<{ cut: Cut }>;
  private resolve!: (result: { cut: Cut }) => void;
  private step = 0;
  private noteT = 0;
  private noteOpened = false;
  private noteClosedAt: number | null = null;
  private clock = 0;
  private dismissed = false;
  private window: WindowKind | null = null;
  private hover = '';
  private aboutPage = 0;
  private get mobile(): boolean { return window.innerWidth < 600; }
  private cut: Cut = currentCut();
  /** ⚑ S245 — THE OPENING FILM ("LambyOS — Welcome Home", 1:36). Mandatory: no skip control exists, and nothing in
   *  this class can end it early. It ends only by ending (or by failing to load, so a visitor is never stranded). */
  private film: HTMLVideoElement | null = null;
  private filmT = -1;
  private filmNudge = 0;
  /** ⚑ S242 — the advert's end card: noise → gathered title + the small print (played advert only) */
  endCard: AdvertEndCard | null = null;
  private endCardPaint = 0;
  private sound: HTMLAudioElement | null = null;
  private deviceStatus = '';
  /** Engine wires the existing sensor request; called in the real tap stack. */
  requestDeviceLook: (() => void) | null = null;
  deviceLookAvailable = false;

  constructor() { this.result = new Promise((resolve) => { this.resolve = resolve; }); }
  get ready(): boolean { return this.noteOpened && this.noteClosedAt !== null && this.clock - this.noteClosedAt >= 4; }
  get stage(): string { return this.window ?? `balloon-${this.step + 1}`; }
  /** the film is on the glass (the entrance ducks its own music under it) */
  get filmActive(): boolean { return this.window === 'advert' && this.film !== null; }
  setDeviceStatus(status: 'asking' | 'denied' | 'silent' | 'live' | 'idle' | 'unsupported'): void {
    const text = status === 'asking' ? copy.look.asking : status === 'denied' ? copy.look.denied
      : status === 'silent' || status === 'unsupported' ? copy.look.unavailable : '';
    if (text !== this.deviceStatus) { this.deviceStatus = text; this.dirty = true; }
  }
  private advance(step: number): void {
    this.step = step; this.window = null; this.noteT = 0; this.hits = []; this.dirty = true;
    if (step === 7) this.prepareFilm();   // start fetching while the offer is on screen
  }
  private prepareFilm(): void {
    if (this.film) return;
    const v = document.createElement('video');
    v.src = 'assets/video/lambyos_welcome_home.mp4';
    v.preload = 'auto'; v.playsInline = true; v.controls = false; v.disablePictureInPicture = true;
    v.setAttribute('disablepictureinpicture', ''); v.setAttribute('controlslist', 'nodownload noremoteplayback');
    adoptOneShot(v);   // the frame's mute, the menu's hold and the idle cycle's mute reach the film's sound
    v.addEventListener('ended', () => this.endFilm());
    // a film that cannot load or play (no H.264 here) must not strand the visitor on a step with no control
    v.addEventListener('error', () => this.endFilm());
    this.film = v;
  }
  private startFilm(): void {
    this.prepareFilm();
    const v = this.film!;
    this.window = 'advert'; this.hits = []; this.dirty = true; this.filmT = -1;
    v.currentTime = 0;
    v.play().catch(() => { if (this.film === v && v.paused && !v.ended) this.endFilm(); });
  }
  private endFilm(): void {
    const v = this.film;
    if (!v || this.window !== 'advert') { if (v && !this.open) this.dropFilm(); return; }
    this.dropFilm();
    this.advance(8);   // the film carries its own ending card; the setup's own post-advert card is not shown after it
  }
  private dropFilm(): void {
    const v = this.film; this.film = null;
    if (!v) return;
    stopClip(v); v.removeAttribute('src'); v.load();
  }
  private closeWindow(): void {
    const w = this.window;
    if (w === 'asterisk') { this.endCard = null; this.advance(8); }
    else if (w === 'note') { if (this.noteClosedAt === null) this.noteClosedAt = this.clock; this.advance(6); }
    else if (w === 'about') this.advance(2);
    else if (w === 'session') this.advance(3);
    else if (w === 'look') this.advance(5);
  }
  update(dt: number): void {
    if (!this.open) return;
    this.clock += dt;
    if (this.step === 5 && !this.window) {
      this.noteT += dt;
      if (this.noteT >= 0.8) { this.window = 'note'; this.noteOpened = true; this.hits = []; this.dirty = true; }
    }
    if (this.noteClosedAt !== null && this.clock - this.noteClosedAt >= 4 && !this.readyDrawn) { this.readyDrawn = true; this.dirty = true; }
    if (this.film && this.window === 'advert') {
      // redraw (and so re-upload the XR texture) only when the film has a new frame — never while it is paused
      const v = this.film;
      if (!v.paused && v.readyState >= 2 && v.currentTime !== this.filmT) { this.filmT = v.currentTime; this.dirty = true; }
      // something outside the piece paused it (a hidden tab): give it back, at most once a second
      this.filmNudge += dt;
      if (v.paused && !v.ended && v.readyState >= 2 && this.filmNudge >= 1 && document.visibilityState === 'visible') {
        this.filmNudge = 0; v.play().catch(() => { /* needs a gesture; the next press gives it */ });
      }
    }
    if (this.window === 'asterisk' && this.endCard) {
      this.endCard.update(dt);
      // ~30 fps is plenty for static and a slow crawl; reduced motion draws the card once
      this.endCardPaint += dt;
      if (this.endCard.animating && this.endCardPaint >= 1 / 30) { this.endCardPaint = 0; this.dirty = true; }
    }
  }
  private readyDrawn = false;
  destroy(): void { this.open = false; this.hits = []; this.sound?.pause(); this.dropFilm(); }
  private testSound(): void { this.sound?.pause(); this.sound = playOnce('startup_1997.mp3'); }
  handleMove(x: number, y: number): void {
    const id = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.id ?? '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }
  handleClick(x: number, y: number): void {
    const id = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.id;
    if (!id) return;
    if (id === 'setup-compact-close') {
      if (this.step < 6) this.advance(5);
      else if (this.step === 6) { chooseCut(this.cut); this.advance(7); }
      else if (this.step === 7) this.advance(8);
      else if (this.ready) { this.destroy(); this.resolve({ cut: this.cut }); }
      return;
    }
    if (id === 'setup-close') { this.closeWindow(); return; }
    if (id === 'setup-about-back' || id === 'setup-about-next') { this.aboutPage += id === 'setup-about-next' ? 1 : -1; this.dirty = true; return; }
    if (id === 'setup-device') { this.requestDeviceLook?.(); return; }
    if (id === 'setup-reduce-motion') { setReducedMotion(!reducedMotion()); this.dirty = true; return; }
    if (id === 'setup-test') { this.testSound(); return; }
    if (id === 'setup-sound-on' || id === 'setup-sound-quiet') {
      ledger.view.captions = id === 'setup-sound-quiet'; setOneShotsMuted(ledger.view.captions); this.sound?.pause(); this.advance(4); return;
    }
    if (id === 'setup-dismiss') { this.dismissed = true; if (this.step < 6) this.advance(5); this.dirty = true; return; }
    if (id === 'setup-note-open') { this.window = 'note'; this.noteOpened = true; this.dirty = true; return; }
    const n = Number(id.substring(id.lastIndexOf('-') + 1));
    if (this.step === 0) { if (n === 1) this.dismissed = true; this.advance(n === 0 ? 1 : 5); }
    else if (this.step === 1) { if (n === 0) this.window = 'about'; else this.advance(2); }
    else if (this.step === 2) { if (n === 0) this.window = 'session'; else this.advance(3); }
    else if (this.step === 3) {
      if (n === 0) this.testSound();
      else { ledger.view.captions = n === 2; setOneShotsMuted(ledger.view.captions); this.advance(4); }
    } else if (this.step === 4) this.window = 'look';
    else if (this.step === 6) { this.cut = n === 0 ? 'full' : 'speedrun'; chooseCut(this.cut); this.advance(7); }
    else if (this.step === 7) this.startFilm();   // the only button; there is no other way past this step
    else if (this.step === 8 && this.ready) { this.destroy(); this.resolve({ cut: this.cut }); }
    this.hits = []; this.dirty = true;
  }
  private text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size = 11): number {
    ui.setFont(ctx, size); ctx.fillStyle = P.black;
    for (const line of ui.wrapText(ctx, text, width)) { ctx.fillText(line, x, y); y += size + (this.mobile ? 3 : 5); }
    return y;
  }
  private button(ctx: CanvasRenderingContext2D, id: string, label: string, x: number, y: number, w: number, disabled = false): void {
    const h = this.mobile ? 36 : 27;
    ui.button(ctx, x, y, w, h, label, { disabled, hover: this.hover === id });
    if (this.mobile) {
      ui.setFont(ctx, 14);
      // Cover the small shared-chrome label before setting the larger one.
      ui.px(ctx, x + 2, y + 2, w - 4, h - 4, P.beige);
      ctx.fillStyle = disabled ? P.grey : this.hover === id ? P.navy : P.black;
      ctx.fillText(label, Math.round(x + (w - ctx.measureText(label).width) / 2), y + 10);
    }
    if (!disabled) this.hits.push({ id, x, y, w, h });
  }
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = []; ui.resetFrames();
    ui.px(ctx, 0, 0, 512, 384, P.teal);
    // Inert desktop furniture; only the setup's controls publish hits.
    copy.icons.forEach((label, i) => {
      const y = 22 + i * 72;
      ui.bevel(ctx, 26, y, 28, 23, true); ui.px(ctx, 30, y + 4, 20, 12, i === 0 ? P.navy : P.paper);
      ui.px(ctx, 35, y + 24, 10, 3, P.silver);
      ui.setFont(ctx, 9); ctx.fillStyle = P.white;
      ui.wrapText(ctx, label, 78).forEach((l, j) => ctx.fillText(l, Math.round(40 - ctx.measureText(l).width / 2), y + 33 + j * 12));
    });
    ui.bevel(ctx, 0, 356, 512, 28, true);
    ui.button(ctx, 4, 360, 54, 21, copy.startMenu);
    ui.bevel(ctx, 64, 360, 190, 21, false); ui.setFont(ctx, 10); ctx.fillStyle = P.black; ctx.fillText(copy.title, 72, 365);
    if (this.window) { this.drawWindow(ctx); return; }
    if (this.mobile) { this.drawMobileBalloon(ctx); return; }
    if (!this.dismissed) {
      ui.bevel(ctx, 359, 304, 122, 29, true); ui.px(ctx, 366, 310, 108, 16, P.paper);
      drawLambyChar(ctx, 420, 260, { mood: 'cheerful', action: 'point', t: 0, moodStart: 0, scale: 0.7 });
      // Stepped tooltip tail, with no non-pixel rotation.
      ui.px(ctx, 349, 216, 18, 15, P.black); ui.px(ctx, 350, 216, 15, 13, P.tooltip);
      ui.px(ctx, 362, 228, 10, 9, P.black); ui.px(ctx, 363, 228, 7, 6, P.tooltip);
    }
    if (this.dismissed) {
      const c = ui.windowFrame(ctx, 111, 76, 360, 140, copy.title);
      if (this.step !== 7 && (this.step < 8 || this.ready)) this.hits.push({ ...c.closeBox, id: 'setup-compact-close' });
    }
    else { ui.px(ctx, 110, 75, 362, 142, P.black); ui.px(ctx, 111, 76, 360, 140, P.tooltip); }
    const b = copy.balloons[this.step];
    const by = this.dismissed ? 105 : 94;
    this.text(ctx, b.text, 128, by, 321, 12);
    if (!this.dismissed) {
      ui.setFont(ctx, 11); ctx.fillStyle = P.black; ctx.fillText(copy.dismiss, 454, 80);
      this.hits.push({ id: 'setup-dismiss', x: 449, y: 77, w: 20, h: 20 });
    }
    let x = 128;
    b.buttons.forEach((label, i) => {
      ui.setFont(ctx, 10); const w = Math.ceil(ctx.measureText(label).width) + 18;
      this.button(ctx, this.step === 7 ? 'setup-advert-play-0' : this.step === 3 ? ['setup-test', 'setup-sound-on', 'setup-sound-quiet'][i] : `setup-choice-${i}`, label, x, 169, w, this.step === 8 && !this.ready);
      x += w + 6;
    });
  }
  private drawMobileBalloon(ctx: CanvasRenderingContext2D): void {
    const b = copy.balloons[this.step];
    if (!this.dismissed) drawLambyChar(ctx, 414, 308, { mood: 'cheerful', action: 'point', t: 0, moodStart: 0, scale: 0.52 });
    if (this.dismissed) {
      const c = ui.windowFrame(ctx, 20, 26, 472, 246, copy.title);
      if (this.step !== 7 && (this.step < 8 || this.ready)) this.hits.push({ ...c.closeBox, id: 'setup-compact-close' });
    } else {
      ui.px(ctx, 20, 26, 472, 246, P.black); ui.px(ctx, 21, 27, 470, 244, P.tooltip);
      ui.px(ctx, 373, 272, 16, 16, P.black); ui.px(ctx, 374, 272, 14, 14, P.tooltip);
      ui.setFont(ctx, 14); ctx.fillStyle = P.black; ctx.fillText(copy.dismiss, 470, 32);
      this.hits.push({ id: 'setup-dismiss', x: 458, y: 28, w: 30, h: 30 });
    }
    this.text(ctx, b.text, 42, this.dismissed ? 57 : 49, 414, 16);
    b.buttons.forEach((label, i) => {
      const id = this.step === 7 ? 'setup-advert-play-0'
        : this.step === 3 ? ['setup-test','setup-sound-on','setup-sound-quiet'][i] : `setup-choice-${i}`;
      this.button(ctx, id, label, 42, 139 + i * 42, 320, this.step === 8 && !this.ready);
    });
  }
  private drawWindow(ctx: CanvasRenderingContext2D): void {
    const kind = this.window!;
    if (kind === 'advert') {
      // ⚑ S245 — the player's window, and no control on it at all: no close box, no Skip, nothing that publishes a hit.
      // The 16:9 film fills the content (480 × 270 logical, ×3 on the canvas); the frame's menu (Esc) is the only way out.
      const c = ui.windowFrame(ctx, 12, 30, 488, 295, copy.advert.title);
      ui.px(ctx, c.closeBox.x - 1, c.closeBox.y - 1, c.closeBox.w + 2, c.closeBox.h + 2, P.titleBlue);   // no dead close box
      ui.px(ctx, c.x, c.y, 480, 270, P.black);
      const v = this.film;
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(v, c.x, c.y, 480, 270);
        ctx.imageSmoothingEnabled = false;
      }
      return;
    }
    if (kind === 'asterisk') {
      // ⚑ S242 — the player's own window, filled with noise that gathers into the title (advertEnd.ts).
      // Frame voice; one Close, no assistant or other control.
      const c = ui.windowFrame(ctx, 26, 22, 460, 340, copy.advert.title);
      this.endCard?.draw(ctx, c);
      this.button(ctx, 'setup-close', copy.close, c.x + c.w - 93, c.y + c.h - 37, 81);
      return;
    }
    const c = ui.windowFrame(ctx, 20, 19, 472, 321, copy[kind].title);
    this.hits.push({ ...c.closeBox, id: 'setup-close' });
    if (kind === 'about') {
      copy.about.toolbar.forEach((label, i) => {
        ui.bevel(ctx, c.x + 3 + i * 48, c.y + 1, 46, 30, true);
        drawWeb1997Icon(ctx, ['back','fwd','reload','home','search','print'][i], c.x + 20 + i * 48, c.y + 5, false);
        ui.setFont(ctx, 8); ctx.fillStyle = P.grey; ctx.fillText(label, c.x + 6 + i * 48, c.y + 18);
      });
      ui.setFont(ctx, 9); ctx.fillStyle = P.black; ctx.fillText(copy.about.location, c.x + 4, c.y + 38);
      ui.inputField(ctx, c.x + 62, c.y + 34, c.w - 67, 19, copy.about.address, false);
      ui.px(ctx, c.x, c.y + 57, c.w, c.h - 76, P.paper);
      if (this.mobile) {
        ui.setFont(ctx, 14);
        const lines = copy.about.paragraphs.flatMap(p => [...ui.wrapText(ctx, p, c.w - 28), '']);
        const pageSize = 10, pages = Math.ceil(lines.length / pageSize);
        this.aboutPage = Math.max(0, Math.min(pages - 1, this.aboutPage));
        ctx.fillStyle = P.black;
        lines.slice(this.aboutPage * pageSize, (this.aboutPage + 1) * pageSize).forEach((line, i) => ctx.fillText(line, c.x + 14, c.y + 64 + i * 17));
        this.button(ctx, 'setup-about-back', copy.about.toolbar[0], c.x + 12, c.y + c.h - 43, 95, this.aboutPage === 0);
        this.button(ctx, 'setup-about-next', copy.about.toolbar[1], c.x + 116, c.y + c.h - 43, 110, this.aboutPage === pages - 1);
      } else {
        let y = c.y + 66;
        for (const p of copy.about.paragraphs) y = this.text(ctx, p, c.x + 12, y, c.w - 24, 9) + 6;
      }
      ui.bevel(ctx, c.x, c.y + c.h - 18, c.w, 17, false);
      this.text(ctx, copy.about.status, c.x + 4, c.y + c.h - 15, c.w - 8, 8);
    } else if (kind === 'session') {
      this.text(ctx, copy.session.body, c.x + 22, c.y + 26, c.w - 44, this.mobile ? 14 : 12);
    } else if (kind === 'look') {
      for (let i = 0; i < 3; i++) {
        const x = c.x + 22 + i * 149;
        this.picture(ctx, i, x + 28, c.y + 28);
        this.text(ctx, copy.look.captions[i], x, c.y + 103, 128, 10);
      }
      this.text(ctx, copy.look.body, c.x + 20, c.y + 166, c.w - 40, 11);
      if (this.deviceLookAvailable) this.button(ctx, 'setup-device', copy.look.permission, c.x + 113, c.y + 204, 240);
      if (this.deviceStatus) this.text(ctx, this.deviceStatus, c.x + 20, c.y + 241, c.w - 40, 9);
    } else if (kind === 'note') {
      ui.px(ctx, c.x + 10, c.y + 12, c.w - 20, 206, P.paper);
      const y = this.text(ctx, copy.note.body, c.x + 22, c.y + 26, c.w - 44, this.mobile ? 14 : 12);
      this.text(ctx, copy.note.menu, c.x + 22, y + (this.mobile ? 8 : 12), c.w - 44, this.mobile ? 12 : 10);
      const ry = c.y + c.h - 77;
      ui.bevel(ctx, c.x + 22, ry, 14, 14, false);
      if (reducedMotion()) { ui.px(ctx, c.x + 25, ry + 5, 3, 5, P.black); ui.px(ctx, c.x + 28, ry + 3, 5, 3, P.black); }
      this.text(ctx, copy.note.reduceMotion, c.x + 44, ry, c.w - 66, this.mobile ? 14 : 11);
      this.hits.push({ id: 'setup-reduce-motion', x: c.x + 20, y: ry - 4, w: c.w - 40, h: 22 });
    }
    this.button(ctx, 'setup-close', copy.close, c.x + c.w - 95, c.y + c.h - 43, 81);
  }
  /** Three small authored pixel pictures: hand + laptop, turning phone, turning head + visor. */
  private picture(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number): void {
    const r = (dx: number, dy: number, w: number, h: number, col: string) => ui.px(ctx, x + dx, y + dy, w, h, col);
    if (kind === 0) {
      r(0, 5, 61, 38, P.greyDark); r(4, 9, 53, 29, P.teal); r(-4, 44, 69, 8, P.silver);
      r(28, 24, 6, 29, P.black); r(30, 26, 2, 27, P.paper); r(34, 38, 17, 20, P.black); r(36, 40, 13, 16, P.paper);
    } else if (kind === 1) {
      r(18, 0, 31, 58, P.greyDark); r(22, 6, 23, 41, P.teal); r(30, 51, 7, 3, P.paper);
    } else {
      r(17, 1, 32, 39, P.greyDark); r(13, 11, 44, 17, P.black); r(17, 14, 36, 11, P.teal); r(28, 40, 10, 8, P.greyDark); r(14, 49, 38, 9, P.greyDark);
    }
    // Opposing stepped arrows depict turning/dragging, no gaze target.
    for (const [dx, dy, dir] of [[-9, 26, -1], [67, 26, 1]]) {
      r(dx - 6, dy, 13, 2, P.navy);
      for (let i = 0; i < 4; i++) r(dx + dir * (6 - i), dy - i, 2, 2, P.navy);
    }
  }
}
