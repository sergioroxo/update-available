/**
 * FLOW SAMPLER — the passive observer behind tools/flow-audit.mjs (UiB job 16 Part B, S369).
 *
 * WHY. Sérgio played the live build and found FLOW problems: panels over what was being read, timed prompts that
 * were too fast, several voices at once. A person cannot count those by eye and the walker's text census
 * (`window.__textNow`) cannot see them: it keeps words, not WHERE they were drawn, not WHAT was drawn over them,
 * and not WHEN they left. This records exactly that, every 250 ms, and never touches the piece.
 *
 * WHAT IT RECORDS (read-only; every canvas call goes through untouched):
 *  - every 2D canvas's draw list for the CURRENT frame: text runs with their device-pixel bounding boxes
 *    (getTransform + measureText + the font size), opaque fillRect / filled rect paths / clearRect / drawImage
 *    (the things that can COVER text), and clip rects (a scrolled-out line is not on screen);
 *  - a frame starts when something opaque covers the whole canvas, or the canvas is resized (which clears it);
 *  - a child canvas drawn into a parent (drawImage(canvas)) is composed into the parent's list, so a window that is
 *    painted on its own canvas and blitted onto the board is judged where the player sees it;
 *  - the hooks: `__guide()`, the Lamby guide's view, the 2016 phone's state, the 2026 ball/clip, the era and phase;
 *  - the page's own clock: wall time, and "piece time" (the sum of frame deltas clamped at 0.1 s, which is what the
 *    engine's dt does) so a slow headless renderer can be told apart from a slow piece.
 *
 * OUTPUT. `<dir>/samples.jsonl`, one JSON object per line:
 *   {k:'s', t, pt, f, era, ph, g:{…hooks, only when changed}, c:{<canvasId>:{w,h,t:[[text,x0,y0,x1,y1,cover,via?],…]}}}
 *      `c` holds only canvases whose text changed since the last line; a canvas that lost all its text is `t:[]`.
 *   {k:'press', t, how}            a real mouse press by the walker (down)
 *   {k:'note', t, kind, target, era, phase}   the walker's own log lines
 * `t` is epoch milliseconds, so the walker's Date.now() and the page's clock agree.
 *
 * It costs a few ms per sample and a little per draw call; it changes nothing the piece reads. If a run's frame
 * rate drops under 12 fps the analyser says so, because the engine clamps dt and time dilates.
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** runs inside the page, before any of the piece's own script (evaluateOnNewDocument) */
function pageSampler(opts) {
  if (window.__flowInstalled) return;
  window.__flowInstalled = true;
  const INTERVAL = opts.interval || 250;
  const OPS_CAP = 4000;
  const TEXT_CAP = 400;
  const states = new WeakMap();           // canvas -> { id, ops, ver, w, h }
  const refs = [];                        // WeakRef(canvas), for the sampler loop
  const byId = new Map();                 // id -> WeakRef(canvas)
  const ctxs = new WeakMap();             // ctx -> { clip, stack, pBox, pOther }
  let nextId = 1;

  const stateOf = (c) => {
    let s = states.get(c);
    if (!s) { s = { id: nextId++, ops: [], ver: 0 }; states.set(c, s); const r = new WeakRef(c); refs.push(r); byId.set(s.id, r); }
    return s;
  };
  const cs = (ctx) => { let o = ctxs.get(ctx); if (!o) { o = { clip: null, stack: [], pBox: null, pOther: false }; ctxs.set(ctx, o); } return o; };
  const measureCtx = document.createElement('canvas').getContext('2d');
  const wcache = new Map();
  const widthOf = (font, s) => {
    const k = font + '\u0001' + s;
    let w = wcache.get(k);
    if (w === undefined) { measureCtx.font = font; w = measureCtx.measureText(s).width; if (wcache.size > 20000) wcache.clear(); wcache.set(k, w); }
    return w;
  };

  const aabb = (m, x0, y0, x1, y1) => {
    const xs = [m.a * x0 + m.c * y0 + m.e, m.a * x1 + m.c * y0 + m.e, m.a * x0 + m.c * y1 + m.e, m.a * x1 + m.c * y1 + m.e];
    const ys = [m.b * x0 + m.d * y0 + m.f, m.b * x1 + m.d * y0 + m.f, m.b * x0 + m.d * y1 + m.f, m.b * x1 + m.d * y1 + m.f];
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const inter = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  const area = (a) => Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);

  const isOpaque = (ctx) => {
    if (ctx.globalAlpha < 0.9) return false;
    if (ctx.globalCompositeOperation !== 'source-over') return false;
    const f = ctx.fillStyle;
    if (typeof f !== 'string') return true;            // a gradient or pattern
    if (f === 'transparent') return false;
    const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(f);
    if (m) return Number(m[1]) >= 0.9;
    if (/^#[0-9a-f]{8}$/i.test(f)) return parseInt(f.slice(7, 9), 16) >= 230;
    return true;
  };
  const invisibleText = (ctx) => {
    if (ctx.globalAlpha < 0.2) return true;
    const f = ctx.fillStyle;
    if (f === 'transparent') return true;
    if (typeof f === 'string') {
      const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(f);
      if (m && Number(m[1]) < 0.2) return true;
    }
    return false;
  };

  const resetFrame = (s) => { s.ops.length = 0; s.ver++; };
  const push = (s, op) => {
    s.ops.push(op); s.ver++;
    if (s.ops.length > OPS_CAP) s.ops.splice(0, OPS_CAP >> 2);
  };
  const clipOf = (ctx) => cs(ctx).clip;

  const addText = (ctx, t, x, y, maxW) => {
    const str = String(t).replace(/\s+/g, ' ').trim();
    if (!str || invisibleText(ctx)) return;
    const c = ctx.canvas; if (!c || !c.width) return;
    const font = ctx.font || '12px sans-serif';
    const px = /(\d+(?:\.\d+)?)px/.exec(font);
    const fs = px ? Number(px[1]) : 12;
    let w = widthOf(font, String(t));
    if (typeof maxW === 'number' && maxW > 0) w = Math.min(w, maxW);
    const h = fs * 1.15;
    const al = ctx.textAlign;
    const ax = al === 'center' ? 0.5 : (al === 'right' || al === 'end') ? 1 : 0;
    const bl = ctx.textBaseline;
    let top;
    if (bl === 'top' || bl === 'hanging') top = 0; else if (bl === 'middle') top = -0.5; else if (bl === 'bottom') top = -1; else top = -0.82;
    const lx0 = x - ax * w, ly0 = y + top * h;
    const m = ctx.getTransform();
    let b = aabb(m, lx0, ly0, lx0 + w, ly0 + h);
    const cl = clipOf(ctx);
    if (cl) b = inter(b, cl);
    if (b[2] - b[0] < 1 || b[3] - b[1] < 1) return;
    if (b[2] <= 0 || b[3] <= 0 || b[0] >= c.width || b[1] >= c.height) return;
    push(stateOf(c), { k: 't', s: str, b });
  };

  /** a covering op (opaque fill / erase / image): `full` starts a new frame */
  const addCover = (ctx, kind, b, whole) => {
    const c = ctx.canvas; if (!c || !c.width) return;
    const s = stateOf(c);
    const cl = clipOf(ctx);
    if (cl) b = inter(b, cl);
    if (b[2] <= b[0] || b[3] <= b[1]) return;
    if (whole && !cl && b[0] <= 0.5 && b[1] <= 0.5 && b[2] >= c.width - 0.5 && b[3] >= c.height - 0.5) { resetFrame(s); return; }
    push(s, { k: kind, b });
  };

  const wrap = (P) => {
    if (!P || P.__flowWrapped) return;
    P.__flowWrapped = true;
    const O = {};
    for (const n of ['fillText', 'strokeText', 'fillRect', 'clearRect', 'drawImage', 'fill', 'clip', 'save', 'restore', 'beginPath', 'rect', 'roundRect',
      'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'reset']) O[n] = P[n];
    const run = (name, rec) => { const orig = O[name]; if (!orig) return;
      P[name] = function (...a) { try { rec(this, a); } catch (e) { /* never break a draw */ } return orig.apply(this, a); }; };

    run('fillText', (ctx, a) => addText(ctx, a[0], a[1], a[2], a[3]));
    run('strokeText', (ctx, a) => addText(ctx, a[0], a[1], a[2], a[3]));
    run('fillRect', (ctx, a) => {
      const [x, y, w, h] = a;
      if (!(Math.abs(w) >= 4 && Math.abs(h) >= 4)) return;
      if (!isOpaque(ctx)) return;
      const b = aabb(ctx.getTransform(), Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h));
      addCover(ctx, 'r', b, true);
    });
    run('clearRect', (ctx, a) => {
      const [x, y, w, h] = a;
      if (!(Math.abs(w) >= 4 && Math.abs(h) >= 4)) return;
      const b = aabb(ctx.getTransform(), Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h));
      addCover(ctx, 'c', b, true);
    });
    run('save', (ctx) => { const o = cs(ctx); o.stack.push(o.clip); });
    run('restore', (ctx) => { const o = cs(ctx); if (o.stack.length) o.clip = o.stack.pop(); });
    run('reset', (ctx) => { const o = cs(ctx); o.clip = null; o.stack.length = 0; const c = ctx.canvas; if (c) resetFrame(stateOf(c)); });
    run('beginPath', (ctx) => { const o = cs(ctx); o.pBox = null; o.pOther = false; });
    const rectish = (ctx, a) => {
      const o = cs(ctx); const [x, y, w, h] = a;
      const b = [Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h)];
      if (o.pBox) { o.pOther = true; return; }               // two rects in one path: not a single rectangle
      o.pBox = { b, m: ctx.getTransform() };
    };
    run('rect', rectish); run('roundRect', rectish);
    for (const n of ['moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo']) run(n, (ctx) => { cs(ctx).pOther = true; });
    run('fill', (ctx, a) => {
      if (a.length && typeof a[0] === 'object' && a[0]) return;            // a Path2D
      const o = cs(ctx); if (o.pOther || !o.pBox || !isOpaque(ctx)) return;
      addCover(ctx, 'r', aabb(o.pBox.m, ...o.pBox.b), true);
    });
    run('clip', (ctx, a) => {
      if (a.length && typeof a[0] === 'object' && a[0]) return;
      const o = cs(ctx); if (o.pOther || !o.pBox) return;
      const b = aabb(o.pBox.m, ...o.pBox.b);
      o.clip = o.clip ? inter(o.clip, b) : b;
    });
    run('drawImage', (ctx, a) => {
      const img = a[0];
      let dx, dy, dw, dh, sx = 0, sy = 0, sw, sh;
      const iw = img.width || img.videoWidth || img.naturalWidth || 0, ih = img.height || img.videoHeight || img.naturalHeight || 0;
      if (a.length >= 9) { [, sx, sy, sw, sh, dx, dy, dw, dh] = a; }
      else if (a.length >= 5) { [, dx, dy, dw, dh] = a; sw = iw; sh = ih; }
      else { [, dx, dy] = a; dw = iw; dh = ih; sw = iw; sh = ih; }
      if (!(dw > 0 && dh > 0)) return;
      const m = ctx.getTransform();
      const b = aabb(m, dx, dy, dx + dw, dy + dh);
      const c = ctx.canvas; if (!c || !c.width) return;
      const s = stateOf(c);
      const isCanvas = typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement;
      const cl = clipOf(ctx);
      const bb = cl ? inter(b, cl) : b;
      if (bb[2] <= bb[0] || bb[3] <= bb[1]) return;
      if (isCanvas) {
        const src = stateOf(img).id;
        if (!cl && ctx.globalAlpha >= 0.9 && b[0] <= 0.5 && b[1] <= 0.5 && b[2] >= c.width - 0.5 && b[3] >= c.height - 0.5) resetFrame(s);
        if (ctx.globalAlpha >= 0.9 || true) push(s, { k: 'i', b: bb, src, map: { m: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, d: [dx, dy, dw, dh], s: [sx, sy, sw || iw, sh || ih] } });
      } else if (area(bb) >= 600 && ctx.globalAlpha >= 0.9) {
        push(s, { k: 'p', b: bb });                         // a picture (may have transparent corners): a soft cover
      }
    });

    // canvas size setters clear the canvas
    for (const Cn of ['HTMLCanvasElement', 'OffscreenCanvas']) {
      const C = window[Cn]; if (!C) continue;
      for (const prop of ['width', 'height']) {
        const d = Object.getOwnPropertyDescriptor(C.prototype, prop);
        if (!d || !d.set || d.__flow) continue;
        Object.defineProperty(C.prototype, prop, {
          configurable: true, enumerable: d.enumerable, get: d.get,
          set(v) { try { const s = states.get(this); if (s) resetFrame(s); } catch (e) { /* ignore */ } d.set.call(this, v); }
        });
      }
    }
  };
  wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype);
  wrap(window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype);

  // ── the composed, visible text list of one canvas (children blitted into it included) ──
  const listOf = (s, depth) => {
    const items = [];                       // {s, b, cov, via}
    for (const op of s.ops) {
      if (op.k === 't') items.push({ s: op.s, b: op.b, cov: 0, via: 0, a: area(op.b) });
      else {
        if (op.k === 'i' && depth < 3) {
          const r = byId.get(op.src); const cc = r && r.deref(); const cstate = cc && states.get(cc);
          if (cstate) {
            const mp = op.map; const sx = mp.s[0], sy = mp.s[1], sw = mp.s[2] || 1, sh = mp.s[3] || 1;
            const kx = mp.d[2] / sw, ky = mp.d[3] / sh;
            // earlier items are covered by the image's rectangle first, then the child's own text is added on top
            cover(items, op.b, 1);
            for (const it of listOf(cstate, depth + 1)) {
              const x0 = mp.d[0] + (it.b[0] - sx) * kx, x1 = mp.d[0] + (it.b[2] - sx) * kx;
              const y0 = mp.d[1] + (it.b[1] - sy) * ky, y1 = mp.d[1] + (it.b[3] - sy) * ky;
              let bb = aabb(mp.m, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1));
              bb = inter(bb, op.b);
              if (bb[2] - bb[0] < 1 || bb[3] - bb[1] < 1) continue;
              items.push({ s: it.s, b: bb, cov: it.cov, via: cstate.id, a: area(bb) });
            }
            continue;
          }
        }
        cover(items, op.b, op.k === 'p' ? 0.6 : 1);
      }
    }
    return items;
  };
  const cover = (items, cb, weight) => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.cov >= 1) continue;
      const x = inter(it.b, cb);
      if (x[2] <= x[0] || x[3] <= x[1]) continue;
      const f = (area(x) / (it.a || 1)) * weight;
      it.cov = Math.min(1, it.cov + f);
    }
  };

  // ── the clock and the hooks ──
  let frames = 0, pieceT = 0, lastRaf = performance.now();
  const loop = () => { const n = performance.now(); pieceT += Math.min(0.1, (n - lastRaf) / 1000); lastRaf = n; frames++; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  const hooks = () => {
    const g = {};
    const os = window.__os;
    try { g.guide = window.__guide ? (window.__guide() || {}).active ?? null : null; } catch (e) { /* */ }
    try { if (os && os.guide) g.side = os.guide.activeText || null; } catch (e) { /* */ }
    try { if (os && os.lambyGuide) { const v = os.lambyGuide.view; g.lg = v && !v.hidden && v.text ? { rung: v.rung, text: String(v.text), beat: v.beat } : null; } } catch (e) { /* */ }
    try { if (os) g.toast = os.toast ? (typeof os.toast === 'string' ? os.toast : (os.toast.text || os.toast.line || 'toast')) : null; } catch (e) { /* */ }
    try {
      const q = window.__graceQueue ? window.__graceQueue() : null;
      if (q && os && os.desktopEra === 'e3') {
        const ph = q.phoneView ? q.phoneView() : null;
        g.q = { mode: q.mode, stage: q.phone && q.phone.stage, screen: q.phone && q.phone.screen, large: !!q.mirrorLarge, min: !!q.mirrorMin,
          arrived: ph && ph.arrived, open: ph && ph.open, page: q.veraPage ?? null };
      }
    } catch (e) { /* */ }
    try { if (os && os.e4) g.e4 = { stage: os.e4.stage, ball: !!(os.e4.ball && os.e4.ball.live), clip: !!(os.e4.browser && os.e4.browser.roomClipTakeover), act: !!(os.e4.browser && os.e4.browser.act) }; } catch (e) { /* */ }
    // ⚑ S369 — for the named exceptions: the update ritual's phase, and Caleb's thread being blacked out or given back
    try { if (os && os.updateApp) g.upd = { key: os.updateApp.key, phase: os.updateApp.phase }; } catch (e) { /* */ }
    try { if (os && os.caleb) g.caleb = { blacking: !!os.caleb.blackingOut, phase: os.caleb.phase ?? null }; } catch (e) { /* */ }
    return g;
  };

  // which canvas is which screen: the room's device screens by name (workstation, monitor, laptop, tablet, phone, visor…)
  // and the desktop OS's own canvas — read-only, refreshed every few seconds
  let namesAt = 0;
  const refreshNames = (now) => {
    if (now - namesAt < 3000) return; namesAt = now;
    try {
      const d = window.__era3Devices ? window.__era3Devices() : null;
      if (d) for (const k of Object.keys(d)) if (d[k] && d[k].getContext) stateOf(d[k]).name = k;
      if (window.__os && window.__os.canvas) { const st = stateOf(window.__os.canvas); if (!st.name) st.name = 'os'; }
    } catch (e) { /* */ }
  };
  const lastC = new Map();                // id -> signature
  let lastG = '';
  let lastFrames = 0, lastWall = performance.now();
  const buf = [];
  const flush = () => {
    if (!buf.length) return;
    const sink = window.__flowSink;
    if (typeof sink !== 'function') return;
    const chunk = buf.splice(0, buf.length).join('\n') + '\n';
    try { sink(chunk); } catch (e) { /* */ }
  };
  const deepVer = (s, depth) => {
    let v = s.ver;
    if (depth < 3) for (const op of s.ops) if (op.k === 'i') { const r = byId.get(op.src); const cc = r && r.deref(); const cstate = cc && states.get(cc); if (cstate) v += deepVer(cstate, depth + 1) * 7; }
    return v;
  };
  const cacheV = new Map();               // id -> deep version last listed
  const tick = () => {
    try {
      const now = performance.now();
      refreshNames(now);
      const o = { k: 's', t: Math.round(performance.timeOrigin + now), pt: +pieceT.toFixed(3) };
      const df = frames - lastFrames; o.f = +(df / Math.max(0.001, (now - lastWall) / 1000)).toFixed(1);
      lastFrames = frames; lastWall = now;
      const os = window.__os;
      if (os) { o.era = os.desktopEra; o.ph = os.setup && os.setup.open ? 'setup:' + os.setup.stage : os.phase; }
      const gj = JSON.stringify(hooks());
      if (gj !== lastG) { lastG = gj; o.g = JSON.parse(gj); }
      const c = {};
      for (let i = refs.length - 1; i >= 0; i--) {
        const cc = refs[i].deref();
        if (!cc) { refs.splice(i, 1); continue; }
        const s = states.get(cc);
        if (!s) continue;
        const dv = deepVer(s, 0) + '|' + (s.name || '');
        const had = lastC.has(s.id);
        if (cacheV.get(s.id) === dv && had) continue;
        cacheV.set(s.id, dv);
        let items = s.ops.length ? listOf(s, 0) : [];
        // dedupe the same string at the same place (fill + stroke, redraws in a frame that was never cleared)
        const seen = new Set(); const out = [];
        for (let j = items.length - 1; j >= 0; j--) {
          const it = items[j];
          const key = it.s + '|' + Math.round(it.b[0]) + '|' + Math.round(it.b[1]) + '|' + it.via;
          if (seen.has(key)) continue; seen.add(key);
          out.push([it.s, Math.round(it.b[0]), Math.round(it.b[1]), Math.round(it.b[2]), Math.round(it.b[3]), +it.cov.toFixed(2), it.via || 0]);
          if (out.length >= TEXT_CAP) break;
        }
        out.reverse();
        const sig = (s.name || '') + JSON.stringify(out);
        if (lastC.get(s.id) === sig) continue;
        if (!out.length && !had) { lastC.set(s.id, sig); continue; }
        lastC.set(s.id, sig);
        c[s.id] = { w: cc.width, h: cc.height, n: s.name || undefined, t: out };
      }
      if (Object.keys(c).length) o.c = c;
      if (o.c || o.g) buf.push(JSON.stringify(o)); else buf.push(JSON.stringify({ k: 's', t: o.t, pt: o.pt, f: o.f, era: o.era, ph: o.ph }));
    } catch (e) { /* a sampler must never throw into the page */ }
  };
  setInterval(tick, INTERVAL);
  setInterval(flush, 2000);
  window.__flowFlush = () => { tick(); flush(); };
}

