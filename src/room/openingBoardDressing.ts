import * as pc from 'playcanvas';
import { hasModel, spawnModel } from './assets';

interface OpeningBoardDressing {
  root: pc.Entity;
  setVisible: (visible: boolean) => void;
  setMode: (mode: OpeningBoardMode) => void;
}

export type OpeningBoardMode = 'intro' | 'profile' | 'witness';

const BOARD = { x: -0.86, y: 1.5, z: 3.66, w: 2.06, h: 1.48 };
const OVERLAY = { x: -0.86, y: 1.43, w: 1.5, h: 1.125 };
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

function layer(name: string, parent: pc.Entity): pc.Entity {
  const e = new pc.Entity(name);
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

function overlayPoint(u: number, v: number): [number, number, number] {
  return [
    OVERLAY.x + (u - 0.5) * OVERLAY.w,
    OVERLAY.y + (0.5 - v) * OVERLAY.h,
    FRONT_Z
  ];
}

function flatPaper(parent: pc.Entity, name: string, u: number, v: number, w: number, h: number, fill: string, pinHex: string): void {
  const [x, y, z] = boardPoint(u, v);
  box(name, parent, [x, y, z], [w, h, 0.012], fill);
  box(`${name}-shadow`, parent, [x + 0.012, y - 0.012, z + 0.012], [w, h, 0.006], '#5b341d');
  pin(`${name}-pin`, parent, x, y + h * 0.44, pinHex);
}

function overlayPaper(parent: pc.Entity, name: string, u: number, v: number, w: number, h: number, fill: string, pinHex: string): void {
  const [x, y, z] = overlayPoint(u, v);
  box(name, parent, [x, y, z], [w, h, 0.012], fill);
  box(`${name}-shadow`, parent, [x + 0.012, y - 0.012, z + 0.012], [w, h, 0.006], '#5b341d');
  pin(`${name}-pin`, parent, x, y + h * 0.44, pinHex);
}

function looseStack(parent: pc.Entity, name: string, u: number, v: number, w: number, h: number, fill: string, pinHex: string): void {
  const [x, y, z] = boardPoint(u, v);
  box(`${name}-back`, parent, [x + 0.032, y - 0.024, z + 0.022], [w, h, 0.008], '#d9bd75');
  box(`${name}-mid`, parent, [x + 0.018, y - 0.01, z + 0.01], [w * 0.98, h * 0.98, 0.008], '#ffd878');
  box(name, parent, [x, y, z], [w, h, 0.012], fill);
  pin(`${name}-pin`, parent, x - w * 0.34, y + h * 0.43, pinHex);
}

function overlayStack(parent: pc.Entity, name: string, u: number, v: number, w: number, h: number, fill: string, pinHex: string): void {
  const [x, y, z] = overlayPoint(u, v);
  box(`${name}-back`, parent, [x + 0.032, y - 0.024, z + 0.022], [w, h, 0.008], '#d9bd75');
  box(`${name}-mid`, parent, [x + 0.018, y - 0.01, z + 0.01], [w * 0.98, h * 0.98, 0.008], '#ffd878');
  box(name, parent, [x, y, z], [w, h, 0.012], fill);
  pin(`${name}-pin`, parent, x - w * 0.34, y + h * 0.43, pinHex);
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
    if (ent.render) {
      ent.render.material = cork;
      for (const mi of ent.render.meshInstances) mi.material = cork;
    }
  });
}

function setTreeVisible(root: pc.Entity, visible: boolean): void {
  root.enabled = visible;
}

