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
 *
 * R28-2c: `setKeptIds()` (called by src/room/cluster.ts, driven by the
 * belongings beat) exempts specific prop ids from every fold beyond r1 —
 * the payoff for the T1 gathering window, kept objects survive un-aged.
 */
import * as pc from 'playcanvas';
import { RoomHandles, PropHandle, PropDef, hex, spawnProp } from './era1room';
import era1 from '../../data/room/era1.json';
import deltas from '../../data/room/reinterp_deltas.json';

const CASCADE = 5.2;       // s for the sweep to cross the whole room
const PROP_DUR = 1.3;      // s each element takes to resolve
const GLITCH_FRAC = 0.42;  // fraction of a prop's transition spent glitching

interface Delta {
  // `model` here (Session 54): a baseline era1.json prop can now be upgraded
  // to a real mesh through its OWN override rather than needing a fresh
  // remove+add id — see foldTargets' props loop below and ClusterMorph.snapTo's
  // box→model upgrade for the runtime half of this.
  // `yaw` (Session 56): same story — a `props` override silently dropped it
  // exactly like `model` used to, so mixtape's small "face the seat" turn
  // (data/room/reinterp_deltas.json) did nothing until this was added too.
  props?: Record<string, { color?: string; pos?: number[]; size?: number[]; model?: string; yaw?: number; modelScale?: number | number[] }>;
  remove?: string[];
  add?: PropDef[];
}

/** Session 74: `parts` (era1room.ts's composite-box assembly, e.g. the phone)
 *  must survive the fold the same way `model` already does, or the FIRST
 *  spawn of a composite prop (the only spawn that ever reads `parts` — see
 *  spawnTarget below) falls back to a plain box and the assembly never
 *  renders at all. */

/** the ordered fold: base era1.json → r1 (E1) → r2 (E2) → r3 (E3) → r4 (E4).
 *  Each state ages the three rooms one era on (Round 24, Phase B): r3 closes
 *  Room 1 (Daniel transferred) + brings Room 2 forward (Vera, 2016), r4 lands
 *  Room 3 in the present (Maya). A missing/empty state folds as a no-op. */
export const SPACE_STATES = ['r1', 'r2', 'r3', 'r4'] as const;
export type SpaceState = typeof SPACE_STATES[number];
const DELTA_LIST: Delta[] = SPACE_STATES.map(
  s => (deltas as unknown as Record<string, Delta>)[s]
);

interface PropTarget { color: string; pos: number[]; size: number[]; emissive: boolean; present: boolean; yaw: number; model?: string; modelScale?: number | number[]; parts?: PropDef['parts']; bands?: string[]; partColors?: Record<string, string>; page?: PropDef['page']; print?: PropDef['print']; partGlow?: string[] }

/** fold base + deltas 0..idx → each prop's full target state (module-level so
 *  the static-set computation shares the exact same fold the morph runs) */
function foldTargets(idx: number): Map<string, PropTarget> {
  const m = new Map<string, PropTarget>();
  for (const d of (era1 as unknown as { props: PropDef[] }).props) {
    m.set(d.id, { color: d.color, pos: [...d.pos], size: [...d.size], emissive: !!d.emissive, present: true, yaw: d.yaw ?? 0, model: d.model, modelScale: d.modelScale, parts: d.parts, bands: d.bands, partColors: d.partColors, page: d.page, print: d.print, partGlow: d.partGlow });
  }
  for (let i = 0; i <= idx; i++) {
    const delta = DELTA_LIST[i];
    if (!delta) continue;
    for (const [id, o] of Object.entries(delta.props ?? {})) {
      const t = m.get(id); if (!t) continue;
      if (o.color) t.color = o.color;
      if (o.pos) t.pos = [...o.pos];
      if (o.size) t.size = [...o.size];
      if (o.model) t.model = o.model;
      if (o.modelScale) t.modelScale = o.modelScale;
      if (o.yaw !== undefined) t.yaw = o.yaw;
    }
    for (const id of delta.remove ?? []) { const t = m.get(id); if (t) t.present = false; }
    for (const def of delta.add ?? []) {
      // ⚑ S175: `bands` too — the base path above carried it (S168, the duck) and
      //   this `add` path did not, so a banded prop introduced by a later era (the
      //   2003 mug's washed-out flag, the CD spindle) spawned one flat colour
      m.set(def.id, { color: def.color, pos: [...def.pos], size: [...def.size], emissive: !!def.emissive, present: true, yaw: def.yaw ?? 0, model: def.model, modelScale: def.modelScale, parts: def.parts, bands: def.bands, partColors: def.partColors, page: def.page, print: def.print, partGlow: def.partGlow });
    }
  }
  return m;
}

