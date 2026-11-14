#!/usr/bin/env node
/**
 * ⚑ S388 (UiB job 24 Part C item 5-6) — THE CHAT FRONT DOORS CARD, PHOTOGRAPHED WHERE IT SHOWS.
 *
 *     node tools/s388-card-probe.mjs --port 5344 [--out out/s388/card] [--mode data|page|desktop|phone-portrait|xr]
 *
 * The card (data/dossier/practices.json `chatDoors`, source e4_offers debrief.sources[24]) shows in two places, as `detransAI`
 * does: on the Close's 2026 panel (whose press opens the 2026 website window) and on the 2026 era site (the Practices tab).
 *   data           — static: the card, its did line (his), its source entry, the panel's `practices` list order; no browser.
 *   page           — the 2026 era site as a web page (public/sites/2026/index.html), desktop 1280 × 720 and a 390 × 844 phone:
 *                    the card's heading, did line and source text are in the DOM; the card is photographed.
 *   desktop, phone-portrait — the Close reached from Daniel's seat (`?close=1`), pressed through to its panels (a real
 *                    click / tap on each message card), the 2026 panel published (`__closePanels()`), then the site window
 *                    OPENED ON 2026's Practices TAB by its entry point (`__siteViewer.bus.openAt`), the way the panel's press
 *                    calls it; the card found in the window's laid-out document and scrolled to; photographed.
 *   xr             — the same Close with the XR manager forced active and a mocked tracked-pointer controller (the method of
 *                    tools/close-site-xr-probe.mjs): the controller is AIMED at the 2026 panel and `select` fired, which opens
 *                    the 2026 window on the headset's plane; the card is scrolled to and photographed. Mono WebGL, no claim of
 *                    stereo or hardware timing: the in-headset look is his.
 * Writes report.json and the photographs. Exit 1 on a failed check. Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s388/card'));
const MODE = flag('mode', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const DID = 'remembered what you told it, and held you to it';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

function data() {
  const mode = 'data';
  const prac = readJson('data/dossier/practices.json').practices;
  const offers = readJson('data/provotypes/e4_offers.json');
  const net = readJson('data/strings/close_network.json');
  const c = prac.chatDoors, h = prac.host, d = prac.detransAI;
  check(mode, 'the card exists with his did line, exactly', !!c && c.did === DID, c?.did);
  check(mode, 'status documentary', c?.status === 'documentary');
  check(mode, 'its source points at the new e4_offers entry', c?.source?.file === 'e4_offers' && c.source.index === offers.debrief.sources.length - 1, JSON.stringify(c?.source));
  const s = offers.debrief.sources[c.source.index];
  check(mode, 'the source entry is documentary, with confidence and text', s?.status === 'documentary' && !!s.confidence && s.text.length > 400, `${s?.text?.length} chars`);
  check(mode, 'no person is named in the card or its source (founders, coach, writer, vendor staff)', !/Ingraham|Garry|Melissa|Winn|Stephanie|Kimi|Moonshot|Delphi/.test(JSON.stringify([c, s.text])));
  check(mode, 'the host card is untouched (speculative, index 11, his did line)', h.status === 'speculative' && h.source.index === 11 && h.did === 'listened to you like a friend, and filed you as a lead');
  check(mode, 'detransAI is untouched (index 12)', d.source.index === 12 && d.did === 'greeted you warmly, and pressed on whether you were sure');
  const panel = net.panels.find((p) => p.era === 4);
  const i = panel.practices.indexOf('detransAI');
  check(mode, "the 2026 panel's practices list has chatDoors right after detransAI", panel.practices[i + 1] === 'chatDoors', panel.practices.slice(i - 1, i + 3).join(' > '));
}

async function pageMode() {
  const mode = 'page';
  for (const [label, phone] of [['desktop', false], ['phone', true]]) {
    const page = await browser.newPage();
    if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } });
    else await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    await page.goto(`http://localhost:${PORT}/sites/2026/index.html`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(1200);
    // the era site's tabs are radio buttons: press the Practices tab's label as a visitor does (a real click / tap)
    const lab = await page.evaluate(() => { const l = document.querySelector('label[for="t-practices"]'); if (!l) return null; l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (lab) { if (phone) await page.touchscreen.tap(lab.x, lab.y); else await page.mouse.click(lab.x, lab.y); }
    await wait(600);
    const found = await page.evaluate((did) => {
      const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.includes('The chat front doors'));
      if (!h) return null;
      const card = h.closest('article') ?? h.parentElement;
      card.scrollIntoView({ block: 'start' });
      const r = card.getBoundingClientRect();
      return { did: card.textContent.includes(did), src: /Love & Truth Network/.test(card.textContent) && /RepairBot/.test(card.textContent), tag: !!card.querySelector('.s-documentary'), x: r.x, y: r.y, w: r.width, h: r.height };
    }, DID);
    check(mode, `[${label}] the card is on the 2026 era site, with his did line and its source text`, !!found && found.did && found.src && found.tag, JSON.stringify(found));
    if (found) {
      // the heading just under the sticky bar, then the visible viewport (the sticky bar and dock are part of the page)
      await page.evaluate((top) => { const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.includes('The chat front doors')); window.scrollTo({ top: window.scrollY + h.getBoundingClientRect().top - top, behavior: 'instant' }); }, phone ? 190 : 210);
      await wait(900);
      await page.screenshot({ path: path.join(OUT, `page-${label}-2026-card.png`) });
      await page.evaluate((d) => window.scrollTo({ top: window.scrollY + d, behavior: 'instant' }), phone ? 700 : 560);
      await wait(900);
      await page.screenshot({ path: path.join(OUT, `page-${label}-2026-card-source.png`) });
    }
    check(mode, `[${label}] no page errors`, !errors.length, errors.slice(0, 2).join(' | '));
    await page.close();
  }
}

async function closeMode(mode) {
  const xr = mode === 'xr', phone = mode.startsWith('phone');
  const VW = phone ? 390 : 1280, VH = phone ? 844 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: xr ? 1 : 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { const f = path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__closeState && window.__siteViewer, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' + (xr ? ' body > *:not(canvas) { visibility: hidden !important; }' : '') });
  if (xr) {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  // through the messages to the panels (a real press on each card)
  const t0 = Date.now();
  let pressed = -1;
  while (Date.now() - t0 < 300000) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.panels && st.open > 0.98 && !/message|travel|lookUp|hold/.test(st.stage ?? '')) break;
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(2500);
      if (phone) await page.touchscreen.tap(VW / 2, VH / 2); else await page.mouse.click(VW / 2, VH / 2);
      pressed = st.card; await wait(900); continue;
    }
    await wait(1200);
  }
  const st = await page.evaluate(() => window.__closeState());
  check(mode, 'the Close reached its panels', st.panels && st.open > 0.9, JSON.stringify(st));
  await wait(2000);
  const panels = await page.evaluate(() => window.__closePanels());
  const p4 = panels.find((q) => q.era === 4 && !q.hidden) ?? panels.find((q) => q.era === 4);
  check(mode, "the Close publishes a 2026 panel", !!p4, JSON.stringify(panels.map((q) => ({ era: q.era, hidden: q.hidden }))));
  await shot('close-panels');

  if (xr) {
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(2500);
    const fresh = await page.evaluate(() => window.__closePanels());
    const p = fresh.find((q) => q.era === 4 && !q.hidden) ?? fresh.find((q) => q.era === 4);
    await page.evaluate((pt) => {
      const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
      const t = c.physicalPoint(head.getPosition().clone().set(pt.x, pt.y, pt.z)), o = head.getPosition();
      const d = t.clone().sub(o);
      head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
      const origin = head.getPosition().clone();
      window.__controller.getOrigin = () => origin;
      window.__controller.getDirection = () => t.clone().sub(origin).normalize();
    }, p);
    await wait(900);
    await shot('aimed-at-2026-panel');
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await wait(1800);
  } else {
    await page.evaluate(() => window.__siteViewer.bus.openAt('2026', 'practices'));
    await wait(1500);
  }
  const viewer = () => page.evaluate((x) => { const v = window.__siteViewer; const c = x ? v.xr.core : v.dom; return { open: x ? v.xr.isOpen : v.bus.domOpen(), info: c.info() }; }, xr);
  // the window draws only when something changed: a scroll set from outside is followed by the mount's own repaint request
  // (the DOM window repaints on a resize; the headset plane repaints on a pointer move over it, so the aim is nudged)
  const repaint = async () => {
    if (!xr) { await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await wait(700); return; }
    for (const id of ['close', 'view:2026']) {
      await page.evaluate((id) => {
        const app = window.__app, head = app.root.findByName('camera'), v = window.__siteViewer.xr;
        const px = v.core.centerOf(id); if (!px) return;
        const plane = app.root.findByName('xr-frame-site'), wp = plane.getWorldTransform();
        const local = head.getPosition().clone().set(px.x / 1024 - 0.5, 0, px.y / 768 - 0.5);
        const target = wp.transformPoint(local, local.clone()), origin = head.getPosition().clone();
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, id);
      await wait(500);
    }
  };
  let v = await viewer();
  check(mode, xr ? 'a press on the 2026 panel (aimed, select) opens the 2026 site window on the headset plane' : 'the 2026 site window opens', v.open && String(v.info.view) === '2026', `view ${v.info.view}`);
  if (xr) {
    // the window opens on its first tab: ask for Practices the way a press on the tab does
    await page.evaluate(() => { const c = window.__siteViewer.xr.core; c.setTab('practices'); });
    await repaint(); await wait(600);
  }
  v = await viewer();
  check(mode, "the window is on the 2026 site's Practices tab", v.info.tab === 'practices', `tab ${v.info.tab}`);
  // find the card in the laid-out document and scroll to it
  const loc = await page.evaluate((x) => {
    const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom;
    const ops = c.doc?.ops ?? [];
    const t = ops.find((o) => o.t === 'text' && /^The chat front/.test(o.s ?? ''));
    const did = ops.find((o) => o.t === 'text' && /held you to it/.test(o.s ?? ''));
    const src = ops.find((o) => o.t === 'text' && /Love & Truth Network/.test(o.s ?? ''));
    const rep = ops.find((o) => o.t === 'text' && /RepairBot/.test(o.s ?? ''));
    return t ? { y: t.y, did: !!did, src: !!src, rep: !!rep } : null;
  }, xr);
  check(mode, 'the card is in the window (title, did line, the ministry and RepairBot in its source text)', !!loc && loc.did && loc.src && loc.rep, JSON.stringify(loc));
  if (loc) {
    await page.evaluate((x, y) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; c.scrollTo(Math.max(0, y - 30)); }, xr, loc.y);
    await repaint(); await wait(600);
    v = await viewer();
    const inView = loc.y >= v.info.scroll && loc.y <= v.info.scroll + v.info.vp.h;
    check(mode, 'the card is scrolled into the window', inView, `scroll ${v.info.scroll}, card at ${loc.y}, window ${v.info.vp.h} high`);
    const f = await shot('card-in-window');
    if (!xr) {
      const b64 = await page.evaluate(() => { const cv = document.querySelector('#reinterp-site-viewer canvas'); return cv ? cv.toDataURL('image/png').split(',')[1] : null; });
      if (b64) fs.writeFileSync(f.replace('.png', '.canvas.png'), Buffer.from(b64, 'base64'));
    }
    // a second view, a little further down: the card's source text
    await page.evaluate((x, y) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; c.scrollTo(Math.max(0, y + 250)); }, xr, loc.y);
    await repaint(); await wait(600);
    const f2 = await shot('card-source');
    if (!xr) {
      const b64 = await page.evaluate(() => { const cv = document.querySelector('#reinterp-site-viewer canvas'); return cv ? cv.toDataURL('image/png').split(',')[1] : null; });
      if (b64) fs.writeFileSync(f2.replace('.png', '.canvas.png'), Buffer.from(b64, 'base64'));
    }
  }
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

try {
  if (!MODE || MODE === 'data') data();
  if (!MODE || MODE === 'page') await pageMode();
  for (const m of ['desktop', 'phone-portrait', 'xr']) { if (MODE && MODE !== m) continue; await closeMode(m); }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ port: PORT, checks }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
