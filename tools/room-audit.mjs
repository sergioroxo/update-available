#!/usr/bin/env node
/**
 * ROOM AUDIT — the positional checker (Session 71).
 *
 * S66 found a bed inside a desk and a bookcase deeper than its own bounding
 * box by building a one-off in-engine solver, reporting the numbers, and
 * throwing the solver away. S67 found the E4 record landing outside Room 3 the
 * same way. This is that measurement, made permanent and runnable:
 *
 *     node tools/room-audit.mjs                 # every era state
 *     node tools/room-audit.mjs --state r3      # one state
 *     node tools/room-audit.mjs --json          # machine-readable
 *     node tools/room-audit.mjs --all           # include the quiet classes
 *
 * ⚑ IT NEEDS NO BROWSER AND NO DEPENDENCIES, which is the whole point: a check
 * that needs a headless Chrome gets run once and then never again. Every number
 * below is computed from the same three files the engine reads —
 * `data/room/era1.json`, `data/room/reinterp_deltas.json`,
 * `data/room/models.json` — plus the GLB meshes' own POSITION accessor min/max
 * (glTF stores them, so no mesh decoding is required). The fold is a port of
 * `clusterMorph.ts`'s `foldTargets`, and the placement maths is a port of
 * `assets.ts`'s `spawnModel`; if either of those changes, change this with it.
 *
 * WHAT IT REPORTS, worst first:
 *   SCALE     a prop whose RENDERED extent disagrees with its AUTHORED `size`.
 *             This is S66's bug class — a field honoured at both ends and
 *             dropped in the middle — and it is measured per axis, in the
 *             prop's OWN frame, because `size` is local and `yaw` rotates it
 *             afterwards. ⚑ Comparing a world-space measurement against a local
 *             `size` on a prop with yaw 90/270 reports a phantom 50% error on
 *             two axes; that mistake is why this tool states its frame.
 *   SURFACE   a prop penetrating a wall / floor / ceiling.
 *   OVERLAP   prop inside prop, with the penetration depth on its shallowest
 *             axis (the distance you would have to move it to separate them).
 *   FLOATING  a standing prop with nothing under it.
 *   BOUNDS    a prop outside its own room's floor.
 *   CONTAINED (quiet, --all) a small prop fully inside a larger one — books in
 *             a bookcase, a tape in a slot. Reported apart from OVERLAP because
 *             it is almost always intent, and burying the real faults under it
 *             is how S65's "13 overlaps" report got ignored.
 *
 * Tolerances are deliberately loose enough that resting-on-something never
 * fires (a prop standing on a table shares a plane, not a volume).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const era1 = read('data/room/era1.json');
const deltas = read('data/room/reinterp_deltas.json');
const manifest = read('data/room/models.json');

/** how far two solids may share space before it is a fault, in metres. Coplanar
 *  faces (a lamp on a desk, a rug on the floor) touch at 0. */
const TOL_OVERLAP = 0.02;
/** a prop may sit this far into a wall before it is called through it — plaster
 *  depth, roughly, and less than any real mistake this repo has produced. */
const TOL_SURFACE = 0.02;
/** authored vs rendered extent, as a fraction. 5% of a 0.5 m prop is 2.5 cm. */
const TOL_SCALE = 0.05;
/** a prop may hang this far past its room's floor edge (skirting, a rug lip). */
const TOL_BOUNDS = 0.02;
/** air under a standing prop before it reads as floating. Generous: props are
 *  placed by hand and a centimetre of clearance is invisible. */
const TOL_FLOAT = 0.03;

// ── glTF: the native bounding box, straight off the accessors ───────────────

/** POSITION accessors carry min/max by spec, so a GLB's own AABB is readable
 *  without decoding a single vertex. Node transforms still have to be walked. */
