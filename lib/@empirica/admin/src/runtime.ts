import {
  Attribute,
  EventType,
  Group,
  OnEventPayload,
  Participant,
  Scope,
  State,
  Step,
  TajribaAdmin,
  Transition,
} from "@empirica/tajriba";
import { EmpiricaEvent as EE, EventCallback } from "./events";
import { Hooks } from "./hooks";
import {
  Batch,
  Change,
  EAttribute,
  Game,
  getSetter,
  Round,
  scopedScope,
  Stage,
  Store,
} from "./store";

class EventEmitter {
  private listeners: { [event: string]: ((...args: any[]) => void)[] } = {};

  constructor(public processChanges: () => Promise<void>) {}

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      console.error(`events: removing non-existing listener: ${event}`);
      return;
    }

    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  async emit(event: string, scope: getSetter | null, ...args: any[]) {
    if (!this.listeners[event]) {
      return;
    }

    for (const listener of this.listeners[event]) {
      listener(...args);
      await this.processChanges();
    }

    if (scope) {
      scope.set(event, true, { immutable: true });
    }
  }
}

export class Runtime {
  private emitter: EventEmitter;

  constructor(private taj: TajribaAdmin, private store: Store) {
    this.emitter = new EventEmitter(this.processChanges.bind(this));
  }

  async init(hooks?: Hooks) {
    if (hooks) {
      for (const event in hooks.hooks) {
        for (const cb of hooks.hooks[event]) {
          this.on(event, cb);
        }
      }
    }

    this.taj.onEvent(
      {
        eventTypes: [
          EventType.ParticipantAdd,
          EventType.ParticipantConnect,
          EventType.ParticipantDisconnect,
          EventType.ParticipantConnected,
          EventType.ScopeAdd,
          EventType.TransitionAdd,
          EventType.AttributeUpdate,
          // EventType.LinkAdd,
          // EventType.StepAdd,
          // EventType.GroupAdd,
        ],
      },
      this.processEvent.bind(this)
    );

    const arg = { name: "empirica-root" };
    const filter = [arg];

    let rootScope: Scope;
    try {
      rootScope = <Scope>await this.taj.addScope(arg);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.error("unknown fetch scope error", err);

        throw err;
      }

      try {
        const scopes = await this.taj.scopes({ filter, first: 1 });
        if (!scopes || scopes.totalCount == 0) {
          throw new Error("scope creation failed");
        }

        rootScope = <Scope>scopes.edges[0].node;
      } catch (err) {
        console.error("failed to fetch scope", err);

        throw err;
      }
    }

    this.store.addScope(rootScope);
    await this.getScopesOfKind("batch");
    await this.getScopesOfKind("game");
    await this.getScopesOfKind("round");
    await this.getScopesOfKind("stage");
    await this.getSteps();
    await this.getParticipants();

    for (const id in this.store.batches) {
      const batch = this.store.batches[id];
      if (!batch.get(EE.NewBatch)) {
        await this.emitter.emit(EE.NewBatch, batch, { batch });
      }
    }

    for (const id in this.store.games) {
      const game = this.store.games[id];
      if (!game.get(EE.NewGame)) {
        await this.emitter.emit(EE.NewGame, game, { game });
      }
    }

    for (const id in this.store.players) {
      const player = this.store.players[id];
      if (!player.get(EE.NewPlayer)) {
        await this.emitter.emit(EE.NewPlayer, player, { player });
      }
    }

