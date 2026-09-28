/**
 * ⚑ FLOPPYSHEEP (Session 70) — the mascot game on Vera's phone.
 * Strings, course and every authored value: `data/dialog/s3_floppysheep.json`.
 *
 * Sérgio asked for this by name (*"just feel like the need to the FloppySheep
 * to be there would be good"*), and it had to be BUILT rather than written
 * down, because the whole of what it says is a thing you can only find out by
 * being able to do it: **it is one tap away while a comment sits unanswered.**
 * That is what everybody does at work. The piece says NOTHING about it — no
 * scolding, no timer, no guilt, no interruption, no ledger entry, ever. Nothing
 * in the thread degrades while she plays and nothing waits any less patiently.
 *
 * ⚑ IT IS NOT RESPITE. E3 has no respite (Sérgio's decision, confirmed) and
 * this does not quietly reintroduce one. FloppySheep is `operable`: the
 * apparatus's own cheerful product, by the same publisher whose serious arm has
 * become a workflow — *a Lamby game*, says its own footer. The joke is on the
 * brand. It is never on the person holding the phone, and it is never a reward:
 * nothing is unlocked by it, nothing is scored across runs, no best is kept.
 *
 * ⚑ AND IT HAS TO BE ACTUALLY FUN. A deliberately bad little game would be the
 * piece sneering at her for playing it, and Vera is never the joke. So: one
 * thumb, tap to hop, one extra flap in the air, a course that speeds up gently,
 * and enough feedback (the legs, the flopping ears, the dust, the grass moving)
 * that a good jump feels good. Tuned by playing it.
 *
 * DIRTY DISCIPLINE — the one honest exception in the era, and its bounds.
 * Every other screen here redraws only on a real state change. A game cannot:
 * while it is RUNNING this screen redraws and re-uploads at up to `TICK` (30/s)
 * and stops the instant the game is closed or the sheep stops. The cost is
 * bounded by the surface — the phone canvas is 140x280 at scale 2, ~0.31 MP a
 * frame against the workstation's 2.4 MP, so this is by far the cheapest screen in
 * the room to animate, and it is the only one that ever needs to be.
 *
 * NO STORAGE, NO NETWORK: the run lives in these fields and dies with them.
 */
import { px, setFont } from '../theme/chrome';
import { ERA3, FLOPPY } from '../theme/era3';
import g from '../../../data/dialog/s3_floppysheep.json';
import { playOnce, stopClip } from '../../audio/tapeAudio';
import lyrics from '../../../data/dialog/s3_floppysheep_lyrics.json';

const FENCES = g.fences as { gap: number; h: number }[];

/** the phone is 140 x 280 logical px (era3Devices' LOGICAL.phone) */
const HEADER_H = 22;
const GROUND_Y = 214;
const GRASS_H = 32;
const FOOT_Y = GROUND_Y + GRASS_H;

const SHEEP_X = 34;
const SHEEP_W = 24;
const SHEEP_H = 17;
const FENCE_W = 9;

/** TUNED BY PLAYING IT, and the first numbers were wrong in a way worth
 *  recording: at 620 the hop apexed at 46 px and lasted 0.77 s, which covers
 *  62 px of course — and clearing a fence takes the gap PLUS the post PLUS the
 *  sheep's own body, ~68 px. So a perfectly timed jump came down ON the fence,
 *  every time, and the game was unwinnable while looking fine. 520 gives 55 px
 *  of apex over 0.92 s (74 px of course at the opening speed), which clears it
 *  with room to be slightly early or slightly late — which is what "fun" is. */
const GRAVITY = 520;
const HOP_V = -240;      // ~55 px of apex, ~0.92 s in the air
const FLAP_V = -180;     // the one extra flap, mid-air
const SPEED_0 = 80;
const SPEED_STEP = 1.2;  // per fence cleared
const SPEED_MAX = 112;
const FLOP_SECONDS = 0.22;
const OVER_ARM_SECONDS = 0.6;   // before a tap will restart — no misfires
/** the redraw quantum while the game is running (see the header) */
const TICK = 1 / 30;

