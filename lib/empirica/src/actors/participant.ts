import { EventEmitter } from "events";
import { Readable, Writable, writable } from "svelte/store";
import { Attribute, Node, TajribaParticipant } from "tajriba";
import { ObjectPool } from "../models/pool";
import { internalPrefix, Scope } from "../scope";

class EObj {
  protected scope: Scope;
  constructor(
    scpid: string,
    readonly id: string,
    name: string,
    protected participant: Participant
  ) {
    this.scope = new Scope(scpid, name, participant.taj);
  }

  updateAttr(at: Attribute, isNew: boolean) {
    this.scope.updateAttr(at, isNew);
  }

  get(key: string) {
    return this.scope.get(key);
  }

  getInternal(key: string) {
    return this.scope.get(`${internalPrefix}:${key}`);
  }

  subInternal(key: string) {
    return this.scope.sub(`${internalPrefix}:${key}`);
  }

  set(key: string, val: any, immutable: boolean = false) {
    this.scope.set(key, val, { immutable });
  }

  setInternal(key: string, val: any, immutable: boolean = false) {
    this.scope.set(`${internalPrefix}:${key}`, val, { immutable });
  }
}

export class Player extends EObj {}

export class Round extends EObj {
  get stages(): Stage[] {
    const stageIDs = this.getInternal("stageIDs");
    const stages = [];
    for (const id in this.participant._objs) {
      if (stageIDs.includes(id)) {
        stages.push(<Stage>this.participant._objs[id]);
      }
    }

    return stages;
  }
}

export class Stage extends EObj {
  remaining: Writable<number | null> = writable(null);
  timeoutID?: ReturnType<typeof setTimeout>;
  ended: boolean = false;

  get round(): Round | undefined {
    const round: Round | undefined = <Round | undefined>Object.values(
      this.participant._objs
    ).find((o) => {
      const stgIds = o.getInternal("stageIDs");
      if (stgIds && stgIds.includes(this.id)) {
        return o;
      }
    });

    return round;
  }

  get name() {
    return this.getInternal("name");
  }

  clearTimer() {
    this.clearTimout();
    this.remaining.set(0);
    this.ended = true;
  }

  clearTimout() {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
  }

  setTimer(from: Date, remaining: number) {
    this.clearTimout();

    const ellapsed = new Date().valueOf() - from.valueOf();
    let rem = remaining * 1000 - ellapsed;

    // console.log("ellapsed", ellapsed);
    // console.log("rem", rem);

    if (rem < 0) {
      return;
    }

    const remmod = rem % 1000;
    // console.log("remmod", remmod);

    let wait = 1000;
    if (remmod > 0) {
      wait = remmod;
    }

    rem -= wait;

    // console.log("rem2", rem);
    // console.log("wait", wait);

    this.timeoutID = setTimeout(() => {
      this.setTimer(from, remaining);
      const ellapsed = new Date().valueOf() - from.valueOf();
      let rem = remaining * 1000 - ellapsed;
      const val = Math.round(rem / 1000);
      if (val < 0) {
        return;
      }
      const r = Math.abs(val);
      this.remaining.set(r);
    }, wait);
  }
}

export class Game extends EObj {
  get state() {
    const state = this.getInternal("state");
    if (state) {
      return (<string>state).toLowerCase();
    }

    return "created";
  }

  get currentStage(): Stage | undefined {
    const stgID = this.getInternal("currentStageID");
    const stg = this.participant._stages.find((s) => s.id === stgID);
    return stg;
  }

  get treatment() {
    return this.getInternal("treatment");
  }

  get players(): Player[] {
    return Object.values(this.participant._players);
  }

  get rounds(): Round[] {
    const roundIDs = this.getInternal("roundIDs");
    const rounds = [];
    for (const id in this.participant._objs) {
      if (roundIDs.includes(id)) {
        rounds.push(<Round>this.participant._objs[id]);
      }
    }

    return rounds;
  }
}

