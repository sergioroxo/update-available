/** S270g — photographs the headset's own layer (src/frame/xrLayer.ts) in a mocked headset: Lamby in each era
 *  (the balloon forced up), the 2026 lens (the visor forced on), the dollhouse, and the table match. Review only —
 *  the forcing hooks exist under ?debug=1 and prove drawing, not reachability.
 *  node tools/xr-layer-review.mjs --port 3000 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if (!port) throw Error('Pass --port');
const out = 'out/xr-layer'; fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
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
  await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.camera.fov = 75; });
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