type Rect = { x: number; y: number; w: number; h: number; id: string };

export class FloppySheep {
  /** is the game on screen? (the phone draws its home screen otherwise) */
  open = false;
  /** bumped when the phone must be redrawn — every frame's worth of TICK while
   *  the sheep is moving, and on discrete events otherwise. */
  version = 0;

  private mode: 'idle' | 'run' | 'over' = 'idle';
  private t = 0;
  private lastTick = 0;
  private y = 0;          // height above the ground, px
  private vy = 0;
  private flapped = false;
  private dist = 0;
  private speed = SPEED_0;
  private hops = 0;
  private flopT = 0;
  private dustT = -1;
  private overT = 0;
  private fences: { x: number; h: number; cleared: boolean }[] = [];
  private fenceIdx = 0;
  private rects: Rect[] = [];

  // ── the shell ────────────────────────────────────────────────────────────
  openGame(): void {
    if (this.open) return;
    this.open = true;
    this.reset();
    this.version++;
  }

  closeGame(): void {
    if (!this.open) return;
    this.open = false;
    this.stopSong();
    this.version++;
  }

  private reset(): void {
    this.mode = 'idle';
    this.y = 0; this.vy = 0; this.flapped = false;
    this.dist = 0; this.speed = SPEED_0; this.hops = 0;
    this.flopT = 0; this.dustT = -1; this.overT = 0;
    this.fences = [{ x: 200, h: FENCES[0].h, cleared: false }];
    this.fenceIdx = 1;
  }

  // ── ⚑ S189 — HIS SONG, behind the ♪ (Sérgio, 2026-09-26: the song "playing in the big white space, with
  //   a button, the lyrics passing there"). Off until pressed: the game is silent unless she chooses it.
  //   His timed words (data/dialog/s3_floppysheep_lyrics.json, from his LRC) run karaoke-style across the
  //   sky while it plays; closing the game stops it. The song is the game's, like the hops: nothing filed.
  private song: HTMLAudioElement | null = null;
  private startSong(): void {
    this.song = playOnce('floppysheep_song.mp3');
    this.song?.addEventListener('ended', () => { this.song = null; this.version++; });
  }
  private stopSong(): void { stopClip(this.song); this.song = null; }

