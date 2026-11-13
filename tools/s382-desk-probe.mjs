#!/usr/bin/env node
/**
 * ⚑ S382 (UiB job 22 Part A, items 1–3) — VERA'S DESK, PRESSED THE WAY A VISITOR PRESSES IT.
 *
 *     node tools/s382-desk-probe.mjs --port 5311 [--out out/s382-desk/probe] [--mode desktop|xr|phone|all]
 *
 * `?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, the board signed in. Every press is a visitor's: on the computer a real
 * mouse (move → down → ~70 ms → up) at the thing's place on the screen; in the emulated headset (tools/harness/xr-mock.mjs)
 * a tracked controller's ray aimed at it from a hand below the eye, and `select`; on the phone (844 × 390, isMobile +
 * hasTouch) a touch tap. Checked:
 *   THE MOTES — one mesh, one draw, 102 squares; on the computer each is a whole number of device pixels (8 or 10) on the
 *     pixel grid; they drift; the ones by the lamp are brighter, never above the cap; under Reduce motion they keep still
 *     and do not jump; during the 2016 → 2026 update's install stutter they jump.
 *   THE NOTEBOOK — published for the walker (`prop`) and on screen from the authored seat; its sentence line; a press
 *     brings it to her hand (the page fully on screen, its handwriting's x-height measured: ≥ 12 CSS px on the computer,
 *     ≥ 0.8° in the headset); Lambient is silent and the phone holds while it is up; a press on the page puts it down; a
 *     press past it puts it down AND reaches the board; refused while the Wick card rises.
 *   THE MUG — its sentence line before and after Nuala; her record closed by its own button (a real press on the
 *     workstation) → her message → read → the mug's moment, fully on screen, the kit waiting for it and arriving after;
 *     a press on the mug repeats it.
 *   DRAW CALLS — at the seat, with the notebook up, during the mug's moment (≤ 75).
 * Writes report.json and photographs; exit 1 on a failed check. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';
import { installXrMock } from './harness/xr-mock.mjs';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s382-desk/probe'));
const MODE = flag('mode', 'all');
const MODES = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const AIM = JSON.parse(fs.readFileSync('data/strings/aim.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SEAT = { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 };

async function run(mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = (label) => page.screenshot({ path: path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`) });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__graceQueue?.() && window.__veraDesk, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await installXrMock(page, 3);
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  // a room point as the eye's camera sees it: in a headset the room is shifted to meet the tracked head (xrComfort)
  await page.evaluate(() => { window.__v = (p) => (window.__app.xr.active ? window.__xrComfort.physicalPoint(p.clone()) : p); });
  await wait(6000);
  await page.evaluate(() => window.__graceQueue().debugBeat('board'));
  await page.waitForFunction(() => !window.__graceQueue().wickConducting, { timeout: 30000 }).catch(() => {});
  await wait(4000);
  const look = (pitch, yaw) => page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), SEAT, pitch, yaw);
  await look(xr ? 0 : SEAT.pitch, SEAT.yaw); await wait(700);

  // ── the ways a visitor presses ──
  const proj = (w) => page.evaluate((w) => { const cam = window.__app.root.findByName('camera'), V = cam.getPosition().constructor; const s = cam.camera.worldToScreen(window.__v(new V(w.x, w.y, w.z)), new V()); return { x: s.x, y: s.y }; }, w);
  const tap = async (pt) => {
    if (phone) { await page.touchscreen.tap(pt.x, pt.y); return; }
    await page.mouse.move(pt.x, pt.y); await wait(80); await page.mouse.down(); await wait(70); await page.mouse.up();
  };
  const xrPress = async (w) => {
    await page.evaluate((w) => {
      const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
      const phys = window.__xrComfort.physicalPoint(new V(w.x, w.y, w.z));
      const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.1)).add(head.up.clone().mulScalar(-0.25));
      window.__controller.getOrigin = () => origin.clone();
      window.__controller.getDirection = () => phys.clone().sub(origin).normalize();
    }, w);
    await wait(250); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller)); await wait(120);
  };
  const pressWorld = async (w) => { if (xr) await xrPress(w); else await tap(await proj(w)); };
  const dbg = () => page.evaluate(() => window.__veraDeskDebug());
  const targets = () => page.evaluate(() => window.__veraDesk());
  const draws = () => page.evaluate(async () => { const a = []; for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return Math.max(...a); });
  const caption = () => page.evaluate(() => [...document.querySelectorAll('body > div')].filter((d) => d.style.opacity === '1').map((d) => d.textContent).join(' | '));
  const onScreen = (p) => p.x >= 0 && p.y >= 0 && p.x <= VW && p.y <= VH;
  const report = { mode };

  // ── THE MOTES ──
  const sp = await page.evaluate(() => { const r = window.__app.root.findByName('room-specks').render; return { mis: r.meshInstances.length, verts: r.meshInstances[0].mesh.vertexBuffer.numVertices, d: window.__specks.debug() }; });
  check(mode, 'the motes: one mesh, 102 squares (34 a room)', sp.mis === 1 && sp.verts === 408, `${sp.mis} mesh · ${sp.verts} vertices`);
  const quads = () => page.evaluate(() => {
    const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
    const mi = app.root.findByName('room-specks').render.meshInstances[0], pos = [], col = []; mi.mesh.getPositions(pos); mi.mesh.getColors(col);
    const dev = app.graphicsDevice, dpr = dev.width / dev.clientRect.width, out = [];
    for (let i = 0; i < pos.length / 12; i++) {
      if (col[i * 16 + 3] <= 0) continue;
      const a = cam.camera.worldToScreen(window.__v(new V(pos[i * 12], pos[i * 12 + 1], pos[i * 12 + 2])), new V());
      const b = cam.camera.worldToScreen(window.__v(new V(pos[i * 12 + 6], pos[i * 12 + 7], pos[i * 12 + 8])), new V());
      const c = new V((pos[i * 12] + pos[i * 12 + 6]) / 2, (pos[i * 12 + 1] + pos[i * 12 + 7]) / 2, (pos[i * 12 + 2] + pos[i * 12 + 8]) / 2);
      const half = Math.hypot(pos[i * 12] - pos[i * 12 + 3], pos[i * 12 + 1] - pos[i * 12 + 4], pos[i * 12 + 2] - pos[i * 12 + 5]) / 2;
      out.push({ i, w: Math.abs(b.x - a.x) * dpr, x0: Math.min(a.x, b.x) * dpr, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, alpha: col[i * 16 + 3],
        deg: 2 * Math.atan(half / window.__v(c).distance(cam.getPosition())) * 180 / Math.PI });
    }
    return out;
  });
  const q0 = await quads();
  const inFrame = q0.filter((q) => q.cx > 0 && q.cy > 0 && q.cx < VW && q.cy < VH);
  report.motesInFrame = inFrame.length;
  check(mode, 'the motes: several in the seat\'s frame', inFrame.length >= 5, `${inFrame.length} in frame`);
  if (!xr) {
    const bad = inFrame.filter((q) => Math.abs(q.w - Math.round(q.w)) > 0.1 || ![8, 10, 16, 20].includes(Math.round(q.w)) || Math.abs(q.x0 - Math.round(q.x0)) > 0.12);
    check(mode, 'the motes: whole device pixels on the pixel grid (8 or 10 px)', !bad.length, bad.length ? JSON.stringify(bad.slice(0, 3)) : `${inFrame.length} checked`);
  } else {
    const degs = inFrame.map((q) => q.deg);
    check(mode, 'the motes: a fixed small angle in the headset (0.28° / 0.36°)', degs.length && degs.every((d) => Math.abs(d - 0.28) < 0.02 || Math.abs(d - 0.36) < 0.02), degs.slice(0, 4).map((d) => d.toFixed(3)).join(', '));
  }
  check(mode, 'the motes: never above the brightness cap', q0.every((q) => q.alpha <= 0.921), `max ${Math.max(...q0.map((q) => q.alpha)).toFixed(2)}`);
  await wait(1500);
  const q1 = await quads();
  const moved = q1.filter((b) => { const a = q0.find((x) => x.i === b.i); return a && Math.hypot(a.cx - b.cx, a.cy - b.cy) > 0.5; }).length;
  check(mode, 'the motes drift', moved > 0, `${moved} of ${q1.length} moved in 1.5 s`);
  if (mode === 'desktop') {
    await look(4, SEAT.yaw + 48); await wait(800);
    const lampAlpha = await page.evaluate(() => { const mi = window.__app.root.findByName('room-specks').render.meshInstances[0], col = []; mi.mesh.getColors(col); const a = []; for (let i = 34 + 30; i < 34 + 34; i++) a.push(col[i * 16 + 3]); return a; });
    check(mode, 'the motes by Vera\'s lamp catch its light (brighter than the 0.62 field)', lampAlpha.some((a) => a > 0.68), lampAlpha.map((a) => a.toFixed(2)).join(', '));
    await shot('motes-lamp-side');
    await look(SEAT.pitch, SEAT.yaw); await wait(500);
  }

  // ── THE NOTEBOOK ──
  let t = await targets();
  const nbT = t.find((x) => x.id === 'desk-notebook'), mugT = t.find((x) => x.id === 'desk-mug');
  check(mode, 'the notebook and the mug are published (__veraDesk)', !!nbT && !!mugT, t.map((x) => x.id).join(', '));
  if (!xr) {
    const vs = await readVisitorState(page, { width: VW, height: VH });
    const props = vs.targets.filter((x) => x.surface === 'prop').map((x) => x.id);
    check(mode, 'the walker sees both as `prop` targets from the authored seat (never pressed by it)', props.includes('desk-notebook') && props.includes('desk-mug'), `props: ${props.join(', ')} · dropped: ${vs.dropped.filter((d) => d.surface === 'prop').map((d) => d.id + ' ' + d.why).join('; ')}`);
  }
  if (nbT) {
    const p = await proj(nbT);
    check(mode, 'the notebook is on screen from the authored seat', onScreen(p), `${Math.round(p.x)},${Math.round(p.y)}`);
    if (!phone && !xr) {
      await page.mouse.move(p.x, p.y); await wait(400);
      const cap = await caption();
      check(mode, 'its sentence line names it', cap.includes(AIM.veraNotebook), cap);
    }
    await shot('notebook-at-rest');
    report.drawsSeat = await draws();
    await pressWorld(nbT);
    await wait(1500);
    let d = await dbg();
    check(mode, 'a press brings the notebook to her hand', d.notebook === 'held', d.notebook);
    const quiet = await page.evaluate(() => { const q = window.__graceQueue(); return { silent: q.guideSilent, quiet: q.personalQuiet, atRest: q.phone.atRest }; });
    check(mode, 'while it is up Lambient is silent and the phone holds its messages', quiet.silent && quiet.quiet && !quiet.atRest, JSON.stringify(quiet));
    const corners = await page.evaluate(() => { const d = window.__veraDeskDebug(); const cam = window.__app.root.findByName('camera'), V = cam.getPosition().constructor; const eye = cam.getPosition(); return d.pageCorners.map((c) => { const v = window.__v(new V(c[0], c[1], c[2])); const s = cam.camera.worldToScreen(v, new V()); return { x: s.x, y: s.y, d: v.distance(eye), w: c }; }); });
    const ys = corners.map((c) => c.y), xs = corners.map((c) => c.x);
    const hPx = Math.max(...ys) - Math.min(...ys);
    const W = (a, b) => Math.hypot(a.w[0] - b.w[0], a.w[1] - b.w[1], a.w[2] - b.w[2]);
    const pageH = W(corners[0], corners[3]), dist = corners.reduce((s, c) => s + c.d, 0) / 4;
    const xhDeg = 2 * Math.atan((pageH * 5 / 160) / 2 / dist) * 180 / Math.PI;
    report.page = { heightPx: Math.round(hPx), xHeightPx: +(hPx * 5 / 160).toFixed(1), xHeightDeg: +xhDeg.toFixed(2), distance: +dist.toFixed(2) };
    check(mode, 'the page is fully on screen', corners.every((c) => onScreen(c)), JSON.stringify(corners.map((c) => [Math.round(c.x), Math.round(c.y)])));
    if (xr) check(mode, 'the handwriting reads in the headset (x-height ≥ 0.8°)', xhDeg >= 0.8, `${xhDeg.toFixed(2)}° at ${dist.toFixed(2)} m`);
    else check(mode, `the handwriting reads (x-height ≥ ${phone ? 7 : 12} CSS px)`, hPx * 5 / 160 >= (phone ? 7 : 12), `${(hPx * 5 / 160).toFixed(1)} px, ${xhDeg.toFixed(2)}° at ${dist.toFixed(2)} m`);
    check(mode, 'it comes no nearer the eye than 0.4 m', dist >= 0.4, `${dist.toFixed(2)} m`);
    report.drawsHeld = await draws();
    await shot('notebook-in-hand');
    // a press on the page puts it down
    const centre = corners.reduce((s, c) => ({ x: s.x + c.w[0] / 4, y: s.y + c.w[1] / 4, z: s.z + c.w[2] / 4 }), { x: 0, y: 0, z: 0 });
    await pressWorld(centre);
    await wait(1300);
    d = await dbg();
    check(mode, 'a press on the page puts it down', d.notebook === 'rest' && !d.deskConducting, d.notebook);
    // refused while the Wick card rises
    await page.evaluate(() => { window.__graceQueue().wickConducting = true; });
    await pressWorld(nbT); await wait(600);
    d = await dbg();
    check(mode, 'refused while the Wick card is rising', d.notebook === 'rest', d.notebook);
    await page.evaluate(() => { window.__graceQueue().wickConducting = false; });
    await wait(300);
    if (mode === 'desktop') {
      // a press past it puts it down AND reaches what it was meant for (the board's first job)
      await pressWorld(nbT); await wait(1400);
      const vs = await readVisitorState(page, { width: VW, height: VH });
      const tile = vs.targets.find((x) => x.surface === 'workstation' && /^task-0$/.test(x.id)) ?? vs.targets.find((x) => x.surface === 'workstation');
      const before = await page.evaluate(() => { const q = window.__graceQueue(); return { open: !!q.openSurface, mode: q.mode, v: q.version }; });
      if (tile) await tap({ x: tile.pt[0], y: tile.pt[1] });
      await wait(1200);
      const after = await page.evaluate(() => { const q = window.__graceQueue(); return { open: !!q.openSurface, mode: q.mode, v: q.version }; });
      d = await dbg();
      check(mode, 'a press past it (on the board) puts it down and reaches the board', d.notebook === 'rest' && (after.open !== before.open || after.mode !== before.mode || after.v !== before.v), `${tile?.id} ${JSON.stringify(before)} → ${JSON.stringify(after)} · ${d.notebook}`);
      await page.evaluate(() => window.__graceQueue().debugBeat('board')); await wait(800);
    }
  }

  // ── THE MUG ──
  if (mugT && !phone) {
    if (!xr) {
      const p = await proj(mugT);
      await page.mouse.move(p.x, p.y); await wait(400);
      const cap = await caption();
      check(mode, 'before Nuala\'s message the mug is only "a mug, an N painted on it"', cap.includes(AIM.veraMug) && !cap.includes(AIM.veraMugNuala), cap);
      await page.mouse.move(640, 80); await wait(200);
    }
    // her record, closed by its own button (a real press on the workstation)
    await page.evaluate(() => { const q = window.__graceQueue(); q.mode = 'board'; q.veraPage = 'record'; q.recordPage = 0; q.bump(); });
    await wait(900);
    let closed = false;
    if (!xr) {
      const vs = await readVisitorState(page, { width: VW, height: VH });
      const btn = vs.targets.find((x) => x.id === 'vera-record-close');
      if (btn) { await tap({ x: btn.pt[0], y: btn.pt[1] }); closed = true; }
    }
    if (!closed) await page.evaluate(() => { const q = window.__graceQueue(), r = q.rects.find((h) => h.id === 'vera-record-close'); if (r) q.handleClick(r.x + r.w / 2, r.y + r.h / 2); });
    const got = await page.waitForFunction(() => window.__graceQueue().phone.delivered('nuala'), { timeout: 60000 }).then(() => true, () => false);
    check(mode, 'her record closed: Nuala\'s message arrives', got);
    await page.waitForFunction(() => !window.__graceQueue().phone.voiceBusy, { timeout: 60000 }).catch(() => {});
    const started = await page.waitForFunction(() => window.__veraDeskDebug().mug !== 'rest', { timeout: 8000 }).then(() => true, () => false);
    check(mode, 'once it has been read, the mug is brought up (no press, no look)', started);
    await wait(1100);
    const during = await page.evaluate(() => {
      const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor, q = window.__graceQueue();
      const m = app.root.findByName('w_mug'); let lo = [1e9, 1e9], hi = [-1e9, -1e9];
      m.forEach((n) => { for (const mi of n.render?.meshInstances ?? []) { const b = mi.aabb; for (let k = 0; k < 8; k++) { const c = new V(b.center.x + (k & 1 ? 1 : -1) * b.halfExtents.x, b.center.y + (k & 2 ? 1 : -1) * b.halfExtents.y, b.center.z + (k & 4 ? 1 : -1) * b.halfExtents.z); const s = cam.camera.worldToScreen(window.__v(c), new V()); lo = [Math.min(lo[0], s.x), Math.min(lo[1], s.y)]; hi = [Math.max(hi[0], s.x), Math.max(hi[1], s.y)]; } } });
      const nEnt = app.root.findByName('w_mugN'), np = cam.camera.worldToScreen(window.__v(nEnt.getPosition().clone()), new V());
      return { phase: window.__veraDeskDebug().mug, kit: q.kitPopin, silent: q.guideSilent, lo, hi, n: [np.x, np.y] };
    });
    report.mug = during;
    check(mode, 'the mug\'s moment is fully on screen, its N facing her', during.lo[0] >= 0 && during.lo[1] >= 0 && during.hi[0] <= VW && during.hi[1] <= VH, `${during.lo.map(Math.round)}–${during.hi.map(Math.round)} · N at ${during.n.map(Math.round)}`);
    check(mode, 'the campaign kit waits for it, and Lambient is silent', !during.kit && during.silent, JSON.stringify({ kit: during.kit, silent: during.silent }));
    report.drawsMug = await draws();
    await shot('mug-moment');
    const after = await page.waitForFunction(() => window.__veraDeskDebug().mug === 'rest' && window.__graceQueue().kitPopin, { timeout: 15000 }).then(() => true, () => false);
    check(mode, 'then the mug goes back and the kit arrives', after);
    await page.evaluate(() => { const q = window.__graceQueue(); q.kitPopin = false; q.bump(); }); await wait(500);
    if (!xr) {
      const p = await proj(mugT);
      await page.mouse.move(p.x, p.y); await wait(400);
      // the kit's chime names itself in the same strip for a few seconds first (a sound's caption outranks the look)
      for (let k = 0; k < 20 && (await caption()).includes('['); k++) await wait(500);
      const cap = await caption();
      check(mode, 'after her message it is "Nuala\'s mug"', cap.includes(AIM.veraMugNuala), cap);
    }
    const played = (await dbg()).mugPlayed;
    await pressWorld(mugT); await wait(600);
    const again = await dbg();
    check(mode, 'a press on the mug repeats its moment', again.mug !== 'rest', `${again.mug} (played before: ${played})`);
    await page.waitForFunction(() => window.__veraDeskDebug().mug === 'rest', { timeout: 10000 }).catch(() => {});
  }

  // ── DRAW CALLS ──
  for (const k of ['drawsSeat', 'drawsHeld', 'drawsMug']) if (report[k] !== undefined) check(mode, `draw calls ≤ 75 (${k.slice(5).toLowerCase()})`, report[k] <= 75, String(report[k]));

  // ── THE GLITCH, and REDUCE MOTION ──
  if (mode === 'desktop') {
    await look(4, SEAT.yaw + 48); await wait(500);
    await page.evaluate(() => window.__os.debugJump('update4'));
    let saw = null;
    for (let i = 0; i < 420 && !saw; i++) {   // u4's install is long (its changelog): the stutter comes ~25 s in
      const s = await page.evaluate(() => { const u = window.__os.updateApp; if (!u) return null; const r = u.hits?.find((h) => ['update-now', 'eula-readon', 'eula-agree'].includes(h.id)); if (r && !u.installing) u.handleClick(r.x + r.w / 2, r.y + r.h / 2); return { glitching: u.glitching, sp: window.__specks.debug() }; });
      if (s?.glitching && s.sp.glitchK > 0.5) { await wait(150); saw = await page.evaluate(() => window.__specks.debug()); }
      else await wait(150);
    }
    check(mode, 'the motes jump with the update\'s install stutter', !!saw && saw.glitchK > 0.5 && saw.jumping > 0, saw ? `glitchK ${saw.glitchK.toFixed(2)}, ${saw.jumping} jumping` : 'never saw the stutter');
    await shot('motes-glitch');
    await page.close();
    const r = await browser.newPage();
    await r.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
    await r.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await r.waitForFunction(() => window.__os && window.__app && window.__specks, { timeout: 120000 });
    await r.evaluate(async () => { (await import('/src/state/motion.ts')).setReducedMotion(true); });
    await wait(5000);
    await r.evaluate((s) => window.__camFree(s.x, s.y, s.z, 4, s.yaw + 48), SEAT); await wait(600);
    const verts = () => r.evaluate(() => { const a = []; window.__app.root.findByName('room-specks').render.meshInstances[0].mesh.getPositions(a); return a; });
    const a = await verts();
    await r.evaluate(() => window.__specks.glitch(3)); await wait(1500);
    const b = await verts();
    const dmax = a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
    const g = await r.evaluate(() => window.__specks.debug());
    check(mode, 'under Reduce motion the motes keep still and do not jump', dmax < 1e-6 && g.glitchK === 0 && g.jumping === 0, `max move ${dmax.toExponential(1)} m, glitchK ${g.glitchK}`);
    await r.close();
  } else await page.close();
  report.errors = errors;
  check(mode, 'no page errors', !errors.length, errors.join(' / '));
  return report;
}

const reports = [];
for (const m of MODES) reports.push(await run(m));
await browser.close();
const pass = checks.filter((c) => c.ok).length;
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ pass, total: checks.length, checks, reports }, null, 2));
console.log(`\n${pass}/${checks.length} checks passed`);
process.exit(pass === checks.length ? 0 : 1);
