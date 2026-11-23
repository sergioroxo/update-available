#!/usr/bin/env node
/**
 * ⚑ S406 (UiB job 32 Part A, H4) — WHERE THE FRAME GOES. His headset run of 20 Nov read 55–69 fps for the whole of 2003
 * (42 in the phone game), 13 fps in the dissolve into Daniel's room and 55–63 in the 1997 → 2003 flight, against a 72 floor
 * on a 90 Hz headset, with no more draw calls than 1997 (HEADSET_RUN §12). Nobody can read the Quest from here, so this
 * measures the same moments on the desktop with the CPU throttled (4× by default: a phone-class main thread), on the
 * computer and in the seated headset mock (s396's: `app.xr.active` forced, a tracked-pointer controller, the screens
 * redrawn at the headset's ×4), and COUNTS instead of guessing:
 *   · per frame: the engine's update (`frameupdate` → `framerender`) and render (`framerender` → `frameend`) in ms, and
 *     the interval between frames (the fps the page reached);
 *   · per frame: every texture sent to the GPU (`texImage2D` / `texSubImage2D` on the live context, and every mip chain
 *     rebuilt, `generateMipmap`), with its size in bytes and WHOSE it is (the entity whose material samples that canvas);
 *   · per frame: the 2D canvas text calls (`fillText`, `measureText`) — text laid out again;
 *   · over the window: a CPU profile (CDP), its top functions by self time, and the named draw functions' total time.
 *
 *     node tools/s406-frame-probe.mjs --port 5461 --label after [--out out/s406-frames] [--modes desktop,xr]
 *                                     [--only entrance,setup,dissolve,e1,e1kit,flight,e2,e2desk,phone] [--throttle 4]
 *                                     (S423: --only flight34turn,flight34cascade,flight34cross — 2016 → 2026, asked for only)
 *                                     [--seconds 6] [--no-profile]
 *
 * Writes <out>/<label>.json and <label>.md (one row per moment and mode). Needs a Vite dev server on --port. Measurement
 * only: it changes nothing in the piece.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'probe');
const OUT = path.resolve(flag('out', 'out/s406-frames'));
const MODES = flag('modes', 'desktop,xr').split(',');
const ONLY = flag('only', '');
const THROTTLE = Number(flag('throttle', 4));
const SECONDS = Number(flag('seconds', 6));
const PROFILE = !has('no-profile');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });

/** the instruments, installed once the app exists */
const INSTALL = () => {
  const app = window.__app, gl = app.graphicsDevice.gl;
  if (window.__s406) return;
  const S = window.__s406 = { frames: [], cur: null, owners: new Map(), recording: false, text: 0, protos: new Set() };
  // ⚑ a material's shader variants thrown away and looked up again, per frame: a StandardMaterial COLOUR read through its
  //   getter (m.diffuse, m.emissive) marks its shader dirty, so a per-frame read rebuilds that material's shaders every frame
  S.hookMaterials = () => {
    for (const layer of app.scene.layers.layerList) for (const mi of layer.meshInstances) {
      const m = mi.material; if (!m) continue; const P = Object.getPrototypeOf(m); if (S.protos.has(P)) continue; S.protos.add(P);
      const g = P.getShaderVariant, c = P.clearVariants;
      if (g) P.getShaderVariant = function (...a) { const f = S.cur; if (f && S.recording) { f.variants++; f.vby[this.name || '?'] = (f.vby[this.name || '?'] ?? 0) + 1; } return g.apply(this, a); };
      if (c) P.clearVariants = function (...a) { const f = S.cur; if (f && S.recording) f.clears++; return c.apply(this, a); };
    }
  };
  const label = (src) => {
    if (!src) return 'data';
    let o = S.owners.get(src);
    if (o) return o;
    const tag = src instanceof HTMLVideoElement ? 'video' : src instanceof HTMLImageElement ? 'image' : src instanceof HTMLCanvasElement ? 'canvas' : 'other';
    return `${tag} ${src.width}x${src.height}`;
  };
  const bytesOf = (args) => {
    // texImage2D(target, level, ifmt, w, h, border, fmt, type, pixels) | (target, level, ifmt, fmt, type, source)
    // texSubImage2D(target, level, x, y, w, h, fmt, type, pixels) | (target, level, x, y, fmt, type, source)
    const src = args[args.length - 1];
    if (src && typeof src === 'object' && 'width' in src && !(ArrayBuffer.isView(src))) {
      const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
      return { bytes: w * h * 4, src };
    }
    // an array upload (the engine's own data textures: lights, the morph's mask): its size from the arguments
    const w = args.length >= 9 ? (kindOf(args) === 'sub' ? args[4] : args[3]) : 0, h = args.length >= 9 ? (kindOf(args) === 'sub' ? args[5] : args[4]) : 0;
    return { bytes: (w | 0) * (h | 0) * 4, src: null, dims: `${w}x${h}` };
  };
  let kindNow = 'img';
  const kindOf = () => kindNow;
  const wrap = (name, kind) => {
    const orig = gl[name].bind(gl);
    gl[name] = (...args) => {
      const c = S.cur;
      if (c && S.recording) {
        if (kind === 'mip') { c.mips++; }
        else {
          kindNow = kind;
          const { bytes, src, dims } = bytesOf(args);
          if (args[1] === 0 || kind === 'sub') {
            c.uploads++; c.bytes += bytes;
            const who = src ? label(src) : `data ${dims}`; c.who[who] = (c.who[who] ?? 0) + 1;
          }
        }
      }
      return orig(...args);
    };
  };
  wrap('texImage2D', 'img'); wrap('texSubImage2D', 'sub'); wrap('generateMipmap', 'mip');
  const P = CanvasRenderingContext2D.prototype;
  for (const m of ['fillText', 'measureText', 'strokeText']) {
    const o = P[m];
    P[m] = function (...a) { if (S.recording) S.text++; return o.apply(this, a); };
  }
  let t0 = 0, t1 = 0, last = 0;
  app.on('frameupdate', () => {
    const now = performance.now();
    if (S.recording) S.cur = { t: now, gap: last ? now - last : 0, update: 0, render: 0, uploads: 0, bytes: 0, mips: 0, text: 0, who: {}, variants: 0, clears: 0, vby: {} };
    last = now; t0 = now; S.text = 0;
  });
  app.on('framerender', () => { t1 = performance.now(); if (S.cur) S.cur.update = t1 - t0; });
  app.on('frameend', () => {
    const c = S.cur; if (!c || !S.recording) return;
    c.render = performance.now() - t1; c.text = S.text; c.draws = window.__drawCalls ?? 0;
    S.frames.push(c); S.cur = null;
  });
  // who samples which canvas: rebuilt before each window (new screens arrive with the story)
  S.mapOwners = () => {
    S.owners.clear();
    const seen = new Set();
    for (const layer of app.scene.layers.layerList) for (const mi of layer.meshInstances) {
      const m = mi.material; if (!m || seen.has(m)) continue; seen.add(m);
      for (const t of [m.emissiveMap, m.diffuseMap, m.opacityMap]) {
        const s = t?.getSource?.(); if (!s || S.owners.has(s)) continue;
        S.owners.set(s, `${mi.node?.name ?? '?'} ${s.width}x${s.height}`);
      }
    }
    app.root.forEach((n) => { const r = n.render; if (!r) return; for (const mi of r.meshInstances ?? []) { const m = mi.material; for (const t of [m?.emissiveMap, m?.diffuseMap]) { const s = t?.getSource?.(); if (s && !S.owners.has(s)) S.owners.set(s, `${n.name} ${s.width}x${s.height}`); } } });
  };
};

