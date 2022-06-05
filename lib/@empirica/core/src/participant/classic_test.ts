import test from "ava";
import { Subject, switchAll } from "rxjs";

// Experiment to understand how switchAll works.
test("Testing rxjs switchAll", (t) => {
  const sub1 = new Subject<string>();
  const sub2 = new Subject<string>();
  const subs = new Subject<Subject<string>>();

  const res: string[] = [];
  subs.pipe(switchAll()).subscribe((x) => res.push(x));

  subs.next(sub1); // => sub1

  sub1.next("a"); // ->
  sub2.next("1");
  sub1.next("b"); // ->
  sub2.next("2");

  subs.next(sub2); // => sub2

  sub1.next("c");
  sub2.next("3"); // ->

  subs.next(sub1); // => sub1

  sub1.next("d"); // ->
  sub2.next("4");

  t.deepEqual(res, ["a", "b", "3", "d"]);
});
