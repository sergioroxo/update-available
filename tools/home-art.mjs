#!/usr/bin/env node
/**
 * HOME ART — builds public/home/ from GPT's round-4 LambyOS Home layers (S231).
 *
 *     node tools/home-art.mjs <round4-dir>     # e.g. …/output/lambyos-home/round4
 *
 * WHY A SCRIPT, NOT THE MASTERS. The round-4 layers are lossless 4K PNGs (~28 MB). The game ships
 * WebP derivatives of each layer at TWO sizes — `_l` is the full 4K-coordinate size, `_s` is half of
 * it — and src/desktop/home/homeArt.ts picks per screen (devicePixelRatio × drawn size). Layers that
 * are byte-identical in the laptop and phone sets (the notice, the plaque, the toys…) are written once.
 * The script also writes src/desktop/home/homeArtManifest.json (name → file stem + 4K size) so the
 * runtime never guesses a file name.
 *
 * Needs `cwebp` (brew install webp) — a local tool; nothing is downloaded. Provenance of the art:
 * image generation by GPT (OpenAI) at the project's direction, 2026 (assets/LICENSES.md, ATTRIBUTIONS.md).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const src = process.argv[2];
if (!src) { console.error('usage: node tools/home-art.mjs <round4-dir>'); process.exit(1); }
const assets = join(src, 'assets');
const out = join(ROOT, 'public/home');
mkdirSync(out, { recursive: true });

const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const manifest = {};
const byHash = new Map();
for (const f of readdirSync(assets).filter((n) => n.endsWith('.png')).sort()) {
  const m = f.match(/^(.*)-(laptop|phone)\.png$/);
  if (!m) continue;
  const [, name, layout] = m;
  const buf = readFileSync(join(assets, f));
  const hash = createHash('sha256').update(buf).digest('hex');
  const [w, h] = pngSize(buf);
  let stem = byHash.get(hash);
  if (!stem) {
    stem = `lh_${name.replace(/-/g, '_')}_${layout}`;
    byHash.set(hash, stem);
    const half = [Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))];
    // `_l`: the layer at its full coordinate size; `_s`: half of it. Alpha kept at full quality.
    execFileSync('cwebp', ['-quiet', '-q', '90', '-alpha_q', '100', '-m', '6', join(assets, f), '-o', join(out, `${stem}_l.webp`)]);
    execFileSync('cwebp', ['-quiet', '-q', '90', '-alpha_q', '100', '-m', '6', '-resize', String(half[0]), String(half[1]), join(assets, f), '-o', join(out, `${stem}_s.webp`)]);
  }
  manifest[`${name}-${layout}`] = { stem, w, h };
}
writeFileSync(join(ROOT, 'src/desktop/home/homeArtManifest.json'), JSON.stringify(manifest, null, 1) + '\n');
let total = 0;
for (const n of readdirSync(out)) total += statSync(join(out, n)).size;
console.log(`${Object.keys(manifest).length} layers -> ${byHash.size} unique, ${readdirSync(out).length} files, ${(total / 1048576).toFixed(1)} MB in public/home/`);
