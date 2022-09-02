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

export async function participantsSub(
  taj: TajribaAdmin,
  connections: Subject<Connection>,
  participants: Map<string, Participant>
) {
  let handle: PromiseHandle | undefined = promiseHandle();
  taj.onEvent({ eventTypes: [EventType.ParticipantConnected] }).subscribe({
    next({ node, done }) {
      if (!node && done) {
        handle?.result();
        return;
      }
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

      if (handle && done) {
        handle.result();
      }
    },
  });

  await handle.promise;
  handle = undefined;

  // taj.onEvent({ eventTypes: [EventType.ParticipantConnect] }).subscribe({
  //   next({ node }) {
  //     if (node.__typename !== "Participant") {
  //       error(`received non-participant`);

  //       return;
  //     }
  //     const part = {
  //       id: node.id,
  //       identifier: node.identifier,
  //     };

  //     participants.set(node.id, part);

  //     connections.next({
  //       participant: part,
  //       connected: true,
  //     });
  //   },
  // });

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