function glbAabb(file) {
  const buf = fs.readFileSync(path.join(ROOT, 'public/assets/models', file));
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`not a GLB: ${file}`);
  let off = 12;
  let gltf = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) gltf = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'));
    off += 8 + len + (len % 4 ? 4 - (len % 4) : 0);
  }
  if (!gltf) throw new Error(`no JSON chunk: ${file}`);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (idx, parent, isRoot = false) => {
    const n = gltf.nodes[idx];
    const world = isRoot ? parent : matMul(parent, nodeMatrix(n));
    if (n.mesh !== undefined) {
      for (const prim of gltf.meshes[n.mesh].primitives ?? []) {
        const acc = gltf.accessors?.[prim.attributes?.POSITION];
        if (!acc?.min || !acc?.max) continue;
        for (let c = 0; c < 8; c++) {
          const p = [c & 1 ? acc.max[0] : acc.min[0], c & 2 ? acc.max[1] : acc.min[1], c & 4 ? acc.max[2] : acc.min[2]];
          const w = matXform(world, p);
          for (let k = 0; k < 3; k++) { if (w[k] < min[k]) min[k] = w[k]; if (w[k] > max[k]) max[k] = w[k]; }
        }
      }
    }
    for (const child of n.children ?? []) visit(child, world);
  };
  /**
   * ⚑ THE ROOT NODE'S OWN TRANSFORM IS DISCARDED, and this is not a shortcut —
   * it is what the engine does. `instantiateRenderEntity()` returns the glTF's
   * single root as the entity itself, and `assets.ts`'s `spawnModel` then calls
   * `setLocalScale` / `setLocalPosition` on it, OVERWRITING whatever the file
   * authored there. Exactly one model in this repo notices: `pottedPlant.glb`
   * carries `scale: [2,2,2]` on its root, so honouring it made this tool report
   * the plant at twice its real size. Caught by cross-checking against the live
   * AABBs — which is why that check is in the header as a thing to repeat.
   * (A glTF with several scene roots would get a wrapper from PlayCanvas and
   * keep its roots' transforms; nothing in this repo has one, and the walk
   * below would need the `IDENT` swapped out if one ever arrives.)
   */
  for (const s of gltf.scenes ?? []) for (const r of s.nodes ?? []) visit(r, IDENT, true);
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function matMul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function matXform(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
}
function nodeMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  return composeTRS(n.translation ?? [0, 0, 0], n.rotation ?? [0, 0, 0, 1], n.scale ?? [1, 1, 1]);
}
function composeTRS([tx, ty, tz], [qx, qy, qz, qw], [sx, sy, sz]) {
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}
/** PlayCanvas's own euler→quaternion (Quat.setFromEulerAngles), copied so a
 *  model `tilt` composes here exactly the way the engine composes it. */
function quatFromEuler(ex, ey, ez) {
  const h = Math.PI / 360;
  const sx = Math.sin(ex * h), cx = Math.cos(ex * h);
  const sy = Math.sin(ey * h), cy = Math.cos(ey * h);
  const sz = Math.sin(ez * h), cz = Math.cos(ez * h);
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz
  ];
}
const eulerMatrix = (ex, ey, ez, t = [0, 0, 0]) => composeTRS(t, quatFromEuler(ex, ey, ez), [1, 1, 1]);

/** the world AABB of a box of half-extents `he` centred at `c`, through `m` */
function boxThrough(m, c, he) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    const p = [c[0] + (i & 1 ? he[0] : -he[0]), c[1] + (i & 2 ? he[1] : -he[1]), c[2] + (i & 4 ? he[2] : -he[2])];
    const w = matXform(m, p);
    for (let k = 0; k < 3; k++) { if (w[k] < min[k]) min[k] = w[k]; if (w[k] > max[k]) max[k] = w[k]; }
  }
  return { min, max };
}

// ── the model table (a port of assets.ts's meta + spawnModel) ──────────────

