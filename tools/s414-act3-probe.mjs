#!/usr/bin/env node
/**
 * ⚑ S414 (UiB job 33 Part C) — 2026's ACT III, PLAYED, PHOTOGRAPHED AND MEASURED: Shepherd Live™ (beats 9–10) through either
 * door, from beat 8's one answer to the hand-over to the stream.
 *
 *     node tools/s414-act3-probe.mjs --port 5531 --out <dir> [--modes computer,headset] [--doors vr,here] [--throttle 4]
 *                                     [--no-frames] [--stall]
 *
 * `?era=4` (the room settled), the debug jump to beat 8 (`e4Act2Answer`, Acts I and II laid in); from there every press is one
 * the visitor can make: her answer and the doors on the monitor's published rects (`__os.e4.pressBrowser`); in the VR door the
 * headset on the desk — on the computer a REAL mouse press at the visor plane's projected centre (the room's own pointer), in
 * the headset mock the device's one touch (`wear`, what the guide's offer and the frame's call do); the Yes on whichever surface
 * carries it (the monitor's rects, or the glass's `visorHits` pressed through the room's pointer on the computer). `--stall`
 * presses nothing at the doors, the headset or the Yes, to prove each wait's way out. Per mode and door it writes B09…B10 stills
 * (`<name>_<door>_desktop.png` / `_xr.png`) and report-<mode>-<door>.json:
 *   · seconds from beat 8's press to each moment;
 *   · THE PHOTO (26-18): the frame over the photo's alteration with the CPU throttled (×4 by default): fps, the worst
 *     half-second, texture uploads per frame and MB per frame;
 *   · draw calls every 250 ms through the act (worst, and where), and in the headset a yaw/pitch sweep at the session and the
 *     photo; the headset on the desk projected from the seat at several pitches (in frame?);
 *   · the clips heard (the 2003 theme, Shepherd's lines, the cut, L's stutter) with their real lengths;
 *   · the end: her words restored, the stream begun (the ball's phase), console errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s414-act3'));
const MODES = flag('modes', 'computer,headset').split(',');
const DOORS = flag('doors', 'vr,here').split(',');
const THROTTLE = Number(flag('throttle', 4));
const FRAMES = !has('no-frames');
const STALL = has('stall');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };

const INSTRUMENTS = () => {
  const app = window.__app, gl = app.graphicsDevice.gl;
  const S = window.__fr = { rec: false, f: [], last: 0, up: 0, bytes: 0, draws: [], sample: null, what: {} };
  for (const n of ['texImage2D', 'texSubImage2D']) {
    const o = gl[n].bind(gl);
    gl[n] = (...a) => { if (S.rec) { S.up++; const src = a[a.length - 1]; if (src && src.width) { S.bytes += src.width * src.height * 4; const k = `${src.width}x${src.height}`; S.what[k] = (S.what[k] ?? 0) + 1; } } return o(...a); };
  }
  let t0 = 0;
  app.on('frameupdate', () => { const now = performance.now(); t0 = now; if (S.rec) S.cur = { gap: S.last ? now - S.last : 0 }; S.last = now; });
  app.on('frameend', () => { if (S.rec && S.cur) { S.cur.work = performance.now() - t0; S.cur.up = S.up; S.cur.mb = S.bytes / 1048576; S.cur.draws = window.__drawCalls ?? 0; S.f.push(S.cur); } S.up = 0; S.bytes = 0; S.cur = null; });
  S.sample = setInterval(() => { const b = window.__os?.e4?.browser; S.draws.push({ d: window.__drawCalls ?? 0, beat: b?.acts?.beat ?? '', t: +(b?.acts?.t ?? 0).toFixed(1), stage: window.__os?.e4?.stage ?? '' }); }, 250);
};
const measure = async (page, cdp, seconds) => {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await page.evaluate(() => { window.__fr.f = []; window.__fr.what = {}; window.__fr.rec = true; });
  await wait(seconds * 1000);
  const f = await page.evaluate(() => { window.__fr.rec = false; return window.__fr.f.slice(1); });
  const what = await page.evaluate(() => window.__fr.what);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const span = f.reduce((a, x) => a + x.gap, 0);
  let worst = Infinity, acc = 0, i0 = 0;
  for (let i = 0; i < f.length; i++) { acc += f[i].gap; while (i0 < i && acc - f[i0].gap >= 500) { acc -= f[i0].gap; i0++; } if (acc >= 500) worst = Math.min(worst, (i - i0 + 1) * 1000 / acc); }
  const avg = (k) => +(f.reduce((a, x) => a + x[k], 0) / Math.max(1, f.length)).toFixed(2);
  return { throttle: THROTTLE, frames: f.length, fps: +(1000 * f.length / Math.max(1, span)).toFixed(1), worstHalfSecondFps: Number.isFinite(worst) ? +worst.toFixed(1) : null,
    workMs: avg('work'), maxWorkMs: +Math.max(0, ...f.map((x) => x.work)).toFixed(1), uploadsPerFrame: avg('up'), mbPerFrame: avg('mb'), maxDraws: Math.max(0, ...f.map((x) => x.draws)),
    uploadsBySize: what };
};
/** a point on a plane in the room, by its logical canvas coordinates, projected to the page (or null) */
const PROJECT = (name, lx, ly, LW, LH) => {
  const root = window.__app.root; let cam = null; root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
  const e = root.findByName(name); if (!e || !e.enabled || !cam) return null;
  const m = e.getWorldTransform().data, u = lx / LW - 0.5, v = ly / LH - 0.5;
  const V = root.getPosition().constructor;
  const p = cam.camera.worldToScreen(new V(m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]));
  return p.z > 0 ? [p.x, p.y] : null;
};

