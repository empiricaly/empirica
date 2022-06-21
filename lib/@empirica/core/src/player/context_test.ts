import "global-jsdom/register";

import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { fakeTajribaConnect, nextTick } from "../shared/test_helpers";
import { ParticipantSession } from "./connection";
import { ParticipantContext, ParticipantModeContext } from "./context";

test.serial.afterEach(() => {
  restore();
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

const myMode = () => {
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
