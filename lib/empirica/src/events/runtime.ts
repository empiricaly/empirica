import {
  EventType,
  OnEventPayload,
  Participant,
  Scope as Scp,
  State,
  TajribaAdmin,
  Transition,
} from "tajriba";
import { Base, BaseC } from "../models/base";
import { Batch, BatchC } from "../models/batch";
import { Game, GameC } from "../models/game";
import { Player, PlayerC } from "../models/player";
import { ObjectPool } from "../models/pool";
import { Round, RoundC } from "../models/round";
import { Stage, StageC } from "../models/stage";
import { Context } from "./context";
import { Emitter } from "./emitter";
import { EmpiricaEvent } from "./events";

export class Runtime {
  constructor(
    private taj: TajribaAdmin,
    private pool: ObjectPool,
    private emitter: Emitter,
    private context: Context
  ) {
    emitter.listenTaj(this.processEvent.bind(this));
  }

  async processChanges() {
    const changes = this.pool.queuedChanges();

    console.log("changes", changes);

    for (const change of changes) {
      switch (true) {
        case change instanceof BatchC: {
          await this.processBatch(<BatchC>change);
          // return;
          break;
        }
        case change instanceof GameC: {
          await this.processGame(<GameC>change);
          break;
        }
        case change instanceof RoundC: {
          await this.processRound(<RoundC>change);
          break;
        }
        case change instanceof StageC: {
          await this.processStage(<StageC>change);
          break;
        }
        case change instanceof PlayerC: {
          await this.processPlayer(<PlayerC>change);
          break;
        }
        default:
          console.warn("unknown change", change);
      }
    }
  }

  private async processEvent(
    payload: OnEventPayload,
    error: Error | undefined
  ) {
    if (error) {
      console.error("onAnyEvent", error);
      return;
    }

    switch (payload.eventType) {
      case EventType.ParticipantAdd: {
        const p = <Participant>payload.node;
        const player = <Player>await this.pool.object("player", p.id);
        this.emitter.trigger(EmpiricaEvent.NewPlayer, {
          player: <PlayerC>player.ctx,
        });
        break;
      }
      case EventType.ParticipantConnect: {
        const p = <Participant>payload.node;
        const player = <Player>await this.pool.object("player", p.id);
        this.emitter.trigger(EmpiricaEvent.PlayerConnected, {
          player: <PlayerC>player.ctx,
        });
        break;
      }
      case EventType.ParticipantConnected: {
        const p = <Participant>payload.node;
        const player = <Player>await this.pool.object("player", p.id);
        this.emitter.trigger(EmpiricaEvent.PlayerConnected, {
          player: <PlayerC>player.ctx,
        });
        break;
      }
      case EventType.ParticipantDisconnect: {
        const p = <Participant>payload.node;
        const player = <Player>await this.pool.object("player", p.id);
        this.emitter.trigger(EmpiricaEvent.PlayerDisonnected, {
          player: <PlayerC>player.ctx,
        });
        break;
      }
      case EventType.ScopeAdd: {
        const s = <Scp>payload.node;
        const obj = await this.pool.add(s, true);
        if (obj instanceof Batch) {
          await this.triggerNewBatch(<Batch>obj);
        }
        break;
      }
      case EventType.TransitionAdd: {
        const t = <Transition>payload.node;
        const stage = <Stage>this.pool.objectForStep(t.node.id);
        if (!stage) {
          console.error(`missing stage for stepID: ${t.node.id}`);
          return;
        }

        await this.handleTransition(t, stage);
      }
      default:
        break;
    }
  }

  async handleTransition(transition: Transition, stage: Stage) {
    if (transition.to !== State.Ended && transition.to !== State.Terminated) {
      return;
    }

    await this.endOfStage(stage);
  }

  async endOfStage(stage: Stage) {
    const { batch, game, round } = stageParents(stage);

    await this.emitter.trigger(EmpiricaEvent.StageEnd, {
      stage: <StageC>stage.ctx,
    });
    // await this.processBatch(<BatchC>batch.ctx);
    this.processChanges();

    const [nextRound, nextStage] = game.roundStageAfter(stage.id);

    if (!nextRound || nextRound.id !== round.id) {
      await this.emitter.trigger(EmpiricaEvent.RoundEnd, {
        round: <RoundC>round.ctx,
      });
      // await this.processBatch(<BatchC>batch.ctx);
      this.processChanges();
    }

    if (!nextRound || !nextStage) {
      await this.gameEnd(game);
      return;
    }

    await this.startStage(nextStage);
  }

