export function castValue(value) {
  try {
    const newVal = JSON.parse(value);
    return newVal;
  } catch (_) {
    return value;
  }
}
