export function pickRandom<T>(items: T[]): T {
  const random = Math.floor(Math.random() * items.length);
  return items[random] as T;
}

export function shuffle(a: Array<any>) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function selectRandom(arr: Array<any>, num: number) {
  return shuffle(arr.slice()).slice(0, num);
}
