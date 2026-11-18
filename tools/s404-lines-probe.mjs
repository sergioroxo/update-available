#!/usr/bin/env node
/**
 * ⚑ S404 (UiB job 30 C2 / C4) — THE TWO NEW LINES WHERE THEY ARE MET, and 1997's tray: stills from the seat and the canvases.
 *
 *     node tools/s404-lines-probe.mjs --port 5431 [--out <dir>] [--modes computer,headset] [--which vera,maya,tray]
 *
 * Review-only shortcuts (the visitor's path is proved by tools/walk.mjs's `watched` lines): each era is opened with
 * `?era=` and the moment is set up directly, then left to run on the piece's own clock.
 *   · vera — 2016: the testimony marked done in the ledger (the dev server's own module), Mam's message's Notes conducted
 *     (`phone.conductNotes()`): Mam's unfinished reply types itself, then the new note opens above it and is written.
 *     Stills: Mam's reply typing, the new note typing, the new note written; the workstation canvas at each; whether
 *     anything else spoke (Lambient's lines, the guide) while the Notes were up; what 2016's file holds after.
 *   · maya — 2026: the browser settled at Second Thoughts and the `heading` beat started: "You, restored. 2027.", her
 *     line typed into her box, marked not sent, then "Show me how" under it; pressed, and the next beat with the line
 *     still in her box. Stills of the monitor's canvas and the seat at each; what Memory holds after.
 *   · tray — 1997: the taskbar's file with "Your file", and the desktop's left column (lamby_rig.exe's label).
 * Headset: the seated mock of tools/s398-light-stills.mjs (xr.active forced, the head at the rig, 90° view), then a
 * narrower lens toward the screen (as tools/s403-2016-stills.mjs's `-close`).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s404-lines'));
const MODES = flag('modes', 'computer,headset').split(',');
const WHICH = flag('which', 'vera,maya,tray').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 2 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };
const report = [];
const log = (s) => { report.push(s); console.log(s); };

async function open(mode, q) {
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${q}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  return { page, errors };
}
async function headsetMock(page) {
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  });
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}
/** the seat's still, then a narrower look at `entityName` (the screen) — computer: a step closer; headset: a 34° lens */
async function seatAndClose(page, mode, name, entityName) {
  await page.screenshot({ path: path.join(OUT, `${mode}-${name}.png`) });
  if (!entityName) return;
  if (mode === 'computer') {
    const seat = await page.evaluate(() => window.__camPose?.());
    const ok = await page.evaluate((n, s) => {
      const a = window.__app, c = a.root.findByName('camera'), e = a.root.findByName(n);
      if (!e || !window.__camFree) return false;
      const p = c.getPosition(), t = e.getPosition();
      const k = 0.45, x = p.x + (t.x - p.x) * k, y = p.y + (t.y - p.y) * k, z = p.z + (t.z - p.z) * k;
      window.__camFree(x, y, z, s.pitch + (s.lookPitch || 0), s.yaw + (s.lookYaw || 0));
      return true;
    }, entityName, seat);
    if (ok) {
      await wait(700);
      await page.screenshot({ path: path.join(OUT, `${mode}-${name}-close.png`) });
      await page.evaluate((s) => window.__camFree(s.x ?? s.pos?.[0], s.y ?? s.pos?.[1], s.z ?? s.pos?.[2], s.pitch, s.yaw), seat).catch(() => {});
      await wait(400);
    }
  } else {
    const ok = await page.evaluate((n) => {
      const a = window.__app, h = a.root.findByName('camera'), e = a.root.findByName(n);
      if (!e) return false;
      window.__lean = { fov: h.camera.fov, rot: h.getLocalRotation().clone() };
      const c = window.__xrComfort; h.lookAt(c?.physicalPoint ? c.physicalPoint(e.getPosition().clone()) : e.getPosition()); h.camera.fov = 34;
      return true;
    }, entityName);
    if (ok) {
      await wait(700);
      await page.screenshot({ path: path.join(OUT, `${mode}-${name}-close.png`) });
      await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.camera.fov = window.__lean.fov; h.setLocalRotation(window.__lean.rot); });
      await wait(300);
    }
  }
}
const until = async (page, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return (Date.now() - t0) / 1000; await wait(150); } return -1; };

