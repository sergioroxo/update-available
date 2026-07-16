/**
 * THE THREE-SCREEN ROOM — foundation only (Session 37, E3-i).
 * docs/REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md's R29-b DEEP REVISION:
 * "between 2003 and 2016 the machine stopped being a place you sit. It
 * became every screen you own." Room 2 (Vera, 2016) gets three device
 * screens — the laptop (desk), the tablet (bed), the phone (nightstand) —
 * each its own offscreen canvas textured onto its own plane, the SAME
 * technique src/engine/screenTexture.ts already gives the desktop monitor
 * and the witness wall (never duplicated, only reused at smaller sizes for
 * the tablet/phone per the spec's production note).
 *
 * SCOPE THIS SESSION (explicitly NOT the full arc — see the spec's build
 * lanes E3-i..vi): the laptop shows the SisterSignal login/desktop SHELL
 * (era3.ts theme) — GraceQueue itself (the shipped moderation app, ported
 * from the ORIGINAL non-reinterp repo's src/desktop/apps/graceQueue.ts) is
 * NOT wired in yet, that is E3-iii+, gated on the trans-masc reader. The
 * tablet is a static True Daughters feed shell (4 placeholder cards, no
 * scroll). The phone is a lock/notification shell (no DM thread — Noa's ask
 * per S3R.4 arrives with E3-v). All content is STATIC: drawn once per screen
 * at construction, uploaded once when era-gating first makes it visible,
 * never redrawn after — Quest budget discipline (two extra render textures,
 * dirty-flagged, never re-dirtied by a ticking clock or animation this
 * session; production notes explicitly ask for dirty-only uploads).
 *
 * Lambient's marks (the E2 dispersal payoff, master plan §5b "the watcher"
 * thread): a tiny badge on all three screens, drawn from the SAME fixed
 * FRAG offset grammar Session 33 used for the uninstall-report scatter
 * (src/desktop/apps/update.ts) — here rendered SETTLED (no animation; the
 * fragments have already migrated and arrived, per u3's own line).
 */
import * as pc from 'playcanvas';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import { setFont } from '../desktop/theme/chrome';
import * as aero from '../desktop/theme/era3';
import { ERA3 } from '../desktop/theme/era3';
import { ledger } from '../state/ledger';
import type { EraKey } from './cluster';
import d from '../../data/strings/era3_devices.json';

const LOGICAL = {
  laptop: { w: 512, h: 384, scale: 3 },
  tablet: { w: 220, h: 300, scale: 2 },
  phone: { w: 140, h: 260, scale: 2 }
} as const;

/** Room 2 (Vera, west) world placements — Session 37 FABLE/SÉRGIO CHECK:
 *  computed from tools/gen_rooms.mjs's local bedroom template (ox=-3.88,
 *  oz=0.7, whole-room yaw F=90; world = (ox + localZ, localY, oz - localX))
 *  then eyeballed/screenshot-verified in the browser this session — spatial
 *  FEEL, not a measured fact; a later session may retune any of these.
 *
 *  laptop: sits in the existing desk CRT's screen gap (the room's generic
 *  "computer" assembly from the template IS repurposed as 2016's laptop —
 *  no new geometry; a real hinged laptop body is a later polish pass, not a
 *  foundation blocker), so its plane must face the SAME direction the
 *  chair already looks (world +X, per seatPose(90)'s chair sitting at less-
 *  negative x than the desk) — vertical, like the desktop monitor.
 *  tablet: lies flat on the bed (screen up) — no rotation needed, the
 *  default 'plane' primitive already faces +Y.
 *  phone: lies flat on the nightstand (screen up) — same, no rotation. */
const PLACEMENT = {
  laptop: {
    // Sérgio's live readability note (Session 37): the shipped-shell CRT
    // screen read too small — swapped for a period-correct 2016 FLAT PANEL
    // (tools/gen_rooms.mjs's `flatPanel`, Room 2 only) and pulled ~0.19m
    // closer to the chair. This plane sits proud of `w_flatPanelScreen`'s
    // real-world face (measured the same way the CRT's was: box center
    // world x ≈ -5.005, thin axis half-extent 0.01 → box max x ≈ -4.995).
    pos: { x: -4.97, y: 1.1, z: 0.7 },
    size: { w: 0.52, h: 0.3 },
    euler: { x: 90, y: 90, z: 0 } // verified in-browser (Session 37): normal (+1,0,0), faces the chair
  },
  tablet: {
    pos: { x: -3.58, y: 0.565, z: -0.3 },
    size: { w: 0.16, h: 0.22 },
    euler: { x: 0, y: 0, z: 0 } // flat, screen-up
  },
  phone: {
    // y verified in-browser (Session 37): the nightstand's REAL model AABB
    // tops out ~0.73m (not the box-fallback ~0.5m) — this sits just above it.
    pos: { x: -3.03, y: 0.75, z: -0.3 },
    size: { w: 0.07, h: 0.14 },
    euler: { x: 0, y: 0, z: 0 } // flat, screen-up
  }
} as const;

