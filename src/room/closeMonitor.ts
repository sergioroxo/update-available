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
import { recordEntries, practiceOf } from '../witness/record';
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../desktop/theme/era1';
import { px, setFont, bevel, wrapText, windowFrame, DIALOG } from '../desktop/theme/chrome';
import { ERA3, windowFrame as aeroFrame } from '../desktop/theme/era3';
import { ERA4 } from '../desktop/theme/era4';
import { setFaceEra, faceEra, type FaceEra } from '../desktop/theme/fonts';
import { sourceTextOf } from '../witness/sources';
import closeNetwork from '../../data/strings/close_network.json';
import menuCopy from '../../data/strings/gameMenu.json';
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
  /** ⚑ S174 / R4-15 — the whole machine's world extent (desk piece to bezel top),
   *  from its own mesh: what the sky must keep off the eye's line to it */
  readonly silhouette: { x: number; hx: number; yLo: number; yHi: number; z: number };
  /** a world-space ray → the glass in logical canvas pixels, or null */
  hitTest(p0: { x: number; y: number; z: number }, p1: { x: number; y: number; z: number }): { x: number; y: number } | null;
  /** she pressed the far glass: whoever mounts this moves the eye (app.ts) */
  onGo?: () => void;
  /** S167: the card's "The dossier" — the frame opens its reading of the panels */
  onDossier?: () => void;
  /** ⚑ S174 / R4-18 — a label or panel pressed in the sky: this room's dossier on
   *  the machine's screen, in that room's own OS (era 0 = how this was made).
   *  From afar it asks for the eye to come (`onGo`); the window is drawn on arrival. */
  openSource(era: number, label: string | null): void;
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
  /** ⚑ S174 / R4-14 — a little OFF the seat's axis. Dead ahead, the eye only
   *  ever meets the CRT's front face, and a front face alone is a cut-out
   *  ("just a shape"). 0.4 m to the right is 7.6° off centre from the seat: the
   *  left side of the body shows, and with it the machine's depth. Everything
   *  that aims at it reads `glass.x`, so the press, the walk and the approach
   *  follow it. */
  x: 0.4,
  /** the glass's world z (the seat is at z 0.7, so 3.0 m away) */
  farZ: -2.3,
  /** the glass centre's height: 0.15 under the room's screen, so the machine's
   *  top (1.33) clears the panels' band (1.36 up — cluster.json pointCloud.panel) */
  glassY: 0.93,
  scale: 1.8,
  /** eye-to-glass when she has come to it. ⚑ S174: was the room's 0.7 m at the
   *  machine's scale (1.26 m), which at the 42° lens shows 0.97 m of height — less
   *  than the machine's own 1.07 m, so the receipt frame had the bezel cut at the
   *  top and a panel sitting on it (his "the receipt is out of frame"). 1.55 m
   *  shows 1.19 m: the whole machine, the receipt still readable. */
  nearDistance: 1.55
} as const;
const BODY_IDS = ['deskTop', 'crtBody', 'crtBezelTop', 'crtBezelBottom', 'crtBezelLeft', 'crtBezelRight',
  'crtNeck', 'crtFoot', 'crtPowerButton', 'crtPowerLed', 'keyboard'];

/**
 * ⚑ S174 / R4-14 — FOUR VERTICES PER FACE, AND EACH FACE ITS OWN SHADE. Sérgio,
 * on the stills: "the computer model is just a shape with no real model
 * visible". It was always Daniel's CRT — the room's own boxes — but each box
 * shared its 8 corners, so `calculateNormals` averaged every corner across three
 * faces and all six shaded alike: no edges, one grey slab. And at night there is
 * almost no light to separate faces anyway. So every face now has its own four
 * vertices (flat normals), and its vertex colour carries a fixed low-poly shade
 * — top lightest, sides darker, the face toward the sky darkest — which reads
 * whatever the light is doing.
 */
