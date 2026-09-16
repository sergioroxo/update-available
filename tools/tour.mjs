#!/usr/bin/env node
/**
 * TOUR ERAS 1–3 — play an era through the player's own surfaces, headless,
 * and photograph every beat. The Era 4 tour is `tour-e4.mjs`; this is the
 * same instrument for the three eras before it.
 *
 *     node tools/tour.mjs --era 1 --port 3000 --out out/tour-e1
 *     node tools/tour.mjs --era 2 ...      node tools/tour.mjs --era 3 ...
 *
 * ⚑ 2026-09-16 (S145). Sérgio reviews from frames: "produce me images that
 * show the flow". The walk proves the path is pressable; this shows what it
 * LOOKS like. Every press goes through the surfaces a player presses —
 * `__os.handleClick` on the OS canvas's own published rects, the workstation's
 * `handleClick` and the phone's `handlePhoneClick` on theirs — found by id and
 * pressed WHEN THEY APPEAR (a poll, not a fixed wait), so a beat that arrives
 * on its own clock (Lume's welcome, the DM, the packet, the diary, the update
 * notice) is photographed when it lands, not when a stopwatch guessed.
 *
 * Era 1 is entered the ordinary way (Log in → the descent); the one shortcut
 * is the tower's power button, which is a click in the room and is taken as
 * `os.powerOn()` and said so in the log. Eras 2 and 3 start from the review
 * jump (`?era=N&descent=0`), as the comfort tool does. Camera: the seat's own
 * frame for every beat, plus `look-` frames from `__camFree` — the reviewer's
 * eye, not the player's.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ERA = Number(flag('era', 1));
const PORT = Number(flag('port', 3000));
const OUT = path.resolve(flag('out', `out/tour-e${ERA}`));
const VIEWPORT = { width: 1280, height: 860 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveChrome() {
  const explicit = flag('chrome') ?? process.env.CHROME ?? process.env.CHROME_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const candidates = process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ] : ['/usr/bin/google-chrome', '/usr/bin/chromium'];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** in-page: every {x,y,w,h,id} array reachable from a root — the walker's own
 *  discovery, so the tour never keeps a hand-written list of sub-apps */
const FIND = `(function (root, maxDepth) {
  const RECTS_KEY = /(^|[a-z])(hits?|rects?)$/i;
  const looks = (v) => Array.isArray(v) && v.length > 0 && v.every((r) => r && typeof r === 'object'
    && typeof r.x === 'number' && typeof r.y === 'number' && typeof r.w === 'number' && typeof r.h === 'number' && typeof r.id === 'string');
  const found = []; const seen = new Set();
  const visit = (obj, depth, p) => {
    if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
    seen.add(obj); if (seen.size > 400) return;
    if (p && (obj.open === false || obj.visible === false)) return;
    for (const k of Object.keys(obj)) {
      let v; try { v = obj[k]; } catch { continue; }
      if (RECTS_KEY.test(k) && looks(v)) found.push({ path: p || 'os', rects: v });
      else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Element)) visit(v, depth + 1, p ? p + '.' + k : k);
    }
  };
  visit(root, 0, '');
  return found;
})`;

