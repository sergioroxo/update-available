/**
 * ⚑ S382 (UiB job 22 Part A, items 2 and 3) — TWO THINGS ON VERA'S DESK THAT ANSWER.
 *
 * THE NOTEBOOK. Sérgio, 13 Nov: "The notebook doesn't give me much because there is no interaction with it." Its top
 * sheet now carries her handwriting (src/room/handPage.ts) — at rest, from the chair, only lines of blue biro, which is
 * what says it can be picked up. A press brings it to her hand, the way the phone comes: up off the desk to where she
 * is looking, half a metre out and a little below the eye, the page turned to her and a third larger, so it reads (the
 * Wick card's ×1.5 precedent, H21: it never comes into the face). It stays in her hand until a press puts it down
 * (a press past it also reaches what it was meant for, the phone's S149 law), or by itself after a minute.
 *   The page is her own 2014 story, in her hand: `s3_vera.json` record.sentText, the words her record keeps "as sent"
 *   and the platform later cuts beside Renata's (S332, `ownCut`). Read here first, the cut lands on words the visitor
 *   has held; read here after, it is the one copy the platform does not hold. Same words: nothing new is said for her.
 *
 * THE MUG. "The mug is fine, I know the connection with the text, but it is not perceptible." Once Nuala's message
 * ("The second mug's still on the hook…") has been read — delivered and held for its reading time — the piece takes
 * the eye there: the mug lifts off the back of the desk, comes forward into the frame beside the monitor, turns its
 * painted N to her and holds it for a few seconds, then goes back. GracePlatform's campaign kit waits for it (one
 * voice at a time). A press on the mug does the same at any time in 2016; its sentence line names it "Nuala's mug"
 * once her message has come (before that, "a mug, painted N" — nothing earned early).
 *
 * Felt register, both: no Lambient (the platform is quiet while either is up: `deskConducting` → personalQuiet), no
 * system voice, nothing filed, nothing scored, never required. ⚑ No beat is triggered by a look: the notebook only by
 * a press, the mug by the message having been read (or a press).
 */
import * as pc from 'playcanvas';
import { drawHandPage, type HandPageLayout } from './handPage';
import { PRINT, CAL_2016 } from '../desktop/theme/calendar';
import { ERA3 } from '../desktop/theme/era3';
import { reducedMotion } from '../state/motion';
import vera from '../../data/dialog/s3_vera.json';
import type { GraceQueueLite } from './graceQueueLite';

type Ray = { p0: pc.Vec3; p1: pc.Vec3 };
type Pose = { p: pc.Vec3; q: pc.Quat; s: number };

/** the page, in pixels (one pixel ≈ 1.25 mm of paper) */
export const PAGE: HandPageLayout = { w: 120, h: 160, left: 16, right: 114, firstRule: 20, pitch: 11 };
/** the page's paper on the pad: 15 × 20 cm, the binding strip left clear at the far end */
const PAGE_M = { w: 0.15, h: 0.2, inset: 0.008 };
/** in her hand: how far from the eye, how far below the look, how much larger */
export const HELD = { distance: 0.48, below: 3, scale: 1.3, up: 0.9, down: 0.7, maxHold: 60 };
/** ⚑ the mug's moment: where it comes to on the desk (its foot, room coordinates), how large, and the timing */
export const MUG = { to: { x: -5.08, y: 0.88, z: 0.47 }, scale: 1.35, up: 0.8, hold: 3.6, down: 0.7, lift: 0.04 };
const NOTE_R = 0.12, MUG_R = 0.085;

function rayNear(ray: Ray, at: { x: number; y: number; z: number }, radius: number): boolean {
  const dx = ray.p1.x - ray.p0.x, dy = ray.p1.y - ray.p0.y, dz = ray.p1.z - ray.p0.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 < 1e-9) return false;
  const t = Math.max(0, Math.min(1, ((at.x - ray.p0.x) * dx + (at.y - ray.p0.y) * dy + (at.z - ray.p0.z) * dz) / len2));
  const cx = ray.p0.x + dx * t - at.x, cy = ray.p0.y + dy * t - at.y, cz = ray.p0.z + dz * t - at.z;
  return cx * cx + cy * cy + cz * cz <= radius * radius;
}
const smooth = (k: number): number => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };

