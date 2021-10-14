import r from "rand-seed";
import { shuffle } from "./utils.mjs";

// Node moduel support...
const Rand = r.default;

const rand = new Rand(new Date().toString());

// If you want to seed, see https://github.com/michaeldzjap/rand-seed for
// documentation.
// const rand = new Rand('1234', PRNG.xoshiro128ss);

export function pickRandom(arr) {
  return arr[Math.floor(arr.length * rand.next())];
}

export function selectRandom(arr, num) {
  console.info(num, arr.slice());
  console.info(shuffle(arr.slice()));
  console.info(shuffle(arr.slice()).slice(0, num));

  return shuffle(arr.slice()).slice(0, num);
}
