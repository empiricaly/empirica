import { EventType, State, TajribaAdmin } from "@empirica/tajriba";
import { Subject } from "rxjs";
import { error } from "../utils/console";

export interface Transition {
  id: string;
  from: State;
  to: State;
  step: {
    id: string;
    state: State;
    duration: number;
    startedAt?: number;
    endedAt?: number;
  };
}
export function transitionsSub(
  taj: TajribaAdmin,
  transitions: Subject<Transition>,
  nodeID: string
) {
  taj.onEvent({ eventTypes: [EventType.TransitionAdd], nodeID }).subscribe({
    next({ node }) {
      if (node.__typename !== "Transition") {
        error(`received non-transition`);

        return;
      }

      if (node.node.__typename !== "Step") {
        error(`received non-step transition`);

        return;
      }

      transitions.next({
        ...node,
        step: {
          ...node.node,
        },
      });
    },
  });
}
