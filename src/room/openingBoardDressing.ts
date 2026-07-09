import * as pc from 'playcanvas';
import { hasModel, spawnModel } from './assets';

interface OpeningBoardDressing {
  root: pc.Entity;
  setVisible: (visible: boolean) => void;
}

const BOARD = { x: -0.86, y: 1.5, z: 3.66, w: 2.06, h: 1.48 };
const FRONT_Z = BOARD.z - 0.045;

function color(hex: string): pc.Color {
  const n = parseInt(hex.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function material(hex: string, unlit = false): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  if (unlit) {
    m.useLighting = false;
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = color(hex);
  } else {
    m.diffuse = color(hex);
  }
  m.update();
  return m;
}

function box(name: string, parent: pc.Entity, pos: [number, number, number], scale: [number, number, number], hex: string): pc.Entity {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box' });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(scale[0], scale[1], scale[2]);
  if (e.render) e.render.material = material(hex, true);
  parent.addChild(e);
  return e;
}

function pin(name: string, parent: pc.Entity, x: number, y: number, hex: string): void {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'sphere' });
  e.setLocalPosition(x, y, FRONT_Z - 0.018);
  e.setLocalScale(0.022, 0.022, 0.008);
  if (e.render) e.render.material = material(hex, true);
  parent.addChild(e);
}

function boardPoint(u: number, v: number): [number, number, number] {
  return [
    BOARD.x + (u - 0.5) * BOARD.w,
    BOARD.y + (0.5 - v) * BOARD.h,
    FRONT_Z
  ];
}

function flatPaper(parent: pc.Entity, name: string, u: number, v: number, w: number, h: number, fill: string, pinHex: string): void {
  const [x, y, z] = boardPoint(u, v);
  box(name, parent, [x, y, z], [w, h, 0.012], fill);
  box(`${name}-shadow`, parent, [x + 0.012, y - 0.012, z + 0.012], [w, h, 0.006], '#5b341d');
  pin(`${name}-pin`, parent, x, y + h * 0.44, pinHex);
}

function polaroid(parent: pc.Entity, name: string, u: number, v: number, tint: string, pinHex: string): void {
  const [x, y, z] = boardPoint(u, v);
  box(name, parent, [x, y, z], [0.18, 0.23, 0.012], '#efe7d4');
  box(`${name}-image`, parent, [x, y + 0.035, z - 0.012], [0.135, 0.105, 0.01], tint);
  box(`${name}-pair-a`, parent, [x - 0.028, y + 0.052, z - 0.022], [0.025, 0.035, 0.008], '#d9c7aa');
  box(`${name}-pair-b`, parent, [x + 0.028, y + 0.052, z - 0.022], [0.025, 0.035, 0.008], '#c7a4a4');
  pin(`${name}-pin`, parent, x, y + 0.12, pinHex);
}

function flattenMaterials(root: pc.Entity): void {
  const cork = material('#b17845', true);
  root.forEach((node) => {
    const ent = node as pc.Entity;
    if (ent.render) ent.render.material = cork;
  });
}

export function buildOpeningBoardDressing(app: pc.Application): OpeningBoardDressing {
  const root = new pc.Entity('opening-board-dressing');
  root.enabled = false;
  app.root.addChild(root);

  if (hasModel('opening_corkboard')) {
    const model = spawnModel('opening_corkboard', [BOARD.x, BOARD.y, BOARD.z + 0.03], 180);
    if (model) {
      model.name = 'opening-board-model';
      flattenMaterials(model);
      root.addChild(model);
    }
  } else {
    box('opening-board-fallback-cork', root, [BOARD.x, BOARD.y, BOARD.z + 0.03], [BOARD.w, BOARD.h, 0.05], '#a86e3d');
    box('opening-board-fallback-frame-top', root, [BOARD.x, BOARD.y + BOARD.h / 2 + 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#6f4323');
    box('opening-board-fallback-frame-bottom', root, [BOARD.x, BOARD.y - BOARD.h / 2 - 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#4e2d17');
    box('opening-board-fallback-frame-left', root, [BOARD.x - BOARD.w / 2 - 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#8b5a32');
    box('opening-board-fallback-frame-right', root, [BOARD.x + BOARD.w / 2 + 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#4e2d17');
  }

  // The margins are suggestive apparatus material, not evidence: no real logos,
  // no real people, and no readable survivor-adjacent testimony. O1 and O3 use
  // this same physical surface; the witness canvas only supplies paper overlays.
  flatPaper(root, 'opening-note-safe', 0.18, 0.22, 0.24, 0.12, '#b9d7a0', '#2f9c51');
  flatPaper(root, 'opening-note-normal', 0.83, 0.25, 0.22, 0.12, '#efcf4a', '#315db5');
  flatPaper(root, 'opening-note-before-after', 0.15, 0.72, 0.28, 0.14, '#e7dcc5', '#315db5');
  flatPaper(root, 'opening-note-questions', 0.84, 0.70, 0.28, 0.14, '#e7dcc5', '#2f9c51');
  flatPaper(root, 'opening-blue-slip', 0.31, 0.13, 0.18, 0.07, '#a7c6d8', '#d0a315');
  flatPaper(root, 'opening-orange-slip', 0.69, 0.87, 0.22, 0.08, '#f1a12a', '#aa2a2a');
  polaroid(root, 'opening-polaroid-couple-a', 0.17, 0.48, '#b7c4b7', '#2f9c51');
  polaroid(root, 'opening-polaroid-couple-b', 0.84, 0.48, '#caa08b', '#315db5');

  for (const [i, u] of [0.07, 0.18, 0.31, 0.69, 0.82, 0.93].entries()) {
    pin(`opening-loose-pin-${i}`, root, BOARD.x + (u - 0.5) * BOARD.w, BOARD.y + 0.63, i % 2 ? '#d0a315' : '#aa2a2a');
  }

  return {
    root,
    setVisible: (visible: boolean) => { root.enabled = visible; }
  };
}
