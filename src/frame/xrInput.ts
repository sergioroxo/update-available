/** XR pointing: controllers and tracked hands share the existing ray resolver.
 * One palette-coloured mesh per source contains its ray, pixel cursor and
 * low-poly joint cubes. Native controller select; hand pinch hysteresis and
 * latched near-touch; grip/pinch-hold delegates pickup to the shared devices.
 * Gaze never selects. All gesture and pickup state is memory-only.
 */
import * as pc from 'playcanvas';
import type { Ray } from './xrFrame';

const WAND_LENGTH = 1.6;
const WAND_THICK = 0.004;
const DOT = 0.009, DOT_FLASH = 0.026, FLASH_MS = 220;

export interface XrInput {
  /** the primary controller's ray this frame, or null (no session / no controller) */
  ray(): Ray | null;
  /** once per frame: the wands follow the hands */
  tick(): void;
  destroy(): void;
}

export function mountXrInput(app: pc.Application, opts: {
  /** a trigger press with the menu closed */
  onSelect: (ray: Ray) => void;
  /** a trigger press with the menu open — the frame's plane takes it */
  onMenuSelect: (ray: Ray) => void;
  /** the grip: toggle the menu */
  onSqueeze: () => void;
  menuOpen: () => boolean;
  /** the wand's colour, from a theme — never a literal here */
  wandColor: pc.Color;
  /** Home keeps the wand and its window in one layer above the loading room. */
  layers?: number[];
  toSceneRay?: (ray: Ray) => Ray;
  fromScenePoint?: (point: pc.Vec3) => pc.Vec3;
  onGrab?: (source: pc.XrInputSource, ray: Ray) => boolean;
  onHold?: (source: pc.XrInputSource, ray: Ray) => void;
  onRelease?: (source: pc.XrInputSource) => void;
  canPoke?: (ray: Ray) => boolean;
  onKey?: (key: 'a' | 'b' | 'start' | 'left' | 'right' | 'up' | 'down') => void;
}): XrInput {
  const xr = app.xr;
  const meshes = new Map<pc.XrInputSource, pc.Mesh>();
  const dots = new Map<pc.XrInputSource, pc.Entity>();
  const hands = new Map<pc.XrInputSource, { entity: pc.Entity; mesh: pc.Mesh }>();
  const gestures = new Map<pc.XrInputSource, { pinch: boolean; since: number; held: boolean; near: boolean; buttons: boolean[]; aim: Ray | null }>();
  const wands = new Map<pc.XrInputSource, pc.Entity>();
  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = opts.wandColor;
  mat.update();

  const rayOf = (src: pc.XrInputSource): Ray | null => {
    // ⚑ never gaze: a 'gaze' source is the head, and looking presses nothing here
    if (src.targetRayMode === pc.XRTARGETRAY_GAZE) return null;
    const o = src.getOrigin();
    const d = src.getDirection();
    if (!o || !d) return null;
    const p0 = new pc.Vec3().copy(o);
    const p1 = new pc.Vec3().copy(d).mulScalar(12).add(o);
    return { p0, p1 };
  };
  /** the hand that pressed last is the one the cursor follows */
  let primary: pc.XrInputSource | null = null;

  const onAdd = (src: pc.XrInputSource): void => {
    if (src.targetRayMode === pc.XRTARGETRAY_GAZE) return;
    const e = new pc.Entity('xr-wand');
    const mesh = new pc.Mesh(app.graphicsDevice); meshes.set(src, mesh);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], ...(opts.layers ? { layers: opts.layers } : {}) });
    e.enabled = false;
    app.root.addChild(e);
    wands.set(src, e);
    const dot = new pc.Entity('xr-cursor'); dot.setLocalScale(DOT, DOT, DOT); app.root.addChild(dot); dot.enabled = false; dots.set(src, dot);
    gestures.set(src, { pinch: false, since: 0, held: false, near: false, buttons: [], aim: null });
    if (src.hand) {
      const entity = new pc.Entity('xr-hand');
      app.root.addChild(entity); entity.enabled = false; hands.set(src, { entity, mesh });
    }
    primary ??= src;
  };
  const onRemove = (src: pc.XrInputSource): void => {
    opts.onRelease?.(src); dots.get(src)?.destroy(); dots.delete(src); hands.get(src)?.entity.destroy(); meshes.get(src)?.destroy(); meshes.delete(src); hands.delete(src); gestures.delete(src);
    wands.get(src)?.destroy();
    wands.delete(src);
    if (primary === src) primary = wands.keys().next().value ?? null;
  };
  const onSelect = (src: pc.XrInputSource): void => {
    if (src.hand) return; // pinch hysteresis below owns hand selects, never double-fire native select
    primary = src;
    const r = rayOf(src);
    if (!r) return;
    choose(r, src);
  };
  // ⚑ S268 (his: "the beeping of the input is a bit annoying") — no sound on a press in the headset: a controller
  //   gets a short, light pulse; a hand gets nothing (the button's own pressed state is the feedback)
  // ⚑ S269 (his: "need a better confirmation of the action") — every press swells the cursor dot for a moment
  const flashUntil = new Map<pc.XrInputSource, number>();
  const choose = (r: Ray, src?: pc.XrInputSource): void => {
    const who = src ?? primary; if (who) flashUntil.set(who, performance.now() + FLASH_MS);
    if (opts.menuOpen()) opts.onMenuSelect(r); else opts.onSelect(r);
    const pad = src?.gamepad as (Gamepad & { hapticActuators?: { pulse?(v: number, ms: number): void }[] }) | null | undefined;
    try { pad?.hapticActuators?.[0]?.pulse?.(0.25, 12); } catch { /* no actuator: nothing */ }
  };
  const onSqueeze = (src: pc.XrInputSource): void => {
    primary = src; const r = rayOf(src); const state = gestures.get(src);
    if (!opts.menuOpen() && r && opts.onGrab?.(src, r)) { if (state) state.held = true; return; }
    // ⚑ S269 (his: "if I move my hands quickly the menu appears") — a tracked hand reports a squeeze for a fist or a
    //   fast closing hand; the menu opens from a controller's grip or from the Menu tab, never from a hand
    if (src.hand) return;
    opts.onSqueeze();
  };
  const release = (src: pc.XrInputSource): void => { const state = gestures.get(src); if (state?.held) opts.onRelease?.(src); if (state) state.held = false; };
  const onEnd = (): void => { for (const src of wands.keys()) { release(src); const state = gestures.get(src); if (state) state.pinch = false; } for (const e of [...wands.values(), ...dots.values()]) e.enabled = false; for (const h of hands.values()) h.entity.enabled = false; };

  if (xr) {
    xr.input.on('add', onAdd);
    xr.input.on('remove', onRemove);
    xr.input.on('select', onSelect);
    xr.input.on('squeezestart', onSqueeze);
    xr.input.on('squeezeend', release);
    xr.on('end', onEnd);
    // Home hands the same live session to the room: its controllers already exist.
    for (const src of xr.input.inputSources) onAdd(src);
  }

  function landing(ray: Ray): { point: pc.Vec3; distance: number } | null {
    const r = opts.menuOpen() ? ray : opts.toSceneRay?.(ray) ?? ray;
    let best: { point: pc.Vec3; distance: number } | null = null;
    app.root.forEach(node => {
      const e = node as pc.Entity;
      if (!e.enabled || e.name === 'xr-frame-hint' || (opts.menuOpen() && e.name !== 'xr-frame-menu') || e.render?.type !== 'plane' || !/screen|era3-device|setup-in-stars|xr-frame|lambyos-home/.test(e.name)) return;
      if (!e.render.meshInstances.some(mi => mi.visible)) return;
      const physical = e.name.startsWith('xr-') || e.name.startsWith('lambyos-home') || e.name.startsWith('setup-');
      const test = physical ? ray : r;
      const inv = e.getWorldTransform().clone().invert();
      const a = inv.transformPoint(test.p0), b = inv.transformPoint(test.p1);
      const t = -a.y / (b.y - a.y);
      if (!Number.isFinite(t) || t < 0 || t > 1) return;
      const point = new pc.Vec3().lerp(a, b, t);
      if (Math.abs(point.x) > 0.5 || Math.abs(point.z) > 0.5) return;
      let world = e.getWorldTransform().transformPoint(point);
      if (!physical) world = opts.fromScenePoint?.(world) ?? world;
      const distance = world.distance(ray.p0);
      if (!best || distance < best.distance) best = { point: world, distance };
    });
    return best;
  }
  /** One mesh per source: ray, pixel cursor and all hand joints share a draw call. */
  function drawSource(src: pc.XrInputSource, ray: Ray, length: number, cursor: pc.Vec3 | null): void {
    const vertices: number[] = [], indices: number[] = [];
    function box(at: pc.Vec3, size: pc.Vec3, rotation?: pc.Quat): void {
      const base = vertices.length / 3;
      for (let i = 0; i < 8; i++) {
        const p = new pc.Vec3(i & 1 ? size.x : -size.x, i & 2 ? size.y : -size.y, i & 4 ? size.z : -size.z);
        if (rotation) rotation.transformVector(p, p);
        vertices.push(at.x + p.x, at.y + p.y, at.z + p.z);
      }
      for (const i of [0,2,1,1,2,3,4,5,6,5,7,6,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5]) indices.push(base + i);
    }
    const dir = ray.p1.clone().sub(ray.p0).normalize();
    const pose = new pc.Mat4().setLookAt(ray.p0, ray.p1, pc.Vec3.UP);
    // A vertical pointer still needs a valid basis.
    if (Math.abs(dir.y) > 0.99) pose.setLookAt(ray.p0, ray.p1, pc.Vec3.RIGHT);
    box(ray.p0.clone().add(dir.mulScalar(length / 2)), new pc.Vec3(WAND_THICK/2, WAND_THICK/2, length/2), new pc.Quat().setFromMat4(pose));
    if (cursor) box(cursor, new pc.Vec3(0.0045,0.0045,0.0045));
    const h = hands.get(src);
    if (h && src.hand) {
      h.entity.enabled = !!src.hand.tracking;
      if (h.entity.enabled) for (const j of src.hand.joints) {
        const r = Math.min(0.012, Math.max(0.005, j.radius)); box(j.getPosition(), new pc.Vec3(r,r,r));
      }
    }
    const mesh = meshes.get(src)!;
    mesh.setPositions(vertices); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  }

  return {
    ray(): Ray | null {
      if (!xr?.active || !primary) return null;
      return rayOf(primary);
    },
    tick(): void {
      const active = !!xr?.active;
      for (const [src, e] of wands) {
        const r = active ? rayOf(src) : null;
        const dot = dots.get(src)!; dot.enabled = false;
        if (!active && hands.has(src)) hands.get(src)!.entity.enabled = false;
        if (!r || (src.hand && !src.hand.tracking)) {
          e.enabled = false; if (hands.has(src)) hands.get(src)!.entity.enabled = false;
          release(src); const state = gestures.get(src); if (state) { state.pinch = false; state.near = false; }
          continue;
        }
        e.enabled = true;
        const hit = landing(r);
        if (hit) { dot.enabled = true; dot.setPosition(hit.point); primary = src; }
        const flashing = performance.now() < (flashUntil.get(src) ?? 0);
        dot.setLocalScale(flashing ? DOT_FLASH : DOT, flashing ? DOT_FLASH : DOT, flashing ? DOT_FLASH : DOT);
        const length = hit ? hit.distance : WAND_LENGTH;

        const state = gestures.get(src)!;
        const now = performance.now();
        if (src.hand) {

          const thumb = src.hand.getJointById('thumb-tip'), index = src.hand.getJointById('index-finger-tip');
          if (thumb && index && src.hand.tracking) {
            const separation = thumb.getPosition().distance(index.getPosition());
            // ⚑ S268 (his: "the pinch to press is not always working") — the press goes where the hand was AIMING when
            //   the pinch closed: closing and opening the fingers swings the hand's ray, and the release-time ray missed
            if (!state.pinch && separation < 0.022) { state.pinch = true; state.since = now; primary = src; state.aim = { p0: r.p0.clone(), p1: r.p1.clone() }; }
            if (state.pinch && !state.held && now - state.since > 350 && !opts.menuOpen()) state.held = opts.onGrab?.(src, r) ?? false;
            if (state.pinch && separation > 0.032) { if (state.held) release(src); else choose(state.aim ?? r, src); state.pinch = false; state.aim = null; }
            // Poke is a short fingertip segment along the pointing direction. Latch until withdrawn.
            const tip = index.getPosition();
            const direction = r.p1.clone().sub(r.p0).normalize();
            const poke = { p0: tip.clone().sub(direction.clone().mulScalar(0.018)), p1: tip.clone().add(direction.mulScalar(0.025)) };
            const near = !!landing(poke) || !!opts.canPoke?.(poke);
            if (near && !state.near && !state.pinch && !state.held) { primary = src; choose(poke, src); }
            state.near = near;
          }
        }
        if (state.held) opts.onHold?.(src, r);
        const buttons = src.gamepad?.buttons ?? [];
        buttons.forEach((b, i) => { if (b.pressed && !state.buttons[i] && i >= 4) opts.onKey?.(i === 4 ? 'a' : 'b'); state.buttons[i] = b.pressed; });
        const axes = src.gamepad?.axes ?? [];
        const keys = ['left', 'right', 'up', 'down'] as const;
        const directions = [(axes[2] ?? 0) < -0.6, (axes[2] ?? 0) > 0.6, (axes[3] ?? 0) < -0.6, (axes[3] ?? 0) > 0.6];
        directions.forEach((pressed, i) => { if (pressed && !state.buttons[8 + i]) opts.onKey?.(keys[i]); state.buttons[8 + i] = pressed; });
        drawSource(src, r, length, hit?.point ?? null);
      }
    },
    destroy(): void {
      if (xr) {
        xr.input.off('add', onAdd);
        xr.input.off('remove', onRemove);
        xr.input.off('select', onSelect);
        xr.input.off('squeezestart', onSqueeze);
        xr.input.off('squeezeend', release);
        xr.off('end', onEnd);
      }
      for (const src of [...wands.keys()]) onRemove(src);
      wands.clear();
      mat.destroy();
    }
  };
}
