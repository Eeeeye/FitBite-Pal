const { test } = require('node:test');
const assert = require('node:assert/strict');
const { switchHeightUnit, switchWeightUnit, checkInMeasurements } = require('../src/utils/measurements');

test('metric and imperial entries produce the same check-in payload', () => {
  const imperial = checkInMeasurements('70', 'inch', '150', 'lbs');
  assert.equal(imperial.height, 177.8);
  assert.ok(Math.abs(imperial.weight - 68.0388555) < 1e-8);
  assert.deepEqual(checkInMeasurements('175', 'cm', '65', 'kg'), { height: 175, weight: 65 });
});

test('changing display units preserves the measurement within display precision', () => {
  const height = switchHeightUnit('175', 'cm');
  const weight = switchWeightUnit('65', 'kg');
  assert.ok(Math.abs(Number(switchHeightUnit(height, 'inch')) - 175) < 0.001);
  assert.ok(Math.abs(Number(switchWeightUnit(weight, 'lbs')) - 65) < 0.001);
  assert.equal(switchHeightUnit('', 'cm'), '');
});

test('empty, zero, negative and nonfinite measurements cannot be submitted', () => {
  for (const invalid of ['', '0', '-1', 'invalid', 'Infinity']) {
    assert.equal(checkInMeasurements(invalid, 'cm', '65', 'kg'), null);
    assert.equal(checkInMeasurements('175', 'cm', invalid, 'kg'), null);
  }
});
