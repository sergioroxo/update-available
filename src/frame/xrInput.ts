/** XR pointing: controllers and tracked hands share the existing ray resolver.
 * One palette-coloured mesh per source contains its ray, pixel cursor and
 * low-poly joint cubes. Native controller select; hand pinch hysteresis and
 * latched near-touch; grip/pinch-hold delegates pickup to the shared devices.
 * Gaze never selects. All gesture and pickup state is memory-only.
 */
import * as pc from 'playcanvas';
import type { Ray } from './xrFrame';
import { FRAME } from '../desktop/theme/chrome';
import { ERA1 } from '../desktop/theme/era1';
import { ERA4 } from '../desktop/theme/era4';

/** S270f: the stub when the ray lands on nothing — hand, controller */
const STUB_HAND = 0.12, STUB_PAD = 0.25;
const WAND_THICK = 0.004;
const DOT = 0.009, DOT_FLASH = 0.026, FLASH_MS = 220;
/**
 * ⚑ S345 / T29 (his 8 Nov headset: "the box crosses over my line of interaction"; answer 20: "The pointer's box can stay,
 * smaller, and visibly connected to the ray, not vague and floating") — the pointer's mark is a small square frame lying
 * ON the surface the ray lands on (turned to it), the ray ending in its centre; on a room thing it is turned to the eye,
 * with a short leader to the thing the ray is on. Its side grows with distance so it is the same size in the view
 * (~0.7°), within these bounds; it swells for a moment on a press.
 */
const MARK = 0.012, MARK_MIN = 0.006, MARK_MAX = 0.02;
/**
 * ⚑ S345 / T11 (his 8 Nov headset: presses "on boxes" in 2026 he was not pointing at) — a controller's select arrives on
 * the trigger's RELEASE, with the pose of that moment, and pulling a trigger dips the controller: a 2° dip is ~3.5 cm at
 * 2026's monitor (~47 of its 384 px), three rows of its tabs and bars. The press now goes where the ray was when the
 * trigger began (as the pinch already does, S268), unless the hand travelled further than this while it was held (then it
 * was a deliberate re-aim, and the release is where it aimed).
 */
const PRESS_TRAVEL_DEG = 10;

