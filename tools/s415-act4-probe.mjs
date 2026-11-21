#!/usr/bin/env node
/**
 * ⚑ S415 (UiB job 33 Part D) — 2026's ACT IV, PLAYED, PHOTOGRAPHED AND MEASURED: the stream, the shutdown, the end (beats
 * 11–13) and the move into the Close, through either door of beat 9.
 *
 *     node tools/s415-act4-probe.mjs --port 5541 --out <dir> [--modes computer,headset] [--doors vr,here] [--no-frames]
 *                                     [--stall] [--reduced]
 *
 * `?era=4` (the room settled), the debug jump to beat 10 in the door (`e4Act3FriendsVR` / `e4Act3Friends`: Acts I–II laid in,
 * the session running); from there every press is one the visitor can make: the Yes (the glass's rect through the room's
 * pointer, or the monitor's), dance or stay on the monitor's published rects (`__os.e4.pressBrowser`). `--stall` presses
 * nothing in the stream (the chat's own cap); `--reduced` sets the OS's reduced motion (the glitch's cut).
 * Per mode and door it writes the beats' stills (`B11…_<door>_desktop.png` / `_xr.png`) and report-<mode>-<door>.json:
 *   · seconds from the Yes to each moment, and the acts' beat log;
 *   · draw calls every 250 ms from the Yes to the Close's first card (worst, and where);
 *   · the stream's cost: texture uploads per second and MB per second while it plays;
 *   · beat 12's flash rate: the monitor's mean luminance and the room light's level sampled every frame through the shutdown,
 *     counted as changes per second and as luminance reversals over 10% in any one second;
 *   · the turn into the Close: on a screen the camera's yaw per second (≤ 9.1 °/s at the crest); in a headset, one cut;
 *   · the clips heard, console errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s415-act4'));
const MODES = flag('modes', 'computer,headset').split(',');
const DOORS = flag('doors', 'vr,here').split(',');
const STALL = has('stall'), REDUCED = has('reduced'), FRAMES = !has('no-frames');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };

const INSTRUMENTS = () => {
  const app = window.__app, gl = app.graphicsDevice.gl;
  const S = window.__fr = { up: 0, bytes: 0, draws: [], lum: [], rec: false, sample: null };
  for (const n of ['texImage2D', 'texSubImage2D']) {
    const o = gl[n].bind(gl);
    gl[n] = (...a) => { const src = a[a.length - 1]; if (src && src.width) { S.up++; S.bytes += src.width * src.height * 4; } return o(...a); };
  }
  // the monitor's mean luminance and the room light, every frame (for beat 12's flash rate)
  const probe = document.createElement('canvas'); probe.width = 32; probe.height = 18; const pc2 = probe.getContext('2d', { willReadFrequently: true });
  app.on('frameend', () => {
    if (!S.rec) return;
    const mon = window.__era3Devices?.()?.monitor;
    let lum = null;
    if (mon) { pc2.drawImage(mon, 0, 0, 32, 18); const d = pc2.getImageData(0, 0, 32, 18).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; lum = s / (d.length / 4) / 255; }
    const g = app.root.findByName('light-mayaGlow')?.light;
    S.lum.push({ t: performance.now(), lum, glow: g ? +g.intensity.toFixed(3) : null, beat: window.__os?.e4?.browser?.acts?.beat ?? '' });
  });
  S.sample = setInterval(() => { const b = window.__os?.e4?.browser; S.draws.push({ d: window.__drawCalls ?? 0, beat: b?.acts?.beat ?? '', close: window.__closeLog?.slice(-1)[0]?.stage ?? '', t: performance.now() }); }, 250);
};
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
  await page.evaluateOnNewDocument((reduced) => {
    const O = window.Audio; window.__heard = [];
    window.Audio = function (src) { const a = new O(src); const rec = { src: String(src).split('/').pop(), at: performance.now(), dur: null, ended: false }; window.__heard.push(rec);
      a.addEventListener('loadedmetadata', () => { rec.dur = a.duration; }); a.addEventListener('ended', () => { rec.ended = true; }); return a; };
    window.Audio.prototype = O.prototype;
    if (reduced) { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/reduce/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q)); }
  }, REDUCED);
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
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
  } else { await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270)); await wait(1500); }
  const sfx = `${door}_${mode === 'computer' ? 'desktop' : 'xr'}`;
  const rep = { mode, door, stall: STALL, reduced: REDUCED, moments: {}, beats: null, draws: null, stream: null, flash: null, turn: null, heard: [], errors };
  let T0 = Date.now();
  const state = () => page.evaluate(() => {
    const o = window.__os, b = o.e4.browser, a = b.acts, st = a.stream, sh = a.shepherd;
    return { beat: a.beat, done: a.done, stage: o.e4.stage, ask: sh.ask, on: st.on, grow: st.grow, chat: st.chat.length, asking: st.asking, band: st.band,
      terminated: st.terminated, glitch: st.glitch, dark: st.dark, junie: st.junie, lWords: st.lWords, title: st.title, hits: b.hits.map((h) => h.id),
      visor: o.e4.visorHits.map((h) => h.id), close: window.__closeLog?.slice(-1)[0]?.stage ?? null, card: window.__closeCard?.on ? window.__closeCard.i : -1,
      headsetModel: window.__app.root.findByName('e_headset')?.enabled ?? null, pose: window.__camPose ? window.__camPose() : null };
  });
  const until = async (pred, ms = 120000, name = '') => {
    const s0 = Date.now();
    while (Date.now() - s0 < ms) { const st = await state(); if (pred(st)) return st; await wait(150); }
    console.log(`  ⚠ ${mode}/${door}: ${name} never came`); rep.moments[`missed:${name}`] = true; return null;
  };
  const press = async (id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
  const click = async (pt) => { await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await wait(70); await page.mouse.up(); };
  const shot = async (name, always = false) => {
    if (!FRAMES && !always) return;
    await wait(250);
    await page.screenshot({ path: path.join(OUT, `${name}_${sfx}.png`) });
    const st = await state();
    rep.moments[name] = { at: +((Date.now() - T0) / 1000).toFixed(1), beat: st.beat, close: st.close, draws: await page.evaluate(() => window.__drawCalls ?? null) };
    console.log(`${mode}/${door} ${name} · ${st.beat} · ${st.close ?? ''} · draws ${rep.moments[name].draws}`);
  };
  const mark = (b) => { rep.moments[b] = { at: +((Date.now() - T0) / 1000).toFixed(1) }; };

  // ── beat 10 in the door, to the Yes ──
  await page.evaluate((d) => window.__os.debugJump(d === 'vr' ? 'e4Act3FriendsVR' : 'e4Act3Friends'), door);
  await until((s) => s.ask, 90000, 'ask');
  await wait(800);
  if (door === 'vr') {
    const at = await page.evaluate(() => window.__os.e4.visorHits.find((h) => h.id === 'a3-yes') ?? null);
    const pt = at && mode === 'computer' ? await page.evaluate(PROJECT, 'era4-visor', at.x + at.w / 2, at.y + at.h / 2, 512, 384) : null;
    if (pt) await click(pt); else if (at) await page.evaluate((h) => window.__os.e4.handleClick(h.x + h.w / 2, h.y + h.h / 2), at);
  } else await press('a3-yes');
  T0 = Date.now();
  await page.evaluate(() => { window.__fr.draws = []; });
  // the headset back on the desk before the stream (VR door): the model there again
  await until((s) => s.beat === 'stream', 60000, 'stream beat'); mark('11-begins');
  rep.headsetOnDeskAtStream = (await state()).headsetModel;
  await until((s) => !!s.hits.length || s.grow > 0 || s.on, 20000, 'link');
  await wait(600); await shot('B11a-link');
  await until((s) => s.grow > 0.3 || s.on, 20000, 'grow'); await shot('B11b-grow');
  await until((s) => s.on, 20000, 'stream on'); mark('11-on');
  // the stream's cost: uploads and MB a second over ten seconds of it
  const u0 = await page.evaluate(() => ({ up: window.__fr.up, bytes: window.__fr.bytes, t: performance.now() }));
  await wait(10000);
  const u1 = await page.evaluate(() => ({ up: window.__fr.up, bytes: window.__fr.bytes, t: performance.now() }));
  const secs = (u1.t - u0.t) / 1000;
  rep.stream = { seconds: +secs.toFixed(1), uploadsPerSecond: +((u1.up - u0.up) / secs).toFixed(1), mbPerSecond: +((u1.bytes - u0.bytes) / secs / 1048576).toFixed(1) };
  console.log(`  stream: ${JSON.stringify(rep.stream)}`);
  await shot('B11');
  await until((s) => s.chat >= 12, 40000, 'joined'); await wait(1500); await shot('B11c-joined');
  await until((s) => s.asking, 60000, 'ask'); mark('11-ask'); await wait(900); await shot('B11d-ask');
  if (!STALL) { await press('a4-dance'); mark('11-pressed'); }
  await wait(1500); await shot('B11e-answer');
  // ── beat 12 · the shutdown ──
  await until((s) => s.beat === 'shutdown', 60000, 'shutdown'); mark('12-begins');
  await page.evaluate(() => { window.__fr.lum = []; window.__fr.rec = true; });
  await until((s) => !!s.band, 10000, 'band'); await wait(400); await shot('B12a-band');
  await until((s) => s.terminated, 30000, 'terminated'); mark('12-terminated'); await wait(1200); await shot('B12');
  await until((s) => s.glitch > 0.3 || s.dark, 30000, 'glitch'); await shot('B12b-glitch');
  await until((s) => s.dark, 20000, 'dark'); mark('12-dark'); await wait(600); await shot('B12c-dark');
  const lum = await page.evaluate(() => { window.__fr.rec = false; return window.__fr.lum; });
  // flash rate: (a) changes a second of the monitor's luminance (>2%) and of the room light; (b) reversals over 10% in any second
  const series = (key) => lum.filter((x) => x[key] !== null).map((x) => ({ t: x.t, v: x[key] }));
  const rate = (pts, min) => {
    const ch = []; for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].v - pts[i - 1].v) > min) ch.push({ t: pts[i].t, d: pts[i].v - pts[i - 1].v });
    let worst = 0; for (const c of ch) { const n = ch.filter((x) => x.t >= c.t && x.t < c.t + 1000).length; worst = Math.max(worst, n); }
    // a flash = a pair of opposing changes; reversals of direction within one second
    let rev = 0; for (const c of ch) { const w = ch.filter((x) => x.t >= c.t && x.t < c.t + 1000); let r = 0; for (let i = 1; i < w.length; i++) if (Math.sign(w[i].d) !== Math.sign(w[i - 1].d) && Math.abs(w[i].d) > 0.1 * Math.max(0.05, Math.abs(w[i - 1].d))) r++; rev = Math.max(rev, r); }
    return { changes: ch.length, worstChangesInOneSecond: worst, worstReversalsInOneSecond: rev };
  };
  const mon = series('lum'), glow = series('glow');
  const flashMon = rate(mon, 0.02);
  // luminance reversals ≥ 10% (WCAG's "general flash": a pair of opposing changes of 10% or more), in any one second
  const big = []; for (let i = 1; i < mon.length; i++) if (Math.abs(mon[i].v - mon[i - 1].v) >= 0.1) big.push({ t: mon[i].t, d: mon[i].v - mon[i - 1].v });
  let flashes = 0; for (const c of big) { const w = big.filter((x) => x.t >= c.t && x.t < c.t + 1000); let pairs = 0; for (let i = 1; i < w.length; i++) if (Math.sign(w[i].d) !== Math.sign(w[i - 1].d)) pairs++; flashes = Math.max(flashes, pairs); }
  rep.flash = { frames: lum.length, monitor: flashMon, monitorFlashesOver10pctInOneSecond: flashes, monitorMaxStepPct: +(Math.max(0, ...mon.slice(1).map((x, i) => Math.abs(x.v - mon[i].v))) * 100).toFixed(1),
    roomLight: rate(glow, 0.05) };
  console.log(`  flash: ${JSON.stringify(rep.flash)}`);
  // ── beat 13 · coming soon ──
  await until((s) => s.beat === 'end', 20000, 'end'); mark('13-begins');
  await until((s) => !!s.junie, 10000, 'junie'); await wait(700); await shot('B13a-junie');
  await until((s) => s.lWords !== null && s.lWords.length > 30, 20000, 'L'); await wait(900); await shot('B13b-l');
  await until((s) => !!s.title, 20000, 'title'); mark('13-title'); await wait(700); await shot('B13');
  // ── into the Close: the turn (a turn on a screen, one cut in a headset), the crossing, his line, the first card ──
  await until((s) => s.close === 'turn', 30000, 'turn'); mark('close-turn');
  const yaws = [];
  const tTurn = Date.now();
  while (Date.now() - tTurn < 34000) { const st = await state(); if (st.pose) yaws.push({ t: Date.now(), yaw: st.pose.yaw, close: st.close }); if (st.close !== 'turn' && st.close !== 'lead') break; await wait(250); if (yaws.length === 40) await shot('B13c-turn'); }
  let maxRate = 0; for (let i = 1; i < yaws.length; i++) { const dt = (yaws[i].t - yaws[i - 1].t) / 1000; let d = Math.abs(yaws[i].yaw - yaws[i - 1].yaw); if (d > 180) d = 360 - d; if (dt > 0) maxRate = Math.max(maxRate, d / dt); }
  rep.turn = { samples: yaws.length, from: yaws[0]?.yaw, to: yaws[yaws.length - 1]?.yaw, maxDegPerSecond: +maxRate.toFixed(1), seconds: yaws.length ? +((yaws[yaws.length - 1].t - yaws[0].t) / 1000).toFixed(1) : 0 };
  console.log(`  turn: ${JSON.stringify(rep.turn)}`);
  await until((s) => s.close === 'travel', 40000, 'travel'); mark('close-travel'); await wait(9000); await shot('B13d-travel');
  await until((s) => s.close === 'line', 40000, 'line'); mark('close-line'); await wait(5000); await shot('B13e-line');
  await until((s) => s.card === 0, 120000, 'first card'); mark('close-first-card'); await wait(800); await shot('B13f-firstcard');
  rep.beats = await page.evaluate(() => ({ acts: window.__os.e4.browser.acts.beatLog, close: window.__closeLog }));
  rep.heard = await page.evaluate(() => window.__heard.filter((h) => /l_b13|transjesus_song|terminate_2026|glitch_e4_end|card_junie|agent_2026|filter_deny|close_song/.test(h.src)).map((h) => ({ src: h.src, dur: h.dur ? +h.dur.toFixed(2) : null, ended: h.ended })));
  const d = await page.evaluate(() => { clearInterval(window.__fr.sample); return window.__fr.draws; });
  const worst = d.reduce((a, x) => (x.d > a.d ? x : a), d[0] ?? { d: 0 });
  const by = {}; for (const x of d) { const k = x.close ? `close:${x.close}` : x.beat; by[k] = Math.max(by[k] ?? 0, x.d); }
  rep.draws = { samples: d.length, worst, byBeat: by };
  console.log(`${mode}/${door}: moments ${JSON.stringify(Object.fromEntries(Object.entries(rep.moments).map(([k, v]) => [k, v.at])))}`);
  console.log(`  draws: worst ${worst.d} (${worst.beat} ${worst.close}) · by beat ${JSON.stringify(by)}`);
  console.log(`  heard: ${rep.heard.map((h) => `${h.src} ${h.dur}`).join(', ')} · errors ${errors.length} ${errors.slice(0, 3).join(' | ')}`);
  fs.writeFileSync(path.join(OUT, `report-${mode}-${door}${STALL ? '-stall' : ''}${REDUCED ? '-reduced' : ''}.json`), JSON.stringify(rep, null, 1));
  all[`${mode}-${door}`] = rep;
  await page.close();
}
await browser.close();
const bad = Object.values(all).some((r) => r.errors.length || (r.draws?.worst?.d ?? 0) > 75 || Object.keys(r.moments).some((k) => k.startsWith('missed:')));
process.exit(bad ? 1 : 0);
