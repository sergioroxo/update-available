#!/usr/bin/env node
/**
 * ⚑ S430 (UiB job 39 A, B, D, E, F) — THE HEADSET ITEMS FROM HIS RUN OF 26 NOV, MEASURED AND PHOTOGRAPHED IN THE EMULATED HEADSET.
 *
 *     node tools/s430-headset-probe.mjs --port 5821 --label before|after [--out <dir>] [--only stills,recentre,table,game,batches,door]
 *
 * Two emulations, both headless Chrome, neither a Quest:
 *  · THE SESSION (recentre, table, game, batches, door): a mocked XRSession (the shape of tools/xr-monitor-check.mjs) drives
 *    PlayCanvas's real XR loop: its views, its reference space (an EventTarget, so the Quest's own recentre is its `reset`
 *    event), the ×4 screen canvases and their mip chains. The viewer's pose is ours to set each frame (`window.__viewer`).
 *    Controllers and hands are the fake sources the earlier probes fire into `app.xr.input` (xr-layer-review.mjs).
 *  · THE STILLS: the seated headset mock (`app.xr.active` forced, tools/harness/xr-mock.mjs's shape), 1280 × 720 at ×2 = 2560 × 1440.
 *
 * What each part proves (and what it cannot):
 *  A  Recentre, sampled EVERY FRAME across it: is any frame a dissolve (the view morph's plane up, `__viewMorph.visible`), and
 *     where does the room face — the logical yaw of a head looking along the space's forward (the seat's own direction) against
 *     the seat's yaw, and the eye's place against the seat's (with LEAN). The menu's row (its own two calls) and the Quest's
 *     long press (the space's `reset`, the head re-origined) each with the head turned and leaning at the moment.
 *  B  Match my table: a still HAND 0.5 m under the eye for 8 s; a still controller lying on a table (untouched); a controller
 *     held still (touched); where the desk top lands in physical space against the table.
 *  D  The phone game: per-frame uploads (count, bytes, time in texImage2D and generateMipmap, read off the device's own
 *     WebGL context), frame time and frame rate in the emulated session, the game playing and not. Headless frame rates are
 *     not the Quest's (SwiftShader or the Mac's GPU through ANGLE): the bytes and the uploads are the honest comparison.
 *  E  Every batch at its draw (the scene's precull): the box the culler uses against the box of the geometry it draws (its
 *     mesh's bounds through its node) and against the union of its props' own boxes — at rest, after a batched prop is
 *     switched off and on, after a new batched prop joins the room, and after a group is dirtied late in the frame.
 *  F  The debug panel's Enter VR (a real click: the session must start inside the gesture) at `?era=3`; the debug plate's
 *     place against the monitor's glass, seen from the seat.
 * Writes <out>/probes/s430-<label>.json and the stills to <out>/<label>/.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-27/job39/S430'));
const ONLY = flag('only', 'stills,recentre,table,game,batches,door,draws').split(',').filter(Boolean);
const want = (k) => ONLY.includes(k);
/** --shots room,door,setup: which groups of stills (default all) */
const SHOT_GROUPS = flag('shots', 'room,door,setup').split(',');
const SHOTS = path.join(OUT, LABEL);
const PROBES = path.join(OUT, 'probes');
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(PROBES, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// a run of some parts keeps the others' results from an earlier run with the same label (one file per label)
const REPORT = path.join(PROBES, `s430-${LABEL}.json`);
const PART_OF = { A: 'recentre', B: 'table', D: 'game', E: 'batches', F: 'door' };
const DRAW_CHECK = /^draw calls/;
const report = fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, 'utf8')) : { label: LABEL, checks: [], out: {} };
report.checks = report.checks.filter((c) => !(DRAW_CHECK.test(c.name) ? ONLY.includes('draws') : ONLY.includes(PART_OF[c.part])));
report.at = new Date().toISOString();
const check = (part, name, ok, extra = '') => { report.checks.push({ part, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${part}] ${name}${extra ? '  ' + extra : ''}`); };
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] });
const Q2016 = '?reinterp=1&kiosk=0&era=3&debug=1&descent=0&home=0';

// ── the session mock: PlayCanvas's own XR loop, a viewer we pose ──────────────────────────────────────────────────────────────
function xrSessionMock() {
  window.__viewer = { x: 0, y: 1.2, z: 0, yaw: 0, pitch: 0 };
  const quatOf = (yaw, pitch) => {
    const cy = Math.cos(yaw * Math.PI / 360), sy = Math.sin(yaw * Math.PI / 360), cp = Math.cos(pitch * Math.PI / 360), sp = Math.sin(pitch * Math.PI / 360);
    return { x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp };   // yaw about Y, then pitch about X
  };
  class Space extends EventTarget { getOffsetReferenceSpace() { return this; } }
  class Layer {
    static getNativeFramebufferScaleFactor() { return 1.5; }
    constructor(s, gl, options) {
      this.options = options; this.framebufferWidth = 960; this.framebufferHeight = 600; this.framebuffer = gl.createFramebuffer();
      const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING), tex = gl.getParameter(gl.TEXTURE_BINDING_2D), rb = gl.getParameter(gl.RENDERBUFFER_BINDING);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 960, 600, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      const d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, 960, 600);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, d);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.bindTexture(gl.TEXTURE_2D, tex); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    }
    getViewport(view) { return { x: view.eye === 'left' ? 0 : 480, y: 0, width: 480, height: 600 }; }
  }
  class Session extends EventTarget {
    inputSources = []; renderState = { baseLayer: null }; visibilityState = 'visible'; environmentBlendMode = 'opaque'; enabledFeatures = []; supportedFrameRates = [90]; frameRate = 90;
    updateRenderState(next) { this.renderState = { ...this.renderState, ...next }; }
    requestReferenceSpace() { const s = new Space(); window.__xrSpace = s; return Promise.resolve(s); }
    requestAnimationFrame(cb) {
      return window.requestAnimationFrame((t) => {
        if (this.ended) return;
        const v = window.__viewer, transform = new XRRigidTransform({ x: v.x, y: v.y, z: v.z }, quatOf(v.yaw, v.pitch));
        const projection = new Float32Array([1, 0, 0, 0, 0, 1.25, 0, 0, 0, 0, -1.001, -1, 0, 0, -0.10005, 0]);
        const frame = { session: this, getViewerPose: () => ({ transform, views: ['left', 'right'].map((eye) => ({ eye, projectionMatrix: projection, transform })) }), getPose: () => ({ transform }) };
        // the frame's own work on the main thread (the engine's whole tick: update, draws issued, uploads), per frame
        const t0 = performance.now(); cb(t, frame); (window.__cbMs ??= []).push(performance.now() - t0);
      });
    }
    cancelAnimationFrame(id) { window.cancelAnimationFrame(id); }
    end() { this.ended = true; this.dispatchEvent(new Event('end')); return Promise.resolve(); }
  }
  window.XRWebGLLayer = Layer;
  const xr = new EventTarget(); xr.isSessionSupported = async () => true; xr.requestSession = async () => new Session();
  Object.defineProperty(navigator, 'xr', { value: xr });
}

/** 2016 at the board, in the session (started by `app.xr.start`, as Enter VR does; F starts it by the panel's own button) */
async function session2016({ start = true, viewport = { width: 960, height: 600 }, extra = '' } = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  await page.evaluateOnNewDocument(xrSessionMock);
  await page.goto(`http://localhost:${PORT}/${Q2016}${extra}`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__xrComfort && window.__graceQueue && window.__camPose, { timeout: 240000 });
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
  await wait(1500);
  if (start) {
    await page.evaluate(() => { const a = window.__app; return new Promise((res, rej) => a.xr.start(a.root.findByName('camera').camera, 'immersive-vr', 'local', { callback: (e) => (e ? rej(e) : res()) })); });
    await page.waitForFunction(() => window.__app.xr.active && window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 60000 });
    await wait(1200);
  }
  return { page, errors };
}

