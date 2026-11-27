#!/usr/bin/env node
/**
 * ⚑ S431 (UiB job 39 C, and G's proof for it) — LAMBYVISION BESIDE THE MONITOR, AND THE OFFER'S BUTTONS, PROVED ON PRESSES.
 *
 *     node tools/s431-probe.mjs --port 5822 --run <name> --out <dir> [--shots <dir>] [--build before|after]
 *
 * One run per page (2016's offer and 1997's call are each said once). 2016 is played by presses to the offer (tools/harness/e3-route.mjs
 * `playTo`: real mouse presses, the headset mock's ray and trigger, or a tap; the fiction's own times through the app's own update
 * loop); 1997's card is called through the review aid `__teachingTv.arm('1997')` (no beat of the visit calls it any more). The press
 * under test is then made by the input the run names, on the build's own published target (tools/harness/visitor-state.mjs):
 *   · a CONTROLLER: the ray aimed at the target, selectstart / select / selectend (frame/xrInput.ts's own handlers);
 *   · a HAND PINCH: a tracked hand (thumb and index tips) whose ray points at the target; the tips close (< 22 mm) and open (> 32 mm)
 *     over the app's own frames (xrInput's pinch hysteresis presses where the hand aimed when the pinch closed);
 *   · a FINGERTIP TOUCH: the index tip brought from 8 cm before the target onto it (xrInput's latched poke: a short segment along the
 *     hand's pointing direction must land on a surface).
 * Runs:
 *   desktop-bring · phone-bring                — the offer on the glass (computer, phone), Bring it by mouse / tap, Lesson 2 opens
 *   xr-ctl-bring · xr-ctl-notnow               — the headset mock, the controller on each of the two buttons
 *   xr-pinch-bring · xr-pinch-notnow · xr-touch-bring · xr-touch-notnow — a hand on each
 *   xr-letgo                                   — the offer left alone: its own quiet close after `offerHold`, logged as a let-go
 *   card97-ctl · card97-pinch · card97-touch · card97-touchx — the floating card in 1997 (armed): Bring it here by each input; × by touch
 * Checks (after build): the offer is Lambient's balloon on the monitor, its tail from the taskbar button; the card in the room is not
 * shown; it counts once in the era's eight; the press reaches the guide (ledger `guide:tvcall` begun / dismissed) and the moment
 * (brought / declined); the set beside the monitor (headset: left of it, at its height, measured from the seat at several pitches:
 * its rectangle, its glass, the source line's letter height, nothing over the Handset Window or the calendar); a lesson opening sends
 * it back. Writes <out>/s431_<run>_<build>.json; with --shots the stills (2560 × 1440; the phone its own portrait).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launch, ff, e3, press as routePress, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const RUN = flag('run', 'xr-ctl-bring');
const BUILD = flag('build', 'after');
const OUT = path.resolve(flag('out', 'out/s431'));
const SHOTS = flag('shots', null) ? path.resolve(flag('shots')) : null;
fs.mkdirSync(OUT, { recursive: true }); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MODE = RUN.startsWith('desktop') ? 'desktop' : RUN.startsWith('phone') ? 'phone' : 'xr';
const INPUT = /-ctl/.test(RUN) ? 'controller' : /-pinch/.test(RUN) ? 'pinch' : /-touch/.test(RUN) ? 'touch' : MODE === 'phone' ? 'tap' : MODE === 'desktop' ? 'mouse' : 'none';
const ANSWER = /notnow$/.test(RUN) ? 'lg-later' : /touchx$/.test(RUN) ? 'lg-x' : 'lg-take';
const ERA1 = RUN.startsWith('card97');
/** one Quest-like eye (the probes' convention, tools/j15-07-side-probe.mjs): ~104° wide, 96° tall; a 16:9 still shows its width */
const EYE_H = 52, EYE_V = 48;
const STILL_FOV = 2 * Math.atan(Math.tan(EYE_H * Math.PI / 180) * 9 / 16) * 180 / Math.PI;
const result = { run: RUN, build: BUILD, mode: MODE, input: INPUT, answer: ANSWER, eye: { h: EYE_H, v: EYE_V, stillFov: +STILL_FOV.toFixed(2) }, checks: [], stills: [], notes: [] };
const say = (m) => console.log(`[${RUN}] ${m}`);
const check = (id, what, ok, detail) => { result.checks.push({ id, what, ok: ok === null ? null : !!ok, detail }); say(`${ok === null ? 'n/a ' : ok ? 'PASS' : 'FAIL'} ${id} ${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };

// ── the page ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let browser, page, errors, view;
if (!ERA1) ({ browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: SHOTS ? 2 : 1, width: 1280, height: 720 }));
else {
  // 1997 (the harness boots 2016): the same headset mock, `?era=1`
  view = { width: 1280, height: 720 };
  browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
    defaultViewport: { ...view, deviceScaleFactor: SHOTS ? 2 : 1 } });
  page = await browser.newPage(); errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=1&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  // the review door's Log in (tools/xr-layer-review.mjs), then the room
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
  await page.waitForFunction(() => window.__app && window.__os && window.__teachingTv && window.__xrComfort, { timeout: 180000 });
  await wait(3000);
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    window.__aim = null;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(),
      getDirection: () => (window.__aim ? window.__aim.clone() : head.forward.clone()), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src);
    const w2s = head.camera.worldToScreen.bind(head.camera);
    head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
  // the 1997 desktop, awake (review aid: the armed call is itself a review aid; no beat of the visit makes it now)
  await page.evaluate(() => window.__os.debugJump('desktop'));
  await wait(2500);
}
const q = (fn, arg) => page.evaluate(fn, arg);
if (MODE === 'xr') await q((fov) => { const h = window.__app.root.findByName('camera'); h.camera.fov = fov; }, STILL_FOV);
/** the head at the seat, turned (physical yaw, pitch; the mock's head is the camera) */
//   (a turn about the vertical, then a tip about the head's own across: no roll)
const look = (yaw, pitch) => q(([y, p]) => { const h = window.__app.root.findByName('camera'), Q = h.getRotation().constructor;
  h.setLocalRotation(new Q().setFromEulerAngles(0, y, 0).mul(new Q().setFromEulerAngles(p, 0, 0))); }, [yaw, pitch]);
const shot = async (n, what) => {
  if (!SHOTS) return;
  // the headset mock's controller points down at the desk for a still (its hover ring would be drawn over whatever the head faces)
  //   (and a hand, after its press, is lowered to the lap: its ray down, its tips apart)
  if (MODE === 'xr') await q(() => { const h = window.__app.root.findByName('camera'); window.__aim = h.forward.clone().mulScalar(0.3).add(h.up.clone().mulScalar(-1)).normalize();
    const w = window.__hand; if (w) { const E = h.getPosition(); w.origin.copy(E).add(h.up.clone().mulScalar(-0.5)); w.dir.copy(window.__aim); w.tip.copy(w.origin).add(w.dir.clone().mulScalar(0.05)); w.thumb.copy(w.tip).add(h.right.clone().mulScalar(0.06)); } });
  await ff(page, 0.2); await wait(900);
  const file = `${n}_${what}_${RUN}_${BUILD}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) });
  const draws = await q(() => window.__drawCalls ?? null);
  result.stills.push({ file, draws });
  if (MODE === 'xr') await q(() => { window.__aim = null; });
  say(`still ${file} · draws ${draws}`);
};

