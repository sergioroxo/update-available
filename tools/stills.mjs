#!/usr/bin/env node
/**
 * STILLS — the piece photographed as PICTURES, not as proof.
 *
 *     node tools/stills.mjs --port 3000                 # the whole set, 2560 × 1440
 *     node tools/stills.mjs --port 3000 --only e4       # one era
 *     node tools/stills.mjs --port 3000 --square        # the 1440 × 1440 pass
 *
 * ⚑ WHY THIS EXISTS (S173, for *After Virtual Reality*, 14–22 Oct 2026). Every
 * picture this project had was shot to prove something worked: `tools/tour.mjs`
 * frames a beat to show it is reachable, `shots.mjs` frames a defect. Both are
 * 1280 × 860 and both shove the camera at the monitor, so panels run off the
 * edge mid-sentence and no room is ever in frame. The three figures in
 * `out/figures/` were made for the abstract in July, on a build ninety sessions
 * old, and the constellation one has half its labels mirrored (a bug found in
 * that very capture, fixed since — `pointCloud.ts`'s billboard pass).
 *
 * So: the same driving as the tours, but for the eye. Two things change and
 * they are the whole tool —
 *  1. **Resolution.** The viewport stays a sane 1280 × 720 (so the FOV and the
 *     layout are a player's) and `deviceScaleFactor: 2` doubles the backing
 *     store. That is exactly `app.graphicsDevice.maxPixelRatio`'s own cap
 *     (`min(2, dpr)`), so the engine renders every pixel it is asked for and
 *     nothing is upscaled. Out: 2560 × 1440, 16:9.
 *  2. **Framing.** Each still says whose eye it is. `seat` restores the
 *     authored pose from `__poses` — what a visitor actually sees, monitor and
 *     all. `free` poses `__camFree` for the room shots the piece never gives
 *     you. `turn` presses the arrow keys the way the walker does, because the
 *     filing wall only draws while the look is really turned.
 *
 * Jumps are used freely here and that is the point of the difference: a still
 * is not a reachability claim. `tools/walk.mjs` is what proves the path.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 3000));
const SQUARE = has('square');
const ONLY = flag('only', '');
const NO_CLOSE = has('no-close');
const OUT = path.resolve(flag('out', SQUARE ? 'out/stills-square' : 'out/stills'));
const VIEW = SQUARE
  ? { width: 720, height: 720, deviceScaleFactor: 2 }
  : { width: Number(flag('width', 1280)), height: Number(flag('height', 720)), deviceScaleFactor: 2 };
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

const HIDE_CHROME = 'body > *:not(canvas) { display: none !important; }';

async function main() {
  const chrome = resolveChrome();
  if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: VIEW
  });
  fs.mkdirSync(OUT, { recursive: true });
  // the sheet survives a partial run (`--only e2` must not erase the rest)
  const sheetPath = path.join(OUT, 'STILLS.json');
  const sheet = fs.existsSync(sheetPath) ? JSON.parse(fs.readFileSync(sheetPath, 'utf8')) : {};

  /** one era in its own page, so a still is never lit by the last era's state */
  const era = async (n, body) => {
    if (ONLY && ONLY !== `e${n}`) return;
    const page = await browser.newPage();
    await page.setViewport(VIEW);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    const query = n === 1 ? '?reinterp=1&debug=1' : `?reinterp=1&era=${n}&debug=1&descent=0`;
    await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle2', timeout: 60000 });
    if (n === 1) {
      await page.waitForFunction(() => [...document.querySelectorAll('button')]
        .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    }
    await page.waitForFunction(() => window.__os && window.__camFree && typeof window.__poses === 'function', { timeout: 45000 });
    await page.addStyleTag({ content: HIDE_CHROME });
    await wait(1500);

    /** wait until the camera is nobody else's — the descent and every driven
     *  leg write camPos every frame, and a pose set under one is simply erased
     *  (this cost the first run: five stills all reported at the seat) */
    const settled = async (ms = 40000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const p = await page.evaluate(() => window.__camPose());
        if (!p.driven && !p.descent) return true;
        await wait(500);
      }
      console.log('  ⚠ camera still driven after ' + ms + ' ms');
      return false;
    };
    const shot = async (name, note) => {
      const file = `e${n}-${name}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const pose = await page.evaluate(() => window.__camPose());
      sheet[file] = { note, cam: `${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${pose.z.toFixed(2)} · pitch ${pose.pitch.toFixed(0)} yaw ${pose.yaw.toFixed(0)}` };
      console.log(`${file}  ${note}`);
    };
    /** the reviewer's eye — a pose the piece never gives you */
    const free = async (x, y, z, pitch, yaw) => {
      await settled();
      await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [x, y, z, pitch, yaw]);
      await wait(900);
    };
    /** back to the authored seat — what a visitor actually sees */
    const seat = async (key = `r${n === 3 ? 2 : n === 4 ? 3 : 1}`) => {
      await settled();
      await page.evaluate((k) => {
        const P = window.__poses();
        const p = P.seats[k] || P.seats.r1;
        window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
      }, key);
      await wait(900);
    };
    /** an overlook the lift itself flies to */
    const overlook = async (key) => {
      await settled();
      await page.evaluate((k) => {
        const p = window.__poses().overlooks[k];
        if (p) window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
      }, key);
      await wait(900);
    };
    /** a real turn of the head — 6° per press, as the walker does it */
    const turn = async (presses, key = 'ArrowRight') => {
      for (let i = 0; i < presses; i++) { await page.keyboard.press(key); await wait(60); }
      await wait(900);
    };
    const jump = async (beat, ms = 1800) => { await page.evaluate((b) => window.__os.debugJump(b), beat); await wait(ms); };

    await body({ page, shot, free, seat, overlook, turn, jump, settled });
    if (errors.length) console.log(`  ⚠ page errors: ${errors.slice(0, 3).join(' · ')}`);
    await page.close();
  };

  // ── 1997 ────────────────────────────────────────────────────────────────
  await era(1, async ({ shot, free, turn, jump }) => {
    await jump('kit', 2600);
    // ⚑ THE ENTRANCE (his ask: replicate out/figures/fig1_entrance_overhead.jpg).
    //   Found by probing, not reasoned: the room's own overlooks are the lift's
    //   poses and none of them holds this composition — bed left, desk right,
    //   chair centre, the window over the lamp.
    await free(1.0, 2.25, 2.55, -28, 22);
    await shot('00-entrance', 'the room from the door\'s corner — bed, desk, chair, the window over the lamp');
    await jump('desktop', 2000);
    // the desk centred (his note on the first pass: the overlook put it off-centre)
    await free(0, 2.3, 1.75, -38, 0);
    await shot('01-room-1997', '1997 from above, the desk at the centre');
    // ⚑ the seated views sit LOWER and FURTHER BACK than the authored eye: at the
    //   seat's own 1.16 m the bezel is cropped top and bottom. 1.08 / z 1.05 holds
    //   the whole CRT, its stand, and the desk in front of it (his note).
    await free(0, 1.08, 1.05, -2, 0);
    await shot('02-seat-desktop', 'the seat: the whole CRT on the desk — one UI surface, textured onto a monitor in a room');
    await jump('kit', 2600);
    await free(0, 1.08, 1.05, -2, 0);
    await shot('03-the-programme', 'A:\\ opened — the Un-Walk programme, the era\'s spine');
    await jump('desktop', 1200);
    await turn(33);
    await shot('04-the-turn', 'the turn: the room\'s other face, where attention becomes evidence');
    await turn(33, 'ArrowLeft');
    await jump('kit', 2600);
    await free(0, 1.10, 0.38, -3, 0);
    await shot('05-close-the-programme', 'close: the programme on the glass, the First Steps in order');
    await jump('diary', 2600);
    await free(0, 1.10, 0.55, -2, 0);
    await shot('06-the-diary', 'closer: DIARY.TXT — the line written to a future self');
    await jump('diaryGlitch', 3200);
    await free(0, 1.10, 0.45, -2, 0);
    await shot('07-the-cascade', 'the machine failing: PHASE/2 95 — "a new update is needed"');
  });

  // ── 2003 ────────────────────────────────────────────────────────────────
  await era(2, async ({ shot, free, seat, jump }) => {
    // the same room as 1997 and the same two poses, so the pair reads as one
    // room ageing rather than two rooms (his ask: the eras should rhyme)
    await jump('e2Program', 2600);
    await free(1.0, 2.25, 2.55, -28, 22);
    await shot('00-entrance-2003', 'the same corner, six years on — the bed gone, the desk kept');
    await free(0, 2.3, 1.75, -38, 0);
    await shot('01-room-2003', '2003 from above, the desk at the centre');
    await jump('e2Cartoon', 7000);
    await seat('r1');
    await shot('02-lamby-asleep', 'the software boots: Lamby asleep, and the thought he is having');
    await wait(7000);
    await shot('03-lamby-light', 'the light that shows him what is right — a computer, with a purity streak');
    await jump('e2Restorify', 2600);
    await free(0, 1.08, 1.05, -2, 0);
    await shot('04-restorify', 'the daily check-in on the screen it is on: 412 days, "How is your walk today?"');
    await free(0, 1.10, 0.38, -3, 0);
    await shot('04b-close-restorify', 'close: 412 days · Purity Streak · "How is your walk today?"');
    await jump('calebChat', 2600);
    await free(0, 1.08, 1.05, -2, 0);
    await shot('05-messenger', 'the Messenger — the thread that gets a person caught');
    await free(0, 1.10, 0.38, -3, 0);
    await shot('06-close-messenger', 'close: the thread, as he reads it');
    await jump('calebResidue', 3000);
    await free(0, 1.08, 1.05, -2, 0);
    await shot('07-what-is-left', 'what is left of him, and the box that asks for it');
  });

  // ── 2016 ────────────────────────────────────────────────────────────────
  await era(3, async ({ shot, free, jump }) => {
    // ⚑ the overlooks are the LIFT's poses, aimed along its flight — `look-R2`
    //   points at a window, not at the desk. Room 2 and Room 3 get Room 1's own
    //   two poses re-expressed in their forward (yaw 90 faces -x, 270 faces +x),
    //   so all three rooms are photographed from the same two places.
    await free(-2.55, 2.25, -0.30, -28, 112);
    await shot('00-entrance-2016', 'Room 2 from its corner — the room she works in');
    await free(-3.5, 2.35, 0.95, -40, 90);
    await shot('01-room-2016', '2016 from above, the desk at the centre');
    await free(-4.05, 1.08, 0.70, -2, 90);
    await shot('02-seat-board', 'the seat: the whole screen, the platform waiting to be signed into');
    await free(-4.62, 1.10, 0.70, -3, 90);
    await shot('03-close-the-platform', 'close: the platform, and the name it greets her by');
    await jump('u3Dispersal', 1200).catch(() => {});
  });

  // ── 2026 ────────────────────────────────────────────────────────────────
  await era(4, async ({ page, shot, free, jump, settled }) => {
    await free(2.55, 2.25, 1.70, -28, 292);
    await shot('00-entrance-2026', 'Room 3 from its corner — thirty years on, the same desk');
    await free(3.5, 2.35, 0.95, -40, 270);
    await shot('01-room-2026', '2026 from above, the desk at the centre');
    await jump('e4Browser', 2000);
    await page.evaluate(() => window.__os.e4.browser.debugJumpTo('search'));
    await wait(2500);
    await free(4.05, 1.08, 0.70, -2, 270);
    await shot('02-seat-2026', 'the seat: the laptop she comes back to — six tabs, five of them hers');
    await free(4.62, 1.10, 0.70, -3, 270);
    await shot('02b-close-the-search', 'close: the search finished for her');
    await page.evaluate(() => window.__os.e4.browser.debugJumpTo('site'));
    await wait(2500);
    await free(4.05, 1.08, 0.70, -2, 270);
    await shot('03-the-site', 'where the search led: one door, and an agent behind it');
    await free(4.62, 1.10, 0.70, -3, 270);
    await shot('03b-close-the-site', 'close: the door the search led to');
    await jump('e4Ball', 2000);
    await page.evaluate(() => window.__os.e4.ball.debugJumpTo('ball'));
    await wait(6000);
    await shot('04-the-commons', 'the one room the system has no category for');
    if (NO_CLOSE) return;
    await page.evaluate(() => window.__os.e4.ball.debugJumpTo('after'));
    await wait(1500);
    // the termination, the glitch, and the 44 s sweep into the Close
    await wait(26000);
    await shot('05-the-sweep', 'the last move: rising over the partition, turning to face the building');
    // S174: the two frames held back in S173c come back — Room 2 is emptied at
    //   2026 (R4-16) and the machine has its faces and a clear sight-line (R4-14/15)
    await wait(24000);
    await shot('05b-the-night', 'night falls over the building, and the constellation opens while she is still coming down');
    await wait(30000);
    await shot('06-constellation', 'the Close: the sky it ends under');
    await wait(26000);
    await shot('07-the-panels', 'the panels: the four rooms, and what was true in each');
    await wait(22000);
    let go = false;
    for (let i = 0; i < 60 && !go; i++) {
      go = await page.evaluate(() => !!(window.__closeMonitor?.hits || []).find((r) => r.id === 'close-go'));
      if (!go) await wait(2000);
    }
    if (go) {
      await wait(1500);
      await shot('07b-the-machine', "Daniel's machine, three metres back in the sky: \"Restart as you are.\"");
      await settled();
      const goPress = () => page.evaluate(() => { const cm = window.__closeMonitor; const h = (cm.hits || []).find((r) => r.id === 'close-go'); if (h) cm.press(h.x + h.w / 2, h.y + h.h / 2); });
      await goPress();
      let near = false;
      for (let i = 0; i < 40 && !near; i++) {
        near = await page.evaluate(() => !!(window.__closeMonitor?.hits || []).find((r) => r.id === 'close-receipt'));
        if (!near) { await wait(1500); if (i === 12 || i === 24) await goPress(); }
      }
      if (near) {
        await shot('08-restart-as-you-are', 'the card, come to: the four rooms · Receipt · Start again · The dossier');
        await page.evaluate(() => { const cm = window.__closeMonitor; const h = cm.hits.find((r) => r.id === 'close-receipt'); cm.press(h.x + h.w / 2, h.y + h.h / 2); });
        await wait(1500);
        await shot('09-the-receipt', 'the receipt: every update stacked, each FAILED — kept by nobody');
        // S174 / R4-18: a room's dossier, in that room's own OS (a label or a panel press opens it)
        for (const [era, tag] of [[1, '1997'], [3, '2016'], [4, '2026'], [0, 'how-it-was-made']]) {
          await page.evaluate((e) => window.__closeMonitor.openSource(e, null), era);
          await wait(1200);
          await shot(`10-dossier-${tag}`, era === 0 ? 'how this was made: the project\'s own documents, on the machine' : `the ${tag} room's dossier, in its own OS, on the one machine`);
        }
      } else console.log('  ⚠ the card never came near — no receipt still');
    } else console.log('  ⚠ close-go not published — no receipt still');
  });

  for (const f of Object.keys(sheet)) if (!fs.existsSync(path.join(OUT, f))) delete sheet[f];
  fs.writeFileSync(sheetPath, JSON.stringify(sheet, null, 1));
  const rows = Object.keys(sheet).sort().map((f) => `| \`${f}\` | ${sheet[f].note} | ${sheet[f].cam} |`);
  fs.writeFileSync(path.join(OUT, 'STILLS.md'), `STATUS: live

# STILLS — ${SQUARE ? '1440 × 1440' : `${VIEW.width * 2} × ${VIEW.height * 2}`} · ${new Date().toISOString().slice(0, 10)}
*Made by \`tools/stills.mjs\`. Regenerable; not committed (out/ is git-ignored).*

| file | what it is | camera |
|---|---|---|
${rows.join('\n')}
`);
  console.log(`\n${rows.length} stills → ${OUT}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
