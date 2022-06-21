import { EventType, Participant, TajribaAdmin } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { textHasLog } from "../shared/test_helpers";
import { captureLogs } from "../utils/console";
import { Connection, participantsSub } from "./participants";

function setupParticipant() {
  const eventSubs = {
    [EventType.ParticipantConnected]: new Subject<any>(),
    [EventType.ParticipantDisconnect]: new Subject<any>(),
  };
  const taj = <TajribaAdmin>(<unknown>{
    onEvent: ({
      eventTypes,
    }: {
      eventTypes: (
        | EventType.ParticipantConnected
        | EventType.ParticipantDisconnect
      )[];
    }) => {
      return eventSubs[eventTypes[0]!];
    },
  });

  const connections = new Subject<Connection>();
  const participants = new Map<string, Participant>();
  participantsSub(taj, connections, participants);

  return { eventSubs, connections, participants };
}

test.serial("participantsSub tracks connected participants", async (t) => {
  const { eventSubs, participants } = setupParticipant();

  t.is(participants.size, 0);

  eventSubs[EventType.ParticipantConnected].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.is(participants.size, 1);

  eventSubs[EventType.ParticipantConnected].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.is(participants.size, 1);
});

test.serial("participantsSub tracks disconnected participants", async (t) => {
  const { eventSubs, participants } = setupParticipant();

  t.is(participants.size, 0);

  eventSubs[EventType.ParticipantConnected].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.is(participants.size, 1);

  eventSubs[EventType.ParticipantDisconnect].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.is(participants.size, 0);
});

test.serial("participantsSub emits connections", async (t) => {
  const { eventSubs, connections } = setupParticipant();

  const vals: Connection[] = [];
  connections.subscribe({
    next(connection) {
      vals.push(connection);
    },
  });

  t.deepEqual(vals, []);

  eventSubs[EventType.ParticipantConnected].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.deepEqual(vals, [
    {
      connected: true,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
  ]);

  eventSubs[EventType.ParticipantDisconnect].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.deepEqual(vals, [
    {
      connected: true,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
    {
      connected: false,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
  ]);

  eventSubs[EventType.ParticipantDisconnect].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.deepEqual(vals, [
    {
      connected: true,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
    {
      connected: false,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
    {
      connected: false,
      participant: {
        identifier: "abc",
        id: "123",
      },
    },
  ]);
});

test.serial("participantsSub ignores invalid input", async (t) => {
  const { eventSubs, participants } = setupParticipant();

  t.is(participants.size, 0);

  const logs = captureLogs(function () {
    eventSubs[EventType.ParticipantConnected].next({
      node: {
        __typename: "WRONG",
        identifier: "abc",
        id: "123",
      },
    });
  });

  textHasLog(t, logs, "error", "non-participant");

  t.is(participants.size, 0);

  eventSubs[EventType.ParticipantConnected].next({
    node: {
      __typename: "Participant",
      identifier: "abc",
      id: "123",
    },
  });

  t.is(participants.size, 1);

  const logs2 = captureLogs(function () {
    eventSubs[EventType.ParticipantDisconnect].next({
      node: {
        __typename: "WR0NG",
        identifier: "abc",
        id: "123",
      },
    });
  });

  textHasLog(t, logs2, "error", "non-participant");

  t.is(participants.size, 1);
});
