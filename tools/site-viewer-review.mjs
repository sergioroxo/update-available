/** ⚑ S291 — photographs the site viewer (src/frame/siteViewer/). Review only; proves drawing and press routing, not a headset.
 *   node tools/site-viewer-review.mjs --port 3109 --harness            # the window alone (fast): tools/harness/site-viewer.html
 *   node tools/site-viewer-review.mjs --port 3109 --app                # inside the piece, opened from the menu, + the mocked headset plane
 *  Out: out/viewer-shots/*.png (override with --out). */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const port = Number(arg('--port', 0));
if (!port) throw Error('Pass --port');
const out = arg('--out', 'out/viewer-shots'); fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const size = (arg('--size', '1440x900')).split('x').map(Number);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-audio-output', '--disable-background-networking'],
  defaultViewport: { width: size[0], height: size[1], deviceScaleFactor: Number(arg('--dpr', 1)) }
});
const report = [];
const YEARS = ['1997', '2003', '2016', '2026'];
try {
  if (process.argv.includes('--harness')) {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.stack || e).slice(0, 300)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    await page.goto(`http://localhost:${port}/tools/harness/site-viewer.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__sv, { timeout: 30000 });
    const shot = async (name) => { await wait(500); const el = await page.$('#reinterp-site-viewer canvas'); await el.screenshot({ path: `${out}/${name}.png` }); const i = await page.evaluate(() => window.__sv.core.info()); report.push({ name, ...i, vp: undefined }); };
    for (const v of ['hub', ...YEARS]) {
      await page.evaluate((t) => window.__sv.open(t), v);
      await shot(`h-${v}-story`);
      if (v !== 'hub') {
        for (const tab of ['practices', 'sources', 'images', 'media', 'words', 'missed']) {
          await page.evaluate((t) => { window.__sv.core.setTab(t); }, tab);
          await page.evaluate(() => window.__sv.core.scrollBy(0));
          await shot(`h-${v}-${tab}`);
        }
        await page.evaluate(() => { window.__sv.core.setTab('sources'); window.__sv.core.scrollBy(900); });
        await shot(`h-${v}-sources-scrolled`);
        if (v === '1997') { await page.evaluate(() => window.__sv.core.scrollToText('Truth in Love')); await shot('h-1997-truth-in-love'); }
      } else {
        await page.evaluate(() => window.__sv.core.scrollBy(700));
        await shot('h-hub-scrolled');
      }
    }
  } else {
    // ── the piece itself ──
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.stack || e).slice(0, 300)));
    await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&era=2&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
    await page.waitForFunction(() => window.__os && window.__siteViewer && window.__xrFrame, { timeout: 180000 });
    await wait(6000);
    // 1) from the menu: open the menu, press "Sources — the four websites"
    await page.keyboard.press('Escape'); await wait(800);
    await page.screenshot({ path: `${out}/app-menu.png` });
    const pressed = await page.evaluate(() => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((x) => /Sources/i.test(x.textContent || '')); b?.click(); return !!b; });
    report.push({ menuRowFound: pressed });
    await wait(1200);
    await page.screenshot({ path: `${out}/app-viewer-from-menu.png` });
    await page.evaluate(() => window.__siteViewer.dom.setView('2003')); await wait(600);
    await page.screenshot({ path: `${out}/app-viewer-2003.png` });
    // Esc closes the viewer first, then the menu
    await page.keyboard.press('Escape'); await wait(500);
    report.push({ afterEsc: await page.evaluate(() => ({ viewer: window.__siteViewer.bus.domOpen(), menu: !!document.querySelector('#reinterp-game-menu') && getComputedStyle(document.querySelector('#reinterp-game-menu')).display }) ) });
    await page.keyboard.press('Escape'); await wait(500);
    // 1b) the browser window with the real mouse: a tab, the wheel, the arrow, minimise → tab → restore, close
    await page.evaluate(() => window.__siteViewer.open('2016')); await wait(600);
    const lp = async (id) => page.evaluate((i) => { const c = window.__siteViewer.dom.centerOf(i); const cv = document.querySelector('#reinterp-site-viewer canvas'); const r = cv.getBoundingClientRect(); const s = window.__siteViewer.dom.lastSize; return c ? { x: r.left + c.x / s.w * r.width, y: r.top + c.y / s.h * r.height } : null; }, id);
    const info = () => page.evaluate(() => window.__siteViewer.dom.info());
    let p = await lp('tab:sources'); await page.mouse.click(p.x, p.y); await wait(300);
    const t1 = (await info()).tab;
    p = await lp('sc:down'); await page.mouse.click(p.x, p.y); await wait(300);
    const s1 = (await info()).scroll;
    await page.mouse.move(640, 400); await page.mouse.wheel({ deltaY: 300 }); await wait(300);
    const s2 = (await info()).scroll;
    await page.screenshot({ path: `${out}/app-viewer-2016-scrolled.png` });
    p = await lp('min'); await page.mouse.click(p.x, p.y); await wait(500);
    const chip = await page.evaluate(() => !!document.getElementById('reinterp-site-chip'));
    await page.screenshot({ path: `${out}/app-viewer-minimised.png` });
    await page.evaluate(() => document.getElementById('reinterp-site-chip')?.click()); await wait(500);
    const back = await page.evaluate(() => window.__siteViewer.bus.domOpen());
    p = await lp('close'); await page.mouse.click(p.x, p.y); await wait(400);
    report.push({ dom: { tabAfterPress: t1, scrollAfterArrow: s1, scrollAfterWheel: s2, chipShown: chip, restored: back, closed: !(await page.evaluate(() => window.__siteViewer.bus.domOpen())) } });
    // 2) the headset, mocked
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.camera.fov = 75; });
    await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
    await wait(1500);
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility:hidden !important; }' });
    const draws = () => page.evaluate(() => window.__app.stats.drawCalls.total);
    const uploads = () => page.evaluate(() => window.__uploads ?? -1);
    const d0 = await draws();
    const ua = await uploads(); await wait(2000); const ub = await uploads();
    // a world ray from the head through a logical px of the plane
    const rayAt = (id) => page.evaluate((i) => {
      const sv = window.__siteViewer, app = window.__app, e = app.root.findByName('xr-frame-site'), head = app.root.findByName('camera');
      const c = sv.xr.core.centerOf(i); if (!c) return null;
      const V = e.getPosition().constructor; const w = e.getWorldTransform().transformPoint(new V(c.x / 1024 - 0.5, 0, c.y / 768 - 0.5));
      const o = head.getPosition(); const d = { x: w.x - o.x, y: w.y - o.y, z: w.z - o.z };
      return { p0: { x: o.x, y: o.y, z: o.z }, p1: { x: o.x + d.x * 2, y: o.y + d.y * 2, z: o.z + d.z * 2 } };
    }, id);
    const press = async (id) => { const r = await rayAt(id); return r ? page.evaluate((ray) => window.__siteViewer.xr.pressRay(ray), r) : 'no-hit-id'; };
    for (const y of YEARS) {
      await page.evaluate((t) => window.__siteViewer.open(t), y); await wait(1800);
      await page.screenshot({ path: `${out}/xr-${y}.png` });
      if (y === '2016') {
        const dOpen = await draws();
        const u0 = await uploads(); await wait(2000); const u1 = await uploads();
        const xr = {};
        xr.pressTab = await press('tab:sources'); await wait(400); xr.tab = await page.evaluate(() => window.__siteViewer.xr.core.info().tab);
        xr.pressDown = await press('sc:down'); await wait(300); xr.scroll = await page.evaluate(() => window.__siteViewer.xr.core.info().scroll);
        await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__siteViewer.xr.stick(1); }); await wait(500);
        xr.afterStick = await page.evaluate(() => window.__siteViewer.xr.core.info().scroll);
        for (let i = 0; i < 40 && !xr.link; i++) { await press('sc:down'); await wait(90); xr.link = await page.evaluate(() => window.__siteViewer.xr.core.firstDocHit('url')); }
        await wait(300);
        if (xr.link) { xr.pressLink = await press(xr.link); await wait(300); xr.toast = await page.evaluate(() => window.__siteViewer.xr.core.toastText()); }
        await page.screenshot({ path: `${out}/xr-2016-sources-scrolled.png` });
        xr.pressMin = await press('min'); await wait(300); xr.minimised = await page.evaluate(() => window.__siteViewer.xr.isMinimised);
        xr.planeOffWhenMin = await page.evaluate(() => !window.__app.root.findByName('xr-frame-site').enabled);
        report.push({ xr, drawsBefore: d0, drawsOpen: dOpen, uploadsIdleViewerOpen: u1 - u0, uploadsIdleViewerClosed: ub - ua });
        await page.evaluate(() => window.__siteViewer.xr.open('2016')); await wait(1200);
        await press('close'); await wait(300);
        report.push({ xrClosed: await page.evaluate(() => !window.__siteViewer.xr.isOpen) });
        await page.screenshot({ path: `${out}/xr-closed.png` });
      }
      await page.evaluate(() => window.__siteViewer.close());
    }
    report.push({ errors });
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report).slice(0, 3000));
}
