import { Batch, EAttribute, Game, Player, Round, Stage } from "./store";

export enum EmpiricaEvent {
  NewPlayer = "NEW_PLAYER",
  PlayerConnected = "PLAYER_CONNECTED",
  PlayerDisonnected = "PLAYER_DISCONNECTED",
  NewBatch = "NEW_BATCH",
  NewGame = "NEW_GAME",
  GameInit = "GAME_INIT",
  GameEnd = "GAME_END",
  RoundStart = "ROUND_START",
  RoundEnd = "ROUND_END",
  StageStart = "STAGE_START",
  StageEnd = "STAGE_END",
  AttributeChange = "ATTRIBUTE_CHANGE",
}

export type OnChangeTypeKeys = "player" | "batch" | "game" | "round" | "stage";
export type OnChangeType =
  | OnChangeTypeKeys
  | "player-game"
  | "player-round"
  | "player-stage";

export type EventCallback<T> = ({}: T) => void;

export interface PlayerEventArgs {
  player: Player;
}

export interface BatchEventArgs {
  batch: Batch;
}

export interface GameEventArgs {
  game: Game;
}

export interface RoundEventArgs {
  game: Game;
  round: Round;
}

export interface StageEventArgs {
  game: Game;
  round: Round;
  stage: Stage;
}

export interface AttrEventArgs {
  attr: EAttribute;
  isNew: boolean;
  isInit: boolean;
  player?: Player;
  batch?: Batch;
  game?: Game;
  round?: Round;
  stage?: Stage;
}

export const EventCallbackArgs: {
  [key in EmpiricaEvent]: any;
} = {
  [EmpiricaEvent.NewPlayer]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.PlayerConnected]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.PlayerDisonnected]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.NewBatch]: <EventCallback<BatchEventArgs>>(() => {}),
  [EmpiricaEvent.NewGame]: <EventCallback<GameEventArgs>>(() => {}),
  [EmpiricaEvent.GameInit]: <EventCallback<GameEventArgs>>(() => {}),
  [EmpiricaEvent.GameEnd]: <EventCallback<GameEventArgs>>(() => {}),
  [EmpiricaEvent.RoundStart]: <EventCallback<RoundEventArgs>>(() => {}),
  [EmpiricaEvent.RoundEnd]: <EventCallback<RoundEventArgs>>(() => {}),
  [EmpiricaEvent.StageStart]: <EventCallback<StageEventArgs>>(() => {}),
  [EmpiricaEvent.StageEnd]: <EventCallback<StageEventArgs>>(() => {}),
  [EmpiricaEvent.AttributeChange]: <EventCallback<AttrEventArgs>>(() => {}),
};