  async triggerNewBatch(batch: Batch) {
    this.emitter.trigger(EmpiricaEvent.NewBatch, { batch: <BatchC>batch.ctx });

    // await this.processBatch(<BatchC>batch.ctx);
    this.processChanges();
  }

  async startGame(game: Game) {
    game.validate();

    const playerIDs = game.players.map((p) => p.id);
    const nodeIDs = [];

    nodeIDs.push(game.scope.id);
    nodeIDs.push(game.getInternal("groupID"));
    for (const round of game.rounds) {
      nodeIDs.push(round.scope.id);
      for (const stage of round.stages) {
        nodeIDs.push(stage.scope.id);
        nodeIDs.push(stage.getInternal("stepID"));
      }
    }
    for (const player of game.players) {
      nodeIDs.push(player.scope.id);
    }

    this.taj.link({
      participantIDs: playerIDs,
      nodeIDs: nodeIDs,
    });

    const stage = game.firstStage();

    if (stage) {
      await this.startStage(stage);
      game.setInternal("state", "started");
    } else {
      await this.gameEnd(game);
    }
  }

  async startStage(stage: Stage) {
    const { batch, game, round } = stageParents(stage);

    const stepID = stage.getInternal("stepID");
    if (!stepID) {
      throw new Error("stage without stepID");
    }

    if (round.stages[0].id === stage.id) {
      for (const player of game.players) {
        (<PlayerC>player.ctx).setContext(<GameC>game.ctx, <RoundC>round.ctx);
      }

      await this.emitter.trigger(EmpiricaEvent.RoundStart, {
        round: <RoundC>round.ctx,
      });
      // await this.processBatch(<BatchC>batch.ctx);
      this.processChanges();
    }

    for (const player of game.players) {
      (<PlayerC>player.ctx).setContext(
        <GameC>game.ctx,
        <RoundC>round.ctx,
        <StageC>stage.ctx
      );
    }

    await this.emitter.trigger(EmpiricaEvent.StageStart, {
      stage: <StageC>stage.ctx,
    });
    // await this.processBatch(<BatchC>batch.ctx);
    this.processChanges();

    game.setInternal("currentStageID", stage.id);

    await this.taj.transition({
      from: State.Created,
      to: State.Running,
      nodeID: stepID,
    });
  }

  async transitionGame(game: Game) {
    const { from, to } = (<GameC>game.ctx)._state;

    if (to === from) {
      return;
    }

    switch (to) {
      case State.Running:
        switch (from) {
          case State.Created:
            game.updateState(State.Running);
            await this.gameInit(game);
            break;
          case State.Paused:
            game.updateState(State.Running);
            break;
          case State.Running:
            // No state change, should be caught above.
            return;
          default:
            throw new Error("cannot restart an ended game");
        }

        await this.startGame(game);

        break;
      case State.Paused:
        if (from !== State.Running) {
          throw new Error("cannot restart an ended game");
        }

        await this.startGame(game);

        break;
      case State.Terminated:
        // TODO terminate game
        break;
      default:
        throw new Error("unknown game transition");
    }
  }

  async gameInit(game: Game) {
    if (!game.batch) {
      throw new Error(`unknown batch for game ${game.id}`);
    }

    this.emitter.trigger(EmpiricaEvent.GameInit, { game: <GameC>game.ctx });

    // await this.processBatch(<BatchC>game.batch.ctx);
    this.processChanges();
  }

  async gameEnd(game: Game) {
    if (!game.batch) {
      throw new Error(`unknown batch for game ${game.id}`);
    }
    this.emitter.trigger(EmpiricaEvent.GameEnd, { game: <GameC>game.ctx });
    // await this.processBatch(<BatchC>game.batch.ctx);
    this.processChanges();
    game.setInternal("state", "ended");
  }

  async processBatch(batchC: BatchC) {
    const batch = <Batch>await this.pool.object("batch", batchC.id, batchC);
    batchC.base = batch;
    setAttrs(batch, batchC);

    const gameIDs = [];
    for (const g of batchC.games) {
      const game = await this.processGame(g, batch.id);
      gameIDs.push(game.id);
    }

    await addMissingIds(batch, "gameIDs", "_games", "game", gameIDs);
  }

