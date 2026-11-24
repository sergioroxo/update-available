#!/usr/bin/env node
/**
 * ⚑ S421 (UiB job 35 Part A) — 2016 AS IT RUNS TODAY, photographed in order, from accepting Lambient to the update
 * notification, so the storyboard (docs/reinterp/STORYBOARD_2016_SECOND_HALF_2026-11-23.md) can set the old flow beside
 * the new one.
 *
 *     node tools/s421-2016-today-stills.mjs --port 5621 --out out/s421/desktop --mode desktop
 *     node tools/s421-2016-today-stills.mjs --port 5621 --out out/s421/xr --mode xr
 *
 * A REVIEW ROUTE, never a reachability proof (tools/walk.mjs is that, and it walked this era first: its presses are the
 * route below). It boots `?era=3` as the stills do, then presses only what a visitor presses, with the build's own
 * targets (tools/harness/visitor-state.mjs): on the computer a real mouse press at the target; in the headset mock the
 * controller's ray is aimed at the same target and its trigger fired (selectstart → select → selectend), the route
 * src/frame/xrInput.ts takes. No debug jump, no debugBeat, no state written. Between presses it dwells as a reader
 * would, and lets every timed beat (the phone, the Notes, the tape, Malta, the cascade) run by itself.
 *
 * It photographs every new state of the screen once it has held still for a moment (the platform's mode and page, its
 * pop-ins, the phone's screen and stage, the guide's line, the Lamby set, the update's phase) and writes `log.json`:
 * each still with its time from the press on Allow. The stills are then named by hand (T01_<what>_<mode>.png).
 *
 * The set (Heartwood) is set down after TAPE_WATCH seconds, as a visitor may; the walk watched it to its end (117 s).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'desktop');
const XR = MODE === 'xr';
const OUT = path.resolve(flag('out', `out/s421/${MODE}`));
const TAPE_WATCH = Number(flag('tape', 30));
const VIEW = XR ? { width: 1000, height: 1000 } : { width: 1280, height: 800 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/** the route: the jobs a visitor works through, in order, and how long she reads first (seconds from the control appearing) */
const ROUTE = [
  ['signin', 3],
  ['consent-allow', 5],
  ['task-0', 6],
  ['apply', 5], ['apply', 6], ['apply', 6],
  ['vera-send', 5],
  ['board-back', 6],   // the receipt; then her own 2014 cut is on the editor
  ['board-back', 8],
  ['task-1', 9],
  ['places-add', 6],
  ['board-back', 5],
  ['task-2', 5],
  ['family-reply-r_patience', 7],
  ['family-sel-1', 3],
  ['family-reply-r_grief', 9],   // Annette: a refusal here keeps the job open (the shift's ladder); the walk answered both
  ['board-back', 4]
];
/** and what the piece brings to her on its own time: each pressed once, whenever it is up (after its reading time), and
 *  before the next job — a card, a pop-in, a call, a page that only exists while it is up. `after`: only once that one
 *  was pressed. The set is put down once it has played TAPE_WATCH seconds (or ended). */
const CONTEXT = [
  ['focus-later', 5], ['pause-close', 8], ['lg-take@call', 4],
  ['update-accept', 5], ['vera-as-sent', 6], ['vera-record-close', 6, 'vera-as-sent'],
  ['kit-popin-open', 4], ['vera-take-down', 7], ['vera-kit-close', 6, 'vera-take-down'],
  ['malta-alert-ok', 6], ['mirror:reply-bea', 4], ['takeover-alert-ok', 6]
];

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { ...VIEW, deviceScaleFactor: 1 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('error', (e) => console.log('PAGE CRASHED', String(e).slice(0, 200)));
page.on('close', () => console.log('PAGE CLOSED'));
browser.on('disconnected', () => console.log('BROWSER DISCONNECTED'));
browser.on('targetdestroyed', (t) => console.log('TARGET DESTROYED', t.type(), t.url().slice(0, 80)));
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('NAVIGATED', f.url().slice(0, 120)); });
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__camPose, { timeout: 180000 });
await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
await wait(4000);
// the review panel's ⚙ pill (debug=1 only, no id): not something a visitor sees
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
    // the headset draws the room through the seat's calibration (src/frame/xrComfort.ts): a target is where its PHYSICAL
    //   point projects, so the projection the target reader uses goes through physicalPoint first
    const w2s = head.camera.worldToScreen.bind(head.camera);
    head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}   // on the computer the camera is left where the era's arrival puts it: the seat, as a visitor sees it

