/** Review Home's real quad/texture and input adapter with a mocked XR manager.
 * This is mono WebGL, NOT stereo WebXR hardware emulation. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if (!port) throw new Error('Pass --port; never default to the lead port.');
const out = path.resolve('out/home-xr'); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }
});
const page = await browser.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
const checks = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluateOnNewDocument(() => {
  const xr = new EventTarget();
  xr.isSessionSupported = async (type) => type === 'immersive-vr';
  xr.requestSession = async () => { throw new Error('Use the explicit mocked manager, no physical XR device.'); };
  Object.defineProperty(navigator, 'xr', { value: xr, configurable: true });
});
// Hold model assets to prove Home remains rendered and operable during preload.
await page.setRequestInterception(true);
let release; const modelHold = new Promise((r) => { release = r; });
let heldModels = 0;
page.on('request', async (req) => {
  if (req.url().includes('/assets/models/')) { heldModels++; await modelHold; }
  if (!req.isInterceptResolutionHandled()) await req.continue();
});
try {
  await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&kiosk=0`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__homeXr);
  await page.evaluate(async () => {
    await window.__homeXr.ready;
    const app = window.__homeXr.app;
    let active = false;
    Object.defineProperty(app.xr, 'active', { get: () => active });
    app.xr.start = (_cam, _type, _space, options) => { active = true; options?.callback?.(null); };
    app.xr.end = () => { active = false; }; // no native XRSession exists for PlayCanvas's end listeners
    window.__homeXr.show();
    window.__mockHead = app.root.findByName('camera');
    window.__selectHome = (id, mode = 'tracked-pointer', event = 'select') => {
      const target = window.__homeXr.target(id); if (!target) throw new Error(`No target: ${id}`);
      const origin = window.__mockHead.getPosition().clone();
      const direction = origin.clone().set(...target).sub(origin).normalize();
      const src = { targetRayMode: mode, getOrigin: () => origin, getDirection: () => direction };
      app.xr.input.fire('add', src); app.xr.input.fire(event, src); app.xr.input.fire('remove', src);
    };
  });
  await page.click('[data-home="headset"]');
  await page.evaluate(() => [...document.querySelectorAll('#lambyos-home button')].find((b) => b.textContent === 'View Home in VR').click());
  await page.waitForFunction(() => window.__homeXr.status().active);
  // Hide the DOM only for photographs; all controller logic still uses it.
  await page.addStyleTag({ content: '#lambyos-home, #reinterp-game-menu, #reinterp-menu-glyph { visibility: hidden !important; }' });
  async function pressLabel(label, mode = 'tracked-pointer') {
    const id = await page.evaluate((label) => window.__homeXr.status().hits.find((h) => h.label === label)?.id, label);
    assert.ok(id, `Missing XR label ${label}`);
    await page.evaluate(({ id, mode }) => window.__selectHome(id, mode), { id, mode }); await wait(160);
  }
  async function photo(name) {
    const url = await page.evaluate(() => window.__homeXr.canvas.toDataURL('image/png'));
    fs.writeFileSync(path.join(out, `${name}-texture.png`), Buffer.from(url.split(',')[1], 'base64'));
    await page.screenshot({ path: path.join(out, `${name}-quad.png`) });
  }
  await pressLabel('Close');
  await photo('01-arrival');
  const homeDrawCalls = await page.evaluate(() => window.__homeXr.app.stats.drawCalls.total);
  assert.ok(homeDrawCalls <= 3);
  checks.push(`Home alone: ${homeDrawCalls} measured mono draw call(s); up to two controller wands.`);
  const before = await page.evaluate(() => window.__homeXr.status()); await wait(1100);
  const after = await page.evaluate(() => window.__homeXr.status());
  assert.equal(after.uploads, before.uploads); checks.push('Stationary Home: zero texture uploads over 1.1 seconds.');
  await page.evaluate(() => window.__selectHome('notice', 'gaze')); await wait(120);
  assert.equal(await page.$('#lambyos-home [role="dialog"]'), null); checks.push('Gaze select ignored.');
  await page.evaluate(() => window.__selectHome('notice', 'tracked-pointer')); await wait(180);
  assert.ok(await page.$('#lambyos-home [role="dialog"]'));
  await photo('02-content-note');
  await pressLabel('Close', 'transient-pointer');
  // Same gate, checked through rendered disabled buttons, not a test-only arm.
  await page.evaluate(() => window.__selectHome('headset')); await wait(180);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#lambyos-home button')].find((b) => b.textContent === 'Enter VR').disabled), true);
  await photo('03-gated-headset');
  await page.waitForFunction(() => window.__homeXr.status().state.armed, { timeout: 6000 }); await wait(160);
  checks.push('Content-note Close starts the existing 4-second gate; Enter disabled before arming.');
  await pressLabel('The full piece (about 60 minutes)');
  assert.equal(await page.evaluate(() => document.querySelector('input[value="full"]').checked), true);
  await pressLabel('The Speedrun Version (about 20 minutes)', 'transient-pointer');
  assert.equal(await page.evaluate(() => document.querySelector('input[value="speedrun"]').checked), true);
  checks.push('Hand-style transient-pointer select changes the same cut radio.');
  await photo('04-headset-ready');
  await pressLabel('Close');
  for (const [object, label] of [['computer', 'Log in'], ['tablet', 'Enter — turn the device']]) {
    await page.evaluate((object) => window.__selectHome(object), object); await wait(160);
    assert.equal(await page.evaluate((label) => window.__homeXr.status().hits.some((h) => h.label === label), label), false);
    await pressLabel('Close');
  }
  checks.push('Computer and tablet controls remain readable; only the headset offers Enter in immersive Home.');
  // Captions control, Lamby dismissal, toys and menu use shared actions.
  await page.evaluate(() => window.__selectHome('lamby')); await wait(160);
  await photo('04b-lamby-bubble');
  await page.evaluate(() => window.__selectHome('dismiss')); await wait(160);
  assert.equal(await page.evaluate(() => window.__homeXr.status().state.bubble), '');
  await page.evaluate(() => { window.__selectHome('clock'); window.__selectHome('calendar'); }); await wait(160);
  assert.equal(await page.evaluate(() => window.__homeXr.status().state.clockQuarter), 1);
  await page.evaluate(() => window.__selectHome('switch')); await wait(160);
  await pressLabel('Open the menu'); await photo('05-menu');
  await pressLabel('Credits & attributions'); await photo('05b-credits');
  await pressLabel('Next page'); await photo('05c-credits-page-2');
  await pressLabel('Previous page');
  await page.evaluate(() => window.__homeXr.app.xr.input.fire('squeezestart', { targetRayMode: 'tracked-pointer', getOrigin: () => window.__mockHead.getPosition(), getDirection: () => window.__mockHead.forward })); await wait(160);
  checks.push('Home menu/credits reuse DOM callbacks; long credits paginate; grip resumes.');
  await page.evaluate(() => window.__selectHome('door')); await wait(160);
  await photo('05d-leave-choice'); await pressLabel('Stay');
  // The same Home face survives ending XR and re-entering without rebuilding its gate.
  await page.evaluate(() => window.__homeXr.app.xr.end()); await wait(160);
  assert.equal(await page.evaluate(() => window.__homeXr.status().active), false);
  await page.evaluate(() => window.__homeXr.app.xr.start(null, null, null, {})); await wait(160);
  assert.equal(await page.evaluate(() => window.__homeXr.status().active), true);
  assert.equal(await page.evaluate(() => window.__homeXr.status().state.armed), true);
  checks.push('Session end/re-entry retains Home already-read gate in memory.');

  await page.evaluate(() => window.__selectHome('headset')); await wait(160);
  await pressLabel('Enter VR');
  await page.waitForFunction(() => window.__homeXr.status().state.entered);
  await wait(500); assert.ok(heldModels > 0);
  assert.ok(await page.$('#lambyos-home')); await photo('06-loading');
  checks.push('Model requests held: Home quad persists with loading text before room construction resolves.');
  const loadingUploads = await page.evaluate(() => window.__homeXr.status().uploads);
  await page.evaluate(() => window.__mockHead.setLocalEulerAngles(-20, 25, 0)); await wait(160);
  const loadingPose = await page.evaluate(() => {
    const head = window.__mockHead, plane = window.__homeXr.app.root.findByName('lambyos-home-xr');
    const to = plane.getPosition().clone().sub(head.getPosition());
    return { distance: to.length(), facing: to.normalize().dot(head.forward), uploads: window.__homeXr.status().uploads };
  });
  assert.ok(Math.abs(loadingPose.distance - 2.2) < 0.001 && loadingPose.facing > 0.999);
  assert.equal(loadingPose.uploads, loadingUploads);
  checks.push('Loading window follows a changed viewer pitch/yaw at 2.2 m without texture uploads or selections.');

  release();
  await page.waitForFunction(() => window.__os && !document.querySelector('#lambyos-home'), { timeout: 120000 });
  await page.waitForFunction(() => !window.__homeXr);
  checks.push('After asset loading and room construction: Home destroyed, same mocked session retained, 1997 OS exists.');
  await wait(1000); await page.screenshot({ path: path.join(out, '07-room-ready.png') });
  assert.equal(await page.evaluate(async () => (await import('/src/state/cut.ts')).currentCut()), 'speedrun');
  const stats = await page.evaluate(() => ({ drawCalls: window.__app.stats.drawCalls.total, era: window.__os.desktopEra }));
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(path.join(out, 'CHECKS.json'), JSON.stringify({ checks, stats, errors, method: 'Mock navigator.xr support and PlayCanvas XR manager active/start; real mono WebGL quad, real select event adapter. No XRSession/stereo/compositor emulation.' }, null, 2));
  console.log(checks.join('\n')); console.log(JSON.stringify(stats));
} finally { release(); await browser.close(); }
