/**
 * ⚑ THE PROGRAM'S OWN BOOT — LAMBY'S CARTOON OVER THE JINGLE (S166, 2026-09-21).
 *
 * Sérgio, on the S162 build: *"the Boot Jingle maybe only makes sense not as a
 * boot-in, but as when Lamby appears — a song from the program, with a cute
 * animation of Lamby sleeping and having impure thoughts, and being woken up by
 * a light that shows him what is right, and it is a computer with 'purity
 * streak'. The song can continue while on the menu, but it needs not to be the
 * boot-in of the computer and OS, but of the software."*
 *
 * So the machine boots in silence now (POST, the drive, the crawl — that is the
 * machine's), and when the crawl's last line has said that Restorify is part of
 * this computer, THE SOFTWARE boots: this cartoon, with his jingle
 * (`chase_the_clouds.mp3`, 30.77 s), hung on the track's measured phrase onsets
 * (0.12 · 3.34 · 5.20 · 9.64 · 20.71 · 23.66 — the same numbers bootSplash.ts
 * hung the old CD-ROM splash on). Lamby's introduction takes over on the last
 * phrase and the song plays out under it and into the program.
 *
 * ⚑ WHAT THE "IMPURE THOUGHTS" ARE: a dark scribble in a thought-cloud. Never a
 * picture of anything. This is the programme's OWN cartoon of itself — its
 * satire (CLAUDE.md: satire only inside perpetrator self-presentation) — and the
 * gag is that the software's idea of a thought is static, and its idea of a cure
 * is a monitor. It collapses on its own terms: the light that "shows him what is
 * right" is a screen with a number on it.
 * Register: operable (the software's surface; it may charm). Diegetic; the
 * frame never plays. Nothing real is quoted; every pixel is from the ERA1
 * palette; rotations are 90° steps (Lamby lies on his side, and stands).
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import { px, setFont, bevel } from '../theme/chrome';
import { drawLambyChar } from './lambyChar';
import lambyStrings from '../../../data/dialog/s2_lamby.json';

const W = ERA1_CANVAS.width;   // 512
const H = ERA1_CANVAS.height;  // 384

/** the timeline, on the jingle's phrase onsets */
export const E2_CARTOON = {
  /** the dark: Lamby asleep, breathing; zzz rising */
  asleep: 0.12,
  /** the thought-cloud puffs in over him */
  cloud: 3.34,
  /** …and fills with the scribble */
  scribble: 5.20,
  /** the monitor on the right SWITCHES ON — the light */
  light: 9.64,
  /** the beam reaches the cloud; it thins and goes */
  cloudGone: 12.6,
  /** he wakes: stands (90° → upright), the appear pop */
  wake: 14.2,
  /** the screen writes what is right: the mark, the streak */
  screen: 16.4,
  /** he points at it, cheerful */
  point: 20.71,
  /** the handoff to his introduction; the song plays on under it */
  handoff: 23.66
} as const;

const S = (lambyStrings as unknown as { cartoon: { mark: string; streakLabel: string; streakDays: string } }).cartoon;

function ramp(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const k = (t - a) / (b - a);
  return k * k * (3 - 2 * k);
}

/** the surface re-uploads only when something moved (the S105 discipline):
 *  fast while a stroke is drawing or he is moving, slow while he sleeps */
export function e2CartoonVersion(t: number): number {
  const busy = (t >= E2_CARTOON.light && t < E2_CARTOON.light + 2.0)
    || (t >= E2_CARTOON.wake && t < E2_CARTOON.wake + 1.6)
    || (t >= E2_CARTOON.screen && t < E2_CARTOON.screen + 3.0);
  return Math.floor(t * (busy ? 15 : 5));
}

const FLOOR_Y = 300;
const LAMBY = { x: 150, y: 250 };           // where he stands once he is up
const MON = { x: 352, y: 176, w: 132, h: 104 }; // the monitor's case
const GLASS = { x: MON.x + 12, y: MON.y + 12, w: MON.w - 24, h: MON.h - 34 };

