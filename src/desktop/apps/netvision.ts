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
 * THE BREAK (data-flagged, `break: true` — see below): noise density climbs,
 * tracking bands roll continuously, the CTA/offer card FREEZES (captured once,
 * held "too long" rather than advancing) while its line stutters ("Call now!
 * Call now! Call n—", data-driven), then the signal tears to full static;
 * through the static one line renders — a first crack of Caleb's message
 * (felt-adjacent, kept bare, NOT the gated Caleb thread itself). The player
 * then closes on its own; os.ts leaves a quiet persistent notification mark.
 * Warm-corrupt throughout, never strobe (glitch doctrine + photosensitivity) —
 * the text "stutter" changes STRING LENGTH, not luminance/flash, and stays
 * well under any flicker-rate concern.
 *
 * S51 — THE SONG IS REAL NOW, AND IT DRIVES EVERYTHING. Sérgio's 1:54 track
 * exists, is degraded (--tape03) and registered, and every `at` in
 * data/dialog/s2_media.json is that recording's own line timing. So:
 *   · Audio: `audioTrack` now resolves in src/audio/tapeAudio.ts's REGISTRY,
 *     so the clip actually plays under the hiss bed (src/engine/app.ts starts
 *     the bus the frame the player opens — both clocks start together, and
 *     this module's `elapsed` is the engine's own dt, so the captions track
 *     the voice without a sync channel between them).
 *   · The break no longer sits at "the second-to-last scene" (that rule
 *     survives only as a fallback). The song ENDS on the triple "Call now",
 *     and the data flags `break`/`tear` on those beats — the music drives the
 *     wreck, including the stutter's re-fire cadence.
 *   · The karaoke ball tracks SUNG WORDS, from each chorus scene's `words`.
 * No new glitch vocabulary was invented for any of it.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { releaseBus } from '../../audio/tapeAudio';
import media from '../../../data/dialog/s2_media.json';

interface Scene {
  at: number;
  shot: 'static' | 'host' | 'brand' | 'testimony' | 'crowd' | 'offer' | 'steps';
  speaker: string;
  line: string;
  grade?: 'before' | 'after';
  karaoke?: boolean;
  /** S51: [seconds, word] from the song's WORD-timed lyric file — chorus
   *  scenes only. Absent = the karaoke ball falls back to a linear sweep. */
  words?: [number, string][];
  /** S51: THE BREAK starts on this scene (the song's first "Call now") */
  break?: boolean;
  /** S51: the signal tears to static here (the song's last "Call now") */
  tear?: boolean;
}

interface OfferSeals {
  guaranteeDays: string;
  guaranteeLine1: string;
  guaranteeLine2: string;
  orderNow: string;
  website: string;
  cards: string[];
  finePrint: string[];
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
  skip: string;
  skipDelaySeconds: number;
  chyrons: Record<string, string>;
  offer: OfferSeals;
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
  /** THE BREAK begins where the data says it does — S51: the scene flagged
   *  `break`, which is the song's first "Call now". Session 35's original rule
   *  (the second-to-last scripted scene) is kept as the fallback for data that
   *  carries no flag; either way it is never a hardcoded second count. */
  private readonly breakStart: number = this.scenes.find(s => s.break)?.at
    ?? (this.scenes.length >= 2
      ? this.scenes[this.scenes.length - 2].at
      : Math.max(this.duration - 5, 0));

  /** where the signal tears to static — S51: the scene flagged `tear` (the
   *  song's LAST "Call now"), else Session 35's 60%-through-the-break point. */
  private readonly tearAt: number = this.scenes.find(s => s.tear)?.at
    ?? this.breakStart + (this.duration - this.breakStart) * 0.6;

  /** the beats the frozen CTA's stutter re-fires on: every voiced scene from
   *  the break onward that belongs to the held card (so the on-screen loop
   *  stutters when the VOICE does — the song's triple). The trailing static
   *  disclaimer scene is not one of them. */
  private readonly stutterBeats: number[] = this.scenes
    .filter(s => s.at >= this.breakStart && !!s.line && s.shot !== 'static')
    .map(s => s.at);

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

  /** THE BREAK, readable from outside (S2R.4). */
  get inBreakNow(): boolean {
    return this.open && this.stage === 'playing' && this.inBreak();
  }

  /**
   * S60 (finding D17) — the seam Caleb is allowed back in on.
   *
   * He used to arrive at `inBreakNow`, i.e. the instant the tape started
   * failing, 14 seconds before the end — which put his toast squarely on top
   * of the disclaimer crawl ("…not therapy, not a cure… your old self may not
   * be recoverable…"), the single best line the apparatus ever writes about
   * itself, and Sérgio never got to read it. The crawl is authored to finish
   * exactly as the tape runs out, so the honest seam is the tape running out:
   * the fine print gets its whole scroll, and the person arrives in the static
   * afterwards. os.ts reads THIS now, not `inBreakNow`.
   */
  get disclaimerDone(): boolean {
    return this.open && this.stage === 'staticHold';
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
   *  well under any strobe concern; the stutter is already IN the data string.
   *  S51: the cadence is the SONG's. Each "Call now" in the audio re-fires the
   *  full string; between calls it erodes a few characters at a time, the way
   *  a dub loses the end of a word. (Session 35 flipped it on a blind 0.4s
   *  timer, which had nothing to sync to.) */
  private breakStutterDisplay(): string {
    const full = M.breakStutter;
    let beat = this.breakStart;
    for (const b of this.stutterBeats) if (b <= this.elapsed) beat = b;
    const age = Math.max(this.elapsed - beat, 0);
    const eroded = full.length - Math.floor(Math.max(age - 0.35, 0) / 0.45) * 3;
    return full.slice(0, Math.max(6, eroded));
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
    // the song does not outlive the window — S51, see releaseBus()'s own note:
    // os.ts drops its reference to this player the moment onClosed fires, which
    // is why app.ts's audio sync can no longer reach the bus to stop it.
    releaseBus();
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

    // S60 (finding D15, "each image needs more animation"): the TAPE moves.
    // Everything inside the frame rides a slow vertical wobble — the picture
    // never sits perfectly still on a 2003 VHS — while the scanlines, noise and
    // chrome below stay pinned, because those are the SCREEN, not the tape. The
    // sliver this opens at the top or bottom edge is the window's own black.
    // No new vocabulary: this is the tracking instability the break already
    // exaggerates, present at a whisper from the first frame.
    ctx.save();
    ctx.translate(0, this.frameBob());

    const tearing = this.elapsed >= this.tearAt;
    if (this.stage === 'staticHold' || tearing) {
      this.drawStatic(ctx, a);
      // the fine print the SONG doesn't carry: it crawls through the wreck
      // (audio guide §7d keeps the disclaimer out of the music deliberately).
      // Before S51 this scene existed in the data but was never drawn — the
      // tear branch returned static and nothing else.
      if (this.stage === 'playing') this.drawDisclaimerCrawl(ctx, a);
    } else {
      const scene = this.renderScene();
      if (scene) {
        const stutter = this.inBreak() && (scene.karaoke || scene.shot === 'offer')
          ? this.breakStutterDisplay() : undefined;
        this.drawSceneContent(ctx, a, scene, stutter);
      }
    }
    ctx.restore();

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

  /** the tape's own vertical instability, in whole pixels (integer positions,
   *  pixel discipline). Two slow sines beat against each other so it never
   *  reads as a loop; the break widens it as the transport fails. */
  private frameBob(): number {
    const amp = 1 + this.breakProgress() * 1.6;
    return Math.round((Math.sin(this.elapsed * 0.9) * 0.6 + Math.sin(this.elapsed * 2.3) * 0.5) * amp);
  }

  /** a slow breath, 0..1, for the studio shots — a hand-held camera and a
   *  person who is alive rather than a pasted silhouette */
  private breath(phase = 0): number {
    return (Math.sin(this.elapsed * 1.15 + phase) + 1) / 2;
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
        // S51: the card's big text is the BRAND, so the spoken/sung line still
        // needs its lower third. Before S51 a card shot dropped its line
        // entirely — "Introducing the new you program" was captioned nowhere.
        this.drawLowerThird(ctx, a, scene, override);
        return;
      case 'offer':
        this.drawOfferCard(ctx, a, override);
        // likewise: the card's big text is the PHONE NUMBER, and the offer
        // shots now carry the sting ("Three easy payments of yourself").
        this.drawLowerThird(ctx, a, scene, override);
        return;
      case 'steps':
        // S51: "Confess it" / "Submit it" / "Let us hold it for you" are ~1s
        // apart in the song, so they get a beat each and accumulate on one
        // card like a countdown. The card carries the words at size, so its
        // lower third shows the chyron only.
        this.drawStepsCard(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override, false);
        return;
      default: {
        // host / testimony / crowd — a warm studio set + composite silhouette(s).
        // S60 (finding D15): the set BREATHES. The studio bands swell a pixel,
        // the silhouettes rise and fall out of phase with each other, and the
        // held shot drifts a pixel sideways — a camera operator, not a slide.
        const warm = scene.grade === 'before' ? ERA1.grey : ERA1.paper;
        ui.px(ctx, a.x, a.y, a.w, a.h, warm);
        const bandH = 6 + Math.round(this.breath() * 2);
        ui.px(ctx, a.x, a.y, a.w, bandH, ERA1.beige);
        ui.px(ctx, a.x, a.y + a.h - bandH, a.w, bandH, ERA1.beige);
        const baseY = a.y + Math.round(a.h * 0.58);
        const drift = Math.round(Math.sin(this.elapsed * 0.42) * 2);
        if (scene.shot === 'crowd') {
          // three people, three phases — the row must never move as one object
          this.drawBust(ctx, a.x + a.w * 0.5 - 46 + drift, baseY - Math.round(this.breath(1.9) * 2), 0.8);
          this.drawBust(ctx, a.x + a.w * 0.5 + drift, baseY - Math.round(this.breath(0) * 2), 1);
          this.drawBust(ctx, a.x + a.w * 0.5 + 46 + drift, baseY - Math.round(this.breath(3.4) * 2), 0.8);
        } else {
          this.drawBust(ctx, a.x + a.w * 0.5 + drift, baseY, 1.15 + this.breath() * 0.04);
        }
        if (scene.grade) {
          ui.setFont(ctx, 10);
          ctx.fillStyle = scene.grade === 'before' ? ERA1.warnDark : ERA1.ok;
          this.fringeText(ctx, scene.grade === 'before' ? M.before : M.after, a.x + 10, a.y + 10,
            scene.grade === 'before' ? ERA1.warnDark : ERA1.ok);
        }
        // a karaoke scene's line is already the karaoke bar's text — one
        // subtitle, not two stacked copies of the same lyric
        const sung = !!scene.karaoke && !this.inBreak();
        this.drawLowerThird(ctx, a, scene, override, !sung);
        if (sung) this.drawKaraoke(ctx, a, scene);
      }
    }
  }

  /** `showLine: false` = something else on screen already carries this scene's
   *  line (the karaoke bar, the steps card), so the band shows the chyron only.
   *  S51: a band with NOTHING to carry — an instrumental shot, or the CROWD's
   *  chorus, which has no chyron — isn't drawn at all rather than laid down as
   *  an empty navy slab. */
  private drawLowerThird(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene, override?: string,
                         showLine = true): void {
    const chyron = scene.speaker ? (M.chyrons[scene.speaker] ?? '') : '';
    const line = override ?? (showLine ? scene.line : '');
    if (!chyron && !line) return;
    const barY = a.y + a.h - 34;
    ui.px(ctx, a.x, barY, a.w, 34, ERA1.navy);
    ui.px(ctx, a.x, barY, a.w, 2, ERA1.titleBlue);
    ui.setFont(ctx, 10);
    if (chyron) this.fringeText(ctx, chyron, a.x + 8, barY + 4, ERA1.white);
    ui.setFont(ctx, 9);
    if (line) this.fringeText(ctx, line, a.x + 8, barY + 18, ERA1.tooltip);
  }

  /**
   * The karaoke bar. S51: the bouncing ball tracks the SUNG WORDS, from the
   * scene's `words` (the song's word-timed lyric file) — it sits on the word
   * being sung and the line fills in behind it, which is what a karaoke bar
   * has always claimed to do. Session 35 swept it linearly across an invented
   * paraphrase; there was nothing for it to be right about. A scene with no
   * `words` still works: it falls back to that linear sweep.
   */
  private drawKaraoke(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    const barY = a.y + a.h - 60;
    ui.px(ctx, a.x, barY, a.w, 22, ERA1.black);
    ui.setFont(ctx, 11);
    const text = scene.line;
    if (!text) return;
    const tw = ctx.measureText(text).width;
    const tx = a.x + (a.w - tw) / 2;
    // the line, not yet sung
    this.fringeText(ctx, text, tx, barY + 4, ERA1.silver);

    let ballX = tx;
    const words = scene.words;
    if (words && words.length) {
      // locate each word IN the authored line (never re-join the word list —
      // the line is the copy of record), so punctuation/spacing stay as written
      let cursor = 0; let active = -1;
      const at: { start: number; end: number }[] = [];
      for (const [, w] of words) {
        const i = text.indexOf(w, cursor);
        const start = i < 0 ? cursor : i;
        at.push({ start, end: start + w.length });
        cursor = start + w.length;
      }
      for (let i = 0; i < words.length; i++) if (words[i][0] <= this.elapsed) active = i;
      if (active >= 0) {
        // sung so far, drawn over the dim line in the same font/position
        const prefix = text.slice(0, at[active].end);
        this.fringeText(ctx, prefix, tx, barY + 4, ERA1.tooltip);
        const wordStart = tx + ctx.measureText(text.slice(0, at[active].start)).width;
        const wordW = ctx.measureText(text.slice(at[active].start, at[active].end)).width;
        ballX = wordStart + wordW / 2;
      }
    } else {
      const span = Math.max(this.nextSceneAt(scene) - scene.at, 0.5);
      const frac = Math.min(Math.max((this.elapsed - scene.at) / span, 0), 1);
      ballX = tx + frac * tw;
    }
    const bounce = Math.abs(Math.sin(this.elapsed * 8)) * 6;
    ui.px(ctx, ballX - 2, barY - 8 - bounce, 4, 4, ERA1.warn);
  }

  private drawBrandCard(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    // S60: a title card is where a cheap production shows off. Two bars sweep
    // out from behind the wordmark (integer widths, palette tokens) and the
    // ministry line drifts a pixel — the existing chrome grammar, in motion.
    const sweep = Math.round((Math.sin(this.elapsed * 0.7) + 1) / 2 * (a.w * 0.42));
    ui.px(ctx, a.x + a.w / 2 - sweep, a.y + a.h / 2 - 34, sweep * 2, 2, ERA1.titleBlue);
    ui.px(ctx, a.x + a.w / 2 - sweep, a.y + a.h / 2 + 26, sweep * 2, 2, ERA1.titleBlue);
    ui.setFont(ctx, 18);
    const bw = ctx.measureText(M.brand).width;
    this.fringeText(ctx, M.brand, a.x + (a.w - bw) / 2, a.y + a.h / 2 - 24, ERA1.tooltip);
    ui.setFont(ctx, 10);
    const mw = ctx.measureText(M.ministry).width;
    const drift = Math.round(Math.sin(this.elapsed * 0.55) * 2);
    this.fringeText(ctx, M.ministry, a.x + (a.w - mw) / 2 + drift, a.y + a.h / 2 + 6, ERA1.white);
  }

  /**
   * The three steps, accumulating one per beat (S51 — they are ~1s apart in
   * the song). Rows not yet reached are dim bars, not text: the checklist
   * visibly has more to come without spoiling the ask, and no copy is invented
   * for it — every word on this card is an authored `line` from the data.
   */
  private drawStepsCard(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    const steps = this.scenes.filter(s => s.shot === 'steps');
    const current = steps.indexOf(scene);
    const rowH = 26;
    const top = a.y + Math.round((a.h - 34 - steps.length * rowH) / 2);
    for (let i = 0; i < steps.length; i++) {
      const y = top + i * rowH;
      ui.setFont(ctx, 14);
      if (i <= current) {
        this.fringeText(ctx, `${i + 1}`, a.x + 40, y, ERA1.warn);
        this.fringeText(ctx, steps[i].line, a.x + 62, y, ERA1.tooltip);
      } else {
        ui.px(ctx, a.x + 40, y + 6, 14, 2, ERA1.grey);
        ui.px(ctx, a.x + 62, y + 6, 120, 2, ERA1.grey);
      }
    }
  }

  /**
   * THE OFFER SCREEN (S60, finding D16 — Sérgio's DRTV reference).
   *
   * The end-frame apparatus of trust, entire: ORDER NOW!, the number, the
   * website, a gold guarantee rosette, a row of payment badges and the
   * delivery fine print. It is not dressing. It puts "three easy payments of
   * yourself" into the visual grammar that phrase was written for, and it
   * makes the era's most damning object literal — a **money-back guarantee on
   * selfhood**, sold with the same rosette a knife set would carry.
   *
   * ⚑ EVERY BADGE IS INVENTED (data/dialog/s2_media.json's `offer.cards`).
   * Sérgio's reference shows real card brands; none of them may exist in this
   * fiction, so the rails are the ministry's own made-up ones.
   *
   * The satire is entirely inside the seller's self-presentation and it
   * collapses under its own promise — the tone law, exactly.
   */
  private drawOfferCard(ctx: CanvasRenderingContext2D, a: Rect, override?: string): void {
    const O = M.offer;
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.navy);
    const cx = a.x + a.w / 2;

    // ORDER NOW! — a DRTV end-frame always shouts first. It alternates between
    // two warm tones rather than blinking on/off: motion without a luminance
    // step (glitch doctrine — warm-corrupt, never strobe), ~0.8 Hz.
    ui.setFont(ctx, 14);
    const shout = Math.sin(this.elapsed * 5) > 0 ? ERA1.warn : ERA1.tooltip;
    const ow = ctx.measureText(O.orderNow).width;
    this.fringeText(ctx, O.orderNow, cx - ow / 2, a.y + 14, shout);

    // the number (or, once the tape is failing, the stutter that replaced it)
    ui.setFont(ctx, 16);
    const big = override ?? M.phone;
    const bw = ctx.measureText(big).width;
    this.fringeText(ctx, big, cx - bw / 2, a.y + 40, ERA1.tooltip);

    ui.setFont(ctx, 9);
    const ww = ctx.measureText(O.website).width;
    this.fringeText(ctx, O.website, cx - ww / 2, a.y + 62, ERA1.white);

    if (!override) {
      ui.setFont(ctx, 10);
      const cw = ctx.measureText(M.cta).width;
      this.fringeText(ctx, M.cta, cx - cw / 2, a.y + 80, ERA1.white);
    }

    this.drawGuaranteeRosette(ctx, a.x + a.w - 74, a.y + 150);
    this.drawCardBadges(ctx, a.x + 24, a.y + 196);

    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    O.finePrint.forEach((line, i) => {
      ctx.fillText(line, a.x + 24, a.y + a.h - 78 + i * 10);
    });
  }

  /** the gold seal. Drawn as a pixel starburst — chunky petals + concentric
   *  discs, palette tokens only — and it BREATHES by one pixel, which is all
   *  the animation a seal needs to look like it is being held up to camera. */
  private drawGuaranteeRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const pulse = Math.sin(this.elapsed * 1.9) > 0 ? 1 : 0;
    const r = 42 + pulse;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const px = Math.round(cx + Math.cos(ang) * r);
      const py = Math.round(cy + Math.sin(ang) * r);
      ui.px(ctx, px - 5, py - 5, 10, 10, ERA1.olive);
    }
    ctx.fillStyle = ERA1.olive;
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), r - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ERA1.tooltip;
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), r - 7, 0, Math.PI * 2);
    ctx.fill();

    const O = M.offer;
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.warnDark;
    let tw = ctx.measureText(O.guaranteeDays).width;
    ctx.fillText(O.guaranteeDays, Math.round(cx - tw / 2), cy - 20);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    tw = ctx.measureText(O.guaranteeLine1).width;
    ctx.fillText(O.guaranteeLine1, Math.round(cx - tw / 2), cy - 4);
    tw = ctx.measureText(O.guaranteeLine2).width;
    ctx.fillText(O.guaranteeLine2, Math.round(cx - tw / 2), cy + 8);
  }

  /** the payment rails — ALL INVENTED (see the card's own doc comment). Four
   *  bevelled plates in a row, the way an end-frame always lays them out. */
  private drawCardBadges(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const bw = 62; const bh = 22; const gap = 6;
    M.offer.cards.forEach((name, i) => {
      const bx = x + i * (bw + gap);
      ui.bevel(ctx, bx, y, bw, bh, true);
      ui.px(ctx, bx + 2, y + 2, bw - 4, 4, ERA1.navy);
      ui.setFont(ctx, 7);
      ctx.fillStyle = ERA1.black;
      const tw = ctx.measureText(name).width;
      ctx.fillText(name, Math.round(bx + (bw - tw) / 2), y + 10);
    });
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

  /**
   * The disclaimer, crawling through the static (S51). Fine print behaves like
   * fine print: it moves, right to left, at whatever rate finishes exactly as
   * the tape runs out — so the rate comes from the data (its scene `at` and the
   * video's `duration`), never a magic number. Kept small and grey: legible if
   * you chase it, which is the point of the joke and of the apparatus.
   */
  private drawDisclaimerCrawl(ctx: CanvasRenderingContext2D, a: Rect): void {
    const scene = this.activeScene();
    if (!scene || scene.shot !== 'static' || !scene.line) return;
    ui.setFont(ctx, 9);
    const tw = ctx.measureText(scene.line).width;
    const travel = a.w + tw;
    const span = Math.max(this.duration - scene.at, 0.5);
    const frac = Math.min(Math.max((this.elapsed - scene.at) / span, 0), 1);
    const x = a.x + a.w - frac * travel;
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, a.w, a.h);
    ctx.clip();
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(scene.line, Math.round(x), a.y + a.h - 52);
    ctx.restore();
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
