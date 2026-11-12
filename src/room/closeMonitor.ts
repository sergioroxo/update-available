/** Daniel's machine at the Close — ⚑ S378: AN IMAGE IN THE SKY, NOTHING PRESSABLE.
 * Restored from 1387a6f3 (the retro Restart card on its glass, reached by a press on the far glass that flew the eye to
 * it). UiB job 20 Part A moved the card to the computer's own panel in the Close's row and its page in the site viewer
 * (src/room/machinePanel.ts, src/frame/siteViewer/machine.ts — the receipt's lines in src/witness/receiptLines.ts, the
 * Lexicon the one src/room/lexicon.ts); the far glass took presses meant for other things. What stays here is the dark
 * machine standing back in the sky in Daniel's place (R3-109), and the extents the sky keeps clear around it.
 */
import * as pc from 'playcanvas';
import { ERA1 } from '../desktop/theme/era1';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import layout from '../../data/room/era1.json';

export interface CloseMonitor {
  readonly entity: pc.Entity;
  /** ⚑ S163 / R3-109 — the dark machine stands back in the sky from the start of the Close */
  present(): void;
  hide(): void;
  /** the glass, in world space (centre + size) — where it stands (the sky keeps off the eye's line to it) */
  readonly glass: { x: number; y: number; z: number; w: number; h: number };
  /** ⚑ S174 / R4-15 — the whole machine's world extent (desk piece to bezel top),
   *  from its own mesh: what the sky must keep off the eye's line to it */
  readonly silhouette: { x: number; hx: number; yLo: number; yHi: number; z: number };
  /** ⚑ S377 / VISUAL_REVIEW #5 — is the machine standing in the sky at all? The sky is kept off the eye's line to it. */
  readonly shown: boolean;
  /** ⚑ S377 — the machine's world box (its own mesh's extent through its pose), published for the checks
   *  (tools/s377-close-check.mjs projects it through the live camera) */
  readonly bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  /** ⚑ S378 — it takes no press: there is no hit test, no `hits`, no fly-to (`onGo`). Kept false/empty for old probes. */
  readonly on: false;
  readonly hits: readonly never[];
}

/** the CRT's visible screen, as app.ts has it (metres, 4:3) */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
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

  // ── the glass: dark. ⚑ S378 (UiB job 20 Part A) — the machine stands in the sky as an IMAGE now. Until S378 its glass
  //   lit with the Restart card, and a press on the far glass flew the eye to it; the glass was a bare plane through the
  //   whole ray and caught presses meant for the panels and labels in front of it (his "phantom clicks"). The card and
  //   everything on it — the four rooms, Start again, the Receipt, the dossier, the Lexicon — moved to the computer's
  //   panel and its page in the site viewer (src/room/machinePanel.ts, src/frame/siteViewer/machine.ts). So the glass
  //   stays dark (it never lights: the light moved to the panel), and nothing here answers a press. ──
  const canvas = document.createElement('canvas');
  canvas.width = 4; canvas.height = 3;
  const gctx = canvas.getContext('2d');
  if (gctx) { gctx.fillStyle = ERA1.black; gctx.fillRect(0, 0, 4, 3); }
  const tex = makeScreenTexture(app, canvas, 'screen');
  const glass = makeScreenEntity('close-monitor-screen', tex, SCREEN.w, SCREEN.h);
  glass.setLocalPosition(SCREEN.x, SCREEN.y, SCREEN.z);
  glass.setLocalEulerAngles(90, 0, 0);   // faces +Z, the chair — as desktop-screen does
  entity.addChild(glass);
  const glassMat = glass.render!.material as pc.StandardMaterial;
  glassMat.emissive.set(0, 0, 0);
  glassMat.update();
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
  const offZ = CLOSE_MONITOR.farZ - SCREEN.z * S;
  const bounds = {
    min: { x: CLOSE_MONITOR.x + lo.x * S, y: lo.y * S + offY, z: lo.z * S + offZ },
    max: { x: CLOSE_MONITOR.x + hi.x * S, y: hi.y * S + offY, z: hi.z * S + offZ }
  };

  const api: CloseMonitor = {
    entity,
    get glass() { return glassWorld; },
    get silhouette() { return silhouette; },
    get shown() { return entity.enabled; },
    get bounds() { return bounds; },
    on: false,
    hits: [],
    present(): void {
      // R3-109 ("in Daniel's place, the computer should be there"): the dark body stands in the sky — a CRT-shaped
      // shadow, its case catching a little of the night (× the vertex colour, S174)
      bodyMat.emissive.set(0.09, 0.09, 0.09);
      bodyMat.update();
      entity.enabled = true;
    },
    hide(): void { entity.enabled = false; }
  };
  return api;
}
