function buildGoalPatch(original, weightInput, bodyFatInput) {
  const changes = {};
  for (const [key, input] of [['weight', weightInput], ['bodyFat', bodyFatInput]]) {
    const value = input.trim() === '' ? null : Number(input);
    if (value != null && (!Number.isFinite(value) ||
        (key === 'weight' ? value < 30 || value > 300 : value <= 0 || value > 100))) {
      throw new Error(key);
    }
    if (value !== (original[key] ?? null)) changes[key] = value;
  }
  return changes;
}

module.exports = { buildGoalPatch };
