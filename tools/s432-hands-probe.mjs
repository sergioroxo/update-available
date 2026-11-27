#!/usr/bin/env node
/**
 * ⚑ S432 (UiB job 36, T96) — CONTROLLERS FIRST, HANDS AS THE BACKUP: THE HANDS' LINE, PROVED ON PRESSES.
 *
 *     node tools/s432-hands-probe.mjs --port 5823 --run <name> --out <dir> [--shots <dir>] [--build before|after]
 *
 * The headset mock of tools/s431-probe.mjs and tools/xr-layer-review.mjs: `app.xr.active` forced, the head at the seat, sources fired on
 * `app.xr.input` ('add' / 'remove' / 'selectstart' / 'select' / 'squeezestart'), so frame/xrInput.ts's own handlers and its own frame
 * loop do the rest. A CONTROLLER is a `tracked-pointer` source with no hand; a HAND is one with `hand` set (thumb and index tips). A
 * pinch closes the tips (< 22 mm) and opens them (> 32 mm) over the app's own frames; a fingertip touch brings the index tip onto the
 * target. The line is read through `__xrFrame.hintNow()` (the plate's text, a notice waiting while held included), `noticeNow()` (the
 * notice that holds the plate) and `hintShown()` (the plate is up, with its corners). Times are REAL seconds (performance.now(): the
 * notice's clock); the app's own clock is reported beside them where it matters.
 * One run per page (each page is a new visit: the line is once a visit):
 *   sequence    Room 1 (1997), A3.1 in order: controllers only, a press → no line · one controller laid on the table (Match my table)
 *               and a hand's press → no line, the match still done · the controllers out, two hands in, 120 s with nothing pressed
 *               (the hands resting, a little tremor) → no line · the first hand press (a pinch on Start) → the press lands AND the line
 *               shows, for how long · a second hand press → no line · controllers back, then out again, a hand press → no line
 *   controller  the line up, a controller picked up and its trigger pulled → the line goes at once
 *   seat        (before and after: the pair) hands only, the first hand press a pinch on Start; the still from the seat
 *   poke        the first hand press is a fingertip on the monitor's Start button → it lands and the line shows
 *   held        hands only, the 1997 Lamby set before the eyes (review aid `take`), the first hand press a pinch on its ▶ → the line
 *               waits (plate down) while it is held, then shows with its full time when a pinch on its body puts it back
 *   heldnotice  (before and after) a frame notice sent 6 s into holding the 1997 handheld, put down 3 s later by a controller press
 *               away from it: seconds it shows after
 *   menu        (before and after) stills: the seat's first line before the seat is set (xrSeat), the menu (xrHow), its Controls view
 *   card97      the 1997 call card (armed: review aid), the line up beside it: the plate against the card, in the view
 *   e3balloon   2016 played by presses to the Heartwood offer (Lambient's balloon on the glass), the line up: the plate against it
 *   close       the Close's message cards, the line up: the plate against the card's plate
 * A press is proved by reaching the desktop (os.handleClick wrapped: its pixel recorded), Start at (28, 373) of the 512 × 384 desktop,
 * aimed through the glass's own plane. The 120 s stretch is real time (the app's own clock summed beside it).
 * Writes <out>/s432_<run>_<build>.json; with --shots the stills (2560 × 1440).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launch as launch3, ff, e3, press as routePress, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const RUN = flag('run', 'sequence');
const BUILD = flag('build', 'after');
const OUT = path.resolve(flag('out', 'out/s432'));
const SHOTS = flag('shots', null) ? path.resolve(flag('shots')) : null;
fs.mkdirSync(OUT, { recursive: true }); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const LINE = JSON.parse(fs.readFileSync(new URL('../data/strings/gameMenu.json', import.meta.url), 'utf8')).xrHandsOnly ?? null;
/** one Quest-like eye (tools/s431-probe.mjs): ~104° wide, 96° tall; a 16:9 still shows its width */
const EYE_H = 52, EYE_V = 48;
const STILL_FOV = 2 * Math.atan(Math.tan(EYE_H * Math.PI / 180) * 9 / 16) * 180 / Math.PI;
const result = { run: RUN, build: BUILD, line: LINE, eye: { h: EYE_H, v: EYE_V, stillFov: +STILL_FOV.toFixed(2) }, steps: [], checks: [], stills: [], notes: [] };
const say = (m) => console.log(`[${RUN}] ${m}`);
const check = (id, what, ok, detail) => { result.checks.push({ id, what, ok: ok === null ? null : !!ok, detail }); say(`${ok === null ? 'n/a ' : ok ? 'PASS' : 'FAIL'} ${id} ${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };
const view = { width: 1280, height: 720 };

// ── the page ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let browser, page, errors = [];
const MOCK = (hide) => {
  const app = window.__app, head = app.root.findByName('camera');
  Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
  head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
  window.__aim = null;
  const w2s = head.camera.worldToScreen.bind(head.camera);
  window.__w2sPhysical = w2s;
  head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
  if (hide) app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  // the app's own clock, summed (the probe reports it beside real time)
  window.__appClock = 0; app.on('update', (dt) => { window.__appClock += dt; });
};
async function boot(url, ready) {
  browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
    defaultViewport: { ...view, deviceScaleFactor: SHOTS ? 2 : 1 } });
  page = await browser.newPage(); errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/${url}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  if (/era=1/.test(url)) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
  }
  await page.waitForFunction(ready, { timeout: 180000 });
  await wait(3000);
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(MOCK, true);
}
const q = (fn, arg) => page.evaluate(fn, arg);

// ── the inputs (page side, installed once) ───────────────────────────────────────────────────────────────────────────────────────
const INSTALL = () => {
  const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
  const S = window.__s432 = { pads: {}, hands: {}, tremor: null, clicks: [] };
  // every press that reaches the desktop (resolveTapRay → os.handleClick), with its pixel: the proof a press landed
  if (window.__os?.handleClick) { const os = window.__os, hc = os.handleClick.bind(os); os.handleClick = (x, y, ...r) => { S.clicks.push([Math.round(x), Math.round(y)]); S.clickFrom = (S.clickFrom || []).concat([String(new Error().stack).split('\n').slice(2, 7).map((l) => l.trim().replace(/\?[^:)]*/, '').slice(0, 90))]); return hc(x, y, ...r); }; }
  /** a controller: its ray from the eye along __aim (or the head's forward), or from where it lies (`at`, laid down) */
  S.addPad = (name, at) => {
    const p = { at: at ? new V(...at) : null, buttons: [{ pressed: false, touched: false }, { pressed: false, touched: false }] };
    const src = { targetRayMode: 'tracked-pointer', handedness: name === 'L' ? 'left' : 'right', hand: null,
      gamepad: { buttons: p.buttons, axes: [0, 0, 0, 0] },
      getOrigin: () => (p.at ? p.at.clone() : head.getPosition().clone()),
      getDirection: () => (p.at ? new V(0, -1, 0) : window.__aim ? window.__aim.clone() : head.forward.clone()),
      getPosition: () => (p.at ? p.at.clone() : head.getPosition().clone().add(head.forward.clone().mulScalar(0.3)).add(new V(0, -0.3, 0))),
      getRotation: () => head.getRotation().clone() };
    p.src = src; S.pads[name] = p; app.xr.input.fire('add', src); return true;
  };
  S.removePad = (name) => { const p = S.pads[name]; if (!p) return false; app.xr.input.fire('remove', p.src); delete S.pads[name]; return true; };
  /** a hand at rest: low by the lap, its ray down and forward, thumb and index tips 6 cm apart */
  const rest = (h) => {
    const E = head.getPosition(), side = h.side === 'L' ? -1 : 1;
    h.origin.copy(E).add(head.right.clone().mulScalar(0.18 * side)).add(new V(0, -0.5, 0)).add(head.forward.clone().mulScalar(0.15));
    h.dir.copy(head.forward.clone().mulScalar(0.3).add(new V(0, -1, 0))).normalize();
    h.tip.copy(h.origin).add(h.dir.clone().mulScalar(0.06)); h.thumb.copy(h.tip).add(head.right.clone().mulScalar(0.06 * side));
  };
  S.addHand = (name) => {
    const h = { side: name, origin: new V(), dir: new V(0, 0, -1), thumb: new V(), tip: new V() };
    rest(h);
    const joint = (p) => ({ getPosition: () => p.clone() });
    const src = { targetRayMode: 'tracked-pointer', handedness: name === 'L' ? 'left' : 'right', gamepad: null,
      hand: { tracking: true, wrist: null, fingers: undefined, joints: [], getJointById: (id) => id === 'thumb-tip' ? joint(h.thumb) : id === 'index-finger-tip' ? joint(h.tip) : null },
      getOrigin: () => h.origin.clone(), getDirection: () => h.dir.clone(), getPosition: () => h.origin.clone(), getRotation: () => head.getRotation().clone() };
    h.src = src; S.hands[name] = h; app.xr.input.fire('add', src); return true;
  };
  S.removeHand = (name) => { const h = S.hands[name]; if (!h) return false; app.xr.input.fire('remove', h.src); delete S.hands[name]; return true; };
  S.restAll = () => { for (const h of Object.values(S.hands)) rest(h); };
  /** a resting hand's tremor (±3 mm, the tips never closer than 5 cm): a hand on the lap is never still */
  S.tremor = (on) => {
    clearInterval(S.tremorId); if (!on) return;
    S.tremorId = setInterval(() => { for (const h of Object.values(S.hands)) { rest(h); const j = () => (Math.random() - 0.5) * 0.006; const d = new V(j(), j(), j()); h.origin.add(d); h.tip.add(d); h.thumb.add(new V(j(), j(), j()).add(d)); } }, 100);
  };
  /** A PINCH by hand `name` aimed at P (physical): the ray from a shoulder point through P; open, closed, open over the app's own frames */
  S.pinch = (name, P) => {
    const h = S.hands[name]; if (!h) return false;
    const A = new V(...P), E = head.getPosition(), side = name === 'L' ? -1 : 1;
    h.origin.copy(E).add(head.right.clone().mulScalar(0.12 * side)).add(head.up.clone().mulScalar(-0.28));
    h.dir.copy(A).sub(h.origin).normalize();
    const tips = h.origin.clone().add(h.dir.clone().mulScalar(0.12)), down = head.up.clone().mulScalar(-1);
    const sep = (s) => { h.tip.copy(tips); h.thumb.copy(tips).add(down.clone().mulScalar(s)); };
    sep(0.05); app.update(0.1); app.update(0.1);
    sep(0.01); app.update(0.1); app.update(0.1);
    sep(0.05); app.update(0.1); app.update(0.1); app.update(0.1);
    rest(h); app.update(0.1);
    return true;
  };
  /** A FINGERTIP TOUCH by hand `name` on P (physical): from 8 cm before it along the eye's line, onto it, away; thumb apart */
  S.touch = (name, P, stay = 2) => {
    const h = S.hands[name]; if (!h) return false;
    const A = new V(...P), E = head.getPosition(), d = A.clone().sub(E).normalize(), down = head.up.clone().mulScalar(-1);
    const tipAt = (p) => { h.tip.copy(p); h.thumb.copy(p).add(down.clone().mulScalar(0.06)); h.origin.copy(p).sub(d.clone().mulScalar(0.25)); h.dir.copy(d); };
    tipAt(A.clone().sub(d.clone().mulScalar(0.08))); app.update(0.1); app.update(0.1);
    tipAt(A.clone().add(d.clone().mulScalar(0.003))); for (let i = 0; i < stay; i++) app.update(0.1);
    tipAt(A.clone().sub(d.clone().mulScalar(0.08))); app.update(0.1); app.update(0.1);
    rest(h); app.update(0.1);
    return true;
  };
  /** A CONTROLLER's trigger, its ray from the eye through P (physical) or along the head; selectstart · select · selectend */
  S.trigger = (name, P) => {
    const p = S.pads[name]; if (!p) return false;
    window.__aim = P ? new V(...P).sub(head.getPosition()).normalize() : null;
    app.xr.input.fire('selectstart', p.src); const atStart = S.read();
    app.xr.input.fire('select', p.src); app.xr.input.fire('selectend', p.src);
    window.__aim = null; return atStart;
  };
  /** the plate, as the frame says it: hintNow (text, waiting notice included), noticeNow, hintShown (up, with its corners) */
  S.read = () => {
    const f = window.__xrFrame, sh = f.hintShown?.() ?? null;
    return { t: performance.now(), hintNow: (f.hintNow ?? f.hintText)?.() ?? null, noticeNow: f.noticeNow ? f.noticeNow() : 'n/a (no noticeNow in this build)', shown: sh ? sh.text : null };
  };
  /** a pixel of the desktop's own glass (the 'desktop-screen' plane: canvas px over its local ±0.5), physical */
  S.screenPx = (x, y) => {
    const e = app.root.findByName('desktop-screen'); if (!e) return null;
    const cw = 512, ch = 384, o = new V();   // the desktop's logical pixels (its texture is drawn sharper, at 4×)
    e.getWorldTransform().transformPoint(new V(x / cw - 0.5, 0, y / ch - 0.5), o);
    const p = window.__xrComfort.physicalPoint(o); return { P: [p.x, p.y, p.z], canvas: [cw, ch] };
  };
  /** a point (physical) well away from the held device, where a press puts it down (its aim says 'drop'); null if none */
  S.awayFrom = (era) => {
    const E = head.getPosition(), c = window.__xrComfort;
    for (const d of [[1.5, -0.8, 0], [-1.5, -0.8, 0], [1.2, 0.6, 0.6], [0, -1.5, 0.8], [0, 1.5, 0], [-1.2, 0.6, 0.6]]) {
      const P = E.clone().add(new V(...d));
      const r = c.logicalRay({ p0: E.clone(), p1: E.clone().add(P.clone().sub(E).normalize().mulScalar(12)) });
      const a = window.__heldDevices.aim(r, era);
      if (a && a.endsWith(':drop')) return [P.x, P.y, P.z];
    }
    return null;
  };
  /** a logical (room) point, as the physical point the mock's sources live in */
  S.phys = (p) => { const o = window.__xrComfort.physicalPoint(new V(...p)); return [o.x, o.y, o.z]; };
  /** an entity's plane corners (local ±0.5 in x and z), physical, in order round the quad */
  S.quad = (name, logical) => {
    const e = typeof name === 'string' ? app.root.findByName(name) : name; if (!e) return null;
    const m = e.getWorldTransform();
    return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, z]) => { const o = new V(); m.transformPoint(new V(x, 0, z), o); return logical ? window.__xrComfort.physicalPoint(o) : o; }).map((v) => [v.x, v.y, v.z]);
  };
  /** a canvas rect on a plane (canvas cw × ch px), physical */
  S.rectOn = (name, r, cw, ch, logical) => {
    const e = app.root.findByName(name); if (!e) return null;
    const m = e.getWorldTransform();
    return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([x, y]) => { const o = new V(); m.transformPoint(new V(x / cw - 0.5, 0, y / ch - 0.5), o); return logical ? window.__xrComfort.physicalPoint(o) : o; }).map((v) => [v.x, v.y, v.z]);
  };
  /** the head: a turn about the vertical, then a tip about its own across (no roll) */
  S.look = (yaw, pitch) => { const Q = head.getRotation().constructor; head.setLocalRotation(new Q().setFromEulerAngles(0, yaw, 0).mul(new Q().setFromEulerAngles(pitch, 0, 0))); };
  /** quads (physical) in the view of one Quest-like eye: each one's extent in degrees, whether it is whole in the eye, and which overlap */
  S.geo = (quads, EH, EV) => {
    const E = head.getPosition(), f = head.forward, u = head.up, r = head.right;
    const tan = (p) => { const v = new V(...p).sub(E), z = v.dot(f); return { x: v.dot(r) / z, y: v.dot(u) / z, z }; };
    const tx = Math.tan(EH * Math.PI / 180), ty = Math.tan(EV * Math.PI / 180);
    const out = { quads: {}, overlaps: [] };
    for (const [k, Qd] of Object.entries(quads)) {
      if (!Qd) { out.quads[k] = null; continue; }
      const a = Qd.map(tan), hs = a.map((p) => Math.atan(p.x) * 180 / Math.PI), vs = a.map((p) => Math.atan(p.y) * 180 / Math.PI);
      out.quads[k] = { h0: +Math.min(...hs).toFixed(1), h1: +Math.max(...hs).toFixed(1), v0: +Math.min(...vs).toFixed(1), v1: +Math.max(...vs).toFixed(1),
        inEye: a.every((p) => p.z > 0.05 && Math.abs(p.x) <= tx && Math.abs(p.y) <= ty) };
    }
    const keys = Object.keys(quads).filter((k) => quads[k]);
    const sat = (A, B) => {
      const a = A.map(tan), b = B.map(tan);
      if (a.some((p) => p.z <= 0.05) || b.some((p) => p.z <= 0.05)) return false;
      for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
        const p = poly[i], p2 = poly[(i + 1) % poly.length], nx = p2.y - p.y, ny = p.x - p2.x;
        const pa = a.map((v) => v.x * nx + v.y * ny), pb = b.map((v) => v.x * nx + v.y * ny);
        if (Math.max(...pa) < Math.min(...pb) - 1e-4 || Math.max(...pb) < Math.min(...pa) - 1e-4) return false;
      }
      return true;
    };
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (sat(quads[keys[i]], quads[keys[j]])) out.overlaps.push(`${keys[i]} × ${keys[j]}`);
    return out;
  };
  return true;
};
const S = (fn, arg) => page.evaluate(fn, arg);
const read = () => S(() => window.__s432.read());
const isLine = (r) => !!LINE && r?.hintNow === LINE;
const shownLine = (r) => !!LINE && r?.shown === LINE;
const step = (name, data) => { result.steps.push({ step: name, ...data }); say(`· ${name} ${JSON.stringify(data).slice(0, 400)}`); };
/** poll the plate (real time) for `ms`: did the line show, and when did it go */
async function watch(ms, every = 200) {
  const t0 = Date.now(), seen = []; let up = null, down = null, waiting = false;
  while (Date.now() - t0 < ms) {
    const r = await read();
    if (isLine(r)) waiting = true;
    if (shownLine(r) && up == null) up = r.t;
    if (up != null && !shownLine(r) && down == null) down = r.t;
    if (seen.length < 4 || seen.at(-1).hintNow !== r.hintNow || seen.at(-1).shown !== r.shown) seen.push({ dt: +((Date.now() - t0) / 1000).toFixed(2), hintNow: r.hintNow, noticeNow: r.noticeNow, shown: r.shown });
    await wait(every);
  }
  return { lineDue: waiting, upFor: up != null && down != null ? +((down - up) / 1000).toFixed(2) : up != null ? `still up after ${((Date.now() - t0) / 1000).toFixed(1)} s` : null, seen };
}
/** a plate text that is due: how long until it is up (real seconds from t0), then how long it stays up (≤ 40 s) */
async function upThenDown(text, t0) {
  let up = null;
  for (let i = 0; i < 400; i++) {
    const r = await read();
    if (up == null && r.shown === text) up = r.t;
    if (up != null && r.shown !== text) return { upAfter: +((up - t0) / 1000).toFixed(2), upFor: +((r.t - up) / 1000).toFixed(2) };
    if (up == null && r.t - t0 > 8000) return { upAfter: null, upFor: null, last: r };
    await wait(100);
  }
  return { upAfter: up == null ? null : +((up - t0) / 1000).toFixed(2), upFor: 'still up after 40 s' };
}
/** how long the line stays up from now (real seconds), polling until it goes (≤ 30 s) */
async function lineUpFor(t0) {
  for (let i = 0; i < 150; i++) { const r = await read(); if (!shownLine(r)) return +((r.t - t0) / 1000).toFixed(2); await wait(200); }
  return null;
}
const shot = async (n, what, aimDown = true) => {
  if (!SHOTS) return null;
  // the controller (if any) points down at the desk for a still; the hands rest low (their rays down, their tips apart)
  if (aimDown) await q(() => { const h = window.__app.root.findByName('camera'); window.__aim = h.forward.clone().mulScalar(0.3).add(h.up.clone().mulScalar(-1)).normalize(); window.__s432.restAll(); });
  await q(() => { const a = window.__app; a.update(0.05); a.update(0.05); });
  await wait(900);
  const file = `${n}_${what}_${RUN}_${BUILD}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) });
  const draws = await q(() => window.__drawCalls ?? null);
  const r = await read();
  result.stills.push({ file, draws, plate: r.shown });
  if (aimDown) await q(() => { window.__aim = null; });
  say(`still ${file} · draws ${draws} · plate ${JSON.stringify(r.shown)}`);
  return file;
};
/** the desktop's presses so far: how many, and the last one's pixel */
const startMenu = () => q(() => ({ n: window.__s432.clicks.length, last: window.__s432.clicks.at(-1) ?? null, startOpen: !!window.__os.startMenuOpen }));
/** a press landed on the Start button between two readings (a new desktop press, at Start's pixel) */
const landed = (a, b) => b.n > a.n && !!b.last && Math.abs(b.last[0] - 28) <= 27 && Math.abs(b.last[1] - 373) <= 10;
/** a published target's physical point (the harness's projection of the build's own controls) */
async function targetPoint(id) {
  const t = (await targets(page, view)).find((x) => x.id === id || (id instanceof RegExp && id.test(x.id)));
  if (!t?.logical) return null;
  // (the walker's published world point for a desktop control is its own estimate, off by tens of px on this glass: the glass's own
  //   plane is the truth the press resolves through, so the point is taken from it)
  const [x, y] = Array.isArray(t.logical) ? t.logical : [t.logical.x + t.logical.w / 2, t.logical.y + t.logical.h / 2];
  const g = await S(([x, y]) => window.__s432.screenPx(x, y), [x, y]);
  return { id: t.id, logical: [x, y], ...g };
}
async function room1() {
  await boot('?reinterp=1&kiosk=0&era=1&debug=1&descent=0&home=0', () => window.__app && window.__os && window.__xrComfort && window.__xrFrame && window.__teachingTv);
  await S(INSTALL);
}
async function seat(withPads = ['R', 'L']) {
  for (const n of withPads) await S((n) => window.__s432.addPad(n), n);
  await S(() => window.__app.xr.input.fire('select', window.__s432.pads.R.src));   // the first press sets the seat (xrComfort)
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}
const fovStill = () => q((fov) => { window.__app.root.findByName('camera').camera.fov = fov; }, STILL_FOV);

