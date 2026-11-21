#!/usr/bin/env node
/**
 * ⚑ S407 (UiB job 32, 97-2) — WHAT THE MONITOR HIDES ON 1997'S NORTH WALL, MEASURED FROM THE SEAT (memory "measure from the
 * seat": a picture can mislead, the geometry cannot). His headset run, 20 Nov (212818, 212839): the bigger monitor covers
 * the "Stand Firm" poster and the calendar's edge.
 *
 *     node tools/s407-wall-probe.mjs --port 5471 [--out out/s407-wall] [--label before|after]
 *
 * Boots 1997 at the desktop, in two look-modes: the computer (the seat's authored eye) and the headset (the seated mock:
 * `app.xr.active` forced, a select calibrates; the room's ×1.2 monitor, xrGlass). Three eyes: the computer's, the headset's
 * (the logical eye the head is mapped to: the seat + LEAN), and the headset's leaning 0.10 m further towards the desk (a body
 * moves). For the calendar and both posters, a 7 × 7 grid on each front face is tested against every other prop's world
 * box (a batch is split back into its own props), the ray from each eye stopped 1 cm short of the face: the fraction seen.
 * Also each face's corners projected through the live camera at the seat's first view (whole in the frame?). Writes
 * <out>/<label>-wall.json, and a photo per mode looking at the wall. Exit 1 when any of the three faces is hidden by more than
 * 2 % from any eye.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s407-wall'));
const LABEL = flag('label', 'after');
const SHOTS = flag('shots', '');   // a folder for the item's stills (97-2_<label>_<mode>.png)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const TARGETS = ['calendar1997', 'poster1', 'poster2'];
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const report = { label: LABEL, port: PORT, modes: {} };
let fail = false;
try {
  for (const mode of ['computer', 'headset']) {
    const page = await b.newPage();
    await page.setViewport(mode === 'headset' ? { width: 1000, height: 1000 } : { width: 1280, height: 720 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((x) => (x.textContent || '').includes('Log in') && !x.disabled), { timeout: 120000 }).catch(() => {});
    await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('Log in')); if (x) x.click(); });
    await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__poses, { timeout: 180000 });
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => window.__camPose()); if (!s.driven && !s.descent) break; await wait(1000); }
    await page.evaluate(() => window.__os.debugJump('desktop'));
    if (mode === 'headset') {
      await page.evaluate(() => {
        const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
        const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
        app.xr.input.fire('add', src); app.xr.input.fire('select', src);
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      });
      await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    } else {
      const seat = await page.evaluate(() => window.__poses().seats.r1);
      await page.evaluate((s) => window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw), seat);
    }
    await wait(3000);
    const data = await page.evaluate(async (mode, TARGETS) => {
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
      app.root.syncHierarchy();
      const eyeW = cam.getPosition().clone();
      const eye = mode === 'headset' ? window.__xrComfort.logicalPoint(eyeW) : eyeW;
      // the props' own boxes, the batches split back into their props (a batch's box spans many)
      const boxes = [];
      const seen = new Set();
      const add = (mi, name) => {
        if (!mi || seen.has(mi)) return; seen.add(mi);
        const a = mi.aabb; if (!a) return;
        const c = a.center, h = a.halfExtents;
        boxes.push({ name, min: [c.x - h.x, c.y - h.y, c.z - h.z], max: [c.x + h.x, c.y + h.y, c.z + h.z] });
      };
      for (const batch of app.batcher?._batchList ?? []) for (const mi of batch.origMeshInstances ?? []) add(mi, mi.node?.name ?? '?');
      app.root.forEach((n) => {
        if (!n.enabled || !n.render || !n.render.enabled) return;
        for (const mi of n.render.meshInstances) { if (mi.visible === false) continue; add(mi, n.name); }
      });
      const faces = {};
      for (const id of TARGETS) {
        const e = app.root.findByName(id); if (!e || !e.enabled) { faces[id] = null; continue; }
        // the face: the union of the prop's own render boxes (a box prop, or a model such as the calendar), its front at max z
        let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        e.forEach((n) => { for (const mi of n.render?.meshInstances ?? []) { const a = mi.aabb, c = a.center, h = a.halfExtents;
          lo = [Math.min(lo[0], c.x - h.x), Math.min(lo[1], c.y - h.y), Math.min(lo[2], c.z - h.z)]; hi = [Math.max(hi[0], c.x + h.x), Math.max(hi[1], c.y + h.y), Math.max(hi[2], c.z + h.z)]; } });
        const fz = hi[2] + 0.002;
        const pts = [];
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) pts.push([lo[0] + (hi[0] - lo[0]) * i / 6, lo[1] + (hi[1] - lo[1]) * j / 6, fz]);
        const corners = [[lo[0], hi[1], fz], [hi[0], hi[1], fz], [hi[0], lo[1], fz], [lo[0], lo[1], fz]];
        const phys = (p) => mode === 'headset' ? window.__xrComfort.physicalPoint(p) : p;
        const cv = app.graphicsDevice.canvas, W = cv.clientWidth, H = cv.clientHeight;
        const sc = corners.map((p) => { const q = cam.camera.worldToScreen(phys(new V(p[0], p[1], p[2]))); return { x: q.x, y: q.y, front: q.z > 0 }; });
        faces[id] = { pts, corners, face: [lo, hi].map((v) => v.map((x) => +x.toFixed(3))), pos: [e.getPosition().x, e.getPosition().y, e.getPosition().z], scale: [e.getLocalScale().x, e.getLocalScale().y, e.getLocalScale().z],
          inFrame: sc.every((q) => q.front && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H), W, H };
      }
      const forward = mode === 'headset' ? (() => { const f = new V(0, 0, -1); return [f.x, f.y, f.z]; })() : null;
      return { eye: [eye.x, eye.y, eye.z], boxes, faces, forward, fov: cam.camera.fov };
    }, mode, TARGETS);
    // the occlusion test, here: a ray from the eye to each sample, stopped 1 cm short, against every other prop's box
    const hitBox = (o, p, bx) => {
      const d = [p[0] - o[0], p[1] - o[1], p[2] - o[2]], len = Math.hypot(...d), u = d.map((v) => v / len);
      let t0 = 0, t1 = len - 0.01;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(u[k]) < 1e-9) { if (o[k] < bx.min[k] || o[k] > bx.max[k]) return false; continue; }
        let a = (bx.min[k] - o[k]) / u[k], c = (bx.max[k] - o[k]) / u[k]; if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false;
      }
      return true;
    };
    const SKIP = /^(wall|floor|ceiling|spineWall|room-|restore-|xr-|vr-|camera)/i;
    const eyes = { [mode]: data.eye };
    if (mode === 'headset') eyes.headsetLean10 = [data.eye[0], data.eye[1], data.eye[2] - 0.10];
    const rows = {};
    for (const id of TARGETS) {
      const f = data.faces[id];
      if (!f) { rows[id] = { missing: true }; continue; }
      rows[id] = { pos: f.pos.map((v) => +v.toFixed(3)), face: f.face, scale: f.scale.map((v) => +v.toFixed(3)), inFirstView: f.inFrame, seen: {} };
      for (const [en, e] of Object.entries(eyes)) {
        const by = new Map(); let hidden = 0;
        for (const p of f.pts) {
          const hit = data.boxes.find((bx) => !bx.name.startsWith(id) && !/^Calender_/.test(bx.name) && !SKIP.test(bx.name) && hitBox(e, p, bx));
          if (hit) { hidden++; by.set(hit.name, (by.get(hit.name) ?? 0) + 1); }
        }
        const frac = 1 - hidden / f.pts.length;
        rows[id].seen[en] = { fraction: +frac.toFixed(3), by: Object.fromEntries(by) };
        if (frac < 0.98) fail = true;
      }
    }
    report.modes[mode] = { eye: data.eye.map((v) => +v.toFixed(3)), fov: data.fov, rows, errors };
    if (argv.includes('--boxes')) fs.writeFileSync(path.join(OUT, `${LABEL}-boxes-${mode}.json`), JSON.stringify({ eye: data.eye, boxes: data.boxes.filter((bx) => !SKIP.test(bx.name)) }));
    // the photograph: the wall from the seat, turned a little right and up
    const yaw = -24, pitch = 8;
    if (mode === 'headset') await page.evaluate((p, y) => { window.__aim = { p, y }; window.__app.on('prerender', () => { const a = window.__aim; window.__app.root.findByName('camera').setEulerAngles(a.p, a.y, 0); }); }, pitch, yaw);
    else { const seat = await page.evaluate(() => window.__poses().seats.r1); await page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), seat, pitch, yaw); }
    await wait(1500);
    const shot = path.join(OUT, `${LABEL}-wall-${mode}.png`);
    await page.screenshot({ path: shot });
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.copyFileSync(shot, path.join(SHOTS, `97-2_${LABEL}_${mode === 'headset' ? 'xr' : 'desktop'}.png`)); }
    console.log(`[${mode}] eye ${report.modes[mode].eye.join(', ')}`);
    for (const id of TARGETS) {
      const r = rows[id]; if (r.missing) { console.log(`  ${id}: not in the room`); continue; }
      console.log(`  ${id} @ ${r.pos.join(', ')} · first view ${r.inFirstView ? 'whole' : 'CUT'} · ` + Object.entries(r.seen).map(([k, v]) => `${k} ${(v.fraction * 100).toFixed(0)}%${Object.keys(v.by).length ? ' (' + Object.entries(v.by).map(([n, c]) => `${n}×${c}`).join(' ') + ')' : ''}`).join(' · '));
    }
    await page.close();
  }
} finally {
  fs.writeFileSync(path.join(OUT, `${LABEL}-wall.json`), JSON.stringify(report, null, 1));
  await b.close();
}
process.exit(fail ? 1 : 0);