// ── 2016: Vera's newest note ─────────────────────────────────────────────────────────────────────────────────────────
async function vera(mode) {
  const { page, errors } = await open(mode, 'era=3');
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__camPose, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(4500);
  if (mode === 'headset') await headsetMock(page);
  const before = await page.evaluate(async () => {
    const { ledger } = await import('/src/state/ledger.ts');
    const q = window.__graceQueue();
    q.debugBeat('board'); q.mode = 'board'; q.veraPage = null; q.openSurface = null;
    q.seenTask = true; q.wotdSaid = true; q.waitSaid = true;
    if (!ledger.records.includes('e3-job:testimony')) ledger.records.push('e3-job:testimony');   // review: the testimony done
    window.__s404ledger = ledger;
    q.phone.conductNotes();
    return { e3: ledger.era3Jobs.map((j) => j.id) };
  });
  const canvas = async (name) => {
    const data = await page.evaluate(() => {
      const q = window.__graceQueue(); const W = 676, H = 390;
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
      q.draw(x, W, H); return c.toDataURL();
    });
    fs.writeFileSync(path.join(OUT, `canvas-2016-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  };
  const spoke = [];
  const watchVoices = async () => spoke.push(await page.evaluate(() => {
    const q = window.__graceQueue();
    return { notes: q.phone.notesNow, lamb: q.lambLines ? q.lambLines.join(' / ') : null, guideBalloon: !!q.lambyGuidePaint?.balloon, quiet: q.personalQuiet, silent: q.guideSilent };
  }));
  await until(page, () => window.__graceQueue().phone.notesNow.writing === 'mam' , 5000);
  await wait(2600); await watchVoices();
  await seatAndClose(page, mode, '2016-1-mam-typing', 'era3-device-workstation'); if (mode === 'computer') await canvas('1-mam-typing');
  await until(page, () => window.__graceQueue().phone.notesNow.writing === 'refusal', 30000); await watchVoices();
  await wait(2200); await watchVoices();
  await seatAndClose(page, mode, '2016-2-new-note-typing', 'era3-device-workstation'); if (mode === 'computer') await canvas('2-new-note-typing');
  await until(page, () => window.__graceQueue().phone.notesNow.refusalWritten, 20000); await wait(900); await watchVoices();
  await seatAndClose(page, mode, '2016-3-new-note-written', 'era3-device-workstation'); if (mode === 'computer') await canvas('3-new-note-written');
  const back = await until(page, () => window.__graceQueue().phone.notesNow.writing === null, 20000);
  await wait(800);
  const after = await page.evaluate(() => {
    const L = window.__s404ledger, q = window.__graceQueue();
    return { e3: L.era3Jobs.map((j) => `${j.id}: ${j.witness}`), screen: q.phone.screen, notesNow: q.phone.notesNow };
  });
  // her Notes opened by hand afterwards: the new note is in the list, above Mam's
  await page.evaluate(() => { const p = window.__graceQueue().phone; p.screen = 'notes'; p.version++; });
  await wait(600);
  if (mode === 'computer') await canvas('4-notes-later');
  log(`vera ${mode}: before ${JSON.stringify(before)} · voices ${JSON.stringify(spoke)} · back after ${back}s · after ${JSON.stringify(after)} · errors ${JSON.stringify(errors)}`);
  await page.close();
}

// ── 2026: Maya's unsent line ─────────────────────────────────────────────────────────────────────────────────────────
async function maya(mode) {
  const { page, errors } = await open(mode, 'era=4');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree && window.__app, { timeout: 60000 });
  await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });
  await wait(4000);
  if (mode === 'headset') await headsetMock(page);
  await page.evaluate(() => {
    const b = window.__os.e4.browser;
    b.debugJumpTo('search'); b.go('bot'); b.startBot('heading');
  });
  const mon = async (name) => {
    const data = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1420; c.height = 768;
      const x = c.getContext('2d'); x.scale(2, 2);
      window.__os.e4.drawBrowser(x, 710, 384);
      return c.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(OUT, `canvas-2026-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  };
  const state = () => page.evaluate(() => {
    const b = window.__os.e4.browser;
    return { draft: b.draftNow, live: b.draftLive, silent: b.guideSilent, act: (b.hits || []).some((h) => h.id === 'conv-act'), now: b.nowLine ?? null, bot: b.bot?.id };
  });
  const screen = 'era3-device-monitor';
  const seen = [];
  await until(page, () => window.__os.e4.browser.draftNow.started, 30000);
  seen.push(await state());
  await wait(600);
  await seatAndClose(page, mode, '2026-1-restored', null); if (mode === 'computer') await mon('1-restored-typing-begins');
  await wait(1600); seen.push(await state());
  await seatAndClose(page, mode, '2026-2-her-line-typing', screen); if (mode === 'computer') await mon('2-her-line-typing');
  await until(page, () => window.__os.e4.browser.draftNow.written, 20000); await wait(400); seen.push(await state());
  await seatAndClose(page, mode, '2026-3-not-sent', screen); if (mode === 'computer') await mon('3-not-sent');
  await until(page, () => (window.__os.e4.browser.hits || []).some((h) => h.id === 'conv-act'), 20000); await wait(400); seen.push(await state());
  await seatAndClose(page, mode, '2026-4-show-me-how', screen); if (mode === 'computer') await mon('4-show-me-how-under-it');
  const pressed = await page.evaluate(() => {
    const b = window.__os.e4.browser, h = (b.hits || []).find((r) => r.id === 'conv-act');
    return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false;
  });
  await wait(5000); seen.push(await state());
  await seatAndClose(page, mode, '2026-5-conversation-goes-on', screen); if (mode === 'computer') await mon('5-conversation-goes-on');
  const mem = await page.evaluate(() => (window.__ledger?.().e4Space ?? []).filter((e) => /^(v3:residue|conv:heading|newyou)$/.test(e.id)).map((e) => `${e.id} (${e.outcome}): ${e.witness}`));
  log(`maya ${mode}: states ${JSON.stringify(seen)} · pressed ${pressed} · Memory ${JSON.stringify(mem)} · errors ${JSON.stringify(errors)}`);
  await page.close();
}

// ── 1997: the tray's words, and the desktop's left column ────────────────────────────────────────────────────────────
async function tray(mode) {
  if (mode !== 'computer') return;
  const { page, errors } = await open(mode, 'reveal=1');
  await page.waitForFunction(() => window.__app && window.__os && window.__poses, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  await page.evaluate(async () => {
    const L = (await import('/src/state/ledger.ts')).ledger;
    if (!L.reachedEras.includes('e1')) L.reachedEras.push('e1');
    window.__os.debugJump('desktop');
    for (const id of ['profile-initialized', 'kit-inserted', 'went-online']) if (!L.records.includes(id)) L.records.push(id);
  });
  await wait(2500);
  await page.evaluate(() => { const s = window.__poses().seats.r1; window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw); });
  await wait(1500);
  const shotCanvas = async (name) => {
    const info = await page.evaluate(() => {
      const os = window.__os;
      const hits = (os.hits || []).filter((h) => /file-tray|icon-lambyrig/.test(h.id)).map((h) => ({ id: h.id, x: h.x, y: h.y, w: h.w, h: h.h }));
      return { url: os.canvas.toDataURL(), hits, phase: os.phase, era: os.desktopEra, idle: os.e1DesktopIdle?.() };
    });
    fs.writeFileSync(path.join(OUT, `canvas-1997-${name}.png`), Buffer.from(info.url.split(',')[1], 'base64'));
    return info;
  };
  const first = await shotCanvas('1-desktop');
  await page.screenshot({ path: path.join(OUT, 'computer-1997-seat.png') });
  // a filing: the well lights (the words do not)
  await page.evaluate(async () => { const L = (await import('/src/state/ledger.ts')).ledger; L.records.push('channel-joined'); });
  await wait(300);
  const lit = await shotCanvas('2-filed-lit');
  const info = { first, lit: lit.hits };
  log(`tray: ${JSON.stringify({ hits: info.first.hits, lit: info.lit, phase: info.first.phase, era: info.first.era, idle: info.first.idle })} · errors ${JSON.stringify(errors)}`);
  await page.close();
}

try {
  for (const mode of MODES) {
    if (WHICH.includes('vera')) await vera(mode);
    if (WHICH.includes('maya')) await maya(mode);
    if (WHICH.includes('tray')) await tray(mode);
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'lines-probe.txt'), report.join('\n') + '\n');
  await browser.close();
}
