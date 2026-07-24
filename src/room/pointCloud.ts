/**
 * The point-cloud Close — the piece's last image (R1 confirmed; reference:
 * Gephi-style network, Round 2; Round-18 revisions from Sérgio's review).
 * After "Restart as you are." the room gives way to an interconnected
 * data-mesh constellation: WARM nodes (the lamp's temperature at network
 * scale — the warm light winning after all) on a COOL blue link-web, against
 * a NIGHT-BLUE backdrop (Round 18: never black — the space must stay
 * readable). The HUB nodes carry LABELS: the network of knowledge the piece
 * itself is built from (data/strings/close_network.json, PLACEHOLDER until
 * Sérgio's pass — documentary anchors, research passes, the PhD frame).
 *
 * Budget: nodes of one tone share ONE merged mesh (tiny cubes — 90°
 * discipline), links are ONE line mesh, all labels ONE textured quad mesh →
 * 5 draw calls total. Round-18 clipping fixes: links are TRIMMED back to the
 * node surfaces (no lines stabbing through cubes) and any link whose segment
 * would cross the player's clear bubble is rejected. Geometry is generated
 * once at build (seeded, deterministic); nothing allocates after
 * construction. Parameters in data/room/cluster.json. ?reinterp=1 only.
 */
import * as pc from 'playcanvas';
import clusterData from '../../data/room/cluster.json';
import network from '../../data/strings/close_network.json';

const P = clusterData.pointCloud;

/** deterministic LCG so the constellation is the same on every run */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** the Close's sky — an approved night hue at a lowered light level */
export function closeBackdropColor(): pc.Color {
  const c = hex(P.backdrop);
  return new pc.Color(c.r * P.backdropLevel, c.g * P.backdropLevel, c.b * P.backdropLevel);
}

/** one merged mesh of axis-aligned cubes at the given centers — the 4th
 *  component of each entry scales the node (hub nodes render larger) */
function cubesMesh(device: pc.GraphicsDevice, centers: number[][], half: number): pc.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  // 8 corners / 12 tris per cube, flat-shaded by unlit material (no normals needed)
  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  centers.forEach(([x, y, z, scale], n) => {
    const base = n * 8;
    const h = half * (scale ?? 1);
    for (const [cx, cy, cz] of C) positions.push(x + cx * h, y + cy * h, z + cz * h);
    for (const face of F) for (const i of face) indices.push(base + i);
  });
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}

/** shortest distance from the origin to segment ab (both relative to center) */
function segmentDistToOrigin(a: number[], b: number[]): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? -(a[0] * abx + a[1] * aby + a[2] * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + abx * t, py = a[1] + aby * t, pz = a[2] + abz * t;
  return Math.sqrt(px * px + py * py + pz * pz);
}

export interface PointCloud {
  /** fade the constellation in (the room's own fade-out is the caller's rig) */
  show(): void;
  readonly visible: boolean;
  update(dt: number): void;
}

