/** ⚑ S405 (UiB job 31, T94) — each story's entries in its own file.
 *
 * Bundles the real record (src/witness/record.ts) and ledger in memory with esbuild (no browser, no server), scripts a
 * 2016 day the way the piece files it — the mothers opened and answered (familyCalls.ts), the four jobs done with each
 * job's own entry (graceQueueLite.ts, placesList.ts, groupTask.ts) and the map's marks (graceQueueLite.ts
 * updateConnections) — and checks where every entry lands:
 *   - 1997 and 2003 hold no family entry and none of 2016's job marks;
 *   - 2016 holds both mothers' entries, under Moderation, with familyCalls' witness lines word for word;
 *   - the 2003 readers of `ledger.checkins` (the pocket pet's mood, its `fed`, checkinDone, Restorify) read the same
 *     thing before and after the 2016 filings;
 *   - `ledger.records` still holds the marks (map.ts, phoneE3.ts and app.ts read them) and recordCount() still counts them.
 * Source guards make sure the scripted day is the piece's: familyCalls files only through familyCheckinId, the job marks
 * are the ones graceQueueLite pushes, and the 2003 readers still skip ids that start with `e3`.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';

const built = await esbuild.build({
  stdin: {
    contents: "export * from './src/witness/record.ts'; export { ledger } from './src/state/ledger.ts';",
    resolveDir: process.cwd(), loader: 'ts', sourcefile: 'record-eras-entry.ts'
  },
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent'
});
// the ledger wipes itself on the page's unload; Node has no window, so give it a place to listen
globalThis.window ??= { addEventListener() {} };
const R = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const { ledger, entriesByEra, recordCount, familyCheckinId, FAMILY_CHECKIN } = R;
const family = JSON.parse(fs.readFileSync('data/dialog/s3_family.json', 'utf8'));
const src = (p) => fs.readFileSync(p, 'utf8');

// ── source guards: the day below is the piece's own ──
const fc = src('src/desktop/apps/familyCalls.ts');
const pushes = fc.match(/ledger\.checkins\.push\(\{ id: [^,]+,/g) ?? [];
assert.ok(pushes.length >= 3, 'familyCalls files its check-ins');
for (const p of pushes) assert.match(p, /id: familyCheckinId\(p\.id\),/, `familyCalls files through familyCheckinId: ${p}`);
const gq = src('src/room/graceQueueLite.ts');
assert.match(gq, /ledger\.records\.push\('e3-job:' \+ id\)/, "graceQueueLite pushes 'e3-job:<id>'");
assert.match(gq, /ledger\.records\.push\('e3-jobs-done'\)/, "graceQueueLite pushes 'e3-jobs-done'");
const JOBS = JSON.parse(gq.match(/const FOUR_JOBS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
const readers = [
  ['src/desktop/os.ts', /find\(\(ch\) => !ch\.id\.startsWith\('e3'\)\)/, 'the pocket pet\'s mood'],
  ['src/desktop/os.ts', /fed: \(\) => ledger\.checkins\.some\(\(ch\) => !ch\.id\.startsWith\('e3'\)\)/, 'the pocket pet\'s fed'],
  ['src/witness/map.ts', /checkinDone: \(\) => ledger\.checkins\.some\(\(c\) => !c\.id\.startsWith\('e3'\)\)/, 'checkinDone'],
  ['src/desktop/apps/restorify.ts', /!ledger\.checkins\.some\(ch => !ch\.id\.startsWith\('e3'\)\)/, 'Restorify']
];
for (const [file, re, name] of readers) assert.match(src(file), re, `${name} (${file}) still skips ids that start with e3`);
assert.ok(FAMILY_CHECKIN.startsWith('e3'), 'the mothers\' prefix starts with e3, so every 2003 reader skips it');

// the 2003 readers, as os.ts / map.ts write them
const petMood = () => {
  const last = [...ledger.checkins].reverse().find((ch) => !ch.id.startsWith('e3'))?.id ?? '';
  return last === 'struggling' ? 'sad' : last === 'tired' ? 'sterile' : last === 'idontknow' || last === 'reminder' ? 'clinical' : 'cheerful';
};
const fed = () => ledger.checkins.some((ch) => !ch.id.startsWith('e3'));
const checkinDone = fed;   // map.ts: the same test

// ── 1997 and 2003, as a visit files them (a few of each; Daniel's own check-in, then the reminder left waiting) ──
ledger.reachedEras.splice(0, ledger.reachedEras.length, 'e1', 'e2');
ledger.records.push('profile-initialized', 'kit-inserted', 'pledge-signed', 'forum-recommended');
ledger.checkins.push({ id: 'tired', witness: 'check-in: tired' }, { id: 'reminder', witness: 'evening reminder: unanswered' });
const before2016 = { mood: petMood(), fed: fed(), checkinDone: checkinDone() };
const by0 = entriesByEra();
const e1Before = by0.e1.length, e2Before = by0.e2.length;

// ── 2016: the arrival, the four jobs each filing its own entry, the mothers, the map's marks ──
ledger.reachedEras.push('e3');
ledger.era3Arrival.push({ witness: 'subject migrated' });
ledger.graceQueue.push({ cardId: 1, outcome: 'applied', witness: 'list: applied — renata (soften the term)' });
ledger.era3Jobs.push({ id: 'pipeline', witness: 'Sent.' }, { id: 'places', witness: 'places: The Wick added' }, { id: 'group', witness: 'group: posted' });
const [maureen, annette] = family.parents;
const [grief, patience] = family.replies;
ledger.checkins.push(
  { id: familyCheckinId(maureen.id), witness: maureen.witnessOpened },
  { id: familyCheckinId(annette.id), witness: annette.witnessOpened },
  { id: familyCheckinId(annette.id), witness: grief.witness },
  { id: familyCheckinId(maureen.id), witness: patience.witness }
);
ledger.records.push('e3-signed-in', 'e3-job-done');
for (const j of JOBS) ledger.records.push('e3-job:' + j);
ledger.records.push('e3-two-jobs', 'e3-jobs-done', 'e3-day-done');

const by = entriesByEra();
const isMark = (id) => id.startsWith('e3-job') || id === 'e3-jobs-done' || id === 'e3-signed-in' || id === 'e3-two-jobs' || id === 'e3-day-done';
const isFamily = (e) => e.id.startsWith(FAMILY_CHECKIN) || /p_maureen|p_annette/.test(e.id) || e.witness.startsWith('family:');
for (const era of ['e1', 'e2']) {
  assert.equal(by[era].filter(isFamily).length, 0, `${era} holds no family entry`);
  assert.equal(by[era].filter((e) => isMark(e.id)).length, 0, `${era} holds none of 2016's job marks`);
}
assert.equal(by.e1.length, e1Before, '1997\'s file does not grow with 2016');
assert.equal(by.e2.length, e2Before, '2003\'s file does not grow with 2016');
const mothers = by.e3.filter(isFamily);
assert.equal(mothers.length, 4, '2016 holds both mothers\' entries (opened and answered)');
for (const m of mothers) assert.equal(m.kind, 'moderation', `the mothers file under Moderation: ${m.id}`);
assert.deepEqual(mothers.map((m) => m.witness), [maureen.witnessOpened, annette.witnessOpened, grief.witness, patience.witness], 'the witness lines are familyCalls\' own, word for word');
assert.ok(mothers.some((m) => m.id.endsWith(maureen.id)) && mothers.some((m) => m.id.endsWith(annette.id)), 'Maureen and Annette both');
assert.equal(by.e3.filter((e) => isMark(e.id)).length, 0, '2016 holds none of its own job marks either (they are the map\'s)');
for (const j of ['pipeline', 'places', 'group']) assert.ok(by.e3.some((e) => e.id === j), `the ${j} job files its own entry in 2016`);
assert.ok(by.e3.some((e) => e.kind === 'queue'), 'the testimony files its own entries in 2016');

const after2016 = { mood: petMood(), fed: fed(), checkinDone: checkinDone() };
assert.deepEqual(after2016, before2016, 'the 2003 readers read the same after the 2016 filings');
assert.equal(after2016.mood, 'clinical', 'the pet still reads Daniel\'s last check-in (the reminder)');

for (const j of JOBS) assert.ok(ledger.records.includes('e3-job:' + j), `ledger.records still holds e3-job:${j}`);
assert.ok(ledger.records.includes('e3-jobs-done'), 'ledger.records still holds e3-jobs-done');
const lists = ['records', 'provotypes', 'sends', 'guidance', 'tapes', 'belongings', 'lamby', 'checkins', 'media', 'caleb', 'era3Arrival', 'graceQueue', 'comments', 'e4Space', 'updates', 'tags', 'games', 'era3Jobs'];
assert.equal(recordCount(), lists.reduce((n, k) => n + ledger[k].length, 0) + Number(ledger.guidePersonalisation.personalised), 'recordCount() still counts every list, the marks included');

console.log(`Record eras (S405): the mothers file in 2016 under Moderation (${mothers.length}), 2016's job marks in no file, 1997 and 2003 unchanged by 2016; the 2003 readers unchanged; the marks kept for the map.`);
