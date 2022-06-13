import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import {
  ParticipantConnection,
  ParticipantContext,
  ParticipantModeContext,
  ParticipantSession,
  Session,
  TajribaConnection,
} from "./participant_context";
import { TajribaProvider } from "./provider";
import { fakeTajribaConnect, nextTick } from "./test_helpers";

test.serial.afterEach(() => {
  restore();
});

test.serial("TajribaConnection tracks connection state ", (t) => {
  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  const connVals: boolean[] = [];
  conn.connected.subscribe({
    next(connected) {
      connVals.push(connected);
    },
  });

  const connectingVals: boolean[] = [];
  conn.connecting.subscribe({
    next(connecting) {
      connectingVals.push(connecting);
    },
  });

  const stoppedVals: boolean[] = [];
  conn.stopped.subscribe({
    next(stopped) {
      stoppedVals.push(stopped);
    },
  });

  t.deepEqual(connVals, [false]);
  t.deepEqual(connectingVals, [true]);
  t.deepEqual(stoppedVals, [false]);

  cbs["connected"]![0]!();

  t.deepEqual(connVals, [false, true]);
  t.deepEqual(connectingVals, [true, false]);

  cbs["connected"]![0]!();

  t.deepEqual(connVals, [false, true, true]);
  t.deepEqual(connectingVals, [true, false, false]);

  cbs["disconnected"]![0]!();

  t.deepEqual(connVals, [false, true, true, false]);
  t.deepEqual(connectingVals, [true, false, false, true]);

  cbs["disconnected"]![0]!();

  t.deepEqual(connVals, [false, true, true, false, false]);
  t.deepEqual(connectingVals, [true, false, false, true, true]);

  conn.stop();

  t.deepEqual(connVals, [false, true, true, false, false, false]);
  t.deepEqual(connectingVals, [true, false, false, true, true, false]);
  t.deepEqual(stoppedVals, [false, true]);

  conn.stop();

  t.deepEqual(connVals, [false, true, true, false, false, false]);
  t.deepEqual(connectingVals, [true, false, false, true, true, false]);
  t.deepEqual(stoppedVals, [false, true]);
});

test.serial("TajribaConnection connection stopped ", (t) => {
  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  const connVals: boolean[] = [];
  conn.connected.subscribe({
    next(connected) {
      connVals.push(connected);
    },
  });

  const connectingVals: boolean[] = [];
  conn.connecting.subscribe({
    next(connecting) {
      connectingVals.push(connecting);
    },
  });

  const stoppedVals: boolean[] = [];
  conn.stopped.subscribe({
    next(stopped) {
      stoppedVals.push(stopped);
    },
  });

  t.deepEqual(connVals, [false]);
  t.deepEqual(connectingVals, [true]);
  t.deepEqual(stoppedVals, [false]);

  cbs["connected"]![0]!();

  t.deepEqual(connVals, [false, true]);
  t.deepEqual(connectingVals, [true, false]);
  t.deepEqual(stoppedVals, [false]);

  conn.stop();

  t.deepEqual(connVals, [false, true, false]);
  t.deepEqual(connectingVals, [true, false, false]);
  t.deepEqual(stoppedVals, [false, true]);

  conn.stop();

  t.deepEqual(connVals, [false, true, false]);
  t.deepEqual(connectingVals, [true, false, false]);
  t.deepEqual(stoppedVals, [false, true]);
});

test.serial("TajribaConnection session", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  await t.throwsAsync(
    async () => {
      await conn.session("", { id: "12", identifier: "34" });
      /* c8 ignore next */
    },
    { message: /not connected/ }
  );

  cbs["connected"]![0]!();

  await t.notThrowsAsync(async () => {
    await conn.session("", { id: "12", identifier: "34" });
  });
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

test.serial("ParticipantContext with session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Establish session
  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);
  session.updateSession("123", { id: "345", identifier: "567" });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect();

  const conn = new ParticipantContext("someurl", "somens");

  // Connect
  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.not(conn.provider.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  // Disconnect taj
  cbs["disconnected"]![0]!();

  t.not(conn.provider.getValue(), undefined);
  t.is(conn.globals.getValue(), undefined);

  // Disconnect tajPart
  cbs["disconnected"]![1]!();

  t.is(conn.provider.getValue(), undefined);
  t.is(conn.globals.getValue(), undefined);

  // Reconnect tajPart
  cbs["connected"]![1]!();

  conn.stop();

  t.is(conn.provider.getValue(), undefined);
  t.is(conn.globals.getValue(), undefined);
});

test.serial("ParticipantContext register", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect();

  const conn = new ParticipantContext("someurl", "somens");

  // Connect
  cbs["connected"]![0]!();

  t.is(conn.provider.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  await conn.register("123");

  t.is(conn.participant.connected.getValue(), false);
  t.is(conn.participant.connecting.getValue(), true);

  // Wait for session establishement
  await nextTick();

  t.is(conn.participant.connected.getValue(), true);
  t.is(conn.participant.connecting.getValue(), false);
  t.not(conn.provider.getValue(), undefined);
});

test.serial("ParticipantContext register while disconnected", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Fake Taj connect
  fakeTajribaConnect();

  const conn = new ParticipantContext("someurl", "somens");

  t.is(conn.provider.getValue(), undefined);
  t.is(conn.globals.getValue(), undefined);

  await t.throwsAsync(
    async () => {
      await conn.register("123");
      /* c8 ignore next */
    },
    { message: /not connected/ }
  );
});

test.serial("ParticipantContext invalid register", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect({ invalidRegister: true });

  const conn = new ParticipantContext("someurl", "somens");

  // Connect
  cbs["connected"]![0]!();

  t.is(conn.provider.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  await t.throwsAsync(
    async () => {
      await conn.register("123");
      /* c8 ignore next */
    },
    { message: /invalid registration/ }
  );
});

test.serial("ParticipantContext failed register", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect({ failRegister: true });

  const conn = new ParticipantContext("someurl", "somens");

  // Connect
  cbs["connected"]![0]!();

  t.is(conn.provider.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  await t.throwsAsync(
    async () => {
      await conn.register("123");
      /* c8 ignore next */
    },
    { message: /failed/ }
  );
});

const myMode = (id: string, provider: TajribaProvider) => {
  return { something: "here" };
};

test.serial("ParticipantModeContext success", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Establish session
  const resetSession = new Subject<void>();
  let session = new ParticipantSession("somens", resetSession);
  session.updateSession("123", { id: "345", identifier: "567" });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect();

  const conn = new ParticipantModeContext("someurl", "somens", myMode);

  // Connect
  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.not(conn.provider.getValue(), undefined);
  t.not(conn.participant.participant.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  // Wait for session establishement
  await nextTick();

  t.not(conn.mode.getValue(), undefined);

  // Disconnect tajPart
  cbs["disconnected"]![1]!();

  t.is(conn.mode.getValue(), undefined);
});

test.serial("ParticipantModeContext no conn", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  // Fake Taj connect
  const { cbs } = fakeTajribaConnect();

  const conn = new ParticipantModeContext("someurl", "somens", myMode);

  // Connect
  cbs["connected"]![0]!();

  // Wait for session establishement
  await nextTick();

  t.is(conn.provider.getValue(), undefined);
  t.is(conn.participant.participant.getValue(), undefined);
  t.not(conn.globals.getValue(), undefined);

  // Wait for session establishement
  await nextTick();

  t.is(conn.mode.getValue(), undefined);
});
