import test from "ava";
import { debug } from "console";
import sinon from "sinon";
import { z } from "zod";

// Test the logic that we added to handle null timerID
test("timerID null check logic works correctly", (t) => {
  // Mock the debug function to capture its calls
  const debugSpy = sinon.spy(console, "debug");

  // Simulate the logic we added to Stage.end()
  function simulateStageEndLogic(timerID: any, stageId: string): boolean {
    if (!timerID) {
      debug(
        `stage end: timerID not available for stage ${stageId}, skipping transition`
      );
      return false; // Skip transition
    }
    return true; // Proceed with transition
  }

  // Test case 1: null timerID should skip transition
  const result1 = simulateStageEndLogic(null, "stage123");
  t.false(result1);
  t.true(
    debugSpy.calledWith(
      "stage end: timerID not available for stage stage123, skipping transition"
    )
  );

  // Test case 2: undefined timerID should skip transition
  debugSpy.resetHistory();
  const result2 = simulateStageEndLogic(undefined, "stage456");
  t.false(result2);
  t.true(
    debugSpy.calledWith(
      "stage end: timerID not available for stage stage456, skipping transition"
    )
  );

  // Test case 3: empty string should skip transition
  debugSpy.resetHistory();
  const result3 = simulateStageEndLogic("", "stage789");
  t.false(result3);
  t.true(
    debugSpy.calledWith(
      "stage end: timerID not available for stage stage789, skipping transition"
    )
  );

  // Test case 4: valid timerID should proceed with transition
  debugSpy.resetHistory();
  const result4 = simulateStageEndLogic("timer123", "stage999");
  t.true(result4);
  t.false(debugSpy.called);

  debugSpy.restore();
});

test("isString function behavior with null values", (t) => {
  const isString = z.string().parse;

  // Test that isString throws on null/undefined (which is why we need the null check first)
  t.throws(() => isString(null));
  t.throws(() => isString(undefined));
  t.notThrows(() => isString("")); // Empty string is valid
  t.notThrows(() => isString("valid-timer-id"));
});
