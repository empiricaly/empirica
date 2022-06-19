import "global-jsdom/register";

import { cleanup, renderHook } from "@testing-library/react";
import test from "ava";
import React from "react";
import { restore } from "sinon";
import {
  ParticipantContext,
  ParticipantModeContext,
} from "../context
import { TajribaProvider } from "../provider";
import { fakeTajribaConnect } from "../../shared/test_helpers";
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

/* c8 ignore next 3 */
const myMode = (id: string, provider: TajribaProvider) => {
  return { something: "here" };
};

test.serial("useParticipantContext mode", (t) => {
  const { connect } = fakeTajribaConnect();

  const { result } = renderHook(useParticipantContext, {
    wrapper: ({ children }) => (
      <EmpiricaParticipant url="" ns="" modeFunc={myMode}>
        {children}
      </EmpiricaParticipant>
    ),
  });

  t.true(result.current instanceof ParticipantModeContext);

  t.is(connect.callCount, 1);
});