  // ── one thumb ────────────────────────────────────────────────────────────
  /** the entire input surface. `true` = the tap was the game's. */
  tap(x: number, y: number): boolean {
    if (!this.open) return false;
    const r = this.rects.find(rr => x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    if (r?.id === 'back') { this.closeGame(); return true; }
    if (r?.id === 'song') { if (this.song) this.stopSong(); else this.startSong(); this.version++; return true; }
    if (this.mode === 'over') {
      if (this.overT >= OVER_ARM_SECONDS) { this.reset(); this.mode = 'run'; this.version++; }
      return true;
    }
    if (this.mode === 'idle') { this.mode = 'run'; }
    if (this.y <= 0) { this.vy = HOP_V; this.flapped = false; playOnce('click_floppysheep.mp3'); }
    else if (!this.flapped) { this.vy = FLAP_V; this.flapped = true; playOnce('click_floppysheep.mp3'); }
    this.version++;
    return true;
  }

  // ── the run ──────────────────────────────────────────────────────────────
  update(dt: number): void {
    if (!this.open) return;
    const step = Math.min(dt, 0.05);   // a stalled frame must not teleport her
    this.t += step;
    if (this.flopT > 0) this.flopT = Math.max(0, this.flopT - step);
    if (this.dustT >= 0) { this.dustT += step; if (this.dustT > 0.3) this.dustT = -1; }

    if (this.mode === 'run') {
      this.dist += this.speed * step;
      // the sheep
      if (this.y > 0 || this.vy < 0) {
        this.vy += GRAVITY * step;
        this.y -= this.vy * step;
        if (this.y <= 0) {
          if (this.vy > 120) { this.flopT = FLOP_SECONDS; this.dustT = 0; }
          this.y = 0; this.vy = 0; this.flapped = false;
        }
      }
      // the course
      for (const f of this.fences) f.x -= this.speed * step;
      const last = this.fences[this.fences.length - 1];
      if (!last || last.x <= 140) {
        const def = FENCES[this.fenceIdx % FENCES.length];
        this.fenceIdx++;
        this.fences.push({ x: (last?.x ?? 140) + def.gap, h: def.h, cleared: false });
      }
      this.fences = this.fences.filter(f => f.x > -FENCE_W - 4);
      // cleared, and the course quickens — gently, and never past SPEED_MAX
      for (const f of this.fences) {
        if (!f.cleared && f.x + FENCE_W < SHEEP_X - SHEEP_W / 2) {
          f.cleared = true; this.hops++;
          this.speed = Math.min(SPEED_MAX, this.speed + SPEED_STEP);
        }
      }
      // and the fences are solid
      // forgiving by 4 px on each side: her fleece is not her hitbox
      const bx0 = SHEEP_X - SHEEP_W / 2 + 4; const bx1 = SHEEP_X + SHEEP_W / 2 - 4;
      const by1 = GROUND_Y - this.y;   // her feet; the fence is solid from the ground up
      for (const f of this.fences) {
        if (f.x > bx1 || f.x + FENCE_W < bx0) continue;
        if (by1 > GROUND_Y - f.h) { this.mode = 'over'; playOnce('fail_floppysheep.mp3'); this.overT = 0; this.version++; break; }
      }
    } else if (this.mode === 'over') {
      this.overT += step;
      if (this.y > 0) { this.vy += GRAVITY * step; this.y = Math.max(0, this.y - this.vy * step); }
    }

    // the redraw clock — 30/s while anything is moving (or the song is singing), and nothing otherwise
    const moving = this.mode === 'run' || (this.mode === 'over' && this.overT < 1.2) || this.mode === 'idle' || !!this.song;
    if (!moving) return;
    const tick = Math.floor(this.t / TICK);
    if (tick !== this.lastTick) { this.lastTick = tick; this.version++; }
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    // sky
    px(ctx, 0, 0, W, GROUND_Y, FLOPPY.sky);
    px(ctx, 0, GROUND_Y - 44, W, 44, FLOPPY.skyLow);
    // the sun, top right, and it never moves
    px(ctx, W - 34, 34, 16, 16, FLOPPY.sun);
    px(ctx, W - 36, 36, 20, 12, FLOPPY.sun);
    px(ctx, W - 32, 32, 12, 20, FLOPPY.sun);
    // clouds, and hills, both on their own parallax
    const cloudD = this.dist * 0.18;
    for (const [cx, cy, cw] of [[20, 46, 26], [92, 70, 20], [56, 100, 32]] as const) {
      const x = ((cx - cloudD) % (W + 60) + W + 60) % (W + 60) - 30;
      px(ctx, x, cy, cw, 6, FLOPPY.cloud);
      px(ctx, x + 5, cy - 4, cw - 12, 6, FLOPPY.cloud);
    }
    // the hills behind the field. Wide and LOW — the first pass made them
    // 30x14 domes and at this size a dome is a bubble, not a hill.
    const hillD = this.dist * 0.35;
    const HILL_H = 9; const HILL_W = 46; const HILL_GAP = 78;
    for (let i = 0; i < 3; i++) {
      const x = ((i * HILL_GAP - hillD) % (W + HILL_GAP) + W + HILL_GAP) % (W + HILL_GAP) - HILL_GAP / 2;
      for (let k = 0; k < HILL_H; k++) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - (k / HILL_H) ** 2)) * HILL_W);
        px(ctx, x - half, GROUND_Y - HILL_H + k, half * 2, 1, k === 0 ? FLOPPY.hillFar : FLOPPY.hill);
      }
    }

    // the field
    px(ctx, 0, GROUND_Y, W, GRASS_H, FLOPPY.hill);
    px(ctx, 0, GROUND_Y, W, 2, FLOPPY.hillFar);
    px(ctx, 0, GROUND_Y + GRASS_H - 6, W, 6, FLOPPY.earth);
    // tufts at full speed — the thing that actually sells the running
    for (let i = 0; i < 10; i++) {
      const x = ((i * 17 - this.dist) % (W + 17) + W + 17) % (W + 17) - 8;
      px(ctx, x, GROUND_Y + 6 + (i % 3) * 7, 3, 2, FLOPPY.hillDk);
    }

    for (const f of this.fences) this.drawFence(ctx, f.x, f.h);
    this.drawSheep(ctx);

    // the header, over the sky: the game's own name, its own count, and a way out
    px(ctx, 0, 0, W, HEADER_H, ERA3.white);
    px(ctx, 0, HEADER_H - 1, W, 1, FLOPPY.hillDk);
    setFont(ctx, 12); ctx.fillStyle = FLOPPY.ink;
    ctx.fillText(g.back, 6, 5);
    this.rects.push({ x: 0, y: 0, w: 22, h: HEADER_H, id: 'back' });
    setFont(ctx, 10); ctx.fillStyle = FLOPPY.ink;
    ctx.fillText(g.title, 22, 6);
    // ⚑ the count is the GAME's, inside the game's own frame, and nothing
    // carries it out — no best, no streak, nothing filed, nothing referred to.
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    const hop = `${this.hops} ${g.hopsLabel}`;
    ctx.fillText(hop, W - 6 - ctx.measureText(hop).width, 7);

    // the footer: the hint while she is learning it, and the publisher always
    px(ctx, 0, FOOT_Y, W, H - FOOT_Y, ERA3.white);
    setFont(ctx, 9); ctx.fillStyle = FLOPPY.ink;
    const hint = this.mode === 'idle' ? g.tapHint : this.y > 0 && !this.flapped ? g.tapHintAir : g.tagline;
    ctx.fillText(hint, Math.round((W - ctx.measureText(hint).width) / 2), FOOT_Y + 6);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText(g.publisher, Math.round((W - ctx.measureText(g.publisher).width) / 2), FOOT_Y + 19);

    // the ♪ — a pixel note in the footer's white space, pressed in while the song plays
    const NX = W - 20, NY = FOOT_Y + 10;
    px(ctx, NX, NY, 14, 14, this.song ? FLOPPY.hillFar : ERA3.white);
    px(ctx, NX, NY, 14, 1, FLOPPY.hillDk); px(ctx, NX, NY + 13, 14, 1, FLOPPY.hillDk);
    px(ctx, NX, NY, 1, 14, FLOPPY.hillDk); px(ctx, NX + 13, NY, 1, 14, FLOPPY.hillDk);
    px(ctx, NX + 8, NY + 3, 1, 7, FLOPPY.ink); px(ctx, NX + 9, NY + 3, 2, 1, FLOPPY.ink); px(ctx, NX + 10, NY + 4, 1, 1, FLOPPY.ink);
    px(ctx, NX + 5, NY + 9, 4, 3, FLOPPY.ink);
    this.rects.push({ x: NX - 4, y: FOOT_Y, w: 22, h: H - FOOT_Y, id: 'song' });
    // his words, across the sky, while it plays: the line being sung, each word lit as it comes
    if (this.song) {
      const now = this.song.currentTime;
      const L = (lyrics as unknown as { lines: Array<{ t: number; words: Array<[number, string]> }> }).lines;
      let li = -1;
      for (let i = 0; i < L.length; i++) if (L[i].t <= now) li = i;
      if (li >= 0 && now - (L[li].words[L[li].words.length - 1][0]) < 3) {
        setFont(ctx, 10);
        const words = L[li].words;
        const rows: Array<Array<[number, string]>> = [[]];
        let width = 0;
        for (const w of words) {
          const ww = ctx.measureText(w[1] + ' ').width;
          if (width + ww > W - 16 && rows[rows.length - 1].length) { rows.push([]); width = 0; }
          rows[rows.length - 1].push(w); width += ww;
        }
        rows.forEach((row, ri) => {
          const text = row.map((w) => w[1]).join(' ');
          let x = Math.round((W - ctx.measureText(text).width) / 2);
          const y = 128 + ri * 14;
          for (const [t, w] of row) {
            ctx.fillStyle = t <= now ? FLOPPY.ink : ERA3.grey;
            ctx.fillText(w, x, y);
            x += ctx.measureText(w + ' ').width;
          }
        });
      }
    }
    if (this.mode === 'over') this.drawOver(ctx, W);
    // the whole screen is the button — one thumb, anywhere (the ♪ and the back arrow are asked first)
    this.rects.push({ x: 0, y: HEADER_H, w: W, h: H - HEADER_H, id: 'tap' });
  }

  private drawFence(ctx: CanvasRenderingContext2D, x: number, h: number): void {
    const top = GROUND_Y - h;
    px(ctx, x, top, FENCE_W, h, FLOPPY.fence);
    px(ctx, x + FENCE_W - 3, top, 3, h, FLOPPY.fenceDk);
    px(ctx, x - 3, top + 3, FENCE_W + 6, 3, FLOPPY.fence);       // the rails
    px(ctx, x - 3, top + Math.round(h / 2), FENCE_W + 6, 3, FLOPPY.fence);
    px(ctx, x - 3, top + 3, FENCE_W + 6, 1, FLOPPY.fenceDk);
    px(ctx, x, top, FENCE_W, 1, FLOPPY.hillFar);                  // sun on the post
  }

  /** a white mass with four legs and one ear that flops. Everything about her
   *  is round, because a rectangle at this size is a crate. */
  private drawSheep(ctx: CanvasRenderingContext2D): void {
    const air = this.y > 0;
    const bottom = GROUND_Y - this.y;
    const squash = this.flopT > 0 ? 2 : 0;                       // she lands soft
    const bodyH = SHEEP_H - 4 + squash;
    const bodyY = bottom - bodyH - (air ? 0 : 4) + squash;
    const cx = SHEEP_X;

    // legs — cycling on the ground, tucked in the air
    const phase = Math.floor(this.dist / 7) % 4;
    const legs: number[] = air ? [2, -1, 1, -2] : [
      [0, 3, 1, 4][phase], [3, 0, 4, 1][phase], [4, 1, 3, 0][phase], [1, 4, 0, 3][phase]
    ];
    legs.forEach((k, i) => {
      const lx = cx - 9 + i * 6;
      px(ctx, lx, bodyY + bodyH - 1, 2, 6 - k * 0.6, FLOPPY.leg);
    });

    // the fleece: a rounded mass with three bumps along the top
    for (let i = 0; i < bodyH; i++) {
      const k = (i + 0.5) / bodyH * 2 - 1;
      const half = Math.max(2, Math.round(SHEEP_W / 2 * Math.sqrt(Math.max(0, 1 - k * k * 0.55))));
      px(ctx, cx - half, bodyY + i, half * 2, 1, i > bodyH - 4 ? FLOPPY.woolShade : FLOPPY.wool);
    }
    for (const bx of [-7, -1, 5]) px(ctx, cx + bx, bodyY - 2, 6, 4, FLOPPY.wool);

    // the head, forward and slightly down when she is falling
    const hx = cx + 9; const hy = bodyY + (this.vy > 60 ? 2 : 0);
    px(ctx, hx, hy, 8, 8, FLOPPY.face);
    px(ctx, hx + 1, hy - 3, 6, 4, FLOPPY.wool);                  // the tuft
    px(ctx, hx + 6, hy + 2, 1, 1, ERA3.white);                   // the eye
    // ⚑ THE FLOP. Ears out when she is up, down when she has just landed.
    const earDown = this.flopT > 0;
    px(ctx, hx - 2, hy + (earDown ? 4 : 1), 4, earDown ? 4 : 2, FLOPPY.face);
    px(ctx, hx + 7, hy + (earDown ? 5 : 2), 3, earDown ? 3 : 2, FLOPPY.face);

    if (this.dustT >= 0) {                                       // she kicks up a little
      const d = Math.round(this.dustT * 30);
      px(ctx, cx - 12 - d, GROUND_Y - 2 - d, 3, 2, FLOPPY.hillFar);
      px(ctx, cx + 9 + d, GROUND_Y - 1 - d, 2, 2, FLOPPY.hillFar);
    }
  }

  /** cheerful, brief, and it takes nothing away from her */
  private drawOver(ctx: CanvasRenderingContext2D, W: number): void {
    const y = 92; const h = 62;
    px(ctx, 12, y, W - 24, h, ERA3.white);
    px(ctx, 12, y, W - 24, 2, FLOPPY.hillFar);
    px(ctx, 12, y + h - 2, W - 24, 2, FLOPPY.hillDk);
    setFont(ctx, 14); ctx.fillStyle = FLOPPY.ink;
    ctx.fillText(g.overTitle, Math.round((W - ctx.measureText(g.overTitle).width) / 2), y + 10);
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    const n = g.overHops.replace('{n}', String(this.hops));
    ctx.fillText(n, Math.round((W - ctx.measureText(n).width) / 2), y + 28);
    setFont(ctx, 9); ctx.fillStyle = FLOPPY.ink;
    ctx.fillText(g.overSub, Math.round((W - ctx.measureText(g.overSub).width) / 2), y + 44);
  }

  /**
   * ?debug=1 — the three states a reviewer wants to land on, and nothing here
   * exists in play: the ordinary way in is the icon on the phone's home screen.
   */
  debugBeat(beat: string): void {
    switch (beat) {
      case 'floppy': this.openGame(); break;
      case 'floppyPlay':
        this.openGame(); this.mode = 'run'; this.vy = HOP_V; this.version++; break;
      case 'floppyOver':
        this.openGame(); this.mode = 'over'; this.hops = 7; this.overT = OVER_ARM_SECONDS;
        this.version++; break;
    }
  }
}

