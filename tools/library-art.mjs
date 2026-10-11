#!/usr/bin/env node
/** Library art: local round-1 PNGs → q90 WebP, alpha preserved, at the 2048×1152 room scale. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const source = process.argv[2];
if (!source) throw new Error('Supply output/lambyos-library/round1');
const layout = JSON.parse(readFileSync(join(source, 'layout.json'), 'utf8'));
const out = join(root, 'public/library');
mkdirSync(out, { recursive: true });
const files = new Set([layout.backdrop, ...layout.objects.flatMap(o => Object.values(o.assets))]);
for (const file of files) {
  const input = join(source, file);
  const png = readFileSync(input);
  const w = Math.round(png.readUInt32BE(16) * 2048 / 3840);
  const h = Math.round(png.readUInt32BE(20) * 1152 / 2160);
  const name = 'lib_' + file.split('/').pop().replace('.png', '.webp');
  execFileSync('cwebp', ['-quiet', '-q', '90', '-alpha_q', '100', '-m', '6', '-resize', String(w), String(h), input, '-o', join(out, name)]);
}
writeFileSync(join(root, 'src/desktop/home/libraryLayout.json'), JSON.stringify(layout, null, 1) + '\n');
console.log(files.size + ' Library derivatives written');
