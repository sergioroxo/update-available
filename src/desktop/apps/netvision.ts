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
 *
 * S62 — THE INFOMERCIAL GETS A CAST. Sérgio watched the render and most of his
 * "too barebones / too similar" notes turned out to be one fault seen from
 * different angles: THE FILM HAD NO CAST. The song sings in at least four
 * voices; the data credited PASTOR DALE for lines a woman sings, and this
 * module drew nearly everyone as the same bust on the same beige set. So:
 *   · the data names the cast correctly (THE STRUGGLER · PASTOR DALE · THE
 *     COUNSELLOR · MARCUS · THE CONGREGATION) and each persona gets its own
 *     staging, key and POSE — see `drawFigure`, which replaces the static
 *     busts with articulated, faceless figures that slump, open and lean in;
 *   · ⚑ the dramaturgy that makes: the COUNSELLOR's is the warmest shot in the
 *     film, and hers is the voice that says "Confess it · Submit it · Let us
 *     hold it for you" and "the self he meant you to be". The softest voice
 *     makes the actual demands. Nothing ever remarks on it;
 *   · a DRTV chyron layer (DRAMATIZATION · ACTUAL PARTICIPANT · RESULTS NOT
 *     TYPICAL · PAID PROGRAMMING) — real furniture, not invented, and the most
 *     damning caption the era supplies;
 *   · an opening title card over an evangelist Lamby, played straight;
 *   · THE BREAK NOW COLLAPSES TWICE. The offer screen goes into overdrive on
 *     the last "Call now" — rosette spinning, badges stacking, the number
 *     duplicating, ORDER NOW! growing past the frame — and only THEN tears.
 * ⚑ Untouched on purpose, because Sérgio named them as working: the brand
 * card, the three-steps card, the chorus with its karaoke ball, the offer
 * screen's existing furniture, and the disclaimer's timing.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { releaseBus } from '../../audio/tapeAudio';
import media from '../../../data/dialog/s2_media.json';
import { drawFootage } from './testimony';
/** ⚑ S206 — how long Daniel's own frame holds at the head of the ACTUAL PARTICIPANT shot */
const TAPE_INSERT_SECONDS = 2.4;

interface Scene {
  at: number;
  shot: 'static' | 'host' | 'brand' | 'testimony' | 'crowd' | 'offer' | 'steps'
      | 'presents' | 'title' | 'product' | 'homecoming';
  speaker: string;
  line: string;
  grade?: 'before' | 'after';
  /** S206 — this shot opens on a frame from Daniel's own Tape 04 ("Real stories. Real change.") */
  insertTape?: boolean;
  karaoke?: boolean;
  /** S62: a period-real DRTV caption, by key into `tags` (DRAMATIZATION,
   *  ACTUAL PARTICIPANT, RESULTS NOT TYPICAL, PAID PROGRAMMING) */
  tag?: string;
  /** S62: the line spells itself out letter by letter instead of cutting in */
  reveal?: boolean;
  /** S62: the phone number starts swelling here, and keeps swelling into the
   *  countdown — what replaced the retired 97.6 cut */
  swell?: boolean;
  /** S62: the phone unit + operator counter appear from this scene onward */
  operators?: boolean;
  /** S62: the offer screen over-sells itself into collapse from here to `tear` */
  overdrive?: boolean;
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

/** S62 — the opening title card, and the boxed product it is selling. */
interface TitleCard {
  presents: string;
  titleLine1: string;
  titleLine2: string;
  copyright: string;
}

interface ProductCopy {
  name: string;
  sub: string;
  contents1: string;
  contents2: string;
  starburst1: string;
  starburst2: string;
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
  tags: Record<string, string>;
  /** S63 — the chorus's sing-along prompt. Optional: absent data draws none. */
  singAlong?: string;
  titleCard: TitleCard;
  product: ProductCopy;
  operators: { label: string; counts: number[] };
  offer: OfferSeals;
  breakStutter: string;
  breakNoticeText: string;
  mediaClosedTag: string;
  audioTrack: string;
  witness: { watched: string; skipped: string; interrupted: string; declined: string };
  duration: number;
  scenes: Scene[];
}

/**
 * S62 — a pose for `drawFigure`. Every persona in the cast is a set of these
 * numbers and nothing else, which is what keeps them distinguishable from each
 * other without any of them ever growing a face.
 */
interface FigurePose {
  scale?: number;
  /** the torso leans forward off the hip, px at scale 1 */
  lean?: number;
  /** the head sinks toward the chest — the Struggler's entire identity */
  headDrop?: number;
  /** 0 = arms hang at the sides · 1 = arms wide open */
  armSpread?: number;
  /** 0 = hands at hip height · 1 = hands raised above the shoulder */
  armLift?: number;
  /** hands meet in the lap */
  handsFolded?: boolean;
  seated?: boolean;
  /** 0 = turned away, a narrow silhouette · 1 = square to camera */
  turn?: number;
  color?: string;
}

interface Rect { x: number; y: number; w: number; h: number }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const M = media as unknown as MediaData;
const DW = 460; const DH = 340; // near-fullscreen on the 512×384 E2 desktop
const STATIC_HOLD_SECONDS = 2.6; // the static + notification-fragment hold before auto-close
const NOISE_FLOOR = 0.03; // sparse per-frame tape noise, present even outside the break

/**
 * S62 — THE SONG'S PULSE, measured from the data rather than guessed. The
 * chorus lines start at 58.51 / 62.39 / 66.55 / 70.79 / 74.85 / 78.91, i.e. a
 * bar every ~4.08 s, which is 8 beats at ~118 bpm → 0.51 s a beat. Anything
 * that has to happen ON THE BEAT (the phone's hold light, the homecoming's
 * approach) phase-locks to the first chorus line, so it is the recording that
 * sets the cadence and not a hand-picked interval.
 */
const SONG_BEAT = 0.51;
const SONG_ANCHOR = 58.51;

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

  /** S62 — THE OVERDRIVE. The last "Call now" used to carry `tear` and the
   *  picture cut straight to dark; Sérgio: "the dark screen with noise is a
   *  bit too early… it also feels like a missed opportunity for some
   *  ridiculousness." `tear` moved to its own beat and this flag took its
   *  place, so for the seconds between them the offer screen over-sells itself
   *  into collapse. The break is no longer a cut; it is what the pitch does to
   *  itself, which is the tone law's "satire must collapse", literally. */
  private readonly overdriveAt: number = this.scenes.find(s => s.overdrive)?.at ?? this.tearAt;

  /** where the phone number starts growing (the retired 97.6 cut's replacement) */
  private readonly swellAt: number = this.scenes.find(s => s.swell)?.at ?? 0;

  /** where the phone unit + operator counter join the offer screen */
  private readonly operatorsAt: number = this.scenes.find(s => s.operators)?.at ?? 0;

  /** the homecoming's span — the two "Won't you come home" lines, across which
   *  the figures turn, open and approach. Derived from the data, never typed. */
  private readonly homecomingFrom: number = this.scenes.find(s => s.shot === 'homecoming')?.at ?? 0;
  private readonly homecomingTo: number = (() => {
    const last = [...this.scenes].reverse().find(s => s.shot === 'homecoming');
    return last ? this.nextSceneAt(last) : 0;
  })();

