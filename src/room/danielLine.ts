/**
 * ⚑ S401 (UiB job 29 D3) — HIS LINE AT DANIEL'S DESK, THEN THE CLOSE. Sérgio, 16 Nov (B11): "I think it would work
 * beautifully when we arrive at the desk of Daniel at the end, and we see that text and the space transforms to the
 * close".
 *
 * At the end of 2026 the crossing lands at Daniel's seat (app.ts `advanceClose`, the new `line` stage between the travel
 * and the eyes rising). His monitor stands on the desk again where it stood in 1997 — the CRT the Close keeps in its row
 * as his machine (S380, closeCrt.ts: the same boxes, the same glass) — dark. On its glass, plain, the two lines as they
 * were in 2003 (data/dialog/s2_caleb.json `residue`): his, which is Sérgio's ⟨S⟩ wording, verbatim and on one row (the
 * type is sized to fit, never re-wrapped), and Caleb's answer, under the Messenger's own lowercase nicks. No sound, no
 * Lamby, no frame, no window.
 *
 * It is brought before the eye in every look-mode, in heldDevice's grammar (teachingTv.ts `take`): the pose fixed at the
 * moment it begins, face on, top up, along a curve that keeps its distance from the head; in a headset `xrDist` before
 * the eyes, never a conducted turn, never a fade; on a computer or a phone at the distance where the whole case fills
 * `flatFill` of the view's height (never more than `flatMaxW` of its width), so it is whole in the frame. The lines are
 * held for the residue's own time (`arriveSeconds` of dark, his line, Caleb's after `answerAfter`, then `holdSeconds` +
 * `holdExtra`); then it goes back to the desk and the room becomes the Close as it always has. The engine hides it when
 * the lights go (`hide`). Two draw calls (the body, the glass), for these seconds only; the glass is drawn three times.
 * Staging: data/strings/close_line.json.
 */
import * as pc from 'playcanvas';
import { buildCloseCrt, type GlassRect } from './closeCrt';
import { ERA1 } from '../desktop/theme/era1';
import { FACES } from '../desktop/theme/fonts';
import caleb from '../../data/dialog/s2_caleb.json';
import staging from '../../data/strings/close_line.json';

const RESIDUE = caleb.residue as { line: string; answer: string };
const PACE = (caleb.pacing as unknown as { residue: { arriveSeconds: number; holdSeconds: number } }).residue;
const NICK = caleb.window as unknown as { you: string; contact: string };
const S = staging as unknown as { answerAfter: number; holdExtra: number; liftSeconds: number; xrDist: number;
  flatFill: number; flatMaxW: number; clearance: number };

