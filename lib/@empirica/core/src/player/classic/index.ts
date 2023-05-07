export { Attribute, Attributes } from "../../shared/attributes";
export type {
  AttributeChange,
  AttributeOptions,
  AttributeUpdate,
} from "../../shared/attributes";
export { Globals } from "../../shared/globals";
export type { Constructor } from "../../shared/helpers";
export type {
  AttributeInput,
  ScopeConstructor,
  ScopeIdent,
  ScopeUpdate,
  Scope as SharedScope,
} from "../../shared/scopes";
export type { Json, JsonArray, JsonValue } from "../../utils/json";
export { TajribaProvider } from "../provider";
export type { ParticipantUpdate } from "../provider";
export { Scope, Scopes } from "../scopes";
export { Step, Steps } from "../steps";
export type { Epoch, StepChange, StepTick, StepUpdate } from "../steps";
export {
  createNewParticipant,
  isDevelopment,
  isProduction,
  isTest,
} from "../utils";
export {
  EmpiricaClassic,
  Game,
  Player,
  PlayerGame,
  PlayerRound,
  PlayerStage,
  Round,
  Stage,
} from "./classic";
export type {
  Context,
  EmpiricaClassicContext,
  EmpiricaClassicKinds,
} from "./classic";
import "../index.css";
