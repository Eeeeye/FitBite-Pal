const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createScreenReads, localDateKey, readTrainingDay, applyScreenWrite } = require('../src/utils/screenReads');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('overlapping reads for a day share one request and can refresh after it settles', async () => {
  const reads = createScreenReads();
  const result = deferred();
  let calls = 0;
  const fetch = () => { calls++; return result.promise; };
  const values = [];
  const apply = value => values.push(value);
  const first = reads.run('exercise:2026-11-25', fetch, apply);
  const second = reads.run('exercise:2026-11-25', fetch, apply);
  assert.equal(first, second);
  result.resolve('first');
  await Promise.all([first, second]);
  await reads.run('exercise:2026-11-25', () => 'refreshed', apply);
  assert.equal(calls, 1);
  assert.deepEqual(values, ['first', 'refreshed']);
});

test('a read started before a mutation cannot overwrite its replacement', async () => {
  const reads = createScreenReads();
  const old = deferred();
  const values = [];
  const stale = reads.run('profile', () => old.promise, value => values.push(value));
  reads.invalidate('profile');
  await reads.run('profile', () => 'updated', value => values.push(value));
  old.resolve('outdated');
  await stale;
  assert.deepEqual(values, ['updated']);
});

test('a failed read can be retried and calendar days use local date components', async () => {
  const reads = createScreenReads();
  await assert.rejects(reads.run('day', () => Promise.reject(new Error('offline')), () => {}), /offline/);
  const value = await reads.run('day', () => 'ok', () => {});
  assert.equal(value, 'ok');
  assert.equal(localDateKey(new Date(2026, 0, 2, 0, 10)), '2026-01-02');
});

test('the home and training tabs fetch only the selected day and its exercise completion flags', async () => {
  const calls = [];
  await readTrainingDay('2026-11-22', date => calls.push(['plan', date]),
    (date, type) => calls.push(['completion', date, type]));
  assert.deepEqual(calls, [['plan', '2026-11-22'], ['completion', '2026-11-22', 'exercise']]);
});

test('a confirmed check-in survives a delayed history reply and recovers other days from the refreshed history', async () => {
  const reads = createScreenReads();
  const stale = deferred();
  let days = {};
  const apply = dates => { days = Object.fromEntries(dates.map(date => [date, true])); };
  const old = reads.run('check-ins', () => stale.promise, apply);
  const reload = () => reads.run('check-ins', () => ['yesterday', 'today'], apply);
  const refreshed = applyScreenWrite(reads, 'check-ins', () => { days.today = true; }, reload);
  assert.deepEqual(days, { today: true });
  await refreshed;
  stale.resolve(['yesterday']);
  await old;
  assert.deepEqual(days, { yesterday: true, today: true });
});

test('a late diet response cannot revert an addition or deletion and settled writes make no extra reads', async () => {
  for (const { before, after } of [{ before: [1], after: [1, 2] }, { before: [1, 2], after: [1] }]) {
    const reads = createScreenReads();
    const stale = deferred();
    let records = before;
    let reloads = 0;
    const key = 'diet:2026-11-25';
    const apply = result => { records = result; };
    const old = reads.run(key, () => stale.promise, apply);
    const reload = () => {
      reloads++;
      return reads.run(key, () => after, apply);
    };
    await applyScreenWrite(reads, key, () => apply(after), reload);
    stale.resolve(before);
    await old;
    assert.deepEqual(records, after);
    await applyScreenWrite(reads, key, () => apply([]), reload);
    assert.equal(reloads, 1);
  }
});
