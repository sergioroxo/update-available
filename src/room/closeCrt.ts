/**
 * ⚑ S380 (UiB job 21 Part A) — DANIEL'S CRT IN THE CLOSE'S ROW. His notes on job 20 (12 Nov): the computer panel "needs
 * to have a more retro and Low-poly look. the Aesthetics clashes with the project and the overall space. Even more with
 * having the other panels nearby"; "I dont think we can have the older computer there, maybe it can go to the position
 * of the panel, just replace it, just the CRT no desk. Maybe that could work as it also bring a different aspect ratio
 * to the panels, but we keep the website pop out like it did".
 *
 * So the fifth panel is no longer a card: it is Daniel's monitor itself, alone — the room's own boxes (data/room/
 * era1.json: crtBody, the four bezels, the neck, the foot, the power button and its green light), no desk, no tower, no
 * keyboard — with the tube's tapered back the room never needed to show (the room sees the CRT from the front, against
 * the wall; out in the sky it is seen from the seat, a little from below). Low poly in the rooms' grammar: every face its
 * own four vertices and its own fixed shade (top lightest, sides darker, underside darkest, as the far machine had since
 * S174), so it reads as an object whatever the sky's light is doing; no texture on the body (FILTER_NEAREST holds
 * trivially); the colours are the room's (CRT_PLASTIC) and ERA1's.
 *
 * Its glass carries what the panel's face carried — LambyOS, the years, "Restart as you are.", the one sentence, the
 * hint and the Open button — and it is the one screen of the Close: drawn once on a canvas, sampled with the SCREENS
 * exception (`makeScreenTexture(…, 'screen')`, Sérgio 9 Nov), lit by itself (the tube's faint glow; it never flashes).
 * Mounted by pointCloud.ts on the cloud's root, in the panels' row (cluster.json `machinePanel`), where it drifts and
 * fades with them. A press anywhere on its front is the app's (it opens the machine's page in the site viewer, unchanged
 * from S378). Two draw calls (the body, the glass) — exactly what the retired far machine (closeMonitor.ts) cost.
 *
 * Words: close_restart.json (the card's mark, years, title and `kept`; the `machine` block's hint and button — drafts).
 */
import * as pc from 'playcanvas';
import card from '../../data/strings/close_restart.json';
import layout from '../../data/room/era1.json';
import { ERA1, CRT_PLASTIC } from '../desktop/theme/era1';
import { FACES } from '../desktop/theme/fonts';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';

const FACE = FACES.e1.family;
const M = (card as unknown as { machine: { panelHint: string; panelButton: string } }).machine;

/** the room's glass (app.ts SCREEN; metres, 4:3) — the CRT's own origin is its centre */
const GLASS = { w: 0.4, h: 0.3, y: 1.08 };
/** the room's CRT, without the desk, the tower or the keyboard */
const PART_IDS = ['crtBody', 'crtBezelTop', 'crtBezelBottom', 'crtBezelLeft', 'crtBezelRight', 'crtNeck', 'crtFoot',
  'crtPowerButton', 'crtPowerLed'];
/** the glass canvas: 2000 px a metre of glass (800 × 600 for 0.4 × 0.3 m) — at the Close's scale ×2.5 that is 800 px a
 *  world metre, so the Close's 28 px floor at 698 px/m (S146, ≈ 4 cm of letter) is 32 px here: nothing under it */
const GW = 800, GH = 600;
const MIN_PX = 32;

/** a box's six faces: their normals, corners and fixed low-poly shade (the far machine's own table, S174 / R4-14) */
const BOX_FACES: { n: number[]; v: number[][]; shade: number }[] = [
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], shade: 0.92 },     // the front, toward the seat
  { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], shade: 0.55 }, // the back
  { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], shade: 1.08 },      // the top
  { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], shade: 0.5 },  // the underside
  { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], shade: 0.72 },      // the right side
  { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], shade: 0.66 }  // the left side
];

interface Buf { pos: number[]; nrm: number[]; col: number[]; idx: number[] }

