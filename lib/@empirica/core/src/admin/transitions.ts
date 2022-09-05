import { EventType, State, TajribaAdmin } from "@empirica/tajriba";
import { Subject } from "rxjs";
import { error } from "../utils/console";

export interface Step {
  id: string;
  state: State;
  duration: number;
  startedAt?: number;
  endedAt?: number;
}

export interface Transition {
  id: string;
  from: State;
  to: State;
  step: Step;
}

export function transitionsSub(
  taj: TajribaAdmin,
  transitions: Subject<Transition>,
  nodeID: string
) {
  taj.onEvent({ eventTypes: [EventType.TransitionAdd], nodeID }).subscribe({
    next({ node }) {
      if (!node) {
        return;
      }

      if (node.__typename !== "Transition") {
        error(`received non-transition`);

        return;
      }

      if (node.node.__typename !== "Step") {
        error(`received non-step transition`, node.node);

        return;
      }

      transitions.next({
        id: node.id,
        to: node.to,
        from: node.from,
        step: {
          id: node.node.id,
          duration: node.node.duration,
          state: node.node.state,
        },
      });
    },
  });
}
