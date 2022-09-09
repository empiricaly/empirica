import { State } from "@empirica/tajriba";
import { z } from "zod";
import { Constructor } from "../../shared/helpers";
import { Attributable } from "../../shared/scopes";
import { error, warn } from "../../utils/console";
import { JsonValue } from "../../utils/json";
import { AddScopePayload, StepPayload } from "../context";
import { Scope } from "../scopes";
import { AttributeInput, attrs, scopeConstructor } from "./helpers";

export const endedStatuses = ["ended", "terminated", "failed"];
export type EndedStatuses = typeof endedStatuses[number];

const reservedKeys = [
  "batchID",
  "gameID",
  "stageID",
  "roundID",
  "start",
  "ended",
  "timerID",
];

const indexSortable = (a: Attributable, b: Attributable) =>
  (a.get("index") as number) - (b.get("index") as number);

export class Batch extends Scope<Context, ClassicKinds> {
  get isRunning() {
    return this.get("status") === "running";
  }

  get games() {
    return this.scopesByKindMatching<Game>("game", "batchID", this.id);
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
    return endedStatuses.includes(this.get("status") as EndedStatuses);
  }
}

export class BatchOwned extends Scope<Context, ClassicKinds> {
  get batch() {
    return this.scopeByKey<Batch>("batchID");
  }
}

export class Game extends BatchOwned {
  get stages() {
    const stages = this.scopesByKindMatching<Stage>("stage", "gameID", this.id);
    stages.sort(indexSortable);
    return stages;
  }

  get players() {
    return this.scopesByKindMatching<Player>("player", "gameID", this.id);
  }

  get currentStage() {
    return this.scopeByKey<Stage>("stageID");
  }

  get currentRound() {
    return this.currentStage?.round;
  }

  get hasEnded() {
    return endedStatuses.includes(this.get("status") as EndedStatuses);
  }

  get hasNotStarted() {
    return !this.get("status");
  }

  assignPlayer(player: Player) {
    const treatment = this.get("treatment");
    if (!treatment) {
      warn(`game without treatment: ${this.id}`);

      return;
    }

    const existingGameID = player.get("gameID");
    if (existingGameID) {
      existingGameID;
    }

    player.set("gameID", this.id);
    player.set("treatment", treatment);
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

    const game = this;
    const gameID = game.id;

    const [scope, accessors] = scopeConstructor({
      kind: "round",
      attributes: attrs([
        ...attributes.filter((a) => !reservedKeys.includes(a.key)),
        {
          key: "newStages",
          value: [],
          protected: true,
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

    const roundProm = this.addScopes([scope]);

    const addStage = (
      attributes: { [key: string]: JsonValue } | AttributeInput[]
    ) => {
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
      const res = z.number().int().gte(1).safeParse(durAttr?.value);
      if (!res.success) {
        throw new Error(`stage duration invalid: ${res.error}`);
      }

      const duration = res.data;

      const [scope, accessors] = scopeConstructor({
        kind: "stage",
        attributes: attrs([
          ...attributes.filter((a) => !reservedKeys.includes(a.key)),
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

      this.addFinalizer(async () => {
        let rounds: AddScopePayload[];
        try {
          rounds = await roundProm;
        } catch (err) {
          error(`failed to create round: ${err}`);

          return;
        }

        if (rounds.length < 1) {
          error(`failed to create round`);

          return;
        }

        // Forced because tested for length > 0
        const roundID = rounds[0]!.id;

        scope.attributes!.push({
          key: "roundID",
          val: JSON.stringify(roundID),
          immutable: true,
        });

        let steps: StepPayload[];
        try {
          steps = await this.addSteps([{ duration }]);
        } catch (err) {
          error(`failed to create steps: ${err}`);

          return;
        }

        if (steps.length < 1) {
          error(`failed to create steps`);

          return;
        }

        // Forced because tested for length > 0
        const stepID = steps[0]!.id;

        scope.attributes!.push({
          key: "timerID",
          val: JSON.stringify(stepID),
          immutable: true,
        });

        const index = (game.get("stageIndex") as number) || 0;

        scope.attributes!.push({
          key: "index",
          val: `${index + 1}`,
          immutable: true,
        });

        game.set("stageIndex", index + 1);

        await this.addScopes([scope]);
      });

      return accessors;
    };

    return {
      ...accessors,
      addStage,
    };
  }

  end(status: EndedStatuses, reason: string) {
    if (this.hasEnded) {
      return;
    }

    if (!endedStatuses.includes(status)) {
      warn(`game: attempting to end game with wrong status`);

      return;
    }

    this.set("status", status);
    this.set("endedReason", reason);

    const stage = this.currentStage;
    if (!stage) {
      return;
    }

    stage.end("ended", reason);
  }
}

export class GameOwned extends BatchOwned {
  get currentGame() {
    return this.scopeByKey<Game>("gameID");
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

    return this.scopeByKey<PlayerGame>(key);
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

    return this.scopeByKey<PlayerRound>(key);
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

    return this.scopeByKey<PlayerStage>(key);
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

export class PlayerStage extends GameOwned {
  get stage() {
    return this.scopeByKey<Stage>("stageID");
  }

  get player() {
    return this.scopeByKey<Player>("playerID");
  }
}

export class Round extends GameOwned {
  addStage(attributes: { [key: string]: JsonValue } | AttributeInput[]) {
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

    const batchID = this.get("batchID") as string;
    if (!batchID) {
      throw new Error("missing batch ID on round");
    }

    const gameID = this.get("gameID") as string;
    if (!gameID) {
      throw new Error("missing game ID on round");
    }

    const [scope, accessors] = scopeConstructor({
      kind: "stage",
      attributes: attrs([
        ...attributes.filter((a) => !reservedKeys.includes(a.key)),
        {
          key: "roundID",
          value: this.id,
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

    this.addScopes([scope]);

    return accessors;
  }
}

export class Stage extends GameOwned {
  get round() {
    return this.scopeByKey<Round>("roundID");
  }

  end(status: EndedStatuses, reason: string) {
    if (this.get("ended")) {
      return;
    }

    this.set("status", status);
    this.set("endedReason", reason);

    this.addTransitions([
      {
        from: State.Running,
        to: State.Ended,
        nodeID: this.get("timerID") as string,
        cause: reason,
      },
    ]);
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
