#!/usr/bin/env node
/**
 * ⚑ S408 (UiB job 32 Part C) — 1997 → 2003 and 2003, photographed before and after, item by item.
 *
 *     node tools/s408-2003-probe.mjs --port 5481 --label after [--mode desktop|xr|both] [--only arrival,caleb,…] [--out dir]
 *
 * Stills are not reachability claims (tools/walk.mjs is): each scene boots its own page (`?era=2`, or 1997 for the
 * rise) and drives the beat with the OS's own debug jumps and real presses on published hit rects. Per shot it saves
 * the monitor's canvas (`<id>_<label>_screen.png`, legible) and the view (`<id>_<label>_<mode>.png`, desktop seat or the
 * headset mock), and writes `<label>-<mode>-report.json`: what each beat measured (timings, clips heard, the film's bob).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'probe');
const MODE = flag('mode', 'desktop');
const ONLY = flag('only', '').split(',').filter(Boolean);
const OUT = path.resolve(flag('out', 'out/s408-probe'));
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });

/** every Audio the page makes: its file, and its real duration once known */
const AUDIO_WRAP = `(() => { const A = window.Audio; window.__heard = []; window.Audio = function (src) { const a = new A(src);
  const rec = { src: String(src || '').split('/').pop(), at: performance.now(), duration: null }; window.__heard.push(rec);
  a.addEventListener('loadedmetadata', () => { rec.duration = a.duration; }); return a; }; window.Audio.prototype = A.prototype; })();`;

async function boot(query, mode, descent = false) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(AUDIO_WRAP);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  // `descent`: the driven camera moves stay on (the rise out of 1997 is one); the opening's own descent is waited out
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${query}&debug=1${descent ? '' : '&descent=0'}&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__poses, { timeout: 180000 });
  if (descent) for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose?.()); if (!p || (!p.driven && !p.descent)) break; await wait(1000); }
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(6000);
  if (mode === 'xr') {
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
  return { page, errors };
}

const report = { label: LABEL, port: PORT, scenes: {} };
async function shot(page, id, mode, note) {
  const url = await page.evaluate(() => window.__os.canvas.toDataURL());
  fs.writeFileSync(path.join(OUT, `${id}_${LABEL}_screen.png`), Buffer.from(url.split(',')[1], 'base64'));
  await page.screenshot({ path: path.join(OUT, `${id}_${LABEL}_${mode}.png`) });
  if (note) console.log(`  ${id} ${mode}: ${note}`);
}
/** press a published hit by id: the desktop's own list, then each window's */
async function press(page, id) {
  const hit = await page.evaluate((want) => {
    const os = window.__os;
    const lists = [os.hits, os.caleb?.hits, os.updateApp?.hits, os.restorify?.hits, os.companion?.hits, os.testimony?.hits, os.womensTrack?.hits, os.accountability?.hits];
    for (const l of lists) { const h = (l ?? []).find((x) => x.id === want); if (h) return h; }
    return null;
  }, id);
  if (!hit) return false;
  await page.evaluate((h) => window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2), hit);
  return true;
}
const ids = (page) => page.evaluate(() => { const os = window.__os; return [...(os.hits ?? []), ...(os.caleb?.hits ?? []), ...(os.restorify?.hits ?? []), ...(os.companion?.hits ?? [])].map((h) => h.id); });
const lg = (page) => page.evaluate(() => { const v = window.__os.lambyGuide?.view; return v ? { rung: v.rung, text: v.text, hidden: v.hidden } : null; });

