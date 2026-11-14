#!/usr/bin/env node
/**
 * ⚑ S384 (UiB job 22 Part C item 2) — THE LEXICON'S REASONS, PRESSED AND PHOTOGRAPHED, AND MEASURED FOR FIT.
 *
 *     node tools/s384-lexicon-probe.mjs --port 5315 [--out out/s384-lexicon/after] [--mode flat|desktop|phone-portrait|xr]
 *
 * Two kinds of pass:
 *   flat           — the Lexicon drawn by its own module (src/room/lexicon.ts, imported from the dev server, the same
 *                    instance the piece uses) at its 512 × 384 ×3, every page of The Reasons, each draw RECORDED (every
 *                    fillText and fillRect): no text past the page's right edge, nothing in the content running into the
 *                    chapter bar, each reason's lines clear of the WHEN column, each WHEN fitting its column, each status
 *                    plate clear of the next row, and every row of reasons.men / women / trans printed exactly once.
 *   desktop, phone-portrait (390 × 844, an emulated touch phone), xr (a mocked headset, a controller ray + select) —
 *                    a settled 2003 room (`?era=2`), the game menu opened as a visitor opens it (Esc; the menu glyph,
 *                    tapped; the headset's frame), its Lexicon row pressed, then the chapter bar's "Reasons" and its ►
 *                    pressed by their published hits (real mouse down/up; touch taps; the ray at the hit on the window's
 *                    plane) until the last page (the arc); every page photographed, and its page count checked against
 *                    the flat pass.
 * Writes report.json and the photographs; exit 1 on a failed check. Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s384-lexicon/after'));
const MODE = flag('mode', '');
const DSF = Number(flag('dsf', 2));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const lex = JSON.parse(fs.readFileSync(path.resolve('data/strings/lexicon.json'), 'utf8'));
const ROWS = ['men', 'women', 'trans'].reduce((n, g) => n + lex.reasons[g].length, 0);
let flatPages = null;

async function boot(page, query) {
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0&${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
}

// ── FLAT: the module's own draw, recorded ──
async function flat() {
  const mode = 'flat';
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  await boot(page, 'era=2');
  await wait(2500);
  const res = await page.evaluate(async () => {
    const { Lexicon } = await import('/src/room/lexicon.ts');
    const W = 512, H = 384, S = 3;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d');
    const rec = { texts: [], rects: [] };
    const fillText = ctx.fillText.bind(ctx), fillRect = ctx.fillRect.bind(ctx);
    ctx.fillText = (t, x, y, ...r) => { rec.texts.push({ t: String(t), x, y, w: ctx.measureText(String(t)).width, font: ctx.font }); return fillText(t, x, y, ...r); };
    ctx.fillRect = (x, y, w, h) => { rec.rects.push({ x, y, w, h, c: String(ctx.fillStyle) }); return fillRect(x, y, w, h); };
    const lx = new Lexicon();
    lx.press('lex-reasons');
    const hits = [];
    const draw = () => { rec.texts = []; rec.rects = []; ctx.setTransform(S, 0, 0, S, 0, 0); lx.draw(ctx, W, H, hits); return { texts: rec.texts.slice(), rects: rec.rects.slice(), png: cv.toDataURL('image/png').split(',')[1] }; };
    draw();
    const n = lx.measured?.reasons ?? 1;
    const pages = [];
    for (let i = 0; i < n; i++) { if (i) lx.press('lex-next'); pages.push(draw()); }
    return { n, pages };
  });
  flatPages = res.n;
  const W = 512, BAND = 346, COL = W - 150;
  let rowsSeen = 0, plated = 0;
  const problems = { right: [], bar: [], intoCol: [], era: [], plate: [] };
  res.pages.forEach((pg, i) => {
    fs.writeFileSync(path.join(OUT, `flat-reasons-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(pg.png, 'base64'));
    for (const t of pg.texts) {
      if (t.x + t.w > W - 4) problems.right.push(`p${i + 1} "${t.t.slice(0, 40)}" ends at ${Math.round(t.x + t.w)}`);
      if (t.y < BAND - 8 && t.y + 16 > BAND) problems.bar.push(`p${i + 1} "${t.t.slice(0, 40)}" at y ${t.y}`);
    }
    if (i === res.pages.length - 1) return;   // the arc
    // a row = its separator (1 px, x 14, W-28 wide); its lines at x 14 (serif 15); its WHEN at x COL; its plates at x COL, 17 tall
    const seps = pg.rects.filter((r) => r.x === 14 && r.h === 1 && r.w === W - 28).map((r) => r.y + 5);
    rowsSeen += seps.length;
    seps.forEach((y, k) => {
      const next = k + 1 < seps.length ? seps[k + 1] - 5 : BAND - 6;
      const lines = pg.texts.filter((t) => t.x === 14 && t.y >= y && t.y < next);
      for (const l of lines) if (l.x + l.w > COL - 4) problems.intoCol.push(`p${i + 1} "${l.t.slice(0, 40)}" ends at ${Math.round(l.x + l.w)}`);
      const era = pg.texts.find((t) => t.x === COL && t.y === y);
      if (!era) problems.era.push(`p${i + 1} row ${k + 1}: no WHEN`);
      else if (era.x + era.w > W - 14) problems.era.push(`p${i + 1} "${era.t}" ends at ${Math.round(era.x + era.w)}`);
      const plates = pg.rects.filter((r) => r.x === COL && r.h === 17 && r.y >= y && r.y < next);
      if (plates.length) plated++;
      for (const p of plates) if (p.y + p.h > next) problems.plate.push(`p${i + 1} row ${k + 1}: plate bottom ${p.y + p.h} > ${next}`);
      if (lines.length && lines[lines.length - 1].y + 19 > next + 1) problems.plate.push(`p${i + 1} row ${k + 1}: text runs into the next row`);
    });
  });
  check(mode, `The Reasons measure into ${res.n} pages (the last the arc)`, res.n >= 2, `${res.n} pages`);
  check(mode, `every row of the table is printed once (${ROWS} rows)`, rowsSeen === ROWS, `${rowsSeen} printed`);
  check(mode, 'every row carries its status plate (the measure found them)', plated === rowsSeen && plated > 0, `${plated} of ${rowsSeen}`);
  check(mode, 'no text past the page\'s right edge', !problems.right.length, problems.right.slice(0, 3).join(' | '));
  check(mode, 'nothing in the content runs into the chapter bar', !problems.bar.length, problems.bar.slice(0, 3).join(' | '));
  check(mode, "each reason's lines stay clear of the WHEN column", !problems.intoCol.length, problems.intoCol.slice(0, 3).join(' | '));
  check(mode, 'each WHEN fits its column', !problems.era.length, problems.era.slice(0, 3).join(' | '));
  check(mode, 'each status plate and row stays clear of the next row', !problems.plate.length, problems.plate.slice(0, 3).join(' | '));
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ── IN PLACE: pressed the way a visitor presses ──
async function run(mode) {
  const xr = mode === 'xr', phone = mode.startsWith('phone');
  const VW = phone ? 390 : 1280, VH = phone ? 844 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, isLandscape: false } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { const f = path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f }); return f; };
  await boot(page, 'era=2');
  const tapAt = async (x, y) => {
    if (phone) { await page.touchscreen.tap(x, y); return; }
    await page.mouse.move(x, y); await wait(120); await page.mouse.down(); await wait(70); await page.mouse.up();
  };
  const xrAimAt = (world) => page.evaluate((p) => {
    const app = window.__app, head = app.root.findByName('camera');
    const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
    const target = origin.clone().set(p.x, p.y, p.z);
    window.__controller.getOrigin = () => origin;
    window.__controller.getDirection = () => target.clone().sub(origin).normalize();
  }, world);
  const xrSelect = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await wait(1500); await xrSelect();   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  await wait(4000);
  const core = () => page.evaluate((x) => { const sv = window.__siteViewer, c = x ? sv.xr.core : sv.dom;
    return { open: x ? sv.xr.isOpen : sv.bus.domOpen(), view: c.view, face: c.lexicon?.lex?.face ?? null, page: c.lexicon?.lex?.page ?? null, next: !!c.centerOf('lx:lex-next') }; }, xr);
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
      const c = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
      const px = c.centerOf(id); if (!px || !cv) return null;
      const r = cv.getBoundingClientRect(), s = c.lastSize;
      return { x: r.left + (px.x / s.w) * r.width, y: r.top + (px.y / s.h) * r.height };
    }, id);
    if (!at) return false;
    await tapAt(at.x, at.y); return true;
  };
  const saveCanvas = async (label) => {
    const b64 = await page.evaluate((x) => { const cv = x ? null : document.querySelector('#reinterp-site-viewer canvas'); return cv ? cv.toDataURL('image/png').split(',')[1] : null; }, xr);
    if (b64) fs.writeFileSync(path.join(OUT, `${mode}-${String(n).padStart(2, '0')}-${label}.canvas.png`), Buffer.from(b64, 'base64'));
  };

  // the menu, opened as a visitor opens it; its Lexicon row pressed
  if (xr) {
    await page.evaluate(() => window.__xrFrame.open()); await wait(900);
    for (const i of [2, 1]) {
      await page.evaluate((i) => { const app = window.__app, head = app.root.findByName('camera'), plane = app.root.findByName('xr-frame-menu');
        const y = 84 + 64 * i + 26; const V = head.getPosition().constructor; const target = plane.getWorldTransform().transformPoint(new V(0, 0, y / 768 - 0.5));
        const origin = head.getPosition().clone(); window.__controller.getOrigin = () => origin; window.__controller.getDirection = () => target.clone().sub(origin).normalize(); }, i);
      await wait(300); await xrSelect(); await wait(1500);
      const v = await core();
      if (v.open && v.view === 'lexicon') break;
      if (v.open) { await page.evaluate(() => window.__siteViewer.close()); await wait(600); }
      await page.evaluate(() => window.__xrFrame.open()); await wait(800);
    }
  } else {
    if (phone) { const g = await page.evaluate(() => { const b = document.getElementById('reinterp-menu-glyph'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); if (g) await tapAt(g.x, g.y); }
    else await page.keyboard.press('Escape');
    await wait(1000);
    const row = await page.evaluate(() => { const b = document.querySelector('#reinterp-game-menu [data-menu-row="lexicon"]'); if (!b) return null;
      b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (row) await tapAt(row.x, row.y);
  }
  await wait(1500);
  let v = await core();
  check(mode, "the menu's Lexicon row opens the Lexicon", v.open && v.view === 'lexicon', `view ${v.view}; face ${v.face}`);
  // the chapter bar's Reasons
  await viewerPress('lx:lex-reasons'); await wait(1000);
  v = await core();
  check(mode, 'a press on "Reasons" opens The Reasons', v.face === 'reasons' && v.page === 0, `face ${v.face}, page ${v.page}`);
  await shot('reasons-01'); await saveCanvas('reasons-01');
  let pages = 1;
  for (let k = 0; k < 20 && v.next; k++) {
    const before = v.page;
    await viewerPress('lx:lex-next'); await wait(800);
    v = await core();
    if (v.page === before) { check(mode, `► turns page ${before + 1}`, false, `still ${v.page}`); break; }
    pages++;
    await shot(`reasons-${String(pages).padStart(2, '0')}`); await saveCanvas(`reasons-${String(pages).padStart(2, '0')}`);
  }
  check(mode, `► pages through every page of The Reasons${flatPages ? ` (${flatPages}, as measured flat)` : ''}`, v.face === 'reasons' && (!flatPages || pages === flatPages), `${pages} pages pressed`);
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

try {
  if (!MODE || MODE === 'flat') await flat();
  for (const mode of ['desktop', 'phone-portrait', 'xr']) { if (MODE && MODE !== mode) continue; await run(mode); }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ port: PORT, checks }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
