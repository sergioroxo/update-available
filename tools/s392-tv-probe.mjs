#!/usr/bin/env node
/**
 * ⚑ S392 (UiB job 26 Part B6) — THE THREE TVs (option A, the margin drawn live), PRESSED THE WAY A VISITOR PRESSES THEM,
 * IN THREE LOOK-MODES. Grown from tools/s390-tv-probe.mjs (job 25), whose header follows; what changed: the moment plays the
 * tape FROM ITS START and must stop by itself at End of Part 1 (Part A's `partOneEnd`); 1997 and 2016 open on Lamby's call
 * (desktop: its Take me there is pressed through the guide — a review aid; phone: the call is left to time out; headset: it
 * is closed with ×, so all three ways are seen); the margin panel's capital height is measured from the seat (computer and
 * phone in CSS px, the headset in degrees) and its uploads counted; ▶ at the end card plays on from there; 2016's trailers
 * show only pause; the Close's website plays the WEB copy from the TV's place and carries the break and the sources.
 *
 *     node tools/s392-tv-probe.mjs --port 5462 [--out out/s392/probe] [--mode desktop|xr|phone|all] [--only 1997|2016|2026]
 *
 * Per room: the era by its review route (1997: the short door, Log in, the desktop; 2016: `?era=3` at the board; 2026:
 * `?era=4`), the era's moment ARMED through `__teachingTv.arm` (a review aid: the walk proves each beat is reached by
 * clicking; this proves the TV), then:
 *  · THE MOMENT: the TV turns on with its leader, the view is conducted to it (its yaw, pitch and seconds measured), the
 *    short tape plays with sound (the autoplay flag + the element's own state), ends on its chapter list, and the view is
 *    taken back to the seat; the seconds it cost;
 *  · SEEN AND READ (B5): the glass's picture measured from the seat while it plays — its height in CSS px on the computer
 *    and the phone and in degrees in the headset, the record card's quote line (48 px of a 1080 frame) and the tape's
 *    caption (measured on its own frames: CAPTION below) in the same units; the glass centre projected at several pitches
 *    from the seat's rest yaw and from the TV's yaw; draw calls (20 frames, max) at the TV and at the seat;
 *  · UPLOADS: the TV's own draws (each draw is one upload of its glass) per second while playing, and none while paused
 *    or stopped (plus the global `__uploads` counter for context);
 *  · THE CONTROLS, each pressed at its place in the room (a real mouse press; the emulated headset's controller ray and
 *    select; a touch tap): ▶ on the list (the rest of the tape, from the first part the short tape did not show), ❚❚ (the
 *    picture), ⏭, ⏮, ⏏, ▶ again (from where it stopped), a chapter row, and in 2016 Skip Ad on a mid-roll once the tape
 *    shows its button;
 *  · LEAVE AND COME BACK: the view turned back to the desk and to the TV again; the place is unchanged and ▶ resumes it;
 *  · THE STORY SPEAKS: a voice arrives while the tape plays (a toast; 2016 a Lambient line) and the TV pauses itself;
 *  · THE UPDATE: the era's update is armed while it plays and the TV stops, its place kept;
 *  · THE CLOSE: the era's website opened at its Media tab in the site viewer (the DOM window; the headset's plane), the
 *    tape's film pressed, and it starts where the TV left it.
 * Writes report.json and photographs; exit 1 on any failed check. Needs a Vite dev server on --port.
 * ⚑ Chrome runs with `--disable-audio-output` (its fake audio sink): on 15 Nov this machine's audio device stopped opening
 * for headless Chrome, and a playing element with sound then holds its clock at 0:00 (the TV's own stall watchdog plays it
 * on muted, which is right for a visitor and wrong for a probe of the sound path). With the fake sink the element plays
 * unmuted and its clock moves; whether it is heard is his ears' to say.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s392/probe'));
const MODE = flag('mode', 'all');
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TAPES = JSON.parse(fs.readFileSync('data/room/teaching_tapes.json', 'utf8')).tapes;
const TVJ = JSON.parse(fs.readFileSync('data/room/teaching_tvs.json', 'utf8'));
const SPECS = TVJ.tvs, PANEL = TVJ.panel;
/** the tapes' own type, measured on their frames (fraction of the frame's height): the record card's quote line is 48 px of a
 *  1080 frame in all three (the shared card, Part A); the captions are each tape's own (1997 line-21 caps, 2016 the
 *  platform's subtitle, 2026 the campaign's huge captions) */
