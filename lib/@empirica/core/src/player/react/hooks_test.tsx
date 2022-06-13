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
import { ParticipantContext, ParticipantSession } from "../participant_context";
import { fakeTajribaConnect, nextTick } from "../test_helpers";
import { ParticipantCtx } from "./EmpiricaParticipant";
import { usePlayerID, userParticipantContext } from "./hooks";

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

test.serial("userParticipantContext", (t) => {
  const { connect } = fakeTajribaConnect();

  const ctx = new ParticipantContext("", "");
  const {
    result: { current },
  } = renderHook(userParticipantContext, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.is(current, ctx);

  t.is(connect.callCount, 1);
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
  await nextTick(10);

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

  t.is(result[0], true);
  t.is(result[1], undefined);
  t.is(result[2], undefined);

  // Wait for session establishement
  await nextTick(10);

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
