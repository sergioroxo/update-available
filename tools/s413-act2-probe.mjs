#!/usr/bin/env node
/**
 * ⚑ S413 (UiB job 33 Part B) — 2026's ACT II, PLAYED, PHOTOGRAPHED AND MEASURED: Second Thoughts' four beats on the one
 * screen, and the doors the walk leaves alone (Not now, Undo, the console's Open it, a Memory note opened in place, the
 * conversation scrolled back while the takeover runs).
 *
 *     node tools/s413-act2-probe.mjs --port 5511 --out <dir> [--modes computer,headset] [--notnow] [--undo] [--open]
 *                                    [--each] [--throttle 4] [--no-frames]
 *
 * `?era=4` (the room settled), the debug jump to Act I's yellow card (`e4Act1Search`, Act I laid into the chat); from there
 * every press is one the visitor can make, on the monitor's published rects (`__os.e4.pressBrowser`): ✚ Add to L (or Not
 * now, then a press on the page), Do it for me (or Review each), Undo, Open it, play, her answer. Per mode it writes
 * B05…B08 stills (`<name>_desktop.png` / `<name>_xr.png`), the 26-1x afters, and report-<mode>.json:
 *   · seconds from the seam's press to each beat (and each beat's length);
 *   · THE FRAME (26-14): over a window while the AI mutes, answers Dad and puts the game on the console, with the CPU
 *     throttled (×4 by default): fps, the worst half-second, texture uploads per frame and what each frame updated;
 *   · draw calls: sampled every 250 ms through the whole act (the worst, and where), and in the headset a yaw sweep at the
 *     console and the video;
 *   · the chat scrolled back during the takeover stays where it was while lines arrive (26-14), and the Newest pill returns;
 *   · the clips heard (Second Thoughts' four, the film's music and narrator) with their real lengths;
 *   · beat 8: the letters typed and deleted, the line left in the conversation and not in the box (26-15);
 *   · the hand-over: programDone, the headset's guide step; console errors.
 * Headset: the seated mock of tools/s404-crt-probe.mjs (xr.active forced, the head at the rig, a 90° view).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s413-act2'));
const MODES = flag('modes', 'computer,headset').split(',');
const NOTNOW = has('notnow'), UNDO = has('undo'), OPEN = has('open'), EACH = has('each');
const THROTTLE = Number(flag('throttle', 4));
const FRAMES = !has('no-frames');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };

/** the frame's instruments: per frame, the gap, the engine's update + render, the textures sent (and whose) and the draws */
const INSTRUMENTS = () => {
  const app = window.__app, gl = app.graphicsDevice.gl;
  const S = window.__fr = { rec: false, f: [], last: 0, t0: 0, up: 0, bytes: 0, draws: [], sample: null };
  for (const n of ['texImage2D', 'texSubImage2D']) {
    const o = gl[n].bind(gl);
    gl[n] = (...a) => { if (S.rec) { S.up++; const src = a[a.length - 1]; if (src && src.width) S.bytes += src.width * src.height * 4; } return o(...a); };
  }
  let t0 = 0;
  app.on('frameupdate', () => { const now = performance.now(); t0 = now; if (S.rec) S.cur = { gap: S.last ? now - S.last : 0 }; S.last = now; });
  app.on('frameend', () => { if (S.rec && S.cur) { S.cur.work = performance.now() - t0; S.cur.up = S.up; S.cur.mb = S.bytes / 1048576; S.cur.draws = window.__drawCalls ?? 0; S.f.push(S.cur); } S.up = 0; S.bytes = 0; S.cur = null; });
  // draw calls through the whole act, every 250 ms, with where the story was
  S.sample = setInterval(() => { const b = window.__os?.e4?.browser; S.draws.push({ d: window.__drawCalls ?? 0, beat: b?.acts?.beat ?? '', t: +(b?.acts?.t ?? 0).toFixed(1) }); }, 250);
};
const measure = async (page, cdp, seconds) => {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await page.evaluate(() => { window.__fr.f = []; window.__fr.rec = true; });
  await wait(seconds * 1000);
  const f = await page.evaluate(() => { window.__fr.rec = false; return window.__fr.f.slice(1); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const span = f.reduce((a, x) => a + x.gap, 0);
  let worst = Infinity, acc = 0, i0 = 0;
  for (let i = 0; i < f.length; i++) { acc += f[i].gap; while (i0 < i && acc - f[i0].gap >= 500) { acc -= f[i0].gap; i0++; } if (acc >= 500) worst = Math.min(worst, (i - i0 + 1) * 1000 / acc); }
  const avg = (k) => +(f.reduce((a, x) => a + x[k], 0) / Math.max(1, f.length)).toFixed(2);
  return { throttle: THROTTLE, frames: f.length, fps: +(1000 * f.length / Math.max(1, span)).toFixed(1), worstHalfSecondFps: Number.isFinite(worst) ? +worst.toFixed(1) : null,
    workMs: avg('work'), maxWorkMs: +Math.max(0, ...f.map((x) => x.work)).toFixed(1), uploadsPerFrame: avg('up'), mbPerFrame: avg('mb'), maxDraws: Math.max(0, ...f.map((x) => x.draws)) };
};

const all = {};
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
    // every pause of the film's sound, with who paused it (a silence mid-film is this probe's finding, not a guess)
    window.__pauses = [];
    const P = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () { if (/clip_/.test(this.src)) window.__pauses.push({ src: this.src.split('/').pop(), t: +this.currentTime.toFixed(2), stack: new Error().stack.split('\n').slice(2, 8).map((l) => l.trim().replace(/\(http:\/\/localhost:\d+\//, '(')).join(' < ') }); return P.call(this); };
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
  const sfx = mode === 'computer' ? 'desktop' : 'xr';
  const rep = { mode, choices: { notnow: NOTNOW, undo: UNDO, open: OPEN, each: EACH }, beats: {}, moments: {}, frames: null, scroll: null, answer: null, heard: [], draws: null, sweep: {}, handover: null, errors };
  let T0 = Date.now();
  const state = () => page.evaluate(() => {
    const b = window.__os.e4.browser, a = b.acts, s = a.screen;
    return { step: b.storyStep, beat: a.beat, t: a.t, path: a.path, page: s.page?.kind ?? null, stage: s.page?.stage ?? null, hits: b.hits.map((h) => h.id),
      rows: s.rows.length, last: s.rows.slice(-3).map((r) => `${r.who}:${r.text}`), chips: s.chips.map((c) => c.id), banner: !!s.banner, name: s.name, aiW: s.aiWidth,
      orig: s.originalStage, composer: s.composer, composerText: s.composerText, done: a.done, programDone: b.programDone, floor: a.floor, felt: a.feltNow };
  });
  const until = async (pred, ms = 120000, name = '') => {
    const s0 = Date.now();
    while (Date.now() - s0 < ms) { const st = await state(); if (pred(st)) return st; await wait(200); }
    console.log(`  ⚠ ${mode}: ${name} never came`); rep.moments[`missed:${name}`] = true; return null;
  };
  const press = async (id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
  const shot = async (name) => {
    await wait(300);
    await page.screenshot({ path: path.join(OUT, `${name}_${sfx}.png`) });
    const st = await state();
    rep.moments[name] = { at: +((Date.now() - T0) / 1000).toFixed(1), beat: st.beat, page: st.page, stage: st.stage, last: st.last, draws: await page.evaluate(() => window.__drawCalls ?? null) };
    console.log(`${mode} ${name} · ${st.beat} · ${st.page}/${st.stage ?? ''} · draws ${rep.moments[name].draws} · ${st.last.slice(-1)[0] ?? ''}`);
  };
  const mark = (b) => { rep.beats[b] = +((Date.now() - T0) / 1000).toFixed(1); };
  const sweep = async (name) => {
    if (mode !== 'headset') return;
    const out = [];
    for (const yaw of [-60, -40, -20, 0, 20, 40, 60, 90, 135, 180, -135, -90]) for (const pitch of [-30, 0, 20]) {
      await page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), yaw, pitch);
      await wait(180);
      out.push({ yaw, pitch, d: await page.evaluate(() => window.__drawCalls ?? 0) });
    }
    await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
    const worst = out.reduce((a, x) => (x.d > a.d ? x : a), out[0]);
    rep.sweep[name] = { worst, all: out };
    console.log(`  sweep ${name}: worst ${worst.d} at yaw ${worst.yaw} pitch ${worst.pitch}`);
  };

  // ── the yellow card (Act I laid in) ──
  await page.evaluate(() => window.__os.debugJump('e4Act1Search'));
  await until((s) => s.hits.includes('st-add'), 90000, 'yellow card');
  T0 = Date.now();
  // ── beat 5 ──
  if (NOTNOW) {
    await press('st-notnow'); mark('5-notnow');
    await wait(1500); await shot('B05-notnow');
    await wait(3000);
    await press('story-0'); await wait(2500); await shot('B05-story');
    await press('page-back'); mark('5-pressed');
  } else { await press('st-add'); mark('5-add'); }
  await until((s) => s.page === 'added', 30000, 'arrival');
  mark('5-arrives');
  await wait(900); await shot('B05a');
  await until((s) => s.last.some((l) => l.includes("I'm here now")), 30000, 'first words');
  await wait(2500); await shot('B05');
  // ── beat 6 ──
  await until((s) => s.beat === 'review', 30000, 'review'); mark('6-review');
  await until((s) => s.hits.includes('rv-all'), 60000, 'review built'); await wait(500); await shot('B06a');
  await press(EACH ? 'rv-each' : 'rv-all'); mark('6-pressed');
  await until((s) => s.banner, 20000, 'banner'); mark('6-takeover');
  await until((s) => s.page === 'kettle', 20000, 'kettle');
  await wait(3000); await shot('B06b');   // the cursor on Junie's row, its menu
  await until((s) => s.chips.includes('a2-undo'), 30000, 'undo');
  await wait(400); await shot('B06c');
  // the conversation scrolled back while the takeover runs (26-14): it must stay where she put it while lines arrive
  const before = await page.evaluate(() => { const b = window.__os.e4.browser; b.scrollAt(null, null, -120); const s = b.acts.screen; return { back: s.chatBack, rows: s.rows.length, scrolls: s.chatScrolls }; });
  if (UNDO) { await press('a2-undo'); mark('6-undo'); }
  await until((s) => s.last.some((l) => l.startsWith('memory:')), 30000, 'memory note');
  await wait(600);
  const during = await page.evaluate(() => { const s = window.__os.e4.browser.acts.screen; return { back: s.chatBack, rows: s.rows.length, newest: window.__os.e4.browser.hits.some((h) => h.id === 'chat-newest') }; });
  await shot('26-14_after-scrolled');
  await press('chat-newest'); await wait(500);
  const after = await page.evaluate(() => { const s = window.__os.e4.browser.acts.screen; return { back: s.chatBack, rows: s.rows.length }; });
  rep.scroll = { before, during, after, held: during.back > 0 && during.rows > before.rows, newestReturns: after.back === 0 };
  console.log(`  scroll: ${JSON.stringify(rep.scroll)}`);
  // a Memory note, opened in place, and folded
  const memId = await page.evaluate(() => window.__os.e4.browser.hits.find((h) => h.id.startsWith('mem-note:'))?.id ?? null);
  if (memId) { await press(memId); await wait(500); await shot('B06-memory'); await press(memId); }
  rep.memoryNote = { id: memId, rowOpenWorked: !!memId };
  // the frame, while it mutes the lot, answers Dad, and lights the console
  if (FRAMES) {
    await until((s) => s.last.some((l) => l.includes('muted the lot')) || s.page === 'thread', 60000, 'the lot');
    rep.frames = await measure(page, cdp, 8);
    console.log(`  frames (×${THROTTLE}): ${JSON.stringify(rep.frames)}`);
  }
  await until((s) => s.page === 'thread', 60000, 'dad');
  await until((s) => s.last.some((l) => l.includes('replied to your dad')), 30000, 'dad reply'); await wait(300); await shot('B06d');
  await until((s) => s.chips.includes('a2-open'), 60000, 'console'); mark('6-console'); await wait(300); await shot('B06');
  await sweep('console');
  if (OPEN) {
    await press('a2-open'); mark('6-open');
    await page.waitForFunction(() => window.__heldDevices?.held('e4'), { timeout: 10000 }).catch(() => {});
    await wait(1500); await shot('B06-console-held');
    rep.console = await page.evaluate(() => ({ held: window.__heldDevices.held('e4') }));
    await wait(4000);
    await page.evaluate(() => window.__heldDevices.release('e4'));
    await wait(600);
    rep.console.afterRelease = await page.evaluate(() => window.__heldDevices.held('e4'));
    if (rep.console.afterRelease) {
      // a flat screen sets it down with a press beside it: through the room's own pointer
      await page.mouse.move(40, 40); await page.mouse.down(); await wait(70); await page.mouse.up(); await wait(800);
      rep.console.afterPress = await page.evaluate(() => window.__heldDevices.held('e4'));
    }
    console.log(`  console: ${JSON.stringify(rep.console)}`);
  }
  // ── beat 7 ──
  await until((s) => s.beat === 'video', 90000, 'video'); mark('7-video');
  await until((s) => s.page === 'video' && s.stage === 'making', 20000, 'making'); await wait(3600); await shot('B07a');
  await until((s) => s.hits.includes('video-play'), 30000, 'play'); mark('7-ready'); await wait(300); await shot('B07');
  await press('video-play'); mark('7-play');
  await wait(19000); await shot('B07b');
  await sweep('video');
  await until((s) => s.stage === 'ended', 70000, 'ended'); mark('7-ended');
  await wait(600); await shot('B07c');
  // ── beat 8 ──
  await until((s) => s.chips.includes('a2-answer'), 30000, 'answer'); mark('8-answer'); await wait(300); await shot('B08a');
  await press('a2-answer'); mark('8-pressed');
  await wait(1700); await shot('B08b');
  const typed = await state();
  await until((s) => s.last.some((l) => l.startsWith('her:') && l.length < 25), 20000, 'deleting'); await shot('B08c');
  await until((s) => s.last.some((l) => l.startsWith('unsent:')), 20000, 'unsent'); mark('8-unsent'); await wait(400); await shot('B08d');
  const unsent = await state();
  await until((s) => s.last.some((l) => l.startsWith('booked:')), 40000, 'booked'); mark('8-booked'); await wait(900); await shot('B08');
  rep.answer = { typedMidway: typed.composerText, composerAfter: unsent.composer, lineInConversation: unsent.last.find((l) => l.startsWith('unsent:')) ?? null };
  await until((s) => s.programDone, 20000, 'handover'); mark('handover');
  await wait(3500);
  rep.handover = await page.evaluate(() => { const o = window.__os, b = o.e4.browser; return { programDone: b.programDone, deviceReady: o.e4.deviceReady, guide: o.lambyGuide?.view?.beat ?? null, step: b.storyStep }; });
  await shot('B08-handover');
  rep.filmPauses = await page.evaluate(() => window.__pauses);
  rep.heard = await page.evaluate(() => window.__heard.filter((h) => /^l_b|^clip_|^agent_|^step_done/.test(h.src)).map((h) => ({ src: h.src, dur: h.dur ? +h.dur.toFixed(2) : null, ended: h.ended, ms: h.endAt ? Math.round(h.endAt - h.at) : null })));
  const d = await page.evaluate(() => { clearInterval(window.__fr.sample); return window.__fr.draws; });
  const worst = d.reduce((a, x) => (x.d > a.d ? x : a), d[0] ?? { d: 0 });
  rep.draws = { samples: d.length, worst, byBeat: Object.fromEntries([...new Set(d.map((x) => x.beat))].map((b) => [b, Math.max(...d.filter((x) => x.beat === b).map((x) => x.d))])) };
  console.log(`${mode}: beats ${JSON.stringify(rep.beats)}`);
  console.log(`  draws: worst ${worst.d} (${worst.beat}) · by beat ${JSON.stringify(rep.draws.byBeat)}`);
  console.log(`  heard: ${rep.heard.map((h) => `${h.src} ${h.dur}`).join(', ')}`);
  console.log(`  film pauses: ${JSON.stringify(rep.filmPauses)}`);
  console.log(`  answer: ${JSON.stringify(rep.answer)} · handover ${JSON.stringify(rep.handover)} · errors ${errors.length}`);
  fs.writeFileSync(path.join(OUT, `report-${mode}.json`), JSON.stringify(rep, null, 1));
  all[mode] = rep;
  await page.close();
}
await browser.close();
const bad = Object.values(all).some((r) => r.errors.length || (r.draws?.worst?.d ?? 0) > 75 || Object.values(r.sweep).some((s) => s.worst.d > 75));
process.exit(bad ? 1 : 0);
