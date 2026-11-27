/**
 * ⚑ S396 (UiB job 28 Part B4) — WHAT THE SEAT CANNOT SEE IS NOT DRAWN.
 *
 * Measured (tools/s396-drawcalls-probe.mjs, the seated XR mock): from Vera's seat in 2016, the head turned back toward the
 * hall drew 123–125 calls against a budget of 75; from Maya's seat in 2026 the turn back drew 80. The engine culls by the
 * camera's frustum only, and from a seat at one end of a row of three rooms the frustum holds all three: in 2016 the whole
 * of Maya's room was drawn — her bed, rug, posters, curtains, flags, ~35 calls — behind the closed wall Room 1 still has on
 * its east side (cluster.ts: "Room 3 arrives with its own era"), and Daniel's back corner behind the doorway's jambs. This
 * alone takes Vera's worst look to ~90 and Maya's to ~66; batching.ts's vertex-colour merge does the rest (S396).
 *
 * THE BUILDING IS THREE BOXES IN A ROW (gen_rooms / reinterp_deltas): Room 1 (Daniel) in the middle, x ±2.13; Room 2
 * (Vera) to the west, Room 3 (Maya) to the east. The only ways between them are Room 1's side faces at x = ±2.13, each
 * either a full wall (`wallWest` / `wallEast`, eras 1–2, and the east one still in 2016) or a doorway made of four pieces
 * (`w1doorFront|Back|Lintel|Cap`, the same with `e1`) whose opening is z −0.12…2.42, floor to 2.14 m. The player never walks;
 * the eye is a seat (and a seated head).
 *
 * So, per camera, before the engine culls (Scene EVENT_PRECULL): if the eye is inside one room (away from a doorway), a
 * mesh instance lying wholly inside ANOTHER room is drawn only if a line from the eye (a box ±10 cm around it — both eyes,
 * and the head's drift within the frame) can pass every face between them: none through a closed wall; through a doorway
 * only inside its opening. The opening test is exact for each axis on its own (the crossing point of a segment between two
 * boxes, at a plane, ranges over an interval whose ends are at the boxes' corners), and the two axes are tested separately,
 * so the test only ever errs toward drawing. Everything it cannot place stays exactly as it was: a mesh straddling two rooms
 * (the batches that span the building, the walls, the doorways), anything outside the three boxes (the sky, the stars, the
 * Close's row, the Commons), anything drawn through walls (`depthTest` off), anything the engine is told not to cull
 * (`cull` false: the motes, whose bounds are a point), and every layer but World.
 *
 * ⚑ IT TRUSTS NOTHING IT DID NOT MEASURE THIS FRAME. The walls are read from the room each frame: a face counts as closed
 * only while its wall is present (enabled, drawable scale), opaque (the travel clearance fades walls — cluster.ts
 * `updateTravelClearance`) and covers the face; a doorway only while its four pieces are; and nothing is culled at all unless
 * the walls that make the row a row are there (Room 1's north wall and spine, each side room's two long walls and floor).
 * A morph scaling a wall, the glitch's jitter, the Commons switching the rooms off, ?layout=x opening the spine, an era
 * whose side rooms do not exist yet — each of these simply turns the cull off for the face it touches.
 *
 * ⚑ HOW IT HIDES, AND WHY IT CANNOT LEAK: `meshInstance.visible = false` between this camera's precull and postcull, and
 * back to true in postcull — only the engine's cull runs between the two events. It never touches a render component, a
 * layer, a batch or a material, and it skips any instance already invisible (cullAbsentProps' zero-scale props), so it
 * cannot fight the batcher, the morph or the absent-prop cull.
 *
 * Proof (tools/s396-drawcalls-probe.mjs): every photographed pose is rendered twice in one frame, the cull off then on,
 * and the two pictures are compared pixel by pixel — 0 differ. ROLLBACK: `?noseatcull=1` (the A/B, like ?nobatch=1), or
 * delete this file and its mount in app.ts.
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';

/** the eye is a box this many metres each way around the camera: both eyes (IPD/2 ≈ 0.032) and the head within a frame */
const EYE_PAD = 0.1;
/** the eye this close to a face between rooms (or outside every room) culls nothing: it is in the doorway */
const DOOR_MARGIN = 0.2;
/** a wall must cover a face to within this (the pieces overlap each other by a few cm) */
const COVER_TOL = 0.02;

interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
type Region = 'W' | 'C' | 'E';
/** a face between Room 1 and a side room: closed, a doorway (its opening), or unknown (nothing may be culled across it) */
type Face = { kind: 'closed'; x: number } | { kind: 'door'; x: number; z0: number; z1: number; yTop: number } | { kind: 'unknown' };

