import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerRecords, timeline, render } from './register-timeline.mjs';

test('quiet and update labels never manufacture a register; unknown breaks a run', () => {
  const result = timeline({ eras: [{ id: 'e3', label: 'test', beats: [
    { id: 'a', register: 'operable' }, { id: 'b', quiet: true },
    { id: 'c', register: 'operable' }, { id: 'update', done: 'updatedTo4' },
    { id: 'd', register: 'felt' }, { id: 'e', register: 'respite' },
    { id: 'f', register: 'transition' },
  ] }] }, []);
  const era = result.eras[0];
  assert.equal(era.beats.map(b => b.symbol).join(''), '·?·?FR—');
  assert.equal(era.longest, 1);
  assert.equal(era.firstPerson, 5);
  assert.equal(era.ratio, '2:2 (1.00)');
  assert.equal(era.counts.unknown, 2);
  assert.match(render(result, true), /^STATUS: live/);
});

test('joins use identity and era, skip documentation, and expose conflicts', () => {
  const records = registerRecords({ era: 'era1', children: [
    { id: 'origin_intake_e1', register: 'operable' },
    { id: 'thread', register: 'felt' },
    { id: 'thread', register: 'respite' },
  ], _doc: { id: 'unrelated', register: 'felt' } }, 'fixture.json');
  const result = timeline({ eras: [
    { id: 'e1', beats: [{ id: 'form', done: 'formDone' }, { id: 'thread' }] },
    { id: 'e2', beats: [{ id: 'thread' }] },
  ] }, records);
  assert.equal(records.length, 3);
  assert.equal(result.eras[0].beats[0].symbol, '·');
  assert.equal(result.eras[0].beats[1].reason, 'conflicting registers');
  assert.equal(result.eras[1].beats[0].symbol, '?');
  assert.equal(result.unjoined.length, 2);
});
