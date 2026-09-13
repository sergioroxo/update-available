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
}

/** the CRT's visible screen, as app.ts has it (metres, 4:3) */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
const RISE_SECONDS = 3.0;
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

  const hits: CloseMonitor['hits'] = [];
  const W = ERA1_CANVAS.width, H = ERA1_CANVAS.height;

  /** the card, once — nothing on it moves, so it is drawn on `show()` and uploaded once */
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
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(card.kept, 24, 122);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(card.choose, 24, 142);
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
    tex.upload();
  }

  let on = false;
  let rise = 0;
  const api: CloseMonitor = {
    entity,
    get on() { return on; },
    get hits() { return on && rise >= 1 ? hits : []; },   // pressable only once lit
    show(): void {
      if (on) return;
      on = true;
      rise = 0;
      drawCard();
      glassMat.emissive.set(0, 0, 0);
      glassMat.update();
      entity.enabled = true;
    },
    hide(): void {
      on = false;
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
        if (h.id === 'close-again') { api.onAgain?.(); return true; }
        const era = card.eras.find((e) => `close-era-${e.era}` === h.id)?.era;
        if (era) { api.onEra?.(era as EraKey); return true; }
      }
      return false;
    }
  };
  return api;
}
