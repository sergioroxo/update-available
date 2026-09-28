/**
 * ⚑ S188 — DANIEL'S HANDHELD (1997). Sérgio, 2026-09-28, on the first still of it on the bed: "The game boy
 * needs to be colored, so it can press it, it comes closer to you to let you play."
 *
 * The model ('Videogame', Poly by Google, CC-BY 3.0 — data/room/models.json `handheld1997`) has ONE
 * material, so it tints one flat colour; the handheld's face is built here as overlays in the model's own
 * native frame (children of the scaled model entity, so they sit exactly on its face and travel with it):
 * the dark bezel, a lit screen, the magenta A and B, the d-pad, start and select. The screen is a small
 * canvas (80 × 72, a Game Boy's half resolution), nearest-filtered and uploaded only when it changes.
 *
 * In 2003 it is on his bookcase, kept, not played (his: "remove the DS in 2003 … maybe the game boy just
 * moves to another place") — a separate prop in the fold (`danielHandheld2003`), never lifted.
 *
 * A PRESS lifts it to you: the whole prop tweens from the bed to ~30 cm in front of the eye, face to you,
 * top up; a second press sets it back down. The held pose is computed once, at the press (the phone's
 * grammar, S149), so it stays where it was raised while you look around it.
 *
 * WHAT IT SHOWS (the story's order): no cartridge until the starter kit has come (`kit-inserted`) — a
 * Game Boy switched on with nothing in it shows a dark bar and nothing else; after the kit, the cartridge
 * that came with it: FIT IN's title (the game itself is the next session — PLAN_PHASE4_GAMES).
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';
import { px, text, textW, type Painter } from './calendarArt';
import { HANDHELD as H } from '../desktop/theme/calendar';

export const HANDHELD_ID = 'danielHandheld';
const SCR_W = 80, SCR_H = 72;
/** the model's native frame (glb_import bounds): 6.598 wide, 11.170 tall, face at z = 0.40 + 0.731 */
const FACE_Z = 1.14;
const LIFT_SECONDS = 0.45;
const HOLD_DIST = 0.37, HOLD_DROP = 0.03;

export interface Handheld {
  /** once a frame (e1 only; any other era puts it back and rests) */
  tick(dt: number, era: string, cam: pc.Entity, hasKit: boolean): void;
  /** the world point a press aims at, or null when absent */
  target(): { at: pc.Vec3; r: number } | null;
  press(cam: pc.Entity): void;
  readonly held: boolean;
}