/** the intra-room camera SEATS the movement nodes cut to — see nodes.json's
 *  r2-tablet/r2-phone `pose`. Exported so app.ts and nodes.json's authored
 *  values can be cross-checked against the same source during review; the
 *  authoritative copy the engine actually uses is nodes.json (data-driven,
 *  per CLAUDE.md — geometry/layout may live in .ts, but a seat POSE is the
 *  kind of "layout" nodes.json already owns for the base three room seats,
 *  so the device seats follow the same home). FABLE/SÉRGIO CHECK throughout. */
export const DEVICE_SEAT_POSES = {
  // Sérgio's live readability note (Session 37): "bias closer" — both pulled
  // in from the original 1.3m viewing distance to ~0.6-0.65m (still clear of
  // the bed/nightstand's REAL measured AABB, not the box-fallback size — see
  // the session log's geometry note), pitch recomputed for the new distance.
  'r2-tablet': { x: -3.58, y: 1.05, z: 0.35, pitch: -37, yaw: 0 },
  'r2-phone': { x: -3.03, y: 1.0, z: 0.3, pitch: -23, yaw: 0 }
} as const;

function makeCanvas(logicalW: number, logicalH: number, scale: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('era3Devices: 2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/** Lambient's mark, settled (no animation) — the same seven fixed offsets
 *  Session 33's uninstall-report scatter used, drawn small and static: the
 *  fragments have already arrived, per u3's own "migrating." line. `scale`
 *  keeps the footprint tiny (~8x8px) regardless of which screen it sits on. */
function drawLambMark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  const FRAG: [number, number][] = [
    [10, -6], [16, 3], [7, 9], [-8, 7], [-13, -4], [4, -12], [-3, 13]
  ];
  aero.px(ctx, x, y, Math.max(1, Math.round(2 * scale)), Math.max(1, Math.round(2 * scale)), ERA3.grey);
  for (const [fx, fy] of FRAG) {
    aero.px(
      ctx,
      x + Math.round(fx * 0.32 * scale),
      y + Math.round(fy * 0.32 * scale),
      Math.max(1, Math.round(1.6 * scale)),
      Math.max(1, Math.round(1.6 * scale)),
      ERA3.greyDk
    );
  }
}

function drawLaptopShell(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  aero.wallpaper(ctx, W, H);
  aero.taskbar(ctx, W, H, d.phone.lockClock);
  // Sérgio's live readability note (Session 37): a 2016 app runs MAXIMIZED —
  // the window now fills the canvas margin-to-margin (was a small centered
  // box floating in a sea of wallpaper) and every line is set noticeably
  // bigger, matching the bigger physical screen this now renders onto.
  const MARGIN = 14; const TASKBAR_H = 28;
  const winW = W - MARGIN * 2; const winH = H - TASKBAR_H - MARGIN - 8;
  const c = aero.windowFrame(ctx, MARGIN, 8, winW, winH, d.laptop.os);
  aero.px(ctx, c.x, c.y, c.w, c.h, ERA3.glass);
  setFont(ctx, 26);
  ctx.fillStyle = ERA3.titleText;
  ctx.fillText(d.laptop.loginGreeting, c.x + 24, c.y + 40);
  setFont(ctx, 15);
  ctx.fillStyle = ERA3.grey;
  ctx.fillText(d.laptop.loginSub, c.x + 24, c.y + 78);
  aero.button(ctx, c.x + 24, c.y + c.h - 70, 220, 42, d.laptop.signIn, { primary: true, tone: 'good', size: 16 });
  // corner badge — Lambient's mark, top-right of the window
  drawLambMark(ctx, c.x + c.w - 20, c.y + 10, 1.6);
}

function drawTabletShell(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  aero.px(ctx, 0, 0, W, H, ERA3.glass);
  aero.px(ctx, 0, 0, W, 26, ERA3.accent);
  setFont(ctx, 12);
  ctx.fillStyle = ERA3.white;
  ctx.fillText(d.tablet.appName, 8, 7);
  setFont(ctx, 10);
  ctx.fillStyle = ERA3.greyDk;
  ctx.fillText(d.tablet.feedHeading, 8, 32);
  let y = 48;
  const cardH = 58;
  (d.tablet.posts as Array<{ author: string; text: string; time: string }>).forEach((post, i) => {
    aero.px(ctx, 6, y, W - 12, cardH - 6, ERA3.memberBand);
    aero.px(ctx, 6, y, 3, cardH - 6, ERA3.memberSpine);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.ink;
    ctx.fillText(post.author, 14, y + 6);
    ctx.fillStyle = ERA3.grey;
    ctx.fillText(post.time, W - 14 - ctx.measureText(post.time).width, y + 6);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.greyDk;
    const words = post.text.split(' ');
    let line = ''; let ly = y + 20;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W - 24 && line) { ctx.fillText(line, 14, ly); line = w; ly += 11; }
      else line = test;
    }
    if (line) ctx.fillText(line, 14, ly);
    // ONE post carries Lambient's verified-badge (the dispersal, on the
    // community's own feed) — the first card, so it's always on-screen
    if (i === 0) {
      setFont(ctx, 8);
      ctx.fillStyle = ERA3.lambTag;
      ctx.fillText(d.tablet.verifiedBadge, 14, y + cardH - 16);
      drawLambMark(ctx, 14 + ctx.measureText(d.tablet.verifiedBadge).width + 6, y + cardH - 20, 0.7);
    }
    y += cardH;
  });
}

