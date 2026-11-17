#!/usr/bin/env node
/**
 * ⚑ S398 (UiB job 29 A4 + A5) — IS IT WHOLE IN THE FRAME? The posters from the seat's first view, and the Close's panels
 * from the seat, in the three look-modes, MEASURED (each object's corners projected through the live camera) and
 * photographed — memory "measure from the seat": a picture can mislead, the projection cannot.
 *
 *     node tools/s398-frames-probe.mjs --port 5291 [--out out/s398-frames] [--label before|after] [--only posters|close]
 *                                      [--modes computer,phone,headset]
 *
 * The modes: `computer` 1280 × 720 at the seat's own field (42° vertical: app.ts FOV_HOME); `phone` 390 × 844, touch,
 * `?motion=1` (its own home field: app.ts homeFov, 80° vertical in portrait); `headset` the seated XR mock
 * (tools/s396-drawcalls-probe.mjs's: `app.xr.active` forced, the head at the seat, a select calibrates) at 1000 × 1000,
 * 90° — a square per-eye view, so a little narrower than a Quest 3's eye, never wider.
 *
 * POSTERS (A5): each room's story poster — 1997 `poster1` ("CHANGE STARTS HERE"), 2016 `w_marchFlyer` ("MARCH FOR THE
 * FAMILY"), 2026 `e_ballPoster` ("FOR TRANS YOUTH · COME AS YOU ARE") — from its room's seat at the seat's first view
 * (the authored pose; in the headset the head level, facing the seat's way). Its front face's four corners, on screen.
 * CLOSE (A4): `?close=1` (the Close from Daniel's seat), every message card turned by a press as a visitor turns it, then,
 * once the gaze has been taken to the computer's panel (the end), the end view, and each panel looked at from the seat
 * (the camera aimed at its centre, as a visitor turns to it): its four corners on screen, and how squarely it faces the
 * eye (the angle between its normal and the line to the eye).
 *
 * Writes <out>/<label>-frames.json and a photo per row. Exit 1 if a poster (computer, headset) or a panel (all three
 * modes) is not whole in its frame, or on a page error. The phone's portrait frame is reported for the posters, not
 * asserted: at 42° across it frames the monitor, and a poster beside it cannot be in it without covering the monitor;
 * so is 2026's poster on the computer (left where it was: his call, see reinterp_deltas.json e_ballPoster).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s398-frames'));
const LABEL = flag('label', 'after');
const ONLY = flag('only', '');
const MODES = flag('modes', 'computer,phone,headset').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const report = { label: LABEL, at: new Date().toISOString(), posters: [], close: [] };
const checks = [];
const check = (name, ok, extra = '') => { checks.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const VIEW = { computer: { width: 1280, height: 720 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true }, headset: { width: 1000, height: 1000 } };

async function open(mode, query) {
  const page = await browser.newPage();
  await page.setViewport({ ...VIEW[mode], deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  await page.goto(`http://localhost:${PORT}/${query}${mode === 'phone' ? '&motion=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  return { page, errors };
}
const hideChrome = (page) => page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; } body > *:not(canvas):not(#reinterp-close-msg) { visibility: hidden !important; }' });
async function mockHeadset(page) {
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
  });
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
}
/** project world points through the live camera, after a frame has drawn the pose. In the headset the room is drawn
 *  where xrComfort maps it (its logical place → the physical one, `physicalPoint`), so its points are mapped first */
const project = (page, pts, mode = '') => page.evaluate(async (pts, mode) => {
  await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
  const phys = (v) => mode === 'headset' && window.__xrComfort ? window.__xrComfort.physicalPoint(v) : v;
  const cv = app.graphicsDevice.canvas, W = cv.clientWidth, H = cv.clientHeight;
  const sc = pts.map((p) => { const q = cam.camera.worldToScreen(phys(new V(p[0], p[1], p[2]))); return { x: +q.x.toFixed(1), y: +q.y.toFixed(1), front: q.z > 0 }; });
  const inside = sc.every((q) => q.front && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H);
  const xs = sc.map((q) => q.x), ys = sc.map((q) => q.y);
  return { W, H, fov: +cam.camera.fov.toFixed(1), corners: sc, inside, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v)) };
}, pts, mode);
/** aim the eye from the seat at a world point: the free camera on the computer and the phone, the head in the headset */
const aim = (page, mode, eye, t) => page.evaluate((mode, e, t) => {
  const dx = t[0] - e.x, dy = t[1] - e.y, dz = t[2] - e.z;
  const pitch = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, yaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
  if (mode === 'headset') {
    // the head is the camera; the comfort rig moves under it between frames, so the look is put back before every draw
    window.__aimHead = { pitch, yaw };
    if (!window.__aimHooked) { window.__aimHooked = true; window.__app.on('prerender', () => { const a = window.__aimHead; if (a) window.__app.root.findByName('camera').setEulerAngles(a.pitch, a.yaw, 0); }); }
    window.__app.root.findByName('camera').setEulerAngles(pitch, yaw, 0);
  } else window.__camFree(e.x, e.y, e.z, pitch, yaw);
}, mode, eye, t);

