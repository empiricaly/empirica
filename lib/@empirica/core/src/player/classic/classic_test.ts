import { ChangePayload } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import {
  EmpiricaClassic,
  Game,
  Player,
  PlayerGame,
  PlayerRound,
  PlayerStage,
  Stage,
} from "./classic";
import { Step } from "../steps";
import {
  attrChange,
  partChange,
  scopeChange,
  setupProvider,
  stepChange,
} from "../test_helpers";

const defaultProps = { participantID: "participant1" };
function setupClassic(props: Partial<typeof defaultProps> = {}) {
  const { participantID } = {
    ...defaultProps,
    ...props,
  };
  const { provider, changes } = setupProvider();
  const ctx = EmpiricaClassic(participantID, provider);

  return { ctx, changes };
}

function setupPlayer(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  participantID = "participant1"
) {
  changes.next(scopeChange({ id: playerID, kind: "player" }));
  changes.next(
    attrChange({
      key: "participantID",
      val: `"${participantID}"`,
      nodeID: playerID,
    })
  );
  changes.next(partChange({ id: participantID }));
}

function setupGame(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  gameID = "game1"
) {
  changes.next(scopeChange({ id: gameID, kind: "game" }));
  changes.next(
    attrChange({
      key: "gameID",
      val: `"${gameID}"`,
      nodeID: playerID,
    })
  );
}

function setupStage(
  changes: Subject<ChangePayload>,
  gameID = "game1",
  roundID = "round1",
  stageID = "stage1"
) {
  changes.next(scopeChange({ id: stageID, kind: "stage" }));
  changes.next(scopeChange({ id: roundID, kind: "round" }));
  changes.next(
    attrChange({
      key: "stageID",
      val: `"${stageID}"`,
      nodeID: gameID,
    })
  );
  changes.next(
    attrChange({
      key: "roundID",
      val: `"${roundID}"`,
      nodeID: stageID,
    })
  );
}

function setupPlayerGameRoundStage(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  gameID = "game1",
  roundID = "round1",
  stageID = "stage1"
) {
  changes.next(
    scopeChange({ id: playerID + "-" + gameID, kind: "playerGame" })
  );
  changes.next(
    scopeChange({ id: playerID + "-" + roundID, kind: "playerRound" })
  );
  changes.next(
    scopeChange({ id: playerID + "-" + stageID, kind: "playerStage" })
  );
  changes.next(
    attrChange({
      key: `playerGameID-${gameID}`,
      val: `"${playerID + "-" + gameID}"`,
      nodeID: playerID,
    })
  );
  changes.next(
    attrChange({
      key: `playerRoundID-${roundID}`,
      val: `"${playerID + "-" + roundID}"`,
      nodeID: playerID,
    })
  );
  changes.next(
    attrChange({
      key: `playerStageID-${stageID}`,
      val: `"${playerID + "-" + stageID}"`,
      nodeID: playerID,
    })
  );
}

test("ClassicMode should return nothing", (t) => {
  const { changes, ctx } = setupClassic();
  changes.next(stepChange({}));

  t.falsy(ctx.player.getValue());
  t.falsy(ctx.game.getValue());
  t.falsy(ctx.stage.getValue());
  t.falsy(ctx.round.getValue());
});

test("ClassicMode should return player", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);

  t.is(ctx.players.getValue().length, 1);
  t.truthy(ctx.player.getValue());
  t.falsy(ctx.game.getValue());
  t.falsy(ctx.stage.getValue());
  t.falsy(ctx.round.getValue());
});

test("ClassicMode should return game", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);

  t.truthy(ctx.player.getValue());
  t.truthy(ctx.game.getValue());
  t.falsy(ctx.stage.getValue());
  t.falsy(ctx.round.getValue());
});

test("ClassicMode should return stage and round", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);

  t.truthy(ctx.player.getValue());
  t.truthy(ctx.game.getValue());
  t.truthy(ctx.stage.getValue());
  t.truthy(ctx.round.getValue());
});

test("ClassicMode should return players", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupPlayer(changes, "player2", "participant2");
  setupPlayer(changes, "player3", "participant3");

  t.is(ctx.players.getValue().length, 3);
  t.truthy(ctx.player.getValue());
  t.falsy(ctx.game.getValue());
  t.falsy(ctx.stage.getValue());
  t.falsy(ctx.round.getValue());
});

test("ClassicMode should filter players on participants", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupPlayer(changes, "player2", "participant2");
  setupPlayer(changes, "player3", "participant3");

  t.is(ctx.players.getValue().length, 3);

  changes.next(partChange({ id: "participant2", removed: true }));
});

test("ClassicMode should update player", (t) => {
  const { ctx, changes } = setupClassic();

  const vals: (Player | undefined)[] = [];
  ctx.player.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [undefined]);

  setupPlayer(changes);

  t.is(vals.length, 2);
  t.true(vals[1] instanceof Player);
  t.is(vals[1]!.id, "player1");

  changes.next(scopeChange({ id: "player1", kind: "player", removed: true }));

  t.is(vals.length, 3);
  t.is(vals[2], undefined);
});