function drawPhoneShell(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  aero.px(ctx, 0, 0, W, H, '#0a0f18');
  setFont(ctx, 20);
  ctx.fillStyle = ERA3.white;
  const clockW = ctx.measureText(d.phone.lockClock).width;
  ctx.fillText(d.phone.lockClock, Math.round((W - clockW) / 2), 30);
  setFont(ctx, 9);
  ctx.fillStyle = '#8aa0b8';
  const dateW = ctx.measureText(d.phone.lockDate).width;
  ctx.fillText(d.phone.lockDate, Math.round((W - dateW) / 2), 56);
  // one notification row, low on the lock screen
  const ny = H - 74; const nw = W - 16;
  aero.px(ctx, 8, ny, nw, 58, '#1f2a3a');
  // app glyph (a small square) with Lambient's mark standing in as its icon badge
  aero.px(ctx, 16, ny + 8, 22, 22, ERA3.accent);
  drawLambMark(ctx, 30, ny + 14, 0.55);
  setFont(ctx, 9);
  ctx.fillStyle = ERA3.white;
  ctx.fillText(d.phone.notificationApp, 46, ny + 8);
  ctx.fillStyle = '#9fb4cc';
  ctx.fillText(d.phone.notificationTime, W - 8 - 24, ny + 8);
  setFont(ctx, 9);
  ctx.fillStyle = '#cfe0f2';
  wrapPlain(ctx, d.phone.notificationPreview, nw - 40).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 46, ny + 22 + i * 11));
}

function wrapPlain(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export interface Era3Devices {
  /** call once a frame — uploads any still-dirty screen texture (each
   *  screen only redraws/uploads ONCE, the first frame it becomes visible;
   *  static placeholder content never re-dirties itself, per budget law). */
  tick(dt: number): void;
  /** era-gate the three screens (and fire the once-only arrival witness
   *  line the first time era reaches e3+). Call from driveMorph() and the
   *  ?era= review-jump path alongside the room's own era toggles. */
  setEra(era: EraKey): void;
  /** ?debug=1 review aid only (like __os/__tapes) — the raw offscreen
   *  canvases, for pixel-probing the shell content/lamb-marks without
   *  screenshot-chasing the 3D projection. */
  debugCanvases(): Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement>;
}

export function buildEra3Devices(app: pc.Application): Era3Devices {
  const screens: { name: keyof typeof PLACEMENT; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: pc.Texture; entity: pc.Entity; dirty: boolean }[] = [];

  function add(name: keyof typeof PLACEMENT, logical: { w: number; h: number; scale: number }, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
    const { canvas, ctx } = makeCanvas(logical.w, logical.h, logical.scale);
    draw(ctx, logical.w, logical.h);
    const tex = makeScreenTexture(app, canvas);
    const place = PLACEMENT[name];
    const entity = makeScreenEntity(`era3-device-${name}`, tex, place.size.w, place.size.h);
    entity.setLocalPosition(place.pos.x, place.pos.y, place.pos.z);
    entity.setLocalEulerAngles(place.euler.x, place.euler.y, place.euler.z);
    entity.enabled = false; // setEra() decides visibility
    app.root.addChild(entity);
    screens.push({ name, canvas, ctx, tex, entity, dirty: true });
  }

  add('laptop', LOGICAL.laptop, drawLaptopShell);
  add('tablet', LOGICAL.tablet, drawTabletShell);
  add('phone', LOGICAL.phone, drawPhoneShell);

  let arrived = false;

  return {
    tick(): void {
      for (const s of screens) {
        if (s.dirty) { s.tex.upload(); s.dirty = false; }
      }
    },
    setEra(era: EraKey): void {
      const visible = era === 'e3' || era === 'e4';
      for (const s of screens) s.entity.enabled = visible;
      if (visible && !arrived) {
        arrived = true;
        if (ledger.era3Arrival.length === 0) {
          ledger.era3Arrival.push({ witness: d.witnessArrival });
        }
      }
    },
    debugCanvases(): Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement> {
      const out = {} as Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement>;
      for (const s of screens) out[s.name] = s.canvas;
      return out;
    }
  };
}