export interface XrInput {
  /** the primary controller's ray this frame, or null (no session / no controller) */
  stick(): { x: number; y: number };
  ray(): Ray | null;
  /** S270g / VR-04 — every tracked index fingertip (hands) and controller grip, in physical space */
  points(): pc.Vec3[];
  /** S270h / VR-01 — each hand's palm (it does not move when the fingers pinch) and each controller's grip */
  palms(): pc.Vec3[];
  /** ⚑ S343 / T11 — tracked hands only (a controller is never a palm on the desk mouse) */
  handPalms(): pc.Vec3[];
  /** S270g / VR-08 — 'own' or 'programme': the programme redraws the visitor's hands while the visor is on */
  setStyle(style: 'own' | 'programme'): void;
  /** ⚑ S345 / T29 — the room thing the app's aim names this frame (physical point), or null: the ray ends on it */
  setAimTarget(p: pc.Vec3 | null): void;
  /** ⚑ S345 / T29 — where the primary ray ends this frame (physical): on a surface (with its normal), on the aimed thing,
   *  or at the end of its short stub; null with no ray */
  end(): { point: pc.Vec3; normal: pc.Vec3 | null; landed: boolean } | null;
  /** S270f — the left wrist (hand) or left grip (controller), where the Menu tab rides; null when not tracked */
  wrist(): { at: pc.Vec3; palm: pc.Vec3 | null } | null;
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
  /** Direct hand contact takes precedence over pinch and ray poke; null tip clears tracking; null result keeps legacy poke.
   * A boolean result reserves room pokes for direct touch (frame pokes still work). */
  onTouch?: (source: pc.XrInputSource, tip: pc.Vec3 | null) => boolean | null;
  canPoke?: (ray: Ray) => boolean;
  onKey?: (key: 'a' | 'b' | 'start' | 'left' | 'right' | 'up' | 'down') => void;
  /** S291 — the thumbstick, continuous (x right, y down, −1…1), once a frame per tracked source that has one; the site viewer scrolls with it */
  onStick?: (x: number, y: number) => void;
  /** ⚑ S383 (his: "grabbing the scroll marker and pull it up and down to scroll") — a trigger that BEGINS (selectstart) or a
   *  pinch that CLOSES on something that is dragged rather than pressed (the site window's scroll thumb): true when this
   *  ray took it. A grab is never a press: the select that ends it is swallowed, wherever the ray is by then. */
  onDragStart?: (source: pc.XrInputSource, ray: Ray) => boolean;
  /** …once a frame while it is held (the ray's present pose) */
  onDragMove?: (source: pc.XrInputSource, ray: Ray) => void;
  /** …and when the trigger / pinch lets go, or the source is lost */
  onDragEnd?: (source: pc.XrInputSource) => void;
}): XrInput {
  const xr = app.xr;
  const meshes = new Map<pc.XrInputSource, pc.Mesh>();
  const dots = new Map<pc.XrInputSource, pc.Entity>();
  const hands = new Map<pc.XrInputSource, { entity: pc.Entity; mesh: pc.Mesh }>();
  const tips = new Map<pc.XrInputSource, { entity: pc.Entity; mat: pc.StandardMaterial; state: string }>();
  // ⚑ S270g / VR-08 — inside the visor the programme draws the visitor's hands in its own colours: the glass's
  //   mint (era4's ERA4.l, L's own colour), not the frame's grey. It says nothing about it.
  let style: 'own' | 'programme' = 'own';
  const PROGRAMME_HAND = new pc.Color().fromString(ERA4.l);
  // ⚑ S270d (his: "a very subtle change from grayish to whitish… this probably needs a little bit more") — rest is
  //   small and dim; touch is the frame's blue at twice the size; a registered press is a big bright pop
  //   (the first "blue" was the screensaver's sky — near black, which is why only grey→white showed)
  const TIP = { rest: { color: new pc.Color().fromString(FRAME.dim), size: 0.006 },
    touch: { color: new pc.Color().fromString(ERA1.titleBlue), size: 0.013 },
    press: { color: new pc.Color().fromString(FRAME.bright), size: 0.022 } };
  const gestures = new Map<pc.XrInputSource, { pinch: boolean; since: number; held: boolean; near: boolean; buttons: boolean[]; aim: Ray | null; drag: boolean }>();
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
    gestures.set(src, { pinch: false, since: 0, held: false, near: false, buttons: [], aim: null, drag: false });
    if (src.hand) {
      const entity = new pc.Entity('xr-hand');
      app.root.addChild(entity); entity.enabled = false; hands.set(src, { entity, mesh });
      // ⚑ S270c (his: "maybe a small color change in the tip of the fingers… to understand that it is registering the
      //   touch") — the index fingertip carries a cube: dim at rest, blue when it is on something pressable or the
      //   pinch is closed, bright for the moment a press registers
      const tip = new pc.Entity('xr-tip'), tipMat = new pc.StandardMaterial();
      tipMat.useLighting = false; tipMat.diffuse = new pc.Color(0, 0, 0); tipMat.update();
      tip.addComponent('render', { type: 'box', material: tipMat, ...(opts.layers ? { layers: opts.layers } : {}) });
      app.root.addChild(tip); tip.enabled = false; tips.set(src, { entity: tip, mat: tipMat, state: '' });
    }
    primary ??= src;
  };
  const onRemove = (src: pc.XrInputSource): void => {
    opts.onTouch?.(src, null);
    endDrag(src); dragEndedAt.delete(src); opts.onRelease?.(src); selectStart.delete(src); ends.delete(src); dots.get(src)?.destroy(); dots.delete(src); hands.get(src)?.entity.destroy(); tips.get(src)?.entity.destroy(); tips.delete(src); meshes.get(src)?.destroy(); meshes.delete(src); hands.delete(src); gestures.delete(src);
    wands.get(src)?.destroy();
    wands.delete(src);
    if (primary === src) primary = wands.keys().next().value ?? null;
  };
  const selectStart = new Map<pc.XrInputSource, Ray>();
  // ⚑ S383 — a controller's grab: begun at selectstart on the scroll thumb, over at selectend. The runtime sends `select`
  //   and `selectend` in either order, so a select that is IN a grab or arrives within DRAG_TAIL_MS of one ending is its
  //   tail and presses nothing (S80's rule: a press that travels is a look; a grab never ends as a click).
  const DRAG_TAIL_MS = 200;
  const dragging = new Set<pc.XrInputSource>();
  const dragEndedAt = new Map<pc.XrInputSource, number>();
  const endDrag = (src: pc.XrInputSource): void => { if (dragging.delete(src)) { dragEndedAt.set(src, performance.now()); opts.onDragEnd?.(src); } };
  const onSelectEnd = (src: pc.XrInputSource): void => { if (!src.hand) endDrag(src); };
  const onSelectStart = (src: pc.XrInputSource): void => {
    if (src.hand) return;
    const r = rayOf(src);
    if (r && opts.onDragStart?.(src, r)) { primary = src; dragging.add(src); selectStart.delete(src); return; }
    if (r) selectStart.set(src, r); else selectStart.delete(src);
  };
  const onSelect = (src: pc.XrInputSource): void => {
    if (src.hand) return; // pinch hysteresis below owns hand selects, never double-fire native select
    if (dragging.has(src) || performance.now() - (dragEndedAt.get(src) ?? -1e9) < DRAG_TAIL_MS) return;   // S383: the tail of a grab
    primary = src;
    const now = rayOf(src);
    const start = selectStart.get(src) ?? null;
    selectStart.delete(src);
    // S345 / T11 — the aim when the trigger began, not the dip of its release
    let r = now;
    if (start && now) {
      const a = start.p1.clone().sub(start.p0).normalize(), b = now.p1.clone().sub(now.p0).normalize();
      if (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI <= PRESS_TRAVEL_DEG) r = start;
    }
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
  const onEnd = (): void => { selectStart.clear(); for (const src of wands.keys()) { opts.onTouch?.(src, null); release(src); endDrag(src); const state = gestures.get(src); if (state?.drag) { state.drag = false; opts.onDragEnd?.(src); } if (state) state.pinch = false; } for (const e of [...wands.values(), ...dots.values()]) e.enabled = false; for (const h of hands.values()) h.entity.enabled = false; for (const t of tips.values()) t.entity.enabled = false; };

  if (xr) {
    xr.input.on('add', onAdd);
    xr.input.on('remove', onRemove);
    xr.input.on('selectstart', onSelectStart);
    xr.input.on('select', onSelect);
    xr.input.on('selectend', onSelectEnd);
    xr.input.on('squeezestart', onSqueeze);
    xr.input.on('squeezeend', release);
    xr.on('end', onEnd);
    // Home hands the same live session to the room: its controllers already exist.
    for (const src of xr.input.inputSources) onAdd(src);
  }

  type Landing = { point: pc.Vec3; distance: number; normal: pc.Vec3 | null; target?: pc.Vec3 };
  function landing(ray: Ray): Landing | null {
    const r = opts.menuOpen() ? ray : opts.toSceneRay?.(ray) ?? ray;
    let best: Landing | null = null;
    app.root.forEach(node => {
      const e = node as pc.Entity;
      if (!e.enabled || e.name === 'xr-frame-hint' || (opts.menuOpen() && e.name !== 'xr-frame-menu' && e.name !== 'xr-frame-site') || e.render?.type !== 'plane' || !/screen|era3-device|setup-in-stars|xr-frame|lambyos-home/.test(e.name)) return;
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
      let tip = e.getWorldTransform().transformPoint(point.clone().add(new pc.Vec3(0, 1, 0)));
      if (!physical) { world = opts.fromScenePoint?.(world) ?? world; tip = opts.fromScenePoint?.(tip) ?? tip; }
      const distance = world.distance(ray.p0);
      // the surface's normal, turned to face the ray (a plane is seen from either side)
      const normal = tip.sub(world).normalize();
      if (normal.dot(ray.p1.clone().sub(ray.p0)) > 0) normal.mulScalar(-1);
      if (!best || distance < best.distance) best = { point: world, distance, normal };
    });
    return best;
  }
  /** S345 / T29 — the aimed room thing on this ray: the ray ends where it passes it */
  let aimTarget: pc.Vec3 | null = null;
  function onTarget(ray: Ray): Landing | null {
    if (!aimTarget) return null;
    const dir = ray.p1.clone().sub(ray.p0).normalize();
    const t = aimTarget.clone().sub(ray.p0).dot(dir);
    if (t < 0.05) return null;
    return { point: ray.p0.clone().add(dir.mulScalar(t)), distance: t, normal: null, target: aimTarget.clone() };
  }
  const ends = new Map<pc.XrInputSource, { point: pc.Vec3; normal: pc.Vec3 | null; landed: boolean }>();
  /** One mesh per source: ray, pixel cursor and all hand joints share a draw call. */
  function drawSource(src: pc.XrInputSource, ray: Ray, length: number, cursor: Landing | null, swell = false): void {
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
    box(ray.p0.clone().add(dir.clone().mulScalar(length / 2)), new pc.Vec3(WAND_THICK/2, WAND_THICK/2, length/2), new pc.Quat().setFromMat4(pose));
    if (cursor) {
      // S345 / T29 — a small square frame where the ray lands, lying on the surface (or turned to the ray on a room thing)
      const n = cursor.normal ?? dir.clone().mulScalar(-1);
      const side = Math.min(MARK_MAX, Math.max(MARK_MIN, MARK * cursor.distance)) * (swell ? 1.8 : 1);
      const bar = side * 0.2, half = side / 2, depth = 0.0008;
      const at = cursor.point.clone().add(n.clone().mulScalar(0.002));
      const m = new pc.Mat4().setLookAt(at, at.clone().sub(n), Math.abs(n.y) > 0.99 ? pc.Vec3.RIGHT : pc.Vec3.UP);
      const q = new pc.Quat().setFromMat4(m);
      const ax = q.transformVector(new pc.Vec3(1, 0, 0)), ay = q.transformVector(new pc.Vec3(0, 1, 0));
      box(at.clone().add(ay.clone().mulScalar(half - bar / 2)), new pc.Vec3(half, bar / 2, depth), q);
      box(at.clone().sub(ay.clone().mulScalar(half - bar / 2)), new pc.Vec3(half, bar / 2, depth), q);
      box(at.clone().add(ax.clone().mulScalar(half - bar / 2)), new pc.Vec3(bar / 2, half - bar, depth), q);
      box(at.clone().sub(ax.clone().mulScalar(half - bar / 2)), new pc.Vec3(bar / 2, half - bar, depth), q);
      // …and on a room thing the ray only passes, a short leader from the mark to the thing itself
      if (cursor.target && cursor.target.distance(cursor.point) > side) {
        const a = cursor.point, b = cursor.target, len = a.distance(b);
        const lm = new pc.Mat4().setLookAt(a, b, Math.abs(b.clone().sub(a).normalize().y) > 0.99 ? pc.Vec3.RIGHT : pc.Vec3.UP);
        box(a.clone().add(b).mulScalar(0.5), new pc.Vec3(WAND_THICK / 4, WAND_THICK / 4, len / 2), new pc.Quat().setFromMat4(lm));
      }
    }
    const h = hands.get(src);
    if (h && src.hand) {
      h.entity.enabled = !!src.hand.tracking;
      // ⚑ S270f (his: "the hand marker… needs more block so people don't think it is skeleton hand") — not a cube at
      //   every joint but a block along every bone: each finger a chain of chunky segments, the palm the segments from
      //   the wrist to each finger's root. Reads as a pixel-art hand, not an X-ray. Still one mesh, one draw call.
      const bone = (a: pc.Vec3, b: pc.Vec3, r: number): void => {
        const len = a.distance(b);
        if (len < 1e-4) return;
        const m = new pc.Mat4().setLookAt(a, b, Math.abs(b.clone().sub(a).normalize().y) > 0.99 ? pc.Vec3.RIGHT : pc.Vec3.UP);
        box(a.clone().add(b).mulScalar(0.5), new pc.Vec3(r, r, len / 2 + r * 0.5), new pc.Quat().setFromMat4(m));
      };
      const wrist = src.hand.wrist, fingers = src.hand.fingers as pc.XrFinger[] | undefined;
      // a hand without finger chains (an emulator's) keeps the joint cubes
      if (h.entity.enabled && !fingers?.length) for (const j of src.hand.joints ?? []) {
        const r = Math.min(0.012, Math.max(0.005, j.radius)); box(j.getPosition(), new pc.Vec3(r, r, r));
      }
      if (h.entity.enabled) for (const finger of fingers ?? []) {
        const js = finger.joints;
        const r = (j: pc.XrJoint): number => Math.min(0.012, Math.max(0.007, j.radius * 1.1));
        if (wrist && js[0]) bone(wrist.getPosition(), js[0].getPosition(), 0.011);
        for (let i = 0; i + 1 < js.length; i++) bone(js[i].getPosition(), js[i + 1].getPosition(), r(js[i]));
      }
    }
    const mesh = meshes.get(src)!;
    mesh.setPositions(vertices); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  }

  const stickNow = { x: 0, y: 0 }, stickLast = { x: 0, y: 0 };
  return {
    points(): pc.Vec3[] {
      const out: pc.Vec3[] = [];
      if (!xr?.active) return out;
      for (const src of wands.keys()) {
        if (src.hand) { const t = src.hand.tracking ? src.hand.getJointById('index-finger-tip') : null; if (t) out.push(t.getPosition().clone()); }
        else { const g = src.getPosition?.(); if (g) out.push(g.clone()); }
      }
      return out;
    },
    palms(): pc.Vec3[] {
      const out: pc.Vec3[] = [];
      if (!xr?.active) return out;
      for (const src of wands.keys()) {
        if (src.hand) { const m = src.hand.tracking ? src.hand.getJointById('middle-finger-metacarpal') : null; if (m) out.push(m.getPosition().clone()); }
        else { const g = src.getPosition?.(); if (g) out.push(g.clone()); }
      }
      return out;
    },
    handPalms(): pc.Vec3[] {
      const out: pc.Vec3[] = [];
      if (!xr?.active) return out;
      for (const src of wands.keys()) {
        if (!src.hand?.tracking) continue;
        const m = src.hand.getJointById('middle-finger-metacarpal'); if (m) out.push(m.getPosition().clone());
      }
      return out;
    },
    setAimTarget(p) { aimTarget = p ? p.clone() : null; },
    end() { return primary ? ends.get(primary) ?? null : null; },
    setStyle(next) {
      if (next === style) return;
      style = next;
      mat.emissive = next === 'programme' ? PROGRAMME_HAND : opts.wandColor; mat.update();
      for (const t of tips.values()) t.state = '';   // re-colour on the next frame
    },
    wrist(): { at: pc.Vec3; palm: pc.Vec3 | null } | null {
      if (!xr?.active) return null;
      for (const src of wands.keys()) {
        if (src.handedness !== pc.XRHAND_LEFT) continue;
        if (src.hand) {
          const w = src.hand.tracking ? src.hand.getJointById('wrist') : null;
          if (!w) return null;
          // S271 — the palm's normal, from the wrist and the index and little-finger roots: for a LEFT hand,
          //   (index − wrist) × (little − wrist) points out of the back of the hand, so the palm faces the other way
          const a = src.hand.getJointById('index-finger-metacarpal'), b = src.hand.getJointById('pinky-finger-metacarpal');
          const palm = a && b ? new pc.Vec3().cross(a.getPosition().clone().sub(w.getPosition()), b.getPosition().clone().sub(w.getPosition())).normalize().mulScalar(-1) : null;
          return { at: w.getPosition().clone(), palm };
        }
        const g = src.getPosition?.(); return g ? { at: g.clone(), palm: null } : null;
      }
      return null;
    },
    /** S290 — the strongest thumbstick deflection this frame (x: right +, y: down +), zero with no controller */
    stick(): { x: number; y: number } { return { x: stickLast.x, y: stickLast.y }; },
    ray(): Ray | null {
      if (!xr?.active || !primary) return null;
      return rayOf(primary);
    },
    tick(): void {
      stickLast.x = stickNow.x; stickLast.y = stickNow.y; stickNow.x = 0; stickNow.y = 0;
      const active = !!xr?.active;
      for (const [src, e] of wands) {
        const r = active ? rayOf(src) : null;
        const dot = dots.get(src)!; dot.enabled = false;
        if (!active && hands.has(src)) hands.get(src)!.entity.enabled = false;
        if (!r || (src.hand && !src.hand.tracking)) {
          ends.delete(src);
          e.enabled = false; if (hands.has(src)) hands.get(src)!.entity.enabled = false;
          const t = tips.get(src); if (t) t.entity.enabled = false;
          opts.onTouch?.(src, null);
          release(src); endDrag(src); const state = gestures.get(src); if (state) { if (state.drag) { state.drag = false; opts.onDragEnd?.(src); } state.pinch = false; state.near = false; }
          continue;
        }
        e.enabled = true;
        const surface = landing(r);
        if (surface) { dot.enabled = true; dot.setPosition(surface.point); primary = src; }
        // S345 / T29 — the ray of the hand that points ends on the room thing the aim names, when it is nearer than any
        //   surface (a held device's buttons sit in front of the monitor)
        const target = src === primary ? onTarget(r) : null;
        const hit = target && (!surface || target.distance < surface.distance - 0.01) ? target : surface;
        const flashing = performance.now() < (flashUntil.get(src) ?? 0);
        dot.setLocalScale(flashing ? DOT_FLASH : DOT, flashing ? DOT_FLASH : DOT, flashing ? DOT_FLASH : DOT);
        // ⚑ S270f (the report's 3.8: "a white ray line is drawn across the view… distracting") — the full ray only
        //   when it lands on something pressable; otherwise a short stub that says where the hand points
        const length = hit ? hit.distance : src.hand ? STUB_HAND : STUB_PAD;
        {
          const d = r.p1.clone().sub(r.p0).normalize();
          ends.set(src, hit ? { point: hit.point.clone(), normal: hit.normal ? hit.normal.clone() : null, landed: true }
            : { point: r.p0.clone().add(d.mulScalar(length)), normal: null, landed: false });
        }

        const state = gestures.get(src)!;
        const now = performance.now();
        if (src.hand) {

          const thumb = src.hand.getJointById('thumb-tip'), index = src.hand.getJointById('index-finger-tip');
          const contact = opts.onTouch?.(src, !opts.menuOpen() && index && src.hand.tracking ? index.getPosition() : null) ?? null;
          if (contact && !state.held) { state.pinch = false; state.aim = null; }
          if (thumb && index && src.hand.tracking) {
            const separation = thumb.getPosition().distance(index.getPosition());
            // ⚑ S268 (his: "the pinch to press is not always working") — the press goes where the hand was AIMING when
            //   the pinch closed: closing and opening the fingers swings the hand's ray, and the release-time ray missed
            if (!contact && !state.pinch && separation < 0.022) {
              state.pinch = true; state.since = now; primary = src; state.aim = { p0: r.p0.clone(), p1: r.p1.clone() };
              state.drag = opts.onDragStart?.(src, r) ?? false;   // ⚑ S383: a pinch that closes on the scroll thumb takes it
            }
            if (state.pinch && !state.held && !state.drag && now - state.since > 350 && !opts.menuOpen()) state.held = opts.onGrab?.(src, r) ?? false;
            if (state.pinch && separation > 0.032) { if (state.drag) { state.drag = false; opts.onDragEnd?.(src); } else if (state.held) release(src); else choose(state.aim ?? r, src); state.pinch = false; state.aim = null; }
            // Poke is a short fingertip segment along the pointing direction. Latch until withdrawn.
            const tip = index.getPosition();
            const direction = r.p1.clone().sub(r.p0).normalize();
            const poke = { p0: tip.clone().sub(direction.clone().mulScalar(0.018)), p1: tip.clone().add(direction.mulScalar(0.025)) };
            const near = contact === true || (contact === null && !!landing(poke)) || !!opts.canPoke?.(poke);
            if (!contact && near && !state.near && !state.pinch && !state.held) { primary = src; choose(poke, src); }
            state.near = near;
            const t = tips.get(src);
            if (t) {
              const kind = performance.now() < (flashUntil.get(src) ?? 0) ? 'press' : near || state.pinch ? 'touch' : 'rest';
              const key = style + kind;
              t.entity.enabled = true; t.entity.setPosition(tip);
              if (key !== t.state) {
                t.state = key; const k = TIP[kind];
                t.mat.emissive = style === 'programme' && kind !== 'press' ? PROGRAMME_HAND : k.color; t.mat.update(); t.entity.setLocalScale(k.size, k.size, k.size);
              }
            }
          }
        }
        if (state.held) opts.onHold?.(src, r);
        if (state.drag || dragging.has(src)) opts.onDragMove?.(src, r);   // S383: the scroll thumb follows the ray
        const buttons = src.gamepad?.buttons ?? [];
        buttons.forEach((b, i) => { if (b.pressed && !state.buttons[i] && i >= 4) opts.onKey?.(i === 4 ? 'a' : 'b'); state.buttons[i] = b.pressed; });
        const axes = src.gamepad?.axes ?? [];
        // S290 — the strongest thumbstick this frame, (the dollhouse's turntable used it until S346)
        const sx = axes[2] ?? 0, sy = axes[3] ?? 0;
        if (Math.hypot(sx, sy) > Math.hypot(stickNow.x, stickNow.y)) { stickNow.x = sx; stickNow.y = sy; }
        const keys = ['left', 'right', 'up', 'down'] as const;
        if (opts.onStick && axes.length >= 4) opts.onStick(axes[2] ?? 0, axes[3] ?? 0);
        const directions = [(axes[2] ?? 0) < -0.6, (axes[2] ?? 0) > 0.6, (axes[3] ?? 0) < -0.6, (axes[3] ?? 0) > 0.6];
        directions.forEach((pressed, i) => { if (pressed && !state.buttons[8 + i]) opts.onKey?.(keys[i]); state.buttons[8 + i] = pressed; });
        drawSource(src, r, length, hit, flashing);
      }
    },
    destroy(): void {
      if (xr) {
        xr.input.off('add', onAdd);
        xr.input.off('remove', onRemove);
        xr.input.off('selectstart', onSelectStart);
        xr.input.off('select', onSelect);
        xr.input.off('selectend', onSelectEnd);
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
