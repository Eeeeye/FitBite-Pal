// The API owns IDs in two distinct tables. A visual list index can change after any edit.
function mealKeyFor(source, id) {
  if (source !== 'plan' && source !== 'record') return null;
  if (typeof id === 'number' && !Number.isSafeInteger(id)) return null;
  return /^[1-9]\d*$/.test(String(id)) ? source + ':' + id : null;
}

function isMealKey(key) {
  return typeof key === 'string' && /^(plan|record):[1-9]\d*$/.test(key);
}

function completionFlags(rows, type) {
  const flags = {};
  for (const row of rows) {
    if (type === 'exercise') flags[row.itemIndex] = row.completed;
    else if (isMealKey(row.mealKey)) flags[row.mealKey] = row.completed;
    else if (row.id != null) flags['legacy:' + row.id] = row.completed;
  }
  return flags;
}

function applyFlagChanges(flags, changes) {
  const result = { ...flags };
  for (const [key, value] of Object.entries(changes || {})) {
    if (value == null) delete result[key];
    else result[key] = value;
  }
  return result;
}

module.exports = { mealKeyFor, isMealKey, completionFlags, applyFlagChanges };
