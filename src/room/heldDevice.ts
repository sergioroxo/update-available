import { dressDeviceHardware } from './deviceHardware';
/**
 * ⚑ S189 — A HELD DEVICE: a room object you can pick up and play (Phase 4). Generalised from S188's Game
 * Boy (his: "so it can press it, it comes closer to you to let you play") so that the three games share
 * one grammar: 1997's handheld (FIT IN), 2003's phone (CLEAR, which replaced REACH in S222), 2026's console (MATCH MADE SIMPLE, which replaced TIDY in S227).
 *
 * - The prop is spawnModel's wrapper; the mesh sits inside `model-<key>-tilt`. The SCREEN is a plane
 *   parented to a node of the mesh (chosen by the material it sits on, or the mesh root) and placed in that
 *   node's own frame — so it is measured from the mesh, and travels with the object.
 * - A press on the resting object lifts it to ~37 cm in front of the eye, face on, top up (the pose fixed
 *   at the press, the phone's grammar, S149). Held, a press lands on its BUTTONS (points in the mesh's
 *   frame), or on its GLASS (a ray-plane test → screen pixels → the game's `tap`), or elsewhere on the body,
 *   which sets it down.
 * - What it shows follows the story (`available`): before, an idle screen; after, the game. A run that ends
 *   files one line in its own era (ledger.games) — never FloppySheep, which is not one of these.
 * - Every prop it moves is never-batched (the caller hands `ids` to the batcher).
 */
import * as pc from 'playcanvas';
import { makeScreenTexture } from '../engine/screenTexture';
import type { RoomHandles } from './era1room';
import type { Painter } from './calendarArt';
import type { DeviceGame, GameKey } from '../games/types';

export type Era = 'e1' | 'e2' | 'e3' | 'e4';
type V3 = [number, number, number];

export interface DeviceSpec {
  propId: string;
  modelKey: string;
  era: Era;
  /** the node the screen (and buttons) are measured in: a material's node, or the mesh root */
  screenOn?: { material: string };
  screen: { pos: V3; euler: V3; scale: V3; w: number; h: number; flipU?: boolean; flipV?: boolean };
  /** extra hardware on the face, in the same node's frame (the Game Boy's buttons) */
  dress?: (face: pc.Entity, box: (name: string, pos: V3, size: V3, hex: string) => void) => void;
  buttons?: Array<{ key: GameKey; at: V3; r: number }>;
  /** FIT IN: direct hand touches on the glass provide left/right and upper-third A. */
  handGlassKeys?: boolean;
  /** is the game there yet, in the story's order */
  available: (has: (id: string) => boolean, fileSize: number) => boolean;
  /** the screen before it is */
  idle: (g: Painter, w: number, h: number, clock: number) => void;
  game: () => DeviceGame;
  /** the ledger line's id */
  gameId: string;
  /** in a headset: how far in front of the eyes it is held (metres) */
  holdDist?: number;
  /** ⚑ S270h / VR-02 — a clamshell: in a headset it rests SHUT and opens in the hand. `node` is the half that
   *  swings, `pivot` the hinge in that node's parent space, `closed` the shut angle about the hinge's X (degrees) */
  fold?: { node: string; pivot: V3; closed: number };
  /**
   * ⚑ S222 / W1-B8, W1-K4 — on a FLAT screen the device is placed by the view, not by a distance: the glass
   * takes `fill` of the frame's height (and never more than 90% of its width), so a game pixel is at least about
   * 1.5 screen pixels on a laptop and on a phone. `raise` lifts the glass above the middle by that share of the
   * frame, so a handheld's buttons under it stay in view; `maxW` caps the glass's share of the frame's width (a
   * console wider than its glass keeps its buttons on a portrait phone).
   */
  view?: { fill: number; raise?: number; maxW?: number };
}

