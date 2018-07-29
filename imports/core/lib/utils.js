export const weightedRandom = values => {
  const samples = [];

  for (var i = 0; i < values.length; i += 1) {
    if (
      !values[i] ||
      !values[i].hasOwnProperty("value") ||
      !values[i].hasOwnProperty("weight")
    ) {
      throw "all values passed to weightedRandom must have a value and weight field";
    }
    for (var j = 0; j < values[i].weight; j += 1) {
      samples.push(values[i].value);
    }
  }

  return () => samples[Math.floor(Math.random() * samples.length)];
};
