import "global-jsdom/register";

import { cleanup, renderHook } from "@testing-library/react";
import test, { ExecutionContext } from "ava";
import React from "react";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { fakeTajribaConnect, nextTick } from "../../../shared/test_helpers";
import { ParticipantSession } from "../../connection";
import { ParticipantModeContext } from "../../context";
import { ParticipantCtx } from "../../react/EmpiricaParticipant";
import { EmpiricaClassic, Game, Player, Round, Stage } from "../classic";
import { setupGame, setupPlayer, setupStage } from "../test_helpers";
import { useGame, usePlayer, usePlayers, useRound, useStage } from "./hooks";

test.serial.afterEach.always(() => {
  cleanup();
  restore();
});

async function setupModeCtx(t: ExecutionContext<unknown>) {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Establish session
  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);
  session.updateSession("token1", {
    id: "participant1",
    identifier: "player1",
  });

  const { cbs, changes } = fakeTajribaConnect({ id: "participant1" });

  const ctx = new ParticipantModeContext("", "somens", EmpiricaClassic);
  cbs["connected"]![0]!();

  await nextTick();

  setupPlayer(changes);
  setupGame(changes);
  return { ctx, changes };
}

test.serial("usePartModeCtx no context", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { result } = renderHook(useGame);

  t.is(result.current, undefined);
});

test.serial("usePlayer", async (t) => {
  const { ctx } = await setupModeCtx(t);

  const { result } = renderHook(usePlayer, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.true(result.current instanceof Player);
});

test.serial("useGame", async (t) => {
  const { ctx } = await setupModeCtx(t);

  const { result } = renderHook(useGame, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.true(result.current instanceof Game);
});

test.serial("usePlayers", async (t) => {
  const { ctx } = await setupModeCtx(t);

  const { result } = renderHook(usePlayers, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.true(Array.isArray(result.current));
  const players = result.current as Player[];
  t.is(players.length, 1);
  t.true(players[0] instanceof Player);
});

test.serial("useRound", async (t) => {
  const { ctx, changes } = await setupModeCtx(t);
  setupStage(changes);

  const { result } = renderHook(useRound, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.true(result.current instanceof Round);
});

test.serial("useStage", async (t) => {
  const { ctx, changes } = await setupModeCtx(t);
  setupStage(changes);

  const { result } = renderHook(useStage, {
    wrapper: ({ children }) => (
      <ParticipantCtx.Provider value={ctx}>{children}</ParticipantCtx.Provider>
    ),
  });

  t.true(result.current instanceof Stage);
});
