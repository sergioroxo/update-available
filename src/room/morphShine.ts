/**
 * ⚑ S347 — THE SHINE OF THE SPACE MORPH (UiB job 6). His 9 Nov note on job 5: the change went dark ("the particles
 * carrying the next view are dark brown squares… it reads as darkness"), and he asked for "the morph that already
 * existed: the one that shines and changes" — clusterMorph's diagonal cascade. This is its light:
 *
 *   · a warm LIGHT that travels with the fold, at the weighted centre of whatever is changing now, so the walls and
 *     the furniture that do not change (the batched constants) are lit as the change passes them;
 *   · GLINTS: small bright warm motes thrown off each changing thing, drifting up and twinkling (≤ 2.2 Hz, smooth —
 *     never a strobe), drawn ADDITIVELY, so they can only ever brighten the view.
 *
 * One draw call (one dynamic mesh of tiny three-plane stars, visible from any angle, no billboarding — so it sits in
 * the room's own coordinates and a headset's rebased world carries it like any prop) and one light (clustered
 * lighting: no shader rebuild). Both are idle and switched off outside a change.
 */
import * as pc from 'playcanvas';
import { MORPH_SHINE } from '../desktop/theme/morph';
import { hex } from './era1room';

/** one thing changing now: its centre, half-size and how strongly it shines (0…1) */
export interface ShineSource { x: number; y: number; z: number; hx: number; hy: number; hz: number; w: number }

const MAX = 160;            // glints alive at once
const VERTS = 12;           // three crossed quads per glint
const RATE_PER_W = 22;      // glints per second per unit of shine
const MAX_RATE = 170;
const LIGHT_PEAK = 0.8;     // the travelling light's intensity at full activity (1.5 washed Vera's wall white when her own desk folded at arm's length)
const LIGHT_RANGE = 3.8;

interface Glint { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number; size: number; ph: number; mix: number }

export class MorphShine {
  private readonly light: pc.Entity;
  private ent: pc.Entity | null = null;
  private mesh: pc.Mesh | null = null;
  private readonly pos = new Float32Array(MAX * VERTS * 3);
  private readonly col = new Float32Array(MAX * VERTS * 4);
  private readonly glints: (Glint | null)[] = new Array(MAX).fill(null);
  private spawnAcc = 0;
  private lx = 0; private ly = 1.4; private lz = 0; private li = 0;
  private live = false;
  private seed = 2026_1109;
  private readonly spark = hex(MORPH_SHINE.spark);
  private readonly gold = hex(MORPH_SHINE.gold);

  constructor(private readonly parent: pc.Entity) {
    this.light = new pc.Entity('morph-shine-light');
    this.light.addComponent('light', { type: 'omni', color: hex(MORPH_SHINE.warm), intensity: 0, range: LIGHT_RANGE, castShadows: false });
    this.light.enabled = false;
    parent.addChild(this.light);
  }

  private rand(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  private ensureMesh(): void {
    if (this.mesh) return;
    const app = pc.AppBase.getApplication();
    if (!app) return;
    const mesh = new pc.Mesh(app.graphicsDevice);
    mesh.clear(true, false);
    const idx: number[] = [];
    for (let g = 0; g < MAX; g++) for (let q = 0; q < 3; q++) {
      const b = g * VERTS + q * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    mesh.setPositions(this.pos);
    mesh.setColors(this.col);
    mesh.setIndices(idx);
    mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    mesh.aabb = new pc.BoundingBox(new pc.Vec3(0, 1.4, 0.8), new pc.Vec3(9, 2.2, 9));
    const mat = new pc.StandardMaterial();
    mat.useLighting = false;
    mat.useFog = false;
    mat.diffuse = new pc.Color(0, 0, 0);
    mat.emissive = new pc.Color(1, 1, 1);
    mat.emissiveVertexColor = true;
    mat.blendType = pc.BLEND_ADDITIVE;      // additive: a glint can only ever brighten what is behind it
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    const ent = new pc.Entity('morph-shine-glints');
    ent.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows: false, receiveShadows: false });
    ent.enabled = false;
    this.parent.addChild(ent);
    this.mesh = mesh; this.ent = ent;
  }

  /** stop at once (a skip, a snap): no light, no glints */
  stop(): void {
    this.glints.fill(null);
    this.li = 0; this.spawnAcc = 0;
    if (this.light.light) this.light.light.intensity = 0;
    this.light.enabled = false;
    if (this.ent) this.ent.enabled = false;
    this.live = false;
  }