export interface HeldDevice {
  readonly spec: DeviceSpec;
  readonly held: boolean;
  take(cam: pc.Entity): void;
  /** ⚑ S345 / T28 — the grip closes on it: from the bed it comes to the hand; already in hand it keeps where it sits
   *  relative to the hand, so it can be pulled anywhere. `eye` turns the glass to the eyes (never to the controller). */
  grab(hand: pc.Entity, eye?: pc.Vec3): void;
  follow(hand: pc.Entity, eye?: pc.Vec3): void;
  /** the grip lets go: in a headset it stays where it was put (still in hand, still playable); on a flat screen it goes back */
  release(): void;
  /** ⚑ S345 / T29 — the world point the last `aim` was about (a button, the glass, the case), for the pointer's mark */
  readonly aimedAt: pc.Vec3 | null;
  tick(dt: number, era: string, has: (id: string) => boolean, fileSize: number): string | null;
  /** can this ray press it, and what would it be called ('body': in a headset, on the case but on no control — a press
   *  there does nothing, the safe margin round it) */
  aim(ray: { p0: pc.Vec3; p1: pc.Vec3 }): 'pick' | 'drop' | 'screen' | 'body' | GameKey | null;
  press(ray: { p0: pc.Vec3; p1: pc.Vec3 }, cam: pc.Entity): boolean;
  /** S306: direct XR index-tip contact; source identity latches until withdrawn. Null clears tracking. */
  touch(source: object, tip: pc.Vec3 | null): boolean;
  /** ⚑ S219 / W1-B7 — a keyboard key, while it is in hand: true when the game took it (so the camera does not) */
  key(k: GameKey): boolean;
}

const LIFT_SECONDS = 0.45;
/**
 * ⚑ S345 / T28 (his 8 Nov headset: "very hard to point … a very small range of interaction … if I move a little bit too
 * much to the side, then it just disappears, the Game Boy … we need a safer boundary around it, so people, if they
 * touches a little bit to the side, it doesn't run away … some sort of grabbing hand that I can just grab around and pull
 * it to where I want to"). Measured in the emulated headset (out/xrjob4/probe-t28.mjs): a ray 25 mm off A, on the case
 * under the buttons, or 4 cm off its edge was a press on the CASE — and a press on the case put the device back on the bed,
 * 2 m behind him: it vanished. The grip's let-go did the same. In a headset now:
 * - a button catches the ray within XR_BUTTON of it (the nearest wins; the d-pad's arms are 10 mm from its centre);
 * - the case and a margin of XR_SAFE round the glass is the safe boundary: a press there does nothing;
 * - only a press clearly away from the device (beyond XR_SAFE) puts it down;
 * - the grip pulls it where the hand goes, and letting go leaves it there, still in hand.
 */
const XR_BUTTON = 0.022, XR_TOUCH = 0.024, XR_SAFE = 0.2;
/** distance from a point to the forward segment of a ray */
function rayDist(p0: pc.Vec3, p1: pc.Vec3, q: pc.Vec3): number {
  const d = new pc.Vec3().sub2(p1, p0);
  const len2 = d.lengthSq();
  const t = Math.max(0, Math.min(1, new pc.Vec3().sub2(q, p0).dot(d) / len2));
  return new pc.Vec3().add2(p0, d.mulScalar(t)).distance(q);
}

