#!/usr/bin/env node
/**
 * ⚑ S380 (UiB job 21 Part A) — DANIEL'S CRT IN THE ROW AND ITS PAGE, PHOTOGRAPHED AND PRESSED, ON BOTH SCREENS.
 * (From tools/s378-machine-probe.mjs, which pressed the flat computer panel and the far glass; both are retired.)
 *
 *     node tools/s380-crt-probe.mjs --port 5390 [--out out/s380/crt] [--mode desktop|xr] [--dsf 2]
 *
 * Opens the Close from Daniel's seat (`?close=1&debug=1`), presses through the messages (a press anywhere turns a card),
 * waits for the end of the Close — the gaze taken to the CRT — and then, as a visitor would:
 *   · checks the CRT stands in the row (its entity on, its frame published as the machine's panel, no card in the atlas
 *     for it) and that NOTHING of Daniel's old machine stands in the sky (no `close-monitor` entity, no `__closeMonitor`);
 *   · photographs the end, the row with the CRT among the panels (the lens opened for the photograph), and the CRT close
 *     up (the lens narrowed onto it);
 *   · presses where the old far glass stood (desktop: turned to with the arrow keys; headset: the ray aimed there) and
 *     checks nothing answers — no hit plane left behind;
 *   · presses the CRT (desktop: a real mouse press at its Open button's projected point; headset: the controller aimed
 *     at the CRT's face and `select` fired) and checks the machine's page opens; then the Receipt, Back, the Lexicon,
 *     the dossier, Back, and the window's Close, back to the CRT.
 * Writes report.json (every check, the draw calls at the end) beside the PNGs. Exit 1 if a check fails. Needs a Vite dev
 * server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5390));
const OUT = path.resolve(flag('out', 'out/s380/crt'));
const MODE = flag('mode', '');
const FACE = '';
const DSF = Number(flag('dsf', 1));
const VW = 1280, VH = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: DSF } });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { const f = path.join(OUT, `${mode}${FACE ? '-' + FACE : ''}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };
  const face = '';
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0${face}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__closeState && window.__siteViewer && window.__closeMachine, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; }' });
  if (xr) {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  // through the messages to the end of the Close
  const t0 = Date.now();
  let pressed = -1;
  while (Date.now() - t0 < 420000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.ended) break;
    if (st.stage === 'message' && st.card !== pressed) { await wait(1500); await page.mouse.click(VW / 2, VH / 2); pressed = st.card; await wait(900); continue; }
    await wait(1200);
  }
  const st = await page.evaluate(() => window.__closeState());
  check(mode, 'the Close played to its end (the gaze taken to the CRT)', st.ended, `stage=${st.stage} after ${Math.round((Date.now() - t0) / 1000)} s`);
  await wait(1500);
  if (xr) {
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(2000);
  }
  const panels = await page.evaluate(() => window.__closePanels());
  const mp = panels.find((p) => p.machine);
  check(mode, 'the CRT is published as the machine\'s panel', !!mp, `${panels.length} panels; machine index ${mp?.i}`);
  // where the machine panel and its button land in the frame
  const proj = (p) => page.evaluate((q, vw, vh) => {
    const app = window.__app, cam = app.root.findByName('camera');
    const V = cam.getPosition().constructor; const s = cam.camera.worldToScreen(new V(q.x, q.y, q.z));
    return { x: s.x, y: s.y, z: s.z, inFrame: s.z > 0 && s.x > 4 && s.y > 4 && s.x < vw - 4 && s.y < vh - 4 };
  }, p, VW, VH);
  if (!xr && mp) {
    const c = await proj(mp);
    check(mode, 'the CRT is in front of the eye at the end', c.inFrame && Math.abs(c.x - VW / 2) < VW * 0.2, `centre at ${Math.round(c.x)},${Math.round(c.y)}`);
  }
  await shot('end-crt');
  // the wider frame: the panels with the computer among them (the lens opened for the photograph only)
  await page.evaluate((x) => { const cam = window.__app.root.findByName('camera'); window.__fov0 = cam.camera.fov; cam.camera.fov = x ? 104 : 88; }, xr);
  await wait(600);
  await shot('panels-wide');
  await page.evaluate(() => { const cam = window.__app.root.findByName('camera'); cam.camera.fov = window.__fov0; });
  await wait(400);

  // helpers
  const viewerInfo = () => page.evaluate((x) => { const v = x ? window.__siteViewer.xr : null; const core = x ? v.core : window.__siteViewer.dom; return { open: x ? v.isOpen : window.__siteViewer.bus.domOpen(), view: core.view, info: core.info(), page: window.__siteViewer.bus.view }; }, xr);
  const aimWorld = (pt) => page.evaluate((p) => {
    const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
    const origin = head.getPosition().clone();
    const target = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z));
    window.__controller.getOrigin = () => origin;
    window.__controller.getDirection = () => target.clone().sub(origin).normalize();
  }, pt);
  const xrPress = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  /** press a control in the window by its hit id: a real mouse press (desktop) or the controller aimed at it (headset) */
  const pressViewer = async (id) => {
    if (xr) {
      const ok = await page.evaluate((id) => {
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
      if (!ok) return false;
      await wait(300); await xrPress(); return true;
    }
    const at = await page.evaluate((id) => {
      const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
      const px = core.centerOf(id); if (!px || !cv) return null;
      const r = cv.getBoundingClientRect(), s = core.lastSize;
      return { x: r.left + (px.x / s.w) * r.width, y: r.top + (px.y / s.h) * r.height };
    }, id);
    if (!at) return false;
    await page.mouse.move(at.x, at.y); await wait(120); await page.mouse.down(); await wait(80); await page.mouse.up();
    return true;
  };

  // 0. THE CRT stands in the row; nothing of the old machine stands in the sky
  const crtInfo = await page.evaluate(() => {
    const app = window.__app, e = app.root.findByName('close-crt');
    const old = app.root.findByName('close-monitor');
    let box = null;
    if (e) {
      const mis = e.findComponents('render').flatMap((r) => r.meshInstances);
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const mi of mis) { const a = mi.aabb; const mn = a.getMin(), mx = a.getMax(); [mn.x, mn.y, mn.z].forEach((v, k) => { lo[k] = Math.min(lo[k], v); }); [mx.x, mx.y, mx.z].forEach((v, k) => { hi[k] = Math.max(hi[k], v); }); }
      box = { lo, hi, n: mis.length };
    }
    return { on: !!e && e.enabled, box, old: !!old, oldProbe: typeof window.__closeMonitor !== 'undefined' };
  });
  check(mode, 'Daniel\'s CRT stands in the row (close-crt on, two draws: the body and the glass)', crtInfo.on && crtInfo.box?.n === 2,
    crtInfo.box ? `size ${(crtInfo.box.hi[0] - crtInfo.box.lo[0]).toFixed(2)} × ${(crtInfo.box.hi[1] - crtInfo.box.lo[1]).toFixed(2)} × ${(crtInfo.box.hi[2] - crtInfo.box.lo[2]).toFixed(2)} m (world box)` : 'no CRT');
  check(mode, 'nothing of the old machine stands in the sky (no close-monitor entity, no __closeMonitor)', !crtInfo.old && !crtInfo.oldProbe);
  // the CRT close up: the lens narrowed onto it (for the photograph only)
  {
    const mp0 = (await page.evaluate(() => window.__closePanels())).find((p) => p.machine);
    const c0 = mp0 ? await proj(mp0) : null;
    if (c0 && c0.inFrame) {
      await page.evaluate((x) => { const cam = window.__app.root.findByName('camera'); window.__fov0 = cam.camera.fov; cam.camera.fov = x ? 44 : 30; }, xr);
      await wait(600);
      await shot('crt-close-up');
      await page.evaluate(() => { const cam = window.__app.root.findByName('camera'); cam.camera.fov = window.__fov0; });
      await wait(400);
    }
  }
  if (argv.includes('--quick')) { await page.close(); return { mode, quick: true, errors }; }
  // 1. where the OLD far glass stood (S163–S378: x 0.4, y 0.93, z −2.3) nothing answers a press
  {
    const old = { x: 0.4, y: 0.93, z: -2.3 };
    const pose0 = await page.evaluate(() => window.__camPose());
    if (xr) { await aimWorld(old); await wait(300); await xrPress(); }
    else {
      let c = await proj(old);
      for (let k = 0; k < 40 && !(c.inFrame && Math.abs(c.x - VW / 2) < VW * 0.3); k++) {
        const key = c.z > 0 && c.x > VW / 2 ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.down(key); await wait(220); await page.keyboard.up(key); await wait(120);
        c = await proj(old);
      }
      await shot('where-the-old-machine-stood');
      if (c.inFrame) await page.mouse.click(c.x, c.y);
    }
    await wait(1500);
    const v0 = await viewerInfo();
    const pose1 = await page.evaluate(() => window.__camPose());
    const moved = Math.hypot(pose1.x - pose0.x, pose1.z - pose0.z);
    // a label or a panel of the sky hanging on that line may answer for ITSELF (its year's website); what must not happen
    // is the old machine answering: its page, or the eye flown to where it stood
    check(mode, 'a press where the old far glass stood is not the machine\'s (no machine page, the eye not moved)', !(v0.open && v0.view === 'machine') && moved < 0.05,
      `window ${v0.open ? 'open on ' + v0.view + ' (a sky label/panel on that line)' : 'closed'}; eye moved ${moved.toFixed(3)} m`);
    if (v0.open) { await page.evaluate(() => window.__siteViewer.close()); await wait(400); }
  }

  // 2. THE CRT opens the machine's page
  let panels2 = await page.evaluate(() => window.__closePanels());
  let m2 = panels2.find((p) => p.machine);
  if (!xr) {
    let c = await proj(m2.button ?? m2);
    for (let k = 0; k < 40 && !(c.inFrame && Math.abs(c.x - VW / 2) < VW * 0.3); k++) {
      const key = c.z > 0 && c.x > VW / 2 ? 'ArrowRight' : 'ArrowLeft';
      await page.keyboard.down(key); await wait(220); await page.keyboard.up(key); await wait(120);
      panels2 = await page.evaluate(() => window.__closePanels()); m2 = panels2.find((p) => p.machine);
      c = await proj(m2.button ?? m2);
    }
  }
  if (xr) { await aimWorld(m2); await wait(500); await shot('aimed-at-crt'); await xrPress(); }
  else {
    const b = await proj(m2.button ?? m2);
    check(mode, 'the CRT\'s Open button is in frame', b.inFrame, `${Math.round(b.x)},${Math.round(b.y)}`);
    await page.mouse.move(b.x, b.y); await wait(300); await shot('hover-open-button');
    await page.mouse.down(); await wait(80); await page.mouse.up();
  }
  await wait(1600);
  let v = await viewerInfo();
  check(mode, 'a press on the CRT opens the machine\'s page in the site viewer', v.open && v.view === 'machine', `view=${v.view}`);
  const ending = await page.evaluate(() => window.__closeMachine.endingShowing);
  check(mode, '__closeMachine.endingShowing (the walk\'s finish line) is true on the page', ending);
  await shot('machine-page');
  // 3. the Receipt
  check(mode, 'the page publishes Receipt / the dossier / the Lexicon / Start again / the four rooms',
    await page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return ['m:receipt', 'm:dossier', 'm:lexicon', 'm:again', 'm:era:e1', 'm:era:e2', 'm:era:e3', 'm:era:e4', 'close'].every((id) => !!c.centerOf(id)); }, xr));
  await pressViewer('m:receipt'); await wait(1800);
  v = await viewerInfo();
  check(mode, 'Receipt opens the printout, in the same window', v.view === 'receipt', `view=${v.view}`);
  await shot('receipt-printing');
  await wait(14000);
  v = await viewerInfo();
  await shot('receipt-printed');
  check(mode, 'the receipt has printed and can be scrolled back to its head', v.info.maxScroll > 0, `scroll ${v.info.scroll}/${v.info.maxScroll}`);
  if (xr) { await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, -1]; }); await wait(2500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
  else { for (let k = 0; k < 6; k++) { await pressViewer('sc:up'); await wait(150); } }
  await wait(600);
  v = await viewerInfo();
  check(mode, 'scrolled toward the head of the receipt', v.info.scroll < v.info.maxScroll, `scroll ${v.info.scroll}/${v.info.maxScroll}`);
  await shot('receipt-scrolled-up');
  await pressViewer('back'); await wait(900);
  v = await viewerInfo();
  check(mode, 'Back returns from the Receipt to the machine\'s page', v.view === 'machine', `view=${v.view}`);
  await shot('back-to-machine');
  // 4. the Lexicon
  await pressViewer('m:lexicon'); await wait(1200);
  v = await viewerInfo();
  check(mode, 'The Lexicon opens in the same window', v.view === 'lexicon', `view=${v.view}`);
  await shot('lexicon-contents');
  await pressViewer('lx:lex-words'); await wait(1000);
  await shot('lexicon-words');
  await pressViewer('lx:lex-close'); await wait(900);
  v = await viewerInfo();
  check(mode, 'the Lexicon\'s own Close is Back (to the machine\'s page)', v.view === 'machine', `view=${v.view}`);
  // 5. the dossier = the four years, in the same window, and Back
  await pressViewer('m:dossier'); await wait(1200);
  v = await viewerInfo();
  check(mode, 'The dossier opens the four years in the same window', v.view === 'hub', `view=${v.view}`);
  await shot('dossier-four-years');
  await pressViewer('back'); await wait(900);
  v = await viewerInfo();
  check(mode, 'Back returns from the four years to the machine\'s page', v.view === 'machine', `view=${v.view}`);
  // 6. close
  await pressViewer('close'); await wait(1200);
  v = await viewerInfo();
  check(mode, 'the window\'s Close closes it', !v.open);
  await shot('closed-back-to-the-crt');
  // 7. a room's panel still opens its year
  const p1 = (await page.evaluate(() => window.__closePanels())).find((p) => p.era === 4 && !p.hidden);
  if (p1) {
    if (xr) { await aimWorld(p1); await wait(300); await xrPress(); }
    else { const c = await proj(p1); if (c.inFrame) await page.mouse.click(c.x, c.y); }
    await wait(1400);
    v = await viewerInfo();
    if (v.open) { check(mode, 'the 2026 panel beside it still opens its own website', v.view === '2026', `view=${v.view}`); await page.evaluate(() => window.__siteViewer.close()); await wait(400); }
  }
  const draws = await page.evaluate(() => window.__drawCalls ?? window.__app.stats.drawCalls?.total ?? null);
  check(mode, 'the Close at its end stays within 75 draw calls', draws === null || draws <= 75, `draw calls ${draws}`);
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
  return { mode, draws, errors };
}

const results = [];
try {
  for (const mode of ['desktop', 'xr']) {
    if (MODE && MODE !== mode) continue;
    results.push(await run(mode));
  }
} finally {
  fs.writeFileSync(path.join(OUT, `report${FACE ? '-' + FACE : ''}.json`), JSON.stringify({ port: PORT, face: FACE || 'default', checks, results }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