const MODELS = new Map();
for (const e of manifest.models ?? []) {
  let native = null;
  try { native = glbAabb(e.file); } catch (err) { native = { error: String(err.message ?? err) }; }
  MODELS.set(e.key, {
    key: e.key, file: e.file, native,
    scale: e.scale ?? 1, yaw: e.yaw ?? 0,
    cx: e.cx ?? 0, cz: e.cz ?? 0, baseY: e.baseY ?? 0,
    tilt: e.tilt, tiltOffset: e.tiltOffset
  });
}
const triple = (s) => (Array.isArray(s) ? [s[0], s[1], s[2]] : [s, s, s]);

// ── the fold (a port of clusterMorph.ts's foldTargets) ─────────────────────

const STATES = ['r1', 'r2', 'r3', 'r4'];
function foldTargets(idx) {
  const m = new Map();
  for (const d of era1.props) {
    m.set(d.id, { id: d.id, pos: [...d.pos], size: [...d.size], yaw: d.yaw ?? 0, model: d.model, modelScale: d.modelScale, emissive: !!d.emissive, present: true });
  }
  for (let i = 0; i <= idx; i++) {
    const delta = deltas[STATES[i]];
    if (!delta) continue;
    for (const [id, o] of Object.entries(delta.props ?? {})) {
      const t = m.get(id);
      if (!t) continue;
      if (o.pos) t.pos = [...o.pos];
      if (o.size) t.size = [...o.size];
      if (o.model) t.model = o.model;
      if (o.modelScale) t.modelScale = o.modelScale;
      if (o.yaw !== undefined) t.yaw = o.yaw;
    }
    for (const id of delta.remove ?? []) { const t = m.get(id); if (t) t.present = false; }
    for (const def of delta.add ?? []) {
      m.set(def.id, { id: def.id, pos: [...def.pos], size: [...def.size], yaw: def.yaw ?? 0, model: def.model, modelScale: def.modelScale, emissive: !!def.emissive, present: true });
    }
  }
  return [...m.values()].filter((p) => p.present);
}

/**
 * The world box a prop ACTUALLY renders as, and the one its data claims.
 *
 * Box props are exact by construction (PlayCanvas's box primitive is a unit
 * cube, so `size` IS the extent). Model props go through `spawnModel`'s
 * placement: scale → recentre on (cx, baseY, cz) → optional tilt + tiltOffset
 * → the wrapper's `propYaw + manifest yaw`. `local` below is the extent BEFORE
 * that final yaw — the frame the authored `size` is written in.
 */
function propBoxes(p) {
  const yawOf = (extra = 0) => eulerMatrix(0, p.yaw + extra, 0, p.pos);
  const authored = boxThrough(yawOf(), [0, 0, 0], [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]);
  const entry = p.model ? MODELS.get(p.model) : null;

  if (!entry || entry.native?.error) {
    // no model, or a GLB we could not read → the engine draws the box too
    return { authored, rendered: authored, local: [...p.size], kind: entry ? 'model(unreadable)' : 'box' };
  }
  const [sx, sy, sz] = triple(p.modelScale ?? entry.scale);
  const n = entry.native;
  const scaledMin = [n.min[0] * sx, n.min[1] * sy, n.min[2] * sz];
  const scaledMax = [n.max[0] * sx, n.max[1] * sy, n.max[2] * sz];
  const off = [-entry.cx * sx, -entry.baseY * sy, -entry.cz * sz];
  let c = [(scaledMin[0] + scaledMax[0]) / 2 + off[0], (scaledMin[1] + scaledMax[1]) / 2 + off[1], (scaledMin[2] + scaledMax[2]) / 2 + off[2]];
  let he = [(scaledMax[0] - scaledMin[0]) / 2, (scaledMax[1] - scaledMin[1]) / 2, (scaledMax[2] - scaledMin[2]) / 2];

  if (entry.tilt) {
    const [dx, dy] = entry.tiltOffset ?? [0, 0];
    const t = eulerMatrix(entry.tilt[0], entry.tilt[1], entry.tilt[2], [dx, dy, 0]);
    const b = boxThrough(t, c, he);
    c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    he = [(b.max[0] - b.min[0]) / 2, (b.max[1] - b.min[1]) / 2, (b.max[2] - b.min[2]) / 2];
  }
  const local = [he[0] * 2, he[1] * 2, he[2] * 2];
  const rendered = boxThrough(yawOf(entry.yaw), c, he);
  return { authored, rendered, local, kind: `model:${p.model}` };
}