  /** a frame of the change: `sources` are the things changing now (empty once the fold has passed) */
  update(dt: number, sources: ShineSource[]): void {
    let total = 0, cx = 0, cy = 0, cz = 0;
    for (const s of sources) { total += s.w; cx += s.x * s.w; cy += s.y * s.w; cz += s.z * s.w; }
    const anyGlint = this.glints.some((g) => g !== null);
    if (total <= 0 && !anyGlint && this.li < 0.01) { if (this.live) this.stop(); return; }
    if (!this.live) { this.ensureMesh(); this.live = true; this.light.enabled = true; if (this.ent) this.ent.enabled = true; }

    // ── the light: eased toward the centre of the change, its strength following how much is changing ──
    const ease = 1 - Math.exp(-dt * 3.2);
    if (total > 0) { this.lx += (cx / total - this.lx) * ease; this.ly += (Math.max(1.1, cy / total + 0.35) - this.ly) * ease; this.lz += (cz / total - this.lz) * ease; }
    const want = Math.min(LIGHT_PEAK, 0.16 * total);
    this.li += (want - this.li) * (1 - Math.exp(-dt * 1.1));   // a swell over about a second, never a flash
    this.light.setLocalPosition(this.lx, this.ly, this.lz);
    if (this.light.light) this.light.light.intensity = this.li;

    // ── glints: thrown off the changing things in proportion to their shine ──
    if (total > 0) {
      this.spawnAcc += Math.min(MAX_RATE, RATE_PER_W * total) * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        const slot = this.glints.indexOf(null);
        if (slot < 0) { this.spawnAcc = 0; break; }
        let pick = this.rand() * total, s = sources[0];
        for (const c of sources) { pick -= c.w; if (pick <= 0) { s = c; break; } }
        this.glints[slot] = {
          x: s.x + (this.rand() * 2 - 1) * (s.hx + 0.04), y: s.y + (this.rand() * 2 - 1) * (s.hy + 0.04), z: s.z + (this.rand() * 2 - 1) * (s.hz + 0.04),
          vx: (this.rand() - 0.5) * 0.16, vy: 0.10 + this.rand() * 0.26, vz: (this.rand() - 0.5) * 0.16,
          age: 0, life: 0.9 + this.rand() * 0.9, size: 0.0035 + this.rand() * 0.0075, ph: this.rand() * Math.PI * 2, mix: 0.35 + 0.65 * this.rand()
        };
      }
    }
    const P = this.pos, C = this.col;
    for (let i = 0; i < MAX; i++) {
      const g = this.glints[i];
      const pb = i * VERTS * 3, cb = i * VERTS * 4;
      if (g) { g.age += dt; if (g.age >= g.life) this.glints[i] = null; }
      const live = this.glints[i];
      if (!live) { P.fill(0, pb, pb + VERTS * 3); C.fill(0, cb, cb + VERTS * 4); continue; }
      live.x += live.vx * dt; live.y += live.vy * dt; live.z += live.vz * dt;
      live.vy *= 1 - dt * 0.6;
      const a = live.age / live.life;
      const env = Math.sin(Math.PI * Math.min(1, a)) ** 1.5;
      const tw = 0.62 + 0.38 * Math.sin(2 * Math.PI * 2.2 * live.age + live.ph);   // ≤ 2.2 Hz, smooth
      const k = env * tw;   // small and warm: a glint, never a white square (S347, the first sheet's lesson)
      const r = (this.spark.r * (1 - live.mix) + this.gold.r * live.mix) * k;
      const gg = (this.spark.g * (1 - live.mix) + this.gold.g * live.mix) * k;
      const b = (this.spark.b * (1 - live.mix) + this.gold.b * live.mix) * k;
      const h = live.size * (0.7 + 0.3 * tw);
      // three crossed quads: XY, ZY, XZ
      const q = [
        [-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0],
        [0, -h, -h], [0, -h, h], [0, h, h], [0, h, -h],
        [-h, 0, -h], [h, 0, -h], [h, 0, h], [-h, 0, h]
      ];
      for (let v = 0; v < VERTS; v++) {
        P[pb + v * 3] = live.x + q[v][0]; P[pb + v * 3 + 1] = live.y + q[v][1]; P[pb + v * 3 + 2] = live.z + q[v][2];
        C[cb + v * 4] = r; C[cb + v * 4 + 1] = gg; C[cb + v * 4 + 2] = b; C[cb + v * 4 + 3] = 1;
      }
    }
    if (this.mesh) {
      this.mesh.setPositions(P);
      this.mesh.setColors(C);
      this.mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    }
  }

  /** for probes */
  get state(): { live: boolean; glints: number; light: number } {
    return { live: this.live, glints: this.glints.filter((g) => g !== null).length, light: +this.li.toFixed(3) };
  }
}
