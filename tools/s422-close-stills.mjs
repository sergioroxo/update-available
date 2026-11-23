#!/usr/bin/env node
/**
 * ⚑ S422 (UiB job 35 Part B) — THE CLOSE, FROM THE SEAT, in each look-mode: the moments his 20 Nov headset run named.
 *
 *     node tools/s422-close-stills.mjs --port 5631 --out <dir> --label after [--modes desktop,xr,phone]
 *
 * From the end of 2026 (`?era=4`, the debug jump `e4Act4End`, which runs on into the Close the way the visit does), to the
 * Restart page and back. Per look-mode it writes <moment>_<mode>.png and report.json:
 *   line        his monitor brought before him, Maya's line drawn on it (C-1)
 *   line_after  0.8 s after the four lines have been read: where the monitor is (C-1: it stays; before S422 it went back)
 *   stars       the moment before the first card (C-2: the stars round him; before S422 the stickers on the ceiling)
 *   card        the first card
 *   play        the head turned 40° to the right, a press, the head back: where the second card is (C-6)
 *   behind      the cards' stage, the view behind him (yaw +180); `sweep` lists what is drawn every 30° (C-10)
 *   panels      the panels up, from the seat at rest (C-7)
 *   label       a 2003 label, looked at (C-2)
 *   end         the eye taken to Daniel's machine
 *   restart     the machine pressed: the Restart page (C-9)
 *   way_back    its "Back to the panels" pressed (C-5; before S422 the window's ✕ Close)
 *   white / lexicon (headset only) the ray on a white era page and on the Lexicon: is its dot drawn over them (C-8)
 * Headset: the seated mock (xr.active forced, the head at (0, 1.2, 0), 90°, a controller added and a select), as jobs 33–34.
 * The report also carries every label's size from the seat (degrees, and px in the mock's 1000 px view at three pitches)
 * and the most draw calls seen in each stage.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s422-close'));
const LABEL = flag('label', 'after');
const MODES = flag('modes', 'desktop,xr,phone').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const VIEW = { desktop: { width: 1280, height: 720, deviceScaleFactor: 1 }, xr: { width: 1000, height: 1000, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
const HIDE = 'body > *:not(canvas) { visibility: hidden !important; }';
const HIDE_DEBUG = '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }';

async function run(mode) {
  const XR = mode === 'xr';
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
    timeout: 180000, protocolTimeout: 300000, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const r = { mode, label: LABEL, shots: [], errors };
  const shot = async (name, note) => { await page.screenshot({ path: path.join(OUT, `${name}_${mode}.png`) }); r.shots.push({ name, note: note ?? null }); };
  const state = () => page.evaluate(() => { const c = window.__closeState(); const d = window.__danielLine;
    return { ...c, phase: d?.phase, shown: d?.shown, drawn: d?.drawn, inStage: (performance.now() / 1000) - (window.__closeLog?.slice(-1)[0]?.at ?? 0) }; });
  const until = async (pred, limit = 240000, arg) => { const s = Date.now(); while (Date.now() - s < limit) { if (await page.evaluate(pred, arg)) return true; await wait(120); } return false; };
  /** the headset: turn the head (local, about the rig) */
  const head = (yaw, pitch = 0) => page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), yaw, pitch);
  /** the headset: aim the head at a world (logical) point */
  const headAt = (pt) => page.evaluate((pt) => {
    const app = window.__app, h = app.root.findByName('camera'), c = window.__xrComfort, V = h.getPosition().constructor;
    const t = c.physicalPoint(new V(pt.x, pt.y, pt.z));
    const tl = h.parent.getWorldTransform().clone().invert().transformPoint(t, new V());
    const d = tl.sub(h.getLocalPosition());
    h.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
  }, pt);
  const select = () => page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
  const tap = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up(); };
  try {
    await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__danielLine && window.__closeState, { timeout: 180000 });
    await page.addStyleTag({ content: HIDE_DEBUG });
    let hide = XR ? await page.addStyleTag({ content: HIDE }) : null;
    await wait(5000);
    if (XR) {
      await page.evaluate(() => {
        const app = window.__app, h = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        h.setLocalPosition(0, 1.2, 0); h.setLocalEulerAngles(0, 0, 0); h.camera.fov = 90;
        const src = { targetRayMode: 'tracked-pointer', getOrigin: () => h.getPosition().clone(), getDirection: () => h.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
        window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      });
      await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
      await wait(2000);
    }
    // the draw calls, the most in each stage of the Close (100 ms)
    await page.evaluate(() => {
      window.__s422dc = {};
      window.__s422T = setInterval(() => { const st = window.__closeState?.()?.stage ?? 'none'; const d = window.__drawCalls ?? 0;
        const k = st + (window.__closeState?.()?.page ? ':page' : ''); window.__s422dc[k] = Math.max(window.__s422dc[k] ?? 0, d); }, 100);
    });
    await page.evaluate(() => window.__os.debugJump('e4Act4End'));
    // ── C-1: the line ──
    r.line = await until(() => window.__danielLine.shown === 2 && window.__danielLine.drawn);
    await wait(500);
    await shot('line', 'Maya’s line drawn on his monitor');
    r.lineRead = await until(() => window.__danielLine.shown === 4 && window.__danielLine.phase !== 'held' && window.__danielLine.phase !== 'lift');
    await wait(800);
    await shot('line_after', 'the four lines read, 0.8 s after');
    r.linePhaseAfter = (await state()).phase;
    // ── C-2: the moment before the first card ──
    const desc = await until(() => window.__closeState().stage === 'descend' || window.__closeState().stage === 'message');
    r.hasDescend = desc && (await state()).stage === 'descend';
    if (r.hasDescend) {
      await until(() => { const l = window.__closeLog?.slice(-1)[0]; return window.__closeState().stage !== 'descend' || (l && performance.now() / 1000 - l.at > 12.5); }, 60000);
    } else {
      await until(() => { const l = window.__closeLog?.slice(-1)[0]; return window.__closeState().stage === 'message' || (window.__closeState().stage === 'hold' && l && performance.now() / 1000 - l.at > 4.5); }, 90000);
    }
    await shot('stars', 'the moment before the first card');
    // ── the cards ──
    await until(() => window.__closeState().stage === 'message' && window.__closeCard?.on);
    await wait(1500);
    await shot('card', 'card 1');
    // C-6: the head turned away, a press, the head back
    if (XR) { await head(-40, 10); await wait(300); await select(); await wait(900); await head(0, 0); await wait(600); }
    else { await tap(VIEW[mode].width * 0.8, VIEW[mode].height * 0.25); await wait(1200); }
    await shot('play', 'card 2, after a press made with the head turned 40° right (headset) / a press at the top right (screen)');
    // C-10: the view behind him, and what is drawn every 30°
    r.sweep = [];
    const pose0 = XR ? null : await page.evaluate(() => window.__camPose());
    for (let k = 0; k < 12; k++) {
      const yaw = k * 30;
      if (XR) await head(yaw, 0); else await page.evaluate((p, y) => window.__camFree(p.x, p.y, p.z, 0, p.yaw + y), pose0, yaw);
      await wait(350);
      if (yaw === 180) await shot('behind', 'the cards’ stage, the view behind him');
      const seen = await page.evaluate(() => {
        // every render that is on, and is not the Close's own (the sky, its stickers, the frame's plates, the pointer)
        const own = /^(point-cloud|close-ceiling-stars|xr-|camera|logical-head|authored-seat|daniel-line-crt|close-panel-focus)/;
        const names = new Set();
        window.__app.root.forEach((e) => {
          if (!e.render || !e.render.enabled || !e.enabled) return;
          let a = e, mine = false; while (a) { if (own.test(a.name ?? '')) { mine = true; break; } a = a.parent; }
          let on = true; a = e; while (a) { if (a.enabled === false) { on = false; break; } a = a.parent; }
          if (!mine && on) names.add(e.name);
        });
        return { draws: window.__drawCalls, room: [...names].slice(0, 30), roomCount: names.size };
      });
      r.sweep.push({ yaw, ...seen });
    }
    if (XR) await head(0, 0); else await page.evaluate((p) => window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw), pose0);
    // the rest of the cards
    for (let i = 0; i < 12; i++) {
      const st = await state();
      if (st.stage !== 'message') break;
      if (XR) await select(); else await tap(VIEW[mode].width / 2, VIEW[mode].height * 0.7);
      await wait(900);
    }
    // ── C-7: the panels ──
    await until(() => window.__closeState().panels && window.__closeState().stage !== 'open');
    await wait(1500);
    await shot('panels', 'the panels up, from the seat at rest');
    r.panels = await page.evaluate((xr) => {
      const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
      const phys = (q) => (xr ? window.__xrComfort.physicalPoint(new V(q[0], q[1], q[2])) : new V(q[0], q[1], q[2]));
      const eye = xr ? window.__xrComfort.logicalPoint(cam.getPosition().clone()) : cam.getPosition().clone();
      return window.__closePanels().map((p) => {
        const s = p.corners.map((q) => cam.camera.worldToScreen(phys(q)));
        const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z;
        return { era: p.era, machine: p.machine, bearing: +(Math.atan2(dx, -dz) * 180 / Math.PI).toFixed(1), elev: +(Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI).toFixed(1),
          dist: +Math.hypot(dx, dy, dz).toFixed(2), leftH: Math.round(Math.abs(s[0].y - s[3].y)), rightH: Math.round(Math.abs(s[1].y - s[2].y)),
          topY: Math.round(Math.min(s[0].y, s[1].y)), botY: Math.round(Math.max(s[2].y, s[3].y)), inFront: s.every((v) => v.z > 0) };
      });
    }, XR);
    r.panelSizes = await page.evaluate(() => window.__closePanelSizes ?? null);
    // ── C-2: every label from the seat ──
    r.labels = await page.evaluate(async (xr) => {
      const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
      const eye = xr ? window.__xrComfort.logicalPoint(cam.getPosition().clone()) : cam.getPosition().clone();
      return window.__closeLabels().map((l) => {
        const d = Math.hypot(l.x - eye.x, l.y - eye.y, l.z - eye.z);
        const em = l.hh * 2 * 26 / 36;   // the atlas: a 26 px letter in a 36 px row
        return { text: l.text, era: l.era, dist: +d.toFixed(2), emDeg: +(2 * Math.atan(em / 2 / d) * 180 / Math.PI).toFixed(2),
          bearing: +(Math.atan2(l.x - eye.x, -(l.z - eye.z)) * 180 / Math.PI).toFixed(1), elev: +(Math.atan2(l.y - eye.y, Math.hypot(l.x - eye.x, l.z - eye.z)) * 180 / Math.PI).toFixed(1),
          x: l.x, y: l.y, z: l.z, hh: l.hh };
      });
    }, XR);
    // px in the headset mock's view (1000 px, 90°), the head turned toward the label, at three pitches about it
    if (XR) {
      for (const l of r.labels) {
        l.px = {};
        for (const dp of [-15, 0, 15]) {
          const px = await page.evaluate((l, dp) => {
            const app = window.__app, h = app.root.findByName('camera'), c = window.__xrComfort, V = h.getPosition().constructor;
            const top = c.physicalPoint(new V(l.x, l.y + l.hh * 26 / 36, l.z)), bot = c.physicalPoint(new V(l.x, l.y - l.hh * 26 / 36, l.z));
            const mid = c.physicalPoint(new V(l.x, l.y, l.z));
            const tl = h.parent.getWorldTransform().clone().invert().transformPoint(mid, new V()).sub(h.getLocalPosition());
            h.setLocalEulerAngles(Math.atan2(tl.y, Math.hypot(tl.x, tl.z)) * 180 / Math.PI + dp, Math.atan2(-tl.x, -tl.z) * 180 / Math.PI, 0);
            h.syncHierarchy();
            const a = h.camera.worldToScreen(top), b = h.camera.worldToScreen(bot);
            const inView = a.z > 0 && b.z > 0 && a.y >= 0 && b.y <= 1000 && a.x >= 0 && a.x <= 1000;
            return inView ? +Math.abs(b.y - a.y).toFixed(1) : null;
          }, l, dp);
          l.px[dp] = px;
        }
      }
      await head(0, 0);
    }
    // a 2003 label, looked at
    const lab = r.labels.find((l) => l.era === 2) ?? r.labels[0];
    if (lab) {
      if (XR) await headAt(lab);
      else { const E = await page.evaluate(() => window.__camPose()); r.panelsPose = E;
        await page.evaluate((E, l) => window.__camFree(E.x, E.y, E.z, l.elev, -l.bearing), E, lab); }   // bearing is the world's (atan2(dx, −dz)); yaw = −bearing
      await wait(700);
      await shot('label', `a 2003 label looked at: “${lab.text}”`);
      if (XR) await head(0, 0); else await page.evaluate((E) => window.__camFree(E.x, E.y, E.z, E.pitch, E.yaw), r.panelsPose);
      await wait(300);
    }
    // ── the end: the eye taken to Daniel's machine, then pressed ──
    await until(() => window.__closeMachine?.ended, 90000);
    await wait(1500);
    await shot('end', 'the eye taken to Daniel’s machine');
    r.machine = (await page.evaluate(() => window.__closePanels())).find((p) => p.machine) ?? null;
    if (hide) { await hide.evaluate((el) => el.remove()); hide = null; }
    if (XR) await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-site-viewer) { visibility: hidden !important; }' });
    if (XR) {
      await page.evaluate(() => {
        const app = window.__app, h = app.root.findByName('camera'), c = window.__xrComfort;
        const mp = window.__closePanels().find((p) => p.machine); const b = mp.button ?? mp;
        const origin = h.getPosition().clone(), target = c.physicalPoint(h.getPosition().clone().set(b.x, b.y, b.z));
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      });
      await wait(300); await select(); await wait(200);
      await page.evaluate(() => { const h = window.__app.root.findByName('camera'); window.__controller.getDirection = () => h.forward.clone(); });
    } else {
      const pt = await page.evaluate(() => {
        const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
        const mp = window.__closePanels().find((p) => p.machine); if (!mp) return null;
        const b = mp.button || mp; const q = cam.camera.worldToScreen(new V(b.x, b.y, b.z)); return q.z > 0 ? [q.x, q.y] : null;
      });
      r.machineButtonOnScreen = pt;
      if (pt) await tap(pt[0], pt[1]);
    }
    r.restart = await until(() => window.__closeMachine?.endingShowing, 15000);
    await wait(1800);
    await shot('restart', 'the machine pressed: the Restart page');
    // ── C-5: the way back to the panels (before S422: the window's ✕ Close) ──
    const backId = await page.evaluate(() => {
      const v = window.__siteViewer; const core = window.__app.xr.active ? v.xr.core : v.dom;
      const hits = core.hits ?? core.info?.().hits ?? [];
      return (hits.find?.((h) => h.id === 'm:panels') ? 'm:panels' : 'close');
    }).catch(() => 'close');
    r.wayBackId = backId;
    r.wayBack = await page.evaluate((id) => {
      const v = window.__siteViewer; const core = window.__app.xr.active ? v.xr.core : v.dom;
      const h = (core.hits ?? []).find((q) => q.id === id);
      if (!h) return { pressed: false };
      core.press(h.x + h.w / 2, h.y + h.h / 2);
      return { pressed: true, rect: [h.x, h.y, h.w, h.h] };
    }, backId).catch((e) => ({ err: String(e).slice(0, 120) }));
    await wait(XR ? 1500 : 6500);
    r.afterWayBack = await page.evaluate(() => ({ page: window.__siteViewer.bus.view, cam: window.__camPose() }));
    await shot('way_back', `“${backId}” pressed on the Restart page`);
    // ── C-8 (headset): the ray on a white era page and on the Lexicon ──
    if (XR) {
      for (const [target, name] of [['2016', 'white'], ['lexicon', 'lexicon']]) {
        await page.evaluate((t) => window.__siteViewer.open(t), target);
        await wait(2200);
        // aim the ray at a control on the window: the plane's own hit list, its centre carried into the world
        const aimed = await page.evaluate(() => {
          const v = window.__siteViewer, core = v.xr.core, e = window.__app.root.findByName('xr-site-viewer') ?? null;
          const hits = (core.hits ?? []).filter((h) => !/^(close|min)$/.test(h.id));
          const h = hits.find((q) => /^(view:|tab:|lx:|m:)/.test(q.id)) ?? hits[0];
          return { id: h?.id ?? null, n: hits.length, plane: !!e };
        });
        const ok = await page.evaluate(() => {
          const app = window.__app, h = app.root.findByName('camera');
          const plane = app.root.findByName('xr-frame-site');
          const core = window.__siteViewer.xr.core;
          const hits = (core.hits ?? []).filter((q) => /^(view:|tab:|lx:|m:)/.test(q.id));
          const hit = hits[1] ?? hits[0];
          if (!plane || !plane.enabled || !hit) return { plane: plane?.name ?? null, hit: hit?.id ?? null };
          const W = 1024, H = 768;   // xrMount.ts LW × LH
          const m = plane.getWorldTransform().data;
          const u = (hit.x + hit.w / 2) / W - 0.5, v = (hit.y + hit.h / 2) / H - 0.5;
          const V = h.getPosition().constructor;
          const p = new V(m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]);
          const o = h.getPosition().clone();
          window.__controller.getOrigin = () => o.clone().add(new V(0.12, -0.25, -0.05));
          window.__controller.getDirection = () => p.clone().sub(o.clone().add(new V(0.12, -0.25, -0.05))).normalize();
          return { plane: plane.name, hit: hit.id, W, H };
        });
        await wait(900);
        await shot(name, `the ray on the ${target === 'lexicon' ? 'Lexicon' : '2016 site'} (${ok.hit ?? 'no control'})`);
        r[name] = { ...aimed, ...ok, hover: await page.evaluate(() => window.__siteViewer.xr.core.hover ?? null).catch(() => null) };
        await page.evaluate(() => { const h = window.__app.root.findByName('camera'); window.__controller.getOrigin = () => h.getPosition().clone(); window.__controller.getDirection = () => h.forward.clone(); window.__siteViewer.bus.closeXr?.(); });
        await wait(600);
      }
    }
    r.drawCalls = await page.evaluate(() => { clearInterval(window.__s422T); return window.__s422dc; });
    r.closeLog = await page.evaluate(() => window.__closeLog ?? null);
  } catch (e) {
    errors.push('PROBE ' + String(e).slice(0, 300));
  } finally {
    await Promise.race([browser.close(), wait(5000)]);
  }
  console.log(JSON.stringify({ mode, shots: r.shots.map((s) => s.name), errors: errors.length, draws: r.drawCalls }));
  return r;
}

const rows = await Promise.all(MODES.map((m) => run(m)));
fs.writeFileSync(path.join(OUT, `report_${LABEL}.json`), JSON.stringify(rows, null, 1));
