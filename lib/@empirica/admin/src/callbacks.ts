import {
  AttrEventArgs,
  BatchEventArgs,
  EmpiricaEvent,
  EventCallback,
  GameEventArgs,
  OnChangeType,
  PlayerEventArgs,
  RoundEventArgs,
  StageEventArgs,
} from "./events";

export class Callbacks {
  readonly callbacks: { [key: string]: ((...args: any) => void)[] } = {};

  /**
   * Merge 'other' Callbacks into this Callbacks.
   */
  merge(other: Callbacks) {
    for (const event in other.callbacks) {
      const cb = other.callbacks[event];
      if (!this.callbacks[event]) {
        this.callbacks[event] = [];
      }
      this.callbacks[event].push(...cb);
    }

    return this;
  }

  onNewPlayer(cb: EventCallback<PlayerEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.NewPlayer]) {
      this.callbacks[EmpiricaEvent.NewPlayer] = [];
    }
    this.callbacks[EmpiricaEvent.NewPlayer].push(cb);
  }
  onPlayerConnected(cb: EventCallback<PlayerEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.PlayerConnected]) {
      this.callbacks[EmpiricaEvent.PlayerConnected] = [];
    }
    this.callbacks[EmpiricaEvent.PlayerConnected].push(cb);
  }
  onPlayerDisconnected(cb: EventCallback<PlayerEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.PlayerDisonnected]) {
      this.callbacks[EmpiricaEvent.PlayerDisonnected] = [];
    }
    this.callbacks[EmpiricaEvent.PlayerDisonnected].push(cb);
  }
  onNewBatch(cb: EventCallback<BatchEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.NewBatch]) {
      this.callbacks[EmpiricaEvent.NewBatch] = [];
    }
    this.callbacks[EmpiricaEvent.NewBatch].push(cb);
  }
  onGameInit(cb: EventCallback<GameEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.GameInit]) {
      this.callbacks[EmpiricaEvent.GameInit] = [];
    }
    this.callbacks[EmpiricaEvent.GameInit].push(cb);
  }
  onRoundStart(cb: EventCallback<StageEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.RoundStart]) {
      this.callbacks[EmpiricaEvent.RoundStart] = [];
    }
    this.callbacks[EmpiricaEvent.RoundStart].push(cb);
  }
  onStageStart(cb: EventCallback<StageEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.StageStart]) {
      this.callbacks[EmpiricaEvent.StageStart] = [];
    }
    this.callbacks[EmpiricaEvent.StageStart].push(cb);
  }
  onStageEnd(cb: EventCallback<StageEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.StageEnd]) {
      this.callbacks[EmpiricaEvent.StageEnd] = [];
    }
    this.callbacks[EmpiricaEvent.StageEnd].push(cb);
  }
  onRoundEnd(cb: EventCallback<RoundEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.RoundEnd]) {
      this.callbacks[EmpiricaEvent.RoundEnd] = [];
    }
    this.callbacks[EmpiricaEvent.RoundEnd].push(cb);
  }
  onGameEnd(cb: EventCallback<GameEventArgs>) {
    if (!this.callbacks[EmpiricaEvent.GameEnd]) {
      this.callbacks[EmpiricaEvent.GameEnd] = [];
    }
    this.callbacks[EmpiricaEvent.GameEnd].push(cb);
  }
  onNew(type: OnChangeType, key: string, cb: EventCallback<AttrEventArgs>) {
    const event = `new-${type}-${key}`;
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(cb);
  }
  onChange(type: OnChangeType, key: string, cb: EventCallback<AttrEventArgs>) {
    const event = `change-${type}-${key}`;
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(cb);
  }
}
