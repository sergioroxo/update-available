/**
 * ⚑ S354 — SHEPHERD LIVE™'S STUDIO (UiB job 11 Part A; DESIGN_COMMONS_REVAMP_2026-11-10.md §2a/§2b, his 10 Nov
 * answers). The same Commons space, staged by the system's AI host before the people take it: a pale floor laid over
 * the dance tiles, the host beside the screen on its own riser, at the stage's distance (never nearer — the personal-space
 * finding, RESEARCH_COMMONS_STREAM §3.3), a halo ring behind its head, and a cold key light where the stream's warm
 * stage light will be. No crowd, no sweeping colours: one viewer, her.
 *
 * ⚑ THE HOST HAS NO VOICE AND NO FACE (his 10 Nov): a faceless robed figure, pale, like every figure in the piece
 * (commonsFigures.ts: a body and a head, never a face). Its satire is its PRODUCT surface — the halo is a lighting
 * rig, the light is a studio key — never faith, never Jesus as believers hold him. It does not move toward her.
 *
 * ⚑ SURFACES THE PEOPLE TAKE BACK (Part B): `freeCommonsHost('halo')` turns the ring from the host's pale light to the
 * stream's warm one; `freeCommonsHost('key')` the key light. The rest of the six live on the screen's canvas (ball.ts).
 * `setCommonsHost(false)` puts the space back as the stream's (Part C: while her back is turned).
 *
 * Budget: three draw calls while it is up (the floor + the projector's body; the see-through hologram; the halo,
 * whose colour changes) — and it is only up while the crowd is not, so the world's peak does not rise.
 */
import * as pc from 'playcanvas';
import { PLACE, ERA4, BALL } from '../desktop/theme/era4';
import { WORLD } from './commonsWorld';

export type HostSurface = 'always' | 'halo' | 'friends' | 'key' | 'safety' | 'metrics' | 'picture';

let hook: ((on: boolean) => void) | null = null;
let freeHook: ((s: HostSurface) => void) | null = null;
/** the studio is up (the host, its halo, its pale floor, its cold light), or the space is the stream's */
export function setCommonsHost(on: boolean): void { hook?.(on); }
/** one of the host's surfaces is taken back by the people (only the 3D ones act here: halo, key) */
export function freeCommonsHost(s: HostSurface): void { freeHook?.(s); }
let shoveHook: (() => void) | null = null;
/**
 * ⚑ S370 / C1 (UIB_JOB_16 Part C1 step 3: "TransJesus steps on and the host's hologram is pushed aside") — the moment
 * TransJesus lands beside the host's screen, the hologram is pushed OFF ITS PAD: it stutters (three short dips of its
 * light, the system's own failure, never the people's), slides back and further right (0.5 m, 0.8 m) and stays there,
 * faint, while its pad glows empty. It still talks (the caption band is the glass's); it no longer has the floor.
 */
export function shoveCommonsHost(): void { shoveHook?.(); }

/** the host's cold light and pale things; the people's warm light (all era-4 tokens) */
const PALE = { floor: ERA4.photoSkyHi, halo: ERA4.glow, key: ERA4.glow };
const WARM = { halo: PLACE.textileHi, key: BALL.attention };

function pushBox(pos: number[], idx: number[], col: number[], c: pc.Color, x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
  const base = pos.length / 3;
  const C = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const F = [[0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1], [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]];
  for (const [cx, cy, cz] of C) { pos.push(x + cx * hx, y + cy * hy, z + cz * hz); col.push(c.r, c.g, c.b, 1); }
  for (const f of F) for (const i of f) idx.push(base + i);
}

