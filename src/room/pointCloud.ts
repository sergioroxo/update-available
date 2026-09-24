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
import closeCard from '../../data/strings/close_restart.json';
import { drawDossier } from '../witness/dossier';

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
/**
 * ⚑ `aspect` MAKES A NODE A SLOT RATHER THAN A CUBE, and that is not decoration.
 * The piece has ONE grammar for *many rooms* — the relocation choreography's
 * building and the E4 finale's cyclorama both draw it as **vertical lit slots in
 * a dark field, rooms seen edge-on** (`REINTERP_THE_BUILDING_2026-08-02.md`).
 * The Close is that same image, and S92 built the two tiers correctly but left
 * every node a uniform cube: it verified that no SECOND visual language had been
 * invented without ever applying the FIRST. A cube field is a generic point
 * cloud; a slot field is this piece's building. Same mesh, same draw call, one
 * axis.
 */
function cubesMesh(device: pc.GraphicsDevice, centers: number[][], half: number, aspect = 1, keep?: number[]): pc.Mesh {
  const positions: number[] = keep ?? [];
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
    const hy = h * aspect; // the slot's height — its width and depth stay square
    for (const [cx, cy, cz] of C) positions.push(x + cx * h, y + cy * hy, z + cz * h);
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
  /** ⚑ S144: the player's own lines on each era's panel, set as the Close begins */
  setPlayerLines(linesByEra: Record<number, string[]>): void;
  /** ⚑ 2026-09-12: the Close can be LEFT now (Daniel's monitor's era buttons) —
   *  the sky goes on one frame and the ceiling's stickers come back, so a
   *  return to a room finds the room as it was */
  hide(): void;
  readonly visible: boolean;
  /** 0→1 as the ceiling's stars open out into the sky */
  readonly open: number;
  update(dt: number): void;
  /** ⚑ S163 / R3-111 — which panel a world-space ray lands on (0..3), or null.
   *  A press on a panel is the way to its sources (the frame's menu). */
  panelAt(p0: { x: number; y: number; z: number }, p1: { x: number; y: number; z: number }): number | null;
  /** ⚑ S163 / R3-112 — the drift pauses while the gaze rests on a panel
   *  ("the constellation should travel only when I am not moving… hard to
   *  read"): the caller says each frame whether the eye line is on one. */
  gazeOnPanel(on: boolean): void;
  /** …and holds still for `seconds` after any press */
  holdDrift(seconds: number): void;
  /** ⚑ S167 — THE CLEAR CORRIDOR (his 2026-09-21: "occlusion errors on the Close").
   *  Everything of the constellation that stands between the eye and Daniel's
   *  machine is in the way of it: labels and stars on that line of sight
   *  collapse, and so does a panel crossing it; the whole sky dims to `dim`.
   *  `null` clears it.
   *  ⚑ S174 / R4-15 — it was a BOX (|x| ≤ hx, zFar…zNear) and it only ever
   *  collapsed LABELS: the stars are merged meshes with one opacity per tone, so
   *  they could only dim, and the far machine stood speckled with them. And the
   *  panels were exempt ("they are the reading"), so the 1997 panel — whose arc
   *  bearing is exactly the machine's, 5 cm behind its glass — hung across the
   *  machine's top in the receipt frame. It is a SIGHT-LINE now: from `eye`,
   *  does this point land on the machine's silhouette in the glass plane? */
  setClearCorridor(c: SightCorridor | null): void;
  /** ⚑ S174 / R4-18 — which label a world-space ray lands on (a label on the
   *  sight-line to the machine is folded away and cannot be pressed), or null */
  labelAt(p0: { x: number; y: number; z: number }, p1: { x: number; y: number; z: number }): { era: number; text: string } | null;
  /** ⚑ S175 — a press on panel i: its story → its dossier, page by page → its story again */
  pressPanel(i: number): void;
  /** ⚑ S175 — a label pressed: its room's dossier on its room's panel, the label marked.
   *  Era 0 (the project's own documents) has no room: it opens on the panel you face. */
  openDossierFor(era: number, label: string | null): void;
}

/** the machine as seen from the eye: its silhouette in the plane of its glass */
export interface SightCorridor {
  eye: { x: number; y: number; z: number };
  /** the glass plane's z, the silhouette's centre x and half-width, its y range */
  z: number; x: number; hx: number; yLo: number; yHi: number;
  dim: number;
}