/** the probes' readings, in the page */
const READ = () => {
  window.__s430 = window.__s430 ?? {};
  const S = window.__s430;
  S.yawOf = (q) => { const V = window.__app.root.findByName('camera').getPosition().constructor; const f = q.transformVector(new V(0, 0, -1)); return Math.atan2(-f.x, -f.z) * 180 / Math.PI; };
  /** the room as the head sees it: the logical facing of a head looking along the space's forward, the logical eye */
  S.room = () => {
    const app = window.__app, c = window.__xrComfort, head = app.root.findByName('camera'), rig = head.parent;
    const V = head.getPosition().constructor;
    const eye = c.logicalPoint(head.getPosition().clone());
    // a point 1 m along the space's forward from the head (the rig's own -Z, level), carried to the room
    const fwd = rig.getRotation().transformVector(new V(0, 0, -1)); fwd.y = 0; fwd.normalize();
    const ahead = c.logicalPoint(head.getPosition().clone().add(fwd));
    const d = ahead.clone().sub(eye);
    const seat = c.authored.getLocalPosition(), seatYaw = S.yawOf(c.authored.getLocalRotation());
    return { forwardYaw: Math.atan2(-d.x, -d.z) * 180 / Math.PI, seatYaw, eye: [eye.x, eye.y, eye.z], seat: [seat.x, seat.y, seat.z], status: c.status() };
  };
};

const yawDiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
const out = report.out ?? {};

