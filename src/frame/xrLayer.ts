/** ⚑ S270g — THE HEADSET'S OWN LAYER (docs/reinterp/VR_AS_A_LAYER_2026-10-31.md; his: "build VR-04, VR-05, VR-08 and
 *  VR-06"). Four things only a headset can do, built on the comfort mapping (xrComfort) and the frame (xrFrame):
 *
 *  VR-04  the desk meets the visitor's table — a fingertip held still on a real table sets the desk height.
 *  VR-05  Lamby in the room — 1997 a creature that hops out of the monitor onto the desk; 2003 a desk toy riding the
 *         monitor; 2016 a badge beside the phone; 2026 no body, a soft light near the laptop. Shown only while the
 *         guide's balloon is (so every guide law holds: ≤5 unsolicited, never felt or respite, dismissal logged);
 *         pressing it is the balloon's own Yes.
 *  VR-08  the visor's second frame — while the 2026 visor is on, a lens closes round the view and the programme
 *         draws the visitor's own hands in L's colour. (Putting it on by hand lives in app.ts's grab.)
 *  VR-06  the dollhouse — at a change of era, the house held in front of the visitor for a few seconds, the seat
 *         marked, while the room re-forms under the dissolve. The world comes to the visitor; the view never moves.
 *
 *  Nothing here runs outside an immersive session. No storage, no network, no new input kinds. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { drawLambyChar } from '../desktop/apps/lambyChar';
import { FRAME } from '../desktop/theme/chrome';
import { ERA1 } from '../desktop/theme/era1';
import { ERA4 } from '../desktop/theme/era4';
import type { Ray } from './xrFrame';

export interface XrLayerDeps {
  head: pc.Entity;
  comfort: {
    logicalPoint(p: pc.Vec3): pc.Vec3; matchDesk(tableY: number): number; stageYaw(): number;
    readonly calibrated: boolean; readonly busy: boolean; readonly authored: pc.Entity;
  };
  input: { points(): pc.Vec3[]; palms(): pc.Vec3[]; setStyle(style: 'own' | 'programme'): void };
  /** VR-01 — the 1997/2003 desk: the mouse prop, the desktop's pointer, and where a desktop pixel is on the glass */
  mouse: {
    active(): boolean; prop(): pc.Entity | null;
    move(x: number, y: number): void; click(x: number, y: number): void;
    screenPoint(x: number, y: number): pc.Vec3;
  };
  frame: { notice(text: string | null, seconds?: number): void; readonly layerId: number };
  strings: { ask: string; done: string; none: string; offer: string };
  era(): string;
  /** the guide's balloon is up this frame */
  guideShowing(): boolean;
  /** S271 — Lamby is out in the room (true) or back in the screen (false) */
  bodyOut(out: boolean): void;
  /** the balloon's Yes (take me there / show me) */
  guideYes(): void;
  visorWorn(): boolean;
  /** the story has begun (past the entrance and the setup) */
  inRoom(): boolean;
}

export interface XrLayer {
  /** VR-04 — start listening for a fingertip on a table */
  matchTable(): void;
  /** VR-06 — the house in the hands, for one change of era */
  dollhouse(): void;
  /** VR-05 — a press (physical ray) on Lamby; true if it took it */
  pressLamby(physical: Ray, toLogical: (r: Ray) => Ray): boolean;
  /** VR-01 — a hand is on the mouse: a press is a click at the desktop pointer (true if it took it) */
  mouseClick(): boolean;
  readonly mouseEngaged: boolean;
  /** ?debug=1 review only: force the balloon / the worn visor, to photograph Lamby and the lens without a story */
  review(what: { lamby?: boolean; worn?: boolean }): void;
}

/** where each era's Lamby lives, in room coordinates (Room 1's monitor at SCREEN in app.ts; the devices at
 *  era3Devices' PLACEMENT — keep in step) */
type Spot = { rest: pc.Vec3; from: pc.Vec3 | null; w: number; h: number };
const LAMBY: Record<string, Spot> = {
  e1: { rest: new pc.Vec3(-0.30, 0.81, 0.18), from: new pc.Vec3(0, 1.08, 0.05), w: 0.11, h: 0.137 },
  // S271 (his 31 Oct: "Lamby now appears on the top of the screen and should not be there") — 2003 steps out as 1997
  //   does, from the glass onto the desk, left of the keyboard (the mouse and the phone have the right)
  e2: { rest: new pc.Vec3(-0.27, 0.81, 0.08), from: new pc.Vec3(0, 1.08, 0.05), w: 0.10, h: 0.125 },
  e3: { rest: new pc.Vec3(-5.21, 0.99, 1.1), from: null, w: 0.055, h: 0.055 },
  e4: { rest: new pc.Vec3(5.2, 1.18, 0.9), from: null, w: 0.09, h: 0.09 }
};