/**
 * Install the sampler on a puppeteer page. Call before page.goto().
 * Returns { press(how), note(kind, detail), flush(), close(), shot() }.
 */
export async function installFlowSampler(page, { dir, interval = 250, shotEvery = 0 }) {
  mkdirSync(dir, { recursive: true });
  const out = createWriteStream(join(dir, 'samples.jsonl'), { flags: 'w' });
  const write = (o) => out.write(JSON.stringify(o) + '\n');
  await page.exposeFunction('__flowSink', (chunk) => { out.write(chunk); });
  await page.evaluateOnNewDocument(pageSampler, { interval });

  // every real press by the walker, at the moment it goes down (a tap resolves on release, ~70 ms later)
  const mouse = page.mouse;
  const down = mouse.down.bind(mouse);
  mouse.down = async (...a) => { write({ k: 'press', t: Date.now(), how: 'mouse' }); return down(...a); };
  // (mouse.click goes through mouse.down, so it is counted there)

  let shots = null, shotN = 0;
  if (shotEvery > 0) {
    mkdirSync(join(dir, 'shots'), { recursive: true });
    shots = setInterval(async () => {
      try {
        const t = Date.now();
        await page.screenshot({ path: join(dir, 'shots', `${t}.jpg`), type: 'jpeg', quality: 45 });
        shotN++;
      } catch (e) { /* the page may be navigating */ }
    }, shotEvery * 1000);
  }
  return {
    note: (kind, detail) => write({ k: 'note', t: Date.now(), kind, target: detail.target ?? detail.what ?? '', era: detail.era ?? null, phase: detail.phase ?? null }),
    flush: async () => { try { await page.evaluate(() => window.__flowFlush && window.__flowFlush()); } catch (e) { /* closing */ } },
    close: async () => { if (shots) clearInterval(shots); await new Promise((r) => out.end(r)); }
  };
}
