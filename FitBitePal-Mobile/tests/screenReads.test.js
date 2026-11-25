const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mealKeyFor, completionFlags, applyFlagChanges } = require('../src/utils/mealIdentity');
const { progressLoadState, createScreenReads, localDateKey, readTrainingDay, applyScreenWrite, readProgressSnapshot } = require('../src/utils/screenReads');

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

const progressDate = '2026-11-25';
const progressResponse = {
  success: true,
  data: {
    weightRecords: [{ date: progressDate, weight: 72 }],
    calorieRecords: [{ date: progressDate, intake: 650 }],
    statistics: { currentWeight: 72, nutritionScore: 70 },
    mealCompletions: { 0: true, 1: false, 2: true },
    mealCompletionsByKey: { 'plan:9': true, 'record:9': false, 'plan:2': true },
  },
};

test('one progress fetch supplies both charts, statistics and end-date meal flags even with overlapping focus', async () => {
  const reads = createScreenReads();
  const result = deferred();
  let calls = 0;
  let meals;
  const load = () => readProgressSnapshot(reads, progressDate, 7, () => {
    calls++;
    return result.promise;
  }, flags => { meals = flags; });
  const first = load();
  const second = load();
  result.resolve(progressResponse);
  const [a, b] = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  const { mealCompletions, mealCompletionsByKey, ...charts } = progressResponse.data;
  assert.deepEqual(a, charts);
  assert.deepEqual(meals, mealCompletionsByKey);
});

test('toggles and rollbacks survive a late progress snapshot while untouched meal flags still load', async () => {
  const reads = createScreenReads();
  const old = deferred();
  let meals;
  const request = readProgressSnapshot(reads, progressDate, 7, () => old.promise, flags => { meals = flags; });
  await Promise.resolve();
  const key = 'meal:' + progressDate;
  reads.updateField(key, 'plan:9', false);
  reads.updateField(key, 'record:9', true);
  reads.updateField(key, 'record:9', false);  // failed write rolled back
  old.resolve(progressResponse);
  await request;
  assert.deepEqual(meals, { 'plan:9': false, 'record:9': false, 'plan:2': true });
});

test('a newer meal read wins over a late progress response and leaving one account does not affect another', async () => {
  const reads = createScreenReads();
  const old = deferred();
  let meals;
  let otherMeals;
  const first = readProgressSnapshot(reads, progressDate, 7, () => old.promise, flags => { meals = flags; });
  await Promise.resolve();
  await reads.run('meal:' + progressDate, () => ({ 'record:4': true }), flags => { meals = flags; });
  await readProgressSnapshot(createScreenReads(), progressDate, 7,
    () => ({ ...progressResponse, data: { ...progressResponse.data, mealCompletionsByKey: { 'plan:8': true } } }),
    flags => { otherMeals = flags; });
  old.resolve(progressResponse);
  await first;
  assert.deepEqual(meals, { 'record:4': true });
  assert.deepEqual(otherMeals, { 'plan:8': true });
});

test('an incomplete progress response can be retried without publishing empty meal flags', async () => {
  const reads = createScreenReads();
  let meals = { 'record:4': true };
  const load = response => readProgressSnapshot(reads, progressDate, 7, () => response, flags => { meals = flags; });
  await assert.rejects(load({ success: true, data: {} }), /Incomplete/);
  assert.deepEqual(meals, { 'record:4': true });
  await load(progressResponse);
  assert.deepEqual(meals, progressResponse.data.mealCompletionsByKey);
});

test('progress shows initial failure without sample values and retains the last successful snapshot on a refresh failure', () => {
  const initial = { status: 'loading', snapshot: null, updatedAt: null };
  const failed = progressLoadState(initial, { status: 'error' });
  assert.deepEqual(failed, { ...initial, status: 'error' });
  const retrying = progressLoadState(failed, { status: 'loading' });
  const ready = progressLoadState(retrying, { status: 'ready', snapshot: progressResponse.data, updatedAt: new Date() });
  const refreshing = progressLoadState(ready, { status: 'loading' });
  const refreshFailed = progressLoadState(refreshing, { status: 'error' });
  assert.equal(refreshFailed.snapshot, ready.snapshot);
  assert.equal(refreshFailed.updatedAt, ready.updatedAt);
  assert.equal(refreshFailed.status, 'error');
});

test('plan and manual or recognized food IDs keep their identities after an insertion or deletion', () => {
  const rows = [
    { id: 101, itemIndex: 0, mealKey: 'plan:7', completed: true },
    { id: 102, itemIndex: 1, mealKey: 'record:7', completed: false },
    { id: 103, itemIndex: 2, mealKey: null, completed: true },
  ];
  const flags = completionFlags(rows, 'meal');
  assert.equal(flags[mealKeyFor('plan', 7)], true);
  assert.equal(flags[mealKeyFor('record', 7)], false);
  assert.equal(flags[mealKeyFor('record', 8)], undefined);
  assert.equal(flags['legacy:103'], true);
  assert.equal(flags[0], undefined);
  assert.equal(mealKeyFor('record', 'local-123'), null);
  assert.equal(mealKeyFor('record', null), null);
  assert.equal(mealKeyFor('unknown', 7), null);
  assert.equal(mealKeyFor('record', Number.MAX_SAFE_INTEGER + 1), null);
  assert.deepEqual(completionFlags(rows.slice(0, 1), 'exercise'), { 0: true });
});

test('a confirmed deletion survives delayed list or progress reads and preserves other meals', async () => {
  for (const fromSnapshot of [false, true]) {
    const reads = createScreenReads();
    const old = deferred();
    const day = 'meal:' + progressDate;
    let flags;
    const request = fromSnapshot
      ? readProgressSnapshot(reads, progressDate, 7, () => old.promise, value => { flags = value; })
      : reads.run(day, () => old.promise, (rows, changes) => {
          flags = applyFlagChanges(completionFlags(rows, 'meal'), changes);
        }, {});
    await Promise.resolve();
    reads.updateField(day, 'plan:9', null);
    old.resolve(fromSnapshot ? progressResponse : [
      { mealKey: 'plan:9', completed: true }, { mealKey: 'record:9', completed: false },
      { mealKey: 'plan:2', completed: true },
    ]);
    await request;
    assert.deepEqual(flags, { 'record:9': false, 'plan:2': true });
  }
});

test('an older index-only progress response counts completions without checking a current card', async () => {
  const { mealCompletionsByKey, ...old } = progressResponse.data;
  let flags;
  await readProgressSnapshot(createScreenReads(), progressDate, 7, () => ({ success: true, data: old }),
    value => { flags = value; });
  assert.deepEqual(flags, { 'legacy-index:0': true, 'legacy-index:1': false, 'legacy-index:2': true });
  assert.equal(flags[mealKeyFor('plan', 1)], undefined);
});
