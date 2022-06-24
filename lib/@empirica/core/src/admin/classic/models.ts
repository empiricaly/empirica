import { AddScopeInput } from "@empirica/tajriba";
import { z } from "zod";
import { Constructor } from "../../shared/helpers";
import { JsonValue } from "../../utils/json";
import { Scope } from "../scopes";
import { AttributeInput, attrs, scopeConstructor } from "./helpers";

const endedStatuses = ["ended", "terminated", "failed"];
const reservedKeys = [
  "batchID",
  "gameID",
  "stageID",
  "roundID",
  "start",
  "ended",
  "timerID",
];

export class Batch extends Scope<Context, ClassicKinds> {
  get games() {
    const gameIDs = (this.get("gameIDs") as string[]) || [];
    const games: Game[] = [];
    for (const gameID of gameIDs) {
      const game = this.scopeByKey(gameID) as Game;
      if (game) {
        games.push(game);
      }
    }
    return games;
  }

  get unstartedGames() {
    return this.games.filter((g) => !g.get("state"));
  }

  get isRunning() {
    return this.get("state") === "running";
  }

  get available() {
    return this.isRunning && this.unstartedGames.length > 0;
  }

  addGame(attributes: { [key: string]: JsonValue } | AttributeInput[]) {
    if (!Array.isArray(attributes)) {
      const newAttr: AttributeInput[] = [];
      for (const key in attributes) {
        newAttr.push({
          key,
          value: attributes[key]!,
        });
      }

      attributes = newAttr;
    }

    const [scope, accessors] = scopeConstructor({
      kind: "game",
      attributes: attrs([
        ...attributes.filter((a) => !reservedKeys.includes(a.key)),
        {
          key: "batchID",
          value: this.id,
          immutable: true,
        },
        {
          key: "start",
          value: false,
          protected: true,
        },
        {
          key: "ended",
          value: false,
          protected: true,
        },
      ]),
    });

    this.addScopes([scope]);

    return accessors;
  }

  end(reason: string) {
    if (this.hasEnded) {
      return;
    }

    this.set("status", "ended");
    this.set("endedReason", reason);
  }

  get hasEnded() {
    return endedStatuses.includes(this.get("status") as string);
  }
}

export class BatchOwned extends Scope<Context, ClassicKinds> {
  get batch() {
    return this.scopeByKey("batchID") as Batch | undefined;
  }
}

export class Game extends BatchOwned {
  get currentStage() {
    return this.scopeByKey("stageID") as Stage | undefined;
  }

  get currentRound() {
    return this.currentStage?.round;
  }

  get hasEnded() {
    return endedStatuses.includes(this.get("status") as string);
  }

  addRound(attributes: { [key: string]: JsonValue } | AttributeInput[]) {
    if (!Array.isArray(attributes)) {
      const newAttr: AttributeInput[] = [];
      for (const key in attributes) {
        newAttr.push({
          key,
          value: attributes[key]!,
        });
      }

      attributes = newAttr;
    }

    const batchID = this.get("batchID") as string;
    if (!batchID) {
      throw new Error("missing batch ID on game");
    }

    const [scope, accessors] = scopeConstructor({
      kind: "game",
      attributes: attrs([
        ...attributes.filter((a) => !reservedKeys.includes(a.key)),
        {
          key: "gameID",
          value: this.id,
          immutable: true,
        },
        {
          key: "batchID",
          value: batchID,
          immutable: true,
        },
        {
          key: "start",
          value: false,
          protected: true,
        },
        {
          key: "ended",
          value: false,
          protected: true,
        },
      ]),
    });

    this.addScopes([scope]);

    return {
      ...accessors,
      addStage: (
        attributes: { [key: string]: JsonValue } | AttributeInput[]
      ) => {
        addStage(
          this.addScopes.bind(this),
          this.id, //! WARNING THIS IS NOT THE ROUND ID...
          this.id,
          batchID,
          attributes
        );
      },
    };
  }

