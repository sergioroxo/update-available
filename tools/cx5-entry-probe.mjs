/** CX5 — the emulated-XR entrance carried INTO the room (cx4-xr-check stops at the setup note).
 *  His 28 Oct headset session broke right after the room formed: black monitor, a frozen view, the menu, the cast
 *  ended. This drives the real restore entrance with a mocked XR controller through the whole setup, then samples the
 *  first seconds in the room: frame times, draw calls, the comfort status, which roots are outside xr-world, and
 *  whether a tracked head move still moves the view (6DoF). Mono WebGL; no claim of headset timing.
 *  node tools/cx5-entry-probe.mjs --port 3000 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if (!port) throw Error('Pass --port');
const out = 'out/cx5-entry'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000,
  args: process.env.REAL_GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-background-networking'] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
const page = await browser.newPage(), errors = [], log = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { const r = await Promise.race([page.screenshot({ path: `${out}/${name}.png` }).then(() => 'ok'), wait(30000).then(() => 'TIMEOUT')]); log.push({ shot: name, r }); };
try {
  await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility:hidden !important; }' });
  if (process.env.HEAD_Y) await page.evaluate((y) => { window.__headY = y; }, Number(process.env.HEAD_Y));
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    // S270: a real headset's tracked head sits ~1.2 m above the rig (local-floor); the mock's sat at 0, which hid
    //   every bug that only shows when the world is really rebased
    if (window.__headY) head.setLocalPosition(0, window.__headY, 0);
    const origin = head.getPosition().clone(), direction = head.forward.clone();
    const src = { targetRayMode: 'tracked-pointer', hand: null, gamepad: { buttons: [], axes: [] }, getOrigin: () => origin, getDirection: () => direction };
    window.__src = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
    // the press: aim the controller at a setup hit (the floating plane's 512 × 384 space) and select
    window.__pressSetup = (id) => {
      const plane = app.root.findByName('setup-in-stars'), h = window.__os.setup?.hits.find(x => x.id === id);
      if (!plane || !h) return false;
      const target = plane.getWorldTransform().transformPoint(head.getLocalPosition().clone().set((h.x + h.w / 2) / 512 - 0.5, 0, (h.y + h.h / 2) / 384 - 0.5));
      const o = head.getPosition().clone(), d = target.sub(o).normalize();
      src.getOrigin = () => o; src.getDirection = () => d; app.xr.input.fire('select', src); return true;
    };
  });
  await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 15000 });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__src));
  await shot('01-stars');
  // drive the setup: prefer the forward control on each screen
  const PREFER = [/choice-1$/, /next/, /agree|ok|done|finish/, /^setup-start$/, /start/, /close$/];
  for (let i = 0, t0 = Date.now(); Date.now() - t0 < 240000; i++) {
    const s = await page.evaluate(() => ({ entrance: document.querySelector('#restore-entrance')?.dataset.phase ?? null, step: window.__os.setup?.step ?? null,
      ids: window.__os.setup?.hits.map(h => h.id) ?? [] }));
    if (!s.ids.length && !s.step) { log.push({ i, note: 'setup gone', ...s }); break; }
    if (!s.ids.length) { await wait(900); continue; }
    const id = PREFER.map(re => s.ids.find(x => re.test(x))).find(Boolean) ?? s.ids[0];
    const ok = id ? await page.evaluate((id) => window.__pressSetup(id), id) : false;
    log.push({ i, step: s.step, pressed: ok ? id : null, ids: s.ids.slice(0, 8) });
    await wait(900);
  }
  log.push({ at: 'after-setup', alive: await Promise.race([page.evaluate(() => window.__os.phase), wait(20000).then(() => 'HUNG 20s')]) });
  // bisect switches (CX5): stop one subsystem the moment the setup has gone
  if (process.env.TRAIL) await page.evaluate(() => { const os = window.__os, up = os.update.bind(os); window.__trail = [];
    os.update = (dt) => { const t0 = performance.now(); up(dt); window.__trail.push([os.phase, +os.phaseT.toFixed(2), os.rBootChars, Math.round(performance.now() - t0)]); if (window.__trail.length > 8) window.__trail.shift(); }; });
  if (process.env.NO_DRAW) await page.evaluate(() => { window.__os.draw = () => {}; });
  if (process.env.FREEZE_OS) await page.evaluate(() => { window.__os.update = () => {}; });
  if (process.env.HIDE_SPECKS) await page.evaluate(() => { const e = window.__app.root.findByName('room-specks'); if (e) e.enabled = false; window.__hid = !!e; });
  if (process.env.NO_VEIL) await page.evaluate(() => { const e = window.__app.root.findByName('xr-pixel-dissolve'); if (e) e.destroy(); });
  if (process.env.NO_MIPS) log.push({ noMips: await page.evaluate(() => { let n = 0; window.__app.root.forEach(e => { for (const m of e.render?.meshInstances ?? []) { const t = m.material?.emissiveMap; if (t && t.getSource?.() === window.__os.canvas) { t.mipmaps = false; t.minFilter = 1; t.anisotropy = 1; n++; } } }); return n; }) });
  // the first seconds in the room
  const samples = [];
  for (let k = 0; k < 16; k++) {
    const s = await page.evaluate(async () => {
      const app = window.__app, frames = [];
      await new Promise((res) => { let last = performance.now(), n = 0; const f = () => { const t = performance.now(); frames.push(t - last); last = t; if (++n < 20) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      const stage = app.root.findByName('xr-world');
      const outside = app.root.children.filter(c => c !== stage).map(c => c.name);
      const mon = app.root.findByName('monitor-screen') || app.root.findByName('screen');
      const up0 = window.__uploads ?? null;
      return { uploads: up0, maxMs: Math.round(Math.max(...frames)), meanMs: Math.round(frames.reduce((a, b) => a + b, 0) / frames.length),
        draws: app.stats?.drawCalls?.total ?? null, comfort: window.__xrComfort.status(), busy: window.__xrComfort.busy,
        entrance: document.querySelector('#restore-entrance')?.dataset.phase ?? 'gone',
        spine: window.__spine?.() ?? null, phase: window.__os.phase, outside, underStage: stage?.children.length ?? 0,
        monitor: mon ? { name: mon.name, enabled: mon.enabled } : null };
    });
    samples.push({ k, ...s });
    // S270b: his "if I turn around, it just jumps into the stars" — look aside before the last frames
    if (process.env.TURN && k === 9) await page.evaluate((y) => window.__app.root.findByName('camera').setLocalEulerAngles(0, y, 0), Number(process.env.TURN));
    if (!process.env.NO_SHOTS && (k === 2 || k === 8 || k === 15)) await shot(`03-room-${k}`);
    await wait(500);
  }
  if (process.env.TRACE) await page.tracing.start({ path: `${out}/trace.json`, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'gpu', 'cc', 'viz', 'blink', 'v8.execute', 'toplevel'] });
  for (const s of [3, 3, 3, 3, 3]) {
    await wait(s * 1000);
    log.push({ later: s, state: await page.evaluate(async () => { const app = window.__app, gd = app.graphicsDevice;
      return { phase: window.__os.phase, contextLost: gd.contextLost, glLost: gd.gl?.isContextLost?.() ?? null, visibility: document.visibilityState,
        frame: app.frame ?? null, trail: window.__trail ?? null, rBootTotal: window.__os.rBootTotal, raf: await Promise.race([new Promise(r => requestAnimationFrame(() => r('fired'))), new Promise(r => setTimeout(() => r('NO rAF in 2s'), 2000))]),
        timeout: await new Promise(r => setTimeout(() => r('timers ok'), 10)), osCanvas: [window.__os.canvas.width, window.__os.canvas.height], xr: app.xr.active }; }) });
  }
  if (process.env.TRACE) await page.tracing.stop();
  // 6DoF: a tracked head move must move the view relative to the room
  const sixDof = await page.evaluate(async () => {
    const app = window.__app, head = app.root.findByName('camera'), chair = app.root.findByName('xr-world')?.children.find(c => c.name !== 'restore-pixels');
    const before = { head: head.getPosition().toArray(), room: chair?.getPosition().toArray() };
    head.setLocalPosition(head.getLocalPosition().x + 0.25, head.getLocalPosition().y, head.getLocalPosition().z);
    await new Promise(r => setTimeout(r, 200));
    const after = { head: head.getPosition().toArray(), room: chair?.getPosition().toArray() };
    return { roomRoot: chair?.name, before, after };
  });
  // S270: his "every time I open the menu, it jumps back the image" — the world's placement around a menu open/close,
  //   with the head turned 40° aside first (a re-form aims the room at the head's yaw)
  if (process.env.MENU) log.push({ menu: await page.evaluate(async () => {
    const app = window.__app, head = app.root.findByName('camera'), st = app.root.findByName('xr-world');
    let last = null;
    // the mocked session stops presenting frames (CX5), so step the comfort tick and the prerender by hand
    const w = async (ms) => { for (let t = 0; t < ms; t += 50) { window.__xrComfort.reviewStep(0.05); app.fire('prerender'); last = [...st.getPosition().toArray(), st.getEulerAngles().y].map(n => +n.toFixed(3)); app.fire('postrender'); await new Promise(r => setTimeout(r, 5)); } };
    const { gameMenuBus } = await import('/src/state/gameMenuBus.ts');
    const out = [];
    await w(500); out.push(['before', last]);
    head.setLocalEulerAngles(0, 40, 0); await w(2500); out.push(['head turned 40', last]);
    gameMenuBus.open(); await w(1500); out.push(['menu open', last]);
    gameMenuBus.close(); await w(3000); out.push(['menu closed', last, window.__xrComfort.status().cuts]);
    return out; }) });
  if (!process.env.SCREEN) {} else
  // S270: his "I cannot see whatever is on the screen. It's all black" — is the desk monitor drawing, uploading, enabled?
  log.push({ screen: await page.evaluate(() => { const app = window.__app, os = window.__os, e = app.root.findByName('desktop-screen');
    const c = os.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
    let p = e, chain = []; while (p) { chain.push(p.name + (p.enabled ? '' : '(off)')); p = p.parent; }
    const mi = e?.render?.meshInstances?.[0], t = mi?.material?.emissiveMap;
    return { phase: os.phase, canvas: [c.width, c.height], litPx: lit, chain, visible: mi?.visible, layers: e?.render?.layers, tex: t ? { w: t.width, h: t.height, mips: t.mipmaps, src: t.getSource?.() === c } : null, pos: e?.getPosition().toArray().map(n => +n.toFixed(2)) }; }) });
  const batches = await page.evaluate(() => { const app = window.__app, st = app.root.findByName('xr-world');
    return { stage: st?.getPosition().toArray().map(n => +n.toFixed(2)), head: app.root.findByName('camera').getPosition().toArray().map(n => +n.toFixed(2)),
      list: (app.batcher._batchList ?? []).map(b => ({ node: b.meshInstance?.node?.name, tris: b.meshInstance?.mesh?.primitive?.[0]?.count })) }; });
  log.push({ batches });
  fs.writeFileSync(`${out}/probe.json`, JSON.stringify({ log, samples, sixDof, errors }, null, 2));
  console.log(JSON.stringify({ setupPresses: log.map(l => l.pressed || l.note).join(' → '), samples: samples.map(s => ({ k: s.k, maxMs: s.maxMs, meanMs: s.meanMs, draws: s.draws, busy: s.busy, entrance: s.entrance, phase: s.phase, outside: s.outside.length, under: s.underStage, cuts: s.comfort.cuts, rig: s.comfort.rig.map(n => +n.toFixed(2)) })), sixDof, errors: errors.slice(0, 12) }, null, 1));
} catch (error) {
  console.error({ error: String(error), log, errors: errors.slice(0, 12) });
} finally { await Promise.race([browser.close(), new Promise(r => setTimeout(() => { browser.process()?.kill('SIGKILL'); r(); }, 5000))]); }
