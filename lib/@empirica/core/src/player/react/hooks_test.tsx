import "global-jsdom/register";

import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import test from "ava";
import React from "react";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { Globals } from "../../shared/globals";
import { TajribaConnection } from "../../shared/tajriba_connection";
import { fakeTajribaConnect, nextTick } from "../../shared/test_helpers";
import { ParticipantSession } from "../connection";
import { ParticipantContext } from "../context";
import { ParticipantCtx } from "./EmpiricaParticipant";
import {
  useConsent,
  useGlobal,
  useParticipantContext,
  usePlayerID,
  useTajriba,
  useTajribaConnected,
  useTajribaConnecting,
} from "./hooks";

test.serial.afterEach.always(() => {
  cleanup();
  restore();
});

function Button() {
  const [state, setState] = React.useState("Hello");

  return <button onClick={() => setState("World")}>{state}</button>;
}

test.serial("setState", (t) => {
  render(<Button />);

  const button = screen.getByText("Hello");
  fireEvent.click(button);

  t.not(screen.getByText("World"), null);
});

test.serial("useParticipantContext", (t) => {
  const { connect } = fakeTajribaConnect();

  const ctx = new ParticipantContext("", "");
  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.is(result.current, ctx);

  t.is(connect.callCount, 1);
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

  await nextTick(100);

  t.is(resultNS.current[0], true);
  t.is(resultNS.current[1], undefined);

  // They do not interfere with each other

  t.is(result.current[0], false);
  t.true(result.current[1] instanceof Function);
});

test.serial("useTajriba", async (t) => {
  fakeTajribaConnect();
  const ctx = new ParticipantContext("someurl", "somens");

  let result: any;
  const UseHook = () => {
    result = useTajriba();

    return <div />;
  };

  render(
    <ParticipantCtx.Provider value={ctx}>
      <UseHook />
    </ParticipantCtx.Provider>
  );

  // Wait for session establishement
  await nextTick();

  t.true(result instanceof TajribaConnection);
});

test.serial("useTajribaConnecting", async (t) => {
  const { cbs } = fakeTajribaConnect();
  const ctx = new ParticipantContext("someurl", "somens");

  let result: any;
  const UseHook = () => {
    result = useTajribaConnecting();

    return <div />;
  };

  render(
    <ParticipantCtx.Provider value={ctx}>
      <UseHook />
    </ParticipantCtx.Provider>
  );

  t.is(result, true);

  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.is(result, false);
});

test.serial("useTajribaConnected", async (t) => {
  const { cbs } = fakeTajribaConnect();
  const ctx = new ParticipantContext("someurl", "somens");

  let result: any;
  const UseHook = () => {
    result = useTajribaConnected();

    return <div />;
  };

  render(
    <ParticipantCtx.Provider value={ctx}>
      <UseHook />
    </ParticipantCtx.Provider>
  );

  t.is(result, false);

  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.is(result, true);
});

test.serial("useTajribaConnected no context", async (t) => {
  let result: any;
  const UseHook = () => {
    result = useTajribaConnected();

    return <div />;
  };

  render(<UseHook />);

  t.is(result, undefined);
});

test.serial("usePlayerID no session", async (t) => {
  const { cbs } = fakeTajribaConnect();
  const ctx = new ParticipantContext("someurl", "somens");
  cbs["connected"]![0]!();

  let result: any;
  const UseHook = () => {
    result = usePlayerID();

    return <div />;
  };

  render(
    <ParticipantCtx.Provider value={ctx}>
      <UseHook />
    </ParticipantCtx.Provider>
  );

  // Wait for session establishement
  await nextTick();

  t.is(result[0], false);
  t.is(result[1], undefined);
  t.true(result[2] instanceof Function);

  await result[2]("hey");

  // Wait for session establishement
  await nextTick();
  cbs["connected"]![1]!();
  await nextTick();

  t.is(result[0], false);
  t.is(result[1], "hey");
  t.is(result[2], undefined);
});

test.serial("usePlayerID session", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);
  session.updateSession("123", { id: "345", identifier: "567" });

  const ctx = new ParticipantContext("someurl", "somens");
  cbs["connected"]![0]!();

  let result: any;
  const UseHook = () => {
    result = usePlayerID();

    return <div />;
  };

  render(
    <ParticipantCtx.Provider value={ctx}>
      <UseHook />
    </ParticipantCtx.Provider>
  );

  await nextTick(50);

  t.is(result[0], true);
  t.is(result[1], undefined);
  t.is(result[2], undefined);

  // Wait for session establishement
  cbs["connected"]![1]!();
  await nextTick(50);

  t.is(result[0], false);
  t.is(result[1], "567");
  t.is(result[2], undefined);
});

test.serial("usePlayerID no context", async (t) => {
  let result: any;
  const UseHook = () => {
    result = usePlayerID();

    return <div />;
  };

  render(<UseHook />);

  // Wait for session establishement
  await nextTick(10);

  t.is(result[0], true);
  t.is(result[1], undefined);
  t.is(result[2], undefined);
});

test.serial("useGlobal", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const ctx = new ParticipantContext("", "");
  cbs["connected"]![0]!();

  const { result } = renderHook(useGlobal, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  // Wait for session establishement
  await nextTick(100);

  t.true(result.current instanceof Globals);
});

test.serial("useGlobal not connected", async (t) => {
  fakeTajribaConnect();

  const ctx = new ParticipantContext("", "");

  const { result } = renderHook(useGlobal, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  // Wait for session establishement
  await nextTick();

  t.is(result.current, undefined);
});

test.serial("useGlobal no context", async (t) => {
  const { result } = renderHook(useGlobal);

  // Wait for session establishement
  await nextTick();

  t.is(result.current, undefined);
});
