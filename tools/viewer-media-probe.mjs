#!/usr/bin/env node
/**
 * ⚑ S371 — THE SITE VIEWER'S MEDIA, EVERY ONE PRESSED (UiB job 17 Part A.3; his 11 Nov: "make sure all the audios are
 * playable in the close source websites").
 *
 *     node tools/viewer-media-probe.mjs --port 5292 [--out out/viewer-media] [--photos] [--browser-only | --xr-only]
 *
 * Presses EVERY Play on the hub and the four era websites inside the piece's own site viewer (src/frame/siteViewer/), and
 * reports, for each track and each film: the HTTP status of its file, whether it reached `playing`, and whether its time
 * moved. Films are also paused (a press on the picture), resumed, and sent to the middle (a press on the progress line).
 *
 *   1. THE BROWSER — the window alone (tools/harness/site-viewer.html), pressed with the REAL MOUSE: each press goes
 *      through the canvas's pointer events into the viewer's own press resolver (core.ts `press`). Tabs by a click on
 *      the tab, scrolling by the wheel. A film is proved drawn by reading its picture's pixels twice (they must change)
 *      while its clock moves.
 *   2. THE EMULATED HEADSET — the real app (?reinterp=1&era=2), `app.xr.active` forced true, mono (the method of
 *      tools/site-viewer-review.mjs --app and tools/close-site-xr-probe.mjs; no claim of stereo or Quest timing). The
 *      window opens as the XR plane; every press is a world ray from the head to the button's own logical px, through
 *      the XR mount's `pressRay` (its planar hit test, then the same resolver). Scrolling by the window's own ▼ button.
 *      For a film it also reads the budget: draw calls (≤ 75), and how often the WINDOW's texture and the FILM's own
 *      rect were uploaded while the film played (the window must not be re-sent per frame; only the film's rect is).
 *
 * Chrome is launched with --autoplay-policy=no-user-gesture-required, so a headless run can hear the press (in the
 * browser part each press is a real mouse click anyway). `window.Audio` and `document.createElement('video')` are
 * wrapped to log each element's events and clock (the S358 headless trick). Writes report.json and report.md in --out;
 * --photos adds the Media tabs (top and scrolled) and a film playing, in both modes. Exit code 1 if any check fails.
 * Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0));
if (!PORT) { console.error('Pass --port <the Vite dev server in this worktree>'); process.exit(2); }
const OUT = path.resolve(flag('out', 'out/viewer-media'));
const PHOTOS = argv.includes('--photos');
const DO_BROWSER = !argv.includes('--xr-only');
const DO_XR = !argv.includes('--browser-only');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWS = ['hub', '1997', '2003', '2016', '2026'];
const BUDGET_DRAWS = 75;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking']
});

/** every media element the page makes logs its events and clock (window.__media) */
function hookMedia() {
  window.__media = [];
  const watch = (el, kind) => {
    const rec = { kind, src: '', events: [], t: 0, dur: 0, err: null };
    window.__media.push(rec);
    for (const ev of ['play', 'playing', 'pause', 'ended', 'error', 'waiting', 'seeked']) el.addEventListener(ev, () => { rec.events.push(ev); if (ev === 'error') rec.err = el.error && el.error.code; });
    // the file's name sticks once known (a stopped element's src is emptied)
    const tick = () => { const s = String(el.currentSrc || el.src || '').split('?')[0].split('/').pop(); if (/\.(mp3|mp4|wav|ogg|m4a)$/.test(s)) rec.src = s; rec.t = el.currentTime; rec.dur = el.duration; rec.paused = el.paused; rec.ready = el.readyState; };
    setInterval(tick, 100);
    return el;
  };
  const A = window.Audio;
  window.Audio = function (src) { return watch(new A(src), 'audio'); };
  window.Audio.prototype = A.prototype;
  const ce = document.createElement.bind(document);
  document.createElement = function (tag, opts) { const el = ce(tag, opts); return String(tag).toLowerCase() === 'video' ? watch(el, 'video') : el; };
}