export interface VeraDesk {
  tick(dt: number, era: string): void;
  /** the notebook is up (rising, held or going down) */
  readonly notebookOpen: boolean;
  /** a press while the notebook is in her hand: on the page it is put down and the press is spent (true); anywhere
   *  else it is put down and the press goes on to what it was meant for (false) */
  pressHeld(ray: Ray): boolean;
  /** a press on the notebook or the mug where they lie; true if it took the press */
  pressRest(ray: Ray): boolean;
  /** the sentence line: what the ray rests on here (a key in data/strings/aim.json) and where */
  aim(ray: Ray): { key: string; at: { x: number; y: number; z: number } } | null;
  /** the published presses (the walker's map, ?debug=1): only what can be pressed right now */
  targets(): { id: string; x: number; y: number; z: number; r: number }[];
  debug(): Record<string, unknown>;
}

export function buildVeraDesk(app: pc.Application, gq: GraceQueueLite, env: {
  /** the eye, in room coordinates (the logical head in a headset, the camera otherwise) */
  head: () => pc.Entity | null;
  /** another beat owns the desk (the Wick card rising, the last update installing): presses are refused */
  blocked: () => boolean;
}): VeraDesk {
  // ── the page ──────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = PAGE.w; canvas.height = PAGE.h;
  const ctx = canvas.getContext('2d');
  const desk = (vera as unknown as { desk: { notebookDate: string } }).desk;
  const lines = ctx ? drawHandPage(ctx, PAGE, { paper: PRINT.cardStock, rule: CAL_2016.rule, margin: ERA3.rose, ink: ERA3.ink },
    desk.notebookDate, vera.record.sentText) : 0;
  const tex = new pc.Texture(app.graphicsDevice, {
    width: PAGE.w, height: PAGE.h, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(canvas);
  const mat = new pc.StandardMaterial();
  mat.diffuseMap = tex;
  // paper under her lamp: lit like the desk, with a floor of its own so the ink still reads in her hand
  mat.emissiveMap = tex; mat.emissive = new pc.Color(0.32, 0.32, 0.32);
  mat.update();
  let page: pc.Entity | null = null;
  /** the page's centre in the pad's own frame (set when the page is laid on it) */
  const pageLocal = new pc.Vec3();

  function pad(): pc.Entity | null { return app.root.findByName('w_notepad') as pc.Entity | null; }
  function layPage(): void {
    const p = pad();
    if (!p || (page && page.parent === p)) return;
    // measured from the model, not guessed: its mesh's world box, brought into the pad's frame (it rests at yaw 90)
    let lo: pc.Vec3 | null = null, hi: pc.Vec3 | null = null;
    p.forEach((n) => {
      const e = n as pc.Entity;
      if (e.name === 'w_notepad-page') return;
      for (const mi of e.render?.meshInstances ?? []) {
        const b = mi.aabb, mn = b.getMin(), mx = b.getMax();
        lo = lo ? new pc.Vec3(Math.min(lo.x, mn.x), Math.min(lo.y, mn.y), Math.min(lo.z, mn.z)) : mn.clone();
        hi = hi ? new pc.Vec3(Math.max(hi.x, mx.x), Math.max(hi.y, mx.y), Math.max(hi.z, mx.z)) : mx.clone();
      }
    });
    if (!lo || !hi) return;
    const inv = p.getWorldTransform().clone().invert();
    const c = inv.transformPoint(new pc.Vec3(((lo as pc.Vec3).x + (hi as pc.Vec3).x) / 2, (hi as pc.Vec3).y, ((lo as pc.Vec3).z + (hi as pc.Vec3).z) / 2));
    page = new pc.Entity('w_notepad-page');
    page.addComponent('render', { type: 'plane' });
    if (page.render) { page.render.material = mat; page.render.castShadows = false; }
    pageLocal.set(c.x, c.y + 0.0012, c.z + PAGE_M.inset);
    page.setLocalPosition(pageLocal);
    page.setLocalScale(PAGE_M.w, 1, PAGE_M.h);   // the plane lies face up; its top edge is the pad's far end (the binding)
    p.addChild(page);
  }

  // ── a pose tween (position, rotation, uniform scale) ──────────────────────
  const poseOf = (e: pc.Entity): Pose => ({ p: e.getPosition().clone(), q: e.getRotation().clone(), s: e.getLocalScale().x });
  const setPose = (e: pc.Entity, a: Pose, b: Pose, k: number, arc: number): void => {
    const p = new pc.Vec3().lerp(a.p, b.p, k);
    p.y += arc * Math.sin(Math.PI * k);
    e.setPosition(p);
    e.setRotation(new pc.Quat().slerp(a.q, b.q, k));
    const s = a.s + (b.s - a.s) * k;
    e.setLocalScale(s, s, s);
  };

  // ── the notebook ──────────────────────────────────────────────────────────
  type NbPhase = 'rest' | 'up' | 'held' | 'down';
  const nb = { phase: 'rest' as NbPhase, t: 0, held: 0, rest: null as Pose | null, from: null as Pose | null, to: null as Pose | null };
  function heldPose(): Pose | null {
    const head = env.head();
    if (!head) return null;
    const eye = head.getPosition().clone();
    // where she is looking now (the drag, the gyro or the head): the notebook comes to that, not to the seat's bearing
    const f = head.forward;
    let pitch = Math.asin(Math.max(-1, Math.min(1, f.y))) * 180 / Math.PI;
    const yaw = Math.atan2(-f.x, -f.z) * 180 / Math.PI;
    pitch = Math.max(-36, Math.min(4, pitch - HELD.below));
    const pr = pitch * Math.PI / 180, yr = yaw * Math.PI / 180;
    const dir = new pc.Vec3(-Math.sin(yr) * Math.cos(pr), Math.sin(pr), -Math.cos(yr) * Math.cos(pr));
    const at = eye.clone().add(dir.clone().mulScalar(HELD.distance));
    // the page faces the eye, its top edge (the pad's far end, local −Z) up
    const n = eye.clone().sub(at).normalize();
    const up = new pc.Vec3(0, 1, 0);
    const upP = up.clone().sub(n.clone().mulScalar(n.dot(up))).normalize();
    const zAxis = upP.clone().mulScalar(-1);
    const xAxis = new pc.Vec3().cross(n, zAxis).normalize();
    const m = new pc.Mat4();
    const d = m.data;
    d[0] = xAxis.x; d[1] = xAxis.y; d[2] = xAxis.z; d[3] = 0;
    d[4] = n.x; d[5] = n.y; d[6] = n.z; d[7] = 0;
    d[8] = zAxis.x; d[9] = zAxis.y; d[10] = zAxis.z; d[11] = 0;
    d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
    const q = new pc.Quat().setFromMat4(m);
    // place the pad so the PAGE's centre lands at `at`
    const off = q.transformVector(pageLocal.clone().mulScalar(HELD.scale));
    return { p: at.clone().sub(off), q, s: HELD.scale };
  }
  function openNotebook(): boolean {
    const p = pad();
    if (!p || !p.enabled || nb.phase !== 'rest') return false;
    const to = heldPose();
    if (!to) return false;
    nb.rest = poseOf(p); nb.from = nb.rest; nb.to = to; nb.phase = 'up'; nb.t = 0; nb.held = 0;
    return true;
  }
  function closeNotebook(): void {
    const p = pad();
    if (!p || nb.phase === 'rest' || nb.phase === 'down' || !nb.rest) return;
    nb.from = poseOf(p); nb.to = nb.rest; nb.phase = 'down'; nb.t = 0;
  }
  function snapNotebook(): void {
    const p = pad();
    if (p && nb.rest && nb.phase !== 'rest') { p.setPosition(nb.rest.p); p.setRotation(nb.rest.q); p.setLocalScale(nb.rest.s, nb.rest.s, nb.rest.s); }
    nb.phase = 'rest'; nb.t = 0;
  }
  function tickNotebook(dt: number): void {
    const p = pad();
    if (!p || nb.phase === 'rest' || !nb.from || !nb.to) return;
    nb.t += dt;
    if (nb.phase === 'up') {
      const dur = reducedMotion() ? 0 : HELD.up;
      const k = dur ? smooth(nb.t / dur) : 1;
      setPose(p, nb.from, nb.to, k, 0.05);
      if (k >= 1) { nb.phase = 'held'; nb.held = 0; }
    } else if (nb.phase === 'held') {
      nb.held += dt;
      if (nb.held >= HELD.maxHold) closeNotebook();
    } else if (nb.phase === 'down') {
      const dur = reducedMotion() ? 0 : HELD.down;
      const k = dur ? smooth(nb.t / dur) : 1;
      setPose(p, nb.from, nb.to, k, 0.03);
      if (k >= 1) snapNotebook();
    }
  }
  /** the page's centre and its half-size, now (for the press while held) */
  function pageNow(): { c: pc.Vec3; r: number } | null {
    if (!page) return null;
    return { c: page.getPosition().clone(), r: 0.5 * Math.hypot(PAGE_M.w, PAGE_M.h) * (pad()?.getLocalScale().x ?? 1) };
  }

  // ── the mug ───────────────────────────────────────────────────────────────
  type MugPhase = 'rest' | 'up' | 'hold' | 'down';
  const mug = { phase: 'rest' as MugPhase, t: 0, fromCue: false, rest: null as Pose | null, to: null as Pose | null,
    nRest: null as Pose | null, nLocal: null as { p: pc.Vec3; q: pc.Quat } | null, played: 0 };
  let nRestScale: pc.Vec3 | null = null;
  const mugEnt = (): pc.Entity | null => app.root.findByName('w_mug') as pc.Entity | null;
  const mugN = (): pc.Entity | null => app.root.findByName('w_mugN') as pc.Entity | null;
  /** ⚑ the mug is unbatched now that it moves (cluster.ts UNBATCHED_IDS): its eight boxes become one mesh — one draw, not
   *  eight — and the painted N keeps only its print (its 2 mm backing box would be a draw of its own; the Wick card's
   *  same saving). Done once, the first time 2016 is ticked. */
  let mugSlim = false;
  function slimMug(): void {
    const m = mugEnt();
    if (mugSlim || !m) return;
    mugSlim = true;
    const n = mugN();
    if (n?.render) n.render.enabled = false;
    const parts = m.children.filter((c) => (c as pc.Entity).render?.meshInstances?.length) as pc.Entity[];
    if (parts.length < 2) return;
    const unit = pc.createBox(app.graphicsDevice, { halfExtents: new pc.Vec3(0.5, 0.5, 0.5) });
    const up: number[] = [], un: number[] = [], uu: number[] = [], ui: number[] = [];
    unit.getPositions(up); unit.getNormals(un); unit.getUvs(0, uu); unit.getIndices(ui);
    const P: number[] = [], Nr: number[] = [], U: number[] = [], I: number[] = [];
    for (const pe of parts) {
      const lp = pe.getLocalPosition(), ls = pe.getLocalScale(), base = P.length / 3;
      for (let i = 0; i < up.length; i += 3) P.push(lp.x + up[i] * ls.x, lp.y + up[i + 1] * ls.y, lp.z + up[i + 2] * ls.z);
      Nr.push(...un); U.push(...uu);
      for (const k of ui) I.push(base + k);
    }
    const mesh = new pc.Mesh(app.graphicsDevice);
    mesh.setPositions(P); mesh.setNormals(Nr); mesh.setUvs(0, U); mesh.setIndices(I); mesh.update();
    const one = new pc.Entity('w_mug-one');
    m.addChild(one);
    one.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, parts[0].render!.meshInstances[0].material, one)] });
    for (const pe of parts) pe.render!.enabled = false;
  }
  function startMug(fromCue: boolean): boolean {
    const m = mugEnt(), n = mugN(), head = env.head();
    if (!m || !m.enabled || mug.phase !== 'rest' || !head) return false;
    mug.rest = poseOf(m);
    if (n) {
      mug.nRest = { p: n.getPosition().clone(), q: n.getRotation().clone(), s: 1 };
      const inv = mug.rest.q.clone().invert();
      mug.nLocal = { p: inv.transformVector(n.getPosition().clone().sub(mug.rest.p)), q: inv.clone().mul(n.getRotation()) };
      nRestScale = n.getLocalScale().clone();
    }
    const eye = head.getPosition();
    const yaw = Math.atan2(eye.x - MUG.to.x, eye.z - MUG.to.z) * 180 / Math.PI;   // its painted face (local +Z) to her
    mug.to = { p: new pc.Vec3(MUG.to.x, MUG.to.y, MUG.to.z), q: new pc.Quat().setFromEulerAngles(0, yaw, 0), s: MUG.scale };
    mug.phase = 'up'; mug.t = 0; mug.fromCue = fromCue;
    return true;
  }
  function placeN(m: pc.Entity): void {
    const n = mugN();
    if (!n || !mug.nLocal || !mug.rest) return;
    const q = m.getRotation(), k = m.getLocalScale().x / mug.rest.s;
    n.setPosition(m.getPosition().clone().add(q.transformVector(mug.nLocal.p.clone().mulScalar(k))));
    n.setRotation(q.clone().mul(mug.nLocal.q));
    if (nRestScale) n.setLocalScale(nRestScale.x * k, nRestScale.y * k, nRestScale.z * k);
  }
  function endMug(): void {
    const m = mugEnt(), n = mugN();
    if (m && mug.rest) { m.setPosition(mug.rest.p); m.setRotation(mug.rest.q); m.setLocalScale(mug.rest.s, mug.rest.s, mug.rest.s); }
    if (n && mug.nRest) { n.setPosition(mug.nRest.p); n.setRotation(mug.nRest.q); if (nRestScale) n.setLocalScale(nRestScale); }
    if (mug.fromCue) gq.mugDone = true;
    if (mug.phase !== 'rest') mug.played++;
    mug.phase = 'rest'; mug.t = 0; mug.fromCue = false;
  }
  function tickMug(dt: number): void {
    const m = mugEnt();
    if (!m || mug.phase === 'rest' || !mug.rest || !mug.to) return;
    mug.t += dt;
    const rm = reducedMotion();
    if (mug.phase === 'up') {
      const k = rm ? 1 : smooth(mug.t / MUG.up);
      setPose(m, mug.rest, mug.to, k, MUG.lift);
      if (k >= 1) { mug.phase = 'hold'; mug.t = 0; }
    } else if (mug.phase === 'hold') {
      setPose(m, mug.rest, mug.to, 1, 0);
      if (mug.t >= MUG.hold) { mug.phase = 'down'; mug.t = 0; }
    } else {
      const k = rm ? 1 : smooth(mug.t / MUG.down);
      setPose(m, mug.to, mug.rest, k, MUG.lift * 0.6);
      if (k >= 1) { placeN(m); endMug(); return; }
    }
    placeN(m);
  }

  const notebookAt = (): { x: number; y: number; z: number } | null => {
    const p = pad();
    if (!p || !p.enabled) return null;
    const c = p.getWorldTransform().transformPoint(pageLocal.clone());
    return { x: c.x, y: c.y, z: c.z };
  };
  const mugAt = (): { x: number; y: number; z: number } | null => {
    const m = mugEnt();
    if (!m || !m.enabled) return null;
    const p = m.getPosition();
    return { x: p.x, y: p.y + 0.05 * m.getLocalScale().x, z: p.z };
  };
  let era = '';
  const free = (): boolean => era === 'e3' && !env.blocked() && nb.phase === 'rest' && mug.phase === 'rest';

  return {
    tick(dt, eraNow) {
      era = eraNow;
      if (eraNow !== 'e3') {
        if (nb.phase !== 'rest') snapNotebook();
        if (mug.phase !== 'rest') endMug();
        gq.deskConducting = false;
        return;
      }
      layPage();
      slimMug();
      // Nuala's message has been read: the piece takes the eye to her mug (graceQueueLite raises the cue; the kit waits)
      if (gq.mugCue && nb.phase === 'rest' && mug.phase === 'rest') {
        gq.mugCue = false;
        if (!startMug(true)) gq.mugDone = true;   // no mug to bring: the kit must never wait on it
      }
      tickNotebook(dt);
      tickMug(dt);
      gq.deskConducting = nb.phase !== 'rest' || mug.phase !== 'rest';
    },
    get notebookOpen() { return nb.phase !== 'rest'; },
    pressHeld(ray) {
      if (nb.phase === 'rest') return false;
      const pn = pageNow();
      const onPage = !!pn && rayNear(ray, pn.c, pn.r);
      closeNotebook();
      return onPage;
    },
    pressRest(ray) {
      if (!free()) return false;
      const n = notebookAt();
      if (n && rayNear(ray, n, NOTE_R)) return openNotebook();
      const m = mugAt();
      if (m && rayNear(ray, m, MUG_R)) return startMug(false);
      return false;
    },
    aim(ray) {
      if (era !== 'e3' || nb.phase !== 'rest' || mug.phase !== 'rest') return null;
      const n = notebookAt();
      if (n && rayNear(ray, n, NOTE_R)) return { key: 'veraNotebook', at: n };
      const m = mugAt();
      if (m && rayNear(ray, m, MUG_R)) return { key: gq.phone.delivered('nuala') ? 'veraMugNuala' : 'veraMug', at: m };
      return null;
    },
    targets() {
      if (!free()) return [];
      const out: { id: string; x: number; y: number; z: number; r: number }[] = [];
      const n = notebookAt(); if (n) out.push({ id: 'desk-notebook', ...n, r: NOTE_R });
      const m = mugAt(); if (m) out.push({ id: 'desk-mug', ...m, r: MUG_R });
      return out;
    },
    debug() {
      const corners: number[][] = [];
      if (page) for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        const w = page.getWorldTransform().transformPoint(new pc.Vec3(u, 0, v));
        corners.push([w.x, w.y, w.z]);
      }
      return { notebook: nb.phase, mug: mug.phase, mugPlayed: mug.played, pageLines: lines, pageCorners: corners, page: PAGE, held: HELD,
        mugAt: mugAt(), notebookAt: notebookAt(), deskConducting: gq.deskConducting };
    }
  };
}
