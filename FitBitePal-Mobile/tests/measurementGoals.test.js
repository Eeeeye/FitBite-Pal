const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGoalPatch } = require('../src/utils/measurementGoals');

test('goal edits change only touched metrics and clearing is explicit', () => {
  const saved = { weight: 71.5, bodyFat: 20 };
  assert.deepEqual(buildGoalPatch(saved, '71.50', '20'), {});
  assert.deepEqual(buildGoalPatch(saved, '68', '20'), { weight: 68 });
  assert.deepEqual(buildGoalPatch(saved, '71.5', ''), { bodyFat: null });
  assert.deepEqual(buildGoalPatch({}, '70', ''), { weight: 70 });
});

test('invalid targets do not produce a partial edit', () => {
  assert.throws(() => buildGoalPatch({}, '1500', '20'), /weight/);
  assert.throws(() => buildGoalPatch({}, '70', 'Infinity'), /bodyFat/);
  assert.throws(() => buildGoalPatch({}, '70', '0'), /bodyFat/);
});