const results = [];
const checks = [];
const check = (name, ok, extra = '') => { checks.push({ name, ok: !!ok, extra }); if (!ok) console.log(`FAIL  ${name}${extra ? '  ' + extra : ''}`); };
const net = {};
const watchNet = (page) => page.on('response', (r) => {
  const u = r.url();
  if (/\.(mp3|mp4|wav|ogg|m4a)(\?|$)/.test(u)) { const f = u.split('?')[0].split('/').pop(); (net[f] ??= new Set()).add(r.status()); }
});
const statusOf = (file) => [...(net[file.split('/').pop()] ?? [])].join('/') || 'none';

/**
 * Run the presses on one page. `api` adapts the two modes: open(view), tab(view), hits() (the media hits on screen, in
 * window logical px), press(id), scroll() (true if it moved), shot(name), extra(file) (mode-specific numbers for a film).
 */
async function pressAll(mode, page, api) {
  for (const view of VIEWS) {
    await api.open(view);
    if (view !== 'hub') await api.tab();
    const tested = new Set();
    let step = 0;
    for (let guard = 0; guard < 80; guard++) {
      const onScreen = await api.hits();
      // photographs: the first two screens of the page that show something to play
      if (PHOTOS && step < 2 && onScreen.some((x) => x.centerIn)) { await api.shot(`${mode}-${view}-media-${step + 1}`); step++; }
      let moved = false;   // a film's test scrolled the page: read the hits again before pressing anything else
      for (const h of onScreen) {
        if (moved) break;
        if (h.type === 'seek' || tested.has(h.file)) continue;
        if (h.type === 'audio' && !h.full) continue;
        // a film starts from its Play button (the 48 px one) when that is on screen, else from its picture
        const isPic = h.type === 'film' && h.h > 60;
        if (isPic && (!h.centerIn || onScreen.some((x) => x.type === 'film' && x.file === h.file && x.h <= 60 && x.full))) continue;
        if (h.type === 'film' && !isPic && !h.full) continue;
        tested.add(h.file);
        const file = h.file.split('/').pop();
        const before = await page.evaluate(() => window.__media.length);
        await api.press(h.id);
        // wait for 'playing' (a film may buffer first: up to 10 s), then read its clock twice, 1.6 s apart
        const waitedFrom = Date.now();
        for (let i = 0; i < (h.type === 'film' ? 40 : 16); i++) {
          await wait(250);
          if (await page.evaluate((n, f) => !!window.__media.slice(n).find((m) => m.src === f && m.events.includes('playing')), before, file)) break;
        }
        const startMs = Date.now() - waitedFrom;
        await wait(400);
        const t1 = await page.evaluate((n, f) => { const r = window.__media.slice(n).find((m) => m.src === f); return r ? r.t : null; }, before, file);
        await wait(1600);
        const rec = await page.evaluate((n, f) => window.__media.slice(n).find((m) => m.src === f) ?? null, before, file);
        const info = await api.info();
        const row = {
          mode, view, file, kind: h.type === 'film' ? 'film' : 'track', http: statusOf(file),
          playing: !!rec && rec.events.includes('playing') && !rec.paused,
          t1: rec ? Number((t1 ?? 0).toFixed(2)) : null, t2: rec ? Number(rec.t.toFixed(2)) : null,
          moving: !!rec && t1 !== null && rec.t > t1 + 0.5,
          dur: rec && Number.isFinite(rec.dur) ? Number(rec.dur.toFixed(1)) : null,
          viewer: h.type === 'film' ? info.film.state : (await api.audioPlaying()) === h.file ? 'playing' : 'not playing',
          err: rec?.err ?? null, events: rec ? rec.events.join(',') : '', startMs
        };
        if (h.type === 'film') {
          Object.assign(row, await api.filmExtra(h));
          // pause (a press on the picture where its middle shows, else on the button), play again (the button where it
          // shows, else the picture), then a press on the middle of the progress line
          const pic = onScreen.find((x) => x.type === 'film' && x.file === h.file && x.h > 60 && x.centerIn);
          const btn = onScreen.find((x) => x.type === 'film' && x.file === h.file && x.h <= 60 && x.full);
          let bar = onScreen.find((x) => x.type === 'seek' && x.file === h.file && x.centerIn);
          row.startedBy = isPic ? 'picture' : 'button';
          const pauser = pic ?? btn, resumer = btn ?? pic;
          if (pauser && resumer) {
            row.pausedBy = pauser === pic ? 'picture' : 'button'; row.resumedBy = resumer === btn ? 'button' : 'picture';
            await api.press(pauser.id); await wait(700);
            const a = await page.evaluate((f) => window.__media.filter((m) => m.src === f).pop(), file);
            await wait(800);
            const b = await page.evaluate((f) => window.__media.filter((m) => m.src === f).pop(), file);
            row.paused = !!a?.paused && Math.abs(b.t - a.t) < 0.05 && (await api.info()).film.state === 'paused';
            if (PHOTOS && (view === '2026' || view === 'hub')) await api.shot(`${mode}-${view}-film-paused`);
            await api.press(resumer.id); await wait(1200);
            const c = await page.evaluate((f) => window.__media.filter((m) => m.src === f).pop(), file);
            row.resumed = !!c && !c.paused && c.t > b.t + 0.3;
          }
          if (!bar && await api.scroll()) {
            // the progress line is below the fold: one step down (the film plays on), then press its middle
            moved = true;
            bar = (await api.hits()).find((x) => x.type === 'seek' && x.file === h.file && x.centerIn);
          }
          if (bar) {
            await api.press(bar.id, 0.5); await wait(900);
            const d = await page.evaluate((f) => window.__media.filter((m) => m.src === f).pop(), file);
            row.seekToMiddle = !!d && d.dur > 0 && Math.abs(d.t - d.dur / 2) < Math.max(4, d.dur * 0.08);
            row.seekAt = d ? Number(d.t.toFixed(1)) : null;
          }
          if (PHOTOS && (view === '2026' || view === 'hub')) await api.shot(`${mode}-${view}-film-playing`);
          // pause it again; leaving the page stops it anyway
          if (pauser) { await api.press(pauser.id); await wait(300); }
        } else {
          // press again: Stop
          await api.press(h.id); await wait(500);
          const e = await page.evaluate((f) => window.__media.filter((m) => m.src === f).pop(), file);
          row.stoppedByPress = !!e && (e.paused || e.src === '') && (await api.audioPlaying()) === null;
        }
        results.push(row);
        const label = `${mode} ${view} ${file}`;
        check(`${label}: HTTP 200/206`, /\b(200|206)\b/.test(row.http), row.http);
        check(`${label}: reached playing`, row.playing, row.events);
        check(`${label}: time moves`, row.moving, `${row.t1} -> ${row.t2}`);
        check(`${label}: the viewer says so`, row.viewer === 'playing', row.viewer);
        if (row.kind === 'track') check(`${label}: a second press stops it`, row.stoppedByPress);
        else {
          check(`${label}: its picture is drawn and changes`, row.framesDrawn, JSON.stringify(row.frameProof ?? ''));
          check(`${label}: a press pauses it (${row.pausedBy ?? 'nothing on screen'})`, row.paused);
          check(`${label}: a press plays it again (${row.resumedBy ?? 'nothing on screen'})`, row.resumed);
          check(`${label}: a press on the progress line's middle goes there`, row.seekToMiddle, 'seekToMiddle' in row ? `at ${row.seekAt}` : 'the line was not on screen');
          if (mode === 'xr') {
            check(`${label}: draw calls within ${BUDGET_DRAWS}`, row.drawsMax <= BUDGET_DRAWS, `max ${row.drawsMax}`);
            check(`${label}: the window is not re-uploaded per frame while it plays`, row.windowUploadsPerSec <= 2, `${row.windowUploadsPerSec}/s`);
            check(`${label}: only the film's own rect is uploaded while it plays`, row.filmUploadsPerSec >= 5, `${row.filmUploadsPerSec}/s of ${row.filmTexture}`);
          }
        }
      }
      if (!moved && !(await api.scroll())) break;
    }
    const expect = await api.expected(view);
    const missed = expect.filter((f) => !tested.has(f));
    check(`${mode} ${view}: every file on the page was pressed (${expect.length})`, missed.length === 0, missed.join(', '));
  }
}

