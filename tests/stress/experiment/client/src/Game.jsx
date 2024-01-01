import {
  useGame,
  usePlayer,
  usePlayers,
  useRound,
  useStage,
} from "@empirica/core/player/classic/react";
import React, { useEffect, useRef } from "react";

class Scope {
  scope = null;
  keyListeners = new Set();
  scopeListener = false;

  constructor(kind) {
    this.kind = kind;
  }

  updateScope(scope) {
    this.scope = scope;
    for (const key of this.keyListeners.keys()) {
      window.keyChanged(this.kind, key, scope?.get(key), Boolean(scope));
    }

    if (this.scopeListener) {
      window.scopeChanged(this.kind, Boolean(scope));
    }
  }

  listenKey(key) {
    this.keyListeners.add(key);
  }

  listenScope() {
    this.scopeListener = true;
  }

  get(key) {
    return this.scope?.get(key);
  }

  set(key, value) {
    this.scope?.set(key, value);
  }

  get game() {
    return this.getScoped("game");
  }

  get round() {
    return this.getScoped("round");
  }

  get stage() {
    return this.getScoped("stage");
  }

  getScoped(kind) {
    return {
      get: (key) => this.scope?.[kind]?.get(key),
      set: (key, value) => this.scope?.[kind]?.set(key, value),
    };
  }
}
const coll = {
  game: new Scope("game"),
  round: new Scope("round"),
  stage: new Scope("stage"),
  player: new Scope("player"),
  players: [],
};
window.empirica_test_collector = coll;

function GameInner() {
  const game = useGame();
  const round = useRound();
  const stage = useStage();
  const player = usePlayer();
  const players = usePlayers();
  const treatment = game.get("treatment");

  useEffect(() => {
    console.log(`stage started - ${round.get("name")} - ${stage.get("name")}`);
  }, []);

  useEffect(() => {
    coll.game.updateScope(game);
  }, [game]);

  useEffect(() => {
    coll.round.updateScope(round);
  }, [round]);

  useEffect(() => {
    coll.stage.updateScope(stage);
  }, [stage]);

  useEffect(() => {
    coll.player.updateScope(player);
  }, [player]);

  useEffect(() => {
    coll.players = players;
  }, [players]);

  console.log("submitted", Boolean(player.stage), player?.stage?.get("submit"));

  return (
    <div>
      <h1 data-test="game-started">Game started</h1>
      <h2 data-test="round-name">{round.get("name")}</h2>
      <h3 data-test="stage-name">{stage.get("name")}</h3>
      <h3 data-test="player-count">{treatment.playerCount}</h3>

      {player.stage.get("submit") ? (
        <div data-test="submitted">Submitted</div>
      ) : (
        <div data-test="stage-ongoing">Stage ongoing</div>
      )}

      <button
        data-test="submit-stage"
        onClick={() => {
          player.stage.set("submit", true);
        }}
      >
        Submit
      </button>
    </div>
  );
}

export class Game extends React.Component {
  componentWillUnmount() {
    coll.game.updateScope(null);
    coll.round.updateScope(null);
    coll.stage.updateScope(null);
    coll.player.updateScope(null);
    coll.players = [];
  }

  render() {
    return <GameInner />;
  }
}
