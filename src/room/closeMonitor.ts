/**
 * ⚑ DANIEL'S MONITOR, LIT INSIDE THE CLOSE (2026-09-12).
 *
 * Sérgio, reviewing the Close: *"We need a way to enter the 'restart as you'
 * option… think of a better idea."* Ruled the same day: the restart is
 * **Daniel's 1997 monitor**, lit in the constellation after the panels have
 * settled — the machine the piece began on, thirty years later, in the dark
 * that the rooms became, offering the one thing it can: a way back to a room,
 * or the machine started again.
 *
 * It is NOT the room's CRT switched back on. Room 1 is batched into the
 * cluster shell and switched off for the Close (its walls would occlude the
 * sky); this is a second CRT, the same boxes at the same coordinates
 * (`data/room/era1.json`'s `crt*`, the desk top and the keyboard, read from
 * the data so the colours stay the room's), one mesh, one draw call, plus its
 * screen: a plane at exactly `SCREEN`'s pose (`app.ts`), textured from a
 * canvas of its own so the E4 shell's canvas is never involved. The body has a
 * little self-light because the `close` rig has the lights out — a CRT-shaped
 * shadow with a lit glass in it, which is what a monitor is at night.
 *
 * The card (`data/strings/close_restart.json`) is drawn in ERA1's palette and
 * type, 512×384 logical at ×3, exactly as the 1997 desktop is. Its rects are
 * PUBLISHED (`hits`) — the affordance is the target — so the walk can end on
 * it, and its presses are resolved by whoever mounts it (`onEra`, `onAgain`).
 *
 * Frame voice: functional, undecorated. No music, no thanks, no credits.
 */
import * as pc from 'playcanvas';
import { recordEntries } from '../witness/record';
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../desktop/theme/era1';
import { px, setFont, bevel } from '../desktop/theme/chrome';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import layout from '../../data/room/era1.json';
import card from '../../data/strings/close_restart.json';
import type { EraKey } from './cluster';

export interface CloseMonitor {
  readonly entity: pc.Entity;
  /** light it: the body appears and the card fades up over `RISE_SECONDS` */
  show(): void;
  hide(): void;
  readonly on: boolean;
  update(dt: number): void;
  /** the card's controls, in logical canvas pixels — published for the walk */
  readonly hits: { x: number; y: number; w: number; h: number; id: string }[];
  /** a press in logical canvas pixels; true when it landed on a control */
  press(x: number, y: number): boolean;
  onEra?: (era: EraKey) => void;
  onAgain?: () => void;
  /** ⚑ S163 / C-02 — the machine stands back in the sky now; `present` puts the
   *  dark body there before it is lit (R3-109), `setNear` says whether the eye
   *  has come to it (the card's face and its presses depend on it) */
  present(): void;
  setNear(near: boolean): void;
  readonly near: boolean;
  /** the glass, in world space (centre + size) — for a ray test and for the walk's aim */
  readonly glass: { x: number; y: number; z: number; w: number; h: number };
  /** a world-space ray → the glass in logical canvas pixels, or null */
  hitTest(p0: { x: number; y: number; z: number }, p1: { x: number; y: number; z: number }): { x: number; y: number } | null;
  /** she pressed the far glass: whoever mounts this moves the eye (app.ts) */
  onGo?: () => void;
}

/** the CRT's visible screen, as app.ts has it (metres, 4:3) */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
const RISE_SECONDS = 3.0;
/**
 * ⚑ S163 / C-02 + R3-111 — FURTHER, AND BIGGER. Sérgio (2026-09-20): "the PC model
 * is still all wrong and in front of the panels; it should be further, and the
 * screen image bigger. If we need to, we can press and go there." And round 3:
 * "the reboot PC should be Daniel's and much further away — I can barely see the
 * Close." So the machine stands FAR_Z metres back into the sky, scaled ×SCALE
 * about its own glass (the glass centre stays at the room's screen height), so
 * the constellation is the frame and the monitor is a screen in it. From the
 * seat the card is a title and one line; a press on the glass brings the eye to
 * NEAR_DISTANCE (the room's own 0.7 m, scaled), where the full card is drawn and
 * its buttons are live. The camera moves; the machine never does.
 */
export const CLOSE_MONITOR = {
  /** the glass's world z (the seat is at z 0.7, so 3.0 m away) */
  farZ: -2.3,
  /** the glass centre's height: 0.15 under the room's screen, so the machine's
   *  top (1.33) clears the panels' band (1.36 up — cluster.json pointCloud.panel) */
  glassY: 0.93,
  scale: 1.8,
  /** eye-to-glass when she has come to it: the room's 0.7 m at the machine's scale */
  nearDistance: 0.7 * 1.8
} as const;
const BODY_IDS = ['deskTop', 'crtBody', 'crtBezelTop', 'crtBezelBottom', 'crtBezelLeft', 'crtBezelRight',
  'crtNeck', 'crtFoot', 'crtPowerButton', 'crtPowerLed', 'keyboard'];

