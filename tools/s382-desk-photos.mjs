#!/usr/bin/env node
/**
 * ⚑ S382 (UiB job 22 Part A, items 1–3) — VERA'S DESK, PHOTOGRAPHED THE SAME WAY BEFORE AND AFTER.
 *
 *     node tools/s382-desk-photos.mjs --port 5311 --out out/s382-desk/before [--mode desktop|xr|both]
 *
 * One framing list, run on the base commit (before) and on the built one (after), so the pairs are like for like:
 *   01 the seat (the board signed in) · 02 the particles to the left (the lamp's side) · 03 the particles behind the seat
 *   04 the notebook on the desk, looked at · 05 the notebook PRESSED (a real mouse press at its place on the screen; in the
 *   headset a controller ray and select) — before the build nothing happens · 06 the mug, once Nuala's message has been
 *   read (her record closed by its own button) · 07 the particles during a glitch (the 2016 → 2026 update's install,
 *   at the bar's stutter) · 08 the same framing as 02 under Reduce motion.
 * `?reinterp=1&era=3&debug=1&descent=0&kiosk=0`; the headset is tools/harness/xr-mock.mjs. Needs a Vite server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';
import { installXrMock } from './harness/xr-mock.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s382-desk/photos'));
const MODES = flag('mode', 'both') === 'both' ? ['desktop', 'xr'] : [flag('mode', 'desktop')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const SEAT = { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 };

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__graceQueue?.(), { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await installXrMock(page, 3);
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  await wait(6000);
  // the board, signed in; the Wick card's rise-once at sign-in is over before anything is photographed
  await page.evaluate(() => window.__graceQueue().debugBeat('board'));
  await page.waitForFunction(() => !window.__graceQueue().wickConducting, { timeout: 30000 }).catch(() => {});
  await wait(5000);
  const look = (pitch, yaw) => page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), SEAT, pitch, yaw);
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${mode}-${name}.png`) }); };
  const settle = (ms = 900) => wait(ms);

  await look(SEAT.pitch, SEAT.yaw); await settle(); await shot('01-seat');
  await look(4, SEAT.yaw + 48); await settle(); await shot('02-particles-left');
  await look(8, SEAT.yaw + 175); await settle(); await shot('03-particles-behind');

  // the notebook: looked at, then pressed where it lies
  await look(-30, SEAT.yaw + 22); await settle(); await shot('04-notebook-desk');
  const nb = await page.evaluate(() => { const e = window.__app.root.findByName('w_notepad'); const p = e.getPosition(); return { x: p.x, y: p.y + 0.01, z: p.z }; });
  if (xr) {
    await page.evaluate((w) => {
      const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
      const phys = window.__xrComfort.physicalPoint(new V(w.x, w.y, w.z));
      const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.1)).add(head.up.clone().mulScalar(-0.25));
      window.__controller.getOrigin = () => origin.clone();
      window.__controller.getDirection = () => phys.clone().sub(origin).normalize();
    }, nb);
    await wait(250); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  } else {
    const at = await page.evaluate((w) => { const cam = window.__app.root.findByName('camera'), V = cam.getPosition().constructor; const s = cam.camera.worldToScreen(new V(w.x, w.y, w.z), new V()); return { x: s.x, y: s.y }; }, nb);
    await page.mouse.move(at.x, at.y); await wait(80); await page.mouse.down(); await wait(70); await page.mouse.up();
  }
  await wait(2200); await shot('05-notebook-pressed');
  await wait(400);
  // put it down (a press anywhere else) and come back to the seat
  if (xr) await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  else { await page.mouse.move(640, 120); await wait(80); await page.mouse.down(); await wait(70); await page.mouse.up(); }
  await wait(1500);

  // the mug: her record closed by its own button → Nuala's message → read
  await look(SEAT.pitch, SEAT.yaw); await settle();
  await page.evaluate(() => { const q = window.__graceQueue(); q.mode = 'board'; q.veraPage = 'record'; q.recordPage = 0; q.bump(); });
  await wait(600);
  await page.evaluate(() => { const q = window.__graceQueue(); const r = q.rects.find((h) => h.id === 'vera-record-close'); if (r) q.handleClick(r.x + r.w / 2, r.y + r.h / 2); });
  await page.waitForFunction(() => window.__graceQueue().phone.delivered('nuala'), { timeout: 60000 }).catch(() => {});
  await wait(1500); await shot('06a-nuala-message');
  await page.waitForFunction(() => !window.__graceQueue().phone.voiceBusy, { timeout: 60000 }).catch(() => {});
  await wait(1800); await shot('06b-mug-moment');
  await wait(4500); await shot('06c-after-the-mug');

  // the glitch: the 2016 → 2026 update, pressed through to its install, photographed at the bar's stutter
  await page.evaluate(() => { const q = window.__graceQueue(); q.kitPopin = false; q.bump(); });
  await look(4, SEAT.yaw + 48); await settle();
  await page.evaluate(() => window.__os.debugJump('update4'));
  for (let i = 0; i < 80; i++) {
    const s = await page.evaluate(() => { const u = window.__os.updateApp; if (!u) return null; const r = u.hits?.find((h) => ['update-now', 'eula-readon', 'eula-agree'].includes(h.id)); if (r && !u.installing) u.handleClick(r.x + r.w / 2, r.y + r.h / 2); return { installing: u.installing, k: u.installTotal ? u.t / u.installTotal : 0, phase: u.phase }; });
    if (s?.installing && s.phase === 'install' && s.k > 0.8) break;
    await wait(200);
  }
  await shot('07-particles-glitch');
  await wait(300); await shot('07b-particles-glitch');
  await page.close();
  return errors;
}

async function runReduced(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__graceQueue?.(), { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) { await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' }); await installXrMock(page, 3); }
  await page.evaluate(async () => { (await import('/src/state/motion.ts')).setReducedMotion(true); });
  await wait(6000);
  await page.evaluate(() => window.__graceQueue().debugBeat('board'));
  await page.evaluate((s) => window.__camFree(s.x, s.y, s.z, 4, s.yaw + 48), SEAT);
  await wait(6000);
  await page.screenshot({ path: path.join(OUT, `${mode}-08-particles-reduced.png`) });
  await page.close();
}

const errs = {};
for (const m of MODES) { errs[m] = await run(m); await runReduced(m); console.log('photographed', m, errs[m].length ? errs[m] : 'no page errors'); }
await browser.close();
fs.writeFileSync(path.join(OUT, 'errors.json'), JSON.stringify(errs, null, 2));
