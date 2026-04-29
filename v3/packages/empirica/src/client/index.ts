// `empirica/client`
//
// Vanilla browser SDK. Connects to the server, manages a participant token,
// keeps a live cache of state, exposes a small reactive API. Frame-agnostic
// — the React layer wraps this.

export {
  EmpiricaClient,
  type EmpiricaClientOptions,
  type ConnectionState,
} from "./client.js";
export type { Snapshot, Subscriber, Unsubscribe } from "./store.js";
