/**
 * Era-1 room builder — flat-shaded low-poly blockout (SCRIPT_UPDATE v0.7 §2,
 * ERA1_LOGIC v1 §4). Every prop is a colored box read from
 * data/room/era1.json so Sérgio can rearrange the room by editing numbers.
 * Aesthetic law: flat color faces, no textures; pixel art lives on screens.
 */
import * as pc from 'playcanvas';
import layout from '../../data/room/era1.json';

interface PropDef {
  id: string;
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: boolean;
}

interface LightDef {
  id: string;
  type: 'omni' | 'directional';
  pos?: [number, number, number];
  rot?: [number, number, number];
  color: string;
  intensity: number;
  range?: number;
}

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function buildEra1Room(app: pc.Application): void {
  const root = new pc.Entity('era1-room');

  for (const p of layout.props as PropDef[]) {
    const material = new pc.StandardMaterial();
    if (p.emissive) {
      material.useLighting = false;
      material.diffuse = new pc.Color(0, 0, 0);
      material.emissive = hex(p.color);
    } else {
      material.diffuse = hex(p.color);
    }
    material.update();
    const e = new pc.Entity(p.id);
    e.addComponent('render', { type: 'box' });
    e.setLocalPosition(p.pos[0], p.pos[1], p.pos[2]);
    e.setLocalScale(p.size[0], p.size[1], p.size[2]);
    if (e.render) e.render.material = material;
    root.addChild(e);
  }

  for (const l of layout.lights as LightDef[]) {
    const e = new pc.Entity(`light-${l.id}`);
    e.addComponent('light', {
      type: l.type,
      color: hex(l.color),
      intensity: l.intensity,
      range: l.range ?? 10,
      castShadows: false
    });
    if (l.pos) e.setLocalPosition(l.pos[0], l.pos[1], l.pos[2]);
    if (l.rot) e.setLocalEulerAngles(l.rot[0], l.rot[1], l.rot[2]);
    root.addChild(e);
  }

  app.root.addChild(root);
}
