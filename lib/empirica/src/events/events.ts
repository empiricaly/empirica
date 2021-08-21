import { EventType } from "tajriba";
import { Attribute } from "../models/attribute";
import { BatchC } from "../models/batch";
import { GameC } from "../models/game";
import { PlayerC } from "../models/player";
import { RoundC } from "../models/round";
import { StageC } from "../models/stage";

export enum EmpiricaEvent {
  NewPlayer = "NEW_PLAYER",
  PlayerConnected = "PLAYER_CONNECTED",
  PlayerDisonnected = "PLAYER_DISCONNECTED",
  NewBatch = "NEW_BATCH",
  GameInit = "GAME_INIT",
  GameEnd = "GAME_END",
  RoundStart = "ROUND_START",
  RoundEnd = "ROUND_END",
  StageStart = "STAGE_START",
  StageEnd = "STAGE_END",
  AttributeChange = "ATTRIBUTE_CHANGE",
}

// STEP_ADD
// SCOPE_ADD
// GROUP_ADD
// TRANSITION_ADD
// PARTICIPANT_ADD
// PARTICIPANT_CONNECT
// PARTICIPANT_DISCONNECT
// LINK_ADD
// ATTRIBUTE_UPDATE

export const eventMap: Partial<{ [key in EmpiricaEvent]: EventType }> = {
  [EmpiricaEvent.NewPlayer]: EventType.ParticipantAdd,
  [EmpiricaEvent.PlayerConnected]: EventType.ParticipantConnect,
  [EmpiricaEvent.PlayerDisonnected]: EventType.ParticipantDisconnect,
  [EmpiricaEvent.NewBatch]: EventType.ScopeAdd,

  [EmpiricaEvent.GameEnd]: EventType.TransitionAdd,
  [EmpiricaEvent.RoundStart]: EventType.TransitionAdd,
  [EmpiricaEvent.RoundEnd]: EventType.TransitionAdd,
  [EmpiricaEvent.StageStart]: EventType.TransitionAdd,
  [EmpiricaEvent.StageEnd]: EventType.TransitionAdd,

  // [EmpiricaEvent.AttributeChange]: EventType.AttributeUpdate,
};

export type EventCallback<T> = ({}: T) => void;

export interface PlayerEventArgs {
  player: PlayerC;
}

export interface BatchEventArgs {
  batch: BatchC;
}

export interface GameEventArgs {
  game: GameC;
}

export interface RoundEventArgs {
  game: GameC;
  round: RoundC;
}

export interface StageEventArgs {
  game: GameC;
  round: RoundC;
  stage: StageC;
}

export interface AttrEventArgs {
  attr: Attribute;
  isNew: boolean;
}

export const EventCallbackArgs: {
  [key in EmpiricaEvent]: any;
} = {
  [EmpiricaEvent.NewPlayer]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.PlayerConnected]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.PlayerDisonnected]: <EventCallback<PlayerEventArgs>>(() => {}),
  [EmpiricaEvent.NewBatch]: <EventCallback<BatchEventArgs>>(() => {}),
  [EmpiricaEvent.GameInit]: <EventCallback<GameEventArgs>>(() => {}),
  [EmpiricaEvent.GameEnd]: <EventCallback<GameEventArgs>>(() => {}),
  [EmpiricaEvent.RoundStart]: <EventCallback<RoundEventArgs>>(() => {}),
  [EmpiricaEvent.RoundEnd]: <EventCallback<RoundEventArgs>>(() => {}),
  [EmpiricaEvent.StageStart]: <EventCallback<StageEventArgs>>(() => {}),
  [EmpiricaEvent.StageEnd]: <EventCallback<StageEventArgs>>(() => {}),
  [EmpiricaEvent.AttributeChange]: <EventCallback<AttrEventArgs>>(() => {}),
};
