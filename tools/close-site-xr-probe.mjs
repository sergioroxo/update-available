#!/usr/bin/env node
/**
 * THE CLOSE'S WEBSITES IN THE HEADSET — PROBE (S365, UiB job 14 Part C2).
 *
 *     node tools/close-site-xr-probe.mjs --port 3171 --out out/s365-xr
 *
 * Mono WebGL with the XR manager's `active` forced true and a mocked tracked-pointer controller on `app.xr.input` (the
 * method of tools/cx4-xr-check.mjs and tools/close-order-probe.mjs — no claim of stereo or hardware timing). Opens the
 * Close from Daniel's seat (`?close=1`), presses through the messages, waits for the panels, calibrates the seat with a
 * select, then — for two eras' panels — AIMS THE CONTROLLER at the panel's own centre (not at its Sources button), fires
 * `select`, and checks that the site viewer's plane opens on that year; scrolls it with the thumbstick; aims at its close
 * box and presses it. One more run presses the small Sources button, and one a label. Each step is photographed.
 * Writes report.json beside the PNGs. Exit code 1 if any check fails.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3171));
const OUT = flag('out', 'out/s365-xr');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const page = await browser.newPage();
const errors = [], checks = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
const check = (name, ok, extra = '') => { checks.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
let n = 0;
const shot = async (label) => { const f = path.join(OUT, `${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };

try {
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__closeState && window.__siteViewer, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; } body > *:not(canvas) { visibility: hidden !important; }' });
  // the emulated headset: active, head at seat height, a controller
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src);
  });
  // through the messages to the panels (a press anywhere turns the card)
  const t0 = Date.now();
  let pressed = -1;
  while (Date.now() - t0 < 240000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.panels && st.open > 0.98 && !/message|travel|lookUp|hold/.test(st.stage ?? '')) break;
    if (st.stage === 'message' && st.card !== pressed) { await wait(2500); await page.mouse.click(640, 360); pressed = st.card; await wait(900); continue; }
    await wait(1200);
  }
  const st = await page.evaluate(() => window.__closeState());
  check('the Close reached its panels', st.panels && st.open > 0.9, JSON.stringify(st));
  // calibrate the seat (the first select does it), then wait for the stage to be still
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(2500);
  check('the seat is calibrated', await page.evaluate(() => window.__xrComfort.calibrated));
  const panels0 = await page.evaluate(() => window.__closePanels());
  console.log('panels:', JSON.stringify(panels0.map((p) => ({ i: p.i, era: p.era, hidden: p.hidden, face: p.face }))));

  // helpers (in page): aim at a logical-world point; aim at a logical pixel on the viewer plane
  const aimWorld = (pt) => page.evaluate((p) => {
    const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
    const origin = head.getPosition().clone();
    const target = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z));
    window.__controller.getOrigin = () => origin;
    window.__controller.getDirection = () => target.clone().sub(origin).normalize();
  }, pt);
  const aimViewer = (id) => page.evaluate((id) => {
    const app = window.__app, head = app.root.findByName('camera'), v = window.__siteViewer.xr;
    const px = v.core.centerOf(id); if (!px) return false;
    const plane = app.root.findByName('xr-frame-site');
    const wp = plane.getWorldTransform(), W = 1024, H = 768;
    const local = head.getPosition().clone().set((px.x / W - 0.5), 0, (px.y / H - 0.5));
    const target = wp.transformPoint(local, local.clone());
    const origin = head.getPosition().clone();
    window.__controller.getOrigin = () => origin;
    window.__controller.getDirection = () => target.clone().sub(origin).normalize();
    return true;
  }, id);
  const press = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  const viewer = () => page.evaluate(() => { const v = window.__siteViewer.xr; return { open: v.isOpen, info: v.core.info() }; });
  const lookAt = (pt) => page.evaluate((p) => {
    // turn the head (the camera child) toward the panel so the photo shows it; physical frame
    const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
    const t = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z)), o = head.getPosition();
    const d = t.clone().sub(o);
    head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
  }, pt);

  for (const want of [1, 3]) {
    const panels = await page.evaluate(() => window.__closePanels());
    const p = panels.find((q) => q.era === want && !q.hidden) ?? panels.find((q) => q.era === want);
    if (!p) { check(`era ${want}: a panel exists`, false); continue; }
    await lookAt(p);
    await aimWorld(p);
    await wait(700);
    await shot(`era${want}-aimed-at-panel`);
    await press();
    await wait(1500);
    let v = await viewer();
    const target = { 1: '1997', 2: '2003', 3: '2016', 4: '2026' }[want];
    check(`era ${want}: a press on the PANEL (not its button) opens the site window`, v.open, `view=${v.info.view}`);
    check(`era ${want}: it is that year's website (${target})`, String(v.info.view) === target, `view=${v.info.view}`);
    const after = await page.evaluate(() => window.__closePanels());
    check(`era ${want}: the panel did NOT turn to an in-room dossier card`, after.every((q) => q.face < 0), JSON.stringify(after.map((q) => q.face)));
    await shot(`era${want}-site-open`);
    // scroll with the thumbstick (right stick y = axes[3]) for a second
    const s0 = v.info.scroll;
    await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 1]; });
    await wait(1200);
    await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; });
    await wait(300);
    v = await viewer();
    check(`era ${want}: the thumbstick scrolls the site`, v.info.scroll > s0, `scroll ${s0} -> ${v.info.scroll} / max ${v.info.maxScroll}`);
    await shot(`era${want}-site-scrolled`);
    // close it: aim at the close box and press
    const aimed = await aimViewer('close');
    check(`era ${want}: the window publishes a close box to aim at`, aimed);
    await wait(500);
    await shot(`era${want}-aimed-at-close`);
    await press();
    await wait(800);
    v = await viewer();
    check(`era ${want}: pressing the close box closes the window`, !v.open);
    await shot(`era${want}-site-closed`);
  }

  // the small Sources button still opens it
  {
    const panels = await page.evaluate(() => window.__closePanels());
    const p = panels.find((q) => q.era === 2 && q.button) ?? panels.find((q) => q.button);
    if (p) {
      await lookAt(p.button); await aimWorld(p.button); await wait(700);
      await shot('sources-button-aimed');
      await press(); await wait(1500);
      const v = await viewer();
      check('the Sources button still opens its year', v.open, `era ${p.era} view=${v.info.view}`);
      await shot('sources-button-open');
      await page.evaluate(() => window.__siteViewer.close()); await wait(400);
    } else check('a Sources button is published', false);
  }
  // a label
  {
    const labels = await page.evaluate(() => window.__closeLabels());
    const lab = labels.find((l) => l.era === 3 && !/lexicon/i.test(l.text)) ?? labels.find((l) => l.era >= 1 && l.era <= 4);
    if (lab) {
      await lookAt(lab); await aimWorld(lab); await wait(700);
      await press(); await wait(1500);
      const v = await viewer();
      check(`a label ("${lab.text}", era ${lab.era}) opens that year's site`, v.open, `view=${v.info.view}`);
      await shot('label-open');
      await page.evaluate(() => window.__siteViewer.close()); await wait(400);
    }
  }
  const draws = await page.evaluate(() => window.__app.stats.drawCalls.total);
  check('draw calls within the budget while in the Close', draws <= 75, `draws ${draws}`);
} catch (e) {
  errors.push(String(e).slice(0, 300));
  console.error(e);
} finally {
  await shot('end').catch(() => {});
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ port: PORT, checks, errors }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed; errors ${errors.length}`);
process.exit(checks.every((c) => c.ok) && errors.length === 0 ? 0 : 1);
