#!/usr/bin/env node
/**
 * ⚑ S383 (UiB job 22 Part B) — THE RECEIPT, THE GRABBED SCROLL MARKER, THE PHONE'S WAY OUT. Pressed as a visitor presses.
 *
 *     node tools/s383-receipt-grab-phone-probe.mjs --port 5313 [--tag after] [--part receipt,grab,phone]
 *
 * receipt  Seeds the in-memory ledger through the app's own module (`/src/state/ledger.ts`, the same instance the piece
 *          reads) with a guided walk: 1997 files twelve practices, 2026 eight, 2003 and 2016 a few. Opens the machine's
 *          page (the bus, as the Close's panel does), then a REAL press (mouse down ~80 ms up at the hit's projected
 *          point; the controller's ray + select in the headset) on Receipt. Waits for the printing. Asserts every
 *          practice the record holds for each year is printed on that year's "used:" lines (no "…"), that the printing
 *          advanced a line at a time, that scrolling still works (wheel on the computer, thumbstick in the headset) and
 *          that the receipt's end ("kept by: nobody") is reachable and the window's Back / Close still work after it.
 * grab     The emulated headset (app.xr.active forced, a mocked tracked-pointer controller; no stereo, no hardware):
 *          the ray on the scroll thumb, selectstart, the ray moved down and up, selectend (+ select, in BOTH orders the
 *          runtime may send them): the thumb follows, the page follows proportionally and clamps; a grab that ends over
 *          a link presses nothing; the stick and the ▲▼ buttons still scroll; a hand pinch does the same.
 * phone    375 × 812 portrait and 812 × 375 landscape (isMobile, hasTouch, dsf 3): each era's site and the hub, scrolled
 *          to the bottom of its longest tab with real touch swipes; Close and Back are still on screen and a real tap
 *          on Close closes the window (on the machine's page Back returns).
 *
 * Photographs go to out/s383/<tag>/. Writes report-<tag>.json. Exit 1 if a check fails.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5313));
const TAG = flag('tag', 'after');
const PARTS = flag('part', 'receipt,grab,phone').split(',');
const OUT = path.resolve(flag('out', `out/s383/${TAG}`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
const checks = [];
const check = (group, name, ok, extra = '') => { checks.push({ group, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${extra ? '  ' + extra : ''}`); };
const URL0 = `http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0`;

async function boot(opts = {}) {
  const page = await browser.newPage();
  if (opts.viewport) await page.setViewport(opts.viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__siteViewer, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; } body > *:not(canvas):not(#reinterp-site-viewer):not(script):not(#reinterp-site-chip) { visibility: hidden !important; }' });
  await wait(1500);
  return { page, errors };
}
let shotN = 0;
/** the window in the headset is small in the frame: its photographs are cropped to it (xr-*), the computer's are whole */
const shotTo = async (page, name) => { const f = path.join(OUT, `${name}.png`); await page.screenshot(name.startsWith('xr-') ? { path: f, clip: { x: 420, y: 205, width: 440, height: 335 } } : { path: f }); shotN++; return f; };

/** a guided walk's record: 1997 twelve practices, 2003 and 2016 a few, 2026 eight (the order the record reads them in) */
async function seedLedger(page) {
  return page.evaluate(async () => {
    const { ledger } = await import('/src/state/ledger.ts');
    ledger.reachedEras = ['e1', 'e2', 'e3', 'e4'];
    ledger.records.push('profile-initialized', 'kit-inserted', 'pledge-signed', 'search-1997', 'channel-joined', 'enrollment-acknowledged', 'diary-written', 'subject-migrated', 'lamby-rig-opened',
      'forum-rules', 'forum-applied');
    ledger.provotypes.push({ id: 'pillow', outcome: 'completed', witness: 'seeded' });
    ledger.tapes.push({ id: 'A', outcome: 'playedThrough', witness: 'seeded' });
    ledger.media.push({ id: 'video', outcome: 'watched', witness: 'seeded' });
    ledger.checkins.push({ id: 'checkin-1', witness: 'seeded' });
    ledger.caleb.push({ id: 'c1', outcome: 'held', witness: 'seeded' });
    ledger.era3Arrival.push({ witness: 'seeded' });
    ledger.graceQueue.push({ cardId: 1, outcome: 'applied', witness: 'seeded' });
    ledger.comments.push({ commentId: 'k1', follow: false, witness: 'seeded' });
    ledger.era3Jobs.push({ id: 'tag-1', witness: 'seeded' });
    for (const id of ['program', 'newyou', 'v3:clinic', 'v3:mute', 'headset', 'host', 'laptop']) ledger.e4Space.push({ id, outcome: 'done', witness: 'seeded' });
    ledger.updates.push({ toEra: 2, remindLaterCount: 0, eulaScrollPct: 100 }, { toEra: 3, remindLaterCount: 1, eulaScrollPct: 100 }, { toEra: 4, remindLaterCount: 0, eulaScrollPct: 100 }, { toEra: 0, remindLaterCount: 0, eulaScrollPct: 100 });
    return JSON.parse(JSON.stringify({ n: ledger.records.length }));
  });
}