/** the props that make the row a row (data/room/reinterp_deltas.json, era1.json) */
const CENTRE = { floor: 'floor', ceiling: 'ceiling', north: 'wallNorth', south: 'spineWall' } as const;
const SIDES = {
  W: { wall: 'wallWest', front: 'w1doorFront', back: 'w1doorBack', lintel: 'w1doorLintel', cap: 'w1doorCap', floor: 'w_floor', ceil: 'w_ceil', long: ['w_wallL', 'w_wallR'] },
  E: { wall: 'wallEast', front: 'e1doorFront', back: 'e1doorBack', lintel: 'e1doorLintel', cap: 'e1doorCap', floor: 'e_floor', ceil: 'e_ceil', long: ['e_wallL', 'e_wallR'] }
} as const;

export interface SeatCull {
  /** false = draw everything the frustum holds (the probe's A/B; ?noseatcull=1 starts it false) */
  enabled: boolean;
  /** what the last camera's cull did: the eye's room, the faces as read, how many instances it hid */
  readonly last: { camera: string; eye: number[] | null; region: Region | null; faces: Record<'W' | 'E', string>; hidden: number; considered: number };
  destroy(): void;
}

export function mountSeatCull(app: pc.AppBase, room: RoomHandles, enabled = true): SeatCull {
  const world = app.scene.layers.getLayerByName('World');
  const hidden: pc.MeshInstance[] = [];
  const stageInv = new pc.Mat4(), rel = new pc.Mat4(), tmp = new pc.BoundingBox(), eyeV = new pc.Vec3();
  let stage: pc.GraphNode | null = null;
  const last: SeatCull['last'] = { camera: '', eye: null, region: null, faces: { W: 'unknown', E: 'unknown' }, hidden: 0, considered: 0 };

  const boxOf = (b: pc.BoundingBox, out: Box = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 }): Box => {
    const c = b.center, h = b.halfExtents;
    out.x0 = c.x - h.x; out.x1 = c.x + h.x; out.y0 = c.y - h.y; out.y1 = c.y + h.y; out.z0 = c.z - h.z; out.z1 = c.z + h.z;
    return out;
  };
  /** scratch: the eye's box and each instance's, reused every frame (nothing allocated per instance) */
  const eye: Box = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 }, t: Box = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
  /** a prop's box in ROOM coordinates (the headset's presentation space taken off), or null if it is not there to block */
  const solid = (id: string): Box | null => {
    const h = room.props.get(id);
    const e = h?.entity;
    if (!e || !e.enabled || !e.render || !e.render.enabled) return null;
    const s = e.getLocalScale();
    if (Math.abs(s.x) < 1e-4 || Math.abs(s.y) < 1e-4 || Math.abs(s.z) < 1e-4) return null;
    const mi = e.render.meshInstances[0];
    const m = mi?.material as pc.StandardMaterial | undefined;
    if (!mi || !m || m.opacity < 0.999 || m.blendType !== pc.BLEND_NONE || m.alphaTest > 0 || m.opacityMap) return null;
    // the box mesh's own bounds through the prop's transform relative to the stage: exact for the rooms' 90° placements
    rel.mul2(stageInv, e.getWorldTransform());
    tmp.setFromTransformedAabb(mi.mesh.aabb, rel);
    return boxOf(tmp);
  };
  const covers = (b: Box | null, z0: number, z1: number, y0: number, y1: number, x: number): boolean =>
    !!b && b.x0 - COVER_TOL <= x && b.x1 + COVER_TOL >= x && b.z0 <= z0 + COVER_TOL && b.z1 >= z1 - COVER_TOL && b.y0 <= y0 + COVER_TOL && b.y1 >= y1 - COVER_TOL;

  /** the row as it stands this frame (null = not a row: cull nothing) */
  let topoFrame = -1;
  let topo: { boxes: Partial<Record<Region, Box>>; shrunk: Partial<Record<Region, Box>>; faces: Record<'W' | 'E', Face> } | null = null;
  const readTopology = (): typeof topo => {
    const floor = solid(CENTRE.floor), ceil = solid(CENTRE.ceiling), north = solid(CENTRE.north), south = solid(CENTRE.south);
    if (!floor || !ceil || !north || !south) return null;
    const C: Box = { x0: floor.x0, x1: floor.x1, y0: floor.y1, y1: ceil.y0, z0: floor.z0, z1: floor.z1 };
    // Room 1's own north and south walls must close its long sides (the deduction below needs them)
    if (!covers(north, C.z0, C.z0, C.y0, C.y1, north.x0) || north.x0 > C.x0 + COVER_TOL || north.x1 < C.x1 - COVER_TOL) return null;
    if (!covers(south, C.z1, C.z1, C.y0, C.y1, south.x0) || south.x0 > C.x0 + COVER_TOL || south.x1 < C.x1 - COVER_TOL) return null;
    const boxes: Partial<Record<Region, Box>> = { C };
    const faces: Record<'W' | 'E', Face> = { W: { kind: 'unknown' }, E: { kind: 'unknown' } };
    for (const key of ['W', 'E'] as const) {
      const S = SIDES[key], x = key === 'W' ? C.x0 : C.x1;
      const sf = solid(S.floor), sc = solid(S.ceil), l0 = solid(S.long[0]), l1 = solid(S.long[1]);
      if (!sf || !sc || !l0 || !l1) continue;   // the side room is not built (eras 1–2) or not whole: nothing culled there
      const B: Box = key === 'W' ? { x0: sf.x0, x1: x, y0: sf.y1, y1: sc.y0, z0: sf.z0, z1: sf.z1 } : { x0: x, x1: sf.x1, y0: sf.y1, y1: sc.y0, z0: sf.z0, z1: sf.z1 };
      // its long walls close its north and south along its whole length
      const longOk = [l0, l1].every((w) => w.x0 <= B.x0 + COVER_TOL && w.x1 >= B.x1 - COVER_TOL && w.y0 <= B.y0 + COVER_TOL && w.y1 >= Math.min(B.y1, C.y1) - COVER_TOL);
      const zs = [l0, l1].map((w) => (w.z0 + w.z1) / 2).sort((a, b) => a - b);
      if (!longOk || Math.abs(zs[0] - B.z0) > 0.05 || Math.abs(zs[1] - B.z1) > 0.05) continue;
      boxes[key] = B;
      // the face's shared stretch: where Room 1 and the side room meet (outside it, the long walls above close the line)
      const z0 = Math.max(C.z0, B.z0), z1 = Math.min(C.z1, B.z1), yTop = Math.max(C.y1, B.y1);
      const wall = solid(S.wall);
      if (covers(wall, z0, z1, 0, yTop, x)) { faces[key] = { kind: 'closed', x }; continue; }
      const front = solid(S.front), back = solid(S.back), lintel = solid(S.lintel), cap = solid(S.cap);
      if (!front || !back || !lintel || !cap) continue;
      const oz0 = front.z1, oz1 = back.z0, oTop = lintel.y0;
      if (oz1 <= oz0 || !covers(front, z0, oz0, 0, yTop, x) || !covers(back, oz1, z1, 0, yTop, x) || !covers(lintel, oz0, oz1, oTop, yTop, x)) continue;
      faces[key] = { kind: 'door', x, z0: oz0, z1: oz1, yTop: oTop };
    }
    const shrunk: Partial<Record<Region, Box>> = {};
    for (const [r, R] of Object.entries(boxes) as [Region, Box][]) shrunk[r] = { x0: R.x0 + DOOR_MARGIN, x1: R.x1 - DOOR_MARGIN, y0: R.y0, y1: R.y1, z0: R.z0 + DOOR_MARGIN, z1: R.z1 - DOOR_MARGIN };
    return { boxes, shrunk, faces };
  };

  /** the region a box lies wholly inside (slack outward, never across a face), or null */
  const regionOf = (b: Box, boxes: Partial<Record<Region, Box>>, slack: number): Region | null => {
    for (const r of ['C', 'W', 'E'] as const) {
      const R = boxes[r];
      if (!R) continue;
      const xIn = r === 'C' ? b.x0 >= R.x0 && b.x1 <= R.x1 : r === 'W' ? b.x1 <= R.x1 && b.x0 >= R.x0 - slack : b.x0 >= R.x0 && b.x1 <= R.x1 + slack;
      if (xIn && b.y0 >= R.y0 - 0.1 && b.y1 <= R.y1 + 0.05 && b.z0 >= R.z0 - slack && b.z1 <= R.z1 + slack) return r;
    }
    return null;
  };
  /** can any segment from the eye box to the target box pass this doorway's opening? (each axis exact on its own: the
   *  crossing point is monotone in every coordinate, so its range is spanned by the boxes' corners) */
  const through = (e: Box, t: Box, f: Face & { kind: 'door' }): boolean => {
    let zMin = Infinity, zMax = -Infinity, yMin = Infinity;
    for (let i = 0; i < 4; i++) {
      const ex = i & 1 ? e.x1 : e.x0, tx = i & 2 ? t.x1 : t.x0;
      const k = (f.x - ex) / (tx - ex);
      if (!(k > 0 && k <= 1)) return true;   // not on opposite sides: cannot judge, draw it
      for (let j = 0; j < 4; j++) {
        const ez = j & 1 ? e.z1 : e.z0, tz = j & 2 ? t.z1 : t.z0, z = ez + (tz - ez) * k;
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
        const ey = j & 1 ? e.y1 : e.y0, ty = j & 2 ? t.y1 : t.y0, y = ey + (ty - ey) * k;
        if (y < yMin) yMin = y;
      }
    }
    return zMax >= f.z0 && zMin <= f.z1 && yMin <= f.yTop;
  };
  const visibleFrom = (eye: Box, from: Region, to: Region, t: Box, faces: Record<'W' | 'E', Face>): boolean => {
    if (from === to) return true;
    const crossed: ('W' | 'E')[] = from === 'C' ? [to as 'W' | 'E'] : to === 'C' ? [from as 'W' | 'E'] : ['W', 'E'];
    for (const k of crossed) {
      const f = faces[k];
      if (f.kind === 'closed') return false;
      if (f.kind === 'door' && !through(eye, t, f)) return false;
    }
    return true;
  };

  const batchAabb = new Map<pc.MeshInstance, pc.BoundingBox>();
  const onPreCull = (cameraComponent: pc.CameraComponent): void => {
    if (!api.enabled || !world || hidden.length) return;
    const camera = cameraComponent?.camera;
    if (!camera || !cameraComponent.layers.includes(world.id)) return;
    stage ??= app.root.findByName('xr-world');
    if (stage) stageInv.copy(stage.getWorldTransform()).invert(); else stageInv.setIdentity();
    const identity = !stage || stageInv.equals(pc.Mat4.IDENTITY);
    if (topoFrame !== app.frame) {
      topoFrame = app.frame;
      topo = readTopology();
      // a static batch's own bounds are kept in room coordinates (xrComfort swaps the instance's for the draw)
      // ⚑ S430 (UiB job 39 E) — a DYNAMIC batch's are not: the engine refreshes them every frame from its props as they are drawn,
      //   in the headset's space (an era change's palette, batching.ts). Read as room coordinates they put the batch metres off
      //   wherever the presentation space is far from the room (a session begun in the stars). Its instance's own bounds are those
      //   same live ones, which the line below carries back to the room, as for any unbatched mesh.
      batchAabb.clear();
      const list = (app.batcher as unknown as { _batchList?: { meshInstance: pc.MeshInstance | null; _aabb: pc.BoundingBox; dynamic?: boolean }[] } | null)?._batchList ?? [];
      for (const b of list) if (b.meshInstance && !b.dynamic) batchAabb.set(b.meshInstance, b._aabb);
    }
    last.camera = cameraComponent.entity?.name ?? '';
    last.faces = { W: topo?.faces.W.kind ?? 'unknown', E: topo?.faces.E.kind ?? 'unknown' };
    last.hidden = 0; last.considered = 0; last.region = null; last.eye = null;
    if (!topo) return;
    stageInv.transformPoint(cameraComponent.entity.getPosition(), eyeV);
    last.eye = [eyeV.x, eyeV.y, eyeV.z].map((v) => +v.toFixed(3));
    eye.x0 = eyeV.x - EYE_PAD; eye.x1 = eyeV.x + EYE_PAD; eye.y0 = eyeV.y - EYE_PAD; eye.y1 = eyeV.y + EYE_PAD; eye.z0 = eyeV.z - EYE_PAD; eye.z1 = eyeV.z + EYE_PAD;
    // the eye's room, kept clear of its faces by the doorway margin
    const from = regionOf(eye, topo.shrunk, 0);
    last.region = from;
    if (!from) return;
    for (const mi of world.meshInstances) {
      if (!mi.visible || !mi.cull) continue;
      const m = mi.material;
      if (!m || m.depthTest === false) continue;
      const ba = batchAabb.get(mi);
      if (ba) boxOf(ba, t);
      else if (identity) boxOf(mi.aabb, t);
      else { tmp.setFromTransformedAabb(mi.aabb, stageInv); boxOf(tmp, t); }   // a little larger, never smaller
      const to = regionOf(t, topo.boxes, 0.05);
      if (!to || to === from) continue;
      last.considered++;
      if (visibleFrom(eye, from, to, t, topo.faces)) continue;
      mi.visible = false; hidden.push(mi);
    }
    last.hidden = hidden.length;
  };
  const onPostCull = (): void => {
    for (const mi of hidden) mi.visible = true;
    hidden.length = 0;
  };
  app.scene.on('precull', onPreCull);
  app.scene.on('postcull', onPostCull);
  const api: SeatCull = {
    enabled,
    last,
    destroy() { onPostCull(); app.scene.off('precull', onPreCull); app.scene.off('postcull', onPostCull); }
  };
  return api;
}