// ── which room a prop belongs to ───────────────────────────────────────────

/** the side rooms prefix every prop with their own letter — the same convention
 *  `era1room.ts`'s `bare()` strips for the material law. `w1…`/`e1…` are the
 *  BASE room's own doorways into them, so they belong to Room 1's shell. */
function roomOf(id) {
  if (/^w_/.test(id)) return 'r2';
  if (/^e_/.test(id)) return 'r3';
  return 'r1';
}
const ROOM_NAME = { r1: 'Room 1 (front)', r2: 'Room 2 (west)', r3: 'Room 3 (east)' };

/** a room's floor plate, measured from the floor prop itself rather than typed
 *  in here — move the floor and the bounds check follows it. */
function roomBounds(props) {
  const out = {};
  for (const [room, floorId] of [['r1', 'floor'], ['r2', 'w_floor'], ['r3', 'e_floor']]) {
    const f = props.find((p) => p.id === floorId);
    if (!f) continue;
    const b = propBoxes(f).rendered;
    out[room] = { x: [b.min[0], b.max[0]], z: [b.min[2], b.max[2]], y: b.max[1] };
  }
  return out;
}

const isSurface = (id) => /wall|floor|ceil/i.test(id);
/** doorway fabric: a jamb, a lintel and a panel live IN the wall opening by
 *  construction, so a wall check on them reports the wall existing. */
const isDoorFabric = (id) => /door(panel|lintel|jamb|knob|cap|front|back)|lintel|jamb/i.test(id);

/**
 * ⚑ JOINERY, and why it is a rule rather than an ignore list.
 *
 * A mitred picture frame, a monitor bezel and a lamp's shade-on-its-pole all
 * overlap on purpose, and S65's clipping report drowned its four real faults
 * under thirteen of them. The signal that separates them is already in the
 * data: the parts of one assembly are named as one — `winFrameTop` /
 * `winFrameLeft`, `crtBezelTop` / `crtBezelRight`, `lampPole` / `lampShade`.
 * So two props whose ids share a whole leading WORD are the same object, and
 * their overlap is construction. `book3` ∩ `bookcaseModel` deliberately does
 * NOT match (the shared "book" is not followed by a word break in both), which
 * is the case this rule has to keep reporting.
 */
function isJoinery(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i < 4) return false;
  const breaks = (s) => s.length > i && /[A-Z]/.test(s[i]);
  return breaks(a) && breaks(b);
}

// ── the checks ─────────────────────────────────────────────────────────────

