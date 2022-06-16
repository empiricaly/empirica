import test from "ava";
import { restore } from "sinon";
import { TajribaConnection } from "./tajriba_connection";
import { fakeTajribaConnect } from "./test_helpers";

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

test.serial("TajribaConnection session participant", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  await t.throwsAsync(
    async () => {
      await conn.sessionParticipant("", { id: "12", identifier: "34" });
      /* c8 ignore next */
    },
    { message: /not connected/ }
  );

  cbs["connected"]![0]!();

  await t.notThrowsAsync(async () => {
    await conn.sessionParticipant("", { id: "12", identifier: "34" });
  });
});

test.serial("TajribaConnection session admin", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const conn = new TajribaConnection("someurl");

  await t.throwsAsync(
    async () => {
      await conn.sessionAdmin("");
      /* c8 ignore next */
    },
    { message: /not connected/ }
  );

  cbs["connected"]![0]!();

  await t.notThrowsAsync(async () => {
    await conn.sessionAdmin("");
  });
});
