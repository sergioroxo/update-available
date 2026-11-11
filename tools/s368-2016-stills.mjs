/**
 * S368 (UiB job 16 Part A) — review photographs of 2016's Malta evening, played on the platform's OWN clock: the live
 * GraceQueueLite (window.__graceQueue()) is stepped with update(dt) through the beats F01–F06 and the workstation is drawn
 * into an offscreen canvas at each one (the room's own composite: the platform, then the update ritual at RITUAL_OFFSET).
 * Usage: node tools/s368-2016-stills.mjs <port> [outDir]      (default out/s368/2016)
 * Review-only: it sets up state the walk reaches by play (the kit closed, the record closed) and presses the platform's own
 * controls by id; it prints a timeline of what each surface showed, for the photo page.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 5281;
const OUT = process.argv[3] || 'out/s368/2016';
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0&era=3`, { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => window.__graceQueue?.());
  await new Promise(r => setTimeout(r, 4000));
  const res = await p.evaluate(async () => {
    const { veraDay } = await import('/src/state/veraDay.ts');
    Object.assign(veraDay, { distributed: true, recordOpened: true, recordClosed: true, kitClosed: true });
    const q = window.__graceQueue();
    const os = window.__os;
    const out = {}; const log = [];
    let T = 0;
    const W = 676, H = 390;
    const snap = (name) => {
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
      q.draw(x, W, H);
      const u = os?.updateApp;
      if (u?.open) { u.noticeCenterX = Math.round((W - 200 - 4) / 2) - 82; if (u.fullScreen) { x.fillStyle = u.ground; x.fillRect(0, 0, W, H); } x.save(); x.translate(82, 3); u.draw(x); x.restore(); }
      out[name] = c.toDataURL();
      log.push(`${T.toFixed(1).padStart(6)} s  ${name}  clock ${q.phone.eveningClock}  phone ${q.phone.debugState().screen}/${q.phone.debugState().stage}`);
    };
    const step = (secs, dt = 0.05) => { for (let t = 0; t < secs; t += dt) { q.update(dt); T += dt; } };
    const press = (id) => { const r = q.rects.find(rr => rr.id === id); if (!r) { log.push(`  (no rect ${id})`); return false; } q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return true; };
    // ── the board, the handset at its one width, the finished tiles ──
    q.lambyGuide = null; q.seenTask = true; q.wotdSaid = true; q.waitSaid = true;
    q.debugBeat('boardDone'); q.mode = 'board'; q.openSurface = null; q.veraPage = null;
    step(0.5); snap('01-board-handset-fixed');
    // ── F01/F11: the kit closes with "This week" up — Malta waits for it ──
    q.pauseLines = ['Your record — the chip at the bottom of the screen.', 'More jobs on the board, in any order.', 'Kindredraft — offered after a story is sent.', 'FloppySheep — on your phone.'];
    q.pauseOpen = true; q.pauseShown = true;
    q.maltaPending = true; q.maltaClearT = 0; q.maltaWaitT = 0; q.maltaArrived = true;
    step(4); snap('02-thisweek-malta-waits');
    log.push(`  mode ${q.mode} veraPage ${q.veraPage} pending ${q.maltaPending} rects ${q.rects.map(r => r.id).slice(0, 14).join(',')}`);
    if (!press('pause-close')) { q.pauseOpen = false; q.bump(); }
    step(0.2); snap('03-thisweek-closed');
    step(1.6); snap('04-malta-begins-clock-rolls');
    // let the news land at its own pace, photographing each message
    let seen = 0, guard = 0;
    while (q.phone.newsLanded < 5 && guard++ < 4000) {
      step(0.1);
      if (q.phone.newsLanded !== seen) { seen = q.phone.newsLanded; snap(`05-news-${seen}`); }
      if (q.maltaAlertT >= 0 && !out['06-priority-alert']) { snap('06-priority-alert'); step(3); snap('06b-priority-alert-held'); }
    }
    log.push(`  alert done ${q.maltaAlertDone}; news landed ${q.phone.newsLanded}`);
    step(2); snap('07-reply-offered');
    q.phone.pressControl('reply-bea'); step(0.5); snap('08-her-reply');
    // the takeover
    guard = 0; while (!q.phone.takeoverAlert && guard++ < 400) step(0.1);
    step(0.4); snap('09-takeover-alert-above-rows');
    step(4); snap('09b-takeover-alert-held');
    guard = 0; while (q.phone.takeoverAlert && guard++ < 400) step(0.1);
    step(3); snap('10-removing');
    guard = 0; while (!q.phone.broken && guard++ < 2000) step(0.1);
    snap('11-cascade-in-block');
    step(4); snap('12-block-settles-thread-readable');
    guard = 0; while (q.cascadeConduct && guard++ < 400) step(0.1);
    step(0.3); snap('13-phone-sleeps');
    step(1.0); snap('14-evening-passes-clock-rolling');
    guard = 0; while (!q.phone.delivered('after') && guard++ < 400) step(0.1);
    step(0.3); snap('15-orla-lock-notification');
    q.phone.pressControl('lock-card:Orla'); q.mirrorReading = true; step(0.3); snap('16-orla-thread-photo');
    step(9); q.mirrorReading = false; step(0.5);
    guard = 0; while (!q.afterSaid && guard++ < 600) step(0.1);
    step(0.3); snap('17-lambient-after-line');
    guard = 0; while (q.lambPriority && guard++ < 600) step(0.1);
    snap('18-lambient-gone');
    log.push(`  updateReady ${q.updateReady}`);
    // the update notice (the room arms it after FINAL_GAP = 6 s of clear): arm it here and photograph its place
    try { os.armUpdate('u4'); } catch (e) { log.push('  armUpdate failed ' + e.message); }
    step(0.2); snap('19-update-notice-clear-of-handset');
    return { out, log };
  });
  for (const [n, u] of Object.entries(res.out)) fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  fs.writeFileSync(`${OUT}/timeline.txt`, res.log.join('\n') + '\n');
  console.log(res.log.join('\n'));
} finally { await b.close(); }
