import "global-jsdom/register";

import { cleanup, renderHook } from "@testing-library/react";
import test from "ava";
import { restore } from "sinon";
import { nextTick } from "../test_helpers";
import { useConsent } from "./hooks";

test.serial.afterEach.always(() => {
  cleanup();
  restore();
});

test.serial("useConsent", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { result } = renderHook(useConsent);

  t.is(result.current[0], false);
  t.true(result.current[1] instanceof Function);

  result.current[1]!();

  await nextTick();

  t.is(result.current[0], true);
  t.is(result.current[1], undefined);
});

test.serial("useConsent namespaced", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { result } = renderHook(useConsent);
  const { result: resultNS } = renderHook(() => useConsent("myns"));

  t.is(resultNS.current[0], false);
  t.true(resultNS.current[1] instanceof Function);

  resultNS.current[1]!();

  await nextTick();

  t.is(resultNS.current[0], true);
  t.is(resultNS.current[1], undefined);

  // They do not interfere with each other

  t.is(result.current[0], false);
  t.true(result.current[1] instanceof Function);
});
