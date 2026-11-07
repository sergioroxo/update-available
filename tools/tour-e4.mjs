#!/usr/bin/env node
/**
 * TOUR ERA 4 — play the era end to end, headless, and photograph every beat.
 *
 *     node tools/tour-e4.mjs --port 3121 --host 127.0.0.1 --out out/tour-e4-v3
 *
 * ⚑ S321 (2026-11-07) — 2026 v3, "the pressure" (DESIGN_2026_V3_PRESSURE_2026-11-07.md): the house chat on her
 * birthday, the new you, Mum one year at a time, Dad, Mum's link and the news tabs, the clinic's number, Meridian,
 * Sam leaving, the search finished for her, Second Thoughts (her week, where she's heading, the map and the clip),
 * Junie unmuted, the original — then the headset, the stream and the update failing (as built). Every press goes
 * through a surface a player presses: the monitor's published rects (`__os.e4.pressBrowser`), the laptop's
 * (`__os.e4.laptopHits` → `__os.e4.pressLaptop`), the glass (`__os.handleClick`) — never a jump.
 *
 * ⚑ FRAMES ARE FROM THE SEAT: `seat-` frames face the monitor, `lid-` frames face the laptop the way the piece's own
 * conducted turn leaves the head (pitch −16°, yaw 246°). Legibility is judged from these, not from a reviewer's eye.
 * The draw calls in the stream's place and on Maya's desk are written into TOUR.md, with every beat the contract saw.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const HOST = flag('host', 'localhost');
const OUT = path.resolve(flag('out', 'out/tour-e4'));
const CUT = flag('cut', '');
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
  await page.goto(`http://${HOST}:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0${CUT ? '&cut=' + CUT : ''}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 30000 });
  await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });

  let n = 0;
  const log = [];
  const shot = async (name, note = '') => {
    n++;
    const file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await page.evaluate(() => {
      const e4 = window.__os.e4, b = e4.browser;
      return { stage: e4.stageNow, browser: b.phase, step: b.storyStep, ball: e4.ball.phase, dc: window.__drawCalls,
        pose: window.__camPose(), beats: (window.__ledger?.().e4Beats ?? []).join(",") };
    });
    const line = `${file}  ${note}  · stage ${st.stage} · browser ${st.browser}/${st.step} · ball ${st.ball} · draws ${st.dc} · yaw ${st.pose.yaw.toFixed(0)}`;
    log.push(line); console.log(line);
  };
  /** a press on the monitor's published rect */
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
  const hasHit = (id) => page.evaluate((id) => !!(window.__os.e4.browser.hits || []).find((r) => r.id === id), id);
  const hasLid = (id) => page.evaluate((id) => !!(window.__os.e4.laptopHits || []).find((r) => r.id === id), id);
  const pressWhen = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await hasHit(id)) return press(id); await wait(300); }
    log.push(`  ⚠ ${id} never appeared (${ms} ms)`); console.log(`  ⚠ ${id} never appeared`);
    return false;
  };
  /** a press on the laptop's published rect (Kettle) */
  const pressLid = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const ok = await page.evaluate((id) => {
        const e4 = window.__os.e4;
        const h = (e4.laptopHits || []).find((r) => r.id === id);
        if (!h) return false;
        e4.pressLaptop(h.x + h.w / 2, h.y + h.h / 2);
        return true;
      }, id);
      if (ok) { console.log(`  press ${id} (laptop)`); await wait(400); return true; }
      await wait(300);
    }
    log.push(`  ⚠ ${id} (laptop) never appeared (${ms} ms)`); console.log(`  ⚠ ${id} (laptop) never appeared`);
    return false;
  };
  const untilHit = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await hasHit(id)) return true; await wait(250); }
    log.push(`  ⚠ ${id} never appeared (${ms} ms)`);
    return false;
  };
  const untilLid = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await hasLid(id)) return true; await wait(250); }
    log.push(`  ⚠ ${id} (laptop) never appeared (${ms} ms)`);
    return false;
  };
  const pressVisor = async (id, ms = 40000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const ok = await page.evaluate((id) => {
        const b = window.__os.e4.ball;
        const h = [...(b.hits || []), ...(b.sessionHits || [])].find((r) => r.id === id);
        if (!h) return false;
        window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2);
        return true;
      }, id);
      if (ok) { console.log(`  press ${id} (glass)`); return true; }
      await wait(300);
    }
    log.push(`  ⚠ ${id} (glass) never appeared`); console.log(`  ⚠ ${id} never appeared`);
    return false;
  };
  const cam = async (x, y, z, pitch, yaw) => {
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [x, y, z, pitch, yaw]);
    await wait(700);
  };
  const SEAT = [4.4, 1.16, 0.7, -3, 270];       // the seat, facing the monitor
  const LID = [4.4, 1.16, 0.7, -16, 246];       // the seat, turned to the laptop (the conducted turn's pose)
  const seat = () => cam(...SEAT);
  const lid = () => cam(...LID);
  const untilPhase = (ph, ms = 20000) => page.waitForFunction((p) => window.__os.e4.browser.phase === p, { timeout: ms }, ph).then(() => true).catch(() => false);
  const untilStep = (s, ms = 30000) => page.waitForFunction((p) => window.__os.e4.browser.storyStep === p, { timeout: ms }, s).then(() => true).catch(() => { log.push(`  ⚠ step ${s} never came`); return false; });

  // ── Act I · eighteen ──
  await seat();
  await untilPhase('saver', 15000); await wait(1200);
  await shot('seat-saver', 'the screensaver — one press to restore');
  await pressWhen('saver-wake'); await wait(1500);
  await shot('seat-restoring', 'restoring the session');
  await untilPhase('open', 30000); await wait(4200);
  await lid();
  await shot('lid-birthday', 'eighteen · Kettle: the house chat, Mum, Dad, Junie (muted, a badge she cannot see)');
  await pressLid('chat-house');
  await shot('lid-house', 'eighteen · the house: HAPPY BIRTHDAY MAYA · 18!!! · cake in the fridge. don\'t tell 3B');
  await pressLid('house-heart'); await wait(500);
  await shot('lid-house-heart', 'her reply: ❤ love you all (her own wallpaper behind the chat)');
  await untilStep('newyou', 8000); await wait(900);
  await seat();
  await shot('seat-newyou', 'the new you · "Welcome back, Maya. Your defaults are restored." — You, restored · 2027');
  await pressWhen('ny-continue'); await wait(3600);
  await lid();
  await shot('lid-mum-arrives', 'Mum · "Happy 18th love x", "saw this and thought of you x"');
  await pressLid('chat-mum');
  await shot('lid-mum-2023', 'Mum · 2023: "so proud of you love ❤" — the goal is the chat wallpaper now');
  await pressLid('mum-2024'); await shot('lid-mum-2024', 'Mum · 2024: "I just want to understand." + a link');
  await pressLid('mum-2025'); await shot('lid-mum-2025', 'Mum · 2025: "Not saying anything. Just read it x" + a link');
  await pressLid('mum-2026'); await shot('lid-mum-2026', 'Mum · 2026: "Found this in the loft. You were such a happy little" — cut');
  await pressLid('mum-today'); await wait(3000);
  await shot('lid-mum-today', 'Mum · today: "You\'re 18 now. I can\'t stop you. I\'m asking you to wait." — her draft "Mum, I"');
  await untilLid('chat-dad', 8000); await wait(300);
  await shot('lid-dad-banner', 'Dad: Your mother\'s upset.');
  await pressLid('chat-dad');
  await shot('lid-dad', 'Dad · Sep 2025: "We need to talk about the appointments." "Not while you\'re under this roof."');
  await pressLid('dad-today');
  await shot('lid-dad-today', 'Dad · today: "Your mother\'s upset." "You\'re an adult now. Adults pay their own way."');
  await pressLid('chat-mum');
  await shot('lid-mum-link', 'Mum · today, Open link');
  await pressLid('msg-link'); await wait(1600);
  // ── the news, the number ──
  await seat();
  await shot('seat-article-a0', 'Mum\'s link: The Weathervane — "More than one in eight \'went back\'" (Turban 2021)');
  await wait(2200);
  await pressWhen('news-next'); await wait(500);
  await shot('seat-article-a1', 'Kestrel Daily — the same study: pressure from a parent tops the list');
  await untilHit('clinic-open', 15000); await wait(300);
  await shot('seat-clinic-notice', 'the clinic writes: Open letter');
  await press('clinic-open'); await wait(700);
  await shot('seat-clinic', 'the number · You are number 4,812 · up to 15 years · the letter, two readings');
  await pressWhen('clinic-support'); await wait(600);
  await shot('seat-meridian-draft', 'Meridian · her enquiry');
  await pressWhen('enq-send'); await wait(4000);
  await shot('seat-meridian-reply', 'Meridian · the refusal; "Referred by: Adult Gender Service"');
  await pressWhen('enq-close'); await wait(900);
  await shot('seat-clinic-moved', 'sent back: the number is bigger');
  await wait(3600);
  await lid();
  await shot('lid-left-list', 'left · the house chat has news');
  await pressLid('chat-house'); await wait(400);
  await shot('lid-left', 'left · "Sam left the group." · "sorry, it\'s a lot right now"');
  // ── Act III ──
  await untilStep('search', 20000); await wait(2000);
  await seat();
  await shot('seat-search', 'the search: "how do i tell my" — the engine has four endings ready');
  await pressWhen('search-go'); await wait(1000);
  await shot('seat-typing', 'the sentence being finished for her');
  await untilStep('results', 10000); await wait(600);
  await shot('seat-results', 'the results: the ad first, and again at the foot of the window');
  await pressWhen('ad-chat'); await wait(1600);
  await shot('seat-bot-arriving', 'Second Thoughts: "Happy birthday, Maya. 18!"');
  await untilHit('conv-chip-0'); await wait(400);
  await shot('seat-bot-hello', '"Everyone else made you wait. I\'m here now."');
  await press('conv-chip-1'); await wait(1400);
  await untilHit('conv-chip-0'); await wait(400);
  await shot('seat-bot-reasons', 'it quotes every refusal back as a reason; her week is its evidence');
  await press('conv-chip-1'); await wait(1400);
  await untilHit('conv-act'); await wait(400);
  await shot('seat-bot-heading', 'where you\'re heading: You, restored · 2027 — Becoming 97%');
  await press('conv-act'); await wait(1400);
  await untilHit('conv-chip-0'); await wait(400);
  await shot('seat-bot-map', 'the map: Junie in red · "Protect your progress: mute 2 more." · the clip, Made with AI');
  await wait(4500);
  await shot('seat-bot-clip', 'the clip, a later frame');
  await press('conv-chip-0'); await wait(2500);
  await shot('seat-bot-rest', '"Rest now. I\'ll be right here."');
  await untilStep('junie', 20000); await wait(1800);
  await lid();
  await shot('lid-junie-list', 'Junie · the morning\'s badge');
  await pressLid('chat-junie');
  await shot('lid-junie', 'Junie (muted): "happy birthday. don\'t answer if it\'s too much."');
  await pressLid('junie-unmute');
  await shot('lid-junie-unmuted', 'Junie unmuted: what the mute hid — Tuesday\'s lines (original kept; confirm the other one; the stream)');
  await pressLid('junie-reply'); await wait(2600);
  await shot('lid-junie-x', '"thank you" — "x"');
  await untilStep('confirm', 10000); await wait(2600);
  await seat();
  await shot('seat-bot-unmuted', 'the bot: Junie unmuted — her node warm, the ring falls to 61%');
  await pressWhen('conv-act'); await wait(800);
  await shot('seat-photos', 'Photos: You, restored · 2027 as profile — "me, after.jpg · original kept"');
  await pressWhen('photo-keep'); await wait(600);
  await shot('seat-photos-nomatch', 'Keep current: no match found for You, restored');
  await pressWhen('photo-original'); await wait(700);
  await shot('seat-verifying', 'Verifying…');
  await wait(4600);
  await shot('seat-matched', 'Match: Maya — "Your session is ready. Put the headset on."');
  const desk = await page.evaluate(() => window.__drawCalls);
  log.push(`  draw calls at the desk (seat, monitor): ${desk}`);

  // ── the headset (as built), the stream, the update failing ──
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1200);
  await shot('worn-session', 'the session on the glass');
  await wait(6500);
  await pressVisor('session-begin');
  await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 40000 }).catch(() => {});
  await wait(700);
  await shot('worn-link', "Junie's link: it's on. come in.");
  await pressVisor('commons-join');
  await page.waitForFunction(() => window.__os.e4.ball.phase === 'stream', { timeout: 30000 }).catch(() => {});
  await wait(2500);
  await shot('inside', 'the stream');
  const dc = await page.evaluate(async () => {
    const out = [];
    for (const yaw of [270, 300, 240, 90]) {
      window.__camFree(5.2, 1.16, 0.7, 0, yaw);
      await new Promise((r) => setTimeout(r, 900));
      out.push([yaw, window.__drawCalls]);
    }
    window.__camFree(5.2, 1.16, 0.7, 0, 270);
    return out;
  });
  log.push(`  draw calls in the stream's place (yaw → calls): ${dc.map((d) => d.join('→')).join(', ')}`);
  await page.waitForFunction(() => window.__os.e4.ball.callUp, { timeout: 60000 }).catch(() => {});
  await wait(800);
  await pressVisor('stream-dance');
  await page.waitForFunction(() => window.__os.e4.ball.phase === 'after', { timeout: 60000 }).catch(() => {});
  await wait(1200);
  await shot('terminated', 'SESSION TERMINATED · reason: social contagion');
  await wait(9500);
  await shot('device-stopped', 'the device stops; the room comes back');
  await seat();
  await shot('seat-monitor-stream', 'the monitor: transjesus.str, still live');
  await wait(14000);
  await shot('close-travel', 'the Close begins');
  const beats = await page.evaluate(() => window.__ledger?.().e4Beats ?? []);
  log.push(`  contract beats reached, in order: ${beats.join(' → ')}`);

  fs.writeFileSync(path.join(OUT, 'TOUR.md'), `STATUS: generated\n\n# Era 4 tour (v3) · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}/ — ${n} frames, ${errors.length} page error(s)`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
