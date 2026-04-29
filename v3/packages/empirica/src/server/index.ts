// Public surface for `empirica/server`.

export { createLogger } from "./logger.js";
export type { Logger, LoggerConfig } from "./logger.js";

export { createEmpirica } from "./empirica.js";
export type { Empirica, EmpiricaOptions, AdminAuthConfig } from "./empirica.js";

export { defineCallbacks, HookRegistry, Runtime } from "./callbacks/index.js";
export type {
  AddStageInput,
  BatchHandle,
  GameHandle,
  HookEvent,
  HookHandlers,
  OnAPI,
  PlayerHandle,
  RoundHandle,
  RuntimeOptions,
  SetOptions,
  StageHandle,
  TxApi,
} from "./callbacks/index.js";

export {
  defineTreatments,
  freezeFactors,
  parseFactors,
  TreatmentDefinitionError,
} from "./treatments/index.js";
export type {
  Treatment,
  TreatmentInput,
  TreatmentSet,
} from "./treatments/index.js";

export {
  balanced,
  firstAvailable,
  individualLobby,
  lobbyStrategies,
  matchByFactor,
  parseDuration,
  sharedLobby,
  strategies,
  strict,
} from "./strategies/index.js";
export type {
  AssignmentContext,
  AssignmentDecision,
  AssignmentFn,
  LobbyConfig,
  LobbyContext,
  LobbyDecision,
  LobbyFn,
} from "./strategies/index.js";

export {
  DevProvider,
  HmacSigner,
  JWKSVerifier,
  LocalSecretVerifier,
  NoAdminAuthVerifier,
} from "./auth/index.js";
export type {
  AdminClaims,
  DevAdmin,
  DevProviderOptions,
  IssueOptions,
  JWKSVerifierOptions,
  JWTVerifier,
  LocalSecretVerifierOptions,
  ParticipantTokenPayload,
} from "./auth/index.js";

export { hashDevPassword, createApp } from "./http/index.js";
export type { AppOptions } from "./http/index.js";
export {
  CreateBatchSchema,
  CreateParticipantSchema,
  DevLoginSchema,
  SetStateSchema,
  TreatmentInputSchema,
  openapiDocument,
} from "./http/index.js";

export { Broadcaster } from "./ws/index.js";
export type { Subscriber, WireEvent, WireMessage, WireSnapshot } from "./ws/index.js";

export { openDb, openMemoryDb } from "./db/index.js";
export type { Db, OpenDbOptions } from "./db/index.js";

export { z } from "zod";