  end(reason: string) {
    if (this.hasEnded) {
      return;
    }

    this.set("status", "ended");
    this.set("endedReason", reason);

    const stage = this.currentStage;
    if (!stage) {
      return;
    }

    stage.set("ended", true);
  }
}

export class GameOwned extends BatchOwned {
  get currentGame() {
    return this.scopeByKey("gameID") as Game | undefined;
  }
}

export class Player extends GameOwned {
  participantID?: string;

  get game() {
    const game = this.currentGame;
    if (!game) {
      return;
    }

    const key = `playerGameID-${game.id}`;

    return this.scopeByKey(key) as PlayerGame | undefined;
  }

  get currentRound() {
    return this.currentStage?.round;
  }

  get round() {
    const round = this.currentRound;
    if (!round) {
      return;
    }

    const key = `playerRoundID-${round.id}`;

    return this.scopeByKey(key) as PlayerRound | undefined;
  }

  get currentStage() {
    return this.currentGame?.currentStage;
  }

  get stage() {
    const stage = this.currentStage;
    if (!stage) {
      return;
    }

    const key = `playerStageID-${stage.id}`;

    return this.scopeByKey(key) as PlayerStage | undefined;
  }

  hasUpdated() {
    if (super.hasUpdated()) {
      return true;
    }
    return Boolean(
      this.round?.hasUpdated() ||
        this.stage?.hasUpdated() ||
        this.game?.hasUpdated()
    );
  }
}

export class PlayerGame extends GameOwned {}

export class PlayerRound extends GameOwned {}

export class PlayerStage extends GameOwned {}

function addStage(
  addScopes: (nput: AddScopeInput[]) => void,
  roundID: string,
  gameID: string,
  batchID: string,
  attributes: { [key: string]: JsonValue } | AttributeInput[]
) {
  if (!Array.isArray(attributes)) {
    const newAttr: AttributeInput[] = [];
    for (const key in attributes) {
      newAttr.push({
        key,
        value: attributes[key]!,
      });
    }

    attributes = newAttr;
  }

  const durAttr = attributes.find((a) => a.key === "duration");
  const res = z.number().int().gte(5).safeParse(durAttr?.value);
  if (!res.success) {
    throw new Error(`stage duration invalid: ${res.error}`);
  }

  const [scope, accessors] = scopeConstructor({
    kind: "stage",
    attributes: attrs([
      ...attributes.filter((a) => !reservedKeys.includes(a.key)),
      {
        key: "roundID",
        value: roundID,
        immutable: true,
      },
      {
        key: "gameID",
        value: gameID,
        immutable: true,
      },
      {
        key: "batchID",
        value: batchID,
        immutable: true,
      },
      {
        key: "start",
        value: false,
        protected: true,
      },
      {
        key: "ended",
        value: false,
        protected: true,
      },
    ]),
  });

  addScopes([scope]);

  return accessors;
}

export class Round extends GameOwned {
  addStage(attributes: { [key: string]: JsonValue } | AttributeInput[]) {
    const batchID = this.get("batchID") as string;
    if (!batchID) {
      throw new Error("missing batch ID on round");
    }

    const gameID = this.get("gameID") as string;
    if (!gameID) {
      throw new Error("missing game ID on round");
    }

    addStage(this.addScopes.bind(this), this.id, gameID, batchID, attributes);
  }
}

export class Stage extends GameOwned {
  get round() {
    return this.scopeByKey("roundID") as Round | undefined;
  }
}

export class Context {}

export type ClassicKinds = {
  batch: Constructor<Batch>;
  game: Constructor<Game>;
  player: Constructor<Player>;
  playerGame: Constructor<PlayerGame>;
  playerRound: Constructor<PlayerRound>;
  playerStage: Constructor<PlayerStage>;
  round: Constructor<Round>;
  stage: Constructor<Stage>;
};

export const classicKinds = {
  batch: Batch,
  game: Game,
  player: Player,
  playerGame: PlayerGame,
  playerRound: PlayerRound,
  playerStage: PlayerStage,
  round: Round,
  stage: Stage,
};