export function buildHandheld(room: RoomHandles): Handheld | null {
  const h = room.props.get(HANDHELD_ID);
  if (!h) return null;
  const wrap = h.entity;
  // the prop IS spawnModel's wrapper (metres, unscaled); the mesh is the scaled child inside its tilt
  //   wrapper — native units, which is the frame the face below is measured in
  const face = (wrap.findByName('model-handheld1997-tilt') as pc.Entity | null)?.children[0] as pc.Entity | undefined;
  if (!face) return null;

  const mat = (hex: string, lit = false): pc.StandardMaterial => {
    const m = new pc.StandardMaterial();
    const c = new pc.Color().fromString(hex);
    m.diffuse.copy(c);
    if (lit) m.emissive.copy(c);
    m.update();
    return m;
  };
  const faceOf = (prop: pc.Entity): pc.Entity | undefined =>
    (prop.findByName('model-handheld1997-tilt') as pc.Entity | null)?.children[0] as pc.Entity | undefined;
  const boxOn = (parent: pc.Entity, name: string, x: number, y: number, w: number, hgt: number, d: number, m: pc.StandardMaterial): void => {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    if (e.render) { e.render.material = m; e.render.batchGroupId = -1; }
    e.setLocalPosition(x, y, FACE_Z + d / 2);
    e.setLocalScale(w, hgt, d);
    parent.addChild(e);
  };
  /** the face's hardware — bezel, d-pad, A/B, start/select — on any copy of the model */
  const hardware = (parent: pc.Entity): void => {
    boxOn(parent, 'hh-bezel', 0, 8.15, 5.6, 4.3, 0.06, mat(H.bezel));
    boxOn(parent, 'hh-dpadH', -2.0, 3.65, 1.5, 0.5, 0.18, mat(H.dpad));
    boxOn(parent, 'hh-dpadV', -2.0, 3.65, 0.5, 1.5, 0.18, mat(H.dpad));
    boxOn(parent, 'hh-btnA', 2.4, 3.95, 0.8, 0.8, 0.18, mat(H.button));
    boxOn(parent, 'hh-btnB', 1.35, 3.45, 0.8, 0.8, 0.18, mat(H.button));
    boxOn(parent, 'hh-select', -0.75, 1.95, 0.7, 0.22, 0.1, mat(H.dpad));
    boxOn(parent, 'hh-start', 0.15, 1.95, 0.7, 0.22, 0.1, mat(H.dpad));
  };
  // ⚑ S188 — 2003's copy on the bookcase gets the same face, its screen dark: switched off, kept
  //   (the fold adds that prop after start-up, so it is dressed the first frame it exists)
  let shelfDressed = false;
  const dressShelf = (): void => {
    if (shelfDressed) return;
    const shelf = room.props.get('danielHandheld2003');
    const shelfFace = shelf ? faceOf(shelf.entity) : undefined;
    if (!shelfFace) return;
    hardware(shelfFace);
    boxOn(shelfFace, 'hh-screenOff', 0.15, 8.25, 3.9, 3.5, 0.08, mat(H.screenDark));
    shelfDressed = true;
  };
  hardware(face);   // 1997's copy: the same face, and the lit screen below

  // the screen: a canvas on a plane just proud of the bezel, facing +Z (the face)
  const app = pc.Application.getApplication();
  const canvas = document.createElement('canvas');
  canvas.width = SCR_W; canvas.height = SCR_H;
  const ctx = canvas.getContext('2d');
  let tex: pc.Texture | null = null;
  if (app && ctx) {
    tex = new pc.Texture(app.graphicsDevice, {
      width: SCR_W, height: SCR_H, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
      minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(canvas);
    const sm = new pc.StandardMaterial();
    sm.diffuse.set(0, 0, 0);
    sm.emissiveMap = tex;
    sm.emissive.set(1, 1, 1);
    sm.update();
    const plane = new pc.Entity('hh-screen');
    plane.addComponent('render', { type: 'plane' });
    if (plane.render) { plane.render.material = sm; plane.render.batchGroupId = -1; }
    plane.setLocalEulerAngles(90, 0, 0);          // the plane faces +Y; stood up it faces +Z, the face
    plane.setLocalPosition(0.15, 8.25, FACE_Z + 0.07);
    plane.setLocalScale(3.9, 1, 3.5);
    face.addChild(plane);
  }
  let drawn = '';
  function paint(key: string, hasKit: boolean): void {
    if (!ctx || !tex || key === drawn) return;
    drawn = key;
    const c = ctx as unknown as Painter;
    px(c, 0, 0, H.screenLight, SCR_W, SCR_H);
    if (!hasKit) {
      px(c, 16, 32, H.screenDark, 48, 8);          // switched on with nothing in it: the dark bar
    } else {
      const t = 'FIT IN';
      text(c, t, Math.round((SCR_W - textW(t, 2)) / 2), 18, H.screenDark, 2);
      px(c, 14, 34, H.screenMid, SCR_W - 28, 1);
      if (key.endsWith('|on')) {
        const s = 'PRESS START';
        text(c, s, Math.round((SCR_W - textW(s)) / 2), 48, H.screenDark);
      }
    }
    tex.upload();
  }

  // the lift — its rest pose is read the first time it is seen at rest in 1997 (the fold places it)
  let rest: { pos: pc.Vec3; rot: pc.Quat } | null = null;
  const from = { pos: new pc.Vec3(), rot: new pc.Quat() };
  const to = { pos: new pc.Vec3(), rot: new pc.Quat() };
  let t = 1, holding = false, clock = 0;
  const heldPose = (cam: pc.Entity): void => {
    const fwd = cam.forward.clone(), up = cam.up.clone();
    to.pos.copy(cam.getPosition()).add(fwd.clone().mulScalar(HOLD_DIST)).add(up.clone().mulScalar(-HOLD_DROP));
    // the prop's frame: its face is local +Y (the model lies tilted −90° about X), its top is local −Z
    const y = fwd.clone().mulScalar(-1);                  // face toward the eye
    const z = up.clone().mulScalar(-1);                   // top toward the sky
    const x = new pc.Vec3().cross(y, z);
    const m = new pc.Mat4();
    m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
    to.rot.setFromMat4(m);
  };

  return {
    get held() { return holding; },
    target() {
      if (!wrap.enabled) return null;
      const p = wrap.getPosition().clone();
      return { at: p, r: holding ? 0.14 : 0.12 };
    },
    press(cam: pc.Entity) {
      from.pos.copy(wrap.getPosition()); from.rot.copy(wrap.getRotation());
      holding = !holding;
      if (holding) heldPose(cam);
      else {
        if (!rest) return;
        const parent = wrap.parent as pc.Entity | null;
        const wm = parent ? parent.getWorldTransform() : new pc.Mat4();
        wm.transformPoint(rest.pos, to.pos);
        const pr = parent ? parent.getRotation() : new pc.Quat();
        to.rot.mul2(pr, rest.rot);
      }
      t = 0;
    },
    tick(dt: number, era: string, cam: pc.Entity, hasKit: boolean) {
      clock += dt;
      dressShelf();
      if (era !== 'e1') {                                  // 1997 only; another era is the fold's (it leaves in 2003)
        if ((holding || t < 1) && rest) { wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
        holding = false; t = 1;
        return;
      }
      if (!rest && !holding && t >= 1) rest = { pos: wrap.getLocalPosition().clone(), rot: wrap.getLocalRotation().clone() };
      void cam;
      if (t < 1) {
        t = Math.min(1, t + dt / LIFT_SECONDS);
        const k = t * t * (3 - 2 * t);
        wrap.setPosition(new pc.Vec3().lerp(from.pos, to.pos, k));
        wrap.setRotation(new pc.Quat().slerp(from.rot, to.rot, k));
        if (t >= 1 && !holding && rest) { wrap.setLocalPosition(rest.pos); wrap.setLocalRotation(rest.rot); }
      }
      paint(`${hasKit ? 'kit' : 'none'}|${Math.floor(clock * 1.5) % 2 === 0 ? 'on' : 'off'}`, hasKit);
    }
  };
}
