#!/usr/bin/env node
/**
 * ⚑ S435 (UiB job 40 Part C, item 3; his 27 Nov on job 39's call 2: "Even if this is on a tablet or a phone, leave it on the side,
 * that way the image gets to be bigger") — 2016'S SET ON A PHONE AND A TABLET, BESIDE THE MONITOR, PROVED ON TAPS.
 *
 *     node tools/s435-probe.mjs --port 5833 --run <name> --out <dir> [--shots <dir>] [--build before|after]
 *
 * 2016 is played by taps to Lambient's Heartwood offer (tools/harness/e3-route.mjs `playTo`, the fiction's own times through the
 * app's own update loop); Bring it is TAPPED on the monitor; then the app's clock is frozen (`timeScale` 0: the real-time loop
 * only draws) and driven in 0.1 s frames, so the turn and the set's travel are sampled frame by frame and photographed where they
 * are. Measured from the seat, on the screen (CSS px of the page; the app draws at ≤ 2× and a still is the page's own device px):
 * the set (its whole body, ears and tuft included), its glass, the monitor's glass, the Handset Window (the glass's right
 * column), the calendar on the wall, the top row ("Look with your device"); whether each is whole in the view and which overlap;
 * the source line under the slide ([n] …, 20 of the picture's 720 rows) and the monitor's own body text (8 of its 390 rows).
 * Then the set's keys are TAPPED (▶ ❚❚ ⏏) and its ⏻ (or a lesson) sends it back: the way back is sampled the same way.
 * Runs (each a page of its own):
 *   phone · tablet · tablet-land · phone-land · tablet-wide — the shapes: 390 × 844 at 3× (1170 × 2532), 1024 × 1366 at 2×
 *                  (2048 × 2732), 1366 × 1024 at 2× (2732 × 2048), 844 × 390 at 3×, 1280 × 800 at 2× (a 16:10 tablet sideways); ⏻ back
 *   phone-lesson   — the upright phone; the way back is a lesson opening (S431's putBack): she drags back to the monitor, taps Lesson 2
 *   phone-gyro     — the upright phone with the device's own look live (real `deviceorientation` events, the shipping listener):
 *                    the turn composes with the device's heading; Recentre (the menu's) while the set is out; ⏻ back
 *   phone-recentre — the upright phone, drag-to-look: Recentre (the menu's) while the set is out, then ⏻ back
 *   desktop        — the computer (2560 × 1440), for the record that it is unchanged
 * Writes <out>/s435_<run>_<build>.json; with --shots the stills at the shape's own device size.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, press as routePress, targets, playTo, e3, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const RUN = flag('run', 'phone');
const BUILD = flag('build', 'after');
const OUT = path.resolve(flag('out', 'out/s435'));
const SHOTS = flag('shots', null) ? path.resolve(flag('shots')) : null;
fs.mkdirSync(OUT, { recursive: true }); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SHAPES = {
  phone: { width: 390, height: 844, dsf: 3 },
  'phone-land': { width: 844, height: 390, dsf: 3 },
  tablet: { width: 1024, height: 1366, dsf: 2, ua: IPAD_UA },
  'tablet-land': { width: 1366, height: 1024, dsf: 2, ua: IPAD_UA },
  'tablet-wide': { width: 1280, height: 800, dsf: 2, ua: IPAD_UA }   // a 16:10 tablet held sideways (2560 × 1600)
};
const SHAPE = RUN === 'desktop' ? null : SHAPES[RUN] ?? SHAPES.phone;
const GYRO = RUN === 'phone-gyro';
const result = { run: RUN, build: BUILD, shape: SHAPE ?? { width: 1280, height: 720, dsf: 2 }, checks: [], stills: [], frames: { there: [], back: [] }, notes: [] };
const say = (m) => console.log(`[${RUN}] ${m}`);
const check = (id, what, ok, detail) => { result.checks.push({ id, what, ok: ok === null ? null : !!ok, detail }); say(`${ok === null ? 'n/a ' : ok ? 'PASS' : 'FAIL'} ${id} ${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };

const { browser, page, errors, view } = await launch(PORT, SHAPE ? { mode: 'phone', touch: SHAPE } : { mode: 'desktop', scale: SHOTS ? 2 : 1, width: 1280, height: 720 });
const q = (fn, arg) => page.evaluate(fn, arg);

// ── the measures (page side) ─────────────────────────────────────────────────────────────────────────────────────────────────────
const INSTALL = () => {
  const app = window.__app, V = app.root.getPosition().constructor;
  const S = window.__s435 = {};
  const cam = () => { let c = null; app.root.forEach((e) => { if (!c && e.camera && e.enabled && e.name === 'camera') c = e; }); if (!c) app.root.forEach((e) => { if (!c && e.camera && e.enabled) c = e; }); return c; };
  /** the view's own facing (the camera's world forward: the rig and, under the gyro, the device on it) */
  S.facing = () => { const f = cam().forward; return { yaw: +(Math.atan2(-f.x, -f.z) * 180 / Math.PI).toFixed(2), pitch: +(Math.asin(Math.max(-1, Math.min(1, f.y))) * 180 / Math.PI).toFixed(2) }; };
  S.geo = () => {
    const c = cam(), el = app.graphicsDevice.canvas, W = el.clientWidth, H = el.clientHeight;
    const E = c.getPosition(), F = c.forward;
    // the projection from the camera's own world transform now (the engine's view matrix is the last DRAWN frame's, and with the
    //   clock frozen and driven frame by frame no frame may have been drawn since the last step)
    const M4 = c.getWorldTransform().constructor, view = new M4().copy(c.getWorldTransform()).invert(), vp = new M4().mul2(c.camera.projectionMatrix, view);
    const pt = (w) => { const o = new V(); vp.transformPoint(w, o); const d = vp.data, ww = d[3] * w.x + d[7] * w.y + d[11] * w.z + d[15];
      const nx = o.x / ww, ny = o.y / ww; return { x: (nx + 1) / 2 * W, y: (1 - ny) / 2 * H, front: w.clone().sub(E).dot(F) > 0.05 }; };
    const local = (ent, pts) => { const m = ent.getWorldTransform(); return pts.map(([x, y, z]) => { const o = new V(); m.transformPoint(new V(x, y, z), o); return pt(o); }); };
    const box = (p) => p && ({ x0: Math.round(Math.min(...p.map((a) => a.x))), x1: Math.round(Math.max(...p.map((a) => a.x))), y0: Math.round(Math.min(...p.map((a) => a.y))), y1: Math.round(Math.max(...p.map((a) => a.y))) });
    const ws = app.root.findByName('era3-device-workstation'), tv = window.__teachingTv.inst('2016');
    const sq = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
    const monitor = local(ws, sq), glass = local(tv.entity, sq);
    const set = local(tv.set.root, [[-0.4, 0, 0.19], [0.4, 0, 0.19], [0.4, 0.665, 0.19], [-0.4, 0.665, 0.19]]);
    const hw0 = (676 - 200) / 676 - 0.5, handset = local(ws, [[hw0, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [hw0, 0, 0.5]]);
    // the calendar: its meshes' boxes together, the face it shows the room (S431: it hangs on the west wall facing east, x = max)
    let calendar = null; const cal = app.root.findByName('w_calendar');
    if (cal) { let lo = null, hi = null; cal.forEach((n) => { for (const mi of n.render?.meshInstances ?? []) { const ab = mi.aabb, mn = ab.getMin(), mx = ab.getMax();
      lo = lo ? new V(Math.min(lo.x, mn.x), Math.min(lo.y, mn.y), Math.min(lo.z, mn.z)) : mn.clone(); hi = hi ? new V(Math.max(hi.x, mx.x), Math.max(hi.y, mx.y), Math.max(hi.z, mx.z)) : mx.clone(); } });
      if (lo && hi) calendar = [[lo.y, lo.z], [lo.y, hi.z], [hi.y, hi.z], [hi.y, lo.z]].map(([y, z]) => pt(new V(hi.x, y, z))); }
    // the frame's own row at the top of a phone's screen (the device-look button), when it is shown
    const btn = [...document.querySelectorAll('button')].find((b) => /device/i.test(b.textContent || '') && getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden' && b.getBoundingClientRect().width > 0);
    const row = btn ? (() => { const r = btn.getBoundingClientRect(); return { x0: Math.round(r.left), x1: Math.round(r.right), y0: Math.round(r.top), y1: Math.round(r.bottom), text: btn.textContent }; })() : null;
    const inView = (p) => !!p && p.every((a) => a.front && a.x >= -0.5 && a.x <= W + 0.5 && a.y >= -0.5 && a.y <= H + 0.5);
    const share = (p) => { if (!p || p.some((a) => !a.front)) return 0; const b = box(p); const ix = Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0)), iy = Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0)); return +((ix * iy) / Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0))).toFixed(2); };
    // two convex quads on the screen overlap (separating axes); a quad with a point behind the eye is not drawn there
    const overlap = (A, B) => {
      if (!A || !B || A.some((a) => !a.front) || B.some((b) => !b.front)) return false;
      for (const poly of [A, B]) for (let i = 0; i < poly.length; i++) {
        const p = poly[i], p2 = poly[(i + 1) % poly.length], nx = p2.y - p.y, ny = p.x - p2.x;
        const pa = A.map((v) => v.x * nx + v.y * ny), pb = B.map((v) => v.x * nx + v.y * ny);
        if (Math.max(...pa) < Math.min(...pb) - 0.5 || Math.max(...pb) < Math.min(...pa) - 0.5) return false;
      }
      return true;
    };
    const rowQuad = row ? [{ x: row.x0, y: row.y0, front: true }, { x: row.x1, y: row.y0, front: true }, { x: row.x1, y: row.y1, front: true }, { x: row.x0, y: row.y1, front: true }] : null;
    const G = box(glass), M = box(monitor), Sb = box(set);
    const dpr = window.devicePixelRatio || 1, drawn = app.graphicsDevice.width / Math.max(1, W);
    const glassH = Math.hypot(glass[3].x - glass[0].x, glass[3].y - glass[0].y), monH = Math.hypot(monitor[3].x - monitor[0].x, monitor[3].y - monitor[0].y);
    const cssCap = glassH * 20 / 720, monCap = monH * 8 / 390;
    return { view: [W, H], drawnPerCss: +drawn.toFixed(2), dpr, facing: S.facing(), monitor: M, glass: G, set: Sb, handset: box(handset), calendar: box(calendar), row,
      setInView: inView(set), setShare: share(set), monitorInView: inView(monitor), monitorShare: share(monitor), glassInView: inView(glass),
      overMonitorGlass: overlap(set, monitor), overHandset: overlap(set, handset), overCalendar: overlap(set, calendar), overRow: overlap(set, rowQuad), calendarFound: !!calendar,
      leftOfMonitor: (Sb.x0 + Sb.x1) / 2 < M.x0, glassOfMonitor: +((G.x1 - G.x0) / Math.max(1, M.x1 - M.x0)).toFixed(3), glassOfViewW: +((G.x1 - G.x0) / W).toFixed(3),
      setCentre: [Math.round((Sb.x0 + Sb.x1) / 2), Math.round((Sb.y0 + Sb.y1) / 2)],
      sourceCap: { css: +cssCap.toFixed(1), drawn: +(cssCap * drawn).toFixed(1), still: +(cssCap * dpr).toFixed(1) },
      monitorTextCap: { css: +monCap.toFixed(1), drawn: +(monCap * drawn).toFixed(1), still: +(monCap * dpr).toFixed(1) },
      fitted: tv.fitted };
  };
  S.tv = () => { const tv = window.__teachingTv.inst('2016'); return { pose: tv.pose, state: tv.state, beside: tv.beside, fitted: tv.fitted, held: tv.held }; };
  S.cam = () => { const p = window.__camPose(); return { yaw: +(p.yaw + (p.lookYaw || 0)).toFixed(2), pitch: +(p.pitch + (p.lookPitch || 0)).toFixed(2), driven: p.driven, conducted: p.conducted, dur: +p.dur.toFixed(2), t: +p.t.toFixed(2) }; };
  /** one frame of the app's own clock, and what it is doing */
  S.frame = (dt) => { app.update(dt); return { cam: S.cam(), view: S.facing(), tv: S.tv() }; };
};

