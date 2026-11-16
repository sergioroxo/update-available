#!/usr/bin/env node
/**
 * ⚑ S396 (UiB job 28, the follow-up to his "FIX first") — WHILE ANYTHING IS HELD, NOTHING OF THE FRAME COVERS IT.
 *
 *     node tools/s396-held-clear-probe.mjs --port 5201 [--out output/s396-held-clear] [--mode desktop|phone|xr|all]
 *                                          [--label after|before] [--only 1997|2003|2016|2026]
 *
 * Per room (the review routes of tools/s394-lamby-tv-probe.mjs), each device that can be held there — the Lamby set (1997,
 * 2016, 2026), the game (the 1997 handheld, the 2003 flip phone, the 2026 console, where its prop is present), Vera's phone
 * (2016) — is brought to the eye (the review aids: `__teachingTv.take`, `__heldDevices.take`, `__os.onGuideMove('phone')`);
 * a Lamby set is played a second and paused, so the room's music comes back with its caption, as it does for a visitor; a
 * sound cue is forced every half second while held (the caption strip shows), and the frame's controls reminder is asked
 * for. Then:
 *  · computer and phone: the held device's face on the screen (its glass and its keys: `__teachingTv.heldClear()`) and the
 *    rect of every visible element of the page layer — the caption strip, the call, the reminder, the hints (and every other
 *    visible fixed element, the frame's own buttons included) — must not intersect; the caption strip must still be showing
 *    (moved, not lost); put down, every element is back where it was (its own place);
 *  · headset: while held no plate or notice of the frame is up (job 27's rule: xrFrame.setHeld), a notice sent while held
 *    included.
 * Photographs (computer and phone): each device held, the strip showing — `<label>-<mode>-<room>-<device>.png`, and the Lamby
 * set held and paused (`…-lamby-held-paused.png`, the B6 frame). `--label before` (a build without the fix) takes the
 * photographs only. Writes report-<label>-<mode>.json; exit 1 on any failed check. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s396-held-clear'));
const MODE = flag('mode', 'all');
const LABEL = flag('label', 'after');
const ONLY = flag('only', '');
const BEFORE = LABEL === 'before';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ROOMS = [
  { room: '1997', era: 1, devices: [{ kind: 'lamby', tape: '1997' }, { kind: 'game', eraId: 'e1', name: 'handheld' }], cue: 'post_beep_1997.mp3' },
  { room: '2003', era: 2, devices: [{ kind: 'game', eraId: 'e2', name: 'flip-phone' }], cue: 'ui_press.mp3' },
  // (Vera's handset is retired as a held device: S327, "the Handset Window is her phone" — its screen stays off; the case is
  //   kept so a build that brings it back is checked, and reports itself skipped while it is retired)
  { room: '2016', era: 3, devices: [{ kind: 'lamby', tape: '2016' }, { kind: 'phone', name: 'vera-phone' }], cue: 'grace_loop_2016.mp3' },
  { room: '2026', era: 4, devices: [{ kind: 'lamby', tape: '2026' }, { kind: 'game', eraId: 'e4', name: 'console' }], cue: 'step_done_2026.mp3' }
];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const checks = [];
const measures = {};
const check = (mode, room, name, ok, extra = '') => { checks.push({ mode, room, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode} ${room}] ${name}${extra ? '  ' + extra : ''}`); };
const info = (mode, room, text) => { console.log(`INFO  [${mode} ${room}] ${text}`); };
const meets = (a, b) => a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5;

async function room(R, mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  const C = (name, ok, extra) => check(mode, R.room, name, ok, extra);
  const q = R.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${R.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (R.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__teachingTv && window.__camPose && window.__os, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(5000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (R.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (R.era === 3) await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
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
  }
  await wait(1500);
  const cue = (name) => page.evaluate(async (n) => { const t = await import('/src/audio/tapeAudio.ts'); t.announceCue(n); }, name);
  const ask = () => page.evaluate(async () => { try { const m = await import('/src/state/gameMenuBus.ts'); m.gameMenuBus.showHint?.(); } catch { /* no reminder in this build */ } });
  const take = (d) => page.evaluate((d) => {
    if (d.kind === 'lamby') { window.__teachingTv.take(d.tape); return true; }
    if (d.kind === 'game') { const H = window.__heldDevices; if (!H) return false; H.take(d.eraId, window.__app.root.findByName('camera')); return H.held(d.eraId); }
    if (d.kind === 'phone') { window.__os.onGuideMove?.('phone'); return true; }
    return false;
  }, d);
  const heldNow = (d) => page.evaluate((d) => {
    if (d.kind === 'lamby') return !!window.__teachingTv().tvs.find((x) => x.tape === d.tape)?.held;
    if (d.kind === 'game') return !!window.__heldDevices?.held(d.eraId);
    if (d.kind === 'phone') { const D = window.__teachingTv.heldClear?.(); return D ? !!D.face : true; }   // (a build without the hook: assumed)
    return false;
  }, d);
  const putDown = (d) => page.evaluate((d) => {
    if (d.kind === 'lamby') window.__teachingTv.putBack(d.tape);
    if (d.kind === 'game') window.__heldDevices.release(d.eraId);
  }, d);
  /** every visible fixed element of the page layer (not the canvas, not a whole-screen veil), with its rect */
  const pageLayer = () => page.evaluate(() => {
    const out = [], W = innerWidth, H = innerHeight;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || el.tagName === 'CANVAS') continue;
      let up = el.parentElement, inFixed = false;   // (the outermost fixed element only: a fixed child is part of it)
      while (up && up !== document.body) { if (getComputedStyle(up).position === 'fixed') { inFixed = true; break; } up = up.parentElement; }
      if (inFixed) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0.01) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.width * r.height > W * H * 0.6) continue;   // a whole-screen layer (the veils, the vignette): not a notice
      if (el.closest('#debug-panel, .debug-panel, [data-debug-ui]') || /^⚙/.test((el.textContent || '').trim())) continue;   // the ?debug=1 panel and its toggle (not the shipped frame)
      out.push({ id: el.id || el.className || el.tagName, text: (el.textContent || '').trim().slice(0, 40), rect: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } });
    }
    return out;
  });
  const M = measures[`${mode}-${R.room}`] = {};
  try {
    for (const d of R.devices) {
      const dn = d.kind === 'lamby' ? 'lamby' : d.name;
      if (!(await take(d))) { info(mode, R.room, `${dn}: not present at this beat (its prop is not in the room yet) — skipped`); continue; }
      await wait(1900);
      if (!(await heldNow(d))) { info(mode, R.room, `${dn}: could not be brought to the eye here — skipped`); continue; }
      if (d.kind === 'lamby') {
        await page.evaluate((t) => window.__teachingTv.play(t, 6), d.tape); await wait(1500);
        await page.evaluate((t) => window.__teachingTv.press(t, 'tv-pause'), d.tape);
      }
      if (xr) {
        await page.evaluate(() => window.__xrFrame.notice('A frame notice, sent while it is held', 9));
        for (let i = 0; i < 4; i++) { await cue(R.cue); await wait(400); }
        const shown = await page.evaluate(() => window.__xrFrame.hintShown());
        C(`${dn} held: no plate or notice of the frame is up (a notice and a sound cue sent while held)`, !shown, JSON.stringify(shown?.text ?? null));
        await putDown(d); await wait(1800);
        continue;
      }
      await ask();
      for (let i = 0; i < 3; i++) { await cue(R.cue); await wait(450); }
      const D = BEFORE ? null : await page.evaluate(() => window.__teachingTv.heldClear?.() ?? null);
      const layer = await pageLayer();
      await page.screenshot({ path: path.join(OUT, `${LABEL}-${mode}-${R.room}-${dn}${d.kind === 'lamby' ? '-held-paused' : ''}.png`) });
      if (BEFORE) { M[dn] = { layer }; await putDown(d); await wait(1900); continue; }
      const face = D?.face ?? [];
      M[dn] = { face, layer, placed: D?.clearance?.elements };
      C(`${dn} held: its face is measured on the screen (its glass, and its keys where it has them)`, face.length >= 1 && (d.kind !== 'lamby' || face.length === 3), `${face.length} rects`);
      const over = layer.filter((e) => face.some((f) => meets(e.rect, f)));
      C(`${dn} held: nothing of the page layer covers its glass or its keys (a sound cue and the reminder forced)`, over.length === 0,
        over.length ? JSON.stringify(over.map((e) => ({ id: e.id, text: e.text, rect: e.rect }))) : `${layer.length} visible elements clear: ${layer.map((e) => e.id).join(', ')}`);
      // …and the frame's own elements never cover EACH OTHER while it is held (a moved one placed under one that stayed:
      //   9fc983b7's flip phone, the reminder under the look button)
      const pairs = [];
      for (let i = 0; i < layer.length; i++) for (let j = i + 1; j < layer.length; j++) {
        if (meets(layer[i].rect, layer[j].rect)) pairs.push([layer[i].text || layer[i].id, layer[j].text || layer[j].id]);
      }
      C(`${dn} held: no two visible elements of the page layer meet`, pairs.length === 0, pairs.length ? JSON.stringify(pairs) : `${layer.length} elements apart`);
      const strip = D?.clearance?.elements.find((e) => e.id === 'caption-strip');
      C(`${dn} held: the caption strip still shows, moved clear (${strip?.placed})`, !!strip && strip.visible && strip.placed !== 'hidden' && !face.some((f) => meets(strip.rect, f)), JSON.stringify(strip));
      await putDown(d); await wait(1900);
      if (d.kind !== 'phone') {
        const E = await page.evaluate(() => window.__teachingTv.heldClear?.() ?? null);
        const back = E?.clearance?.elements ?? [];
        C(`${dn} put down: every element is back in its own place`, !E?.clearance?.held && back.every((e) => e.placed === 'own'), JSON.stringify(back.map((e) => [e.id, e.placed])));
      }
    }
  } catch (e) { errors.push(String(e).slice(0, 300)); console.error(e); }
  C('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

const modes = MODE === 'all' ? ['desktop', 'phone', 'xr'] : [MODE];
for (const mode of modes) for (const R of ROOMS) { if (!ONLY || ONLY === R.room) { console.log(`\n── ${LABEL} ${mode} · ${R.room}`); await room(R, mode); } }
fs.writeFileSync(path.join(OUT, `report-${LABEL}-${MODE}${ONLY ? '-' + ONLY : ''}.json`), JSON.stringify({ port: PORT, checks, measures }, null, 1));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
