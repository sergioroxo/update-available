#!/usr/bin/env node
/**
 * ⚑ S407 (UiB job 32, E2 and E3) — THE ENTRANCE IN THE HEADSET MOCK: Match my table in the setup, and the distance the room
 * arrives at.
 *
 *     node tools/s407-entrance-probe.mjs --port 5471 --label after [--out <dir>] [--lean 0.19]
 *
 * As his run of 20 Nov: the page opens on the entrance, the headset starts there (the mock forces `app.xr.active` after the
 * entrance was built for the browser, so the rig starts at the browser's descent pose, as Enter VR from that page does), the
 * seat is taken from the head, and the head then leans `--lean` m towards the setup's panels (his HUD at 212614: −0.19).
 * The setup is pressed through with real presses on its published hits (the debug film skip at the advert). At the How to
 * look window: a still (E2) and its hits (is `setup-table` there?); a press on it, and the frame's line after it. At the
 * arrival: the logical eye's distance to the CRT's glass (z 0) — LEAN alone puts it at 0.55 m — and a still (E3).
 * Writes <out>/e3-<label>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const LEAN = Number(flag('lean', 0.19));
const OUT = path.resolve(flag('out', '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-20/job32'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] });
const out = { label: LABEL, lean: LEAN, steps: [] };
try {
  const page = await b.newPage();
  await page.setViewport({ width: 1000, height: 1000 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__xrComfort, { timeout: 60000 });
  // the first press wakes the entrance (a flat press, before the headset starts: the setup opens in the stars)
  await page.mouse.click(500, 500); await wait(3000);
  // the headset starts on the entrance page (Enter VR there): the rig at the authored pose of that moment
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0.01, 0, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    window.__headLocal = { x: 0.01, y: 0, z: 0, pitch: 0, yaw: 0 };
    app.on('prerender', () => { const h = window.__headLocal; head.setLocalPosition(h.x, h.y, h.z); head.setLocalEulerAngles(h.pitch, h.yaw, 0); });
  });
  await page.waitForFunction(() => window.__xrComfort.calibrated, { timeout: 20000 }).catch(() => {});
  await wait(1200);
  out.seat = await page.evaluate(() => window.__xrComfort.status());
  // the visitor leans in towards the setup's panels
  await page.evaluate((z) => { window.__headLocal.z = -z; }, LEAN);
  // a press in the headset: the setup's own hits (canvas px) carried onto its plane in the stars, the controller's ray from
  //   the head to that point, and a select (the floating window publishes no screen rects in a headset)
  const aimSrc = (o, dir) => page.evaluate((o, d) => {
    const app = window.__app, V = app.root.findByName('camera').getPosition().constructor;
    const src = window.__controller ?? { targetRayMode: 'tracked-pointer', hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    src.getOrigin = () => new V(o[0], o[1], o[2]); src.getDirection = () => new V(d[0], d[1], d[2]);
    if (!window.__controller) { window.__controller = src; app.xr.input.fire('add', src); }
  }, o, dir);
  const select = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  // a press on the setup: its own handleClick at the published hit's centre (in a headset the floating window maps a ray to
  //   exactly this; the review route presses the same control)
  const pressHit = async (re) => {
    for (let i = 0; i < 40; i++) {
      const h = await page.evaluate((src) => {
        const re = new RegExp(src), s = window.__os?.setup; if (!s || !s.open) return null;
        const hit = (s.hits ?? []).find((x) => re.test(x.id)); if (!hit) return null;
        s.handleClick(hit.x + hit.w / 2, hit.y + hit.h / 2); window.__os.dirty = true; return { id: hit.id };
      }, re.source);
      if (h) { out.steps.push(h.id); await wait(900); return h; }
      await wait(500);
    }
    out.steps.push(`missing ${re}`); return null;
  };
  const stage = () => page.evaluate(() => window.__os?.setup?.stage ?? null);
  await pressHit(/^setup-choice-0$/);   // Yes, please
  await pressHit(/^setup-choice-0$/);   // Got it
  await pressHit(/^setup-choice-1$/);   // Later (whose)
  await pressHit(/^setup-sound-on$|^setup-choice-1$/);   // Sound on
  await pressHit(/^setup-choice-0$/);   // Show me how
  await wait(800);
  out.lookStage = await stage();
  out.lookHits = await page.evaluate(() => (window.__os?.setup?.hits ?? []).map((h) => h.id));
  await page.screenshot({ path: path.join(OUT, `E2_${LABEL}_xr.png`) });
  if (out.lookHits.includes('setup-table')) {
    await pressHit(/^setup-table$/);
    await wait(600);
    out.tableLine = await page.evaluate(() => window.__xrFrame?.hintText?.() ?? null);
    await page.screenshot({ path: path.join(OUT, `E2_${LABEL}_xr_asking.png`) });
  }
  await pressHit(/^setup-close$/);                 // the look window
  await pressHit(/^setup-choice-1$/);              // start: Later
  for (let i = 0; i < 20 && (await stage()) !== 'note'; i++) await wait(500);
  await pressHit(/^setup-close$/);                 // the content note
  await pressHit(/^setup-advert-play-0$/);         // the film
  await pressHit(/^setup-skip-film$/);             // debug: skip it
  for (let i = 0; i < 40; i++) { const h = await page.evaluate(() => (window.__os?.setup?.hits ?? []).map((x) => x.id)); if (h.includes('setup-close') || h.includes('setup-choice-0')) break; await wait(500); }
  await pressHit(/^setup-close$|^setup-choice-0$/); // the end card / All set
  await pressHit(/^setup-choice-0$|^setup-start$/); // Start
  // the room restores: wait for the world, then the machine's first screen
  for (let i = 0; i < 90; i++) { const st = await page.evaluate(() => ({ w: window.__xrComfort.status().worldReady, busy: window.__xrComfort.busy, phase: window.__os?.phase })); if (st.w && !st.busy && st.phase && st.phase !== 'off') break; await wait(1000); }
  await wait(3000);
  out.arrival = await page.evaluate(() => {
    const head = window.__app.root.findByName('camera');
    const e = window.__xrComfort.logicalPoint(head.getPosition().clone());
    return { eye: [e.x, e.y, e.z].map((v) => +v.toFixed(3)), toGlass: +e.z.toFixed(3), status: window.__xrComfort.status(), phase: window.__os?.phase };
  });
  await page.evaluate(() => { window.__headLocal.pitch = -8; });
  await wait(800);
  await page.screenshot({ path: path.join(OUT, `E3_${LABEL}_xr.png`) });
  out.errors = errors;
} finally {
  fs.writeFileSync(path.join(OUT, `e3-${LABEL}.json`), JSON.stringify(out, null, 1));
  await b.close();
}
console.log(JSON.stringify({ steps: out.steps, lookHits: out.lookHits, tableLine: out.tableLine, seat: out.seat?.shift, arrival: out.arrival }, null, 1));
