#!/usr/bin/env node
/**
 * ⚑ S412 (UiB job 33 Part A) — 2026's ACT I, PLAYED AND PHOTOGRAPHED: the one screen, L's four beats, and the doors the walk
 * leaves alone (Mum's course on the Lamby set beside the screen, the original ✦, a story and its back arrow).
 *
 *     node tools/s412-act1-probe.mjs --port 5501 --out <dir> [--modes computer,headset] [--hedge] [--seam]
 *
 * `?era=4` (the room settled), then the screen woken with its own press ("Press to wake the screen"); from there every press
 * is one the visitor can make, on the monitor's published rects (`__os.e4.pressBrowser`), and the Lamby set's body is pressed
 * through the room's own pointer (a real mouse press at its projected point, computer only). Per mode it writes
 *   B01_<mode>.png … B04_<mode>.png (and their moments: B01a the reading, B02b the ✦ turned, B03b the set beside the screen,
 *   B04b a story), a report (report-<mode>.json): seconds from the wake to each beat, the set's place against the monitor's
 *   (beside it? overlapping it?), the seat before and after the set is put back (26-5), the clips heard with their real
 *   lengths against the data's `seconds`, draw calls, and console errors.
 * Headset: the seated mock of tools/s404-crt-probe.mjs (xr.active forced, the head at the rig, a 90° view).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s412-act1'));
const MODES = flag('modes', 'computer,headset').split(',');
const HEDGE = argv.includes('--hedge');
const SEAM = argv.includes('--seam');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };

for (const mode of MODES) {
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.evaluateOnNewDocument(() => {
    const O = window.Audio; window.__heard = [];
    window.Audio = function (src) { const a = new O(src); const rec = { src: String(src).split('/').pop(), at: performance.now(), dur: null, ended: false }; window.__heard.push(rec);
      a.addEventListener('loadedmetadata', () => { rec.dur = a.duration; }); a.addEventListener('ended', () => { rec.ended = true; rec.endAt = performance.now(); }); return a; };
    window.Audio.prototype = O.prototype;
  });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  if (mode === 'headset') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await wait(2500);
  } else {
    await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270));
    await wait(1500);
  }
  const rep = { mode, beats: {}, moments: {}, tv: null, seat: null, heard: [], drawCalls: {}, errors };
  let T0 = Date.now();
  const state = () => page.evaluate(() => { const b = window.__os.e4.browser, a = b.acts; return { phase: b.phase, step: b.storyStep, beat: a.beat, t: a.t, path: a.path,
    page: a.screen.page?.kind ?? null, sub: a.screen.page?.who ?? a.screen.page?.mail ?? a.screen.page?.stage ?? null, hits: b.hits.map((h) => h.id), orig: a.screen.originalOpen,
    rows: a.screen.rows.length, chips: a.screen.chips.map((c) => c.id), done: a.done }; });
  const until = async (pred, ms = 120000, name = '') => {
    const s0 = Date.now();
    while (Date.now() - s0 < ms) { const st = await state(); if (pred(st)) return st; await wait(250); }
    console.log(`  ⚠ ${mode}: ${name} never came`); rep.moments[`missed:${name}`] = true; return null;
  };
  const press = async (id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
  const shot = async (name) => {
    await wait(350);
    await page.screenshot({ path: path.join(OUT, `${name}_${mode === 'computer' ? 'desktop' : 'xr'}.png`) });
    const st = await state();
    rep.moments[name] = { at: +((Date.now() - T0) / 1000).toFixed(1), actsT: +st.t.toFixed(1), beat: st.beat, page: st.page, sub: st.sub };
    rep.drawCalls[name] = await page.evaluate(() => window.__drawCalls ?? null);
    console.log(`${mode} ${name} · ${st.beat} · ${st.page}/${st.sub} · draws ${rep.drawCalls[name]}`);
  };
  // ── the wake ──
  await until((s) => s.phase === 'saver', 30000, 'saver');
  await shot('B00');
  T0 = Date.now();
  await press('saver-wake');
  const mark = async (b) => { rep.beats[b] = +((Date.now() - T0) / 1000).toFixed(1); };
  await mark('1-week');
  await wait(3800); await shot('B01a');
  await until((s) => s.chips.includes('l-catchup'), 60000, 'catchup'); await shot('B01');
  await press('l-catchup');
  // ── beat 2 ──
  await until((s) => s.beat === 'messages', 30000, 'messages'); await mark('2-messages');
  await until((s) => s.page === 'thread' && s.sub === 'lot', 60000, 'lot thread'); await wait(1500); await shot('B02a');
  await until((s) => s.hits.includes('orig:dad'), 90000, 'dad ✦'); await wait(2500); await shot('B02');
  await press('orig:dad');
  await until((s) => !!s.orig, 5000, 'original'); await wait(1200); await shot('B02b');
  await wait(4000);
  await press('orig-back:dad');
  // ── beat 3 ──
  await until((s) => s.beat === 'mail', 60000, 'mail'); await mark('3-mail');
  await until((s) => s.page === 'mail' && s.sub === 'clinic', 30000, 'clinic'); await wait(1200); await shot('B03a');
  await until((s) => s.page === 'mail' && s.sub === 'meridian', 60000, 'meridian'); await wait(1200); await shot('B03m');
  await until((s) => s.hits.includes('hedge-link'), 60000, 'Mum'); await wait(1200); await shot('B03');
  if (HEDGE) {
    const seatBefore = await page.evaluate(() => window.__camPose());
    await press('hedge-link');
    await page.waitForFunction(() => { const d = window.__teachingTv?.(); return d?.tvs?.find((t) => t.tape === '2026')?.pose === 'held'; }, { timeout: 20000 }).catch(() => {});
    await wait(2500);
    await shot('B03b');
    rep.tv = await page.evaluate(() => {
      const app = window.__app, cam = app.root.findByName('camera');
      const V = app.root.getPosition().constructor;
      const sc = (p) => { const s = cam.camera.worldToScreen(p); return [Math.round(s.x), Math.round(s.y)]; };
      const mon = app.root.findByName('era3-device-monitor'), wt = mon.getWorldTransform();
      const corner = (x, z) => { const o = new V(); wt.transformPoint(new V(x, 0, z), o); return sc(o); };
      const m = [corner(-0.5, -0.5), corner(0.5, -0.5), corner(0.5, 0.5), corner(-0.5, 0.5)];
      const d = window.__teachingTv(); const t = d.tvs.find((x) => x.tape === '2026');
      const glass = app.root.findByName('teaching-tv-2026'); const gw = glass.getWorldTransform();
      const g = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, z]) => { const o = new V(); gw.transformPoint(new V(x, 0, z), o); return sc(o); });
      const box = (pts) => ({ x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) });
      const M = box(m), G = box(g);
      const overlap = Math.max(0, Math.min(M.x1, G.x1) - Math.max(M.x0, G.x0)) * Math.max(0, Math.min(M.y1, G.y1) - Math.max(M.y0, G.y0));
      const W = app.graphicsDevice.canvas.clientWidth, H = app.graphicsDevice.canvas.clientHeight;
      return { pose: t.pose, beside: t.beside, state: t.state, heldScale: +t.heldScale.toFixed(3), heldDist: +t.heldDist.toFixed(3), monitor: M, glass: G,
        overlapPx: Math.round(overlap), glassInView: G.x0 >= 0 && G.x1 <= W && G.y0 >= 0 && G.y1 <= H, view: [W, H] };
    });
    console.log(`  set: ${JSON.stringify(rep.tv)}`);
    if (mode === 'headset') {
      // the head turned to the side, where the set stands (the mock's 90° view does not hold the monitor and the set at once)
      await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(-6, -34, 0));
      await wait(900); await shot('B03b-turned');
      await wait(5000); await shot('B03c-turned');
      await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
    }
    await wait(6000); await shot('B03c');
    if (mode === 'computer') {
      // set it down with a real press on its body, through the room's pointer (26-5: nothing else may move or open)
      const at = await page.evaluate(() => {
        const app = window.__app, cam = app.root.findByName('camera');
        const set = app.root.findByName('teaching-tv-2026'); const p = set.getPosition().clone(); p.y -= 0.02;
        const s = cam.camera.worldToScreen(p); return [Math.round(s.x), Math.round(s.y)];
      });
      // the body under the glass: aim at the deck strip (below the glass)
      const body = await page.evaluate(() => window.__teachingTv().tvs.find((x) => x.tape === '2026').targets);
      const app2 = await page.evaluate((b) => {
        const app = window.__app, cam = app.root.findByName('camera'); const V = app.root.getPosition().constructor;
        const s = cam.camera.worldToScreen(new V(...b.body)); return [Math.round(s.x), Math.round(s.y)];
      }, body);
      const pt = app2 ?? at;
      await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await wait(70); await page.mouse.up();
      await wait(2500);
      const seatAfter = await page.evaluate(() => window.__camPose());
      const after = await page.evaluate(() => { const t = window.__teachingTv().tvs.find((x) => x.tape === '2026'); return { pose: t.pose, lastPress: t.lastPress }; });
      const st = await state();
      rep.seat = { before: seatBefore, after: seatAfter, moved: Math.hypot(seatAfter.x - seatBefore.x, seatAfter.z - seatBefore.z) > 0.01, set: after, page: st.page, sub: st.sub, pressedAt: pt };
      console.log(`  set down: ${JSON.stringify(rep.seat).slice(0, 300)}`);
    } else {
      await page.evaluate(() => window.__teachingTv.putBack('2026'));
    }
  }
  await until((s) => s.chips.includes('l-finish'), 200000, 'finish'); await shot('B03d');
  await press('l-finish');
  // ── beat 4 ──
  await until((s) => s.beat === 'search', 30000, 'search'); await mark('4-search');
  await until((s) => s.page === 'search' && s.sub === 'completing', 30000, 'completions'); await wait(3500); await shot('B04a');
  await until((s) => s.hits.includes('st-add'), 60000, 'yellow card'); await mark('4-card'); await wait(800); await shot('B04');
  await press('story-1'); await wait(1500); await shot('B04b');
  await press('page-back'); await wait(800);
  await press('story-0'); await wait(1500); await shot('B04c');
  await press('page-back'); await wait(600);
  if (SEAM) {
    await press('st-add'); await mark('seam');
    // ⚑ S413 — the seam leads into Act II on the same screen (Second Thoughts adds itself: its page on the right)
    await page.waitForFunction(() => window.__os.e4.browser.acts.screen.page?.kind === 'added', { timeout: 20000 }).catch(() => {});
    await wait(5000); await shot('B05seam');
  }
  rep.heard = await page.evaluate(() => window.__heard.filter((h) => /^l_/.test(h.src)).map((h) => ({ src: h.src, dur: h.dur, ended: h.ended, ms: h.endAt ? Math.round(h.endAt - h.at) : null })));
  fs.writeFileSync(path.join(OUT, `report-${mode}.json`), JSON.stringify(rep, null, 1));
  console.log(`${mode}: beats ${JSON.stringify(rep.beats)} · heard ${rep.heard.map((h) => `${h.src} ${h.dur?.toFixed?.(2)}`).join(', ')} · errors ${errors.length}`);
  await page.close();
}
await browser.close();
