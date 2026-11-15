#!/usr/bin/env node
/**
 * ⚑ S394 (UiB job 27 Part B7) — THE LAMBY SET, PRESSED THE WAY A VISITOR PRESSES IT, IN THREE LOOK-MODES. Grown from
 * tools/s392-tv-probe.mjs (job 26 B); what changed is what job 27 B changed: there is no conducted turn and no fade any
 * more — Lamby's line appears IN VIEW and the set comes to the visitor (B3), its keys, its glass and its body are pressed in
 * the hand (B2), and the margin and the captions are measured inside the set's frame (the bar under the picture).
 *
 *     node tools/s394-lamby-tv-probe.mjs --port 5194 [--out output/s394-probe] [--mode desktop|xr|phone|all] [--only 1997|2016|2026]
 *
 * Per room: the era by its review route (1997: the short door, Log in, the desktop; 2016 `?era=3` at the board; 2026
 * `?era=4`), the eye turned AWAY from the seat's rest bearing first (the computer and the phone 100° round; the headset's head
 * turned 140°, i.e. behind), the moment ARMED through `__teachingTv.arm` (a review aid: the walk proves each beat is reached
 * by clicking; this proves the set), then:
 *  · THE MOMENT: Lamby's line on the card IN VIEW wherever the eye is (the card's corners on screen; in the headset its centre
 *    within 30° of the gaze and in front); answered three ways — the computer presses its yes, the headset closes it with ×
 *    (the set still comes: the system forces), the phone lets it time out; the set comes (rest → lifting → held), whole in
 *    view, face on; the tape plays FROM ITS START with its sound and stops by itself at End of Part 1, held, ▶ ready; NO TURN:
 *    the camera's (and in the headset the rig's) yaw and pitch are unchanged by the moment;
 *  · SEEN AND READ: the picture's height (CSS px on the computer and the phone, degrees in the headset), the bar's capital
 *    heights converted the same way (≥ 1.0° in the headset), the keys on screen; the glass's uploads per second playing, none
 *    paused or stopped;
 *  · THE SET IN THE HAND, each press a real one at its place (a mouse press; the emulated headset's controller ray and select;
 *    a touch tap): ▶ plays on from End of Part 1, the glass pauses, ▶ / ❚❚ keys, ⏭ ⏮ (2016: a disc's trailer refuses them),
 *    ⏏ stops (the place kept), ▶ resumes, the body puts it back (paused where it was), a press on the set at rest brings it
 *    again, ⏻ puts it back;
 *  · LAMBY'S LATER OFFER brings the set (the guide's own act, `open:tv`), not playing;
 *  · THE STORY SPEAKS: a voice arrives while it plays in the hand: it pauses itself and goes back to its place;
 *  · THE CLOSE: the era's website plays the ROOM copy from the set's place; its HTML carries the long break and every margin
 *    line's source;
 *  · THE UPDATE: armed while it plays in the hand: it stops (the place kept) and goes back;
 *  · (headset) DRAW CALLS at the seat in twelve yaws × three pitches, and with the set held (≤ 75).
 * Writes report-<mode>.json and photographs; exit 1 on any failed check. Needs a Vite dev server on --port.
 * ⚑ Chrome runs with `--disable-audio-output` (see s392: this machine's audio device stopped opening for headless Chrome).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s394-probe'));
const MODE = flag('mode', 'all');
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TAPES = JSON.parse(fs.readFileSync('data/room/teaching_tapes.json', 'utf8')).tapes;
const TVJ = JSON.parse(fs.readFileSync('data/room/teaching_tvs.json', 'utf8'));
const WORDS = JSON.parse(fs.readFileSync('data/strings/teaching_tv.json', 'utf8'));
const ROOMS = [
  { tape: '1997', era: 1, guide: 'e1', seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 }, update: 'u2', year: '1997' },
  { tape: '2016', era: 3, guide: 'e3', seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 }, update: 'u4', year: '2016' },
  { tape: '2026', era: 4, guide: 'e4', seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 }, update: 'close', year: '2026' }
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
  const tvd = () => page.evaluate((t) => { const d = window.__teachingTv(); return { ...d.tvs.find((x) => x.tape === t), moment: d.moments[t], call: d.call, holding: d.holding }; }, r.tape);
  const draws = () => page.evaluate(async () => { const a = []; for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return Math.max(...a); });
  /** the rig and the eye's facing: yaw and pitch from the FORWARD VECTOR (never getEulerAngles().y: −90…+90 only) */
  const facing = () => page.evaluate((xr) => {
    const app = window.__app, rig = app.root.findByName('camera-rig'), head = app.root.findByName('camera');
    const yp = (f) => ({ yaw: +(Math.atan2(-f.x, -f.z) * 180 / Math.PI).toFixed(2), pitch: +(Math.asin(Math.max(-1, Math.min(1, f.y))) * 180 / Math.PI).toFixed(2) });
    const p = window.__camPose();
    return { pose: { yaw: +p.yaw.toFixed(2), pitch: +p.pitch.toFixed(2) }, rig: yp(rig.forward), head: yp(head.forward), xr };
  }, xr);
  /** a world point on the screen (the head's camera): where, whether in view, its angle from the gaze */
  const view = (pts) => page.evaluate(({ pts, VW, VH, xr }) => {
    const app = window.__app, V = app.root.getPosition().constructor;
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    const eye = cam.getPosition(), fwd = cam.forward;
    return pts.map((w) => {
      const p = phys(new V(w[0], w[1], w[2])), s = cam.camera.worldToScreen(p), d = p.clone().sub(eye);
      const ang = Math.acos(Math.max(-1, Math.min(1, d.clone().normalize().dot(fwd)))) * 180 / Math.PI;
      return { x: s.x, y: s.y, z: s.z, inView: s.z > 0 && s.x >= 0 && s.y >= 0 && s.x <= VW && s.y <= VH, ang, dist: d.length() };
    });
  }, { pts, VW, VH, xr });
  /** the angle (degrees) between two world points seen from the eye */
  const angle = (a, b) => page.evaluate(({ a, b, xr }) => {
    const app = window.__app, V = app.root.getPosition().constructor;
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    const e = cam.getPosition(), da = phys(new V(...a)).sub(e).normalize(), db = phys(new V(...b)).sub(e).normalize();
    return Math.acos(Math.max(-1, Math.min(1, da.dot(db)))) * 180 / Math.PI;
  }, { a, b, xr });
  /** press a world point the way the mode presses (a real mouse press, a touch tap, the controller's select) */
  const pressWorld = async (w, settle = 900) => {
    if (xr) {
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        const target = c.physicalPoint(origin.clone().set(p[0], p[1], p[2]));
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, w);
      await wait(200);
      await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
      await wait(settle);
      return true;
    }
    const [v] = await view([w]);
    if (!v.inView) return false;
    if (phone) await page.touchscreen.tap(v.x, v.y);
    else { await page.mouse.move(v.x, v.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(settle);
    return true;
  };
  const key = async (id, settle) => { const d = await tvd(); const k = d.targets.keys.find((x) => x.id === id); const ok = await pressWorld(k.at, settle); if (!ok) C(`the ${id} key is on screen to press`, false, ''); return ok; };
  /** turn the eye (the computer's free camera; the headset's head), relative to the seat's yaw */
  const turn = async (dyaw, pitch = 0) => {
    if (xr) await page.evaluate((dy, p) => { const head = window.__app.root.findByName('camera'); head.setLocalEulerAngles(p, dy, 0); }, dyaw, pitch);
    else await page.evaluate((s, dy, p) => window.__camFree(s.x, s.y, s.z, p, s.yaw + dy), r.seat, dyaw, pitch);
    await wait(500);
  };
  /** the picture and the bar, read from the eye: px on a screen, degrees in the headset */
  const readSet = async () => {
    const d = await tvd(), tg = d.targets;
    const [top, bot, ...keys] = await view([tg.picTop, tg.picBottom, ...tg.keys.map((k) => k.at)]);
    const picPx = Math.abs(bot.y - top.y), picDeg = await angle(tg.picTop, tg.picBottom);
    // ⚑ S394 fix — the picture is the glass above the bar (720 − the bar's height canvas px): the bar grows in a look-mode that needs it
    const picCanvas = 720 - (d.bar.barH || d.glass.barPx || 180), perCanvas = picPx / picCanvas, perDeg = picDeg / picCanvas;
    return { picPx: +picPx.toFixed(1), picDeg: +picDeg.toFixed(2), picInView: top.inView && bot.inView, keysInView: keys.every((k) => k.inView),
      capCaptionPx: +(d.bar.capCaption * perCanvas).toFixed(1), capMarginPx: +(d.bar.capMargin * perCanvas).toFixed(1),
      capCaptionDeg: +(d.bar.capCaption * perDeg).toFixed(2), capMarginDeg: +(d.bar.capMargin * perDeg).toFixed(2), bar: d.bar, scale: +d.heldScale.toFixed(3), dist: +d.heldDist.toFixed(3) };
  };

  try {
    const T = TAPES[r.tape];
    if (xr) {
      // ── the headset's draw calls, at the seat in every look: with the set, and the same look without it (the set's share; a
      //    look already over 75 without the set is the room's own, pre-existing — 2016's and 2026's turn back toward the hub) ──
      let worst = 0, at = '', share = 0, own = [];
      for (const pitch of [-20, 0, 20]) for (let y = 0; y < 360; y += 30) {
        await page.evaluate((dy, p) => { window.__app.root.findByName('camera').setLocalEulerAngles(p, dy, 0); }, y, pitch); await wait(150);
        const withSet = await draws();
        await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = false; }, r.tape); await wait(80);
        const without = await draws();
        await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = true; }, r.tape);
        share = Math.max(share, withSet - without);
        if (withSet > worst) { worst = withSet; at = `head yaw ${y}° pitch ${pitch}°`; }
        if (withSet > 75) own.push({ look: `${y}/${pitch}`, withSet, without });
      }
      M.drawsSeat = { worst, at, setShare: share, over75: own };
      C('the headset: the set adds ≤ 3 draw calls in any look from the seat (12 yaws × 3 pitches)', share <= 3, `+${share}`);
      C('the headset: ≤ 75 draw calls in every look, or already over without the set (the room\'s own, pre-existing)', own.every((o) => o.without > 75), `worst ${worst} at ${at}; over 75: ${JSON.stringify(own)}`);
    }
    // ── 1 · the moment: looking AWAY, Lamby's line in view, the set comes, Part 1 plays and stops ─────────
    const away = xr ? 140 : 100;
    await turn(away, 0);
    const f0 = await facing();
    await shot('looking-away');
    await page.evaluate((t) => window.__teachingTv.arm(t), r.tape);
    const t0 = Date.now(); const stages = {}; let callChecked = false, firstT = null, bringChecked = false, readChecked = false, sound = null;
    while (Date.now() - t0 < 200000) {
      const d = await tvd(); const s = d.moment.stage;
      if (!stages[s]) stages[s] = +((Date.now() - t0) / 1000).toFixed(1);
      if (s === 'call' && d.call.shown && !callChecked) {
        callChecked = true;
        M.call = d.call.text;
        const cw = d.call.cw, ch = d.call.ch;
        // the card's four corners and its centre, in world metres (the plane's local X across, Z down)
        const corners = await page.evaluate((name) => {
          const e = window.__app.root.findByName(name), m = e.getWorldTransform().data;
          const at = (u, v) => [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]];
          return [at(0, 0), at(-0.5, -0.5), at(0.5, -0.5), at(-0.5, 0.5), at(0.5, 0.5)];
        }, d.call.entity);
        const vs = await view(corners);
        M.callView = { centreAng: +vs[0].ang.toFixed(1), dist: +vs[0].dist.toFixed(2), corners: vs.slice(1).map((v) => [Math.round(v.x), Math.round(v.y)]) };
        C('Lamby\'s line appears IN VIEW while the eye is turned away (the whole card on screen)', vs.every((v) => v.inView), JSON.stringify(M.callView));
        if (xr) C('in the headset the card is in front of the gaze (≤ 30°), never behind', vs[0].ang <= 30 && vs[0].z > 0, `${vs[0].ang.toFixed(1)}°`);
        C('its words are the era\'s call', d.call.text === WORDS.lamby.call[r.guide], d.call.text);
        await shot('lamby-line-in-view');
        await wait(1200);
        if (mode === 'desktop') {
          const yes = d.call.hits.find((h) => h.id === 'lg-take');
          const w = await page.evaluate(({ name, x, y, cw, ch }) => { const e = window.__app.root.findByName(name), m = e.getWorldTransform().data; const u = x / cw - 0.5, v = y / ch - 0.5; return [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]]; }, { name: d.call.entity, x: yes.x + yes.w / 2, y: yes.y + yes.h / 2, cw, ch });
          await pressWorld(w, 400);
          M.callAnswer = 'Bring it here (pressed)';
        } else if (xr) {
          const x = d.call.hits.find((h) => h.id === 'lg-x');
          const w = await page.evaluate(({ name, x, y, cw, ch }) => { const e = window.__app.root.findByName(name), m = e.getWorldTransform().data; const u = x / cw - 0.5, v = y / ch - 0.5; return [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]]; }, { name: d.call.entity, x: x.x + x.w / 2, y: x.y + x.h / 2, cw, ch });
          await pressWorld(w, 400);
          M.callAnswer = '× (closed: the set still comes)';
          const g = await page.evaluate(() => window.__ledger?.guide ?? window.__ledger?.lamby ?? null);
          M.dismissLog = g ? JSON.stringify(g).slice(-160) : null;
        } else M.callAnswer = 'left to its time';
      }
      if ((s === 'bring' || s === 'play') && !bringChecked) {
        const dd = await tvd();
        if (dd.pose === 'held') {
          bringChecked = true;
          const rs = await readSet();
          M.held = rs;
          C('the set comes to the visitor: held before the eye, the picture whole in view', rs.picInView, JSON.stringify({ picPx: rs.picPx, picDeg: rs.picDeg }));
          C('held, its keys are in view (pressable)', rs.keysInView);
          if (xr) C('in the headset the picture is 25–30° tall', rs.picDeg >= 25 && rs.picDeg <= 30.5, `${rs.picDeg}° at ${rs.dist} m, ×${rs.scale}`);
          else C('on a screen the set fills most of the view (the picture ≥ 45% of the height)', rs.picPx >= VH * 0.45, `${rs.picPx} px of ${VH}`);
          await shot('set-brought');
        }
      }
      if (s === 'play' && firstT === null && d.t !== null && d.t > 0) firstT = d.t;
      if (s === 'play' && !readChecked && d.t > 18) {
        const rs = await readSet();
        if (rs.bar.capMargin > 0 && rs.bar.capCaption > 0) {
          readChecked = true; M.read = rs;
          sound = { paused: d.paused, muted: d.muted };
          await shot('playing-bar');
          if (xr) C('the bar: capitals ≥ 1.0° in the headset (caption and margin)', rs.capCaptionDeg >= 1.0 && rs.capMarginDeg >= 0.995, `caption ${rs.capCaptionDeg}° margin ${rs.capMarginDeg}°`);
          else C(`the bar: capitals ≥ ${phone ? 12 : 14} px on the ${phone ? 'phone' : 'computer'} (caption and margin, measured from the projected glass)`,
            rs.capCaptionPx >= (phone ? 12 : 14) - 0.15 && rs.capMarginPx >= (phone ? 12 : 14) - 0.15, `caption ${rs.capCaptionPx} px margin ${rs.capMarginPx} px`);
          // ⚑ S394 fix — the bar grows within the glass where a look-mode's floor needs it (the phone): its words inside it, it inside the glass
          const TVB = JSON.parse(fs.readFileSync('data/room/teaching_tvs.json', 'utf8')).bar, ink = rs.bar.ink;
          C('the bar and its words are inside the set\'s frame (the bar ≤ maxH of the 720-px glass, nothing below the glass)',
            rs.bar.barH <= TVB.maxH && rs.bar.top >= 0 && !!ink && ink.y0 >= rs.bar.top && ink.y1 <= 720 && ink.x0 >= 0 && ink.x1 <= 960, `bar ${rs.bar.barH} px from ${rs.bar.top}; ink ${JSON.stringify(ink)}`);
          const d0 = (await tvd()).draws; await wait(3000); const d1 = (await tvd()).draws;
          M.uploadsPlaying = +((d1 - d0) / 3).toFixed(1);
          C('while it plays the glass is redrawn about once per frame of the tape (≤ 31 a second)', (d1 - d0) / 3 > 5 && (d1 - d0) / 3 <= 31, `${M.uploadsPlaying}/s`);
        }
      }
      if (s === 'after' && !stages.afterShot) {
        stages.afterShot = 1; await shot('end-of-part-1');
        C('the tape stopped by itself at End of Part 1, the set still held', d.state === 'partOne' && Math.abs(d.t - T.partOneEnd) < 0.4 && d.held, `${d.state} t ${d.t?.toFixed(2)} (Part 1 ends ${T.partOneEnd}) held ${d.held}`);
      }
      if (s === 'done') break;
      await wait(400);
    }
    const dEnd = await tvd();
    const f1 = await facing();
    M.moment = { stages, seconds: +dEnd.moment.seconds.toFixed(1), callSeconds: +dEnd.moment.callSeconds.toFixed(1), firstT, answer: M.callAnswer };
    C('the moment ran: call → bring → play from the start → End of Part 1 → the floor free', dEnd.moment.stage === 'done' && stages.call !== undefined && stages.bring !== undefined && stages.play !== undefined && stages.after !== undefined, JSON.stringify(stages));
    C('the tape began at its start (the label)', firstT !== null && firstT < 3, `first t ${firstT}`);
    C('it played with its sound (not paused, not muted)', sound && sound.paused === false && sound.muted === false, JSON.stringify(sound));
    C('NO TURN: the view\'s yaw and pitch are unchanged by the moment', Math.abs(f1.head.yaw - f0.head.yaw) < 0.5 && Math.abs(f1.head.pitch - f0.head.pitch) < 0.5 && Math.abs(f1.pose.yaw - f0.pose.yaw) < 0.5, `${JSON.stringify(f0)} → ${JSON.stringify(f1)}`);
    if (xr) C('NO TURN: the headset rig\'s yaw is unchanged by the moment', Math.abs(f1.rig.yaw - f0.rig.yaw) < 0.5, `${f0.rig.yaw} → ${f1.rig.yaw}`);
    C('after End of Part 1 the set waits in the hand, ▶ ready', dEnd.held && dEnd.state === 'partOne');
    if (xr) {
      // ⚑ S394 fix (his: "in Headset the white bar is in front of the buttons") — the frame's plate never over a held set: the
      //   one-time table offer forced due while it is held (and a notice), then the set put down — the offer comes then
      const OFFER = JSON.parse(fs.readFileSync('data/strings/gameMenu.json', 'utf8')).xrDeskOffer;
      await page.evaluate((t) => { window.__xrLayer.review({ offer: true }); window.__xrFrame.notice(t, 9); }, 'A frame notice, sent while the set is held');
      await wait(1600);
      const over = await page.evaluate((keyRow) => {
        const app = window.__app, c = window.__xrComfort, V = app.root.getPosition().constructor;
        let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
        const box = (pts) => { const s = pts.map((p) => cam.camera.worldToScreen(p)); return { x0: Math.min(...s.map((q) => q.x)), x1: Math.max(...s.map((q) => q.x)), y0: Math.min(...s.map((q) => q.y)), y1: Math.max(...s.map((q) => q.y)) }; };
        const row = box(keyRow.map((p) => c.physicalPoint(new V(p[0], p[1], p[2]))));
        const shown = window.__xrFrame.hintShown();
        const plate = shown ? box(shown.corners.map((p) => new V(p[0], p[1], p[2]))) : null;
        const hit = !!plate && plate.x0 < row.x1 && plate.x1 > row.x0 && plate.y0 < row.y1 && plate.y1 > row.y0;
        return { row, plate, text: shown?.text ?? null, hit, hintText: window.__xrFrame.hintText() };
      }, dEnd.targets.keyRow);
      M.heldPlate = over;
      await shot('held-no-plate');
      C('held: no frame notice or hint is up (the table offer forced due and a notice sent while it is held)', !over.plate, JSON.stringify({ text: over.text, waiting: over.hintText }));
      C('held: nothing overlaps the set\'s button row (projected rects)', !over.hit, JSON.stringify({ row: over.row, plate: over.plate }));
      M.heldKeysInView = (await view(dEnd.targets.keys.map((k) => k.at))).every((v) => v.inView);
      C('held: its buttons are fully in view', M.heldKeysInView);
      // put down: the offer that waited comes now (it is never lost)
      await pressWorld(dEnd.targets.body, 1800);
      const after = await page.evaluate(() => window.__xrFrame.hintShown());
      C('put down, the table offer that waited is shown then', !!after && (after.text === OFFER || after.text.includes('notice')), after?.text ?? 'nothing');
      await shot('put-down-offer');
      // bring it back for the presses below (the review aid: the same take the moment makes)
      await page.evaluate((t) => window.__teachingTv.take(t), r.tape); await wait(1800);
      await page.evaluate((t) => { const tv = window.__teachingTv().tvs.find((x) => x.tape === t); if (tv.state !== 'partOne') window.__teachingTv.press(t, 'tv-pause'); }, r.tape);
    }
    { const d0 = dEnd.draws; await wait(2500); const d1 = (await tvd()).draws; M.uploadsAtPartOne = d1 - d0; C('stopped at Part 1, the glass uploads nothing', d1 - d0 === 0, `${d1 - d0} in 2.5 s`); }
    if (xr) {
      // with the set in the hand, where it was brought (in front of the turned head); the same look without it gives its share
      const dc = await draws();
      await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = false; }, r.tape); await wait(80);
      const without = await draws();
      await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = true; }, r.tape);
      M.drawsHeld = { withSet: dc, without };
      C('the headset: with the set in the hand ≤ 75 draw calls (or the look already over without it), the set adding ≤ 3 (its one mesh, its glass, the ray\'s name tag on it)', (dc <= 75 || without > 75) && dc - without <= 3, `${dc} (${without} without the set)`);
    }

    // ── 2 · the set in the hand, pressed at its places ──────────────────────
    if (await key('play', 2200)) { const d = await tvd(); C('▶ (its key) plays on from End of Part 1, never a jump', d.state === 'playing' && d.t >= T.partOneEnd - 0.2 && d.t < T.partOneEnd + 4, `t ${d.t?.toFixed(1)}`); }
    { const d = await tvd(); await pressWorld(d.targets.glass, 1200); const e = await tvd(); C('a press on its glass pauses it', e.state === 'paused' && e.userPaused, e.state);
      const d0 = e.draws; await wait(3000); const d1 = (await tvd()).draws; M.uploadsPaused = d1 - d0; C('paused, the glass uploads nothing', d1 - d0 === 0, `${d1 - d0} in 3 s`); await shot('paused-in-hand'); }
    { const d = await tvd(); await pressWorld(d.targets.glass, 1500); const e = await tvd(); C('a press on its glass plays it again', e.state === 'playing', e.state); }
    if (await key('pause', 1200)) { const d = await tvd(); C('❚❚ (its key) pauses it', d.state === 'paused', d.state); }
    // ⏭ ⏮ from a lesson after Part 1 whose neighbours are not a disc's trailer
    { const i = T.chapters.findIndex((c, k) => c.kind === 'lesson' && c.start >= T.partOneEnd && T.chapters[k + 1]?.kind !== 'trailer' && T.chapters[k - 1]?.kind !== 'trailer');
      if (i >= 0) { await page.evaluate((tape, t) => window.__teachingTv.play(tape, t), r.tape, T.chapters[i].start + 5); await wait(1500); await key('pause', 900); } }
    let ch0 = (await tvd()).chapter;
    if (await key('next', 1500)) { const d = await tvd(); C('⏭ goes on a part', d.chapter !== ch0, `${ch0} → ${d.chapter}`); ch0 = d.chapter; }
    if (await key('prev', 1500)) { const d = await tvd(); C('⏮ goes back a part', d.chapter !== ch0, `${ch0} → ${d.chapter}`); }
    if (r.tape === '2016') {
      const tr = T.chapters.find((c) => c.kind === 'trailer');
      await page.evaluate((t) => window.__teachingTv.play('2016', t), tr.start + 0.5); await wait(1500);
      const before = (await tvd()).chapter;
      await key('next', 1200);
      const d = await tvd();
      C('during the disc\'s trailer ⏭ does nothing (his "this was a DVD": no skip)', d.chapter === before && d.chapterKind === 'trailer', `${before} → ${d.chapter}`);
      await key('pause', 900);
    }
    if (await key('eject', 1200)) { const d = await tvd(); C('⏏ stops it, the place kept', d.state === 'stopped' && d.place.t > 1, `${d.state} place ${d.place.t?.toFixed(1)}`);
      const d0 = d.draws; await wait(2500); const d1 = (await tvd()).draws; C('stopped, the glass uploads nothing', d1 - d0 === 0, `${d1 - d0}`); await shot('ejected'); }
    const kept = (await tvd()).place.t;
    if (await key('play', 1800)) { const d = await tvd(); C('▶ resumes where it was stopped', d.state === 'playing' && Math.abs(d.t - kept) < 2.5, `t ${d.t?.toFixed(1)} kept ${kept.toFixed(1)}`); }
    { const d = await tvd(); await pressWorld(d.targets.body, 1800); const e = await tvd();
      C('a press on its body puts it back in its place, paused where it was', e.pose === 'rest' && e.state === 'paused' && Math.abs(e.place.t - d.t) < 2.5, `${e.pose} ${e.state} place ${e.place.t?.toFixed(1)}`); await shot('put-back'); }
    // at rest: the eye turned to it (the computer and the phone turn; the headset's ray reaches it anyway), a press brings it
    { const d = await tvd(); const g = d.targets.glass;
      if (!xr) { const dx = g[0] - r.seat.x, dy = g[1] - r.seat.y, dz = g[2] - r.seat.z; await page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), r.seat, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); await wait(600); }
      await shot('at-rest-lit');
      await pressWorld(g, 1800); const e = await tvd(); C('a press on the set at rest brings it close again', e.pose === 'held', e.pose); }
    if (await key('power', 1800)) { const d = await tvd(); C('⏻ puts it back', d.pose === 'rest', d.pose); }
    // ── 3 · Lamby's later offer: its yes brings the set (the guide's own act), not playing ──
    { const due = await page.evaluate((era) => window.__teachingTv && window.__os.tvOffer?.(), r.guide);
      C('Lamby\'s one later offer is due (the tape has more, the set at rest)', !!due, String(due));
      await page.evaluate(() => window.__os.onGuideTv?.()); await wait(1800);
      const d = await tvd(); C('the offer\'s yes brings the set to the visitor (▶ stays theirs: not playing)', d.pose === 'held' && d.state !== 'playing', `${d.pose} ${d.state}`); }
    // ── 4 · the story speaks while it plays in the hand: it pauses itself and goes back ──
    await key('play', 1500);
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = true; g.lambLines = ['…']; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toast('mum', 'Mum', '…');
      else window.__os._toast = { text: '…', t: 6 };
    }, r.tape);
    await wait(1800);
    { const d = await tvd(); C('when the story speaks, the set pauses itself and goes back to its place', d.state === 'paused' && !d.userPaused && d.pose === 'rest', `${d.state} userPaused ${d.userPaused} ${d.pose}`); await shot('story-spoke'); }
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = false; g.lambLines = null; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toasts = [];
      else window.__os._toast = null;
    }, r.tape);
    await wait(1000);
    // ── 5 · the Close: the era's website plays the ROOM copy from the set's place; its HTML carries the long break + sources ──
    const placeT = (await tvd()).place.t;
    await page.evaluate((year) => window.__siteViewer.bus.openAt(year, 'media'), r.year);
    await wait(1800);
    for (let i = 0; i < 10; i++) {
      const st = await page.evaluate(({ file, xr }) => {
        const core = xr ? window.__siteViewer.xr.core : window.__siteViewer.dom;
        const h = core.mediaHits().find((k) => k.type === 'film' && k.file.endsWith(file)), vp = core.info().vp;
        if (!h) return { dy: 200 };
        const top = Math.max(h.sy, vp.y), bot = Math.min(h.sy + h.h, vp.y + vp.h);
        if (bot - top > 60) { core.press(h.sx + h.w / 2, Math.round((top + bot) / 2)); return { pressed: true }; }
        return { dy: h.sy - vp.y - 20 };
      }, { file: T.room.file, xr });
      if (st.pressed) break;
      if (xr) { await page.evaluate((d) => { window.__controller.gamepad.axes = [0, 0, 0, d > 0 ? 1 : -1]; }, st.dy); await wait(500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
      else await page.evaluate((dy) => { const c = document.querySelector('#reinterp-site-viewer canvas'); const rr = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, clientX: rr.x + rr.width / 2, clientY: rr.y + rr.height / 2 })); }, st.dy);
      await wait(500);
    }
    await wait(3500);
    const film = await page.evaluate((xr) => (xr ? window.__siteViewer.xr.core : window.__siteViewer.dom).info().film, xr);
    await shot('close-site-film');
    await page.evaluate(() => window.__siteViewer.close()); await wait(800);
    C('at the Close the era\'s website plays the ROOM copy from where the set left it', film.file && film.file.endsWith(T.room.file) && Math.abs(film.t - placeT) < 4.5 && film.state === 'playing', `film ${film.file} ${film.state} t ${film.t?.toFixed(1)} (place ${placeT.toFixed(1)})`);
    if (mode === 'desktop') {
      const html = fs.readFileSync(`public/sites/${r.year}/index.html`, 'utf8');
      const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const items = T.breakLong.sections.flatMap((s) => s.items);
      const missingItems = items.filter((it) => !html.includes(esc(it.text)) && !html.includes(it.text));
      const missingSrc = T.margin.filter((m) => !html.includes(esc(m.source)) && !html.includes(m.source));
      C('the era site carries the long break as text (every item)', missingItems.length === 0, `${items.length - missingItems.length}/${items.length}`);
      C('the era site carries every margin line\'s full source', missingSrc.length === 0, `${T.margin.length - missingSrc.length}/${T.margin.length}`);
      C('the era site plays room.mp4 (web.mp4 is not shipped) with a captions track', html.includes(`teaching/${r.tape}/room.mp4`) && html.includes(`teaching/${r.tape}/captions.vtt`) && !html.includes(`teaching/${r.tape}/web.mp4`) && !fs.existsSync(`public/assets/video/teaching/${r.tape}/web.mp4`));
    }
    // ── 6 · the update, armed while it plays in the hand: it stops and goes back ──
    if (!xr) await turn(0, r.seat.pitch); else await turn(0, 0);
    await page.evaluate((t) => window.__teachingTv.take(t), r.tape); await wait(1600);
    await key('play', 2000);
    const before = await tvd();
    await page.evaluate((k) => window.__os.armUpdate(k), r.update);
    for (let k = 0; k < 30 && !(await page.evaluate(() => window.__os.updateArmed)); k++) {
      if (k === 4) await page.evaluate(() => { const os = window.__os; const h = os.hits?.find((x) => x.id === 'wotd-ok' || x.id === 'pause-close'); if (h) os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
      await wait(500);
    }
    await wait(1600);
    { const d = await tvd(); const u = await page.evaluate(() => ({ armed: window.__os.updateArmed, era: window.__os.era }));
      C('at the era\'s update the set stops (the place kept) and goes back', d.state === 'stopped' && d.place.t >= before.t - 0.5 && d.pose === 'rest', `${d.state} ${d.pose} place ${d.place.t?.toFixed(1)} · update ${JSON.stringify(u)}`); await shot('update-stopped'); }
  } catch (e) { errors.push(String(e).slice(0, 300)); console.error(e); }
  C('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

const modes = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
for (const mode of modes) for (const r of ROOMS) { if (!ONLY || ONLY === r.tape) { console.log(`\n── ${mode} · ${r.tape}`); await room(r, mode); } }
fs.writeFileSync(path.join(OUT, `report-${MODE}${ONLY ? '-' + ONLY : ''}.json`), JSON.stringify({ port: PORT, checks, measures }, null, 1));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
