#!/usr/bin/env node
/**
 * ⚑ S406 (UiB job 32 Part A, H1) — WHAT THE HEADSET'S POINTER IS ON, photographed before and after. His run of 20 Nov: no
 * hover state on the content note's and the Lexicon's buttons (frames 212511–212541, 21:26:24), and on the Close's white
 * pages and the Lexicon "the website is on top of it … I cannot see where the arrow is pointing to" (22:47:35, 22:49:13).
 *
 *     node tools/s406-pointer-stills.mjs --port 5461 --label after --out <dir> [--only note,lexicon,close]
 *
 * The emulated headset (s381's: `app.xr.active`, a tracked-pointer controller held low and to the right of the eye):
 *   · note     — the real entrance, the setup in the stars, its CONTENT NOTE; the ray on its Close button
 *   · lexicon  — the note's "Read the Lexicon first": the Lexicon in the site window; the ray on its bottom bar's "Words"
 *   · close    — `?close=1`, past the messages: the ray on a panel, on its Sources button, then that year's website open and
 *                the ray on one of its links
 * Writes H1-<state>_<label>_xr.png and <label>.json (what was hovered).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', 'out/s406-pointer'));
const ONLY = flag('only', 'note,lexicon,close').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const report = { label: LABEL, states: {} };

const MOCK = () => {
  const app = window.__app, head = app.root.findByName('camera');
  Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
  head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
  const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
  window.__controller = src; app.xr.input.fire('add', src);
  app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
};
/** aim from a hand (low, to the right of the eye) at a PHYSICAL world point */
const aimPhysical = (page, p) => page.evaluate((p) => {
  const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
  const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.14)).add(head.up.clone().mulScalar(-0.28));
  const target = new V(p.x, p.y, p.z);
  window.__controller.getOrigin = () => origin.clone();
  window.__controller.getDirection = () => target.clone().sub(origin).normalize();
}, p);
/** the head turned to a physical point, the lens narrowed: the detail the ring and the ray's end are judged by */
const closeUp = async (page, p, file, fov = 32) => {
  await page.evaluate((p, fov) => {
    const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
    window.__wide = { rot: head.getLocalRotation().clone(), fov: head.camera.fov };
    head.lookAt(new V(p.x, p.y, p.z)); head.camera.fov = fov;
  }, p, fov);
  await wait(700);
  await page.screenshot({ path: file });
  await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.setLocalRotation(window.__wide.rot); h.camera.fov = window.__wide.fov; });
  await wait(300);
};
const select = (page) => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
const planePoint = (page, name, x, y, W, H) => page.evaluate((name, x, y, W, H) => {
  const e = window.__app.root.findByName(name); if (!e) return null;
  const V = e.getPosition().constructor, w = e.getWorldTransform().transformPoint(new V(x / W - 0.5, 0, y / H - 0.5));
  return { x: w.x, y: w.y, z: w.z };
}, name, x, y, W, H);

