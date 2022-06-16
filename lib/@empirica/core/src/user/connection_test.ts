import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { UserSession } from "./connection";

test.serial.afterEach(() => {
  restore();
});

// test.serial("UserConnection existing conn and session", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect();

//   const conn = new TajribaConnection("someurl");

//   cbs["connected"]![0]!();

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   session.updateSession("123", { id: "345", identifier: "567" });

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   t.is(participant.connecting.getValue(), true);

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), true);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), true);
//   t.is(participant.connecting.getValue(), false);
// });

// test.serial("UserConnection existing conn and no session", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect();

//   const conn = new TajribaConnection("someurl");

//   cbs["connected"]![0]!();

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   // Wait for session establishement
//   await nextTick();

//   // No session => no partConn

//   t.is(conn.connected.getValue(), true);
//   t.is(session.session, undefined);
//   t.is(participant.connected.getValue(), false);
//   t.is(participant.connecting.getValue(), false);

//   // Add session => partConn

//   session.updateSession("123", { id: "345", identifier: "567" });

//   t.is(participant.connecting.getValue(), true);

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), true);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), true);
//   t.is(participant.connecting.getValue(), false);
// });

// test.serial("UserConnection no conn and no session", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect();

//   const conn = new TajribaConnection("someurl");

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   // Wait for session establishement
//   await nextTick();

//   // No conn, no session => no partConn

//   t.is(conn.connected.getValue(), false);
//   t.is(session.session, undefined);
//   t.is(participant.connected.getValue(), false);

//   // No conn, add session => no partConn

//   session.updateSession("123", { id: "345", identifier: "567" });

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), false);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), false);

//   // Add conn, add session => partConn

//   cbs["connected"]![0]!();

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), true);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), true);

//   // Remove conn, add session => partConn

//   cbs["disconnected"]![0]!();

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), false);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), true);

//   // Remove part conn, add session => no partConn

//   cbs["disconnected"]![1]!();

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), false);
//   t.not(session.session, undefined);
//   t.is(participant.connected.getValue(), false);
// });

// test.serial("UserConnection reset session", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect({ failSession: true });

//   const conn = new TajribaConnection("someurl");

//   cbs["connected"]![0]!();

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   session.updateSession("123", { id: "345", identifier: "567" });

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   // Wait for session establishement
//   await nextTick();

//   t.is(conn.connected.getValue(), true);
//   t.is(participant.connected.getValue(), false);
//   t.is(session.session, undefined);
// });

// test.serial("UserConnection repeating conn", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect();

//   const conn = new TajribaConnection("someurl");

//   cbs["connected"]![0]!();

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   session.updateSession("123", { id: "345", identifier: "567" });

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   const vals: boolean[] = [];
//   participant.connected.subscribe({
//     next(connected) {
//       vals.push(connected);
//     },
//   });

//   t.deepEqual(vals, [false]);

//   // Wait for session establishement
//   await nextTick();

//   t.deepEqual(vals, [false, true]);

//   cbs["connected"]![0]!();

//   t.deepEqual(vals, [false, true]);

//   // Wait for session establishement
//   await nextTick();

//   t.deepEqual(vals, [false, true]);
// });

// test.serial("UserConnection stopped", async (t) => {
//   t.teardown(() => {
//     window.localStorage.clear();
//   });

//   const { cbs } = fakeTajribaConnect();

//   const conn = new TajribaConnection("someurl");

//   cbs["connected"]![0]!();

//   const resetSession = new Subject<void>();
//   let session = new ParticipantSession("somens", resetSession);

//   session.updateSession("123", { id: "345", identifier: "567" });

//   const participant = new UserConnection(
//     conn,
//     session.sessions,
//     resetSession.next.bind(resetSession)
//   );

//   const vals: boolean[] = [];
//   participant.stopped.subscribe({
//     next(stopped) {
//       vals.push(stopped);
//     },
//   });

//   t.deepEqual(vals, [false]);

//   // Wait for session establishement
//   await nextTick();

//   t.deepEqual(vals, [false]);

//   participant.stop();

//   t.deepEqual(vals, [false, true]);
//   t.is(participant.connected.getValue(), false);

//   participant.stop();

//   t.deepEqual(vals, [false, true]);
// });