/** an older build's `__closePanels` has no corners: rebuilt from its centre and half-sizes, the normal to the seat's eye
 *  (pointCloud.ts: every panel faces EYE, level left to right; the machine's own small turn is not modelled) */
const cornersOf = (q) => {
  if (q.corners) return q.corners;
  const E = [0, 1.16, 0.7], c = [q.x, q.y, q.z];
  let n = [E[0] - c[0], E[1] - c[1], E[2] - c[2]]; const nl = Math.hypot(...n); n = n.map((v) => v / nl);
  let r = [n[2], 0, -n[0]]; const rl = Math.hypot(...r); r = r.map((v) => v / rl);           // up × n
  const u = [n[1] * r[2] - n[2] * r[1], n[2] * r[0] - n[0] * r[2], n[0] * r[1] - n[1] * r[0]];   // n × r
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => [0, 1, 2].map((k) => c[k] + r[k] * q.hw * sx + u[k] * q.hh * sy));
};

// ── A5: the posters ──────────────────────────────────────────────────────────
const POSTERS = [
  { room: '1997', id: 'poster1', era: 1, seat: 'r1' },
  { room: '2016', id: 'w_marchFlyer', era: 3, seat: 'r2' },
  { room: '2026', id: 'e_ballPoster', era: 4, seat: 'r3' }
];
if (!ONLY || ONLY === 'posters') for (const p of POSTERS) for (const mode of MODES) {
  const q = p.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&kiosk=0&era=${p.era}&debug=1&descent=0&home=0`;
  const { page, errors } = await open(mode, q);
  if (p.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__poses, { timeout: 180000 });
  await hideChrome(page);
  for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => window.__camPose()); if (!s.driven && !s.descent) break; await wait(1000); }
  if (p.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (mode === 'headset') await mockHeadset(page);
  await wait(2500);
  const seat = await page.evaluate((k) => window.__poses().seats[k], p.seat);
  if (mode === 'headset') await page.evaluate((yaw) => { window.__aimHead = { pitch: 0, yaw }; window.__app.on('prerender', () => { const a = window.__aimHead; if (a) window.__app.root.findByName('camera').setEulerAngles(a.pitch, a.yaw, 0); }); }, seat.yaw);
  else await page.evaluate((s) => window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw), seat);
  await wait(800);
  const face = await page.evaluate((id) => {
    const e = window.__app.root.findByName(id); if (!e || !e.enabled) return null;
    const M = e.getWorldTransform(), V = e.getPosition().constructor;
    // the box's face toward the room (local +z half-depth, as era1room spawns a box), its four corners
    return [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]].map(([x, y]) => { const w = M.transformPoint(new V(x, y, 0.5)); return [w.x, w.y, w.z]; });
  }, p.id);
  const row = { room: p.room, id: p.id, mode, seat };
  if (!face) { row.missing = true; console.log(`[${p.room} ${mode}] ${p.id} not in the room`); }
  else {
    Object.assign(row, await project(page, face, mode));
    const file = `${LABEL}-poster-${p.room}-${mode}.png`;
    await page.screenshot({ path: path.join(OUT, file) }); row.photo = file;
    console.log(`[${p.room} ${mode}] ${p.id}: ${row.inside ? 'whole in the frame' : 'CUT'} · box ${row.box.join(',')} of ${row.W}×${row.H} · fov ${row.fov}`);
    // the phone's portrait frame is reported, not asserted (see the header); so is 2026 on the computer: left where it was,
    //   whole and large in the headset, because the computer's view holds it only at a size its words cannot be read
    //   (reinterp_deltas.json e_ballPoster _docS398: his call)
    const reported = mode === 'phone' || (p.room === '2026' && mode === 'computer');
    if (!reported) check(`poster ${p.room} (${p.id}) whole in the seat's first view · ${mode}`, row.inside, `box ${row.box.join(',')} of ${row.W}×${row.H}`);
    else row.reportedOnly = true;
  }
  row.errors = errors; report.posters.push(row);
  check(`poster ${p.room} · ${mode}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ── A4: the Close's panels ───────────────────────────────────────────────────
if (!ONLY || ONLY === 'close') for (const mode of MODES) {
  const { page, errors } = await open(mode, '?reinterp=1&kiosk=0&close=1&debug=1&home=0');
  await page.waitForFunction(() => window.__app && window.__camPose && window.__closeState && window.__closePanels, { timeout: 180000 });
  await hideChrome(page);
  if (mode === 'headset') await mockHeadset(page);
  const t0 = Date.now(); let pressed = -1, ended = false;
  while (Date.now() - t0 < 300000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(1500);
      if (mode === 'headset') await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
      const v = VIEW[mode];
      if (mode === 'phone') await page.touchscreen.tap(v.width / 2, v.height / 2); else await page.mouse.click(v.width / 2, v.height / 2);
      pressed = st.card; await wait(900); continue;
    }
    if (st.ended) { ended = true; break; }
    await wait(1000);
  }
  const row = { mode, ended, panels: [] };
  if (ended) {
    await wait(1200);
    const endFile = `${LABEL}-close-${mode}-end.png`;
    await page.screenshot({ path: path.join(OUT, endFile) }); row.endPhoto = endFile;
    const eye = mode === 'headset' ? await page.evaluate(() => { const p = window.__app.root.findByName('camera').getPosition(); return { x: p.x, y: p.y, z: p.z }; })
      : { x: 0, y: 1.16, z: 0.7 };
    // in the headset the head keeps the end view's look; on the screens the camera is the seat's
    const panels = await page.evaluate(() => window.__closePanels());
    // the end view: which panels are whole in it already
    row.endView = [];
    for (const q of panels) row.endView.push({ i: q.i, era: q.era, machine: q.machine, ...(await project(page, cornersOf(q), mode)) });
    for (const q of panels) {
      if (q.hidden) { row.panels.push({ i: q.i, era: q.era, hidden: true }); continue; }
      const target = mode === 'headset' ? await page.evaluate((p) => { const v = window.__app.root.findByName('camera').getPosition().clone().set(p[0], p[1], p[2]); const w = window.__xrComfort.physicalPoint(v); return [w.x, w.y, w.z]; }, [q.x, q.y, q.z]) : [q.x, q.y, q.z];
      await aim(page, mode, eye, target);
      await wait(700);
      const fresh = (await page.evaluate(() => window.__closePanels())).find((x) => x.i === q.i);
      fresh.corners = cornersOf(fresh);
      const pr = await project(page, fresh.corners, mode);
      // how squarely it faces the eye: the angle between its normal (from its corners) and the line to the eye
      const c = fresh.corners, ux = [c[1][0] - c[0][0], c[1][1] - c[0][1], c[1][2] - c[0][2]], vy = [c[3][0] - c[0][0], c[3][1] - c[0][1], c[3][2] - c[0][2]];
      const n = [ux[1] * vy[2] - ux[2] * vy[1], ux[2] * vy[0] - ux[0] * vy[2], ux[0] * vy[1] - ux[1] * vy[0]], nl = Math.hypot(...n);
      const le = mode === 'headset' ? await page.evaluate((e) => { const v = window.__app.root.findByName('camera').getPosition().clone().set(e.x, e.y, e.z); const w = window.__xrComfort.logicalPoint(v); return { x: w.x, y: w.y, z: w.z }; }, eye) : eye;
      const toEye = [le.x - fresh.x, le.y - fresh.y, le.z - fresh.z], tl = Math.hypot(...toEye);
      const facing = Math.acos(Math.abs((n[0] * toEye[0] + n[1] * toEye[1] + n[2] * toEye[2]) / (nl * tl))) * 180 / Math.PI;
      const file = `${LABEL}-close-${mode}-panel-${q.machine ? 'machine' : q.era}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const r = { i: q.i, era: q.era, machine: q.machine, facingDeg: +facing.toFixed(1), distance: +tl.toFixed(2), photo: file, ...pr };
      row.panels.push(r);
      console.log(`[close ${mode}] ${q.machine ? 'machine' : 'panel ' + q.era}: ${pr.inside ? 'whole' : 'CUT'} · box ${pr.box.join(',')} of ${pr.W}×${pr.H} · faces the eye within ${r.facingDeg}°`);
      check(`Close · ${mode}: ${q.machine ? "the computer's panel" : 'the ' + ['1997', '2003', '2016', '2026'][q.era - 1] + ' panel'} whole in the frame from the seat`, pr.inside, `box ${pr.box.join(',')} of ${pr.W}×${pr.H}, facing ${r.facingDeg}°`);
    }
  }
  check(`Close · ${mode}: the Close reached its end (the gaze at the computer's panel)`, ended);
  row.errors = errors; report.close.push(row);
  check(`Close · ${mode}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}
report.checks = checks;
fs.writeFileSync(path.join(OUT, `${LABEL}-frames.json`), JSON.stringify(report, null, 1));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks pass → ${path.join(OUT, `${LABEL}-frames.json`)}`);
process.exit(failed.length ? 1 : 0);