/** ⚑ S183 — a prop's resting position in one space state, or null where it is absent.
 *  src/room/institution.ts moves the corner's props RELATIVE to this, so an era change
 *  (which the morph owns) never leaves an offset baked into a position. */
const FOLD_CACHE = new Map<number, Map<string, PropTarget>>();
export function foldedPos(id: string, idx: number): number[] | null {
  let m = FOLD_CACHE.get(idx);
  if (!m) { m = foldTargets(idx); FOLD_CACHE.set(idx, m); }
  const t = m.get(id);
  return t && t.present ? t.pos : null;
}

/**
 * The ids whose folded target is IDENTICAL in every space state: present from
 * r1 through r4 with the same color/pos/size/yaw, and not a real model. These
 * props never change across thirty years, so (a) the static batcher may own
 * them (src/room/batching.ts — the Quest draw-call chore) and (b) the morph
 * skips them entirely. Visible consequence, flagged in the session log: the
 * cascade's glitch-flicker no longer brushes the props that DON'T change —
 * only the changing world glitches over; the constants hold still.
 *
 * Session 55 bug fix: a baseline era1.json prop can be spawned once
 * (era1room.ts, using the RAW baseline) and THEN get a `props` override at r1
 * that never changes again through r2/r3/r4 (e.g. teddyBox's shelf-height
 * fix) — every fold from r1 on agrees with itself, so this check called it
 * "constant" and the morph's `snapTo`/`goToState` then skip applying ANY
 * target to it at all (the "first spawn places itself, everything after is
 * skipped" rule), leaving it stuck at era1.json's PRE-override spawn forever
 * — the override silently never took effect, the exact class of bug Session
 * 32/54 already hit twice for `model` specifically, this time for `pos`.
 * `foldTargets(-1)` (the loop body never runs when idx is -1) is the pure
 * pre-delta baseline; a prop that exists there must ALSO match it, not just
 * match itself across r1-r4, to count as constant. Ids introduced fresh via
 * `add` (deskModel, tapeA, …) have no baseline entry at all — `b` is
 * `undefined` for them below and the extra check is skipped, so their
 * existing (correct) behavior is untouched. This is exactly why cdStack's own
 * r1 override never hit the bug (its r3 override gives it a genuinely
 * different fold, already excluded by the r1-r4 comparison) while teddyBox's
 * did — both are baseline props, only one happened to also change later.
 */
export function constantPropIds(): Set<string> {
  const baseline = foldTargets(-1);
  const folds = SPACE_STATES.map((_, i) => foldTargets(i));
  const sig = (t: PropTarget | undefined): string =>
    t && t.present ? JSON.stringify([t.color, t.pos, t.size, t.yaw]) : 'ABSENT';
  const out = new Set<string>();
  const first = folds[0];
  for (const [id, t0] of first) {
    if (!t0.present || t0.model || t0.parts) continue;
    const s0 = sig(t0);
    if (!folds.every(f => sig(f.get(id)) === s0)) continue;
    const b = baseline.get(id);
    if (b && sig(b) !== s0) continue;
    out.add(id);
  }
  return out;
}

