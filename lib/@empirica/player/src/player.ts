import { TajribaParticipant } from "@empirica/tajriba";
import { EAttribute, Game, Stage, Store } from "./store";

export class Player {
  private siap = false;
  private waitings: (() => void)[] = [];
  private scopeUpdates: Set<string> = new Set();
  private subMap: { [id: string]: string } = {};
  private subscriptions: { [key: string]: (() => void)[] } = {};

  private _currentStage?: Stage;
  private _currentGame?: Game;

  constructor(private taj: TajribaParticipant, readonly store: Store) {}

  get id() {
    return this.taj.id;
  }

  get identifier() {
    return this.taj.identifier;
  }

  get player() {
    return this.store.players[this.taj.id];
  }

  get players() {
    return Object.values(this.store.players);
  }

  get game() {
    return this._currentGame;
  }

  get round() {
    return this._currentStage?.round;
  }

  get stage() {
    return this._currentStage;
  }

  get playerSub() {
    return this.createSub("player", () => this.player);
  }

  get playersSub() {
    return this.createSub("players", () => this.players);
  }

  get gameSub() {
    return this.createSub("game", () => this.game);
  }

  get roundSub() {
    return this.createSub("round", () => this.round);
  }

  get stageSub() {
    return this.createSub("stage", () => this.stage);
  }

  private createSub(key: string, getVal: () => any) {
    return {
      subscribe: (subscription: (value: any) => void) => {
        const sub = () => {
          subscription(getVal());
        };
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = [];
        }

        this.subscriptions[key].push(sub);

        sub();

        return () => {
          this.subscriptions[key] = this.subscriptions[key].filter(
            (s) => s !== sub
          );
        };
      },
    };
  }

  pushAttributeChange(attribute: EAttribute) {
    this.taj.setAttribute({
      key: attribute.key,
      append: attribute.ao?.append,
      vector: attribute.ao?.vector,
      index: attribute.ao?.index,
      nodeID: attribute.scope.id,
      val: JSON.stringify(attribute.value),
    });

    const subKey = this.subMap[attribute.scope.id];
    if (subKey) {
      const subs = this.subscriptions[subKey];
      if (subs) {
        for (const sub of subs) {
          sub();
        }
      }
    }
  }

  stop() {
    this.taj.stop();
  }

  // Waiting for first load
  ready() {
    if (this.siap) {
      return true;
    }

    return new Promise((resolve) => {
      this.waitings.push(() => {
        resolve(null);
      });
    });
  }

  start() {
    this.taj.changes((chg, err) => {
      if (err) {
        console.error("changes: callback error");
        console.error(err);

        return;
      }

      const { change, done, removed } = chg;

      switch (change.__typename) {
        case "ScopeChange":
          const scope = this.store.updateScope(change, removed);

          if (change.kind === "game") {
            if (scope) {
              this._currentGame = <Game>scope;
              this.scopeUpdates.add("game");
            } else if (removed) {
              this._currentGame = undefined;
              this.scopeUpdates.add("game");
            }
          }

          break;
        case "ParticipantChange":
          this.store.updateParticipant(change, removed);

          break;
        case "StepChange":
          const stage = Object.values(this.store.stages).find((s) =>
            s.get("stepID")
          );

          if (!stage) {
            console.warn("stage: stage for step not found");
            console.dir(change.id);

            return;
          }

          stage.state = change.state;

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

          this.scopeUpdates.add("stage");

          break;
        case "AttributeChange":
          const attr = this.store.updateAttribute(change, removed);
          if (change.key === "currentStageID") {
            if (attr && typeof attr.value === "string") {
              this._currentStage = this.store.stages[attr.value];
              this.scopeUpdates.add("stage");
              this.scopeUpdates.add("round");
            } else if (removed) {
              delete this._currentStage;
              this.scopeUpdates.add("stage");
              this.scopeUpdates.add("round");
            }
          }

          if (this.store.players[change.nodeID]) {
            this.scopeUpdates.add("players");
            if (change.nodeID === this.taj.id) {
              this.scopeUpdates.add("player");
            }
          }

          break;
        default:
          console.warn("unknown change", change);
          break;
      }

      if (done) {
        // Release those waiting for first load
        if (!this.siap) {
          for (const wait of this.waitings) {
            wait();
          }

          this.siap = true;
        }

        for (const key of this.scopeUpdates.keys()) {
          const subs = this.subscriptions[key];
          if (subs) {
            for (const sub of subs) {
              sub();
            }
          }
        }

        this.scopeUpdates.clear();
      }
    });
  }
}