export function buildHeldDevice(room: RoomHandles, spec: DeviceSpec): HeldDevice | null {
  const handle = room.props.get(spec.propId);
  if (!handle) return null;
  const wrap = handle.entity;
  // ⚑ S282 (headset B, 1 Nov: "the phone is too close to my face"; the game "should be bigger"; "too close to my eyes")
  //   — in a headset a held device comes no nearer than XR_HOLD (an easy focus for a seated reader) and grows to make up
  //   for it, and a little more: the glass ends up larger in the view and further from the eye. Restored on release.
  const baseScale = wrap.getLocalScale().clone();
  const XR_HOLD = 0.42;
  const bigInHand = (on: boolean): void => {
    const k = on && app?.xr?.active ? Math.max(1.3, (XR_HOLD / (spec.holdDist ?? 0.37)) * 0.8) : 1;
    wrap.setLocalScale(baseScale.x * k, baseScale.y * k, baseScale.z * k);
  };
  const meshRoot = (wrap.findByName(`model-${spec.modelKey}-tilt`) as pc.Entity | null)?.children[0] as pc.Entity | undefined
    ?? (wrap.children[0] as pc.Entity | undefined);
  if (!meshRoot) return null;
  let node: pc.Entity = meshRoot;
  if (spec.screenOn) {
    meshRoot.forEach((n) => {
      const e = n as pc.Entity;
      if (e.render?.meshInstances?.some((mi) => mi.material?.name === spec.screenOn!.material)) node = e;
    });
  }

  if (spec.dress) dressDeviceHardware(node, box => spec.dress!(node, box));

  // the screen
  const { w, h } = spec.screen;
  const app = pc.Application.getApplication();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  let tex: pc.Texture | null = null;
  const plane = new pc.Entity(`${spec.propId}-screen`);
  if (app && ctx) {
    tex = makeScreenTexture(app, canvas, 'screen');
    const sm = new pc.StandardMaterial();
    sm.diffuse.set(0, 0, 0); sm.emissiveMap = tex; sm.emissive.set(1, 1, 1); sm.update();
    plane.addComponent('render', { type: 'plane' });
    if (plane.render) { plane.render.material = sm; plane.render.batchGroupId = -1; }
    const s = spec.screen;
    plane.setLocalEulerAngles(s.euler[0], s.euler[1], s.euler[2]);
    plane.setLocalPosition(s.pos[0], s.pos[1], s.pos[2]);
    plane.setLocalScale(s.scale[0], s.scale[1], s.scale[2]);
    node.addChild(plane);
  }
  const painter = ctx as unknown as Painter;

  const touching = new Set<object>();
  let game: DeviceGame | null = null;
  let drawn = '';
  let clock = 0;

  // the lift
  let rest: { pos: pc.Vec3; rot: pc.Quat } | null = null;
  const from = { pos: new pc.Vec3(), rot: new pc.Quat() };
  const to = { pos: new pc.Vec3(), rot: new pc.Quat() };
  let t = 1, holding = false;
  /**
   * ⚑ S222 / W1-B8 + W1-K4 (his: "the handheld is too small; hold it closer to the eye"; "we need to be sure they
   * can play well on the screen, closer to the screen"). Measured on a 1280 × 720 window, the fixed distances
   * showed FIT IN's 144-pixel glass at ~121 screen pixels (0.84 a game pixel: the 5×7 letters lost rows to the
   * nearest filter) and CLEAR's 320 at ~352. On a flat screen the distance is now solved from the camera's
   * field of view and the glass's real size; in a headset it stays `holdDist` (an arm's distance is a body fact
   * there, and the headset's own resolution already gives these glasses enough pixels).
   */
  const viewDist = (cam: pc.Entity): { d: number; raise: number } => {
    const dHead = spec.holdDist ?? 0.37;
    const c = cam.camera;
    if (app?.xr?.active) return { d: Math.max(XR_HOLD, dHead), raise: -0.03 };   // S282: an easy focus, the old small drop
    if (!spec.view || !c) return { d: dHead, raise: -0.03 };   // the old small drop below the eye line
    const sc = plane.getWorldTransform().getScale();
    const gw = Math.abs(sc.x), gh = Math.abs(sc.z);               // the glass's world size (the plane's local X and Z)
    const tanV = Math.tan((c.fov * Math.PI) / 360);
    const gd = app?.graphicsDevice;
    const aspect = gd && gd.height > 0 ? gd.width / gd.height : 16 / 9;
    const tanH = tanV * aspect;
    const d = Math.max(gh / (2 * tanV * spec.view.fill), gw / (2 * tanH * (spec.view.maxW ?? 0.9)));
    // never lift the glass's top out of the frame: on a tall phone the width decides the size, not `fill`
    const gf = gh / (2 * d * tanV);
    const raise = Math.max(0, Math.min(spec.view.raise ?? 0, 0.44 - gf / 2));
    return { d, raise: raise * 2 * d * tanV };
  };
  let startOnReady = false;
  const heldPose = (cam: pc.Entity): void => {
    let fwd = cam.forward.clone(), up = cam.up.clone();
    if (app?.xr?.active) {
      // ⚑ S345 / T28 — in FRONT of him: the head's heading, its pitch held between 30° down and level (a look down at
      //   the bed or up at the shelf must not put the game in his lap or over his head), the top of the device up
      const h = new pc.Vec3(fwd.x, 0, fwd.z);
      if (h.lengthSq() < 1e-6) h.set(-up.x, 0, -up.z);
      h.normalize();
      const pitch = Math.max(-30, Math.min(0, Math.asin(Math.max(-1, Math.min(1, fwd.y))) * 180 / Math.PI)) * Math.PI / 180;
      fwd = new pc.Vec3(h.x * Math.cos(pitch), Math.sin(pitch), h.z * Math.cos(pitch));
      up = new pc.Vec3(0, 1, 0).sub(fwd.clone().mulScalar(fwd.y)).normalize();
    }
    const v = viewDist(cam);
    to.pos.copy(cam.getPosition()).add(fwd.clone().mulScalar(v.d)).add(up.clone().mulScalar(v.raise));
    // the prop's frame: its face is local +Y (every device here lies tilted −90° about X), its top local −Z
    const y = fwd.clone().mulScalar(-1), z = up.clone().mulScalar(-1), x = new pc.Vec3().cross(y, z);
    const m = new pc.Mat4();
    m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
    to.rot.setFromMat4(m);
    // ⚑ the SCREEN comes to the eye, not the body: the phone's glass is at one end of it, and centring the
    //   body put the glass above the frame. The screen's offset in the prop's own frame, carried by the pose.
    to.pos.sub(screenOffset());
  };
  /** the glass's offset from the prop's origin in world metres, in the `to` pose — at the prop's CURRENT scale (S345: the
   *  in-hand enlargement was left out, so the glass sat 30% of its offset away from where it was meant to be) */
  const screenOffset = (): pc.Vec3 => {
    const off = wrap.getWorldTransform().clone().invert().transformPoint(plane.getPosition());
    const sc = wrap.getLocalScale();
    return to.rot.transformVector(new pc.Vec3(off.x * sc.x, off.y * sc.y, off.z * sc.z));
  };
  /** S345 / T28 — the device faced to an eye from `at` (its glass's centre), top up */
  const faceTo = (at: pc.Vec3, eye: pc.Vec3): void => {
    const y = eye.clone().sub(at);
    if (y.lengthSq() < 1e-8) y.set(0, 0, 1);
    y.normalize();
    const upP = new pc.Vec3(0, 1, 0).sub(y.clone().mulScalar(y.y));
    if (upP.lengthSq() < 1e-6) upP.set(0, 0, -1);
    const z = upP.normalize().mulScalar(-1), x = new pc.Vec3().cross(y, z);
    const m = new pc.Mat4();
    m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
    to.rot.setFromMat4(m);
    to.pos.copy(at).sub(screenOffset());
  };
  let grip: pc.Vec3 | null = null;   // S345: the glass's offset from the hand while the grip pulls it
  let aimedAt: pc.Vec3 | null = null;
  const worldOf = (p: V3): pc.Vec3 => node.getWorldTransform().transformPoint(new pc.Vec3(p[0], p[1], p[2]));
  /** the glass under a ray, in screen pixels, or null */
  const glassAt = (ray: { p0: pc.Vec3; p1: pc.Vec3 }): [number, number] | null => {
    const inv = plane.getWorldTransform().clone().invert();
    const a = inv.transformPoint(ray.p0), b = inv.transformPoint(ray.p1);
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-9) return null;
    const k = -a.y / dy;
    if (k < 0 || k > 1) return null;
    const x = a.x + (b.x - a.x) * k, z = a.z + (b.z - a.z) * k;
    if (Math.abs(x) > 0.5 || Math.abs(z) > 0.5) return null;
    let u = x + 0.5, v = z + 0.5;
    if (spec.screen.flipU) u = 1 - u;
    if (spec.screen.flipV) v = 1 - v;
    return [u * w, v * h];
  };
  const bodyHit = (ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean =>
    wrap.enabled && rayDist(ray.p0, ray.p1, plane.getPosition()) < (holding ? (app?.xr?.active ? XR_SAFE : 0.13) : 0.12);

  // ⚑ S270h / VR-02 — the hinge: kept at its authored (open) pose and swung about the hinge from there
  const hinge = spec.fold ? wrap.findByName(spec.fold.node) as pc.Entity | null : null;
  const hingeP = hinge?.getLocalPosition().clone(), hingeQ = hinge?.getLocalRotation().clone();
  let foldK = 1;
  const fold = (dt: number): void => {
    if (!hinge || !spec.fold || !hingeP || !hingeQ) return;
    const open = !app?.xr?.active || holding ? 1 : 0;
    if (foldK === open) return;
    foldK = open > foldK ? Math.min(1, foldK + dt / 0.35) : Math.max(0, foldK - dt / 0.35);
    const k = foldK * foldK * (3 - 2 * foldK);
    const r = new pc.Quat().setFromEulerAngles((1 - k) * spec.fold.closed, 0, 0);
    const pv = new pc.Vec3(...spec.fold.pivot);
    hinge.setLocalRotation(new pc.Quat().mul2(r, hingeQ));
    hinge.setLocalPosition(r.transformVector(hingeP.clone().sub(pv)).add(pv));
    plane.enabled = foldK > 0.5;   // the glass is inside a shut phone
  };
  return {
    spec,
    get held() { return holding; },
    get aimedAt() { return aimedAt; },
    touch(source, tip) {
      if (!tip || !app?.xr?.active || !holding || !wrap.enabled || !game) {
        touching.delete(source); return false;
      }
      // World metres, independent of the enlarged prop's native model units. Overlaps choose the nearest.
      const button = (spec.buttons ?? []).map(b => ({ b, d: tip.distance(worldOf(b.at)) }))
        .filter(({ d }) => d <= XR_TOUCH).sort((a, b) => a.d - b.d)[0];
      const inv = plane.getWorldTransform().clone().invert();
      const local = inv.transformPoint(tip);
      const surface = plane.getWorldTransform().transformPoint(new pc.Vec3(local.x, 0, local.z));
      const onGlass = plane.enabled && Math.abs(local.x) <= 0.5 && Math.abs(local.z) <= 0.5
        && tip.distance(surface) <= 0.012 && (!!game.tap || !!spec.handGlassKeys);
      if (!button && !onGlass) { touching.delete(source); return false; }
      if (touching.has(source)) return true;
      touching.add(source);
      if (button) game.key?.(button.b.key);
      else {
        const u = spec.screen.flipU ? 0.5 - local.x : local.x + 0.5;
        const v = spec.screen.flipV ? 0.5 - local.z : local.z + 0.5;
        if (game.tap) game.tap(u * w, v * h);
        else game.key?.(v < 1 / 3 ? 'a' : u < 0.5 ? 'left' : 'right');
      }
      return true;
    },
    key(k) {
      if (!holding || !game) return false;
      game.key?.(k);
      return true;
    },
    aim(ray) {
      aimedAt = null;
      if (!wrap.enabled) return null;
      const xrNow = !!app?.xr?.active;
      if (!holding) { if (!bodyHit(ray)) return null; aimedAt = plane.getPosition().clone(); return 'pick'; }
      const buttons = (spec.buttons ?? []).map(b => ({ b, p: worldOf(b.at) }));
      const button = buttons.filter(({ b, p }) => rayDist(ray.p0, ray.p1, p) < (xrNow ? Math.max(b.r, XR_BUTTON) : b.r))
        .sort((a, b) => rayDist(ray.p0, ray.p1, a.p) - rayDist(ray.p0, ray.p1, b.p))[0];
      if (button) { aimedAt = button.p; return button.b.key; }
      if (game && glassAt(ray)) { aimedAt = null; return 'screen'; }   // the glass is a surface: the pointer lands on it
      if (xrNow) {
        // S345 / T28 — the safe boundary: on the case or near it, a press does nothing; well away, it puts it down
        if (bodyHit(ray)) { aimedAt = plane.getPosition().clone(); return 'body'; }
        return 'drop';
      }
      return bodyHit(ray) ? 'drop' : null;
    },
    grab(hand, eye) {
      const fromRest = !holding;
      if (fromRest) this.take(hand);
      grip = fromRest ? null : plane.getPosition().clone().sub(hand.getPosition());
      this.follow(hand, eye);
    },
    follow(hand, eye) {
      if (!holding) this.take(hand);
      if (eye) {
        // S345 / T28 — the device rides the hand (a hand's breadth ahead of a grip that closed on the bed, or where it
        //   was when the grip closed on it in the air), its glass turned to the eyes
        const at = grip ? hand.getPosition().clone().add(grip) : hand.getPosition().clone().add(hand.forward.clone().mulScalar(0.12));
        faceTo(at, eye);
      } else {
        heldPose(hand);
        to.pos.sub(hand.forward.clone().mulScalar(viewDist(hand).d - 0.08));
      }
      wrap.setPosition(to.pos); wrap.setRotation(to.rot); t = 1;
    },
    release() {
      touching.clear();
      grip = null;
      // S345 / T28 — in a headset, letting go of the grip leaves it where it was put: still in hand, still playable.
      //   Only a press away from it puts it down (and the end of the era, as before).
      if (app?.xr?.active && holding) { t = 1; return; }
      bigInHand(false);
      if (rest) { wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
      holding = false; t = 1;
    },
    take(cam) {
      if (holding) return;
      from.pos.copy(wrap.getPosition()); from.rot.copy(wrap.getRotation());
      holding = true; bigInHand(true); heldPose(cam); t = 0; startOnReady = true;
    },
    press(ray, cam) {
      const what = this.aim(ray);
      if (!what) return false;
      if (holding && what !== 'drop') {
        if (!game || what === 'body') return true;   // S345 / T28: the safe boundary — consumed, nothing moves
        if (what === 'screen') { const at = glassAt(ray); if (at) game.tap ? game.tap(at[0], at[1]) : game.key?.('start'); }
        else game.key?.(what as GameKey);
        return true;
      }
      from.pos.copy(wrap.getPosition()); from.rot.copy(wrap.getRotation());
      holding = !holding;
      bigInHand(holding);
      if (holding) heldPose(cam);
      else if (rest) {
        const parent = wrap.parent as pc.Entity | null;
        (parent ? parent.getWorldTransform() : new pc.Mat4()).transformPoint(rest.pos, to.pos);
        to.rot.mul2(parent ? parent.getRotation() : new pc.Quat(), rest.rot);
      }
      t = 0;
      return true;
    },
    tick(dt, era, has, fileSize) {
      if (!app?.xr?.active || era !== spec.era) touching.clear();
      clock += dt;
      fold(dt);
      if (era !== spec.era) {                            // another era is the fold's
        if ((holding || t < 1) && rest) { bigInHand(false); wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
        holding = false; t = 1;
        return null;
      }
      if (!rest && !holding && t >= 1) rest = { pos: wrap.getLocalPosition().clone(), rot: wrap.getLocalRotation().clone() };
      if (t < 1) {
        t = Math.min(1, t + dt / LIFT_SECONDS);
        const k = t * t * (3 - 2 * t);
        wrap.setPosition(new pc.Vec3().lerp(from.pos, to.pos, k));
        wrap.setRotation(new pc.Quat().slerp(from.rot, to.rot, k));
        if (t >= 1 && !holding && rest) { wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
      }
      if (!game && spec.available(has, fileSize)) game = spec.game();
      if (holding && game && startOnReady) { game.key?.('start'); startOnReady = false; }
      let filing: string | null = null;
      if (game) { if (holding) game.tick(dt); filing = game.takeFiling(); }
      if (!ctx || !tex) return filing;
      const key = game ? `g|${game.frameKey()}` : `i|${Math.floor(clock * 2)}`;
      if (key !== drawn) {
        drawn = key;
        if (game) game.draw(painter); else spec.idle(painter, w, h, clock);
        tex.upload();
      }
      return filing;
    }
  };
}
