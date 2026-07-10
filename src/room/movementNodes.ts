/**
 * Movement nodes — R28-1 movement prototype
 * (docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md §2 "conducted movement").
 *
 * "The player always steers; the system curates where steering can take
 * you." This module owns the NODE GRAPH's geometry + gating query only: a
 * quiet floor marker at each AVAILABLE destination (never the seat you're
 * already at), data-driven per era from data/room/nodes.json. It does NOT
 * own the camera — the actual cut lives in src/engine/app.ts's
 * `requestMove(nodeId)`, the one seam a future Quest thumbstick+trigger path
 * (xr-standard mapping, R28 §2) will call into instead of a click.
 *
 * Soft Lo-Fi law: flat lit disc, no emissive glow, no pulse, no icons — a
 * quiet affordance, not a game-HUD waypoint. Palette-only color (ERA1.silver,
 * already an approved hex — never invented).
 */
import * as pc from 'playcanvas';
import nodesData from '../../data/room/nodes.json';
import { ERA1 } from '../desktop/theme/era1';
import type { EraKey } from './cluster';

export interface MovementNode {
  id: string;
  seatYaw: number;
  label: string;
  marker: [number, number, number];
  eras: EraKey[];
}

export interface MovementNodes {
  readonly nodes: MovementNode[];
  /** nodes offered this era, excluding whichever node sits at `currentYaw`
   *  (never offer a marker for where you're already standing) */
  available(era: EraKey, currentYaw: number): MovementNode[];
  find(id: string): MovementNode | undefined;
  /** call once a frame: shows/hides each marker per the live gating.
   *  `suppressed` = true while any scripted camera move runs (O2 pan, update
   *  dollies/cascades, the TURN, enterClose) or the opening wall is up. */
  refresh(era: EraKey, currentYaw: number, suppressed: boolean): void;
}

const MARKER_DIAMETER = 0.44; // 0.22m radius disc — small, quiet
const MARKER_HEIGHT = 0.02;

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function buildMovementNodes(app: pc.Application): MovementNodes {
  const root = new pc.Entity('movement-nodes');
  app.root.addChild(root);

  const nodes = (nodesData.nodes as unknown) as MovementNode[];

  // one shared, unlit-free flat material — Soft Lo-Fi: it takes the room's
  // existing light rig like any other prop, no self-emissive hotspot, no
  // pulse. Semi-transparent so it reads as a floor marking, not a solid puck.
  const mat = new pc.StandardMaterial();
  mat.diffuse = hex(ERA1.silver);
  mat.opacity = 0.6;
  mat.blendType = pc.BLEND_NORMAL;
  mat.depthWrite = false;
  mat.update();

  const entities = new Map<string, pc.Entity>();
  for (const n of nodes) {
    const e = new pc.Entity(`node-${n.id}`);
    e.addComponent('render', { type: 'cylinder' });
    if (e.render) {
      e.render.material = mat;
      e.render.castShadows = false; // Quest law: no realtime shadows
    }
    e.setLocalPosition(n.marker[0], n.marker[1], n.marker[2]);
    e.setLocalScale(MARKER_DIAMETER, MARKER_HEIGHT, MARKER_DIAMETER);
    e.enabled = false; // refresh() decides visibility every frame
    root.addChild(e);
    entities.set(n.id, e);
  }

  function available(era: EraKey, currentYaw: number): MovementNode[] {
    return nodes.filter(n => n.eras.includes(era) && n.seatYaw !== currentYaw);
  }

  return {
    nodes,
    available,
    find: (id) => nodes.find(n => n.id === id),
    refresh(era, currentYaw, suppressed) {
      const shown = suppressed ? new Set<string>() : new Set(available(era, currentYaw).map(n => n.id));
      for (const [id, e] of entities) e.enabled = shown.has(id);
    }
  };
}