/** the state that decides what a still is OF (no clock, no typing: those change nothing here) */
const sigOf = () => page.evaluate(() => {
  const os = window.__os, q = window.__graceQueue?.();
  const g = {};
  try { const v = os.lambyGuide?.view; g.lg = v && !v.hidden && v.text ? String(v.text).slice(0, 40) : ''; } catch { g.lg = ''; }
  if (q && os.desktopEra === 'e3') {
    const ph = q.phone;
    g.q = [q.mode, q.veraPage ?? '', q.openSurface?.id ?? '', q.kitPopin ? 'kitpop' : '', q.storyOffer ? 'offer' : '', q.maltaAlertT >= 0 ? 'alert' : '',
      q.pauseOpen ? 'week' : '', q.focusOpen ? 'focus' : '', q.takenDown ? 'down' : '', q.ownCutShown ? 'own' : '', q.storyDone ? 'done' : '',
      (q.lambLines || []).join('/').slice(0, 30), ph?.screen ?? '', ph?.stage ?? '', ph?.takeoverAlert ? 'talert' : '',
      'n' + (ph?.newsN ?? 0), 'c' + Math.floor((ph?.cascadeN ?? 0) / 4), 'r' + (ph?.removed?.size ?? 0), ph?.replyOffered ? 'reply' : ''].join('|');
  }
  if (os.updateApp?.visible) g.upd = os.updateApp.phase;
  const tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
  g.tv = tv ? `${tv.pose}/${tv.state}` : '';
  return JSON.stringify(g);
});

const t0 = { at: 0 };
const log = [];
let shotN = 0, lastSig = '', sigSince = Date.now(), shotSigs = new Set();
const shoot = async (why) => {
  const sig = await sigOf();
  const name = `${String(++shotN).padStart(3, '0')}_${why.replace(/[^a-z0-9@:-]+/gi, '-').slice(0, 40)}.png`;
  await page.screenshot({ path: path.join(OUT, name) });
  const ds = await page.evaluate(() => window.__drawCalls ?? null);
  log.push({ n: shotN, file: name, why, t: t0.at ? Math.round((Date.now() - t0.at) / 100) / 10 : null, sig, drawCalls: ds });
  shotSigs.add(sig);
  console.log(name, log[log.length - 1].t, sig.slice(0, 160));
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
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up();
  }
  return true;
};

const started = Date.now();
let step = 0;
const seenAt = new Map(), done = new Set();
let tvHeldAt = 0, lastTimed = 0;
const HARD_STOP = 18 * 60 * 1000;
/** a counter that moves whenever anything a press can change has changed (the platform, the phone, the set, the OS) */
const moved = () => page.evaluate(() => {
  const q = window.__graceQueue?.(), tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
  return [q?.version ?? 0, tv?.pose, tv?.state, tv?.userPaused, window.__os?.updateApp?.phase ?? '', (window.__ledger?.()?.records || []).length].join('|');
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
  if (stable >= 900 && !shotSigs.has(sig)) await shoot(step < ROUTE.length ? 'before-' + ROUTE[step][0] : 'after');
  // the phone's own beats change their words without changing the state (the Notes typing, the group's messages landing,
  //   the cascade): a still every few seconds while one is on the glass
  const phScreen = (g.q || '').split('|')[12];
  if (/^(notes|group|article)$/.test(phScreen) && Date.now() - lastTimed > 4000) { lastTimed = Date.now(); await shoot('during-' + phScreen); }
  if (g.upd === 'notify' && stable >= 2500) { await shoot('update-notification'); break; }
  const s = await readVisitorState(page, VIEW);
  const live = new Set(s.targets.map((t) => t.id));
  for (const id of live) if (!seenAt.has(id)) seenAt.set(id, Date.now());
  for (const id of [...seenAt.keys()]) if (!live.has(id)) seenAt.delete(id);
  const readFor = (id) => (Date.now() - (seenAt.get(id) ?? Date.now())) / 1000;
  // the set in her hands: she watches TAPE_WATCH seconds of it (or to its end), then sets it down
  const held = /^held/.test(g.tv);
  if (held && !tvHeldAt) tvHeldAt = Date.now();
  if (held && live.has('tv-body@2016') && ((Date.now() - tvHeldAt) / 1000 >= TAPE_WATCH || /ended/.test(g.tv))) {
    if (await doPress('tv-body@2016', sig, 'context')) { tvHeldAt = 0; continue; }
  }
  if (stable >= 700 && !held && !/lifting|returning|coming/.test(g.tv)) {
    const ctx = CONTEXT.find(([id, dwell, after]) => !done.has(id) && live.has(id) && readFor(id) >= dwell && (!after || done.has(after)));
    if (ctx) { if (await doPress(ctx[0], sig, 'context')) { done.add(ctx[0]); continue; } }
    // the next job, unless something is in front of the screen (the set held before her takes the press)
    // a tile pressed while a card stood in front of it (the headset's call card, the set) did not open its job: go back one
    if (step > 0 && step < ROUTE.length && ROUTE[step - 1][0].startsWith('task-') && !live.has(ROUTE[step][0]) && live.has(ROUTE[step - 1][0])
      && readFor(ROUTE[step - 1][0]) > 12) { console.log('RETRY', ROUTE[step - 1][0]); step--; }
    if (step < ROUTE.length) {
      const [id, dwell] = ROUTE[step];
      if (live.has(id) && readFor(id) >= dwell) { if (await doPress(id, sig, 'job')) { step++; continue; } }
    }
  }
  await wait(400);
}
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify({ mode: MODE, view: VIEW, route: ROUTE, log, errors }, null, 1));
console.log('done', shotN, 'stills; route step', step, 'of', ROUTE.length, '; errors', errors.length);
await browser.close();