try {
  // ══ sequence ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'sequence') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    let start = await targetPoint(/^start(-menu)?$/);
    result.start = start;
    if (!start) check('start', "1997's Start button is published (the press target)", false, (await targets(page, view)).map((t) => t.id).slice(0, 40));
    // S1 — controllers only: a controller presses Start
    const m0 = await startMenu();
    const atStart = await S((P) => window.__s432.trigger('R', P), start.P); await ff(page, 0.3);
    const m1 = await startMenu(), w1 = await watch(2500);
    step('S1 controllers only, a controller press', { startMenu: [m0, m1], atSelectStart: atStart, watch: w1 });
    check('S1', 'controllers only: the controller press lands (on Start) and no line', landed(m0, m1) && !w1.lineDue, { startMenu: [m0, m1], seen: w1.seen });
    // S1b — Match my table: one controller laid still on the table, the other out of the hand… no: the other stays in the hand; a hand
    //   (multimodal) presses meanwhile → not alone: no line; the match still done
    await S(() => { window.__s432.removePad('L'); window.__s432.pads.R.buttons[0].touched = true; });   // R stays in the hand (a thumb on it)
    await q(() => window.__xrLayer.matchTable());
    const eye = await q(() => window.__app.root.findByName('camera').getPosition().toArray());
    await S((p) => window.__s432.addPad('L', p), [eye[0] - 0.15, eye[1] - 0.45, eye[2] - 0.25]);   // laid down, still, let go
    await S(() => window.__s432.addHand('R'));
    await wait(600);
    const askRead = await read();
    const mT0 = await startMenu();
    await S((P) => window.__s432.pinch('R', P), start.P);
    const mT1 = await startMenu(), wT = await watch(2500);
    step('S1b Match my table: a controller on the table, a hand presses', { ask: askRead, startMenu: [mT0, mT1], watch: wT });
    check('S1b', 'a controller laid on the table is present: a hand press lands (on Start) and no line; the ask stays', landed(mT0, mT1) && !wT.lineDue && wT.seen.every((s) => s.hintNow !== LINE), { startMenu: [mT0, mT1], seen: wT.seen });
    // the match runs on: 3 s grace + 1.5 s still → Done
    let done = null;
    for (let i = 0; i < 40 && !done; i++) { await wait(500); const r = await read(); if (r.hintNow && /Done/.test(r.hintNow)) done = r; }
    check('S1b-match', 'Match my table still done by the laid controller (the hand never counts)', !!done, done);
    await S(() => { window.__s432.removeHand('R'); window.__s432.pads.R.buttons[0].touched = false; });
    await S(() => window.__s432.removePad('L')); await S((n) => window.__s432.addPad(n), 'L');   // the controller picked up again
    await wait(5000);   // the Done notice (4 s) goes
    start = { ...start, ...(await S(([x, y]) => window.__s432.screenPx(x, y), start.logical)) };   // the desk moved to the table: Start with it
    result.startAfterTable = start;
    // S2 — the Quest switches to hands: both controllers out, two hands in; 120 s, nothing pressed (a film watched)
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('L'); window.__s432.addHand('R'); window.__s432.tremor(true); });
    const c0 = await q(() => window.__appClock), t0 = Date.now(), samples = [];
    while (Date.now() - t0 < 120000) {
      const r = await read();
      samples.push({ s: Math.round((Date.now() - t0) / 1000), hintNow: r.hintNow, noticeNow: r.noticeNow, shown: r.shown });
      await wait(10000);
    }
    samples.push({ s: Math.round((Date.now() - t0) / 1000), ...(await read()) });
    const c1 = await q(() => window.__appClock);
    await S(() => window.__s432.tremor(false));
    step('S2 hands only, 120 s, nothing pressed', { realSeconds: +((Date.now() - t0) / 1000).toFixed(1), appSeconds: +(c1 - c0).toFixed(1), samples });
    check('S2', 'the switch to hands and 120 s of resting hands: no line', samples.every((s) => s.hintNow !== LINE && s.noticeNow !== LINE), { realSeconds: +((Date.now() - t0) / 1000).toFixed(1), appSeconds: +(c1 - c0).toFixed(1) });
    // S3 — the first hand press: a pinch on Start → it lands and the line shows
    const m2 = await startMenu();
    await S((P) => window.__s432.pinch('R', P), start.P);
    const m3 = await startMenu(), r3 = await read();
    step('S3 the first hand press (a pinch on Start)', { startMenu: [m2, m3], read: r3 });
    check('S3', 'the first hand press lands (on Start) AND the line shows', landed(m2, m3) && isLine(r3) && shownLine(r3), { startMenu: [m2, m3], read: r3 });
    const up0 = r3.t;
    // where the plate hangs, against the monitor (pitch −10 and 0) and Lamby's balloon on the glass if any
    const geo = await S(([EH, EV]) => {
      const s = window.__s432, plate = window.__xrFrame.hintShown(); const c = plate?.corners; const pq = c ? [c[0], c[1], c[3], c[2]] : null;
      const out = {};
      for (const [name, y, p] of [['seat −10', 0, -10], ['seat 0', 0, 0], ['seat −20', 0, -20]]) { s.look(y, p); out[name] = s.geo({ plate: pq, monitor: s.quad('desktop-screen', true) }, EH, EV); }
      s.look(0, -10); return out;
    }, [EYE_H, EYE_V]);
    result.geoRoom1 = geo;
    check('S3-clear', 'the plate is in the eye and over no part of the monitor, from the seat', Object.values(geo).every((g) => !g.overlaps.length) && geo['seat −10'].quads.plate?.inEye, geo);
    await shot('01', 'line-from-seat-room1');
    const lasted = await lineUpFor(up0);
    step('S3 the line', { upForSeconds: lasted });
    check('S3-time', 'the line stays its 8 s, then goes', lasted != null && lasted >= 7.5 && lasted <= 9.5, { upForSeconds: lasted });
    await wait(1000);
    // S4 — a second hand press → no line
    const m4 = await startMenu();
    await S((P) => window.__s432.pinch('R', P), start.P);
    const m5 = await startMenu(), w4 = await watch(3000);
    step('S4 a second hand press', { startMenu: [m4, m5], watch: w4 });
    check('S4', 'a second hand press lands (on Start) and no line', landed(m4, m5) && !w4.lineDue, w4.seen);
    // S5 — controllers back, then down again, then a hand press → still no line (once a visit)
    await S(() => { window.__s432.removeHand('L'); window.__s432.removeHand('R'); window.__s432.addPad('R'); window.__s432.addPad('L'); }); await wait(1500);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('L'); window.__s432.addHand('R'); }); await wait(1500);
    const m6 = await startMenu();
    const before5 = await q(() => ({ hits: (window.__os.hits || []).map((h) => h.id), saver: !!(window.__os.saver?.on ?? window.__os.screensaver?.active ?? null) }));
    await S((P) => window.__s432.pinch('R', P), start.P);
    const m7 = await startMenu(), w5 = await watch(3000);
    const at5 = await q(() => ({ hover: window.__os.xrHover ?? null }));
    step('S5 controllers back, then down, a hand press', { startMenu: [m6, m7], before: before5, snappedTo: at5, watch: w5, clickFrom: await q(() => (window.__s432.clickFrom || []).slice(-1)) });
    // (the press is proved by reaching the desktop; the desktop's own aim snaps it to the nearest control there: Start, or what
    //   lies over it by then)
    check('S5', 'once a visit: controllers back and down again, a hand press lands on the desktop and no line', m7.n > m6.n && !w5.lineDue, { press: m7.last, snappedTo: at5, seen: w5.seen });
  }

  // ══ seat (before and after: the pair) ═════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'seat') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    const start = await targetPoint(/^start(-menu)?$/);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('L'); window.__s432.addHand('R'); });
    await wait(800);
    const m0 = await startMenu();
    await S((P) => window.__s432.pinch('R', P), start.P);
    const m1 = await startMenu(), r = await read();
    step('the first hand press (a pinch on Start), hands only', { startMenu: [m0, m1], read: r });
    check('seat', 'the press lands; the line shows (after) / nothing (before)', landed(m0, m1) && (BUILD === 'before' ? !isLine(r) : shownLine(r)), { startMenu: [m0, m1], read: r });
    await q(() => window.__s432.look(0, -10));
    await shot('01', 'line-from-seat-room1');
  }

  // ══ controller ════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'controller') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    const start = await targetPoint(/^start(-menu)?$/);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('R'); });
    await wait(800);
    await S((P) => window.__s432.pinch('R', P), start.P);
    const r0 = await read();
    check('C0', 'the line is up after the first hand press', shownLine(r0), r0);
    await wait(2000);
    // a controller picked up (the Quest switches back): its trigger pulled while the line shows
    await S(() => window.__s432.addPad('R')); await wait(300);
    const before = await read();
    const atStart = await S(() => window.__s432.trigger('R', null));
    await q(() => window.__app.update(0.05));
    const after = await read(), w = await watch(2000);
    step('C1 a controller press while the line shows', { before, atSelectStart: atStart, afterFrame: after, watch: w });
    check('C1', 'a controller press takes the line down at once (read in the same call as the selectstart)', shownLine(before) && atStart.hintNow !== LINE && atStart.noticeNow !== LINE && !w.lineDue,
      { before: before.shown, atSelectStart: atStart, afterFrame: after.shown, msFromLineUp: +(atStart.t - r0.t).toFixed(0) });
  }

  // ══ poke ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'poke') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    const start = await targetPoint(/^start(-menu)?$/);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('R'); });
    await wait(800);
    const m0 = await startMenu();
    await S((P) => window.__s432.touch('R', P), start.P);
    const m1 = await startMenu(), r = await read();
    step('P1 the first hand press is a fingertip on Start', { startMenu: [m0, m1], read: r });
    check('P1', 'a fingertip on the monitor\'s Start lands AND the line shows', landed(m0, m1) && shownLine(r), { startMenu: [m0, m1], read: r });
    const lasted = await lineUpFor(r.t);
    check('P1-time', 'the line stays its 8 s', lasted != null && lasted >= 7.5 && lasted <= 9.5, { upForSeconds: lasted });
  }

  // ══ held: the 1997 Lamby set before the eyes, the first hand press a pinch on its ▶ ═════════════════════════════════════════
  //   (the 1997 handheld cannot be the case: at this beat it has no game yet, so its keys take no touch — heldDevice.ts `touch`)
  if (RUN === 'held') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('R'); });
    await q(() => window.__teachingTv.take('1997'));   // review aid: the set brought to the eyes, as Bring it does
    let tv = null;
    for (let i = 0; i < 40; i++) { tv = await q(() => window.__teachingTv().tvs.find((t) => t.tape === '1997')); if (tv?.pose === 'held') break; await wait(250); }
    const heldNow = await q(() => !!window.__teachingTv().holding);
    check('H0', 'the 1997 Lamby set is before the eyes', tv?.pose === 'held' && heldNow, { pose: tv?.pose, holding: heldNow });
    const key = tv.targets.keys.find((k) => /play/.test(k.id)) ?? tv.targets.keys[0];
    const keyP = await S((w) => window.__s432.phys(w), key.at);
    const s0 = await q(() => window.__teachingTv().tvs.find((t) => t.tape === '1997').state);
    await S((P) => window.__s432.pinch('R', P), keyP);
    const s1 = await q(() => window.__teachingTv().tvs.find((t) => t.tape === '1997').state), r1 = await read();
    step('H1 the first hand press: a pinch on the held set\'s key', { key: key.id, state: [s0, s1], read: r1 });
    check('H1', `the set's ${key.id} is pressed (its state ${s0} → ${s1}); the line is due but waits (the plate down while held)`, s1 !== s0 && r1.hintNow === LINE && r1.noticeNow === LINE && r1.shown == null, { state: [s0, s1], read: r1 });
    await wait(6000);
    const r2 = await read();
    check('H2', '6 s on, still held: the plate stays down, the line still waiting', r2.shown == null && r2.noticeNow === LINE, r2);
    // put back as a visitor does: a press on its body (a pinch)
    const body = await S((w) => window.__s432.phys(w), (await q(() => window.__teachingTv().tvs.find((t) => t.tape === '1997').targets.body)));
    const t3 = await q(() => performance.now());
    await S((P) => window.__s432.pinch('R', P), body);
    const ud = await upThenDown(LINE, t3);
    const back = await q(() => ({ holding: !!window.__teachingTv().holding, pose: window.__teachingTv().tvs.find((t) => t.tape === '1997').pose }));
    step('H3 put back (a pinch on its body)', { back, ...ud });
    check('H3', 'put back: the line shows as soon as the set has left the eyes, with its full time (8 s)', !back.holding && ud.upFor != null && ud.upFor >= 7.5 && ud.upFor <= 9.5, { back, ...ud });
  }

  // ══ heldnotice: a frame notice sent while the 1997 handheld is held ════════════════════════════════════════════════════════
  if (RUN === 'heldnotice') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500); await ff(page, 1);
    await q(() => window.__heldDevices.take('e1', window.__app.root.findByName('camera')));
    await wait(1900);
    const held = await q(() => window.__heldDevices.held('e1'));
    check('H0', 'the 1997 handheld is before the eyes', held, held);
    await wait(6000);
    await q(() => window.__xrFrame.notice('A frame notice, sent 6 s into holding the game', 8));
    const r1 = await read();
    await wait(3000);
    // put down as a visitor does in a headset: a press away from it (heldDevice.ts: letting go leaves it in hand; a press on or near
    //   its case does nothing) — the controller's trigger, aimed where the device's own aim says 'drop'
    const away = await q(() => window.__s432.awayFrom('e1'));
    const t2 = await q(() => performance.now());
    await S((P) => window.__s432.trigger('R', P), away);
    const down2 = await q(() => !window.__heldDevices.held('e1'));
    check('N0-down', 'a controller press away from it puts it down', down2, down2);
    const ud = await upThenDown('A frame notice, sent 6 s into holding the game', t2);
    step('N1 a notice sent while held, put down 3 s later', { atSend: r1, ...ud });
    check('N1', 'the notice keeps its own 8 s after the put-down (not 8 + the seconds held before it was sent)', BUILD === 'before' ? null : ud.upFor != null && ud.upFor >= 7.5 && ud.upFor <= 9.5, ud);
  }

  // ══ menu ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'menu') {
    await room1(); await fovStill();
    await S((n) => window.__s432.addPad(n), 'R');
    // the build's own lines, wrapped as the frame wraps them (xrFrame.ts: the plate 26 px in 980, two lines at most; the menu's
    //   foot 19 px in 896 from y 698, the canvas 768 tall; the Controls view 22 px in 896, 30 a line and 8 between, from y 84,
    //   its Back row at 660); measured with this browser's own fonts
    const fit = await q(async () => {
      const copy = (await import('/data/strings/gameMenu.json')).default;
      const g = document.createElement('canvas').getContext('2d');
      const wrap = (t, px, w) => { g.font = `${px}px "Tahoma", "Verdana", sans-serif`; const out = []; let line = ''; for (const word of t.split(' ')) { const n = line ? `${line} ${word}` : word; if (g.measureText(n).width > w && line) { out.push(line); line = word; } else line = n; } if (line) out.push(line); return out; };
      const plate = (t) => t ? { lines: wrap(t, 26, 980).length, fits: wrap(t, 26, 980).length <= 2 } : null;
      const how = wrap(copy.xrHow, 19, 896), ctl = copy.controlsHeadsetLines.map((l) => wrap(l, 22, 896).length);
      const ctlBottom = 84 + ctl.reduce((a, n) => a + n * 30 + 8, 0);
      return { xrSeat: plate(copy.xrSeat), xrHandsOnly: plate(copy.xrHandsOnly ?? null), xrHow: { lines: how.length, lastBaseline: 698 + (how.length - 1) * 24 + 19, fits: 698 + (how.length - 1) * 24 + 19 <= 768 },
        controls: { linesEach: ctl, bottom: ctlBottom, backRowTop: 660, fits: ctlBottom <= 660 } };
    });
    step('M0 the lines against their plates', fit);
    check('M0-fit', 'xrSeat and xrHandsOnly in two lines on the plate; xrHow in the menu\'s foot; the Controls view above its Back row', fit.xrSeat.fits && (!fit.xrHandsOnly || fit.xrHandsOnly.fits) && fit.xrHow.fits && fit.controls.fits, fit);
    await S(() => window.__app.xr.input.fire('select', window.__s432.pads.R.src));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    await q(() => window.__s432.look(0, 0));
    await q(() => window.__xrFrame.open()); await q(() => window.__app.update(0.05)); await wait(500);
    await shot('01', 'menu-xrHow');
    // the Controls row: rows from y 84, 64 apart; the map's row only when there is a map (gameMenuBus.mapSource)
    const rows = await q(async () => { const m = await import('/src/state/gameMenuBus.ts'); return m.gameMenuBus.mapSource ? 9 : 8; });
    const pressed = await q((rows) => {
      const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor, plane = app.root.findByName('xr-frame-menu');
      const y = 84 + 64 * (rows - 3) + 26, o = new V(); plane.getWorldTransform().transformPoint(new V(0, 0, y / 768 - 0.5), o);
      const E = head.getPosition(), p1 = E.clone().add(o.clone().sub(E).mulScalar(2));
      return window.__xrFrame.press([E.x, E.y, E.z], [p1.x, p1.y, p1.z]);
    }, rows);
    await q(() => { window.__app.update(0.05); window.__app.update(0.05); }); await wait(500);
    step('M1 the Controls row pressed', { rows, pressed });
    await shot('02', 'menu-controls');
    await q(() => window.__xrFrame.close());
  }

  // ══ card97 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'card97') {
    await room1(); await seat(); await fovStill();
    await q(() => window.__os.debugJump('desktop')); await wait(2500);
    await q(() => window.__teachingTv.arm('1997'));
    let shown = false;
    for (let i = 0; i < 300 && !shown; i++) { await ff(page, 0.2); shown = await q(() => !!window.__teachingTv().call.shown); }
    check('K0', "1997's call card (armed: review aid) is up", shown, shown);
    await S(() => { window.__s432.removePad('R'); window.__s432.removePad('L'); window.__s432.addHand('R'); });
    await wait(800);
    // the pinch aimed at the ceiling (on nothing: the card is not answered)
    const P = await q(() => { const h = window.__app.root.findByName('camera'), E = h.getPosition(); return [E.x + 0.1, E.y + 1.5, E.z - 0.2]; });
    await S((P) => window.__s432.pinch('R', P), P);
    const r = await read(), still = await q(() => !!window.__teachingTv().call.shown);
    check('K1', 'a hand press on nothing: the line shows, the card still up', shownLine(r) && still, { read: r, card: still });
    const geo = await S(([EH, EV]) => {
      const s = window.__s432, tvd = window.__teachingTv(), plate = window.__xrFrame.hintShown(), c = plate?.corners;
      const card = window.__app.root.findByName(tvd.call.entity);
      const isPhysical = /^xr-/.test(card?.name ?? '');
      const out = {};
      for (const [name, p] of [['seat −10', -10], ['seat 0', 0], ['seat −20', -20]]) { s.look(0, p); out[name] = s.geo({ plate: c ? [c[0], c[1], c[3], c[2]] : null, card: s.quad(card, !isPhysical), monitor: s.quad('desktop-screen', true) }, EH, EV); }
      s.look(0, -10); return { card: tvd.call.entity, ...out };
    }, [EYE_H, EYE_V]);
    result.geoCard97 = geo;
    // (the card stands in front of the monitor's glass by design, S431: only the plate's own overlaps count)
    check('K1-clear', 'the plate covers no part of the call card (nor the monitor)', ['seat −10', 'seat 0', 'seat −20'].every((k) => !geo[k].overlaps.some((o) => o.includes('plate'))), geo);
    await shot('01', 'line-beside-call-card-1997');
  }

  // ══ e3balloon ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'e3balloon') {
    ({ browser, page, errors } = await launch3(PORT, { mode: 'xr', scale: SHOTS ? 2 : 1, width: 1280, height: 720 }));
    await page.evaluate(() => { window.__appClock = 0; window.__app.on('update', (dt) => { window.__appClock += dt; }); });
    await S(INSTALL);
    await fovStill();
    const OFFER = 'Session Two of Heartwood';
    let reached = await playTo(page, view, (s) => !!s?.guide?.text?.startsWith(OFFER) || (s?.lessons?.[0] === 'done' && s.mode === 'board' && !s.job && !s.page && !s.week),
      { limit: 200, log: (m) => say(m), heartwood: 'none' });
    for (let i = 0; i < 120 && !reached?.guide?.text?.startsWith(OFFER); i++) {
      const tg = new Set((await targets(page, view)).map((t) => t.id));
      if (reached?.guide?.balloon && !reached.guide.text?.startsWith(OFFER)) { for (const id of ['lg-ok', 'lg-later', 'lg-x']) if (tg.has(id)) { await routePress(page, view, id); break; } }
      await ff(page, 0.5);
      reached = await e3(page);
    }
    const at = await q(() => { const qq = window.__graceQueue(); return { balloon: !!qq?.lambyGuidePaint?.balloon, box: qq?.lambyGuidePaint?.box ?? null, text: window.__os.lambyGuide?.view?.text ?? null }; });
    check('B0', "2016's Heartwood offer reached by presses: Lambient's balloon on the glass", !!at.balloon && !!at.text?.startsWith(OFFER), at);
    // the Quest switches to hands: the controller out, a hand in; a pinch at the ceiling (on nothing: the offer is not answered)
    await q(() => window.__app.xr.input.fire('remove', window.__controller));
    await S(() => window.__s432.addHand('R'));
    await wait(600);
    const P = await q(() => { const h = window.__app.root.findByName('camera'), E = h.getPosition(); return [E.x + 0.1, E.y + 1.5, E.z - 0.2]; });
    await S((P) => window.__s432.pinch('R', P), P);
    const r = await read();
    const still = await q(() => { const qq = window.__graceQueue(); return { balloon: !!qq?.lambyGuidePaint?.balloon, box: qq?.lambyGuidePaint?.box ?? null }; });
    check('B1', "a hand press on nothing: the line shows, Lambient's balloon still up", shownLine(r) && still.balloon, { read: r, balloon: still });
    const geo = await S(([box, EH, EV]) => {
      const s = window.__s432, app = window.__app, plate = window.__xrFrame.hintShown(), c = plate?.corners;
      const ws = app.root.findByName('era3-device-workstation');
      const cw = 676, ch = 390;   // the workstation's logical pixels (its texture is drawn sharper, at 4×), where the balloon's box is
      const out = { canvas: [cw, ch] };
      for (const [name, p] of [['seat −10', -10], ['seat 0', 0], ['seat −20', -20]]) { s.look(0, p); out[name] = s.geo({ plate: c ? [c[0], c[1], c[3], c[2]] : null, balloon: box ? s.rectOn('era3-device-workstation', box, cw, ch, true) : null, monitor: s.quad('era3-device-workstation', true) }, EH, EV); }
      s.look(0, -10); return out;
    }, [still.box, EYE_H, EYE_V]);
    result.geoBalloon = geo;
    // (the balloon lies on the monitor's glass by design: only the plate's own overlaps count)
    check('B1-clear', "the plate covers no part of Lambient's balloon nor the monitor", ['seat −10', 'seat 0', 'seat −20'].every((k) => !geo[k].overlaps.some((o) => o.includes('plate'))), geo);
    await shot('01', 'line-with-lambient-balloon-2016');
  }

  // ══ close ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (RUN === 'close') {
    await boot('?reinterp=1&kiosk=0&close=1&debug=1&home=0', () => window.__os && window.__app && window.__closeState && window.__xrFrame);
    await S(INSTALL); await fovStill();
    await S((n) => window.__s432.addPad(n), 'R');
    let st = null;
    for (let i = 0; i < 200; i++) { st = await q(() => window.__closeState()); if (st.stage === 'message' && await q(() => !!window.__app.root.findByName('xr-close-card')?.enabled)) break; await wait(1200); }
    check('X0', "the Close's message cards are up (the card's plate)", st?.stage === 'message', st);
    await S(() => { window.__s432.removePad('R'); window.__s432.addHand('R'); });
    await wait(600);
    const P = await q(() => { const h = window.__app.root.findByName('camera'), E = h.getPosition(); return [E.x + 0.1, E.y + 1.5, E.z - 0.2]; });
    await S((P) => window.__s432.pinch('R', P), P);
    await page.waitForFunction(() => !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
    await wait(800);
    const r = await read(), card = await q(() => !!window.__app.root.findByName('xr-close-card')?.enabled);
    check('X1', 'a hand press: the line shows, the card still up', shownLine(r) && card, { read: r, card, stage: (await q(() => window.__closeState())).stage });
    const geo = await S(([EH, EV]) => {
      const s = window.__s432, plate = window.__xrFrame.hintShown(), c = plate?.corners, out = {};
      for (const [name, p] of [['seat −10', -10], ['seat 0', 0], ['seat +10', 10]]) { s.look(0, p); out[name] = s.geo({ plate: c ? [c[0], c[1], c[3], c[2]] : null, card: s.quad('xr-close-card', false) }, EH, EV); }
      s.look(0, 0); return out;
    }, [EYE_H, EYE_V]);
    result.geoClose = geo;
    check('X1-clear', "the plate covers no part of the Close's card", Object.values(geo).every((g) => !g.overlaps.length), geo);
    await shot('01', 'line-under-close-card');
  }
} catch (e) {
  result.notes.push(`stopped: ${String(e.stack || e).slice(0, 600)}`);
  say(`stopped: ${e.message}`);
}
result.draws = await page?.evaluate(() => window.__drawCalls ?? null).catch(() => null);
result.errors = errors;
const file = path.join(OUT, `s432_${RUN}_${BUILD}.json`);
fs.writeFileSync(file, JSON.stringify(result, null, 1));
const fails = result.checks.filter((c) => c.ok === false).length, passes = result.checks.filter((c) => c.ok === true).length;
say(`done · ${passes} PASS · ${fails} FAIL · draws ${result.draws} · errors ${errors.length} · ${file}`);
await Promise.race([browser?.close(), wait(6000)]);
process.exit(0);
