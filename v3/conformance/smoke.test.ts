// Non-empty suite placeholder: proves workspace wiring end-to-end until the real
// suites land with the engine package spec (conformance/README.md).
import { expect, test } from "bun:test";
import { PACKAGE } from "@empirica/engine";

test("workspace resolves the engine package", () => {
  expect(PACKAGE).toBe("@empirica/engine");
});