const ROOMS = [
  { tape: '1997', era: 1, seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 }, update: 'u2', year: '1997' },
  { tape: '2016', era: 3, seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 }, update: 'u4', year: '2016' },
  { tape: '2026', era: 4, seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 }, update: 'close', year: '2026' }
];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const checks = [];
const measures = {};
const check = (mode, tape, name, ok, extra = '') => { checks.push({ mode, tape, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode} ${tape}] ${name}${extra ? '  ' + extra : ''}`); };

async function room(r, mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { await page.screenshot({ path: path.join(OUT, `${mode}-${r.tape}-${String(++n).padStart(2, '0')}-${label}.png`) }); };
  const C = (name, ok, extra) => check(mode, r.tape, name, ok, extra);
  const M = measures[`${mode}-${r.tape}`] = {};
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__teachingTv && window.__camPose && window.__os, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(5000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (r.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (r.era === 3) await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  await wait(1500);
  // the audible element, for the sound check (headless autoplay flag; the element's own state is the evidence)
  const tvd = () => page.evaluate((t) => { const d = window.__teachingTv(); return { ...d.tvs.find((x) => x.tape === t), moment: d.moments[t] }; }, r.tape);
  const draws = () => page.evaluate(async () => { const a = []; for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return { min: Math.min(...a), max: Math.max(...a) }; });

  /** the glass (its four corners and centre) and where they land, from wherever the eye is now */
  const glass = () => page.evaluate(({ tape, VW, VH, letterbox, xr }) => {
    const app = window.__app, ent = app.root.findByName(`teaching-tv-${tape}`);
    if (!ent) return null;
    const m = ent.getWorldTransform().data, V = app.root.getPosition().constructor;
    // in the emulated headset the room is placed in LOGICAL metres and the head in PHYSICAL ones (xrComfort maps one to the
    //   other at calibration): every point is taken into the head's frame before it is measured
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    const at = (u, v) => phys(new V(m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]));
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const ph = letterbox ? 540 / 720 : 1;   // the picture's share of the glass's height
    const pts = [[0, 0], [-0.5, -ph / 2], [0.5, -ph / 2], [-0.5, ph / 2], [0.5, ph / 2]].map(([u, v]) => cam.camera.worldToScreen(at(u, v)));
    const eye = cam.getPosition(), c = at(0, 0), top = at(0, -ph / 2), bot = at(0, ph / 2);
    const ang = (a, b) => { const da = a.clone().sub(eye).normalize(), db = b.clone().sub(eye).normalize(); return Math.acos(Math.max(-1, Math.min(1, da.dot(db)))) * 180 / Math.PI; };
    const onScreen = pts.every((p) => p.z > 0 && p.x >= 0 && p.y >= 0 && p.x <= VW && p.y <= VH);
    return { centre: { x: pts[0].x, y: pts[0].y, z: pts[0].z }, picH: Math.abs(((pts[3].y + pts[4].y) - (pts[1].y + pts[2].y)) / 2), picW: Math.abs(((pts[2].x + pts[4].x) - (pts[1].x + pts[3].x)) / 2),
      degH: ang(top, bot), dist: c.clone().sub(eye).length(), onScreen, world: { x: c.x, y: c.y, z: c.z } };
  }, { tape: r.tape, VW, VH, letterbox: SPECS[r.tape].picture === 'letterbox', xr });

  /** where a control is: its rect on the TV canvas → the world → the screen */
  const locate = (id) => page.evaluate(({ tape, id, VW, VH }) => {
    const d = window.__teachingTv(), tv = d.tvs.find((x) => x.tape === tape);
    const hr = tv.hits.filter((h) => h.id === id).pop(); if (!hr) return { ids: tv.hits.map((h) => h.id) };
    const app = window.__app, ent = app.root.findByName(tv.entity), m = ent.getWorldTransform().data;
    const u = (hr.x + hr.w / 2) / tv.LW - 0.5, v = (hr.y + hr.h / 2) / tv.LH - 0.5;
    const w = { x: m[12] + u * m[0] + v * m[8], y: m[13] + u * m[1] + v * m[9], z: m[14] + u * m[2] + v * m[10] };
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const V = app.root.getPosition().constructor, p = cam.camera.worldToScreen(new V(w.x, w.y, w.z));
    const onScreen = p.z > 0 && p.x > 4 && p.y > 4 && p.x < VW - 4 && p.y < VH - 4;
    const el = onScreen ? document.elementFromPoint(p.x, p.y) : null;
    return { world: w, screen: { x: p.x, y: p.y }, onScreen, covered: el && el.tagName !== 'CANVAS' ? el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30) : null };
  }, { tape: r.tape, id, VW, VH });
  const press = async (id, settle = 900) => {
    const at = await locate(id);
    if (!at.world) { C(`control "${id}" is published`, false, `live: ${(at.ids || []).join(',')}`); return false; }
    if (!xr && (!at.onScreen || at.covered)) { C(`"${id}" is on screen and uncovered`, false, JSON.stringify(at.screen) + (at.covered ? ' covered by ' + at.covered : '')); return false; }
    if (xr) {
      // a headset press is refused while the comfort dissolve of a conducted cut is still running (app.ts onSelect): wait
      for (let k = 0; k < 20 && (await page.evaluate(() => window.__xrComfort.busy || window.__camPose().driven)); k++) await wait(250);
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        const target = c.physicalPoint(origin.clone().set(p.x, p.y, p.z));
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, at.world);
      await wait(200);
      await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    } else if (phone) await page.touchscreen.tap(at.screen.x, at.screen.y);
    else { await page.mouse.move(at.screen.x, at.screen.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(settle);
    return true;
  };
  /** ⏮ ⏭ ⏏ are drawn while the tape is paused or stopped on the 1997 VCR and the 2016 player (while it plays the picture is
   *  the pause control, as on the period's own players); 2026's band shows them always. A visitor pauses first. */
  const nav = async (id, settle) => {
    let d = await tvd();
    if (d.state === 'playing' || d.state === 'loading') await press('tv-pause', 900);
    // a DVD's trailer offers only ▶/❚❚ (by design, checked on its own below): step past it to test ⏮ ⏭ ⏏ (a review aid)
    d = await tvd();
    if (d.chapterKind === 'trailer') {
      const T2 = TAPES[r.tape], ch = T2.chapters.find((c) => c.kind === 'trailer' && d.t >= c.start - 0.01 && d.t < c.end);
      await page.evaluate((tape, t) => window.__teachingTv.play(tape, t), r.tape, (ch?.end ?? d.t) + 0.6); await wait(1500);
      await press('tv-pause', 900);
    }
    return press(id, settle);
  };
  /** turn the eye: the TV, or back to the seat (the computer's free camera; the headset's head) */
  const look = async (target) => {
    if (xr) {
      await page.evaluate((p, s) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        if (!p) { head.setLocalEulerAngles(0, 0, 0); return; }
        const t = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z)), o = head.getPosition(), d = t.clone().sub(o);
        head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
      }, target, r.seat);
    } else {
      await page.evaluate((p, s) => {
        if (!p) { window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw); return; }
        const dx = p.x - s.x, dy = p.y - s.y, dz = p.z - s.z;
        window.__camFree(s.x, s.y, s.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI);
      }, target, r.seat);
    }
    await wait(700);
  };
  const tvWorld = { x: SPECS[r.tape].glass.pos[0], y: SPECS[r.tape].glass.pos[1], z: SPECS[r.tape].glass.pos[2] };

  /** the margin panel: its centre on screen, whether it is in frame, and its capital height from the eye (CSS px; degrees) */
  const panelRead = () => page.evaluate(({ tape, VW, VH, xr, P }) => {
    const d = window.__teachingTv(), tv = d.tvs.find((x) => x.tape === tape), pn = tv.panel;
    const app = window.__app, ent = app.root.findByName(`teaching-margin-${tape}`);
    if (!ent || !pn.enabled) return { enabled: false };
    const m = ent.getWorldTransform().data, V = app.root.getPosition().constructor;
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    // canvas (x, y) px → world: the plane's local X runs along the canvas's width, its local Z down the height
    const at = (cx, cy) => phys(new V(m[12] + (cx / P.canvas[0] - 0.5) * m[0] + (cy / P.canvas[1] - 0.5) * m[8],
      m[13] + (cx / P.canvas[0] - 0.5) * m[1] + (cy / P.canvas[1] - 0.5) * m[9], m[14] + (cx / P.canvas[0] - 0.5) * m[2] + (cy / P.canvas[1] - 0.5) * m[10]));
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const eye = cam.getPosition();
    const top = at(P.canvas[0] / 2, 60), capBot = at(P.canvas[0] / 2, 60 + pn.capPx);
    const s0 = cam.camera.worldToScreen(top), s1 = cam.camera.worldToScreen(capBot);
    const da = top.clone().sub(eye).normalize(), db = capBot.clone().sub(eye).normalize();
    const capDeg = Math.acos(Math.max(-1, Math.min(1, da.dot(db)))) * 180 / Math.PI;
    const corners = [[0, 0], [P.canvas[0], 0], [0, Math.min(P.canvas[1], pn.contentH)], [P.canvas[0], Math.min(P.canvas[1], pn.contentH)]].map(([x, y]) => cam.camera.worldToScreen(at(x, y)));
    const inFrame = corners.every((p) => p.z > 0 && p.x >= -2 && p.y >= -2 && p.x <= VW + 2 && p.y <= VH + 2);
    return { enabled: true, capPx: +Math.abs(s1.y - s0.y).toFixed(1), capDeg: +capDeg.toFixed(3), inFrame, lines: pn.lines, cue: pn.cue, margin: pn.margin, draws: pn.draws, dist: +top.clone().sub(eye).length().toFixed(2) };
  }, { tape: r.tape, VW, VH, xr, P: PANEL });

  try {
    // ── 1 · the moment: from the start to End of Part 1 ───────────────────
    const drawsSeat = await draws();
    await shot('seat-before');
    const T = TAPES[r.tape], hasCall = r.tape !== '2026';
    await page.evaluate((t) => window.__teachingTv.arm(t), r.tape);
    const t0 = Date.now(); const stages = {}; let playShot = false, poseAtPlay = null, callSeen = false, firstT = null, panelShot = false;
    while (Date.now() - t0 < 260000) {
      const d = await tvd(); const s = d.moment.stage;
      if (!stages[s]) { stages[s] = +((Date.now() - t0) / 1000).toFixed(1); if (s === 'arrive') await shot('moment-leader'); }
      if (s === 'arrive' && hasCall) {
        const g = await page.evaluate(() => ({ rung: window.__os.lambyGuide.view.rung, active: window.__os.lambyGuide.active, text: window.__os.lambyGuide.view.text }));
        if (g.rung === 'tvcall' && g.active && !callSeen) {
          callSeen = true; M.call = g.text;
          await shot('moment-lamby-call');
          await wait(1500);
          if (mode === 'desktop') await page.evaluate(() => { window.__os.lambyGuide.press('lg-take'); window.__os.dirty = true; });
          else if (xr) await page.evaluate(() => { window.__os.lambyGuide.press('lg-x'); window.__os.dirty = true; });
          // phone: left to its own time (the call's hold)
        }
      }
      if (s === 'play' && firstT === null && d.t !== null && d.t > 0) firstT = d.t;
      if (s === 'play' && !playShot && d.t > 6) {
        playShot = true;
        poseAtPlay = await page.evaluate(() => window.__camPose());
        await shot('moment-playing');
        const g = await glass();
        M.glass = g;
        const audible = await page.evaluate((t) => { const tv = window.__teachingTv().tvs.find((x) => x.tape === t); return { paused: tv.paused, muted: tv.muted, volume: tv.volume }; }, r.tape);
        C('the tape plays with its sound (not paused, not muted)', audible.paused === false && audible.muted === false, JSON.stringify(audible));
        // S392: in the headset too the glass must be IN the head's view (job 25 checked only its size, and missed that a cut to a
        //   facing beyond ±90° landed mirrored: xrComfort's getEulerAngles().y)
        C('the conducted turn ends with the TV whole in view', g.onScreen, JSON.stringify(g.centre));
        if (xr) M.read = { pictureDeg: +g.degH.toFixed(2), dist: +g.dist.toFixed(2) };
        else M.read = { picturePx: Math.round(g.picH), pictureWpx: Math.round(g.picW), dist: +g.dist.toFixed(2) };
        const d0 = (await tvd()).draws; const u0 = await page.evaluate(() => window.__uploads); await wait(3000);
        const d1 = (await tvd()).draws; const u1 = await page.evaluate(() => window.__uploads);
        M.uploadsPlaying = { tvPerSecond: +((d1 - d0) / 3).toFixed(1), allScreensPerSecond: +((u1 - u0) / 3).toFixed(1) };
        C('while it plays the glass is redrawn about once per frame of the tape (≤ 31 a second)', (d1 - d0) / 3 > 5 && (d1 - d0) / 3 <= 31, JSON.stringify(M.uploadsPlaying));
        M.drawsAtTv = await draws();
      }
      // the margin and the captions, read from the seat at the conducted pose, the first time the panel is up
      // (in the headset the conducted move is a cut under a one-second dissolve: read after it has committed)
      if (s === 'play' && !panelShot && (!xr || (d.t > 2 && !(await page.evaluate(() => window.__xrComfort.busy))))) {
        const pr = await panelRead();
        if (pr.enabled && (pr.margin || pr.cue)) {
          panelShot = true; M.panel = pr;
          await shot('moment-margin');
          if (xr) C('the margin and captions: capital height ≥ 1.0° in the headset', pr.capDeg >= 1.0, `${pr.capDeg}° at ${pr.dist} m`);
          else if (phone) C('the margin and captions: capital height ≥ 12 px on the phone', pr.capPx >= 12, `${pr.capPx} px`);
          else C('the margin and captions: capital height ≥ 14 px on the computer', pr.capPx >= 14, `${pr.capPx} px`);
          C('the margin panel is in the frame with the TV at the conducted pose', pr.inFrame, JSON.stringify(pr));
        }
      }
      if (s === 'after' && !stages.afterShot) {
        stages.afterShot = 1; await shot('moment-part-one-end');
        C('the tape stopped by itself at End of Part 1, on its end card', d.state === 'partOne' && Math.abs(d.t - T.partOneEnd) < 0.4 && d.place.partOneSeen, `${d.state} t ${d.t?.toFixed(2)} (Part 1 ends ${T.partOneEnd})`);
        C('at the end card the visitor\'s ▶ is offered ("Play on")', d.hits.some((h) => h.id === 'tv-play'));
      }
      if (s === 'done') break;
      await wait(400);
    }
    const dEnd = await tvd();
    M.moment = { stages, seconds: +dEnd.moment.seconds.toFixed(1), callSeconds: +(dEnd.moment.callSeconds ?? 0).toFixed(1), yawAtPlay: poseAtPlay && +poseAtPlay.yaw.toFixed(1), pitchAtPlay: poseAtPlay && +poseAtPlay.pitch.toFixed(1), firstT };
    if (hasCall) C('Lamby\'s call was said (the TV is behind/beside you; I\'ll take you there)', callSeen, M.call ?? '');
    const at = (k) => stages[k] !== undefined;
    C('the moment ran: leader → (call) → turn → the tape from its start → End of Part 1 → back to the seat', dEnd.moment.stage === 'done' && at('arrive') && at('play') && at('after') && (xr || (at('turn') && at('return'))), JSON.stringify(stages));
    C('the tape began at its start (the label)', firstT !== null && firstT < 3, `first t ${firstT}`);
    const back = await page.evaluate(() => window.__camPose());
    C('the visitor is back at the seat', Math.abs(((back.yaw - r.seat.yaw + 540) % 360) - 180) < 2 || xr, `yaw ${back.yaw.toFixed(1)}`);
    M.drawsSeat = drawsSeat;
    await shot('moment-back-at-seat');
    { const pr = await panelRead(); const p0 = pr.draws ?? 0; await wait(2500); const p1 = (await panelRead()).draws ?? 0; M.panelUploadsStill = p1 - p0; C('stopped at Part 1, the margin panel uploads nothing', p1 - p0 === 0, `${p1 - p0} in 2.5 s`); }

    // ── 2 · seen from the seat at several pitches (computer and phone) ──────
    if (!xr) {
      const sweep = {};
      const f = { yaw: Math.atan2(-(tvWorld.x - r.seat.x), -(tvWorld.z - r.seat.z)) * 180 / Math.PI };
      M.tvBearing = { yawFromSeat: +f.yaw.toFixed(1), turnFromRest: +((((f.yaw - r.seat.yaw) + 540) % 360) - 180).toFixed(1) };
      for (const [label, yaw] of [['restYaw', r.seat.yaw], ['tvYaw', f.yaw]]) {
        sweep[label] = {};
        for (const pitch of [10, 0, -10, -20]) {
          await page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), r.seat, pitch, yaw);
          await wait(250);
          const g = await glass();
          sweep[label][pitch] = { x: Math.round(g.centre.x), y: Math.round(g.centre.y), inFrame: g.onScreen };
        }
      }
      M.pitchSweep = sweep;
    }

    // ── 3 · the controls, pressed in the room ────────────────────────────────
    const vp = await tvd(); const viewPt = { x: vp.viewPoint[0], y: vp.viewPoint[1], z: vp.viewPoint[2] };
    await look(viewPt);
    await shot('look-at-end-card');
    if (await press('tv-play', 2500)) {
      const d = await tvd();
      C('▶ at the end card plays on from End of Part 1 (never a jump)', d.state === 'playing' && d.t >= T.partOneEnd - 0.2 && d.t < T.partOneEnd + 4, `t ${d.t?.toFixed(1)} Part 1 ends ${T.partOneEnd}`);
      await shot('playing-on');
    }
    // the margin's uploads while it plays: only when its words change (a caption or a margin line), never per frame
    { const p0 = (await panelRead()).draws ?? 0; await wait(4000); const p1 = (await panelRead()).draws ?? 0; M.panelUploadsPlaying4s = p1 - p0;
      const rec = await page.evaluate((t) => window.__teachingTv().tvs.find((x) => x.tape === t).panel.recent, r.tape);
      C('while it plays the margin panel uploads only when its words change (≤ 4 in 4 s)', p1 - p0 <= 4, `${p1 - p0} in 4 s; last: ${rec.slice(-5).join(' / ')}`); }
    if (await press('tv-pause', 1200)) {
      const d = await tvd();
      C('a press on the picture pauses it (❚❚)', d.state === 'paused' && d.userPaused, d.state);
      const d0 = d.draws; await wait(3000); const d1 = (await tvd()).draws;
      M.uploadsPaused = d1 - d0;
      C('paused, the glass uploads nothing', d1 - d0 === 0, `${d1 - d0} draws in 3 s`);
      await shot('paused');
    }
    // ⏭ ⏮ from a known place: a lesson after Part 1 whose neighbours are not a disc's trailer (a trailer offers only ▶/❚❚)
    { const i = T.chapters.findIndex((c, k) => c.kind === 'lesson' && c.start >= T.partOneEnd && T.chapters[k + 1]?.kind !== 'trailer' && T.chapters[k - 1]?.kind !== 'trailer');
      if (i >= 0) { await page.evaluate((tape, t) => window.__teachingTv.play(tape, t), r.tape, T.chapters[i].start + 5); await wait(1500); } }
    let ch0 = (await tvd()).chapter;
    if (await nav('tv-next', 1500)) { const d = await tvd(); C('⏭ goes to the next part', d.chapter !== ch0 && d.state === 'paused', `${ch0} → ${d.chapter}`); ch0 = d.chapter; }
    if (await nav('tv-prev', 1500)) { const d = await tvd(); C('⏮ goes back a part', d.chapter !== ch0, `${ch0} → ${d.chapter}`); }
    if (await press('tv-play', 1800)) { const d = await tvd(); C('▶ plays it again from there', d.state === 'playing', d.state); }
    // 2016's disc trailers: while one plays the only control is pause (his "this was a DVD": no skip anywhere)
    if (r.tape === '2016') {
      const tr = T.chapters.find((c) => c.kind === 'trailer');
      if (!tr) C('2016: the disc has trailers to check (placeholder tape has none)', false, 'no trailer chapter in this tape');
      else {
        await page.evaluate((t) => window.__teachingTv.play('2016', t), tr.start + 0.5); await wait(2000);
        await press('tv-pause', 1200);
        const d = await tvd();
        const ids = [...new Set(d.hits.map((h) => h.id))];
        C('during a disc trailer the controls show only ▶/❚❚ (no skip, no ⏭)', d.chapterKind === 'trailer' && !ids.some((i) => /tv-next|tv-prev|tv-eject|tv-skip/.test(i)), ids.join(','));
        await shot('trailer-paused');
      }
      const all = await page.evaluate(() => window.__teachingTv().tvs.find((x) => x.tape === '2016').hits.map((h) => h.id));
      C('no Skip Ad control exists on the 2016 TV', !all.includes('tv-skip'), all.join(','));
    }
    if (await nav('tv-eject', 1200)) {
      const d = await tvd();
      C('⏏ stops it (the place kept)', d.state === 'stopped' && d.place.t > 1, `place ${d.place.t?.toFixed(1)}`);
      const d0 = d.draws; await wait(3000); const d1 = (await tvd()).draws;
      M.uploadsStopped = d1 - d0;
      C('stopped, the glass uploads nothing', d1 - d0 === 0, `${d1 - d0} draws in 3 s`);
      await shot('ejected');
    }
    // ── 4 · leave and come back ─────────────────────────────────────────────
    const kept = (await tvd()).place.t;
    await look(null); await wait(2500); await shot('looked-away'); await look(viewPt);
    const again = await tvd();
    C('looking away and back keeps the place', Math.abs(again.place.t - kept) < 0.1 && again.state === 'stopped', `${kept.toFixed(1)} → ${again.place.t.toFixed(1)}`);
    if (await press('tv-play', 1800)) { const d = await tvd(); C('▶ resumes where it was stopped', d.state === 'playing' && Math.abs(d.t - kept) < 2.5, `t ${d.t?.toFixed(1)} kept ${kept.toFixed(1)}`); }
    // ── 5 · the story speaks ─────────────────────────────────────────────────
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = true; g.lambLines = ['…']; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toast('mum', 'Mum', '…');
      else window.__os._toast = { text: '…', t: 6 };
    }, r.tape);
    await wait(1500);
    { const d = await tvd(); C('when the story speaks (a new voice), the TV pauses itself and keeps its place', d.state === 'paused' && !d.userPaused, `${d.state} userPaused ${d.userPaused}`); await shot('story-spoke'); }
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = false; g.lambLines = null; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toasts = [];
      else window.__os._toast = null;
    }, r.tape);
    await wait(1200);
    // ── 6 · the Close: the era's website plays the web copy from the TV's place, with the break and the sources ──
    const placeT = (await tvd()).place.t;
    await page.evaluate((year) => window.__siteViewer.bus.openAt(year, 'media'), r.year);
    await wait(1800);
    const notes = await page.evaluate(() => JSON.stringify(window.__siteViewer.dom?.info?.() ?? {}).length);
    for (let i = 0; i < 10; i++) {
      const st = await page.evaluate(({ file, xr }) => {
        const core = xr ? window.__siteViewer.xr.core : window.__siteViewer.dom;
        const h = core.mediaHits().find((k) => k.type === 'film' && k.file.endsWith(file)), vp = core.info().vp;
        if (!h) return { dy: 200 };
        const top = Math.max(h.sy, vp.y), bot = Math.min(h.sy + h.h, vp.y + vp.h);
        if (bot - top > 60) { core.press(h.sx + h.w / 2, Math.round((top + bot) / 2)); return { pressed: true }; }
        return { dy: h.sy - vp.y - 20 };
      }, { file: T.web.file, xr });
      if (st.pressed) break;
      if (xr) { await page.evaluate((d) => { window.__controller.gamepad.axes = [0, 0, 0, d > 0 ? 1 : -1]; }, st.dy); await wait(500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
      else await page.evaluate((dy) => { const c = document.querySelector('#reinterp-site-viewer canvas'); const r = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }, st.dy);
      await wait(500);
    }
    await wait(3500);
    const film = await page.evaluate((xr) => (xr ? window.__siteViewer.xr.core : window.__siteViewer.dom).info().film, xr);
    await shot('close-site-film');
    // scroll down past the film to the break's text and the sources, and photograph them
    for (let i = 0; i < 3; i++) {
      if (xr) { await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 1]; }); await wait(600); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
      else await page.evaluate(() => { const c = document.querySelector('#reinterp-site-viewer canvas'); const r = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: 420, bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); });
      await wait(700);
    }
    await shot('close-site-break-text');
    await page.evaluate(() => window.__siteViewer.close()); await wait(800);
    C('at the Close the era\'s website plays the WEB copy from where the TV left it', film.file && film.file.endsWith(T.web.file) && Math.abs(film.t - placeT) < 4.5 && film.state === 'playing', `film ${film.file} ${film.state} t ${film.t?.toFixed(1)} (TV place ${placeT.toFixed(1)})`);
    // ── 7 · the update stops it ──────────────────────────────────────────────
    await look(viewPt);
    await press('tv-play', 2500);
    const before = await tvd();
    await page.evaluate((k) => window.__os.armUpdate(k), r.update);
    for (let k = 0; k < 30 && !(await page.evaluate(() => window.__os.updateArmed)); k++) {
      if (k === 4) await page.evaluate(() => { const os = window.__os; const h = os.hits?.find((x) => x.id === 'wotd-ok' || x.id === 'pause-close'); if (h) os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
      await wait(500);
    }
    await wait(1200);
    { const d = await tvd(); const u = await page.evaluate(() => ({ armed: window.__os.updateArmed, era: window.__os.era, phase: window.__os.phase }));
      C('at the era\'s update the TV stops, its place kept', d.state === 'stopped' && d.place.t >= before.t - 0.5, `${d.state} place ${d.place.t?.toFixed(1)} · update ${JSON.stringify(u)}`); M.placeAtUpdate = d.place; await shot('update-stopped'); }
  } catch (e) { errors.push(String(e).slice(0, 300)); console.error(e); }
  C('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

for (const mode of (MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE])) {
  for (const r of ROOMS) { if (!ONLY || ONLY === r.tape) { console.log(`\n── ${mode} · ${r.tape}`); await room(r, mode); } }
}
fs.writeFileSync(path.join(OUT, `report-${MODE}${ONLY ? '-' + ONLY : ''}.json`), JSON.stringify({ port: PORT, checks, measures }, null, 1));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