// ── the inputs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const live = async () => targets(page, view);
const find = async (id) => (await live()).find((t) => t.id === id) ?? null;
/** a tracked hand: thumb and index tips, a ray (origin, direction), all in the presentation (physical) space */
const addHand = () => q(() => {
  const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
  const h = window.__hand = { origin: new V(), dir: new V(0, 0, -1), thumb: new V(), tip: new V() };
  const joint = (p) => ({ getPosition: () => p.clone() });
  const src = { targetRayMode: 'tracked-pointer', handedness: 'right', gamepad: null,
    hand: { tracking: true, wrist: null, fingers: undefined, joints: [], getJointById: (id) => id === 'thumb-tip' ? joint(h.thumb) : id === 'index-finger-tip' ? joint(h.tip) : null },
    getOrigin: () => h.origin.clone(), getDirection: () => h.dir.clone(), getPosition: () => h.origin.clone(), getRotation: () => head.getRotation().clone() };
  window.__handSrc = src; app.xr.input.fire('add', src);
});
const physicalOf = (w) => q((p) => { const c = window.__xrComfort, V = window.__app.root.getPosition().constructor; const o = c.physicalPoint(new V(...p)); return [o.x, o.y, o.z]; }, w);
/**
 * A HAND PINCH aimed at the target: the hand's ray from a shoulder point (12 cm right of the eye, 28 cm under it) through the target,
 * the tips 12 cm along it; open (50 mm), closed (10 mm), open — each held for two of the app's own frames, all in one go (the pinch's
 * hold-to-grab starts at 350 ms of real time; a quick pinch is a press)
 */
