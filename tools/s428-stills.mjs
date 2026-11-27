#!/usr/bin/env node
/**
 * ⚑ S428 (UiB job 38, E4) — THE CHANGED SCREENS, PHOTOGRAPHED FROM THE SEAT, before and after.
 *
 *     node tools/s428-stills.mjs --port 5801 --mode desktop --out <dir>/after     # desktop | xr | phone
 *     node tools/s428-stills.mjs --port 5802 --mode desktop --out <dir>/before
 *
 * 2016 played by presses (tools/harness/e3-route.mjs: real mouse presses, the headset mock's controller ray and trigger, or a tap;
 * the fiction's own times run through the app's own update loop). The same presses on both builds; where a press is not there (the
 * build before job 38 has no notification to press) nothing is pressed and the frame shows what that build does at that moment.
 * Desktop and headset stills are 2560 × 1440 (1280 × 720 at 2×); the phone's are its own portrait (390 × 844 at 3×).
 * Names: NN_<what>_<mode>.png, the same in both builds. log.json: each still, its moment, draw calls (per scene), and the
 * workstation's repaints and texture uploads a second while the review runs with a job open.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = ['xr', 'phone'].includes(flag('mode', 'desktop')) ? flag('mode', 'desktop') : 'desktop';
const OUT = path.resolve(flag('out', `out/s428/stills-${PORT}`));
fs.mkdirSync(OUT, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: 2, width: 1280, height: 720 });
const log = { port: PORT, mode: MODE, stills: [], errors };
const say = (m) => console.log(m);
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await press(page, view, id, say); await ff(page, 0.3); return id; } return null; };
await page.evaluate(() => {
  const gl = window.__app.graphicsDevice.gl, R = window.__s428 = { uploads: 0 };
  for (const fn of ['texImage2D', 'texSubImage2D']) {
    const o = gl[fn].bind(gl);
    gl[fn] = (...a) => { const src = a[a.length - 1]; if (src && (src instanceof HTMLCanvasElement || src instanceof OffscreenCanvas || src instanceof ImageBitmap)) R.uploads++; return o(...a); };
  }
});
const shot = async (n, what) => {
  await wait(700);   // a few real frames: the screens drawn and uploaded
  const file = `${n}_${what}_${MODE}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  const s = await e3(page);
  const draws = await page.evaluate(() => window.__drawCalls ?? null);
  log.stills.push({ file, step: s?.chain ?? null, phone: s?.phone?.screen, stage: s?.phone?.stage, notice: s?.phone?.notice, page: s?.page, job: s?.job, draws });
  say(`still ${file} · step ${s?.chain ?? '-'} · draws ${draws}`);
};

// ── the clock: the board after Allow, the phone's lock screen beside it ──
await playTo(page, view, (s) => s.mode === 'board' && s.week, { log: say });
await tryPress('pause-close', 'week-begin');
if ((await e3(page)).job) await tryPress('board-back');
await shot('01', 'clock');
// ── Lesson 1, 2: Lambient's button on a job page (asked) ──
await playTo(page, view, (s) => s.job === 'places', { log: say });
await ff(page, 1);
if (await tryPress('lg-tray')) for (let i = 0; i < 15 && !(await e3(page)).guide.balloon; i++) await ff(page, 1);   // after any message's reading time
await shot('02', 'lambient-job-page');
await tryPress('lg-ok', 'lg-x');
// ── row 3: Mam's message, a notification ──
await playTo(page, view, (s) => s.phone.delivered.includes('decision') && (s.mode === 'board' || s.mode === 'done'), { log: say });
await ff(page, 1);
await shot('03', 'notification-row3-mam');
// ── row 4–5: the card, the page ──
await playTo(page, view, (s) => s.page === 'record', { log: say });
await ff(page, 40);
// ── row 6: closing the page → the Notes notification ──
await tryPress('memory-close'); await ff(page, 0.5);
await shot('04', 'notification-row6-notes');
// the Start map's Now at this step, with Take me there, and the Leave row
if (await tryPress('start-menu')) { await ff(page, 0.2); await shot('05', 'start-now-take-leave'); await tryPress('start-menu'); }
// ── row 7: the Notes, her line typed ──
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 15);
await shot('06', 'notes-window');
// ── row 8: Nuala's message on the lock screen ──
await tryPress('mirror:back'); await ff(page, 4);
await shot('07', 'notification-row8-nuala');
// ── row 9: Bea's first line, the group's notification ──
await tryPress('mirror:lock-card:Nuala'); await ff(page, 12);
await shot('08', 'notification-row9-bea');
// ── rows 10–12: the news, the kit, Back to today → the review's notification ──
await tryPress('mirror:evening-banner', 'mirror:lock-notice');
await playTo(page, view, (s) => s.kitPopin || s.page === 'kit', { log: say });
await tryPress('kit-popin-open'); await ff(page, 1);
await tryPress('vera-kit-close'); await ff(page, 0.5);
await shot('09', 'notification-row12-review');
// ── the stall: the finished lesson at once, then the group: the review beside the open job ──
await tryPress('task-2'); await ff(page, 0.5);
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 12);
await shot('10', 'review-beside-job');
// repaints while the review runs with a job open: real frames, five seconds
log.repaints = await page.evaluate(async () => {
  const d = () => window.__era3Devices && window.__graceQueue ? (window.__app && window.__era3Draws ? window.__era3Draws() : null) : null;
  void d;
  const q = window.__graceQueue(), v0 = q.version, u0 = window.__s428.uploads, t0 = performance.now();
  let versions = 0, last = v0;
  await new Promise((res) => { const tick = () => { const v = q.version; if (v !== last) { versions++; last = v; } if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  const secs = (performance.now() - t0) / 1000;
  return { seconds: Math.round(secs * 10) / 10, workstationChangesPerSecond: Math.round(versions / secs * 10) / 10, canvasUploadsPerSecond: Math.round((window.__s428.uploads - u0) / secs * 10) / 10,
    stage: q.phone.stage, job: q.openSurface?.id ?? null };
});
say('repaints ' + JSON.stringify(log.repaints));
// ── Shut Down's refusal in this quiet moment ──
if (await tryPress('start-menu')) { await ff(page, 0.2); await tryPress('sm-shut'); await ff(page, 0.2); await shot('11', 'shutdown-refusal'); await tryPress('shut-ok'); }
// ── Leave… in the headset opens the headset menu (its Leave row) ──
if (MODE === 'xr' && await tryPress('start-menu')) {
  await ff(page, 0.2); await tryPress('sm-leave'); await wait(600);
  log.xrLeave = await page.evaluate(async () => (await import('/src/state/gameMenuBus.ts')).gameMenuBus.isOpen);
  await shot('12', 'leave-xr-menu');
  await page.evaluate(() => window.__xrFrame?.close());
}
// ── the end waiting in the group ──
await ff(page, 120);
await shot('13', 'end-in-group');
// ── closing the group → the update ──
await tryPress('mirror:back'); await ff(page, 3);
await shot('14', 'update');

fs.writeFileSync(path.join(OUT, `log_${MODE}.json`), JSON.stringify(log, null, 1));
say(`done: ${log.stills.length} stills · errors ${errors.length}`);
await browser.close();