  async processPlayer(playerC: PlayerC) {
    const player = <Player>(
      await this.pool.object("player", playerC.id, playerC)
    );
    setAttrs(player, playerC);

    return player;
  }

  async processGame(gameC: GameC, parentID?: string) {
    const game = <Game>await this.pool.object("game", gameC.id, gameC);
    if (parentID) {
      game.parentID = parentID;
    } else if (!game.parentID) {
      console.warn("processing game without parentID");
    }
    gameC.base = game;
    setAttrs(game, gameC);

    if (!game.getInternal("treatment")) {
      game.setInternal("treatment", gameC.treatment, true);
    }

    const players = [];
    const playerIDs = [];
    for (const playerC of gameC.players) {
      const player = await this.processPlayer(playerC);
      player.setInternal("gameID", game.id);
      players.push(player);
      playerIDs.push(player.id);
    }

    if (playerIDs.length > 0) {
      await addMissingIds(game, "playerIDs", "_players", "players", playerIDs);
    }

    let groupID = game.getInternal("groupID");
    if (!groupID) {
      const group = await this.taj.addGroup({ participantIDs: playerIDs });
      groupID = group.id;
      game.setInternal("groupID", groupID, true);
    }

    const roundIDs = [];
    for (const r of gameC.rounds) {
      const round = await this.processRound(r, game.id);
      roundIDs.push(round.id);
    }

    await addMissingIds(game, "roundIDs", "_rounds", "round", roundIDs);

    await this.transitionGame(game);

    return game;
  }

  async processRound(roundC: RoundC, parentID?: string) {
    const round = <Round>await this.pool.object("round", roundC.id, roundC);
    if (parentID) {
      round.parentID = parentID;
    } else if (!round.parentID) {
      console.warn("processing round without parentID");
    }
    roundC.base = round;
    setAttrs(round, roundC);

    const stageIDs = [];
    for (const s of roundC.stages) {
      const stage = await this.processStage(s, round.id);
      stageIDs.push(stage.id);
    }

    await addMissingIds(round, "stageIDs", "_stages", "stage", stageIDs);

    return round;
  }

  async processStage(stageC: StageC, parentID?: string) {
    const stage = <Stage>await this.pool.object("stage", stageC.id, stageC);
    if (parentID) {
      stage.parentID = parentID;
    } else if (!stage.parentID) {
      console.warn("processing stage without parentID");
    }
    stageC.base = stage;

    const duration = stage.getInternal("duration");
    if (duration === undefined) {
      stage.setInternal("duration", stageC.duration, true);
      stage.setInternal("name", stageC.name, true);
    }

    setAttrs(stage, stageC);

    let stepID = stage.getInternal("stepID");
    if (!stepID) {
      const step = await this.taj.addStep({ duration: stageC.duration });
      stepID = step.id;
      stage.setStepID(step.id);
    }

    if (stageC.ended) {
      const game = stage.round!.game;
      if (!game) {
        console.warn("stage ending without game");
        return stage;
      }

      if (stage !== game.currentStage) {
        console.warn("stage ending not current");
        return stage;
      }

      console.log({
        from: State.Running,
        to: State.Ended,
        nodeID: stepID,
      });
      try {
        await this.taj.transition({
          from: State.Running,
          to: State.Ended,
          nodeID: stepID,
        });
      } catch (error) {
        console.log("failed transition", error);
      }
    }

    return stage;
  }
}

function setAttrs(b: Base, bc: BaseC) {
  // TODO optimization, add keys in bulk
  for (const key in bc._ks) {
    b.set(key, bc._ks[key], bc._kopts[key]);
  }

  bc._ks = {};
  bc._kopts = {};
}

async function addMissingIds(
  b: Base,
  key: string,
  field: string,
  typ: string,
  newIDs: string[]
) {
  const [ids, idsAdded, hasNew] = await b.updateIDs(newIDs, field, typ);

  if (hasNew) {
    b.setInternal(key, ids);
  }

  return idsAdded;
}

function stageParents(stage: Stage) {
  const round = stage.round;
  if (!round) {
    throw new Error(`unknown round for stage ${stage.id}`);
  }

  const game = round.game;
  if (!game) {
    throw new Error(`unknown game for stage ${stage.id}`);
  }

  const batch = game.batch;
  if (!batch) {
    throw new Error(`unknown batch for stage ${stage.id}`);
  }

  return { batch, game, round };
}
