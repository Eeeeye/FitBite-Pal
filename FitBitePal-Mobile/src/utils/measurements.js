const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

function convertInput(input, factor) {
  if (!input.trim() || !Number.isFinite(Number(input))) return input;
  return String(Number((Number(input) * factor).toFixed(4)));
}

function switchHeightUnit(input, currentUnit) {
  return convertInput(input, currentUnit === 'cm' ? 1 / CM_PER_INCH : CM_PER_INCH);
}

function switchWeightUnit(input, currentUnit) {
  return convertInput(input, currentUnit === 'kg' ? 1 / KG_PER_POUND : KG_PER_POUND);
}

function checkInMeasurements(height, heightUnit, weight, weightUnit) {
  const heightCm = Number(height) * (heightUnit === 'inch' ? CM_PER_INCH : 1);
  const weightKg = Number(weight) * (weightUnit === 'lbs' ? KG_PER_POUND : 1);
  if (![heightCm, weightKg].every(value => Number.isFinite(value) && value > 0)) return null;
  return { height: heightCm, weight: weightKg };
}

module.exports = { switchHeightUnit, switchWeightUnit, checkInMeasurements };
