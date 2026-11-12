#!/usr/bin/env node
/**
 * ⚑ S379 (UiB job 20 Part B) — THE LEXICON FROM THE MENU AND FROM THE SETUP, ON BOTH SCREENS, PRESSED AND PHOTOGRAPHED.
 *
 *     node tools/s379-lexicon-probe.mjs --port 5390 [--out out/s379/lexicon] [--mode desktop|xr]
 *
 * The menu (a settled 2003 room, `?era=2&debug=1`): opens the game menu (Esc on the computer; `__xrFrame.open()` in the
 * emulated headset), photographs the new row, presses it (a real mouse press on the DOM row; the mocked controller aimed
 * at the row on the menu's plane and `select` fired), checks the ONE Lexicon opens in the site viewer, presses a chapter,
 * closes the window and checks the menu is still there; then reopens it and closes it with the Lexicon's own Close.
 * The setup (`?setup=1&debug=1`, the setup on Daniel's monitor): "I know what to do" to the CONTENT NOTE, photographs the
 * offer beside Close, presses it, checks the Lexicon opens over the setup and that closing it leaves the note where it was
 * (the setup never waits on it). Writes report.json; exit 1 on a failed check. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5390));
const OUT = path.resolve(flag('out', 'out/s379/lexicon'));
const MODE = flag('mode', '');
const DSF = Number(flag('dsf', 1));
const VW = 1280, VH = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: DSF } });
const menuCopy = JSON.parse(fs.readFileSync(path.resolve('data/strings/gameMenu.json'), 'utf8'));
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };

async function open(page, query, xr) {
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0&${query}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; }' });
  if (xr) {
    // a headset shows no page DOM (the menu, the setup and the window are planes in the scene): hide it for the photographs
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await wait(1500);
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  await wait(4000);
}

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { const f = path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };
  const viewer = () => page.evaluate((x) => { const b = window.__siteViewer.bus; return { open: x ? !!window.__siteViewer.xr?.isOpen : b.domOpen(), view: b.view, menu: window.__siteViewer.bus && document.getElementById('reinterp-game-menu') ? getComputedStyle(document.getElementById('reinterp-game-menu')).display !== 'none' : false }; }, xr);
  const menuOpen = () => page.evaluate(() => { const m = document.getElementById('reinterp-game-menu'); return !!m && getComputedStyle(m).display !== 'none' && getComputedStyle(m).visibility !== 'hidden'; });
  const pressViewer = async (id) => {
    if (xr) {
      const ok = await page.evaluate((id) => {
        const app = window.__app, head = app.root.findByName('camera'), v = window.__siteViewer.xr;
        const px = v.core.centerOf(id); if (!px) return false;
        const plane = app.root.findByName('xr-frame-site');
        const local = head.getPosition().clone().set((px.x / 1024 - 0.5), 0, (px.y / 768 - 0.5));
        const target = plane.getWorldTransform().transformPoint(local, local.clone());
        const origin = head.getPosition().clone();
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
        return true;
      }, id);
      if (!ok) return false;
      await wait(300); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller)); return true;
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
  /** the menu's "The Lexicon" row: a real press (the DOM button by its words; the headset's row on the menu plane) */
  let menuIdx = 4;   // resume, recentre, desk, sources, lexicon — one lower (5) when the map row is there
  const pressMenuRow = async () => {
    if (xr) {
      const ok = await page.evaluate(([label, i]) => {
        // find the row by scanning the menu plane's own hit test down its middle (the plane is 1024 × 768)
        const app = window.__app, head = app.root.findByName('camera'), plane = app.root.findByName('xr-frame-menu');
        if (!plane || !plane.enabled) return false;
        const y = 84 + 64 * i + 26;
        const local = head.getPosition().clone().set(0, 0, (y / 768 - 0.5));
        const target = plane.getWorldTransform().transformPoint(local, local.clone());
        const origin = head.getPosition().clone();
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
        return label.length > 0;
      }, [menuCopy.lexiconRow, menuIdx]);
      if (!ok) return false;
      await wait(400); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
      return true;
    }
    const at = await page.evaluate((label) => {
      const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((e) => (e.textContent || '').trim() === label);
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });   // the menu scrolls; the row sits under Sources, below the fold on a laptop
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, menuCopy.lexiconRow);
    if (!at) return false;
    await page.mouse.move(at.x, at.y); await wait(250);
    await shot('menu-row-scrolled-into-view');
    await page.mouse.down(); await wait(80); await page.mouse.up();
    return true;
  };
  const openMenu = async () => {
    if (xr) await page.evaluate(() => window.__xrFrame.open());
    else await page.keyboard.press('Escape');
    await wait(900);
  };

  // ── 1. THE MENU ──
  await open(page, 'era=2', xr);
  await openMenu();
  if (!xr) check(mode, 'the game menu opens', await menuOpen());
  if (!xr) check(mode, 'the menu has a row "' + menuCopy.lexiconRow + '"', await page.evaluate((label) => [...document.querySelectorAll('#reinterp-game-menu button')].some((e) => (e.textContent || '').trim() === label), menuCopy.lexiconRow));
  await shot('menu-with-lexicon-row');
  // in the headset, if the map row is there the Lexicon row is one lower: try both, keep the one that opens it
  let pressed = await pressMenuRow();
  await wait(1500);
  let v = await viewer();
  if (xr && !(v.open && v.view === 'lexicon')) {
    // the map row was there: that press opened Sources; close it, and press one row lower
    if (v.open) { await page.evaluate(() => window.__siteViewer.close()); await wait(800); }
    menuIdx = 5;
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera'), plane = app.root.findByName('xr-frame-menu');
      const y = 84 + 64 * 5 + 26; const local = head.getPosition().clone().set(0, 0, (y / 768 - 0.5));
      const target = plane.getWorldTransform().transformPoint(local, local.clone()); const origin = head.getPosition().clone();
      window.__controller.getOrigin = () => origin; window.__controller.getDirection = () => target.clone().sub(origin).normalize(); });
    await wait(300); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller)); await wait(1500);
    v = await viewer();
  }
  check(mode, 'the menu row opens the one Lexicon in the site viewer', pressed && v.open && v.view === 'lexicon', `view=${v.view}`);
  await shot('lexicon-from-menu');
  await pressViewer('lx:lex-words'); await wait(1000);
  await shot('lexicon-from-menu-words');
  await pressViewer('close'); await wait(1000);
  v = await viewer();
  check(mode, 'closing the window returns to the menu (the menu is still open)', !v.open && (xr ? await page.evaluate(() => !!window.__app.root.findByName('xr-frame-menu')?.enabled) : await menuOpen()), `viewer ${v.open ? 'open' : 'closed'}`);
  await shot('back-to-the-menu');
  // the Lexicon's own Close does the same
  await pressMenuRow(); await wait(1500);
  v = await viewer();
  if (v.open) {
    await pressViewer('lx:lex-close'); await wait(1000);
    v = await viewer();
    check(mode, "the Lexicon's own Close also returns to the menu", !v.open, `viewer ${v.open ? 'open on ' + v.view : 'closed'}`);
  } else check(mode, 'the row opens the Lexicon a second time', false);

  // ── 2. THE SETUP ──
  await open(page, 'setup=1', xr);
  await page.waitForFunction(() => window.__os.setup && window.__os.setup.open, { timeout: 60000 }).catch(() => {});
  const setupPress = async (id) => page.evaluate((id) => { const s = window.__os.setup; const h = s.hits.find((k) => k.id === id); if (!h) return false; s.handleClick(h.x + h.w / 2, h.y + h.h / 2); window.__os.dirty = true; return true; }, id);
  // greet → "I know what to do" → the CONTENT NOTE opens on its own after a beat
  for (let k = 0; k < 20; k++) { if (await setupPress('setup-choice-1')) break; await wait(500); }
  await page.waitForFunction(() => window.__os.setup?.stage === 'note', { timeout: 20000 }).catch(() => {});
  await wait(1200);
  const st0 = await page.evaluate(() => window.__os.setup?.stage);
  check(mode, 'the setup reaches its CONTENT NOTE', st0 === 'note', `stage=${st0}`);
  check(mode, 'the note offers "Read the Lexicon first" beside Close', await page.evaluate(() => !!window.__os.setup.hits.find((h) => h.id === 'setup-lexicon') && !!window.__os.setup.hits.find((h) => h.id === 'setup-close')));
  // the photograph: the setup's window, as the visitor sees it (desktop: the monitor; the canvas is also saved flat)
  await shot('setup-note-offer');
  const flat = await page.evaluate(() => window.__os.canvas.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync(path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-setup-note-offer.canvas.png`), Buffer.from(flat, 'base64'));
  await setupPress('setup-lexicon'); await wait(1500);
  v = await viewer();
  check(mode, 'the offer opens the one Lexicon over the setup', v.open && v.view === 'lexicon', `view=${v.view}`);
  await shot('lexicon-from-setup');
  await pressViewer('close'); await wait(1000);
  v = await viewer();
  const st1 = await page.evaluate(() => window.__os.setup?.stage);
  check(mode, 'closing it leaves the setup at its note (nothing waited, nothing skipped)', !v.open && st1 === 'note', `stage=${st1}`);
  await shot('back-to-the-setup-note');
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

try {
  for (const mode of ['desktop', 'xr']) { if (MODE && MODE !== mode) continue; await run(mode); }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ port: PORT, checks }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
