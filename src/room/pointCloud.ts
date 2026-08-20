/**
 * The point-cloud Close — the piece's last image (R1 confirmed; reference:
 * Gephi-style network, Round 2; Round-18 revisions from Sérgio's review;
 * S92 — THE TWO VISUAL TIERS, REINTERP_THE_CLOSE_TREATMENT_2026-08-17.md §3).
 *
 * After "Restart as you are." the room gives way to an interconnected
 * data-mesh constellation, and the piece's own aesthetic law — *the witness
 * side is the sharp side; surveillance is high-definition, life is soft* —
 * is made literal in what it draws:
 *
 *   APPARATUS nodes — one per entry in data/strings/close_network.json (the
 *   instruments, campaigns, curricula, sources the piece is built from) —
 *   render COOL (data/room/cluster.json's own `link` hue — already the
 *   piece's witness-blue: witnessCold, moonlight — no new hue), sharp,
 *   full-opacity, LABELLED, and linked ONLY
 *   to each other in a guaranteed-connected chain plus a few cross-links:
 *   traceable end to end, by construction (never a random maybe).
 *
 *   PERSON nodes — the dense core + scattered satellites, the same
 *   populations the single-tier build always drew — render WARM (the lamp
 *   pool: the warm light winning after all, at network scale), at a capped,
 *   softer opacity, and carry NO label and NO link to anything: not to the
 *   apparatus, not to each other. The system documents people; the piece
 *   refuses to. A player can trace the apparatus end to end and cannot trace
 *   a single person — there is no line to follow, on that side, at all.
 *
 * Backdrop stays NIGHT-BLUE (Round 18: never black — the space must stay
 * readable), never a new hue.
 *
 * Budget: nodes of one tone share ONE merged mesh (tiny cubes — 90°
 * discipline); the apparatus tier is its own single mesh + its own single
 * link mesh; labels are ONE textured quad mesh. Total draw calls = person
 * tone meshes (≤3) + 1 apparatus mesh + 1 apparatus link mesh + 1 label mesh
 * — measured and reported in the session log, not assumed. Round-18 clipping
 * fixes carry forward: links are TRIMMED back to the node surfaces (no lines
 * stabbing through cubes) and any link whose segment would cross the
 * player's clear bubble is rejected. Geometry topology and label atlas are
 * generated once at build (seeded, deterministic); label positions are
 * rewritten in their one dynamic vertex buffer so every quad billboards
 * toward the camera. All scratch storage is preallocated: nothing allocates
 * per frame. Parameters in data/room/cluster.json. ?reinterp=1 only.
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

  // ── PERSON nodes: dense gaussian-ish core + scattered satellites. Soft,
  // warm, unlabelled, unlinked — no names, no stories, no count a player can
  // read off. This is the exact population the single-tier build always
  // drew; only its material treatment (below) and its total silence (no
  // label, no link) are new. ──
  const personNodes: number[][] = [];
  for (let i = 0; i < P.coreCount; i++) {
    // sum of 3 uniforms ≈ gaussian; core hugs the center — but a clear bubble
    // stays around the seated player so no node looms against the near clip
    const r = P.innerClear + (P.coreRadius - P.innerClear) * ((rng() + rng() + rng()) / 3);
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    // positions are RELATIVE to the root (placed at P.center below) so the
    // drift rotation spins the constellation about its own center
    personNodes.push([
      r * Math.sin(ph) * Math.cos(th),
      r * Math.cos(ph) * 0.75, // slightly flattened — a sky, not a ball
      r * Math.sin(ph) * Math.sin(th),
      P.personScaleMin + rng() * (P.personScaleMax - P.personScaleMin) // gentle, uniform — no competing "hubs"
    ]);
  }
  for (let i = 0; i < P.satelliteCount; i++) {
    const r = P.coreRadius + (P.outerRadius - P.coreRadius) * Math.pow(rng(), 0.6);
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    personNodes.push([
      r * Math.sin(ph) * Math.cos(th),
      r * Math.cos(ph) * 0.6,
      r * Math.sin(ph) * Math.sin(th),
      P.personScaleMin + rng() * ((P.personScaleMax - P.personScaleMin) * 0.6) // satellites stay a touch smaller
    ]);
  }

  // ── APPARATUS nodes: exactly one per close_network.json label, on a
  // structured shell (a Fibonacci/golden-angle spread, not gaussian noise —
  // "sharp" reads as intentional, not scattered) so every label has room to
  // be read and no two crowd each other. ──
  const labels = (network.labels as string[]).slice(0, 32);
  const apparatusNodes: number[][] = labels.map((_label, i) => {
    const n = labels.length;
    const y = n > 1 ? 1 - (2 * i) / (n - 1) : 0; // -1..1, even spread
    const golden = Math.PI * (3 - Math.sqrt(5)); // the golden angle
    const th = i * golden;
    const rXZ = Math.sqrt(Math.max(0, 1 - y * y));
    const jitter = 1 + (rng() - 0.5) * P.apparatusRadiusJitter;
    const r = P.apparatusRadius * jitter;
    return [
      r * rXZ * Math.cos(th),
      r * y * 0.6, // flattened the same way the person sky is — one grammar
      r * rXZ * Math.sin(th),
      1
    ];
  });

  // ── links ──
  // Round-18 fixes carry forward: ends TRIM back to the node surfaces, and a
  // link whose segment would cross the player's clear bubble is rejected.
  const surface = (baseHalf: number, n: number[]): number => baseHalf * (n[3] ?? 1) * 1.9;
  const personHalf = P.nodeSize / 2;
  const apparatusHalf = P.apparatusNodeSize / 2;

  // APPARATUS ONLY: a guaranteed-connected chain (node i → i+1, by
  // construction — never a "maybe" like the old proximity search) plus a
  // handful of deterministic cross-links for a richer, still fully-traceable
  // web. PERSON nodes get no link mesh at all: there is no line to follow
  // from one soft room to another, which is the asymmetry in one picture.
  const apparatusLinkPositions: number[] = [];
  function tryLink(a: number[], b: number[]): void {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-4) return;
    if (segmentDistToOrigin(a, b) < P.innerClear * 0.85) return; // never through the player
    const ta = surface(apparatusHalf, a) / d, tb = 1 - surface(apparatusHalf, b) / d;
    if (tb <= ta) return;
    apparatusLinkPositions.push(
      a[0] + dx * ta, a[1] + dy * ta, a[2] + dz * ta,
      a[0] + dx * tb, a[1] + dy * tb, a[2] + dz * tb
    );
  }
  for (let i = 0; i < apparatusNodes.length - 1; i++) {
    tryLink(apparatusNodes[i], apparatusNodes[i + 1]); // the spine — guarantees end-to-end traceability
  }
  for (let i = 0; i < apparatusNodes.length; i++) {
    // a few extra cross-links so it reads as a network, not a necklace
    const reachCount = i % 3 === 0 ? 2 : 1;
    for (let k = 1; k <= reachCount; k++) {
      const j = Math.floor(rng() * apparatusNodes.length);
      if (j === i || Math.abs(j - i) <= 1) continue;
      tryLink(apparatusNodes[i], apparatusNodes[j]);
    }
  }

  // ── build: one mesh per warm (person) tone + the apparatus mesh + the
  // apparatus link mesh ──
  const root = new pc.Entity('point-cloud');
  const warmMats: pc.StandardMaterial[] = [];
  const tones = P.warm as string[];
  const byTone: number[][][] = tones.map(() => []);
  personNodes.forEach((nPos, i) => {
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
    const e = new pc.Entity(`cloud-person-${t}`);
    e.addComponent('render', {
      meshInstances: [new pc.MeshInstance(cubesMesh(app.graphicsDevice, byTone[t], personHalf), mat)]
    });
    root.addChild(e);
  });

  // the apparatus's own material — cool, sharp, full-opacity: the witness
  // side of the aesthetic law, at network scale
  const apparatusMat = new pc.StandardMaterial();
  apparatusMat.useLighting = false;
  apparatusMat.diffuse = new pc.Color(0, 0, 0);
  apparatusMat.emissive = new pc.Color(0, 0, 0);
  apparatusMat.blendType = pc.BLEND_NORMAL;
  apparatusMat.opacity = 0;
  apparatusMat.update();
  const apparatusEnt = new pc.Entity('cloud-apparatus');
  apparatusEnt.addComponent('render', {
    meshInstances: [new pc.MeshInstance(cubesMesh(app.graphicsDevice, apparatusNodes, apparatusHalf), apparatusMat)]
  });
  root.addChild(apparatusEnt);

  const linkMesh = new pc.Mesh(app.graphicsDevice);
  linkMesh.setPositions(apparatusLinkPositions);
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

  // ── the knowledge-network labels, one per apparatus node, 1:1 (no more
  // "whichever rendered largest" — every apparatus node IS a label; that is
  // what makes the apparatus readable end to end). Text drawn once into a
  // canvas atlas in the label colour; the material's grayscale emissive +
  // opacity carry the fade. Wording owned by Sérgio's pass
  // (close_network.json). ──
  const labelCenters = new Float32Array(labels.length * 3);
  const labelWidths = new Float32Array(labels.length);
  let labelMesh: pc.Mesh | null = null;
  let labelVertexData: Float32Array | null = null;
  let labelPositionOffset = 0;
  let labelVertexStride = 0;
  const ATLAS = 1152; // 32 rows * ROW — the 32-label cap this atlas must fit
  const ROW = 36;
  const atlas = document.createElement('canvas');
  atlas.width = ATLAS;
  atlas.height = ATLAS;
  const actx = atlas.getContext('2d');
  const labelMat = new pc.StandardMaterial();
  if (actx && labels.length > 0) {
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
    apparatusNodes.forEach((n, li) => {
      nrm.set(-n[0], -n[1], -n[2]).normalize(); // faces the player at the center
      right.cross(up, nrm);
      if (right.length() < 1e-3) right.set(1, 0, 0); else right.normalize();
      upv.cross(nrm, right).normalize();
      const hgt = P.labelHeight;
      const wid = (widths[li] / ROW) * hgt;
      const lift = surface(apparatusHalf, n) + hgt * 0.85; // sits just above its node
      const cxp = n[0] + upv.x * lift, cyp = n[1] + upv.y * lift, czp = n[2] + upv.z * lift;
      labelCenters[li * 3] = cxp;
      labelCenters[li * 3 + 1] = cyp;
      labelCenters[li * 3 + 2] = czp;
      labelWidths[li] = wid;
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
    // Only the positions change. Pre-size a dynamic vertex buffer once, then
    // mutate its interleaved position fields in place in updateBillboards().
    lmesh.clear(true, false, labels.length * 4, labels.length * 6);
    lmesh.setPositions(lp);
    lmesh.setUvs(0, luv);
    lmesh.setIndices(lidx);
    lmesh.update(pc.PRIMITIVE_TRIANGLES);
    let labelExtent = P.apparatusRadius;
    for (const width of labelWidths) labelExtent = Math.max(labelExtent, P.apparatusRadius + width / 2);
    lmesh.aabb = new pc.BoundingBox(
      new pc.Vec3(),
      new pc.Vec3(labelExtent, labelExtent, labelExtent)
    );
    const positionElement = lmesh.vertexBuffer.format.elements
      .find((element) => element.name === pc.SEMANTIC_POSITION);
    if (!positionElement) throw new Error('point-cloud label mesh has no position stream');
    labelMesh = lmesh;
    labelVertexData = new Float32Array(lmesh.vertexBuffer.lock());
    labelPositionOffset = positionElement.offset / Float32Array.BYTES_PER_ELEMENT;
    labelVertexStride = positionElement.stride / Float32Array.BYTES_PER_ELEMENT;
    const lent = new pc.Entity('cloud-labels');
    lent.addComponent('render', { meshInstances: [new pc.MeshInstance(lmesh, labelMat)] });
    root.addChild(lent);
  }

  root.enabled = false;
  root.setLocalPosition(ox, oy, oz);
  app.root.addChild(root);

  const warmColors = tones.map(hex);
  const apparatusColor = hex(P.link); // the piece's own witness-blue, reused
  const linkColor = apparatusColor;
  let level = 0;
  let visible = false;
  let yaw = 0;

  /**
   * Rewrites the existing merged label mesh so every quad faces the live
   * camera. The mesh, typed-array view and all scalar scratch are retained;
   * this adds one small dynamic-buffer upload, not entities, draws or garbage.
   */
  function updateBillboards(): void {
    const vertexData = labelVertexData;
    const vertexBuffer = labelMesh?.vertexBuffer;
    const camera = app.systems.camera?.cameras[0]?.entity;
    if (!vertexData || !vertexBuffer || !camera) return;

    // root has only this translation + yaw. Transform the camera into the
    // constellation's local space without allocating a matrix or Vec3.
    const cameraWorld = camera.getPosition();
    const dx = cameraWorld.x - ox;
    const dy = cameraWorld.y - oy;
    const dz = cameraWorld.z - oz;
    const radians = yaw * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const cameraX = cosine * dx - sine * dz;
    const cameraY = dy;
    const cameraZ = sine * dx + cosine * dz;
    const halfHeight = P.labelHeight / 2;

    for (let li = 0; li < labels.length; li++) {
      const centerAt = li * 3;
      const centerX = labelCenters[centerAt];
      const centerY = labelCenters[centerAt + 1];
      const centerZ = labelCenters[centerAt + 2];

      // normal points from the label to the camera. right = worldUp × normal;
      // up = normal × right. That ordering keeps atlas U screen-left→right.
      let normalX = cameraX - centerX;
      let normalY = cameraY - centerY;
      let normalZ = cameraZ - centerZ;
      const normalLength = Math.sqrt(
        normalX * normalX + normalY * normalY + normalZ * normalZ
      );
      if (normalLength > 1e-6) {
        normalX /= normalLength;
        normalY /= normalLength;
        normalZ /= normalLength;
      } else {
        normalX = 0;
        normalY = 0;
        normalZ = 1;
      }

      let rightX = normalZ;
      let rightZ = -normalX;
      const rightLength = Math.sqrt(rightX * rightX + rightZ * rightZ);
      if (rightLength > 1e-6) {
        rightX /= rightLength;
        rightZ /= rightLength;
      } else {
        rightX = 1;
        rightZ = 0;
      }
      const upX = normalY * rightZ;
      const upY = normalZ * rightX - normalX * rightZ;
      const upZ = -normalY * rightX;
      const halfWidth = labelWidths[li] / 2;

      for (let corner = 0; corner < 4; corner++) {
        const horizontal = corner === 0 || corner === 3 ? -halfWidth : halfWidth;
        const vertical = corner < 2 ? halfHeight : -halfHeight;
        const vertexAt = (li * 4 + corner) * labelVertexStride + labelPositionOffset;
        vertexData[vertexAt] = centerX + rightX * horizontal + upX * vertical;
        vertexData[vertexAt + 1] = centerY + upY * vertical;
        vertexData[vertexAt + 2] = centerZ + rightZ * horizontal + upZ * vertical;
      }
    }
    vertexBuffer.unlock();
  }

  function applyFade(): void {
    // PERSON tier: soft — opacity never reaches 1, even at full fade. This is
    // the whole visual argument: the apparatus gets to be sharp, the rooms
    // where people are do not, on purpose.
    warmMats.forEach((m, t) => {
      const c = warmColors[t];
      const boost = level * 1.2; // the lamp temperature has to WIN against the sky
      m.emissive.set(c.r * boost, c.g * boost, c.b * boost);
      m.opacity = level * P.personOpacityCap;
      m.update();
    });
    // APPARATUS tier: sharp — full opacity, a brighter boost. Lit, not glowing.
    const aBoost = level * P.apparatusOpacityBoost;
    apparatusMat.emissive.set(apparatusColor.r * aBoost, apparatusColor.g * aBoost, apparatusColor.b * aBoost);
    apparatusMat.opacity = level;
    apparatusMat.update();
    // the apparatus's own link web — crisp, traceable
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
      updateBillboards();
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
      updateBillboards();
    }
  };
}
