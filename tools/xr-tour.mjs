/** S270f — THE VR TOUR. Each era from its VR seat, in a mocked headset with a real tracked head height (1.2 m above
 *  the rig, as a Quest's local space gives), at a headset-like field of view: the four directions and a look down at
 *  the desk, plus the comfort status, the draw count and the screen uploads. It finds what a headset finds — a black
 *  screen, a room that does not follow the seat, things floating or missing — without a headset. Mono WebGL; no
 *  claim of headset timing or stereo. Era jumps are review routes (`?era=`), never a reachability proof.
 *  node tools/xr-tour.mjs --port 3000 [--eras 1,2,3,4] */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const port = Number(arg('port', 0));
if (!port) throw Error('Pass --port');
const eras = arg('eras', '1,2,3,4').split(',').map(Number);
const mock = !process.argv.includes('--no-mock');   // --no-mock: the same views in the browser, for comparison
const out = 'out/xr-tour'; fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const report = [];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
try {
  for (const era of eras) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e.stack || e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
    await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&era=${era}&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Log in/i.test(x.textContent || '')); b?.click(); });
    await page.waitForFunction(() => window.__os && window.__app && window.__xrComfort, { timeout: 180000 });
    await wait(9000);   // the arrival settles (seat, era props, the desktop's first frames)
    await page.evaluate((m) => { window.__mock = m; }, mock);
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility:hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      if (window.__mock) { Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); }
      head.camera.fov = 75;   // vertical; ~100° across at 960 × 600
    });
    await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
    await wait(2500);
    const views = [['front', 0, 0], ['desk', 0, -30], ['left', 90, 0], ['right', -90, 0], ['back', 180, 0]];
    const shots = [];
    for (const [name, yaw, pitch] of views) {
      await page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), yaw, pitch);
      await wait(1500);
      const file = `${out}/e${era}-${name}${mock ? '' : '-browser'}.png`;
      const r = await Promise.race([page.screenshot({ path: file }).then(() => 'ok'), wait(30000).then(() => 'TIMEOUT')]);
      shots.push({ name, file, r });
    }
    const state = await page.evaluate(() => {
      const c = window.__xrComfort.status(), app = window.__app;
      return { drawsNow: app.stats.drawCalls.total, spine: window.__spine?.()?.step ?? null, era: window.__os.era, inDesktop: window.__os.inDesktop,
        seat: { calibrated: c.calibrated, cuts: c.cuts, shift: c.shift.map(n => +n.toFixed(2)), yaw: Math.round(c.shiftYaw), batches: `${c.batchesOnStage}/${c.batches}` },
        draws: app.stats.drawCalls.total, uploads: window.__uploads ?? null,
        outside: app.root.children.filter(e => e.name !== 'xr-world').map(e => e.name) };
    });
    report.push({ era, state, shots, errors: errors.slice(0, 8) });
    console.log(`era ${era}:`, JSON.stringify(state), errors.length ? `${errors.length} errors` : 'no errors');
    await page.close();
  }
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000).then(() => browser.process()?.kill('SIGKILL'))]);
}