const all = {};
for (const mode of MODES) for (const door of DOORS) {
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.evaluateOnNewDocument(() => {
    const O = window.Audio; window.__heard = [];
    window.Audio = function (src) { const a = new O(src); const rec = { src: String(src).split('/').pop(), at: performance.now(), dur: null, ended: false, paused: null }; window.__heard.push(rec);
      a.addEventListener('loadedmetadata', () => { rec.dur = a.duration; }); a.addEventListener('ended', () => { rec.ended = true; rec.endAt = performance.now(); });
      a.addEventListener('pause', () => { if (!a.ended) rec.paused = +a.currentTime.toFixed(2); }); return a; };
    window.Audio.prototype = O.prototype;
  });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  const cdp = await page.target().createCDPSession();
  await page.evaluate(INSTRUMENTS);
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
  const sfx = `${door}_${mode === 'computer' ? 'desktop' : 'xr'}`;
  const rep = { mode, door, stall: STALL, beats: {}, moments: {}, frames: null, headsetFromSeat: null, draws: null, sweep: {}, heard: [], end: null, errors };
  let T0 = Date.now();
  const state = () => page.evaluate(() => {
    const o = window.__os, b = o.e4.browser, a = b.acts, s = a.screen, sh = a.shepherd;
    return { beat: a.beat, t: +a.t.toFixed(1), chips: s.chips.map((c) => c.id), hits: b.hits.map((h) => h.id), visor: o.e4.visorHits.map((h) => h.id),
      stage: o.e4.stage, ready: o.e4.deviceReady, offered: b.headsetOffered, on: sh.on, door: sh.door, intro: sh.intro, line: sh.line, photos: sh.photos,
      becoming: sh.becoming, notes: sh.notes.length, booked: sh.booked, junie: !!sh.junie, tiles: sh.tiles, settings: sh.settings, securing: sh.securing,
      ask: sh.ask, broken: sh.broken, dark: sh.dark, page: s.page?.kind ?? null, aiW: s.aiWidth, name: s.name, last: s.rows.slice(-3).map((r) => `${r.who}:${r.text}`),
      felt: a.feltNow, done: a.done, ball: o.e4.ball.phaseId, programDone: b.programDone };
  });
  const until = async (pred, ms = 120000, name = '') => {
    const s0 = Date.now();
    while (Date.now() - s0 < ms) { const st = await state(); if (pred(st)) return st; await wait(200); }
    console.log(`  ⚠ ${mode}/${door}: ${name} never came`); rep.moments[`missed:${name}`] = true; return null;
  };
  const press = async (id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
  /** a real press on the page (the room's own pointer) */
  const click = async (pt) => { await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await wait(70); await page.mouse.up(); };
  const shot = async (name) => {
    await wait(300);
    await page.screenshot({ path: path.join(OUT, `${name}_${sfx}.png`) });
    const st = await state();
    rep.moments[name] = { at: +((Date.now() - T0) / 1000).toFixed(1), beat: st.beat, stage: st.stage, line: st.line, becoming: st.becoming, draws: await page.evaluate(() => window.__drawCalls ?? null) };
    console.log(`${mode}/${door} ${name} · ${st.beat} · ${st.stage} · draws ${rep.moments[name].draws} · ${st.line || st.last.slice(-1)[0] || ''}`);
  };
  const mark = (b) => { rep.beats[b] = +((Date.now() - T0) / 1000).toFixed(1); };
  const sweep = async (name) => {
    if (mode !== 'headset') return;
    const out = [];
    for (const yaw of [-60, -30, 0, 30, 60, 90, 135, 180, -135, -90]) for (const pitch of [-30, 0, 20]) {
      await page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), yaw, pitch);
      await wait(160);
      out.push({ yaw, pitch, d: await page.evaluate(() => window.__drawCalls ?? 0) });
    }
    await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
    const worst = out.reduce((a, x) => (x.d > a.d ? x : a), out[0]);
    rep.sweep[name] = { worst, all: out };
    console.log(`  sweep ${name}: worst ${worst.d} at yaw ${worst.yaw} pitch ${worst.pitch}`);
  };

  // ── beat 8's one answer (Acts I and II laid in) ──
  await page.evaluate(() => window.__os.debugJump('e4Act2Answer'));
  await until((s) => s.hits.includes('a2-answer'), 90000, 'answer');
  await press('a2-answer');
  T0 = Date.now();
  // ── beat 9 · the doors ──
  await until((s) => s.chips.includes('a3-vr'), 90000, 'doors'); mark('9-doors');
  await wait(400); await shot('B09a-doors');
  // the frame at rest before the session (the doors waiting): what the era uploads anyway, to read the photo's numbers against
  if (FRAMES && !STALL) { rep.baseline = await measure(page, cdp, 4); console.log(`  frames at rest, the doors (×${THROTTLE}): ${JSON.stringify(rep.baseline)}`); }
  if (!STALL) await press(door === 'vr' ? 'a3-vr' : 'a3-here');
  mark('9-pressed');
  if (door === 'vr' && !STALL) {
    await until((s) => s.ready, 20000, 'headset lit'); mark('9-headset-lit');
    // the headset on the desk, from the seat (computer: at several pitches; in frame?)
    if (mode === 'computer') {
      const rows = [];
      for (const pitch of [-8, -3, -14]) {
        await page.evaluate((p) => window.__camFree(4.6, 1.16, 0.70, p, 270), pitch);
        await wait(300);
        rows.push({ pitch, visor: await page.evaluate(PROJECT, 'era4-visor', 256, 192, 512, 384), monitorBottomRight: await page.evaluate(PROJECT, 'era3-device-monitor', 700, 380, 710, 384) });
      }
      await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270));
      await wait(300);
      rep.headsetFromSeat = rows;
      console.log('  headset from the seat:', JSON.stringify(rows));
    }
    await shot('B09b-headset-lit');
    if (mode === 'computer') {
      const pt = await page.evaluate(PROJECT, 'era4-visor', 256, 192, 512, 384);
      if (pt) await click(pt); else await page.evaluate(() => window.__os.e4.wear());
    } else await page.evaluate(() => window.__os.e4.wear());
    mark('9-headset-pressed');
  }
  await until((s) => s.on, 60000, 'session'); mark('9-session');
  await wait(1600); await shot('B09c-title');
  await until((s) => s.line.startsWith('Hello'), 30000, 'hello'); mark('9-hello');
  await wait(1200); await shot('B09d-host');
  await sweep('session');
  await until((s) => s.photos === 1, 60000, 'photos'); mark('9-photos');
  await wait(1700); await shot('B09e-photos');
  await until((s) => s.photos === 2, 20000, 'taken'); mark('9-photo');
  if (FRAMES) {
    await wait(500);
    rep.frames = await measure(page, cdp, 9);
    console.log(`  frames at the photo (×${THROTTLE}): ${JSON.stringify(rep.frames)}`);
    await shot('26-18_after');
  }
  await until((s) => s.notes >= 2, 30000, 'notes'); await wait(600); await shot('B09f-notes');
  await sweep('photo');
  await until((s) => s.booked && s.becoming >= 99, 40000, 'booked'); mark('9-booked');
  await wait(900); await shot('B09');
  // ── beat 10 · the friends ──
  await until((s) => s.junie, 30000, 'junie'); mark('10-junie');
  await wait(900); await shot('B10a-junie');
  await until((s) => s.tiles >= 2, 30000, 'tiles'); mark('10-signins');
  await wait(400); await shot('B10b-signins');
  await until((s) => s.settings, 30000, 'settings'); await wait(900); await shot('B10c-settings');
  await until((s) => s.securing, 30000, 'securing'); await wait(400); await shot('B10d-securing');
  await until((s) => s.ask, 40000, 'ask'); mark('10-ask');
  await wait(1400); await shot('B10e-yes');
  if (!STALL) {
    if (door === 'vr') {
      const at = await page.evaluate(() => window.__os.e4.visorHits.find((h) => h.id === 'a3-yes') ?? null);
      const pt = at && mode === 'computer' ? await page.evaluate(PROJECT, 'era4-visor', at.x + at.w / 2, at.y + at.h / 2, 512, 384) : null;
      if (pt) await click(pt);
      else if (at) await page.evaluate((h) => window.__os.e4.handleClick(h.x + h.w / 2, h.y + h.h / 2), at);
      rep.yesOn = pt ? 'the glass, through the room\'s pointer' : 'the glass (handleClick)';
    } else { await press('a3-yes'); rep.yesOn = 'the monitor'; }
  }
  mark('10-yes');
  await until((s) => s.broken, 60000, 'break'); await wait(250); await shot('B10f-break');
  await until((s) => !s.on, 20000, 'session gone'); mark('10-gone');
  await wait(700); await shot('B10g-back');
  await until((s) => s.last.some((l) => l.includes('unavailable')), 20000, 'stutter'); mark('10-stutter');
  await wait(800); await shot('B10h-stutter');
  await until((s) => s.page === 'junie', 30000, 'junie thread'); mark('10-thread');
  await wait(2600); await shot('B10i-sent');
  await until((s) => s.done, 40000, 'acts done'); mark('10-done');
  await shot('B10');
  await until((s) => s.ball === 'stream', 20000, 'stream'); mark('stream');
  await wait(3500); await shot('B11-handover');
  rep.end = await page.evaluate(() => { const o = window.__os, b = o.e4.browser, s = b.acts.screen;
    return { stage: o.e4.stage, ball: o.e4.ball.phaseId, programDone: b.programDone, rows: s.rows.filter((r) => r.who === 'her' || r.who === 'unsent').map((r) => `${r.who}:${r.text}`),
      orig: s.originalStage, ledger: window.__ledger().e4Space.filter((e) => e.id.startsWith('a3:') || e.id === 'commons').map((e) => `${e.id}: ${e.witness}`) }; });
  rep.heard = await page.evaluate(() => window.__heard.filter((h) => /^l_b9|^l_b10|restorify_media_theme|set_down|static_2026|card_junie|wear_2026/.test(h.src)).map((h) => ({ src: h.src, dur: h.dur ? +h.dur.toFixed(2) : null, ended: h.ended, paused: h.paused })));
  const d = await page.evaluate(() => { clearInterval(window.__fr.sample); return window.__fr.draws; });
  const worst = d.reduce((a, x) => (x.d > a.d ? x : a), d[0] ?? { d: 0 });
  rep.draws = { samples: d.length, worst, byBeat: Object.fromEntries([...new Set(d.map((x) => x.beat))].map((b) => [b, Math.max(...d.filter((x) => x.beat === b).map((x) => x.d))])) };
  console.log(`${mode}/${door}: beats ${JSON.stringify(rep.beats)}`);
  console.log(`  draws: worst ${worst.d} (${worst.beat}, ${worst.stage}) · by beat ${JSON.stringify(rep.draws.byBeat)}`);
  console.log(`  heard: ${rep.heard.map((h) => `${h.src} ${h.dur}${h.paused !== null ? ` (stopped at ${h.paused})` : ''}`).join(', ')}`);
  console.log(`  end: ${JSON.stringify(rep.end)} · errors ${errors.length} ${errors.slice(0, 3).join(' | ')}`);
  fs.writeFileSync(path.join(OUT, `report-${mode}-${door}.json`), JSON.stringify(rep, null, 1));
  all[`${mode}-${door}`] = rep;
  await page.close();
}
await browser.close();
const bad = Object.values(all).some((r) => r.errors.length || (r.draws?.worst?.d ?? 0) > 75 || Object.values(r.sweep).some((s) => s.worst.d > 75) || Object.keys(r.moments).some((k) => k.startsWith('missed:')));
process.exit(bad ? 1 : 0);
