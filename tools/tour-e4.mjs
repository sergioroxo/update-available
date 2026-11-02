#!/usr/bin/env node
/**
 * TOUR ERA 4 — play the era end to end, headless, and photograph every beat.
 *
 *     node tools/tour-e4.mjs --port 3000 --out out/tour-e4
 *
 * ⚑ S293 (2026-11-02) — the 2026 v2 sequence (RESEARCH_2026_V2_WEAPONISED_CARE §4, ENDING_TRANSJESUS): the
 * screensaver, the defaults, the search steered to an ad, the agent's conversation (its referral, Meridian's
 * refusal, "Is this still you?", the photograph, the composite, her story, the messages), Junie's thread, the
 * original, the headset session, Junie's link, the platform frame failing, the stream, the chat seeing her, her one
 * act, the system refused, the update failing while the stream goes on, and the start of the Close. Every press goes
 * through the surfaces a player presses (`__os.e4.pressBrowser` on the monitor's published rects, `__os.handleClick`
 * on the visor's) — never a jump. Frames are numbered in order; `look-` frames are the reviewer's eye (`__camFree`),
 * not the player's. The draw calls in the stream's place are measured and written into TOUR.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
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
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0${CUT ? '&cut=' + CUT : ''}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 30000 });
  // the canvas only — but keep the stream's subtitles, which are part of the beat
  await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });

  let n = 0;
  const log = [];
  const shot = async (name, note = '') => {
    n++;
    const file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await page.evaluate(() => {
      const e4 = window.__os.e4;
      const b = e4.browser;
      return {
        stage: e4.stageNow, browser: b.phase, mode: b.programMode, beat: b.cur ? b.cur.id : '-',
        ball: e4.ball.phase, dc: window.__drawCalls, pose: window.__camPose()
      };
    });
    const line = `${file}  ${note}  · stage ${st.stage} · browser ${st.browser}/${st.mode}/${st.beat} · ball ${st.ball} · draws ${st.dc} · yaw ${st.pose.yaw.toFixed(0)}`;
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
  const pressWhen = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const there = await page.evaluate((id) => !!(window.__os.e4.browser.hits || []).find((r) => r.id === id), id);
      if (there) return press(id);
      await wait(300);
    }
    log.push(`  ⚠ ${id} never appeared (${ms} ms)`); console.log(`  ⚠ ${id} never appeared`);
    return false;
  };
  const untilHit = async (id, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await page.evaluate((id) => !!(window.__os.e4.browser.hits || []).find((r) => r.id === id), id)) return true;
      await wait(250);
    }
    log.push(`  ⚠ ${id} never appeared (${ms} ms)`);
    return false;
  };
  /** a press on the glass: the ball's own rects, or the session's Begin */
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
  const SEAT = [4.4, 1.16, 0.7, 0, 270];
  const CLOSE = [4.82, 1.06, 0.7, -2, 270];   // the reviewer's eye, half a metre off the glass

  const untilPhase = (ph, ms = 20000) => page.waitForFunction((p) => window.__os.e4.browser.phase === p, { timeout: ms }, ph).then(() => true).catch(() => false);
  const untilMode = (m, ms = 20000) => page.waitForFunction((p) => window.__os.e4.browser.programMode === p, { timeout: ms }, m).then(() => true).catch(() => false);

  // ── 1 · the restore and the defaults (V0) ──
  await cam(...SEAT);
  await untilPhase('saver', 15000); await wait(1500);
  await shot('saver', 'the screensaver — one press to restore');
  await pressWhen('saver-wake'); await wait(1500);
  await shot('boot-restoring', 'restoring the session');
  await untilPhase('open', 30000); await wait(1200);
  await cam(...CLOSE);
  await shot('look-defaults', 'V0 · Your defaults were restored — Profile Default, Search Lantern, Assistant Second Thoughts');
  await pressWhen('def-continue'); await wait(900);
  await shot('look-browser-open', 'the restored browser: the profile chip says Default');

  // ── 2 · the search, steered (V1) ──
  await pressWhen('search-open'); await wait(1200);
  await shot('look-search-typing', 'the sentence being finished for her');
  await untilMode('results', 20000); await wait(800);
  await shot('look-results', 'V1 · results: the first is a Sponsored ad, with Why this ad?');
  await pressWhen('result-agent'); await wait(1600);
  await shot('look-agent-arriving', 'V2 · the agent: its lines arriving');

  // ── 3 · the conversation (V2–V8) ──
  await untilHit('conv-chip-0'); await wait(500);
  await shot('look-agent-open', 'V2 · "Hi Maya. Thank you for coming." — two chips');
  await press('conv-chip-1'); await wait(1500);
  await untilHit('res-meridian'); await wait(600);
  await shot('look-resources', 'V3 · "would it help to talk to someone who isn\'t me?" — three places, one pressable');
  await press('res-meridian'); await wait(800);
  await shot('look-enquiry-draft', 'V4 · her draft to Meridian LGB Trust');
  await pressWhen('enq-send'); await wait(4200);
  await shot('look-enquiry-reply', 'V4 · the refusal — and "Referred by: Second Thoughts"');
  await pressWhen('enq-close'); await wait(1200);
  await untilHit('conv-chip-0'); await wait(600);
  await shot('look-back', 'V5 · "I\'m sorry they said no. I won\'t." — the refusal on her file');
  await press('conv-chip-0'); await wait(1500);
  await untilHit('conv-act'); await wait(500);
  await shot('look-see', 'V6 · "Could I see you?"');
  await press('conv-act'); await wait(800);
  await shot('look-picker', 'V6 · the file window (a picture of one)');
  await pressWhen('file-0'); await wait(800);
  await shot('look-picker-folder', "V6 · inside Pride '24");
  await pressWhen('file-2'); await wait(1500);
  await shot('look-making', 'V7 · making a version that matches her file');
  await wait(2600);
  await untilHit('conv-act'); await wait(500);
  await shot('look-composite', 'V7 · the composite, outline only — "Edited with AI · composite"');
  await press('conv-act'); await wait(1500);
  await untilHit('conv-act'); await wait(600);
  await shot('look-story', 'V8 · the care log, and her story made of her own chips');
  await press('conv-act'); await wait(1500);
  await untilHit('conv-chip-0'); await wait(500);
  await shot('look-messages-ask', 'V9 · "I need your messages. Allow it?"');
  await press('conv-chip-0'); await wait(1200);
  await shot('look-threads', 'V9 · her threads — only Junie\'s opens');
  await pressWhen('thread-junie'); await wait(1000);
  await shot('look-junie', 'V9 · Junie\'s thread (felt: no agent, no L, no glow)');
  await pressWhen('junie-reply'); await wait(3000);
  await shot('look-junie-replied', 'V9 · "thank you" — "x"; the Photos tab rings');
  await pressWhen('tab3'); await wait(900);
  await shot('look-reversal', 'V10 · Photos: the composite as profile, the original kept — Use original');
  await pressWhen('photo-original'); await wait(800);
  await shot('look-verifying', 'V10 · Verifying…');
  await wait(3600);
  await shot('look-matched', 'V10 · Match: Maya — and the agent, satisfied: "Put the headset on."');
  await cam(...SEAT);
  await shot('desk-ready', 'the desk: the headset glows; the laptop says the session is ready');

  // ── 4 · the headset (V11) ──
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1200);
  await shot('worn-session', 'V11 · the session on the glass');
  await wait(6500);
  await pressVisor('session-begin');
  await wait(2500);
  await shot('worn-recorded', 'V11 · the recording, introduced as what it is');
  await wait(4500);
  await shot('worn-recorded-2', '"Nobody made me. I was helped."');
  await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 40000 }).catch(() => {});
  await wait(700);
  await shot('worn-link', "Junie's link: it's on. come in.");
  await pressVisor('commons-join');
  await wait(2200);
  await shot('frame-1', 'the platform frame — Rank: —, Reach: not rated…');
  await wait(4800);
  await shot('frame-2', 'Auto-captions: unavailable · Category: none found');
  await page.waitForFunction(() => window.__os.e4.ball.phase === 'grow', { timeout: 20000 }).catch(() => {});
  await wait(1500);
  await shot('grow', 'the stream fills the glass');
  await page.waitForFunction(() => window.__os.e4.ball.phase === 'stream', { timeout: 20000 }).catch(() => {});
  await wait(1200);
  await shot('inside-clearing', 'the glass lets go — she is inside the stream');
  await wait(3000);
  await shot('inside', 'TransJesus dancing, the people with them; the chat on the stream\'s screen');
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
  console.log('  draw calls', dc);
  await cam(8.0, 1.5, 0.7, 4, 270);
  await shot('look-transjesus', 'closer: TransJesus on the floor, the stream\'s screen behind');
  await cam(5.2, 1.16, 0.7, 0, 270);
  await page.waitForFunction(() => window.__os.e4.ball.callUp, { timeout: 60000 }).catch(() => {});
  await wait(800);
  await shot('ask', '"hi maya" — 42 watching — dance if you want, or just stay');
  await pressVisor('stream-dance');
  await wait(1800);
  await shot('danced', 'her one act: the room answers');
  await page.waitForFunction(() => window.__os.e4.ball.intrusionT >= 0, { timeout: 30000 }).catch(() => {});
  await wait(2600);
  await shot('intrusion', 'the system comes back for her — Reconnecting… cannot rank, cannot caption');
  await wait(4600);
  await shot('refused', 'connection refused · room full');
  await page.waitForFunction(() => window.__os.e4.ball.phase === 'after', { timeout: 20000 }).catch(() => {});
  await wait(1200);
  await shot('terminated', 'SESSION TERMINATED · reason: social contagion');
  await wait(5500);
  await shot('glitch', 'the update fails — the stream still dancing behind it');
  await wait(4000);
  await shot('device-stopped', 'the device stops; the room comes back');
  await cam(...CLOSE);
  await shot('look-monitor-stream', 'the monitor: transjesus.str, still live, 42 watching');
  await cam(...SEAT);
  await wait(2000);
  await shot('laptop-failed', 'the laptop: Your update has failed.');
  await wait(12000);
  await shot('close-travel', 'the Close begins');

  fs.writeFileSync(path.join(OUT, 'TOUR.md'), `STATUS: generated\n\n# Era 4 tour · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}/ — ${n} frames, ${errors.length} page error(s)`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
