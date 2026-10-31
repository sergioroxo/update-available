/** S270g — photographs the headset's own layer (src/frame/xrLayer.ts) in a mocked headset: Lamby in each era
 *  (the balloon forced up), the 2026 lens (the visor forced on), the dollhouse, and the table match. Review only —
 *  the forcing hooks exist under ?debug=1 and prove drawing, not reachability.
 *  node tools/xr-layer-review.mjs --port 3000 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if (!port) throw Error('Pass --port');
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/xr-layer'; fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'], defaultViewport: process.argv.includes('--hires') ? { width: 1280, height: 720, deviceScaleFactor: 2 } : { width: 960, height: 600 } });   // --hires: figures (2560 × 1440)
const report = [];
const open = async (era) => {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&era=${era}&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Log in/i.test(x.textContent || '')); b?.click(); });
  await page.waitForFunction(() => window.__os && window.__xrLayer && window.__xrComfort, { timeout: 180000 });
  await wait(9000);
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility:hidden !important; }' });
  await page.evaluate((h) => { window.__hires = h; }, process.argv.includes('--hires'));
  await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.camera.fov = 75;
    if (window.__hires) app.root.findByName('xr-debug')?.setLocalScale(0, 0, 0); });
  await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
  await wait(1500);
  return { page, errors };
};
const look = (page, yaw, pitch) => page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), yaw, pitch);
const shot = async (page, name) => { const r = await Promise.race([page.screenshot({ path: `${out}/${name}.png` }).then(() => 'ok'), wait(30000).then(() => 'TIMEOUT')]); return { name, r }; };
try {
  for (const era of [1, 2, 3, 4]) {
    const { page, errors } = await open(era);
    const shots = [];
    // Lamby: the desk (1997/2003), the phone (2016), the laptop (2026)
    await page.evaluate(() => window.__xrLayer.review({ lamby: true }));
    await look(page, era === 3 ? 25 : era === 4 ? -10 : 0, -15);
    await wait(1800); shots.push(await shot(page, `e${era}-lamby`));
    await page.evaluate(() => window.__xrLayer.review({ lamby: false }));
    if (era === 1) {
      // the table: a fingertip 0.35 m under the eye; the shift should change by the difference
      const before = await page.evaluate(() => window.__xrComfort.status().shift[1]);
      const after = await page.evaluate(() => { const y = window.__app.root.findByName('camera').getPosition().y - 0.35; window.__xrComfort.matchDesk(y); return window.__xrComfort.status().shift[1]; });
      await look(page, 0, -30); await wait(800); shots.push(await shot(page, 'e1-table-matched'));
      shots.push({ name: 'table', before, after });
      // the dollhouse
      await look(page, 0, -10);
      await page.evaluate(() => window.__xrLayer.dollhouse());
      await wait(1500); shots.push(await shot(page, 'e1-dollhouse'));
    }
    // a fake controller, placed in the presentation space at a room point (VR-01 mouse, VR-03 phone)
    const addPad = (name, lx, ly, lz) => page.evaluate((name, lx, ly, lz) => {
      const app = window.__app, c = window.__xrComfort, head = app.root.findByName('camera');
      const V = head.getPosition().constructor;
      const at = c.physicalPoint(new V(lx, ly, lz)), dir = at.clone().sub(head.getPosition()).normalize();
      const src = { targetRayMode: 'tracked-pointer', handedness: 'right', hand: null, gamepad: { buttons: [], axes: [] },
        getOrigin: () => at, getDirection: () => dir, getPosition: () => at, getRotation: () => head.getRotation() };
      window[name] = { src, at }; app.xr.input.fire('add', src); return [at.x, at.y, at.z];
    }, name, lx, ly, lz);
    const nudge = (name, dx, dz) => page.evaluate((name, dx, dz) => { const p = window[name]; p.at.x += dx; p.at.z += dz; }, name, dx, dz);
    if (era === 2) {
      const m = await page.evaluate(() => window.__app.root.findByName('mouse')?.getPosition().toArray() ?? null);
      if (m) {
        await addPad('__pad', m[0], m[1] + 0.04, m[2]);
        await wait(600);
        for (let i = 0; i < 10; i++) { await nudge('__pad', 0.006, -0.004); await wait(120); }
        await look(page, 0, -12); await wait(800);
        const state = await page.evaluate(() => ({ engaged: window.__xrLayer.mouseEngaged, mouse: window.__app.root.findByName('mouse').getPosition().toArray().map(n => +n.toFixed(3)) }));
        shots.push({ name: 'mouse', mouseAt: m.map(n => +n.toFixed(3)), ...state });
        shots.push(await shot(page, 'e2-mouse'));
      }
    }
    if (era === 2) { await look(page, -25, -35); await wait(1200); shots.push(await shot(page, 'e2-flipphone-shut')); }
    if (era === 3) {
      const ph = await page.evaluate(() => { const e = window.__app.root.findByName('era3-device-phone') ?? null; return e ? e.getPosition().toArray() : null; });
      shots.push({ name: 'phonePos', ph });
      if (ph) {
        await addPad('__pad3', ph[0], ph[1] + 0.03, ph[2]);
        await page.evaluate(() => window.__app.xr.input.fire('squeezestart', window.__pad3.src));
        await page.evaluate(() => { const p = window.__pad3, cam = window.__app.root.findByName('camera'), V = cam.getPosition().constructor;
          p.at.copy(cam.getPosition().clone().add(cam.forward.clone().mulScalar(0.32)).add(new V(0.06, -0.12, 0))); });
        await look(page, 0, -10); await wait(1500);
        shots.push({ name: 'phoneHeld', inHand: await page.evaluate(() => window.__app.root.findByName('era3-device-phone')?.getPosition().toArray().map(n => +n.toFixed(2))) });
        shots.push(await shot(page, 'e3-phone-in-hand'));
      }
    }
    if (era === 4) {
      await page.evaluate(() => window.__xrLayer.review({ worn: true }));
      await look(page, 0, 0); await wait(1500); shots.push(await shot(page, 'e4-lens'));
      await page.evaluate(() => window.__xrLayer.review({ worn: false }));
    }
    report.push({ era, shots, errors: errors.slice(0, 6) });
    console.log('era', era, JSON.stringify(shots), errors.length ? errors.slice(0, 3) : 'no errors');
    await page.close();
  }
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000).then(() => browser.process()?.kill('SIGKILL'))]);
}
