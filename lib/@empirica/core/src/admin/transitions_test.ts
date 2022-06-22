import { EventType, State, TajribaAdmin } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { textHasLog } from "../shared/test_helpers";
import { captureLogs } from "../utils/console";
import { Transition, transitionsSub } from "./transitions";

function setupTransitions() {
  const eventSubs = {
    [EventType.TransitionAdd]: new Subject<any>(),
  };
  const taj = <TajribaAdmin>(<unknown>{
    onEvent: ({ eventTypes }: { eventTypes: EventType.TransitionAdd[] }) => {
      return eventSubs[eventTypes[0]!];
    },
  });

  const transitions = new Subject<Transition>();
  transitionsSub(taj, transitions, "123");

  return { eventSubs, transitions };
}

test.serial("transitionsSub emits transitions", async (t) => {
  const { eventSubs, transitions } = setupTransitions();

  const vals: Transition[] = [];
  transitions.subscribe({
    next(connection) {
      vals.push(connection);
    },
  });

  t.deepEqual(vals, []);

  const step = {
    id: "abc",
    duration: 100,
    state: State.Running,
  };
  const transition = {
    from: State.Created,
    to: State.Running,
    id: "123",
  };

  eventSubs[EventType.TransitionAdd].next({
    node: {
      __typename: "Transition",
      ...transition,
      node: { __typename: "Step", ...step },
    },
  });

  t.deepEqual(vals, [{ ...transition, step }]);
});

test.serial("transitionsSub ignores bad input", async (t) => {
  const { eventSubs, transitions } = setupTransitions();

  const vals: Transition[] = [];
  transitions.subscribe({
    next(connection) {
      vals.push(connection);
    },
  });

  t.deepEqual(vals, []);

  const step = {
    id: "abc",
    duration: 100,
    state: State.Running,
  };
  const transition = {
    from: State.Created,
    to: State.Running,
    id: "123",
  };

  const logs = captureLogs(function () {
    eventSubs[EventType.TransitionAdd].next({
      node: {
        __typename: "WRONG",
        ...transition,
        node: { __typename: "Step", ...step },
      },
    });
  });

  textHasLog(t, logs, "error", "non-transition");

  t.deepEqual(vals, []);

  const logs2 = captureLogs(function () {
    eventSubs[EventType.TransitionAdd].next({
      node: {
        __typename: "Transition",
        ...transition,
        node: { __typename: "WRONG", ...step },
      },
    });
  });
  textHasLog(t, logs2, "error", "non-step");

  t.deepEqual(vals, []);

  eventSubs[EventType.TransitionAdd].next({
    node: {
      __typename: "Transition",
      ...transition,
      node: { __typename: "Step", ...step },
    },
  });

  t.deepEqual(vals, [{ ...transition, step }]);
});