export function buildOpeningBoardDressing(app: pc.Application): OpeningBoardDressing {
  const root = new pc.Entity('opening-board-dressing');
  root.enabled = false;
  app.root.addChild(root);
  const base = layer('opening-board-base-layer', root);
  const intro = layer('opening-board-intro-layer', root);
  const profile = layer('opening-board-profile-layer', root);
  const witness = layer('opening-board-witness-layer', root);

  if (hasModel('opening_corkboard')) {
    const model = spawnModel('opening_corkboard', [BOARD.x, BOARD.y, BOARD.z + 0.03], 180);
    if (model) {
      model.name = 'opening-board-model';
      flattenMaterials(model);
      base.addChild(model);
    }
  } else {
    box('opening-board-fallback-cork', base, [BOARD.x, BOARD.y, BOARD.z + 0.03], [BOARD.w, BOARD.h, 0.05], '#a86e3d');
    box('opening-board-fallback-frame-top', base, [BOARD.x, BOARD.y + BOARD.h / 2 + 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#6f4323');
    box('opening-board-fallback-frame-bottom', base, [BOARD.x, BOARD.y - BOARD.h / 2 - 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#4e2d17');
    box('opening-board-fallback-frame-left', base, [BOARD.x - BOARD.w / 2 - 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#8b5a32');
    box('opening-board-fallback-frame-right', base, [BOARD.x + BOARD.w / 2 + 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#4e2d17');
  }

  // The margins are suggestive apparatus material, not evidence: no real logos,
  // no real people, and no readable survivor-adjacent testimony. O1 and O3 use
  // this same physical surface; the witness canvas only supplies paper overlays.
  looseStack(base, 'opening-note-safe', 0.18, 0.22, 0.24, 0.12, '#b9d7a0', '#2f9c51');
  flatPaper(base, 'opening-note-normal', 0.83, 0.25, 0.22, 0.12, '#efcf4a', '#315db5');
  flatPaper(base, 'opening-note-questions', 0.84, 0.70, 0.28, 0.14, '#e7dcc5', '#2f9c51');
  polaroid(base, 'opening-polaroid-couple-a', 0.17, 0.48, '#b7c4b7', '#2f9c51');
  polaroid(base, 'opening-polaroid-couple-b', 0.84, 0.48, '#caa08b', '#315db5');

  for (const [i, u] of [0.07, 0.18, 0.31, 0.69, 0.82, 0.93].entries()) {
    pin(`opening-loose-pin-${i}`, base, BOARD.x + (u - 0.5) * BOARD.w, BOARD.y + 0.63, i % 2 ? '#d0a315' : '#aa2a2a');
  }

  overlayStack(intro, 'opening-intro-main-paper', 0.50, 0.42, 1.12, 0.48, '#f3ead3', '#d0a315');
  overlayPaper(intro, 'opening-intro-title-strip', 0.50, 0.12, 0.42, 0.10, '#fff3cc', '#d0a315');
  overlayPaper(intro, 'opening-intro-control-strip', 0.50, 0.68, 1.14, 0.07, '#e7d1a6', '#aa2a2a');
  overlayPaper(intro, 'opening-option-browser', 0.586, 0.788, 0.25, 0.09, '#f1a12a', '#aa2a2a');
  overlayPaper(intro, 'opening-option-vr', 0.758, 0.788, 0.20, 0.09, '#efe7d4', '#315db5');
  overlayPaper(intro, 'opening-option-auto-on', 0.664, 0.865, 0.13, 0.08, '#c7ddeb', '#315db5');
  overlayPaper(intro, 'opening-option-auto-off', 0.773, 0.865, 0.13, 0.08, '#efcf4a', '#aa2a2a');
  overlayPaper(intro, 'opening-option-leave', 0.156, 0.941, 0.21, 0.09, '#b9d7a0', '#2f9c51');
  overlayPaper(intro, 'opening-option-continue', 0.842, 0.941, 0.28, 0.10, '#f1a12a', '#aa2a2a');

  overlayPaper(profile, 'profile-card-icon', 0.215, 0.326, 0.40, 0.25, '#efe7d4', '#d0a315');
  overlayPaper(profile, 'profile-card-chip-1', 0.575, 0.292, 0.48, 0.20, '#efe7d4', '#315db5');
  overlayPaper(profile, 'profile-card-chip-2', 0.575, 0.549, 0.48, 0.20, '#efe7d4', '#2f9c51');
  overlayPaper(profile, 'profile-card-chip-3', 0.575, 0.806, 0.48, 0.20, '#efe7d4', '#aa2a2a');
  overlayPaper(profile, 'profile-card-goal', 0.260, 0.778, 0.36, 0.25, '#efe7d4', '#315db5');
  overlayPaper(profile, 'profile-title-strip', 0.193, 0.101, 0.42, 0.10, '#fff3cc', '#d0a315');

  box('witness-board-shadow', witness, [BOARD.x + 0.015, BOARD.y - 0.018, FRONT_Z + 0.014], [1.56, 1.12, 0.012], '#05050a');
  box('witness-board-dark-field', witness, [BOARD.x, BOARD.y, FRONT_Z], [1.5, 1.08, 0.014], '#090914');
  flatPaper(witness, 'witness-board-file-tab', 0.78, 0.17, 0.18, 0.07, '#111123', '#315db5');

  return {
    root,
    setVisible: (visible: boolean) => { root.enabled = visible; },
    setMode: (mode: OpeningBoardMode) => {
      setTreeVisible(intro, mode === 'intro');
      setTreeVisible(profile, mode === 'profile');
      setTreeVisible(witness, mode === 'witness');
    }
  };
}