test("ClassicMode should update game", (t) => {
  const { ctx, changes } = setupClassic();

  const vals: (Game | undefined)[] = [];
  ctx.game.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [undefined]);

  setupPlayer(changes);
  setupGame(changes);

  t.is(vals.length, 2);
  t.true(vals[1] instanceof Game);
  t.is(vals[1]!.id, "game1");

  changes.next(scopeChange({ id: "game2", kind: "game" }));

  t.is(vals.length, 2);
  t.true(vals[1] instanceof Game);
  t.is(vals[1]!.id, "game1");

  changes.next(
    attrChange({
      key: "gameID",
      val: `"game2"`,
      nodeID: "player1",
    })
  );

  t.is(vals.length, 3);
  t.true(vals[2] instanceof Game);
  t.is(vals[2]!.id, "game2");
});

test("ClassicMode should update stage", (t) => {
  const { ctx, changes } = setupClassic();

  const vals: (Stage | undefined)[] = [];
  ctx.stage.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [undefined]);

  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);

  t.is(vals.length, 3);
  t.true(vals[1] instanceof Stage);
  t.is(vals[1]!.id, "stage1");

  changes.next(scopeChange({ id: "stage2", kind: "stage" }));

  t.is(vals.length, 3);
  t.true(vals[2] instanceof Stage);
  t.is(vals[2]!.id, "stage1");

  changes.next(
    attrChange({
      key: "stageID",
      val: `"stage2"`,
      nodeID: "game1",
    })
  );

  t.is(vals.length, 4);
  t.true(vals[3] instanceof Stage);
  t.is(vals[3]!.id, "stage2");
  t.true(ctx.round.getValue() === undefined);

  changes.next(scopeChange({ id: "round2", kind: "round" }));
  changes.next(
    attrChange({
      key: "roundID",
      val: `"round2"`,
      nodeID: "stage2",
    })
  );

  t.truthy(ctx.round.getValue());
});

test("ClassicMode game should have stage and round", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);

  const game = ctx.game.getValue()!;
  t.is(game.stage, ctx.stage.getValue());
  t.is(game.round, ctx.round.getValue());
});

test("ClassicMode game should not have stage and round", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);

  const game = ctx.game.getValue()!;
  t.true(!game.stage);
  t.true(!game.round);
  t.is(game.stage, ctx.stage.getValue());
  t.is(game.round, ctx.round.getValue());
});

test("ClassicMode stage can have timer", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);

  changes.next(
    stepChange({
      ellapsed: 0,
      remaining: 10,
      id: "step1",
      running: true,
      done: true,
    })
  );

  t.falsy(ctx.stage.getValue()!.timer);

  changes.next(
    attrChange({
      key: "timerID",
      val: `"step1"`,
      nodeID: "stage1",
    })
  );

  const timer = ctx.stage.getValue()!.timer;
  t.truthy(timer);
  t.truthy(timer instanceof Step);
});

test("ClassicMode game should update on attribute change", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);

  const vals: (Game | undefined)[] = [];
  ctx.game.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.is(vals.length, 1);
  t.true(vals[0] instanceof Game);
  t.is(vals[0]!.id, "game1");

  changes.next(attrChange({ key: "hello", val: `"world"`, nodeID: "game1" }));

  t.is(vals.length, 2);
});

test("ClassicMode player should have PlayerGame/Round/Stage", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);
  setupPlayerGameRoundStage(changes);

  t.true(ctx.player.getValue()!.game instanceof PlayerGame);
  t.true(ctx.player.getValue()!.round instanceof PlayerRound);
  t.true(ctx.player.getValue()!.stage instanceof PlayerStage);
});

test("ClassicMode player should update on PlayerGame change", (t) => {
  const { ctx, changes } = setupClassic();
  setupPlayer(changes);
  setupGame(changes);
  setupStage(changes);
  setupPlayerGameRoundStage(changes);

  // Add another stage to test current context isolation

  changes.next(scopeChange({ id: "stage2", kind: "stage" }));
  changes.next(
    attrChange({
      key: "roundID",
      val: `"round1"`,
      nodeID: "stage1",
    })
  );

  const vals: (Player | undefined)[] = [];
  ctx.player.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.is(vals.length, 1);
  t.true(vals[0] instanceof Player);
  t.is(vals[0]!.id, "player1");

  t.log("Updating the game does not trigger");

  changes.next(attrChange({ key: "hello", val: `"world"`, nodeID: "game1" }));

  t.is(vals.length, 1);

  t.log("Updating the player does trigger");

  changes.next(attrChange({ key: "hello", val: `"world"`, nodeID: "player1" }));

  t.is(vals.length, 2);

  t.log("Updating the playerGame does trigger");

  changes.next(
    attrChange({ key: "hello", val: `"world"`, nodeID: "player1-game1" })
  );

  t.is(vals.length, 3);

  t.log("Updating the playerRound does trigger");

  changes.next(
    attrChange({ key: "hello", val: `"world"`, nodeID: "player1-round1" })
  );

  t.is(vals.length, 4);

  t.log("Updating the playerStage does trigger");

  changes.next(
    attrChange({ key: "hello", val: `"world"`, nodeID: "player1-stage1" })
  );

  t.is(vals.length, 5);

  t.log("Updating another playerStage does not trigger");

  changes.next(
    attrChange({ key: "hello", val: `"world"`, nodeID: "player1-stage2" })
  );

  t.is(vals.length, 5);
});