const XR_MOCK = () => {
  const app = window.__app, head = app.root.findByName('camera');
  Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
  head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
  const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
  window.__controller = src; app.xr.input.fire('add', src);
};
const xrSelect = (page) => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));

/** one measuring window on the page as it stands */
async function measure(page, cdp, seconds) {
  // the profiler's own start stalls the page for ~½ s: it starts first, and the frames are counted after it has settled
  if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); await wait(800); }
  await page.evaluate(() => { window.__s406.mapOwners(); window.__s406.hookMaterials(); window.__s406.frames = []; window.__s406.recording = true; });
  await wait(seconds * 1000);
  const frames = await page.evaluate(() => { const S = window.__s406; S.recording = false; const f = S.frames; S.frames = []; return f; });
  let top = [], named = {};
  if (PROFILE) {
    const { profile } = await cdp.send('Profiler.stop');
    ({ top, named } = summarize(profile));
  }
  return { ...stats(frames), top, named };
}

const NAMED = ['draw', 'drawDesktop', 'update', 'upload', 'render', 'renderForwardInternal', 'fillText', 'measureText', 'drawImage', 'texImage2D', 'texSubImage2D', 'generateMipmap', 'wrapText', 'paint', 'tick'];
function summarize(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas; const samples = profile.samples;
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const total = new Map();
  for (let i = 0; i < samples.length; i++) {
    const n = byId.get(samples[i]); const d = (dt[i] ?? 0) / 1000;
    const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/').replace(/\?.*$/, '')}:${n.callFrame.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + d);
    // inclusive time for each distinct function up the stack
    const seen = new Set(); let id = samples[i];
    while (id !== undefined) {
      const m = byId.get(id); const k = `${m.callFrame.functionName || '(anon)'} ${m.callFrame.url.split('/').slice(-1)[0].replace(/\?.*$/, '')}:${m.callFrame.lineNumber + 1}`;
      if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) ?? 0) + d); }
      id = parent.get(id);
    }
  }
  const span = (profile.endTime - profile.startTime) / 1000;
  const top = [...self.entries()].filter(([k]) => !/^\((idle|program|garbage collector|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([k, ms]) => ({ fn: k, ms: +ms.toFixed(1), pct: +(100 * ms / span).toFixed(1) }));
  const idle = [...self.entries()].filter(([k]) => /^\(idle\)/.test(k)).reduce((a, [, v]) => a + v, 0);
  const gc = [...self.entries()].filter(([k]) => /^\(garbage/.test(k)).reduce((a, [, v]) => a + v, 0);
  const incl = [...total.entries()].filter(([k]) => /^(draw[A-Za-z]*|update|upload|paint|render[A-Za-z]*|tick[A-Za-z]*|layoutDoc|wrap[A-Za-z]*|fillText|measureText|drawImage|texImage2D|texSubImage2D|generateMipmap) /.test(k))
    .sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, ms]) => ({ fn: k, ms: +ms.toFixed(1), pct: +(100 * ms / span).toFixed(1) }));
  return { top, named: { spanMs: +span.toFixed(0), idlePct: +(100 * idle / span).toFixed(1), gcPct: +(100 * gc / span).toFixed(1), inclusive: incl } };
}
function stats(frames) {
  if (!frames.length) return { frames: 0 };
  const f = frames.slice(1);   // the first frame's gap straddles the window's start
  const avg = (k) => f.reduce((a, x) => a + x[k], 0) / Math.max(1, f.length);
  const gaps = f.map((x) => x.gap).sort((a, b) => a - b);
  const p = (q) => gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] ?? 0;
  const span = (f[f.length - 1]?.t ?? 0) - (f[0]?.t ?? 0) + (f[0]?.gap ?? 0);
  const who = {};
  for (const x of f) for (const [k, v] of Object.entries(x.who)) who[k] = (who[k] ?? 0) + v;
  const whoPerFrame = Object.fromEntries(Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, +(v / f.length).toFixed(2)]));
  // the worst half-second: the fewest frames in any 500 ms
  let worst = Infinity;
  for (let i = 0; i < f.length; i++) { let j = i; while (j < f.length && f[j].t - f[i].t < 500) j++; if (f[f.length - 1].t - f[i].t >= 500) worst = Math.min(worst, (j - i) * 2); }
  return {
    frames: f.length, fps: +(1000 * f.length / Math.max(1, span)).toFixed(1), worstHalfSecondFps: Number.isFinite(worst) ? worst : null,
    frameMs: +avg('gap').toFixed(1), p95FrameMs: +p(0.95).toFixed(1), maxFrameMs: +(gaps[gaps.length - 1] ?? 0).toFixed(1),
    updateMs: +avg('update').toFixed(2), renderMs: +avg('render').toFixed(2),
    uploadsPerFrame: +avg('uploads').toFixed(2), mbPerFrame: +(avg('bytes') / 1048576).toFixed(2), mipsPerFrame: +avg('mips').toFixed(2),
    textCallsPerFrame: +avg('text').toFixed(0), draws: Math.max(...f.map((x) => x.draws ?? 0)), uploadedBy: whoPerFrame,
    longFrames: f.filter((x) => x.gap > 100).slice(0, 6).map((x) => ({ gapMs: +x.gap.toFixed(0), updateMs: +x.update.toFixed(1), renderMs: +x.render.toFixed(1), uploads: x.uploads, mb: +(x.bytes / 1048576).toFixed(1), shaders: x.variants, who: x.who })),
    shaderLookupsPerFrame: +avg('variants').toFixed(1), shaderClearsPerFrame: +avg('clears').toFixed(1),
    shaderLookupsBy: Object.fromEntries(Object.entries(f.reduce((a, x) => { for (const [k, v] of Object.entries(x.vby)) a[k] = (a[k] ?? 0) + v; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, +(v / f.length).toFixed(1)]))
  };
}

