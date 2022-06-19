import "global-jsdom/register";

import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { TajribaConnection } from "../shared/tajriba_connection";
import { fakeTajribaConnect, nextTick } from "../shared/test_helpers";
import {
  ParticipantConnection,
  ParticipantSession,
  Session,
} from "./connection";

test.serial.afterEach(() => {
  restore();
});

test.serial("ParticipantSession calculates session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  const vals: (Session | undefined)[] = [];
  session.sessions.subscribe({
    next(session) {
      vals.push(session);
    },
  });

  t.is(session.token, undefined);
  t.is(session.participant, undefined);
  t.deepEqual(vals, [undefined]);

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });
  t.deepEqual(vals, [
    undefined,
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);
  t.deepEqual(session.session, {
    token: "123",
    participant: { id: "345", identifier: "567" },
  });

  session = new ParticipantSession("somens", resetSession);
  const vals2: (Session | undefined)[] = [];
  session.sessions.subscribe({
    next(session) {
      vals2.push(session);
    },
  });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });
  t.deepEqual(vals2, [
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);

  session.clearSession();

  t.is(session.token, undefined);
  t.is(session.participant, undefined);
  t.deepEqual(vals2, [
    { token: "123", participant: { id: "345", identifier: "567" } },
    undefined,
  ]);
  t.deepEqual(session.session, undefined);

  // There's on way to listen to localStorage...
  t.deepEqual(vals, [
    undefined,
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);
});

test.serial("ParticipantSession supports namespacing", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  t.is(session.token, undefined);
  t.is(session.participant, undefined);

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });

  const session2 = new ParticipantSession("DIFFERENTNS", resetSession);

  t.is(session2.token, undefined);
  t.is(session2.participant, undefined);

  session2.updateSession("abc", { id: "cde", identifier: "efg" });

  t.is(session2.token, "abc");
  t.deepEqual(session2.participant, { id: "cde", identifier: "efg" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });
});

test.serial("ParticipantSession resets on observable reset", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });

  resetSession.next();

  t.is(session.token, undefined);
  t.is(session.participant, undefined);
});

test.serial("ParticipantConnection existing conn and session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  cbs["connected"]![0]!();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  t.is(participant.connecting.getValue(), true);

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), true);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), true);
  t.is(participant.connecting.getValue(), false);
});

test.serial("ParticipantConnection existing conn and no session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  cbs["connected"]![0]!();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  // Wait for session establishement
  await nextTick();

  // No session => no partConn

  t.is(conn.connected.getValue(), true);
  t.is(session.session, undefined);
  t.is(participant.connected.getValue(), false);
  t.is(participant.connecting.getValue(), false);

  // Add session => partConn

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(participant.connecting.getValue(), true);

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), true);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), true);
  t.is(participant.connecting.getValue(), false);
});

test.serial("ParticipantConnection no conn and no session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  // Wait for session establishement
  await nextTick();

  // No conn, no session => no partConn

  t.is(conn.connected.getValue(), false);
  t.is(session.session, undefined);
  t.is(participant.connected.getValue(), false);

  // No conn, add session => no partConn

  session.updateSession("123", { id: "345", identifier: "567" });

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), false);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), false);

  // Add conn, add session => partConn

  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), true);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), true);

  // Remove conn, add session => partConn

  cbs["disconnected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), false);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), true);

  // Remove part conn, add session => no partConn

  cbs["disconnected"]![1]!();

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), false);
  t.not(session.session, undefined);
  t.is(participant.connected.getValue(), false);
});

test.serial("ParticipantConnection reset session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect({ failSession: true });

  const conn = new TajribaConnection("someurl");

  cbs["connected"]![0]!();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  // Wait for session establishement
  await nextTick();

  t.is(conn.connected.getValue(), true);
  t.is(participant.connected.getValue(), false);
  t.is(session.session, undefined);
});

test.serial("ParticipantConnection repeating conn", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  cbs["connected"]![0]!();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  const vals: boolean[] = [];
  participant.connected.subscribe({
    next(connected) {
      vals.push(connected);
    },
  });

  t.deepEqual(vals, [false]);

  // Wait for session establishement
  await nextTick();

  t.deepEqual(vals, [false, true]);

  cbs["connected"]![0]!();

  t.deepEqual(vals, [false, true]);

  // Wait for session establishement
  await nextTick();

  t.deepEqual(vals, [false, true]);
});

test.serial("ParticipantConnection stopped", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  cbs["connected"]![0]!();

  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  const participant = new ParticipantConnection(
    conn,
    session.sessions,
    resetSession.next.bind(resetSession)
  );

  const vals: boolean[] = [];
  participant.stopped.subscribe({
    next(stopped) {
      vals.push(stopped);
    },
  });

  t.deepEqual(vals, [false]);

  // Wait for session establishement
  await nextTick();

  t.deepEqual(vals, [false]);

  participant.stop();

  t.deepEqual(vals, [false, true]);
  t.is(participant.connected.getValue(), false);

  participant.stop();

  t.deepEqual(vals, [false, true]);
});