if (ONLY.includes('note') || ONLY.includes('lexicon')) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; } body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(MOCK);
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 120000 }); await wait(1500);
  await select(page);   // calibrates
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(800);
  await page.evaluate(() => { const h = window.__app.root.findByName('camera'); window.__controller.getOrigin = () => h.getPosition().clone(); window.__controller.getDirection = () => h.forward.clone(); });
  await select(page);   // the title → the setup
  await page.waitForFunction(() => (window.__os.setup?.hits ?? []).length > 0, { timeout: 40000 }).catch(() => {});
  await wait(2600);
  const setupPress = async (id) => {
    const h = await page.evaluate((id) => (window.__os.setup?.hits ?? []).find((k) => k.id === id) ?? null, id);
    if (!h) return false;
    const p = await planePoint(page, 'setup-in-stars', h.x + h.w / 2, h.y + h.h / 2, 512, 384);
    await aimPhysical(page, p); await wait(300); await select(page); return true;
  };
  // through the setup to the content note (the first choice of each step, as s381 does)
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => window.__os.setup?.stage ?? null);
    if (st === 'note') break;
    const ids = await page.evaluate(() => (window.__os.setup?.hits ?? []).map((h) => h.id));
    const next = ids.find((id) => /^setup-choice-1$|^setup-sound-on$|^setup-start$|^setup-close$|^setup-note-open$|^setup-dismiss$/.test(id)) ?? ids.find((id) => !/vol|device|test|lexicon|skip/.test(id));
    if (next) await setupPress(next);
    await wait(1500);
  }
  await page.waitForFunction(() => window.__os.setup?.stage === 'note' && (window.__os.setup?.hits ?? []).some((h) => h.id === 'setup-close'), { timeout: 20000 }).catch(() => {});
  if (ONLY.includes('note')) {
    // the note's own Close button (the lowest 'setup-close'; the title bar's box shares the id)
    const h = await page.evaluate(() => (window.__os.setup?.hits ?? []).filter((k) => k.id === 'setup-close').sort((a, b) => b.y - a.y)[0] ?? null);
    if (h) {
      const p = await planePoint(page, 'setup-in-stars', h.x + h.w / 2, h.y + h.h / 2, 512, 384);
      await aimPhysical(page, p); await wait(900);
      await page.screenshot({ path: path.join(OUT, `H1-content-note-wide_${LABEL}_xr.png`) });
      await closeUp(page, p, path.join(OUT, `H1-content-note_${LABEL}_xr.png`), 28);
      report.states.note = { stage: await page.evaluate(() => window.__os.setup?.stage), aimed: 'setup-close' };
    } else report.states.note = { error: 'no setup-close on the note' };
  }
  if (ONLY.includes('lexicon')) {
    const ok = await (async () => {
      const h = await page.evaluate(() => (window.__os.setup?.hits ?? []).find((k) => k.id === 'setup-lexicon') ?? null);
      if (!h) return false;
      const p = await planePoint(page, 'setup-in-stars', h.x + h.w / 2, h.y + h.h / 2, 512, 384);
      await aimPhysical(page, p); await wait(300); await select(page); return true;
    })();
    await wait(1800);
    const target = await page.evaluate(() => {
      const v = window.__siteViewer.xr; const px = v.core.centerOf('lx:lex-words') ?? v.core.centerOf('lx:lex-title'); if (!px) return null;
      const e = window.__app.root.findByName('xr-frame-site'); const V = e.getPosition().constructor;
      const w = e.getWorldTransform().transformPoint(new V(px.x / 1024 - 0.5, 0, px.y / 768 - 0.5));
      return { x: w.x, y: w.y, z: w.z };
    });
    if (ok && target) {
      await aimPhysical(page, target); await wait(1000);
      await page.screenshot({ path: path.join(OUT, `H1-lexicon-wide_${LABEL}_xr.png`) });
      await closeUp(page, target, path.join(OUT, `H1-lexicon-bar_${LABEL}_xr.png`), 30);
      report.states.lexicon = { open: await page.evaluate(() => window.__siteViewer.xr.isOpen), hover: await page.evaluate(() => window.__siteViewer.xr.core.hover) };
      // and a row in its contents (the first word's link on the First Words page), the ray on the page itself
      const row = await page.evaluate(() => {
        const v = window.__siteViewer.xr; const ids = (v.core.lexicon?.published ?? []).map((h) => h.id).filter((id) => /lex-go-/.test(id));
        const px = ids.length ? v.core.centerOf(ids[0]) : null; if (!px) return null;
        const e = window.__app.root.findByName('xr-frame-site'); const V = e.getPosition().constructor;
        const w = e.getWorldTransform().transformPoint(new V(px.x / 1024 - 0.5, 0, px.y / 768 - 0.5));
        return { x: w.x, y: w.y, z: w.z, id: ids[0] };
      });
      if (row) { await aimPhysical(page, row); await wait(1000); await closeUp(page, row, path.join(OUT, `H1-lexicon-content_${LABEL}_xr.png`), 30); report.states.lexiconRow = { id: row.id, hover: await page.evaluate(() => window.__siteViewer.xr.core.hover) }; }
    } else report.states.lexicon = { error: 'the Lexicon did not open from the note' };
  }
  report.errorsEntrance = errors;
  await page.close();
}

