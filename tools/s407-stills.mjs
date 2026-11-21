#!/usr/bin/env node
/**
 * ⚑ S407 (UiB job 32 Part B) — BEFORE / AFTER STILLS AND MEASUREMENTS for the entrance and 1997 items, on the computer and in
 * the seated headset mock. Review routes (debugJump, the OS's own fields): they photograph and measure each item; the walk
 * (tools/walk.mjs) is the reachability proof.
 *
 *     node tools/s407-stills.mjs --port 5471 --label after [--out <dir>] [--only taskbar,defer,timesup,packet,digger,release,tv,tv2003,door,floor,boxes,log]
 *
 * Each still is named <id>_<label>_<desktop|xr>.png (and _canvas for the monitor's own 512 × 384 canvas). Facts per item go to
 * <out>/s407-<label>.json. Works on the before build (:5450) too: what the old build lacks is reported, never assumed.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', '/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-20/job32'));
const ONLY = flag('only', '').split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const facts = {};
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] });

/** 1997, logged in, at the desktop (the kit inserted); `era` for a later room */
async function boot(mode, era = 1) {
  const page = await b.newPage();
  await page.setViewport(mode === 'xr' ? { width: 1000, height: 1000 } : { width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const q = era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&kiosk=0&era=${era}&debug=1&descent=0&home=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  if (era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((x) => (x.textContent || '').includes('Log in') && !x.disabled), { timeout: 120000 }).catch(() => {});
    await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('Log in')); if (x) x.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__poses, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => window.__camPose()); if (!s.driven && !s.descent) break; await wait(1000); }
  if (era === 1) await page.evaluate(() => window.__os.debugJump('kit'));
  if (mode === 'xr') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      window.__aimHead = { pitch: -6, yaw: 0 };
      app.on('prerender', () => { const a = window.__aimHead; if (a) head.setLocalEulerAngles(a.pitch, a.yaw, 0); });
    });
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  } else {
    const seat = await page.evaluate((k) => window.__poses().seats[k], era === 1 || era === 2 ? 'r1' : 'r2');
    await page.evaluate((s) => window.__camFree(s.x, s.y, s.z, s.pitch - 4, s.yaw), seat);
  }
  await wait(2500);
  return { page, errors };
}
const look = (page, mode, pitch, yaw) => mode === 'xr'
  ? page.evaluate((p, y) => { window.__aimHead = { pitch: p, yaw: y }; }, pitch, yaw)
  : page.evaluate((p, y) => { const s = window.__poses().seats.r1; window.__camFree(s.x, s.y, s.z, p, y); }, pitch, yaw);
const shot = async (page, id, mode) => { await wait(400); await page.screenshot({ path: path.join(OUT, `${id}_${LABEL}_${mode === 'xr' ? 'xr' : 'desktop'}.png`) }); };
const canvas = async (page, id) => {
  const url = await page.evaluate(() => window.__os.canvas.toDataURL('image/png'));
  fs.writeFileSync(path.join(OUT, `${id}_${LABEL}_canvas.png`), Buffer.from(url.split(',')[1], 'base64'));
};
const ledgerPush = (page, rec) => page.evaluate(async (r) => { const m = await import('/src/state/ledger.ts'); m.ledger.records.push(r); }, rec);
const hits = (page) => page.evaluate(() => (window.__os.hits ?? []).map((h) => ({ id: h.id, x: h.x, y: h.y, w: h.w, h: h.h })));

