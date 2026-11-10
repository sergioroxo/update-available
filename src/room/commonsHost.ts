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
 * Budget: two draw calls while it is up (the figure + the floor in one vertex-coloured mesh; the halo, whose colour
 * changes, in its own) — and it is only up while the crowd is not, so the world's peak does not rise.
 */
import * as pc from 'playcanvas';
import { PLACE, ERA4, WEB, BALL } from '../desktop/theme/era4';
import { WORLD } from './commonsWorld';

export type HostSurface = 'always' | 'halo' | 'friends' | 'key' | 'safety' | 'metrics' | 'picture';

let hook: ((on: boolean) => void) | null = null;
let freeHook: ((s: HostSurface) => void) | null = null;
/** the studio is up (the host, its halo, its pale floor, its cold light), or the space is the stream's */
export function setCommonsHost(on: boolean): void { hook?.(on); }
/** one of the host's surfaces is taken back by the people (only the 3D ones act here: halo, key) */
export function freeCommonsHost(s: HostSurface): void { freeHook?.(s); }

/** the host's cold light and pale things; the people's warm light (all era-4 tokens) */
const PALE = { floor: ERA4.photoSkyHi, robe: WEB.card, sash: ERA4.glow, head: ERA4.photoSkyHi, halo: ERA4.glow, key: ERA4.glow };
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
  const fx0 = 4.8, fx1 = 9.6, fz0 = S.z - 2.4, fz1 = S.z + 2.6;
  pushBox(pos, idx, col, C(PALE.floor), (fx0 + fx1) / 2, 0.07, (fz0 + fz1) / 2, (fx1 - fx0) / 2, 0.02, (fz1 - fz0) / 2);
  // the host: at stage left, beside the screen like a presenter beside its own broadcast (centred, it stood in front
  // of the screen and hid the numbers — measured on the first plate), facing her (−x). Life-size. A robe that falls
  // to the floor in steps, long sleeves hanging a little open, a head; no face.
  const hx = S.x + 1.0, hz = S.z + 2.0, base = 0.26;   // ~21° right of her line of sight, just clear of the screen
  // its own pale riser: the runway is the people's (TransJesus dances on it later); the product brought a plinth
  pushBox(pos, idx, col, C(PALE.floor), hx, 0.13, hz, 0.42, 0.13, 0.42);
  const robe = C(PALE.robe), sash = C(PALE.sash), head = C(PALE.head);
  pushBox(pos, idx, col, robe, hx, base + 0.22, hz, 0.17, 0.22, 0.27);   // the hem, widest
  pushBox(pos, idx, col, robe, hx, base + 0.62, hz, 0.14, 0.2, 0.22);
  pushBox(pos, idx, col, robe, hx, base + 1.0, hz, 0.12, 0.2, 0.19);
  pushBox(pos, idx, col, sash, hx - 0.01, base + 0.86, hz, 0.125, 0.025, 0.195);   // a sash, the product's one accent
  pushBox(pos, idx, col, robe, hx, base + 1.32, hz, 0.11, 0.13, 0.2);    // the shoulders
  for (const side of [-1, 1]) {
    // the sleeves, hanging a little open: the welcome the product sells
    pushBox(pos, idx, col, robe, hx - 0.03, base + 1.08, hz + side * 0.25, 0.07, 0.22, 0.06);
    pushBox(pos, idx, col, head, hx - 0.07, base + 0.84, hz + side * 0.29, 0.035, 0.045, 0.035);   // the hands, open
  }
  pushBox(pos, idx, col, head, hx, base + 1.58, hz, 0.09, 0.12, 0.085);  // the head: faceless
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos); mesh.setIndices(idx); mesh.setColors(col);
  mesh.setNormals(pc.calculateNormals(pos, idx));
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(1, 1, 1);
  mat.diffuseVertexColor = true;
  mat.emissiveVertexColor = true;
  mat.emissive = new pc.Color(0.55, 0.55, 0.55);   // soft-lit from within: the product glows a little
  mat.specular = new pc.Color(0, 0, 0);
  mat.update();
  const body = new pc.Entity('commons-host-figure');
  body.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  body.render!.meshInstances[0].cull = false;
  root.addChild(body);

  // ── the halo: a flat ring behind the head, facing her; its own material so its colour can be taken back ──
  const hp: number[] = [], hi: number[] = [];
  const R0 = 0.2, R1 = 0.25, SEG = 28, cy = base + 1.62, cxr = hx + 0.1;
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
    relight();
  };
  freeHook = (s: HostSurface): void => {
    if (!on) return;
    if (s === 'halo') { haloMat.emissive = C(WARM.halo); haloMat.update(); }
    if (s === 'key') { keyFreed = true; relight(); }
  };
  return {
    update(dt: number): void {
      if (!on) return;
      t += dt;
      // the product's glow breathes, slowly (never a flicker)
      const k = 0.9 + 0.1 * Math.sin(t * 0.8);
      haloMat.emissiveIntensity = k;
      haloMat.update();
    }
  };
}
