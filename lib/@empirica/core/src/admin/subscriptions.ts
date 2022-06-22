import { ScopeConstructor } from "../shared/scopes";

export type KV = {
  key: string;
  val: string;
};

function kvstr(kv: KV) {
  return kv.key + "-" + kv.val;
}

export interface ScopeSubscriptionInput {
  /** ids of the matching Scopes. */
  ids: string[];
  /** kinds of the matching Scopes. */
  kinds: string[];
  /** keys to Attributes in matching Scope. */
  keys: string[];
  /** kvs to Attributes in matching Scope. */
  kvs: KV[];
  /** names of the matching Scopes. */
  names: string[];
}

export interface Subs {
  participants: boolean;
  scopes: {
    ids: string[];
    kinds: string[];
    names: string[];
    keys: string[];
    kvs: KV[];
  };
  transitions: string[];
}

// Tracks what data should be subscribed to.
export class Subscriptions<
  Context,
  Kinds extends { [key: string]: ScopeConstructor<Context, Kinds> }
> {
  private scopeKinds = new Set<string>();
  private scopeIDs = new Set<string>();
  private scopeNames = new Set<string>();
  private scopeKeys = new Set<string>();
  private scopeKVSet = new Set<string>();
  private scopeKVs: KV[] = [];
  private participantSub = false;
  private transitionsSubs = new Set<string>();
  private dirty = false;
  public last: Subs = {
    participants: false,
    scopes: {
      ids: [],
      kinds: [],
      names: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  };

  get subs(): Subs {
    return {
      participants: this.participantSub,
      scopes: {
        kinds: Array.from(this.scopeKinds.values()),
        ids: Array.from(this.scopeIDs.values()),
        names: Array.from(this.scopeNames.values()),
        keys: Array.from(this.scopeKeys.values()),
        kvs: [...this.scopeKVs],
      },
      transitions: Array.from(this.transitionsSubs.values()),
    };
  }

  // newSubs will return only new subs since the last call.
  newSubs(): Subs | undefined {
    if (!this.dirty) {
      return;
    }

    const current = this.subs;
    const {
      scopes: { ids, kinds, names, keys, kvs },
      participants,
      transitions,
    } = this.last;

    const kvsstrs = kvs.map((kv) => kvstr(kv));

    const next = {
      participants: this.participantSub && !participants,
      scopes: {
        ids: current.scopes.ids.filter((id) => !ids.includes(id)),
        kinds: current.scopes.kinds.filter((kind) => !kinds.includes(kind)),
        names: current.scopes.names.filter((name) => !names.includes(name)),
        keys: current.scopes.keys.filter((key) => !keys.includes(key)),
        kvs: current.scopes.kvs.filter((kv) => !kvsstrs.includes(kvstr(kv))),
      },
      transitions: current.transitions.filter(
        (id) => !transitions.includes(id)
      ),
    };

    this.last = current;
    this.dirty = false;

    return next;
  }

  scopeSub(input: Partial<ScopeSubscriptionInput>) {
    if (input.ids) {
      for (const id of input.ids) {
        if (!this.scopeIDs.has(id)) {
          this.scopeIDs.add(id);
          this.dirty = true;
        }
      }
    }

    if (input.kinds) {
      for (const id of input.kinds) {
        if (!this.scopeKinds.has(id)) {
          this.scopeKinds.add(id);
          this.dirty = true;
        }
      }
    }

    if (input.names) {
      for (const name of input.names) {
        if (!this.scopeNames.has(name)) {
          this.scopeNames.add(name);
          this.dirty = true;
        }
      }
    }

    if (input.keys) {
      for (const key of input.keys) {
        if (!this.scopeKeys.has(key)) {
          this.scopeKeys.add(key);
          this.dirty = true;
        }
      }
    }

    if (input.kvs) {
      for (const kv of input.kvs) {
        const kvKey = kvstr(kv);
        if (!this.scopeKVSet.has(kvKey)) {
          this.scopeKVSet.add(kvKey);
          this.scopeKVs.push(kv);
          this.dirty = true;
        }
      }
    }
  }

  participantsSub() {
    if (!this.participantSub) {
      this.dirty = true;
      this.participantSub = true;
    }
  }

  transitionsSub(nodeID: string) {
    if (!this.transitionsSubs.has(nodeID)) {
      this.transitionsSubs.add(nodeID);
      this.dirty = true;
    }
  }
}
