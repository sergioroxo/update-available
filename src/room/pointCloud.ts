/**
 * The point-cloud Close — the piece's last image (R1 confirmed; reference:
 * Gephi-style network, Round 2). After "Restart as you are." the room gives
 * way to an interconnected data-mesh constellation: WARM nodes (the lamp's
 * temperature, finally at network scale — the warm light winning after all,
 * style direction §2-E4) on a COOL blue link-web (the differentiation from
 * the Watcher's cold data grammar). Dense center, scattered satellites, NO
 * labels (sub-legible was the reference; none at all is the build — no text
 * in the room, ever). The player sits inside it; it drifts, slowly.
 *
 * Budget: all nodes of one tone share ONE merged mesh (tiny cubes — 90°
 * discipline, no billboards), links are ONE line mesh → 4 draw calls total.
 * Geometry is generated once at build (seeded, deterministic); show()/hide()
 * toggle enabled state — nothing allocates after construction.
 * Parameters in data/room/cluster.json (pointCloud). ?reinterp=1 only.
 */
import * as pc from 'playcanvas';
import clusterData from '../../data/room/cluster.json';

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
  const linkPositions: number[] = [];
  const reach = (i: number, count: number): void => {
    const [x, y, z] = nodes[i];
    let picked = 0;
    for (let tries = 0; tries < 24 && picked < count; tries++) {
      const j = Math.floor(rng() * nodes.length);
      if (j === i) continue;
      const [x2, y2, z2] = nodes[j];
      const d2 = (x - x2) ** 2 + (y - y2) ** 2 + (z - z2) ** 2;
      if (d2 < 0.8 * 0.8) {
        linkPositions.push(x, y, z, x2, y2, z2);
        picked++;
      }
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
  linkMat.update();
  const links = new pc.Entity('cloud-links');
  links.addComponent('render', { meshInstances: [new pc.MeshInstance(linkMesh, linkMat)] });
  root.addChild(links);

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
      m.emissive.set(c.r * level, c.g * level, c.b * level);
      m.opacity = level;
      m.update();
    });
    const lk = level * P.linkOpacity;
    linkMat.emissive.set(linkColor.r * lk, linkColor.g * lk, linkColor.b * lk);
    linkMat.opacity = Math.min(1, level * 1.4) * P.linkOpacity;
    linkMat.update();
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
