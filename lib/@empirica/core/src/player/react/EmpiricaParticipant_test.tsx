import "global-jsdom/register";

import { cleanup, renderHook } from "@testing-library/react";
import test from "ava";
import React from "react";
import { restore } from "sinon";
import { fakeTajribaConnect } from "../../shared/test_helpers";
import { ParticipantContext, ParticipantModeContext } from "../context";
import { EmpiricaParticipant } from "./EmpiricaParticipant";
import { useParticipantContext } from "./hooks";

test.serial.afterEach.always(() => {
  cleanup();
  restore();
});

test.serial("useParticipantContext", (t) => {
  const { connect } = fakeTajribaConnect();

  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="">
        {children}
      </EmpiricaParticipant>
    ),
  });

  t.true(result.current instanceof ParticipantContext);

  t.is(connect.callCount, 1);
});

test.serial("useParticipantContext reuses namespaced context", (t) => {
  fakeTajribaConnect();

  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="1">
        {children}
      </EmpiricaParticipant>
    ),
  });

  const { result: result2 } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="1">
        {children}
      </EmpiricaParticipant>
    ),
  });

  t.deepEqual(result, result2);
});

test.serial("useParticipantContext namespaces context", (t) => {
  fakeTajribaConnect();

  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="a">
        {children}
      </EmpiricaParticipant>
    ),
  });

  const { result: result2 } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="b">
        {children}
      </EmpiricaParticipant>
    ),
  });

  t.notDeepEqual(result, result2);
});

/* c8 ignore next 3 */
const myMode = () => {
  return { something: "here" };
};

test.serial("useParticipantContext mode", (t) => {
  const { connect } = fakeTajribaConnect();

  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="withModeFunc" modeFunc={myMode}>
        {children}
      </EmpiricaParticipant>
    ),
  });

  t.true(result.current instanceof ParticipantModeContext);

  t.is(connect.callCount, 1);
});