/** the room's glass centre (app.ts SCREEN; the CRT's own origin) and the case (era1.json crtBody, metres) */
const REST = { x: 0, y: 1.08, z: 0 };
const CASE = { w: 0.54, h: 0.44 };
const GW = 800, GH = 600;
const FACE = FACES.e1.family;
const D2R = Math.PI / 180;
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** the glass: the tube's black, its faint glow at the middle, the two lines and their nicks — nothing else */
function drawLineGlass(c: CanvasRenderingContext2D, shown: number): GlassRect {
  c.clearRect(0, 0, GW, GH);
  c.fillStyle = ERA1.black; c.fillRect(0, 0, GW, GH);
  const glow = c.createRadialGradient(GW / 2, GH / 2, 8, GW / 2, GH / 2, Math.max(GW, GH) * 0.62);
  glow.addColorStop(0, 'rgba(40,60,110,0.16)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = glow; c.fillRect(0, 0, GW, GH);
  if (shown <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const pad = 56, room = GW - pad * 2;
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  // his line on ONE row (⟨S⟩: never re-wrapped): the largest type that holds it, 44 px down to 26
  let size = 44;
  for (; size > 26; size -= 1) { c.font = `${size}px ${FACE}`; if (c.measureText(RESIDUE.line).width <= room) break; }
  const nick = Math.round(size * 0.62), lead = Math.round(size * 1.25);
  const block = nick + lead + Math.round(size * 1.6) + nick + lead;
  let y = Math.round((GH - block) / 2) + nick;
  c.font = `${nick}px ${FACE}`; c.fillStyle = ERA1.grey;
  c.fillText(NICK.you, pad, y);
  y += lead;
  c.font = `${size}px ${FACE}`; c.fillStyle = ERA1.white;
  c.fillText(RESIDUE.line, pad, y);
  if (shown >= 2) {
    y += Math.round(size * 1.6) + nick;
    c.font = `${nick}px ${FACE}`; c.fillStyle = ERA1.grey;
    c.fillText(NICK.contact, pad, y);
    y += lead;
    c.font = `${size}px ${FACE}`; c.fillStyle = ERA1.silver;
    c.fillText(RESIDUE.answer, pad, y);
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

/** the eye's frame (teachingTv.ts eyeFrame): in a headset level-ish, pitch held between 0 and −30° */
function eyeFrame(eye: pc.Entity, xr: boolean): { fwd: pc.Vec3; up: pc.Vec3 } {
  let fwd = eye.forward.clone(), up = eye.up.clone();
  if (xr) {
    const h = new pc.Vec3(fwd.x, 0, fwd.z);
    if (h.lengthSq() < 1e-6) h.set(-up.x, 0, -up.z);
    h.normalize();
    const pitch = Math.max(-30, Math.min(0, Math.asin(Math.max(-1, Math.min(1, fwd.y))) / D2R)) * D2R;
    fwd = new pc.Vec3(h.x * Math.cos(pitch), Math.sin(pitch), h.z * Math.cos(pitch));
    up = new pc.Vec3(0, 1, 0).sub(fwd.clone().mulScalar(fwd.y)).normalize();
  }
  return { fwd: fwd.normalize(), up: up.normalize() };
}
/** a rotation whose +Z faces the eye (−fwd) and whose +Y is `up` */
function faceRot(fwd: pc.Vec3, up: pc.Vec3): pc.Quat {
  const z = fwd.clone().mulScalar(-1), x = new pc.Vec3().cross(up, z).normalize();
  const y = new pc.Vec3().cross(z, x).normalize();
  const m = new pc.Mat4();
  m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
  return new pc.Quat().setFromMat4(m);
}

export type LinePhase = 'off' | 'dark' | 'lift' | 'held' | 'return' | 'rest';

export interface DanielLine {
  readonly entity: pc.Entity;
  readonly phase: LinePhase;
  /** the lines have been read and the monitor is back on the desk */
  readonly done: boolean;
  /** the monitor on the desk, dark; then the lines, brought before `eye` (the pose fixed now). `inPlace`: the room's
   *  own CRT already stands on the desk (the review route `?close=1` begins in 1997's room) — then the lines are on ITS
   *  glass, where the eye already is, and nothing is lifted (two monitors in one place would fight) */
  begin(eye: pc.Entity, xr: boolean, cam: pc.CameraComponent | null, inPlace?: boolean): void;
  tick(dt: number): void;
  /** gone, at once (the lights are out, or the Close was left) */
  hide(): void;
  /** the probes' handle: what the glass shows (0 dark, 1 his line, 2 both) and the seconds into the phase */
  readonly shown: number;
}

export function buildDanielLine(app: pc.AppBase): DanielLine {
  let shown = 0;
  const crt = buildCloseCrt(app, (c) => drawLineGlass(c, shown));
  const entity = crt.entity;
  entity.name = 'daniel-line-crt';
  entity.enabled = false;
  app.root.addChild(entity);
  const restPos = new pc.Vec3(REST.x, REST.y, REST.z), restRot = new pc.Quat();
  const to = { pos: new pc.Vec3(), rot: new pc.Quat() };
  const via = new pc.Vec3();
  let phase: LinePhase = 'off', t = 0, still = false;
  const body = entity.findByName('close-crt-body') as pc.Entity | null;
  /** in place: the glass laid on the room's own, just in front of the desktop's (z 0) and behind the bezel's face */
  const IN_PLACE_Z = 0.006;
  const show = (n: number): void => { if (n !== shown) { shown = n; crt.redraw(); } };
  const place = (k: number, back: boolean): void => {
    const s = smooth(k), u = 1 - s;
    const a = back ? to.pos : restPos, b = back ? restPos : to.pos;
    entity.setPosition(u * u * a.x + 2 * u * s * via.x + s * s * b.x, u * u * a.y + 2 * u * s * via.y + s * s * b.y,
      u * u * a.z + 2 * u * s * via.z + s * s * b.z);
    const q = new pc.Quat().slerp(back ? to.rot : restRot, back ? restRot : to.rot, s);
    entity.setRotation(q);
  };
  return {
    entity,
    get phase() { return phase; },
    get done() { return phase === 'rest'; },
    get shown() { return shown; },
    begin(eye, xr, cam, inPlace = false) {
      still = inPlace;
      if (body) body.enabled = !inPlace;
      if (inPlace) {
        entity.setPosition(restPos.x, restPos.y, restPos.z + IN_PLACE_Z); entity.setRotation(restRot);
        to.pos.copy(entity.getPosition()); to.rot.copy(restRot); via.copy(to.pos);
        entity.enabled = true; show(0); phase = 'dark'; t = 0;
        return;
      }
      const { fwd, up } = eyeFrame(eye, xr);
      let d: number;
      if (xr) d = Math.max(0.5, S.xrDist);
      else {
        const fov = cam?.fov ?? 42, tanV = Math.tan((fov / 2) * D2R);
        const gd = app.graphicsDevice, aspect = gd.height > 0 ? gd.width / gd.height : 16 / 9;
        d = Math.max(CASE.h / (2 * tanV * S.flatFill), CASE.w / (2 * tanV * aspect * S.flatMaxW));
      }
      const eyeP = eye.getPosition().clone();
      to.pos.copy(eyeP).add(fwd.clone().mulScalar(d));
      to.rot.copy(faceRot(fwd, up));
      // the curve keeps `clearance` from the eye (from the desk at the side it swings round, never through the head)
      const half = new pc.Vec3().lerp(restPos, to.pos, 0.5), mid = half.clone();
      const away = mid.clone().sub(eyeP);
      if (away.length() < S.clearance) {
        if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
        mid.copy(eyeP).add(away.normalize().mulScalar(S.clearance));
      }
      via.copy(mid).mulScalar(2).sub(half);
      entity.setPosition(restPos); entity.setRotation(restRot);
      entity.enabled = true;
      show(0);
      phase = 'dark'; t = 0;
    },
    tick(dt) {
      if (phase === 'off' || phase === 'rest') return;
      t += dt;
      if (phase === 'dark') {
        if (t >= PACE.arriveSeconds) { show(1); phase = 'lift'; t = 0; }
      } else if (phase === 'lift') {
        if (!still) place(Math.min(1, t / S.liftSeconds), false);
        if (still || t >= S.liftSeconds) { phase = 'held'; t = 0; }
      } else if (phase === 'held') {
        if (shown < 2 && t >= S.answerAfter) show(2);
        if (t >= S.answerAfter + PACE.holdSeconds + S.holdExtra) { phase = 'return'; t = 0; }
      } else if (phase === 'return') {
        if (!still) place(Math.min(1, t / S.liftSeconds), true);
        if (still || t >= S.liftSeconds) { phase = 'rest'; t = 0; }
      }
    },
    hide() { entity.enabled = false; phase = 'off'; show(0); if (body) body.enabled = true; }
  };
}
