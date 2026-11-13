#!/usr/bin/env node
/**
 * ⚑ S381 (UiB job 21 Part B) — THE SETUP'S LEXICON BUTTON AT THE REAL ENTRANCE, PRESSED THE WAY A VISITOR PRESSES IT.
 *
 *     node tools/s381-entrance-lexicon-probe.mjs --port 5390 [--out out/s381/entrance] [--mode phone|phone-portrait|xr|desktop]
 *
 * Job 20's probe only ever opened `?setup=1` (the setup on Daniel's monitor in the room) and "pressed" by calling
 * `setup.handleClick`. His note (12 Nov): "the lexicon button doesnt work there". This opens the REAL entrance —
 * `?reinterp=1`, the title in the stars, the setup floating in the stars (restoreEntrance) — and presses:
 *   · phone (844 × 390, landscape) and phone-portrait (390 × 844): an emulated touch device (isMobile, hasTouch), every
 *     press a real touch TAP (`page.touchscreen.tap`) at the control's place on the screen (the floating window's hits,
 *     `#restore-entrance[data-setup-hits]`, ?debug=1; the site viewer's own hit centres);
 *   · xr: an emulated immersive session (`app.xr.active`, a tracked-pointer controller); every press the controller's
 *     ray aimed at the control on its plane and `select` fired — the title, the setup's windows, the Lexicon's window;
 *   · desktop: real mouse presses (the control; he confirmed this works on the computer, 13 Nov).
 * At the note it checks the offer is there, presses it, and checks: the ONE Lexicon opens (the site viewer, view
 * `lexicon`); in the headset that its window is drawn OVER the floating setup (it hangs on the frame layer, drawn after
 * the world) and that a press on the Lexicon reaches the Lexicon (a chapter opens) and not the setup (its stage and its
 * windows unchanged); that the hint names the window; that closing it leaves the setup at its note; then Close goes on.
 * Writes report.json and the photographs. Exit 1 on a failed check. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s381/entrance'));
const MODE = flag('mode', '');
const DSF = Number(flag('dsf', 2));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function run(mode) {
  const xr = mode === 'xr', phone = mode.startsWith('phone');
  const VW = mode === 'phone-portrait' ? 390 : phone ? 844 : 1280, VH = mode === 'phone-portrait' ? 844 : phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, isLandscape: VW > VH } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { const f = path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };
  await page.goto(`http://localhost:${PORT}/?reinterp=1&debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) {
    // a headset shows no page DOM: hide it for the photographs (the setup, the hint and the window are planes in the scene)
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 120000 });
  await wait(1500);

  // ── the ways a visitor presses ──
  const tapAt = async (x, y) => {
    if (phone) { await page.touchscreen.tap(x, y); return; }
    await page.mouse.move(x, y); await wait(80); await page.mouse.down(); await wait(60); await page.mouse.up();
  };
  const xrAimAt = (world) => page.evaluate((p) => {
    const app = window.__app, head = app.root.findByName('camera');
    const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));   // a hand, not the eye
    const target = origin.clone().set(p.x, p.y, p.z);
    window.__controller.getOrigin = () => origin;
    window.__controller.getDirection = () => target.clone().sub(origin).normalize();
  }, world);
  const xrSelect = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  /** a setup control, by id, pressed as a visitor would */
  const setupPress = async (id) => {
    if (xr) {
      const w = await page.evaluate((id) => {
        const s = window.__os.setup, h = s?.hits.find((k) => k.id === id); if (!h) return null;
        const plane = window.__app.root.findByName('setup-in-stars'); if (!plane) return null;
        const V = plane.getPosition().constructor;
        const p = plane.getWorldTransform().transformPoint(new V((h.x + h.w / 2) / 512 - 0.5, 0, (h.y + h.h / 2) / 384 - 0.5));
        return { x: p.x, y: p.y, z: p.z };
      }, id);
      if (!w) return false;
      await xrAimAt(w); await wait(250); await xrSelect(); return true;
    }
    const h = await page.evaluate((id) => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').find((k) => k.id === id) ?? null, id);
    if (!h) return false;
    await tapAt(h.x + h.w / 2, h.y + h.h / 2); return true;
  };
  const waitHit = (id, ms = 40000) => xr
    ? page.waitForFunction((id) => !!window.__os.setup?.hits.find((k) => k.id === id), { timeout: ms }, id).then(() => true, () => false)
    : page.waitForFunction((id) => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some((k) => k.id === id), { timeout: ms }, id).then(() => true, () => false);
  const viewer = () => page.evaluate((x) => {
    const sv = window.__siteViewer, core = x ? sv.xr.core : sv.dom;
    return { open: x ? sv.xr.isOpen : sv.bus.domOpen(), view: core.view, page: sv.bus.view };
  }, xr);
  /** a control inside the site viewer, by its hit id */
  const viewerPress = async (id) => {
    if (xr) {
      const w = await page.evaluate((id) => {
        const v = window.__siteViewer.xr, px = v.core.centerOf(id); if (!px) return null;
        const plane = window.__app.root.findByName('xr-frame-site'); const V = plane.getPosition().constructor;
        const p = plane.getWorldTransform().transformPoint(new V(px.x / 1024 - 0.5, 0, px.y / 768 - 0.5));
        return { x: p.x, y: p.y, z: p.z };
      }, id);
      if (!w) return false;
      await xrAimAt(w); await wait(250); await xrSelect(); return true;
    }
    const at = await page.evaluate((id) => {
      const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
      const px = core.centerOf(id); if (!px || !cv) return null;
      const r = cv.getBoundingClientRect(), s = core.lastSize;
      return { x: r.left + (px.x / s.w) * r.width, y: r.top + (px.y / s.h) * r.height };
    }, id);
    if (!at) return false;
    await tapAt(at.x, at.y); return true;
  };
  const stage = () => page.evaluate(() => window.__os.setup?.stage ?? null);
  const lexFace = () => page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return { face: c.lexicon?.lex?.face ?? null, term: c.lexicon?.lex?.termId ?? null }; }, xr);

  // 1. the title: one press
  if (xr) {
    await xrSelect();   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(800);
    await page.evaluate(() => { const h = window.__app.root.findByName('camera'); window.__controller.getOrigin = () => h.getPosition().clone(); window.__controller.getDirection = () => h.forward.clone(); });
    await xrSelect();
  } else await tapAt(VW / 2, VH / 2);
  await page.waitForSelector('#restore-entrance[data-phase="setup"]', { timeout: 30000 }).catch(() => {});
  check(mode, 'the title opens the setup in the stars', await page.evaluate(() => document.getElementById('restore-entrance')?.dataset.phase === 'setup'));
  await wait(3200);   // the window unfolds from its star
  // 2. "I know what to do" → the CONTENT NOTE
  const first = await waitHit('setup-choice-1');
  if (first) { await setupPress('setup-choice-1'); }
  await page.waitForFunction(() => window.__os.setup?.stage === 'note', { timeout: 30000 }).catch(() => {});
  await wait(1200);
  check(mode, 'the setup reaches its CONTENT NOTE', (await stage()) === 'note', `stage=${await stage()}`);
  check(mode, 'the note offers the Lexicon', await waitHit('setup-lexicon', 5000));
  await shot('note-with-offer');
  const flat = await page.evaluate(() => window.__os.canvas?.toDataURL?.('image/png')?.split(',')[1] ?? null);
  const setupCanvas = await page.evaluate(() => { const c = document.querySelectorAll('canvas'); for (const k of c) if (k.width === 1536 && k.height === 1152) return k.toDataURL('image/png').split(',')[1]; return null; });
  if (setupCanvas) fs.writeFileSync(path.join(OUT, `${mode}-${String(n).padStart(2, '0')}-note-with-offer.canvas.png`), Buffer.from(setupCanvas, 'base64'));
  else if (flat) fs.writeFileSync(path.join(OUT, `${mode}-${String(n).padStart(2, '0')}-note-with-offer.canvas.png`), Buffer.from(flat, 'base64'));
  // 3. the offer, pressed
  await setupPress('setup-lexicon');
  await wait(1800);
  let v = await viewer();
  check(mode, 'a real press on "the Lexicon" opens the one Lexicon', v.open && v.view === 'lexicon', `viewer ${v.open ? 'open on ' + v.view : 'closed'}; setup stage ${await stage()}`);
  await shot('lexicon-open');
  // (read at once: the headset's note shows for 7 s)
  if (xr) {
    // drawn over the setup: the Lexicon's plane is on the frame layer, drawn after the world (where the setup hangs)
    const order = await page.evaluate(() => {
      const app = window.__app, site = app.root.findByName('xr-frame-site'), setup = app.root.findByName('setup-in-stars');
      const list = app.scene.layers.layerList.map((l) => l.name);
      const layerOf = (e) => (e?.render?.layers ?? []).map((id) => app.scene.layers.getLayerById(id)?.name);
      const head = app.root.findByName('camera').getPosition();
      return { list, site: layerOf(site), setup: layerOf(setup), siteOn: !!site?.enabled, dSite: site ? site.getPosition().distance(head) : null, dSetup: setup ? setup.getPosition().distance(head) : null };
    });
    const iSite = Math.max(...order.site.map((nm) => order.list.lastIndexOf(nm)));
    const iSetup = Math.max(...order.setup.map((nm) => order.list.lastIndexOf(nm)));
    check(mode, "the Lexicon's window is drawn over the floating setup (a later layer)", order.siteOn && iSite > iSetup,
      `site on ${order.site.join('/')} (${iSite}), setup on ${order.setup.join('/')} (${iSetup}); ${order.dSite?.toFixed(2)} m vs ${order.dSetup?.toFixed(2)} m`);
    const hint = await page.evaluate(() => window.__xrFrame?.hintText?.() ?? null);
    check(mode, 'the headset hint names the window that is open', !!hint && !/the website/i.test(hint), `hint "${hint}"`);
  }
  // ⚑ S381 — from the setup it opens on its First Words; photograph every page of them
  const f0 = await lexFace();
  check(mode, 'from the setup the Lexicon opens on its First Words', f0.face === 'first', `face ${f0.face}`);
  for (let k = 0; k < 6; k++) {
    const hasNext = await page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return !!c.centerOf('lx:lex-next'); }, xr);
    if (!hasNext) break;
    await viewerPress('lx:lex-next'); await wait(700);
    await shot(`first-words-${k + 2}`);
  }
  await viewerPress('lx:lex-first'); await wait(700);
  // 4. a press ON the Lexicon reaches the Lexicon, not the setup behind it
  const before = await page.evaluate(() => ({ stage: window.__os.setup?.stage, hits: (window.__os.setup?.hits ?? []).map((h) => h.id).join(',') }));
  const chapter = await page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return ['lx:lex-go-conversion', 'lx:lex-words'].find((id) => !!c.centerOf(id)) ?? null; }, xr);
  if (chapter) {
    await viewerPress(chapter); await wait(1400);
    const info = await page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return c.info?.() ?? null; }, xr);
    const after = await page.evaluate(() => ({ stage: window.__os.setup?.stage, hits: (window.__os.setup?.hits ?? []).map((h) => h.id).join(',') }));
    v = await viewer();
    const f1 = await lexFace();
    check(mode, 'a press on the Lexicon reaches the Lexicon (First Words → their word\'s page), not the setup behind it', v.open && v.view === 'lexicon' && f1.face === 'words' && after.stage === before.stage && after.hits === before.hits,
      `${chapter} → face ${f1.face} (${f1.term}); setup ${before.stage} → ${after.stage}`);
    void info;
    await shot('their-word-page');
  } else check(mode, 'the Lexicon publishes a chapter to press', false);
  // 5. its Close: back to the note, nothing waited, nothing skipped
  await viewerPress('close'); await wait(1400);
  v = await viewer();
  check(mode, 'closing it leaves the setup at its note', !v.open && (await stage()) === 'note', `viewer ${v.open ? 'open' : 'closed'}; stage ${await stage()}`);
  await shot('back-to-the-note');
  // 6. the note's Close still goes on
  await setupPress('setup-close'); await wait(1500);
  const st = await stage();
  check(mode, "the note's Close goes on (the setup moves past the note)", st !== 'note', `stage ${st}`);
  // ── THE MENU (S381): the Lexicon as its own group, high in the menu ──
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await wait(1500); await xrSelect();
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  await wait(4000);
  if (xr) await page.evaluate(() => window.__xrFrame.open());
  else if (phone) { const g = await page.evaluate(() => { const b = document.getElementById('reinterp-menu-glyph'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); if (g) await tapAt(g.x, g.y); }
  else await page.keyboard.press('Escape');
  await wait(1000);
  if (!xr) {
    const row = await page.evaluate(() => {
      const b = document.querySelector('#reinterp-game-menu [data-menu-row="lexicon"]'); if (!b) return null;
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, vh: innerHeight };
    });
    check(mode, 'the menu shows the Lexicon as its own group, in view without scrolling', !!row && row.top >= 0 && row.bottom <= row.vh, row ? `row ${Math.round(row.top)}–${Math.round(row.bottom)} of ${row.vh}` : 'no group');
    await shot('menu-lexicon-group');
    if (row) await tapAt(row.x, row.y);
  } else {
    await shot('menu-lexicon-row');
    // the row under the map (2), or under Resume when there is no map (1)
    for (const i of [2, 1]) {
      await page.evaluate((i) => { const app = window.__app, head = app.root.findByName('camera'), plane = app.root.findByName('xr-frame-menu');
        const y = 84 + 64 * i + 26; const V = head.getPosition().constructor; const target = plane.getWorldTransform().transformPoint(new V(0, 0, y / 768 - 0.5));
        const origin = head.getPosition().clone(); window.__controller.getOrigin = () => origin; window.__controller.getDirection = () => target.clone().sub(origin).normalize(); }, i);
      await wait(300); await xrSelect(); await wait(1500);
      const vv = await viewer();
      if (vv.open && vv.view === 'lexicon') break;
      if (vv.open) { await page.evaluate(() => window.__siteViewer.close()); await wait(600); }
      await page.evaluate(() => window.__xrFrame.open()); await wait(800);
    }
  }
  await wait(1500);
  v = await viewer();
  const f2 = await lexFace();
  check(mode, 'the menu\'s Lexicon opens the one Lexicon, on its contents (First Words first)', v.open && v.view === 'lexicon' && f2.face === 'title', `view ${v.view}; face ${f2.face}`);
  await shot('lexicon-contents-from-menu');
  if (xr) {
    const hint = await page.evaluate(() => window.__xrFrame?.hintText?.() ?? null);
    check(mode, 'the headset hint names the Lexicon (from the menu too)', !!hint && /Lexicon/.test(hint), `hint "${hint}"`);
  }
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

try {
  for (const mode of ['phone', 'phone-portrait', 'xr', 'desktop']) { if (MODE && MODE !== mode) continue; await run(mode); }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ port: PORT, checks }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