/**
 * The icon on the phone's home screen, drawn here so the lamb lives with the
 * rest of its own art. It is the ONLY app on her phone — which is a joke on the
 * publisher and never on her.
 */
export function drawFloppyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  px(ctx, x, y, s, s, FLOPPY.sky);
  px(ctx, x, y, s, Math.round(s * 0.18), FLOPPY.skyLow);
  px(ctx, x, y + s - Math.round(s * 0.3), s, Math.round(s * 0.3), FLOPPY.hill);
  const cx = x + s / 2; const by = y + s - Math.round(s * 0.34);
  const bw = Math.round(s * 0.5); const bh = Math.round(s * 0.3);
  for (let i = 0; i < bh; i++) {
    const k = (i + 0.5) / bh * 2 - 1;
    const half = Math.max(1, Math.round(bw / 2 * Math.sqrt(Math.max(0, 1 - k * k * 0.55))));
    px(ctx, cx - half, by - bh + i, half * 2, 1, FLOPPY.wool);
  }
  px(ctx, cx + Math.round(bw * 0.28), by - bh, Math.round(s * 0.16), Math.round(s * 0.16), FLOPPY.face);
  px(ctx, cx - Math.round(bw * 0.34), by, 2, Math.round(s * 0.1), FLOPPY.leg);
  px(ctx, cx + Math.round(bw * 0.18), by, 2, Math.round(s * 0.1), FLOPPY.leg);
}

export const FLOPPY_LABEL = g.iconLabel;
