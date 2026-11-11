#!/usr/bin/env node
/**
 * TOUR ERA 4 (S363 order) — play 2026's screens end to end, headless, and photograph every one Sérgio judges.
 * ⚑ S363: a copy of tools/tour-e4-s360.mjs with the screens' act rewritten for UiB job 14 Part A (N1–N7, N11): the morning on
 *   "New search" with the notifications, the mailbox opening on Mum's email (the Meridian thread and the clinic opened and
 *   scrolled), Mum's three sites with their furniture, the search as the second way in, the chat as a conversation. It
 *   stops at "Match: Maya" unless --headset is given (the headset part is the old tour's).
 *
 *     node tools/tour-e4-s363.mjs --port 3163 --out out/s363/tour
 *
 *     node tools/tour-e4.mjs --port 3121 --host 127.0.0.1 --out out/tour-e4-v3
 *
 * ⚑ S321 (2026-11-07) — 2026 v3, "the pressure" (DESIGN_2026_V3_PRESSURE_2026-11-07.md): the house chat on her
 * birthday, the new you, Mum one year at a time, Dad, Mum's link and the news tabs, the clinic's number, Meridian,
 * Sam leaving, the search finished for her, Second Thoughts (her week, where she's heading, the map and the clip),
 * Junie unmuted, the original — then the headset, the stream and the update failing (as built). Every press goes
 * through a surface a player presses: the monitor's published rects (`__os.e4.pressBrowser`) — the browser's window
 * and, since S328, Kettle's window beside it (there is no laptop) — and the glass (`__os.handleClick`); never a jump.
 * Mum's years and Dad's today are reached by SCROLLING Kettle's thread (`browser.scrollAt`), as a wheel would.
 *
 * ⚑ FRAMES ARE FROM THE SEAT (S328: in the chair, at the desk — app.ts seatPose(270)): `seat-` frames name a beat in
 * the browser's window, `lid-` frames a beat in Kettle's window; both are the same view of the one monitor.
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
    // Room pass: same seat, four cardinal bearings at the fullest opening; then the changed wall and ceiling.
    const roomSteps = ['seat-matched'];
    if (name === 'room-conducted') log.push(`  conducted pose: ${JSON.stringify(st.pose)}`);
    if (roomSteps.includes(name) || name.includes('clip-takeover') || name === 'seat-bot-map' || name === 'lid-junie-unmuted') {
      const poses = name === 'lid-birthday' ? [270, 0, 90, 180].map(yaw => [-8, yaw])
        : (name.includes('clip') || name.includes('map') || name === 'lid-junie-unmuted') ? [[80, 267]] : [[0, 215]];
      for (const [pitch, yaw] of poses) {
        await page.evaluate(p => window.__camFree(4.6, 1.16, .70, p[0], p[1]), [pitch, yaw]);
        await wait(350);
        await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-room-${name}-${yaw}.png`) });
        const calls = await page.evaluate(() => window.__drawCalls);
        log.push(`  room ${name} pitch ${pitch} yaw ${yaw}: ${calls} draw calls`);
      }
      await page.evaluate(p => window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw), st.pose);
      await wait(250);
    }
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
  const hasLid = hasHit;   // S328: Kettle's controls are on the monitor
  const pressWhen = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await hasHit(id)) return press(id); await wait(300); }
    log.push(`  ⚠ ${id} never appeared (${ms} ms)`); console.log(`  ⚠ ${id} never appeared`);
    return false;
  };
  /** a press on Kettle's window (S328: on the monitor, beside the browser) */
  const pressLid = async (id, ms = 20000) => { const ok = await pressWhen(id, ms); await wait(400); return ok; };
  /** a wheel's worth of scroll on Kettle's open thread (dy > 0 reads on) */
  const scrollLid = async (dy) => {
    const ok = await page.evaluate((dy) => window.__os.e4.browser.scrollAt(null, null, dy), dy);
    console.log(`  scroll ${dy} → ${ok}`); await wait(500); return ok;
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
  // ⚑ S321 (second pass) — the seat frames BOTH screens now (app.ts seatPose(270)): every frame is the player's view.
  //   `lid-` frames name a beat on the laptop; they are taken from the same seat.
  const SEAT = [4.6, 1.16, 0.70, -8, 270];   // ⚑ S328 — app.ts seatPose(270): in the chair, at the desk
  const LID = SEAT;
  const seat = () => cam(...SEAT);
  const lid = () => cam(...LID);
  const untilPhase = (ph, ms = 20000) => page.waitForFunction((p) => window.__os.e4.browser.phase === p, { timeout: ms }, ph).then(() => true).catch(() => false);
  const untilStep = (s, ms = 30000) => page.waitForFunction((p) => window.__os.e4.browser.storyStep === p, { timeout: ms }, s).then(() => true).catch(() => { log.push(`  ⚠ step ${s} never came`); return false; });

  // ── ⚑ S363 (UiB job 14 Part A) — the morning, the mailbox, Mum's sites, the second way in, the conversation ──
  const HEADSET = argv.includes('--headset');
  /** a wheel's worth of scroll on the browser's reading pane (no point: the stick's path — Kettle first, then the mail) */
  const scrollPane = async (dy) => {
    const ok = await page.evaluate((dy) => window.__os.e4.browser.scrollAt(null, null, dy), dy);
    console.log(`  scroll ${dy} → ${ok}`); await wait(500); return ok;
  };
  await seat();
  await untilPhase('saver', 15000); await wait(1200);
  await shot('seat-saver', 'the screensaver — one press to restore');
  await pressWhen('saver-wake'); await wait(1500);
  await untilPhase('open', 30000); await wait(1200);
  await shot('seat-new-search', 'N1/N6 · the morning: one tab, "New search", her question from last night half-typed; no brand, no bookmark, no Photos');
  await untilHit('toast-house', 15000); await wait(700);
  await shot('seat-toast', 'N1 · the first message arrives as a notification (Kettle · the lot); Kettle\'s wallpaper has no face');
  await wait(5200);
  await shot('seat-toasts', 'the lot, one message at a time');
  await pressLid('row-house'); await wait(3000);
  await shot('lid-house', 'eighteen · the lot');
  await pressLid('house-heart'); await wait(3000);
  await pressLid('back-chats'); await wait(1500);
  await pressLid('row-mum', 15000); await wait(1200);
  await shot('lid-mum', 'Mum: "happy birthday my love. I sent you an email x"');
  await untilLid('chat-dad', 15000); await wait(600);
  await pressLid('chat-dad'); await wait(1500);
  await shot('lid-dad', 'Dad · "Not while you\'re under this roof." · today');
  await untilStep('mumMail', 40000); await wait(1800);
  await seat();
  await shot('seat-mail-mum', 'N2/N4 · Larkpost opens on Mum\'s email, already read: the folder rail, the threads with avatars and labels, the reading pane');
  await pressWhen('mail-sum'); await wait(700);
  await shot('seat-mail-mum-summary', 'N4 · "Summarise": the AI is already in her inbox');
  await pressWhen('mail-sum'); await wait(400);
  await scrollPane(400); await wait(400);
  await shot('seat-mail-mum-scrolled', 'Mum\'s email scrolled: her three links (her note on the second), the loft photo, "Mum, I" never sent');
  await pressWhen('mail-row-meridian'); await wait(800);
  await shot('seat-mail-meridian', 'N3 · the morning she lived: her forward to Meridian LGB Trust, in her own words');
  await scrollPane(260); await wait(300);
  await shot('seat-mail-meridian-reply', 'Meridian\'s auto-reply');
  await scrollPane(600); await wait(300);
  await shot('seat-mail-meridian-draft', 'her reply to it: typed, saved 10:44, never sent');
  await pressWhen('mail-sum'); await wait(700);
  await shot('seat-mail-meridian-summary', 'Larkpost\'s summary of the no: "Suggested reply: Thanks for letting me know!"');
  await pressWhen('mail-sum'); await wait(300);
  await pressWhen('mail-row-clinic'); await wait(800);
  await shot('seat-mail-clinic', 'the clinic: your referral has moved — the number, 4,815, the list moved');
  await pressWhen('mail-row-mum'); await wait(600);
  await pressWhen('mail-read'); await wait(1500);
  await shot('seat-article-1', 'N5 · The Weathervane: the AI summary, the two readings, the autoplay video, Most read, the cookie banner, the sticky ad');
  await pressWhen('news-consent-accept'); await wait(600);
  await shot('seat-article-1-accepted', 'the cookie banner answered: the rail and the sticky ad');
  await pressWhen('news-next'); await wait(600);
  await shot('seat-article-2', 'N5 · Kestrel Daily (a tabloid): the HHS report — the report and its critics, side by side; Mum\'s note');
  await wait(3200);
  await shot('seat-article-2-newsletter', 'the newsletter pop-up, over the rail only');
  await pressWhen('news-nl-no'); await wait(400);
  await pressWhen('news-next'); await wait(800);
  await shot('seat-article-3', 'N5 · The Plainspoken (a tech site): the paywall line, Sponsored: Second Thoughts');
  // the second way in: she stays on the last article; the piece takes her to the search
  await untilStep('search', 30000); await wait(2600);
  await shot('seat-search', 'N6 · the search, as the second way in: her question, and Lantern\'s four endings');
  await pressWhen('search-go'); await wait(3600);
  await shot('seat-results', 'the results: the AI overview, the ad first');
  await pressWhen('ad-chat'); await wait(2400);
  await shot('seat-bot-hello', 'N7 · Second Thoughts as a conversation: "Happy birthday, Maya. 18!" — her suggested replies above the composer');
  await untilHit('conv-chip-0'); await wait(400);
  await press('conv-chip-1'); await wait(1600);
  await shot('seat-bot-her-bubble', 'her words, in her own bubble; "Memory updated" and what it saved');
  await untilHit('conv-chip-0'); await wait(400);
  await shot('seat-bot-reasons', 'the sign: the number, Meridian, Dad');
  await press('conv-chip-0'); await wait(1600);
  await untilHit('conv-chip-0'); await wait(400);
  await shot('seat-bot-diagnosis', 'the diagnosis, as agreement');
  await pressWhen('conv-compose'); await wait(300);
  await shot('seat-bot-compose', 'a press on the composer: no typing — it points to her replies');
  await press('conv-chip-0'); await wait(2600);
  await shot('seat-clip', 'the clip, made for her (owns the page)');
  await untilHit('conv-chip-0', 60000); await wait(400);
  await shot('seat-bot-map', 'the clip as a card in the conversation, then her circle');
  await press('conv-chip-0'); await wait(2500);
  await untilHit('conv-act', 20000); await wait(400);
  await shot('seat-bot-heading', 'the goal, last: "I\'ve made it your picture."');
  await press('conv-act'); await wait(2500);
  await untilHit('conv-act', 20000); await wait(400);
  await shot('seat-bot-stories', 'one story');
  await press('conv-act'); await wait(2500);
  await untilStep('junie', 25000); await wait(1800);
  await lid();
  await pressLid('chat-junie');
  await pressLid('junie-unmute');
  await shot('lid-junie-unmuted', 'Junie unmuted');
  await pressLid('junie-reply'); await wait(2600);
  await untilStep('confirm', 10000); await wait(2600);
  await seat();
  await shot('seat-bot-unmuted', 'the bot: Junie unmuted — the ring falls');
  await pressWhen('conv-act'); await wait(800);
  await shot('seat-photos', 'Photos opens only now, when the bot sends her');
  await pressWhen('photo-keep'); await wait(600);
  await pressWhen('photo-original'); await wait(700);
  await wait(4600);
  await shot('seat-matched', 'N11 · Match: Maya — the bot\'s last lines wrapped inside the card; the wall has no framed photo of her');
  const desk = await page.evaluate(() => window.__drawCalls);
  log.push(`  draw calls at the desk (seat, monitor): ${desk}`);
  if (!HEADSET) {
    const beats0 = await page.evaluate(() => window.__ledger?.().e4Beats ?? []);
    log.push(`  contract beats reached, in order: ${beats0.join(' → ')}`);
    fs.writeFileSync(path.join(OUT, 'TOUR.md'), `STATUS: generated\n\n# Era 4 tour (S363) · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
    console.log(`\nwrote ${path.relative(process.cwd(), OUT)}/ — ${n} frames, ${errors.length} page error(s)`);
    await browser.close();
    return;
  }

  // ── the headset (as built), the stream, the update failing ──
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1200);
  await shot('worn-tryon-0', 'try it on: "See how it feels. No pressure. Just try it." — nobody asked');
  await wait(7800);
  await shot('worn-tryon-hair', 'the hair, cut from the ends');
  await wait(5000);
  await shot('worn-tryon-jaw', 'the jaw; "Look how natural that looks."');
  await wait(6000);
  await shot('worn-tryon-shoulders', 'the shoulders, the shirt and tie; the smile');
  await wait(7500);
  await shot('worn-tryon-hands', 'her hands, held up, changed');
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
