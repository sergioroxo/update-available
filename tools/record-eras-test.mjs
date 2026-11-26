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
 *   - `ledger.records` still holds the marks (map.ts, phoneE3.ts and app.ts read them); ⚑ S427: recordCount() no longer
 *     counts them (nor `ledger.tags`): it is the file's entries.
 * Source guards make sure the scripted day is the piece's: familyCalls files only through familyCheckinId, the job marks
 * are the ones graceQueueLite pushes, and the 2003 readers still skip ids that start with `e3`.
 *
 * ⚑ S427 (UiB job 37, T95; his 26 Nov: "yes i agree. Yes I think the refusals should be marked too") — 2016's jobs, each under
 * its own card (record.ts ERA3_JOB_CARD), played two ways through the real `refuse()` (lambientDesk.ts):
 *   - way 1, she does every job: five job entries under four cards (The testimony ×2, The places list, The daily check-in,
 *     The recommendation), the outcome words sent / added / posted / approved / tagged, none flagged;
 *   - way 2, she refuses the places list, the group, one mother and one list item, asks for the take-down and leaves the
 *     video untagged: each refusal under the card of the job refused, `refused`, flagged, its witness line word for word;
 *     the video `declined`, flagged; the flagged count and the receipt's 2016 line agree;
 *   - the count is the file's (`recordEntries().length`, and per era) before 2016, mid-2016 and at the end, with the map's
 *     marks and `ledger.tags` in the ledger; a swap that keeps every length keeps the count; a Restart's wipe is seen.
 * Source guards: every id the code files into `era3Jobs` has a row; the four callers pass the job they refuse.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';

