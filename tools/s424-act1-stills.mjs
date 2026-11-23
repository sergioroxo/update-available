#!/usr/bin/env node
/**
 * ⚑ S424 (UiB job 35 Part D, Act I) — 2016's ACT I (the training), photographed in order from the seat, from her Allow to
 * Mam's message after Lesson 3, on the computer, in the headset mock and on a phone held upright. A copy of S421's
 * tools/s421-2016-today-stills.mjs (its route is the walk's own) taught the training's presses, so the "before" (today's
 * build) and the "after" (the training) are photographed by one tool:
 *
 *     node tools/s424-act1-stills.mjs --port 5661 --out out/s424/after-desktop --mode desktop --heartwood bring
 *     node tools/s424-act1-stills.mjs --port 5662 --out out/s424/before-phone --mode phone
 *
 * A REVIEW ROUTE, never a reachability proof (tools/walk.mjs is that). It boots `?era=3` as the stills do, then presses only
 * what a visitor presses, with the build's own targets (tools/harness/visitor-state.mjs): on the computer a real mouse press,
 * on the phone a real tap, in the headset mock the controller's ray aimed at the target and its trigger fired. No debug
 * jump, no debugBeat, no state written. Between presses it dwells as a reader would and lets every timed beat run.
 *
 * Where the two builds differ, the route takes whichever is live: This week's Begin or the first tile; Lambient's own first
 * cut (the training) or a first Apply (today); Lambient's answer to Maureen or her own reply. The Lamby set: today's call is
 * answered yes and the set is put down after TAPE_WATCH s; the training's offer is answered by `--heartwood` (bring: Bring it,
 * then ▶ on the set, then put down after TAPE_WATCH s; notnow: Not now, and the set is never touched).
 *
 * It photographs every new state once it has held still (the platform's mode, page, lesson, pop-ins, the phone, the guide's
 * line, the Lamby set) and writes `log.json` (each still, its time from Allow, its draw calls, the set's pose and band).
 * It stops a few seconds after Mam's message has landed (the end of Act I).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'desktop');
const XR = MODE === 'xr', PHONE = MODE === 'phone';
const OUT = path.resolve(flag('out', `out/s424/${MODE}`));
const TAPE_WATCH = Number(flag('tape', 20));
const HEARTWOOD = flag('heartwood', 'bring') === 'notnow' ? 'notnow' : 'bring';
const VIEW = XR ? { width: 1000, height: 1000 } : PHONE ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/** the route: [ids (the first live one is pressed), dwell, which build ('old': today's only, 'new': the training's only)] */
const ROUTE = [
  [['signin'], 3],
  [['consent-allow'], 5],
  [['week-begin', 'task-0'], 8],
  [['apply'], 6], [['apply'], 6], [['apply'], 6, 'old'],   // the training: Lambient makes the first cut itself
  [['vera-send'], 5],
  [['board-back'], 6],   // the receipt; then her own 2014 cut is on the editor
  [['board-back'], 8],
  [['task-1'], 9],
  [['places-add'], 6],
  [['board-back'], 5],
  [['task-2'], 5],
  [['family-reply-r_patience'], 7, 'old'],   // today: she answers Maureen; the training: Lambient does
  [['family-sel-1'], 3, 'old'],             // today: she opens Annette; the training: the screen takes her there
  [['family-reply-r_grief'], 9],
  [['board-back'], 4]
];
/** what the piece brings to her on its own time, pressed once whenever it is up (after its reading time) */
const CONTEXT = [
  ['pause-close', 8],                               // today: This week, late
  ['lg-take@call', 4],                              // today's call (one button) / the training's offer: Bring it
  ['lg-later@call', 5]                              // the training's offer: Not now
];

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { ...VIEW, deviceScaleFactor: 1 } });
const page = await browser.newPage();
if (PHONE) await page.emulate({ userAgent: IPHONE_UA, viewport: { ...VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); if (m.type() === 'warning' && m.text().startsWith('[e3]')) console.log('PAGE', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__camPose, { timeout: 180000 });
await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
await wait(4000);
await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').startsWith('⚙')) b.style.visibility = 'hidden'; }));
if (XR) {
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    window.__aim = null;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(),
      getDirection: () => (window.__aim ? window.__aim.clone() : head.forward.clone()), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src);
    const w2s = head.camera.worldToScreen.bind(head.camera);
    head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}

/** the state that decides what a still is OF */
const sigOf = () => page.evaluate(() => {
  const os = window.__os, q = window.__graceQueue?.();
  const g = {};
  try { const v = os.lambyGuide?.view; g.lg = v && !v.hidden && v.text ? String(v.text).slice(0, 40) : ''; } catch { g.lg = ''; }
  if (q && os.desktopEra === 'e3') {
    const ph = q.phone, fam = q.surfaces?.get?.('family');
    g.q = [q.mode, q.veraPage ?? '', q.openSurface?.id ?? '', q.pauseOpen ? 'week' : '', q.ownCutShown ? 'own' : '', q.storyDone ? 'done' : '',
      q.watch ? 'watch:' + q.watch.phase : '', 'dec' + (q.decisions?.size ?? 0), q.cutQueue?.length ? 'cut' : '', q.deskNote ? 'note' : '',
      (q.lambLines || []).join('/').slice(0, 30), ph?.screen ?? '', ph?.banner?.from ?? '',
      fam ? `fam:${fam.sel}:${fam.lessonSent ? 'sent' : ''}:${fam.lessonT >= 0 && fam.lessonT < 6 ? 'w' : ''}:${fam.outcomes?.size ?? 0}` : '',
      q.heartwoodSettled ? 'hs' : '', q.editorReceipt ? 'rcpt' : ''].join('|');
  }
  const tvs = window.__teachingTv?.();
  const tv = (tvs?.tvs || []).find((t) => t.tape === '2016');
  g.tv = tv ? `${tv.pose}/${tv.state}` : '';
  g.call = tvs?.call?.shown ? 'call' : '';
  return JSON.stringify(g);
});

const t0 = { at: 0 };
const log = [];
let shotN = 0, lastSig = '', sigSince = Date.now(), shotSigs = new Set();
const shoot = async (why) => {
  const sig = await sigOf();
  const name = `${String(++shotN).padStart(3, '0')}_${why.replace(/[^a-z0-9@:-]+/gi, '-').slice(0, 40)}.png`;
  await page.screenshot({ path: path.join(OUT, name) });
  const extra = await page.evaluate(() => {
    const tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
    return { drawCalls: window.__drawCalls ?? null, tv: tv ? { pose: tv.pose, state: tv.state, beside: tv.beside, fitted: tv.fitted, heldScale: tv.heldScale, heldDist: tv.heldDist } : null };
  });
  log.push({ n: shotN, file: name, why, t: t0.at ? Math.round((Date.now() - t0.at) / 100) / 10 : null, sig, ...extra });
  shotSigs.add(sig);
  console.log(name, log[log.length - 1].t, extra.drawCalls, sig.slice(0, 170));
};

const press = async (id) => {
  const s = await readVisitorState(page, VIEW);
  const tgt = s.targets.find((t) => t.id === id);
  if (!tgt) return false;
  const [x, y] = tgt.pt;
  if (XR) {
    await page.evaluate((px, py) => {
      const app = window.__app, head = app.root.findByName('camera');
      const far = head.camera.screenToWorld(px, py, 5);
      const o = head.getPosition();
      window.__aim = far.clone().sub(o).normalize();
      const c = window.__controller;
      app.xr.input.fire('selectstart', c); app.xr.input.fire('select', c); app.xr.input.fire('selectend', c);
    }, x, y);
    await wait(120);
    await page.evaluate(() => { window.__aim = null; });
  } else if (PHONE) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up();
  }
  return true;
};

