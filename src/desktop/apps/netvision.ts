/**
 * THE NETVISION PLAYER — the faux-VHS "New You Program" infomercial (S2R.4,
 * R28-2d-iv). Per docs/REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md S2R.4
 * (REVISED): this is no longer a bare interrupt — it is Lamby's RECOMMENDED
 * RECOVERY CONTENT, offered after the first Restorify check-in (provisional
 * trigger; the FINAL trigger is the Caleb/S2R.3 relapse beat, still gated —
 * documented in os.ts). Visual technique follows
 * docs/ERA2_EVANGELIST_COMMERCIAL_SCRIPT_2026-06-30.md §A: scanlines,
 * cheap RGB-split (offset-tint text, not per-pixel channel work — genuinely
 * cheap 2D canvas per that doc's own suggestion), sparse tape noise,
 * occasional tracking-desync bands, VHS chrome, lower-thirds, a karaoke bar.
 * All copy is data-driven (data/dialog/s2_media.json), all PLACEHOLDER.
 *
 * THE BREAK (near the end, driven from the last two scenes in the data):
 * noise density climbs, tracking bands roll continuously, the CTA/offer
 * card FREEZES (captured once, held "too long" rather than advancing) while
 * its line stutters ("Call now! Call now! Call n—", data-driven), then the
 * signal tears to full static; through the static one line renders — a
 * first crack of Caleb's message (felt-adjacent, kept bare, NOT the gated
 * Caleb thread itself). The player then closes on its own; os.ts leaves a
 * quiet persistent notification mark. Warm-corrupt throughout, never strobe
 * (glitch doctrine + photosensitivity) — the text "stutter" changes STRING
 * LENGTH, not luminance/flash, and stays well under any flicker-rate concern.
 *
 * Audio: calls into the tapeAudio-style registry (src/audio/tapeAudio.ts)
 * with `audioTrack` — a filename that does not exist in the registry yet, so
 * nothing is ever requested (Session 30's missing-file-safe pattern) and the
 * ambient hiss bed plays alone. One file + retimed `at`s finish it later.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import media from '../../../data/dialog/s2_media.json';

interface Scene {
  at: number;
  shot: 'static' | 'host' | 'brand' | 'testimony' | 'crowd' | 'offer';
  speaker: string;
  line: string;
  grade?: 'before' | 'after';
  karaoke?: boolean;
}

interface MediaData {
  windowTitle: string;
  brand: string;
  ministry: string;
  phone: string;
  cta: string;
  timestamp: string;
  before: string;
  after: string;
  karaoke: string;
  skip: string;
  skipDelaySeconds: number;
  chyrons: Record<string, string>;
  breakStutter: string;
  breakNoticeText: string;
  mediaClosedTag: string;
  audioTrack: string;
  witness: { watched: string; skipped: string; interrupted: string; declined: string };
  duration: number;
  scenes: Scene[];
}

interface Rect { x: number; y: number; w: number; h: number }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const M = media as unknown as MediaData;
const DW = 460; const DH = 340; // near-fullscreen on the 512×384 E2 desktop
const STATIC_HOLD_SECONDS = 2.6; // the static + notification-fragment hold before auto-close
const NOISE_FLOOR = 0.03; // sparse per-frame tape noise, present even outside the break

export interface NetVisionOptions {
  /** S2R.4 (revised, Session 45): the skip does not arm instantly — Lamby is
   *  SHOWING you this, so leaving is a social act rather than a UI
   *  convenience. os.ts passes data/dialog/s2_caleb.json's 15s; the data
   *  file's own `skipDelaySeconds` remains the fallback for any other caller. */
  skipDelaySeconds?: number;
}

export class NetVisionPlayerApp {
  open = true;
  dirty = true;
  /** fires once, when the player fully closes — os.ts sets the persistent
   *  notification mark on 'interrupted' and clears its own reference */
  onClosed?: (result: 'watched' | 'skipped' | 'interrupted') => void;

  private elapsed = 0;
  private stage: 'playing' | 'staticHold' = 'playing';
  private staticHoldT = 0;
  private filed = false;
  private frozenScene: Scene | null = null;
  private hits: Hit[] = [];
  private hover = '';

  private readonly skipAt: number;
  private readonly scenes: Scene[] = M.scenes;
  private readonly duration: number = M.duration;