const overlapOf = (a, b) => [0, 1, 2].map((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
const intersects = (o, tol) => o.every((v) => v > tol);
const contained = (inner, outer) => [0, 1, 2].every((k) => inner.min[k] >= outer.min[k] - 1e-6 && inner.max[k] <= outer.max[k] + 1e-6);
const volume = (b) => (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
const fmt = (n, d = 3) => (Math.abs(n) < 5e-4 ? '0' : n.toFixed(d));

function auditState(stateIdx) {
  const state = STATES[stateIdx];
  const props = foldTargets(stateIdx);
  const bounds = roomBounds(props);
  const boxes = new Map(props.map((p) => [p.id, propBoxes(p)]));
  const findings = [];

  // 1 · SCALE — rendered vs authored, in the prop's own (pre-yaw) frame
  for (const p of props) {
    const b = boxes.get(p.id);
    if (!p.model) continue;
    if (b.kind === 'model(unreadable)') {
      findings.push({ cls: 'SCALE', sev: 1, id: p.id, msg: `model "${p.model}" could not be measured (missing or unreadable GLB) — rendering as its box` });
      continue;
    }
    const err = [0, 1, 2].map((k) => (p.size[k] ? (b.local[k] - p.size[k]) / p.size[k] : 0));
    const worst = Math.max(...err.map(Math.abs));
    if (worst > TOL_SCALE) {
      findings.push({
        cls: 'SCALE', sev: worst, id: p.id, room: roomOf(p.id),
        msg: `authored ${p.size.map((v) => fmt(v, 2)).join(' × ')} → renders ${b.local.map((v) => fmt(v, 3)).join(' × ')} ` +
             `(${err.map((e) => (e >= 0 ? '+' : '') + (e * 100).toFixed(0) + '%').join(' / ')}), model "${p.model}"`
      });
    }
  }

  // 2 · SURFACE — into a wall, through a floor, through the ceiling
  for (const p of props) {
    if (isSurface(p.id) || isDoorFabric(p.id)) continue;
    const b = boxes.get(p.id).rendered;
    for (const s of props) {
      if (!isSurface(s.id) || s.id === p.id) continue;
      const sb = boxes.get(s.id).rendered;
      const o = overlapOf(b, sb);
      if (!intersects(o, TOL_SURFACE)) continue;
      if (isJoinery(p.id, s.id)) continue;
      // the shallowest axis is how far it would have to move to come out
      const axis = o.indexOf(Math.min(...o));
      // a floor plate is a plane a prop STANDS on: only flag a prop that is
      // genuinely sunk into it, never one whose base shares its top face.
      if (/floor/i.test(s.id) && axis === 1 && b.min[1] >= sb.max[1] - TOL_SURFACE) continue;
      // ⚑ a surface's THIN axis crossed at both ends is not a deep mounting,
      // it is a prop out the other side — the fault S66 chased on the bookcase
      // and the one a bare overlap number hides (the overlap can only ever be
      // as large as the wall is thick, so a 4 cm wall reports 4 cm either way).
      const thin = sb.max.map((v, k) => v - sb.min[k]).indexOf(Math.min(...sb.max.map((v, k) => v - sb.min[k])));
      const through = b.min[thin] < sb.min[thin] && b.max[thin] > sb.max[thin];
      const past = through ? Math.min(sb.min[thin] - b.min[thin], b.max[thin] - sb.max[thin]) : 0;
      findings.push({
        cls: 'SURFACE', sev: through ? 1 + past : o[axis], id: p.id, room: roomOf(p.id),
        msg: through
          ? `⚑ passes CLEAN THROUGH "${s.id}" on ${'xyz'[thin]} — ${fmt(past)} m out the far side`
          : `${fmt(o[axis])} m into "${s.id}" on ${'xyz'[axis]} (overlap ${o.map((v) => fmt(v)).join(' / ')})`
      });
    }
  }

  // 3 · OVERLAP — prop inside prop
  const solid = props.filter((p) => !isSurface(p.id) && !isDoorFabric(p.id));
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], bp = solid[j];
      const ab = boxes.get(a.id).rendered, bb = boxes.get(bp.id).rendered;
      const o = overlapOf(ab, bb);
      if (!intersects(o, TOL_OVERLAP)) continue;
      const axis = o.indexOf(Math.min(...o));
      const small = volume(ab) <= volume(bb) ? { p: a, b: ab } : { p: bp, b: bb };
      const big = small.p === a ? { p: bp, b: bb } : { p: a, b: ab };
      // ⚑ SHELVED, and why it is not an overlap. An open bookcase's AABB is the
      // whole carcass, so every book on every shelf is "inside" it, and a book
      // on the TOP shelf straddles its top face. A prop that sits within the
      // bigger one on x and z and only breaks out UPWARDS is standing on or in
      // it; there is no solid it could be driven into from above.
      const shelved = [0, 2].every((k) => small.b.min[k] >= big.b.min[k] - 1e-6 && small.b.max[k] <= big.b.max[k] + 1e-6)
        && small.b.min[1] >= big.b.min[1] - 1e-6;
      const cls = isJoinery(a.id, bp.id) ? 'JOINERY'
        : contained(small.b, big.b) || shelved ? 'CONTAINED' : 'OVERLAP';
      findings.push({
        cls, sev: cls === 'CONTAINED' ? volume(small.b) : o[axis],
        id: `${a.id} ∩ ${bp.id}`, room: roomOf(a.id),
        msg: cls === 'CONTAINED'
          ? `"${small.p.id}" sits entirely inside "${big.p.id}"`
          : `${fmt(o[axis])} m on ${'xyz'[axis]} (overlap ${o.map((v) => fmt(v)).join(' / ')})`
      });
    }
  }

  // 5 · FLOATING — a prop with nothing under it
  //
  // The overlap checks can only see solids sharing space; they are blind to a
  // prop hanging in the air, which is the other half of what a reviewer
  // actually sees. A prop counts as supported if it stands on a floor, or if
  // ANY other prop's top face is within `TOL_FLOAT` of its base while
  // overlapping it in plan. Wall-mounted things (posters, plates, the record)
  // are excluded by the flatness test: a prop thinner than 6 cm on x or z is
  // hanging on something, not standing on it.
  for (const p of props) {
    if (isSurface(p.id) || isDoorFabric(p.id)) continue;
    const b = boxes.get(p.id).rendered;
    const w = b.max[0] - b.min[0], d = b.max[2] - b.min[2], h = b.max[1] - b.min[1];
    if (w < 0.06 || d < 0.06) continue;          // hangs on a wall
    if (h < 0.03) continue;                       // a rug / a sheet of paper
    let ground = Math.max(...Object.values(bounds).map((v) => v.y), 0);
    let held = false;
    for (const q of props) {
      if (q.id === p.id) continue;
      const qb = boxes.get(q.id).rendered;
      const plan = Math.min(b.max[0], qb.max[0]) - Math.max(b.min[0], qb.min[0]) > 0.01
        && Math.min(b.max[2], qb.max[2]) - Math.max(b.min[2], qb.min[2]) > 0.01;
      if (!plan) continue;
      // ⚑ AN AABB CANNOT SEE A SHELF. An open bookcase is one box from floor to
      // top, so every book on every shelf has "nothing under it" by the naive
      // test — and so does a cardigan over a chair back and a teddy in a crate.
      // A prop whose footprint sits inside another's and whose base is INSIDE
      // that prop's height is in or on that piece of furniture, full stop.
      const inside = b.min[0] >= qb.min[0] - 1e-6 && b.max[0] <= qb.max[0] + 1e-6
        && b.min[2] >= qb.min[2] - 1e-6 && b.max[2] <= qb.max[2] + 1e-6
        && b.min[1] >= qb.min[1] - 1e-6 && b.min[1] <= qb.max[1] + 1e-6;
      // …and a curtain hangs from the thing directly above it
      const hangs = qb.min[1] <= b.max[1] + TOL_FLOAT && qb.min[1] >= b.max[1] - TOL_FLOAT;
      if (inside || hangs) { held = true; break; }
      if (qb.max[1] <= b.min[1] + TOL_FLOAT && qb.max[1] > ground) ground = qb.max[1];
    }
    const gap = b.min[1] - ground;
    if (!held && gap > TOL_FLOAT) {
      findings.push({
        cls: 'FLOATING', sev: gap, id: p.id, room: roomOf(p.id),
        msg: `${fmt(gap)} m of air under it (base y ${fmt(b.min[1])}, nearest support below y ${fmt(ground)})`
      });
    }
  }

  // 4 · BOUNDS — outside its own room's floor
  for (const p of props) {
    if (isSurface(p.id) || isDoorFabric(p.id)) continue;
    const b = boxes.get(p.id).rendered;
    // A PREFIXED prop is checked against the room it is named for — `w_bed`
    // outside Room 2 is a fault by definition. An UNPREFIXED prop belongs to
    // whichever floor it stands over, because Room 1's props legitimately
    // travel: the lamp migrates to Maya's desk at r4 (cluster.ts's
    // carryLampLight), and pinning it to Room 1 reported a 3 m error for a
    // move the piece makes on purpose.
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    const inRoom = Object.entries(bounds).find(([, v]) =>
      cx >= v.x[0] && cx <= v.x[1] && cz >= v.z[0] && cz <= v.z[1]);
    const room = /^[we]_/.test(p.id) ? roomOf(p.id) : (inRoom?.[0] ?? roomOf(p.id));
    const bd = bounds[room];
    if (!bd) continue;
    const out = [
      bd.x[0] - b.min[0], b.max[0] - bd.x[1],
      bd.z[0] - b.min[2], b.max[2] - bd.z[1]
    ];
    const worst = Math.max(...out);
    if (worst > TOL_BOUNDS) {
      const side = ['−x', '+x', '−z', '+z'][out.indexOf(worst)];
      findings.push({
        cls: 'BOUNDS', sev: worst, id: p.id, room,
        msg: `${fmt(worst)} m past ${ROOM_NAME[room]}'s floor on ${side}`
      });
    }
  }

  return { state, propCount: props.length, findings };
}

