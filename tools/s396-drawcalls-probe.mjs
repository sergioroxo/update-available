#!/usr/bin/env node
/**
 * ⚑ S396 (UiB job 28 Part B4) — EVERY HEADSET LOOK FROM EVERY SEAT, COUNTED. Job 27's TV probe (tools/s394-lamby-tv-probe.mjs)
 * swept twelve yaws from each seat and found Vera's look back toward the hall at ~122 draw calls (job 26: 129); the budget is
 * 75 (CLAUDE.md). This probe is that sweep made the subject: per room, per look, the draws and the triangles, the worst pose
 * named, and the same poses with the after build's two measures off and on, in one frame, as pictures.
 *
 *     node tools/s396-drawcalls-probe.mjs --port 5202 [--out output/s396-vera-drawcalls] [--label before|after]
 *                                         [--only 1997,2003,2016,2026] [--no-desktop] [--list]
 *
 * Per room (1997: the short door, Log in, the desktop; 2003 `?era=2`; 2016 `?era=3` at the board; 2026 `?era=4`), in the
 * SEATED XR MOCK (cx4-xr-check / s394's: `app.xr.active` true, the head a child of the rig at 1.2 m, fov 90, a controller's
 * select calibrates the seat; the debug plate kept off), the head turned every 15° of yaw at pitches −30°, 0°, +20°: the
 * frame's draws (`app.stats.drawCalls.total`, the raw count — the controller's ray included) and the triangles drawn (summed
 * from the forward renderer's own draw list). Then the computer's view at the same seat, the same sweep, for comparison
 * (never asserted: the budget is the headset's).
 *
 * The after build (S396) has two measures, each switchable at run time on a ?debug=1 page: the seat's cull
 * (`window.__seatCull.enabled`, src/room/seatCull.ts) and the plain boxes' vertex-colour merge (`window.__vcBatch.set(on)`,
 * a rebake — src/room/batching.ts). When they exist the headset sweep is taken three times — both off (what HEAD drew),
 * the cull alone, both on (the build) — so one run carries its own before; the computer's twice (off, on).
 *
 * Photographs (the headset frames): the seat's front view and the room's worst look (as HEAD drew it); in 2016 also Vera's
 * look back toward the hall (head yaw 150°, job 27's worst) and the computer's look back. In the after build each
 * photographed pose is also RENDERED FOUR TIMES IN ONE FRAME — both measures off, the cull alone, both on, both off again —
 * with `app.render()` called directly (one `update` at dt 0 after each switch, so the room's absent props are hidden as in
 * any frame), and the pictures compared pixel by pixel: the proof that the measures change nothing the seat can see is
 * 0 pixels differing for each (and 0 between the two "off" renders, the noise floor); a differing pixel's place and
 * colours are kept in the report. --change does the same at moments through the era changes (see CHANGE).
 *
 * Writes <out>/report-<label>.json (+ photos <label>-<room>-<pose>.png); when both report-before.json and report-after.json
 * exist, <out>/before-after.json (per room: worst headset look before → after, Vera's look back before → after) and the
 * HEAD-run photos' pixel difference against the after run's (the motes drift between runs: that difference is not zero, and
 * is reported for the eye, not asserted). Exit 1 if an after run has any headset look over 75 draws or 75k triangles, any
 * paired picture differing, or a page error. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s396-vera-drawcalls'));
const LABEL = flag('label', 'after');
const ONLY = flag('only', '');
const DESKTOP = !has('no-desktop');
const LIST = has('list');
/** --change: also fly the era changes whose walls move (2003 → 2016, 2016 → 2026) on the computer and in the headset, and
 *  at moments through each (the rise, the glob cascade, the travel, the descent, the landing) render one frame with the
 *  seat's cull off and on: 0 pixels may differ. (The merge is not switched mid-change: the batch is down while the morph runs.) */
const CHANGE = has('change');
/** ⚑ S398 (UiB job 29 A1) — --change now flies ALL FOUR changes (1997 → 2003, 2003 → 2016, 2016 → 2026, and 2026 → the
 *  Close's flight) and FAILS if any moment of any of them draws more than 75 calls in the headset mock (the build:
 *  the seat's cull on, the cascade's bands on), or if, at any moment while a cascade runs, the cascade's bands
 *  (cluster.ts S398: what holds still keeps its batch) change a pixel against the old tear-down (`__morphBands`,
 *  the same frame drawn both ways). --changes e1-e2,e2-e3,e3-e4,close picks some. The computer is measured and its
 *  peak reported beside; its moments are asserted for pixels, and for the budget too (it shares the room). */
