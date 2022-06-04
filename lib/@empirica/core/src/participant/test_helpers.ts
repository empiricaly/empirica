import { ChangePayload, State } from "@empirica/tajriba";

export function attrChange(
  { key, val, nodeID, done, removed } = {
    key: "a",
    val: "1",
    nodeID: "abc",
    done: true,
    removed: false,
  }
): ChangePayload {
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "AttributeChange",
      id: "123",
      nodeID,
      deleted: false,
      isNew: false,
      vector: false,
      version: 1,
      key,
      val,
    },
    removed,
    done,
  };
}

export function partChange(
  { done, removed } = {
    done: true,
    removed: false,
  }
): ChangePayload {
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "ParticipantChange",
      id: "123",
    },
    removed,
    done,
  };
}

export function scopeChange(
  { done, removed } = {
    done: true,
    removed: false,
  }
): ChangePayload {
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "ScopeChange",
      id: "123",
    },
    removed,
    done,
  };
}

export function stepChange(
  { done, removed } = {
    done: true,
    removed: false,
  }
): ChangePayload {
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "StepChange",
      id: "123",
      running: false,
      state: State.Created,
    },
    removed,
    done,
  };
}
