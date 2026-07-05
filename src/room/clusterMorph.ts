/**
 * The cluster SPACE morph — the shipped build's EraMorph grammar, ported
 * (src/room/era2morph.ts in the main folder; Sérgio Round 21: "you already had
 * a morph from the previous version that was extremely good, use that effect
 * to transform the space").
 *
 * The space is a DETERMINISTIC function of its state: era1.json is the base,
 * and data/room/reinterp_deltas.json holds the ordered deltas — r1 (reinterp
 * E1), r2 (the radial cluster: walls slide/stretch outward, the spine recedes
 * with the door, two dressed rooms stand where the walls were), r4 (Maya's
 * desk + the carried lamp + the dark window). goToState() FOLDS the deltas
 * onto the base, then either ANIMATES (the diagonal glitch-cascade — soft
 * glitch, scale jitter + emissive flicker, no strobe) or SNAPS (debug jumps,
 * fully reversible — jumping back restores the small room, the moon, the
 * walls). Lights are NOT morphed here — the cluster's era rigs own them.
 */
import * as pc from 'playcanvas';
import { RoomHandles, PropHandle, PropDef, hex, spawnProp } from './era1room';
import era1 from '../../data/room/era1.json';
import deltas from '../../data/room/reinterp_deltas.json';

const CASCADE = 5.2;       // s for the sweep to cross the whole room
const PROP_DUR = 1.3;      // s each element takes to resolve
const GLITCH_FRAC = 0.42;  // fraction of a prop's transition spent glitching

interface Delta {
  props?: Record<string, { color?: string; pos?: number[]; size?: number[] }>;
  remove?: string[];
  add?: PropDef[];
}

/** the ordered fold: base era1.json → r1 → r2 → r4 */
export const SPACE_STATES = ['r1', 'r2', 'r4'] as const;
export type SpaceState = typeof SPACE_STATES[number];
const DELTA_LIST: Delta[] = SPACE_STATES.map(
  s => (deltas as unknown as Record<string, Delta>)[s]
);

interface PropTarget { color: string; pos: number[]; size: number[]; emissive: boolean; present: boolean }

interface Plan {
  h: PropHandle;
  fromColor: pc.Color; toColor: pc.Color;
  fromPos: pc.Vec3; toPos: pc.Vec3;
  fromScale: pc.Vec3; toScale: pc.Vec3;
  startT: number;
}

