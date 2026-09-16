#!/usr/bin/env node
/**
 * QUEST NUMBERS FOR ERA 4 — what the desktop walk cannot see, measured.
 *
 *     node tools/quest-e4.mjs --port 3000 [--out out/quest-e4.md]
 *
 * ⚑ 2026-09-16. Nothing since S131 (the Commons as a world, the second act,
 * the Close from the glitch) has been in a headset, and the piece's Quest laws
 * are numbers: ≤75 draw calls (CLAUDE.md), 0.43 m/s and 9.1 °/s on every
 * driven leg (shots.mjs's comfort envelope). This drives Era 4 the way
 * `tour-e4.mjs` does — through the player's own surfaces — and instead of
 * photographing each beat it RECORDS every frame (`__camPose` + `__drawCalls`)
 * and partitions the recording into the beats: the desk, the visor, the
 * struggle, the world at the seat and in each look direction, the ball with
 * the stream, the intrusions, the termination and the conducted look, and
 * every stage of the Close. For each beat: the robust draw-call peak and the
 * mean; for every driven leg inside it: peak and sustained m/s and °/s against
 * the envelope. The visor's frame and the Close's panels are computed from
 * the canvases and the data, not guessed.
 *
 * This is a stereo-blind measure: a headset renders each draw twice, but the
 * budget was set per scene, not per eye, and it is the same budget the
 * entrance was cleared against (shots.mjs comfort). What it cannot know is
 * the Quest's fill rate — the dark-glass visor over the whole frame is the one
 * thing here that only a headset can price.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve(flag('out', 'out/quest-e4.md'));
const VIEWPORT = { width: 1280, height: 860 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const COMFORT_MPS = 0.43;
const COMFORT_DPS = 9.1;
const COMFORT_WINDOW = 5;
const DRAW_CALL_BUDGET = 75;
const DRAW_PEAK_TRIM = 0.02;

function resolveChrome() {
  const explicit = flag('chrome') ?? process.env.CHROME ?? process.env.CHROME_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const candidates = process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ] : ['/usr/bin/google-chrome', '/usr/bin/chromium'];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** the per-frame recorder (shots.mjs's, plus the wall clock so beats can be cut) */