// ── report ─────────────────────────────────────────────────────────────────

const ORDER = ['SURFACE', 'OVERLAP', 'FLOATING', 'BOUNDS', 'SCALE', 'CONTAINED', 'JOINERY'];
/** the two classes that are almost always intent. Shown with --all, because
 *  "almost always" is not "always" and hiding them outright would be a lie. */
const QUIET = new Set(['CONTAINED', 'JOINERY']);

const args = process.argv.slice(2);
const only = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;
const showAll = args.includes('--all');
const asJson = args.includes('--json');

// `--boxes` dumps every prop's computed WORLD box for the named state. It is
// how this tool was checked against the engine (S71: 185 props at r3, worst
// corner error 0 m) and how it should be checked again after any change to
// assets.ts's placement maths.
const dumpBoxes = args.includes('--boxes');
if (dumpBoxes) {
  const idx = Math.max(0, STATES.indexOf(only ?? 'r3'));
  const out = {};
  for (const p of foldTargets(idx)) out[p.id] = propBoxes(p).rendered;
  // never process.exit() here: it can truncate a large stdout write mid-flush
  process.stdout.write(JSON.stringify(out) + '\n');
}

const results = dumpBoxes ? [] : STATES
  .map((s, i) => (only && s !== only ? null : auditState(i)))
  .filter(Boolean);

if (dumpBoxes) {
  // already written above; --boxes is a raw feed for the engine cross-check
} else if (asJson) {
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} else {
  let loud = 0;
  for (const r of results) {
    const shown = r.findings.filter((f) => showAll || !QUIET.has(f.cls));
    const quiet = r.findings.length - shown.length;
    console.log(`\n━━ ${r.state} · ${r.propCount} props · ${shown.length} finding(s)` +
      (quiet ? ` (+${quiet} contained, --all to show)` : '') + ' ━━');
    shown.sort((a, b) => ORDER.indexOf(a.cls) - ORDER.indexOf(b.cls) || b.sev - a.sev);
    for (const f of shown) {
      loud++;
      console.log(`  ${f.cls.padEnd(9)} ${f.id.padEnd(34)} ${f.msg}`);
    }
    if (!shown.length) console.log('  clean.');
  }
  console.log(`\n${loud} finding(s) across ${results.length} state(s). ` +
    `Tolerances: overlap ${TOL_OVERLAP} m · surface ${TOL_SURFACE} m · scale ${TOL_SCALE * 100}% · bounds ${TOL_BOUNDS} m.`);
}