async function main() {
  const chrome = resolveChrome();
  if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: VIEWPORT
  });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push(t.slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  const query = ERA === 1 ? '?reinterp=1&debug=1' : `?reinterp=1&era=${ERA}&debug=1&descent=0`;
  await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__camFree && window.__poses, { timeout: 40000 });
  // the frame's chrome is hidden for the fiction's frames and shown for the frame's own
  const hideChrome = await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-game-menu):not(#reinterp-helper) { display: none !important; } #reinterp-menu-glyph { display: none !important; }' });
  void hideChrome;

  let n = 0;
  const log = [];
  const shot = async (name, note = '') => {
    n++;
    const file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await page.evaluate(() => {
      const os = window.__os; const q = window.__graceQueue ? window.__graceQueue() : null;
      const led = window.__ledger ? window.__ledger() : null;
      const count = led ? Object.values(led).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0) : -1;
      return { era: os.era, phase: os.phase, qMode: q ? q.mode : '-', pose: window.__camPose(), spine: window.__spine ? JSON.stringify(window.__spine()) : '-', led: count };
    });
    const line = `${file}  ${note}  · ${st.era}/${st.phase} · q ${st.qMode} · pitch ${st.pose.pitch.toFixed(0)} yaw ${st.pose.yaw.toFixed(0)} · spine ${st.spine} · ledger ${st.led}`;
    log.push(line); console.log(line);
  };
  const warn = (s) => { log.push(`  ⚠ ${s}`); console.log(`  ⚠ ${s}`); };
  /** THE MAP, photographed: open the menu, its first row, optionally an era's file; then resume */
  const mapShot = async (name, note = '', openEra = null) => {
    await page.evaluate(() => document.getElementById('reinterp-menu-glyph').click());
    await wait(400);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((x) => x.textContent.startsWith('Where you are')); if (b) b.click(); });
    await wait(400);
    if (openEra) await page.evaluate((era) => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((x) => x.textContent.startsWith(era)); if (b) b.click(); }, openEra);
    await wait(400);
    await shot(name, note);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((x) => x.textContent === 'Resume'); if (b) b.click(); });
    await wait(600);
  };
  /** THE HELPER, photographed: leave the piece alone for its idle time */
  const helperShot = async (name, note = '') => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('#reinterp-game-menu button')]; void b; });
    await wait(42000);
    await shot(name, note);
  };

  /** find a rect by id across the OS graph and the workstation's, press it
   *  through the surface that owns it, once it appears (polled) */
  const pressWhen = async (id, timeoutMs = 20000, opts = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const ok = await page.evaluate((a) => {
        const find = eval(a.FIND);
        const os = window.__os;
        const within = (grp) => grp.rects.find((r) => r.id === a.id);
        if (a.where !== 'workstation' && a.where !== 'phone') {
          for (const grp of find(os, 3)) {
            const r = within(grp);
            if (!r) continue;
            // the update ritual owns its own presses: from Era 3 the room routes the
            // workstation's clicks to `updateApp.handleClick` directly (era3Devices.ts),
            // and the OS's own router will not, so press it the way the room does
            if (grp.path === 'updateApp' && os.updateApp && typeof os.updateApp.handleClick === 'function') {
              os.updateApp.handleClick(r.x + r.w / 2, r.y + r.h / 2); return grp.path;
            }
            os.handleClick(r.x + r.w / 2, r.y + r.h / 2); return grp.path;
          }
        }
        const q = window.__graceQueue ? window.__graceQueue() : null;
        if (q && a.where !== 'os') {
          for (const grp of find(q, 3)) {
            const r = within(grp);
            if (!r) continue;
            const onPhone = grp.path === 'phone' || grp.path.indexOf('phone.') === 0;
            if (onPhone) q.handlePhoneClick(r.x + r.w / 2, r.y + r.h / 2); else q.handleClick(r.x + r.w / 2, r.y + r.h / 2);
            return 'workstation:' + grp.path;
          }
        }
        return null;
      }, { FIND, id, where: opts.where ?? null });
      if (ok) { console.log(`  press ${id} (${ok})`); await wait(opts.settle ?? 700); return true; }
      await wait(250);
    }
    warn(`${id} never appeared (${timeoutMs / 1000}s)`);
    return false;
  };
  /** press the same id as long as it keeps appearing (a list of corrections, a booklet's pages) */
  const pressAll = async (id, max, gapMs = 900, opts = {}) => {
    let k = 0;
    while (k < max && await pressWhen(id, opts.timeout ?? 4000, { ...opts, settle: gapMs })) k++;
    return k;
  };
  const ids = () => page.evaluate((a) => {
    const find = eval(a);
    const out = find(window.__os, 3).flatMap((g) => g.rects.map((r) => `${g.path}:${r.id}`));
    const q = window.__graceQueue ? window.__graceQueue() : null;
    if (q) out.push(...find(q, 3).flatMap((g) => g.rects.map((r) => `ws.${g.path}:${r.id}`)));
    return out;
  }, FIND);

  const cam = async (x, y, z, pitch, yaw) => { await page.evaluate((a) => window.__camFree(...a), [x, y, z, pitch, yaw]); await wait(700); };
  const seatOf = async (key) => page.evaluate((k) => window.__poses().seats[k], key);
  /** the reviewer's eye: the seat, moved `d` metres along its facing */
  const closer = (s, d, pitch = -4) => [s.x - Math.sin(s.yaw * Math.PI / 180) * d, s.y - 0.05, s.z - Math.cos(s.yaw * Math.PI / 180) * d, pitch, s.yaw];
  const atSeat = async (key) => { const s = await seatOf(key); await cam(s.x, s.y, s.z, s.pitch, s.yaw); };
  const lookClose = async (key, d = ERA === 3 ? 0.1 : 0.2) => { const s = await seatOf(key); await cam(...closer(s, d)); };   // the monitor already fills the seat frame; a step closer, not a lean
  const flip = async (key) => { const s = await seatOf(key); await cam(s.x, s.y, s.z, 0, s.yaw + 180); };

  const update = async (label) => {
    // the notice arrives on the apparatus's own clock; the three presses are the ritual.
    // An update that declares a CASCADE opens on a pile of error dialogs first — any press
    // on the pile (cascade-retry / cascade-cancel) lets the notice through.
    const t0 = Date.now(); let cascadeShot = false;
    while (Date.now() - t0 < 90000) {
      const have = await ids();
      if (have.some((x) => x.endsWith(':update-now'))) break;
      if (have.some((x) => /cascade-(retry|cancel)$/.test(x))) {
        if (!cascadeShot) { cascadeShot = true; await shot(`${label}-cascade`, 'the failure the update rides in on: the pile of errors'); }
        await pressWhen('cascade-retry', 2000, { settle: 1200 });
      } else await wait(500);
    }
    const noticeUp = (await ids()).some((x) => x.endsWith(':update-now'));
    if (noticeUp) await shot(`${label}-update-notice`, 'the update notice');
    if (noticeUp && await pressWhen('update-now', 5000)) { await wait(1500); await shot(`${label}-eula`, 'the terms'); }
    else {
      // say what the conductor was doing instead of guessing
      const why = await page.evaluate(() => {
        const os = window.__os; const u = os.updateApp;
        return { spine: window.__spine && window.__spine(), armed: os.updateArmed, inDesktop: os.inDesktop, sendPending: os.sendOfferPending,
          update: u ? { open: u.open, visible: u.visible, phase: u.phase, keys: Object.keys(u).filter((k) => Array.isArray(u[k])).map((k) => `${k}[${u[k].length}]`) } : null };
      });
      warn(`no update notice: ${JSON.stringify(why)}`);
    }
    // the terms SCROLL — 'read on' until the one live I Agree (SCRIPT_UPDATE v0.5 §1)
    if (await pressWhen('eula-readon', 30000)) { await pressAll('eula-readon', 8, 900); await wait(800); await shot(`${label}-eula-read`, 'the terms, read to the end — I Agree live'); }
    if (await pressWhen('eula-agree', 30000)) { await wait(2500); await shot(`${label}-install`, 'I Agree — the changelog, the install'); await wait(12000); await shot(`${label}-leaving`, 'the room, leaving'); }
  };

  if (ERA === 1) {
    await wait(12000);   // the descent
    await shot('room', 'the room as you arrive — the machine dark');
    const off = await page.evaluate(() => window.__os.isOff);
    if (off) { await page.evaluate(() => window.__os.powerOn()); log.push('  (the tower\'s power button — a click in the room — taken as os.powerOn())'); }
    await wait(6000);
    await shot('boot', 'the boot');
    await pressWhen('picon:moon', 60000); await shot('profile-icons', 'the questionnaire: pick a picture');
    await pressWhen('pchip:music'); await pressWhen('pchip:diary'); await pressWhen('pchip:friend'); await pressWhen('pgoal:fit_in');   // three chips arm Continue
    await lookClose('r1'); await shot('look-profile-filled', 'the questionnaire, answered');
    await pressWhen('r-continue'); await wait(2500); await shot('look-recap', 'the recap — the profile read back');
    await pressWhen('r-enter'); await wait(2000);
    await shot('look-desktop', 'the 1997 desktop: A:, the guide\'s first line in the status well');
    await pressWhen('icon-a'); await wait(1500); await shot('look-kit', 'the Starter Kit');
    await pressAll('next', 6, 1600); await shot('look-kit-last', 'the last page / connecting');
    await wait(5000);
    await pressWhen('icon-irc', 15000); await wait(1500); await shot('look-irc', 'the channel, joined');
    await pressWhen('reply:0', 60000); await wait(2500); await shot('look-irc-spoke', 'his one line, the room answering');
    await mapShot('map-e1', 'THE MAP, from the menu: 1997 in progress, the other eras ahead');
    await mapShot('map-e1-file', "the era's file opened under its beats", '1997');
    await helperShot('helper-e1', 'THE HELPER: forty seconds of stillness, the current hint in frame chrome');
    await atSeat('r1'); await shot('seat-desk', 'the seat frame');
    await flip('r1'); await wait(1200); await shot('flip-wall', 'the turn: the wall behind you');
    await cam(-0.86, 1.43, 1.75, 0, 180); await shot('look-wall-record', 'the record, close (the panel sits at x −0.86, cluster.json witnessTerminal)');
    await atSeat('r1');
    await pressWhen('icon-provotype', 15000); await wait(1000); await lookClose('r1'); await shot('look-pillow', 'the exercise');
    await pressAll('primary', 3, 1200); await pressWhen('choice:0', 5000); await pressAll('primary', 6, 1200);
    await shot('look-pillow-end', 'the exercise, scored');
    await pressWhen('leave', 3000);
    await pressWhen('reply:0', 120000); await wait(1500); await shot('look-dm', 'the private message: the first reply');
    for (let i = 0; i < 5; i++) { if (!await pressWhen('reply:0', 60000)) break; }
    await shot('look-dm-end', 'the thread\'s end');
    await pressWhen('ok', 120000); await wait(800); await shot('look-packet', 'the placement packet, acknowledged');
    // the diary: one press writes the line; the system flags and erases it; each time it stops
    // ('resist') the player's press holds the truth — the second hold is the glitch
    await page.waitForFunction(() => window.__os.diary && window.__os.diary.open !== false, { timeout: 30000 }).catch(() => warn('the diary never opened'));
    await wait(1500); await shot('look-diary', 'DIARY.TXT arrives, and the note');
    await page.evaluate(() => window.__os.handleClick(300, 200)); await wait(4000); await shot('look-diary-written', 'the line, written');
    for (let i = 0; i < 2; i++) {
      const got = await page.waitForFunction(() => window.__os.diary && window.__os.diary.phase === 'resist', { timeout: 40000 }).then(() => true).catch(() => false);
      if (!got) { warn('the diary never asked for a hold'); break; }
      await shot(`look-diary-erasing-${i + 1}`, 'the system erasing the line — it waits for her hand');
      await page.evaluate(() => window.__os.handleClick(300, 200)); await wait(900);
    }
    await wait(3000); await shot('look-diary-glitch', 'the deletion fails — the person\'s glitch');
    await atSeat('r1');
    await update('e1');
  }

  if (ERA === 2) {
    await wait(4000);
    await atSeat('r1'); await shot('room', 'Room 1 in 2003 — the machine waiting dark (the silence)');
    // THE RETURN PRESS: any press on the dark glass advances the silence; then the splash
    // (not skippable, ~half a minute) and the OS boot, on their own clocks
    await page.evaluate(() => window.__os.handleClick(200, 150)); await wait(6000);
    await lookClose('r1'); await shot('look-splash', 'the 2003 splash — it holds you');
    await wait(20000); await shot('look-boot', 'the OS boot');
    // the assistant's greeting is the arrival's own beat (S2R.1) and does not play from the
    // review jump — the walk covers it; here it is taken if it comes
    if (await pressWhen('lamby-hello', 15000)) { await wait(1500); await shot('look-lamby-hello', 'the assistant introduces itself'); }
    if (await pressWhen('lamby-begin', 8000)) { await wait(1500); await shot('look-lamby-begun', 'the assistant, begun'); }
    else await shot('look-desktop', 'the 2003 desktop: Restorify, Session, Care Log, Family Form — and the Route sheet, a summons');
    await pressWhen('icon-restorify', 20000); await wait(1200); await shot('look-checkin', 'the daily check-in');
    await pressWhen('checkin:steady', 10000); await pressWhen('checkin-continue', 10000); await wait(1000); await shot('look-checkin-done', 'answered');
    await pressWhen('message-open', 90000); await wait(2500); await shot('look-message', 'a message from outside — opened');
    for (const chip of ['chip:its-me', 'chip:every-word', 'chip:saturday', 'chip:want-you-too']) {
      if (await pressWhen(chip, 60000)) { await wait(2500); await shot(`look-${chip.replace(':', '-')}`, `the thread: ${chip.slice(5)}`); }
    }
    await pressWhen('alert-dismiss', 90000); await wait(1200); await shot('look-alert', 'the accountability alert');
    await pressWhen('mail-open', 60000); await wait(2000); await shot('look-mail', 'the mail');
    await pressWhen('mail-continue', 60000); await wait(2500); await shot('look-restored', 'restored');
    await pressWhen('residue', 120000); await wait(2500); await shot('look-residue', 'what is left');
    await mapShot('map-e2', 'THE MAP at the end of 2003');
    await atSeat('r1'); await shot('seat-after', 'the seat frame after');
    await update('e2');
  }

  if (ERA === 3) {
    await wait(4000);
    await atSeat('r2'); await shot('room', 'Room 2, 2016 — the workstation');
    // (the migration card — E2's last provotype surface — is behind the review jump; the walk covers it)
    await lookClose('r2');
    await pressWhen('signin', 60000); await wait(1500); await shot('look-signin', 'signed in');
    await pressWhen('consent-allow', 30000); await wait(1500); await shot('look-board', 'the board — and the record chip in the taskbar');
    await pressWhen('task-0', 10000); await wait(1200); await shot('look-task', 'a job open');
    await pressAll('apply', 4, 900); await shot('look-applied', 'four corrections applied — the chip counting');
    await pressWhen('record-chip', 10000); await wait(1200); await shot('look-record', 'Your record, from the chip: today\'s rows, then the imported history');
    await pressWhen('board-back', 10000); await wait(800); await shot('look-back-to-job', 'Back — to the job she had open');
    await mapShot('map-e3', 'THE MAP at 2016: two eras done, 2016 in progress');
    await mapShot('map-e3-file', "2016's file opened", '2016');
    await pressAll('apply', 12, 700); await pressWhen('board-back', 10000); await wait(1000); await shot('look-board-after', 'the board, one tile greyed');
    const phone = (await ids()).filter((s) => s.startsWith('ws.phone'));
    if (phone.length) { await atSeat('r2'); await shot('seat-phone', `the phone has ${phone.length} control(s): ${phone.slice(0, 4).join(' ')}`); }
    for (const t of ['task-1', 'task-2']) { if (await pressWhen(t, 5000)) { await wait(1200); await shot(`look-${t}`, `job ${t}`); await pressWhen('board-back', 5000); } }
    await atSeat('r2');
    await update('e3');
  }

  fs.writeFileSync(path.join(OUT, 'TOUR.md'), `# Era ${ERA} tour · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}/ — ${n} frames, ${errors.length} page error(s)`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