export function buildPointCloud(app: pc.Application): PointCloud {
  const rng = makeRng(19970704);
  const [ox, oy, oz] = P.center as number[];

  // ── PERSON nodes: dense gaussian-ish core + scattered satellites. Soft,
  // warm, unlabelled, unlinked — no names, no stories, no count a player can
  // read off. This is the exact population the single-tier build always
  // drew; only its material treatment (below) and its total silence (no
  // label, no link) are new. ──
  /**
   * ⚑ THE FOUR PANELS' SIGHT-LINES ARE KEPT CLEAR (S101), and only theirs.
   * Person nodes fill the whole sky, panels hang in it, and a warm slot drifting
   * across a line of text makes the ending's only prose unreadable. This rejects
   * a person node that would sit in the narrow corridor between the seat and a
   * panel — it does not thin the population (every rejection is re-rolled) and it
   * does not touch the count, the opacity or the silence. Nothing else in the
   * sky gets this courtesy: the apparatus's own labels are allowed to be crowded.
   */
  const panelBearings = ((network as { panels?: { era: number }[] }).panels ?? [])
    .map((pn) => ((P.eraBearingDeg as number[])[pn.era - 1] ?? 0) * Math.PI / 180);
  /** ⚑ 2026-09-13: the test is ANGULAR now — what the seat sees, not where the
   *  node is. A card is a rectangle of azimuth × elevation from the origin
   *  (its half-width and its top and bottom edges at `radius`), and anything
   *  inside that rectangle at ANY distance stands in front of the text or
   *  shows through it (the person mesh is one mesh, sorted from its centre,
   *  so depth does not save the card). Used for nodes and, sampled, for links. */
  const CARD_AZ = Math.atan2(P.panel.w / 2, P.panel.radius) + 0.04;
  const CARD_EL_LO = Math.atan2(P.panel.y - P.panel.h / 2, P.panel.radius) - 0.03;
  const CARD_EL_HI = Math.atan2(P.panel.y + P.panel.h / 2, P.panel.radius) + 0.03;
  function inCardView(x: number, y: number, z: number): boolean {
    const r = Math.sqrt(x * x + z * z);
    const el = Math.atan2(y, r);
    if (el < CARD_EL_LO || el > CARD_EL_HI) return false;
    const th = Math.atan2(x, -z);
    for (const b of panelBearings) {
      let d = th - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < CARD_AZ) return true;
    }
    return false;
  }
  function clearOfPanels(x: number, y: number, z: number): boolean {
    const r = Math.sqrt(x * x + z * z);
    // ⚑ 2026-09-13: and nothing LOW AND NEAR — Daniel's monitor lights on the
    //   desk in front of the seat at the end (closeMonitor.ts), and the cloud
    //   drifts, so a fixed box would rotate away: a cylinder under the eye line
    //   within 1.25 m is kept empty in every direction. Sérgio saw a star
    //   standing in the Restart card.
    if (r < 1.25 && y < 0.25) return false;
    return !inCardView(x, y, z);
  }

  const personNodes: number[][] = [];
  for (let i = 0; i < P.coreCount; i++) {
    // sum of 3 uniforms ≈ gaussian; core hugs the center — but a clear bubble
    // stays around the seated player so no node looms against the near clip
    let x = 0, y = 0, z = 0;
    for (let tries = 0; tries < 64; tries++) {   // ⚑ 64, not 8: with the cones AND the desk's cylinder kept clear, eight tries left ~2% of nodes wherever the eighth landed
      const r = P.innerClear + (P.coreRadius - P.innerClear) * ((rng() + rng() + rng()) / 3);
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      // positions are RELATIVE to the root (placed at P.center below) so the
      // drift rotation spins the constellation about its own center
      x = r * Math.sin(ph) * Math.cos(th);
      y = r * Math.cos(ph) * 0.75; // slightly flattened — a sky, not a ball
      z = r * Math.sin(ph) * Math.sin(th);
      if (clearOfPanels(x, y, z)) break;
    }
    personNodes.push([
      x, y, z,
      P.personScaleMin + rng() * (P.personScaleMax - P.personScaleMin) // gentle, uniform — no competing "hubs"
    ]);
  }
  for (let i = 0; i < P.satelliteCount; i++) {
    let x = 0, y = 0, z = 0;
    for (let tries = 0; tries < 64; tries++) {   // ⚑ 64, not 8: with the cones AND the desk's cylinder kept clear, eight tries left ~2% of nodes wherever the eighth landed
      const r = P.coreRadius + (P.outerRadius - P.coreRadius) * Math.pow(rng(), 0.6);
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      x = r * Math.sin(ph) * Math.cos(th);
      y = r * Math.cos(ph) * 0.6;
      z = r * Math.sin(ph) * Math.sin(th);
      if (clearOfPanels(x, y, z)) break;
    }
    personNodes.push([
      x, y, z,
      P.personScaleMin + rng() * ((P.personScaleMax - P.personScaleMin) * 0.6) // satellites stay a touch smaller
    ]);
  }

  /**
   * ── APPARATUS nodes: exactly one per close_network.json entry. ⚑ S101 — AND
   * THE SHAPE NOW MEANS SOMETHING. They were a Fibonacci/golden-angle spread,
   * which spaced the labels beautifully and said nothing: a player could trace
   * the web end to end and learn only that it was traceable. Each entry carries
   * the ERA OF THE PIECE IT GROUNDS, so the network is laid out the way the
   * piece is:
   *
   *   era 0 — the project's own frame, in a small cap DIRECTLY OVERHEAD, where
   *           the ceiling was and where the stars came from. The piece
   *           documents itself in the same image in which it documents the
   *           apparatus, and puts its own workings above its head, not off in
   *           a corner (Sérgio, 2026-07-24: the production should be disclosed
   *           prominently, "as in its core will be used as an example of AI for
   *           VR digital storytelling").
   *   eras 1-4 — one arc each, at four bearings 90° apart, in order. You turn
   *           through 1997 → 2003 → 2016 → now. ⚑ The turn is the piece's one
   *           bodily ask and this is the last time it asks for it.
   * ──
   */
  type Entry = { text: string; era: number };
  const entries = (network.labels as Entry[]).slice(0, 32);
  const labels = entries.map((e) => e.text);
  /** entry indices per era, in file order — the arcs, and the link chains */
  const byEra: number[][] = [[], [], [], [], []];
  entries.forEach((e, i) => { byEra[Math.max(0, Math.min(4, e.era | 0))].push(i); });
  const apparatusNodes: number[][] = new Array(entries.length);
  // era 0 — the frame, overhead: a small golden-angle cap so the project's own
  // nodes read as one cluster rather than as a fifth era.
  byEra[0].forEach((idx, j) => {
    const m = byEra[0].length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const th = j * golden;
    const rXZ = P.frameCapRadius * (m > 1 ? Math.sqrt((j + 0.6) / m) : 0);
    const jitter = 1 + (rng() - 0.5) * P.apparatusRadiusJitter * 0.5;
    apparatusNodes[idx] = [
      rXZ * Math.cos(th) * P.apparatusRadius * jitter,
      P.apparatusRadius * 0.62 * jitter, // overhead, at the sky's own flattening
      rXZ * Math.sin(th) * P.apparatusRadius * jitter,
      1
    ];
  });
  // eras 1-4 — one arc each, at its own bearing, fanned in elevation so the
  // labels never sit on one line
  const bearings = P.eraBearingDeg as number[];
  for (let era = 1; era <= 4; era++) {
    const group = byEra[era];
    const m = group.length;
    group.forEach((idx, j) => {
      const t = m > 1 ? j / (m - 1) - 0.5 : 0;
      // ⚑ THE ANCHORS HANG BESIDE THEIR PANEL (2026-09-12), to its right and
      //   a little below its foot — see cluster.json `_docCluster`. Two rows,
      //   scattered, so a cluster reads as a cluster and not as a line.
      const th = ((bearings[era - 1] ?? 0) + P.clusterOffsetDeg + t * P.arcSpreadDeg) * Math.PI / 180;
      const y = P.clusterY + (j % 2 ? -0.5 : 0.5) * P.clusterYSpread * (0.6 + rng() * 0.4);
      const jitter = 1 + (rng() - 0.5) * P.apparatusRadiusJitter;
      const r = P.apparatusRadius * jitter;
      // ⚑ bearing 0 is AHEAD of the seat: PlayCanvas looks down -Z, and the
      //   Close seats the camera at yaw 0, so era 1 is the first thing there.
      apparatusNodes[idx] = [
        r * Math.sin(th),
        y,
        -r * Math.cos(th),
        1
      ];
    });
  }

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
    // ⚑ 2026-09-13: and never ACROSS a card, from the seat's point of view —
    //   the frame's hand-down to an era swept across the card beside it
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      if (inCardView(a[0] + dx * t, a[1] + dy * t, a[2] + dz * t)) return;
    }
    const ta = surface(apparatusHalf, a) / d, tb = 1 - surface(apparatusHalf, b) / d;
    if (tb <= ta) return;
    apparatusLinkPositions.push(
      a[0] + dx * ta, a[1] + dy * ta, a[2] + dz * ta,
      a[0] + dx * tb, a[1] + dy * tb, a[2] + dz * tb
    );
  }
  /**
   * ⚑ S101 — THE WEB IS READ ERA BY ERA, AND THEN ACROSS. It used to be one
   * chain in file order plus a scatter of random cross-links: connected, by
   * construction, and arbitrary, by construction. Now:
   *
   *   · within an era, every anchor is chained to the next — each era is
   *     traceable on its own, which is what a panel's four lines are claiming;
   *   · between eras, EXACTLY THREE links, one per hand-over, from the last
   *     anchor of one arc to the first of the next. Three lines carry the whole
   *     argument: *the demand never changed, only the disguise* — and because
   *     there are only three, they can actually be followed;
   *   · the frame overhead is joined to the era it is a frame FOR — all of
   *     them — by one link each, so the piece's own workings hang off the thing
   *     they were built to document rather than floating free of it.
   */
  for (const group of byEra) {
    for (let i = 0; i < group.length - 1; i++) {
      tryLink(apparatusNodes[group[i]], apparatusNodes[group[i + 1]]);
    }
  }
  for (let era = 1; era <= 3; era++) {
    const from = byEra[era][byEra[era].length - 1];
    const to = byEra[era + 1][0];
    if (from !== undefined && to !== undefined) tryLink(apparatusNodes[from], apparatusNodes[to]);
  }
  byEra[0].forEach((idx, j) => {
    const era = 1 + (j % 4);
    const group = byEra[era];
    if (!group.length) return;
    tryLink(apparatusNodes[idx], apparatusNodes[group[j % group.length]]);
  });

  // ── build: one mesh per warm (person) tone + the apparatus mesh + the
  // apparatus link mesh ──
  const root = new pc.Entity('point-cloud');
  /** ⚑ S174 / R4-15 — each star mesh keeps its centres and its full vertex list,
   *  so a star on the sight-line to the machine can be folded to a point and
   *  given back when the line moves off it. One rewrite per CHANGE, not per frame. */
  const starTiers: { mesh: pc.Mesh; centers: number[][]; full: number[]; hidden: Uint8Array }[] = [];
  /** …and the apparatus's link lines, two vertices a segment (the receipt had one
   *  running diagonally through its text) */
  let linkMeshRef: pc.Mesh | null = null;
  let linkFull: number[] = [];
  let linkHidden = new Uint8Array(0);
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
    const full: number[] = [];
    const mesh = cubesMesh(app.graphicsDevice, byTone[t], personHalf, P.personSlotAspect, full);
    starTiers.push({ mesh, centers: byTone[t], full, hidden: new Uint8Array(byTone[t].length) });
    const e = new pc.Entity(`cloud-person-${t}`);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
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
  const apparatusFull: number[] = [];
  const apparatusMesh = cubesMesh(app.graphicsDevice, apparatusNodes, apparatusHalf, 1, apparatusFull);
  starTiers.push({ mesh: apparatusMesh, centers: apparatusNodes, full: apparatusFull, hidden: new Uint8Array(apparatusNodes.length) });
  apparatusEnt.addComponent('render', { meshInstances: [new pc.MeshInstance(apparatusMesh, apparatusMat)] });
  root.addChild(apparatusEnt);

  const linkMesh = new pc.Mesh(app.graphicsDevice);
  linkFull = apparatusLinkPositions.slice();
  linkHidden = new Uint8Array(apparatusLinkPositions.length / 6);
  linkMeshRef = linkMesh;
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
      // ⚑ S174 / R4-17 — the seven process labels (era 0: the project's own
      //   documents) in the link's cool blue, not the lamp's warm: Sérgio read
      //   them as "sources that aren't sources", and he was right that nothing
      //   told them apart. An existing hue (cluster.json `link`), no new colour.
      actx.fillStyle = entries[i].era === 0 ? P.link : P.labelColor;
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

  /**
   * ── ⚑ S101 — THE FOUR PANELS. Sérgio, 2026-09-02: *"the 4 panels with the
   * information"*, which is his own 2026-06-29 framing of the finale — *"four
   * panels (one per era) giving the audience the why/how/what of each"* — asked
   * for again, in the place it actually belongs. One panel hangs over each era's
   * arc, at that era's bearing, and it does NOT billboard: the panel is where it
   * is, and you turn to read it.
   *
   * ⚑ THEY ARE THE ONLY PROSE IN THE CLOSE, and they are deliberately flat —
   * what the apparatus DID, in the register the Dossier uses. No feelings, no
   * numbers of people, no title beat: `Your update has failed.` and `Restart as
   * you are.` belong to the update that brought you here and saying them twice
   * would explain the ending.
   *
   * One atlas, one mesh, one draw call, one material — the same treatment the
   * labels get (grayscale emissive × the texture, opacity ramped by the fade).
   * ──
   */
  type Panel = { era: number; years: string; title: string; text: string; status: string; image?: string };
  const panels = ((network as { panels?: Panel[] }).panels ?? []).slice(0, 4);
  const panelMat = new pc.StandardMaterial();
  let panelRedraw: ((linesByEra: Record<number, string[]>) => void) | null = null;
  /** ⚑ S175 — each panel's face: -1 = its room's story, n ≥ 0 = page n of its dossier */
  let panelFace: number[] = [];
  let panelLabel: (string | null)[] = [];
  let panelEra: number[] = [];
  /** the era whose dossier a panel is showing — its own, or 0 (how this was made) */
  let panelShowEra: number[] = [];
  let showPanel: ((i: number) => void) | null = null;
  let pressPanelImpl: ((i: number) => void) | null = null;
  /**
   * ⚑ 2026-09-12 (Phase D): the card carries the era's ROOM now. Sérgio: *"You
   * see the 4 panels around you that have the explanation and image of the
   * Era."* Each cell is the plate on the left (baked by
   * `tools/bake-close-plates.mjs` to `public/assets/close/era{N}.jpg`, drawn
   * into the atlas as it arrives — asset load, not runtime network), one
   * paragraph on the right in a reading face, and the panel's dossier status
   * in the corner. The card is wider for it (`cluster.json` panel.w 2.2 m) and
   * the atlas cell 1536 × 768. The text is set once, at build; the picture is
   * composited in when its bytes arrive and the texture re-uploaded ONCE.
   */
  const CELL_W = 1536;
  const CELL_H = 768;
  /** each panel's frame in the cloud's own space (centre, normal, right, up, half-sizes) — for `panelAt` */
  const panelFrames: { c: pc.Vec3; n: pc.Vec3; r: pc.Vec3; u: pc.Vec3; hw: number; hh: number }[] = [];
  /** S174 / R4-15: the panels' merged mesh, kept rewritable like the stars */
  let panelMesh: pc.Mesh | null = null;
  let panelFull: number[] = [];
  let panelHidden = new Uint8Array(0);
  const PLATE = { x: 40, y: 40, w: 600, h: 688 };
  const TEXT_X = PLATE.x + PLATE.w + 48;
  const TEXT_W = CELL_W - TEXT_X - 44;
  const READING_FACE = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const wrap = (c: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
    const out: string[] = [];
    let line = '';
    for (const w of text.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  };
  if (panels.length > 0) {
    const pcan = document.createElement('canvas');
    pcan.width = CELL_W;
    pcan.height = CELL_H * panels.length;
    const pc2 = pcan.getContext('2d');
    if (pc2) {
      pc2.clearRect(0, 0, pcan.width, pcan.height);
      pc2.textBaseline = 'middle';
      /**
       * ⚑ S144 — THE TEXT COLUMN IS REDRAWABLE, because at the Close it carries
       * YOUR OWN LINES: under each era's paragraph, two or three of the entries
       * the player actually filed in that room (THE_RECORD_PLAN §3E). Every
       * player reads a different Close. `drawText` is called once now with no
       * lines, and again from `setPlayerLines` when the Close begins.
       */
      const drawText = (panel: Panel, i: number, mine: string[]): void => {
        const y0 = i * CELL_H;
        // the plate: the sky's own colour, thickened — a card, not a window
        pc2.clearRect(TEXT_X - 24, y0 + 14, CELL_W - (TEXT_X - 24), CELL_H - 22);
        pc2.globalAlpha = 0.9;
        pc2.fillStyle = P.backdrop;
        pc2.fillRect(TEXT_X - 24, y0 + 14, CELL_W - (TEXT_X - 24), CELL_H - 22);
        pc2.globalAlpha = 1;
        pc2.font = 'bold 54px monospace';
        pc2.fillStyle = P.labelColor;
        pc2.fillText(`${panel.years}  ·  ${panel.title}`, TEXT_X, y0 + 96);
        // ⚑ the paragraph FITS its column (2026-09-13, Sérgio: "the text on top of
        //   the speculative"): the size steps down until the rows clear the stamp —
        //   and, at the Close, the player's own lines under it
        // ⚑ S146 — the paragraph keeps 28 px (≈19 headset px at 3.05 m, measured
        //   by tools/quest-e4.mjs) before the player's own lines take space:
        //   the 2026 panel with three lines fell to 26 px. The lines yield first —
        //   three, then two, then one — and only then does the paragraph shrink.
        const TOP = 168;
        const fit = (n: number): { size: number; rows: string[] } => {
          const bottom = CELL_H - 96 - (n ? 34 + n * 30 : 0);
          let size = 34; let rows: string[] = [];
          for (; size >= 22; size -= 2) {
            pc2.font = `${size}px ${READING_FACE}`;
            rows = wrap(pc2, panel.text, TEXT_W);
            if (TOP + rows.length * Math.round(size * 1.3) <= bottom) break;
          }
          return { size, rows };
        };
        let lines = mine;
        let best = fit(lines.length);
        while (best.size < 28 && lines.length > 1) { lines = lines.slice(0, lines.length - 1); best = fit(lines.length); }
        const { size, rows } = best;
        const lineH = Math.round(size * 1.3);
        // ⚑ S145 — the size the fit landed on, published for tools/quest-e4.mjs:
        //   at 3.05 m a 22 px line is ~15 headset px, the floor of legibility
        (window as unknown as { __closePanelSizes: Record<number, { size: number; rows: number; mine: number }> }).__closePanelSizes ??= {};
        (window as unknown as { __closePanelSizes: Record<number, { size: number; rows: number; mine: number }> }).__closePanelSizes[i] = { size, rows: rows.length, mine: lines.length };
        pc2.fillStyle = (P.warm as string[])[2];
        rows.forEach((row, li) => pc2.fillText(row, TEXT_X, y0 + TOP + li * lineH));
        if (lines.length) {
          // your file, in this room: the record's own cold lines, in the web's blue
          // ⚑ S150 — `y0 +`: without it every era's lines were drawn into the FIRST
          //   cell, so the 1997 panel carried 2026's lines twice over and the
          //   others carried none (Sérgio's Close frame, 09-17; OPEN_ITEMS R3-114)
          let my = y0 + TOP + rows.length * lineH + 30;
          pc2.font = '22px monospace';
          pc2.fillStyle = P.link;
          pc2.fillText(P.panelMineLabel, TEXT_X, my);
          my += 30;
          pc2.font = `24px ${READING_FACE}`;
          pc2.fillStyle = P.labelColor;
          for (const m of lines) { pc2.fillText('· ' + wrap(pc2, m, TEXT_W - 30)[0], TEXT_X, my); my += 30; }
        }
        // ⚑ S163 / R3-111 — no stamp on the panel (Sérgio: "don't want the
        //   'documentary' label"): the status and the sources are the FRAME's to
        //   show — the menu's "The Close's panels — sources", reached by a press
        //   on the panel itself (`panelAt`). The panel says what happened; the
        //   frame says how well it is documented.
      };
      const plates: (HTMLImageElement | null)[] = panels.map(() => null);
      const lastLines: string[][] = panels.map(() => []);
      const drawPlate = (i: number): void => {
        const img = plates[i];
        if (!img) return;
        const y0 = i * CELL_H;
        // cover-fit the picture into its well
        const sc = Math.max(PLATE.w / img.width, PLATE.h / img.height);
        const dw = img.width * sc, dh = img.height * sc;
        pc2.save();
        pc2.beginPath();
        pc2.rect(PLATE.x, y0 + PLATE.y, PLATE.w, PLATE.h);
        pc2.clip();
        pc2.drawImage(img, PLATE.x + (PLATE.w - dw) / 2, y0 + PLATE.y + (PLATE.h - dh) / 2, dw, dh);
        pc2.restore();
      };
      /** the room's face: the plate, the paragraph, your lines — and one frame-voice line under them */
      const drawStoryCell = (panel: Panel, i: number): void => {
        const y0 = i * CELL_H;
        pc2.clearRect(0, y0, CELL_W, CELL_H);
        pc2.globalAlpha = 0.9;
        pc2.fillStyle = P.backdrop;
        pc2.fillRect(0, y0 + 8, CELL_W, CELL_H - 16);
        pc2.globalAlpha = 1;
        // one rule along the top, in the web's own blue
        pc2.fillStyle = P.link;
        pc2.fillRect(0, y0 + 8, CELL_W, 5);
        // where the picture goes: a dark well until it arrives
        pc2.fillStyle = P.backdrop;
        pc2.fillRect(PLATE.x, y0 + PLATE.y, PLATE.w, PLATE.h);
        drawPlate(i);
        drawText(panel, i, lastLines[i]);
        // ⚑ S175: the way in to its sources, said once, small, in the web's blue
        pc2.font = '24px monospace';
        pc2.fillStyle = P.link;
        pc2.textBaseline = 'middle';
        pc2.fillText(closeCard.source.panelHint + '  ›', TEXT_X, y0 + CELL_H - 48);
      };
      /**
       * ⚑ S175 — THE ROOM'S DOSSIER, ON ITS OWN PANEL. Sérgio: "the sources open
       * need to be on the 4 panels that make the Close — it is nuisance to go back
       * and forth. Instead of the computer." A press on a panel turns it to its
       * room's dossier, drawn in that room's own OS (witness/dossier.ts), page by
       * page; the last page's press turns it back to the room. Drawn at ×3 into
       * the cell — 512 × 256 logical, the 1997 desktop's own pixel scale.
       */
      const drawDossierCell = (i: number): void => {
        const y0 = i * CELL_H;
        pc2.save();
        pc2.clearRect(0, y0, CELL_W, CELL_H);
        pc2.beginPath();
        pc2.rect(0, y0, CELL_W, CELL_H);
        pc2.clip();
        pc2.translate(0, y0);
        pc2.scale(CELL_W / 512, CELL_H / 256);
        const r = drawDossier(pc2, 512, 256, panelShowEra[i], panelLabel[i], panelFace[i], (pg, n) =>
          pg + 1 < n ? closeCard.source.panelNext.replace('{p}', String(pg + 1)).replace('{n}', String(n))
            : closeCard.source.panelBack);
        pc2.restore();
        panelFace[i] = r.page;
        dossierPages[i] = r.pages;
      };
      const dossierPages: number[] = panels.map(() => 1);
      panelFace = panels.map(() => -1);
      panelLabel = panels.map(() => null);
      panelEra = panels.map((pn) => pn.era);
      panelShowEra = panels.map((pn) => pn.era);
      panels.forEach((panel, i) => drawStoryCell(panel, i));
      showPanel = (i: number): void => {
        if (panelFace[i] < 0) drawStoryCell(panels[i], i);
        else drawDossierCell(i);
        ptex.upload();
      };
      pressPanelImpl = (i: number): void => {
        if (panelFace[i] < 0) { panelFace[i] = 0; panelLabel[i] = null; panelShowEra[i] = panelEra[i]; }
        else if (panelFace[i] + 1 >= dossierPages[i]) { panelFace[i] = -1; panelShowEra[i] = panelEra[i]; panelLabel[i] = null; }
        else panelFace[i] += 1;
        showPanel?.(i);
      };
      panelRedraw = (linesByEra) => {
        panels.forEach((panel, i) => {
          lastLines[i] = linesByEra[panel.era] ?? [];
          if (panelFace[i] < 0) drawStoryCell(panel, i);
        });
        ptex.upload();
      };
      const ptex = new pc.Texture(app.graphicsDevice, {
        width: pcan.width, height: pcan.height, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
        minFilter: pc.FILTER_LINEAR, magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
      });
      ptex.setSource(pcan);
      // the room plates, composited in as they load — one re-upload each
      panels.forEach((panel, i) => {
        if (!panel.image) return;
        const img = new Image();
        img.onload = (): void => {
          plates[i] = img;
          if (panelFace[i] < 0) { drawPlate(i); ptex.upload(); }
        };
        img.src = panel.image;
      });
      panelMat.useLighting = false;
      panelMat.diffuse = new pc.Color(0, 0, 0);
      panelMat.emissive = new pc.Color(0, 0, 0);
      panelMat.emissiveMap = ptex;
      panelMat.opacityMap = ptex;
      panelMat.blendType = pc.BLEND_NORMAL;
      panelMat.opacity = 0;
      panelMat.cull = pc.CULLFACE_NONE;
      panelMat.depthWrite = false;
      panelMat.update();

      const pp: number[] = [];
      const puv: number[] = [];
      const pidx: number[] = [];
      const pUp = new pc.Vec3(0, 1, 0);
      const pN = new pc.Vec3();
      const pR = new pc.Vec3();
      const pU = new pc.Vec3();
      panels.forEach((panel, i) => {
        const bearing = ((P.eraBearingDeg as number[])[panel.era - 1] ?? 0) * Math.PI / 180;
        const cx = P.panel.radius * Math.sin(bearing);
        const cz = -P.panel.radius * Math.cos(bearing);
        const cy = P.panel.y;
        pN.set(-cx, 0, -cz).normalize(); // faces the seat, upright — never tilted
        pR.cross(pUp, pN);
        if (pR.length() < 1e-3) pR.set(1, 0, 0); else pR.normalize();
        pU.cross(pN, pR).normalize();
        const hw = P.panel.w / 2;
        const hh = P.panel.h / 2;
        panelFrames[i] = { c: new pc.Vec3(cx, cy, cz), n: pN.clone(), r: pR.clone(), u: pU.clone(), hw, hh };
        const base = i * 4;
        for (const [ux, uy] of [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]]) {
          pp.push(cx + pR.x * ux + pU.x * uy, cy + pR.y * ux + pU.y * uy, cz + pR.z * ux + pU.z * uy);
        }
        const v0 = (i * CELL_H) / pcan.height;
        const v1 = ((i + 1) * CELL_H) / pcan.height;
        puv.push(0, v0, 1, v0, 1, v1, 0, v1);
        pidx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      });
      const pmesh = new pc.Mesh(app.graphicsDevice);
      panelMesh = pmesh;
      panelFull = pp.slice();
      panelHidden = new Uint8Array(panels.length);
      pmesh.setPositions(pp);
      pmesh.setUvs(0, puv);
      pmesh.setIndices(pidx);
      pmesh.update(pc.PRIMITIVE_TRIANGLES);
      const pent = new pc.Entity('cloud-panels');
      pent.addComponent('render', { meshInstances: [new pc.MeshInstance(pmesh, panelMat)] });
      root.addChild(pent);
    }
  }

  root.enabled = false;
  root.setLocalPosition(ox, oy, oz);
  app.root.addChild(root);
  // ⚑ S175 review aid (read-only, like __closePanelSizes): where each panel hangs
  //   in the world right now, and what it shows — so a probe can aim a REAL press
  (window as unknown as { __closePanels: () => unknown }).__closePanels = () => {
    const M = root.getWorldTransform();
    return panelFrames.map((f, i) => {
      const w = M.transformPoint(new pc.Vec3(f.c.x, f.c.y, f.c.z));
      return { i, era: panelEra[i], face: panelFace[i], hidden: panelHidden[i] === 1, x: w.x, y: w.y, z: w.z };
    });
  };

  /**
   * ── ⚑ S101 — THE STARS ON THE CEILING, and they are a real object in the
   * room, not an effect at the ending. Glow-in-the-dark star stickers over the
   * seat: the reference Sérgio's own constellation brief names, up there for the
   * whole piece, unlabelled, never pointed at, and warm — they belong to the
   * person tier, because somebody put them up.
   *
   * At the Close the constellation opens out of exactly this patch (see
   * `update` below) and these fade as it goes. Nothing is swapped and nothing is
   * spawned: the stars a child stuck to a ceiling in 1997 are the shape the
   * network of everything that was done to people is drawn in. ONE merged mesh,
   * one draw call, in every era.
   * ──
   */
  const CEIL = P.ceiling;
  const ceilingStars: number[][] = [];
  for (let i = 0; i < CEIL.count; i++) {
    const th = rng() * Math.PI * 2;
    const rr = CEIL.radius * Math.sqrt(rng());
    ceilingStars.push([rr * Math.cos(th), (rng() - 0.5) * 0.012, rr * Math.sin(th), 0.6 + rng() * 0.8]);
  }
  const ceilingMat = new pc.StandardMaterial();
  ceilingMat.useLighting = false;
  ceilingMat.diffuse = new pc.Color(0, 0, 0);
  const ceilingHue = hex((P.warm as string[])[0]);
  // ⚑ over 1: a sticker that has been charging all day, not a brown chip
  ceilingMat.emissive = new pc.Color(ceilingHue.r * 1.25, ceilingHue.g * 1.25, ceilingHue.b * 1.15);
  ceilingMat.blendType = pc.BLEND_NORMAL;
  ceilingMat.opacity = CEIL.opacity;
  ceilingMat.depthWrite = false;
  ceilingMat.update();
  const ceilingEnt = new pc.Entity('close-ceiling-stars');
  ceilingEnt.addComponent('render', {
    meshInstances: [new pc.MeshInstance(
      cubesMesh(app.graphicsDevice, ceilingStars, CEIL.size / 2, 0.35), ceilingMat
    )]
  });
  const anchor = P.ceilingAnchor as number[];
  ceilingEnt.setLocalPosition(anchor[0], anchor[1], anchor[2]);
  app.root.addChild(ceilingEnt);

  const warmColors = tones.map(hex);
  const apparatusColor = hex(P.link); // the piece's own witness-blue, reused
  const linkColor = apparatusColor;
  let fadeLevel = 0;
  let visible = false;
  let yaw = 0;
  /** 0 = gathered on the ceiling, 1 = open around the seat. See `openSeconds`. */
  let openK = 0;
  /** ⚑ S163 / R3-112 — the drift's own gain: eases to 0 while the gaze rests on a
   *  panel or a press has just landed, back to 1 when the eye moves on. Never a
   *  snap: a sky that stops dead reads as a bug, one that settles reads as a hand. */
  let driftK = 1;
  let gazeHeld = false;
  let holdT = 0;
  const DRIFT_EASE_SECONDS = 1.6;
  const invRoot = new pc.Mat4();
  const lp0 = new pc.Vec3(), lp1 = new pc.Vec3(), ld = new pc.Vec3(), lh = new pc.Vec3();
  let corridor: SightCorridor | null = null;
  const lw = new pc.Vec3();
  const sw = new pc.Vec3();

  /** ⚑ S174 / R4-15 — from the eye, does world point (x, y, z) land on the
   *  machine's silhouette (± margin) in the plane of its glass? Only what stands
   *  between the eye and the machine counts — or no more than `behind` past its
   *  glass, which the body would otherwise hide on its own. */
  function onSight(x: number, y: number, z: number, margin: number, behind = 0.05): boolean {
    const c = corridor;
    if (!c) return false;
    const e = c.eye;
    if (z >= e.z - 0.05 || z < c.z - behind) return false;
    const s = (c.z - e.z) / (z - e.z);
    const hx = e.x + (x - e.x) * s;
    const hy = e.y + (y - e.y) * s;
    return Math.abs(hx - c.x) <= c.hx + margin && hy >= c.yLo - margin && hy <= c.yHi + margin;
  }

  /** fold every vertex of a hidden group onto that group's centre (a point
   *  draws nothing), give the rest back — straight into the vertex buffer, as
   *  the labels have always been written */
  function rewrite(mesh: pc.Mesh, full: number[], hidden: Uint8Array, per: number, centre: (g: number) => number[]): void {
    const vb = mesh.vertexBuffer;
    const el = vb?.format.elements.find((element) => element.name === pc.SEMANTIC_POSITION);
    if (!vb || !el) return;
    const data = new Float32Array(vb.lock());
    const off = el.offset / Float32Array.BYTES_PER_ELEMENT;
    const stride = el.stride / Float32Array.BYTES_PER_ELEMENT;
    for (let g = 0; g < hidden.length; g++) {
      const c = hidden[g] ? centre(g) : null;
      for (let k = 0; k < per; k++) {
        const v = g * per + k;
        const at = v * stride + off;
        data[at] = c ? c[0] : full[v * 3];
        data[at + 1] = c ? c[1] : full[v * 3 + 1];
        data[at + 2] = c ? c[2] : full[v * 3 + 2];
      }
    }
    vb.unlock();
  }

  /** per frame while the machine is in view: which stars and panels stand on
   *  the sight-line. The sky drifts, so the answer moves — but the buffers are
   *  rewritten only when it CHANGES (a star crossing in or out), not per frame. */
  function applySight(): void {
    const M = root.getWorldTransform();
    for (const tier of starTiers) {
      let changed = false;
      for (let i = 0; i < tier.centers.length; i++) {
        let h = 0;
        if (corridor) {
          const c = tier.centers[i];
          M.transformPoint(sw.set(c[0], c[1], c[2]), sw);
          h = onSight(sw.x, sw.y, sw.z, 0.06) ? 1 : 0;
        }
        if (h !== tier.hidden[i]) { tier.hidden[i] = h; changed = true; }
      }
      if (changed) rewrite(tier.mesh, tier.full, tier.hidden, 8, (g) => tier.centers[g]);
    }
    if (linkMeshRef) {
      let changed = false;
      for (let i = 0; i < linkHidden.length; i++) {
        let h = 0;
        if (corridor) {
          const a = i * 6;
          for (let k = 0; k <= 4 && !h; k++) {   // both ends and three points between
            const t = k / 4;
            M.transformPoint(sw.set(
              linkFull[a] + (linkFull[a + 3] - linkFull[a]) * t,
              linkFull[a + 1] + (linkFull[a + 4] - linkFull[a + 1]) * t,
              linkFull[a + 2] + (linkFull[a + 5] - linkFull[a + 2]) * t), sw);
            if (onSight(sw.x, sw.y, sw.z, 0.04)) h = 1;
          }
        }
        if (h !== linkHidden[i]) { linkHidden[i] = h; changed = true; }
      }
      if (changed) rewrite(linkMeshRef, linkFull, linkHidden, 2, (g) => [linkFull[g * 6], linkFull[g * 6 + 1], linkFull[g * 6 + 2]]);
    }
    if (panelMesh) {
      let changed = false;
      for (let i = 0; i < panelFrames.length; i++) {
        let h = 0;
        if (corridor) {
          // a panel is big: sample it on a 3 × 3 grid; one sitting just past
          // the glass still hangs across the machine's top, so it counts too
          const f = panelFrames[i];
          for (let a = -1; a <= 1 && !h; a++) {
            for (let b = -1; b <= 1 && !h; b++) {
              M.transformPoint(sw.set(
                f.c.x + f.r.x * a * f.hw + f.u.x * b * f.hh,
                f.c.y + f.r.y * a * f.hw + f.u.y * b * f.hh,
                f.c.z + f.r.z * a * f.hw + f.u.z * b * f.hh), sw);
              // S175: 3 cm, not 18 — panels are pressable now (their dossiers), and a
              //   folded panel cannot be pressed; the 1997 panel clears the machine's
              //   top by ~3 cm, so it folds only on a real overlap
              if (onSight(sw.x, sw.y, sw.z, 0.03, 0.6)) h = 1;
            }
          }
        }
        if (h !== panelHidden[i]) { panelHidden[i] = h; changed = true; }
      }
      if (changed) rewrite(panelMesh, panelFull, panelHidden, 4, (g) => [panelFrames[g].c.x, panelFrames[g].c.y, panelFrames[g].c.z]);
    }
  }

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

    /**
     * ⚑ SCREEN-ALIGNED, not world-up-aligned (S101). The old frame built `up`
     * out of world-up and the direction to the camera, which is correct for a
     * label you look at roughly level and falls apart for one you look STRAIGHT
     * UP AT: `up` goes flat, and the quad turns into a diagonal smear. Era 0's
     * anchors — the project's own frame — hang directly overhead, so that case
     * is now the ending's most-looked-at text rather than a corner case.
     * Taking `right`/`up` from the camera's own basis makes every label face the
     * viewer squarely from any angle, and it also drops the local-space position
     * maths the root's new scale would otherwise have invalidated.
     */
    const camRight = camera.right;
    const camUp = camera.up;
    const radians = yaw * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    // the root carries this yaw, so the camera's basis is rotated into its space
    const rightX = cosine * camRight.x - sine * camRight.z;
    const rightY = camRight.y;
    const rightZ = sine * camRight.x + cosine * camRight.z;
    const upX = cosine * camUp.x - sine * camUp.z;
    const upY = camUp.y;
    const upZ = sine * camUp.x + cosine * camUp.z;
    const halfHeight = P.labelHeight / 2;

    const rootM = corridor ? root.getWorldTransform() : null;
    for (let li = 0; li < labels.length; li++) {
      const centerAt = li * 3;
      const centerX = labelCenters[centerAt];
      const centerY = labelCenters[centerAt + 1];
      const centerZ = labelCenters[centerAt + 2];
      let halfWidth = labelWidths[li] / 2;
      if (rootM && corridor) {
        // S167: a label on the sight-line to the machine collapses to nothing
        //   (S174: the sight-line, not a box — see SightCorridor)
        rootM.transformPoint(lw.set(centerX, centerY, centerZ), lw);
        if (onSight(lw.x, lw.y, lw.z, labelWidths[li] / 2)) halfWidth = 0;
      }

      for (let corner = 0; corner < 4; corner++) {
        const horizontal = corner === 0 || corner === 3 ? -halfWidth : halfWidth;
        const vertical = corner < 2 ? halfHeight : -halfHeight;
        const vertexAt = (li * 4 + corner) * labelVertexStride + labelPositionOffset;
        vertexData[vertexAt] = centerX + rightX * horizontal + upX * vertical;
        vertexData[vertexAt + 1] = centerY + rightY * horizontal + upY * vertical;
        vertexData[vertexAt + 2] = centerZ + rightZ * horizontal + upZ * vertical;
      }
    }
    vertexBuffer.unlock();
  }

  function applyFade(): void {
    const level = fadeLevel * (corridor ? corridor.dim : 1);   // S167: dimmed while the card is read
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
    // the four panels, on the same ramp — they arrive with the sky, not after it
    // (and never dim for the corridor: they are the reading, not the weather)
    const pl = fadeLevel * 1.25;
    panelMat.emissive.set(pl, pl, pl);
    panelMat.opacity = fadeLevel;
    panelMat.update();
  }

  /**
   * ⚑ THE OPENING. The stars gathered over the seat become the sky around it:
   * ONE root, lerped from the ceiling anchor at `openFromScale` to the
   * constellation's own centre at full size, while the ceiling's own patch fades
   * out underneath it. Uniform scale on purpose — the labels and the panels are
   * quads on this root, and a squashed axis would squash their text.
   */
  function applyOpen(): void {
    const k = openK * openK * (3 - 2 * openK); // smoothstep, as everywhere else
    root.setLocalPosition(
      anchor[0] + (ox - anchor[0]) * k,
      anchor[1] + (oy - anchor[1]) * k,
      anchor[2] + (oz - anchor[2]) * k
    );
    const sc = P.openFromScale + (1 - P.openFromScale) * k;
    root.setLocalScale(sc, sc, sc);
    // …and the stickers go out as the thing they became comes up
    ceilingMat.opacity = CEIL.opacity * (1 - k);
    ceilingMat.update();
  }

  return {
    show(): void {
      visible = true;
      root.enabled = true;
      openK = 0;
      applyOpen();
      updateBillboards();
    },
    setPlayerLines(linesByEra: Record<number, string[]>): void { panelRedraw?.(linesByEra); },
    hide(): void {
      visible = false;
      root.enabled = false;
      openK = 0;
      fadeLevel = 0;
      corridor = null;
      applySight();   // S174: every folded star and panel back, for the next Close
      // S175: and every panel back to its room's face
      panelFace.forEach((f, i) => { if (f >= 0) { panelFace[i] = -1; panelShowEra[i] = panelEra[i]; panelLabel[i] = null; showPanel?.(i); } });
      applyFade();
      ceilingMat.opacity = CEIL.opacity;
      ceilingMat.update();
    },
    /** how far the sky has opened, 0→1 — the room holds until this is well under
     *  way, so the stars are still ON a ceiling when they start to move */
    get open(): number { return openK; },
    get visible(): boolean { return visible; },
    update(dt: number): void {
      if (!visible) return;
      if (fadeLevel < 1) {
        fadeLevel = Math.min(1, fadeLevel + dt / P.fadeSeconds);
        applyFade();
      }
      if (openK < 1) {
        openK = Math.min(1, openK + dt / P.openSeconds);
        applyOpen();
      }
      if (holdT > 0) holdT = Math.max(0, holdT - dt);
      const want = gazeHeld || holdT > 0 ? 0 : 1;
      driftK += (want - driftK) * Math.min(1, dt / DRIFT_EASE_SECONDS);
      yaw += P.driftDegPerSec * dt * driftK; // the slow drift — alive, not surveilled; still while read (R3-112)
      root.setLocalEulerAngles(0, yaw, 0);
      updateBillboards();
      if (corridor) applySight();
    },
    panelAt(p0, p1): number | null {
      if (!visible || panelFrames.length === 0) return null;
      invRoot.copy(root.getWorldTransform()).invert();
      invRoot.transformPoint(lp0.set(p0.x, p0.y, p0.z), lp0);
      invRoot.transformPoint(lp1.set(p1.x, p1.y, p1.z), lp1);
      ld.sub2(lp1, lp0);
      for (let i = 0; i < panelFrames.length; i++) {
        const f = panelFrames[i];
        const denom = ld.dot(f.n);
        if (Math.abs(denom) < 1e-6) continue;
        const t = (f.c.dot(f.n) - lp0.dot(f.n)) / denom;
        if (t < 0 || t > 1) continue;
        lh.copy(ld).mulScalar(t).add(lp0).sub(f.c);
        if (Math.abs(lh.dot(f.r)) <= f.hw && Math.abs(lh.dot(f.u)) <= f.hh) return i;
      }
      return null;
    },
    labelAt(p0, p1): { era: number; text: string } | null {
      const camera = app.systems.camera?.cameras[0]?.entity;
      if (!visible || !camera || fadeLevel < 0.5 || labels.length === 0) return null;
      const M = root.getWorldTransform();
      const sc = root.getLocalScale().x;
      const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
      const dd = dx * dx + dy * dy + dz * dz;
      if (dd < 1e-9) return null;
      const right = camera.right, up = camera.up;
      let best = -1, bestT = Infinity;
      for (let i = 0; i < labels.length; i++) {
        M.transformPoint(sw.set(labelCenters[i * 3], labelCenters[i * 3 + 1], labelCenters[i * 3 + 2]), sw);
        if (corridor && onSight(sw.x, sw.y, sw.z, labelWidths[i] / 2)) continue;   // folded away
        const t = ((sw.x - p0.x) * dx + (sw.y - p0.y) * dy + (sw.z - p0.z) * dz) / dd;
        if (t <= 0 || t >= bestT) continue;
        const ox = sw.x - (p0.x + dx * t), oy = sw.y - (p0.y + dy * t), oz = sw.z - (p0.z + dz * t);
        const h = Math.abs(ox * right.x + oy * right.y + oz * right.z);
        const v = Math.abs(ox * up.x + oy * up.y + oz * up.z);
        // the quad's own size, plus a little: a label is small, and a press is a press
        if (h <= (labelWidths[i] / 2) * sc + 0.03 && v <= (P.labelHeight / 2) * sc + 0.03) { best = i; bestT = t; }
      }
      return best >= 0 ? { era: entries[best].era, text: entries[best].text } : null;
    },
    pressPanel(i: number): void { pressPanelImpl?.(i); },
    openDossierFor(era: number, label: string | null): void {
      if (!showPanel || panelFrames.length === 0) return;
      let i = panelEra.indexOf(era);
      if (i < 0) {
        // no room of its own: the panel nearest the camera's forward, in the cloud's space
        const camera = app.systems.camera?.cameras[0]?.entity;
        if (!camera) return;
        invRoot.copy(root.getWorldTransform()).invert();
        const f = camera.forward;
        invRoot.transformVector(lp0.set(f.x, f.y, f.z), lp0);
        const th = Math.atan2(lp0.x, -lp0.z);
        let best = 0, bestD = Infinity;
        panelFrames.forEach((pf, k) => {
          let d = Math.atan2(pf.c.x, -pf.c.z) - th;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = k; }
        });
        i = best;
      }
      panelShowEra[i] = era;
      panelLabel[i] = label;
      panelFace[i] = 0;
      showPanel(i);
    },
    gazeOnPanel(on: boolean): void { gazeHeld = on; },
    holdDrift(seconds: number): void { holdT = Math.max(holdT, seconds); },
    setClearCorridor(c): void {
      const same = (c === null && corridor === null) || (!!c && !!corridor && c.dim === corridor.dim && c.hx === corridor.hx
        && c.yLo === corridor.yLo && c.yHi === corridor.yHi && c.z === corridor.z
        && Math.abs(c.eye.x - corridor.eye.x) < 1e-3 && Math.abs(c.eye.y - corridor.eye.y) < 1e-3 && Math.abs(c.eye.z - corridor.eye.z) < 1e-3);
      if (same) return;
      const dimChanged = (c?.dim ?? 1) !== (corridor?.dim ?? 1);
      corridor = c;
      if (dimChanged) applyFade();
      updateBillboards();
      applySight();   // S174: clearing it gives every star and panel back
    }
  };
}
