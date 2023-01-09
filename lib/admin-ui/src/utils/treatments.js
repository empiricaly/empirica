import { ORIGIN } from "../constants.js";

export async function getTreatments() {
  return (await fetch(ORIGIN + "/treatments")).json();
}

export function formatFactorsToString(factors, sep = " | ") {
  let factorArr = [];
  for (const key in factors) {
    let val = factors[key];

    // check for object/array type data
    if (val === Object(val)) {
      // Object
      if (!val.length) {
        let tempVal = [];
        for (const k in val) {
          tempVal.push(k + ": " + val[k]);
        }

        val = "{" + tempVal.join(", ") + "}";
      } else {
        // array object here
        val = "[" + val.join(", ") + "]";
      }
    }

    factorArr.push(key + ": " + val);
  }

  return factorArr.join(sep);
}