const FACES: { n: number[]; v: number[][]; shade: number }[] = [
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], shade: 0.92 },     // the front, toward the seat
  { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], shade: 0.55 }, // the back
  { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], shade: 1.08 },      // the top
  { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], shade: 0.5 },  // the underside
  { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], shade: 0.72 },      // the right side
  { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], shade: 0.66 }  // the left side
];

function pushBox(pos: number[], nrm: number[], idx: number[], col: number[], p: number[], s: number[], c: pc.Color): void {
  for (const f of FACES) {
    const base = pos.length / 3;
    for (const [cx, cy, cz] of f.v) {
      pos.push(p[0] + cx * s[0] / 2, p[1] + cy * s[1] / 2, p[2] + cz * s[2] / 2);
      nrm.push(f.n[0], f.n[1], f.n[2]);
      col.push(Math.min(1, c.r * f.shade), Math.min(1, c.g * f.shade), Math.min(1, c.b * f.shade), 1);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

export function mountCloseMonitor(app: pc.Application): CloseMonitor {
  const entity = new pc.Entity('close-monitor');
  entity.enabled = false;
  app.root.addChild(entity);

  // ── the body: the room's own boxes, from the room's own data ──
  type Prop = { id: string; pos: number[]; size: number[]; color?: string };
  const props = (layout.props as Prop[]).filter((p) => BODY_IDS.includes(p.id));
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [], col: number[] = [];
  for (const p of props) {
    // ⚑ 2026-09-13, Sérgio: "the monitor and the table aren't that visible… make
    //   the table smaller" — the desk is only the piece under the machine now
    //   (0.9 × 0.5 m), not the whole 1.5 m top that filled the frame's foot
    const size = p.id === 'deskTop' ? [0.9, p.size[1], 0.5] : p.size;
    pushBox(pos, nrm, idx, col, p.pos, size, new pc.Color().fromString(p.color ?? ERA1.silver));
  }
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos);
  mesh.setIndices(idx);
  mesh.setColors(col);
  mesh.setNormals(nrm);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const bodyMat = new pc.StandardMaterial();
  bodyMat.diffuse = new pc.Color(1, 1, 1);
  bodyMat.diffuseVertexColor = true;
  bodyMat.specular = new pc.Color(0, 0, 0);
  bodyMat.emissive = new pc.Color(0, 0, 0);
  // ⚑ S174 / R4-14 — the self-light carries each face's own shade. The Close has
  //   its lights out, so the emissive IS the picture; one flat emissive colour
  //   painted all six faces the same beige and the machine read as a cut-out.
  //   Multiplied by the vertex colour instead, the top, front and sides separate.
  bodyMat.emissiveVertexColor = true;
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
  entity.setLocalPosition(CLOSE_MONITOR.x, CLOSE_MONITOR.glassY - SCREEN.y * S, CLOSE_MONITOR.farZ);
  const glassWorld = { x: CLOSE_MONITOR.x, y: CLOSE_MONITOR.glassY, z: CLOSE_MONITOR.farZ, w: SCREEN.w * S, h: SCREEN.h * S };
  const lo = mesh.aabb.getMin(), hi = mesh.aabb.getMax();
  const offY = CLOSE_MONITOR.glassY - SCREEN.y * S;
  const silhouette = {
    x: CLOSE_MONITOR.x + ((lo.x + hi.x) / 2) * S, hx: ((hi.x - lo.x) / 2) * S,
    yLo: lo.y * S + offY, yHi: hi.y * S + offY, z: CLOSE_MONITOR.farZ
  };

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
    // and the machine again, on its own row — flanked by the receipt and the
    // dossier (S167: his two asks for this screen)
    const btn = (label: string, x: number, y: number, w: number, id: string): void => {
      bevel(ctx, x, y, w, 26, true);
      setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, Math.round(x + (w - tw) / 2), y + 8);
      hits.push({ x, y, w, h: 26, id });
    };
    const aw = 148, ay = 262;
    const ax = Math.round((W - aw) / 2);
    btn(card.again, ax, ay, aw, 'close-again');
    btn(card.receipt.button, ax - 108 - 14, ay, 108, 'close-receipt');
    btn(card.dossier, ax + aw + 14, ay, 108, 'close-dossier');
    // S143: the makers, in one line, small — the frame's voice on the last screen
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.grey;
    const mw = ctx.measureText(card.makers).width;
    ctx.fillText(card.makers, Math.round((W - mw) / 2), H - 30);
    tex.upload();
  }

  /** ⚑ S167 / L-07 — THE RECEIPT: the version history, every update stacked and
   *  FAILED, then the file's lines — the machine's own till-print of thirty
   *  years. Read off the ledger and the record; nothing here is invented. */
  function drawReceipt(): void {
    hits.length = 0;
    const R = card.receipt;
    px(ctx, 0, 0, W, H, ERA1.black);
    // the paper: a strip down the middle, torn at the foot
    const pw = 300, pxl = Math.round((W - pw) / 2);
    px(ctx, pxl, 0, pw, H - 22, ERA1.paper);
    for (let x = 0; x < pw; x += 10) px(ctx, pxl + x, H - 22, 5, 5, ERA1.paper);
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.black;
    let y = 16;
    const mono = (t: string, dy = 15): void => { ctx.fillText(t, pxl + 14, y); y += dy; };
    const dots = (a: string, b: string): string => {
      const cols = 34;
      const room = Math.max(1, cols - a.length - b.length);
      return a + ' ' + '.'.repeat(room) + ' ' + b;
    };
    mono(R.title); mono(R.span); y += 6;
    px(ctx, pxl + 14, y - 4, pw - 28, 1, ERA1.greyDark); y += 6;
    setFont(ctx, 9);
    for (const u of R.updates) mono(dots(u.line, R.failed), 13);
    y += 4; px(ctx, pxl + 14, y - 4, pw - 28, 1, ERA1.greyDark); y += 6;
    const all = recordEntries();
    mono(R.entries.replace('{n}', String(all.length)).replace('{f}', String(all.filter((e) => e.flagged).length)), 13);
    mono(R.practicesLabel, 13);
    // the practices met, in order of first appearance, one line each
    const seen: string[] = [];
    for (const e of all) if (!seen.includes(e.kind)) seen.push(e.kind);
    ctx.fillStyle = ERA1.greyDark;
    for (const kind of seen.slice(0, 12)) {
      const pr = practiceOf(kind);
      mono('  ' + (pr ? pr.title : kind).toLowerCase(), 12);
    }
    if (seen.length > 12) mono('  …', 12);
    y += 4; px(ctx, pxl + 14, y - 4, pw - 28, 1, ERA1.greyDark); y += 6;
    setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    mono(R.kept, 14);
    // Back, on the paper's foot
    const bw = 80, bh = 22, bx = Math.round((W - bw) / 2), byy = H - 56;
    bevel(ctx, bx, byy, bw, bh, true);
    setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    const tw = ctx.measureText(R.back).width;
    ctx.fillText(R.back, Math.round(bx + (bw - tw) / 2), byy + 6);
    hits.push({ x: bx, y: byy, w: bw, h: bh, id: 'close-back' });
    tex.upload();
  }

  /**
   * ⚑ S174 / R4-18 — THE ROOM'S DOSSIER, IN THE ROOM'S OWN OS. One machine
   * (the receipt's own words: "1997 – 2026 · one machine") shows every era's
   * window: 1997's grey on teal, 2003's on Restorify's blue, 2016's glass, 2026's
   * dark; the seven process labels in the frame's own dialog. The content is the
   * dossier the frame's menu already reads — the panel's status, its practices,
   * each practice's verified source — and the room's references, listed together
   * with the pressed one marked. Nothing here is a new claim (close_restart.json
   * `_docSource`). Long dossiers page; Back returns to the card.
   */
  type Line = { t: string; k: 'head' | 'body' | 'dim' | 'ref' | 'mine' };
  const SRC = card.source;
  const statusWords = menuCopy.closeSourcesStatus as Record<string, string>;
  function sourceLines(era: number, label: string | null): { title: string; lines: Line[] } {
    const lines: Line[] = [];
    const refs = (closeNetwork.labels as { era: number; text: string }[]).filter((l) => l.era === era);
    const refBlock = (): void => {
      lines.push({ t: era === 0 ? SRC.makersRefsLabel : SRC.refsLabel, k: 'head' });
      for (const r of refs) lines.push({ t: (r.text === label ? '› ' : '  ') + r.text, k: r.text === label ? 'mine' : 'ref' });
    };
    if (era === 0) {
      for (const l of SRC.makersLines) lines.push({ t: l, k: 'body' });
      refBlock();
      lines.push({ t: card.makers, k: 'dim' });
      return { title: SRC.makersTitle, lines };
    }
    const pn = (closeNetwork.panels as { era: number; years: string; title: string; status: string; practices?: string[] }[])
      .find((p) => p.era === era);
    if (!pn) return { title: '', lines };
    lines.push({ t: `${SRC.statusLabel}: ${statusWords[pn.status] ?? pn.status}`, k: 'body' });
    lines.push({ t: SRC.practicesLabel, k: 'head' });
    for (const kind of pn.practices ?? []) {
      const pr = practiceOf(kind);
      if (!pr) continue;
      lines.push({ t: `${pr.title.toUpperCase()} — ${pr.did}. [${pr.status}]`, k: 'body' });
      const src = sourceTextOf(pr as { source?: { file: string; index: number } | null });
      lines.push({ t: src ? `${menuCopy.yourFileSource}: ${src}` : menuCopy.yourFileNoSource, k: 'dim' });
    }
    refBlock();
    return { title: SRC.windowTitle.replace('{years}', pn.years).replace('{title}', pn.title), lines };
  }

  let srcEra = 0;
  let srcLabel: string | null = null;
  let srcPage = 0;
  function drawSource(): void {
    hits.length = 0;
    const was = faceEra();
    const fe: FaceEra = srcEra === 0 ? 'e1' : (`e${srcEra}` as FaceEra);
    setFaceEra(fe);
    const { title, lines } = sourceLines(srcEra, srcLabel);
    // the desktop, the window, and the ink — each room's own
    let area: { x: number; y: number; w: number; h: number };
    let ink: string = ERA1.black, dim: string = ERA1.greyDark, head: string = ERA1.navy, mine: string = ERA1.warnDark;
    const wx = 14, wy = 12, ww = W - 28, wh = H - 24;
    if (srcEra === 3) {
      px(ctx, 0, 0, W, H, ERA3.deskMid);
      area = aeroFrame(ctx, wx, wy, ww, wh, title);
      ink = ERA3.titleText; dim = ERA3.frame; head = ERA3.deskMid; mine = ERA3.deskTop;
    } else if (srcEra === 4) {
      px(ctx, 0, 0, W, H, ERA4.field);
      px(ctx, wx, wy, ww, wh, ERA4.panelEdge);
      px(ctx, wx + 1, wy + 1, ww - 2, wh - 2, ERA4.panel);
      px(ctx, wx + 1, wy + 1, ww - 2, 22, ERA4.panelHi);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      ctx.fillText(title, wx + 10, wy + 6);
      area = { x: wx + 10, y: wy + 30, w: ww - 20, h: wh - 38 };
      ink = ERA4.text; dim = ERA4.dim; head = ERA4.meta; mine = ERA4.textHi;
    } else {
      px(ctx, 0, 0, W, H, srcEra === 0 ? DIALOG.screenDark : srcEra === 2 ? ERA1.titleBlue : ERA1.teal);
      const c = windowFrame(ctx, wx, wy, ww, wh, title);
      area = { x: c.x + 4, y: c.y + 4, w: c.w - 8, h: c.h - 8 };
    }
    // wrap, then page: the button row keeps the foot of the window
    setFont(ctx, 10);
    const rows: Line[] = [];
    for (const l of lines) {
      if (l.k === 'head' && rows.length) rows.push({ t: '', k: 'body' });
      for (const w of wrapText(ctx, l.t, area.w)) rows.push({ t: w, k: l.k });
    }
    const LH = 13;
    const perPage = Math.max(1, Math.floor((area.h - 32) / LH));
    const pages = Math.max(1, Math.ceil(rows.length / perPage));
    srcPage = srcPage % pages;
    let y = area.y;
    for (const r of rows.slice(srcPage * perPage, (srcPage + 1) * perPage)) {
      ctx.fillStyle = r.k === 'head' ? head : r.k === 'dim' ? dim : r.k === 'mine' ? mine : ink;
      ctx.fillText(r.t, area.x, y);
      y += LH;
    }
    // Back, and More when the dossier runs past one page
    const btn = (label: string, x: number, id: string): void => {
      const by = area.y + area.h - 24, bw = 80;
      if (srcEra >= 3) {
        px(ctx, x, by, bw, 22, srcEra === 3 ? ERA3.glassEdge : ERA4.chipEdge);
        px(ctx, x + 1, by + 1, bw - 2, 20, srcEra === 3 ? ERA3.titleA : ERA4.chip);
        ctx.fillStyle = srcEra === 3 ? ERA3.titleText : ERA4.chipText;
      } else {
        bevel(ctx, x, by, bw, 22, true);
        ctx.fillStyle = ERA1.black;
      }
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, Math.round(x + (bw - tw) / 2), by + 6);
      hits.push({ x, y: by, w: bw, h: 22, id });
    };
    btn(SRC.back, area.x + area.w - 80, 'close-src-back');
    if (pages > 1) {
      btn(`${SRC.more} ${srcPage + 1}/${pages}`, area.x + area.w - 172, 'close-src-more');
    }
    setFaceEra(was);
    tex.upload();
  }

  let on = false;
  let rise = 0;
  let near = false;
  let face: 'card' | 'receipt' | 'source' = 'card';
  const api: CloseMonitor = {
    entity,
    get on() { return on; },
    get near() { return near; },
    get glass() { return glassWorld; },
    get silhouette() { return silhouette; },
    get hits() { return on && rise >= 1 ? hits : []; },   // pressable only once lit
    present(): void {
      // R3-109 ("in Daniel's place, the computer should be there"): the dark body
      // stands in the sky before it is lit — a CRT-shaped shadow, no glass yet
      if (on) return;
      glassMat.emissive.set(0, 0, 0);
      glassMat.update();
      bodyMat.emissive.set(0.09, 0.09, 0.09);   // × the vertex colour (S174)
      bodyMat.update();
      entity.enabled = true;
    },
    setNear(n: boolean): void {
      if (near === n) return;
      near = n;
      if (on) { if (!near) drawFar(); else if (face === 'receipt') drawReceipt(); else if (face === 'source') drawSource(); else drawCard(); }
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
      face = 'card';
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
      bodyMat.emissive.set(0.8 * k, 0.8 * k, 0.8 * k);   // and lighter again (2026-09-13); × the vertex colour since S174
      bodyMat.update();
    },
    openSource(era: number, label: string | null): void {
      if (!on) return;
      face = 'source';
      srcEra = Math.max(0, Math.min(4, era | 0));
      srcLabel = label;
      srcPage = 0;
      if (near) drawSource(); else api.onGo?.();
    },
    press(x: number, y: number): boolean {
      for (const h of api.hits) {
        if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
        if (h.id === 'close-go') { api.onGo?.(); return true; }
        if (h.id === 'close-again') { api.onAgain?.(); return true; }
        if (h.id === 'close-receipt') { face = 'receipt'; drawReceipt(); return true; }
        if (h.id === 'close-back') { face = 'card'; drawCard(); return true; }
        if (h.id === 'close-dossier') { api.onDossier?.(); return true; }
        if (h.id === 'close-src-back') { face = 'card'; drawCard(); return true; }
        if (h.id === 'close-src-more') { srcPage++; drawSource(); return true; }
        const era = card.eras.find((e) => `close-era-${e.era}` === h.id)?.era;
        if (era) { api.onEra?.(era as EraKey); return true; }
      }
      return false;
    }
  };
  return api;
}