const RECORDER = () => {
  const w = window;
  w.__rec = [];
  w.__recOn = true;
  const tick = () => {
    if (!w.__recOn) return;
    const p = w.__camPose();
    w.__rec.push([p.t, p.x, p.y, p.z, p.pitch, p.yaw, p.seq, p.driven ? 1 : 0, w.__drawCalls ?? 0, p.dur, performance.now(), p.conducted ? 1 : 0]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const shortAngle = (d) => ((d + 540) % 360) - 180;

function robustDrawPeak(samples) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => b - a);
  const drop = sorted.length >= 50 ? Math.max(1, Math.round(sorted.length * DRAW_PEAK_TRIM)) : 0;
  return sorted[drop] ?? sorted[0];
}

/** shots.mjs's differentiate(), with the wall-clock span of each leg kept */
function differentiate(rec) {
  const legs = new Map();
  for (let i = 1; i < rec.length; i++) {
    const a = rec[i - 1], b = rec[i];
    if (a[6] !== b[6]) continue;
    if (!a[7] || !b[7]) continue;
    const dt = b[0] - a[0];
    if (dt <= 0) continue;
    const d = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]);
    const dyaw = Math.abs(shortAngle(b[5] - a[5]));
    const dpitch = Math.abs(b[4] - a[4]);
    const k = String(b[6]);
    if (!legs.has(k)) legs.set(k, { seq: b[6], samples: [], chord: 0, seconds: 0, dur: b[9], from: a[10], to: b[10], conducted: !!b[11], yawSpan: 0, pitchSpan: 0 });
    const L = legs.get(k);
    L.samples.push({ mps: d / dt, dps: Math.max(dyaw, dpitch) / dt, dt });
    L.chord += d; L.seconds += dt; L.to = b[10]; L.yawSpan += dyaw; L.pitchSpan += dpitch;
  }
  for (const L of legs.values()) {
    const smooth = (key) => {
      let worst = 0;
      for (let i = 0; i + COMFORT_WINDOW <= L.samples.length; i++) {
        let num = 0, den = 0;
        for (let j = i; j < i + COMFORT_WINDOW; j++) { num += L.samples[j][key] * L.samples[j].dt; den += L.samples[j].dt; }
        worst = Math.max(worst, num / den);
      }
      return L.samples.length < COMFORT_WINDOW ? Math.max(0, ...L.samples.map((s) => s[key])) : worst;
    };
    L.peakMps = Math.max(0, ...L.samples.map((s) => s.mps));
    L.peakDps = Math.max(0, ...L.samples.map((s) => s.dps));
    L.sustainedMps = smooth('mps');
    L.sustainedDps = smooth('dps');
    L.frames = L.samples.length;
    delete L.samples;
  }
  // a turn in place is a leg too (the conducted looks move no metres)
  return [...legs.values()].filter((L) => L.frames >= 3 && (L.chord > 0.01 || L.yawSpan > 0.5 || L.pitchSpan > 0.5));
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
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  // the favicon's 404 is the dev server's, not the piece's: report failed resources by URL, not by console line
  page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' && !/Failed to load resource/.test(t)) || /ASSERT|Invalid batch/i.test(t)) errors.push(t.slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree && window.__camPose, { timeout: 30000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
  await wait(4000);   // batching, the first settled frames
  await page.evaluate(RECORDER);

  const beats = [];
  const now = () => page.evaluate(() => performance.now());
  let open = null;
  const beat = async (name, note = '') => {
    const t = await now();
    if (open) { open.to = t; beats.push(open); }
    open = { name, note, from: t, to: t };
    console.log(`▸ ${name}${note ? ' — ' + note : ''}`);
  };
  const press = async (id) => {
    const ok = await page.evaluate((id) => {
      const b = window.__os.e4.browser;
      const h = (b.hits || []).find((r) => r.id === id);
      if (!h) return false;
      return window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2);
    }, id);
    if (!ok) errors.push(`press ${id}: not pressable here`);
    return ok;
  };
  const cam = async (x, y, z, pitch, yaw) => {
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [x, y, z, pitch, yaw]);
    await wait(500);
  };
  const SEAT = [4.4, 1.16, 0.7, 0, 270];
  // ── the visor's frame: how much of the glass the edge darkens (measured while worn) ──
  const measureVisor = () => page.evaluate(() => {
    const os = window.__os;
    const c = os.canvas || null;   // the ONE UI surface: the visor textures the OS canvas
    if (!c) return null;
    const ctx = c.getContext('2d');
    const { width: W, height: H } = c;
    const row = ctx.getImageData(0, Math.floor(H / 2), W, 1).data;
    const col = ctx.getImageData(Math.floor(W / 2), 0, 1, H).data;
    const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    // the centre as a MEAN over the middle fifth (a dark glyph at the exact centre must not be the reference)
    let cs = 0, cn = 0;
    for (let x = Math.floor(W * 0.4); x < Math.floor(W * 0.6); x++) { cs += lum(row, x * 4); cn++; }
    const centre = cs / cn;
    const at = (d, n, frac, fromEnd) => { const k = Math.min(n - 1, Math.round(n * frac)); return lum(d, (fromEnd ? n - 1 - k : k) * 4) / Math.max(1, centre); };
    const FR = [0, 0.02, 0.05, 0.1, 0.2];
    return { W, H, centre: +centre.toFixed(0),
      left: FR.map((f) => +at(row, W, f, false).toFixed(2)), right: FR.map((f) => +at(row, W, f, true).toFixed(2)),
      top: FR.map((f) => +at(col, H, f, false).toFixed(2)), bottom: FR.map((f) => +at(col, H, f, true).toFixed(2)), fr: FR };
  }).catch(() => null);
  let visor = null;

  // ── 1 · the desk ──
  await cam(...SEAT);
  await page.evaluate(() => { window.__os.debugJump('e4Standby'); window.__os.e4.beginSession(0.3); });
  await beat('desk · boot + browser', 'the docked monitor, the room');
  await wait(7500);
  await press('search-open'); await wait(7500);
  await press('agent-begin'); await wait(1200);
  await beat('desk · the five steps');
  await press('step-record'); await wait(6400);
  await press('step-photos'); await wait(1000);
  await press('file-0'); await wait(900);
  await press('file-1'); await wait(9700);
  await press('step-care'); await wait(6000);
  await press('step-chat'); await wait(7500);
  await press('step-search'); await wait(3000);

  // ── 2 · the visor ──
  await beat('visor · session', 'the correction session on the glass');
  await page.evaluate(() => window.__os.e4.wear());
  await wait(4000);
  visor = await measureVisor();
  await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 45000 });
  await wait(600);
  await beat('visor · the struggle', "Junie's link, the filter fighting the room");
  await page.evaluate(() => {
    const b = window.__os.e4.ball; const h = (b.hits || [])[0];
    if (h) window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2);
  });
  await wait(16000);
  await beat('world · seat, facing the stage', 'hall + crowd + stream, the seat frame');
  await wait(4000);
  await cam(4.4, 1.16, 0.7, 0, 300);
  await beat('world · look left');
  await wait(3000);
  await cam(4.4, 1.16, 0.7, 0, 240);
  await beat('world · look right');
  await wait(3000);
  await cam(4.4, 1.16, 0.7, 0, 90);
  await beat('world · look behind');
  await wait(3000);
  await cam(...SEAT);

  // ── 3 · the ball ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('ball'));
  await beat('ball · the stream, from the seat');
  await wait(6000);
  await page.evaluate(() => window.__requestMove('commons-crowd'));
  await beat('ball · the cut to the crowd + the stream from there');
  await wait(7000);
  await page.evaluate(() => window.__requestMove('commons-stage'));
  await wait(3000);
  await beat('ball · first intrusion (42 s)');
  await wait(24000);
  await beat('ball · second intrusion, holding');
  await wait(44000);
  await page.evaluate(() => window.__requestMove('commons-crowd'));
  await wait(5000);

  // ── 4 · the termination, the glitch, the Close ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('after'));
  await beat('termination · both screens fail + the conducted look');
  await wait(20000);
  await beat('close · travel');
  await wait(26000);
  await beat('close · look up');
  await wait(18000);
  await beat('close · hold, night falls');
  await wait(21000);
  await beat('close · open + the panels');
  await wait(30000);
  await beat("close · Daniel's monitor + the Restart card");
  await wait(14000);
  await beat('end');

  const rec = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
  const legs = differentiate(rec);
  const panelSizes = await page.evaluate(() => window.__closePanelSizes || null);


  // ── the panels at their radius: angular sizes from cluster.json + pointCloud.ts ──
  const cluster = JSON.parse(fs.readFileSync(path.resolve('data/room/cluster.json'), 'utf8'));
  const P = cluster.pointCloud.panel;
  const deg = (r) => r * 180 / Math.PI;
  const pxPerM = 1536 / P.w;   // the atlas cell is 1536×768 for w×h
  const angH = deg(2 * Math.atan2(P.w / 2, P.radius));
  const angV = deg(2 * Math.atan2(P.h / 2, P.radius));
  const QUEST_PPD = 25;   // Quest 3, centre of the lens, published order of magnitude
  const textAt = (px) => { const m = px / pxPerM; const a = deg(2 * Math.atan2(m / 2, P.radius)); return { px, m: +m.toFixed(4), deg: +a.toFixed(2), questPx: +(a * QUEST_PPD).toFixed(1) }; };

  // ── the report ──
  const L = [];
  L.push(`# Quest numbers · Era 4 · ${new Date().toISOString()}`);
  L.push('');
  L.push(`Budget: ≤${DRAW_CALL_BUDGET} draw calls; comfort ≤${COMFORT_MPS} m/s, ≤${COMFORT_DPS} °/s (sustained over ${COMFORT_WINDOW} frames). ${rec.length} frames recorded.`);
  L.push('');
  L.push('## Draw calls per beat');
  L.push('');
  L.push('| beat | frames | peak (robust) | mean | budget |');
  L.push('|---|---|---|---|---|');
  let worst = 0;
  for (const b of beats) {
    const frames = rec.filter((r) => r[10] >= b.from && r[10] < b.to).map((r) => r[8]);
    if (!frames.length) continue;
    const peak = robustDrawPeak(frames);
    const mean = frames.reduce((a, c) => a + c, 0) / frames.length;
    worst = Math.max(worst, peak);
    L.push(`| ${b.name}${b.note ? ' — ' + b.note : ''} | ${frames.length} | **${peak}** | ${mean.toFixed(0)} | ${peak > DRAW_CALL_BUDGET ? '⚠ OVER by ' + (peak - DRAW_CALL_BUDGET) : 'ok'} |`);
  }
  L.push('');
  L.push(`Worst robust peak: **${worst}** (${worst > DRAW_CALL_BUDGET ? 'OVER' : 'under'} the ${DRAW_CALL_BUDGET} budget).`);
  L.push('');
  L.push('## Driven legs (every camera curve the piece flew, in order)');
  L.push('');
  L.push('| beat | leg | conducted | dur s | chord m | yaw° | pitch° | peak m/s | sust m/s | peak °/s | sust °/s | verdict |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  let legFails = 0;
  for (const g of legs) {
    const b = beats.find((x) => g.from >= x.from && g.from < x.to);
    const bad = g.sustainedMps > COMFORT_MPS || g.sustainedDps > COMFORT_DPS;
    if (bad) legFails++;
    L.push(`| ${b ? b.name : '?'} | #${g.seq} | ${g.conducted ? 'yes' : ''} | ${g.dur.toFixed(1)} | ${g.chord.toFixed(2)} | ${g.yawSpan.toFixed(0)} | ${g.pitchSpan.toFixed(0)} | ${g.peakMps.toFixed(3)} | ${g.sustainedMps.toFixed(3)} | ${g.peakDps.toFixed(2)} | ${g.sustainedDps.toFixed(2)} | ${bad ? '⚠ OVER' : 'ok'} |`);
  }
  L.push('');
  L.push(`${legs.length} legs, ${legFails} over the envelope.`);
  L.push('');
  L.push("## The visor's frame (luminance in from each edge, as a fraction of the centre's — off the glass canvas while worn)");
  L.push('');
  if (visor) {
    L.push(`Canvas ${visor.W}×${visor.H}, centre ≈ ${visor.centre}. Columns: ${visor.fr.map((f) => (f * 100) + '% in').join(' · ')}.`);
    L.push('');
    L.push('| edge | ' + visor.fr.map((f) => (f * 100) + '%').join(' | ') + ' |');
    L.push('|---|' + visor.fr.map(() => '---').join('|') + '|');
    for (const e of ['left', 'right', 'top', 'bottom']) L.push(`| ${e} | ${visor[e].join(' | ')} |`);
    L.push('');
    L.push('1.00 = as bright as the centre; the visor edge is a vignette, and a value under 0.5 is a frame the eye reads as a border.');
  } else L.push('(no `__os.canvas` — not measured)');
  L.push('');
  L.push(`## The Close's panels at ${P.radius} m (from data/room/cluster.json + pointCloud.ts)`);
  L.push('');
  L.push(`Card ${P.w} × ${P.h} m → **${angH.toFixed(1)}° wide × ${angV.toFixed(1)}° tall**. Atlas cell 1536 × 768 px → ${pxPerM.toFixed(0)} px/m.`);
  L.push(`Reading-face paragraph steps 34 → 22 px to fit. At ~${QUEST_PPD} px/° (Quest 3, lens centre):`);
  for (const px of [34, 28, 22]) { const t = textAt(px); L.push(`- ${px} px line = ${t.m} m = ${t.deg}° = **~${t.questPx} headset px** per line height`); }
  L.push('');
  if (panelSizes) {
    L.push('The size each panel actually landed on at the Close (this run, with the player\'s own lines under the paragraph):');
    L.push('');
    L.push('| panel | paragraph px | rows | your lines | headset px/line |');
    L.push('|---|---|---|---|---|');
    for (const [i, p] of Object.entries(panelSizes)) L.push(`| ${['1997', '2003', '2016', '2026'][i] ?? i} | ${p.size} | ${p.rows} | ${p.mine} | ~${textAt(p.size).questPx}${p.size <= 24 ? ' ⚠' : ''} |`);
  } else L.push('(the panels\' sizes were not published — `__closePanelSizes` missing)');
  L.push('');
  L.push('A 22 px line lands under a 15-px-per-line floor in the headset; 28 px and above read. The paragraph fits at 34 for most panels — the fit step is the risk, and the fix is more card, not smaller text.');
  L.push('');
  L.push('## Page errors / asserts');
  L.push('');
  L.push(errors.length ? errors.map((e) => `- ${e}`).join('\n') : 'none');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, L.join('\n') + '\n');
  console.log(L.join('\n'));
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