const TRAINING = await page.evaluate(() => 'watch' in (window.__graceQueue?.() ?? {}));
console.log('build:', TRAINING ? 'the training (S424)' : 'today');
const started = Date.now();
let step = 0, mamAt = 0, tvHeldAt = 0, played = false;
const seenAt = new Map(), done = new Set();
const HARD_STOP = 14 * 60 * 1000;
const moved = () => page.evaluate(() => {
  const q = window.__graceQueue?.(), tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
  return [q?.version ?? 0, tv?.pose, tv?.state, tv?.userPaused, (window.__ledger?.()?.records || []).length, window.__teachingTv?.()?.call?.shown].join('|');
});
const doPress = async (id, sig, why) => {
  if (log.length === 0 || log[log.length - 1].why !== 'press-' + id || log[log.length - 1].sig !== sig) await shoot('press-' + id);
  const before = await moved();
  if (!(await press(id))) return false;
  await wait(500);
  if ((await moved()) === before) { console.log('NO EFFECT', id); log.push({ press: id, kind: why, noEffect: true }); await wait(800); return false; }
  if (id === 'consent-allow') t0.at = Date.now();
  log.push({ press: id, kind: why, t: t0.at ? Math.round((Date.now() - t0.at) / 100) / 10 : null });
  console.log('PRESS', id, why);
  seenAt.clear();
  await wait(600);
  return true;
};
while (Date.now() - started < HARD_STOP) {
  const sig = await sigOf();
  if (sig !== lastSig) { lastSig = sig; sigSince = Date.now(); }
  const stable = Date.now() - sigSince;
  const g = JSON.parse(sig);
  if (stable >= 900 && !shotSigs.has(sig)) await shoot(step < ROUTE.length ? 'before-' + ROUTE[step][0][0] : 'after');
  // the end of Act I: Mam's message has landed and been held a while
  const mam = await page.evaluate(() => !!window.__graceQueue?.()?.phone?.delivered?.('decision'));
  if (mam && !mamAt) mamAt = Date.now();
  if (mamAt && Date.now() - mamAt > 9000) { await shoot('act1-end'); break; }
  const s = await readVisitorState(page, VIEW);
  const live = new Set(s.targets.map((t) => t.id));
  for (const id of live) if (!seenAt.has(id)) seenAt.set(id, Date.now());
  for (const id of [...seenAt.keys()]) if (!live.has(id)) seenAt.delete(id);
  const readFor = (id) => (Date.now() - (seenAt.get(id) ?? Date.now())) / 1000;
  // the set in her hands: (the training) ▶ once it has arrived stopped; she watches TAPE_WATCH s of it, then sets it down
  const held = /^held/.test(g.tv);
  if (held && !tvHeldAt) tvHeldAt = Date.now();
  if (held && !played && /leader|paused/.test(g.tv) && live.has('tv-play@2016') && readFor('tv-play@2016') >= 4 && HEARTWOOD === 'bring') {
    if (await doPress('tv-play@2016', sig, 'context')) { played = true; tvHeldAt = Date.now(); continue; }
  }
  if (held && live.has('tv-body@2016') && (played || /playing|loading|ended/.test(g.tv)) && ((Date.now() - tvHeldAt) / 1000 >= TAPE_WATCH || /ended/.test(g.tv))) {
    if (await doPress('tv-body@2016', sig, 'context')) { tvHeldAt = 0; continue; }
  }
  if (stable >= 700 && !/lifting|returning/.test(g.tv)) {
    const ctx = CONTEXT.find(([id, dwell]) => !done.has(id) && live.has(id) && readFor(id) >= dwell
      && !(id === 'lg-take@call' && live.has('lg-later@call') && HEARTWOOD === 'notnow') && !(id === 'lg-later@call' && HEARTWOOD === 'bring'));
    if (ctx && !(held && played)) { if (await doPress(ctx[0], sig, 'context')) { done.add(ctx[0]); continue; } }
    if (!held || !played || (Date.now() - tvHeldAt) / 1000 >= TAPE_WATCH) {
      // a step for the other build is passed over
      while (step < ROUTE.length && ROUTE[step][2] && (ROUTE[step][2] === 'old') === TRAINING) step++;
      if (step < ROUTE.length) {
        const [ids, dwell] = ROUTE[step];
        const id = ids.find((i) => live.has(i));
        if (id && readFor(id) >= dwell && await doPress(id, sig, 'job')) {
          // a tile that opened nothing (a lesson still waiting, the pointer going to the lit one) is not a step taken
          const opened = !/^task-/.test(id) || await page.evaluate(() => window.__graceQueue?.()?.mode === 'list');
          if (opened) step++;
          continue;
        }
      }
    }
  }
  await wait(400);
}
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify({ mode: MODE, view: VIEW, heartwood: HEARTWOOD, route: ROUTE, log, errors }, null, 1));
console.log('done', shotN, 'stills; route step', step, 'of', ROUTE.length, '; errors', errors.length, errors.slice(0, 3));
await browser.close();
