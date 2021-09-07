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

export class Hooks {
  readonly hooks: { [key: string]: ((...args: any) => void)[] } = {};

  onNewPlayer(cb: EventCallback<PlayerEventArgs>) {
    if (!this.hooks[EmpiricaEvent.NewPlayer]) {
      this.hooks[EmpiricaEvent.NewPlayer] = [];
    }
    this.hooks[EmpiricaEvent.NewPlayer].push(cb);
  }
  onPlayerConnected(cb: EventCallback<PlayerEventArgs>) {
    if (!this.hooks[EmpiricaEvent.PlayerConnected]) {
      this.hooks[EmpiricaEvent.PlayerConnected] = [];
    }
    this.hooks[EmpiricaEvent.PlayerConnected].push(cb);
  }
  onPlayerDisconnected(cb: EventCallback<PlayerEventArgs>) {
    if (!this.hooks[EmpiricaEvent.PlayerDisonnected]) {
      this.hooks[EmpiricaEvent.PlayerDisonnected] = [];
    }
    this.hooks[EmpiricaEvent.PlayerDisonnected].push(cb);
  }
  onNewBatch(cb: EventCallback<BatchEventArgs>) {
    if (!this.hooks[EmpiricaEvent.NewBatch]) {
      this.hooks[EmpiricaEvent.NewBatch] = [];
    }
    this.hooks[EmpiricaEvent.NewBatch].push(cb);
  }
  onGameInit(cb: EventCallback<GameEventArgs>) {
    if (!this.hooks[EmpiricaEvent.GameInit]) {
      this.hooks[EmpiricaEvent.GameInit] = [];
    }
    this.hooks[EmpiricaEvent.GameInit].push(cb);
  }
  onRoundStart(cb: EventCallback<StageEventArgs>) {
    if (!this.hooks[EmpiricaEvent.RoundStart]) {
      this.hooks[EmpiricaEvent.RoundStart] = [];
    }
    this.hooks[EmpiricaEvent.RoundStart].push(cb);
  }
  onStageStart(cb: EventCallback<StageEventArgs>) {
    if (!this.hooks[EmpiricaEvent.StageStart]) {
      this.hooks[EmpiricaEvent.StageStart] = [];
    }
    this.hooks[EmpiricaEvent.StageStart].push(cb);
  }
  onStageEnd(cb: EventCallback<StageEventArgs>) {
    if (!this.hooks[EmpiricaEvent.StageEnd]) {
      this.hooks[EmpiricaEvent.StageEnd] = [];
    }
    this.hooks[EmpiricaEvent.StageEnd].push(cb);
  }
  onRoundEnd(cb: EventCallback<RoundEventArgs>) {
    if (!this.hooks[EmpiricaEvent.RoundEnd]) {
      this.hooks[EmpiricaEvent.RoundEnd] = [];
    }
    this.hooks[EmpiricaEvent.RoundEnd].push(cb);
  }
  onGameEnd(cb: EventCallback<GameEventArgs>) {
    if (!this.hooks[EmpiricaEvent.GameEnd]) {
      this.hooks[EmpiricaEvent.GameEnd] = [];
    }
    this.hooks[EmpiricaEvent.GameEnd].push(cb);
  }
  onNew(type: OnChangeType, key: string, cb: EventCallback<AttrEventArgs>) {
    const event = `new-${type}-${key}`;
    if (!this.hooks[event]) {
      this.hooks[event] = [];
    }
    this.hooks[event].push(cb);
  }
  onChange(type: OnChangeType, key: string, cb: EventCallback<AttrEventArgs>) {
    const event = `change-${type}-${key}`;
    if (!this.hooks[event]) {
      this.hooks[event] = [];
    }
    this.hooks[event].push(cb);
  }
}
