#!/usr/bin/env node
/**
 * TOUR ERA 4 — play the era end to end, headless, and photograph every beat.
 *
 *     node tools/tour-e4.mjs --port 3000 --out out/tour-e4
 *
 * ⚑ 2026-09-13. Sérgio: *"review the Era-4 and check for mistakes and produce
 * me images that show the flow."* The walk (`walk.mjs`) proves the path is
 * pressable; this shows what it LOOKS like — the boot, the search taken over,
 * the five steps, the Restoration tool, the headset, the session, Junie's
 * card, the Commons as a world with the TransJesus stream, the glitch, and the
 * whole Close. Every press goes through the same surfaces a player presses
 * (`__os.e4.pressBrowser` on the monitor's published rects, `__os.handleClick`
 * on the visor's), never through a jump — except the ball's categories, which
 * are 3½ minutes of no controls and are entered by `debugJumpTo('ball')` so the
 * stream can be photographed without the wait. Frames are numbered in order.
 *
 * Camera: the seat's own frame for every beat, plus a few `__camFree` looks
 * (closer to the monitor, around the hall) marked `look-` in the file name —
 * those are the reviewer's eye, not the player's.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve(flag('out', 'out/tour-e4'));
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

async function main() {
  const chrome = resolveChrome();
  if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: VIEWPORT
  });
  fs.rmSync(OUT, { recursive: true, force: true });   // a tour is a whole set; stale frames lie
  fs.mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 30000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });

  let n = 0;
  const log = [];
  const shot = async (name, note = '') => {
    n++;
    const file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await page.evaluate(() => {
      const e4 = window.__os.e4;
      return {
        stage: e4.stageNow, browser: e4.browser.phase, mode: e4.browser.programMode, step: e4.browser.step,
        ball: e4.ball.phase, world: !!(window.__commonsFigures), pose: window.__camPose(),
        upd: window.__os.updateApp ? window.__os.updateApp.phase : '-', spine: window.__spine ? JSON.stringify(window.__spine()).slice(0, 60) : '-'
      };
    });
    const line = `${file}  ${note}  · stage ${st.stage} · browser ${st.browser}/${st.mode} · ball ${st.ball} · pitch ${st.pose.pitch.toFixed(0)} yaw ${st.pose.yaw.toFixed(0)} · upd ${st.upd} · spine ${st.spine}`;
    log.push(line); console.log(line);
  };
  const press = async (id) => {
    const ok = await page.evaluate((id) => {
      const b = window.__os.e4.browser;
      const h = (b.hits || []).find((r) => r.id === id);
      if (!h) return false;
      return window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2);
    }, id);
    console.log(`  press ${id} → ${ok}`);
    if (!ok) log.push(`  ⚠ ${id} not pressable here`);
    return ok;
  };
  const cam = async (x, y, z, pitch, yaw) => {
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [x, y, z, pitch, yaw]);
    await wait(700);
  };
  const SEAT = [4.4, 1.16, 0.7, 0, 270];
  const CLOSE = [4.82, 1.06, 0.7, -2, 270];   // the reviewer's eye, half a metre off the glass

  // ── 1 · the boot ── (a fresh shell, so the boot is photographed: the settled
  //   jump's own boot has run by the time the tour is ready)
  await cam(...SEAT);
  await page.evaluate(() => { window.__os.debugJump('e4Standby'); window.__os.e4.beginSession(0.3); });
  await wait(1100);
  await shot('boot-L', 'the session booting');
  await wait(2400);
  await shot('boot-restoring', 'restoring the session');
  await wait(3500);
  await shot('browser-open', 'the browser as she arrives at it');
  await cam(...CLOSE);
  await shot('look-browser-open', 'closer: the six tabs, the search half-typed');

  // ── 2 · the search, taken over ──
  await press('search-open');
  await wait(1500);
  await shot('look-search-typing', 'the sentence being finished for her');
  await wait(6000);
  await shot('look-agent', 'Second Thoughts');
  await press('agent-begin');
  await wait(1200);
  await shot('look-steps', 'the five steps');

  // ── 3 · the steps ──
  await press('step-record'); await wait(1200);
  await shot('look-record-done', 'the record, confirmed — and Continue (S150: no step advances on a clock)');
  await press('step-next'); await wait(1500);
  await shot('look-photos', 'the Restoration tool');
  await press('step-photos'); await wait(1000);
  await shot('look-photos-picker', 'the file window (a picture of one)');
  await press('file-0'); await wait(900);
  await shot('look-photos-folder', "inside Pride '24");
  await press('file-1'); await wait(1500);
  await shot('look-photos-restoring', 'restoring…');
  await wait(2600);
  await shot('look-photos-result', 'before / after — it stays until Continue');
  await press('step-next'); await wait(1500);
  await shot('look-care', 'care');
  await press('step-care'); await wait(2500);
  await press('step-next'); await wait(1500);
  await shot('look-chat', 'the chat');
  await press('step-chat'); await wait(2500);
  await press('step-next'); await wait(1500);
  await shot('look-search-step', 'the last step');
  await press('step-search'); await wait(3000);
  await cam(...SEAT);
  await shot('program-done', 'the headset asked for — the desk after the steps');

  // ── 4 · the headset ──
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1500);
  await shot('worn-session', 'the correction session on the glass');
  await wait(6500);
  await shot('worn-session-plan', 'the plan, arrived');
  await wait(5000);
  await shot('worn-session-grounding', 'item 1 running: grounding');
  await wait(8000);
  await shot('worn-session-recorded', 'item 2: the recorded voice');
  await wait(4500);
  await shot('worn-session-recorded-3', 'the third sentence, about to give its instruction');
  await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 30000 });
  await wait(600);
  await shot('worn-invite', "Junie's card — the link, on the dash");
  const joined = await page.evaluate(() => {
    const b = window.__os.e4.ball; const h = (b.hits || [])[0];
    if (!h) return false;
    window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2);
    return true;
  });
  console.log(`  press commons-join → ${joined}`);
  await wait(2000);
  await shot('struggle-1', 'the filter fighting the room: the link blocked');
  await wait(5000);
  await shot('struggle-2', 'the sender blocked, the room flashing through');
  await wait(5000);
  await shot('struggle-3', 'social contagion · high — the room mostly through');
  await wait(6000);
  await shot('world-arrival', 'the Commons: the seat, facing the stage');
  await cam(4.4, 1.16, 0.7, 0, 300);
  await shot('look-world-left', 'the hall to her left');
  await cam(4.4, 1.16, 0.7, 0, 240);
  await shot('look-world-right', 'the hall to her right');
  await cam(4.4, 1.16, 0.7, 0, 90);
  await shot('look-world-behind', 'behind her');
  await cam(...SEAT);

  // ── 5 · the ball, and the stream ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('ball'));
  await wait(3000);
  await shot('ball-category', 'a category on the floor, the stream on the wall');
  await cam(8.4, 1.6, 0.7, 4, 270);
  await shot('look-stream', 'the stream, from the crowd');
  await wait(2500);
  await shot('look-stream-2', 'the stream, a beat later');
  await cam(5.8, 1.16, -1.7, 0, 300);
  await shot('look-stage-from-crowd', 'the stage from the "in the crowd" marker');
  await cam(...SEAT);
  await wait(9000);
  await shot('ball-later', 'the ball, later');
  // the first intrusion is at 42 s of the ball; wait for it
  await wait(24000);
  await shot('ball-intrusion', 'the system back on the glass — reconnecting, pushed back');
  await wait(4500);
  await shot('ball-intrusion-refused', 'connection refused · room full');
  // the second intrusion (96 s) HOLDS until she stands in the crowd
  await wait(48000);
  await shot('ball-intrusion-2-holding', 'the second: holding — the hint on the glass');
  await page.evaluate(() => window.__requestMove('commons-crowd'));
  await wait(4200);
  await shot('ball-intrusion-2-hers', 'she is in the crowd: "47 present · you" — refused');
  await page.evaluate(() => window.__requestMove('commons-stage'));
  await wait(3000);

  // ── 6 · the termination, the glitch and the Close ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('after'));
  await wait(1500);
  await shot('terminated', 'SESSION TERMINATED · reason: social contagion');
  await wait(6000);
  await shot('glitch', 'the update fails');
  await wait(4000);
  await shot('device-stopped', 'the device stops; the room comes back');
  await wait(2500);
  await shot('laptop-failed', 'the laptop: Your update has failed.');
  await wait(1800);
  await shot('screens-glitching', 'the conducted look: both screens tearing');
  await wait(3000);
  await shot('screens-off', 'both screens off — the travel begins');
  await wait(8000);
  await shot('close-travel', 'travelling back to Daniel\'s room');
  await wait(16000);
  await shot('close-lookup', 'the eyes rising');
  await wait(18000);
  await shot('close-hold', 'night falls on the stars');
  await wait(14000);
  await shot('close-open', 'the sky opening');
  await wait(12000);
  await shot('close-panels', 'the panels');
  await wait(24000);
  await shot('close-monitor', 'Daniel\'s monitor');
  await wait(9000);
  await shot('close-restart', 'the Restart card, in frame');

  fs.writeFileSync(path.join(OUT, 'TOUR.md'), `# Era 4 tour · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}/ — ${n} frames, ${errors.length} page error(s)`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
