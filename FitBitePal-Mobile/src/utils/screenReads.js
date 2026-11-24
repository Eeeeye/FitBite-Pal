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
  return {
    run(key, fetch, apply) {
      if (pending.has(key)) return pending.get(key);
      const request = Promise.resolve().then(fetch).then(result => {
        if (pending.get(key) === request) apply(result);
        return result;
      }).finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    invalidate(key) {
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

module.exports = { localDateKey, createScreenReads, readTrainingDay, applyScreenWrite };
