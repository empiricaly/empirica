import { EventType, TajribaAdmin } from "@empirica/tajriba";
import { Subject } from "rxjs";
import { error } from "../utils/console";
import { PromiseHandle, promiseHandle } from "./promises";

export interface Participant {
  id: string;
  identifier: string;
}

export interface Connection {
  participant: Participant;
  connected: boolean;
}

export interface ConnectionMsg {
  connection?: Connection;
  done: boolean;
}

export async function participantsSub(
  taj: TajribaAdmin,
  connections: Subject<ConnectionMsg>,
  participants: Map<string, Participant>
) {
  let handle: PromiseHandle | undefined = promiseHandle();
  taj.onEvent({ eventTypes: [EventType.ParticipantConnected] }).subscribe({
    next({ node, done }) {
      if (!node) {
        if (done) {
          if (handle) {
            handle?.result();

            connections.next({ done: true });
          }

          return;
        }
        error(`received no participant on connected`);

        return;
      }

      if (node.__typename !== "Participant") {
        error(`received non-participant on connected`);

        return;
      }

      const part = {
        id: node.id,
        identifier: node.identifier,
      };

      participants.set(node.id, part);

      connections.next({
        connection: {
          participant: part,
          connected: true,
        },
        done,
      });

      if (handle && done) {
        handle.result();
      }
    },
  });

  taj.onEvent({ eventTypes: [EventType.ParticipantDisconnect] }).subscribe({
    next({ node }) {
      if (!node) {
        error(`received no participant on disconnect`);

        return;
      }

      if (node.__typename !== "Participant") {
        error(`received non-participant on disconnect`);

        return;
      }

      participants.delete(node.id);

      connections.next({
        connection: {
          participant: {
            id: node.id,
            identifier: node.identifier,
          },
          connected: false,
        },
        done: true,
      });
    },
  });

  await handle.promise;
  handle = undefined;
}