export function drawLambyCartoon(ctx: CanvasRenderingContext2D, t: number): void {
  const lit = ramp(t, E2_CARTOON.light, E2_CARTOON.light + 1.4);
  // the room: dark until the monitor lights it, then the beige of every 2003 surface
  px(ctx, 0, 0, W, H, ERA1.black);
  if (lit > 0) {
    ctx.save();
    ctx.globalAlpha = lit * 0.9;
    px(ctx, 0, 0, W, FLOOR_Y, ERA1.navy);
    px(ctx, 0, FLOOR_Y, W, H - FLOOR_Y, ERA1.greyDark);
    ctx.restore();
  }

  // ── the monitor (its case is there in the dark, barely) ──
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.75 * lit;
  bevel(ctx, MON.x, MON.y, MON.w, MON.h, true);
  px(ctx, MON.x + 40, MON.y + MON.h, MON.w - 80, 10, ERA1.grey);      // the neck
  px(ctx, MON.x + 24, MON.y + MON.h + 10, MON.w - 48, 6, ERA1.greyDark); // the foot
  ctx.restore();
  // the glass: dark, then the light
  px(ctx, GLASS.x, GLASS.y, GLASS.w, GLASS.h, lit > 0 ? ERA1.teal : ERA1.black);
  if (lit > 0) {
    // ⚑ the beam: the light that "shows him what is right", a cone from the
    //   glass toward where he lies — hard-edged bands, no gradient (period-true)
    ctx.save();
    ctx.globalAlpha = 0.28 * lit;
    ctx.fillStyle = ERA1.tooltip;
    ctx.beginPath();
    ctx.moveTo(GLASS.x, GLASS.y + 8);
    ctx.lineTo(LAMBY.x - 80, 120);
    ctx.lineTo(LAMBY.x - 80, FLOOR_Y);
    ctx.lineTo(GLASS.x, GLASS.y + GLASS.h - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── the thought-cloud, and what the programme thinks a thought is ──
  const cloudIn = ramp(t, E2_CARTOON.cloud, E2_CARTOON.cloud + 1.2);
  const cloudOut = 1 - ramp(t, E2_CARTOON.cloudGone, E2_CARTOON.cloudGone + 1.2);
  const cloudK = cloudIn * cloudOut;
  if (cloudK > 0 && t < E2_CARTOON.wake) {
    ctx.save();
    ctx.globalAlpha = cloudK;
    const cx = LAMBY.x + 36, cy = 150;
    // three puffs up from his head, then the cloud
    for (let i = 0; i < 3; i++) {
      const r = 3 + i * 2;
      px(ctx, cx - 40 + i * 12 - r, cy + 70 - i * 18 - r, r * 2, r * 2, ERA1.silver);
    }
    const cw = 120, ch = 64;
    px(ctx, cx - cw / 2, cy - ch / 2, cw, ch, ERA1.silver);
    px(ctx, cx - cw / 2 + 8, cy - ch / 2 - 8, cw - 16, 8, ERA1.silver);
    px(ctx, cx - cw / 2 + 8, cy + ch / 2, cw - 16, 8, ERA1.silver);
    // the scribble: static, thickening with the phrase — never a picture of anything
    const sk = ramp(t, E2_CARTOON.scribble, E2_CARTOON.scribble + 3.0);
    const n = Math.round(14 + sk * 40);
    let seed = 7 + Math.floor(t * 6);
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const sx = cx - cw / 2 + 10 + (seed % (cw - 20));
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const sy = cy - ch / 2 + 8 + (seed % (ch - 16));
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const len = 4 + (seed % 14);
      px(ctx, sx, sy, len, 2, i % 3 === 0 ? ERA1.black : ERA1.greyDark);
    }
    ctx.restore();
  }

  // ── Lamby: asleep on his side, then up ──
  const up = ramp(t, E2_CARTOON.wake, E2_CARTOON.wake + 0.5);
  const awake = t >= E2_CARTOON.wake;
  ctx.save();
  if (up < 1) {
    // lying on his side: the puppet rotated a quarter turn, on a pillow. The turn
    // back is a 90° step, not a tween — he is on his side, then he is up.
    px(ctx, LAMBY.x - 70, FLOOR_Y - 26, 90, 22, ERA1.beige);   // the pillow
    px(ctx, LAMBY.x - 66, FLOOR_Y - 30, 82, 6, ERA1.paper);
    ctx.translate(LAMBY.x - 20, FLOOR_Y - 40);
    ctx.rotate(-Math.PI / 2);
    // a slow breath: the sleeping puppet scales a hair with the phrase's pulse
    const breath = 1 + 0.015 * Math.sin(t * 1.6);
    ctx.scale(breath, breath);
    // ⚑ asleep = the puppet's own blink frame, held (lambyChar.ts: phase 2.72–2.88
    //   of its 3.2 s cycle closes the eyes) — no second face is drawn for him
    drawLambyChar(ctx, 0, 0, { mood: 'clinical', action: 'idle', t: 2.8, moodStart: 0, scale: 0.9 });
    ctx.restore();
    // zzz, rising and fading on the phrase
    if (t >= E2_CARTOON.asleep && t < E2_CARTOON.cloud + 1.0) {
      setFont(ctx, 12);
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.5 + i * 0.33) % 1);
        ctx.save();
        ctx.globalAlpha = 1 - ph;
        ctx.fillStyle = ERA1.silver;
        ctx.fillText('z', LAMBY.x - 30 + i * 10, FLOOR_Y - 90 - ph * 40);
        ctx.restore();
      }
    }
  } else {
    ctx.restore();
    const tAwake = t - E2_CARTOON.wake;
    const point = t >= E2_CARTOON.point;
    drawLambyChar(ctx, LAMBY.x, LAMBY.y, {
      mood: 'cheerful', action: point ? 'point' : (tAwake < 1.6 ? 'appear' : 'idle'),
      t: tAwake, moodStart: 0, scale: 1
    });
  }
  void awake;

  // ── the screen writes what is right ──
  if (t >= E2_CARTOON.screen) {
    const k = t - E2_CARTOON.screen;
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.white;
    const mark = S.mark.slice(0, Math.min(S.mark.length, Math.floor(k / 0.12) + 1));
    ctx.fillText(mark, GLASS.x + 8, GLASS.y + 8);
    if (k > 1.4) {
      px(ctx, GLASS.x + 8, GLASS.y + 24, GLASS.w - 16, 1, ERA1.tealDark);
      setFont(ctx, 9);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(S.streakLabel, GLASS.x + 8, GLASS.y + 30);
      if (k > 2.2) {
        setFont(ctx, 14);
        ctx.fillStyle = ERA1.white;
        ctx.fillText(S.streakDays, GLASS.x + 8, GLASS.y + 44);
      }
    }
  }
}
