#!/usr/bin/env node
/**
 * ⚑ RETIRED (S378/S380): it pressed the Restart card on Daniel's far glass (`__closeMonitor`), which S378 emptied and
 * S380 removed from the sky. The Lexicon is probed by tools/s379-lexicon-probe.mjs (menu, setup) and tools/s380-crt-probe.mjs
 * (the machine's page). Kept for the record; it will not run on a build from S380 on.
 * ⚑ S378 (UiB job 20 Part A): SUPERSEDED — the Lexicon no longer opens on Daniel's glass (the glass takes no press); it opens in the site viewer from the computer panel's page, its star, and (S379) the menu and the setup. tools/s378-machine-probe.mjs photographs it there. This probe is kept as the record of S372 and will fail on the new build.
 * ⚑ S372 / UiB job 17 Part B — THE LEXICON, PHOTOGRAPHED: every face, flat and in place, in the browser and in the
 * emulated headset.
 *
 *     node tools/s372-lexicon-probe.mjs --port 5293 --out out/s372/after [--only flat|browser|xr]
 *
 * Three passes (each its own page):
 *   flat     — the Lexicon drawn by its own module (src/room/lexicon.ts) into a 512 × 384 canvas at the glass's ×3, with a
 *              few words met first (Your Words), every page of every face saved as a PNG: what the glass carries, pixel
 *              for pixel.
 *   browser  — the real Close (?close=1): through its messages, the far glass pressed (the eye comes to Daniel's machine),
 *              the card's Lexicon button pressed, then each chapter button by its published rect; the 3D view saved.
 *   xr       — the same with a MOCKED headset (app.xr.active forced true, one Quest-like eye, 96° tall, a tracked-pointer controller), as
 *              tools/close-site-xr-probe.mjs does: mono WebGL, no stereo, no hardware timing. Each press is a controller
 *              select aimed at the hit's own centre on the glass. Photographed looking at the glass.
 * Where the build publishes them, it also presses a word's sound ("as it was sold") and its website link, and reports
 * what plays and what opens. Writes report.json beside the PNGs. Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5293));
const OUT = path.resolve(flag('out', 'out/s372/after'));
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// the words a visitor would have met by the Close, with where (lexicon.json `places`), in the order the piece meets them
const MET = [['roots', 'e1-rootcause'], ['ssa', 'e1-rootcause'], ['wound', 'e1-rootcause'], ['freedom', 'e1-rootcause'], ['accountability', 'e2-forum'],
  ['overcomer', 'e2-wotd'], ['dependency', 'e3-wotd'], ['brokenness', 'e3-keywords'], ['eligibility', 'e4-meridian'], ['exploratory', 'e4-news'],
  ['rogd', 'e4-signs'], ['contagion', 'e4-spread'], ['exploring', 'e4-explore'], ['explorative', 'e4-explore']];

const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const report = { port: PORT, flat: [], browser: [], xr: [], checks: [], errors: [] };
const check = (name, ok, extra = '') => { report.checks.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });

// ── flat: every page of every face, from the module itself ──
async function flat() {
  const dir = path.join(OUT, 'flat'); fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.errors.push(`flat: ${String(e).slice(0, 200)}`));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&setup=1&home=0&descent=0`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__os, { timeout: 90000 });
  await wait(800);
  const shots = await page.evaluate(async (met) => {
    const L = await import('/src/room/lexicon.ts');
    const F = await import('/src/desktop/theme/fonts.ts');
    F.setFaceEra('close');
    for (const [id, place] of met) L.meetWord(id, place);
    try { await document.fonts.ready; } catch { /* headless */ }
    const book = new L.Lexicon();
    const W = 512, H = 384, S = 3;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d'); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
    const hits = [];
    const out = [];
    const snap = (name) => { book.draw(ctx, W, H, hits); out.push({ name, png: cv.toDataURL('image/png'), hits: hits.map((h) => h.id) }); };
    snap('00-title');
    for (const [tab, name, max] of [['lex-words', 'words', 80], ['lex-reasons', 'reasons', 20], ['lex-yours', 'yours', 6], ['lex-sources', 'sources', 12]]) {
      book.press(tab);
      for (let i = 0; i < max; i++) {
        snap(`${name}-${String(i + 1).padStart(2, '0')}`);
        if (!hits.some((h) => h.id === 'lex-next')) break;
        book.press('lex-next');
      }
    }
    // the media window ("as it was sold"), where the build has one, on a few kinds of word
    for (const id of ['ssa', 'struggle', 'contagion', 'rogd', 'explorative', 'chosenfamily', 'conversion']) {
      if (!book.press(`lex-go-${id}`) || book.termId !== id) continue;
      book.draw(ctx, W, H, hits);
      if (!hits.some((h) => h.id === 'lex-sold')) continue;
      book.press('lex-sold');
      snap(`panel-${id}`);
      book.press('lex-panel-close');
    }
    return out;
  }, MET);
  for (const s of shots) {
    fs.writeFileSync(path.join(dir, `${s.name}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
    report.flat.push({ name: s.name, hits: s.hits });
  }
  check('flat: every face drawn', shots.length > 5, `${shots.length} pages`);
  await page.close();
}

/** through the Close's messages to its panels; returns when the monitor can be pressed */
async function reachClose(page, xr) {
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__closeState && window.__closeMonitor, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; }' });
  if (xr) {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 96;
      window.__fovPin = setInterval(() => { head.camera.fov = 96; }, 16);
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  const t0 = Date.now();
  let pressed = -1;
  while (Date.now() - t0 < 240000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.panels && st.open > 0.98 && !/message|travel|lookUp|hold/.test(st.stage ?? '')) break;
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(2500);
      if (xr) await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
      else await page.mouse.click(640, 360);
      pressed = st.card; await wait(900); continue;
    }
    await wait(1200);
  }
  const st = await page.evaluate(() => window.__closeState());
  check(`${xr ? 'xr' : 'browser'}: the Close reached its panels`, st.panels && st.open > 0.9, JSON.stringify(st));
  if (xr) {
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(2000);
  }
  await page.evaluate(() => { const m = window.__closeMonitor; if (!m.on) { m.setNear(false); m.show(); } });
  await wait(3500);
}

async function inPlace(xr) {
  const dir = path.join(OUT, xr ? 'xr' : 'browser'); fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  // the headset: one eye of a Quest-like frame (96° tall; 1100 × 960 makes it ~104° wide), as tools/j15-07-side-probe.mjs
  if (xr) await page.setViewport({ width: 1100, height: 960, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => report.errors.push(`${xr ? 'xr' : 'browser'}: ${String(e).slice(0, 200)}`));
  const rows = xr ? report.xr : report.browser;
  let n = 0;
  const shot = async (label, extra = {}) => {
    const f = path.join(dir, `${String(++n).padStart(2, '0')}-${label}.png`);
    await page.screenshot({ path: f });
    rows.push({ shot: path.basename(f), ...extra });
  };
  await reachClose(page, xr);
  await page.evaluate(async (met) => { const L = await import('/src/room/lexicon.ts'); for (const [id, place] of met) L.meetWord(id, place); }, MET);

  // aim (xr) or press (browser) at a logical pixel of the glass
  const glassPoint = (x, y) => page.evaluate(([x, y]) => {
    const g = window.__closeMonitor.glass;
    return { x: g.x + (x / 512 - 0.5) * g.w, y: g.y + (0.5 - y / 384) * g.h, z: g.z };
  }, [x, y]);
  const lookAtGlass = () => page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort, g = window.__closeMonitor.glass;
    const t = c.physicalPoint(head.getPosition().clone().set(g.x, g.y, g.z)), o = head.getPosition();
    const d = t.clone().sub(o);
    const cur = head.getLocalEulerAngles();
    const parentYaw = head.parent ? head.parent.getEulerAngles().y : 0;
    head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI - parentYaw, 0);
    void cur;
  });
  const pressAt = async (x, y) => {
    if (!xr) { await page.evaluate(([x, y]) => window.__closeMonitor.press(x, y), [x, y]); return; }
    const p = await glassPoint(x, y);
    await page.evaluate((p) => {
      const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
      const origin = head.getPosition().clone();
      const target = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z));
      window.__controller.getOrigin = () => origin;
      window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      app.xr.input.fire('select', window.__controller);
    }, p);
  };
  const hit = (id) => page.evaluate((id) => window.__closeMonitor.hits.find((h) => h.id === id) ?? null, id);
  const pressId = async (id) => {
    const h = await hit(id);
    if (!h) return false;
    await pressAt(h.x + h.w / 2, h.y + h.h / 2);
    await wait(700);
    return true;
  };

  // come to the machine: the far glass is one press (repeated while the Close's own camera is still moving)
  for (let i = 0; i < 8; i++) {
    // only while the FAR face is up: a press at the centre of the near card would land on one of its era buttons
    const far = await page.evaluate(() => !window.__closeMonitor.near && window.__closeMonitor.hits.some((h) => h.id === 'close-go'));
    if (far) await pressAt(256, 192);
    await wait(3000);
    if (await page.evaluate(() => window.__closeMonitor.near)) break;
  }
  await wait(2500);
  if (xr) { await lookAtGlass(); await wait(600); }
  const near = await page.evaluate(() => window.__closeMonitor.near);
  check(`${xr ? 'xr' : 'browser'}: the eye came to Daniel's machine`, near);
  await shot('card');
  const opened = await pressId('close-lexicon');
  check(`${xr ? 'xr' : 'browser'}: the card's Lexicon button opens the Lexicon`, opened && (await page.evaluate(() => window.__closeMonitor.hits.some((h) => h.id.startsWith('lex-')))));
  if (xr) await lookAtGlass();
  await wait(600);
  await shot('lexicon-title');

  // the words: the first page, and a few further on
  await pressId('lex-words'); if (xr) await lookAtGlass(); await wait(500);
  await shot('words-01');
  for (let i = 1; i <= 24; i++) {
    await pressId('lex-next');
    if ([5, 11, 13, 20, 24].includes(i)) { if (xr) await lookAtGlass(); await wait(400); await shot(`words-${String(i + 1).padStart(2, '0')}`); }
  }
  // its sound and its website, where the build publishes them
  const ids = await page.evaluate(() => window.__closeMonitor.hits.map((h) => h.id));
  rows.push({ hitsOnAWordPage: ids });
  // "as it was sold": a met word with a sound, reached through Your Words (each row is a door to its page)
  if (ids.includes('lex-sold')) {
    await pressId('lex-yours'); await wait(300);
    let door = null;
    for (let i = 0; i < 4 && !door; i++) {   // Your Words is paged: turn until the row is on the glass
      door = await page.evaluate(() => window.__closeMonitor.hits.find((h) => h.id === 'lex-go-contagion')?.id ?? null);
      if (!door && !(await pressId('lex-next'))) break;
    }
    if (!door) await pressId('lex-words');
    if (door) {
      await pressId(door); await pressId('lex-sold'); await wait(1500);
      const playing = await page.evaluate(async () => (await import('/src/audio/tapeAudio.ts')).playingNow());
      check(`${xr ? 'xr' : 'browser'}: "as it was sold" plays the word's sound`, playing.some((f) => /clip_narr_2/.test(f)), JSON.stringify(playing));
      if (xr) await lookAtGlass();
      await shot('words-sold-playing', { playing });
      await pressId('lex-panel-close'); await wait(500);
      const after = await page.evaluate(async () => (await import('/src/audio/tapeAudio.ts')).playingNow());
      check(`${xr ? 'xr' : 'browser'}: closing the media window stops it`, !after.some((f) => /clip_narr_2/.test(f)), JSON.stringify(after));
    }
  }
  const siteId = ids.find((id) => id.startsWith('lex-site'));
  if (siteId) {
    await pressId(siteId); await wait(1800);
    const v = await page.evaluate(() => { const s = window.__siteViewer; const core = window.__app.xr?.active ? s.xr?.core : s.dom; return { open: s.bus.isOpen, view: core?.view, tab: core?.tab }; });
    check(`${xr ? 'xr' : 'browser'}: the word's website link opens that year's words`, v.open && v.tab === 'words', JSON.stringify(v));
    await shot('words-site-open', v);
    await page.evaluate(() => window.__siteViewer.close()); await wait(600);
  }
  for (const [tab, label, pages] of [['lex-reasons', 'reasons', 6], ['lex-yours', 'yours', 1], ['lex-sources', 'sources', 2]]) {
    await pressId(tab); if (xr) await lookAtGlass(); await wait(500);
    await shot(`${label}-01`);
    for (let i = 1; i < pages; i++) {
      if (!(await pressId('lex-next'))) break;
      if (label !== 'reasons' || i === pages - 1 || i === 3) { if (xr) await lookAtGlass(); await wait(400); await shot(`${label}-${String(i + 1).padStart(2, '0')}`); }
    }
  }
  const draws = await page.evaluate(() => window.__app.stats?.drawCalls?.total ?? null);
  rows.push({ drawCalls: draws });
  await page.close();
}

// ── home: LambyOS Home's return mode (its shelf opens the same Lexicon as a card; the live piece ends on the Restart card,
//    so this is reachable only by mounting Home in 'return' mode, as tools/lexicon-home-stills.mjs does) ──
async function home() {
  const dir = path.join(OUT, 'home'); fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.errors.push(`home: ${String(e).slice(0, 200)}`));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__os?.setup, { timeout: 90000 });
  await page.evaluate(async (met) => {
    const L = await import('/src/room/lexicon.ts');
    for (const [id, place] of met) L.meetWord(id, place);
    const m = await import('/src/desktop/home/lambyosHome.ts');
    m.mountLambyosHome(() => {}, { mode: 'return' });
  }, MET);
  await page.waitForSelector('#lambyos-home [data-home="lexicon"]', { timeout: 20000 });
  await wait(600);
  await page.evaluate(() => document.querySelector('#lambyos-home [data-home="lexicon"]').click());
  await page.waitForSelector('button[data-lex="lex-words"]', { timeout: 15000 });
  await wait(400);
  let n = 0;
  const shot = async (label) => { await page.screenshot({ path: path.join(dir, `${String(++n).padStart(2, '0')}-${label}.png`) }); };
  const click = async (id) => { const ok = await page.evaluate((id) => { const b = document.querySelector(`button[data-lex="${id}"]`); if (b) b.click(); return !!b; }, id); await wait(400); return ok; };
  await shot('title');
  await click('lex-words'); await shot('words-01');
  for (let i = 0; i < 21; i++) await click('lex-next');
  await shot('words-22');
  if (await click('lex-sold')) await shot('words-22-sold');
  const labels = await page.evaluate(() => [...document.querySelectorAll('button[data-lex]')].map((b) => b.getAttribute('aria-label')));
  check('home: every control on the card has a name', labels.every((l) => l && !l.startsWith('lex-')), JSON.stringify(labels));
  await click('lex-panel-close');
  await click('lex-yours'); await shot('yours');
  await page.close();
}

try {
  if (ONLY === 'home') await home();
  if (!ONLY || ONLY === 'flat') await flat();
  if (!ONLY || ONLY === 'browser') await inPlace(false);
  if (!ONLY || ONLY === 'xr') await inPlace(true);
} catch (e) {
  report.errors.push(String(e).slice(0, 300));
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
console.log(`\n${report.checks.filter((c) => c.ok).length}/${report.checks.length} checks passed; errors ${report.errors.length}`);
process.exit(report.checks.every((c) => c.ok) && report.errors.length === 0 ? 0 : 1);
