import { Scope } from "../scope";
import { Base, BaseC } from "./base";
import { Game, GameC } from "./game";
import { Json } from "./json";
import { ObjectPool } from "./pool";

export class Batch extends Base {
  _games: { [key: string]: Game } = {};

  constructor(pool: ObjectPool, scope: Scope, id: string) {
    super(pool, scope, id);
    this.children = [
      {
        key: "gameIDs",
        type: "game",
        field: "_games",
      },
    ];
  }

  createCtx(): BatchC {
    return new BatchC(this);
  }

  get games() {
    return Object.values(this._games);
  }
}

export class BatchC extends BaseC {
  games: GameC[] = [];

  addGame(treatment: Json) {
    const game = new GameC(treatment);
    this.games.push(game);
    return game;
  }
}
