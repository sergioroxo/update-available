/**
 * S362 (UiB job 13 Part C) — review photographs for the 2016 items (H28, H40-H45), before/after.
 * Usage: node tools/s362-2016-stills.mjs <port> <tag>   e.g.  ... 3203 before
 * Draws the live GraceQueueLite (window.__graceQueue()) into offscreen canvases and writes PNGs to out/s362/2016/.
 * Review-only: it reads and drives the debug beats, nothing else.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 3203, tag = process.argv[3] || 'after';
const OUT = process.env.S362_OUT || '/Users/sergiogalvaoroxo/update-available-uib/out/s362/2016';
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0&era=3`, { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => window.__graceQueue?.());
  await new Promise(r => setTimeout(r, 4500));
  const shots = await p.evaluate((tag) => {
    const q = window.__graceQueue();
    const out = {};
    const mk = (w, h, s) => { const c = document.createElement('canvas'); c.width = w * s; c.height = h * s; const x = c.getContext('2d'); x.scale(s, s); return [c, x]; };
    const snap = (name, w, h, s, fn) => { const [c, x] = mk(w, h, s); fn(x); out[`${name}-${tag}`] = c.toDataURL(); };
    q.lambyGuide = null; q.pauseOpen = false; q.seenTask = true;
    q.debugBeat('board');
    // Orla's evening thread + banner, Mam's message
    q.phone.atRest = true; q.phone.bannersHidden = false;
    for (const id of ['arrival', 'mentor', 'decision']) { q.phone.arrive(id); q.phone.bannerAge = 99; q.phone.tick(0.1); q.phone.atRest = true; }
    snap('phone-lock', 180, 360, 3, x => { q.phone.debugBeat('lock'); q.phone.draw(x, 180, 360); });
    snap('phone-inbox', 180, 360, 3, x => { q.phone.debugBeat('inbox'); q.phone.draw(x, 180, 360); });
    snap('phone-thread-orla', 180, 360, 3, x => { q.phone.pressControl('evening:Orla'); q.phone.draw(x, 180, 360); });
    snap('phone-thread-mam', 180, 360, 3, x => { q.phone.pressControl('evening:Mam'); q.phone.draw(x, 180, 360); });
    snap('phone-home', 180, 360, 3, x => { q.phone.debugBeat('home'); q.phone.draw(x, 180, 360); });
    snap('phone-group-news', 180, 360, 3, x => { q.phone.debugBeat('news'); q.phone.draw(x, 180, 360); });
    snap('phone-article', 180, 360, 3, x => { q.phone.pressControl('link2'); q.phone.draw(x, 180, 360); });
    snap('phone-notes', 180, 360, 3, x => { q.phone.pressControl('notes'); q.phone.draw(x, 180, 360); });
    // the monitor, with the Handset Window large, group news
    q.mode = 'board'; q.veraPage = null; q.mirrorMin = false;
    q.phone.debugBeat('news');
    q.mirrorLarge = true;
    snap('monitor-handset-large', 676, 390, 2, x => { q.draw(x, 676, 390); });
    q.mirrorLarge = false;
    snap('monitor-handset-small', 676, 390, 2, x => { q.phone.debugBeat('inbox'); q.draw(x, 676, 390); });
    // Floppy Sheep: the device screen and in the Handset Window
    snap('floppy-intro', 180, 360, 3, x => { q.floppy.closeGame(); q.floppy.debugBeat('floppy'); q.floppy.draw(x, 180, 360); });
    snap('floppy-play', 180, 360, 3, x => { q.floppy.debugBeat('floppyPlay'); q.floppy.draw(x, 180, 360); });
    snap('floppy-over', 180, 360, 3, x => { q.floppy.debugBeat('floppyOver'); q.floppy.draw(x, 180, 360); });
    snap('monitor-floppy', 676, 390, 2, x => { q.mirrorMin = false; q.draw(x, 676, 390); });
    return out;
  }, tag);
  for (const [n, u] of Object.entries(shots)) fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(Object.keys(shots).join('\n'));
} finally { await b.close(); }
