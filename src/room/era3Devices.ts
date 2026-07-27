/**
 * THE THREE-SCREEN ROOM (Session 37, E3-i foundation; Session 38, E3-ii wires
 * the laptop + tablet). docs/REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md's
 * R29-b DEEP REVISION: "between 2003 and 2016 the machine stopped being a
 * place you sit. It became every screen you own." Room 2 (Vera, 2016) gets
 * three device screens — the laptop (desk), the tablet (bed), the phone
 * (nightstand) — each its own offscreen canvas textured onto its own plane,
 * the SAME technique src/engine/screenTexture.ts already gives the desktop
 * monitor and the witness wall (never duplicated, only reused at smaller
 * sizes for the tablet/phone per the spec's production note).
 *
 * SESSION 38 (E3-ii, the GraceQueue pattern strip + card set): the laptop now
 * runs src/room/graceQueueLite.ts behind its "Sign in" — the reinterp-built
 * moderation loop (ONE card at a time, big type, no crowding, per Session
 * 37's own maximized-UI lesson), NOT a straight port of the shipped
 * (non-reinterp) build's dense graceQueue.ts, though it borrows that file's
 * documented lane grammar (member/system/Lambient bands) verbatim per the
 * brief. The tablet is now DATA-DRIVEN from the same data/dialog/s3_queue.json
 * the laptop reads: approved cards appear with hearts + lamb-badges; cards
 * sent to review are simply ABSENT; Mira's card, if let stand, pins to the
 * top with a one-line comments teaser. The phone is UNCHANGED (still Session
 * 37's static lock/notification shell — Noa's ask per S3R.4 arrives E3-v).
 *
 * DIRTY DISCIPLINE (Quest budget law): the laptop/tablet no longer draw only
 * once — they redraw+re-upload exactly when `graceQueueLite.version` changes
 * (a real state change: sign-in, approve, move-to-review, let-it-stand),
 * never on a ticking clock or per-frame. The phone still draws once and never
 * again, per Session 37's original law (nothing about it changes this
 * session).
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
import { ERA3, drawLambMark } from '../desktop/theme/era3';
import { ledger } from '../state/ledger';
import type { EraKey } from './cluster';
import { GraceQueueLite } from './graceQueueLite';
import d from '../../data/strings/era3_devices.json';
import q from '../../data/dialog/s3_queue.json';

/** Session 39 (E3 screen-format pass): each canvas's logical resolution is
 *  now chosen to MATCH its panel plane's world aspect exactly (a fixed
 *  logical-px-per-metre density on both axes — no non-uniform stretch is
 *  possible when w/h here equals PLACEMENT[name].size.w/h exactly).
 *
 *  laptop: PLACEMENT.laptop.size = 0.52 × 0.30m → 26:15 (~1.733:1, the 2016
 *  flat panel's real widescreen shape). Session 37 left this at the OLD
 *  CRT-era 512×384 (4:3) — a canvas built for a squarer screen, enlarged
 *  onto the new wide plane, so every pixel was stretched ~30% wider than
 *  tall. Fixed at 676×390 = 26k×15k for k=26: 676/0.52 = 390/0.30 = 1300
 *  logical px/m on both axes — square pixels, natively widescreen, no
 *  re-derivation needed elsewhere (hitPlane() already takes logical w/h as
 *  params, so click routing scales automatically — see hitPlane below).
 *  tablet: PLACEMENT.tablet.size = 0.16 × 0.22m → 8:11 (0.7273). Was
 *  220×300 (0.7333) — a ~0.8% mismatch, small but real. Fixed at 216×297
 *  (=16k×22k, k=13.5→ use 8k×11k, k=27): 216/0.16 = 297/0.22 = 1350 px/m,
 *  size kept close to the original for continuity (feed-overflow behaviour
 *  documented in Session 38 is unaffected, not this session's scope).
 *  phone: PLACEMENT.phone.size = 0.07 × 0.14m → exactly 1:2. Was 140×260
 *  (0.538) — the most visibly squashed of the three. Width 140 already
 *  matched (0.07 × 2000px/m); only height was wrong. Fixed at 140×280
 *  (140/0.07 = 280/0.14 = 2000 px/m). */