function pushBox(pos: number[], idx: number[], col: number[], p: number[], s: number[], c: pc.Color): void {
  const base = pos.length / 3;
  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  for (const [cx, cy, cz] of C) {
    pos.push(p[0] + cx * s[0] / 2, p[1] + cy * s[1] / 2, p[2] + cz * s[2] / 2);
    col.push(c.r, c.g, c.b, 1);
  }
  for (const f of F) for (const i of f) idx.push(base + i);
}

export function mountCloseMonitor(app: pc.Application): CloseMonitor {
  const entity = new pc.Entity('close-monitor');
  entity.enabled = false;
  app.root.addChild(entity);

  // ── the body: the room's own boxes, from the room's own data ──
  type Prop = { id: string; pos: number[]; size: number[]; color?: string };
  const props = (layout.props as Prop[]).filter((p) => BODY_IDS.includes(p.id));
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  for (const p of props) {
    // ⚑ 2026-09-13, Sérgio: "the monitor and the table aren't that visible… make
    //   the table smaller" — the desk is only the piece under the machine now
    //   (0.9 × 0.5 m), not the whole 1.5 m top that filled the frame's foot
    const size = p.id === 'deskTop' ? [0.9, p.size[1], 0.5] : p.size;
    pushBox(pos, idx, col, p.pos, size, new pc.Color().fromString(p.color ?? ERA1.silver));
  }
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos);
  mesh.setIndices(idx);
  mesh.setColors(col);
  mesh.setNormals(pc.calculateNormals(pos, idx));
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const bodyMat = new pc.StandardMaterial();
  bodyMat.diffuse = new pc.Color(1, 1, 1);
  bodyMat.diffuseVertexColor = true;
  bodyMat.specular = new pc.Color(0, 0, 0);
  bodyMat.emissive = new pc.Color(0, 0, 0);
  bodyMat.update();
  const body = new pc.Entity('close-monitor-body');
  body.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, bodyMat)] });
  entity.addChild(body);

  // ── the glass: its own canvas, its own texture, the CRT's own pose ──
  const canvas = document.createElement('canvas');
  canvas.width = ERA1_CANVAS.width * RENDER_SCALE;
  canvas.height = ERA1_CANVAS.height * RENDER_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  const tex = makeScreenTexture(app, canvas);
  const glass = makeScreenEntity('close-monitor-screen', tex, SCREEN.w, SCREEN.h);
  glass.setLocalPosition(SCREEN.x, SCREEN.y, SCREEN.z);
  glass.setLocalEulerAngles(90, 0, 0);   // faces +Z, the chair — as desktop-screen does
  entity.addChild(glass);
  const glassMat = glass.render!.material as pc.StandardMaterial;
  // C-02: back into the sky, scaled about the glass — its centre stays at (0, SCREEN.y, farZ)
  const S = CLOSE_MONITOR.scale;
  entity.setLocalScale(S, S, S);
  entity.setLocalPosition(0, CLOSE_MONITOR.glassY - SCREEN.y * S, CLOSE_MONITOR.farZ);
  const glassWorld = { x: 0, y: CLOSE_MONITOR.glassY, z: CLOSE_MONITOR.farZ, w: SCREEN.w * S, h: SCREEN.h * S };

  const hits: CloseMonitor['hits'] = [];
  const W = ERA1_CANVAS.width, H = ERA1_CANVAS.height;

  /** ⚑ the FAR face (C-02): the mark, the title large, one line — readable at
   *  three metres; the whole glass is the press that brings the eye to it */
  function drawFar(): void {
    hits.length = 0;
    px(ctx, 0, 0, W, H, ERA1.black);
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(card.mark, 24, 22);
    const yw = ctx.measureText(card.years).width;
    ctx.fillText(card.years, W - 24 - yw, 22);
    px(ctx, 24, 40, W - 48, 1, ERA1.greyDark);
    setFont(ctx, 40);
    ctx.fillStyle = ERA1.white;
    const tw = ctx.measureText(card.title).width;
    ctx.fillText(card.title, Math.round((W - tw) / 2), 140);
    setFont(ctx, 18);
    ctx.fillStyle = ERA1.silver;
    const cw = ctx.measureText(card.come).width;
    ctx.fillText(card.come, Math.round((W - cw) / 2), 232);
    hits.push({ x: 0, y: 0, w: W, h: H, id: 'close-go' });
    tex.upload();
  }

  /** the card, once — nothing on it moves, so it is drawn on `setNear(true)` and uploaded once */
  function drawCard(): void {
    hits.length = 0;
    px(ctx, 0, 0, W, H, ERA1.black);
    // the machine's own header line: its mark, and the span it was running
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(card.mark, 24, 22);
    const yw = ctx.measureText(card.years).width;
    ctx.fillText(card.years, W - 24 - yw, 22);
    px(ctx, 24, 40, W - 48, 1, ERA1.greyDark);
    // the title, then the two sentences
    setFont(ctx, 22);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(card.title, 24, 74);
    setFont(ctx, 12);
    // S146 — the file's size, then the sentence that answers it
    const all = recordEntries();
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(card.filed.replace('{n}', String(all.length)).replace('{f}', String(all.filter((e) => e.flagged).length)), 24, 106);
    ctx.fillText(card.kept, 24, 124);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(card.choose, 24, 144);
    // four rooms — one row, sized to the longest label
    const bw = 108, bh = 26, gap = 10;
    const x0 = Math.round((W - (bw * 4 + gap * 3)) / 2);
    const by = 200;
    card.eras.forEach((e, i) => {
      const bx = x0 + i * (bw + gap);
      bevel(ctx, bx, by, bw, bh, true);
      setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      const tw = ctx.measureText(e.label).width;
      ctx.fillText(e.label, Math.round(bx + (bw - tw) / 2), by + 8);
      hits.push({ x: bx, y: by, w: bw, h: bh, id: `close-era-${e.era}` });
    });
    // and the machine again, on its own row
    const aw = 148, ah = 26;
    const ax = Math.round((W - aw) / 2), ay = 262;
    bevel(ctx, ax, ay, aw, ah, true);
    setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    const atw = ctx.measureText(card.again).width;
    ctx.fillText(card.again, Math.round(ax + (aw - atw) / 2), ay + 8);
    hits.push({ x: ax, y: ay, w: aw, h: ah, id: 'close-again' });
    // S143: the makers, in one line, small — the frame's voice on the last screen
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.grey;
    const mw = ctx.measureText(card.makers).width;
    ctx.fillText(card.makers, Math.round((W - mw) / 2), H - 30);
    tex.upload();
  }

  let on = false;
  let rise = 0;
  let near = false;
  const api: CloseMonitor = {
    entity,
    get on() { return on; },
    get near() { return near; },
    get glass() { return glassWorld; },
    get hits() { return on && rise >= 1 ? hits : []; },   // pressable only once lit
    present(): void {
      // R3-109 ("in Daniel's place, the computer should be there"): the dark body
      // stands in the sky before it is lit — a CRT-shaped shadow, no glass yet
      if (on) return;
      glassMat.emissive.set(0, 0, 0);
      glassMat.update();
      bodyMat.emissive.set(0.06, 0.055, 0.05);
      bodyMat.update();
      entity.enabled = true;
    },
    setNear(n: boolean): void {
      if (near === n) return;
      near = n;
      if (on) { if (near) drawCard(); else drawFar(); }
    },
    hitTest(p0, p1): { x: number; y: number } | null {
      if (!entity.enabled) return null;
      const g = glassWorld;
      const dz = p1.z - p0.z;
      if (Math.abs(dz) < 1e-6) return null;
      const t = (g.z - p0.z) / dz;
      if (t < 0 || t > 1) return null;
      const wx = p0.x + (p1.x - p0.x) * t;
      const wy = p0.y + (p1.y - p0.y) * t;
      const u = (wx - g.x) / g.w + 0.5;
      const v = 0.5 - (wy - g.y) / g.h;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      return { x: u * W, y: v * H };
    },
    show(): void {
      if (on) return;
      on = true;
      rise = 0;
      if (near) drawCard(); else drawFar();
      glassMat.emissive.set(0, 0, 0);
      glassMat.update();
      entity.enabled = true;
    },
    hide(): void {
      on = false;
      near = false;
      entity.enabled = false;
      hits.length = 0;
    },
    update(dt: number): void {
      if (!on || rise >= 1) return;
      rise = Math.min(1, rise + dt / RISE_SECONDS);
      const k = rise * rise * (3 - 2 * rise);
      // the glass comes up like a CRT warming: the body catches its light
      glassMat.emissive.set(k, k, k);
      glassMat.update();
      // ⚑ 2026-09-13, Sérgio: "make the CRT body a bit lighter" — 0.10 read as a
      //   silhouette; this is the beige catching its own glass
      bodyMat.emissive.set(0.52 * k, 0.48 * k, 0.42 * k);   // and lighter again (2026-09-13)
      bodyMat.update();
    },
    press(x: number, y: number): boolean {
      for (const h of api.hits) {
        if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
        if (h.id === 'close-go') { api.onGo?.(); return true; }
        if (h.id === 'close-again') { api.onAgain?.(); return true; }
        const era = card.eras.find((e) => `close-era-${e.era}` === h.id)?.era;
        if (era) { api.onEra?.(era as EraKey); return true; }
      }
      return false;
    }
  };
  return api;
}
