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

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * The §1-rule-2 material split (REINTERP_3D_STYLE_DIRECTION §2-E1): the system's
 * instruments stay crisp & color-true and slightly self-defined; personal props
 * go soft — desaturated, darkened, warm-nudged, so their edges don't fully
 * resolve. Vertex-color/flat only, no textures — the "softness" is colour, not
 * geometry (literal larger bevels = V2 prop dressing). Classification by id.
 */
type StyleTier = 'hero' | 'system' | 'personal' | 'fog' | 'set';

function classifyProp(id: string): StyleTier {
  const is = (...pre: string[]): boolean => pre.some(p => id.startsWith(p));
  if (is('crt', 'kit')) return 'hero';                 // monitor + starter kit (≤3 hero)
  if (is('tower', 'keyboard', 'mouse', 'modem')) return 'system'; // the apparatus's gear
  if (is('sodaCan', 'homeworkPile')) return 'fog';     // incidental floor clutter
  if (is('bed', 'mattress', 'blanket', 'pillow', 'poster', 'boombox',
         'mixtape', 'book', 'cdStack', 'curtain', 'rug')) return 'personal';
  return 'set';                                        // desk/shelf/door/chair/lamp/shell — left true
}

/** desaturate → warm-nudge → darken; `amt` scales how far the edge recedes */
function muteColor(c: pc.Color, amt: number): pc.Color {
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const d = amt * 0.7;
  let r = c.r + (lum - c.r) * d;
  const g = c.g + (lum - c.g) * d;
  let b = c.b + (lum - c.b) * d;
  r = r + 0.05 * amt; b = b - 0.035 * amt;             // personal props live in warm light
  const dark = 1 - amt * 0.16;
  return new pc.Color(clamp01(r * dark), clamp01(g * dark), clamp01(b * dark));
}

/** apply the split to a non-emissive prop material (reinterp only) */
function styleMaterial(material: pc.StandardMaterial, id: string): void {
  switch (classifyProp(id)) {
    case 'personal': material.diffuse = muteColor(material.diffuse, 0.32); break;
    case 'fog':      material.diffuse = muteColor(material.diffuse, 0.50); break;
    case 'hero':     // stays crisp/true; a faint self-emissive keeps it the most-defined thing
      material.emissive = new pc.Color(material.diffuse.r * 0.10, material.diffuse.g * 0.10, material.diffuse.b * 0.10);
      break;
    // 'system' + 'set': left color-true (crisp)
  }
}

export function buildEra1Room(app: pc.Application, reinterp = false): void {
  const root = new pc.Entity('era1-room');

  for (const p of layout.props as PropDef[]) {
    const material = new pc.StandardMaterial();
    if (p.emissive) {
      material.useLighting = false;
      material.diffuse = new pc.Color(0, 0, 0);
      material.emissive = hex(p.color);
    } else {
      material.diffuse = hex(p.color);
      if (reinterp) styleMaterial(material, p.id); // §2-E1 soft/crisp split
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
