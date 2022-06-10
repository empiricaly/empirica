import test from "ava";
import { setNow, Steps, StepTick } from "./steps";
import { partChange, setupProvider, stepChange } from "./test_helpers";

function setupSteps() {
  const { provider, changes } = setupProvider();

  const steps = new Steps(provider.steps, provider.dones);

  return { changes, steps };
}

test("Steps should track steps", (t) => {
  const { changes, steps } = setupSteps();

  t.log("Step exists");

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const step = steps.step("1");
  t.truthy(step);

  t.log("Step does not exists");

  const noStep = steps.step("2");
  t.falsy(noStep);

  t.log("Step is removed");

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: true,
    })
  );

  const stepRem = steps.step("1");
  t.falsy(stepRem);
  t.truthy(step);
});

test("Steps only available when done", (t) => {
  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: false,
      removed: false,
    })
  );

  const step = steps.step("1");
  t.falsy(step);

  changes.next(partChange({ done: true }));

  const stepDone = steps.step("1");
  t.truthy(stepDone);
});

test("Step tracks duration of step", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  const vals: (StepTick | undefined)[] = [];
  stepDone!.obs().subscribe({
    next(val) {
      vals.push(val);
    },
  });

  const expected: StepTick[] = [];

  expected.push({
    duration: 10000,
    ellapsed: 0,
    ended: false,
    remaining: 10000,
    started: true,
  });

  setNow(1000);

  expected.push({
    duration: 10000,
    ellapsed: 1000,
    ended: false,
    remaining: 9000,
    started: true,
  });

  t.deepEqual(vals, expected);

  setNow(1500);

  t.deepEqual(vals, expected);

  setNow(2000);

  expected.push({
    duration: 10000,
    ellapsed: 2000,
    ended: false,
    remaining: 8000,
    started: true,
  });

  t.deepEqual(vals, expected);

  for (let i = 3; i < 10; i++) {
    setNow(i * 1000);
    expected.push({
      duration: 10000,
      ellapsed: i * 1000,
      ended: false,
      remaining: 10000 - i * 1000,
      started: true,
    });
  }

  setNow(9999);

  t.deepEqual(vals, expected);

  setNow(10000);

  expected.push({
    duration: 10000,
    ellapsed: 10000,
    ended: true,
    remaining: 0,
    started: true,
  });

  t.deepEqual(vals, expected);
});

test("Step tracks step stopping early", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  const vals: (StepTick | undefined)[] = [];
  stepDone!.obs().subscribe({
    next(val) {
      vals.push(val);
    },
  });

  const expected: (StepTick | undefined)[] = [];

  expected.push({
    duration: 10000,
    ellapsed: 0,
    ended: false,
    remaining: 10000,
    started: true,
  });

  setNow(1000);

  expected.push({
    duration: 10000,
    ellapsed: 1000,
    ended: false,
    remaining: 9000,
    started: true,
  });

  t.deepEqual(vals, expected);

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: false,
      done: true,
      removed: false,
    })
  );

  expected.push(undefined);

  t.deepEqual(vals, expected);
});

test("Step tracks step removed", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  const vals: (StepTick | undefined)[] = [];
  stepDone!.obs().subscribe({
    next(val) {
      vals.push(val);
    },
  });

  const expected: (StepTick | undefined)[] = [];

  expected.push({
    duration: 10000,
    ellapsed: 0,
    ended: false,
    remaining: 10000,
    started: true,
  });

  setNow(1000);

  expected.push({
    duration: 10000,
    ellapsed: 1000,
    ended: false,
    remaining: 9000,
    started: true,
  });

  t.deepEqual(vals, expected);

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: true,
    })
  );

  expected.push(undefined);

  t.deepEqual(vals, expected);
});

test("Step can return current state", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  setNow(1000);
  setNow(2000);

  const expected = {
    duration: 10000,
    ellapsed: 2000,
    ended: false,
    remaining: 8000,
    started: true,
  };

  t.deepEqual(stepDone!.current, expected);
});

test("Step cannot work with empty ellapsed", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      // ellapsed: 0,
      remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  setNow(1000);
  setNow(2000);

  t.deepEqual(stepDone!.current, undefined);
});

test("Step cannot work with empty remaining", (t) => {
  setNow(0);

  const { changes, steps } = setupSteps();

  changes.next(
    stepChange({
      ellapsed: 0,
      // remaining: 10,
      id: "1",
      running: true,
      done: true,
      removed: false,
    })
  );

  const stepDone = steps.step("1");
  t.truthy(stepDone);

  setNow(1000);
  setNow(2000);

  t.deepEqual(stepDone!.current, undefined);
});
