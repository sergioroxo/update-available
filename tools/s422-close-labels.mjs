#!/usr/bin/env node
// ⚑ S422 (UiB job 35 Part B, C-2) — the Close's labels from the seat: degrees, and px in the headset mock at three pitches.
// S422 C-2: every constellation label from the seat in the headset mock (1000 px, 90°): its letter (em) in degrees, and in
// px with the head turned to it at three pitches (the label at the view's centre, 15° above it, 15° below it).
//   node tools/s422-close-labels.mjs <port> <out.json>
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const PORT = Number(process.argv[2]); const OUT = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 300000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1000 });
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__app && window.__os?.e4 && window.__closeState, { timeout: 180000 });
await wait(5000);
await page.evaluate(() => { const app = window.__app, h = app.root.findByName('camera');
  Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); h.setLocalPosition(0, 1.2, 0); h.camera.fov = 90;
  const src = { targetRayMode: 'tracked-pointer', getOrigin: () => h.getPosition().clone(), getDirection: () => { const V = h.getPosition().constructor; return new V(0, -1, 0); }, hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
  window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src); });
await wait(2500);
await page.evaluate(() => window.__os.debugJump('e4Act4End'));
const t0 = Date.now();
while (Date.now() - t0 < 400000) {
  const st = await page.evaluate(() => ({ card: window.__closeCard?.on ? window.__closeCard.i : -1, panels: window.__closeState().panels, open: window.__closeState().open, stage: window.__closeState().stage }));
  if (st.panels && st.open >= 1 && st.stage !== 'open') break;   // the sky fully opened (before S422 `panels` meant the opening had begun)
  if (st.card >= 0) { await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller)); await wait(900); continue; }
  await wait(1000);
}
await wait(3000);
const labels = await page.evaluate(() => {
  const app = window.__app, cam = app.root.findByName('camera');
  const eye = window.__xrComfort.logicalPoint(cam.getPosition().clone());
  return window.__closeLabels().map((l) => { const d = Math.hypot(l.x - eye.x, l.y - eye.y, l.z - eye.z); const em = l.hh * 2 * 26 / 36;
    return { text: l.text, era: l.era, dist: +d.toFixed(2), emDeg: +(2 * Math.atan(em / 2 / d) * 180 / Math.PI).toFixed(2), x: l.x, y: l.y, z: l.z, hh: l.hh, folded: l.folded, up: l.up ?? { x: 0, y: 1, z: 0 } }; });
});
for (const l of labels) {
  l.px = {};
  for (const dp of [-15, 0, 15]) {
    await page.evaluate((l, dp) => {
      const app = window.__app, h = app.root.findByName('camera'), c = window.__xrComfort, V = h.getPosition().constructor;
      const mid = c.physicalPoint(new V(l.x, l.y, l.z));
      const tl = h.parent.getWorldTransform().clone().invert().transformPoint(mid, new V()).sub(h.getLocalPosition());
      h.setLocalEulerAngles(Math.atan2(tl.y, Math.hypot(tl.x, tl.z)) * 180 / Math.PI + dp, Math.atan2(-tl.x, -tl.z) * 180 / Math.PI, 0);
    }, l, dp);
    await wait(120);
    l.px[dp] = await page.evaluate((l) => {
      const app = window.__app, h = app.root.findByName('camera'), c = window.__xrComfort, V = h.getPosition().constructor;
      // the letter along the label's own up (S422: published by __closeLabels; before S422 the labels stood upright)
      const k = l.hh * 26 / 36, u = l.up;
      const top = c.physicalPoint(new V(l.x + u.x * k, l.y + u.y * k, l.z + u.z * k)), bot = c.physicalPoint(new V(l.x - u.x * k, l.y - u.y * k, l.z - u.z * k));
      const a = h.camera.worldToScreen(top), b = h.camera.worldToScreen(bot);
      return a.z > 0 && b.z > 0 && a.y >= 0 && b.y <= 1000 && a.x >= 0 && a.x <= 1000 ? +Math.abs(b.y - a.y).toFixed(1) : null;
    }, l);
  }
}
fs.writeFileSync(OUT, JSON.stringify(labels, null, 1));
for (const l of labels) console.log(`${l.era} | ${l.text} | ${l.dist} m | ${l.emDeg}° | px ${JSON.stringify(l.px)}`);
await browser.close();