export class Participant {
  private emitter: EventEmitter;
  private _game: Game | null = null;
  private _gameW: Writable<Game | null> = writable(null);
  _stages: Stage[] = [];
  _players: { [key: string]: Player } = {};
  _objs: { [key: string]: EObj } = {};

  constructor(readonly taj: TajribaParticipant) {
    this.emitter = new EventEmitter();
  }

  stop() {
    this.taj.stop();
  }

  start() {
    this.taj.changes((chg, err) => {
      if (err) {
        console.error("changes: callback error");
        console.error(err);

        return;
      }

      const { change, done, removed } = chg;

      // console.log("change", change, done, removed);
      this.emitter.emit("change", change);

      switch (change.__typename) {
        case "ScopeChange":
          const [t, id] = ObjectPool.parseName(change.name);

          let obj: EObj | undefined;

          switch (t) {
            case "game":
              this._game = new Game(change.id, id, change.name, this);
              obj = this._game;
              this._gameW.set(this._game);
              break;
            case "player":
              obj = this.updatePlayer(id);
              break;
            case "round":
              obj = new Round(change.id, id, change.name, this);
              break;
            case "stage":
              const stage = new Stage(change.id, id, change.name, this);
              this._stages.push(stage);
              obj = stage;
              break;
            default:
              console.warn("unknow type", t);
              break;
          }

          if (!this._objs[change.id] && obj) {
            this._objs[change.id] = obj;
          }

          break;
        case "ParticipantChange":
          this.updatePlayer(change.id);
          break;
        case "StepChange":
          let stage: Stage | undefined;
          for (const stg of this._stages) {
            if (change.id === stg.getInternal("stepID")) {
              stage = stg;
              break;
            }
          }

          if (!stage) {
            console.warn("stageChange: stage not found");
            console.dir(change.id);
            console.dir(
              this._stages.map((s) => [s.id, s.getInternal("stepID")])
            );

            return;
          }

          if (change.running) {
            if (!change.since) {
              console.warn("since is null");
              return;
            }

            if (!change.remaining) {
              console.warn("remaining is null");
              return;
            }

            stage.setTimer(new Date(change.since), change.remaining);
          } else {
            stage.clearTimer();
          }

          // DBG [22:26:31.811] change {
          //   __typename: 'StepChange',
          //   id: '7chprt8u27c6m222',
          //   since: '2021-08-08T22:26:31+08:00',
          //   remaining: 5,
          //   ellapsed: 0,
          //   running: true
          // }
          // DBG [22:26:36.812] change {
          //   __typename: 'StepChange',
          //   id: '7chprt8u27c6m222',
          //   since: null,
          //   remaining: null,
          //   ellapsed: null,
          //   running: false
          // }
          break;
        case "AttributeChange":
          // __typename: 'AttributeChange',
          // id: '7chn5nbw2bc6m222',
          // nodeID: '7chn5dhk23c6m222',
          // deleted: false,
          // index: null,
          // vector: false,
          // key: 'ei:state',
          // val: '"ended"'
          if (!this._objs[change.nodeID]) {
            console.warn("cannot update attr", change.key);
            return;
          }

          const attr = <Attribute>{
            id: change.id,
            deletedAt: change.deleted ? new Date() : undefined,
            key: change.key,
            val: change.val,
            index: change.index,
            vector: change.vector,
            node: <Node>{ id: change.nodeID },
          };

          this._objs[change.nodeID].updateAttr(attr, change.isNew);
          break;
        default:
          console.warn("unknown change", change);
          break;
      }

      if (done) {
        this._gameW.set(this._game);
      }
    });
  }

  get player() {
    return this._players[this.taj.id];
  }

  private updatePlayer(id: string) {
    if (!this._players[id]) {
      this._players[id] = new Player(id, id, `player:${id}`, this);
    }

    return this._players[id];
  }

  private on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
    return () => {
      this.emitter.off(event, listener);
    };
  }

  onChange(listener: (...args: any[]) => void) {
    return this.on("change", listener);
  }

  get game() {
    return <Readable<Game | null>>this._gameW;
  }
}