    for (const id in this.store.games) {
      const game = this.store.games[id];
      const currentStageID = game.get("currentStageID") as string;
      if (!currentStageID) {
        continue;
      }

      const stage = this.store.stages[currentStageID];
      if (!stage) {
        console.warn("games: currentStage missing");
        continue;
      }

      game.currentStage = stage;

      if (!stage.step) {
        console.warn("games: stage step missing");
        continue;
      }

      // switch (stage.step.state) {
      //   case State.Created:
      //     // TODO start step

      //     break;
      //   default:
      //     continue;
      // }
    }
  }

  private async getSteps(after?: string) {
    const steps = await this.taj.steps({
      first: 100,
      after,
    });

    if (!steps) {
      return;
    }

    for (const step of steps.edges) {
      this.store.addStep(<Step>step.node);
    }

    const hasMore = steps.pageInfo.hasNextPage;
    if (!hasMore) {
      return;
    }

    const nextAfter = steps.pageInfo.endCursor;
    if (!nextAfter) {
      throw new Error("invalid pagination info for steps");
    }

    await this.getSteps(nextAfter);
  }

  private async getParticipants(after?: string) {
    const participants = await this.taj.participants({
      first: 100,
      after,
    });

    if (!participants) {
      return;
    }

    for (const participant of participants.edges) {
      this.store.addParticipant(<Participant>participant.node);
    }

    const hasMore = participants.pageInfo.hasNextPage;
    if (!hasMore) {
      return;
    }

    const nextAfter = participants.pageInfo.endCursor;
    if (!nextAfter) {
      throw new Error("invalid pagination info for participants");
    }

    await this.getParticipants(nextAfter);
  }

  private async getScopesOfKind(kind: string, after?: string) {
    const scopes = await this.taj.scopes({
      filter: { kind },
      first: 100,
      after,
    });

    if (!scopes) {
      return;
    }

    for (const scope of scopes.edges) {
      const scp = this.store.addScope(<Scope>scope.node);
      if (!scp) {
        continue;
      }

      for (const key in scp.attributes) {
        await this.handleAttribute(scp.attributes[key], true);
      }

      if (scope.node.attributes.pageInfo.hasNextPage) {
        await this.getExtraAttributes(
          scope.node.id,
          scope.node.attributes.pageInfo.endCursor
        );
      }
    }

    const hasMore = scopes.pageInfo.hasNextPage;
    if (!hasMore) {
      return;
    }

    const nextAfter = scopes.pageInfo.endCursor;
    if (!nextAfter) {
      throw new Error("invalid pagination info for scope");
    }

    await this.getScopesOfKind(kind, nextAfter);
  }

  private async getExtraAttributes(scopeID: string, after?: string) {
    const attributes = await this.taj.attributes({
      scopeID,
      first: 100,
      after,
    });

    if (!attributes) {
      return;
    }

    for (const attribute of attributes.edges) {
      const attr = this.store.updateAttribute(<Attribute>attribute.node);
      if (attr) {
        await this.handleAttribute(attr, true);
      }
    }

    const hasMore = attributes.pageInfo.hasNextPage;

    if (!hasMore) {
      return;
    }

    const nextAfter = attributes.pageInfo.endCursor;
    if (!nextAfter) {
      throw new Error("invalid pagination info for scope");
    }

    await this.getExtraAttributes(scopeID, nextAfter);
  }

  on<K>(eventType: EE | string, listener: EventCallback<K>) {
    this.emitter.on(eventType, listener);

    return () => {
      this.emitter.off(eventType, listener);
    };
  }

  async createBatch(attr: Object) {}

  stop() {
    // should stop conns
  }

  private async processEvent(
    payload: OnEventPayload,
    error: Error | undefined
  ) {
    if (error) {
      console.error("onAnyEvent error", error);
      return;
    }

    switch (payload.eventType) {
      case EventType.ParticipantAdd: {
        const player = this.store.addParticipant(<Participant>payload.node);
        await this.emitter.emit(EE.NewPlayer, player, { player });

        break;
      }
      case EventType.ParticipantConnect: {
        const player = this.store.addParticipant(<Participant>payload.node);
        this.store.playerStatus(player, true);
        await this.emitter.emit(EE.PlayerConnected, null, { player });

        break;
      }
      case EventType.ParticipantConnected: {
        const player = this.store.addParticipant(<Participant>payload.node);
        this.store.playerStatus(player, true);
        await this.emitter.emit(EE.PlayerConnected, null, { player });

        break;
      }
      case EventType.ParticipantDisconnect: {
        const player = this.store.addParticipant(<Participant>payload.node);
        this.store.playerStatus(player, false);
        await this.emitter.emit(EE.PlayerDisonnected, null, { player });

        break;
      }
      case EventType.ScopeAdd: {
        const scope = this.store.addScope(<Scope>payload.node);
        if (scope instanceof Batch) {
          const batch = <Batch>scope;
          await this.emitter.emit(EE.NewBatch, batch, { batch });
        }

        break;
      }
      case EventType.TransitionAdd: {
        const step = this.store.addTransition(<Transition>payload.node);
        if (!step?.scope) {
          console.error("steps: received transition without step");
          return;
        }

        const stage = <Stage>step.scope;

        await this.handleTransition(stage);
        break;
      }
      case EventType.AttributeUpdate: {
        const attr = <Attribute>payload.node;
        const attribute = this.store.updateAttribute(<Attribute>payload.node);

        if (attribute) {
          await this.handleAttribute(attribute, attr.version === 1);
        }

        break;
      }
      default:
        console.warn("Unhandled event", payload.eventType, payload.node);
        break;
    }
  }

  async processChanges() {
    const changes = this.store.popChanges();

    for (const change of changes) {
      await this.processChange(change);
    }
  }

  async processChange(change: Change) {
    switch (change.type) {
      case "newScope": {
        console.log("newScope");

        if (!change.scope) {
          console.warn("newScope change.scope missing", change);
          return;
        }

        const kind = change.scope.type;
        const scope = <Scope>await this.taj.addScope({ kind });
        change.scope.scope = scope;
        change.scope.postProcess();

        switch (kind) {
          case "game":
            const game = <Game>change.scope;
            const group = await this.taj.addGroup({ participantIDs: [] });
            game.set("groupID", group.id, { protected: true });
            game.group = <Group>group;
            break;
          case "stage":
            const stage = <Stage>change.scope;
            const step = await this.taj.addStep({ duration: stage.duration });
            stage.set("stepID", step.id, { protected: true });
            this.store.addStep(<Step>step);
            // stage.step = new EStep(this.store, <Step>step);
            break;
          default:
            break;
        }

        break;
      }
      case "newAssignment": {
        console.log("newAssignment");

        if (!change.player) {
          console.warn("newAssignment change.player missing", change);
          return;
        }

        if (!change.player.currentGame) {
          console.warn("newAssignment player.currentGame missing", change);
          return;
        }

        const game = change.player.currentGame;
        const playerIDs = (game.get("playerIDs") as string[]) || [];
        playerIDs.push(change.player.participant.id);
        game.set("playerIDs", playerIDs, { protected: true });

        break;
      }
      case "updateAttribute": {
        console.log("updateAttribute");

        if (
          !change.attr ||
          !change.attr.attribute ||
          !change.attr.scope.scope
        ) {
          console.warn("newAssignment change.player missing", change);
          return;
        }

        const attrArg = {
          key: change.attr.attribute.key,
          val: JSON.stringify(change.attr.value),
          nodeID: change.attr.scope.scope.id,
        };

        const args = change.attr.ao || {};

        const attr = <Attribute>await this.taj.setAttribute({
          ...attrArg,
          ...args,
        });

        change.attr.attribute = attr;

        break;
      }
      case "start": {
        console.log("start");

        if (!change.scope) {
          console.warn("start change.scope missing", change);
          return;
        }

        let game = change.scope;
        if (!(game instanceof Game)) {
          if (!(game instanceof Stage)) {
            console.warn("start change.scope not a game", change);
            return;
          }

          game = game.round.game;
        }

        await this.emitter.emit(EE.GameInit, null, { game });
        await this.startGame(<Game>game);

        break;
      }
      case "cancel": {
        console.log("cancel");

        console.warn("TODO implement cancel game");

        break;
      }
      case "pause": {
        console.log("pause");

        console.warn("TODO implement pause game");

        break;
      }
      case "end": {
        console.log("end");

        console.warn("TODO implement end game/stage");

        break;
      }
    }
  }

  async handleAttribute(attribute: EAttribute, isNew: boolean) {
    if (!attribute.attribute) {
      console.warn("scope: unsaved attribute", attribute);
      return;
    }

    let event = `${attribute.scope.type}-${attribute.key}`;
    const arg = { [attribute.scope.type]: attribute.scope };
    let getSet: getSetter = attribute.scope;
    if (attribute.isCompound) {
      const { cType, cKey, subType, subID } = attribute.compoundElements!;
      event = `${cType}-${cKey}`;
      arg[subType] = this.store.scopes[subID];
      getSet = scopedScope(attribute.scope, subType, subID);
    }

    if (isNew) {
      event = `new-${event}`;
    } else {
      event = `change-${event}`;
    }

    await this.emitter.emit(event, getSet, arg);
  }

  async handleTransition(stage: Stage) {
    switch (stage.step?.state) {
      case State.Created:
        return;
      case State.Running:
        // TODO Game is running, noop?
        return;
      case State.Paused:
        // TODO mark game paused and all
        return;
      case State.Ended:
        // await this.endOfStage(stage);
        // TODO End stage, maybe end game and all
        return;
      case (State.Terminated, State.Failed):
        // TODO End stage, end game and all
        return;
      default:
        console.warn("steps: non-transition transition", stage);
    }
  }

  async endOfStage(stage: Stage) {
    await this.emitter.emit(EE.StageEnd, stage, { stage });

    const [nextRound, nextStage] = roundStageAfter(stage.round.game, stage.id);

    if (!nextRound || nextRound.id !== stage.round.id) {
      await this.emitter.emit(EE.RoundEnd, stage.round, { round: stage.round });
    }

    if (!nextRound || !nextStage) {
      await this.gameEnd(stage.round.game);

      return;
    }

    await this.startStage(nextStage);
  }

  async startGame(game: Game) {
    validateGame(game);

    const playerIDs = game.players.map((p) => p.id);
    const nodeIDs = [];

    nodeIDs.push(game.id);
    nodeIDs.push(game.get("groupID") as string);
    for (const round of game.rounds) {
      nodeIDs.push(round.id);
      for (const stage of round.stages) {
        nodeIDs.push(stage.id);
        nodeIDs.push(stage.get("stepID") as string);
      }
    }
    for (const player of game.players) {
      nodeIDs.push(player.id);
    }

    this.taj.link({
      participantIDs: playerIDs,
      nodeIDs: nodeIDs,
    });

    const stage = firstStage(game);

    if (stage) {
      await this.startStage(stage);
      game.set("state", "started", { protected: true });
    } else {
      await this.gameEnd(game);
    }
  }

  async startStage(stage: Stage) {
    const stepID = stage.get("stepID") as string;
    if (!stepID) {
      throw new Error("stage without stepID");
    }

    stage.round.game.currentStage = stage;

    if (stage.round.stages[0].id === stage.id) {
      await this.emitter.emit(EE.RoundStart, null, { round: stage.round });
    }

    await this.emitter.emit(EE.StageStart, null, { stage });

    stage.round.game.set("currentStageID", stage.id, { protected: true });

    await this.taj.transition({
      from: stage.step?.state || State.Created,
      to: State.Running,
      nodeID: stepID,
    });
  }

  async gameEnd(game: Game) {
    this.emitter.emit(EE.GameEnd, game, { game });
    game.set("state", "ended", { protected: true });
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
}

