#!/usr/bin/env node
/**
 * ⚑ S404 (UiB job 30 C3) — THE FOUR LINES ON DANIEL'S CRT, THEN THE CLOSE: stills from the seat, and the monitor measured.
 * (tools/s401-line-probe.mjs, for the ending S404 replaces.)
 *
 *     node tools/s404-crt-probe.mjs --port 5431 [--out <dir>] [--modes computer,phone,headset] [--route play,review]
 *
 * `play`: 2026 settled (`?era=4`), then the Close asked for from Maya's room (`__enterClose`): the crossing flies to
 * Daniel's seat and the line stage begins there. `review`: `?close=1` (the lines on the room's own CRT, nothing lifted).
 * Per mode, a still when each card has been drawn in (2016, 2026, 2003, Caleb's answer), when the monitor is back on the
 * desk, and when the Close's first card is up; the glass's four corners projected through the camera at the last card
 * (whole in the frame? how many CSS pixels wide?), the CRT's distance, the draw calls, and the seconds from the dark glass
 * to the desk. Headset: the seated mock of tools/s398-light-stills.mjs (xr.active forced, the head at the rig, 90° view).
 * The glass canvas itself (800 × 600) is saved at the last card.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s404-crt'));
const MODES = flag('modes', 'computer,phone,headset').split(',');
const ROUTES = flag('route', 'play,review').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
// `--glass`: the glass alone (800 × 600) at each card and mid-reveal, from the module, without the room (quick look)
if (argv.includes('--glass')) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&reveal=1&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os, { timeout: 180000 });
  await wait(3000);
  for (const [n, k] of [[1, 1], [2, 1], [3, 1], [4, 0.5], [4, 1]]) {
    const url = await page.evaluate(async (n, k) => {
      const m = await import('/src/room/danielLine.ts');
      const c = document.createElement('canvas'); c.width = 800; c.height = 600;
      m.drawLineGlass(c.getContext('2d'), n, k); return c.toDataURL('image/png');
    }, n, k);
    fs.writeFileSync(path.join(OUT, `glass-${n}${k < 1 ? '-drawing' : ''}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  process.exit(0);
}
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
  const t0 = Date.now();
  const moment = async (name, pred, limit, settle = 300) => {
    const s = Date.now();
    while (Date.now() - s < limit) { if (await page.evaluate(pred)) break; await wait(120); }
    await wait(settle);
    await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
    return +((Date.now() - t0) / 1000).toFixed(1);
  };
  const r = { route, mode, errors };
  r.darkAt = await moment('0-dark', () => window.__danielLine.phase === 'dark', 90000, 200);
  const dark0 = Date.now();
  r.card1At = await moment('1-2016', () => window.__danielLine.shown === 1 && window.__danielLine.drawn, 30000, 500);
  r.card2At = await moment('2-2026', () => window.__danielLine.shown === 2 && window.__danielLine.drawn, 30000, 500);
  r.card3At = await moment('3-2003', () => window.__danielLine.shown === 3 && window.__danielLine.drawn, 30000, 500);
  r.card4At = await moment('4-his-answer', () => window.__danielLine.shown === 4 && window.__danielLine.drawn, 30000, 1200);
  // the glass measured: its four corners through the camera that renders (the headset mock's head, or the camera)
  r.glass = await page.evaluate(() => {
    const app = window.__app, crt = app.root.findByName('daniel-line-crt'), cam = app.root.findByName('camera');
    const glass = crt?.findByName('close-crt-glass'); const mi = glass?.render?.meshInstances?.[0];
    if (!crt || !mi || !cam?.camera) return null;
    const a = mi.aabb, c = a.center, h = a.halfExtents;
    const pts = [];
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      const p = new c.constructor(c.x + dx * h.x, c.y + dy * h.y, c.z + dz * h.z);
      const s = cam.camera.worldToScreen(p); pts.push([Math.round(s.x), Math.round(s.y), +s.z.toFixed(2)]);
    }
    const cw = app.graphicsDevice.canvas.clientWidth, ch = app.graphicsDevice.canvas.clientHeight;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const whole = pts.every(([x, y, z]) => z > 0 && x >= 0 && x <= cw && y >= 0 && y <= ch);
    const eye = cam.getPosition(), at = crt.getPosition();
    return { whole, view: [cw, ch], glassCssW: Math.max(...xs) - Math.min(...xs), glassCssH: Math.max(...ys) - Math.min(...ys),
      dist: +eye.distance(at).toFixed(3), drawCalls: window.__drawCalls ?? null };
  });
  const glassPng = await page.evaluate(() => {
    const g = window.__app.root.findByName('daniel-line-crt')?.findByName('close-crt-glass');
    const tex = g?.render?.meshInstances?.[0]?.material?.emissiveMap ?? g?.render?.meshInstances?.[0]?.material?.diffuseMap;
    const src = tex?.getSource?.();
    return src && src.toDataURL ? src.toDataURL('image/png') : null;
  });
  if (glassPng) fs.writeFileSync(path.join(OUT, `${tag}-glass.png`), Buffer.from(glassPng.split(',')[1], 'base64'));
  r.backAt = await moment('5-back-on-the-desk', () => window.__danielLine.phase === 'rest', 40000);
  r.onGlassSeconds = +((Date.now() - dark0) / 1000).toFixed(1);
  r.cardAt = await moment('6-the-close', () => window.__closeCard?.on === true, 120000);
  rows.push(r);
  console.log(JSON.stringify(r));
  await page.close();
}
fs.writeFileSync(path.join(OUT, 'crt-probe.json'), JSON.stringify(rows, null, 1));
await browser.close();