const SCENES = {
  /** 97-20, 03-2, 03-3: Welcome back → (crawl | film) → the film's last frame → Lamby's first line */
  async arrival(mode) {
    const { page, errors } = await boot('era=2', mode);
    const r = {};
    await page.evaluate(() => window.__os.debugJump('e2Silence')); await wait(1500);
    await page.evaluate(() => window.__os.handleClick(256, 190)); await wait(5500);
    r.after5s = await page.evaluate(() => window.__os.e2Stage);
    await shot(page, '97-20', mode, `5.5 s after the return press: stage ${r.after5s}`);
    await page.evaluate(() => window.__os.debugJump('e2Cartoon')); await wait(1500);
    await page.evaluate(() => { const os = window.__os; os.e2StageT = 22.9; if (os.e2Jingle) os.e2Jingle.currentTime = 22.9; os.dirty = true; });
    await wait(1250);
    r.dissolve = await page.evaluate(() => ({ stage: window.__os.e2Stage, left: window.__os.e2FilmDissolve ?? null }));
    await shot(page, '03-2_mid', mode, `the hand-over: ${JSON.stringify(r.dissolve)}`);
    await wait(2500);
    r.dialog = await page.evaluate(() => ({ stage: window.__os.e2Stage, jingle: !!window.__os.e2Jingle }));
    await shot(page, '03-2_03-3', mode, `Lamby's dialog: ${JSON.stringify(r.dialog)}`);
    r.errors = errors; await page.close(); return r;
  },
  /** 03-4, 03-5, 03-6: Begin → the loading box → the check-in → Companion → Today; the desk */
  async program(mode) {
    const { page, errors } = await boot('era=2', mode);
    const r = {};
    await page.evaluate(() => window.__os.debugJump('e2Program')); await wait(1200);
    r.begin = await press(page, 'lamby-begin'); await wait(1500);
    await shot(page, '03-4', mode, 'under the loading box');
    await wait(3500);
    r.first = await page.evaluate(() => ({ today: window.__os.restorify?.today, open: window.__os.restorify?.open }));
    await shot(page, '03-5_first', mode, `the first window: ${JSON.stringify(r.first)}`);
    if (r.first.today) { await press(page, 'today-checkin'); await wait(800); }
    r.chip = await press(page, 'checkin:grateful'); await wait(1200);
    r.companion = await press(page, 'companion-open'); await wait(3500);
    r.music = await page.evaluate(() => window.__heard.filter((h) => /restorify_loop/.test(h.src)).length);
    r.overCompanion = await page.evaluate(() => ({ pause: window.__os.pauseOpen ?? null, companion: window.__os.companion.open }));
    await shot(page, '03-5_companion', mode, `with the Companion: ${JSON.stringify(r.overCompanion)}`);
    await press(page, 'companion-close'); await wait(2500);
    r.back = await page.evaluate(() => ({ today: window.__os.restorify?.today, open: window.__os.restorify?.open, pause: window.__os.pauseOpen ?? null }));
    await shot(page, '03-5_after-companion', mode, `after the Companion: ${JSON.stringify(r.back)}`);
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.pauseOpen = null; os.dirty = true; }); await wait(1500);
    r.icons = (await ids(page)).filter((i) => i.startsWith('icon-'));
    await shot(page, '03-6', mode, `the desk's icons: ${r.icons.join(' ')}`);
    r.errors = errors; await page.close(); return r;
  },
  /** 03-8, 03-9, 03-10, 03-7: his page's still and stream, the bed against the picture, the teaser's sound and picture */
  async story(mode) {
    const { page, errors } = await boot('era=2', mode);
    const r = {};
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.openTestimony(); os.dirty = true; }); await wait(1500);
    r.prepSongs = await page.evaluate(() => window.__heard.map((h) => h.src).filter((s) => /restorify_media/.test(s)));
    await page.evaluate(() => { const t = window.__os.testimony; t.stage = 'online'; t.web = 'page'; t.dirty = true; window.__os.dirty = true; }); await wait(1200);
    await shot(page, '03-8_page', mode, 'his page');
    await page.evaluate(() => { const t = window.__os.testimony; t.web = 'buffer'; t.webT = 0.6; t.dirty = true; }); await wait(300);
    await shot(page, '03-8_buffer', mode, 'the stream opening');
    await wait(2500);
    r.play = await page.evaluate(() => window.__os.testimony.web);
    await wait(1500);
    r.bed = await page.evaluate(() => window.__heard.filter((h) => /testimony_bed/.test(h.src)).map((h) => ({ src: h.src, duration: h.duration })));
    await page.evaluate(() => { const t = window.__os.testimony; t.web = 'teaser'; t.webT = 0; t.dirty = true; }); await wait(3200);
    await shot(page, '03-10', mode, 'the teaser');
    r.teaserSound = await page.evaluate(() => window.__heard.slice(-4).map((h) => h.src));
    r.errors = errors; await page.close(); return r;
  },
  /** 03-13: the message lands — the toast, or Lamby */
  async message(mode) {
    const { page, errors } = await boot('era=2', mode);
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.dirty = true; }); await wait(800);
    await page.evaluate(() => { const os = window.__os; os.toast = null; os.eraBalloonSaid = true; os.debugJump('e2Message'); }); await wait(3000);
    const r = { toastAt3s: await page.evaluate(() => window.__os.toast?.text ?? null), lambyAt3s: await lg(page) };
    // the build's one prompt: the toast (before) or Lamby's balloon (after), once the era's own corner line has had its time
    for (let i = 0; i < 30; i++) { const v = await lg(page); const t = await page.evaluate(() => window.__os.toast?.act ?? null); if ((v && v.rung === 'message' && !v.hidden) || t === 'message-open') break; await wait(500); }
    r.toast = await page.evaluate(() => window.__os.toast ? { text: window.__os.toast.text, act: window.__os.toast.act ?? null } : null); r.lamby = await lg(page);
    await shot(page, '03-13', mode, JSON.stringify(r));
    r.errors = errors; await page.close(); return r;
  },
  /** 03-14, 03-15, 03-16: the Messenger loading, what is in it, the reply after a chip and after Go on */
  async caleb(mode) {
    const { page, errors } = await boot('era=2', mode);
    const r = {};
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.dirty = true; }); await wait(800);
    await page.evaluate(() => window.__os.debugJump('calebChat')); await wait(1500);
    await shot(page, '03-14', mode, 'the Messenger loading');
    await wait(4500);
    r.open = await page.evaluate(() => window.__os.caleb.msgs.map((m) => (m.flagged ? `[${m.flagged}] ` : '') + m.from + ': ' + m.text));
    await shot(page, '03-15', mode, `${r.open.length} messages at open`);
    const chip = async (want) => { for (let i = 0; i < 40; i++) { const have = await ids(page); const id = want.find((w) => have.includes(w)); if (id) { await press(page, id); return id; } await wait(500); } return null; };
    r.c1 = await chip(['chip:its-me']); await wait(1200);
    await shot(page, '03-16_typing', mode, 'after a reply: he types');
    r.c2 = await chip(['chip:never-saw', 'chip:every-word']); await wait(1500);
    r.c3 = await chip(['chip:every-word']); await wait(500);
    for (let i = 0; i < 40; i++) { if ((await ids(page)).includes('song-go')) break; await wait(500); }
    r.go = await press(page, 'song-go'); await wait(1200);
    await shot(page, '03-16_go-on', mode, 'Go on, said');
    await wait(5000);
    r.after = await page.evaluate(() => window.__os.caleb.msgs.slice(-4).map((m) => m.from + ': ' + m.text));
    r.errors = errors; await page.close(); return r;
  },
  /** 03-17: the hold before "I caught it in time" */
  async alert(mode) {
    const { page, errors } = await boot('era=2', mode);
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.dirty = true; }); await wait(800);
    await page.evaluate(() => { window.__os.debugJump('calebAlert'); }); await wait(1500);
    await page.evaluate(() => { const a = window.__os.accountability; a.step = 'system'; a.stepT = 0; a.nextPressed = true; a.dirty = true; });
    const t0 = Date.now(); let sadAt = null, caughtAt = null;
    for (let i = 0; i < 100; i++) {
      const st = await page.evaluate(() => window.__os.accountability?.step);
      if (st === 'sad' && sadAt === null) { sadAt = Date.now() - t0; await wait(700); await shot(page, '03-17', mode, 'the hold'); }
      if (st === 'caught') { caughtAt = Date.now() - t0; break; }
      await wait(200);
    }
    const r = { sadAt, caughtAt, holdMs: sadAt !== null && caughtAt !== null ? caughtAt - sadAt : null };
    console.log('  03-17', JSON.stringify(r));
    r.errors = errors; await page.close(); return r;
  },
  /** 03-18: the film's vertical bob, sampled across a minute of the tape */
  async netvision(mode) {
    const { page, errors } = await boot('era=2', mode);
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.debugJump('netvision'); }); await wait(2000);
    const r = await page.evaluate(() => { const n = window.__os.netvision; const keep = n.elapsed; const out = [];
      for (let t = 10; t < 70; t += 0.5) { n.elapsed = t; out.push(n.frameBob()); } n.elapsed = keep; return { distinct: [...new Set(out)], changes: out.filter((v, i) => i && v !== out[i - 1]).length }; });
    await shot(page, '03-18', mode, `the bob over 60 s of tape: ${JSON.stringify(r)}`);
    r.errors = errors; await page.close(); return r;
  },
  /** 03-19: Remind me later on the 2003 update */
  async remind(mode) {
    const { page, errors } = await boot('era=2', mode);
    await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.dirty = true; }); await wait(800);
    await page.evaluate(() => window.__os.debugJump('update3'));
    for (let i = 0; i < 30; i++) { if (await page.evaluate(() => (window.__os.updateApp?.hits ?? []).some((h) => h.id === 'remind-later'))) break; await wait(500); }
    const r = { pressed: await press(page, 'remind-later') };
    await wait(3000);
    r.lamby = await lg(page); r.deferred = await page.evaluate(() => window.__os.updateApp?.deferred);
    await shot(page, '03-19', mode, JSON.stringify(r));
    r.errors = errors; await page.close(); return r;
  },
  /** 03-20: the phone game's opening card, and the board in play (the ray's tag in the headset) */
  async phone(mode) {
    const { page, errors } = await boot('era=2', mode);
    await page.evaluate(async () => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.dirty = true;
      const L = (await import('/src/state/ledger.ts')).ledger; if (!L.checkins.length) L.checkins.push({ id: 'steady', witness: 'check-in: steady' }); });
    await wait(1500);
    // the device is held where a press puts it: before the camera, or in a headset before the LOGICAL head (the room is
    //   drawn shifted by the comfort layer; app.ts logicalHead does the same)
    await page.evaluate(() => {
      const app = window.__app, cam = app.root.findByName('camera'), c = window.__xrComfort;
      let head = cam;
      if (app.xr.active && c?.logicalRay) {
        const p = cam.getPosition(), ray = c.logicalRay({ p0: p, p1: p.clone().add(cam.forward) }), up = c.logicalRay({ p0: p, p1: p.clone().add(cam.up) });
        head = new cam.constructor('probe-logical-head'); head.setPosition(ray.p0); head.lookAt(ray.p1, up.p1.sub(up.p0).normalize());
      }
      window.__heldDevices.take('e2', head);
    }); await wait(2500);
    await shot(page, '03-20_card', mode, 'the opening card in the hand');
    await page.evaluate(() => window.__heldDevices.key('a', 'e2')); await wait(400);
    const second = await page.evaluate(() => window.__heldDevices.held('e2'));
    // headset: the controller's ray onto the held glass (where the tag "your phone — the screen" used to hang over the board)
    if (mode === 'xr') await page.evaluate(() => {
      const face = window.__heldDevices.faceWorld('e2'); const c = window.__xrComfort, src = window.__controller;
      if (!face || !src) return;
      const g = face[0], mid = g[0].clone().add(g[1]).add(g[2]).add(g[3]).mulScalar(0.25), at = c?.physicalPoint ? c.physicalPoint(mid) : mid;
      src.getDirection = () => at.clone().sub(src.getOrigin()).normalize();
    });
    await wait(2500);
    await shot(page, '03-20_play', mode, `after one press (held: ${second})`);
    const r = { held: second };
    r.errors = errors; await page.close(); return r;
  },
  /** 03-11, 03-12: the women's-group task's Go there; the second summons */
  async send(mode) {
    const { page, errors } = await boot('era=2', mode);
    const r = {};
    // the day's check-in on file, so the forced check-in never takes the press meant for the task's icon
    await page.evaluate(async () => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false;
      const L = (await import('/src/state/ledger.ts')).ledger; if (!L.checkins.length) L.checkins.push({ id: 'steady', witness: 'check-in: steady' }); os.dirty = true; }); await wait(800);
    await page.evaluate(() => window.__os.debugJump('send-s1')); await wait(1500);
    r.icon = await press(page, 'icon-send'); await wait(1200);
    await shot(page, '03-11_task', mode, 'the task');
    r.go = await press(page, 'send-go'); await wait(1500);
    r.brochure = await page.evaluate(() => !!window.__os.womensTrack?.open);
    await shot(page, '03-11', mode, `Go there: brochure ${r.brochure}`);
    await page.evaluate(() => { const os = window.__os; os.womensTrack = null; os.dirty = true; });
    await page.evaluate(() => window.__os.debugJump('send-s2')); await wait(1500);
    r.s2 = await page.evaluate(() => window.__os.sendOffer?.id ?? null);
    r.s2icon = await press(page, 'icon-send'); await wait(1200);
    await shot(page, '03-12', mode, `the second summons: ${r.s2}`);
    r.errors = errors; await page.close(); return r;
  },
  /** 97-17: rising out of 1997 while the installer types */
  async rise(mode) {
    const { page, errors } = await boot('reveal=1', mode, true);
    const r = {};
    await page.evaluate(() => window.__os.debugJump('update2')); await wait(1500);
    await page.evaluate(() => { const u = window.__os.updateApp; u.phase = 'eula'; u.page = u.s.eula.length - 1; u.dirty = true; window.__os.dirty = true; }); await wait(800);
    r.agree = await press(page, 'eula-agree');
    for (const [s, name] of [[4, 'rise4s'], [10, 'rise10s'], [17, 'rise17s']]) {
      await wait((s - (name === 'rise4s' ? 0 : name === 'rise10s' ? 4 : 10)) * 1000);
      r[name] = await page.evaluate(() => ({ phase: window.__os.updateApp?.phase ?? null, panel: window.__risingInstaller?.visible ?? null }));
      await shot(page, `97-17_${name}`, mode, JSON.stringify(r[name]));
    }
    r.errors = errors; await page.close(); return r;
  }
};

for (const mode of MODE === 'both' ? ['desktop', 'xr'] : [MODE]) {
  for (const [name, fn] of Object.entries(SCENES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    console.log(`${LABEL} ${mode} ${name}`);
    try { report.scenes[`${mode}:${name}`] = await fn(mode); }
    catch (e) { report.scenes[`${mode}:${name}`] = { failed: String(e).slice(0, 300) }; console.log('  FAILED', String(e).slice(0, 200)); }
  }
}
fs.writeFileSync(path.join(OUT, `${LABEL}-${MODE}-report.json`), JSON.stringify(report, null, 1));
await browser.close();
