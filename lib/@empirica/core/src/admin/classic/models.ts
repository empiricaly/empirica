import { State } from "@empirica/tajriba";
import { z } from "zod";
import { Constructor } from "../../shared/helpers";
import { Attributable } from "../../shared/scopes";
import { error, warn } from "../../utils/console";
import { JsonValue } from "../../utils/json";
import { AddScopePayload, StepPayload } from "../context";
import { EventContext } from "../events";
import { Scope } from "../scopes";
import { AttributeInput, attrs, scopeConstructor } from "./helpers";

const isString = z.string().parse;

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

  get isRunning() {
    return this.get("status") === "running";
  }

  async assignPlayer(player: Player) {
    if (this.hasEnded) {
      throw new Error("cannot assign player to ended Game");
    }

    const previousGameID = player.get("gameID");
    const previousGameTreatment = player.get("treatment");

    const treatment = this.get("treatment");
    if (!treatment) {
      warn(`game without treatment: ${this.id}`);

      return;
    }

    player.set("gameID", this.id);
    player.set("treatment", treatment);

    if (
      previousGameTreatment &&
      JSON.stringify(previousGameTreatment) !== JSON.stringify(treatment)
    ) {
      if (previousGameID) {
        warn(
          `reassigning player from ${previousGameID} to ${this.id} with different treatments`
        );
      } else {
        warn(`reassigning player to ${this.id} with different treatment`);
      }
    }

    // Remove player from previous Game.
    // We do this after setting the new gameID on the player so we don't
    // conflict with the other game concurrently starting. If the game is just
    // starting and we change the gameID too late, we might allow that previous
    // Game to start with this player.
    if (previousGameID) {
      this.scopeByID<Game>(<string>previousGameID)?.removePlayer(player);
    }

    // Add player to running game.
    await this.addPlayer(player);
  }

  // Add player to running game
  private async addPlayer(player: Player) {
    if (!this.isRunning) {
      return;
    }

    const otherParticipantIDs = [];
    const groupID = isString(this.get("groupID"));
    const newPlayerNodeIDs = [this.id, groupID];
    const otherNodeIDs = [];

    const stage = this.currentStage;
    if (!stage) {
      return;
    }

    const timerID = stage.get("timerID") as string;
    if (timerID) {
      newPlayerNodeIDs.push(timerID);
    }

    newPlayerNodeIDs.push(stage.id);

    const round = stage.round;
    if (!round) {
      return;
    }

    newPlayerNodeIDs.push(round.id);
    const playerGameID = await this.createPlayerGame(player);
    const playerRoundID = await round.createPlayerRound(player);
    const playerStageID = await stage.createPlayerStage(player);

    if (!playerGameID || !playerRoundID || !playerStageID) {
      return;
    }

    newPlayerNodeIDs.push(player.id);
    newPlayerNodeIDs.push(playerGameID!);
    newPlayerNodeIDs.push(playerRoundID!);
    newPlayerNodeIDs.push(playerStageID!);
    otherNodeIDs.push(playerGameID!);
    otherNodeIDs.push(playerRoundID!);
    otherNodeIDs.push(playerStageID!);

    // We assume the player has already added the gameID.
    for (const plyr of this.players) {
      if (player !== plyr) {
        newPlayerNodeIDs.push(isString(plyr.get(`playerGameID-${this.id}`)));
        newPlayerNodeIDs.push(isString(plyr.get(`playerRoundID-${round.id}`)));
        newPlayerNodeIDs.push(isString(plyr.get(`playerStageID-${stage.id}`)));
        otherParticipantIDs.push(plyr.participantID!);
      }
    }

    await this.addLinks([
      // Add links for new player with games and other players.
      {
        link: true,
        participantIDs: [player.participantID!],
        nodeIDs: newPlayerNodeIDs,
      },
      // Add links for other players with new player.
      {
        link: true,
        participantIDs: otherParticipantIDs,
        nodeIDs: otherNodeIDs,
      },
    ]);
  }

  // Remove player from running game
  private removePlayer(player: Player) {
    if (!this.isRunning) {
      return;
    }

    const participantIDs = [player.participantID!];
    const otherParticipantIDs = [];
    const groupID = isString(this.get("groupID"));
    const nodeIDs = [this.id, groupID, player.id];
    const otherNodeIDs = [player.id];

    const stage = this.currentStage;
    if (!stage) {
      return;
    }

    const timerID = stage.get("timerID") as string;
    if (timerID) {
      nodeIDs.push(timerID);
    }

    nodeIDs.push(stage.id);

    const round = stage.round;
    if (!round) {
      return;
    }

    // Gotta inject player since it might have lost its gameID.
    const players = [...this.players, player];
    for (const plyr of players) {
      nodeIDs.push(isString(plyr.get(`playerRoundID-${round.id}`)));
      nodeIDs.push(isString(plyr.get(`playerStageID-${stage.id}`)));
      nodeIDs.push(isString(plyr.get(`playerGameID-${this.id}`)));

      if (player.id !== plyr.id) {
        nodeIDs.push(plyr.id);
        otherParticipantIDs.push(plyr.participantID!);
      } else {
        otherNodeIDs.push(isString(plyr.get(`playerRoundID-${round.id}`)));
        otherNodeIDs.push(isString(plyr.get(`playerStageID-${stage.id}`)));
        otherNodeIDs.push(isString(plyr.get(`playerGameID-${this.id}`)));
      }
    }

    this.addLinks([
      { link: false, participantIDs, nodeIDs },
      {
        link: false,
        participantIDs: otherParticipantIDs,
        nodeIDs: otherNodeIDs,
      },
    ]);
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

  async createPlayerGame(player: Player) {
    const key = `playerGameID-${this.id}`;
    if (player.get(key)) {
      return isString(player.get(key));
    }

    const batchID = isString(this.get("batchID"));

    const playerGames = await this.addScopes([
      {
        kind: "playerGame",
        attributes: attrs([
          {
            key: "batchID",
            value: batchID,
            immutable: true,
          },
          {
            key: "gameID",
            value: this.id,
            immutable: true,
          },
          {
            key: "playerID",
            value: player.id,
            immutable: true,
          },
        ]),
      },
    ]);

    if (playerGames.length < 1) {
      error(`failed to create playerGame`);

      return;
    }

    player.set(key, playerGames[0]!.id);

    return playerGames[0]!.id;
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

  async createPlayerRound(player: Player) {
    const key = `playerRoundID-${this.id}`;
    if (player.get(key)) {
      return isString(player.get(key));
    }

    const gameID = isString(this.get("gameID"));
    const batchID = isString(this.get("batchID"));

    const playerRounds = await this.addScopes([
      {
        kind: "playerRound",
        attributes: attrs([
          {
            key: "batchID",
            value: batchID,
            immutable: true,
          },
          {
            key: "gameID",
            value: gameID,
            immutable: true,
          },
          {
            key: "roundID",
            value: this.id,
            immutable: true,
          },
          {
            key: "playerID",
            value: player.id,
            immutable: true,
          },
        ]),
      },
    ]);

    if (playerRounds.length < 1) {
      error(`failed to create playerRound`);

      return;
    }

    player.set(key, playerRounds[0]!.id);

    return playerRounds[0]!.id;
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

  async createPlayerStage(player: Player) {
    const key = `playerStageID-${this.id}`;
    if (player.get(key)) {
      return isString(player.get(key));
    }

    const roundID = isString(this.get("roundID"));
    const gameID = isString(this.get("gameID"));
    const batchID = isString(this.get("batchID"));

    const playerStages = await this.addScopes([
      {
        kind: "playerStage",
        attributes: attrs([
          {
            key: "batchID",
            value: batchID,
            immutable: true,
          },
          {
            key: "gameID",
            value: gameID,
            immutable: true,
          },
          {
            key: "roundID",
            value: roundID,
            immutable: true,
          },
          {
            key: "stageID",
            value: this.id,
            immutable: true,
          },
          {
            key: "playerID",
            value: player.id,
            immutable: true,
          },
        ]),
      },
    ]);

    if (playerStages.length < 1) {
      error(`failed to create playerStage`);

      return;
    }

    player.set(key, playerStages[0]!.id);

    return playerStages[0]!.id;
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

export class EventProxy {
  constructor(private ctx: EventContext<Context, ClassicKinds>) {}

  // Returns all loaded Batches.
  get batches() {
    return Array.from(this.ctx.scopesByKind<Batch>("batch").values());
  }

  // Returns all loaded Games accross Batches.
  get games() {
    return Array.from(this.ctx.scopesByKind<Game>("game").values());
  }

  // Returns all loaded Players accross all Games.
  get players() {
    return Array.from(this.ctx.scopesByKind<Player>("player").values());
  }
}

export function evt(ctx: EventContext<Context, ClassicKinds>) {
  return new EventProxy(ctx);
}