  /** the chorus's own span (58.51 → the brand card at 81.60) — S63's dawn and
   *  the choir's growth are both derived from it, never from typed seconds. */
  private readonly chorusFrom: number = this.scenes.find(s => s.shot === 'crowd')?.at ?? 0;
  private readonly chorusTo: number = (() => {
    const last = [...this.scenes].reverse().find(s => s.shot === 'crowd');
    return last ? this.nextSceneAt(last) : 0;
  })();

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
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, M.windowTitle, true, 'netvision');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.black);
    const a: Rect = c;

    // S60 (finding D15, "each image needs more animation"): the TAPE moves.
    // Everything inside the frame rides a slow vertical wobble — the picture
    // never sits perfectly still on a 2003 VHS — while the scanlines, noise and
    // chrome below stay pinned, because those are the SCREEN, not the tape. The
    // sliver this opens at the top or bottom edge is the window's own black.
    // No new vocabulary: this is the tracking instability the break already
    // exaggerates, present at a whisper from the first frame.
    // S62 — AND THE PICTURE IS CLIPPED TO THE SCREEN. The cast's sets throw
    // light rays well past the frame, and without this they painted onto the
    // desktop AROUND the window and stayed there (nothing else clears that
    // region). Clipping before the bob also keeps the bob's own behaviour: the
    // sliver it opens at the top or bottom edge is still the window's black.
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, a.w, a.h);
    ctx.clip();
    ctx.translate(0, this.frameBob());

    const tearing = this.elapsed >= this.tearAt;
    if (this.stage === 'staticHold' || tearing) {
      this.drawStatic(ctx, a);
      // S62: the disclaimer used to be drawn HERE, underneath the scanlines
      // and the noise, and Sérgio could barely read it. It is now drawn after
      // both, below — bigger, and on top of the wreck instead of inside it.
      // Its TIMING is untouched: he loves how it lands against the ending
      // "Call now", and that is the one thing this session must not move.
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
    // the fine print the SONG doesn't carry (audio guide §7d keeps the
    // disclaimer out of the music deliberately) — through the wreck, over it.
    if (this.stage === 'playing' && tearing) this.drawDisclaimerCrawl(ctx, a);
    this.drawChrome(ctx, a);

    if (this.stage === 'staticHold') this.drawNotificationFragment(ctx, a);

    if (this.stage === 'playing' && this.elapsed >= this.skipAt) {
      const sw = 88; const sh = 14; // S62: "(Don't) Skip" needs the width
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

  /** 0..1 through the current beat of the song (S62 — see SONG_BEAT). Negative
   *  elapsed-minus-anchor is handled, because most of the video is BEFORE the
   *  chorus the tempo was measured from. */
  private beatFrac(): number {
    const t = (this.elapsed - SONG_ANCHOR) / SONG_BEAT;
    return t - Math.floor(t);
  }

  /** how many whole beats have passed since `from` — the homecoming's approach
   *  moves on THIS, not on dt, so the figures are simply closer each time you
   *  look rather than gliding toward you. */
  private beatsSince(from: number): number {
    return Math.max(0, Math.floor((this.elapsed - from) / SONG_BEAT));
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

  /**
   * S62 — A LIMB. Drawn as a run of square blocks stepped along the line, the
   * way a 1997 sprite would do it: integer positions, no `ctx.rotate`, no
   * anti-aliased diagonals. This is the whole reason the cast can GESTURE
   * without leaving the aesthetic laws — an arm is a path between three
   * points, and a pose is where those points are.
   */
  private limb(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
               thick: number, color: string): void {
    const steps = Math.max(Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))), 1);
    const h = Math.floor(thick / 2);
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (x1 - x0) * (i / steps)) - h;
      const y = Math.round(y0 + (y1 - y0) * (i / steps)) - h;
      ctx.fillRect(x, y, thick, thick);
    }
  }

  /**
   * S62 — THE CAST HAS BODIES NOW (Sérgio: the busts are "too barebones", and
   * they hold the screen a long time; "they need to be more like stickman
   * animation (to not show faces)"). A figure is articulated — hip, shoulder,
   * elbow, hand — so each persona is a POSE rather than a different sprite:
   * the Struggler hunches, Dale opens, the Counsellor sits with her hands
   * folded, and the homecoming's three turn and open across two lines.
   *
   * ⚑ THE HEAD IS A PLAIN OVAL AND STAYS ONE. No eyes, no mouth, no feature,
   * in any pose, ever — the no-faces law is absolute (CLAUDE.md), and the
   * gesture is doing all the work precisely because the face cannot.
   *
   * The chorus busts are NOT drawn through here: Sérgio called that shot
   * "fantastic, just amazing", so `drawBust` below is untouched.
   */
  private drawFigure(ctx: CanvasRenderingContext2D, cx: number, baseY: number,
                     p: FigurePose = {}): void {
    const s = p.scale ?? 1;
    const col = p.color ?? ERA1.black;
    const lean = (p.lean ?? 0) * s;
    const drop = (p.headDrop ?? 0) * s;
    const spread = p.armSpread ?? 0;
    const lift = p.armLift ?? 0;
    const turn = p.turn ?? 1;
    const t = (n: number) => Math.max(2, Math.round(n * s));

    const hipY = Math.round(baseY - (p.seated ? 22 : 30) * s);
    const shoulderY = Math.round(hipY - 24 * s + drop);
    const shoulderX = Math.round(cx + lean);
    const halfShoulder = 10 * s * (0.34 + 0.66 * turn);

    // legs — a seated figure's knees come toward camera, which is most of what
    // makes "seated" read at this size
    if (p.seated) {
      const kneeY = hipY + 3 * s;
      for (const side of [-1, 1]) {
        const kx = cx + 17 * s + side * 4 * s;
        this.limb(ctx, cx + side * 4 * s, hipY, kx, kneeY, t(7), col);
        this.limb(ctx, kx, kneeY, kx - 3 * s, baseY, t(6), col);
      }
    } else {
      for (const side of [-1, 1]) {
        this.limb(ctx, cx + side * 3 * s, hipY, cx + side * (4 + 2 * turn) * s, baseY, t(7), col);
      }
    }

    this.limb(ctx, cx, hipY, shoulderX, shoulderY, t(11), col);
    this.limb(ctx, shoulderX - halfShoulder, shoulderY, shoulderX + halfShoulder, shoulderY, t(7), col);

    for (const side of [-1, 1]) {
      const sx = shoulderX + side * halfShoulder;
      let ex: number; let ey: number; let hx: number; let hy: number;
      if (p.handsFolded) {
        // hands meet in the lap — the Counsellor's tell, and the reason her
        // shot reads as care while she is the one making the demands
        ex = sx + side * 2 * s; ey = shoulderY + 12 * s;
        hx = cx + side * 3 * s; hy = hipY - 2 * s;
      } else {
        ex = sx + side * (2 + spread * 12) * s; ey = shoulderY + (12 - lift * 9) * s;
        hx = ex + side * (2 + spread * 14) * s; hy = ey + (11 - lift * 20) * s;
      }
      this.limb(ctx, sx, shoulderY + s, ex, ey, t(6), col);
      this.limb(ctx, ex, ey, hx, hy, t(5), col);
    }

    const headR = 7 * s;
    const hx0 = Math.round(shoulderX + lean * 0.35);
    const hy0 = Math.round(shoulderY - 9 * s);
    this.limb(ctx, hx0, hy0 + headR, shoulderX, shoulderY, t(4), col);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(hx0, hy0, Math.max(2, Math.round(headR * (0.78 + 0.22 * turn))),
                Math.max(2, Math.round(headR * 1.08)), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** a 1px outline box — the period phone and a few frames are drawn from
   *  these, so the outline vocabulary lives in one place */
  private outline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
                  color: string): void {
    ui.px(ctx, x, y, w, 1, color);
    ui.px(ctx, x, y + h - 1, w, 1, color);
    ui.px(ctx, x, y, 1, h, color);
    ui.px(ctx, x + w - 1, y, 1, h, color);
  }

  /** the head-and-shoulders bust. S63 gives it a colour (default unchanged):
   *  the chorus's ranks recede into haze, and a bust is exactly the right
   *  vocabulary for a crowd too far back to have legs. */
  private drawBust(ctx: CanvasRenderingContext2D, cx: number, baseY: number, scale = 1,
                   color: string = ERA1.black): void {
    const w = 34 * scale; const h = 30 * scale;
    ui.px(ctx, cx - w / 2, baseY - h * 0.55, w * 0.24, h * 0.3, color); // neck
    ui.px(ctx, cx - w / 2, baseY - h * 0.35, w, h * 0.5, color); // shoulders
    const headS = h * 0.5;
    ui.px(ctx, cx - headS / 2, baseY - h * 0.55 - headS * 0.85, headS, headS, color); // head
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
        //
        // S62 leaves this card exactly as it is — Sérgio: "so good and so in
        // sync with the song, marvelous". The ONE thing that changed is the
        // data: the three demands are the COUNSELLOR's, so her chyron is what
        // now stands under them. That is the whole dramaturgy, made legible
        // without a word of explanation.
        this.drawStepsCard(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override, false);
        return;
      case 'presents':
        this.drawPresentsCard(ctx, a);
        this.drawTag(ctx, a, scene);
        return;
      case 'title':
        this.drawTitleCard(ctx, a);
        this.drawTag(ctx, a, scene);
        return;
      case 'product':
        this.drawProductCard(ctx, a);
        this.drawTag(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override);
        return;
      case 'homecoming':
        this.drawHomecoming(ctx, a);
        this.drawTag(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override);
        return;
      case 'host':
        // S62 — THE CAST. Which body you are looking at is decided by WHO IS
        // SINGING, not by the shot type: the Struggler, Pastor Dale and the
        // Counsellor each get their own staging, key and pose. Before this
        // session all three were the same bust on the same beige set, which is
        // most of what Sérgio meant by "too similar".
        if (scene.speaker === 'THE STRUGGLER') this.drawStrugglerSet(ctx, a);
        else if (scene.speaker === 'THE COUNSELLOR') this.drawCounsellorSet(ctx, a);
        else this.drawPastorSet(ctx, a);
        this.drawTag(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override);
        return;
      case 'testimony':
        // ⚑ S206 — REAL STORIES. REAL CHANGE. (s2_media.json _docRealStories): his own take, cut into the ad
        if (scene.insertTape && ledger.records.includes('testimony-online') && this.elapsed - scene.at < TAPE_INSERT_SECONDS) {
          drawFootage(ctx, 'daniel', 13.2, a.x, a.y, a.w, a.h, 0, true);
          const M2 = media as unknown as { realStories: string; realStoriesLine: string };
          ui.px(ctx, a.x, a.y + Math.round(a.h * 0.08), a.w, 26, ERA1.navy);
          ui.setFont(ctx, 14); ctx.fillStyle = ERA1.white;
          const tw = ctx.measureText(M2.realStories).width;
          ctx.fillText(M2.realStories, a.x + Math.round((a.w - tw) / 2), a.y + Math.round(a.h * 0.08) + 6);
          ui.setFont(ctx, 10);
          const lw = ctx.measureText(M2.realStoriesLine).width;
          ui.px(ctx, a.x + Math.round((a.w - lw) / 2) - 6, a.y + a.h - 70, Math.ceil(lw) + 12, 16, ERA1.black);
          ctx.fillStyle = ERA1.white;
          ctx.fillText(M2.realStoriesLine, a.x + Math.round((a.w - lw) / 2), a.y + a.h - 67);
          this.drawTag(ctx, a, scene);
          return;
        }
        this.drawTestimonySet(ctx, a, scene);
        this.drawTag(ctx, a, scene);
        this.drawLowerThird(ctx, a, scene, override);
        return;
      default: {
        // THE CONGREGATION — the chorus (58.51 → 78.91).
        this.drawChorusSet(ctx, a, scene);
        // a karaoke scene's line is already the karaoke bar's text — one
        // subtitle, not two stacked copies of the same lyric
        const sung = !!scene.karaoke && !this.inBreak();
        this.drawLowerThird(ctx, a, scene, override, !sung);
        if (sung) this.drawKaraoke(ctx, a, scene);
      }
    }
  }

  /**
   * THE STRUGGLER (5.92, "Tired of feeling like yourself?") — the voice the
   * old data credited to an ANNOUNCER and the old video drew as the same bust
   * as everyone else. He is not the authority; he is the one being ADDRESSED,
   * and the shot has to say so before a word lands.
   *
   * Cold key, hard overhead light, and he is SMALL and off-centre in a frame
   * with far too much room in it — including a second pool of light with
   * nobody standing in it. The composition does the victim-blaming the lyric
   * does. Nothing here is warm; the warmth arrives with Dale, four seconds
   * later, which is the sell.
   */
  private drawStrugglerSet(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.grey);
    ui.px(ctx, a.x, a.y, a.w, Math.round(a.h * 0.26), ERA1.greyDark);
    const floorY = a.y + Math.round(a.h * 0.80);
    ui.px(ctx, a.x, floorY, a.w, a.h - Math.round(a.h * 0.80), ERA1.greyDark);

    const lx = a.x + Math.round(a.w * 0.33);
    const ex = a.x + Math.round(a.w * 0.74);
    const top = a.y + Math.round(a.h * 0.22);
    const rows = 20;
    ctx.globalAlpha = 0.15;
    for (const cx of [lx, ex]) {
      for (let i = 0; i < rows; i++) {
        const w = 10 + i * 2;
        const y = top + Math.round(i * (floorY - top) / rows);
        ui.px(ctx, cx - w / 2, y, w, Math.ceil((floorY - top) / rows) + 1, ERA1.silver);
      }
    }
    ctx.globalAlpha = 0.28;
    for (const cx of [lx, ex]) {
      ctx.fillStyle = ERA1.silver;
      ctx.beginPath();
      ctx.ellipse(cx, floorY + 8, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawFigure(ctx, lx, floorY + 8, {
      scale: 0.8,
      lean: 7,
      headDrop: 7 + this.breath(0.6) * 1.5,
      armSpread: 0,
      turn: 0.65
    });
  }

  /**
   * PASTOR DALE (8.78, 12.70) — centred, backlit, arms open. The authority,
   * and the only figure in the piece the light comes from BEHIND: he is a
   * silhouette against his own glory, which is both how this television was
   * actually lit and a fair description of what it is doing.
   */
  private drawPastorSet(ctx: CanvasRenderingContext2D, a: Rect): void {
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    const cx = a.x + Math.round(a.w / 2);
    const floorY = a.y + Math.round(a.h * 0.86);
    const glowY = floorY - 86; // centred on his head, not on the frame

    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + this.elapsed * 0.05;
      this.limb(ctx,
        cx + Math.cos(ang) * 68, glowY + Math.sin(ang) * 68,
        cx + Math.cos(ang) * 190, glowY + Math.sin(ang) * 190, 6, ERA1.olive);
    }
    ctx.globalAlpha = 1;

    const pulse = Math.sin(this.elapsed * 1.6) > 0 ? 1 : 0;
    ctx.fillStyle = ERA1.olive;
    ctx.beginPath(); ctx.arc(cx, glowY, 76 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ERA1.tooltip;
    ctx.beginPath(); ctx.arc(cx, glowY, 57, 0, Math.PI * 2); ctx.fill();

    this.drawFigure(ctx, cx, floorY, {
      scale: 1.35,
      armSpread: 0.58 + this.breath() * 0.26,
      armLift: 0.4 + this.breath(1.2) * 0.1
    });

    // the lectern he is standing behind — one block, and the shot reads pulpit
    ui.px(ctx, cx - 52, floorY - 30, 104, 34, ERA1.black);
    ui.px(ctx, cx - 52, floorY - 30, 104, 2, ERA1.olive);
  }

  /**
   * THE COUNSELLOR (17.16, 41.65, the three steps, both homecoming lines) —
   * the woman's voice the data used to credit to Pastor Dale.
   *
   * ⚑ THE POINT OF THE WHOLE SESSION IS IN THIS ROOM. Hers is the warmest
   * shot in the infomercial: a soft key, a lamp, a chair, hands folded in her
   * lap, the camera closer than it ever gets to Dale. And hers is the voice
   * that says "Confess it · Submit it · Let us hold it for you", and "the self
   * he meant you to be". The softest voice makes the actual demands. The video
   * hid that when it drew her as the same bust as the pastor; it is legible
   * now, and it is never explained — the staging just stops lying about who is
   * asking.
   */
  private drawCounsellorSet(ctx: CanvasRenderingContext2D, a: Rect): void {
    // a room, not a backdrop: warm wall, a wainscot rail, a carpet
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.paper);
    ui.px(ctx, a.x, a.y, a.w, Math.round(a.h * 0.12), ERA1.beige);
    const cx = a.x + Math.round(a.w * 0.40);
    const floorY = a.y + Math.round(a.h * 0.80);
    ui.px(ctx, a.x, floorY - 46, a.w, 46, ERA1.beige);
    ui.px(ctx, a.x, floorY - 48, a.w, 3, ERA1.olive);
    ui.px(ctx, a.x, floorY + 8, a.w, a.h - (floorY - a.y) - 8, ERA1.olive);

    // the warm key, pooled behind her head and nowhere else — soft enough on
    // the paper wall that it reads as lighting rather than as an object
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ERA1.white;
    ctx.beginPath();
    ctx.ellipse(cx + 8, floorY - 96, 104, 74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // a standard lamp — the cheapest possible signal for "this is a room in a
    // house and you are safe in it"
    const lampX = a.x + Math.round(a.w * 0.84);
    const shadeY = floorY - 150;
    ui.px(ctx, lampX - 2, shadeY, 4, 158, ERA1.greyDark);
    ui.px(ctx, lampX - 16, floorY + 4, 32, 5, ERA1.greyDark);
    for (let i = 0; i < 7; i++) {
      ui.px(ctx, lampX - 12 - i * 2, shadeY - 4 - i * 4, 24 + i * 4, 5, ERA1.olive);
    }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = ERA1.tooltip;
    ctx.beginPath(); ctx.arc(lampX, shadeY - 4, 34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // her chair, then her — seated, hands folded, turned three-quarters to you,
    // and the camera closer to her than it ever gets to Dale
    const hipY = floorY - 29;
    ui.px(ctx, cx - 32, hipY - 54, 64, 56, ERA1.greyDark);
    ui.px(ctx, cx - 36, hipY - 2, 72, 12, ERA1.greyDark);
    this.drawFigure(ctx, cx, floorY, {
      scale: 1.32,
      seated: true,
      handsFolded: true,
      turn: 0.9,
      headDrop: this.breath(2.1) * 1.6
    });
  }

  /**
   * MARCUS — the testimony, before and after (25.73 / 37.07). Sérgio called
   * the concept "awesome" and the execution too alike: both grades were the
   * same bust on the same set with one word changed.
   *
   * BEFORE: desaturated, harsh top light, a frame CRAMPED by black bars, the
   * body slumped — and a window behind him.
   * AFTER: warm key, wide frame, upright, a family-shaped shadow on the wall.
   *
   * ⚑ The quiet inversion (spec §3): the BEFORE has the window and the AFTER
   * does not. Recovery as enclosure. It is never remarked on, by anyone, ever.
   */
  private drawTestimonySet(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    const before = scene.grade === 'before';
    const cx = a.x + Math.round(a.w / 2);
    const floorY = a.y + Math.round(a.h * 0.82);

    if (before) {
      ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.grey);
      ui.px(ctx, a.x, a.y, a.w, Math.round(a.h * 0.20), ERA1.greyDark);
      ui.px(ctx, a.x, floorY, a.w, a.h - Math.round(a.h * 0.82), ERA1.greyDark);

      // THE WINDOW (see the doc comment — do not "fix" this by giving the
      // AFTER one too)
      const wx = cx + 34; const wy = a.y + Math.round(a.h * 0.24); const ww = 92; const wh = 78;
      ui.px(ctx, wx - 4, wy - 4, ww + 8, wh + 8, ERA1.greyDark);
      ui.px(ctx, wx, wy, ww, wh, ERA1.silver);
      ui.px(ctx, wx + Math.round(ww / 2) - 1, wy, 3, wh, ERA1.greyDark);
      ui.px(ctx, wx, wy + Math.round(wh / 2) - 1, ww, 3, ERA1.greyDark);

      // a single hard light straight down on him, and nothing else lit
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 20; i++) {
        const w = 10 + i * 2;
        const y = a.y + i * Math.round((floorY - a.y) / 20);
        ui.px(ctx, cx - 62 - w / 2, y, w, Math.ceil((floorY - a.y) / 20) + 1, ERA1.silver);
      }
      ctx.globalAlpha = 1;

      this.drawFigure(ctx, cx - 62, floorY + 6, {
        scale: 0.95, lean: 7, headDrop: 7 + this.breath(0.4) * 1.4, armSpread: 0, turn: 0.7
      });

      // the frame closes in on him — drawn last so it genuinely crops
      const bar = Math.round(a.w * 0.16);
      ui.px(ctx, a.x, a.y, bar, a.h, ERA1.black);
      ui.px(ctx, a.x + a.w - bar, a.y, bar, a.h, ERA1.black);
    } else {
      ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.paper);
      ui.px(ctx, a.x, a.y, a.w, Math.round(a.h * 0.16), ERA1.beige);
      ui.px(ctx, a.x, floorY, a.w, a.h - Math.round(a.h * 0.82), ERA1.olive);

      // the family-shaped shadow: two more of him on the wall, smaller, and
      // never named or spoken to
      this.drawFigure(ctx, cx - 78, floorY + 2, { scale: 0.62, color: ERA1.silver, turn: 0.8, armSpread: 0.12 });
      this.drawFigure(ctx, cx + 70, floorY + 2, { scale: 0.46, color: ERA1.silver, turn: 0.8, armSpread: 0.1 });

      this.drawFigure(ctx, cx, floorY + 6, {
        scale: 1.12,
        armSpread: 0.3 + this.breath() * 0.08,
        armLift: 0.14,
        headDrop: -1
      });
    }

    // the grade badge sits BELOW the tape's timestamp chrome — at a.y+10 the
    // two were printed on top of each other
    ui.setFont(ctx, 12);
    const badge = before ? M.before : M.after;
    this.fringeText(ctx, badge, a.x + (before ? Math.round(a.w * 0.16) + 10 : 12), a.y + 26,
      before ? ERA1.warnDark : ERA1.ok);
  }

  /**
   * PRODUCT PLACEMENT (33.43, "Then Pastor Dale showed me the program") —
   * Sérgio: "almost needs a fake poster of the program like a product
   * placement." So the box gets held up to camera the way DRTV has always
   * held it up: twelve cassettes, a workbook, shrink-wrap, and a starburst.
   * The apparatus as a thing you can own, which is the same claim the song is
   * making about a self.
   */
  private drawProductCard(ctx: CanvasRenderingContext2D, a: Rect): void {
    const P = M.product;
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    const cx = a.x + Math.round(a.w / 2);
    const cy = a.y + Math.round(a.h * 0.44);

    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2 + this.elapsed * 0.08;
      this.limb(ctx, cx + Math.cos(ang) * 60, cy + Math.sin(ang) * 60,
        cx + Math.cos(ang) * 210, cy + Math.sin(ang) * 210, 6, ERA1.olive);
    }
    ctx.globalAlpha = 1;

    // the box, breathing a pixel because someone is holding it
    const lift = Math.round(this.breath() * 2);
    const bw = 152; const bh = 116;
    const bx = cx - Math.round(bw / 2); const by = cy - Math.round(bh / 2) - lift;
    ui.px(ctx, bx + 8, by - 8, bw, 8, ERA1.titleBlue);   // the top face
    ui.px(ctx, bx + bw, by - 8, 8, bh + 8, ERA1.greyDark); // the side face
    ui.px(ctx, bx, by, bw, bh, ERA1.navy);
    ui.px(ctx, bx, by, bw, 3, ERA1.olive);
    ui.px(ctx, bx, by + bh - 3, bw, 3, ERA1.olive);

    ui.setFont(ctx, 15);
    let tw = ctx.measureText(P.name).width;
    this.fringeText(ctx, P.name, cx - tw / 2, by + 12, ERA1.tooltip);
    ui.setFont(ctx, 11);
    tw = ctx.measureText(P.sub).width;
    this.fringeText(ctx, P.sub, cx - tw / 2, by + 30, ERA1.white);

    // twelve cassette spines and the workbook leaning beside them
    for (let i = 0; i < 12; i++) {
      const sx = bx + 12 + i * 10;
      ui.px(ctx, sx, by + 50, 8, 30, ERA1.beige);
      ui.px(ctx, sx + 1, by + 55, 6, 2, ERA1.greyDark);
      ui.px(ctx, sx + 1, by + 72, 6, 4, ERA1.greyDark);
    }
    ui.px(ctx, bx + 132, by + 44, 14, 36, ERA1.paper);
    for (let i = 0; i < 5; i++) ui.px(ctx, bx + 134, by + 50 + i * 6, 10, 1, ERA1.grey);

    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(P.contents1, bx + 12, by + 86);
    ctx.fillText(P.contents2, bx + 12, by + 96);

    // shrink-wrap: two glints stepped across the face, never a smooth gradient
    ctx.globalAlpha = 0.3;
    this.limb(ctx, bx + 18, by + bh, bx + 74, by, 5, ERA1.white);
    this.limb(ctx, bx + 74, by + bh, bx + 130, by, 3, ERA1.white);
    ctx.globalAlpha = 1;

    // the hands holding it up — faceless, like every body in this film. Short
    // and thick, entering from the bottom of frame: forearms, not stilts.
    for (const side of [-1, 1]) {
      const hx = cx + side * 58;
      this.limb(ctx, hx + side * 96, a.y + a.h, hx, by + bh - 4, 22, ERA1.black);
      ui.px(ctx, hx - 13, by + bh - 14, 26, 18, ERA1.black);
    }

    // clear of the skip button, which lives in the top-right corner
    this.drawStarburst(ctx, a.x + a.w - 58, a.y + 96, 38, P.starburst1, P.starburst2);
  }

  /** the AS SEEN ON TV rosette — the same chunky-petal grammar as the offer
   *  screen's guarantee seal, one size down */
  private drawStarburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
                        line1: string, line2: string): void {
    const spin = this.elapsed * 0.5;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + spin;
      ui.px(ctx, Math.round(cx + Math.cos(ang) * r) - 5, Math.round(cy + Math.sin(ang) * r) - 5,
        10, 10, ERA1.warn);
    }
    ctx.fillStyle = ERA1.warn;
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.fill();
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.white;
    let tw = ctx.measureText(line1).width;
    ctx.fillText(line1, Math.round(cx - tw / 2), cy - 9);
    tw = ctx.measureText(line2).width;
    ctx.fillText(line2, Math.round(cx - tw / 2), cy + 1);
  }

  /**
   * "WON'T YOU COME HOME / TO THE SELF HE MEANT YOU TO BE" (49.19 → 58.51).
   * Sérgio: "they need more flourishing because it doesn't give much of a Come
   * to us creepy vibe. Because 'meant you to be' is such a strong thing here!"
   *
   * Four things, all restrained, none of them a jump-scare:
   *   · the three figures TURN to face you and open their arms in unison;
   *   · a doorway of light widens behind them across the two lines;
   *   · they step a few pixels CLOSER on the beat — quantised deliberately, so
   *     nothing ever glides at you. They are simply nearer each time you look;
   *   · "To the self he meant you to be" arrives letter by letter (`reveal`).
   * The approach is capped: an invitation that keeps coming, never a lunge.
   */
  private drawHomecoming(ctx: CanvasRenderingContext2D, a: Rect): void {
    const span = Math.max(this.homecomingTo - this.homecomingFrom, 0.01);
    const p = Math.min(Math.max((this.elapsed - this.homecomingFrom) / span, 0), 1);
    const beats = Math.min(this.beatsSince(this.homecomingFrom), 14);
    const cx = a.x + Math.round(a.w / 2);
    const floorY = a.y + Math.round(a.h * 0.76) + beats;

    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.greyDark);
    ui.px(ctx, a.x, floorY, a.w, a.h - (floorY - a.y), ERA1.black);

    const dw = 16 + Math.round(p * 148);
    const dh = Math.round(a.h * 0.62);
    ui.px(ctx, cx - dw / 2, floorY - dh, dw, dh, ERA1.tooltip);
    ui.px(ctx, cx - dw / 2 - 3, floorY - dh - 3, dw + 6, 3, ERA1.olive);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = ERA1.tooltip;
    for (let i = 0; i < 8; i++) {
      const w = dw + i * 10;
      ui.px(ctx, cx - w / 2, floorY + i * 4, w, 4, ERA1.tooltip);
    }
    ctx.globalAlpha = 1;

    const turn = Math.min(p / 0.45, 1);
    const scale = 0.82 + beats * 0.022;
    for (const off of [-1, 0, 1]) {
      this.drawFigure(ctx, cx + off * Math.round(58 + beats * 1.4), floorY + 4, {
        scale: off === 0 ? scale : scale * 0.92,
        turn,
        armSpread: turn * (0.55 + p * 0.4),
        armLift: turn * 0.28,
        headDrop: this.breath(off * 1.7) * 1.4
      });
    }
  }

  /**
   * THE CHORUS (58.51 → 78.91) — twenty seconds, and until S63 they were
   * twenty seconds of three busts on one flat field. Sérgio, who had called
   * this shot "fantastic", revised himself once the rest of the film had
   * bodies: "it is a bit bare-bones compared to the other images now… Do you
   * think it would be possible to keep the Karaoke aspect and just change what
   * is being shown?" The bar, the ball and their timing are untouched; what
   * they play over is rebuilt.
   *
   * THE IDEA, which is the piece's own argument and is never stated:
   * **the congregation grows, and as it grows it becomes identical.**
   *   · Four people open the chorus as four different people — one hunched,
   *     one turned away, one with her hands folded, one already sold — and
   *     across the six lines every difference is interpolated out of them:
   *     same posture, same open arms, same angle to camera.
   *   · They also stop breathing separately. Early, each body rides its own
   *     phase (S60's rule: the row must never move as one object). By the last
   *     lines they all move ON THE BEAT, together. **Losing the phase
   *     difference IS the unification** — the shot argues by synchronising.
   *   · A rank of busts is added BEHIND them on every line, receding and
   *     paling into the light, so a quartet becomes a choir of fifty.
   *   · The light rises out of the horizon in stepped bands — "It's a
   *     brighter, lighter way" arriving as literal illumination, on the line
   *     that says it.
   *   · ⚑ AND THE FRONT RANK HAS A GAP IN IT. Dead centre, with an aisle
   *     running back through the choir, a place is kept empty; it lights on
   *     "Discover the new you today" and is the only thing the frame is still
   *     missing when the choir is complete. It is a reprise of the second,
   *     empty pool of light in the Struggler's shot at 5.92. Nothing ever
   *     mentions either one.
   */
  private drawChorusSet(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    const chorus = this.scenes.filter(s => s.shot === 'crowd');
    const idx = Math.max(chorus.indexOf(scene), 0);
    const span = Math.max(this.chorusTo - this.chorusFrom, 0.01);
    const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
    const dawn = clamp((this.elapsed - this.chorusFrom) / span);
    // they finish converging on the fourth line — the one that promises the
    // brighter, lighter way. Derived from the data, never a typed second.
    const unifyBy = chorus[Math.min(3, chorus.length - 1)]?.at ?? this.chorusTo;
    const unify = clamp((this.elapsed - this.chorusFrom) / Math.max(unifyBy - this.chorusFrom, 0.01));
    const mix = (from: number, to: number) => from + (to - from) * unify;

    const cx = a.x + Math.round(a.w / 2);
    const floorY = a.y + Math.round(a.h * 0.70);

    // the light comes up out of the horizon, one stepped band per shade
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.grey);
    const glow = Math.round(dawn * a.h * 0.74);
    ui.px(ctx, a.x, floorY - glow, a.w, glow, ERA1.beige);
    ui.px(ctx, a.x, floorY - Math.round(glow * 0.62), a.w, Math.round(glow * 0.62), ERA1.paper);
    ui.px(ctx, a.x, floorY - Math.round(glow * 0.26), a.w, Math.round(glow * 0.26), ERA1.white);
    ui.px(ctx, a.x, floorY, a.w, a.h - (floorY - a.y), ERA1.beige);
    ui.px(ctx, a.x, floorY, a.w, 2, ERA1.olive);

    // the beat they will all end up moving on
    const beatBob = this.beatFrac() < 0.5 ? 0 : 1;
    const AISLE = 26; // the kept place runs all the way back through the ranks

    // the ranks behind, back to front — each line of the song adds one. They
    // stand ABOVE the front rank's heads, which is the only depth cue a flat
    // 2D field has, and they pale into the light as they recede.
    for (let r = idx + 1; r >= 1; r--) {
      const s = Math.max(0.34, 0.62 - (r - 1) * 0.06);
      const count = 7 + r * 3;
      const y = floorY - 62 - (r - 1) * 15 - beatBob;
      const shade = r >= 5 ? ERA1.silver : r >= 3 ? ERA1.grey : ERA1.greyDark;
      for (let i = 0; i < count; i++) {
        const x = a.x + Math.round((i + 0.5) * a.w / count) + (r % 2 ? 9 : 0);
        if (Math.abs(x - cx) < AISLE) continue;
        this.drawBust(ctx, x, y, s, shade);
      }
    }

    // ⚑ the place kept for you — it lights on "Discover the new you today"
    const litFrom = chorus[Math.min(2, chorus.length - 1)]?.at ?? this.chorusFrom;
    const lit = clamp((this.elapsed - litFrom) / 2.4);
    if (lit > 0) {
      ctx.globalAlpha = 0.3 + lit * 0.45;
      ctx.fillStyle = ERA1.white;
      ctx.beginPath();
      ctx.ellipse(cx, floorY + 12, Math.round(18 + lit * 26), Math.round(4 + lit * 4), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // the front rank: four people who begin as four people
    const rank = [
      { x: -148, lean: 6, drop: 6, spread: 0,    turn: 0.6,  folded: false, phase: 1.9 },
      { x: -56,  lean: 0, drop: 0, spread: 0,    turn: 0.25, folded: false, phase: 0.0 },
      { x: 56,   lean: 0, drop: 2, spread: 0,    turn: 0.85, folded: true,  phase: 3.4 },
      { x: 148,  lean: 0, drop: 0, spread: 0.55, turn: 1,    folded: false, phase: 2.6 }
    ];
    for (const f of rank) {
      const bob = Math.round(mix(this.breath(f.phase) * 2, beatBob * 2));
      this.drawFigure(ctx, cx + f.x, floorY + 4 - bob, {
        scale: 0.86,
        lean: mix(f.lean, 0),
        headDrop: mix(f.drop, 0),
        armSpread: mix(f.spread, 0.62),
        // once they are one body, the arms lift together on the beat
        armLift: mix(0, 0.3) + beatBob * 0.16 * unify,
        turn: mix(f.turn, 1),
        handsFolded: f.folded && unify < 0.5
      });
    }

    // SING ALONG — the apparatus asking you to join in, which is what a
    // karaoke bar in an infomercial has always been for. It drops away once
    // everyone is singing.
    if (idx <= 1 && M.singAlong) {
      ui.setFont(ctx, 9);
      const tw = ctx.measureText(M.singAlong).width;
      const px0 = cx - Math.round(tw / 2);
      const py = a.y + a.h - 96; // clear of the bouncing ball's arc
      ui.px(ctx, px0 - 12, py - 3, tw + 24, 14, ERA1.black);
      ui.px(ctx, px0 - 8, py + 2, 5, 5, this.beatFrac() < 0.5 ? ERA1.warn : ERA1.warnDark);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(M.singAlong, px0, py);
    }
  }

  /**
   * THE OPENING, 1/2 — "LAMBY PRODUCTIONS PRESENTS" over an EVANGELIST Lamby.
   *
   * Explicitly NOT the Clippy lamb of `lambyChar.ts` (nothing is imported from
   * it): this is a ministry LOGO — haloed, backlit, in a gold-edged oval like
   * a stained-glass window. He has no face here, which is what a logo is.
   *
   * ⚑ It never winks. Sérgio's own phrasing was "recover/succumb", and the
   * joke is that the two are interchangeable — but the card plays it straight,
   * because the word that curdles has to be the one the audience supplies.
   * Every glitch in this film belongs to the break; the opening's whole job is
   * to be sincerely, hideously wholesome.
   */
  private drawPresentsCard(ctx: CanvasRenderingContext2D, a: Rect): void {
    const T = M.titleCard;
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.navy);
    const cx = a.x + Math.round(a.w / 2);
    const cy = a.y + Math.round(a.h * 0.40);

    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2 + this.elapsed * 0.06;
      this.limb(ctx, cx + Math.cos(ang) * 70, cy + Math.sin(ang) * 70,
        cx + Math.cos(ang) * 230, cy + Math.sin(ang) * 230, 6, ERA1.titleBlue);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = ERA1.olive;
    ctx.beginPath(); ctx.ellipse(cx, cy, 92, 76, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ERA1.tealDark;
    ctx.beginPath(); ctx.ellipse(cx, cy, 84, 68, 0, 0, Math.PI * 2); ctx.fill();

    this.drawEvangelistLamby(ctx, cx, cy + 14);

    ui.setFont(ctx, 12);
    const tw = ctx.measureText(T.presents).width;
    this.fringeText(ctx, T.presents, cx - tw / 2, a.y + Math.round(a.h * 0.78), ERA1.tooltip);
  }

  /** the ministry lamb: fleece, drooping ears, a halo, and no face at all */
  private drawEvangelistLamby(ctx: CanvasRenderingContext2D, cx: number, baseY: number): void {
    const fleece = [
      [-26, -14, 13], [-11, -24, 14], [7, -25, 14], [22, -16, 13],
      [26, 0, 12], [12, 10, 13], [-8, 11, 13], [-25, 2, 12], [0, -4, 22]
    ] as const;
    ctx.fillStyle = ERA1.silver;
    for (const [dx, dy, r] of fleece) {
      ctx.beginPath(); ctx.arc(cx + dx + 2, baseY + dy + 2, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = ERA1.white;
    for (const [dx, dy, r] of fleece) {
      ctx.beginPath(); ctx.arc(cx + dx, baseY + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    // legs
    ui.px(ctx, cx - 16, baseY + 16, 6, 16, ERA1.beige);
    ui.px(ctx, cx + 8, baseY + 16, 6, 16, ERA1.beige);
    // the head, bowed — a plain beige shape, no eyes, no mouth
    const hx = cx + 26; const hy = baseY - 20;
    ctx.fillStyle = ERA1.beige;
    ctx.beginPath(); ctx.ellipse(hx, hy, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
    ui.px(ctx, hx + 6, hy - 2, 12, 8, ERA1.beige);
    // ears, stepped down and out (no ctx.rotate — 1997 rules)
    for (const [dx, dy, w, h] of [[-12, 0, 8, 5], [-16, 5, 7, 5], [-19, 10, 6, 4]] as const) {
      ui.px(ctx, hx + dx, hy + dy, w, h, ERA1.grey);
    }
    // THE HALO — a flat ring above the head, drawn as a squashed ellipse pair
    ctx.fillStyle = ERA1.tooltip;
    ctx.beginPath(); ctx.ellipse(hx, hy - 24, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ERA1.tealDark;
    ctx.beginPath(); ctx.ellipse(hx, hy - 24, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * THE OPENING, 2/2 — the title, played completely straight, and the most
   * mundane copyright line the era could produce. No glitch, no irony, no
   * flicker. The card means every word of it.
   */
  private drawTitleCard(ctx: CanvasRenderingContext2D, a: Rect): void {
    const T = M.titleCard;
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.tealDark);
    const cx = a.x + Math.round(a.w / 2);
    const mid = a.y + Math.round(a.h * 0.42);

    ui.px(ctx, a.x + 40, mid - 34, a.w - 80, 2, ERA1.olive);
    ui.px(ctx, a.x + 40, mid + 48, a.w - 80, 2, ERA1.olive);

    ui.setFont(ctx, 17);
    let tw = ctx.measureText(T.titleLine1).width;
    this.fringeText(ctx, T.titleLine1, cx - tw / 2, mid - 18, ERA1.tooltip);
    tw = ctx.measureText(T.titleLine2).width;
    this.fringeText(ctx, T.titleLine2, cx - tw / 2, mid + 12, ERA1.tooltip);

    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    tw = ctx.measureText(T.copyright).width;
    ctx.fillText(T.copyright, Math.round(cx - tw / 2), a.y + a.h - 26);
  }

  /**
   * THE DRTV CHYRON LAYER (S62) — Sérgio asked for "messages on the screen to
   * add layers of interpretation". These four captions are not invented: they
   * are the furniture real direct-response television is obliged to carry, and
   * DRAMATIZATION standing under a testimony is the most damning caption the
   * era supplies — the apparatus retracting its own witness, in 6pt, while the
   * song keeps selling. Small, grey, bottom-left, exactly where it lived.
   */
  private drawTag(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene): void {
    const text = scene.tag ? (M.tags[scene.tag] ?? '') : '';
    if (!text) return;
    ui.setFont(ctx, 8);
    const tw = ctx.measureText(text).width;
    const x = a.x + 10; const y = a.y + a.h - 46;
    ui.px(ctx, x - 3, y - 2, tw + 6, 12, ERA1.black);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(text, x, y);
  }

  /** `showLine: false` = something else on screen already carries this scene's
   *  line (the karaoke bar, the steps card), so the band shows the chyron only.
   *  S51: a band with NOTHING to carry — an instrumental shot, or the CROWD's
   *  chorus, which has no chyron — isn't drawn at all rather than laid down as
   *  an empty navy slab. */
  private drawLowerThird(ctx: CanvasRenderingContext2D, a: Rect, scene: Scene, override?: string,
                         showLine = true): void {
    const chyron = scene.speaker ? (M.chyrons[scene.speaker] ?? '') : '';
    let line = override ?? (showLine ? scene.line : '');
    // S62: a `reveal` line spells itself out letter by letter — used once, on
    // "To the self he meant you to be", because that is the sentence the whole
    // apparatus is built to arrive at and it should be watched being typed.
    // The rate comes from the scene's own span, so nothing is hand-timed.
    if (line && scene.reveal && override === undefined) {
      const span = Math.max(this.nextSceneAt(scene) - scene.at, 0.5) * 0.45;
      const frac = Math.min(Math.max((this.elapsed - scene.at) / span, 0), 1);
      line = line.slice(0, Math.ceil(frac * line.length));
    }
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
    // S63: the bar grew from 22 to 34 so it can carry the line COMING UP,
    // dim, underneath the one being sung — which is what a karaoke tape
    // actually does, and it gives the twenty seconds somewhere to be going.
    // The ball, the fill-behind-it and every timing are exactly as they were.
    const barY = a.y + a.h - 64;
    ui.px(ctx, a.x, barY, a.w, 34, ERA1.black);
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
    const nextScene = this.scenes[this.scenes.indexOf(scene) + 1];
    if (nextScene?.karaoke && nextScene.line) {
      ui.setFont(ctx, 9);
      const nw = ctx.measureText(nextScene.line).width;
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(nextScene.line, Math.round(a.x + (a.w - nw) / 2), barY + 20);
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
    const od = this.overdriveAmount();
    const swell = this.swellAmount();
    ui.px(ctx, a.x, a.y, a.w, a.h, ERA1.navy);
    const cx = a.x + a.w / 2;

    // S62 — the overdrive is allowed to overflow, so the picture has to CLIP.
    // "Grows until it no longer fits" only means anything if the frame refuses
    // to make room.
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, a.w, a.h);
    ctx.clip();

    // ORDER NOW! — a DRTV end-frame always shouts first. It alternates between
    // two warm tones rather than blinking on/off: motion without a luminance
    // step (glitch doctrine — warm-corrupt, never strobe), ~0.8 Hz. In the
    // overdrive it simply keeps GROWING, past the edges of its own screen.
    ui.setFont(ctx, Math.round(14 + od * od * 62));
    const shout = Math.sin(this.elapsed * 5) > 0 ? ERA1.warn : ERA1.tooltip;
    const ow = ctx.measureText(O.orderNow).width;
    this.fringeText(ctx, O.orderNow, cx - ow / 2, a.y + 14 - od * 10, shout);

    // the number (or, once the tape is failing, the stutter that replaced it).
    // S62: it SWELLS from 97.6 into the countdown — which is what replaced the
    // retired crowd cut — and in the overdrive it duplicates across the frame.
    const beatPop = this.beatFrac() < 0.3 ? 1 : 0;
    ui.setFont(ctx, Math.round(16 + swell * 8 + od * 10 + beatPop));
    const big = override ?? M.phone;
    const bw = ctx.measureText(big).width;
    const copies = 1 + Math.floor(od * 5);
    for (let i = copies - 1; i >= 0; i--) {
      const jx = i === 0 ? 0 : Math.round(Math.sin(this.elapsed * (6 + i * 3) + i) * od * 30);
      const jy = i === 0 ? 0 : Math.round(Math.cos(this.elapsed * (4 + i * 2) + i) * od * 18);
      this.fringeText(ctx, big, cx - bw / 2 + jx, a.y + 40 + jy,
        i === 0 ? ERA1.tooltip : ERA1.olive);
    }

    ui.setFont(ctx, 9);
    const ww = ctx.measureText(O.website).width;
    this.fringeText(ctx, O.website, cx - ww / 2, a.y + 68 + Math.round(swell * 8), ERA1.white);

    if (!override) {
      ui.setFont(ctx, 10);
      const cw = ctx.measureText(M.cta).width;
      this.fringeText(ctx, M.cta, cx - cw / 2, a.y + 86 + Math.round(swell * 8), ERA1.white);
    }

    if (this.operatorsAt && this.elapsed >= this.operatorsAt) {
      this.drawPhoneUnit(ctx, a.x + 24, a.y + 116);
    }

    this.drawGuaranteeRosette(ctx, a.x + a.w - 74, a.y + 150, od);
    this.drawCardBadges(ctx, a.x + 24, a.y + 196, od);

    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    O.finePrint.forEach((line, i) => {
      ctx.fillText(line, a.x + 24, a.y + a.h - 78 + i * 10);
    });
    ctx.restore();
  }

  /** 0 → 1 across the overdrive, i.e. from the last "Call now" to the tear */
  private overdriveAmount(): number {
    if (this.elapsed < this.overdriveAt) return 0;
    const span = Math.max(this.tearAt - this.overdriveAt, 0.001);
    return Math.min((this.elapsed - this.overdriveAt) / span, 1);
  }

  /** 0 → 1 from the `swell` beat to the break, then held. The phone number
   *  grows into the countdown instead of the video cutting away to a bare
   *  crowd shot and back — Sérgio's own suggestion, and it keeps the last
   *  fifteen seconds one continuous run. */
  private swellAmount(): number {
    if (!this.swellAt || this.elapsed < this.swellAt) return 0;
    const span = Math.max(this.breakStart - this.swellAt, 0.001);
    return Math.min((this.elapsed - this.swellAt) / span, 1);
  }

  /**
   * "OPERATORS OF GRACE ARE STANDING BY" (91.70) — Sérgio: "maybe add an
   * outline of phone with a blinking light?" A period desk phone in outline,
   * its hold light blinking ON THE BEAT of the song, and a count of available
   * operators that ticks down and never reaches zero. Scarcity that never
   * resolves is the entire grammar of a call-now clock, and the sequence is
   * authored in the data so it can never land on 0 by accident.
   */
  private drawPhoneUnit(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const line = ERA1.tooltip;
    this.outline(ctx, x, y, 66, 12, line);          // the handset
    this.outline(ctx, x + 2, y + 12, 10, 8, line);  // its cradle horns
    this.outline(ctx, x + 54, y + 12, 10, 8, line);
    this.outline(ctx, x + 4, y + 20, 58, 30, line); // the base
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) ui.px(ctx, x + 12 + c * 9, y + 26 + r * 7, 4, 4, line);
    }
    const on = this.beatFrac() < 0.42;
    ui.px(ctx, x + 46, y + 28, 6, 6, on ? ERA1.warn : ERA1.warnDark);

    const counts = M.operators.counts;
    const idx = Math.floor((this.elapsed - this.operatorsAt) / (SONG_BEAT * 2));
    const n = counts[((idx % counts.length) + counts.length) % counts.length];
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(`${M.operators.label} ${n}`, x, y + 54);
  }

  /** the gold seal. Drawn as a pixel starburst — chunky petals + concentric
   *  discs, palette tokens only — and it BREATHES by one pixel, which is all
   *  the animation a seal needs to look like it is being held up to camera. */
  private drawGuaranteeRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number,
                               od = 0): void {
    const pulse = Math.sin(this.elapsed * 1.9) > 0 ? 1 : 0;
    const r = 42 + pulse + Math.round(od * 14);
    // S62: in the overdrive the seal SPINS — the petals rotate rather than the
    // canvas (90°-step rotation law), and a guarantee on selfhood turning into
    // a fairground wheel is the promise collapsing under its own weight.
    const spin = this.elapsed * 3.2 * od;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + spin;
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
  private drawCardBadges(ctx: CanvasRenderingContext2D, x: number, y: number, od = 0): void {
    const bw = 62; const bh = 22; const gap = 6;
    // S62: in the overdrive the rails MULTIPLY and stack upward — the same four
    // invented marks, printed again and again, because a pitch in collapse has
    // no new reassurance to offer and can only repeat the ones it has.
    const cards = M.offer.cards;
    const total = cards.length + Math.floor(od * 16);
    for (let i = 0; i < total; i++) {
      const name = cards[i % cards.length];
      const bx = x + (i % 4) * (bw + gap);
      const by = y - Math.floor(i / 4) * (bh + 4);
      ui.bevel(ctx, bx, by, bw, bh, true);
      ui.px(ctx, bx + 2, by + 2, bw - 4, 4, ERA1.navy);
      ui.setFont(ctx, 7);
      ctx.fillStyle = ERA1.black;
      const tw = ctx.measureText(name).width;
      ctx.fillText(name, Math.round(bx + (bw - tw) / 2), by + 10);
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
    // S62 — BIGGER, and legible THROUGH the noise rather than under it
    // (Sérgio: "needs to be bigger so we can see it with the scanlines and
    // noise, but it is great to read it while the call now is ending!!"). The
    // type goes 9 → 13 and gains a black outline so the static cannot eat it;
    // it is also drawn after the noise layer now. THE TIMING IS UNCHANGED —
    // the rate still comes from the scene's own `at` and the video's
    // `duration`, so it still finishes exactly as the tape runs out, which is
    // the part he explicitly loves.
    ui.setFont(ctx, 13);
    const tw = ctx.measureText(scene.line).width;
    const travel = a.w + tw;
    const span = Math.max(this.duration - scene.at, 0.5);
    const frac = Math.min(Math.max((this.elapsed - scene.at) / span, 0), 1);
    const x = Math.round(a.x + a.w - frac * travel);
    const y = a.y + a.h - 56;
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, a.w, a.h);
    ctx.clip();
    ctx.fillStyle = ERA1.black;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]] as const) {
      ctx.fillText(scene.line, x + ox, y + oy);
    }
    ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(scene.line, x, y);
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
