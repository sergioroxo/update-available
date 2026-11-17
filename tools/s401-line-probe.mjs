#!/usr/bin/env node
/**
 * ⚑ S401 (UiB job 29 D3 / D4) — HIS LINE AT DANIEL'S DESK, THEN THE CLOSE: stills from the seat, and the monitor measured.
 *
 *     node tools/s401-line-probe.mjs --port 5401 [--out <dir>] [--modes computer,phone,headset] [--route play,review]
 *
 * `play`: 2026 settled (`?era=4`), then the Close asked for from Maya's room (`__enterClose`, the route tools/stills.mjs
 * drives since S398): the seat eases, the crossing flies to Daniel's seat, and the line stage begins there. `review`:
 * `?close=1`. Per mode: a still when his line is up (`danielLine.shown` 1), when both lines are held (2), when the
 * monitor is back on the desk and the eyes rise (lookUp), and when the Close's first card is up. At the held moment the
 * CRT's case is projected through the camera (its eight corners) and must be whole in the frame; the draw calls are read.
 * Headset: the seated mock of tools/s398-light-stills.mjs (xr.active forced, the head at the rig, 90° view).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s401-line'));
const MODES = flag('modes', 'computer,phone,headset').split(',');
const ROUTES = flag('route', 'play,review').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } };
const rows = [];
for (const route of ROUTES) for (const mode of MODES) {
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const q = route === 'review' ? 'close=1' : 'era=4';
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${q}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__danielLine, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  if (mode === 'headset') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await wait(3000);
  }
  if (route === 'play') await page.evaluate(() => window.__enterClose());
  const tag = `${route}-${mode}`;
  const moment = async (name, pred, limit) => {
    const t0 = Date.now();
    while (Date.now() - t0 < limit) { if (await page.evaluate(pred)) break; await wait(250); }
    await wait(name === 'held' ? 900 : 300);
    await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
    return (Date.now() - t0) / 1000;
  };
  const r = { route, mode, errors };
  r.darkAt = await moment('1-dark', () => window.__danielLine.phase === 'dark', 90000);
  r.lineAt = await moment('2-his-line', () => window.__danielLine.shown === 1 && window.__danielLine.phase !== 'dark', 30000);
  r.heldAt = await moment('3-both-lines', () => window.__danielLine.shown === 2, 30000);
  // the monitor measured: the case's corners through the camera that renders (the headset mock's head, or the camera)
  r.frame = await page.evaluate(() => {
    const app = window.__app, crt = app.root.findByName('daniel-line-crt'), cam = app.root.findByName('camera');
    const body = crt?.findByName('close-crt-body'); const mi = body?.render?.meshInstances?.[0];
    if (!crt || !mi || !cam?.camera) return null;
    const a = mi.aabb, c = a.center, h = a.halfExtents, W = app.graphicsDevice.width, H = app.graphicsDevice.height;
    const sx = app.graphicsDevice.canvas.clientWidth / W, sy = app.graphicsDevice.canvas.clientHeight / H;
    const pts = [];
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      const p = new c.constructor(c.x + dx * h.x, c.y + dy * h.y, c.z + dz * h.z);
      const s = cam.camera.worldToScreen(p); pts.push([Math.round(s.x), Math.round(s.y), +s.z.toFixed(2)]);
    }
    const cw = app.graphicsDevice.canvas.clientWidth, ch = app.graphicsDevice.canvas.clientHeight;
    const whole = pts.every(([x, y, z]) => z > 0 && x >= 0 && x <= cw && y >= 0 && y <= ch);
    const eye = cam.getPosition(), at = crt.getPosition();
    return { whole, view: [cw, ch], corners: pts, dist: +eye.distance(at).toFixed(3), drawCalls: window.__drawCalls ?? null, sx, sy };
  });
  r.backAt = await moment('4-back-on-the-desk', () => window.__danielLine.phase === 'rest', 40000);
  r.cardAt = await moment('5-the-close', () => window.__closeCard?.on === true, 120000);
  rows.push(r);
  console.log(JSON.stringify(r));
  await page.close();
}
fs.writeFileSync(path.join(OUT, 'line-probe.json'), JSON.stringify(rows, null, 1));
await browser.close();