const pinch = (P) => q((P) => {
  const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor, h = window.__hand;
  const A = new V(...P), E = head.getPosition();
  h.origin.copy(E).add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.28));
  h.dir.copy(A).sub(h.origin).normalize();
  const tips = h.origin.clone().add(h.dir.clone().mulScalar(0.12)), down = head.up.clone().mulScalar(-1);
  const sep = (s) => { h.tip.copy(tips); h.thumb.copy(tips).add(down.clone().mulScalar(s)); };
  sep(0.05); app.update(0.1); app.update(0.1);
  sep(0.01); app.update(0.1); app.update(0.1);
  sep(0.05); app.update(0.1); app.update(0.1); app.update(0.1);
}, P);
/** A FINGERTIP TOUCH: the index tip from 8 cm before the target onto it (pointing along the eye's line to it), then away; thumb apart */
const touch = (P) => q((P) => {
  const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor, h = window.__hand;
  const A = new V(...P), E = head.getPosition(), d = A.clone().sub(E).normalize(), down = head.up.clone().mulScalar(-1);
  const tipAt = (p) => { h.tip.copy(p); h.thumb.copy(p).add(down.clone().mulScalar(0.06)); h.origin.copy(p).sub(d.clone().mulScalar(0.25)); h.dir.copy(d); };
  tipAt(A.clone().sub(d.clone().mulScalar(0.08))); app.update(0.1); app.update(0.1);
  tipAt(A.clone().add(d.clone().mulScalar(0.003))); app.update(0.1); app.update(0.1);
  tipAt(A.clone().sub(d.clone().mulScalar(0.08))); app.update(0.1); app.update(0.1); app.update(0.1);
}, P);
/** A CONTROLLER: its ray from the eye through the target's point on the screen; selectstart, select, selectend */
const ctl = (pt) => q(([px, py]) => {
  const app = window.__app, head = app.root.findByName('camera'), far = head.camera.screenToWorld(px, py, 5), o = head.getPosition();
  window.__aim = far.clone().sub(o).normalize();
  const c = window.__controller; app.xr.input.fire('selectstart', c); app.xr.input.fire('select', c); app.xr.input.fire('selectend', c);
  window.__aim = null;
}, pt);
/** the press under test on a published target, by the run's input */
async function pressBy(id, input = INPUT) {
  const t = await find(id);
  if (!t) return { ok: false, why: `${id} not published` };
  if (input === 'pinch' || input === 'touch') {
    if (!t.world) return { ok: false, why: `${id} has no world point` };
    const P = await physicalOf(t.world);
    await (input === 'pinch' ? pinch(P) : touch(P));
    return { ok: true, at: t.pt, surface: t.surface };
  }
  if (input === 'controller') await ctl(t.pt);
  else await routePress(page, view, id);
  await ff(page, 0.3);
  return { ok: true, at: t.pt, surface: t.surface };
}

// ── what the moment, the guide and the set are doing ────────────────────────────────────────────────────────────────────────────
const state = () => q(() => {
  const os = window.__os, g = os.lambyGuide, tvd = window.__teachingTv?.(), qq = window.__graceQueue?.();
  const tv = window.__teachingTv.inst(os.era === 'e1' ? '1997' : '2016');
  const counts = g?.counts ? { ...g.counts } : null;
  const lamby = (window.__ledger?.()?.lamby || []).filter((l) => /tvcall|guide:tv/.test(l.id)).map((l) => `${l.id}:${l.outcome}:${l.witness}`);
  return { era: os.era, rung: g?.view.rung, active: !!g?.active, text: g?.active ? g.view.text : null, counts, offersLeft: g?.offersLeft ? g.offersLeft(os.era) : null,
    card: !!tvd?.call?.shown, cardAt: tvd?.call?.at ?? null, glass: tvd?.call?.glass ?? null, moments: tvd?.moments,
    balloon: !!qq?.lambyGuidePaint?.balloon, box: qq?.lambyGuidePaint?.box ?? null, placed: qq?.lambyGuidePaint?.placed ?? null,
    tray: qq ? (qq.rects || []).find((r) => r.id === 'lg-tray') ?? null : null,
    lgRects: qq ? (qq.rects || []).filter((r) => r.id.startsWith('lg-')).map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })) : [],
    tv: { pose: tv.pose, state: tv.state, beside: tv.beside, fitted: tv.fitted, held: tv.held }, lamby,
    page: qq ? { mode: qq.mode, veraPage: qq.veraPage ?? null, job: qq.openSurface?.id ?? null } : null };
});
/** the card's (or the glass's) geometry from the eye: distance, angles, and the targets' size (headset) */
const cardGeo = () => q(() => {
  const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort, V = head.getPosition().constructor, tvd = window.__teachingTv();
  const E = head.getPosition();
  const card = app.root.findByName(tvd.call.entity); if (!card || !tvd.call.shown) return null;
  const isOn = (e) => { let n = e; while (n) { if (!n.enabled) return false; n = n.parent; } return true; };
  const ws = ['era3-device-workstation', 'desktop-screen'].map((n) => app.root.findByName(n)).find((e) => e && isOn(e)) ?? null;
  const dist = (w) => c.physicalPoint(w.clone()).distance(E);
  const m = card.getWorldTransform();
  const pt = (u, v) => { const o = new V(); m.transformPoint(new V(u - 0.5, 0, v - 0.5), o); return o; };
  const ang = (a, b) => { const pa = c.physicalPoint(a.clone()).sub(E).normalize(), pb = c.physicalPoint(b.clone()).sub(E).normalize(); return Math.acos(Math.max(-1, Math.min(1, pa.dot(pb)))) * 180 / Math.PI; };
  const hits = tvd.call.hits.map((h) => ({ id: h.id, wDeg: +ang(pt(h.x / tvd.call.cw, (h.y + h.h / 2) / tvd.call.ch), pt((h.x + h.w) / tvd.call.cw, (h.y + h.h / 2) / tvd.call.ch)).toFixed(2),
    hDeg: +ang(pt((h.x + h.w / 2) / tvd.call.cw, h.y / tvd.call.ch), pt((h.x + h.w / 2) / tvd.call.cw, (h.y + h.h) / tvd.call.ch)).toFixed(2) }));
  // the glass behind it, along the eye's line through the card's centre
  const cc = card.getPosition(), dir = c.physicalPoint(cc.clone()).sub(E).normalize();
  let glass = null;
  if (ws) { const n = ws.up.clone(), p0 = c.physicalPoint(ws.getPosition().clone()), pn = c.physicalPoint(ws.getPosition().clone().add(n)).sub(p0).normalize(); const t = p0.clone().sub(E).dot(pn) / dir.dot(pn); glass = t > 0 ? +t.toFixed(3) : null; }
  return { card: +dist(cc).toFixed(3), glassAlongLine: glass, glassName: ws?.name ?? null, hits };
});

