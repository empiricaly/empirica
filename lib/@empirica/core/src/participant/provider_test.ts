import { ChangePayload, State } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { TajribaProvider } from "./provider";

function attrChange(
  { key, val, done, removed } = {
    key: "a",
    val: "1",
    done: true,
    removed: false,
  }
): ChangePayload {
  return {
    __typename: "ChangePayload",
    change: {
      __typename: "AttributeChange",
      id: "123",
      nodeID: "",
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

function partChange(
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

function scopeChange(
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

function stepChange(
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

test("TajribaProvider should have a name property when instantiated", (t) => {
  const changes = new Subject<ChangePayload>();
  const provider = new TajribaProvider(changes);

  let dones = 0;
  provider.dones.subscribe({
    next: () => {
      dones++;
    },
  });

  let attrs = [];
  provider.attributes.subscribe({
    next: (attr) => {
      attrs.push(attr);
    },
  });

  let parts = [];
  provider.participants.subscribe({
    next: (part) => {
      parts.push(part);
    },
  });

  let scopes = [];
  provider.scopes.subscribe({
    next: (scope) => {
      scopes.push(scope);
    },
  });

  let steps = [];
  provider.steps.subscribe({
    next: (step) => {
      steps.push(step);
    },
  });

  changes.next(partChange({ done: false, removed: false }));
  changes.next(attrChange({ key: "a", val: "1", done: false, removed: false }));
  changes.next(attrChange({ key: "a", val: "1", done: true, removed: false }));
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(scopeChange({ done: true, removed: false }));

  t.is(dones, 2);
  t.is(attrs.length, 2);
  t.is(parts.length, 1);
  t.is(scopes.length, 1);
  t.is(steps.length, 3);
});