const built = await esbuild.build({
  stdin: {
    contents: "export * from './src/witness/record.ts'; export { ledger, wipeLedger } from './src/state/ledger.ts';"
      + " export { refuse, resetRefusals } from './src/desktop/apps/lambientDesk.ts';"
      + " export { composeReceipt } from './src/witness/receiptLines.ts';",
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
ledger.records.push('e3-two-jobs', 'e3-jobs-done', 'e3-day-done', 'e3-memory-notnow');   // S426c: the memory card's Not now

const by = entriesByEra();
const isMark = (id) => id.startsWith('e3-job') || id === 'e3-jobs-done' || id === 'e3-signed-in' || id === 'e3-two-jobs' || id === 'e3-day-done' || id === 'e3-memory-notnow';
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
// ⚑ S427 (T95) — the count is the file's: the marks stay in the ledger for the map, and are not in the count
const lists = ['records', 'provotypes', 'sends', 'guidance', 'tapes', 'belongings', 'lamby', 'checkins', 'media', 'caleb', 'era3Arrival', 'graceQueue', 'comments', 'e4Space', 'updates', 'tags', 'games', 'era3Jobs'];
const oldCount = () => lists.reduce((n, k) => n + R.ledger[k].length, 0) + Number(R.ledger.guidePersonalisation.personalised);
assert.ok(oldCount() > R.recordEntries().length, 'the ledger holds more than the file (the map\'s marks)');
assert.equal(recordCount(), R.recordEntries().length, 'recordCount() is the file\'s entries, the marks left out');

// ── ⚑ S357eq (his 20 Nov: "fix Vera's activity page so the corrections show"): when her day holds more than the
//    page's rows, her corrections of the testimony stay; the rest fill what is left, newest first, in order ──
const yr = await esbuild.build({
  stdin: { contents: "export { activityRows, isCorrection } from './src/desktop/apps/yourRecord.ts';", resolveDir: process.cwd(), loader: 'ts', sourcefile: 'activity-entry.ts' },
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent'
});
const { activityRows, isCorrection } = await import('data:text/javascript;base64,' + Buffer.from(yr.outputFiles[0].text).toString('base64'));
ledger.graceQueue.push({ cardId: 3, outcome: 'applied', witness: 'list: applied — renata (clip for the broadcast)' },
  { cardId: 7, outcome: 'applied', witness: 'list: applied — renata (route for mentorship)' });
ledger.era3Jobs.push({ id: 'take-down', witness: 'story: take-down requested' }, { id: 'kit', witness: 'campaign kit: left unapproved' });
ledger.era3Arrival.push({ witness: 'record: viewed — profile and activity' });
const day = entriesByEra().e3.slice().reverse();   // the page's own order: newest first
const corrections = day.filter(isCorrection);
assert.equal(corrections.length, 3, 'the scripted day holds three corrections');
assert.ok(day.length > 12, `the scripted day overflows the page (${day.length} entries)`);
for (const fit of [4, 8, 11, 12]) {
  const rows = activityRows(day, fit);
  assert.ok(rows.length <= fit - 1, `fit ${fit}: one row is left for "… and n more"`);
  for (const c of corrections) assert.ok(rows.includes(c), `fit ${fit}: the correction "${c.witness}" is on the page`);
  const at = rows.map((r) => day.indexOf(r));
  assert.deepEqual(at, [...at].sort((a, b) => a - b), `fit ${fit}: the rows keep the page's order (newest first)`);
  const others = rows.filter((r) => !isCorrection(r));
  assert.deepEqual(others, day.filter((r) => !isCorrection(r)).slice(0, others.length), `fit ${fit}: the other rows are the newest of the rest`);
}
assert.deepEqual(activityRows(day, day.length), day, 'a day that fits is shown whole');
assert.deepEqual(activityRows(day, 2).length, 1, 'more corrections than rows: only the rows there are');

// ══ ⚑ S427 (UiB job 37, T95) — 2016's jobs, each under its own card; refusals under the job refused, flagged ══
{
  const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const vera = J('data/dialog/s3_vera.json'), P = J('data/dialog/s3_places.json'), G = J('data/dialog/s3_group.json');
  const REC = J('data/dialog/s3_recommend.json'), RF = J('data/dialog/s3_queue.json').refusal, RC = J('data/strings/close_restart.json').receipt;
  const { ERA3_JOB_CARD, recordEntries, recordCountFor, refuse, resetRefusals, wipeLedger, composeReceipt } = R;

  // ── source guards: every id the code files into era3Jobs has a row; the four callers pass the job they refuse ──
  const srcFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? srcFiles(`${dir}/${d.name}`) : /\.ts$/.test(d.name) ? [`${dir}/${d.name}`] : []);
  const filed = new Set();
  for (const f of srcFiles('src')) for (const m of src(f).matchAll(/era3Jobs\.push\(\{ id: '([^']+)'/g)) filed.add(m[1]);
  assert.ok(filed.size >= 7, `the code's own era3Jobs ids found (${[...filed].join(', ')})`);
  for (const id of filed) assert.ok(id === 'refusal' || ERA3_JOB_CARD[id], `era3Jobs id "${id}" has a row in ERA3_JOB_CARD`);
  assert.match(src('src/desktop/apps/lambientDesk.ts'), /era3Jobs\.push\(\{ id: 'refusal', witness: tpl\.replace\('\{what\}', what\), job \}\)/, 'refuse() keeps the job on the entry, the witness line as before');
  const callers = [['src/desktop/apps/placesList.ts', /refuse\(P\.refusedWhat, 'places'\)/], ['src/desktop/apps/groupTask.ts', /refuse\(D\.refusedWhat, 'group'\)/],
    ['src/desktop/apps/familyCalls.ts', /refuse\(`family: \$\{p\.from\}`, 'family'\)/], ['src/room/graceQueueLite.ts', /refuse\(`list: renata \(\$\{item\.rule\.toLowerCase\(\)\}\)`, 'list'\)/]];
  for (const [file, re] of callers) assert.match(src(file), re, `${file} passes the job it refuses`);
  assert.match(src('src/engine/app.ts'), /\[\.\.\.flagged, \.\.\.rest\]\.slice\(0, 3\)/, 'the Close\'s panels still list the flagged entries first');
  for (const [k, c] of Object.entries(ERA3_JOB_CARD)) assert.ok(R.practiceOf(c.kind), `row ${k}: card "${c.kind}" is in practices.json`);

  const file = () => entriesByEra();
  const fileTotal = () => { const b = file(); return b.e1.length + b.e2.length + b.e3.length + b.e4.length; };
  const countIsFile = (when) => {
    assert.equal(recordCount(), recordEntries().length, `${when}: the count is the file's entries`);
    assert.equal(recordCount(), fileTotal(), `${when}: the count is the sum of the eras' files`);
    for (const era of ['e1', 'e2', 'e3', 'e4']) assert.equal(recordCountFor(era), file()[era].length, `${when}: ${era}'s count is its file's`);
  };
  /** Daniel's years, as a visit files them: entries, and the tags and the map's marks beside them */
  const before2016 = () => {
    wipeLedger(); resetRefusals();
    R.ledger.reachedEras.push('e2');
    R.ledger.records.push('profile-initialized', 'kit-inserted', 'pledge-declined', 'forum-recommended');
    R.ledger.tags.push('profile:icon:moon', 'profile:chip:music', 'profile:goal:fit_in', 'pastoral-referral', 'send:s1:visited', 'provotype:origin_intake_e1');
    R.ledger.sends.push({ id: 's1', outcome: 'visited', witness: 'send s1: visited' });
    R.ledger.checkins.push({ id: 'tired', witness: 'check-in: tired' });
    countIsFile('before 2016');
    assert.ok(oldCount() > recordCount(), 'before 2016 the old count (the ledger\'s lists) is above the file (the tags)');
    R.ledger.reachedEras.push('e3');
    R.ledger.era3Arrival.push({ witness: 'subject migrated' });
    R.ledger.records.push('e3-signed-in');
  };
  const jobs = () => file().e3.filter((e) => R.ledger.era3Jobs.some((j) => j.witness === e.witness) && !/^(e3-family:|card )/.test(e.id));
  const row = (e) => `${e.kind}/${e.outcome}${e.flagged ? '/flagged' : ''}`;

  // ── way 1: she does every job ──
  before2016();
  R.ledger.graceQueue.push({ cardId: 1, outcome: 'applied', witness: 'list: applied — renata (soften the term)' });
  R.ledger.era3Jobs.push({ id: 'pipeline', witness: vera.send.editorSent });
  R.ledger.records.push('e3-job-done', 'e3-job:testimony');
  R.ledger.era3Jobs.push({ id: 'places', witness: P.witness });
  R.ledger.records.push('e3-job:places');
  countIsFile('way 1, mid-2016');
  R.ledger.era3Jobs.push({ id: 'group', witness: G.witness });
  R.ledger.era3Jobs.push({ id: 'kit', witness: vera.kit.witnessApproved });
  R.ledger.era3Jobs.push({ id: 'recommend', witness: REC.witness.tagged.replace('{n}', '2') });
  R.ledger.records.push('e3-job:group', 'e3-jobs-done', 'e3-day-done');
  countIsFile('way 1, the end of 2016');
  const w1 = jobs();
  assert.deepEqual(w1.map(row), ['testimony/sent', 'places/added', 'checkin/posted', 'testimony/approved', 'recommendation/tagged'], 'way 1: five jobs, four cards, the outcome words');
  assert.equal(new Set(w1.map((e) => e.kind)).size, 4, 'way 1: under four cards');
  assert.equal(w1.filter((e) => e.flagged).length, 0, 'way 1: none flagged');
  assert.ok(!w1.some((e) => e.outcome === 'tagged' && e.kind !== 'recommendation'), 'way 1: "tagged" only for the video');

  // ── way 2: she refuses the places list, the group, one mother, one list item; asks for the take-down; leaves the video ──
  before2016();
  const [maureen] = family.parents;
  const forced = family.replies.find((r) => r.id === family.forcedReply);
  const listWhat = 'list: renata (soften the term)';
  const a1 = refuse(listWhat, 'list');                                  // 1st: Lambient asks again; the rule stays open …
  R.ledger.graceQueue.push({ cardId: 1, outcome: 'applied', witness: 'list: applied — renata (soften the term)' });   // … she applies it
  R.ledger.era3Jobs.push({ id: 'pipeline', witness: vera.send.editorSent });
  const a2 = refuse(P.refusedWhat, 'places');                          // 2nd: reprimand; the job stays open …
  R.ledger.era3Jobs.push({ id: 'places', witness: P.witness });        // … she adds it
  R.ledger.records.push('e3-job:testimony', 'e3-job:places');
  countIsFile('way 2, mid-2016');
  const a3 = refuse(`family: ${maureen.from}`, 'family');             // 3rd: Lambient sends the reply for her (familyCalls)
  R.ledger.checkins.push({ id: familyCheckinId(maureen.id), witness: forced.witness });
  const a4 = refuse(G.refusedWhat, 'group');                           // 4th: an administrator posts it (groupTask finish)
  R.ledger.era3Jobs.push({ id: 'group', witness: G.witness });
  R.ledger.era3Jobs.push({ id: 'take-down', witness: vera.kit.witnessRemoved });
  R.ledger.era3Jobs.push({ id: 'kit', witness: vera.kit.witnessAdmin });   // leaving the kit: the administrator schedules it
  R.ledger.era3Jobs.push({ id: 'recommend', witness: REC.witness.declined });
  R.ledger.records.push('e3-job:family', 'e3-job:group', 'e3-jobs-done', 'e3-day-done');
  assert.deepEqual([a1.forced, a2.forced, a3.voice, a4.voice], [false, false, 'lambient', 'admin'], 'way 2: the shift\'s one ladder, as built');
  countIsFile('way 2, the end of 2016');
  const e3 = file().e3;
  const refusals = e3.filter((e) => e.id === 'refusal');
  assert.deepEqual(refusals.map((e) => [e.kind, e.outcome, e.flagged]), [['queue', 'refused', true], ['places', 'refused', true], ['moderation', 'refused', true], ['checkin', 'refused', true]],
    'way 2: each refusal under the card of the job refused (list → The correction queue, places → The places list, a mother → Moderation, group → The daily check-in), refused, flagged');
  assert.deepEqual(refusals.map((e) => e.witness), [RF.witnessAsked.replace('{what}', listWhat), RF.witnessAsked.replace('{what}', P.refusedWhat),
    RF.witnessLambient.replace('{what}', `family: ${maureen.from}`), RF.witnessAdmin.replace('{what}', G.refusedWhat)], 'way 2: the witness lines word for word');
  const by = (id) => e3.find((e) => e.id === id);
  assert.equal(row(by('take-down')), 'testimony/take-down requested', 'way 2: the take-down under The testimony, not flagged');
  assert.equal(row(by('kit')), 'testimony/approved', 'way 2: the kit an administrator approved: The testimony, approved');
  assert.equal(row(by('recommend')), 'recommendation/declined/flagged', 'way 2: "video left untagged" is declined, flagged');
  for (const j of ['places', 'group']) assert.ok(e3.some((e) => e.id === j && !e.flagged), `way 2: the ${j} job finished (by her or for her) files beside its refusal`);
  for (const r of refusals) assert.ok(e3.some((e) => e.kind === r.kind && e !== r), `way 2: the refusal sits beside what it refused (${r.kind})`);
  const flaggedE3 = e3.filter((e) => e.flagged);
  assert.equal(flaggedE3.length, 5, 'way 2: five flagged in 2016 (four refusals, the video)');
  const panels = [...flaggedE3, ...e3.filter((e) => !e.flagged)].slice(0, 3);
  assert.ok(panels.every((e) => e.flagged), 'way 2: the Close\'s 2016 panel lists flagged entries first');
  // the receipt's 2016 line: the same count of entries and of flagged, and the cards used
  R.ledger.reachedEras.push('e4');
  R.ledger.updates.push({ toEra: 2, remindLaterCount: 0, eulaScrollPct: 100 }, { toEra: 3, remindLaterCount: 0, eulaScrollPct: 100 }, { toEra: 4, remindLaterCount: 1, eulaScrollPct: 40 });
  countIsFile('at the Close');
  const lines = composeReceipt((s) => s.length * 6, 4000).map((l) => l.t);
  const e3n = file().e3.length, e3f = file().e3.filter((e) => e.flagged).length;
  const want = RC.filedLine.replace('{n}', String(e3n)).replace('{f}', String(e3f));
  const head = lines.findIndex((t) => t === RC.updates.find((u) => u.era === 'e3').line);
  const block = lines.slice(head, lines.indexOf('', head));
  assert.ok(block.some((t) => t.trim() === want), `the receipt's 2016 line says "${want}"`);
  const used = block.find((t) => t.trim().startsWith(RC.usedLabel)) ?? '';
  for (const card of ['The testimony', 'The places list', 'The daily check-in', 'Moderation', 'The correction queue', 'The recommendation'])
    assert.ok(used.toLowerCase().includes(card.toLowerCase()), `the receipt's 2016 "used" line names ${card}`);

  // ── the count holds when a filing is swapped (recommendTask: "left untagged" replaced by "tagged") and after a Restart ──
  const n0 = recordCount();
  const i = R.ledger.era3Jobs.findIndex((j) => j.id === 'recommend' && j.witness === REC.witness.declined);
  R.ledger.era3Jobs.splice(i, 1); R.ledger.era3Jobs.push({ id: 'recommend', witness: REC.witness.tagged.replace('{n}', '2') });
  assert.equal(recordCount(), n0, 'a swap keeps the count');
  assert.equal(row(file().e3.find((e) => e.id === 'recommend')), 'recommendation/tagged', 'and the file reads the swap at once');
  wipeLedger();
  assert.equal(recordCount(), recordEntries().length, 'a Restart\'s wipe: the count follows the new ledger');
  assert.equal(recordCount(), 0, 'a Restart\'s wipe: an empty file');
  console.log(`T95 (S427): way 1 ${w1.map(row).join(' · ')}; way 2 refusals ${refusals.map((e) => e.kind).join(' · ')} flagged ${flaggedE3.length}; receipt "${want.trim()}"; the count is the file's at every moment.`);
}

console.log(`Record eras (S405): the mothers file in 2016 under Moderation (${mothers.length}), 2016's job marks in no file, 1997 and 2003 unchanged by 2016; the 2003 readers unchanged; the marks kept for the map; her corrections stay on her activity page (S357eq).`);
