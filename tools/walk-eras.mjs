#!/usr/bin/env node
/**
 * WALK THE ERAS — four walks side by side, one from the start of each era, to the Close.
 *
 *     node tools/walk-eras.mjs --port 3000              # e1 (from the front door), e2, e3, e4
 *     node tools/walk-eras.mjs --port 3000 --eras 2,4   # only some
 *
 * ⚑ WHY (S223, his 2026-10-09: "be sure that the walk can be done after big changes and not just small ones, so
 * we can take better advantage"). The full walk (tools/walk.mjs --require-close) is the gate and stays the gate:
 * it is the only thing that proves a player can get from the front door to the Close. But it takes about an hour,
 * and after a big change the first thing worth knowing is WHICH era broke. Each child here boots with
 * `--from-era N` (the piece's own `?era=N` arrival, room and all), walks forward by pressing, and must reach the
 * NEXT era (`--one-era`; Era 4 to the Close); the four run at once, so the answer comes in roughly the time of
 * the longest era (Era 4, with the ball).
 *
 * A from-era walk is NOT a reachability proof (the ledger has none of the earlier eras' choices), so its reports
 * go to out/walks/ and never over docs/reinterp/WALK_*.md. Read each child's STOPPED BECAUSE first.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PORT = flag('port', '3000');
const ERAS = flag('eras', '1,2,3,4').split(',').map(Number).filter((n) => n >= 1 && n <= 4);
const MAX = flag('max', '2000');
const LOGS = join(ROOT, 'out/walks');
mkdirSync(LOGS, { recursive: true });

const t0 = Date.now();
const runs = ERAS.map((n) => new Promise((resolve) => {
  // one era each: e1 from the front door to 2003's arrival, e2 to 2016's, e3 to 2026's, e4 to the Close
  const args = ['tools/walk.mjs', '--port', PORT, '--max', MAX, '--one-era', '--from-era', String(n)];
  if (flag('cut', '')) args.push('--cut', flag('cut', ''));   // S227: --cut speedrun walks the Speedrun Version
  const log = join(LOGS, `walk-e${n}.log`);
  const out = [];
  const child = spawn(process.execPath, args, { cwd: ROOT });
  child.stdout.on('data', (d) => out.push(d));
  child.stderr.on('data', (d) => out.push(d));
  child.on('close', (code) => {
    const text = Buffer.concat(out).toString();
    writeFileSync(log, text);
    const reached = /✓ one era: walked from/.test(text);
    const stop = (text.match(/^\s*\d+\s+stop\s+(.*)$/m) || [])[1] || '';
    const tail = text.trim().split('\n').slice(-3).join(' / ');
    resolve({ era: n, code, reached, stop: stop.trim(), tail, minutes: ((Date.now() - t0) / 60000).toFixed(1), log });
  });
}));

console.log(`walking era${ERAS.length > 1 ? 's' : ''} ${ERAS.join(', ')} side by side on :${PORT} — logs in out/walks/`);
const results = await Promise.all(runs);
console.log('\n── results ──');
for (const r of results) {
  console.log(`e${r.era}: ${r.reached ? '✓ walked through' : '✗ did NOT get through'} (${r.minutes} min, exit ${r.code})` +
    (r.reached ? '' : `\n    ${r.stop || r.tail}\n    log: ${r.log}`));
}
console.log('\nA from-era walk is not a reachability proof; the gate is still: node tools/walk.mjs --port ' + PORT + ' --max 2600 --require-close');
process.exit(results.every((r) => r.reached) ? 0 : 1);
