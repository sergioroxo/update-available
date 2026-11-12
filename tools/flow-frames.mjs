#!/usr/bin/env node
/**
 * ⚑ S369 (UiB job 16) — FIND THE SAME MOMENT IN TWO FLOW-AUDIT RUNS. Given a flow-audit samples dir and a regex, prints the
 * first sample time at which any canvas shows text matching it (optionally in one era), and the audit screenshot (shots/,
 * every --flow-shots seconds) closest after it plus `--after` seconds. Used to pair before/after frames for a photo page.
 *
 *     node tools/flow-frames.mjs <samplesDir> "<regex>" [--era e2] [--after 2] [--nth 1]
 *
 * Prints JSON: { t, era, text, shot } (shot is an absolute path, or null).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dir, pattern, ...rest] = process.argv.slice(2);
const opt = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
const era = opt('era', null), after = Number(opt('after', '2')), nth = Number(opt('nth', '1'));
const re = new RegExp(pattern, 'i');
const root = resolve(dir);
let hit = null, seen = 0;
for (const line of readFileSync(join(root, 'samples.jsonl'), 'utf8').split('\n')) {
  if (!line) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  if (o.k !== 's' || !o.c) continue;
  if (era && o.era !== era) continue;
  let found = null;
  for (const c of Object.values(o.c)) for (const r of c.t || []) if (re.test(r[0])) { found = r[0]; break; }
  if (found && ++seen >= nth) { hit = { t: o.t, era: o.era, text: found }; break; }
}
if (!hit) { console.log(JSON.stringify(null)); process.exit(0); }
const shots = readdirSync(join(root, 'shots')).filter((f) => f.endsWith('.jpg')).map((f) => Number(f.replace('.jpg', ''))).sort((a, b) => a - b);
const want = hit.t + after * 1000;
const shot = shots.find((s) => s >= want) ?? null;
console.log(JSON.stringify({ ...hit, shot: shot ? join(root, 'shots', `${shot}.jpg`) : null }));