  constructor(options: NetVisionOptions = {}) {
    this.skipAt = options.skipDelaySeconds ?? M.skipDelaySeconds;
  }
  /** THE BREAK begins at the second-to-last scripted scene — "drive from the
   *  last 2 scenes" (brief), never a hardcoded second count. */
  private readonly breakStart: number = this.scenes.length >= 2
    ? this.scenes[this.scenes.length - 2].at
    : Math.max(this.duration - 5, 0);

  /** true while the ambient hiss bed (+ the not-yet-real song, once it
   *  lands) should be playing — read each frame by the engine layer. */
  get isPlaying(): boolean {
    return this.open;
  }

  /** the track name to hand the tapeAudio-style registry — unregistered
   *  today by design (see file header); never null while open so the hiss
   *  bed starts even with silence in the clip slot. */
  get trackName(): string {
    return M.audioTrack;
  }

  private activeScene(): Scene | null {
    let found: Scene | null = null;
    for (const s of this.scenes) {
      if (s.at <= this.elapsed) found = s;
      else break;
    }
    return found;
  }

  private nextSceneAt(scene: Scene): number {
    const idx = this.scenes.indexOf(scene);
    return idx >= 0 && idx + 1 < this.scenes.length ? this.scenes[idx + 1].at : this.duration;
  }

  private inBreak(): boolean {
    return this.elapsed >= this.breakStart;
  }

  /** THE BREAK, readable from outside: os.ts uses it to let Caleb back in
   *  through the corner toasts while the showpiece is failing (S2R.4). */
  get inBreakNow(): boolean {
    return this.open && this.stage === 'playing' && this.inBreak();
  }

  /** 0 at the break's start → 1 at the video's own end (duration) */
  private breakProgress(): number {
    if (!this.inBreak()) return 0;
    const span = Math.max(this.duration - this.breakStart, 0.001);
    return Math.min((this.elapsed - this.breakStart) / span, 1);
  }

  /** whichever scene is being held "too long" while the tape degrades —
   *  captured ONCE at the moment the break begins, never advanced after */
  private renderScene(): Scene | null {
    if (!this.inBreak()) return this.activeScene();
    if (!this.frozenScene) this.frozenScene = this.activeScene();
    return this.frozenScene;
  }

  /** text length changes only (never a luminance/flash) — soft, warm-corrupt,
   *  well under any strobe concern; the stutter is already IN the data string */
  private breakStutterDisplay(): string {
    const full = M.breakStutter;
    const cut = Math.floor(this.elapsed / 0.4) % 2 === 0;
    return cut ? full : full.slice(0, Math.max(6, full.length - 8));
  }

