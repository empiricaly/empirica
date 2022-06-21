import { ScopeConstructor } from "../shared/scopes";

export interface ScopeSubscriptionInput {
  /** ids of the matching Scopes. */
  ids: string[];
  /** kinds of the matching Scopes. */
  kinds: string[];
}

export interface Subs {
  participants: boolean;
  scopes: {
    ids: string[];
    kinds: string[];
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
  private participantSub = false;
  private transitionsSubs = new Set<string>();
  private dirty = false;
  public last: Subs = {
    participants: false,
    scopes: {
      ids: [],
      kinds: [],
    },
    transitions: [],
  };

  get subs(): Subs {
    return {
      participants: this.participantSub,
      scopes: {
        kinds: Array.from(this.scopeKinds.values()),
        ids: Array.from(this.scopeIDs.values()),
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
      scopes: { ids, kinds },
      participants,
      transitions,
    } = this.last;

    const next = {
      participants: this.participantSub && !participants,
      scopes: {
        ids: current.scopes.ids.filter((id) => !ids.includes(id)),
        kinds: current.scopes.kinds.filter((kind) => !kinds.includes(kind)),
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