const LOGICAL = {
  laptop: { w: 676, h: 390, scale: 3 },
  tablet: { w: 216, h: 297, scale: 2 },
  phone: { w: 140, h: 280, scale: 2 }
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
    // Session 61: and that 0.73 was itself the bug. sideTable.glb was carrying a
    // blanket 1.9 scale nobody had measured, rendering a 1.02 x 0.73 x 0.42 m
    // slab where the room authors a 0.4 x 0.5 x 0.4 nightstand — Sérgio's "box
    // on the floor". data/room/models.json now scales it to its authored box
    // (measured top 0.500), so the phone comes down with the surface it lies on.
    pos: { x: -3.03, y: 0.525, z: -0.3 },
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
  // Session 61: pitch -23 → -38. The seat is unmoved; the PHONE came down
  // 0.23 m with its re-scaled nightstand (see PLACEMENT.phone above), so the
  // old aim looked over the top of it. Kept in step with data/room/nodes.json,
  // which stays the authoritative copy.
  'r2-phone': { x: -3.03, y: 1.0, z: 0.3, pitch: -38, yaw: 0 }
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

// drawLambMark moved to ../desktop/theme/era3.ts (Session 38, imported above)
// so both this module AND graceQueueLite.ts can use it without a circular
// import between the two (era3Devices.ts already imports GraceQueueLite;
// graceQueueLite.ts needs the same corner mark for its sign-in screen — a
// shared theme-level home avoids the cycle).

/** the tablet — the SAME room as readers see it (S3R.1 spec). Session 38:
 *  fully DATA-DRIVEN from graceQueueLite's resolved outcomes: approved cards
 *  render with hearts + a lamb-badge (the system's own endorsement); cards
 *  sent to review are simply ABSENT (complicity made visible without a line
 *  of text); Mira's card, if let stand, pins to the top with a one-line
 *  comments teaser and NO badge (the system never blessed her — it just
 *  failed to remove her). Before any queue action, the feed is honestly
 *  quiet (nothing has been resolved yet). */
function drawTabletShell(ctx: CanvasRenderingContext2D, W: number, H: number, feed: import('./graceQueueLite').TabletFeedItem[]): void {
  aero.px(ctx, 0, 0, W, H, ERA3.glass);
  aero.px(ctx, 0, 0, W, 26, ERA3.accent);
  setFont(ctx, 12);
  ctx.fillStyle = ERA3.white;
  ctx.fillText(d.tablet.appName, 8, 7);
  setFont(ctx, 10);
  ctx.fillStyle = ERA3.greyDk;
  ctx.fillText(d.tablet.feedHeading, 8, 32);

  if (feed.length === 0) {
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.tablet.quiet, 8, 60);
    return;
  }

  let y = 48;
  const cardH = 62;
  feed.forEach((post) => {
    const spine = post.miraTop ? ERA3.accent : ERA3.memberSpine;
    aero.px(ctx, 6, y, W - 12, cardH - 6, ERA3.memberBand);
    aero.px(ctx, 6, y, 3, cardH - 6, spine);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.ink;
    ctx.fillText(post.author, 14, y + 6);
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
    // the system's own endorsement: hearts + lamb-badge (on-script/approved
    // only — an off-script card that was let stand gets neither)
    if (post.badged) {
      setFont(ctx, 8); ctx.fillStyle = ERA3.rose;
      ctx.fillText(q.tablet.heartGlyph, 14, y + cardH - 16);
      const hw = ctx.measureText(q.tablet.heartGlyph).width;
      ctx.fillStyle = ERA3.lambTag;
      ctx.fillText(q.tablet.verifiedBadge, 14 + hw + 4, y + cardH - 16);
      drawLambMark(ctx, 14 + hw + 4 + ctx.measureText(q.tablet.verifiedBadge).width + 6, y + cardH - 20, 0.7);
    }
    // Mira's comments teaser — one line, no thread this session
    if (post.miraTop) {
      setFont(ctx, 8); ctx.fillStyle = ERA3.accent;
      ctx.fillText(q.tablet.miraCommentsTeaser, 14, y + cardH - 16);
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
  /** call once a frame — uploads any screen whose content just changed. The
   *  phone still draws/uploads exactly ONCE (Session 37's original law,
   *  unchanged); the laptop/tablet now re-check `graceQueueLite.version`
   *  each tick and redraw+re-upload ONLY when it has actually moved (a real
   *  queue action) — never on a ticking clock, per Quest budget discipline. */
  tick(dt: number): void;
  /** era-gate the three screens (and fire the once-only arrival witness
   *  line the first time era reaches e3+). Call from driveMorph() and the
   *  ?era= review-jump path alongside the room's own era toggles.
   *  S61 `settled`: a review jump wants the laptop already signed-in-ready,
   *  not the arrival narrative (dark → boot → install) — the same distinction
   *  os.ts's `setDesktopEra(era, settled)` draws for the E2 arrival. */
  setEra(era: EraKey, settled?: boolean): void;
  /** S61: the relocation has landed and the player is in Vera's seat — start
   *  her machine. Called by app.ts's endRelocation(), never by setEra: the
   *  boot belongs to the moment you ARRIVE, not to the moment the era flips
   *  (which is ~30 s earlier, in another room). No-op if already started. */
  beginArrival(): void;
  /** screen px → world ray (from app.ts's own screenRay()) → the laptop
   *  plane's logical canvas coords, generalized for ANY plane orientation
   *  (the laptop's vertical euler differs from the tablet/phone's flat
   *  screen-up planes, so this can't reuse app.ts's toDesktop()'s
   *  fixed-axis shortcut). Returns null if the ray misses the laptop
   *  entirely, or the laptop screen isn't visible/enabled this era. Routes
   *  straight into GraceQueueLite's own handleClick — the laptop is the
   *  ONLY device with verbs this session (tablet/phone have none yet). */
  handleLaptopPointer(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean;
  /** ?debug=1 review aid only (like __os/__tapes) — the raw offscreen
   *  canvases, for pixel-probing the shell content/lamb-marks without
   *  screenshot-chasing the 3D projection. */
  debugCanvases(): Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement>;
  /** ?debug=1 review aid only (like __os) — the live GraceQueueLite
   *  instance, so a review can drive/inspect the queue in logical laptop-
   *  canvas coordinates without the world→screen projection dance. */
  debugQueue(): GraceQueueLite;
}

/** general ray↔plane hit test for a `makeScreenEntity` plane (which spans
 *  local X × local Z, scaled to world w × h, default face normal +Y) at ANY
 *  world orientation — computed from the entity's own world transform
 *  columns rather than assuming a fixed axis-aligned plane (app.ts's
 *  toDesktop()/toWitness() both hardcode one axis each; the three Era-3
 *  screens don't share a single orientation, so this can't reuse either).
 *  column0/1/2 = the entity's rotated+scaled local X/Y/Z basis vectors
 *  (Mat4.data is column-major: indices 0-2, 4-6, 8-10; 12-14 = translation —
 *  the same convention Session 37's own euler-facing note used to verify a
 *  plane's normal sign). Returns logical pixel coords or null if the ray
 *  misses the plane's bounds. */
function hitPlane(entity: pc.Entity, wWorld: number, hWorld: number, logicalW: number, logicalH: number, ray: { p0: pc.Vec3; p1: pc.Vec3 }): { x: number; y: number } | null {
  const m = entity.getWorldTransform().data;
  const cx = m[12], cy = m[13], cz = m[14];
  const rightX = m[0], rightY = m[1], rightZ = m[2];
  const normX = m[4], normY = m[5], normZ = m[6];
  const heightX = m[8], heightY = m[9], heightZ = m[10];

  const dx = ray.p1.x - ray.p0.x, dy = ray.p1.y - ray.p0.y, dz = ray.p1.z - ray.p0.z;
  const denom = dx * normX + dy * normY + dz * normZ;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((cx - ray.p0.x) * normX + (cy - ray.p0.y) * normY + (cz - ray.p0.z) * normZ) / denom;
  if (t < 0 || t > 1) return null;

  const px = ray.p0.x + dx * t, py = ray.p0.y + dy * t, pz = ray.p0.z + dz * t;
  const ddx = px - cx, ddy = py - cy, ddz = pz - cz;

  const rightLen = Math.hypot(rightX, rightY, rightZ) || 1;
  const heightLen = Math.hypot(heightX, heightY, heightZ) || 1;
  const lx = (ddx * rightX + ddy * rightY + ddz * rightZ) / rightLen;   // world-length along local X, in [-w/2, w/2]
  const lz = (ddx * heightX + ddy * heightY + ddz * heightZ) / heightLen; // world-length along local Z, in [-h/2, h/2]

  const u = lx / wWorld + 0.5;
  // v: empirically calibrated in-browser (Session 38) against the laptop's
  // real screen — a real click on the visually-lower "Sign in" button
  // resolved to a logical y in the canvas's TOP half with `0.5 - lz/hWorld`,
  // so the sign here is `+`, not the `-` a naive mirror-of-toWitness() guess
  // would suggest. Session 37's own euler-facing note flagged exactly this:
  // "probing... rather than guessing" when a plane's orientation isn't a
  // simple shared-room yaw. Re-verify if PLACEMENT.laptop's euler ever changes.
  const v = 0.5 + lz / hWorld;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { x: u * logicalW, y: v * logicalH };
}

export function buildEra3Devices(app: pc.Application): Era3Devices {
  type Screen = {
    name: keyof typeof PLACEMENT;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    tex: pc.Texture;
    entity: pc.Entity;
    dirty: boolean;
    logical: { w: number; h: number };
    /** if present, checked each tick; the screen redraws+re-uploads ONLY
     *  when this value has changed since the last tick (dirty discipline —
     *  never a bare per-frame redraw). Screens without one (the phone) draw
     *  once at construction and never again, per Session 37's original law. */
    versionOf?: () => number;
    lastVersion?: number;
  };
  const screens: Screen[] = [];
  const graceQueueLite = new GraceQueueLite();

  function add(name: keyof typeof PLACEMENT, logical: { w: number; h: number; scale: number }, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, opts: { versionOf?: () => number } = {}): void {
    const { canvas, ctx } = makeCanvas(logical.w, logical.h, logical.scale);
    draw(ctx, logical.w, logical.h);
    const tex = makeScreenTexture(app, canvas);
    const place = PLACEMENT[name];
    const entity = makeScreenEntity(`era3-device-${name}`, tex, place.size.w, place.size.h);
    entity.setLocalPosition(place.pos.x, place.pos.y, place.pos.z);
    entity.setLocalEulerAngles(place.euler.x, place.euler.y, place.euler.z);
    entity.enabled = false; // setEra() decides visibility
    app.root.addChild(entity);
    screens.push({ name, canvas, ctx, tex, entity, dirty: true, logical: { w: logical.w, h: logical.h }, versionOf: opts.versionOf, lastVersion: opts.versionOf ? opts.versionOf() : undefined });
  }

  add('laptop', LOGICAL.laptop, (ctx, w, h) => graceQueueLite.draw(ctx, w, h), { versionOf: () => graceQueueLite.version });
  add('tablet', LOGICAL.tablet, (ctx, w, h) => drawTabletShell(ctx, w, h, graceQueueLite.tabletFeed()), { versionOf: () => graceQueueLite.version });
  add('phone', LOGICAL.phone, drawPhoneShell);

  let arrived = false;

  return {
    tick(dt: number): void {
      // S61: the arrival (dark → boot → install → sign-in) is the only thing
      // in this module with a clock. It bumps `version` on its own quantised
      // schedule, so the redraw path below is unchanged and still fires only
      // on a real content change — never per frame. See GraceQueueLite's header.
      graceQueueLite.update(dt);
      for (const s of screens) {
        if (s.versionOf && s.lastVersion !== s.versionOf()) {
          s.lastVersion = s.versionOf();
          s.ctx.clearRect(0, 0, s.logical.w, s.logical.h);
          if (s.name === 'laptop') graceQueueLite.draw(s.ctx, s.logical.w, s.logical.h);
          else if (s.name === 'tablet') drawTabletShell(s.ctx, s.logical.w, s.logical.h, graceQueueLite.tabletFeed());
          s.dirty = true;
        }
        if (s.dirty) { s.tex.upload(); s.dirty = false; }
      }
    },
    setEra(era: EraKey, settled = false): void {
      const visible = era === 'e3' || era === 'e4';
      for (const s of screens) s.entity.enabled = visible;
      // S61: a settled review jump lands on sign-in; a real transition leaves
      // the laptop dark until endRelocation() calls beginArrival(). E4 also
      // settles — by then the machine has long since been on.
      if (visible && (settled || era === 'e4')) graceQueueLite.settleArrival();
      if (visible && !arrived) {
        arrived = true;
        if (ledger.era3Arrival.length === 0) {
          ledger.era3Arrival.push({ witness: d.witnessArrival });
        }
      }
    },
    beginArrival(): void {
      graceQueueLite.beginArrival();
    },
    handleLaptopPointer(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean {
      const laptop = screens.find(s => s.name === 'laptop');
      if (!laptop || !laptop.entity.enabled) return false;
      const place = PLACEMENT.laptop;
      const hitPt = hitPlane(laptop.entity, place.size.w, place.size.h, laptop.logical.w, laptop.logical.h, ray);
      if (!hitPt) return false;
      graceQueueLite.handleClick(hitPt.x, hitPt.y);
      return true;
    },
    debugCanvases(): Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement> {
      const out = {} as Record<'laptop' | 'tablet' | 'phone', HTMLCanvasElement>;
      for (const s of screens) out[s.name] = s.canvas;
      return out;
    },
    debugQueue(): GraceQueueLite {
      return graceQueueLite;
    }
  };
}