/** the files each view should carry, read from the generated model (the same file the viewer draws) */
const MODEL = JSON.parse(fs.readFileSync(new URL('../data/strings/era_sites_model.json', import.meta.url), 'utf8'));
const expected = (view) => (view === 'hub' ? [MODEL.hub.film, ...MODEL.hub.sound] : MODEL.eras[view].tabs.media.filter((b) => b.k === 'media')).filter((b) => b.file).map((b) => b.file);

try {
  // ══ 1. THE BROWSER: the window alone, the real mouse ══════════════════════════════════════════════════════════
  if (DO_BROWSER) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
    watchNet(page);
    await page.evaluateOnNewDocument(hookMedia);
    await page.goto(`http://localhost:${PORT}/tools/harness/site-viewer.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__sv, { timeout: 30000 });
    const css = (id, fx = null) => page.evaluate((i, fx) => {
      const c = window.__sv.core, cv = document.querySelector('#reinterp-site-viewer canvas'), r = cv.getBoundingClientRect(), s = c.lastSize;
      let p = c.centerOf(i);
      if (!p) return null;
      if (fx !== null) { const h = c.mediaHits().find((m) => m.id === i); if (h) p = { x: h.sx + h.w * fx, y: p.y }; }
      return { x: r.left + p.x / s.w * r.width, y: r.top + p.y / s.h * r.height };
    }, id, fx);
    const click = async (id, fx = null) => { const p = await css(id, fx); if (!p) return false; await page.mouse.click(p.x, p.y); await wait(250); return true; };
    const canvasShot = async (name) => { const el = await page.$('#reinterp-site-viewer canvas'); await el.screenshot({ path: path.join(OUT, `${name}.png`) }); };
    await pressAll('browser', page, {
      open: async (v) => { await page.evaluate((t) => window.__sv.open(t), v); await wait(500); },
      tab: async () => { await click('tab:media'); await wait(300); },
      hits: () => page.evaluate(() => { const c = window.__sv.core, vp = c.info().vp; return c.mediaHits().map((h) => ({ ...h, full: h.sy >= vp.y && h.sy + h.h <= vp.y + vp.h, centerIn: h.sy + h.h / 2 > vp.y + 4 && h.sy + h.h / 2 < vp.y + vp.h - 4 })); }),
      press: (id, fx = null) => click(id, fx),
      scroll: async () => {
        const s0 = await page.evaluate(() => window.__sv.core.info().scroll);
        const cv = await page.evaluate(() => { const r = document.querySelector('#reinterp-site-viewer canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        await page.mouse.move(cv.x, cv.y); await page.mouse.wheel({ deltaY: 380 }); await wait(350);
        return (await page.evaluate(() => window.__sv.core.info().scroll)) !== s0;
      },
      info: () => page.evaluate(() => window.__sv.core.info()),
      audioPlaying: () => page.evaluate(() => window.__sv.core.host.audio.playing()),
      filmExtra: async (h) => {
        // read the picture's pixels on the real canvas twice, a second apart: a film that is drawn changes
        const sample = () => page.evaluate((file) => {
          const c = window.__sv.core, cv = document.querySelector('#reinterp-site-viewer canvas'), s = c.lastSize;
          const pic = c.mediaHits().find((m) => m.type === 'film' && m.file === file && m.h > 60);
          if (!pic) return null;
          const k = cv.width / s.w, ctx = cv.getContext('2d');
          const d = ctx.getImageData(Math.round(pic.sx * k), Math.round(pic.sy * k), Math.round(pic.w * k), Math.round(pic.h * k)).data;
          let sum = 0, lit = 0;
          for (let i = 0; i < d.length; i += 4 * 97) { sum = (sum * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) % 1000000007; if (d[i] + d[i + 1] + d[i + 2] > 60) lit++; }
          return { sum, lit };
        }, h.file);
        const a = await sample(); await wait(1200); const b = await sample();
        return { framesDrawn: !!a && !!b && a.sum !== b.sum && b.lit > 50, frameProof: { a, b } };
      },
      shot: canvasShot,
      expected
    });
    check('browser: no page errors', errors.length === 0, errors.join(' | '));
    await page.close();
  }

  // ══ 2. THE EMULATED HEADSET: the real app, the window as its XR plane, world rays ═════════════════════════════
  if (DO_XR) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
    watchNet(page);
    await page.evaluateOnNewDocument(hookMedia);
    await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__app), { timeout: 180000 });
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
    await page.waitForFunction(() => window.__os && window.__siteViewer && window.__xrFrame, { timeout: 180000 });
    await wait(5000);
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    });
    await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
    await wait(1500);
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    const ray = (id, fx = null) => page.evaluate((i, fx) => {
      const sv = window.__siteViewer, app = window.__app, e = app.root.findByName('xr-frame-site'), head = app.root.findByName('camera');
      const c = sv.xr.core;
      let p = c.centerOf(i);
      if (!p) return null;
      if (fx !== null) { const h = c.mediaHits().find((m) => m.id === i); if (h) p = { x: h.sx + h.w * fx, y: p.y }; }
      const V = e.getPosition().constructor;
      const w = e.getWorldTransform().transformPoint(new V(p.x / 1024 - 0.5, 0, p.y / 768 - 0.5));
      const o = head.getPosition();
      return { p0: { x: o.x, y: o.y, z: o.z }, p1: { x: o.x + (w.x - o.x) * 2, y: o.y + (w.y - o.y) * 2, z: o.z + (w.z - o.z) * 2 } };
    }, id, fx);
    const pressRay = async (id, fx = null) => { const r = await ray(id, fx); if (!r) return false; const ok = await page.evaluate((q) => window.__siteViewer.xr.pressRay(q), r); await wait(250); return ok; };
    await pressAll('xr', page, {
      open: async (v) => { await page.evaluate((t) => window.__siteViewer.open(t), v); await wait(1200); },
      tab: async () => { await pressRay('tab:media'); await wait(400); },
      hits: () => page.evaluate(() => { const c = window.__siteViewer.xr.core, vp = c.info().vp; return c.mediaHits().map((h) => ({ ...h, full: h.sy >= vp.y && h.sy + h.h <= vp.y + vp.h, centerIn: h.sy + h.h / 2 > vp.y + 4 && h.sy + h.h / 2 < vp.y + vp.h - 4 })); }),
      press: (id, fx = null) => pressRay(id, fx),
      scroll: async () => {
        const s0 = await page.evaluate(() => window.__siteViewer.xr.core.info().scroll);
        await pressRay('sc:down'); await pressRay('sc:down'); await wait(300);
        return (await page.evaluate(() => window.__siteViewer.xr.core.info().scroll)) !== s0;
      },
      info: () => page.evaluate(() => window.__siteViewer.xr.core.info()),
      audioPlaying: () => page.evaluate(() => window.__siteViewer.xr.core.host.audio.playing()),
      filmExtra: async () => {
        // the budget while it plays: draw calls, and what is uploaded (the window's texture vs the film's own rect)
        const s0 = await page.evaluate(() => ({ ...window.__siteViewer.xr.filmStats(), at: performance.now(), screen: window.__uploads ?? -1 }));
        let drawsMax = 0;
        for (let i = 0; i < 10; i++) { drawsMax = Math.max(drawsMax, await page.evaluate(() => window.__app.stats.drawCalls.total)); await wait(200); }
        const s1 = await page.evaluate(() => ({ ...window.__siteViewer.xr.filmStats(), at: performance.now(), screen: window.__uploads ?? -1 }));
        const sec = (s1.at - s0.at) / 1000;
        return {
          drawsMax, framesDrawn: s1.filmPlane && s1.filmUploads > s0.filmUploads,
          frameProof: { filmUploads: s1.filmUploads - s0.filmUploads, plane: s1.filmPlane },
          windowUploadsPerSec: Number(((s1.windowUploads - s0.windowUploads) / sec).toFixed(1)),
          filmUploadsPerSec: Number(((s1.filmUploads - s0.filmUploads) / sec).toFixed(1)),
          filmTexture: s1.filmTexture.join('x'), windowTexture: s1.windowTexture.join('x')
        };
      },
      shot: async (name) => {
        await wait(150);
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
        // a film, also seen closer (a narrower lens on the same head: the window as it fills more of the view)
        if (/film-(playing|paused)/.test(name)) {
          await page.evaluate(() => { window.__app.root.findByName('camera').camera.fov = 52; }); await wait(250);
          await page.screenshot({ path: path.join(OUT, `${name}-close.png`) });
          await page.evaluate(() => { window.__app.root.findByName('camera').camera.fov = 90; }); await wait(100);
        }
      },
      expected
    });
    // the draw calls with the window open and nothing playing, for the record
    await page.evaluate(() => window.__siteViewer.open('2026')); await wait(1200);
    const idleDraws = await page.evaluate(() => window.__app.stats.drawCalls.total);
    results.push({ mode: 'xr', view: '2026', file: '(window open, nothing playing)', kind: 'budget', drawsMax: idleDraws });
    await page.evaluate(() => window.__siteViewer.close());
    check('xr: no page errors', errors.length === 0, errors.join(' | '));
    await page.close();
  }
} finally {
  await browser.close();
}

// ── the report ────────────────────────────────────────────────────────────────────────────────────────────────
const failed = checks.filter((c) => !c.ok);
const rows = results.filter((r) => r.kind !== 'budget');
const md = [
  `# Site viewer media probe — ${new Date().toISOString()}`,
  '',
  `${rows.length} presses (${rows.filter((r) => r.mode === 'browser').length} browser, ${rows.filter((r) => r.mode === 'xr').length} emulated headset); ${checks.length} checks, ${failed.length} failed.`,
  '',
  '| mode | site | file | kind | HTTP | playing (after) | time | viewer | notes |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.mode} | ${r.view} | ${r.file} | ${r.kind} | ${r.http} | ${r.playing ? `yes (${(r.startMs / 1000).toFixed(1)} s)` : 'NO'} | ${r.t1} → ${r.t2}${r.moving ? '' : ' (STILL)'} | ${r.viewer} | ${r.kind === 'film'
    ? `started by its ${r.startedBy}; drawn ${r.framesDrawn ? 'yes' : 'NO'}; paused by the ${r.pausedBy ?? '-'} ${r.paused ? 'yes' : 'NO'}; again by the ${r.resumedBy ?? '-'} ${r.resumed ? 'yes' : 'NO'}; progress line's middle → ${r.seekAt ?? 'not tried'} s${r.mode === 'xr' ? `; draws ≤${r.drawsMax}; window ${r.windowUploadsPerSec}/s; film rect ${r.filmUploadsPerSec}/s (${r.filmTexture} vs window ${r.windowTexture})` : ''}`
    : `stop ${r.stoppedByPress ? 'yes' : 'NO'}`} |`),
  '',
  ...results.filter((r) => r.kind === 'budget').map((r) => `Draw calls in the emulated headset with the window open and nothing playing: ${r.drawsMax}.`),
  '',
  failed.length ? `## Failed\n\n${failed.map((c) => `- ${c.name}${c.extra ? ` — ${c.extra}` : ''}`).join('\n')}` : 'All checks passed.'
].join('\n');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, checks, net: Object.fromEntries(Object.entries(net).map(([k, v]) => [k, [...v]])) }, null, 1));
fs.writeFileSync(path.join(OUT, 'report.md'), md + '\n');
console.log(md);
process.exit(failed.length ? 1 : 0);