const CHANGES_ONLY = flag('changes', '');
const BUDGET = 75;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const ROOMS = [
  { room: '1997', era: 1, who: 'Daniel (Room 1)', seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 } },
  { room: '2003', era: 2, who: 'Daniel (Room 1, aged)', seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 } },
  { room: '2016', era: 3, who: 'Vera (Room 2)', seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 } },
  { room: '2026', era: 4, who: 'Maya (Room 3)', seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 } }
].filter((r) => !ONLY || ONLY.split(',').includes(r.room));
const PITCHES = [-30, 0, 20];
const YAWS = Array.from({ length: 24 }, (_, i) => i * 15);
/** Vera's look back toward the hall: job 27's worst (head yaw 150° from the seat's facing, level) */
const LOOK_BACK = { yaw: 150, pitch: 0 };

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const checks = [];
const check = (room, name, ok, extra = '') => { checks.push({ room, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${room}] ${name}${extra ? '  ' + extra : ''}`); };

/** open a room by its review route, settled at the seat */
async function open(r, VW, VH) {
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__xrComfort, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; } body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (r.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (r.era === 3) await page.evaluate(() => { const g = window.__graceQueue?.(); if (!g) return; g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
  await wait(1500);
  // the forward renderer's own list: what each frame draws (camera, node, material, triangles)
  await page.evaluate(() => {
    const app = window.__app, R = app.renderer, orig = R.renderForwardInternal;
    window.__s396 = { frame: -1, draws: 0, tris: 0, list: null, keep: false };
    R.renderForwardInternal = function (camera, prepared, ...rest) {
      const s = window.__s396;
      if (s.frame !== app.frame) { s.frame = app.frame; s.draws = 0; s.tris = 0; if (s.keep) s.list = []; }
      for (const dc of prepared.drawCalls) {
        const prim = dc.mesh?.primitive?.[dc.renderStyle ?? 0];
        const n = (prim?.count ?? 0) / 3 * Math.max(1, dc.instancingData?.count ?? 1);
        s.draws++; s.tris += n;
        if (s.keep && s.list) {
          let node = dc.node; const p = []; while (node && p.length < 4) { p.unshift(node.name); node = node.parent; }
          const b = app.batcher?._batchList?.find((x) => x.meshInstance === dc);
          const prop = (m) => { let q = m.node; while (q?.parent && q.parent.name !== 'era1-room' && q.parent.name !== 'xr-world') q = q.parent; return q?.name; };
          s.list.push({ camera: camera.node?.name, node: p.join('/'), material: dc.material?.name, tris: Math.round(n), batch: b ? b.origMeshInstances.length : 0,
            members: b ? [...new Set(b.origMeshInstances.map(prop))] : undefined, c: [dc.aabb.center.x, dc.aabb.center.y, dc.aabb.center.z].map((v) => +v.toFixed(2)) });
        }
      }
      return orig.call(this, camera, prepared, ...rest);
    };
  });
  return { page, errors };
}

/** the frame's numbers, the max over a few frames (a pose settles in one) */
const sample = (page) => page.evaluate(async () => {
  let draws = 0, tris = 0, scene = 0;
  for (let i = 0; i < 6; i++) {
    await new Promise(requestAnimationFrame);
    draws = Math.max(draws, window.__app.stats.drawCalls.total); scene = Math.max(scene, window.__drawCalls ?? 0); tris = Math.max(tris, Math.round(window.__s396.tris));
  }
  return { draws, scene, tris };
});
const hasCull = (page) => page.evaluate(() => !!window.__seatCull);
/** the after build's two measures, each switchable: the seat's cull (per frame) and the vertex-colour merge (a rebake) */
const setMeasures = (page, cull, vc) => page.evaluate((cull, vc) => {
  if (window.__seatCull) window.__seatCull.enabled = cull;
  if (window.__vcBatch && window.__vcBatch.on !== vc) window.__vcBatch.set(vc);
}, cull, vc);
/** the three states a sweep is taken in: as HEAD drew (both off), the cull alone, both */
const STATES = [{ name: 'none', cull: false, vc: false }, { name: 'cull', cull: true, vc: false }, { name: 'both', cull: true, vc: true }];

/** one frame rendered twice, the cull off then on, both read back: the pictures' difference and each render's draw count */
/** one frame rendered four times — both measures off, the cull alone, both on, both off again — and compared pixel by
 *  pixel: the cull (off → cull), the merge (cull → both), and the noise floor (off → off again). `cullOnly` skips the
 *  merge (mid-change, while the morph has the batch down). */
async function pairedRender(page, cullOnly = false) {
  return page.evaluate(async (cullOnly) => {
    const app = window.__app, gl = app.graphicsDevice.gl, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    await new Promise(requestAnimationFrame);
    const grab = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
    const R = app.renderer;
    // a rebake shows the room's zero-scale (absent) props until the next update hides them again (batching.ts cullAbsentProps:
    // zero-area draws, no pixels) — one update at dt 0 after each switch, so each render counts what a frame draws
    // (mid-change, nothing is rebaked, so nothing runs between the renders at all: the scene's own per-update state — a
    //  flicker that alternates each update, a screen's upload — cannot then differ between them)
    const set = (cull, vc) => { window.__seatCull.enabled = cull; if (cullOnly) return; if (window.__vcBatch && window.__vcBatch.on !== vc) window.__vcBatch.set(vc); app.fire('update', 0); };
    // the era change's glitch flickers on Math.random: each render of the set gets the same seeded sequence, so the
    // four pictures differ only by what was switched (the "noise" render proves it)
    const random = Math.random;
    const render = (cull, vc) => {
      let seed = 0x2f6b;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try { set(cull, vc); const d0 = R._forwardDrawCalls; app.render(); const draws = R._forwardDrawCalls - d0; return { px: grab(), draws, hidden: window.__seatCull.last.hidden }; }
      finally { Math.random = random; }
    };
    const none = render(false, false), cull = render(true, false), both = cullOnly ? cull : render(true, true), none2 = render(false, false);
    set(true, true);
    const compare = (A, B) => {
      let n = 0, maxDelta = 0; const where = [];
      for (let i = 0; i < A.px.length; i += 4) {
        const d = Math.max(Math.abs(A.px[i] - B.px[i]), Math.abs(A.px[i + 1] - B.px[i + 1]), Math.abs(A.px[i + 2] - B.px[i + 2]));
        if (!d) continue;
        n++; if (d > maxDelta) maxDelta = d;
        // where (screen px, y down) and the two colours — a difference must be explainable, not only counted
        if (where.length < 12) { const k = i / 4; where.push({ x: k % W, y: H - 1 - Math.floor(k / W), a: [A.px[i], A.px[i + 1], A.px[i + 2]], b: [B.px[i], B.px[i + 1], B.px[i + 2]] }); }
      }
      return { pixels: n, maxDelta, where };
    };
    return { pixels: W * H, cull: compare(none, cull), merge: cullOnly ? null : compare(cull, both), noise: compare(none, none2).pixels,
      draws: { none: none.draws, cull: cull.draws, both: both.draws }, hidden: cull.hidden, cullLast: { ...window.__seatCull.last } };
  }, cullOnly);
}
/** both measures must change NO pixel. (The merge once changed three, in nine headset poses: depth ties between touching boxes,
 *  won by whichever is drawn last — fixed in batching.ts by drawing the merged boxes in their old batches' order; the
 *  `where` of any differing pixel is kept in the report so a difference can be traced, not only counted.) */
const pairedVerdict = (pr) => pr.cull.pixels === 0 && pr.noise === 0 && (!pr.merge || pr.merge.pixels === 0);
const pairedText = (pr) => `cull: ${pr.cull.pixels} px differ; merge: ${pr.merge ? `${pr.merge.pixels} px differ (max ${pr.merge.maxDelta} level${pr.merge.maxDelta === 1 ? '' : 's'} of 255)` : 'not switched'}; noise ${pr.noise} of ${pr.pixels}; draws ${pr.draws.none} → ${pr.draws.cull} → ${pr.draws.both}`;

const report = { label: LABEL, port: PORT, at: new Date().toISOString(), budget: BUDGET, rooms: {} };
for (const r of ROOMS) {
  const R = report.rooms[r.room] = { who: r.who, seat: r.seat };
  // ── the headset: the seated mock ─────────────────────────────────────────
  {
    const { page, errors } = await open(r, 1280, 720);
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
    const cull = await hasCull(page);
    const head = (yaw, pitch) => page.evaluate((y, p) => { window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0); }, yaw, pitch);
    const looks = [];
    for (const pitch of PITCHES) for (const yaw of YAWS) looks.push({ yaw, pitch });
    // the after build: the sweep three times — as HEAD drew (both off), the cull alone, both on (the last is the build's)
    for (const st of cull ? STATES : [{ name: 'head' }]) {
      if (cull) { await setMeasures(page, st.cull, st.vc); await wait(300); }
      for (const row of looks) {
        await head(row.yaw, row.pitch); await wait(60);
        const m = await sample(page);
        if (st.name === 'both' || st.name === 'head') Object.assign(row, { draws: m.draws, scene: m.scene, tris: m.tris });
        else { row[`draws_${st.name}`] = m.draws; row[`tris_${st.name}`] = m.tris; }
      }
    }
    const worst = looks.reduce((a, b) => (b.draws > a.draws ? b : a));
    const worstOff = cull ? looks.reduce((a, b) => (b.draws_none > a.draws_none ? b : a)) : null;
    const worstCull = cull ? looks.reduce((a, b) => (b.draws_cull > a.draws_cull ? b : a)) : null;
    const lookBack = looks.find((l) => l.yaw === LOOK_BACK.yaw && l.pitch === LOOK_BACK.pitch);
    const front = looks.find((l) => l.yaw === 0 && l.pitch === 0);
    R.headset = { cull, looks, worst: { at: `head yaw ${worst.yaw}° pitch ${worst.pitch}°`, draws: worst.draws, tris: worst.tris },
      worstCullOff: worstOff ? { at: `head yaw ${worstOff.yaw}° pitch ${worstOff.pitch}°`, draws: worstOff.draws_none, tris: worstOff.tris_none } : null,
      worstCullOnly: worstCull ? { at: `head yaw ${worstCull.yaw}° pitch ${worstCull.pitch}°`, draws: worstCull.draws_cull, tris: worstCull.tris_cull } : null,
      front, lookBack: r.room === '2016' ? lookBack : undefined,
      over: looks.filter((l) => l.draws > BUDGET).map((l) => `${l.yaw}/${l.pitch}: ${l.draws}`),
      maxTris: Math.max(...looks.map((l) => l.tris)) };
    console.log(`[${r.room} headset] worst ${worst.draws} draws at yaw ${worst.yaw} pitch ${worst.pitch}${worstOff ? ` (both off: ${worstOff.draws_none} at yaw ${worstOff.yaw} pitch ${worstOff.pitch}; cull alone: ${worstCull.draws_cull})` : ''}; front ${front.draws}; max tris ${R.headset.maxTris}`);
    if (LABEL === 'after') {
      check(r.room, `headset: every look from the seat ≤ ${BUDGET} draw calls (24 yaws × 3 pitches)`, worst.draws <= BUDGET, `worst ${worst.draws} at ${R.headset.worst.at}${R.headset.over.length ? '; over: ' + R.headset.over.join(', ') : ''}`);
      check(r.room, 'headset: every look ≤ 75k triangles', R.headset.maxTris <= 75000, `max ${R.headset.maxTris}`);
    }
    // the photographs: the front, the worst, and Vera's look back
    const poses = [{ name: 'front', yaw: 0, pitch: 0 }, { name: 'worst', yaw: worstOff ? worstOff.yaw : worst.yaw, pitch: worstOff ? worstOff.pitch : worst.pitch }];
    if (r.room === '2016') poses.push({ name: 'look-back', ...LOOK_BACK });
    R.headset.photos = {};
    for (const p of poses) {
      await head(p.yaw, p.pitch); await wait(400);
      if (LIST) {
        await page.evaluate(() => { window.__s396.keep = true; });
        await sample(page);
        R.headset[`list-${p.name}`] = await page.evaluate(() => { const l = window.__s396.list; window.__s396.keep = false; return l; });
      }
      const file = `${LABEL}-${r.room}-xr-${p.name}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const photo = R.headset.photos[p.name] = { file, yaw: p.yaw, pitch: p.pitch };
      if (cull) {
        const pr = await pairedRender(page);
        Object.assign(photo, { paired: pr });
        check(r.room, `headset ${p.name} (yaw ${p.yaw}° pitch ${p.pitch}°): one frame, rendered off / cull alone / both — neither changes a pixel`, pairedVerdict(pr), pairedText(pr));
      }
    }
    R.headset.errors = errors;
    check(r.room, 'headset: no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  // ── the computer: the same seat, the free camera ─────────────────────────
  if (DESKTOP) {
    const { page, errors } = await open(r, 1280, 720);
    const cull = await hasCull(page);
    const looks = [];
    for (const pitch of PITCHES) for (const yaw of YAWS) looks.push({ yaw, pitch });
    for (const st of cull ? [STATES[0], STATES[2]] : [{ name: 'head' }]) {
      if (cull) { await setMeasures(page, st.cull, st.vc); await wait(300); }
      for (const row of looks) {
        await page.evaluate((s, dy, p) => window.__camFree(s.x, s.y, s.z, p, s.yaw + dy), r.seat, row.yaw, row.pitch); await wait(60);
        const m = await sample(page);
        if (st.name === 'both' || st.name === 'head') Object.assign(row, { draws: m.draws, tris: m.tris });
        else row.draws_none = m.draws;
      }
    }
    const worst = looks.reduce((a, b) => (b.draws > a.draws ? b : a));
    R.computer = { cull, looks, worst: { at: `yaw +${worst.yaw}° pitch ${worst.pitch}°`, draws: worst.draws, tris: worst.tris },
      worstCullOff: cull ? Math.max(...looks.map((l) => l.draws_none)) : undefined,
      lookBack: r.room === '2016' ? looks.find((l) => l.yaw === LOOK_BACK.yaw && l.pitch === LOOK_BACK.pitch) : undefined };
    console.log(`[${r.room} computer] worst ${worst.draws} at ${R.computer.worst.at}${cull ? ` (both off: worst ${R.computer.worstCullOff})` : ''}`);
    if (r.room === '2016') {
      await page.evaluate((s, dy, p) => window.__camFree(s.x, s.y, s.z, p, s.yaw + dy), r.seat, LOOK_BACK.yaw, LOOK_BACK.pitch); await wait(400);
      const file = `${LABEL}-${r.room}-computer-look-back.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      R.computer.photo = { file };
      if (cull) {
        const pr = await pairedRender(page);
        Object.assign(R.computer.photo, { paired: pr });
        check(r.room, 'computer look-back: one frame, rendered off / cull alone / both — neither changes a pixel', pairedVerdict(pr), pairedText(pr));
      }
    }
    R.computer.errors = errors;
    check(r.room, 'computer: no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
}
/** ⚑ S398 — the same frame drawn with the cascade's bands batched (the build) and with the old tear-down (nothing
 *  batched while the cascade runs), the seat's cull on throughout, Math.random seeded per render as above.
 *
 *  A batch draws its boxes pre-transformed into the world and in another ORDER than the props drawn one by one, so the
 *  two pictures are the same to within one level of 255 but not bit for bit, and where two coplanar surfaces overlap (a
 *  sign's mat on its board, a poster flush on a wall) the one drawn last wins: the old build flips those ties itself, at
 *  each cascade's start and end, when the whole room goes from one batch to none and back. So the old tear-down is drawn
 *  TWICE, its props' private materials cloned in their order and then in the reverse order (the renderer orders opaque
 *  draws by material): a pixel that differs between those two is a tie, and either winner is the old build's. A REAL
 *  difference is a pixel more than one level from BOTH old pictures — a prop shown in a state it is not in — and there
 *  must be none. The strict count (any pixel, any level) is reported beside. Inactive: only the build's draws. */
/** A pixel more than one level from BOTH old pictures is not a draw-order tie. Two kinds remain, and neither is a prop in
 *  the wrong state: a triangle's EDGE landing on the other side of a pixel's centre (a batch's vertices are transformed on
 *  the CPU, a prop's on the GPU: the same point to within float rounding), and a DEPTH FLIP between two near-coplanar
 *  layers far off (a sign's mat on its board, 6 mm apart at 9.8 m: the same float rounding decides which is nearer) —
 *  a strip two or three pixels tall along the layer's edge (S398, traced: the 2026 sign in 2016 → 2026, diff image in the
 *  job's research folder). A prop drawn in a state it is not in is a FILLED shape, its whole projected area. So the
 *  verdict counts INTERIOR pixels (all four neighbours real): at most INTERIOR_PIXELS a moment, which a strip three
 *  pixels tall and up to 64 long stays under and any prop seen at reading size does not. The strict counts are kept. */
const INTERIOR_PIXELS = 64;
async function bandsRender(page, settled = false) {
  return page.evaluate(async (settled) => {
    const app = window.__app, gl = app.graphicsDevice.gl, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, R = app.renderer, mb = window.__morphBands;
    if (!mb || (!settled && !mb.active)) return { active: false };
    const grab = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
    const random = Math.random;
    const room = app.root.findByName('era1-room');
    const render = (on, reverse = false) => {
      let seed = 0x2f6b;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const saved = [];
      try {
        window.__seatCull.enabled = true; if (settled) mb.settled(on); else mb.batched(on);
        if (reverse && room) {
          // the same values, new material ids in the reverse order (put back after the render: the morph holds the originals)
          const mis = []; room.forEach((n) => { for (const mi of n.render?.meshInstances ?? []) mis.push(mi); });
          for (const mi of mis.reverse()) { const m = mi.material; if (!m || mi.batching) continue; saved.push([mi, m]); const c = m.clone(); c.update(); mi.material = c; }
        }
        const d0 = R._forwardDrawCalls; app.render(); return { px: grab(), draws: R._forwardDrawCalls - d0 };
      } finally { for (const [mi, m] of saved) mi.material = m; Math.random = random; }
    };
    const on1 = render(true), off = render(false), offR = render(false, true), on2 = render(true);
    const delta = (A, B, i) => Math.max(Math.abs(A.px[i] - B.px[i]), Math.abs(A.px[i + 1] - B.px[i + 1]), Math.abs(A.px[i + 2] - B.px[i + 2]));
    const compare = (A, B) => {
      let n = 0, maxDelta = 0, over1 = 0, real = 0, ties = 0; const where = [], realAt = new Set();
      for (let i = 0; i < A.px.length; i += 4) {
        const d = delta(A, B, i);
        if (B === off && delta(off, offR, i)) ties++;
        if (!d) continue;
        n++; if (d > maxDelta) maxDelta = d; if (d > 1) over1++;
        const isReal = B === off && d > 1 && delta(A, offR, i) > 1;
        if (isReal) { real++; realAt.add(i / 4); }
        if (where.length < 12 && (isReal || where.length < 4)) { const k = i / 4; where.push({ x: k % W, y: H - 1 - Math.floor(k / W), a: [A.px[i], A.px[i + 1], A.px[i + 2]], b: [B.px[i], B.px[i + 1], B.px[i + 2]], real: isReal }); }
      }
      // a real pixel with a real neighbour is part of a run (an edge along a pixel row, a depth flip); one with all four
      //   neighbours real is INSIDE a filled shape — what a prop drawn in a state it is not in looks like
      let clustered = 0, interior = 0;
      for (const k of realAt) {
        const x = k % W;
        for (const d of [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1]) { const j = k + d; if (realAt.has(j) && Math.abs((j % W) - x) <= 1) { clustered++; break; } }
        if (x > 0 && x < W - 1 && realAt.has(k - 1) && realAt.has(k + 1) && realAt.has(k - W) && realAt.has(k + W)) interior++;
      }
      return { pixels: n, maxDelta, over1, real, clustered, interior, ties, where };
    };
    return { active: true, diff: compare(on1, off), noise: compare(on1, on2).pixels, draws: { on: on1.draws, off: off.draws }, stats: window.__morphBandStats };
  }, settled);
}

if (CHANGE) {
  report.changes = [];
  /** the four changes: each opened at its FROM era's review route (?era=, `home=0`: no entrance) and started the way the
   *  piece starts it — the restart's own `onEraShift` (as S396 did), 1997 → 2003 by the debug replay (`__relocate`: 1997
   *  has no ?era=), and the Close by `__enterClose` from Maya's desk (the hand-off the visit takes) */
  const CHANGES = [
    { key: 'e1-e2', label: '1997 → 2003', era: 2, start: () => window.__relocate('e1', 'e2') },
    { key: 'e2-e3', label: '2003 → 2016', era: 2, start: () => window.__os.onEraShift('e3') },
    { key: 'e3-e4', label: '2016 → 2026', era: 3, start: () => window.__os.onEraShift('e4') },
    { key: 'close', label: '2026 → the Close', era: 4, start: () => window.__enterClose() }
  ].filter((c) => !CHANGES_ONLY || CHANGES_ONLY.split(',').includes(c.key));
  for (const c of CHANGES) for (const mode of ['desktop', 'xr']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
    // the change's own legs stay on (no descent=0); home=0: no entrance
    await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=${c.era}&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__os && window.__camPose && window.__app && window.__seatCull && window.__relocate && window.__enterClose, { timeout: 180000 });
    await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
    if (mode === 'xr') {
      await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(-20, 0, 0); head.camera.fov = 90;
        const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
        window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src); });
      await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    }
    for (let i = 0; i < 40; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(800); }
    await wait(c.key === 'close' ? 6000 : 3000);
    // the old build's own batch/no-batch difference, at the settled moment before the change (see bandsRender)
    const settledPair = c.key === 'close' ? null : await bandsRender(page, true);
    const t0 = Date.now(); const samples = [];
    await page.evaluate(c.start);
    let landedAt = -1, closeLeft = false;
    while ((Date.now() - t0) / 1000 < (c.key === 'close' ? 120 : 100)) {
      const t = (Date.now() - t0) / 1000;
      const pose = await page.evaluate(() => { const p = window.__camPose(); const cs = window.__closeState?.();
        return { leg: p.leg ?? null, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(0), stage: cs?.stage ?? null, glitching: !!cs?.glitching }; });
      // a look back toward the rest of the building at every other sample, in the headset (the head turns; the flight does not)
      if (mode === 'xr') await page.evaluate((k) => window.__app.root.findByName('camera').setLocalEulerAngles(-10, k % 2 ? 160 : 0, 0), samples.length);
      const pr = await pairedRender(page, true);
      const br = await bandsRender(page);
      samples.push({ t: +t.toFixed(1), ...pose, diff: pr.cull.pixels, where: pr.cull.where.slice(0, 3), noise: pr.noise, hidden: pr.hidden, drawsOff: pr.draws.none, drawsOn: pr.draws.cull, eyeRoom: pr.cullLast.region, faces: pr.cullLast.faces,
        bands: br.active ? { diff: br.diff.pixels, over1: br.diff.over1, real: br.diff.real, clustered: br.diff.clustered, interior: br.diff.interior, ties: br.diff.ties, maxDelta: br.diff.maxDelta, where: br.diff.where.slice(0, 6), noise: br.noise, drawsOn: br.draws.on, drawsOld: br.draws.off, stats: br.stats } : null });
      if (c.key === 'close') {
        // the flight, the rise to the stars, and night falling; ends once the messages begin (the room is gone by then)
        if (pose.stage && ['hold', 'message', 'open', 'settled'].includes(pose.stage)) { if (!closeLeft) closeLeft = true; else break; }
      } else {
        if (landedAt < 0 && !pose.leg && t > 3) landedAt = t;
        if (landedAt >= 0 && t > landedAt + 5) break;
      }
      await wait(300);
    }
    // a moment whose own noise floor is not 0 cannot judge anything (something there is not repeatable); it is counted,
    // and must stay rare — the cull itself is judged on every repeatable moment
    const judged = samples.filter((x) => !x.noise), bad = judged.filter((x) => x.diff);
    const culledAt = samples.filter((x) => x.hidden > 0).length, culledJudged = judged.filter((x) => x.hidden > 0).length;
    const peak = samples.reduce((a, b) => (b.drawsOn > a.drawsOn ? b : a), samples[0]);
    const peakOld = samples.reduce((m, x) => Math.max(m, x.bands ? x.bands.drawsOld : x.drawsOn), 0);
    const withBands = samples.filter((x) => x.bands), bandJudged = withBands.filter((x) => !x.bands.noise), bandBad = bandJudged.filter((x) => x.bands.interior > INTERIOR_PIXELS);
    const strict = bandJudged.filter((x) => x.bands.diff).length;
    const settledDiff = settledPair && settledPair.active ? { pixels: settledPair.diff.pixels, over1: settledPair.diff.over1, real: settledPair.diff.real, ties: settledPair.diff.ties, maxDelta: settledPair.diff.maxDelta, noise: settledPair.noise, draws: settledPair.draws } : null;
    report.changes.push({ change: c.label, key: c.key, mode, peak: { draws: peak.drawsOn, t: peak.t, leg: peak.leg, stage: peak.stage }, peakOldTearDown: peakOld,
      bandPixels: withBands.length ? { moments: withBands.length, strictZero: bandJudged.length - strict, maxPixels: Math.max(...withBands.map((x) => x.bands.diff)), maxOver1: Math.max(...withBands.map((x) => x.bands.over1)), maxReal: Math.max(...withBands.map((x) => x.bands.real)), maxInterior: Math.max(...withBands.map((x) => x.bands.interior)), maxDelta: Math.max(...withBands.map((x) => x.bands.maxDelta)) } : null,
      settledBatchVsNone: settledDiff, samples, errors });
    console.log(`[change ${c.label} ${mode}] ${samples.length} moments (${judged.length} repeatable), the cull hiding something in ${culledAt} (${culledJudged} repeatable); legs ${[...new Set(samples.map((x) => x.leg))].join(',')}; ` +
      `peak ${peak.drawsOn} draws at t ${peak.t} s (the old tear-down at the same moments: peak ${peakOld}); the cascade's bands live at ${withBands.length} moments`);
    check(`change ${c.label}`, `${mode}: at every repeatable moment of the change the cull changes no pixel`, bad.length === 0 && judged.length >= samples.length * 0.8,
      bad.length ? JSON.stringify(bad.slice(0, 3)) : `${judged.length}/${samples.length} moments repeatable, ${culledJudged} of them with something hidden, 0 px differ`);
    check(`change ${c.label}`, `${mode}: every moment ≤ ${BUDGET} draw calls (${samples.length} moments)`, peak.drawsOn <= BUDGET,
      `peak ${peak.drawsOn} at t ${peak.t} s${peak.leg ? ` (leg ${peak.leg})` : ''}${peak.stage ? ` (stage ${peak.stage})` : ''}; over: ${samples.filter((x) => x.drawsOn > BUDGET).map((x) => `${x.t}s:${x.drawsOn}`).join(', ') || 'none'}`);
    // the bands exist only in the S398 build: a run against an older build reports its peak and skips this
    const hasBands = await page.evaluate(() => !!window.__morphBands);
    if (hasBands) {
      check(`change ${c.label}`, `${mode}: at every repeatable moment its bands show no prop in another state than the old tear-down (no filled shape more than one level from both of its draw orders: ≤ ${INTERIOR_PIXELS} interior px)`,
        withBands.length > 0 && bandBad.length === 0 && bandJudged.length >= withBands.length * 0.8,
        (bandBad.length ? JSON.stringify(bandBad.slice(0, 3).map((x) => ({ t: x.t, ...x.bands }))) + '; ' : '') +
        `${bandJudged.length}/${withBands.length} cascade moments repeatable, ${bandJudged.length - strict} of them 0 px strictly; at most ${Math.max(0, ...withBands.map((x) => x.bands.diff))} px differ, ${Math.max(0, ...withBands.map((x) => x.bands.over1))} by more than one level (max ${Math.max(0, ...withBands.map((x) => x.bands.maxDelta))}), the rest draw-order ties, edges and depth flips (not a tie: at most ${Math.max(0, ...withBands.map((x) => x.bands.real))} px a moment, ${Math.max(0, ...withBands.map((x) => x.bands.interior))} of them interior); ` +
        `the old build's own batch/no-batch difference at the settled moment before: ${settledDiff ? `${settledDiff.pixels} px, ${settledDiff.over1} by more than one level, ${settledDiff.real} real` : 'n/a'}; draws there ${Math.min(...withBands.map((x) => x.bands.drawsOn))}–${Math.max(...withBands.map((x) => x.bands.drawsOn))} (old tear-down ${Math.min(...withBands.map((x) => x.bands.drawsOld))}–${Math.max(...withBands.map((x) => x.bands.drawsOld))})`);
    }
    check(`change ${c.label}`, `${mode}: no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
}
report.checks = checks;
fs.writeFileSync(path.join(OUT, `report-${LABEL}.json`), JSON.stringify(report, null, 1));

// ── before → after: the table, and the HEAD run's photos against the after run's ──
const bPath = path.join(OUT, 'report-before.json'), aPath = path.join(OUT, 'report-after.json');
if (fs.existsSync(bPath) && fs.existsSync(aPath)) {
  const B = JSON.parse(fs.readFileSync(bPath, 'utf8')), A = JSON.parse(fs.readFileSync(aPath, 'utf8'));
  const table = {};
  const page = await browser.newPage();
  await page.goto('about:blank');
  /** two PNGs compared in the page (no image library in node_modules): pixels whose RGB differs at all, and by > 24 */
  const pixelDiff = async (fa, fb) => page.evaluate(async (a, b) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const x = c.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let any = 0, big = 0;
    for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); if (d) any++; if (d > 24) big++; }
    return { pixels: c.width * c.height, any, big };
  }, 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, fa)).toString('base64'), 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, fb)).toString('base64'));
  for (const room of Object.keys(A.rooms)) {
    const b = B.rooms[room], a = A.rooms[room];
    if (!b?.headset || !a?.headset) continue;
    const t = table[room] = { who: a.who,
      headsetWorst: { before: b.headset.worst, after: a.headset.worst },
      headsetFront: { before: b.headset.front?.draws, after: a.headset.front?.draws },
      computerWorst: { before: b.computer?.worst, after: a.computer?.worst } };
    if (room === '2016') t.veraLookBack = { pose: `head yaw ${LOOK_BACK.yaw}° pitch ${LOOK_BACK.pitch}°`, before: b.headset.lookBack?.draws, after: a.headset.lookBack?.draws, trisBefore: b.headset.lookBack?.tris, trisAfter: a.headset.lookBack?.tris };
    t.photos = {};
    for (const [name, p] of Object.entries(a.headset.photos || {})) {
      const bp = b.headset.photos?.[name];
      // the worst pose may differ between runs: compare like with like only
      const paired = p.paired ? { cullPixels: p.paired.cull.pixels, mergePixels: p.paired.merge?.pixels, mergeMaxDelta: p.paired.merge?.maxDelta, noise: p.paired.noise, draws: p.paired.draws } : undefined;
      if (!bp || bp.yaw !== p.yaw || bp.pitch !== p.pitch) { t.photos[name] = { after: p.file, paired }; continue; }
      t.photos[name] = { before: bp.file, after: p.file, headRunVsAfter: await pixelDiff(bp.file, p.file), paired };
    }
    if (a.computer?.photo && b.computer?.photo) { const pp = a.computer.photo.paired; t.photos['computer-look-back'] = { before: b.computer.photo.file, after: a.computer.photo.file, headRunVsAfter: await pixelDiff(b.computer.photo.file, a.computer.photo.file), paired: pp ? { cullPixels: pp.cull.pixels, mergePixels: pp.merge?.pixels, mergeMaxDelta: pp.merge?.maxDelta, noise: pp.noise, draws: pp.draws } : undefined }; }
  }
  fs.writeFileSync(path.join(OUT, 'before-after.json'), JSON.stringify(table, null, 1));
  console.log('\nBEFORE → AFTER (headset, raw draws)');
  for (const [room, t] of Object.entries(table)) {
    console.log(`  ${room} ${t.who}: worst ${t.headsetWorst.before.draws} (${t.headsetWorst.before.at}) → ${t.headsetWorst.after.draws} (${t.headsetWorst.after.at}); front ${t.headsetFront.before} → ${t.headsetFront.after}` +
      (t.veraLookBack ? `; Vera's look back ${t.veraLookBack.before} → ${t.veraLookBack.after}` : ''));
  }
}
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks pass → ${path.relative(process.cwd(), OUT)}/report-${LABEL}.json`);
process.exit(failed.length ? 1 : 0);
