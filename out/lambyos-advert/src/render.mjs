#!/usr/bin/env node
/**
 * RENDER — LambyOS — Welcome Home, frame by frame, into an H.264 MP4.
 *
 *   python3 out/lambyos-advert/src/make_audio.py --work .advert-tmp     # voice, music, timeline.json
 *   node out/lambyos-advert/src/plates.mjs --port 3000                   # the four rooms (vite dev server running)
 *   node out/lambyos-advert/src/render.mjs                               # → out/lambyos-advert/lambyos_welcome_home.mp4
 *   node out/lambyos-advert/src/render.mjs --stills 0,300,900            # review frames only (PNG, .advert-tmp/stills)
 *
 * Deterministic, like tools/render-video.mjs: nothing is timed by the wall clock. advert.ts is bundled with esbuild,
 * served from a throwaway local server (the page, the piece's GLBs from public/assets/models, the room plates), and
 * headless Chromium is asked for frame N, which it draws and hands back as a JPEG; each goes straight into ffmpeg's
 * stdin. The soundtrack is muxed from .advert-tmp/advert_audio.wav. Then a 12-frame contact sheet.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC = path.join(ROOT, 'out/lambyos-advert/src');
const OUTDIR = path.join(ROOT, 'out/lambyos-advert');
const WORK = path.join(ROOT, '.advert-tmp');
const WWW = path.join(WORK, 'www');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const STILLS = flag('stills', '');
const FROM = Number(flag('from', 0)), TO = flag('to', '');
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MP4 = path.join(OUTDIR, 'lambyos_welcome_home.mp4');

async function bundle() {
  fs.mkdirSync(WWW, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(SRC, 'advert.ts')], bundle: true, format: 'esm', target: 'es2022',
    outfile: path.join(WWW, 'advert.js'), loader: { '.json': 'json' }, logLevel: 'warning', external: ['node:*'],
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env': '{"DEV":false,"PROD":true}' }
  });
  fs.writeFileSync(path.join(WWW, 'index.html'),
    '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style><script type="module" src="advert.js"></script>');
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = null;
    if (url.startsWith('/assets/')) file = path.join(ROOT, 'public', url);
    else if (url.startsWith('/plates/')) file = path.join(WORK, url);
    else file = path.join(WWW, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function main() {
  const timeline = JSON.parse(fs.readFileSync(path.join(WORK, 'timeline.json'), 'utf8'));
  await bundle();
  const server = await serve();
  const port = server.address().port;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--font-render-hinting=none'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }, protocolTimeout: 600000
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.advert, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate((tl) => window.advert.init(tl), timeline);
  console.log(`frames: ${total} (${timeline.duration}s @ ${timeline.fps})`);
  const grab = async (f) => Buffer.from((await page.evaluate((n) => window.advert.renderFrame(n), f)).split(',')[1], 'base64');

  if (STILLS) {
    const dir = path.join(WORK, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of STILLS.split(',')) {
      const f = s.endsWith('s') ? Math.round(Number(s.slice(0, -1)) * timeline.fps) : Number(s);
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(4, '0')}.jpg`), await grab(f));
      console.log(`  still ${f}`);
    }
  } else {
    const last = TO ? Number(TO) : total;
    const silent = path.join(WORK, 'video_only.mp4');
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(timeline.fps), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = FROM; f < last; f++) {
      const buf = await grab(f);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`  frame ${f}/${last}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', path.join(WORK, 'advert_audio.wav'),
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', MP4]);
    console.log(`→ ${path.relative(ROOT, MP4)}`);
    // the contact sheet: 12 frames, one from each beat
    const at = ['ident', 'kitchen', 'parade', 'parade', 'parade', 'flow', 'rooms', 'rooms', 'pack', 'collapse', 'gather', 'end'];
    const pick = { parade: [0.3, 0.6, 0.88], rooms: [0.2, 0.85] };
    const used = {};
    const times = at.map((id) => {
      const s = timeline.shots.find((x) => x.id === id);
      const i = used[id] = (used[id] ?? -1) + 1;
      const k = pick[id]?.[i] ?? (id === 'ident' ? 0.8 : id === 'end' ? 0.6 : 0.7);
      return s.start + (s.end - s.start) * k;
    });
    const sheetDir = path.join(WORK, 'sheet'); fs.rmSync(sheetDir, { recursive: true, force: true }); fs.mkdirSync(sheetDir, { recursive: true });
    times.forEach((tt, i) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', tt.toFixed(3), '-i', MP4, '-frames:v', '1', '-vf',
      `scale=640:360,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf:text='${at[i]}  ${tt.toFixed(1)}s':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6`,
      path.join(sheetDir, `${String(i).padStart(2, '0')}.png`)]));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-i', path.join(sheetDir, '%02d.png'), '-vf', 'tile=4x3:padding=6:color=black', '-frames:v', '1',
      path.join(OUTDIR, 'contact_sheet.png')]);
    console.log(`→ out/lambyos-advert/contact_sheet.png`);
  }
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
