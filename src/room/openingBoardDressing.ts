import * as pc from 'playcanvas';
import { hasModel, spawnModel } from './assets';

interface OpeningBoardDressing {
  root: pc.Entity;
  setVisible: (visible: boolean) => void;
  setMode: (mode: OpeningBoardMode) => void;
}

export type OpeningBoardMode = 'intro' | 'profile' | 'witness';

const BOARD = { x: -0.86, y: 1.5, z: 3.66, w: 2.06, h: 1.48 };

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

function makeModelUnlit(root: pc.Entity): void {
  root.forEach((node) => {
    const ent = node as pc.Entity;
    if (!ent.render) return;
    for (const mi of ent.render.meshInstances) {
      const m = mi.material as pc.StandardMaterial | undefined;
      if (!m) continue;
      const clone = m.clone() as pc.StandardMaterial;
      clone.useLighting = false;
      clone.emissive = clone.diffuse ? clone.diffuse.clone() : new pc.Color(1, 1, 1);
      if (clone.diffuseMap) clone.emissiveMap = clone.diffuseMap;
      clone.update();
      mi.material = clone;
    }
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
      makeModelUnlit(model);
      root.addChild(model);
    }
  } else {
    box('opening-board-fallback-cork', root, [BOARD.x, BOARD.y, BOARD.z + 0.03], [BOARD.w, BOARD.h, 0.05], '#a86e3d');
    box('opening-board-fallback-frame-top', root, [BOARD.x, BOARD.y + BOARD.h / 2 + 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#6f4323');
    box('opening-board-fallback-frame-bottom', root, [BOARD.x, BOARD.y - BOARD.h / 2 - 0.035, BOARD.z], [BOARD.w + 0.1, 0.07, 0.08], '#4e2d17');
    box('opening-board-fallback-frame-left', root, [BOARD.x - BOARD.w / 2 - 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#8b5a32');
    box('opening-board-fallback-frame-right', root, [BOARD.x + BOARD.w / 2 + 0.035, BOARD.y, BOARD.z], [0.07, BOARD.h + 0.1, 0.08], '#4e2d17');
  }

  return {
    root,
    setVisible: (visible: boolean) => { root.enabled = visible; },
    setMode: () => { /* the canvas overlay owns text/state; the asset remains the same board */ }
  };
}