export function mountXrLayer(app: pc.AppBase, deps: XrLayerDeps): XrLayer {
  const { head } = deps;
  const live = (): boolean => !!app.xr?.active;
  const forced = { lamby: false, worn: false };
  /** facing the head about the vertical, for a stood-up plane (as xrFrame's hang) */
  const face = (e: pc.Entity, at: pc.Vec3, eye: pc.Vec3): void => {
    const d = at.clone().sub(eye); d.y = 0;
    if (d.lengthSq() < 1e-6) return;
    d.normalize(); e.setPosition(at); e.setEulerAngles(90, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
  };

  // ── VR-05 Lamby ──
  const lc = document.createElement('canvas'); lc.width = 128; lc.height = 160;
  const lctx = lc.getContext('2d')!;
  const ltex = makeScreenTexture(app, lc, true);
  const lamby = makeScreenEntity('vr-lamby', ltex, 0.11, 0.137, true);   // 'vr-', not 'xr-': it lives in the room
  lamby.enabled = false; app.root.addChild(lamby);
  let lambyT = 0, lambyShown = false, lambyEra = '', lambyDrawn = -1, lambyAt = new pc.Vec3();
  const drawLamby = (era: string, t: number): void => {
    lctx.clearRect(0, 0, 128, 160);
    if (era === 'e1' || era === 'e2') {
      drawLambyChar(lctx, 64, 92, { mood: 'cheerful', action: 'point', t, moodStart: 0, scale: 0.95 });   // towards the screen, on his right
    } else if (era === 'e3') {
      // a notification: a round badge with the head, pulsing
      lctx.fillStyle = ERA1.white; lctx.beginPath(); lctx.arc(64, 80, 56, 0, Math.PI * 2); lctx.fill();
      lctx.strokeStyle = ERA1.titleBlue; lctx.lineWidth = 8; lctx.stroke();
      drawLambyChar(lctx, 64, 92, { mood: 'cheerful', action: 'idle', t, moodStart: 0, scale: 0.55, headOnly: true });
    } else {
      // no body at all: a soft light in L's colour
      const g = lctx.createRadialGradient(64, 80, 4, 64, 80, 62);
      g.addColorStop(0, ERA4.l); g.addColorStop(0.45, ERA4.lDim); g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.fillRect(0, 0, 128, 160);
    }
    ltex.upload();
  };
  const tickLamby = (dt: number, eyeL: pc.Vec3): void => {
    const era = deps.era(), spot = LAMBY[era] as Spot | undefined;
    const show = live() && deps.inRoom() && !!spot && (deps.guideShowing() || forced.lamby);
    deps.bodyOut(show && (era === 'e1' || era === 'e2'));
    if (!show || !spot) { lamby.enabled = false; lambyShown = false; return; }
    if (!lambyShown || era !== lambyEra) { lambyShown = true; lambyEra = era; lambyT = 0; lamby.setLocalScale(spot.w, 1, spot.h); }
    lambyT += dt;
    // 1997: out of the monitor in an arc onto the desk (0.6 s), then a small bob while it speaks
    const k = spot.from ? Math.min(1, lambyT / 0.6) : 1;
    lambyAt = spot.from ? new pc.Vec3().lerp(spot.from, spot.rest, k) : spot.rest.clone();
    if (spot.from && k < 1) lambyAt.y += Math.sin(k * Math.PI) * 0.12;
    else lambyAt.y += Math.abs(Math.sin(lambyT * 3)) * (era === 'e4' ? 0.015 : 0.008);
    if (era === 'e3') { const p = 1 + Math.sin(lambyT * 5) * 0.08; lamby.setLocalScale(spot.w * p, 1, spot.h * p); }
    face(lamby, lambyAt, eyeL); lamby.enabled = true;
    const frame = Math.floor(lambyT * 8);   // eight drawings a second, uploaded only then
    if (frame !== lambyDrawn) { lambyDrawn = frame; drawLamby(era, lambyT); }
  };

  // ── VR-08 the lens ──
  const nc = document.createElement('canvas'); nc.width = 512; nc.height = 440;
  const nctx = nc.getContext('2d')!;
  nctx.fillStyle = ERA4.lBand; nctx.fillRect(0, 0, 512, 440);
  nctx.globalCompositeOperation = 'destination-out';
  const hole = nctx.createRadialGradient(256, 220, 120, 256, 220, 236);
  hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(0.85, 'rgba(0,0,0,1)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
  nctx.fillStyle = hole; nctx.beginPath(); nctx.ellipse(256, 220, 236, 196, 0, 0, Math.PI * 2); nctx.fill();
  nctx.globalCompositeOperation = 'source-over';
  nctx.strokeStyle = ERA4.lDim; nctx.lineWidth = 3; nctx.beginPath(); nctx.ellipse(256, 220, 230, 190, 0, 0, Math.PI * 2); nctx.stroke();
  const ntex = makeScreenTexture(app, nc, true); ntex.upload();
  const lens = makeScreenEntity('xr-lens', ntex, 0.46, 0.395, true);
  const lensMat = lens.render!.material as pc.StandardMaterial;
  lensMat.depthTest = false; lensMat.update();
  lens.render!.layers = [deps.frame.layerId];
  head.addChild(lens); lens.setLocalPosition(0, 0, -0.14); lens.setLocalEulerAngles(90, 0, 0); lens.enabled = false;
  let lensK = 0;
  const tickLens = (dt: number): void => {
    const worn = live() && (deps.visorWorn() || forced.worn);
    lensK = Math.max(0, Math.min(1, lensK + (worn ? dt : -dt) / 0.5));
    lens.enabled = lensK > 0;
    if (lens.enabled) { lensMat.opacity = lensK; lensMat.update(); }
    deps.input.setStyle(worn ? 'programme' : 'own');
  };

  // ── VR-04 the table ──
  const TABLE_GRACE = 3, TABLE_HOLD = 1.5;
  let table: { t: number; hist: { t: number; p: pc.Vec3 }[][] } | null = null;
  let offered = false, inRoomFor = 0;
  const tickTable = (dt: number): void => {
    if (!live()) { table = null; return; }
    if (!offered && deps.inRoom() && deps.comfort.calibrated) {
      inRoomFor += dt;
      if (inRoomFor > 6) { offered = true; deps.frame.notice(deps.strings.offer, 9); }
    }
    if (!table) return;
    table.t += dt;
    if (table.t > 24) { table = null; deps.frame.notice(deps.strings.none, 4); return; }
    // ⚑ S271 (his 31 Oct: "Okay, no, that's too fast. I wasn't even able to try") — the hand that pressed the menu row
    //   was still, so it was taken at once. The first 3 s only ask; then a fingertip must stay still for 1.5 s.
    if (table.t < TABLE_GRACE) return;
    const eyeY = head.getPosition().y;
    deps.input.points().forEach((p, i) => {
      const h = (table!.hist[i] ??= []);
      h.push({ t: table!.t, p }); while (h.length && table!.t - h[0].t > TABLE_HOLD) h.shift();
      if (!table || table.t - h[0].t < TABLE_HOLD - 0.05) return;
      const still = h.every((s) => s.p.distance(p) < 0.012);
      const below = eyeY - p.y;
      if (still && below > 0.2 && below < 0.85) { deps.comfort.matchDesk(p.y); table = null; deps.frame.notice(deps.strings.done, 4); }
    });
  };

  // ── VR-06 the dollhouse ──
  type BatchLike = { meshInstance: pc.MeshInstance | null; _aabb: pc.BoundingBox };
  const batches = (): BatchLike[] => ((app.batcher as unknown as { _batchList?: BatchLike[] } | null)?._batchList ?? []);
  // the model fits ~45 cm across whatever the era holds (one room in 1997, the three-room house from 2016)
  const FIT = 0.45, HOLD = 4.2;
  let SCALE = 0.06;
  let doll: { root: pc.Entity; geo: pc.Entity; mark: pc.Entity; t: number; meshes: pc.Mesh[]; centre: pc.Vec3 } | null = null;
  const markMat = new pc.StandardMaterial(); markMat.useLighting = false; markMat.diffuse = new pc.Color(0, 0, 0);
  markMat.emissive = new pc.Color().fromString(FRAME.bright); markMat.update();
  const buildGeo = (root: pc.Entity): { geo: pc.Entity; meshes: pc.Mesh[]; centre: pc.Vec3 } => {
    // a dollhouse has no roof: the ceilings (thin, high slabs) are left out so the eye falls into the rooms
    const list = batches().filter((b) => b.meshInstance && !(b._aabb.center.y > 2.2 && b._aabb.halfExtents.y < 0.2));
    const box = new pc.BoundingBox(); list.forEach((b, i) => i === 0 ? box.copy(b._aabb) : box.add(b._aabb));
    SCALE = Math.min(0.06, FIT / Math.max(0.1, 2 * box.halfExtents.x, 2 * box.halfExtents.z));
    const geo = new pc.Entity('xr-dollhouse-geo');
    const mis = list.map((b) => new pc.MeshInstance(b.meshInstance!.mesh, b.meshInstance!.material, geo));
    geo.addComponent('render', { meshInstances: mis, layers: [deps.frame.layerId] });
    geo.setLocalScale(SCALE, SCALE, SCALE);
    geo.setLocalPosition(-box.center.x * SCALE, -box.center.y * SCALE, -box.center.z * SCALE);
    root.addChild(geo);
    return { geo, meshes: list.map((b) => b.meshInstance!.mesh), centre: box.center.clone() };
  };
  const endDoll = (): void => { if (doll) { doll.root.destroy(); doll = null; } };
  const tickDoll = (dt: number): void => {
    if (!doll) return;
    if (!live()) { endDoll(); return; }
    doll.t += dt;
    if (doll.t > HOLD) { endDoll(); return; }
    const k = Math.min(1, doll.t / 0.4, (HOLD - doll.t) / 0.4);
    doll.root.setLocalScale(k, k, k);
    // the seat, wherever it is now: it jumps to the new room when the room re-forms under the dissolve
    const seat = deps.comfort.authored.getLocalPosition();
    const s = 1 + Math.abs(Math.sin(doll.t * 6)) * 0.6;
    doll.mark.setLocalPosition((seat.x - doll.centre.x) * SCALE, (seat.y - doll.centre.y) * SCALE + 0.02, (seat.z - doll.centre.z) * SCALE);
    doll.mark.setLocalScale(0.012 * s, 0.012 * s, 0.012 * s);
  };
  // the batches can be rebuilt mid-change (the next era's room batches): never draw a mesh the batcher has let go
  app.on('prerender', () => {
    if (!doll) return;
    const now = new Set(batches().map((b) => b.meshInstance?.mesh));
    if (doll.meshes.some((m) => !now.has(m))) {
      doll.geo.destroy();
      const g = buildGeo(doll.root); doll.geo = g.geo; doll.meshes = g.meshes; doll.centre = g.centre;
    }
  });

  // ── VR-01 the desk mouse (1997, 2003) ──
  // A palm or a controller resting on the mouse takes it: sliding it on the desk moves the desktop's pointer (about
  // 20 cm of travel crosses the screen) and the mouse with it; the pinch or the trigger clicks. Lift away and it
  // stays where it was left. Pointing at the screen still works whenever no hand is on the mouse.
  const GAIN = 512 / 0.20;
  const cc = document.createElement('canvas'); cc.width = 32; cc.height = 48;
  const cctx = cc.getContext('2d')!;
  // the 1997 arrow, white with a black edge, drawn once
  cctx.fillStyle = ERA1.black; cctx.beginPath(); [[2, 2], [2, 38], [11, 29], [18, 44], [24, 41], [17, 27], [29, 27]].forEach(([x, y], i) => i ? cctx.lineTo(x, y) : cctx.moveTo(x, y)); cctx.closePath(); cctx.fill();
  cctx.fillStyle = ERA1.white; cctx.beginPath(); [[5, 8], [5, 31], [11, 25], [18, 40], [21, 39], [14, 24], [23, 24]].forEach(([x, y], i) => i ? cctx.lineTo(x, y) : cctx.moveTo(x, y)); cctx.closePath(); cctx.fill();
  const ctex = makeScreenTexture(app, cc); ctex.upload();
  const cursorE = makeScreenEntity('vr-mouse-cursor', ctex, 0.016, 0.024, true);
  cursorE.enabled = false; app.root.addChild(cursorE);
  const cursor = { x: 256, y: 192 };
  let grip: { idx: number; last: pc.Vec3; propFrom: pc.Vec3; handFrom: pc.Vec3; away: number } | null = null;
  let rest: pc.Vec3 | null = null, cursorFor = 0;
  const tickMouse = (dt: number): void => {
    const m = deps.mouse, prop = live() && m.active() ? m.prop() : null;
    if (!prop) { grip = null; cursorE.enabled = false; return; }
    rest ??= prop.getPosition().clone();
    const at = prop.getPosition();
    const palms = deps.input.palms().map((p) => deps.comfort.logicalPoint(p));
    if (!grip) {
      const idx = palms.findIndex((p) => p.distance(at) < 0.10);
      if (idx >= 0) grip = { idx, last: palms[idx].clone(), propFrom: at.clone(), handFrom: palms[idx].clone(), away: 0 };
    }
    if (grip) {
      const p = palms[grip.idx];
      if (!p) { grip = null; return; }
      const dx = p.x - grip.last.x, dz = p.z - grip.last.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.0015) {   // below 1.5 mm is the hand's own tremor
        cursor.x = Math.max(0, Math.min(511, cursor.x + dx * GAIN));
        cursor.y = Math.max(0, Math.min(383, cursor.y + dz * GAIN));
        m.move(cursor.x, cursor.y);
        grip.last.copy(p);
      }
      const want = grip.propFrom.clone().add(new pc.Vec3(p.x - grip.handFrom.x, 0, p.z - grip.handFrom.z));
      want.x = Math.max(rest.x - 0.12, Math.min(rest.x + 0.12, want.x)); want.z = Math.max(rest.z - 0.10, Math.min(rest.z + 0.10, want.z));
      prop.setPosition(want.x, rest.y, want.z);
      grip.away = p.distance(prop.getPosition()) > 0.14 ? grip.away + dt : 0;
      if (grip.away > 0.4) grip = null;
      cursorFor = 2;
    } else cursorFor -= dt;
    cursorE.enabled = cursorFor > 0;
    if (cursorE.enabled) {
      const tip = m.screenPoint(cursor.x, cursor.y);
      cursorE.setPosition(tip.x + 0.008, tip.y - 0.012, tip.z); cursorE.setEulerAngles(90, 0, 0);
    }
  };

  app.on('update', (dt: number) => {
    const eyeL = deps.comfort.logicalPoint(head.getPosition());
    tickLamby(dt, eyeL); tickLens(dt); tickTable(dt); tickDoll(dt); tickMouse(dt);
  });
  app.xr?.on('end', () => { grip = null; cursorE.enabled = false; if (rest) deps.mouse.prop()?.setPosition(rest); endDoll(); lamby.enabled = false; lens.enabled = false; lensK = 0; table = null; deps.input.setStyle('own'); });

  return {
    matchTable() { if (!live()) return; table = { t: 0, hist: [] }; deps.frame.notice(deps.strings.ask, 24); },
    dollhouse() {
      if (!live() || !batches().length) return;
      endDoll();
      const root = new pc.Entity('xr-dollhouse');
      const f = head.forward.clone(); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize();
      // on the desk in front of the visitor, low enough to look down into it
      root.setPosition(head.getPosition().clone().add(f.mulScalar(0.45)).add(new pc.Vec3(0, -0.38, 0)));
      root.setEulerAngles(0, deps.comfort.stageYaw(), 0);   // the house turned as the room around the visitor is
      app.root.addChild(root);
      const g = buildGeo(root);
      const mark = new pc.Entity('xr-dollhouse-seat');
      mark.addComponent('render', { type: 'box', material: markMat, layers: [deps.frame.layerId] });
      root.addChild(mark);
      root.setLocalScale(0, 0, 0);
      doll = { root, geo: g.geo, mark, t: 0, meshes: g.meshes, centre: g.centre };
    },
    mouseClick() { if (!grip) return false; deps.mouse.click(cursor.x, cursor.y); return true; },
    get mouseEngaged() { return !!grip; },
    review(what) { if (what.lamby !== undefined) forced.lamby = what.lamby; if (what.worn !== undefined) forced.worn = what.worn; },
    pressLamby(physical, toLogical) {
      if (!lamby.enabled) return false;
      const r = toLogical(physical), d = r.p1.clone().sub(r.p0), len = d.length();
      if (len < 1e-6) return false;
      d.mulScalar(1 / len);
      const t = Math.max(0, Math.min(len, lambyAt.clone().sub(r.p0).dot(d)));
      const near = r.p0.clone().add(d.mulScalar(t)).distance(lambyAt);
      if (near > 0.09) return false;
      deps.guideYes(); return true;
    }
  };
}
