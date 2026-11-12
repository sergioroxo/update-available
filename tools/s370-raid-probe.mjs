#!/usr/bin/env node
/**
 * ⚑ S370 / C1 + C2 — THE RAID, ONE THING AT A TIME, AND THE PEOPLE'S CARD, PHOTOGRAPHED FROM THE SEAT.
 *
 *     node tools/s370-raid-probe.mjs --port 5292 [--out out/s370/raid] [--browser] [--help]
 *
 * UIB_JOB_16 Part C1 (his, 11 Nov: "the raid still doesn't make sense visually… Since the image can fly the panel can come
 * in front, and then the trans jesus etc.") and C2 ("is the message from the community supporting queer people seen in the
 * message before the close?"). Runs the real app (?reinterp=1&era=4&debug=1) with a MOCKED headset (as
 * tools/j15-07-side-probe.mjs: `app.xr.active` forced true, mono, one Quest-like eye ≈104° × 96°), from the desk seat, head
 * never turned, and photographs every step of the choreography as it plays in real time:
 *   the try-on (the picture flying in from his left, then in front), Junie's link (the picture flying back to his left),
 *   the raid (the host's screen glitching, the people's banner flying out of it to the front and filling with 41 people,
 *   the crowd walking in from the sides, TransJesus walking onto the stage and the hologram pushed off its pad, the host's
 *   panel failing in its own beat), the naming (the picture in front again, the handle dragged, "she's right here", back
 *   to the side), Show me, the night, SESSION TERMINATED and the people's card before the Close.
 * For each step: the ball's phase and clock, what is on in the middle of the view (the glass's voice, the picture's plane
 * with its bearing / distance / angular size, the banner's plane), and the draw calls (window.__drawCalls, ≤75).
 * `--browser` runs the same route without the mock (the browser look-mode at the seat). `--help` has Maya's "help" filed
 * first, so junie's answer rides the banner and heads the people's card.
 * Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5292));
const OUT = path.resolve(flag('out', 'out/s370/raid'));
const BROWSER = argv.includes('--browser');
const HELP = argv.includes('--help');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// the desk seat (app.ts seatPose(270)); yaw 270 faces +x (tools/j15-07-side-probe.mjs)
const SEAT = [4.6, 1.16, 0.70, 0];
const SEAT_YAW = 270;

async function main() {
  const puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: BROWSER ? { width: 1280, height: 720 } : { width: 1100, height: 960 } });
  const page = await browser.newPage();
  const errors = [], log = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  // the sounds that play (the arrival's bells, the card's two notes) — a wrapped Audio, as the S358 headless trick
  await page.evaluateOnNewDocument(() => {
    window.__played = [];
    const A = window.Audio;
    window.Audio = function (src) { const a = new A(src); const play = a.play.bind(a); a.play = () => { window.__played.push([String(src).split('/').pop(), performance.now()]); return play().catch(() => {}); }; return a; };
    window.Audio.prototype = A.prototype;
  });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 60000 });
  await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });
  await page.evaluate(() => window.__os.e4.browser.debugFinishProgram?.());
  await wait(1200);
  if (!BROWSER) {
    await page.evaluate(() => {
      const app = window.__app;
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      const head = app.root.findByName('camera');
      head.camera.fov = 96;
      window.__fovPin = setInterval(() => { head.camera.fov = 96; }, 16);
    });
  }
  await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [...SEAT, SEAT_YAW]);
  if (!BROWSER) {
    await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.setLocalPosition(0, 0.02, 0); h.setLocalEulerAngles(0, 0, 0); });
    await wait(1500);
  }
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1500);
  if (HELP) await page.evaluate(() => { window.__os.e4.ball.helpAsked = () => true; });

  const tag = BROWSER ? 'browser-' : 'xr-';
  const rows = [];
  /** what is up, from the seat: the ball's clock, the planes, the draw calls */
  const state = () => page.evaluate((seatYaw) => {
    const app = window.__app, b = window.__os.e4.ball, cam = app.root.findByName('camera');
    const plane = (name) => {
      const e = app.root.findByName(name);
      if (!e?.enabled) return null;
      const xc = window.__xrComfort, active = app.xr?.active;
      const p = active ? e.getLocalPosition() : e.getPosition();
      const camW = cam.getPosition();
      const h = active ? xc.logicalPoint(camW) : camW;
      const brg = Math.atan2(-(p.x - h.x), -(p.z - h.z)) * 180 / Math.PI;
      const off = ((brg - seatYaw + 540) % 360) - 180;
      const d = Math.hypot(p.x - h.x, p.z - h.z), sc = e.getLocalScale();
      return { bearing: +(-off).toFixed(1), dist: +d.toFixed(2), elev: +(Math.atan2(p.y - h.y, d) * 180 / Math.PI).toFixed(1),
        wideDeg: +(2 * Math.atan(sc.x / 2 / d) * 180 / Math.PI).toFixed(1), tallDeg: +(2 * Math.atan(sc.z / 2 / d) * 180 / Math.PI).toFixed(1) };
    };
    return {
      phase: b.phaseId, raidT: +(b.raidT ?? 0).toFixed(2), nameT: +(b.nameT ?? 0).toFixed(2), tryT: +(b.tryT ?? 0).toFixed(2),
      gatherT: +(b.gatherT ?? -1).toFixed(2), filter: +b.filterAmount.toFixed(2), count: b.viewerCount,
      card: plane('era3-device-sidecard'), banner: plane('era3-device-raidbanner'),
      hologramShift: (() => { const e = app.root.findByName('commons-host-figure'); if (!e?.enabled) return null; const q = e.getLocalPosition(); return [+q.x.toFixed(2), +q.z.toFixed(2)]; })(),
      draws: window.__drawCalls
    };
  }, SEAT_YAW);
  const shot = async (name, note) => {
    const file = `${tag}${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await state();
    rows.push({ file, note, ...st });
    // bearing: negative = left of the seat's line of sight (tools/j15-07-side-probe.mjs's convention)
    const where = (p) => p ? `${p.bearing < 0 ? -p.bearing + '° left' : p.bearing > 0 ? p.bearing + '° right' : 'ahead'}, ${p.dist} m, ${p.elev}° up, ${p.wideDeg}° × ${p.tallDeg}°` : '—';
    log.push(`| ${file} | ${note} | ${st.phase} | ${st.phase === 'raid' ? 'raid ' + st.raidT : st.phase === 'naming' ? 'name ' + st.nameT : st.phase === 'tryon' ? 'try ' + st.tryT : st.phase === 'after' ? 'card ' + st.gatherT : ''} | ${where(st.card)} | ${where(st.banner)} | ${st.filter} | ${st.draws} |`);
    console.log(file, st.phase, 'draws', st.draws, note);
  };
  const until = async (fn, arg, timeout = 90000) => page.waitForFunction(fn, { timeout, polling: 50 }, arg).catch(() => console.log('timeout waiting', fn.toString().slice(0, 90)));
  const clickHit = (prefix) => page.evaluate((p) => { const h = (window.__os.e4.ball.hits || []).find((x) => x.id.startsWith(p)); if (h) window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return !!h; }, prefix);

  // ── 1 · the try-on ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('tryon'));
  await until(() => window.__os.e4.ball.tryT >= 0.9);
  await shot('01-tryon-flying-in', 'the picture flies in from his left (try-on, 0.9 s)');
  await until(() => window.__os.e4.ball.tryT >= 12);
  await shot('02-tryon-front', 'the morph, in front of him (jaw)');
  await until(() => window.__os.e4.ball.tryT >= 29.6);
  await shot('03-tryon-gloss', '"You, restored. It already fits." — the gloss, in front');
  // ── 2 · the way in ──
  await until(() => window.__os.e4.ball.phaseId === 'invited' && window.__os.e4.ball.inviteT >= 0.55);
  await shot('04-link-picture-leaving', "Junie's link breaks in: the picture flies to his left, the link fades in");
  await until(() => window.__os.e4.ball.inviteT >= 2.2);
  await shot('05-link', "Junie's link in front; the picture small at his left");
  await clickHit('commons-join');
  // ── 3 · the raid ──
  await until(() => window.__os.e4.ball.raidT >= 0.35);
  await shot('06-raid-glitch', "her press: the host's screen glitches");
  await until(() => window.__os.e4.ball.raidT >= 1.3);
  await shot('07-raid-banner-flying', "the people's banner lifts off the host's screen and flies to him");
  await until(() => window.__os.e4.ball.raidT >= 4.6);
  await shot('08-raid-banner', 'the banner in front: "transjesus.str is raiding · 41 here", 41 people filling it');
  await until(() => window.__os.e4.ball.raidT >= 7.1);
  await shot('09-raid-banner-back', 'the banner goes back into the screen; the crowd sets off from the sides');
  await until(() => window.__os.e4.ball.raidPlan && window.__os.e4.ball.raidT >= window.__os.e4.ball.raidPlan.arrive + 2.6);
  await shot('10-raid-arriving', 'the people walk in from both sides (bells)');
  await until(() => window.__os.e4.ball.raidT >= window.__os.e4.ball.raidPlan.tj + 1.5);
  await shot('11-raid-tj-walking', 'TransJesus walks onto the stage, across the middle');
  await until(() => window.__os.e4.ball.raidT >= window.__os.e4.ball.raidPlan.tjLand + 0.5);
  await shot('12-raid-tj-landed', "TransJesus beside the host's screen; the hologram pushed off its pad");
  await until(() => window.__os.e4.ball.raidT >= window.__os.e4.ball.raidPlan.panel + 5.0);
  await shot('13-raid-panel', "only now the host's panel tries to file it, and fails");
  // ── 4/5 · the naming ──
  await until(() => window.__os.e4.ball.phaseId === 'naming' && window.__os.e4.ball.nameClock >= 0.8);
  await shot('14-naming-flying', 'the naming: the picture comes to the front again');
  await until(() => window.__os.e4.ball.nameT >= 4.2 * 0 + 2.4);
  await shot('15-naming-first-tag', "the host's line, okra's tag, the handle moving with her name");
  // her two presses (or their 12 s defaults), photographed once
  let pressed = 0;
  for (let i = 0; i < 400 && pressed < 2; i++) {
    await wait(150);
    const st = await page.evaluate(() => ({ p: window.__os.e4.ball.phaseId, hits: (window.__os.e4.ball.hits || []).map((h) => h.id) }));
    if (st.p !== 'naming') break;
    if (st.hits.some((h) => h.startsWith('naming-press-'))) {
      if (pressed === 0) await shot('16-naming-press', 'her press, on the glass (Say hi)');
      await clickHit('naming-press-'); pressed++;
    }
  }
  await until(() => window.__os.e4.ball.nameT >= 6 * 4.2 + 2.6);
  await shot('17-naming-hers', '"she\'s right here": the handle lands on her own photograph, in front');
  await until(() => window.__os.e4.ball.nameT >= 7 * 4.2 + 1.7 || window.__os.e4.ball.phaseId !== 'naming');
  await shot('18-naming-back', 'the picture goes back to his left');
  await until(() => window.__os.e4.ball.phaseId === 'turnAsk');
  await wait(500);
  await shot('19-show-me', 'junie: "maya. look what\'s behind the stage" — Show me');
  await clickHit('backstage-show');
  await until(() => window.__os.e4.ball.phaseId === 'stream', null, 60000);
  await wait(3000);
  await shot('20-night', 'the night: the stage is theirs, TransJesus dancing beside the screen');
  // ── C2 · the people's card before the Close ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('after'));
  await until(() => window.__os.e4.ball.afterT >= 2.5);
  await shot('21-terminated', 'SESSION TERMINATED (the system, on its own surface)');
  await until(() => window.__os.e4.ball.gathering && window.__os.e4.ball.gatherT >= 1.6);
  await shot('22-people-gathering', "the termination steps back; the people's lines gather");
  await until(() => window.__os.e4.ball.gathering && window.__os.e4.ball.gatherT >= 4.5);
  await shot('23-people-card', "the people's card, held to be read before the Close");
  const hold = await page.evaluate(() => window.__os.e4.ball.gatherSeconds);
  await until(() => window.__os.e4.ball.phaseId === 'done' || window.__os.e4.shell?.stage === 'glitch', null, 40000);
  const played = await page.evaluate(() => window.__played.map((p) => p[0]));
  log.push('', `people's card holds ${hold.toFixed(1)} s from its start (reading rule, counted from its last line), then the update fails`);
  log.push(`sounds heard: ${[...new Set(played)].filter((n) => /lamps_rise|card_junie|filter_deny|ball_room|terminate|ui_press/.test(n)).join(', ')}`);

  const peak = Math.max(...rows.map((r) => r.draws || 0));
  fs.writeFileSync(path.join(OUT, `REPORT-${BROWSER ? 'browser' : 'xr'}${HELP ? '-help' : ''}.md`), [
    'STATUS: generated', '',
    `# S370 raid probe (${BROWSER ? 'browser look-mode, 1280×720' : 'mocked headset, mono, one Quest eye ≈104° × 96° at 1100×960'})${HELP ? ' · with her "help"' : ''} · ${new Date().toISOString()}`, '',
    'Head never turned: every photograph is from the desk seat looking along its line of sight. "card" = the picture\'s plane (headset only), "banner" = the people\'s banner; bearings are off the seat\'s line of sight.', '',
    '| photo | step | phase | clock | card | banner | filter | draws |', '|---|---|---|---|---|---|---|---|',
    ...log, '', `draw-call peak over these steps: ${peak} (budget 75)`, '', '## page errors', errors.join('\n') || 'none', ''
  ].join('\n'));
  console.log('peak draws', peak, 'errors', errors.length ? errors : 'none');
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