/**
 * THE SET FROM THE SEAT (headset): its body (the rectangle under its ears and tuft: glass, keys, deck), its whole BOUNDS (ears and tuft
 * included), its glass, the monitor's glass, the Handset Window (the workstation canvas's right column) and the calendar, as angles from
 * the eye at each head pose; in view = inside one Quest-like eye (±52° across, ±48° up and down); the source line's letter (the [n] line
 * burned into the v6 picture: 20 of its 720 rows, measured on the tape's own frame) in degrees and in this still's pixels.
 */
const setGeo = (poses) => q(([poses, EYE_H, EYE_V]) => {
  const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort, V = head.getPosition().constructor;
  const tv = window.__teachingTv.inst('2016'), root = tv.set.root, ws = app.root.findByName('era3-device-workstation'), cal = app.root.findByName('w_calendar');
  const at = (ent, x, y, z) => { const o = new V(); ent.getWorldTransform().transformPoint(new V(x, y, z), o); return c.physicalPoint(o); };
  const body = [[-0.26, 0], [0.26, 0], [0.26, 0.56], [-0.26, 0.56]].map(([x, y]) => at(root, x, y, 0.19));
  const whole = [[-0.4, 0], [0.4, 0], [0.4, 0.665], [-0.4, 0.665]].map(([x, y]) => at(root, x, y, 0.19));
  const glass = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, z]) => at(tv.entity, x, 0, z));
  const glassGrid = []; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) glassGrid.push(at(tv.entity, i / 10 - 0.5, 0, j / 10 - 0.5));
  const mon = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, z]) => at(ws, x, 0, z));
  const hw0 = (676 - 200) / 676 - 0.5;
  const handset = [[hw0, -0.5], [0.5, -0.5], [0.5, 0.5], [hw0, 0.5]].map(([x, z]) => at(ws, x, 0, z));
  let calendar = null;
  if (cal) {
    // the calendar is a model: its meshes are on its children; their boxes together, the face it shows the room (it hangs on the west
    //   wall, facing east: its quad is the box's x = max face's y/z extent)
    let lo = null, hi = null;
    cal.forEach((n) => { for (const mi of n.render?.meshInstances ?? []) { const ab = mi.aabb, mn = ab.getMin(), mx = ab.getMax();
      lo = lo ? new V(Math.min(lo.x, mn.x), Math.min(lo.y, mn.y), Math.min(lo.z, mn.z)) : mn.clone(); hi = hi ? new V(Math.max(hi.x, mx.x), Math.max(hi.y, mx.y), Math.max(hi.z, mx.z)) : mx.clone(); } });
    if (lo && hi) calendar = [[lo.y, lo.z], [lo.y, hi.z], [hi.y, hi.z], [hi.y, lo.z]].map(([y, z]) => c.physicalPoint(new V(hi.x, y, z)));
  }
  // the glass's height as an angle from the eye (its top-centre to its bottom-centre), whatever way the head points
  const E0 = head.getPosition().clone();
  const gTop = at(tv.entity, 0, 0, -0.5), gBot = at(tv.entity, 0, 0, 0.5);
  const glassTrueDeg = Math.acos(Math.max(-1, Math.min(1, gTop.clone().sub(E0).normalize().dot(gBot.clone().sub(E0).normalize())))) * 180 / Math.PI;
  const out = [];
  const keep = head.getLocalRotation().clone(), Q = keep.constructor;
  const tx = Math.tan(EYE_H * Math.PI / 180), ty = Math.tan(EYE_V * Math.PI / 180);
  for (const [yaw, pitch, name] of poses) {
    head.setLocalRotation(new Q().setFromEulerAngles(0, yaw, 0).mul(new Q().setFromEulerAngles(pitch, 0, 0)));
    const E = head.getPosition(), f = head.forward, u = head.up, r = head.right;
    // a rectilinear eye: tangent space (straight lines stay straight, so a polygon test there is exact for points in front)
    const tan = (p) => { const v = p.clone().sub(E), z = v.dot(f); return { x: v.dot(r) / z, y: v.dot(u) / z, z }; };
    const inEye = (pts) => pts.map(tan).every((p) => p.z > 0.05 && Math.abs(p.x) <= tx && Math.abs(p.y) <= ty);
    const deg = (pts) => { const a = pts.map(tan); const hs = a.map((p) => Math.atan(p.x) * 180 / Math.PI), vs = a.map((p) => Math.atan(p.y) * 180 / Math.PI);
      return { h0: +Math.min(...hs).toFixed(1), h1: +Math.max(...hs).toFixed(1), v0: +Math.min(...vs).toFixed(1), v1: +Math.max(...vs).toFixed(1) }; };
    // two convex quads overlap in the view (separating axes)
    const overlap = (A, B) => {
      if (!A || !B) return false;
      const a = A.map(tan), b = B.map(tan);
      if (a.some((p) => p.z <= 0.05) || b.some((p) => p.z <= 0.05)) return false;
      for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q2 = poly[(i + 1) % poly.length], nx = q2.y - p.y, ny = p.x - q2.x;
        const pa = a.map((v) => v.x * nx + v.y * ny), pb = b.map((v) => v.x * nx + v.y * ny);
        if (Math.max(...pa) < Math.min(...pb) - 1e-4 || Math.max(...pb) < Math.min(...pa) - 1e-4) return false;
      }
      return true;
    };
    const glassShare = glassGrid.filter((p) => inEye([p])).length / glassGrid.length;
    const sc = glass.map((p) => head.camera.worldToScreen(c.logicalPoint ? c.logicalPoint(p.clone()) : p));
    const glassPx = Math.max(...sc.map((v) => v.y)) - Math.min(...sc.map((v) => v.y));
    const W = deg(whole), M = deg(mon);
    out.push({ pose: name, yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), whole: W, monitor: M, glass: deg(glass), handset: deg(handset), calendar: calendar ? deg(calendar) : null,
      bodyInEye: inEye(body), wholeInEye: inEye(whole), glassInEye: inEye(glass), glassShareInEye: +glassShare.toFixed(2), monitorInEye: inEye(mon),
      overHandset: overlap(whole, handset), overCalendar: overlap(whole, calendar), overMonitorGlass: overlap(whole, mon),
      leftOfMonitor: (W.h0 + W.h1) / 2 < M.h0, heightGap: +((() => { const g = deg(glass); return (g.v0 + g.v1) / 2 - (M.v0 + M.v1) / 2; })()).toFixed(1),
      sourceCapStillPx: +(glassPx * 20 / 720 * (window.devicePixelRatio || 1)).toFixed(1) });
  }
  head.setLocalRotation(keep);
  // the monitor's own body text (the board's 11 px lines: tall letters ~8 of its 390 canvas rows), as an angle from the eye
  const mTop = at(ws, 0, 0, -0.5), mBot = at(ws, 0, 0, 0.5);
  const monTrueDeg = Math.acos(Math.max(-1, Math.min(1, mTop.clone().sub(E0).normalize().dot(mBot.clone().sub(E0).normalize())))) * 180 / Math.PI;
  return { poses: out, calendarFound: !!calendar, glassTrueDeg: +glassTrueDeg.toFixed(2), sourceCapDeg: +(glassTrueDeg * 20 / 720).toFixed(3), captionCapDeg: +(glassTrueDeg * 23 / 720).toFixed(3),
    monitorTextCapDeg: +(monTrueDeg * 8 / 390).toFixed(3), fitted: tv.fitted };
}, [poses, EYE_H, EYE_V]);
/** a flat look (computer, phone): the set's glass and the monitor's glass on the screen, and the Handset Window and the calendar */
const flatGeo = () => q(() => {
  const app = window.__app; let camE = null; app.root.forEach((e) => { if (e.camera && e.enabled) camE = e; });
  const V = app.root.getPosition().constructor;
  const proj = (ent, pts) => { const m = ent.getWorldTransform(); return pts.map(([x, y, z]) => { const o = new V(); m.transformPoint(new V(x, y, z), o); const s = camE.camera.worldToScreen(o); return [s.x, s.y]; }); };
  const box = (p) => ({ x0: Math.round(Math.min(...p.map((q) => q[0]))), x1: Math.round(Math.max(...p.map((q) => q[0]))), y0: Math.round(Math.min(...p.map((q) => q[1]))), y1: Math.round(Math.max(...p.map((q) => q[1]))) });
  const ws = app.root.findByName('era3-device-workstation'), tv = window.__teachingTv.inst('2016');
  const sq = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const M = box(proj(ws, sq)), G = box(proj(tv.entity, sq)), Wb = box(proj(tv.set.root, [[-0.4, 0, 0.19], [0.4, 0, 0.19], [0.4, 0.665, 0.19], [-0.4, 0.665, 0.19]]));
  const hw0 = (676 - 200) / 676 - 0.5, HW = box(proj(ws, [[hw0, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [hw0, 0, 0.5]]));
  const meets = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const gd = app.graphicsDevice;
  return { monitor: M, glass: G, set: Wb, handset: HW, ratio: +((G.x1 - G.x0) / Math.max(1, M.x1 - M.x0)).toFixed(3), overMonitorGlass: meets(Wb, M), overHandset: meets(Wb, HW),
    sourceCapStillPx: +((G.y1 - G.y0) * 20 / 720 * (window.devicePixelRatio || 1)).toFixed(1), screen: [gd.width, gd.height], fitted: tv.fitted };
});

// ── 2016: to the offer ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const OFFER = 'Session Two of Heartwood';
let countsBefore = null;
if (!ERA1) {
  // Lesson 1 done and back at the board (Lesson 2 not opened: the offer is not made once it is)
  let reached = await playTo(page, view, (s) => !!s?.guide?.text?.startsWith(OFFER) || (s?.lessons?.[0] === 'done' && s.mode === 'board' && !s.job && !s.page && !s.week),
    { limit: 200, log: (m) => say(m), heartwood: 'none' });
  // then the offer comes once the Mentor's message has landed and had its reading time, the board at rest (as the walker waits, ≤ 60 s);
  //   a message waiting on the phone is opened as a visitor opens it (its banner or its card), a balloon of Lambient's put away first
  for (let i = 0; i < 120 && !reached?.guide?.text?.startsWith(OFFER); i++) {
    const tg = new Set((await live()).map((t) => t.id));
    if (reached?.guide?.balloon && !reached.guide.text?.startsWith(OFFER)) { for (const id of ['lg-ok', 'lg-later', 'lg-x']) if (tg.has(id)) { await routePress(page, view, id); break; } }
    await ff(page, 0.5);
    reached = await e3(page);
  }
  // the eight: what was said before the offer (the guide's count for 2016 as the offer came; the offer adds one)
  const st = await state();
  result.atOffer = st;
  if (!st.text?.startsWith(OFFER)) { check('reach', 'the 2016 offer was reached by presses', false, { e3: reached?.chain, lessons: reached?.lessons, text: st.text }); }
  else {
    check('reach', 'the 2016 offer was reached by presses', true, { lessons: reached.lessons, page: st.page });
    // ── C1: Lambient's own balloon on the monitor, from its taskbar button ──
    const onGlass = st.balloon && st.rung === 'tvcall' && !st.card;
    check('C1-glass', "the offer is Lambient's balloon on the monitor (no card in the room)", BUILD === 'before' ? null : onGlass, { balloon: st.balloon, card: st.card, rung: st.rung, box: st.box });
    if (st.box && st.tray) {
      const tailFromTray = st.tray.x < st.box.x + st.box.w && st.tray.x + st.tray.w > st.box.x && st.box.y + st.box.h <= st.tray.y;
      check('C1-tray', "its tail comes from Lambient's taskbar button (the balloon stands over it)", tailFromTray, { tray: st.tray, box: st.box });
    }
    const lg = Object.fromEntries(st.lgRects.map((r) => [r.id, r]));
    check('C1-buttons', 'Bring it · Not now drawn and pressable on the glass', BUILD === 'before' ? null : !!(lg['lg-take'] && lg['lg-later']), st.lgRects);
    // the box rules (job 38): never over a button of the page; whole rows only is checked on the stills by eye
    if (st.box) {
      const over = await q((b) => { const qq = window.__graceQueue(); return (qq.rects || []).filter((r) => !r.id.startsWith('lg-') && !r.id.startsWith('mirror') && r.w * r.h <= 6000 && r.h <= 40
        && r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h + 6 && r.y + r.h > b.y).map((r) => r.id); }, st.box);
      check('C1-keepout', 'the balloon lies over no button of the page', over.length === 0, { over, placed: st.placed });
    }
    // the eight: counted once (the cap is 8; what is left now)
    check('C1-eight', "the offer counted in Lambient's eight for 2016", (st.counts?.e3 ?? 0) >= 1 && st.offersLeft === 8 - (st.counts?.e3 ?? 0), { counts: st.counts, offersLeft: st.offersLeft });
    if (MODE === 'xr') { await look(0, -10); }
    await shot('01', 'offer');
    if (MODE === 'xr' && st.card) result.cardBefore = await cardGeo();
  }
}

// ── 1997: the floating card, armed (no beat of the visit calls it any more) ─────────────────────────────────────────────────────
if (ERA1) {
  await q(() => window.__teachingTv.arm('1997'));
  let shown = false;
  for (let i = 0; i < 300 && !shown; i++) { await ff(page, 0.2); shown = await q(() => !!window.__teachingTv().call.shown); }
  const st = await state();
  result.atOffer = st;
  check('reach', "1997's call card (armed) is up", shown, { text: st.text, rung: st.rung });
  if (shown) {
    await look(0, -10);
    const g = await cardGeo();
    result.card = g;
    check('C2-depth', 'the card stands in front of the monitor glass (nearer than the glass on its line)', g && g.glassAlongLine ? g.card < g.glassAlongLine : null, g);
    check('C2-size', 'its buttons are at least 4.5° tall from the eye', g ? g.hits.filter((h) => h.id !== 'lg-x').every((h) => h.hDeg >= 4.5) : false, g?.hits);
    await shot('01', 'card97');
  }
}

// ── the press under test ────────────────────────────────────────────────────────────────────────────────────────────────────────
if (result.checks.find((c) => c.id === 'reach')?.ok && RUN !== 'xr-letgo') {
  if (INPUT === 'pinch' || INPUT === 'touch') await addHand();
  const before = await state();
  const id = `${ANSWER}@call`;
  const pr = await pressBy(id);
  await ff(page, 1.5);
  const after = await state();
  result.press = { id, ...pr, before: { rung: before.rung, active: before.active, lamby: before.lamby }, after: { rung: after.rung, active: after.active, lamby: after.lamby, moments: after.moments, tv: after.tv } };
  const tape = ERA1 ? '1997' : '2016';
  const answer = after.moments?.[tape]?.answer;
  const newLamby = after.lamby.filter((l) => !before.lamby.includes(l));
  if (ANSWER === 'lg-take') {
    check('press', `${INPUT}: ${ERA1 ? 'Bring it here' : 'Bring it'} took the press`, pr.ok && newLamby.some((l) => /guide:tvcall:begun/.test(l)) && (ERA1 ? true : answer === 'brought'), { press: pr, newLamby, answer, stage: after.moments?.[tape]?.stage });
  } else {
    const kind = ANSWER === 'lg-x' ? '×' : 'Not now';
    check('press', `${INPUT}: ${kind} took the press`, pr.ok && newLamby.some((l) => /guide:tvcall:dismissed/.test(l)) && (ERA1 ? true : answer === 'declined'), { press: pr, newLamby, answer });
    check('quiet', 'nothing came: the set stays at rest', ERA1 ? null : after.tv.pose === 'rest', after.tv);
  }
  if (ANSWER === 'lg-take' && !ERA1) {
    // the set arrives (≤ 1.15 s travel); then measured from the seat
    for (let i = 0; i < 20; i++) { const s = await state(); if (s.tv.pose === 'held') break; await ff(page, 0.3); }
    const s2 = await state();
    check('arrive', 'the set has come (held, stopped on its label: nothing plays)', s2.tv.pose === 'held' && s2.tv.state !== 'playing', s2.tv);
    // the tape at a moment with a source line (t = 30 s: "[3] The Heart of the Matter …"), paused: the picture the measure reads
    await q(() => { window.__teachingTv.play('2016', 30.0); }); await ff(page, 0.6); await wait(1200); await ff(page, 0.4);
    await q(() => window.__teachingTv.inst('2016').pause('visitor')); await ff(page, 0.3);
    if (MODE === 'xr') {
      // the seat's poses: the mock's straight look, and the look at the monitor's centre, at pitches 20° down … 5° up
      // the monitor's centre as seen from the head's straight look (yaw 0, pitch 0): a turn to the left is a positive yaw
      const facing = await q(() => { const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort; const keep = head.getLocalRotation().clone(); head.setLocalEulerAngles(0, 0, 0);
        const E = head.getPosition(), M = c.physicalPoint(app.root.findByName('era3-device-workstation').getPosition().clone()).sub(E), z = M.dot(head.forward);
        const out = { yaw: -Math.atan2(M.dot(head.right), z) * 180 / Math.PI, pitch: Math.atan2(M.dot(head.up), Math.hypot(z, M.dot(head.right))) * 180 / Math.PI };
        head.setLocalRotation(keep); return out; });
      const fittedNow = (await state()).tv.fitted;
      const turn = fittedNow?.headTurn ?? 20;
      const poses = [[0, -20, 'seat −20'], [0, -10, 'seat −10'], [0, 0, 'seat 0'], [0, 5, 'seat +5'], [facing.yaw, facing.pitch, 'monitor centre']];
      for (const p of [-10, 0, 10, 15]) poses.push([facing.yaw + turn, facing.pitch + p, `turned ${turn}° to the set, pitch ${(facing.pitch + p).toFixed(0)}`]);
      const G = await setGeo(poses);
      const geo = G.poses;
      result.setGeo = G; result.facing = facing;
      const seat = geo.filter((g) => g.pose.startsWith('seat') || g.pose === 'monitor centre');
      const turned = geo.filter((g) => g.pose.startsWith('turned'));
      check('C3-left', 'it stands beside the monitor, on the side away from the Handset Window (left), never over its glass', geo.every((g) => g.leftOfMonitor && !g.overMonitorGlass), geo.map((g) => ({ pose: g.pose, whole: g.whole, monitor: g.monitor, over: g.overMonitorGlass })));
      check('C3-height', "at the monitor's height (its glass centre within 3° of the monitor glass's centre)", seat.every((g) => Math.abs(g.heightGap) <= 3), seat.map((g) => g.heightGap));
      check('C3-clear', 'nothing of it over the Handset Window or the calendar', G.calendarFound && geo.every((g) => !g.overHandset && !g.overCalendar), geo.map((g) => ({ pose: g.pose, handset: g.overHandset, calendar: g.overCalendar })));
      check('C3-inview', `the set (ears and tuft included) and the whole monitor in one Quest-like eye, the head turned ${turn}° toward it (pitches 10° under the monitor's … 15° over it)`, turned.every((g) => g.wholeInEye && g.monitorInEye),
        turned.map((g) => ({ pose: g.pose, whole: g.wholeInEye, monitor: g.monitorInEye })));
      check('C3-seat', 'from the seat\'s straight look: how much of its glass is in the eye (measured, not passed or failed)', null, seat.map((g) => ({ pose: g.pose, glassShare: g.glassShareInEye, body: g.bodyInEye, monitor: g.monitorInEye })));
      check('C3-read', 'its source line and captions, from the seat (degrees; × 25 px/° at a Quest 3 lens centre), beside the monitor\'s own text', null,
        { glassOfMonitor: G.fitted?.glassOfMonitor, glassDeg: G.glassTrueDeg, sourceCapDeg: G.sourceCapDeg, sourceCapQuestPx: +(G.sourceCapDeg * 25).toFixed(1), captionCapDeg: G.captionCapDeg,
          monitorTextCapDeg: G.monitorTextCapDeg, sourceCapStillPx: geo.find((g) => g.pose === 'monitor centre')?.sourceCapStillPx });
      await look(0, -10); await shot('02', 'set-beside');
      await look(facing.yaw + turn, facing.pitch); await shot('02b', 'set-beside-turned');
      await look(0, -10);
    } else {
      // ⚑ S435 (UiB job 40 C3) — on a phone the view is taken to the set beside the monitor (a conducted turn): measured once it rests
      //   (tools/s435-probe.mjs measures the phone and the tablets frame by frame, precisely)
      if (MODE === 'phone') for (let i = 0; i < 120 && (await q(() => !!window.__camPose?.().driven)); i++) await ff(page, 0.1);
      const g = await flatGeo();
      result.flatGeo = g;
      if (MODE === 'phone') check('C3-flat', 'phone (S435): the set to the LEFT of the monitor, the view taken to it; never over the Handset Window', g.fitted?.band === 'left' && !g.overHandset && g.set.x0 >= 0 && g.set.x1 <= view.width, g);
      else check('C3-flat', 'computer: the set where it stood before this job (S424/S425: beside, never over the monitor or the Handset Window)', !g.overMonitorGlass && !g.overHandset, g);
      await shot('02', 'set-beside');
    }
    // ── C4: she continues — a lesson opens: the set goes back ──
    const before4 = await state();
    // ⚑ S435 — on a phone the view is at the set: she drags back to the monitor (a touch drag to the right turns the view right) first
    if (MODE === 'phone') for (let i = 0; i < 6; i++) {
      const t = await find('task-1'); if (t && t.pt[0] >= 4 && t.pt[0] <= view.width - 4) break;
      await page.touchscreen.touchStart(view.width * 0.2, view.height * 0.75);
      for (let j = 1; j <= 8; j++) { await page.touchscreen.touchMove(view.width * 0.2 + j * 15, view.height * 0.75); await wait(30); }
      await page.touchscreen.touchEnd(); await ff(page, 0.2);
    }
    const opened = await (async () => { for (const id of ['task-1', 'task-0']) { const t = await find(id); if (t) { if (MODE === 'xr' && INPUT !== 'controller') await routePress(page, view, id); else await routePress(page, view, id); return id; } } return null; })();
    await ff(page, 2.5);
    const after4 = await state();
    check('C4-back', 'a lesson opens: the set goes back to its place', !!opened && after4.page?.mode === 'list' && (after4.tv.pose === 'rest' || after4.tv.pose === 'returning'),
      { opened, page: after4.page, tv: after4.tv, before: before4.tv.pose });
    if (MODE === 'xr') await look(0, -10);
    await shot('03', 'set-back-after-lesson');
    if (MODE === 'xr') { await look(95, -18); await shot('03b', 'set-at-the-door'); await look(0, -10); }
  }
  if (ERA1 && ANSWER === 'lg-take') {
    for (let i = 0; i < 20; i++) { const s = await state(); if (s.tv.pose === 'held') break; await ff(page, 0.3); }
    const s2 = await state();
    check('arrive', "1997's set comes to the eye on the card's yes", s2.tv.pose === 'held' || s2.tv.pose === 'lifting', s2.tv);
  }
}

// ── the let-go: the offer left alone ────────────────────────────────────────────────────────────────────────────────────────────
if (RUN === 'xr-letgo' && result.checks.find((c) => c.id === 'reach')?.ok) {
  const before = await state();
  // (the offer came a moment before the goal was seen: 12 s more is under its 16 s for certain)
  await ff(page, 12.0);
  const mid = await state();
  check('letgo-holds', '12 s on, the offer is still up (its patience is 16 s)', mid.rung === 'tvcall' && mid.active, { rung: mid.rung, active: mid.active, moment: mid.moments?.['2016'] });
  await ff(page, 6.0);
  const after = await state();
  const newLamby = after.lamby.filter((l) => !before.lamby.includes(l));
  check('letgo', "left alone, the balloon closes quietly and the moment ends as let go", after.moments?.['2016']?.answer === 'let-go' && !after.active && !after.balloon, { answer: after.moments?.['2016']?.answer, active: after.active, balloon: after.balloon });
  check('letgo-log', 'the let-go is logged', BUILD === 'before' ? null : newLamby.some((l) => /guide:tvcall:let-go/.test(l)), newLamby);
  check('letgo-rest', 'nothing came: the set stays at rest', after.tv.pose === 'rest', after.tv);
  if (MODE === 'xr') await look(0, -10);
  await shot('04', 'after-letgo');
}

result.draws = await q(() => window.__drawCalls ?? null);
result.errors = errors;
const file = path.join(OUT, `s431_${RUN}_${BUILD}.json`);
fs.writeFileSync(file, JSON.stringify(result, null, 1));
const fails = result.checks.filter((c) => c.ok === false).length, passes = result.checks.filter((c) => c.ok === true).length;
say(`done · ${passes} PASS · ${fails} FAIL · draws ${result.draws} · errors ${errors.length} · ${file}`);
await Promise.race([browser.close(), wait(6000)]);
process.exit(0);