try {
  for (const mode of ['desktop', 'xr']) {
    // ── 97-5 / 97-6: the tray, a filing lighting it (before) or not (after); and the divider ───────────────────────
    if (want('taskbar')) {
      const { page, errors } = await boot(mode);
      await ledgerPush(page, 'kit-read');
      await wait(250);
      // the well lit? navy pixels in the taskbar's right half (the tray's well is the only navy there), measured on the canvas
      const lit = await page.evaluate(() => { const c = window.__os.canvas, k = c.width / 512, d = c.getContext('2d').getImageData(Math.round(300 * k), Math.round(365 * k), Math.round(120 * k), Math.round(16 * k)).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 128) n++; return n; });
      await shot(page, '97-5', mode); if (mode === 'desktop') await canvas(page, '97-5');
      facts[`taskbar-${mode}`] = { navyPixelsInTrayAfterFiling: lit, count: await page.evaluate(() => window.__os.fileWatch.count), errors };
      await page.close();
    }
    // ── 97-15: the deferral line over the Family Form's Close / Hold (before) or in the taskbar's well (after) ───────
    if (want('defer')) {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { window.__os.debugJump('intake'); });
      await wait(800);
      await page.evaluate(() => { window.__os.debugJump('update2'); });
      await wait(600);
      await page.evaluate(() => { const u = window.__os.updateApp; if (u) { u.phase = 'reminded'; u.t = 0; u.calm = 0; window.__os.dirty = true; } });
      await wait(900);
      await shot(page, '97-15', mode); if (mode === 'desktop') await canvas(page, '97-15');
      facts[`defer-${mode}`] = { phase: await page.evaluate(() => window.__os.updateApp?.phase ?? null), hits: (await hits(page)).filter((h) => /leave|pause|primary|close/i.test(h.id)), errors };
      await page.close();
    }
    // ── 97-13: "Time's up" over NetPilot; where the headset's ray lands when it is on "No thanks" ────────────────────
    if (want('timesup')) {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { window.__os.kit?.onConnect?.(); });
      await wait(1500);
      await page.evaluate(() => { const o = window.__os; o.pauseShown?.add?.('e1'); o.pauseOpen = null; if (o.kit) o.kit.open = false; o.formForced = true; o.dirty = true; });
      let lg = null;
      for (let i = 0; i < 30 && !lg; i++) { await wait(500); lg = (await hits(page)).find((h) => h.id === 'lg-later') ?? null; }
      const f = { balloon: !!lg, errors };
      if (lg && mode === 'xr') {
        const cx = lg.x + lg.w / 2, cy = lg.y + lg.h / 2;
        f.pointed = await page.evaluate((x, y) => window.__os.xrPoint(x, y), cx, cy);
        f.noThanksCentre = { x: cx, y: cy };
        f.snappedToNoThanks = Math.abs(f.pointed.x - cx) < 1 && Math.abs(f.pointed.y - cy) < 1;
        // the mock controller's ray aimed at "No thanks" on the glass (×1.2 in a headset: xrGlass), so the frame loop's own
        //   aim lands there too (it calls xrPoint every frame)
        await page.evaluate((x, y) => {
          const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
          const p = window.__xrComfort.physicalPoint(new V((x / 512 - 0.5) * 0.4 * 1.2, 1.08 + (0.5 - y / 384) * 0.3 * 1.2, 0.012));
          window.__controller.getDirection = () => p.clone().sub(head.getPosition()).normalize();
        }, cx, cy);
        await wait(800);
        f.hover = await page.evaluate(() => window.__os.xrHover ?? null);
        f.hoverIsNoThanks = f.hover?.id === 'lg-later';
        await page.evaluate(() => { window.__os.dirty = true; });
      }
      await look(page, mode, mode === 'xr' ? -6 : -4, mode === 'xr' ? 0 : 0);
      await shot(page, '97-13', mode);
      facts[`timesup-${mode}`] = f;
      await page.close();
    }
    // ── 97-13: the placement letter: is Next live at once (before) or after the page's reading time (after)? ────────
    if (want('packet') && mode === 'desktop') {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => window.__os.debugJump('packet'));
      await wait(1000);
      const ph = () => page.evaluate(() => (window.__os.packet?.hits ?? []).map((h) => h.id));
      const at1 = (await ph()).filter((id) => id === 'next' || id === 'ok').length;
      await shot(page, '97-13b', mode); await canvas(page, '97-13b');
      let liveAt = null;
      for (let s = 1; s <= 30 && liveAt === null; s++) { await wait(1000); if ((await ph()).includes('next')) liveAt = s + 1; }
      facts.packet = { nextLiveAt1s: at1 > 0, nextLiveAfterSeconds: liveAt, errors };
      await page.close();
    }
    // ── 97-12: Root Cause Digger's line under the earth ──────────────────────────────────────────────────────────────
    if (want('digger') && mode === 'desktop') {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { const o = window.__os; if (o.kit) o.kit.open = false; o.openRootCause(); });
      await wait(1200);
      // the Word of the Day (ROOT) comes first, and owns the screen until OK
      const ok = (await hits(page)).find((h) => h.id === 'wotd-ok');
      if (ok) { await page.evaluate((x, y) => window.__os.handleClick(x, y), ok.x + ok.w / 2, ok.y + ok.h / 2); await wait(1500); }
      let st = null;
      // the glossary's Next, then the intro's Start digging
      for (let i = 0; i < 8; i++) {
        const ph = await page.evaluate(() => (window.__os.startMap?.root ?? window.__os.rootCause)?.phase ?? null);
        if (ph === 'play') { st = true; break; }
        const h = await page.evaluate(() => ((window.__os.startMap?.root ?? window.__os.rootCause)?.hits ?? []).find((x) => /start|next/i.test(x.id)) ?? null);
        if (h) await page.evaluate((x, y) => { const r = window.__os.startMap?.root ?? window.__os.rootCause; r.handleClick(x, y); r.dirty = true; window.__os.dirty = true; }, h.x + h.w / 2, h.y + h.h / 2);
        await wait(900);
      }
      await wait(1500);
      await shot(page, '97-12', mode); await canvas(page, '97-12');
      facts.digger = { started: !!st, errors };
      await page.close();
    }
    // ── 97-21: Release Work's Exhale step ───────────────────────────────────────────────────────────────────────────
    if (want('release') && mode === 'desktop') {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { const o = window.__os; if (o.kit) o.kit.open = false; o.debugJump('pillow'); });
      await wait(1000);
      for (let i = 0; i < 6; i++) {
        const st = await page.evaluate(() => ({ phase: window.__os.provotype?.phase, i: window.__os.provotype?.stateIndex }));
        if (st.phase === 'vignette' && st.i === 1) break;
        const p = await page.evaluate(() => (window.__os.provotype?.hits ?? []).find((h) => h.id === 'primary' || /^choice|^btn|^opt|^button/.test(h.id)) ?? null);
        if (!p) break;
        await page.evaluate((x, y) => window.__os.handleClick(x, y), p.x + p.w / 2, p.y + p.h / 2);
        await wait(1300);
      }
      await shot(page, '97-21', mode); await canvas(page, '97-21');
      facts.release = { state: await page.evaluate(() => ({ phase: window.__os.provotype?.phase, i: window.__os.provotype?.stateIndex })), errors };
      await page.close();
    }
    // ── 97-7 / 97-8: "Did you know" offers the set; nothing moves before the press; after it, in front ───────────────
    if (want('tv')) {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { const o = window.__os; o.kit?.onConnect?.(); });
      await wait(1000);
      await ledgerPush(page, 'kit-read');
      await page.evaluate(() => { const o = window.__os; if (o.kit) o.kit.open = false; if (o.web) o.web.open = false; o.idleSeconds = 30; o.dirty = true; });
      const tv0 = await page.evaluate(() => { const t = window.__teachingTv?.(); const s = t?.tvs?.[0]; const e = window.__app.root.findByName('lamby-set') ?? null; return { pose: s?.pose ?? null, state: s?.state ?? null, moment: t?.moments?.['1997']?.stage ?? null }; });
      // 12 s of the old trigger's time (kit-read + 2 s; its call held 7 s): does anything move by itself?
      const poses = [];
      for (let i = 0; i < 12; i++) { await wait(1000); poses.push(await page.evaluate(() => { const s = window.__teachingTv?.()?.tvs?.[0]; return s ? `${s.pose}/${s.state}` : null; })); }
      const pause = (await hits(page)).filter((h) => h.id.startsWith('pause-'));
      await look(page, mode, mode === 'xr' ? -6 : -4, 0);
      await shot(page, '97-8', mode); if (mode === 'desktop') await canvas(page, '97-8');
      const f = { before: tv0, posesDuring12s: poses, pauseHits: pause.map((h) => h.id), errors };
      const tvBtn = pause.find((h) => h.id === 'pause-tv');
      if (tvBtn) {
        await page.evaluate((x, y) => window.__os.handleClick(x, y), tvBtn.x + tvBtn.w / 2, tvBtn.y + tvBtn.h / 2);
        for (let i = 0; i < 20; i++) { await wait(500); const p = await page.evaluate(() => window.__teachingTv?.()?.tvs?.[0]?.pose); if (p === 'held') break; }
        await wait(1500);
        f.afterPress = await page.evaluate((mode) => {
          const t = window.__teachingTv(), s = t.tvs[0], app = window.__app, cam = app.root.findByName('camera');
          const set = app.root.findByName(s.entity)?.parent ?? null;
          const eyeW = cam.getPosition();
          const eye = mode === 'xr' ? window.__xrComfort.logicalPoint(eyeW.clone()) : eyeW;
          const glass = app.root.findByName(s.entity)?.getPosition();
          const layers = []; set?.forEach((n) => { if (n.render) layers.push(...n.render.layers); });
          return { pose: s.pose, state: s.state, playing: s.state === 'playing' || s.state === 'loading', glassDist: glass ? +glass.distance(eye).toFixed(3) : null,
            glassZ: glass ? +glass.z.toFixed(3) : null, layers: [...new Set(layers)] };
        }, mode);
        await shot(page, '97-7', mode);
      }
      facts[`tv-${mode}`] = f;
      await page.close();
    }
    // ── 97-19: the set in 2003 (at rest on its chest, lit) ──────────────────────────────────────────────────────────
    if (want('tv2003')) {
      const { page, errors } = await boot(mode, 2);
      await wait(4000);
      const st = await page.evaluate(() => { const s = window.__teachingTv?.()?.tvs?.[0]; return s ? { setEnabled: s.setEnabled, state: s.state, pose: s.pose } : null; });
      await look(page, mode, -18, -122);
      await shot(page, '97-19', mode);
      facts[`tv2003-${mode}`] = { set: st, errors };
      await page.close();
    }
    // ── 97-3: the door's top (the back wall, behind the seat) ───────────────────────────────────────────────────────
    if (want('door')) {
      const { page, errors } = await boot(mode);
      await look(page, mode, 14, 160);
      await shot(page, '97-3', mode);
      facts[`door-${mode}`] = { panel: await page.evaluate(() => { const e = window.__app.root.findByName('spineDoorPanel'); return e ? { pos: e.getPosition().toArray?.() ?? [e.getPosition().x, e.getPosition().y, e.getPosition().z], scale: [e.getLocalScale().x, e.getLocalScale().y, e.getLocalScale().z] } : null; }), errors };
      await page.close();
    }
    // ── 97-4: the floor beside the chair ────────────────────────────────────────────────────────────────────────────
    if (want('floor')) {
      const { page, errors } = await boot(mode);
      await look(page, mode, -55, -40);
      await shot(page, '97-4', mode);
      facts[`floor-${mode}`] = { homeworkPile: await page.evaluate(() => { const e = window.__app.root.findByName('homeworkPile'); if (!e) return null; const s = e.getLocalScale(); return { enabled: e.enabled, scale: [s.x, s.y, s.z], visible: e.render ? e.render.meshInstances.some((m) => m.visible !== false) && e.render.enabled : null }; }), errors };
      await page.close();
    }
    // ── 97-9: the handheld taken from FIT IN's advert on the fellowship's page: its music alone; in front of the monitor ──
    if (want('handheld')) {
      const { page, errors } = await boot(mode);
      await page.evaluate(() => { const o = window.__os; o.pauseShown?.add?.('e1'); o.kit?.onConnect?.(); if (o.kit) o.kit.open = false; });
      await wait(2500);
      const loopBefore = await page.evaluate(() => window.__os.e1LoopName ?? null);
      await page.evaluate(() => window.__os.onFitIn?.());
      await wait(2500);
      const f = await page.evaluate(async () => {
        let game = null; try { const m = await import('/src/state/voiceHold.ts'); game = typeof m.gameAudible === 'function' ? m.gameAudible() : 'n/a'; } catch { game = 'n/a'; }
        const e = window.__app.root.findByName('danielHandheld'); const layers = []; e?.forEach((n) => { if (n.render) layers.push(...n.render.layers); });
        return { loopWhileHeld: window.__os.e1LoopName ?? null, gameAudible: game, layers: [...new Set(layers)] };
      });
      await look(page, mode, mode === 'xr' ? -8 : -4, 0);
      await shot(page, '97-9', mode);
      facts[`handheld-${mode}`] = { loopBefore, ...f, errors };
      await page.close();
    }
    // ── 97-11: the channel's log line, and the tray beside it ──────────────────────────────────────────────────────
    if (want('log') && mode === 'desktop') {
      const { page, errors } = await boot(mode);
      await page.evaluate(async () => { const m = await import('/data/strings/slice.json'); const o = window.__os; o.toast = { text: (m.default ?? m).desktop.logToast, t: 10 }; o.dirty = true; });
      await wait(600);
      await shot(page, '97-11', mode); await canvas(page, '97-11');
      facts.log = { errors };
      await page.close();
    }
  }
  // ── 03-23: the moving boxes in Room 1 at 2016 (from Vera's seat, looking to Room 1, and from above Room 1) ───────────
  if (want('boxes')) for (const mode of ['desktop']) {
    const { page, errors } = await boot(mode, 3);
    await wait(4000);
    const at = await page.evaluate(() => ['movingBox1', 'movingBox1Tape', 'movingBox1Label'].map((n) => { const e = window.__app.root.findByName(n); return e ? { n, enabled: e.enabled, p: [e.getPosition().x, e.getPosition().y, e.getPosition().z] } : { n, missing: true }; }));
    if (mode === 'desktop') await page.evaluate(() => window.__camFree(0.0, 1.5, 2.8, -36, -30));   // from Room 1's middle, down at the boxes
    else await page.evaluate(() => { window.__aimHead = { pitch: -20, yaw: -90 }; });
    await shot(page, '03-23', mode);
    facts[`boxes-${mode}`] = { at, errors };
    await page.close();
  }
} finally {
  const file = path.join(OUT, `s407-${LABEL}.json`);
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* a first run */ }
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...facts }, null, 1));
  await b.close();
}
console.log(JSON.stringify(facts, null, 1).slice(0, 6000));