/** the emulated headset: active, head at seat height, a mocked tracked-pointer controller; the first select calibrates */
async function goXr(page) {
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src);
    const dbg = app.root.findByName('xr-debug'); if (dbg?.render) dbg.render.enabled = false;   // the debug plate stays out of the photographs
  });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}
/** aim the controller at a logical pixel of the open window's plane (1024 × 768 logical px) */
const aimPx = (page, x, y) => page.evaluate((x, y) => {
  const app = window.__app, head = app.root.findByName('camera');
  const plane = app.root.findByName('xr-frame-site');
  const wp = plane.getWorldTransform(), W = 1024, H = 768;
  const local = head.getPosition().clone().set(x / W - 0.5, 0, y / H - 0.5);
  const target = wp.transformPoint(local, local.clone());
  const origin = head.getPosition().clone();
  window.__controller.getOrigin = () => origin;
  window.__controller.getDirection = () => target.clone().sub(origin).normalize();
}, x, y);
const xrFire = (page, ev) => page.evaluate((ev) => window.__app.xr.input.fire(ev, window.__controller), ev);
const aimId = async (page, id) => { const px = await page.evaluate((id) => window.__siteViewer.xr.core.centerOf(id), id); if (!px) return false; await aimPx(page, px.x, px.y); return true; };
const xrPressId = async (page, id) => { if (!(await aimId(page, id))) return false; await wait(250); await xrFire(page, 'selectstart'); await wait(80); await xrFire(page, 'select'); await xrFire(page, 'selectend'); return true; };
/** a real mouse press at a control's projected point in the DOM window */
async function domPress(page, id) {
  const at = await page.evaluate((id) => {
    const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
    const px = core.centerOf(id); if (!px || !cv) return null;
    const r = cv.getBoundingClientRect(), s = core.lastSize;
    return { x: r.left + (px.x / s.w) * r.width, y: r.top + (px.y / s.h) * r.height };
  }, id);
  if (!at) return false;
  await page.mouse.move(at.x, at.y); await wait(120); await page.mouse.down(); await wait(80); await page.mouse.up();
  return true;
}
const coreOf = (xr) => (xr ? 'window.__siteViewer.xr.core' : 'window.__siteViewer.dom');
const info = (page, xr) => page.evaluate((x) => { const c = x ? window.__siteViewer.xr.core : window.__siteViewer.dom; return { ...c.info(), open: x ? window.__siteViewer.xr.isOpen : window.__siteViewer.bus.domOpen() }; }, xr);

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. THE RECEIPT PRINTS EVERY PRACTICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function receipt(xr) {
  const G = xr ? 'receipt/headset' : 'receipt/computer';
  const { page, errors } = await boot();
  const seeded = await seedLedger(page);
  check(G, 'the ledger is seeded through the app\'s own module (a guided walk\'s record)', seeded.n > 5, JSON.stringify(seeded));
  if (xr) await goXr(page);
  await page.evaluate(() => window.__siteViewer.bus.open('machine'));
  await wait(1500);
  let v = await info(page, xr);
  check(G, 'the machine\'s page is open', v.open && v.view === 'machine', `view=${v.view}`);
  // what the record says each year used (read through the app's own module), to compare with what is printed
  const expected = await page.evaluate(async () => {
    const { entriesByEra, practiceOf } = await import('/src/witness/record.ts');
    const by = entriesByEra(), out = {};
    for (const era of ['e1', 'e2', 'e3', 'e4']) {
      const kinds = []; for (const x of by[era]) if (!kinds.includes(x.kind)) kinds.push(x.kind);
      out[era] = kinds.map((k) => (practiceOf(k)?.title ?? k).toLowerCase());
    }
    return out;
  });
  console.log('expected practices:', Object.entries(expected).map(([k, a]) => `${k}=${a.length}`).join(' '));
  const press = async (id) => (xr ? xrPressId(page, id) : domPress(page, id));
  await press('m:receipt'); await wait(1500);
  v = await info(page, xr);
  check(G, 'a real press on Receipt opens the printout', v.view === 'receipt', `view=${v.view}`);
  // the printing, a line at a time
  const lineCount = () => page.evaluate((c) => { const r = eval(c).receipt; return Math.floor(r.t * 7); }, coreOf(xr)).catch(() => 0);
  const n0 = await lineCount(); await wait(1500); const n1 = await lineCount();
  check(G, 'the printer is printing a line at a time', n1 > n0, `${n0} → ${n1} lines`);
  await shotTo(page, `${xr ? 'xr' : 'desk'}-receipt-printing`);
  // wait for the whole thing
  const total = await page.evaluate((c) => eval(c).receipt.lines.length, coreOf(xr));
  await wait(Math.ceil(total / 7 * 1000) + 2500);
  const lines = await page.evaluate((c) => eval(c).receipt.lines.map((l) => l.t), coreOf(xr));
  // split into the four year blocks, then each block's "used:" text
  const text = lines.join('\n');
  const blocks = text.split(/\n(?=\d{4} ·)/).slice(0);
  console.log(`receipt: ${lines.length} lines`);
  const usedOf = (blk) => {
    const ls = blk.split('\n'); const i = ls.findIndex((l) => l.trim().startsWith('used:'));
    if (i < 0) return '';
    let s = ls[i].trim().slice(5);
    for (let k = i + 1; k < ls.length && /^\s{6,}\S/.test(ls[k]); k++) s += ' ' + ls[k].trim();
    return s;
  };
  const years = { e1: '1997', e2: '2003', e3: '2016', e4: '2026' };
  for (const era of ['e1', 'e2', 'e3', 'e4']) {
    const blk = blocks.find((b) => b.startsWith(years[era])) ?? '';
    const used = usedOf(blk);
    const missing = expected[era].filter((p) => !used.includes(p));
    check(G, `${years[era]}: all ${expected[era].length} practices the record holds are printed (none cut)`, missing.length === 0 && !/…/.test(used), missing.length ? `missing: ${missing.join(', ')}` : `${expected[era].length} printed`);
  }
  check(G, 'the closing line and "kept by: nobody" print at the end', /kept by: nobody/.test(lines[lines.length - 1]) && /none of them changed/.test(text));
  v = await info(page, xr);
  await wait(500);
  check(G, 'the receipt can be scrolled (its paper is longer than the window)', v.maxScroll > 0, `scroll ${v.scroll}/${v.maxScroll}`);
  // its end is on screen first (it follows the head), photograph
  await shotTo(page, `${xr ? 'xr' : 'desk'}-receipt-end`);
  // scroll to the head: wheel (computer) or the thumbstick (headset)
  if (xr) { await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, -1]; }); await wait(Math.ceil(v.maxScroll / 900 * 1000) + 1500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
  else {
    const at = await page.evaluate((c) => { const cv = document.querySelector('#reinterp-site-viewer canvas').getBoundingClientRect(); return { x: cv.left + cv.width / 2, y: cv.top + cv.height / 2 }; });
    await page.mouse.move(at.x, at.y);
    for (let k = 0; k < 40; k++) { await page.mouse.wheel({ deltaY: -400 }); await wait(40); }
  }
  await wait(600);
  v = await info(page, xr);
  check(G, 'scrolled back to the head of the receipt', v.scroll === 0, `scroll ${v.scroll}/${v.maxScroll}`);
  await shotTo(page, `${xr ? 'xr' : 'desk'}-receipt-top`);
  // down to the very end again and keep the way out
  if (xr) { await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 1]; }); await wait(Math.ceil(v.maxScroll / 900 * 1000) + 1500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
  else { for (let k = 0; k < 40; k++) { await page.mouse.wheel({ deltaY: 400 }); await wait(40); } }
  await wait(600);
  v = await info(page, xr);
  check(G, 'the end of the receipt is reachable', v.scroll === v.maxScroll && v.maxScroll > 0, `scroll ${v.scroll}/${v.maxScroll}`);
  await press('back'); await wait(900);
  v = await info(page, xr);
  check(G, 'Back (after the end of the receipt) returns to the machine\'s page', v.view === 'machine', `view=${v.view}`);
  await press('close'); await wait(900);
  v = await info(page, xr);
  check(G, 'Close closes the window', !v.open);
  check(G, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}


// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. THE SCROLL MARKER, GRABBED, IN THE EMULATED HEADSET
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function grab() {
  const G = 'grab/headset';
  const { page, errors } = await boot();
  await goXr(page);
  await page.evaluate(() => window.__siteViewer.bus.open('1997'));
  await wait(1800);
  // the core's own thumb / track / max (private fields: the same read serves the unchanged base build, for the BEFORE photographs)
  const sb = () => page.evaluate(() => { const c = window.__siteViewer.xr.core; return { thumb: { ...c.thumb }, track: { ...c.track }, max: c.maxScroll }; });
  const scrollNow = async () => (await info(page, true)).scroll;
  let v = await info(page, true);
  check(G, '1997\'s website is open in the headset window and is longer than the window', v.open && v.view === '1997' && v.maxScroll > 1000, `maxScroll ${v.maxScroll}`);
  const expectScroll = (b, y, dy) => { const span = b.track.h - b.thumb.h; const k = Math.max(0, Math.min(1, (y - dy - b.track.y) / span)); return Math.round(k * b.max); };
  const drag = async (fromY, toY, steps = 12) => { for (let i = 1; i <= steps; i++) { const x = fromY.x; await aimPx(page, x, fromY.y + (toY - fromY.y) * i / steps); await wait(90); } };

  // ── a. the trigger held on the thumb, the ray moved down and up ──
  let b = await sb();
  const tx = b.thumb.x + b.thumb.w / 2, ty0 = b.thumb.y + b.thumb.h / 2, dy0 = ty0 - b.thumb.y;
  await aimPx(page, tx, ty0); await wait(250);
  await xrFire(page, 'selectstart'); await wait(150);
  check(G, 'the trigger pulled with the ray on the thumb takes it (grabbing)', await page.evaluate(() => window.__siteViewer.xr.grabbing));
  await drag({ x: tx, y: ty0 }, ty0 + 160);
  let b1 = await sb(); const s1 = await scrollNow();
  check(G, 'the ray moved 160 px down: the thumb moved down with it', b1.thumb.y > b.thumb.y + 120 && b1.thumb.y < b.thumb.y + 200, `thumb ${b.thumb.y} → ${b1.thumb.y}`);
  check(G, 'the page followed, in proportion to the thumb', Math.abs(s1 - expectScroll(b, ty0 + 160, dy0)) <= 4 && s1 > 0, `scroll ${s1} (expected ≈ ${expectScroll(b, ty0 + 160, dy0)})`);
  await shotTo(page, 'xr-grab-mid-drag');
  await drag({ x: tx, y: ty0 + 160 }, ty0 + 60);
  const s2 = await scrollNow(); const b2 = await sb();
  check(G, 'pulled back up: the thumb and the page go back up with it', s2 < s1 && Math.abs(s2 - expectScroll(b, ty0 + 60, dy0)) <= 4, `scroll ${s1} → ${s2}`);
  // while still held, drag well past the bottom of the window: clamped at the end
  await drag({ x: tx, y: ty0 + 60 }, 2000, 6);
  const sEnd = await scrollNow(); const bEnd = await sb();
  check(G, 'dragged far below the window: the page stops at its end (clamped)', sEnd === bEnd.max, `scroll ${sEnd}/${bEnd.max}`);
  await drag({ x: tx, y: 2000 }, -2000, 6);
  const sTop = await scrollNow();
  check(G, 'dragged far above the window: the page stops at its head (clamped)', sTop === 0, `scroll ${sTop}`);
  // bring it back to the middle, then let go ON A LINK / TAB (the ray is over a tab at release)
  await drag({ x: tx, y: -2000 }, ty0 + 100, 4);
  const tabId = await page.evaluate(() => { const c = window.__siteViewer.xr.core; return ['tab:practices', 'tab:sources', 'tab:words'].find((i) => c.centerOf(i)) ?? null; });
  const tab0 = await page.evaluate(() => window.__siteViewer.xr.core.tab);
  const tabPx = await page.evaluate((id) => window.__siteViewer.xr.core.centerOf(id), tabId);
  await aimPx(page, tabPx.x, tabPx.y); await wait(200);   // the ray has travelled onto a tab
  const sBefore = await scrollNow();
  // the runtime's order is not fixed: select then selectend …
  await xrFire(page, 'select'); await xrFire(page, 'selectend'); await wait(400);
  v = await info(page, true);
  check(G, 'letting go over a tab presses nothing (select, then selectend)', v.tab === tab0 && v.open, `tab ${tab0} → ${v.tab}`);
  check(G, 'the grab is over after release', !(await page.evaluate(() => window.__siteViewer.xr.grabbing)));
  // … and selectend then select
  const tb = await sb();
  await aimPx(page, tb.thumb.x + tb.thumb.w / 2, tb.thumb.y + tb.thumb.h / 2); await wait(200);
  await xrFire(page, 'selectstart'); await wait(100);
  await drag({ x: tb.thumb.x + tb.thumb.w / 2, y: tb.thumb.y + tb.thumb.h / 2 }, tb.thumb.y + tb.thumb.h / 2 - 40, 4);
  await aimPx(page, tabPx.x, tabPx.y); await wait(200);
  await xrFire(page, 'selectend'); await xrFire(page, 'select'); await wait(400);
  v = await info(page, true);
  check(G, 'letting go over a tab presses nothing (selectend, then select)', v.tab === tab0 && v.open, `tab ${tab0} → ${v.tab}`);
  // control: the same press WITHOUT a grab still presses the tab (the rule is not eating presses)
  await aimPx(page, tabPx.x, tabPx.y); await wait(250);
  await xrFire(page, 'selectstart'); await wait(80); await xrFire(page, 'select'); await xrFire(page, 'selectend'); await wait(500);
  v = await info(page, true);
  check(G, 'control: a plain trigger press on the tab (no grab) still opens it', v.tab === tabId.slice(4), `tab ${tab0} → ${v.tab}`);
  // a trigger pulled on the page, NOT on the thumb, is not a grab
  const sB = await sb();
  await aimPx(page, 300, 400); await wait(200);
  await xrFire(page, 'selectstart'); await wait(60);
  check(G, 'a trigger pulled away from the thumb does not grab', !(await page.evaluate(() => window.__siteViewer.xr.grabbing)));
  await xrFire(page, 'select'); await xrFire(page, 'selectend'); await wait(300);

  // ── b. the thumbstick and the ▲ ▼ buttons are exactly as they were ──
  await page.evaluate(() => window.__siteViewer.xr.core.scrollTo(0)); await wait(300);
  await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 1]; }); await wait(1000);
  await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); await wait(300);
  const sStick = await scrollNow();
  check(G, 'the thumbstick still scrolls (fallback kept)', sStick > 400, `scroll ${sStick} after 1 s at full tilt`);
  await xrPressId(page, 'sc:down'); await wait(400);
  const sDown = await scrollNow();
  check(G, 'the ▼ button still scrolls by its 160 px', sDown - sStick === 160 || sDown - sStick > 100, `scroll ${sStick} → ${sDown}`);
  await xrPressId(page, 'sc:up'); await wait(400);
  check(G, 'the ▲ button still scrolls back', (await scrollNow()) < sDown);

  // ── c. a hand: the pinch closes on the thumb and carries it ──
  await xrPressId(page, 'tab:story'); await wait(500);
  await page.evaluate(() => window.__siteViewer.xr.core.scrollTo(0)); await wait(400);
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
    const joint = (get) => ({ getPosition: get, radius: 0.008 });
    window.__pinch = { open: true, sep: 0.06 };
    const thumbAt = new V(0.35, 0.95, -0.25);
    const hand = {
      tracking: true, fingers: [], joints: [],
      wrist: { getPosition: () => new V(0.4, 0.9, -0.1) },
      getJointById: (id) => id === 'thumb-tip' ? joint(() => thumbAt.clone())
        : id === 'index-finger-tip' ? joint(() => new V(thumbAt.x + window.__pinch.sep, thumbAt.y, thumbAt.z))
          : joint(() => new V(0.4, 0.9, -0.1))
    };
    const origin = head.getPosition().clone();
    const src = { targetRayMode: 'tracked-pointer', handedness: 'right', getOrigin: () => origin, getDirection: () => window.__handDir ?? head.forward.clone(), hand, gamepad: null, getPosition: () => thumbAt.clone() };
    window.__hand = src; app.xr.input.fire('add', src);
  });
  const aimHand = (x, y) => page.evaluate((x, y) => {
    const app = window.__app, head = app.root.findByName('camera');
    const plane = app.root.findByName('xr-frame-site');
    const wp = plane.getWorldTransform(), W = 1024, H = 768;
    const local = head.getPosition().clone().set(x / W - 0.5, 0, y / H - 0.5);
    const target = wp.transformPoint(local, local.clone());
    window.__handDir = target.clone().sub(head.getPosition()).normalize();
  }, x, y);
  const hb = await sb();
  const hx = hb.thumb.x + hb.thumb.w / 2, hy0 = hb.thumb.y + hb.thumb.h / 2;
  await aimHand(hx, hy0); await wait(400);
  await page.evaluate(() => { window.__pinch.sep = 0.01; }); await wait(300);
  check(G, 'a pinch closing with the hand\'s ray on the thumb takes it', await page.evaluate(() => window.__siteViewer.xr.grabbing));
  for (let i = 1; i <= 10; i++) { await aimHand(hx, hy0 + 14 * i); await wait(90); }
  const sh = await scrollNow();
  check(G, 'carried down by the pinch: the page follows', sh > 200, `scroll ${sh}`);
  await shotTo(page, 'xr-pinch-mid-drag');
  const tab1 = (await info(page, true)).tab;
  await aimHand(tabPx.x, tabPx.y); await wait(250);
  await page.evaluate(() => { window.__pinch.sep = 0.06; }); await wait(400);
  v = await info(page, true);
  check(G, 'opening the pinch over a tab presses nothing, and the grab is over', v.tab === tab1 && !(await page.evaluate(() => window.__siteViewer.xr.grabbing)), `tab ${tab1} → ${v.tab}`);
  check(G, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. A WAY OUT ON THE PHONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function phone() {
  for (const [orient, vp] of [['portrait', { width: 375, height: 812 }], ['landscape', { width: 812, height: 375 }]]) {
    const { page, errors } = await boot({ viewport: { ...vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true } });
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-site-viewer):not(script):not(#reinterp-site-chip) { visibility: hidden !important; }' });
    const G = `phone/${orient}`;
    /** the canvas's own box and a logical px → css px mapping (the window is one canvas) */
    const toCss = (id) => page.evaluate((id) => {
      const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
      const px = core.centerOf(id); if (!px || !cv) return null;
      const r = cv.getBoundingClientRect(), s = core.lastSize;
      const k = r.width / s.w;
      const hit = core.hitRect ? core.hitRect(id) : null;
      return { x: r.left + px.x * k, y: r.top + px.y * k, k, cv: { l: r.left, t: r.top, w: r.width, h: r.height }, vw: innerWidth, vh: innerHeight };
    }, id);
    const tap = async (id) => { const at = await toCss(id); if (!at) return false; await page.touchscreen.tap(at.x, at.y); return true; };
    /** a real swipe: finger down, moves, up (the DOM mount listens to pointer events) */
    const swipe = async (x, y0, y1, steps = 8) => {
      await page.touchscreen.touchStart(x, y0);
      for (let i = 1; i <= steps; i++) { await page.touchscreen.touchMove(x, y0 + (y1 - y0) * i / steps); await wait(16); }
      await page.touchscreen.touchEnd();
    };
    /** the document's own box in css px (from the core's viewport rect), so a swipe always starts on the page and never on the toolbar */
    const docBox = () => page.evaluate(() => {
      const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
      const r = cv.getBoundingClientRect(), k = r.width / core.lastSize.w, vp = core.info().vp;
      return { x: r.left + (vp.x + vp.w * 0.4) * k, top: r.top + (vp.y + vp.h * 0.12) * k, bot: r.top + (vp.y + vp.h * 0.88) * k };
    });
    const views = ['hub', '1997', '2003', '2016', '2026'];
    for (const view of (argv.includes('--no-sites') ? [] : views)) {
      await page.evaluate((t) => { window.__siteViewer.bus.close(); window.__siteViewer.bus.open(t); }, view);
      await wait(900);
      // the longest tab (read straight off the core; each is then reached by a real tap)
      const tabs = await page.evaluate(() => { const c = window.__siteViewer.dom; const ids = ['story', 'practices', 'sources', 'images', 'media', 'words', 'missed']; const out = []; const t0 = c.tab; for (const t of ids) { if (!c.centerOf(`tab:${t}`)) continue; c.setTab(t); out.push(t); } c.setTab(t0); return out; });
      let best = { tab: 'story', max: 0 };
      for (const t of tabs) {
        if (!(await tap(`tab:${t}`))) continue;
        await wait(350);
        const i = await page.evaluate(() => window.__siteViewer.dom.info());
        if (i.maxScroll > best.max) best = { tab: t, max: i.maxScroll };
      }
      if (tabs.length) { await tap(`tab:${best.tab}`); await wait(350); }
      const i0 = await page.evaluate(() => window.__siteViewer.dom.info());
      // swipe up (finger moves up) in the document until the bottom
      const cv = await toCss('close');
      check(G, `${view}: the window is on screen and Close is on screen at the top of the page`, !!cv && cv.x > 0 && cv.x < cv.vw && cv.y > 0 && cv.y < cv.vh, cv ? `close at ${Math.round(cv.x)},${Math.round(cv.y)} of ${cv.vw}×${cv.vh}` : 'no close hit');
      const sz = await page.evaluate((ids) => { const c = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas').getBoundingClientRect(), k = cv.width / c.lastSize.w; return ids.map((id) => { const h = c.hits.find((x) => x.id === id); return h ? [id, Math.round(h.w * k), Math.round(h.h * k)] : [id, 0, 0]; }); }, ['close', 'min']);
      check(G, `${view}: Close is a target a finger can hit (≥ 20 css px each way; landscape is the small one)`, sz[0][1] >= 20 && sz[0][2] >= 20, `close ${sz[0][1]}×${sz[0][2]} css px`);
      let swipes = 0, last = -1;
      while (swipes < 220) {
        const i = await page.evaluate(() => window.__siteViewer.dom.info());
        if (i.maxScroll === 0 || i.scroll >= i.maxScroll) break;
        const b = await docBox();
        await swipe(b.x, b.bot, b.top); await wait(60); swipes++;
        if (i.scroll === last) break; last = i.scroll;
      }
      const i1 = await page.evaluate(() => window.__siteViewer.dom.info());
      const deep = i1.maxScroll === 0 || i1.scroll >= i1.maxScroll - 2;
      check(G, `${view}${tabs.length ? ' / ' + best.tab : ''}: touch-scrolled to the bottom (${Math.round(i1.maxScroll / Math.max(1, i1.vp.h))} screens, ${swipes} swipes)`, deep, `scroll ${i1.scroll}/${i1.maxScroll}`);
      const closeAt = await toCss('close'), minAt = await toCss('min'), backAt = await toCss('back'), hubAt = await toCss('view:hub');
      const onScreen = (a) => !!a && a.x > 0 && a.x < a.vw && a.y > 0 && a.y < a.vh;
      check(G, `${view}: at the bottom, Close is still on screen`, onScreen(closeAt), closeAt ? `${Math.round(closeAt.x)},${Math.round(closeAt.y)}` : 'none');
      if (view === '1997' || (view === '2026' && orient === 'portrait')) await shotTo(page, `phone-${orient}-${view}-bottom`);
      if (view === 'hub') await shotTo(page, `phone-${orient}-hub-bottom`);
      // a real tap on Close closes the window
      await tap('close'); await wait(500);
      const open = await page.evaluate(() => window.__siteViewer.bus.domOpen());
      check(G, `${view}: a real tap on Close (deep in the page) closes the window`, !open);
    }
    // Back: the hub → a year (a real tap on its door) → Back returns to the hub, deep in the year's page
    await page.evaluate(() => { window.__siteViewer.bus.close(); window.__siteViewer.bus.open('hub'); }); await wait(700);
    const door = await page.evaluate(() => { const c = window.__siteViewer.dom; return c.firstDocHit('door'); });
    if (door) await tap(door);
    else await tap('view:1997');
    await wait(700);
    let st = await page.evaluate(() => ({ v: window.__siteViewer.dom.view, back: !!window.__siteViewer.dom.centerOf('back') }));
    check(G, 'hub → a year by a tap: the year opens', st.v !== 'hub', `view=${st.v} (Back published: ${st.back})`);
    // machine page → Receipt → bottom of the receipt → Back
    await page.evaluate(() => { window.__siteViewer.bus.close(); window.__siteViewer.bus.open('machine'); }); await wait(700);
    await seedLedger(page);
    // the receipt by the window's own toolbar tab (always on screen); the page's own Receipt button sits below the fold on a landscape phone
    await tap('view:receipt'); await wait(1200);
    check(G, 'machine page → the Receipt tab opens the printout', (await page.evaluate(() => window.__siteViewer.dom.view)) === 'receipt');
    const total = await page.evaluate(() => window.__siteViewer.dom.receipt.lines.length);
    await wait(Math.ceil(total / 7 * 1000) + 1500);
    let g = 0;
    while (g++ < 40) {
      const i = await page.evaluate(() => window.__siteViewer.dom.info());
      if (i.scroll <= 0) break;
      const b = await docBox();
      // the receipt follows its head while printing; scrolling UP from the end is what a visitor needs to read it
      await swipe(b.x, b.top, b.bot); await wait(60);
      const j = await page.evaluate(() => window.__siteViewer.dom.info());
      if (j.scroll <= 0) break;
    }
    const iR = await page.evaluate(() => window.__siteViewer.dom.info());
    check(G, 'receipt: touch-scrolled (finger down) to its head', iR.scroll === 0 || iR.maxScroll === 0, `scroll ${iR.scroll}/${iR.maxScroll}`);
    await shotTo(page, `phone-${orient}-receipt-head`);
    // Back, as the machine's page gives it: pushed by the page's own Receipt button (the toolbar's tabs replace the page, and have no Back)
    await tap('view:machine'); await wait(700);
    st = await page.evaluate(() => ({ v: window.__siteViewer.dom.view }));
    check(G, 'receipt: the toolbar\'s Restart tab (always on screen) returns to the machine\'s page', st.v === 'machine', `view=${st.v}`);
    // the page's own Receipt button is below the fold on a short phone: scroll the page to it with a real swipe, then tap it
    for (let g2 = 0; g2 < 12 && !(await (async () => { const a = await toCss('m:receipt'); return a && a.y > 0 && a.y < a.vh - 8 && a.y < a.cv.t + a.cv.h - 40; })()); g2++) { const b = await docBox(); await swipe(b.x, b.bot, b.top); await wait(100); }
    const rb = await toCss('m:receipt');
    check(G, 'machine page: its Receipt button can be scrolled into reach with a swipe', !!rb && rb.y < rb.vh);
    await tap('m:receipt'); await wait(900);
    const bAt = await toCss('back');
    check(G, 'receipt (opened from the page): Back is on screen', !!bAt && bAt.x > 0 && bAt.x < bAt.vw && bAt.y > 0 && bAt.y < bAt.vh, bAt ? `${Math.round(bAt.x)},${Math.round(bAt.y)}` : 'none');
    await tap('back'); await wait(600);
    st = await page.evaluate(() => ({ v: window.__siteViewer.dom.view }));
    check(G, 'receipt: a real tap on Back returns to the machine\'s page', st.v === 'machine', `view=${st.v}`);
    await tap('close'); await wait(500);
    check(G, 'machine page: a real tap on Close closes the window', !(await page.evaluate(() => window.__siteViewer.bus.domOpen())));
    check(G, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }
}
try {
  if (PARTS.includes('receipt')) { await receipt(false); await receipt(true); }
  if (PARTS.includes('grab')) await grab();
  if (PARTS.includes('phone')) await phone();
} finally {
  fs.writeFileSync(path.join(OUT, `report-${TAG}.json`), JSON.stringify({ port: PORT, tag: TAG, checks }, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
