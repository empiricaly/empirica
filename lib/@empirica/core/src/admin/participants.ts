import { EventType, TajribaAdmin } from "@empirica/tajriba";
import { Subject } from "rxjs";
import { error } from "../utils/console";

export interface Participant {
  id: string;
  identifier: string;
}
export interface Connection {
  participant: Participant;
  connected: boolean;
}
export function participantsSub(
  taj: TajribaAdmin,
  connections: Subject<Connection>,
  participants: Map<string, Participant>
) {
  taj.onEvent({ eventTypes: [EventType.ParticipantConnected] }).subscribe({
    next({ node }) {
      if (node.__typename !== "Participant") {
        error(`received non-participant`);

        return;
      }
      const part = {
        id: node.id,
        identifier: node.identifier,
      };

      participants.set(node.id, part);

      connections.next({
        participant: part,
        connected: true,
      });
    },
  });

  taj.onEvent({ eventTypes: [EventType.ParticipantDisconnect] }).subscribe({
    next({ node }) {
      if (node.__typename !== "Participant") {
        error(`received non-participant`);

        return;
      }
      participants.delete(node.id);

      connections.next({
        participant: {
          id: node.id,
          identifier: node.identifier,
        },
        connected: false,
      });
    },
  });
}