function roundStageAfter(
  game: Game,
  stageID: string
): [Round | null, Stage | null] {
  for (let i = 0; i < game.rounds.length; i++) {
    const r = game.rounds[i];
    for (let j = 0; j < r.stages.length; j++) {
      const s = r.stages[j];
      if (stageID == s.id) {
        if (r.stages[j + 1]) {
          return [r, r.stages[j + 1]];
        }

        if (game.rounds[i + 1]) {
          return [game.rounds[i + 1], game.rounds[i + 1].stages[0]];
        }

        return [null, null];
      }
    }
  }

  return [null, null];
}

function validateGame(game: Game) {
  if (game.get("state")) {
    throw new Error("games: cannot start game, already started");
  }

  if (game.rounds.length === 0) {
    throw new Error("games: cannot start game without rounds");
  }

  const groupID = game.get("groupID");
  if (!groupID || typeof groupID !== "string") {
    throw new Error("games: cannot start game without group");
  }

  for (const round of game.rounds) {
    if (round.stages.length === 0) {
      throw new Error("games: cannot start game with rounds without stages");
    }

    for (const stage of round.stages) {
      const stepID = stage.get("stepID");
      if (!stepID) {
        throw new Error("cannot start game with stages without step");
      }
      if (typeof stepID !== "string") {
        throw new Error(
          `games: cannot start game with invalid stages stepID type: ${stepID}`
        );
      }
    }
  }

  if (game.players.length === 0) {
    throw new Error("games: cannot start game without players");
  }
}

function firstStage(game: Game) {
  const stageID = game.get("currentStageID");

  if (stageID) {
    for (const round of game.rounds) {
      for (const stage of round.stages) {
        if (stage.id === stageID) {
          return stage;
        }
      }
    }

    throw new Error(`games: missing stage for game stageID: ${stageID}`);
  }

  return game.rounds[0].stages[0];
}
