#!/usr/bin/env node
/**
 * CALENDAR PREVIEW — the four calendar pages (src/room/calendarArt.ts) as PNGs,
 * without the browser.
 *
 *     node tools/calendar_preview.mjs [scale]     # → out/calendar/page-e1..e4.png + sheet.png (default ×4)
 *
 * ⚑ WHY (S177). The pages are pixel art drawn at 80 × 152 and seen from three metres;
 * getting them good (his D1: "make the pixel art good") means looking at every pixel,
 * many times, and a walk + a still per look is minutes each. The drawing speaks only
 * `fillStyle` + `fillRect`, so this bundles it with esbuild and paints into a buffer.
 * No dependencies beyond esbuild (already the build's) and node's zlib.
 */
import { build } from 'esbuild';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCALE = Number(process.argv[2] ?? 4);
const out = await build({
  entryPoints: [join(ROOT, 'src/room/calendarArt.ts')], bundle: true, write: false, format: 'esm', platform: 'node'
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const { drawCalendarPage, PAGE_W, PAGE_H } = mod;

function painter(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  return {
    buf, fillStyle: '#000000',
    fillRect(x, y, rw, rh) {
      const n = parseInt(String(this.fillStyle).slice(1), 16);
      for (let j = Math.max(0, Math.floor(y)); j < Math.min(h, Math.floor(y + rh)); j++)
        for (let i = Math.max(0, Math.floor(x)); i < Math.min(w, Math.floor(x + rw)); i++) {
          const o = (j * w + i) * 4; buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
        }
    }
  };
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const upscale = (src, w, h, s) => {
  const d = Buffer.alloc(w * s * h * s * 4);
  for (let y = 0; y < h * s; y++) for (let x = 0; x < w * s; x++) src.copy(d, (y * w * s + x) * 4, (((y / s) | 0) * w + ((x / s) | 0)) * 4, (((y / s) | 0) * w + ((x / s) | 0)) * 4 + 4);
  return d;
};

const dir = join(ROOT, 'out/calendar');
mkdirSync(dir, { recursive: true });
const GAP = 4;
const sheet = painter(4 * PAGE_W + 5 * GAP, PAGE_H + 2 * GAP);
sheet.fillStyle = '#3a3a40'; sheet.fillRect(0, 0, 4 * PAGE_W + 5 * GAP, PAGE_H + 2 * GAP);
['e1', 'e2', 'e3', 'e4'].forEach((era, i) => {
  const p = painter(PAGE_W, PAGE_H);
  drawCalendarPage(p, era);
  writeFileSync(join(dir, `page-${era}.png`), png(PAGE_W * SCALE, PAGE_H * SCALE, upscale(p.buf, PAGE_W, PAGE_H, SCALE)));
  for (let y = 0; y < PAGE_H; y++) p.buf.copy(sheet.buf, ((y + GAP) * (4 * PAGE_W + 5 * GAP) + GAP + i * (PAGE_W + GAP)) * 4, y * PAGE_W * 4, (y + 1) * PAGE_W * 4);
});
const SW = 4 * PAGE_W + 5 * GAP, SH = PAGE_H + 2 * GAP;
writeFileSync(join(dir, 'sheet.png'), png(SW * SCALE, SH * SCALE, upscale(sheet.buf, SW, SH, SCALE)));
console.log(`wrote out/calendar/page-e1..e4.png + sheet.png (×${SCALE})`);