try {
  // ═══ A · RECENTRE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (want('recentre')) {
    const { page, errors } = await session2016();
    await page.evaluate(READ);
    const A = out.recentre = {};
    // his run reached 2016 by the debug panel's jump, a seat change in the headset: do the same (Room 1's seat, then back)
    await page.evaluate(() => window.__camProbe(0, 0));
    await page.waitForFunction(() => !window.__xrComfort.busy && window.__xrComfort.status().cuts >= 1, { timeout: 30000 }).catch(() => {});
    await wait(800);
    await page.evaluate(() => window.__camProbe(90, -8));
    await page.waitForFunction(() => !window.__xrComfort.busy && window.__xrComfort.status().cuts >= 2, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    A.rest = await page.evaluate(() => window.__s430.room());
    // the per-frame sampler: every rendered frame, the morph and the room
    await page.evaluate(() => {
      const S = window.__s430; S.frames = []; S.sampling = false;
      window.__app.on('postrender', () => { if (!S.sampling) return; const r = S.room(); S.frames.push({ t: performance.now(), morph: !!window.__viewMorph?.visible, elapsed: r.status.elapsed, fwd: +r.forwardYaw.toFixed(2), eye: r.eye.map((v) => +v.toFixed(3)), cuts: r.status.cuts }); });
    });
    const run = async (name, act) => {
      await page.evaluate(() => { const S = window.__s430; S.frames = []; S.sampling = true; });
      await act();
      await wait(3500);
      const f = await page.evaluate(() => { const S = window.__s430; S.sampling = false; return S.frames; });
      const morphFrames = f.filter((x) => x.morph).length, dissolving = f.filter((x) => x.elapsed >= 0).length;
      const last = f.at(-1);
      const seat = await page.evaluate(() => window.__s430.room());
      const eyeErr = Math.hypot(...last.eye.map((v, i) => v - A.rest.eye[i]));
      const r = { frames: f.length, morphFrames, dissolvingFrames: dissolving, forwardYawEnd: last.fwd, seatYaw: +seat.seatYaw.toFixed(2), yawError: +yawDiff(last.fwd, seat.seatYaw).toFixed(2),
        eyeEnd: last.eye, restEye: A.rest.eye.map((v) => +v.toFixed(3)), eyeFromRest: +eyeErr.toFixed(3), firstFrames: f.slice(0, 4), lastFrames: f.slice(-2) };
      A[name] = r;
      return r;
    };
    // A2 · the Quest's own long press: he sits turned and to the side; the headset re-origins its space where his head is
    //   (the viewer is at the new origin, facing its forward) and fires `reset`
    const a2 = await run('quest', async () => {
      await page.evaluate(() => { Object.assign(window.__viewer, { x: 0.12, y: 1.16, z: 0.05, yaw: -40, pitch: -5 }); });
      await wait(600);
      await page.evaluate(() => { Object.assign(window.__viewer, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }); window.__xrSpace?.dispatchEvent(new Event('reset')); });
    });
    check('A', "Quest recentre (reset): no dissolve frame", a2.morphFrames === 0 && a2.dissolvingFrames === 0, `${a2.morphFrames} morph frames, ${a2.dissolvingFrames} dissolving, of ${a2.frames}`);
    check('A', "Quest recentre (reset): the room faces the seat's own direction", a2.yawError <= 0.5, `forward ${a2.forwardYawEnd}° vs seat ${a2.seatYaw}° (error ${a2.yawError}°)`);
    // A1 · the menu's Recentre: the head turned 35° to the left wrist, looking down, leaning 6 cm left when the menu opens; the
    //   row's own two calls (xrFrame `case 'recentre'`: onRecentre = xrComfort.calibrate, then the menu closes); the head back
    //   to sitting straight (the space's forward, the session's first place)
    const a1 = await run('menu', async () => {
      await page.evaluate(() => { Object.assign(window.__viewer, { x: -0.06, y: 1.14, z: -0.04, yaw: 35, pitch: -35 }); });
      await wait(400);
      await page.evaluate(() => window.__xrFrame.open());
      await wait(500);
      await page.evaluate(() => { Object.assign(window.__viewer, { x: -0.02, y: 1.18, z: -0.02, yaw: 10, pitch: -10 }); });   // turned to the menu's panel
      await wait(300);
      await page.evaluate(() => { window.__xrComfort.calibrate(); window.__xrFrame.close(); });
      await wait(120);
      await page.evaluate(() => { Object.assign(window.__viewer, { x: 0, y: 1.2, z: 0, yaw: 0, pitch: 0 }); });
    });
    check('A', 'menu Recentre: no dissolve frame', a1.morphFrames === 0 && a1.dissolvingFrames === 0, `${a1.morphFrames} morph frames, ${a1.dissolvingFrames} dissolving, of ${a1.frames}`);
    check('A', "menu Recentre: the room faces the seat's own direction", a1.yawError <= 0.5, `forward ${a1.forwardYawEnd}° vs seat ${a1.seatYaw}° (error ${a1.yawError}°)`);
    // the eye after each, against the seat (LEAN 0.15 forward of the authored eye is where the head is mapped)
    A.eyeAfterMenu = a1.eyeFromRest; A.eyeAfterQuest = a2.eyeFromRest;
    check('A', 'menu Recentre: the eye lands where it sat (within 2 cm of the resting eye, seat + LEAN)', a1.eyeFromRest <= 0.02, `${(a1.eyeFromRest * 100).toFixed(1)} cm`);
    // the chair under the eye: Vera's chair's real mesh (seat and back), in room coordinates
    A.chair = await page.evaluate(() => {
      const app = window.__app, e = app.root.findByName('w_chair');
      if (!e) return null;
      const box = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }, parts = [];
      e.forEach((n) => { const r = n.render; if (!r) return; for (const mi of r.meshInstances) { const pos = []; mi.mesh.getPositions(pos); const m = n.getWorldTransform(); const V = n.getPosition().constructor; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) { const w = m.transformPoint(new V(pos[i], pos[i + 1], pos[i + 2])); [w.x, w.y, w.z].forEach((v, k) => { lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); box.min[k] = Math.min(box.min[k], v); box.max[k] = Math.max(box.max[k], v); }); } parts.push({ name: n.name, material: mi.material?.name, lo: lo.map((v) => +v.toFixed(3)), hi: hi.map((v) => +v.toFixed(3)) }); } });
      // the back and arms stand above the cushion: where along the seat's axis (x, the seat faces −x) do the high vertices sit?
      const high = [], cushion = [];
      e.forEach((n) => { const r = n.render; if (!r) return; for (const mi of r.meshInstances) { const pos = []; mi.mesh.getPositions(pos); const m = n.getWorldTransform(); const V = n.getPosition().constructor; for (let i = 0; i < pos.length; i += 3) { const w = m.transformPoint(new V(pos[i], pos[i + 1], pos[i + 2])); if (w.y > 0.62) high.push([w.x, w.z]); else if (w.y > 0.38 && w.y <= 0.62) cushion.push([w.x, w.y, w.z]); } } });
      const midZ = (box.min[2] + box.max[2]) / 2;
      const backX = high.filter(([x, z]) => Math.abs(z - midZ) < 0.1).map(([x]) => x);
      return { min: box.min.map((v) => +v.toFixed(3)), max: box.max.map((v) => +v.toFixed(3)), parts,
        centreX: +((box.min[0] + box.max[0]) / 2).toFixed(3),
        backrestX: backX.length ? [Math.min(...backX), Math.max(...backX)].map((v) => +v.toFixed(3)) : null,
        cushionTop: cushion.length ? +Math.max(...cushion.map((c) => c[1])).toFixed(3) : null,
        cushionX: cushion.length ? [Math.min(...cushion.map((c) => c[0])), Math.max(...cushion.map((c) => c[0]))].map((v) => +v.toFixed(3)) : null };
    });
    A.errors = errors;
    await page.close();
  }

  // ═══ B · MATCH MY TABLE ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  if (want('table')) {
    const { page, errors } = await session2016();
    await page.evaluate(READ);
    const B = out.table = {};
    /** the desk's top, in the headset's space: Room 2's desk (w_desk) top, through the mapping */
    const deskTop = () => page.evaluate(() => {
      const app = window.__app, c = window.__xrComfort, d = app.root.findByName('w_desk');
      const V = app.root.findByName('camera').getPosition().constructor;
      let top = -1e9; d.forEach((n) => { const r = n.render; if (!r) return; for (const mi of r.meshInstances) { const pos = []; mi.mesh.getPositions(pos); const m = n.getWorldTransform(); for (let i = 1; i < pos.length; i += 3) top = Math.max(top, m.transformPoint(new V(pos[i - 1], pos[i], pos[i + 1])).y); } });
      const at = d.getPosition();
      return { logical: +top.toFixed(4), physical: +c.physicalPoint(new V(at.x, top, at.z)).y.toFixed(4), lift: +c.deskLift.toFixed(4), eye: +app.root.findByName('camera').getPosition().y.toFixed(4) };
    });
    const line = () => page.evaluate(() => window.__xrFrame?.hintText?.() ?? null);
    B.start = await deskTop();
    // a fake source in the headset's space: a hand (fingertip, palm) or a controller (grip), fixed where we put it
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
      window.__src = (kind, at, touched = false) => {
        const p = new V(at[0], at[1], at[2]);
        const joint = (dx, dy, dz) => ({ radius: 0.008, getPosition: () => p.clone().add(new V(dx, dy, dz)) });
        const joints = { 'index-finger-tip': joint(0, 0, -0.09), 'thumb-tip': joint(-0.06, 0, -0.04), 'middle-finger-metacarpal': joint(0, 0, 0), wrist: joint(0, 0, 0.06) };
        const src = kind === 'hand'
          ? { targetRayMode: 'tracked-pointer', handedness: 'right', hand: { tracking: true, getJointById: (id) => joints[id] ?? null, wrist: null, fingers: [], joints: [] },
              getOrigin: () => p.clone(), getDirection: () => new V(0, -0.2, -1).normalize(), getPosition: () => null, getRotation: () => null, gamepad: null }
          : { targetRayMode: 'tracked-pointer', handedness: 'right', hand: null,
              getOrigin: () => p.clone().add(new V(0, 0.02, -0.06)), getDirection: () => new V(0, 0, -1), getPosition: () => p.clone(), getRotation: () => head.getRotation().clone(),
              gamepad: { buttons: Array.from({ length: 7 }, (_, i) => ({ pressed: false, touched: touched && i === 6, value: 0 })), axes: [0, 0, 0, 0] } };
        app.xr.input.fire('add', src); return src;
      };
      window.__drop = (src) => app.xr.input.fire('remove', src);
    });
    const eyeY = B.start.eye;
    // B1 · a still hand, 0.5 m under the eye (his lap), from the press to 8 s after: nothing may be set
    const hand = await page.evaluateHandle((y) => window.__src('hand', [-4.45, y - 0.5, 0.5]), eyeY);
    await page.evaluate(() => window.__xrLayer.matchTable());
    B.askLine = await line();
    await wait(8000);
    B.hand = { ...(await deskTop()), line: await line() };
    check('B', 'a still hand 0.5 m under the eye sets nothing', Math.abs(B.hand.lift - B.start.lift) < 1e-4, `lift ${B.start.lift} → ${B.hand.lift}; line "${B.hand.line}"`);
    await page.evaluate((s) => window.__drop(s), hand);
    // B2 · a controller lying still on a table 0.47 m under the eye, untouched (the other hand holds the other controller,
    //   which moves): the desk's top must land on the table. The table's surface is the grip's centre less GRIP_ABOVE_TABLE.
    const grip = eyeY - 0.47 + 0.03;
    const lying = await page.evaluateHandle((y) => window.__src('pad', [-4.62, y, 0.55]), grip);
    const holding = await page.evaluateHandle((y) => window.__src('pad', [-4.30, y + 0.1, 0.85], true), grip);
    await page.evaluate(() => window.__xrLayer.matchTable());
    // the held one moves a little every 50 ms (a hand is never still), the lying one does not
    await page.evaluate((s) => { const p = s.getPosition(); let k = 0; window.__mover = setInterval(() => { k++; const q = p.clone(); q.x += Math.sin(k) * 0.01; q.y += Math.cos(k * 1.3) * 0.008; s.getPosition = () => q.clone(); }, 50); }, holding);
    await wait(7000);
    await page.evaluate(() => { clearInterval(window.__mover); });
    B.controller = { ...(await deskTop()), line: await line(), grip: +grip.toFixed(4), table: +(grip - 0.03).toFixed(4) };
    B.controller.deskVsTable = +(B.controller.physical - B.controller.table).toFixed(4);
    check('B', 'a controller lying still on a table sets the desk at the table', Math.abs(B.controller.deskVsTable) <= 0.005, `desk top ${B.controller.physical} vs table ${B.controller.table} (${(B.controller.deskVsTable * 100).toFixed(1)} cm); line "${B.controller.line}"`);
    await page.evaluate((a, b) => { window.__drop(a); window.__drop(b); }, lying, holding);
    // B3 · a controller held still (its thumb on the rest: touched) after a fresh press: nothing may be set
    await page.evaluate(() => window.__xrComfort.matchDesk(window.__app.root.findByName('camera').getPosition().y - 0.42));
    const before3 = await deskTop();
    const held = await page.evaluateHandle((y) => window.__src('pad', [-4.62, y - 0.08, 0.55], true), grip);
    await page.evaluate(() => window.__xrLayer.matchTable());
    await wait(7000);
    B.heldStill = { ...(await deskTop()), line: await line() };
    check('B', 'a controller held still (touched) sets nothing', Math.abs(B.heldStill.lift - before3.lift) < 1e-4, `lift ${before3.lift} → ${B.heldStill.lift}`);
    await page.evaluate((s) => window.__drop(s), held);
    B.errors = errors;
    await page.close();
  }

  // ═══ D · THE PHONE GAME ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  if (want('game')) {
    const D = out.game = {};
    // the same build both ways: the game on its own plane (default) and `?gameplane=0` (the workstation draws every frame, as before)
    for (const [key, extra] of [['plane', ''], ['workstation', '&gameplane=0']]) {
      const { page, errors } = await session2016({ extra });
      const R = D[key] = {};
      // every texture upload the device makes, its bytes and its time; every mip chain built (read off the device's own context)
      await page.evaluate(() => {
        const gl = window.__app.graphicsDevice.gl, M = window.__gl = { tex: 0, bytes: 0, ms: 0, mips: 0, mipMs: 0, big: 0 };
        const wrap = (name, bytesOf) => { const f = gl[name].bind(gl); gl[name] = (...a) => { const t0 = performance.now(); const r = f(...a); M.ms += performance.now() - t0; M.tex++; const b = bytesOf(a); M.bytes += b; if (b > 4e6) M.big++; return r; }; };
        const srcBytes = (s) => (s && s.width ? s.width * s.height * 4 : 0);
        wrap('texImage2D', (a) => (a.length >= 9 ? (a[3] * a[4] * 4) : srcBytes(a[5])));
        wrap('texSubImage2D', (a) => (a.length >= 9 ? (a[4] * a[5] * 4) : srcBytes(a[6])));
        const gm = gl.generateMipmap.bind(gl); gl.generateMipmap = (t) => { const t0 = performance.now(); gm(t); M.mipMs += performance.now() - t0; M.mips++; };
      });
      const window_ = async (secs) => {
        await page.evaluate(() => { const M = window.__gl; Object.assign(M, { tex: 0, bytes: 0, ms: 0, mips: 0, mipMs: 0, big: 0 }); window.__cbMs = []; window.__up0 = window.__uploads ?? 0; });
        await wait(secs * 1000);
        return page.evaluate((secs) => {
          const M = window.__gl, f = window.__cbMs.slice(), n = f.length, s = f.slice().sort((a, b) => a - b), q = (k) => +(s[Math.min(n - 1, Math.floor(n * k))] ?? 0).toFixed(2);
          return { seconds: secs, frames: n, fps: +(n / secs).toFixed(1), frameWorkMsMedian: q(0.5), frameWorkMsP95: q(0.95), frameWorkMsMax: +(s[n - 1] ?? 0).toFixed(1),
            framesOver13_9ms: f.filter((x) => x > 13.9).length,
            screenUploadsPerSec: +(((window.__uploads ?? 0) - window.__up0) / secs).toFixed(1), glUploadsPerSec: +(M.tex / secs).toFixed(1), mbPerSec: +(M.bytes / secs / 1e6).toFixed(1),
            uploadMsPerSec: +(M.ms / secs).toFixed(1), mipChainsPerSec: +(M.mips / secs).toFixed(1), mipMsPerSec: +(M.mipMs / secs).toFixed(1), uploadsOver4MBPerSec: +(M.big / secs).toFixed(1),
            draws: window.__app.stats.drawCalls.total };
        }, secs);
      };
      // look at the Handset Window (17° right of the seat's facing)
      await page.evaluate(() => { Object.assign(window.__viewer, { yaw: -17, pitch: -6 }); });
      await wait(1500);
      R.idle = await window_(6);
      await page.evaluate(() => { window.__graceQueue().debugBeat('floppyPlay'); });
      await wait(1500);
      // keep the sheep in the air: a tap every 400 ms (the game's own input, its tap())
      await page.evaluate(() => { window.__tapper = setInterval(() => { const g = window.__graceQueue(); if (g.floppy.open) g.floppy.tap(90, 200); }, 400); });
      R.playing = await window_(8);
      R.gameOpen = await page.evaluate(() => window.__graceQueue().floppy.open);
      R.plane = await page.evaluate(() => { const e = window.__app.root.findByName('era3-device-game'); return e ? { enabled: e.enabled, size: e.getWorldTransform().getScale().toArray().map((v) => +v.toFixed(4)) } : null; });
      R.textures = await page.evaluate(() => {
        const tex = (n) => { const e = window.__app.root.findByName(n); const t = e?.render?.material?.emissiveMap; return t ? { w: t.width, h: t.height, mipmaps: t.mipmaps, mb: +(t.width * t.height * 4 / 1e6).toFixed(2) } : null; };
        const gl = window.__app.graphicsDevice.gl, ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { workstation: tex('era3-device-workstation'), game: tex('era3-device-game'), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null };
      });
      await page.evaluate(() => clearInterval(window.__tapper));
      R.errors = errors;
      await page.close();
    }
    const p = D.plane.playing, w = D.workstation.playing;
    // (the workstation still redraws for its own changes — the clock's minute, a balloon — so one in a few seconds is its own)
    check('D', "game playing on its own plane: the workstation is not re-sent with the game's frames (under one upload over 4 MB a 2 s)", p.uploadsOver4MBPerSec < 0.5 && D.plane.gameOpen && D.plane.plane?.enabled, `${p.uploadsOver4MBPerSec}/s over 4 MB, ${p.mbPerSec} MB/s (the old path: ${w.uploadsOver4MBPerSec}/s, ${w.mbPerSec} MB/s)`);
    check('D', "the frame's own work with the game playing is under the 72 Hz budget (13.9 ms) at the 95th percentile", p.frameWorkMsP95 < 13.9, `p95 ${p.frameWorkMsP95} ms, median ${p.frameWorkMsMedian} ms (old path: p95 ${w.frameWorkMsP95}, median ${w.frameWorkMsMedian}); headless Chrome, not the Quest`);
  }

  // ═══ E · THE BATCHES' BOUNDS ══════════════════════════════════════════════════════════════════════════════════════════════════
  if (want('batches')) {
    const { page, errors } = await session2016();
    const E = out.batches = {};
    // turn the room: a seat 40° round from the session's start, so the presentation space is far from identity
    await page.evaluate(() => { Object.assign(window.__viewer, { x: 0.1, y: 1.1, z: 0.05, yaw: 0, pitch: -8 }); });
    await wait(800);
    await page.evaluate(() => {
      const app = window.__app, batcher = app.batcher, V = app.root.findByName('camera').getPosition().constructor;
      const B = window.__batchCheck = { rows: [], want: 0, meshBox: new WeakMap() };
      const boxOf = (aabb) => ({ min: aabb.getMin().toArray(), max: aabb.getMax().toArray() });
      const contains = (outer, inner, tol = 0.002) => inner.min.every((v, i) => v >= outer.min[i] - tol) && inner.max.every((v, i) => v <= outer.max[i] + tol);
      const near = (a, b, tol = 0.01) => a.min.every((v, i) => Math.abs(v - b.min[i]) <= tol) && a.max.every((v, i) => Math.abs(v - b.max[i]) <= tol);
      app.scene.on('precull', () => {
        if (B.want <= 0) return;
        B.want--;
        const tmp = new (app.root.findByName('camera').getPosition().constructor)();
        for (const b of batcher._batchList) {
          const mi = b.meshInstance; if (!mi) continue;
          const cull = boxOf(mi._aabb);
          const BB = mi._aabb.constructor;
          // a static batch's mesh is built from raw streams with no bounds of its own: its vertices, read once per mesh
          let local = B.meshBox.get(mi.mesh);
          if (!local) {
            const pos = []; mi.mesh.getPositions(pos); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
            for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
            local = new BB(); local.setMinMax(new V(...lo), new V(...hi)); B.meshBox.set(mi.mesh, local);
          }
          const drawn = new BB(); drawn.setFromTransformedAabb(local, mi.node.getWorldTransform()); const d = boxOf(drawn);
          let union = null;
          for (const o of b.origMeshInstances) { const ob = new BB(); ob.setFromTransformedAabb(o.mesh.aabb, o.node.getWorldTransform()); if (!union) union = ob; else union.add(ob); }
          const u = union ? boxOf(union) : null;
          B.rows.push({ tag: B.tag, group: b.batchGroupId, dynamic: !!b.dynamic, n: b.origMeshInstances.length, cullHoldsDrawn: contains(cull, d), drawnIsProps: b.dynamic ? true : !!u && near(d, u), cull, drawn: d, props: u });
        }
      });
      // a late dirtying: a group marked dirty after xrComfort's prerender has run (a listener registered now runs after it)
      app.on('prerender', () => { if (B.late) { B.late = false; batcher.markGroupDirty(B.lateGroup); } });
    });
    const sample = async (tag, frames = 3) => {
      await page.evaluate((tag, n) => { const B = window.__batchCheck; B.tag = tag; B.want = n; }, tag, frames);
      await wait(900);
      return page.evaluate((tag) => window.__batchCheck.rows.filter((r) => r.tag === tag), tag);
    };
    const summarise = (rows) => ({ batches: rows.length, cullMissesDrawn: rows.filter((r) => !r.cullHoldsDrawn).length, drawnAwayFromProps: rows.filter((r) => !r.drawnIsProps).length,
      worst: rows.filter((r) => !r.cullHoldsDrawn || !r.drawnIsProps).slice(0, 3) });
    E.rest = summarise(await sample('rest'));
    // a batched prop of Vera's room, switched off and on (the engine marks its group dirty in the update)
    const prop = await page.evaluate(() => {
      const app = window.__app; let pick = null;
      app.root.forEach((n) => { if (pick) return; const r = n.render; if (r && r.batchGroupId >= 0 && n.name.startsWith('w_') && n.getPosition().x < -3) pick = n; });
      if (!pick) return null; window.__pick = pick; return { name: pick.name, group: pick.render.batchGroupId };
    });
    E.prop = prop;
    if (prop) {
      await page.evaluate(() => { window.__pick.enabled = false; }); await wait(300);
      E.off = summarise(await sample('off'));
      await page.evaluate(() => { window.__pick.enabled = true; }); await wait(300);
      E.on = summarise(await sample('on'));
      // a prop moved and its group rebuilt (as the cluster's rebake does): 0.3 m along the wall
      await page.evaluate(() => { const p = window.__pick.getLocalPosition(); window.__pick.setLocalPosition(p.x, p.y, p.z + 0.3); window.__app.batcher.markGroupDirty(window.__pick.render.batchGroupId); });
      await wait(300);
      E.moved = summarise(await sample('moved'));
      // a new batched prop joins the room (an era's late prop: a root child the prerender carries onto the stage)
      await page.evaluate(() => {
        const app = window.__app, pc = app.root.constructor, e = window.__pick.clone(); e.name = 'w_s430_newcomer';
        const p = window.__pick.getPosition(); app.root.addChild(e); e.setPosition(p.x, p.y + 0.4, p.z);
      });
      await wait(300);
      E.newcomer = summarise(await sample('newcomer'));
      // a group dirtied LATE (after xrComfort's own prerender: the engine rebuilds it in render(), with the room already placed)
      await page.evaluate((g) => { const B = window.__batchCheck; B.lateGroup = g; B.late = true; }, prop.group);
      await wait(200);
      E.late = summarise(await sample('late', 4));
    }
    // a dynamic batch (the palette of an era change, 2016 → 2026): what the seat's cull reads as its room box (S430: its instance's
    //   live bounds carried back to the room; before: the batch's own `_aabb`) against its props' own boxes in the room
    await page.evaluate(() => {
      const app = window.__app, V = app.root.findByName('camera').getPosition().constructor;
      const C = window.__dynCheck = { rows: [], on: true };
      app.scene.on('precull', () => {
        if (!C.on) return;
        let stage = null; app.root.forEach((n) => { if (n.name === 'xr-world') stage = n; });
        const inv = stage.getWorldTransform().clone().invert();
        for (const b of app.batcher._batchList) {
          const mi = b.meshInstance; if (!mi || !b.dynamic) continue;
          const BB = mi._aabb.constructor, centre = (bb) => bb.center.toArray();
          let union = null; for (const o of b.origMeshInstances) { const ob = new BB(); ob.setFromTransformedAabb(o.mesh.aabb, o.node.getWorldTransform()); if (!union) union = ob; else union.add(ob); }
          const props = new BB(); props.setFromTransformedAabb(union, inv);
          const live = new BB(); live.setFromTransformedAabb(mi.aabb, inv);
          const d = (a, c) => Math.hypot(...a.map((v, i) => v - c[i]));
          C.rows.push({ n: b.origMeshInstances.length, seatCullReads: +d(centre(live), centre(props)).toFixed(3), batchOwn: +d(centre(b._aabb), centre(props)).toFixed(3) });
        }
      });
    });
    await page.evaluate(() => window.__os.onEraShift('e4'));
    await wait(9000);
    E.change = await page.evaluate(() => { const C = window.__dynCheck; C.on = false; const r = C.rows; return { samples: r.length, worstSeatCullReads: r.length ? Math.max(...r.map((x) => x.seatCullReads)) : null, worstBatchOwn: r.length ? Math.max(...r.map((x) => x.batchOwn)) : null }; });
    check('E', 'an era change\'s dynamic batch: the seat\'s cull reads it where its props are (within 5 cm)', E.change.samples > 0 && E.change.worstSeatCullReads <= 0.05, JSON.stringify(E.change));
    check('E', 'at rest: every batch is culled by a box that holds what it draws', E.rest.cullMissesDrawn === 0, JSON.stringify({ batches: E.rest.batches, misses: E.rest.cullMissesDrawn, away: E.rest.drawnAwayFromProps }));
    for (const k of ['off', 'on', 'moved', 'newcomer', 'late']) if (E[k]) check('E', `after "${k}": culling box holds the drawing, drawing is where its props are`, E[k].cullMissesDrawn === 0 && E[k].drawnAwayFromProps === 0, JSON.stringify({ batches: E[k].batches, misses: E[k].cullMissesDrawn, away: E[k].drawnAwayFromProps }));
    E.errors = errors;
    await page.close();
  }

  // ═══ F · THE VR DOOR AND THE DEBUG PLATE ══════════════════════════════════════════════════════════════════════════════════════
  if (want('door')) {
    const { page, errors } = await session2016({ start: false, viewport: { width: 1280, height: 800 } });
    const F = out.door = {};
    await wait(800);   // the panel paints what it offers every 250 ms
    // the first Enter VR that is on screen (the map starts closed: the pill beside its ⚙)
    F.button = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => /enter vr/i.test(x.textContent || '')).find((x) => x.getBoundingClientRect().width > 0); if (!b) return null; const r = b.getBoundingClientRect(); return { text: b.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2, shown: r.width > 0 && getComputedStyle(b).display !== 'none' }; });
    if (F.button?.shown) {
      await page.mouse.click(F.button.x, F.button.y);   // a real press: the session must start inside its gesture
      await page.waitForFunction(() => window.__app.xr.active && window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 60000 }).catch(() => {});
      await wait(1200);
    }
    F.session = await page.evaluate(() => ({ active: !!window.__app.xr.active, era: window.__os.era, calibrated: window.__xrComfort.calibrated, seat: window.__xrComfort.authored.getLocalPosition().toArray().map((v) => +v.toFixed(2)) }));
    check('F', "the debug panel's Enter VR starts the session at 2016's seat (?era=3)", F.session.active && F.session.era === 'e3', JSON.stringify({ button: F.button?.text ?? null, ...F.session }));
    if (F.session.active) {
      // the plate against the glass, seen from the seat looking at the monitor: do their screen boxes overlap?
      await page.evaluate(() => { Object.assign(window.__viewer, { x: 0, y: 1.2, z: 0, yaw: 0, pitch: -8 }); });
      await wait(1500);
      const overlap = () => page.evaluate(() => {
        const app = window.__app, cam = app.root.findByName('camera'), plate = app.root.findByName('xr-debug'), glass = app.root.findByName('era3-device-workstation');
        const V = cam.getPosition().constructor;
        // outside the render the room's space is put back to room coordinates: an entity under it is carried into the headset's
        let stage = null; app.root.forEach((n) => { if (n.name === 'xr-world') stage = n; });
        const under = (e) => { for (let p = e.parent; p; p = p.parent) if (p === stage) return true; return false; };
        const corners = (e) => [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([u, v]) => { const w = e.getWorldTransform().transformPoint(new V(u, 0, v)); return under(e) ? window.__xrComfort.physicalPoint(w) : w; });
        const toScreen = (p) => { const s = new V(); cam.camera.worldToScreen(p, s); return [s.x, s.y, s.z]; };
        const box = (pts) => { const s = pts.map(toScreen); if (s.some((q) => q[2] < 0)) return null; return { x0: Math.min(...s.map((q) => q[0])), x1: Math.max(...s.map((q) => q[0])), y0: Math.min(...s.map((q) => q[1])), y1: Math.max(...s.map((q) => q[1])) }; };
        if (!plate || !glass) return { plate: !!plate, glass: !!glass };
        const a = plate.enabled ? box(corners(plate)) : null, b = box(corners(glass));
        const ov = a && b ? Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)) : 0;
        const plateWorld = plate.getPosition(), logical = window.__xrComfort.logicalPoint(plateWorld.clone());
        return { plateOn: plate.enabled, plateBox: a, glassBox: b, overlapPx: Math.round(ov), plateLogical: [logical.x, logical.y, logical.z].map((v) => +v.toFixed(3)) };
      });
      F.atMonitor = await overlap();
      check('F', 'the debug plate is off the monitor (seen from the seat, looking at it)', F.atMonitor.overlapPx === 0, JSON.stringify({ overlapPx: F.atMonitor.overlapPx, plateOn: F.atMonitor.plateOn }));
      await page.evaluate(() => { Object.assign(window.__viewer, { pitch: -55 }); });
      await wait(1200);
      F.lookingDown = await overlap();
      F.lookingDown.inView = !!F.lookingDown.plateBox && F.lookingDown.plateBox.x1 > 0 && F.lookingDown.plateBox.x0 < 960 && F.lookingDown.plateBox.y1 > 0 && F.lookingDown.plateBox.y0 < 600;
      check('F', 'the debug plate is there when he looks down below the desk edge', F.lookingDown.plateOn && F.lookingDown.inView, JSON.stringify(F.lookingDown.plateBox));
    }
    F.errors = errors;
    await page.close();
  }

  // ═══ DRAW CALLS (the seated mock, mono: the raw count is the scene's; the debug plate hidden) ═══════════════════════════════════
  if (want('draws')) {
    const DR = out.draws = {};
    for (const [key, extra] of [['plane', ''], ['workstation', '&gameplane=0']]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 960, height: 600 });
      await page.goto(`http://localhost:${PORT}/${Q2016}${extra}`, { waitUntil: 'load', timeout: 240000 });
      await page.waitForFunction(() => window.__app && window.__os && window.__xrComfort && window.__graceQueue && window.__camPose, { timeout: 240000 });
      for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
      await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
      await page.evaluate(() => {
        const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        head.camera.fov = 90; window.__headLocal = { x: 0, y: 1.2, z: 0, pitch: 0, yaw: 0 };
        app.on('prerender', () => { const h = window.__headLocal; head.setLocalPosition(h.x, h.y, h.z); head.setLocalEulerAngles(h.pitch, h.yaw, 0); });
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      });
      await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
      await wait(1500);
      const sweep = async () => {
        const rows = [];
        for (const pitch of [-30, 0, 25]) for (let yaw = 0; yaw < 360; yaw += 30) {
          await page.evaluate((p, y) => Object.assign(window.__headLocal, { pitch: p, yaw: y }), pitch, yaw);
          await wait(160);
          rows.push({ pitch, yaw, draws: await page.evaluate(() => window.__app.stats.drawCalls.total) });
        }
        return { max: Math.max(...rows.map((r) => r.draws)), atSeat: rows.find((r) => r.pitch === 0 && r.yaw === 0).draws, rows };
      };
      DR[key] = { quiet: await sweep() };
      await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('floppyPlay'); window.__tapper = setInterval(() => { if (g.floppy.open) g.floppy.tap(90, 200); }, 400); });
      await wait(1500);
      DR[key].game = await sweep();
      await page.evaluate(() => clearInterval(window.__tapper));
      await page.close();
    }
    check('D', 'draw calls at 2016\'s seat, every look, game playing: within 75', DR.plane.game.max <= 75, `worst ${DR.plane.game.max} (game on its own plane) · ${DR.workstation.game.max} (the old path) · quiet ${DR.plane.quiet.max}`);
  }

  // ═══ STILLS (2560 × 1440, the seated headset mock) ════════════════════════════════════════════════════════════════════════════
  if (want('stills')) {
    const S = out.stills = {};
    const boot = async () => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
      const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
      await page.goto(`http://localhost:${PORT}/${Q2016}`, { waitUntil: 'load', timeout: 240000 });
      await page.waitForFunction(() => window.__app && window.__os && window.__xrComfort && window.__graceQueue && window.__camPose, { timeout: 240000 });
      for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
      await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
      await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
      await page.evaluate(() => {
        const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        head.camera.fov = 75;
        window.__headLocal = { x: 0, y: 1.2, z: 0, pitch: 0, yaw: 0 };
        head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0);
        app.on('prerender', () => { const h = window.__headLocal; head.setLocalPosition(h.x, h.y, h.z); head.setLocalEulerAngles(h.pitch, h.yaw, 0); });
        window.__plate = (on) => { window.__plateOn = on; };
        window.__plateOn = false;
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d && !window.__plateOn) d.enabled = false; });
      });
      await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
      await wait(1000);
      // his run reached 2016 by the debug panel's jump, a seat change in the headset: do the same (Room 1's seat, then back)
      await page.evaluate(() => window.__camProbe(0, 0));
      await page.waitForFunction(() => !window.__xrComfort.busy && window.__xrComfort.status().cuts >= 1, { timeout: 30000 }).catch(() => {});
      await wait(800);
      await page.evaluate(() => window.__camProbe(90, -8));
      await page.waitForFunction(() => !window.__xrComfort.busy && window.__xrComfort.status().cuts >= 2, { timeout: 30000 }).catch(() => {});
      await wait(2000);
      return { page, errors };
    };
    const head = (page, h) => page.evaluate((h) => Object.assign(window.__headLocal, h), h);
    const shot = async (page, name) => { const p = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: p }); S[name] = p; console.log('still', p); };
    if (SHOT_GROUPS.includes('room')) {
      const { page, errors } = await boot();
      // the menu's rows, in the headset's own look
      await head(page, { pitch: -8, yaw: 0 }); await wait(600);
      await page.evaluate(() => window.__xrFrame.open()); await wait(1200);
      await shot(page, 'menu-rows');
      await page.evaluate(() => window.__xrFrame.close()); await wait(800);
      // the debug plate: looking at the monitor, and looking down past the desk's edge
      await page.evaluate(() => window.__plate(true)); await wait(1500);
      await shot(page, 'debug-plate-monitor');
      await head(page, { pitch: -55 }); await wait(1500);
      await shot(page, 'debug-plate-down');
      await page.evaluate(() => window.__plate(false)); await head(page, { pitch: -8 }); await wait(800);
      // the phone game playing, looking at the Handset Window
      await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('floppyPlay'); window.__tapper = setInterval(() => { if (g.floppy.open) g.floppy.tap(90, 200); }, 400); });
      await head(page, { yaw: -17, pitch: -6 }); await wait(2500);
      await shot(page, 'game-playing');
      await page.evaluate(() => { clearInterval(window.__tapper); window.__graceQueue().floppy.closeGame(); });
      await wait(600);
      // Match my table: the line it asks with
      await head(page, { yaw: 0, pitch: -8 }); await wait(600);
      await page.evaluate(() => window.__xrLayer.matchTable()); await wait(1200);
      S.tableLine = await page.evaluate(() => window.__xrFrame?.hintText?.() ?? null);
      await shot(page, 'table-ask');
      await wait(400);
      // Recentre: the head turned to the left wrist, looking down and leaning, when the menu opens; the row; back to straight
      await head(page, { x: -0.06, y: 1.14, z: -0.04, yaw: 35, pitch: -35 }); await wait(600);
      await page.evaluate(() => window.__xrFrame.open()); await wait(500);
      await head(page, { x: -0.02, y: 1.18, z: -0.02, yaw: 10, pitch: -10 }); await wait(300);
      await page.evaluate(() => { window.__xrComfort.calibrate(); window.__xrFrame.close(); });
      await head(page, { x: 0, y: 1.2, z: 0, yaw: 0, pitch: -8 });
      await wait(700);
      S.recentreMid = await page.evaluate(() => ({ morph: !!window.__viewMorph?.visible, elapsed: window.__xrComfort.status().elapsed }));
      await shot(page, 'recentre-0.7s');
      await wait(2600);
      await shot(page, 'recentre-after');
      S.errors = errors;
      await page.close();
    }
    if (SHOT_GROUPS.includes('door')) {
      // F's door: the review route's page as the Quest Browser shows it before the headset (the debug map closed, its pill)
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
      await page.evaluateOnNewDocument(xrSessionMock);
      await page.goto(`http://localhost:${PORT}/${Q2016}`, { waitUntil: 'load', timeout: 240000 });
      await page.waitForFunction(() => window.__app && window.__os && window.__camPose, { timeout: 240000 });
      for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
      await wait(2500);
      S.doorButtons = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.textContent));
      await shot(page, 'door-page');
      await page.close();
    }
    if (SHOT_GROUPS.includes('setup')) {
      // the setup's How to look window in the stars (its Match my table note), as his entrance run reaches it
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
      await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1`, { waitUntil: 'domcontentloaded', timeout: 240000 });
      await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 240000 });
      await page.waitForFunction(() => window.__app && window.__xrComfort, { timeout: 60000 });
      await page.mouse.click(640, 360); await wait(3000);
      await page.evaluate(() => {
        const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        head.setLocalPosition(0.01, 0, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 75;
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      });
      await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
      await page.waitForFunction(() => window.__xrComfort.calibrated, { timeout: 20000 }).catch(() => {});
      await wait(1200);
      const pressHit = async (re) => {
        for (let i = 0; i < 40; i++) {
          const h = await page.evaluate((src) => { const re = new RegExp(src), s = window.__os?.setup; if (!s || !s.open) return null; const hit = (s.hits ?? []).find((x) => re.test(x.id)); if (!hit) return null; s.handleClick(hit.x + hit.w / 2, hit.y + hit.h / 2); window.__os.dirty = true; return hit.id; }, re.source);
          if (h) { await wait(900); return h; }
          await wait(500);
        }
        return null;
      };
      await pressHit(/^setup-choice-0$/); await pressHit(/^setup-choice-0$/); await pressHit(/^setup-choice-1$/); await pressHit(/^setup-sound-on$|^setup-choice-1$/); await pressHit(/^setup-choice-0$/);
      await wait(1200);
      S.setupHits = await page.evaluate(() => (window.__os?.setup?.hits ?? []).map((h) => h.id));
      await shot(page, 'table-setup-note');
      await page.close();
    }
  }
} finally {
  report.out = out;
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
  await browser.close();
}
const fails = report.checks.filter((c) => !c.ok).length;
console.log(`\n${report.checks.length - fails}/${report.checks.length} checks pass (${LABEL})`);
