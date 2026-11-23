#!/usr/bin/env node
/**
 * ⚑ S423 (UiB job 35 Part C, 16-19 / 16-20) — THE 2016 → 2026 UPDATE, PHOTOGRAPHED FROM VERA'S CHAIR, IN THE THREE LOOKS.
 *
 *     node tools/s423-update-stills.mjs --port 5641 --out <dir> [--modes desktop,phone,xr]
 *
 * Opens 2016 (`?era=3`), sits in Vera's chair, arms u4 through the debug jump `update4` (the ritual composited on her
 * workstation, as in play), and photographs each screen of it as a visitor sees it from the seat: the notice
 * (Important Changes), the deferral ("Remind me later", pressed once) and the notice back with the spent button, every
 * EULA page (and its button), the install three times (early, the changelog typed, the report typed), and the restart.
 * Presses go to the ritual's own registered hits (`__os.updateApp.hits`, the rects its draw publishes), at their centre.
 * The deferral is shortened for the stills only (its 40 s wait is the piece's; the press and its return are unchanged).
 * Files: <out>/update_<n>_<screen>_<mode>.png. Measurement only.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s423/update'));
const MODES = flag('modes', 'desktop,phone,xr').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const log = [];

async function run(mode) {
  const page = await browser.newPage();
  const VW = mode === 'phone' ? 844 : mode === 'xr' ? 1000 : 1280, VH = mode === 'phone' ? 390 : mode === 'xr' ? 1000 : 720;
  if (mode === 'phone') await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: mode === 'xr' ? 1 : 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app && window.__xrComfort && window.__seatCut, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  await wait(2000);
  await page.evaluate(() => window.__seatCut(90)); await wait(2500);
  if (mode === 'xr') {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(2500);
    // the head looks a little down, at the monitor (a seated visitor at a desk)
    await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(-6, 0, 0));
    await wait(600);
  }
  let n = 0;
  const shot = async (name) => { await wait(700); const f = path.join(OUT, `update_${String(++n).padStart(2, '0')}_${name}_${mode}.png`); await page.screenshot({ path: f }); log.push(path.basename(f)); };
  const ritual = () => page.evaluate(() => { const u = window.__os.updateApp; return u ? { phase: u.phase, page: u.page, hits: u.hits.map((h) => h.id), open: u.open } : null; });
  const press = (id) => page.evaluate((id) => {
    const u = window.__os.updateApp; const h = u?.hits.find((x) => x.id === id); if (!h) return false;
    u.handleClick(h.x + h.w / 2, h.y + h.h / 2); return true;
  }, id);
  await page.evaluate(() => window.__os.debugJump('update4'));
  await page.waitForFunction(() => window.__os.updateApp?.hits?.some((h) => h.id === 'update-now'), { timeout: 30000 }).catch(() => {});
  await shot('notice');
  // the deferral, once: the notice withdraws, then returns with the spent button
  await press('remind-later'); await wait(400);
  await shot('deferred');
  await page.evaluate(() => { const u = window.__os.updateApp; if (u) u.t = 999; });
  await page.waitForFunction(() => window.__os.updateApp?.hits?.some((h) => h.id === 'update-now'), { timeout: 30000 }).catch(() => {});
  await shot('notice-again');
  await press('update-now');
  await page.waitForFunction(() => window.__os.updateApp?.hits?.some((h) => /^eula-/.test(h.id)), { timeout: 30000 }).catch(() => {});
  for (let p = 1; p <= 8; p++) {
    const r = await ritual();
    if (!r || r.phase !== 'eula') break;
    await shot(`terms-p${p}`);
    if (r.hits.includes('eula-agree')) { await press('eula-agree'); break; }
    await press('eula-readon');
    await wait(300);
  }
  // the install: early, the changelog typed, the report typed
  const installTotal = await page.evaluate(() => window.__os.updateApp?.installTotal ?? 30);
  const clEnd = await page.evaluate(() => (window.__os.updateApp?.s?.changelog?.length ?? 0) * 1.5);
  await wait(5000); await shot('install-early');
  await page.waitForFunction((t) => (window.__os.updateApp?.t ?? 0) >= t, { timeout: 90000 }, clEnd + 0.3).catch(() => {});
  await shot('install-changelog');
  await page.waitForFunction((t) => (window.__os.updateApp?.t ?? 0) >= t, { timeout: 90000 }, installTotal - 1.2).catch(() => {});
  await shot('install-report');
  await page.waitForFunction(() => window.__os.updateApp?.phase === 'restart', { timeout: 60000 }).catch(() => {});
  await wait(600); await shot('restart');
  console.log(`${mode}: ${n} stills · install ${installTotal.toFixed(1)} s · errors ${errors.length}${errors.length ? ' ' + JSON.stringify(errors.slice(0, 3)) : ''}`);
  await page.close();
}

try { for (const m of MODES) { try { await run(m); } catch (e) { console.log(`${m}: FAILED ${String(e).slice(0, 300)}`); } } }
finally {
  fs.writeFileSync(path.join(OUT, 'stills.json'), JSON.stringify(log, null, 1));
  await Promise.race([browser.close(), wait(5000)]);
  fs.writeFileSync(path.join(OUT, 'stills.done'), 'done\n');
}