// ── the device's own look (phone-gyro): the shipping listener, real events with angles the probe sets ──────────────────────────
async function gyroOn() {
  const btn = await q(() => { const b = [...document.querySelectorAll('button')].find((x) => /device/i.test(x.textContent || '')); if (!b) return null; b.click(); return b.textContent; });
  await q(() => { window.__gyro = { alpha: 0, beta: 90, gamma: 0 }; clearInterval(window.__gyroId);
    window.__gyroId = setInterval(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { ...window.__gyro })), 40); });
  await wait(800);
  return { button: btn, motion: await q(() => window.__motion?.() ?? null) };
}
const gyroTo = (alpha) => q((a) => { window.__gyro.alpha = a; }, alpha);

// ── stills ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const shot = async (n, what) => {
  const draws = await q(() => window.__drawCalls ?? null);
  if (!SHOTS) { result.stills.push({ n, what, draws }); return; }
  await wait(700);   // the real-time loop draws (its clock frozen: nothing moves)
  const file = `${n}_${what}_${RUN}_${BUILD}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) });
  result.stills.push({ file, draws: await q(() => window.__drawCalls ?? null) });
  say(`still ${file} · draws ${draws}`);
};
const live = async () => targets(page, view);
const find = async (id) => (await live()).find((t) => t.id === id) ?? null;
/** a tap (or the computer's click) on a published target; false when it is not published or lies off the screen */
async function tap(id, surface = null) {
  const t = (await live()).find((x) => x.id === id && (!surface || x.surface === surface)) ?? null;
  if (!t) return { ok: false, why: 'not published' };
  const [x, y] = t.pt;
  if (x < 0 || y < 0 || x > view.width || y > view.height) return { ok: false, why: 'off the screen', pt: t.pt };
  if (SHAPE) await page.touchscreen.tap(x, y);
  else { await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up(); }
  await wait(120);
  return { ok: true, pt: t.pt.map(Math.round), surface: t.surface };
}
/** drive the frozen clock until `done` (≤ `max` s), keeping every frame; `photo` gets the frame at the given share of the way */
async function drive(list, max, done, photoAt) {
  let shotTaken = false;
  for (let i = 0; i < max * 10; i++) {
    const f = await q(() => window.__s435.frame(0.1));
    list.push({ t: +((i + 1) / 10).toFixed(1), ...f });
    if (!shotTaken && photoAt && photoAt(f, i)) { shotTaken = true; await photoAt.take(); }
    if (done(f)) return true;
  }
  return false;
}

// ── to the offer ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const OFFER = 'Session Two of Heartwood';
await q(INSTALL);
let reached = await playTo(page, view, (s) => !!s?.guide?.text?.startsWith(OFFER) || (s?.lessons?.[0] === 'done' && s.mode === 'board' && !s.job && !s.page && !s.week),
  { limit: 200, log: (m) => say(m), heartwood: 'none' });
for (let i = 0; i < 120 && !reached?.guide?.text?.startsWith(OFFER); i++) {
  const tg = new Set((await live()).map((t) => t.id));
  if (reached?.guide?.balloon && !reached.guide.text?.startsWith(OFFER)) { for (const id of ['lg-ok', 'lg-later', 'lg-x']) if (tg.has(id)) { await routePress(page, view, id); break; } }
  await ff(page, 0.5);
  reached = await e3(page);
}
const atOffer = await q(() => ({ text: window.__os.lambyGuide?.active ? window.__os.lambyGuide.view.text : null }));
check('reach', 'the 2016 offer was reached by taps', !!atOffer.text?.startsWith(OFFER), { lessons: reached?.lessons, text: atOffer.text });

if (atOffer.text?.startsWith(OFFER)) {
  if (GYRO) { const g = await gyroOn(); result.gyro = g; check('gyro', "the device's own look is live (the shipping listener, real events)", g.motion?.state === 'live', g.motion); }
  // the clock frozen from here: the probe drives it
  await q(() => { window.__app.timeScale = 0; });
  await q(() => window.__s435.frame(0.05));
  result.atOffer = { geo: await q(() => window.__s435.geo()), cam: await q(() => window.__s435.cam()) };
  await shot('01', 'offer');
  if (GYRO) {
    // the device turned 12° to the right before Bring it (alpha −12): the turn must compose with wherever the device points
    await gyroTo(-12); await wait(400); await q(() => window.__s435.frame(0.05));
    result.gyroBefore = { view: await q(() => window.__s435.facing()), cam: await q(() => window.__s435.cam()) };
  }
  // ── Bring it, tapped ──
  const t0 = await tap('lg-take@call');
  check('bring', 'Bring it tapped on the monitor', t0.ok, t0);
  const viewBefore = await q(() => window.__s435.facing());
  // the way there, frame by frame: the set travels; on a shape that cannot hold both, the view is taken to it
  let mid = null;
  const photo = Object.assign((f) => {
    if (f.cam.driven && f.cam.dur > 0 && f.cam.t >= f.cam.dur * 0.45) return true;   // halfway through the turn
    if (!f.cam.driven && f.tv.pose === 'lifting' && result.frames.there.length >= 4) return true;   // no turn: halfway through the travel
    return false;
  }, { take: async () => { mid = await q(() => window.__s435.geo()); await shot('02', 'set-arriving'); } });
  await drive(result.frames.there, 30, (f) => f.tv.pose === 'held' && !f.cam.driven, photo);
  const there = result.frames.there;
  const turnFrames = there.filter((f) => f.cam.driven);
  const viewAfter = await q(() => window.__s435.facing());
  const geo = await q(() => window.__s435.geo());
  result.there = { viewBefore, viewAfter, turned: { yaw: +(((viewAfter.yaw - viewBefore.yaw + 540) % 360) - 180).toFixed(1), pitch: +(viewAfter.pitch - viewBefore.pitch).toFixed(1) },
    turnSeconds: turnFrames.length / 10, conducted: turnFrames.some((f) => f.cam.conducted), mid, geo };
  // the turn's pace (the comfort law: ≤ 9.1 °/s), from the frames
  let peak = 0; for (let i = 1; i < there.length; i++) { const a = there[i - 1].view, b = there[i].view; const d = Math.hypot(((b.yaw - a.yaw + 540) % 360) - 180, b.pitch - a.pitch) / 0.1; if (there[i].cam.driven || there[i - 1].cam.driven) peak = Math.max(peak, d); }
  result.there.peakDegPerS = +peak.toFixed(2);
  check('arrive', 'the set has come and stands still (held, stopped on its label: nothing plays)', geo && (await q(() => window.__s435.tv())).pose === 'held', await q(() => window.__s435.tv()));
  check('C3-side', 'it stands to the left of the monitor, never over its glass, the Handset Window or the calendar',
    BUILD === 'before' ? null : geo.leftOfMonitor && !geo.overMonitorGlass && !geo.overHandset && !geo.overCalendar && geo.calendarFound,
    { left: geo.leftOfMonitor, overMonitorGlass: geo.overMonitorGlass, overHandset: geo.overHandset, overCalendar: geo.overCalendar, calendarFound: geo.calendarFound, set: geo.set, monitor: geo.monitor, calendar: geo.calendar, band: geo.fitted?.band });
  check('C3-whole', 'the whole set is in the view (ears and tuft), clear of the top row', RUN === 'desktop' ? null : geo.setInView && !geo.overRow, { setInView: geo.setInView, setShare: geo.setShare, overRow: geo.overRow, row: geo.row, set: geo.set, view: geo.view });
  check('C3-size', "at least the computer's size: its glass ≥ 0.36 of the monitor's width", BUILD === 'before' ? null : geo.fitted?.glassOfMonitor >= 0.355, { glassOfMonitor: geo.fitted?.glassOfMonitor, onScreen: geo.glassOfMonitor, glassOfViewW: geo.glassOfViewW, k: geo.fitted?.k });
  const turnedShape = geo.fitted?.how ? geo.fitted.how === 'taken' : Math.abs(result.there.turned.yaw) > 5;
  check('C3-how', 'the view: taken to the set (a conducted turn, comfort pace) where the shape cannot hold both; else both framed, the monitor whole', BUILD === 'before' || RUN === 'desktop' ? null
    : turnedShape ? result.there.conducted && peak <= 9.6 && Math.abs(geo.setCentre[0] - geo.view[0] / 2) <= geo.view[0] * 0.12 : geo.monitorInView && geo.setShare >= 0.85,
    { turned: result.there.turned, seconds: result.there.turnSeconds, conducted: result.there.conducted, peakDegPerS: result.there.peakDegPerS, setCentre: geo.setCentre, monitorInView: geo.monitorInView, monitorShare: geo.monitorShare });
  await shot('03', 'set-in-view');
  if (GYRO) {
    result.gyroThere = { cam: await q(() => window.__s435.cam()), motion: await q(() => window.__motion?.() ?? null) };
    check('gyro-compose', 'the turn composed with the device: the view turned by the same amount as with the device level (the device still 12° right)', null, { before: result.gyroBefore, there: result.gyroThere.cam, turned: result.there.turned });
  }
  // ── the source line, read where a tape has one (t = 30 s: "[3] The Heart of the Matter …"), paused (review aid, as S431) ──
  await q(() => { window.__teachingTv.play('2016', 30.0); });
  await q(() => window.__app.timeScale = 1); await wait(1500); await ff(page, 0.4);
  await q(() => window.__teachingTv.inst('2016').pause('visitor'));
  await q(() => { window.__app.timeScale = 0; }); await q(() => window.__s435.frame(0.1));
  const read = await q(() => window.__s435.geo());
  result.read = { sourceCap: read.sourceCap, monitorTextCap: read.monitorTextCap, glass: read.glass, glassOfViewW: read.glassOfViewW };
  check('C3-read', 'the source line under the slide: its capitals (CSS px · as drawn · in the still), beside the monitor\'s own body text', null, result.read);
  await shot('03b', 'set-in-view-source-line');
  // ── its keys, tapped ──
  const keys = {};
  for (const [id, want] of [['tv-play@2016', ['playing', 'loading']], ['tv-pause@2016', ['paused']], ['tv-eject@2016', ['stopped']]]) {
    await q(() => window.__s435.frame(0.1));
    const r = await tap(id, 'tvset');   // the set's own key (its glass publishes a ▶/❚❚ of its own: the whole glass plays and pauses)
    await q(() => { const a = window.__app; for (let i = 0; i < 4; i++) a.update(0.1); });
    const st = (await q(() => window.__s435.tv())).state;
    keys[id] = { ...r, state: st, ok: r.ok && want.includes(st) };
  }
  check('C3-keys', 'its keys take a tap: ▶ plays, ❚❚ pauses, ⏏ stops', Object.values(keys).every((k) => k.ok), keys);

  if (RUN === 'phone-recentre' || GYRO) {
    // ── Recentre (the menu's own row: gameMenuBus.recentreView) while the set is out ──
    // the device turned 30° away (gyro), or the view dragged away (a real touch drag, 160 px to the right: the view turns left)
    if (GYRO) { await gyroTo(30); await wait(400); await q(() => window.__s435.frame(0.1)); }
    const off = await q(() => window.__s435.facing());
    if (!GYRO) {
      await page.touchscreen.touchStart(view.width / 2, view.height * 0.7);
      for (let i = 1; i <= 8; i++) { await page.touchscreen.touchMove(view.width / 2 + i * 20, view.height * 0.7); await wait(30); }
      await page.touchscreen.touchEnd();
      await q(() => window.__s435.frame(0.1));
    }
    const dragged = await q(() => window.__s435.facing());
    await q(() => window.__recentre());
    await wait(300);
    for (let i = 0; i < 3; i++) await q(() => window.__s435.frame(0.1));
    const after = await q(() => window.__s435.facing()), geoR = await q(() => window.__s435.geo());
    result.recentre = { off, dragged, after, cam: await q(() => window.__s435.cam()), geo: { setShare: geoR.setShare, monitorShare: geoR.monitorShare } };
    check('recentre', GYRO ? "Recentre under the device's look: forward is where the device points now (the view back on the set the piece turned to)" : "Recentre by drag: the view back on the seat's own look (the monitor)",
      GYRO ? Math.abs(((after.yaw - result.recentre.cam.yaw + 540) % 360) - 180) < 3 : geoR.monitorShare >= 0.6, result.recentre);
    await shot('03c', 'after-recentre');
  }

  // ── the way back ──
  const viewHeld = await q(() => window.__s435.facing());
  let backBy;
  if (RUN === 'phone-lesson' || RUN === 'phone-recentre') {
    // she goes back to the monitor herself (a touch drag to the right turns the view right, 0.16° a px; after Recentre she is there
    //   already), then taps Lesson 2: the set goes back (S431's putBack)
    let lesson = await find('task-1');
    for (let tries = 0; tries < 6 && (!lesson || lesson.pt[0] < 4 || lesson.pt[0] > view.width - 4); tries++) {
      await page.touchscreen.touchStart(view.width * 0.2, view.height * 0.75);
      for (let i = 1; i <= 8; i++) { await page.touchscreen.touchMove(view.width * 0.2 + i * 15, view.height * 0.75); await wait(30); }
      await page.touchscreen.touchEnd();
      await q(() => window.__s435.frame(0.1));
      lesson = await find('task-1');
    }
    const r = await tap('task-1');
    backBy = { by: 'Lesson 2 tapped', ...r, viewAtTap: await q(() => window.__s435.facing()) };
  } else {
    const r = await tap('tv-power@2016', 'tvset');
    backBy = { by: '⏻ tapped', ...r };
  }
  check('back-press', `the way back: ${backBy.by}`, backBy.ok, backBy);
  const photoBack = Object.assign((f) => (f.cam.driven && f.cam.dur > 0 && f.cam.t >= f.cam.dur * 0.45) || (!f.cam.driven && f.tv.pose === 'returning' && result.frames.back.length >= 4),
    { take: async () => { await shot('04', 'set-going-back'); } });
  await drive(result.frames.back, 30, (f) => f.tv.pose === 'rest' && !f.cam.driven, photoBack);
  const viewBack = await q(() => window.__s435.facing()), geoB = await q(() => window.__s435.geo());
  result.back = { by: backBy, viewHeld, viewBack, turned: { yaw: +(((viewBack.yaw - viewHeld.yaw + 540) % 360) - 180).toFixed(1), pitch: +(viewBack.pitch - viewHeld.pitch).toFixed(1) },
    seconds: result.frames.back.filter((f) => f.cam.driven).length / 10, geo: geoB, page: (await e3(page))?.job ?? null };
  check('C3-back', 'the set back in its place and the view back on the monitor (as it was before Bring it)', BUILD === 'before' ? null
    : (await q(() => window.__s435.tv())).pose === 'rest' && Math.abs(((viewBack.yaw - viewBefore.yaw + 540) % 360) - 180) <= 1.5 && geoB.monitorShare >= 0.6,
    { tv: await q(() => window.__s435.tv()), viewBefore, viewBack, monitorShare: geoB.monitorShare, monitorInView: geoB.monitorInView });
  await shot('05', 'back-at-the-monitor');
}

result.draws = await q(() => window.__drawCalls ?? null);
result.errors = errors;
const file = path.join(OUT, `s435_${RUN}_${BUILD}.json`);
fs.writeFileSync(file, JSON.stringify(result, null, 1));
const fails = result.checks.filter((c) => c.ok === false).length, passes = result.checks.filter((c) => c.ok === true).length;
say(`done · ${passes} PASS · ${fails} FAIL · draws ${result.draws} · errors ${errors.length} · ${file}`);
await Promise.race([browser.close(), wait(6000)]);
process.exit(0);