/** open the piece at a route, the instruments in, the headset mocked if asked */
async function open(route, mode) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  await page.goto(`http://localhost:${PORT}/${route}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const cdp = await page.target().createCDPSession();
  return { page, cdp, errors };
}
/** once the app is up: the instruments in, the headset mocked if asked */
async function ready(page, mode) {
  await page.waitForFunction(() => window.__app && window.__os, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await page.evaluate(INSTALL);
  if (mode === 'xr') await page.evaluate(XR_MOCK);
}
const throttle = (cdp, on) => cdp.send('Emulation.setCPUThrottlingRate', { rate: on ? THROTTLE : 1 });
const settle = async (page) => { for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose?.() ?? {}); if (!p.driven && !p.descent) break; await wait(1000); } };
const calibrate = async (page) => { await xrSelect(page); await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {}); await wait(800); };

const SCENES = {
  /** the title in the stars, the setup in the stars, then the dissolve into Daniel's room (one page) */
  async entrance(mode, want) {
    const out = {};
    const { page, cdp, errors } = await open('?reinterp=1&kiosk=0&debug=1', mode);
    await ready(page, mode);
    await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 120000 });
    await wait(2500);
    if (want.has('entrance')) { await throttle(cdp, true); out.entrance = await measure(page, cdp, SECONDS); await throttle(cdp, false); }
    // a press opens the setup in the stars
    if (mode === 'xr') { await calibrate(page); await page.evaluate(() => { const h = window.__app.root.findByName('camera'); window.__controller.getOrigin = () => h.getPosition().clone(); window.__controller.getDirection = () => h.forward.clone(); }); await xrSelect(page); }
    else { await page.mouse.click(640, 360); }
    await page.waitForSelector('#restore-entrance[data-phase="setup"]', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => (window.__os.setup?.hits ?? []).length > 0, { timeout: 30000 }).catch(() => {});
    await wait(3000);
    if (want.has('setup')) { await throttle(cdp, true); out.setup = await measure(page, cdp, SECONDS); await throttle(cdp, false); }
    if (want.has('dissolve')) {
      // the setup answered (its own promise), so the window folds, the line types and the room restores: THE DISSOLVE (9 s)
      await page.evaluate(() => window.__os.setup?.resolve?.({ cut: 'speedrun' }));
      await page.waitForSelector('#restore-entrance[data-phase="typing"]', { timeout: 30000 }).catch(() => {});
      await throttle(cdp, true);
      await page.waitForSelector('#restore-entrance[data-phase="restore"]', { timeout: 60000 }).catch(() => {});
      out.dissolve = await measure(page, cdp, 9);
      await throttle(cdp, false);
    }
    out.errors = errors; await page.close();
    return out;
  },
  async e1(mode, want) {
    const out = {};
    const { page, cdp, errors } = await open('?reinterp=1&kiosk=0&debug=1&home=0', mode);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    await ready(page, mode);
    await page.waitForFunction(() => window.__camPose && window.__xrComfort, { timeout: 120000 });
    await wait(4000); await settle(page);
    if (mode === 'xr') await calibrate(page);
    await page.evaluate(() => window.__os.debugJump('desktop')); await wait(3000);
    if (want.has('e1')) { await throttle(cdp, true); out.e1 = await measure(page, cdp, SECONDS); await throttle(cdp, false); }
    if (want.has('e1kit')) {
      await page.evaluate(() => window.__os.debugJump('kit')); await wait(3000);
      await throttle(cdp, true); out.e1kit = await measure(page, cdp, SECONDS); await throttle(cdp, false);
    }
    out.errors = errors; await page.close();
    return out;
  },
  /** 1997 → 2003: s396's route (the era-2 page, the relocation replayed from 1997), the whole flight */
  async flight(mode) {
    const { page, cdp, errors } = await open('?reinterp=1&kiosk=0&era=2&debug=1&home=0', mode);
    await ready(page, mode);
    await page.waitForFunction(() => window.__camPose && window.__relocate && window.__xrComfort, { timeout: 180000 });
    if (mode === 'xr') { await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(-20, 0, 0)); await calibrate(page); }
    await settle(page); await wait(3000);
    await throttle(cdp, true);
    await page.evaluate(() => window.__relocate('e1', 'e2'));
    await wait(400);
    const flight = await measure(page, cdp, 8);
    await throttle(cdp, false);
    await page.close();
    return { flight, errors };
  },
  /** ⚑ S423 (UiB job 35 C) — 2016 → 2026: the era-3 page, Vera's chair, the change fired where play fires it (the restart's
   *  end, `onEraShift('e4')`), three windows keyed to the legs (a headset's turn is 11 s longer): the rise and the turn,
   *  the room changing (the cascade, from the turn's end), and the crossing's first seconds (the draw peak's leg) */
  async flight34(mode, want) {
    const out = {};
    const { page, cdp, errors } = await open('?reinterp=1&kiosk=0&era=3&debug=1&home=0', mode);
    await ready(page, mode);
    await page.waitForFunction(() => window.__camPose && window.__seatCut && window.__xrComfort, { timeout: 180000 });
    await settle(page); await wait(2000);
    await page.evaluate(() => window.__seatCut(90)); await wait(2500);
    if (mode === 'xr') await calibrate(page);
    await wait(1500);
    await throttle(cdp, true);
    await page.evaluate(() => window.__os.onEraShift('e4'));
    const legIs = (l) => page.waitForFunction((l) => window.__camPose().leg === l, { timeout: 120000, polling: 100 }, l).catch(() => {});
    if (want.has('flight34turn')) { await wait(1500); out.flight34turn = await measure(page, cdp, 5); }
    await legIs('watch');
    if (want.has('flight34cascade')) out.flight34cascade = await measure(page, cdp, 5);
    await legIs('build');
    if (want.has('flight34cross')) out.flight34cross = await measure(page, cdp, 5);
    await throttle(cdp, false);
    out.errors = errors; await page.close();
    return out;
  },
  async e2(mode, want) {
    const out = {};
    const { page, cdp, errors } = await open('?reinterp=1&kiosk=0&era=2&debug=1&home=0', mode);
    await ready(page, mode);
    await page.waitForFunction(() => window.__camPose && window.__xrComfort && window.__heldDevices, { timeout: 180000 });
    if (mode === 'xr') await calibrate(page);
    await settle(page); await wait(2000);
    // the era as it arrives: the intro, the boot, Lamby's dialog
    if (want.has('e2')) { await throttle(cdp, true); out.e2 = await measure(page, cdp, SECONDS); await throttle(cdp, false); }
    if (want.has('e2lamby')) {
      // Lamby on the glass for the first time (his introduction, swaying): os.ts lambyOnScreen
      await page.evaluate(() => window.__os.debugJump('e2Lamby')); await wait(4500);
      await throttle(cdp, true); out.e2lamby = await measure(page, cdp, SECONDS); await throttle(cdp, false);
    }
    if (want.has('e2desk') || want.has('phone')) {
      await page.evaluate(async () => {
        const o = window.__os; o.debugJump('e2Restorify'); if (o.restorify) o.restorify.open = false; o.dirty = true;
        const { ledger } = await import('/src/state/ledger.ts'); if (!ledger.checkins.some((c) => c.id === 'steady')) ledger.checkins.push({ id: 'steady', witness: '' });
      });
      await wait(3000);
      if (want.has('e2desk')) { await throttle(cdp, true); out.e2desk = await measure(page, cdp, SECONDS); await throttle(cdp, false); }
      if (want.has('phone')) {
        await page.evaluate(() => { const d = window.__heldDevices; d.take('e2', window.__app.root.findByName('camera')); });
        await wait(2500);
        // the game: start it the way a tap on the glass does (CLEAR waits on a first tap)
        await page.evaluate(() => { const d = window.__heldDevices; for (let i = 0; i < 3; i++) d.debugKey?.('e2', 'a'); });
        await wait(1500);
        await throttle(cdp, true); out.phone = await measure(page, cdp, SECONDS); await throttle(cdp, false);
        out.phoneHeld = await page.evaluate(() => window.__heldDevices.held('e2'));
      }
    }
    out.errors = errors; await page.close();
    return out;
  }
};

const ROWS = [
  { key: 'entrance', scene: 'entrance', where: 'the entrance (the title in the stars)' },
  { key: 'setup', scene: 'entrance', where: 'the setup in the stars' },
  { key: 'dissolve', scene: 'entrance', where: 'the dissolve into Daniel\'s room (9 s)' },
  { key: 'e1', scene: 'e1', where: '1997 (the desktop)' },
  { key: 'e1kit', scene: 'e1', where: '1997 (the starter kit open)' },
  { key: 'flight', scene: 'flight', where: 'the 1997 → 2003 flight' },
  { key: 'e2', scene: 'e2', where: '2003 (arriving: the intro, Lamby)' },
  { key: 'e2lamby', scene: 'e2', where: '2003 (Lamby on the glass, his introduction)' },
  { key: 'e2desk', scene: 'e2', where: '2003 (the desktop)' },
  { key: 'phone', scene: 'e2', where: '2003 (the phone game, CLEAR)' },
  // S423: 2016 → 2026 (only when asked: --only flight34turn,flight34cascade,flight34cross)
  { key: 'flight34turn', scene: 'flight34', where: '2016 → 2026: the rise and the turn', optIn: true },
  { key: 'flight34cascade', scene: 'flight34', where: '2016 → 2026: the room changing (the cascade)', optIn: true },
  { key: 'flight34cross', scene: 'flight34', where: '2016 → 2026: the crossing (the draw peak\'s leg)', optIn: true }
].filter((r) => (!ONLY && !r.optIn) || ONLY.split(',').includes(r.key));

const report = { label: LABEL, port: PORT, throttle: THROTTLE, seconds: SECONDS, at: new Date().toISOString(), rows: [] };
for (const mode of MODES) {
  const scenes = [...new Set(ROWS.map((r) => r.scene))];
  for (const sc of scenes) {
    const want = new Set(ROWS.filter((r) => r.scene === sc).map((r) => r.key));
    let res;
    try { res = await SCENES[sc](mode, want); } catch (e) { console.log(`[${mode} ${sc}] FAILED ${String(e).slice(0, 200)}`); res = { errors: [String(e).slice(0, 200)] }; }
    for (const r of ROWS.filter((x) => x.scene === sc)) {
      const m = res[r.key] ?? null;
      report.rows.push({ key: r.key, where: r.where, mode, ...(m ?? { frames: 0 }), errors: res.errors ?? [] , ...(r.key === 'phone' ? { phoneHeld: res.phoneHeld } : {}) });
      if (m) console.log(`[${LABEL} ${mode}] ${r.key.padEnd(9)} ${String(m.fps).padStart(5)} fps (worst ½ s ${m.worstHalfSecondFps}) · frame ${m.frameMs} ms (p95 ${m.p95FrameMs}) · update ${m.updateMs} · render ${m.renderMs} · uploads ${m.uploadsPerFrame}/frame ${m.mbPerFrame} MB · mips ${m.mipsPerFrame} · text ${m.textCallsPerFrame} · shaders ${m.shaderLookupsPerFrame} · draws ${m.draws}`);
    }
  }
}
fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(report, null, 2));
const md = [`# s406 frame probe — ${LABEL} (CPU ×${THROTTLE}, ${SECONDS} s windows)`, '',
  '| where | mode | fps | worst ½ s | frame ms (p95) | update ms | render ms | uploads/frame | MB/frame | mips/frame | text calls/frame | shader lookups/frame | draws | uploaded by (per frame) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...report.rows.map((r) => `| ${r.where} | ${r.mode} | ${r.fps ?? '-'} | ${r.worstHalfSecondFps ?? '-'} | ${r.frameMs ?? '-'} (${r.p95FrameMs ?? '-'}) | ${r.updateMs ?? '-'} | ${r.renderMs ?? '-'} | ${r.uploadsPerFrame ?? '-'} | ${r.mbPerFrame ?? '-'} | ${r.mipsPerFrame ?? '-'} | ${r.textCallsPerFrame ?? '-'} | ${r.shaderLookupsPerFrame ?? '-'} | ${r.draws ?? '-'} | ${Object.entries(r.uploadedBy ?? {}).map(([k, v]) => `${k} ×${v}`).join('; ')} |`),
  '', '## CPU profile: top self time per moment', '',
  ...report.rows.flatMap((r) => [`### ${r.where} · ${r.mode}`, `idle ${r.named?.idlePct ?? '-'} % · GC ${r.named?.gcPct ?? '-'} %`, '', ...(r.top ?? []).map((t) => `- ${t.pct} % — ${t.fn}`), '', 'inclusive:', ...(r.named?.inclusive ?? []).slice(0, 12).map((t) => `- ${t.pct} % — ${t.fn}`), ''])];
fs.writeFileSync(path.join(OUT, `${LABEL}.md`), md.join('\n'));
console.log(`wrote ${path.join(OUT, `${LABEL}.md`)}`);
await browser.close();