const STATIC_IDS = constantPropIds();

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
  /** S61: a per-cascade time multiplier. 1 = the shipped pace (CASCADE 5.2s +
   *  PROP_DUR 1.3s ≈ 6.5s end to end). The E2→E3 RELOCATION passes >1 so the
   *  space takes long enough to open that a player watching from above can
   *  actually see it happen — Sérgio: *"let you see the room being built, so
   *  you understand the new space and the passage of time."* It scales both
   *  the sweep and each prop's own resolve, so the diagonal roll keeps its
   *  exact shape and only its clock changes; nothing about the glitch,
   *  ordering or targets is touched. */
  private pace = 1;
  /** R28-2c (the belongings beat): props the player marked KEPT are exempt
   *  from every fold beyond r1 — they keep their EXACT E1 color/pos/presence
   *  through every later era, frozen at the moment of departure (spec §4:
   *  "the one thing... exactly as he left it"). Un-kept eligible props age/
   *  retire exactly as the data already dictates — this is a pure ADDITIVE
   *  override, never touched unless the belongings beat sets it. */
  private keptIds = new Set<string>();

  /**
   * ⚑ S361 / H50 (his headset, 10 Nov, the Close: "flyover from Maya with the glitching") — THE GLITCH ON THE WAY OUT.
   * The same glitch the era change's cascade uses (an emissive flicker + a scale jitter, no strobe), but nothing
   * changes: every prop stays what it is and where it is, and the glitch rolls through the building along the flight
   * (from Maya's seat to Daniel's), each prop glitching for a moment as the wave passes it. Box props AND models —
   * every material the prop renders with (`materials`, private clones once the batch is torn down) — and each is put
   * back exactly as it was (saved colour, saved scale) when its moment ends.
   */
  private sweep: { h: PropHandle; startT: number; dur: number; emissive: pc.Color[]; scale: pc.Vec3 }[] = [];
  private sweepT = 0;

  constructor(private readonly room: RoomHandles) {}

  get running(): boolean { return this.active || this.sweep.length > 0; }

  /** roll the glitch through the present props over `seconds`, ordered along from → to (world x/z) */
  glitchSweep(from: { x: number; z: number }, to: { x: number; z: number }, seconds: number, propSeconds = 2.6): void {
    this.endSweep();
    const dx = to.x - from.x, dz = to.z - from.z;
    const len2 = Math.max(1e-6, dx * dx + dz * dz);
    const rows: { h: PropHandle; k: number }[] = [];
    for (const h of this.room.props.values()) {
      if (!h.entity.enabled) continue;
      const s = h.entity.getLocalScale();
      if (Math.min(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) < 1e-4) continue;   // absent (scaled to 0)
      const p = h.entity.getPosition();
      rows.push({ h, k: Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.z - from.z) * dz) / len2)) });
    }
    const span = Math.max(0.5, seconds - propSeconds);
    for (const r of rows) {
      const mats = r.h.materials.length ? r.h.materials : [r.h.material];
      this.sweep.push({ h: r.h, startT: r.k * span + Math.random() * 0.6, dur: propSeconds * (0.8 + Math.random() * 0.4),
        emissive: mats.map((m) => m.emissive.clone()), scale: r.h.entity.getLocalScale().clone() });
    }
    this.sweepT = 0;
  }

  private endSweep(): void {
    for (const s of this.sweep) this.restoreSweep(s);
    this.sweep = [];
  }

  private restoreSweep(s: { h: PropHandle; emissive: pc.Color[]; scale: pc.Vec3 }): void {
    const mats = s.h.materials.length ? s.h.materials : [s.h.material];
    mats.forEach((m, i) => { if (s.emissive[i]) { m.emissive.copy(s.emissive[i]); m.update(); } });
    s.h.entity.setLocalScale(s.scale);
  }

  private updateSweep(dt: number): void {
    if (!this.sweep.length) return;
    this.sweepT += dt;
    let live = 0;
    for (const s of this.sweep) {
      const k = (this.sweepT - s.startT) / s.dur;
      if (k >= 1) { if (s.dur > 0) { this.restoreSweep(s); s.dur = 0; } continue; }
      live++;
      if (k <= 0) continue;
      const mats = s.h.materials.length ? s.h.materials : [s.h.material];
      // a bell over the prop's moment: it comes up, flickers hardest in the middle, settles back
      const w = Math.sin(Math.PI * k);
      if (Math.random() < 0.6) {
        // as the cascade, a wall-sized surface flickers at a third of the brightness — and here on the computer too: the
        //   cascade's flash lasts half a second per prop, this sweep runs 26 s, and a whole wall flashing white for that
        //   long is a photosensitivity risk (measured in the S361 burst: walls and the desk going white)
        const sc = s.scale, wide = Math.max(Math.abs(sc.x), Math.abs(sc.z)) * Math.abs(sc.y) > 0.6;
        const f = 0.95 * Math.min(1, w * 1.4) * (wide ? 0.3 : 1);
        mats.forEach((m, i) => {
          const base = s.emissive[i];
          const d = m.diffuse;
          m.emissive.set((base?.r ?? 0) + d.r * f + f * 0.5, (base?.g ?? 0) + d.g * f + f * 0.5, (base?.b ?? 0) + d.b * f + f * 0.5);
          m.update();
        });
        const j = 1 + (Math.random() * 0.2 - 0.1) * w;
        s.h.entity.setLocalScale(s.scale.x * j, s.scale.y * j, s.scale.z * j);
      } else {
        mats.forEach((m, i) => { if (s.emissive[i]) { m.emissive.copy(s.emissive[i]); m.update(); } });
        s.h.entity.setLocalScale(s.scale);
      }
    }
    if (!live) this.sweep = [];
  }
  get stateName(): SpaceState { return SPACE_STATES[this.state]; }

  setKeptIds(ids: ReadonlySet<string>): void {
    this.keptIds = new Set(ids);
  }

  /** fold base + deltas 0..idx → each prop's full target state, then freeze
   *  any KEPT id back to its r1 (E1) target regardless of idx. */
  private targetsFor(idx: number): Map<string, PropTarget> {
    const targets = foldTargets(idx);
    if (idx > 0 && this.keptIds.size > 0) {
      const r1 = foldTargets(0);
      for (const id of this.keptIds) {
        const t = r1.get(id);
        if (t) targets.set(id, { ...t });
      }
    }
    return targets;
  }

  private spawnTarget(id: string, t: PropTarget): PropHandle {
    return spawnProp(this.room, {
      id, pos: t.pos as [number, number, number], size: t.size as [number, number, number],
      // Session 66: `modelScale` MUST travel with the target. It is set on
      // three Room-2 props from an in-engine measurement, and dropping it here
      // (as the fold silently did at first) puts the bookcase back through the
      // wall with the data looking correct — the exact shape of bug this
      // codebase keeps hitting: a field that exists in data, is honoured by
      // the spawner, and is lost in the layer between them.
      color: t.color, emissive: t.emissive, yaw: t.yaw, model: t.model, modelScale: t.modelScale, parts: t.parts,
      bands: t.bands,   // S168: the duck's bands — the same class of field (data → spawner) this comment is about
      partColors: t.partColors,   // S177: and the per-part colours (D2)
      page: t.page,               // S177: and a calendar's page
      print: t.print,             // S179: and a poster's print
      partGlow: t.partGlow        // S179: and a lamp's glowing parts
    });
  }

  /** set a prop instantly to a target (colour/pos/scale). MODEL props place
   *  themselves (a wrapper the morph must not distort) — presence toggles
   *  here, and so does the wrapper's POSITION (a `props` override may still
   *  relocate a model prop across eras, e.g. a keepable item that ages onto
   *  a different shelf — see reinterp_deltas.json's mixtape); scale never
   *  does, since that comes from the model's own manifest entry, not `size`.
   *  `yaw` is baked into the wrap's rotation once, at `spawnModel()` time
   *  (combined there with the manifest's own fixed yaw correction — see
   *  assets.ts), so a `props` override changing `yaw` only takes effect if
   *  it's already live in the fold at the moment this prop first spawns as a
   *  model (true for mixtape's own small "face the seat" turn: the override
   *  applies from r1, same fold where its box→model upgrade happens). A model
   *  prop that needed to change yaw on a LATER fold would need this branch
   *  extended to re-set it — not needed by anything today. Safe to move
   *  position live either way: model props never join batching.ts's
   *  static/settled groups (both explicitly skip `h.model`), so there is no
   *  batch to desync. */
  private applyTarget(h: PropHandle, t: PropTarget): void {
    if (h.model || h.composite) {
      h.entity.enabled = t.present;
      if (t.present) h.entity.setLocalPosition(t.pos[0], t.pos[1], t.pos[2]);
      return;
    }
    const col = h.emissive ? h.material.emissive : h.material.diffuse;
    col.copy(hex(t.color));
    if (!h.emissive) h.material.emissive.set(0, 0, 0);
    h.material.update();
    h.entity.setLocalPosition(t.pos[0], t.pos[1], t.pos[2]);
    h.entity.setLocalScale(t.size[0], t.size[1], t.size[2]);
    h.entity.setLocalEulerAngles(0, t.yaw, 0); // yaw never animates; it snaps with the fold
  }

  /** snap the whole space to a state (debug jumps; deterministic, reversible) */
  snapTo(idx: number): void {
    this.endSweep();
    this.active = false; this.plans = [];
    this.state = idx;
    const targets = this.targetsFor(idx);
    for (const [id, t] of targets) {
      if (!t.present) continue;
      let h = this.room.props.get(id);
      if (!h) { this.spawnTarget(id, t); continue; } // first spawn places itself
      // constants never change AND may be owned by the static batcher — the
      // morph must not touch their transform/material (a batched entity's
      // transform edits would silently diverge from the baked batch)
      if (STATIC_IDS.has(id)) continue;
      // a baseline era1.json prop (spawned as a BOX by era1room.ts's initial
      // pass, before this fold ever runs) whose target has since grown a
      // `model` via its own `props` override — e.g. mixtape (Session 54).
      // foldTargets now copies `model` out of an override too, but the RUNTIME
      // half still needs this: the id already has a live BOX handle from that
      // initial pass, so the normal 'first spawn places itself' branch above
      // never sees it. Re-spawn the SAME id as the real mesh, once, the first
      // time its fold ever asks for a model — the id must stay stable
      // (belongings.json/the ledger/app.ts's click geometry all key off
      // `mixtape` by name), so this can never be a fresh id the way every
      // other model prop (added via `add`, never pre-existing) already is.
      if (t.model && !h.model) {
        h.entity.destroy();
        this.room.props.delete(id);
        h = this.spawnTarget(id, t);
        continue;
      }
      this.applyTarget(h, t);
    }
    for (const [id, h] of this.room.props) {
      if (STATIC_IDS.has(id)) continue; // constants are always present
      const t = targets.get(id);
      const absent = !t || !t.present;
      if (h.model || h.composite) h.entity.enabled = !absent; // toggle presence, never scale-to-0
      else if (absent) h.entity.setLocalScale(0, 0, 0);
    }
  }

  /**
   * Bring the space to state `idx`. `animate` = the narrative cascade (from
   * state idx−1); otherwise SNAP. Deterministic and reversible either way.
   */
  goToState(idx: number, animate: boolean, pace = 1): void {
    this.endSweep();
    this.active = false; this.plans = [];
    this.pace = Math.max(0.1, pace);
    // ⚑ S348 (his 9 Nov: under reduced motion "the flight becomes a slow drift, and the glob effect stays") — the
    //   cascade no longer snaps under reduced motion
    if (!animate || idx <= 0) { this.snapTo(Math.max(0, idx)); return; }

    this.snapTo(idx - 1);
    this.state = idx;
    const prev = this.targetsFor(idx - 1);
    const targets = this.targetsFor(idx);
    const ids = new Set<string>([...prev.keys(), ...targets.keys()]);
    for (const id of ids) {
      // constants AND kept props hold still through the cascade (a kept
      // prop's frozen r1 target is already its live transform — nothing to
      // animate, and skipping avoids even the cosmetic glitch-flicker
      // brushing the one thing that isn't changing, R28-2c).
      if (STATIC_IDS.has(id) || this.keptIds.has(id)) continue;
      const tn = targets.get(id);
      const tp = prev.get(id);
      let h = this.room.props.get(id);
      if (!h) {
        const seed = tp?.present ? tp : tn;
        if (!seed) continue;
        h = this.spawnTarget(id, seed);
        if (!h.model && !h.composite && !tp?.present) h.entity.setLocalScale(0, 0, 0); // grows in from nothing
      }
      // MODEL (and composite) props don't animate (a wrapper the morph must
      // not distort): snap their presence AND position (see applyTarget's own
      // note — a model prop can still relocate across eras) to the target,
      // skipping the pos/scale cascade.
      if (h.model || h.composite) {
        h.entity.enabled = !!tn?.present;
        if (tn?.present) h.entity.setLocalPosition(tn.pos[0], tn.pos[1], tn.pos[2]);
        continue;
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
    const cascade = CASCADE * this.pace;
    const propDur = PROP_DUR * this.pace;
    sorted.forEach((pl, i) => { pl.startT = (i / Math.max(1, sorted.length - 1)) * (cascade - propDur); });

    this.active = true; this.t = 0;
  }

  update(dt: number): void {
    this.updateSweep(dt);
    if (!this.active) return;
    this.t += dt;
    const propDur = PROP_DUR * this.pace;

    for (const pl of this.plans) {
      const local = (this.t - pl.startT) / propDur;
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
      // (GLITCH_FRAC is a FRACTION of `k`, so it follows the pace for free)
      if (k < GLITCH_FRAC && Math.random() < 0.55) {
        // ⚑ S348 (UiB job 7) — IN A HEADSET ONLY, a wall-sized surface flickers at a third of the brightness: at full
        //   strength a whole wall flashes white at random every frame, and in a headset that is most of the field of
        //   view (photographed: 2003 → 2016 and 2016 → 2026, a white wall filling the view). Small things keep the full
        //   flicker, the jitter is untouched, and the computer is exactly as it was (his: restore it as before job 5).
        //   (the flash is the surface's OWN colour + f as emissive, so it is the whole glow that is scaled, not just f)
        const wide = Math.max(sx, sz) * sy > 1.0 && !!pc.AppBase.getApplication()?.xr?.active;
        const f = (1 - k / GLITCH_FRAC) * 0.7;
        const g = wide ? 0.3 : 1;
        pl.h.material.emissive.set((col.r + f) * g, (col.g + f) * g, (col.b + f) * g);
        const j = 1 + (Math.random() * 0.14 - 0.07) * (1 - k / GLITCH_FRAC);
        sx *= j; sy *= j; sz *= j;
      }
      pl.h.entity.setLocalScale(sx, sy, sz);
      pl.h.material.update();
    }

    if (this.t > (CASCADE + PROP_DUR) * this.pace) this.active = false;
  }
}

/** Restore entrance: sample the already-folded r1 meshes, including model children.
 * Points come from real mesh vertices/triangles, never from a second room layout. */
export function sampleRoomSurfaces(room: RoomHandles, count: number): { point: pc.Vec3; material: pc.Material }[] {
  const triangles: pc.Vec3[][] = [];
  const materials: pc.Material[] = [];
  for (const h of room.props.values()) {
    if (!h.entity.enabled) continue;
    h.entity.forEach((node) => {
      const e = node as pc.Entity;
      for (const mi of e.render?.enabled ? e.render.meshInstances : []) {
        const positions: number[] = [], indices: number[] = [];
        mi.mesh.getPositions(positions); mi.mesh.getIndices(indices);
        const transform = mi.node.getWorldTransform();
        const vertex = (i: number): pc.Vec3 => transform.transformPoint(new pc.Vec3(...positions.slice(i * 3, i * 3 + 3)));
        const ids = indices.length ? indices : Array.from({ length: positions.length / 3 }, (_, i) => i);
        for (let i = 0; i + 2 < ids.length; i += 3) { triangles.push([vertex(ids[i]), vertex(ids[i + 1]), vertex(ids[i + 2])]); materials.push(mi.material); }
      }
    });
  }
  // Area-weighted selection keeps large room surfaces legible beside detailed props.
  const area: number[] = []; let total = 0;
  for (const [a, b, c] of triangles) { total += new pc.Vec3().cross(b.clone().sub(a), c.clone().sub(a)).length() / 2; area.push(total); }
  let seed = 1997;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => {
    const pick = random() * total; let lo = 0, hi = area.length - 1;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (area[mid] < pick) lo = mid + 1; else hi = mid; }
    const [a, b, c] = triangles[lo]; const u = Math.sqrt(random()), v = random();
    return { point: a.clone().mulScalar(1 - u).add(b.clone().mulScalar(u * (1 - v))).add(c.clone().mulScalar(u * v)), material: materials[lo] };
  });
}
