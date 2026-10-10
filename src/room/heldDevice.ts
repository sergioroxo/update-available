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
  /** is the game there yet, in the story's order */
  available: (has: (id: string) => boolean, fileSize: number) => boolean;
  /** the screen before it is */
  idle: (g: Painter, w: number, h: number, clock: number) => void;
  game: () => DeviceGame;
  /** the ledger line's id */
  gameId: string;
  /** in a headset: how far in front of the eyes it is held (metres) */
  holdDist?: number;
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
  tick(dt: number, era: string, has: (id: string) => boolean, fileSize: number): string | null;
  /** can this ray press it, and what would it be called */
  aim(ray: { p0: pc.Vec3; p1: pc.Vec3 }): 'pick' | 'drop' | 'screen' | GameKey | null;
  press(ray: { p0: pc.Vec3; p1: pc.Vec3 }, cam: pc.Entity): boolean;
  /** ⚑ S219 / W1-B7 — a keyboard key, while it is in hand: true when the game took it (so the camera does not) */
  key(k: GameKey): boolean;
}

const LIFT_SECONDS = 0.45;

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

  const box = (name: string, pos: V3, size: V3, hex: string): void => {
    const m = new pc.StandardMaterial();
    m.diffuse.fromString(hex); m.update();
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    if (e.render) { e.render.material = m; e.render.batchGroupId = -1; }
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(size[0], size[1], size[2]);
    node.addChild(e);
  };
  spec.dress?.(node, box);

  // the screen
  const { w, h } = spec.screen;
  const app = pc.Application.getApplication();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  let tex: pc.Texture | null = null;
  const plane = new pc.Entity(`${spec.propId}-screen`);
  if (app && ctx) {
    tex = new pc.Texture(app.graphicsDevice, {
      width: w, height: h, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
      minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(canvas);
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
    if (!spec.view || !c || app?.xr?.active) return { d: dHead, raise: -0.03 };   // the old small drop below the eye line
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
  const heldPose = (cam: pc.Entity): void => {
    const fwd = cam.forward.clone(), up = cam.up.clone();
    const v = viewDist(cam);
    to.pos.copy(cam.getPosition()).add(fwd.clone().mulScalar(v.d)).add(up.clone().mulScalar(v.raise));
    // the prop's frame: its face is local +Y (every device here lies tilted −90° about X), its top local −Z
    const y = fwd.clone().mulScalar(-1), z = up.clone().mulScalar(-1), x = new pc.Vec3().cross(y, z);
    const m = new pc.Mat4();
    m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
    to.rot.setFromMat4(m);
    // ⚑ the SCREEN comes to the eye, not the body: the phone's glass is at one end of it, and centring the
    //   body put the glass above the frame. The screen's offset in the prop's own frame, carried by the pose.
    const off = wrap.getWorldTransform().clone().invert().transformPoint(plane.getPosition());
    to.pos.sub(to.rot.transformVector(off));
  };
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
    wrap.enabled && rayDist(ray.p0, ray.p1, plane.getPosition()) < (holding ? 0.13 : 0.12);

  return {
    spec,
    get held() { return holding; },
    key(k) {
      if (!holding || !game) return false;
      game.key?.(k);
      return true;
    },
    aim(ray) {
      if (!wrap.enabled) return null;
      if (!holding) return bodyHit(ray) ? 'pick' : null;
      for (const b of spec.buttons ?? []) if (rayDist(ray.p0, ray.p1, worldOf(b.at)) < b.r) return b.key;
      if (game && glassAt(ray)) return 'screen';
      return bodyHit(ray) ? 'drop' : null;
    },
    press(ray, cam) {
      const what = this.aim(ray);
      if (!what) return false;
      if (holding && what !== 'drop') {
        if (!game) return true;
        if (what === 'screen') { const at = glassAt(ray); if (at) game.tap ? game.tap(at[0], at[1]) : game.key?.('start'); }
        else game.key?.(what as GameKey);
        return true;
      }
      from.pos.copy(wrap.getPosition()); from.rot.copy(wrap.getRotation());
      holding = !holding;
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
      clock += dt;
      if (era !== spec.era) {                            // another era is the fold's
        if ((holding || t < 1) && rest) { wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
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