if (ONLY.includes('close')) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__closeState && window.__siteViewer, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; } body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(MOCK);
  const t0 = Date.now(); let pressed = -1;
  while (Date.now() - t0 < 240000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.panels && st.open > 0.98 && !/message|travel|lookUp|hold/.test(st.stage ?? '')) break;
    if (st.stage === 'message' && st.card !== pressed) { await wait(2500); await page.mouse.click(640, 360); pressed = st.card; await wait(900); continue; }
    await wait(1200);
  }
  await select(page);
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(2500);
  const panels = await page.evaluate(() => window.__closePanels());
  const p = panels.find((q) => q.era === 2 && !q.hidden) ?? panels.find((q) => !q.hidden);
  const look = (pt) => page.evaluate((p) => {
    const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort, V = head.getPosition().constructor;
    const t = c.physicalPoint(new V(p.x, p.y, p.z)), o = head.getPosition(), d = t.clone().sub(o);
    head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
    return { x: t.x, y: t.y, z: t.z };
  }, pt);
  if (p) {
    const phys = await look(p); await aimPhysical(page, phys); await wait(900);
    await closeUp(page, phys, path.join(OUT, `H1-close-panel_${LABEL}_xr.png`), 45);
    report.states.closePanel = { era: p.era, focus: await page.evaluate(() => !!window.__app.root.findByName('close-panel-focus')?.enabled) };
    if (p.button) {
      const pb = await look(p.button); await aimPhysical(page, pb); await wait(900);
      await closeUp(page, pb, path.join(OUT, `H1-close-sources_${LABEL}_xr.png`), 30);
      await select(page); await wait(1800);
      const open = await page.evaluate(() => window.__siteViewer.xr.isOpen);
      // the ray on a link of that year's page: the first document link the page publishes
      const link = await page.evaluate(() => {
        const v = window.__siteViewer.xr, core = v.core;
        const all = core.docHits ?? [];
        const hits = all.filter((h) => h.sy > 90 && h.sy + h.h < 700);
        let h = hits[0] ?? all[0], px;
        if (h) px = { x: h.sx + h.w / 2, y: h.sy + h.h / 2 };
        else {   // no link in view: the page's second tab (a control on the white page all the same)
          const tab = (core.hits ?? []).filter((k) => String(k.id).startsWith('tab:'))[1] ?? (core.hits ?? [])[0];
          if (!tab) return null;
          h = tab; px = { x: tab.x + tab.w / 2, y: tab.y + tab.h / 2 };
        }
        const e = window.__app.root.findByName('xr-frame-site'); const V = e.getPosition().constructor;
        const w = e.getWorldTransform().transformPoint(new V(px.x / 1024 - 0.5, 0, px.y / 768 - 0.5));
        return { x: w.x, y: w.y, z: w.z, id: h.id };
      });
      if (open && link) {
        await page.evaluate(() => { const h = window.__app.root.findByName('camera'); const e = window.__app.root.findByName('xr-frame-site'); h.lookAt(e.getPosition()); });
        await aimPhysical(page, link); await wait(1000);
        await page.screenshot({ path: path.join(OUT, `H1-close-site-wide_${LABEL}_xr.png`) });
        await closeUp(page, link, path.join(OUT, `H1-close-site_${LABEL}_xr.png`), 30);
        report.states.closeSite = { open, link: link.id, hover: await page.evaluate(() => window.__siteViewer.xr.core.hover) };
      } else report.states.closeSite = { open, error: 'no link to aim at' };
    }
  }
  report.errorsClose = errors;
  await page.close();
}
fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 1500));
await browser.close();
