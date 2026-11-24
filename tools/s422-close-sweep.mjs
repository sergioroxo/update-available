#!/usr/bin/env node
// ⚑ S422 (UiB job 35 Part B) — the Close's draw calls, whole, in the headset mock and on the computer (from out/j33-sweep.mjs of job 33).
// S422: draw calls through the whole Close, from the end of 2026 (e4Act4End) to the Restart page, in the seated headset mock
// (the head swept every 30° in yaw, pitch 0 / +25 / -25, a step every 400 ms) and on the computer (no sweep). The cards are
// turned with a press ~3 s after each comes. Per stage: the most draw calls seen (100 ms samples), and where the head was.
//   node tools/s422-close-sweep.mjs <port> <outdir> [headset,computer]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const PORT = Number(process.argv[2]); const OUT = path.resolve(process.argv[3]);
const MODES = (process.argv[4] || 'headset,computer').split(',');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };
const rows = [];
await Promise.all(MODES.map(async (mode) => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 300000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__closeState, { timeout: 180000 });
  await wait(5000);
  if (mode === 'headset') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await wait(2500);
  }
  await page.evaluate(() => window.__os.debugJump('e4Act4End'));
  await page.evaluate(() => {
    window.__sw = {};
    window.__swT = setInterval(() => {
      const c = window.__closeState?.(); const k = (c?.stage ?? (c?.ended ? 'ended' : 'pre')) + (c?.page ? ':' + c.page : '');
      const d = window.__drawCalls ?? 0; const o = window.__sw[k] ??= { max: 0, at: null, n: 0 }; o.n++;
      if (d > o.max) { o.max = d; o.at = window.__swYaw ?? null; }
    }, 100);
  });
  const t0 = Date.now(); let i = 0, lastCard = -1, cardAt = 0, pressedMachine = false, endAt = 0;
  while (Date.now() - t0 < 420000) {
    if (mode === 'headset') {
      const yaw = (i % 12) * 30, pitch = [0, 25, -25][Math.floor(i / 12) % 3]; i++;
      await page.evaluate((y, p) => { window.__swYaw = [y, p]; window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0); }, yaw, pitch);
    }
    const st = await page.evaluate(() => ({ c: window.__closeState(), card: window.__closeCard?.on ? window.__closeCard.i : -1, ended: window.__closeMachine?.ended, ending: window.__closeMachine?.endingShowing }));
    if (st.card >= 0) {
      if (st.card !== lastCard) { lastCard = st.card; cardAt = Date.now(); }
      else if (Date.now() - cardAt > 3000) {
        if (mode === 'headset') await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
        else { await page.mouse.click(640, 500); }
        cardAt = Date.now() + 99999;
      }
    }
    if (st.ended && !pressedMachine) {
      pressedMachine = true;
      if (mode === 'headset') await page.evaluate(() => { const ss = [...(window.__siteViewer ? [1] : [])]; window.__siteViewer.open('machine'); });
      else await page.evaluate(() => window.__siteViewer.open('machine'));
      endAt = Date.now();
    }
    if (endAt && Date.now() - endAt > 15000) break;
    await wait(400);
  }
  const r = await page.evaluate(() => { clearInterval(window.__swT); return window.__sw; });
  const log = await page.evaluate(() => window.__closeLog);
  rows.push({ mode, stages: r, log, errors: errors.slice(0, 5) });
  console.log(mode, JSON.stringify(r));
  await Promise.race([browser.close(), wait(5000)]);
}));
fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify(rows, null, 1));
