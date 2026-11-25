const { applyFlagChanges } = require('./mealIdentity');

function localDateKey(date = new Date()) {
  const twoDigits = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

function readTrainingDay(date, loadPlan, loadCompletions) {
  return Promise.all([loadPlan(date), loadCompletions(date, 'exercise')]);
}

// Each signed-in provider owns a separate set of pending requests.
function createScreenReads() {
  const pending = new Map();
  const latest = new Map();

  // Both a standalone GET and one field in a combined GET may update the same
  // screen state. Only its latest reader may publish, until the next write.
  function claim(key, changes) {
    const ticket = { changes };
    latest.set(key, ticket);
    return update => {
      if (latest.get(key) !== ticket) return;
      latest.delete(key);
      update?.(changes);
    };
  }

  return {
    claim,
    updateField(key, field, value) {
      // A combined response still supplies untouched items after a toggle.
      // A standalone read can be retried independently.
      const changes = latest.get(key)?.changes;
      if (changes) changes[field] = value;
      else latest.delete(key);
      pending.delete(key);
    },
    run(key, fetch, apply, changes) {
      if (pending.has(key)) return pending.get(key);
      const publish = claim(key, changes);
      const request = Promise.resolve().then(fetch).then(result => {
        publish(overrides => apply?.(result, overrides));
        return result;
      }).finally(() => {
        publish();
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    invalidate(key) {
      latest.delete(key);
      return pending.delete(key);
    },
  };
}

// If an in-flight list was the first load, fetch it again after the confirmed write
// so unrelated list entries are still delivered to the screen.
function applyScreenWrite(reads, key, update, reload) {
  const interrupted = reads.invalidate(key);
  update();
  if (interrupted && reload) return reload();
}

function readProgressSnapshot(reads, endDate, days, fetch, applyMealFlags) {
  return reads.run('progress:' + endDate + ':' + days, async () => {
    const publishMeals = reads.claim('meal:' + endDate, {});
    try {
      const response = await fetch();
      if (!response.success || !response.data) throw new Error(response.message || 'Progress unavailable');
      const { weightRecords, calorieRecords, statistics, mealCompletionsByKey, mealCompletions } = response.data;
      if (!Array.isArray(weightRecords) || !Array.isArray(calorieRecords) || !statistics || (!mealCompletionsByKey && !mealCompletions)) {
        throw new Error('Incomplete progress response');
      }
      // Legacy index-only responses can supply a count, but cannot identify a card.
      const flags = mealCompletionsByKey ?? Object.fromEntries(
        Object.entries(mealCompletions).map(([index, value]) => ['legacy-index:' + index, value]));
      publishMeals(changes => applyMealFlags(applyFlagChanges(flags, changes)));
      return { weightRecords, calorieRecords, statistics };
    } finally {
      publishMeals();
    }
  });
}

function progressLoadState(state, change) {
  if (change.status === 'ready') return change;
  return { ...state, status: change.status };
}

module.exports = { progressLoadState, localDateKey, createScreenReads, readTrainingDay, applyScreenWrite, readProgressSnapshot };