function quad(b: Buf, v: number[][], n: number[], c: pc.Color, shade: number): void {
  const base = b.pos.length / 3;
  for (const p of v) {
    b.pos.push(p[0], p[1], p[2]);
    b.nrm.push(n[0], n[1], n[2]);
    b.col.push(Math.min(1, c.r * shade), Math.min(1, c.g * shade), Math.min(1, c.b * shade), 1);
  }
  b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function box(b: Buf, p: number[], s: number[], c: pc.Color, shadeK = 1): void {
  for (const f of BOX_FACES) {
    quad(b, f.v.map(([x, y, z]) => [p[0] + x * s[0] / 2, p[1] + y * s[1] / 2, p[2] + z * s[2] / 2]), f.n, c, f.shade * shadeK);
  }
}

/** the tube's housing: a frustum from the case's back (w0 × h0 at z0) to a smaller back (w1 × h1 at z1, dropped by `dy`) */
function frustum(b: Buf, w0: number, h0: number, z0: number, w1: number, h1: number, z1: number, dy: number, c: pc.Color): void {
  const A = [[-w0 / 2, -h0 / 2, z0], [w0 / 2, -h0 / 2, z0], [w0 / 2, h0 / 2, z0], [-w0 / 2, h0 / 2, z0]];
  const B = [[-w1 / 2, -h1 / 2 + dy, z1], [w1 / 2, -h1 / 2 + dy, z1], [w1 / 2, h1 / 2 + dy, z1], [-w1 / 2, h1 / 2 + dy, z1]];
  const normal = (q: number[][]): number[] => {
    const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
    const v = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  // each face wound so its normal points out (the frustum runs toward −z)
  const faces: [number[][], number][] = [
    [[A[3], A[2], B[2], B[3]], 1.0],    // the top, sloping back
    [[B[0], B[1], A[1], A[0]], 0.5],    // the underside
    [[A[1], B[1], B[2], A[2]], 0.7],    // the right
    [[B[0], A[0], A[3], B[3]], 0.64],   // the left
    [[B[1], B[0], B[3], B[2]], 0.55]    // the back plate
  ];
  for (const [q, shade] of faces) quad(b, q, normal(q), c, shade);
}

/** wrap at the context's current font */
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** a palette colour at an alpha (the colour is the palette's; only its opacity is set) */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface GlassRect { x: number; y: number; w: number; h: number }

/**
 * THE GLASS: LambyOS's face, as the panel's face had it (S378) — the mark and the years, the title as large as the glass
 * allows, the one sentence, the hint and the 1997 bevelled Open button — on the tube's black, its glow gathered at the
 * middle, scan lines over it and the curve's darker rim. Returns the button's rect (canvas px).
 */
export function drawCrtGlass(c: CanvasRenderingContext2D): GlassRect {
  c.clearRect(0, 0, GW, GH);
  c.fillStyle = ERA1.black; c.fillRect(0, 0, GW, GH);
  const cx = GW / 2, cy = GH / 2;
  const glow = c.createRadialGradient(cx, cy, 8, cx, cy, Math.max(GW, GH) * 0.62);
  glow.addColorStop(0, hexA(ERA1.titleBlue, 0.22)); glow.addColorStop(0.7, hexA(ERA1.navy, 0.1)); glow.addColorStop(1, hexA(ERA1.black, 0));
  c.fillStyle = glow; c.fillRect(0, 0, GW, GH);
  const pad = 48, x = pad, w = GW - pad * 2;
  c.textBaseline = 'middle'; c.textAlign = 'left';
  // the header line: the mark, and the span the machine was running
  c.font = `${MIN_PX}px ${FACE}`; c.fillStyle = ERA1.silver;
  c.fillText(card.mark, x, 58);
  const yw = c.measureText(card.years).width;
  c.fillText(card.years, x + w - yw, 58);
  c.fillStyle = ERA1.greyDark; c.fillRect(x, 88, w, 3);
  // the title
  let tp = 72;
  for (; tp > 44; tp -= 2) { c.font = `${tp}px ${FACE}`; if (c.measureText(card.title).width <= w) break; }
  c.fillStyle = ERA1.white; c.fillText(card.title, x, 166);
  // the one sentence that is true of the piece and false of every apparatus in it
  c.font = `36px ${FACE}`; c.fillStyle = ERA1.silver;
  const kept = wrap(c, card.kept, w);
  kept.forEach((l, i) => c.fillText(l, x, 246 + i * 46));
  // the way in: the Open button bottom right, the hint beside it (or above it, across the glass, if it will not fit)
  const btn: GlassRect = { x: GW - pad - 236, y: GH - pad - 80, w: 236, h: 80 };
  bevelButton(c, btn, M.panelButton);
  c.font = `${MIN_PX}px ${FACE}`; c.fillStyle = ERA1.tooltip;
  let rows = wrap(c, M.panelHint, btn.x - x - 24);
  if (rows.length <= 2) {
    rows.forEach((l, i) => c.fillText(l, x, Math.round(btn.y + btn.h / 2 + (i - (rows.length - 1) / 2) * 38)));
  } else {
    rows = wrap(c, M.panelHint, w);
    rows.forEach((l, i) => c.fillText(l, x, Math.round(btn.y - 30 - (rows.length - 1 - i) * 38)));
  }
  // the curve: the rim darker where the glass bends away, one soft highlight up and to the left, the scan lines
  const rim = c.createRadialGradient(cx, cy, Math.min(GW, GH) * 0.42, cx, cy, Math.max(GW, GH) * 0.66);
  rim.addColorStop(0, hexA(ERA1.black, 0)); rim.addColorStop(1, hexA(ERA1.black, 0.5));
  c.fillStyle = rim; c.fillRect(0, 0, GW, GH);
  c.fillStyle = hexA(ERA1.black, 0.16);
  for (let y = 0; y < GH; y += 4) c.fillRect(0, y, GW, 1.5);
  const hl = c.createLinearGradient(0, 0, GW * 0.45, GH * 0.45);
  hl.addColorStop(0, hexA(ERA1.white, 0.09)); hl.addColorStop(1, hexA(ERA1.white, 0));
  c.fillStyle = hl; c.fillRect(0, 0, GW * 0.5, GH * 0.5);
  return btn;
}

/** the 1997 bevelled button, at ×3 like the rooms' Sources buttons (pointCloud.ts drawSourcesButton, era 1) */
function bevelButton(c: CanvasRenderingContext2D, r: GlassRect, label: string): void {
  const S = 3, { x, y, w, h } = r;
  c.fillStyle = ERA1.black; c.fillRect(x, y, w, h);
  c.fillStyle = ERA1.white; c.fillRect(x, y, w - S, h - S);
  c.fillStyle = ERA1.greyDark; c.fillRect(x + S, y + S, w - 2 * S, h - 2 * S);
  c.fillStyle = ERA1.silver; c.fillRect(x + S, y + S, w - 3 * S, h - 3 * S);
  c.fillStyle = ERA1.beige; c.fillRect(x + 2 * S, y + 2 * S, w - 4 * S, h - 4 * S);
  c.font = `45px ${FACE}`; c.fillStyle = ERA1.black; c.textBaseline = 'middle'; c.textAlign = 'center';
  c.fillText(label, x + w / 2, y + h / 2 + 2);
  c.textAlign = 'left';
}

export interface CloseCrt {
  /** the CRT, origin at its glass centre, facing +Z (its front toward the seat); the caller poses and scales it */
  readonly entity: pc.Entity;
  /** the front of the case in the CRT's own metres: its half-width, half-height and its z (the bezel's face) */
  readonly front: { hw: number; hh: number; z: number };
  /** the Open button on the glass, in the CRT's own metres (x right, y up from the glass centre) and half-sizes */
  readonly button: { x: number; y: number; hw: number; hh: number };
  /** the case's extent in its own metres (min/max), for the checks */
  readonly extent: { min: number[]; max: number[] };
  /** fade with the panels: 0 gone, 1 there (opaque once it is fully there) */
  setFade(k: number): void;
  /** draw the glass again (the faces are vendored files: once they have loaded) */
  redraw(): void;
}

/** the case's own light in the Close's night (×0.58 read grey beside the panels in the first photographs; the S378
 *  panel's beige measured (156, 149, 130) on the computer) */
const CASE_LIGHT = 0.72;

export function buildCloseCrt(app: pc.AppBase): CloseCrt {
  const entity = new pc.Entity('close-crt');
  type Prop = { id: string; pos: number[]; size: number[]; color?: string };
  const props = (layout.props as Prop[]).filter((p) => PART_IDS.includes(p.id));
  const b: Buf = { pos: [], nrm: [], col: [], idx: [] };
  for (const p of props) {
    const at = [p.pos[0], p.pos[1] - GLASS.y, p.pos[2]];
    if (p.id === 'crtPowerLed') {
      // the green light is lit: its colour divided by the case's light, so the material's ×CASE_LIGHT gives it back
      const g = new pc.Color().fromString(ERA1.ok);
      box(b, at, p.size, new pc.Color(g.r / CASE_LIGHT, Math.min(1, g.g / CASE_LIGHT), g.b / CASE_LIGHT), 1 / 0.92);
    } else box(b, at, p.size, new pc.Color().fromString(p.color ?? CRT_PLASTIC.body));
  }
  // the tube's housing behind the case: from just inside the case's back to a smaller plate, a little lower
  const body = props.find((p) => p.id === 'crtBody');
  const bz = body ? body.pos[2] - body.size[2] / 2 : -0.19;
  const bw = body ? body.size[0] : 0.54, bh = body ? body.size[1] : 0.44;
  frustum(b, bw * 0.9, bh * 0.88, bz + 0.002, bw * 0.56, bh * 0.52, bz - 0.21, -0.03, new pc.Color().fromString(CRT_PLASTIC.body));
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(b.pos);
  mesh.setNormals(b.nrm);
  mesh.setColors(b.col);
  mesh.setIndices(b.idx);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const bodyMat = new pc.StandardMaterial();
  bodyMat.useLighting = false;
  bodyMat.diffuse = new pc.Color(0, 0, 0);
  bodyMat.specular = new pc.Color(0, 0, 0);
  bodyMat.emissive = new pc.Color(CASE_LIGHT, CASE_LIGHT, CASE_LIGHT);
  bodyMat.emissiveVertexColor = true;
  bodyMat.update();
  const bodyEnt = new pc.Entity('close-crt-body');
  bodyEnt.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, bodyMat)] });
  entity.addChild(bodyEnt);

  // the glass: one canvas, the SCREENS exception, lit by itself
  const canvas = document.createElement('canvas');
  canvas.width = GW; canvas.height = GH;
  const ctx = canvas.getContext('2d');
  let btn: GlassRect = { x: GW - 284, y: GH - 128, w: 236, h: 80 };
  if (ctx) btn = drawCrtGlass(ctx);
  const tex = makeScreenTexture(app, canvas, 'screen');
  const glass = makeScreenEntity('close-crt-glass', tex, GLASS.w, GLASS.h);
  glass.setLocalPosition(0, 0, 0);
  glass.setLocalEulerAngles(90, 0, 0);   // faces +Z, as the room's desktop screen does
  entity.addChild(glass);
  const glassMat = glass.render!.material as pc.StandardMaterial;

  const lo = mesh.aabb.getMin(), hi = mesh.aabb.getMax();
  const bezelFront = (props.find((p) => p.id === 'crtBezelTop')?.pos[2] ?? -0.005) + 0.025;
  const toLocal = (r: GlassRect) => ({
    x: ((r.x + r.w / 2) / GW - 0.5) * GLASS.w, y: (0.5 - (r.y + r.h / 2) / GH) * GLASS.h,
    hw: (r.w / GW) * GLASS.w / 2, hh: (r.h / GH) * GLASS.h / 2
  });
  let button = toLocal(btn);
  let blending: boolean | null = null;

  return {
    entity,
    front: { hw: bw / 2, hh: bh / 2, z: bezelFront },
    get button() { return button; },
    extent: { min: [lo.x, lo.y, lo.z], max: [hi.x, hi.y, hi.z] },
    setFade(k: number): void {
      const f = Math.max(0, Math.min(1, k));
      entity.enabled = f > 0.001;
      const blend = f < 0.999;
      if (blend !== blending) {
        blending = blend;
        for (const m of [bodyMat, glassMat]) { m.blendType = blend ? pc.BLEND_NORMAL : pc.BLEND_NONE; m.depthWrite = true; }
      }
      bodyMat.opacity = blend ? f : 1;
      bodyMat.emissive.set(CASE_LIGHT, CASE_LIGHT, CASE_LIGHT);
      bodyMat.update();
      glassMat.opacity = blend ? f : 1;
      glassMat.emissive.set(1, 1, 1);
      glassMat.update();
    },
    redraw(): void {
      if (!ctx) return;
      button = toLocal(drawCrtGlass(ctx));
      tex.upload();
    }
  };
}