  update(dt: number): void {
    if (!this.open) return;
    if (this.stage === 'playing') {
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        this.elapsed = this.duration;
        this.fileOutcome('watched');
        this.fileInterrupted();
        this.stage = 'staticHold';
        this.staticHoldT = 0;
      }
    } else {
      this.staticHoldT += dt;
      if (this.staticHoldT >= STATIC_HOLD_SECONDS) this.close('interrupted');
    }
    this.dirty = true;
  }

  private fileOutcome(outcome: 'watched' | 'skipped'): void {
    if (this.filed) return;
    this.filed = true;
    ledger.media.push({ id: 'video', outcome, witness: M.witness[outcome] });
  }

  private fileInterrupted(): void {
    ledger.media.push({ id: 'video-break', outcome: 'interrupted', witness: M.witness.interrupted });
  }

  private close(result: 'watched' | 'skipped' | 'interrupted'): void {
    this.open = false;
    this.onClosed?.(result);
  }

  /** the skip ▶▶ — appears after skipDelaySeconds (data-driven) */
  skip(): void {
    if (this.stage !== 'playing' || this.elapsed < this.skipAt) return;
    this.fileOutcome('skipped');
    this.close('skipped');
  }

  // ── drawing ──────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const dx = Math.round((ERA1_CANVAS.width - DW) / 2);
    const dy = Math.round((ERA1_CANVAS.height - DH) / 2);
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, M.windowTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.black);
    const a: Rect = c;

    const tearing = this.inBreak() && this.breakProgress() >= 0.6;
    if (this.stage === 'staticHold' || tearing) {
      this.drawStatic(ctx, a);
    } else {
      const scene = this.renderScene();
      if (scene) {
        const stutter = this.inBreak() && (scene.karaoke || scene.shot === 'offer')
          ? this.breakStutterDisplay() : undefined;
        this.drawSceneContent(ctx, a, scene, stutter);
      }
    }

    this.drawScanlines(ctx, a);
    this.drawTapeNoise(ctx, a, this.noiseAmount());
    if (this.inBreak()) this.drawTrackingBand(ctx, a);
    this.drawChrome(ctx, a);

    if (this.stage === 'staticHold') this.drawNotificationFragment(ctx, a);

    if (this.stage === 'playing' && this.elapsed >= this.skipAt) {
      const sw = 56; const sh = 14;
      const sx = a.x + a.w - sw - 4; const sy = a.y + 4;
      ui.button(ctx, sx, sy, sw, sh, M.skip, { hover: this.hover === 'skip' });
      this.hits.push({ x: sx, y: sy, w: sw, h: sh, id: 'skip' });
    }
  }

  private noiseAmount(): number {
    if (!this.inBreak()) return NOISE_FLOOR;
    return NOISE_FLOOR + this.breakProgress() * 0.85;
  }

  private fringeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
    // cheap RGB-split (§A): the same text drawn twice more, offset ±1px,
    // tinted and low-alpha — no per-pixel channel work.
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#c42020';
    ctx.fillText(text, x - 1, y);
    ctx.fillStyle = '#1084d0';
    ctx.fillText(text, x + 1, y);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawBust(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale = 1): void {
    const w = 34 * scale; const h = 30 * scale;
    ui.px(ctx, cx - w / 2, baseY - h * 0.55, w * 0.24, h * 0.3, ERA1.black); // neck
    ui.px(ctx, cx - w / 2, baseY - h * 0.35, w, h * 0.5, ERA1.black); // shoulders
    const headS = h * 0.5;
    ui.px(ctx, cx - headS / 2, baseY - h * 0.55 - headS * 0.85, headS, headS, ERA1.black); // head
  }

  private drawSceneContent(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene, override?: string): void {
    switch (scene.shot) {
      case 'static':
        this.drawStatic(ctx, a);
        return;
      case 'brand':
        this.drawBrandCard(ctx, a);
        return;
      case 'offer':
        this.drawOfferCard(ctx, a, override);
        return;
      default: {
        // host / testimony / crowd — a warm studio set + composite silhouette(s)
        const warm = scene.grade === 'before' ? ERA1.grey : ERA1.paper;
        ui.px(ctx, a.x, a.y, a.w, a.h, warm);
        ui.px(ctx, a.x, a.y, a.w, 6, ERA1.beige);
        ui.px(ctx, a.x, a.y + a.h - 6, a.w, 6, ERA1.beige);
        const baseY = a.y + Math.round(a.h * 0.58);
        if (scene.shot === 'crowd') {
          this.drawBust(ctx, a.x + a.w * 0.5 - 46, baseY, 0.8);
          this.drawBust(ctx, a.x + a.w * 0.5, baseY, 1);
          this.drawBust(ctx, a.x + a.w * 0.5 + 46, baseY, 0.8);
        } else {
          this.drawBust(ctx, a.x + a.w * 0.5, baseY, 1.15);
        }
        if (scene.grade) {
          ui.setFont(ctx, 10);
          ctx.fillStyle = scene.grade === 'before' ? ERA1.warnDark : ERA1.ok;
          this.fringeText(ctx, scene.grade === 'before' ? M.before : M.after, a.x + 10, a.y + 10,
            scene.grade === 'before' ? ERA1.warnDark : ERA1.ok);
        }
        this.drawLowerThird(ctx, a, scene, override);
        if (scene.karaoke && !this.inBreak()) this.drawKaraoke(ctx, a, scene);
      }
    }
  }

  private drawLowerThird(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene, override?: string): void {
    const barY = a.y + a.h - 34;
    ui.px(ctx, a.x, barY, a.w, 34, ERA1.navy);
    ui.px(ctx, a.x, barY, a.w, 2, ERA1.titleBlue);
    const chyron = scene.speaker ? (M.chyrons[scene.speaker] ?? '') : '';
    ui.setFont(ctx, 10);
    if (chyron) this.fringeText(ctx, chyron, a.x + 8, barY + 4, ERA1.white);
    ui.setFont(ctx, 9);
    const line = override ?? scene.line;
    if (line) this.fringeText(ctx, line, a.x + 8, barY + 18, ERA1.tooltip);
  }

  private drawKaraoke(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    const barY = a.y + a.h - 60;
    ui.px(ctx, a.x, barY, a.w, 22, ERA1.black);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.tooltip;
    const text = M.karaoke;
    const tw = ctx.measureText(text).width;
    const tx = a.x + (a.w - tw) / 2;
    this.fringeText(ctx, text, tx, barY + 4, ERA1.tooltip);
    const span = Math.max(this.nextSceneAt(scene) - scene.at, 0.5);
    const frac = Math.min(Math.max((this.elapsed - scene.at) / span, 0), 1);
    const ballX = tx + frac * tw;
    const bounce = Math.abs(Math.sin(this.elapsed * 8)) * 6;
    ui.px(ctx, ballX - 2, barY - 8 - bounce, 4, 4, ERA1.warn);
  }

  private drawBrandCard(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    ui.setFont(ctx, 18);
    const bw = ctx.measureText(M.brand).width;
    this.fringeText(ctx, M.brand, a.x + (a.w - bw) / 2, a.y + a.h / 2 - 24, ERA1.tooltip);
    ui.setFont(ctx, 10);
    const mw = ctx.measureText(M.ministry).width;
    this.fringeText(ctx, M.ministry, a.x + (a.w - mw) / 2, a.y + a.h / 2 + 6, ERA1.white);
  }

  private drawOfferCard(ctx: CanvasRenderingContext2D, a: Rect, override?: string): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.navy);
    ui.setFont(ctx, 16);
    const big = override ?? M.phone;
    const bw = ctx.measureText(big).width;
    this.fringeText(ctx, big, a.x + (a.w - bw) / 2, a.y + a.h / 2 - 24, ERA1.tooltip);
    if (!override) {
      ui.setFont(ctx, 10);
      const cw = ctx.measureText(M.cta).width;
      this.fringeText(ctx, M.cta, a.x + (a.w - cw) / 2, a.y + a.h / 2 + 4, ERA1.white);
    }
  }

  private drawStatic(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.black);
    const dots = 700;
    for (let i = 0; i < dots; i++) {
      const x = a.x + Math.floor(Math.random() * a.w);
      const y = a.y + Math.floor(Math.random() * a.h);
      ctx.fillStyle = Math.random() < 0.5 ? ERA1.white : ERA1.grey;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, a: Rect): void {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = a.y; y < a.y + a.h; y += 3) ctx.fillRect(a.x, y, a.w, 1);
  }

  private drawTapeNoise(ctx: CanvasRenderingContext2D, a: Rect, amount: number): void {
    const count = Math.round(16 + amount * 260);
    for (let i = 0; i < count; i++) {
      const x = a.x + Math.floor(Math.random() * a.w);
      const y = a.y + Math.floor(Math.random() * a.h);
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, 1, Math.random() < 0.3 ? 2 : 1);
    }
  }

  /** an occasional rolling glitch bar — soft, not a strobe */
  private drawTrackingBand(ctx: CanvasRenderingContext2D, a: Rect): void {
    const bandH = 6;
    const period = 2.4;
    const frac = (this.elapsed % period) / period;
    const y = a.y + Math.round(frac * (a.h - bandH));
    ctx.fillStyle = 'rgba(20,20,24,0.55)';
    ctx.fillRect(a.x, y, a.w, bandH);
    ctx.fillStyle = 'rgba(230,230,235,0.22)';
    ctx.fillRect(a.x + 3, y + bandH, Math.max(a.w - 6, 0), 1);
  }

  private drawChrome(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x + 5, a.y + 6, 3, 3, ERA1.warn);
    ui.setFont(ctx, 9);
    this.fringeText(ctx, M.timestamp, a.x + 12, a.y + 4, ERA1.white);
  }

  /** through the static — one line, kept clean/legible (felt-adjacent, no
   *  RGB-split here: this is the one moment of clarity in the wreck) */
  private drawNotificationFragment(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.setFont(ctx, 11);
    const label = M.breakNoticeText;
    const tw = ctx.measureText(label).width;
    const bx = a.x + (a.w - tw - 20) / 2;
    const by = a.y + a.h / 2 - 6;
    ui.px(ctx, bx, by, 14, 10, ERA1.beige);
    ui.px(ctx, bx, by, 14, 1, ERA1.greyDark);
    ui.px(ctx, bx + 1, by + 1, 5, 4, ERA1.tealDark);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(label, bx + 20, by - 1);
  }

  /** ?debug=1 review only — jump the playhead directly, e.g. straight into
   *  THE BREAK, without hand-stepping ~40s of ordinary playback. */
  debugSeek(seconds: number): void {
    this.elapsed = Math.max(0, Math.min(seconds, this.duration));
    this.dirty = true;
  }

  // ── input ────────────────────────────────────────────────────────────────

  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit?.id === 'skip') this.skip();
  }
}