export function buildPointCloud(app: pc.Application): PointCloud {
  const rng = makeRng(19970704);
  const [ox, oy, oz] = P.center as number[];

  // ── node positions: dense gaussian-ish core + scattered satellites ──
  const nodes: number[][] = [];
  for (let i = 0; i < P.coreCount; i++) {
    // sum of 3 uniforms ≈ gaussian; core hugs the center — but a clear bubble
    // stays around the seated player so no node looms against the near clip
    const r = P.innerClear + (P.coreRadius - P.innerClear) * ((rng() + rng() + rng()) / 3);
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    // positions are RELATIVE to the root (placed at P.center below) so the
    // drift rotation spins the constellation about its own center
    nodes.push([
      r * Math.sin(ph) * Math.cos(th),
      r * Math.cos(ph) * 0.75, // slightly flattened — a sky, not a ball
      r * Math.sin(ph) * Math.sin(th),
      0.7 + rng() * (rng() < 0.12 ? 2.6 : 0.9) // a few hubs render larger
    ]);
  }
  for (let i = 0; i < P.satelliteCount; i++) {
    const r = P.coreRadius + (P.outerRadius - P.coreRadius) * Math.pow(rng(), 0.6);
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    nodes.push([
      r * Math.sin(ph) * Math.cos(th),
      r * Math.cos(ph) * 0.6,
      r * Math.sin(ph) * Math.sin(th),
      0.6 + rng() * 0.7 // satellites stay small
    ]);
  }

  // ── links: each node reaches toward a few near neighbours (the web) ──
  // Round-18 fixes: ends TRIM back to the node surfaces, and a link whose
  // segment would cross the player's clear bubble is rejected outright.
  const linkPositions: number[] = [];
  const surface = (n: number[]): number => (P.nodeSize / 2) * (n[3] ?? 1) * 1.9;
  const reach = (i: number, count: number): void => {
    const a = nodes[i];
    let picked = 0;
    for (let tries = 0; tries < 24 && picked < count; tries++) {
      const j = Math.floor(rng() * nodes.length);
      if (j === i) continue;
      const b = nodes[j];
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 0.8 || d < 1e-4) continue;
      if (segmentDistToOrigin(a, b) < P.innerClear * 0.85) continue; // never through the player
      const ta = surface(a) / d, tb = 1 - surface(b) / d;
      if (tb <= ta) continue;
      linkPositions.push(
        a[0] + dx * ta, a[1] + dy * ta, a[2] + dz * ta,
        a[0] + dx * tb, a[1] + dy * tb, a[2] + dz * tb
      );
      picked++;
    }
  };
  for (let i = 0; i < nodes.length; i++) reach(i, i < P.coreCount ? 2 : 1);

  // ── build: one mesh per warm tone + one line mesh ──
  const root = new pc.Entity('point-cloud');
  const warmMats: pc.StandardMaterial[] = [];
  const tones = P.warm as string[];
  const byTone: number[][][] = tones.map(() => []);
  nodes.forEach((nPos, i) => {
    // core skews to the first (lamp-pool) tone; satellites vary more
    const t = i < P.coreCount ? (rng() < 0.7 ? 0 : 1) : Math.floor(rng() * tones.length);
    byTone[t].push(nPos);
  });
  tones.forEach((_tone, t) => {
    if (byTone[t].length === 0) return;
    const mat = new pc.StandardMaterial();
    mat.useLighting = false;
    mat.diffuse = new pc.Color(0, 0, 0);
    mat.emissive = new pc.Color(0, 0, 0); // ramped in by update()
    mat.blendType = pc.BLEND_NORMAL;
    mat.opacity = 0;
    mat.update();
    warmMats.push(mat);
    const e = new pc.Entity(`cloud-nodes-${t}`);
    e.addComponent('render', {
      meshInstances: [new pc.MeshInstance(cubesMesh(app.graphicsDevice, byTone[t], P.nodeSize / 2), mat)]
    });
    root.addChild(e);
  });

  const linkMesh = new pc.Mesh(app.graphicsDevice);
  linkMesh.setPositions(linkPositions);
  linkMesh.update(pc.PRIMITIVE_LINES);
  const linkMat = new pc.StandardMaterial();
  linkMat.useLighting = false;
  linkMat.diffuse = new pc.Color(0, 0, 0);
  linkMat.emissive = new pc.Color(0, 0, 0);
  linkMat.blendType = pc.BLEND_NORMAL;
  linkMat.opacity = 0;
  linkMat.depthWrite = false;
  linkMat.update();
  const links = new pc.Entity('cloud-links');
  links.addComponent('render', { meshInstances: [new pc.MeshInstance(linkMesh, linkMat)] });
  root.addChild(links);

  // ── the knowledge-network labels, on the hub nodes (one atlas, one mesh) ──
  // Text drawn once into a canvas atlas in the label colour; the material's
  // grayscale emissive + opacity carry the fade. PLACEHOLDER wording —
  // Sérgio's pass owns every line (close_network.json).
  const labels = (network.labels as string[]).slice(0, 32);
  const hubOrder = nodes
    .map((n, i) => ({ i, s: n[3] ?? 1, core: i < P.coreCount }))
    .sort((a, b) => (Number(b.core) - Number(a.core)) || (b.s - a.s))
    .slice(0, labels.length);
  const ATLAS = 1152; // 32 rows * ROW — the 32-label cap this atlas must fit
  const ROW = 36;
  const atlas = document.createElement('canvas');
  atlas.width = ATLAS;
  atlas.height = ATLAS;
  const actx = atlas.getContext('2d');
  const labelMat = new pc.StandardMaterial();
  if (actx) {
    actx.clearRect(0, 0, ATLAS, ATLAS);
    actx.font = 'bold 26px monospace';
    actx.textBaseline = 'middle';
    actx.fillStyle = P.labelColor;
    const widths: number[] = [];
    labels.forEach((text, i) => {
      actx.fillText(text, 4, i * ROW + ROW / 2, ATLAS - 8);
      widths.push(Math.min(actx.measureText(text).width + 8, ATLAS));
    });
    const tex = new pc.Texture(app.graphicsDevice, {
      width: ATLAS, height: ATLAS, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
      minFilter: pc.FILTER_LINEAR, magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(atlas);
    labelMat.useLighting = false;
    labelMat.diffuse = new pc.Color(0, 0, 0);
    labelMat.emissive = new pc.Color(0, 0, 0); // grayscale fade multiplier
    labelMat.emissiveMap = tex;
    labelMat.opacityMap = tex;
    labelMat.blendType = pc.BLEND_NORMAL;
    labelMat.opacity = 0;
    labelMat.cull = pc.CULLFACE_NONE;
    labelMat.depthWrite = false; // transparent texels must never occlude the web
    labelMat.update();

    const lp: number[] = [];
    const luv: number[] = [];
    const lidx: number[] = [];
    const up = new pc.Vec3(0, 1, 0);
    const nrm = new pc.Vec3();
    const right = new pc.Vec3();
    const upv = new pc.Vec3();
    hubOrder.forEach((h, li) => {
      const n = nodes[h.i];
      nrm.set(-n[0], -n[1], -n[2]).normalize(); // faces the player at the center
      right.cross(up, nrm);
      if (right.length() < 1e-3) right.set(1, 0, 0); else right.normalize();
      upv.cross(nrm, right).normalize();
      const hgt = P.labelHeight;
      const wid = (widths[li] / ROW) * hgt;
      const lift = surface(n) + hgt * 0.85; // sits just above its node
      const cxp = n[0] + upv.x * lift, cyp = n[1] + upv.y * lift, czp = n[2] + upv.z * lift;
      const base = li * 4;
      const corners = [
        [-wid / 2, hgt / 2], [wid / 2, hgt / 2], [wid / 2, -hgt / 2], [-wid / 2, -hgt / 2]
      ];
      for (const [cx, cy] of corners) {
        lp.push(cxp + right.x * cx + upv.x * cy, cyp + right.y * cx + upv.y * cy, czp + right.z * cx + upv.z * cy);
      }
      // straight v (canvas top = v0) — the upload isn't y-flipped here
      const v0 = (li * ROW) / ATLAS;
      const v1 = ((li + 1) * ROW) / ATLAS;
      const u1 = widths[li] / ATLAS;
      // the (up × toCenter) frame already runs screen-left→right for the
      // viewer at the center, so u maps straight (mirrored-text fix)
      luv.push(0, v0, u1, v0, u1, v1, 0, v1);
      lidx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const lmesh = new pc.Mesh(app.graphicsDevice);
    lmesh.setPositions(lp);
    lmesh.setUvs(0, luv);
    lmesh.setIndices(lidx);
    lmesh.update(pc.PRIMITIVE_TRIANGLES);
    const lent = new pc.Entity('cloud-labels');
    lent.addComponent('render', { meshInstances: [new pc.MeshInstance(lmesh, labelMat)] });
    root.addChild(lent);
  }

  root.enabled = false;
  root.setLocalPosition(ox, oy, oz);
  app.root.addChild(root);

  const warmColors = tones.map(hex);
  const linkColor = hex(P.link);
  let level = 0;
  let visible = false;
  let yaw = 0;

  function applyFade(): void {
    warmMats.forEach((m, t) => {
      const c = warmColors[t];
      const boost = level * 1.2; // the lamp temperature has to WIN against the sky
      m.emissive.set(c.r * boost, c.g * boost, c.b * boost);
      m.opacity = level;
      m.update();
    });
    // emissive carries full colour; opacity alone does the blending (a
    // double-dim here washed the web out against the night-blue sky)
    linkMat.emissive.set(linkColor.r * level, linkColor.g * level, linkColor.b * level);
    linkMat.opacity = level * P.linkOpacity;
    linkMat.update();
    const ll = level * 1.25; // a touch over 1 so the text holds against the sky
    labelMat.emissive.set(ll, ll, ll);
    labelMat.opacity = level;
    labelMat.update();
  }

  return {
    show(): void {
      visible = true;
      root.enabled = true;
    },
    get visible(): boolean { return visible; },
    update(dt: number): void {
      if (!visible) return;
      if (level < 1) {
        level = Math.min(1, level + dt / P.fadeSeconds);
        applyFade();
      }
      yaw += P.driftDegPerSec * dt; // the slow drift — alive, not surveilled
      root.setLocalEulerAngles(0, yaw, 0);
    }
  };
}
