import { Group, State } from "tajriba";
import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { Batch, BatchC } from "./batch";
import { Json } from "./json";
import { Player, PlayerC } from "./player";
import { ObjectPool } from "./pool";
import { Round, RoundC } from "./round";
import { Stage } from "./stage";

export class Game extends Base {
  _rounds: { [key: string]: Round } = {};
  _players: { [key: string]: Player } = {};
  group?: Group;

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    this.children = [
      {
        key: "roundIDs",
        type: "round",
        field: "_rounds",
      },
      {
        key: "playerIDs",
        type: "player",
        field: "_players",
      },
    ];
  }

  get batch(): Batch | undefined {
    return this.parentID ? <Batch>this.pool.obj(this.parentID) : undefined;
  }

  createCtx() {
    const treatment = this.getInternal("treatment") || {};
    const stateStr = this.getInternal("state") || "CREATED";
    const state = new GameCState(<State>stateStr, <State>stateStr);
    return new GameC(treatment, state, this);
  }

  updateState(state: State) {
    const gc = <GameC>this.ctx;
    gc._state.from = state;
    gc._state.to = state;
  }

  firstStage() {
    const stageID = this.getInternal("currentStageID");

    if (stageID) {
      return this.stageById(stageID);
    }

    // Ensure we have rounds and stages
    this.validate();

    return this.rounds[0].stages[0];
  }

  roundStageAfter(stageID: string): [Round | null, Stage | null] {
    for (let i = 0; i < this.rounds.length; i++) {
      const r = this.rounds[i];
      for (let j = 0; j < r.stages.length; j++) {
        const s = r.stages[j];
        if (stageID == s.id) {
          if (r.stages[j + 1]) {
            return [r, r.stages[j + 1]];
          }

          if (this.rounds[i + 1]) {
            return [this.rounds[i + 1], this.rounds[i + 1].stages[0]];
          }

          return [null, null];
        }
      }
    }

    return [null, null];
  }

  stageById(stageID: string) {
    for (const round of this.rounds) {
      for (const s of round.stages) {
        if (stageID == s.id) {
          return s;
        }
      }
    }
  }

  validate() {
    if (this.rounds.length === 0) {
      throw new Error("cannot start game without rounds");
    }

    for (const round of this.rounds) {
      if (round.stages.length === 0) {
        throw new Error("cannot start game with rounds without stages");
      }

      for (const stage of round.stages) {
        if (!stage.getInternal("stepID")) {
          throw new Error("cannot start game with stages without step");
        }
      }
    }

    if (this.players.length === 0) {
      throw new Error("cannot start game without players");
    }
  }

  get rounds() {
    return Object.values(this._rounds);
  }

  get players() {
    return Object.values(this._players);
  }
}

export class GameCState {
  constructor(public from: State, public to: State) {}
}

export class GameC extends BaseC {
  rounds: RoundC[] = [];
  players: PlayerC[] = [];

  constructor(
    public treatment: Json,
    public _state: GameCState = new GameCState(State.Created, State.Created),
    base?: Game
  ) {
    super(base);
  }

  get batch() {
    return <BatchC>this.base?.batch?.ctx;
  }

  addRound() {
    const round = new RoundC();
    this.rounds.push(round);
    return round;
  }

  assignPlayer(player: PlayerC) {
    for (const p of this.players) {
      if (p.id == player.id) {
        throw "player already assigned";
      }
    }
    this.players.push(player);
  }

  start() {
    console.log("wanna start game");
    if (
      this._state.from !== State.Created &&
      this._state.from !== State.Paused
    ) {
      console.warn("cannot start game");
      return;
    }

    this._state.to = State.Running;
  }

  cancel() {
    if (
      this._state.from !== State.Running &&
      this._state.from !== State.Paused
    ) {
      console.warn("cancelling a non-running game");
      return;
    }

    this._state.to = State.Terminated;
  }

  pause() {
    if (this._state.from !== State.Running) {
      console.warn("pausing a non-running game");
      return;
    }

    this._state.to = State.Paused;
  }
}
