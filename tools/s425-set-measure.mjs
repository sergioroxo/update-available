#!/usr/bin/env node
/**
 * ⚑ S425 (UiB job 35 Part D; the coordinator's S424 follow-up) — IS 2016'S BROUGHT SET READABLE FROM THE SEAT? Brings the set
 * beside the monitor the way Bring it does (TeachingTv.bringHere: beside its monitor, S424's place; S425's turned look on a
 * computer), plays the tape at a caption (t = 9 s, "Is a friendship / getting too close?", burned into its picture), and
 * measures, in the same still, from the seat:
 *   · the monitor's glass and the set's glass, across, in screen px (projected), and their ratio;
 *   · the monitor's body text: the tall letters of "story caretender · in training" (the board's 11 px line) in the still's
 *     pixels; the tape's caption: the tall letters of its first line in the still's pixels.
 * Measurement only (a debug bring, a debug play): it is not a reachability proof — the walk is. One still per look:
 *     node tools/s425-set-measure.mjs --port 5671 --out <dir> --name after [--modes desktop,desktop169,xr,phone]
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s425/set')); const NAME = flag('name', 'after');
const MODES = flag('modes', 'desktop,desktop169,xr,phone').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const VIEWS = { desktop: { width: 1280, height: 800 }, desktop169: { width: 1920, height: 1080 }, xr: { width: 1000, height: 1000 }, phone: { width: 390, height: 844 } };
const results = {};
for (const mode of MODES) {
  const XR = mode === 'xr', PHONE = mode === 'phone', VIEW = VIEWS[mode];
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
    defaultViewport: { ...VIEW, deviceScaleFactor: 1 } });
  const page = await browser.newPage();
  if (PHONE) await page.emulate({ userAgent: IPHONE_UA, viewport: { ...VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__teachingTv, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
  await wait(4000);
  await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').startsWith('⚙')) b.style.visibility = 'hidden'; }));
  if (XR) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
      const w2s = head.camera.worldToScreen.bind(head.camera);
      head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
  }
  // the board: sign in and answer Lambient (the platform's own handler at its own controls), This week put away
  for (const id of ['signin', 'consent-allow', 'pause-close']) {
    await page.evaluate((id) => { const q = window.__graceQueue(); const r = q.rects.find((x) => x.id === id); if (r) q.handleClick(r.x + r.w / 2, r.y + r.h / 2); }, id);
    await wait(2500);
  }
  await page.evaluate(() => { const q = window.__graceQueue(); q.pauseOpen = false; q.lambPriority = false; q.lambLines = null; q.bump?.(); });
  await wait(1500);
  // the set, brought as Bring it brings it (S424's place; S425's turned look on a computer), and played at a caption
  const yawOf = () => page.evaluate(() => { const p = window.__camPose?.(); return p ? Math.round(((p.yaw ?? 0) + (p.lookYaw ?? 0)) * 10) / 10 : null; });
  const yawBefore = await yawOf();
  const fit = await page.evaluate(() => {
    const tv = window.__teachingTv.inst('2016');
    if (window.__teachingTv.bringTo) window.__teachingTv.bringTo('2016');
    else { const cam = window.__app.root.findByName('camera'); tv.wake(); tv.bringHere(cam, false, cam.camera); }   // S424's build (before S425): a screen only
    return { band: tv.fitted?.band, k: tv.fitted?.k };
  });
  await wait(2600);
  await page.evaluate(() => window.__teachingTv.play('2016', 9.0));
  await wait(1800);
  await page.evaluate(() => { const tv = window.__teachingTv.inst('2016'); tv.pause?.('visitor'); });
  await wait(900);
  const geo = await page.evaluate(() => {
    const app = window.__app; let camE = null; app.root.forEach((e) => { if (e.camera && e.enabled) camE = e; });
    const V = app.root.getPosition().constructor;
    const proj = (ent, pts) => {
      const m = ent.getWorldTransform(); return pts.map(([x, y, z]) => { const o = new V(); m.transformPoint(new V(x, y, z), o); const s = camE.camera.worldToScreen(o); return [s.x, s.y, s.z]; });
    };
    const mon = app.root.findByName('era3-device-workstation');
    const mp = proj(mon, [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]]);
    const tv = window.__teachingTv.inst('2016');
    const gp = proj(tv.entity, [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]]);
    const box = (p) => ({ x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), y1: Math.max(...p.map((q) => q[1])) });
    return { monitor: box(mp), glass: box(gp), drawCalls: window.__drawCalls ?? null, tv: { pose: tv.pose, state: tv.state, fitted: tv.fitted } };
  });
  const file = path.join(OUT, `set_${mode}_${NAME}.png`);
  await page.screenshot({ path: file });
  const yawBrought = await yawOf();
  const fitted = await page.evaluate(() => window.__teachingTv.inst('2016').fitted);
  // her body press puts it back: the look the set turned comes back with it
  await page.evaluate(() => window.__teachingTv.putBack('2016'));
  await wait(2200);
  const yawBack = await yawOf();
  results[mode] = { view: VIEW, fit, fitted, yaw: { before: yawBefore, brought: yawBrought, putBack: yawBack }, ...geo, monitorW: Math.round(geo.monitor.x1 - geo.monitor.x0), glassW: Math.round(geo.glass.x1 - geo.glass.x0),
    ratio: +((geo.glass.x1 - geo.glass.x0) / (geo.monitor.x1 - geo.monitor.x0)).toFixed(3), file, errors };
  console.log(mode, JSON.stringify(results[mode]));
  await Promise.race([browser.close(), wait(6000)]);
}
fs.writeFileSync(path.join(OUT, `set_${NAME}.json`), JSON.stringify(results, null, 1));
process.exit(0);