export function mountCommonsHost(app: pc.Application, parent: pc.Entity): { update(dt: number): void } {
  const S = WORLD.stage;
  const root = new pc.Entity('commons-host');
  root.enabled = false;
  parent.addChild(root);

  // ── the figure and the pale floor: one mesh ──
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  const C = (hex: string): pc.Color => new pc.Color().fromString(hex);
  // the floor laid over the dance tiles (they run x 5.0–9.4, z stage.z −2.2…+1.7, partly under the runway — the
  // 'stage' is a runway 2.2 m wide coming toward her, x 6.9–11.9). Well clear of the tiles' tops (0.042): at 0.052
  // their edges showed through on the first plate.
  const fx0 = 4.8, fx1 = 9.6, fz0 = S.z - 2.4, fz1 = WORLD.screen.z + WORLD.screen.w / 2 + 1.4;   // S359: to the host, at the side
  pushBox(pos, idx, col, C(PALE.floor), (fx0 + fx1) / 2, 0.07, (fz0 + fz1) / 2, (fx1 - fx0) / 2, 0.02, (fz1 - fz0) / 2);
  // the host: at stage left, beside the screen like a presenter beside its own broadcast (centred, it stood in front
  // of the screen and hid the numbers — measured on the first plate), facing her (−x). Life-size.
  // ⚑ S359 / H24 (his D2) — with its screen, to his SIDE: just beyond the screen's right edge (~52° right of the desk
  //   seat, 7 m), so it never stands in front of the broadcast's numbers and nothing of the host is straight ahead
  const hx = WORLD.screen.x - 0.6, hz = WORLD.screen.z + WORLD.screen.w / 2 + 0.7, base = 0.26;
  // ⚑ S355 (his choice, 10 Nov, via the orchestrator): A PRODUCT, NOT A STATUE. The stone figure on a plinth pointed
  //   at church statuary (faith); the host is the system's projection. So: a PROJECTOR PAD where the plinth stood —
  //   a dark body, the glowing disc on top at the same height — and above it the figure as a hologram (below).
  pushBox(pos, idx, col, C(ERA4.panelHi), hx, 0.105, hz, 0.3, 0.105, 0.3);
  pushBox(pos, idx, col, C(ERA4.ruleHi), hx, 0.205, hz, 0.36, 0.01, 0.36);   // the pad's rim
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos); mesh.setIndices(idx); mesh.setColors(col);
  mesh.setNormals(pc.calculateNormals(pos, idx));
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(1, 1, 1);
  mat.diffuseVertexColor = true;
  mat.emissiveVertexColor = true;
  mat.emissive = new pc.Color(0.55, 0.55, 0.55);
  mat.specular = new pc.Color(0, 0, 0);
  mat.update();
  const floor = new pc.Entity('commons-host-floor');
  floor.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  floor.render!.meshInstances[0].cull = false;
  root.addChild(floor);

  /**
   * ⚑ S355 — THE HOLOGRAM. Pale and glowing (era-4 tokens), a little see-through, and its scan lines are its own
   * geometry: every part is cut into horizontal slices 2 cm thick with 1.2 cm of air between them, so the lines hold
   * still and need no texture. Arms open, as in its own picture on the screen: the product looks like its advert.
   * No face, no voice; it never moves toward her. Its only motion is a slow shimmer of its opacity (no flicker).
   */
  const gp: number[] = [], gi: number[] = [], gc: number[] = [];
  const glow = C(ERA4.glow), bright = C(ERA4.photoSkyHi), sashC = C(ERA4.l), padC = C(ERA4.l);
  const SLICE = 0.02, PITCH = 0.032;
  /** a part from y0 to y1 (above the pad), its half-depth (x) and half-width (z) easing from bottom to top */
  const part = (y0: number, y1: number, dx0: number, dx1: number, dz0: number, dz1: number, oz = 0, c = glow, ox = 0): void => {
    for (let y = y0; y < y1 - 0.004; y += PITCH) {
      const t = (y - y0) / Math.max(0.001, y1 - y0);
      const h = Math.min(SLICE, y1 - y) / 2;
      const sashBand = c === glow && Math.abs(base + y - (base + 0.84)) < 0.03;
      pushBox(gp, gi, gc, sashBand ? sashC : c, hx + ox, base + y + h, hz + oz, dx0 + (dx1 - dx0) * t, h, dz0 + (dz1 - dz0) * t);
    }
  };
  part(0, 1.2, 0.17, 0.11, 0.28, 0.17);            // the robe, falling wide to the pad
  part(1.2, 1.42, 0.11, 0.1, 0.2, 0.19);           // the shoulders
  part(1.42, 1.47, 0.04, 0.04, 0.045, 0.045, 0, bright);   // the neck
  part(1.47, 1.71, 0.09, 0.08, 0.085, 0.08, 0, bright);    // the head: faceless
  for (const side of [-1, 1]) {
    // arms open, as on the screen: out from the shoulder, a little down, the hands open at the end
    part(1.27, 1.39, 0.06, 0.06, 0.12, 0.12, side * 0.33);
    part(1.18, 1.3, 0.055, 0.055, 0.09, 0.09, side * 0.53, glow, -0.02);
    part(1.06, 1.2, 0.035, 0.035, 0.04, 0.04, side * 0.64, bright, -0.04);
  }
  // the pad's glowing disc, the light the figure stands in
  pushBox(gp, gi, gc, padC, hx, 0.235, hz, 0.34, 0.02, 0.34);
  const holo = new pc.Mesh(app.graphicsDevice);
  holo.setPositions(gp); holo.setIndices(gi); holo.setColors(gc);
  holo.update(pc.PRIMITIVE_TRIANGLES);
  const holoMat = new pc.StandardMaterial();
  holoMat.useLighting = false;
  holoMat.diffuse = new pc.Color(0, 0, 0);
  holoMat.emissive = new pc.Color(1, 1, 1);
  holoMat.emissiveVertexColor = true;
  holoMat.opacity = 0.58;
  holoMat.blendType = pc.BLEND_NORMAL;
  holoMat.depthWrite = false;
  holoMat.cull = pc.CULLFACE_NONE;
  holoMat.update();
  const body = new pc.Entity('commons-host-figure');
  body.addComponent('render', { meshInstances: [new pc.MeshInstance(holo, holoMat)] });
  body.render!.meshInstances[0].cull = false;
  root.addChild(body);

  // ── the halo: a flat ring behind the head, facing her; its own material so its colour can be taken back ──
  const hp: number[] = [], hi: number[] = [];
  const R0 = 0.2, R1 = 0.25, SEG = 28, cy = base + 1.6, cxr = hx + 0.12;
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    hp.push(cxr, cy + Math.sin(a) * R0, hz + Math.cos(a) * R0, cxr, cy + Math.sin(a) * R1, hz + Math.cos(a) * R1);
    if (i < SEG) { const b = i * 2; hi.push(b, b + 1, b + 3, b, b + 3, b + 2); }
  }
  const ring = new pc.Mesh(app.graphicsDevice);
  ring.setPositions(hp); ring.setIndices(hi); ring.update(pc.PRIMITIVE_TRIANGLES);
  const haloMat = new pc.StandardMaterial();
  haloMat.useLighting = false;
  haloMat.diffuse = new pc.Color(0, 0, 0);
  haloMat.emissive = C(PALE.halo);
  haloMat.cull = pc.CULLFACE_NONE;
  haloMat.update();
  const halo = new pc.Entity('commons-host-halo');
  halo.addComponent('render', { meshInstances: [new pc.MeshInstance(ring, haloMat)] });
  halo.render!.meshInstances[0].cull = false;
  root.addChild(halo);

  // ── the world's own lights, re-lit for the studio (found by name; commonsWorld.ts owns them) ──
  const find = (n: string): pc.Entity | null => { const e = parent.findByName(n); return e instanceof pc.Entity ? e : null; };
  const stage = find('commons-stage-light'), warm = find('commons-warm');
  const sweeps = [0, 1, 2].map((k) => find(`commons-sweep-${k}`));
  const was = { stage: stage?.light?.color.clone(), warm: warm?.light?.color.clone(), warmI: warm?.light?.intensity ?? 1.1 };

  let on = false;
  let keyFreed = false;
  let t = 0;
  /** ⚑ S370 / C1 — the shove's clock (<0: not shoved) */
  let shoveT = -1;
  const SHOVE_SECONDS = 0.9, SHOVE = { x: 0.5, z: 0.8 }, SHOVED_OPACITY = 0.42;
  const relight = (): void => {
    if (stage?.light) stage.light.color = on && !keyFreed ? C(PALE.key) : on ? C(WARM.key) : (was.stage ?? C(BALL.attention));
    if (warm?.light) {
      warm.light.color = on ? C(PALE.floor) : (was.warm ?? C(PLACE.skyHaze));
      warm.light.intensity = on ? 0.7 : was.warmI;
    }
    for (const s of sweeps) if (s) s.enabled = !on;
  };
  hook = (v: boolean): void => {
    if (on === v) return;
    on = v;
    root.enabled = v;
    if (v) { keyFreed = false; haloMat.emissive = C(PALE.halo); haloMat.update(); }
    // ⚑ S370 — a new studio stands its host back on the pad
    shoveT = -1; body.setLocalPosition(0, 0, 0); halo.setLocalPosition(0, 0, 0);
    relight();
  };
  shoveHook = (): void => { if (on && shoveT < 0) shoveT = 0; };
  freeHook = (s: HostSurface): void => {
    if (!on) return;
    if (s === 'halo') { haloMat.emissive = C(WARM.halo); haloMat.update(); }
    if (s === 'key') { keyFreed = true; relight(); }
  };
  return {
    update(dt: number): void {
      if (!on) return;
      t += dt;
      // the product's glow breathes, slowly (never a flicker): the halo's light, and the hologram's opacity
      const k = 0.9 + 0.1 * Math.sin(t * 0.8);
      haloMat.emissiveIntensity = k;
      haloMat.update();
      let opacity = 0.54 + 0.06 * Math.sin(t * 0.55);
      // ⚑ S370 / C1 — pushed off the pad: the slide, the three dips, then faint where it was pushed to
      if (shoveT >= 0) {
        shoveT += dt;
        const p = Math.min(1, shoveT / SHOVE_SECONDS), e = p * p * (3 - 2 * p);
        body.setLocalPosition(SHOVE.x * e, 0, SHOVE.z * e);
        halo.setLocalPosition(SHOVE.x * e, 0, SHOVE.z * e);
        const dip = shoveT < 0.6 && Math.floor(shoveT * 10) % 2 === 0 ? 0.35 : 1;
        opacity = (opacity + (SHOVED_OPACITY - opacity) * e) * dip;
      }
      holoMat.opacity = opacity;
      holoMat.update();
    }
  };
}