const ease = (k: number): number => k * k * (3 - 2 * k);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class ClusterMorph {
  private active = false;
  private t = 0;
  private plans: Plan[] = [];
  private state = 0; // index into SPACE_STATES

  constructor(private readonly room: RoomHandles) {}

  get running(): boolean { return this.active; }
  get stateName(): SpaceState { return SPACE_STATES[this.state]; }

  /** fold base + deltas 0..idx → each prop's full target state */
  private targetsFor(idx: number): Map<string, PropTarget> {
    const m = new Map<string, PropTarget>();
    for (const d of (era1 as unknown as { props: PropDef[] }).props) {
      m.set(d.id, { color: d.color, pos: [...d.pos], size: [...d.size], emissive: !!d.emissive, present: true });
    }
    for (let i = 0; i <= idx; i++) {
      const delta = DELTA_LIST[i];
      if (!delta) continue;
      for (const [id, o] of Object.entries(delta.props ?? {})) {
        const t = m.get(id); if (!t) continue;
        if (o.color) t.color = o.color;
        if (o.pos) t.pos = [...o.pos];
        if (o.size) t.size = [...o.size];
      }
      for (const id of delta.remove ?? []) { const t = m.get(id); if (t) t.present = false; }
      for (const def of delta.add ?? []) {
        m.set(def.id, { color: def.color, pos: [...def.pos], size: [...def.size], emissive: !!def.emissive, present: true });
      }
    }
    return m;
  }

  private spawnTarget(id: string, t: PropTarget): PropHandle {
    return spawnProp(this.room, {
      id, pos: t.pos as [number, number, number], size: t.size as [number, number, number],
      color: t.color, emissive: t.emissive
    });
  }

  /** set a prop instantly to a target (colour/pos/scale) */
  private applyTarget(h: PropHandle, t: PropTarget): void {
    const col = h.emissive ? h.material.emissive : h.material.diffuse;
    col.copy(hex(t.color));
    if (!h.emissive) h.material.emissive.set(0, 0, 0);
    h.material.update();
    h.entity.setLocalPosition(t.pos[0], t.pos[1], t.pos[2]);
    h.entity.setLocalScale(t.size[0], t.size[1], t.size[2]);
  }

  /** snap the whole space to a state (debug jumps; deterministic, reversible) */
  snapTo(idx: number): void {
    this.active = false; this.plans = [];
    this.state = idx;
    const targets = this.targetsFor(idx);
    for (const [id, t] of targets) {
      if (!t.present) continue;
      const h = this.room.props.get(id) ?? this.spawnTarget(id, t);
      this.applyTarget(h, t);
    }
    for (const [id, h] of this.room.props) {
      const t = targets.get(id);
      if (!t || !t.present) h.entity.setLocalScale(0, 0, 0);
    }
  }

  /**
   * Bring the space to state `idx`. `animate` = the narrative cascade (from
   * state idx−1); otherwise SNAP. Deterministic and reversible either way.
   */
  goToState(idx: number, animate: boolean): void {
    this.active = false; this.plans = [];
    if (!animate || idx <= 0) { this.snapTo(Math.max(0, idx)); return; }

    this.snapTo(idx - 1);
    this.state = idx;
    const prev = this.targetsFor(idx - 1);
    const targets = this.targetsFor(idx);
    const ids = new Set<string>([...prev.keys(), ...targets.keys()]);
    for (const id of ids) {
      const tn = targets.get(id);
      const tp = prev.get(id);
      let h = this.room.props.get(id);
      if (!h) {
        const seed = tp?.present ? tp : tn;
        if (!seed) continue;
        h = this.spawnTarget(id, seed);
        if (!tp?.present) h.entity.setLocalScale(0, 0, 0); // grows in from nothing
      }
      const toPresent = !!tn?.present;
      const toColor = toPresent && tn ? hex(tn.color) : (h.emissive ? h.material.emissive : h.material.diffuse).clone();
      const toPos = toPresent && tn ? new pc.Vec3(tn.pos[0], tn.pos[1], tn.pos[2]) : h.entity.getLocalPosition().clone();
      const toScale = toPresent && tn ? new pc.Vec3(tn.size[0], tn.size[1], tn.size[2]) : new pc.Vec3(0, 0, 0);
      this.plans.push({
        h,
        fromColor: (h.emissive ? h.material.emissive : h.material.diffuse).clone(),
        toColor,
        fromPos: h.entity.getLocalPosition().clone(), toPos,
        fromScale: h.entity.getLocalScale().clone(), toScale,
        startT: 0
      });
    }

    // a diagonal sweep: order by (x + z) so the change rolls across the room
    const sorted = [...this.plans].sort((a, b) => {
      const pa = a.h.entity.getLocalPosition(); const pb = b.h.entity.getLocalPosition();
      return (pa.x + pa.z) - (pb.x + pb.z);
    });
    sorted.forEach((pl, i) => { pl.startT = (i / Math.max(1, sorted.length - 1)) * (CASCADE - PROP_DUR); });

    this.active = true; this.t = 0;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;

    for (const pl of this.plans) {
      const local = (this.t - pl.startT) / PROP_DUR;
      if (local <= 0) continue;
      const k = Math.min(1, local);
      const e = ease(k);

      const col = pl.h.emissive ? pl.h.material.emissive : pl.h.material.diffuse;
      col.set(lerp(pl.fromColor.r, pl.toColor.r, k), lerp(pl.fromColor.g, pl.toColor.g, k), lerp(pl.fromColor.b, pl.toColor.b, k));
      if (!pl.h.emissive) pl.h.material.emissive.set(0, 0, 0);

      let sx = lerp(pl.fromScale.x, pl.toScale.x, e);
      let sy = lerp(pl.fromScale.y, pl.toScale.y, e);
      let sz = lerp(pl.fromScale.z, pl.toScale.z, e);
      pl.h.entity.setLocalPosition(
        lerp(pl.fromPos.x, pl.toPos.x, e), lerp(pl.fromPos.y, pl.toPos.y, e), lerp(pl.fromPos.z, pl.toPos.z, e)
      );

      // the glitch: a brief flicker + scale jitter as the element changes over
      if (k < GLITCH_FRAC && Math.random() < 0.55) {
        const f = (1 - k / GLITCH_FRAC) * 0.7;
        pl.h.material.emissive.set(col.r + f, col.g + f, col.b + f);
        const j = 1 + (Math.random() * 0.14 - 0.07) * (1 - k / GLITCH_FRAC);
        sx *= j; sy *= j; sz *= j;
      }
      pl.h.entity.setLocalScale(sx, sy, sz);
      pl.h.material.update();
    }

    if (this.t > CASCADE + PROP_DUR) this.active = false;
  }
}
