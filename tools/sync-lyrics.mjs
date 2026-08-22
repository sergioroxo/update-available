/**
 * SYNC-LYRICS — re-time a tape's captions from a word-level Whisper transcript.
 *
 * ⚑ WHY. `tapes.ts` says it outright: "captions are hand-paced against lyric
 * sheets." The prayer's song captions sat on a perfect 10-second grid —
 * 18, 28, 38, 48… — and no song is on a 10-second grid, so the drift compounded
 * until Sérgio reported: *"I press the prayer and it is very slow to start
 * playing, can only hear the noise. The lyrics are not synced."*
 *
 * ⚑⚑ THE RULE THIS TOOL OBEYS: **it takes TIMINGS from Whisper and never TEXT.**
 * Whisper hears "Hold my hands" where the authored lyric is "Fold my hands" —
 * a transcription artifact, not a correction. The words in `data/` are authored
 * and stay authored; only `at` is rewritten. A sync tool that quietly edited the
 * lyrics would be worse than an unsynced caption.
 *
 *   node tools/sync-lyrics.mjs <tapeId> "<whisper.json>" [--offset N] [--write]
 *
 * `--offset` is the tape-time second at which the audio begins (the prayer's
 * song starts after four spoken intro captions, so its offset is that segment's
 * own `at`). Without `--write` it prints the diff and changes nothing.
 */
import fs from 'node:fs';

const [tapeId, whisperPath] = process.argv.slice(2);
const offset = Number((process.argv.find((a, i) => process.argv[i - 1] === '--offset')) ?? 0);
const write = process.argv.includes('--write');
if (!tapeId || !whisperPath) { console.error('usage: sync-lyrics <tapeId> <whisper.json> [--offset N] [--write]'); process.exit(1); }

const TAPES = 'data/dialog/s1_tapes.json';
const data = JSON.parse(fs.readFileSync(TAPES, 'utf8'));
const tape = data.tapes.find((t) => t.id === tapeId);
if (!tape) { console.error(`no tape "${tapeId}"`); process.exit(1); }

const words = JSON.parse(fs.readFileSync(whisperPath, 'utf8'))
  .segments.flatMap((s) => s.words ?? []);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
const stream = words.map((w) => ({ t: w.start, w: norm(w.word)[0] ?? '' })).filter((x) => x.w);

/** Find where a caption begins in the word stream, searching forward only —
 *  a lyric repeats ("Make me new, make me right" twice), so position matters
 *  as much as text, and going backwards would snap the reprise to the first
 *  chorus. `from` is the cursor left by the previous caption. */
function findStart(caption, from) {
  const want = norm(caption).filter((w) => w.length > 2);
  if (!want.length) return null;
  let best = null, bestScore = 0;
  for (let i = from; i < stream.length; i++) {
    let hit = 0;
    for (let k = 0; k < Math.min(6, want.length); k++) {
      if (stream[i + k] && stream[i + k].w === want[k]) hit++;
    }
    // ⚑ first word must match: a caption starts where its first word is sung
    if (stream[i].w !== want[0]) continue;
    if (hit > bestScore) { bestScore = hit; best = i; if (hit >= Math.min(4, want.length)) break; }
  }
  return best === null ? null : { i: best, t: stream[best].t };
}

let cursor = 0; const rows = []; const writes = [];
for (const seg of tape.segments) {
  if (!seg.audio) { rows.push([seg.at, seg.at, seg.caption, 'no audio — untouched']); continue; }
  // ⚑ THE FIRST SUNG CAPTION IS ANCHORED, NEVER SEARCHED. It begins where the
  // audio begins — that is not a guess, it is arithmetic — and searching for it
  // is actively harmful: on tapeC the recording sings "Restore the HOPE… restore
  // the JOY" against an authored "Restore the HOME… restore the CHILD", so the
  // matcher scored the opening chorus badly, fled forward, and locked onto a
  // REPRISE 54 seconds later. Every later caption then inherited that offset.
  // A search that can be wrong by a whole verse must not run where the answer
  // is already known.
  if (cursor === 0 && stream.length) {
    const at = Math.round((stream[0].t + offset) * 100) / 100;
    rows.push([seg.at, at, seg.caption, 'anchored to audio start']);
    if (write) writes.push([seg.id, at]);
    cursor = 1; continue;
  }
  const hit = findStart(seg.caption, cursor);
  if (!hit) {
    // ⚑ A caption Whisper cannot match is usually a MIS-HEARING, not a missing
    // line: it transcribes "Hold my hands" where the authored lyric is "Fold my
    // hands". For the FIRST sung caption the answer is unambiguous — it starts
    // where the audio starts — so anchor it there rather than leaving it on a
    // hand-paced guess. Later unmatched captions keep their authored time and
    // are reported, because guessing a position inside a song is how a sync
    // tool silently makes things worse.
    const first = cursor === 0 && stream.length;
    const at = first ? Math.round((stream[0].t + offset) * 100) / 100 : seg.at;
    rows.push([seg.at, at, seg.caption, first ? 'anchored to audio start' : '⚑ NOT FOUND — left as authored']);
    if (write && first) writes.push([seg.id, at]);
    if (first) cursor = 1;
    continue;
  }
  cursor = hit.i + 1;
  const at = Math.round((hit.t + offset) * 100) / 100;
  rows.push([seg.at, at, seg.caption, at === seg.at ? '' : `${(at - seg.at) >= 0 ? '+' : ''}${Math.round((at - seg.at) * 10) / 10}s`]);
  if (write) writes.push([seg.id, at]);
}

console.log(`\n${tapeId} — offset ${offset}s\n`);
for (const [was, now, cap, note] of rows) {
  console.log(`  ${String(was).padStart(7)} → ${String(now).padStart(7)}  ${note.padEnd(24)} ${cap.slice(0, 46)}`);
}
if (write) {
  // ⚑ SURGICAL, NEVER JSON.stringify. Re-serialising this file reformats every
  // array in it — 325 insertions for fifty changed numbers — which buries the
  // real edit and has already happened twice in this project on other data
  // files. Patch the `at` of each named segment in the raw text and touch
  // nothing else.
  let raw = fs.readFileSync(TAPES, 'utf8');
  let patched = 0;
  for (const [id, at] of writes) {
    const re = new RegExp('("id"\\s*:\\s*"' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]{0,160}?"at"\\s*:\\s*)(-?[0-9.]+)');
    const before = raw;
    raw = raw.replace(re, `$1${at}`);
    if (raw !== before) patched++;
    else console.log(`  ⚠ could not patch ${id} in place`);
  }
  fs.writeFileSync(TAPES, raw);
  JSON.parse(fs.readFileSync(TAPES, 'utf8'));   // prove it still parses
  console.log(`\n⚑ ${patched} timings written surgically to ${TAPES}`);
}
else console.log('\n(dry run — pass --write to apply)');
